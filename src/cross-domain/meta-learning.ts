/**
 * Meta-Learning System
 * 
 * Enables agents to "learn how to learn" by analyzing learning strategies
 * across domains and optimizing learning approaches.
 * 
 * Requirement 17.6: Enable meta-learning (learning how to learn)
 */

import type {
  MetaLearningMetrics,
  LearningStrategy,
  Domain,
} from './types';
import { domainMasteryTracker } from './domain-mastery';

/**
 * Manages meta-learning for agents
 */
export class MetaLearningManager {
  private metricsRecords: Map<string, MetaLearningMetrics> = new Map();
  private strategyRegistry: Map<string, LearningStrategy> = new Map();

  constructor() {
    // Register default learning strategies
    this.registerDefaultStrategies();
  }

  /**
   * Register default learning strategies
   */
  private registerDefaultStrategies(): void {
    const strategies: LearningStrategy[] = [
      {
        id: 'trial-and-error',
        name: 'Trial and Error',
        description: 'Learn through experimentation and iteration',
        approach: 'trial-and-error',
        applicableDomains: ['*'], // Applicable to all domains
        successRate: 0.6,
        avgTimeToMastery: 30,
      },
      {
        id: 'analogy-based',
        name: 'Analogy-Based Learning',
        description: 'Transfer knowledge from similar domains',
        approach: 'analogy-based',
        applicableDomains: ['*'],
        successRate: 0.75,
        avgTimeToMastery: 20,
      },
      {
        id: 'systematic',
        name: 'Systematic Learning',
        description: 'Follow structured curriculum and best practices',
        approach: 'systematic',
        applicableDomains: ['*'],
        successRate: 0.8,
        avgTimeToMastery: 25,
      },
      {
        id: 'imitation',
        name: 'Imitation Learning',
        description: 'Learn by observing and imitating experts',
        approach: 'imitation',
        applicableDomains: ['*'],
        successRate: 0.7,
        avgTimeToMastery: 15,
      },
    ];

    for (const strategy of strategies) {
      this.strategyRegistry.set(strategy.id, strategy);
    }
  }

  /**
   * Register a custom learning strategy
   */
  registerStrategy(strategy: LearningStrategy): void {
    this.strategyRegistry.set(strategy.id, strategy);
  }

  /**
   * Get a learning strategy by ID
   */
  getStrategy(strategyId: string): LearningStrategy | undefined {
    return this.strategyRegistry.get(strategyId);
  }

  /**
   * Get all registered strategies
   */
  getAllStrategies(): LearningStrategy[] {
    return Array.from(this.strategyRegistry.values());
  }

  /**
   * Record strategy usage and effectiveness
   */
  recordStrategyUsage(
    agentId: string,
    strategyId: string,
    domainId: string,
    effectiveness: number
  ): void {
    let metrics = this.metricsRecords.get(agentId);

    if (!metrics) {
      metrics = {
        agentId,
        learningStrategies: this.getAllStrategies(),
        strategyEffectiveness: {},
        adaptationRate: 0,
        lastUpdated: new Date(),
      };
      this.metricsRecords.set(agentId, metrics);
    }

    // Update strategy effectiveness using running average
    const currentEffectiveness = metrics.strategyEffectiveness[strategyId];
    if (currentEffectiveness === undefined) {
      // First time using this strategy
      metrics.strategyEffectiveness[strategyId] = effectiveness;
    } else {
      // Update running average (simple average for now)
      // In a real system, we'd track usage count per strategy
      metrics.strategyEffectiveness[strategyId] =
        (currentEffectiveness + effectiveness) / 2;
    }

    // Update optimal strategy
    metrics.optimalStrategy = this.findOptimalStrategy(metrics.strategyEffectiveness);

    // Update adaptation rate (how quickly agent switches strategies)
    metrics.adaptationRate = this.calculateAdaptationRate(agentId);

    metrics.lastUpdated = new Date();
  }

  /**
   * Find optimal strategy based on effectiveness
   */
  private findOptimalStrategy(effectiveness: Record<string, number>): string | undefined {
    let maxEffectiveness = -1;
    let optimalStrategy: string | undefined;

    for (const [strategyId, eff] of Object.entries(effectiveness)) {
      if (eff > maxEffectiveness) {
        maxEffectiveness = eff;
        optimalStrategy = strategyId;
      }
    }

    return optimalStrategy;
  }

  /**
   * Calculate adaptation rate (how quickly agent changes strategies)
   */
  private calculateAdaptationRate(agentId: string): number {
    const metrics = this.metricsRecords.get(agentId);
    if (!metrics) return 0;

    // Simple heuristic: number of strategies tried / total strategies
    const strategiesTried = Object.keys(metrics.strategyEffectiveness).length;
    const totalStrategies = this.strategyRegistry.size;

    return strategiesTried / totalStrategies;
  }

  /**
   * Get meta-learning metrics for an agent
   */
  getMetrics(agentId: string): MetaLearningMetrics | undefined {
    return this.metricsRecords.get(agentId);
  }

  /**
   * Recommend optimal strategy for a domain
   */
  recommendStrategy(agentId: string, domainId: string): LearningStrategy | undefined {
    const metrics = this.metricsRecords.get(agentId);

    if (!metrics || !metrics.optimalStrategy) {
      // Default to systematic learning
      return this.getStrategy('systematic');
    }

    return this.getStrategy(metrics.optimalStrategy);
  }

  /**
   * Analyze learning strategies across domains
   */
  analyzeStrategies(agentId: string): {
    mostEffective: LearningStrategy | undefined;
    leastEffective: LearningStrategy | undefined;
    avgEffectiveness: number;
  } {
    const metrics = this.metricsRecords.get(agentId);

    if (!metrics || Object.keys(metrics.strategyEffectiveness).length === 0) {
      return {
        mostEffective: undefined,
        leastEffective: undefined,
        avgEffectiveness: 0,
      };
    }

    let maxEff = -1;
    let minEff = 2;
    let mostEffectiveId: string | undefined;
    let leastEffectiveId: string | undefined;
    let totalEff = 0;
    let count = 0;

    for (const [strategyId, eff] of Object.entries(metrics.strategyEffectiveness)) {
      if (eff > maxEff) {
        maxEff = eff;
        mostEffectiveId = strategyId;
      }
      if (eff < minEff) {
        minEff = eff;
        leastEffectiveId = strategyId;
      }
      totalEff += eff;
      count++;
    }

    return {
      mostEffective: mostEffectiveId ? this.getStrategy(mostEffectiveId) : undefined,
      leastEffective: leastEffectiveId ? this.getStrategy(leastEffectiveId) : undefined,
      avgEffectiveness: count > 0 ? totalEff / count : 0,
    };
  }

  /**
   * Clear all metrics (for testing)
   */
  clear(): void {
    this.metricsRecords.clear();
  }
}

// Singleton instance
export const metaLearningManager = new MetaLearningManager();
