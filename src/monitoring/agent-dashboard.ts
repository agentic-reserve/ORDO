/**
 * Agent Dashboard
 * 
 * Displays agent status, activity, and performance metrics
 * Requirements: 13.3
 */

import { AgentMetricsTracker, type AgentMetrics, type HistoricalMetrics } from './agent-metrics.js';

export interface DashboardData {
  agent: {
    id: string;
    name: string;
    status: 'alive' | 'dead';
    generation: number;
  };
  currentMetrics: AgentMetrics;
  trends: {
    balanceTrend: 'increasing' | 'decreasing' | 'stable';
    successRateTrend: 'improving' | 'declining' | 'stable';
    latencyTrend: 'improving' | 'declining' | 'stable';
  };
  historicalData: HistoricalMetrics[];
  alerts: Alert[];
}

export interface Alert {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
}

export class AgentDashboard {
  private metricsTracker: AgentMetricsTracker;

  constructor() {
    this.metricsTracker = new AgentMetricsTracker();
  }

  /**
   * Get complete dashboard data for an agent
   */
  async getDashboardData(
    agentId: string,
    agentName: string,
    agentStatus: 'alive' | 'dead',
    generation: number,
    lookbackDays: number = 7
  ): Promise<DashboardData> {
    // Get current metrics
    const currentMetrics = await this.metricsTracker.getMetrics(agentId);

    // Get historical data
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);
    const historicalData = await this.metricsTracker.getHistoricalMetrics(
      agentId,
      startDate,
      endDate
    );

    // Calculate trends
    const trends = this.calculateTrends(historicalData);

    // Generate alerts
    const alerts = this.generateAlerts(currentMetrics, trends);

    return {
      agent: {
        id: agentId,
        name: agentName,
        status: agentStatus,
        generation,
      },
      currentMetrics,
      trends,
      historicalData,
      alerts,
    };
  }

  /**
   * Calculate trends from historical data
   */
  private calculateTrends(historicalData: HistoricalMetrics[]): DashboardData['trends'] {
    if (historicalData.length < 2) {
      return {
        balanceTrend: 'stable',
        successRateTrend: 'stable',
        latencyTrend: 'stable',
      };
    }

    // Get first and last data points
    const first = historicalData[0];
    const last = historicalData[historicalData.length - 1];

    // Calculate balance trend
    const balanceChange = last.balance - first.balance;
    const balanceTrend =
      Math.abs(balanceChange) < 0.1
        ? 'stable'
        : balanceChange > 0
        ? 'increasing'
        : 'decreasing';

    // Calculate success rate trend
    const successRateChange = last.successRate - first.successRate;
    const successRateTrend =
      Math.abs(successRateChange) < 5
        ? 'stable'
        : successRateChange > 0
        ? 'improving'
        : 'declining';

    // Calculate latency trend (lower is better)
    const latencyChange = last.latency - first.latency;
    const latencyTrend =
      Math.abs(latencyChange) < 100
        ? 'stable'
        : latencyChange < 0
        ? 'improving'
        : 'declining';

    return {
      balanceTrend,
      successRateTrend,
      latencyTrend,
    };
  }

  /**
   * Generate alerts based on metrics and trends
   */
  private generateAlerts(
    metrics: AgentMetrics,
    trends: DashboardData['trends']
  ): Alert[] {
    const alerts: Alert[] = [];
    const now = new Date();

    // Critical balance alert
    if (metrics.balance < 0.01) {
      alerts.push({
        severity: 'critical',
        message: 'Agent balance critically low - death imminent',
        timestamp: now,
      });
    } else if (metrics.balance < 0.1) {
      alerts.push({
        severity: 'critical',
        message: 'Agent balance below critical threshold (0.1 SOL)',
        timestamp: now,
      });
    } else if (metrics.balance < 1) {
      alerts.push({
        severity: 'warning',
        message: 'Agent balance low - consider adding funds',
        timestamp: now,
      });
    }

    // Success rate alert
    if (metrics.successRate < 50) {
      alerts.push({
        severity: 'critical',
        message: `Success rate critically low: ${metrics.successRate.toFixed(1)}%`,
        timestamp: now,
      });
    } else if (metrics.successRate < 80) {
      alerts.push({
        severity: 'warning',
        message: `Success rate below target: ${metrics.successRate.toFixed(1)}%`,
        timestamp: now,
      });
    }

    // Latency alert
    if (metrics.avgLatency > 5000) {
      alerts.push({
        severity: 'critical',
        message: `Average latency very high: ${metrics.avgLatency.toFixed(0)}ms`,
        timestamp: now,
      });
    } else if (metrics.avgLatency > 2000) {
      alerts.push({
        severity: 'warning',
        message: `Average latency elevated: ${metrics.avgLatency.toFixed(0)}ms`,
        timestamp: now,
      });
    }

    // Trend alerts
    if (trends.balanceTrend === 'decreasing') {
      alerts.push({
        severity: 'warning',
        message: 'Balance trending downward',
        timestamp: now,
      });
    }

    if (trends.successRateTrend === 'declining') {
      alerts.push({
        severity: 'warning',
        message: 'Success rate declining',
        timestamp: now,
      });
    }

    if (trends.latencyTrend === 'declining') {
      alerts.push({
        severity: 'warning',
        message: 'Latency increasing',
        timestamp: now,
      });
    }

    // Sort by severity
    alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    return alerts;
  }

  /**
   * Format dashboard data as text for console display
   */
  formatDashboard(data: DashboardData): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push(`AGENT DASHBOARD: ${data.agent.name} (${data.agent.id})`);
    lines.push('='.repeat(60));
    lines.push('');

    // Status
    lines.push(`Status: ${data.agent.status.toUpperCase()}`);
    lines.push(`Generation: ${data.agent.generation}`);
    lines.push('');

    // Current Metrics
    lines.push('CURRENT METRICS:');
    lines.push(`  Balance: ${data.currentMetrics.balance.toFixed(4)} SOL`);
    lines.push(`  Turns: ${data.currentMetrics.turns}`);
    lines.push(`  Total Costs: ${data.currentMetrics.totalCosts.toFixed(4)} SOL`);
    lines.push(`  Success Rate: ${data.currentMetrics.successRate.toFixed(1)}%`);
    lines.push(`  Avg Latency: ${data.currentMetrics.avgLatency.toFixed(0)}ms`);
    lines.push(`  Last Updated: ${data.currentMetrics.lastUpdated.toISOString()}`);
    lines.push('');

    // Trends
    lines.push('TRENDS:');
    lines.push(`  Balance: ${this.formatTrend(data.trends.balanceTrend)}`);
    lines.push(`  Success Rate: ${this.formatTrend(data.trends.successRateTrend)}`);
    lines.push(`  Latency: ${this.formatTrend(data.trends.latencyTrend)}`);
    lines.push('');

    // Alerts
    if (data.alerts.length > 0) {
      lines.push('ALERTS:');
      for (const alert of data.alerts) {
        const icon = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`  ${icon} [${alert.severity.toUpperCase()}] ${alert.message}`);
      }
      lines.push('');
    }

    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * Format trend indicator
   */
  private formatTrend(trend: string): string {
    switch (trend) {
      case 'increasing':
      case 'improving':
        return `${trend} ↗️`;
      case 'decreasing':
      case 'declining':
        return `${trend} ↘️`;
      case 'stable':
        return `${trend} →`;
      default:
        return trend;
    }
  }

  /**
   * Get dashboard data for all agents
   */
  async getAllAgentsDashboard(): Promise<DashboardData[]> {
    const allMetrics = await this.metricsTracker.getAllMetrics();
    
    const dashboards: DashboardData[] = [];
    
    for (const metrics of allMetrics) {
      // For this simplified version, we'll create minimal dashboard data
      // In a real implementation, you'd fetch agent details from the database
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const historicalData = await this.metricsTracker.getHistoricalMetrics(
        metrics.agentId,
        startDate,
        endDate
      );
      
      const trends = this.calculateTrends(historicalData);
      const alerts = this.generateAlerts(metrics, trends);
      
      dashboards.push({
        agent: {
          id: metrics.agentId,
          name: `Agent ${metrics.agentId.substring(0, 8)}`,
          status: metrics.balance > 0.01 ? 'alive' : 'dead',
          generation: 0,
        },
        currentMetrics: metrics,
        trends,
        historicalData,
        alerts,
      });
    }
    
    return dashboards;
  }
}
