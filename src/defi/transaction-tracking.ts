/**
 * Transaction Tracking
 * 
 * Tracks DeFi transaction success rates, costs, and enables agents to learn
 * from transaction history.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ulid } from 'ulid';
import type {
  TransactionResult,
  TransactionHistory,
  TransactionStats,
} from './types.js';

/**
 * Transaction tracker for DeFi operations
 */
export class TransactionTracker {
  private supabase: SupabaseClient;
  
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }
  
  /**
   * Record a transaction in the history
   */
  async recordTransaction(
    agentId: string,
    operation: string,
    result: TransactionResult,
    parameters: Record<string, any>
  ): Promise<void> {
    const history: TransactionHistory = {
      id: ulid(),
      agentId,
      operation,
      success: result.success,
      cost: result.cost,
      timestamp: result.timestamp,
      parameters,
      result: result.signature ? { signature: result.signature } : undefined,
      error: result.error,
    };
    
    const { error } = await this.supabase
      .from('defi_transactions')
      .insert(history);
    
    if (error) {
      console.error('Failed to record transaction:', error);
    }
  }
  
  /**
   * Get transaction history for an agent
   */
  async getTransactionHistory(
    agentId: string,
    limit: number = 100
  ): Promise<TransactionHistory[]> {
    const { data, error } = await this.supabase
      .from('defi_transactions')
      .select('*')
      .eq('agentId', agentId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Failed to get transaction history:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Get transaction statistics for an agent
   */
  async getTransactionStats(agentId: string): Promise<TransactionStats> {
    const history = await this.getTransactionHistory(agentId, 1000);
    
    const totalTransactions = history.length;
    const successfulTransactions = history.filter(t => t.success).length;
    const failedTransactions = totalTransactions - successfulTransactions;
    const successRate = totalTransactions > 0
      ? (successfulTransactions / totalTransactions) * 100
      : 0;
    
    const totalCost = history.reduce((sum, t) => sum + t.cost, 0);
    const averageCost = totalTransactions > 0 ? totalCost / totalTransactions : 0;
    
    // Calculate per-operation statistics
    const operationStats: Record<string, {
      count: number;
      successRate: number;
      averageCost: number;
    }> = {};
    
    const operationGroups = history.reduce((groups, t) => {
      if (!groups[t.operation]) {
        groups[t.operation] = [];
      }
      groups[t.operation].push(t);
      return groups;
    }, {} as Record<string, TransactionHistory[]>);
    
    for (const [operation, transactions] of Object.entries(operationGroups)) {
      const count = transactions.length;
      const successful = transactions.filter(t => t.success).length;
      const opSuccessRate = count > 0 ? (successful / count) * 100 : 0;
      const opTotalCost = transactions.reduce((sum, t) => sum + t.cost, 0);
      const opAverageCost = count > 0 ? opTotalCost / count : 0;
      
      operationStats[operation] = {
        count,
        successRate: opSuccessRate,
        averageCost: opAverageCost,
      };
    }
    
    return {
      agentId,
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      successRate,
      totalCost,
      averageCost,
      operationStats,
    };
  }
  
  /**
   * Get successful transaction patterns for learning
   */
  async getSuccessfulPatterns(
    agentId: string,
    operation: string
  ): Promise<TransactionHistory[]> {
    const { data, error } = await this.supabase
      .from('defi_transactions')
      .select('*')
      .eq('agentId', agentId)
      .eq('operation', operation)
      .eq('success', true)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Failed to get successful patterns:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Get failed transaction patterns for learning
   */
  async getFailedPatterns(
    agentId: string,
    operation: string
  ): Promise<TransactionHistory[]> {
    const { data, error } = await this.supabase
      .from('defi_transactions')
      .select('*')
      .eq('agentId', agentId)
      .eq('operation', operation)
      .eq('success', false)
      .order('timestamp', { ascending: false })
      .limit(50);
    
    if (error) {
      console.error('Failed to get failed patterns:', error);
      return [];
    }
    
    return data || [];
  }
  
  /**
   * Analyze transaction trends over time
   */
  async analyzeTrends(
    agentId: string,
    days: number = 7
  ): Promise<{
    dailyStats: Array<{
      date: string;
      transactions: number;
      successRate: number;
      totalCost: number;
    }>;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const { data, error } = await this.supabase
      .from('defi_transactions')
      .select('*')
      .eq('agentId', agentId)
      .gte('timestamp', cutoffDate.toISOString())
      .order('timestamp', { ascending: true });
    
    if (error || !data) {
      console.error('Failed to analyze trends:', error);
      return { dailyStats: [] };
    }
    
    // Group by day
    const dailyGroups: Record<string, TransactionHistory[]> = {};
    
    for (const transaction of data) {
      const date = new Date(transaction.timestamp).toISOString().split('T')[0];
      if (!dailyGroups[date]) {
        dailyGroups[date] = [];
      }
      dailyGroups[date].push(transaction);
    }
    
    // Calculate daily statistics
    const dailyStats = Object.entries(dailyGroups).map(([date, transactions]) => {
      const count = transactions.length;
      const successful = transactions.filter(t => t.success).length;
      const successRate = count > 0 ? (successful / count) * 100 : 0;
      const totalCost = transactions.reduce((sum, t) => sum + t.cost, 0);
      
      return {
        date,
        transactions: count,
        successRate,
        totalCost,
      };
    });
    
    return { dailyStats };
  }
}

/**
 * Create a transaction tracker instance
 */
export function createTransactionTracker(
  supabaseUrl: string,
  supabaseKey: string
): TransactionTracker {
  return new TransactionTracker(supabaseUrl, supabaseKey);
}
