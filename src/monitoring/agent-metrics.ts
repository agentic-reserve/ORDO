/**
 * Agent Metrics Tracking System
 * 
 * Tracks real-time metrics for agent performance and health
 * Requirements: 13.2
 * Property 56: Agent Metrics Tracking
 */

import { PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { getConfig } from '../config.js';

export interface AgentMetrics {
  agentId: string;
  balance: number;
  turns: number;
  totalCosts: number;
  successRate: number;
  avgLatency: number;
  lastUpdated: Date;
}

export interface MetricUpdate {
  agentId: string;
  balance?: number;
  turnIncrement?: number;
  costIncrement?: number;
  success?: boolean;
  latency?: number;
}

export interface HistoricalMetrics {
  timestamp: Date;
  balance: number;
  turns: number;
  costs: number;
  successRate: number;
  latency: number;
}

export class AgentMetricsTracker {
  private supabase: ReturnType<typeof createClient>;
  private metricsCache: Map<string, AgentMetrics>;

  constructor() {
    const config = getConfig();
    
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      throw new Error('Supabase configuration required for metrics tracker');
    }
    
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    this.metricsCache = new Map();
  }

  /**
   * Initialize metrics for a new agent
   */
  async initializeMetrics(agentId: string, initialBalance: number): Promise<AgentMetrics> {
    const metrics: AgentMetrics = {
      agentId,
      balance: initialBalance,
      turns: 0,
      totalCosts: 0,
      successRate: 100,
      avgLatency: 0,
      lastUpdated: new Date(),
    };

    // Store in database
    const { error } = await this.supabase.from('agent_metrics').insert({
      agent_id: agentId,
      balance: metrics.balance,
      turns: metrics.turns,
      total_costs: metrics.totalCosts,
      success_rate: metrics.successRate,
      avg_latency: metrics.avgLatency,
      last_updated: metrics.lastUpdated.toISOString(),
    });

    if (error) {
      throw new Error(`Failed to initialize metrics: ${error.message}`);
    }

    // Cache the metrics
    this.metricsCache.set(agentId, metrics);

    return metrics;
  }

  /**
   * Update agent metrics in real-time
   */
  async updateMetrics(update: MetricUpdate): Promise<AgentMetrics> {
    // Get current metrics
    let metrics = this.metricsCache.get(update.agentId);
    
    if (!metrics) {
      metrics = await this.getMetrics(update.agentId);
    }

    // Apply updates
    if (update.balance !== undefined) {
      metrics.balance = update.balance;
    }

    if (update.turnIncrement) {
      metrics.turns += update.turnIncrement;
    }

    if (update.costIncrement) {
      metrics.totalCosts += update.costIncrement;
    }

    if (update.success !== undefined) {
      // Update success rate using exponential moving average
      const alpha = 0.1; // Smoothing factor
      const successValue = update.success ? 100 : 0;
      metrics.successRate = alpha * successValue + (1 - alpha) * metrics.successRate;
    }

    if (update.latency !== undefined) {
      // Update average latency using exponential moving average
      const alpha = 0.1;
      metrics.avgLatency = alpha * update.latency + (1 - alpha) * metrics.avgLatency;
    }

    metrics.lastUpdated = new Date();

    // Update database
    const { error } = await this.supabase
      .from('agent_metrics')
      .update({
        balance: metrics.balance,
        turns: metrics.turns,
        total_costs: metrics.totalCosts,
        success_rate: metrics.successRate,
        avg_latency: metrics.avgLatency,
        last_updated: metrics.lastUpdated.toISOString(),
      })
      .eq('agent_id', update.agentId);

    if (error) {
      console.error('Failed to update metrics:', error);
    }

    // Update cache
    this.metricsCache.set(update.agentId, metrics);

    // Store historical snapshot
    await this.storeHistoricalMetrics(metrics);

    return metrics;
  }

  /**
   * Get current metrics for an agent
   */
  async getMetrics(agentId: string): Promise<AgentMetrics> {
    // Check cache first
    const cached = this.metricsCache.get(agentId);
    if (cached) {
      return cached;
    }

    // Fetch from database
    const { data, error } = await this.supabase
      .from('agent_metrics')
      .select('*')
      .eq('agent_id', agentId)
      .single();

    if (error || !data) {
      throw new Error(`Failed to get metrics for agent ${agentId}: ${error?.message}`);
    }

    const metrics: AgentMetrics = {
      agentId: data.agent_id,
      balance: data.balance,
      turns: data.turns,
      totalCosts: data.total_costs,
      successRate: data.success_rate,
      avgLatency: data.avg_latency,
      lastUpdated: new Date(data.last_updated),
    };

    // Cache the metrics
    this.metricsCache.set(agentId, metrics);

    return metrics;
  }

  /**
   * Get historical metrics for an agent
   */
  async getHistoricalMetrics(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<HistoricalMetrics[]> {
    const { data, error } = await this.supabase
      .from('agent_metrics_history')
      .select('*')
      .eq('agent_id', agentId)
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to get historical metrics: ${error.message}`);
    }

    return (data || []).map((row) => ({
      timestamp: new Date(row.timestamp),
      balance: row.balance,
      turns: row.turns,
      costs: row.total_costs,
      successRate: row.success_rate,
      latency: row.avg_latency,
    }));
  }

  /**
   * Store historical snapshot of metrics
   */
  private async storeHistoricalMetrics(metrics: AgentMetrics): Promise<void> {
    try {
      const { error } = await this.supabase.from('agent_metrics_history').insert({
        agent_id: metrics.agentId,
        timestamp: metrics.lastUpdated.toISOString(),
        balance: metrics.balance,
        turns: metrics.turns,
        total_costs: metrics.totalCosts,
        success_rate: metrics.successRate,
        avg_latency: metrics.avgLatency,
      });

      if (error) {
        console.error('Failed to store historical metrics:', error);
      }
    } catch (error) {
      console.error('Error storing historical metrics:', error);
    }
  }

  /**
   * Track a turn execution
   */
  async trackTurn(
    agentId: string,
    cost: number,
    success: boolean,
    latency: number
  ): Promise<void> {
    await this.updateMetrics({
      agentId,
      turnIncrement: 1,
      costIncrement: cost,
      success,
      latency,
    });
  }

  /**
   * Update agent balance
   */
  async updateBalance(agentId: string, newBalance: number): Promise<void> {
    await this.updateMetrics({
      agentId,
      balance: newBalance,
    });
  }

  /**
   * Get metrics for all agents
   */
  async getAllMetrics(): Promise<AgentMetrics[]> {
    const { data, error } = await this.supabase
      .from('agent_metrics')
      .select('*')
      .order('last_updated', { ascending: false });

    if (error) {
      throw new Error(`Failed to get all metrics: ${error.message}`);
    }

    return (data || []).map((row) => ({
      agentId: row.agent_id,
      balance: row.balance,
      turns: row.turns,
      totalCosts: row.total_costs,
      successRate: row.success_rate,
      avgLatency: row.avg_latency,
      lastUpdated: new Date(row.last_updated),
    }));
  }

  /**
   * Clear metrics cache
   */
  clearCache(): void {
    this.metricsCache.clear();
  }
}
