/**
 * Gasless Transaction Support for MagicBlock
 * 
 * Enables platform-paid gas fees on Ephemeral Rollups
 * Tracks gas costs for platform analytics
 */

import { GaslessConfig, GasTracking } from './types.js';

/**
 * Gasless Transaction Manager
 * 
 * Manages gasless transaction configuration and tracking
 */
export class GaslessManager {
  private config: GaslessConfig;
  private gasTracking: GasTracking[];
  private dailyGasUsed: Map<string, number>; // agentId -> gas used today

  constructor(config: GaslessConfig) {
    this.config = config;
    this.gasTracking = [];
    this.dailyGasUsed = new Map();
  }

  /**
   * Check if gasless transactions are enabled
   * 
   * @returns True if gasless is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if platform pays gas for this transaction
   * 
   * @param agentId - Agent ID
   * @param estimatedGas - Estimated gas for the transaction
   * @returns True if platform will pay gas
   */
  shouldPlatformPayGas(agentId: string, estimatedGas: number): boolean {
    if (!this.config.enabled || !this.config.platformPaysGas) {
      return false;
    }

    // Check per-transaction limit
    if (this.config.maxGasPerTransaction && estimatedGas > this.config.maxGasPerTransaction) {
      return false;
    }

    // Check daily limit
    if (this.config.dailyGasLimit) {
      const dailyUsed = this.dailyGasUsed.get(agentId) || 0;
      if (dailyUsed + estimatedGas > this.config.dailyGasLimit) {
        return false;
      }
    }

    return true;
  }

  /**
   * Track gas usage for a transaction
   * 
   * @param tracking - Gas tracking record
   */
  trackGas(tracking: GasTracking): void {
    this.gasTracking.push(tracking);

    // Update daily usage
    if (tracking.paidBy === 'platform') {
      const dailyUsed = this.dailyGasUsed.get(tracking.agentId) || 0;
      this.dailyGasUsed.set(tracking.agentId, dailyUsed + tracking.gasUsed);
    }
  }

  /**
   * Get gas tracking records
   * 
   * @param agentId - Optional agent ID to filter by
   * @returns Array of gas tracking records
   */
  getGasTracking(agentId?: string): GasTracking[] {
    if (agentId) {
      return this.gasTracking.filter((t) => t.agentId === agentId);
    }
    return [...this.gasTracking];
  }

  /**
   * Get total gas cost paid by platform
   * 
   * @param agentId - Optional agent ID to filter by
   * @returns Total gas cost in SOL
   */
  getTotalPlatformCost(agentId?: string): number {
    const records = agentId
      ? this.gasTracking.filter((t) => t.agentId === agentId && t.paidBy === 'platform')
      : this.gasTracking.filter((t) => t.paidBy === 'platform');

    return records.reduce((sum, record) => sum + record.gasCost, 0);
  }

  /**
   * Get daily gas usage for an agent
   * 
   * @param agentId - Agent ID
   * @returns Gas used today
   */
  getDailyGasUsage(agentId: string): number {
    return this.dailyGasUsed.get(agentId) || 0;
  }

  /**
   * Reset daily gas usage (should be called daily)
   */
  resetDailyUsage(): void {
    this.dailyGasUsed.clear();
  }

  /**
   * Clear all gas tracking data
   */
  clearTracking(): void {
    this.gasTracking = [];
  }

  /**
   * Get gas statistics
   * 
   * @returns Gas usage statistics
   */
  getStatistics(): {
    totalTransactions: number;
    platformPaidTransactions: number;
    agentPaidTransactions: number;
    totalPlatformCost: number;
    totalAgentCost: number;
    averageGasPerTransaction: number;
  } {
    const platformPaid = this.gasTracking.filter((t) => t.paidBy === 'platform');
    const agentPaid = this.gasTracking.filter((t) => t.paidBy === 'agent');

    const totalPlatformCost = platformPaid.reduce((sum, t) => sum + t.gasCost, 0);
    const totalAgentCost = agentPaid.reduce((sum, t) => sum + t.gasCost, 0);

    const totalGas = this.gasTracking.reduce((sum, t) => sum + t.gasUsed, 0);
    const averageGasPerTransaction =
      this.gasTracking.length > 0 ? totalGas / this.gasTracking.length : 0;

    return {
      totalTransactions: this.gasTracking.length,
      platformPaidTransactions: platformPaid.length,
      agentPaidTransactions: agentPaid.length,
      totalPlatformCost,
      totalAgentCost,
      averageGasPerTransaction,
    };
  }

  /**
   * Update gasless configuration
   * 
   * @param config - New configuration
   */
  updateConfig(config: Partial<GaslessConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * 
   * @returns Current gasless configuration
   */
  getConfig(): GaslessConfig {
    return { ...this.config };
  }
}

/**
 * Create a gasless manager with configuration
 * 
 * @param config - Gasless configuration
 * @returns Configured gasless manager
 */
export function createGaslessManager(config: GaslessConfig): GaslessManager {
  return new GaslessManager(config);
}
