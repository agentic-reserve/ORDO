/**
 * Cross-Domain Performance Tracking
 * 
 * Tracks agent performance across domains, measuring success rates on novel tasks,
 * improvement rates, and domain breadth.
 * 
 * Requirements 17.4, 17.5: Track cross-domain performance and domain breadth
 */

import type { CrossDomainPerformance } from './types';
import { domainMasteryTracker } from './domain-mastery';
import { knowledgeTransferManager } from './knowledge-transfer';

/**
 * Tracks cross-domain performance metrics
 */
export class CrossDomainPerformanceTracker {
  private performanceRecords: Map<string, CrossDomainPerformance> = new Map();
  private novelTaskAttempts: Map<string, { successes: number; total: number }> = new Map();
  private domainImprovementRates: Map<string, number[]> = new Map();

  /**
   * Record a novel task attempt (task in a new/unmastered domain)
   */
  recordNovelTaskAttempt(agentId: string, domainId: string, success: boolean): void {
    const key = `${agentId}:${domainId}`;
    const attempts = this.novelTaskAttempts.get(key) || { successes: 0, total: 0 };

    attempts.total++;
    if (success) attempts.successes++;

    this.novelTaskAttempts.set(key, attempts);

    // Update performance record
    this.updatePerformance(agentId);
  }

  /**
   * Record improvement rate in a domain
   */
  recordImprovementRate(agentId: string, domainId: string, rate: number): void {
    const key = `${agentId}:${domainId}`;
    const rates = this.domainImprovementRates.get(key) || [];
    rates.push(rate);
    this.domainImprovementRates.set(key, rates);

    // Update performance record
    this.updatePerformance(agentId);
  }

  /**
   * Get cross-domain performance for an agent
   */
  getPerformance(agentId: string): CrossDomainPerformance {
    let performance = this.performanceRecords.get(agentId);

    if (!performance) {
      performance = this.calculatePerformance(agentId);
      this.performanceRecords.set(agentId, performance);
    }

    return performance;
  }

  /**
   * Update performance record for an agent
   */
  private updatePerformance(agentId: string): void {
    const performance = this.calculatePerformance(agentId);
    this.performanceRecords.set(agentId, performance);
  }

  /**
   * Calculate cross-domain performance metrics
   */
  private calculatePerformance(agentId: string): CrossDomainPerformance {
    // Calculate novel task success rate
    const novelTaskSuccessRate = this.calculateNovelTaskSuccessRate(agentId);

    // Get domain breadth from mastery tracker
    const domainBreadth = domainMasteryTracker.getDomainBreadth(agentId);

    // Calculate transfer effectiveness
    const transferEffectiveness = knowledgeTransferManager.getAverageEffectiveness(agentId);

    // Calculate average improvement rate
    const improvementRate = this.calculateAverageImprovementRate(agentId);

    return {
      agentId,
      novelTaskSuccessRate,
      domainBreadth,
      transferEffectiveness,
      improvementRate,
      lastUpdated: new Date(),
    };
  }

  /**
   * Calculate success rate on novel tasks
   */
  private calculateNovelTaskSuccessRate(agentId: string): number {
    let totalSuccesses = 0;
    let totalAttempts = 0;

    for (const [key, attempts] of this.novelTaskAttempts.entries()) {
      if (key.startsWith(`${agentId}:`)) {
        totalSuccesses += attempts.successes;
        totalAttempts += attempts.total;
      }
    }

    return totalAttempts > 0 ? totalSuccesses / totalAttempts : 0;
  }

  /**
   * Calculate average improvement rate across domains
   */
  private calculateAverageImprovementRate(agentId: string): number {
    const allRates: number[] = [];

    for (const [key, rates] of this.domainImprovementRates.entries()) {
      if (key.startsWith(`${agentId}:`)) {
        allRates.push(...rates);
      }
    }

    if (allRates.length === 0) return 0;

    const sum = allRates.reduce((acc, rate) => acc + rate, 0);
    return sum / allRates.length;
  }

  /**
   * Get improvement rate for a specific domain
   */
  getDomainImprovementRate(agentId: string, domainId: string): number {
    const key = `${agentId}:${domainId}`;
    const rates = this.domainImprovementRates.get(key) || [];

    if (rates.length === 0) return 0;

    // Return most recent rate
    return rates[rates.length - 1];
  }

  /**
   * Get novel task success rate for a specific domain
   */
  getDomainNovelTaskSuccessRate(agentId: string, domainId: string): number {
    const key = `${agentId}:${domainId}`;
    const attempts = this.novelTaskAttempts.get(key);

    if (!attempts || attempts.total === 0) return 0;

    return attempts.successes / attempts.total;
  }

  /**
   * Clear all performance records (for testing)
   */
  clear(): void {
    this.performanceRecords.clear();
    this.novelTaskAttempts.clear();
    this.domainImprovementRates.clear();
  }
}

// Singleton instance
export const crossDomainPerformanceTracker = new CrossDomainPerformanceTracker();
