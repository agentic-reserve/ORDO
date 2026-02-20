/**
 * Action Logging System
 * 
 * Logs all agent actions with timestamps and outcomes
 * Requirements: 13.5
 * Property 58: Action Logging
 */

import { createClient } from '@supabase/supabase-js';
import { getConfig } from '../config.js';

export interface ActionLog {
  id?: string;
  agentId: string;
  timestamp: Date;
  actionType: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  cost: number;
  outcome: 'success' | 'failure' | 'partial';
  errorMessage?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface ActionQuery {
  agentId?: string;
  actionType?: string;
  outcome?: 'success' | 'failure' | 'partial';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class ActionLogger {
  private supabase: ReturnType<typeof createClient>;
  private logBuffer: ActionLog[];
  private bufferSize: number;
  private flushInterval: NodeJS.Timeout | null;

  constructor(bufferSize: number = 100, flushIntervalMs: number = 5000) {
    const config = getConfig();
    
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      throw new Error('Supabase configuration required for action logger');
    }
    
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    this.logBuffer = [];
    this.bufferSize = bufferSize;
    
    // Set up periodic flush
    this.flushInterval = setInterval(() => {
      this.flush().catch((error) => {
        console.error('Failed to flush action logs:', error);
      });
    }, flushIntervalMs);
  }

  /**
   * Log an agent action
   */
  async logAction(action: Omit<ActionLog, 'id' | 'timestamp'>): Promise<void> {
    const log: ActionLog = {
      ...action,
      timestamp: new Date(),
    };

    // Add to buffer
    this.logBuffer.push(log);

    // Flush if buffer is full
    if (this.logBuffer.length >= this.bufferSize) {
      await this.flush();
    }
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    agentId: string,
    actionType: string,
    inputs: Record<string, unknown>,
    outputs: Record<string, unknown>,
    cost: number,
    duration?: number
  ): Promise<void> {
    await this.logAction({
      agentId,
      actionType,
      inputs,
      outputs,
      cost,
      outcome: 'success',
      duration,
    });
  }

  /**
   * Log a failed action
   */
  async logFailure(
    agentId: string,
    actionType: string,
    inputs: Record<string, unknown>,
    cost: number,
    errorMessage: string,
    duration?: number
  ): Promise<void> {
    await this.logAction({
      agentId,
      actionType,
      inputs,
      outputs: {},
      cost,
      outcome: 'failure',
      errorMessage,
      duration,
    });
  }

  /**
   * Flush buffered logs to database
   */
  async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      const { error } = await this.supabase.from('agent_action_logs').insert(
        logsToFlush.map((log) => ({
          agent_id: log.agentId,
          timestamp: log.timestamp.toISOString(),
          action_type: log.actionType,
          inputs: log.inputs,
          outputs: log.outputs,
          cost: log.cost,
          outcome: log.outcome,
          error_message: log.errorMessage,
          duration: log.duration,
          metadata: log.metadata,
        }))
      );

      if (error) {
        console.error('Failed to flush action logs:', error);
        // Re-add failed logs to buffer
        this.logBuffer.unshift(...logsToFlush);
      }
    } catch (error) {
      console.error('Error flushing action logs:', error);
      // Re-add failed logs to buffer
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  /**
   * Query action logs
   */
  async queryLogs(query: ActionQuery): Promise<ActionLog[]> {
    let dbQuery = this.supabase.from('agent_action_logs').select('*');

    if (query.agentId) {
      dbQuery = dbQuery.eq('agent_id', query.agentId);
    }

    if (query.actionType) {
      dbQuery = dbQuery.eq('action_type', query.actionType);
    }

    if (query.outcome) {
      dbQuery = dbQuery.eq('outcome', query.outcome);
    }

    if (query.startDate) {
      dbQuery = dbQuery.gte('timestamp', query.startDate.toISOString());
    }

    if (query.endDate) {
      dbQuery = dbQuery.lte('timestamp', query.endDate.toISOString());
    }

    dbQuery = dbQuery.order('timestamp', { ascending: false });

    if (query.limit) {
      dbQuery = dbQuery.limit(query.limit);
    }

    const { data, error } = await dbQuery;

    if (error) {
      throw new Error(`Failed to query action logs: ${error.message}`);
    }

    return (data || []).map((row) => ({
      id: row.id,
      agentId: row.agent_id,
      timestamp: new Date(row.timestamp),
      actionType: row.action_type,
      inputs: row.inputs,
      outputs: row.outputs,
      cost: row.cost,
      outcome: row.outcome,
      errorMessage: row.error_message,
      duration: row.duration,
      metadata: row.metadata,
    }));
  }

  /**
   * Get action statistics for an agent
   */
  async getActionStats(agentId: string, startDate: Date, endDate: Date): Promise<{
    totalActions: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    totalCost: number;
    avgDuration: number;
    actionsByType: Record<string, number>;
  }> {
    const logs = await this.queryLogs({
      agentId,
      startDate,
      endDate,
    });

    const totalActions = logs.length;
    const successCount = logs.filter((log) => log.outcome === 'success').length;
    const failureCount = logs.filter((log) => log.outcome === 'failure').length;
    const successRate = totalActions > 0 ? (successCount / totalActions) * 100 : 0;
    const totalCost = logs.reduce((sum, log) => sum + log.cost, 0);
    const durations = logs.filter((log) => log.duration !== undefined).map((log) => log.duration!);
    const avgDuration = durations.length > 0 ? durations.reduce((sum, d) => sum + d, 0) / durations.length : 0;

    const actionsByType: Record<string, number> = {};
    for (const log of logs) {
      actionsByType[log.actionType] = (actionsByType[log.actionType] || 0) + 1;
    }

    return {
      totalActions,
      successCount,
      failureCount,
      successRate,
      totalCost,
      avgDuration,
      actionsByType,
    };
  }

  /**
   * Get recent actions for an agent
   */
  async getRecentActions(agentId: string, limit: number = 10): Promise<ActionLog[]> {
    return this.queryLogs({
      agentId,
      limit,
    });
  }

  /**
   * Get failed actions for debugging
   */
  async getFailedActions(agentId: string, limit: number = 10): Promise<ActionLog[]> {
    return this.queryLogs({
      agentId,
      outcome: 'failure',
      limit,
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush remaining logs
    this.flush().catch((error) => {
      console.error('Failed to flush logs on destroy:', error);
    });
  }
}
