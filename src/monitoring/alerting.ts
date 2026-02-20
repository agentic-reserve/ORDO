/**
 * Critical State Alerting System
 * 
 * Sends alerts when agents enter critical states
 * Requirements: 13.4
 * Property 57: Critical State Alerting
 */

import { AgentMetricsTracker, type AgentMetrics } from './agent-metrics.js';
import { createClient } from '@supabase/supabase-js';
import { getConfig } from '../config.js';

export interface AlertConfig {
  channels: AlertChannel[];
  thresholds: {
    criticalBalance: number;
    warningBalance: number;
    errorRateThreshold: number;
    latencyThreshold: number;
  };
}

export interface AlertChannel {
  type: 'email' | 'webhook' | 'console' | 'database';
  config: Record<string, unknown>;
}

export interface AlertEvent {
  agentId: string;
  severity: 'critical' | 'warning' | 'info';
  type: 'balance' | 'error_rate' | 'latency' | 'other';
  message: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class AlertingSystem {
  private metricsTracker: AgentMetricsTracker;
  private supabase: ReturnType<typeof createClient>;
  private config: AlertConfig;
  private alertHistory: Map<string, Date>;

  constructor(config?: Partial<AlertConfig>) {
    this.metricsTracker = new AgentMetricsTracker();
    
    const appConfig = getConfig();
    if (!appConfig.supabase.url || !appConfig.supabase.serviceRoleKey) {
      throw new Error('Supabase configuration required for alerting system');
    }
    
    this.supabase = createClient(appConfig.supabase.url, appConfig.supabase.serviceRoleKey);
    
    this.config = {
      channels: config?.channels || [{ type: 'console', config: {} }],
      thresholds: {
        criticalBalance: 0.1,
        warningBalance: 1.0,
        errorRateThreshold: 10,
        latencyThreshold: 1000,
        ...config?.thresholds,
      },
    };
    
    this.alertHistory = new Map();
  }

  /**
   * Check agent state and send alerts if needed
   */
  async checkAgentState(agentId: string): Promise<AlertEvent[]> {
    const metrics = await this.metricsTracker.getMetrics(agentId);
    const alerts: AlertEvent[] = [];

    // Check balance
    if (metrics.balance < this.config.thresholds.criticalBalance) {
      alerts.push({
        agentId,
        severity: 'critical',
        type: 'balance',
        message: `Agent balance critically low: ${metrics.balance.toFixed(4)} SOL (threshold: ${this.config.thresholds.criticalBalance} SOL)`,
        timestamp: new Date(),
        metadata: { balance: metrics.balance },
      });
    } else if (metrics.balance < this.config.thresholds.warningBalance) {
      alerts.push({
        agentId,
        severity: 'warning',
        type: 'balance',
        message: `Agent balance low: ${metrics.balance.toFixed(4)} SOL (threshold: ${this.config.thresholds.warningBalance} SOL)`,
        timestamp: new Date(),
        metadata: { balance: metrics.balance },
      });
    }

    // Check error rate (inverse of success rate)
    const errorRate = 100 - metrics.successRate;
    if (errorRate > this.config.thresholds.errorRateThreshold) {
      alerts.push({
        agentId,
        severity: 'critical',
        type: 'error_rate',
        message: `Agent error rate high: ${errorRate.toFixed(1)}% (threshold: ${this.config.thresholds.errorRateThreshold}%)`,
        timestamp: new Date(),
        metadata: { errorRate, successRate: metrics.successRate },
      });
    }

    // Check latency
    if (metrics.avgLatency > this.config.thresholds.latencyThreshold) {
      alerts.push({
        agentId,
        severity: 'critical',
        type: 'latency',
        message: `Agent latency high: ${metrics.avgLatency.toFixed(0)}ms (threshold: ${this.config.thresholds.latencyThreshold}ms)`,
        timestamp: new Date(),
        metadata: { latency: metrics.avgLatency },
      });
    }

    // Send alerts
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }

    return alerts;
  }

  /**
   * Send alert through configured channels
   */
  private async sendAlert(alert: AlertEvent): Promise<void> {
    // Check if we've recently sent this alert (debouncing)
    const alertKey = `${alert.agentId}:${alert.type}`;
    const lastAlert = this.alertHistory.get(alertKey);
    const now = new Date();
    
    if (lastAlert) {
      const timeSinceLastAlert = now.getTime() - lastAlert.getTime();
      const debounceTime = alert.severity === 'critical' ? 5 * 60 * 1000 : 30 * 60 * 1000; // 5 min for critical, 30 min for warning
      
      if (timeSinceLastAlert < debounceTime) {
        return; // Skip duplicate alert
      }
    }

    // Update alert history
    this.alertHistory.set(alertKey, now);

    // Send through each channel
    for (const channel of this.config.channels) {
      try {
        await this.sendToChannel(alert, channel);
      } catch (error) {
        console.error(`Failed to send alert to ${channel.type}:`, error);
      }
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendToChannel(alert: AlertEvent, channel: AlertChannel): Promise<void> {
    switch (channel.type) {
      case 'console':
        this.sendToConsole(alert);
        break;
      case 'database':
        await this.sendToDatabase(alert);
        break;
      case 'webhook':
        await this.sendToWebhook(alert, channel.config);
        break;
      case 'email':
        await this.sendToEmail(alert, channel.config);
        break;
      default:
        console.warn(`Unknown alert channel type: ${channel.type}`);
    }
  }

  /**
   * Send alert to console
   */
  private sendToConsole(alert: AlertEvent): void {
    const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${icon} [${alert.severity.toUpperCase()}] ${alert.message}`);
  }

  /**
   * Send alert to database
   */
  private async sendToDatabase(alert: AlertEvent): Promise<void> {
    const { error } = await this.supabase.from('agent_alerts').insert({
      agent_id: alert.agentId,
      severity: alert.severity,
      type: alert.type,
      message: alert.message,
      timestamp: alert.timestamp.toISOString(),
      metadata: alert.metadata,
    });

    if (error) {
      console.error('Failed to store alert in database:', error);
    }
  }

  /**
   * Send alert to webhook
   */
  private async sendToWebhook(alert: AlertEvent, config: Record<string, unknown>): Promise<void> {
    const webhookUrl = config.url as string;
    if (!webhookUrl) {
      throw new Error('Webhook URL not configured');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(alert),
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.statusText}`);
    }
  }

  /**
   * Send alert to email
   */
  private async sendToEmail(alert: AlertEvent, config: Record<string, unknown>): Promise<void> {
    // This is a placeholder - in production, integrate with email service (SendGrid, AWS SES, etc.)
    const emailAddress = config.address as string;
    if (!emailAddress) {
      throw new Error('Email address not configured');
    }

    console.log(`[EMAIL] Would send alert to ${emailAddress}:`, alert.message);
    
    // TODO: Integrate with actual email service
  }

  /**
   * Monitor all agents and send alerts
   */
  async monitorAllAgents(): Promise<Map<string, AlertEvent[]>> {
    const allMetrics = await this.metricsTracker.getAllMetrics();
    const alertsByAgent = new Map<string, AlertEvent[]>();

    for (const metrics of allMetrics) {
      const alerts = await this.checkAgentState(metrics.agentId);
      if (alerts.length > 0) {
        alertsByAgent.set(metrics.agentId, alerts);
      }
    }

    return alertsByAgent;
  }

  /**
   * Get alert history for an agent
   */
  async getAlertHistory(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AlertEvent[]> {
    const { data, error } = await this.supabase
      .from('agent_alerts')
      .select('*')
      .eq('agent_id', agentId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to get alert history: ${error.message}`);
    }

    return (data || []).map((row) => ({
      agentId: row.agent_id,
      severity: row.severity,
      type: row.type,
      message: row.message,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata,
    }));
  }

  /**
   * Clear alert history cache
   */
  clearAlertHistory(): void {
    this.alertHistory.clear();
  }
}
