/**
 * Fitness calculation system for agent evolution
 * 
 * Implements Requirements 3.6, 5.6
 * 
 * This module calculates multi-dimensional fitness metrics for agents:
 * - Survival fitness: How long the agent lived
 * - Earnings fitness: How much value the agent created
 * - Offspring fitness: How many successful children
 * - Adaptation fitness: How well the agent adapted (tier improvements)
 * - Innovation fitness: Novel strategies discovered
 */

import type { Agent, FitnessMetrics } from "../types.js";
import { config } from "../config.js";

/**
 * Calculate survival fitness
 * 
 * Survival fitness measures how long an agent has lived relative to
 * its maximum lifespan. A higher value indicates better survival.
 * 
 * Formula: lifespan / maxLifespan
 * Range: 0.0 to 1.0 (can exceed 1.0 if agent lives beyond max lifespan)
 * 
 * @param agent - The agent to calculate fitness for
 * @returns Survival fitness score (0.0 to 1.0+)
 */
export function calculateSurvivalFitness(agent: Agent): number {
  if (agent.maxLifespan <= 0) {
    return 0;
  }
  return agent.age / agent.maxLifespan;
}

/**
 * Calculate earnings fitness
 * 
 * Earnings fitness measures how much value an agent has created
 * per unit of time alive. Higher earnings per day indicates better
 * economic performance.
 * 
 * Formula: total earnings / time alive (in days)
 * Range: 0.0 to infinity (normalized to 0-1 scale using sigmoid)
 * 
 * @param agent - The agent to calculate fitness for
 * @returns Earnings fitness score (0.0 to 1.0)
 */
export function calculateEarningsFitness(agent: Agent): number {
  const timeAlive = agent.age;
  
  // Avoid division by zero for newborn agents
  if (timeAlive <= 0) {
    return 0;
  }
  
  const earningsPerDay = agent.totalEarnings / timeAlive;
  
  // Normalize using sigmoid function to map to 0-1 range
  // Using k=0.1 to scale appropriately for SOL earnings
  const k = 0.1;
  const normalized = 1 / (1 + Math.exp(-k * earningsPerDay));
  
  return normalized;
}

/**
 * Calculate offspring fitness
 * 
 * Offspring fitness measures reproductive success by counting
 * the number of successful children (children that survived).
 * 
 * Formula: successful children count
 * Range: 0 to infinity (normalized to 0-1 scale using sigmoid)
 * 
 * @param agent - The agent to calculate fitness for
 * @returns Offspring fitness score (0.0 to 1.0)
 */
export function calculateOffspringFitness(agent: Agent): number {
  const offspringCount = agent.fitness.offspring;
  
  // Normalize using sigmoid function
  // Using k=0.5 to scale appropriately for offspring counts
  const k = 0.5;
  const normalized = 1 / (1 + Math.exp(-k * offspringCount));
  
  return normalized;
}

/**
 * Tier improvement tracking for adaptation fitness
 */
export interface TierImprovement {
  fromTier: string;
  toTier: string;
  timestamp: Date;
}

/**
 * Calculate adaptation fitness
 * 
 * Adaptation fitness measures how well an agent has adapted to
 * its environment by tracking tier improvements over time.
 * 
 * Tier progression (from worst to best):
 * dead < critical < low_compute < normal < thriving
 * 
 * Each upward tier transition increases adaptation fitness.
 * 
 * Formula: sum of tier improvements / max possible improvements
 * Range: 0.0 to 1.0
 * 
 * @param agent - The agent to calculate fitness for
 * @param tierHistory - History of tier changes (optional, stored in agent.traits)
 * @returns Adaptation fitness score (0.0 to 1.0)
 */
export function calculateAdaptationFitness(
  agent: Agent,
  tierHistory?: TierImprovement[]
): number {
  // Extract tier history from agent traits if not provided
  if (!tierHistory && agent.traits?.tierHistory) {
    tierHistory = agent.traits.tierHistory as TierImprovement[];
  }
  
  if (!tierHistory || tierHistory.length === 0) {
    // No tier changes yet, use current tier as baseline
    const tierValues: Record<string, number> = {
      dead: 0,
      critical: 1,
      low_compute: 2,
      normal: 3,
      thriving: 4,
    };
    
    const currentTierValue = tierValues[agent.survivalTier] || 0;
    const maxTierValue = 4; // thriving
    
    return currentTierValue / maxTierValue;
  }
  
  // Calculate tier improvements from history
  const tierValues: Record<string, number> = {
    dead: 0,
    critical: 1,
    low_compute: 2,
    normal: 3,
    thriving: 4,
  };
  
  let totalImprovement = 0;
  let improvementCount = 0;
  
  for (const change of tierHistory) {
    const fromValue = tierValues[change.fromTier] || 0;
    const toValue = tierValues[change.toTier] || 0;
    const improvement = toValue - fromValue;
    
    if (improvement > 0) {
      totalImprovement += improvement;
      improvementCount++;
    }
  }
  
  // Normalize: each improvement can be at most 4 tiers (dead to thriving)
  const maxPossibleImprovement = 4;
  const normalized = Math.min(totalImprovement / maxPossibleImprovement, 1.0);
  
  return normalized;
}

/**
 * Novel strategy tracking for innovation fitness
 */
export interface NovelStrategy {
  name: string;
  description: string;
  discoveredAt: Date;
  effectiveness: number; // 0.0 to 1.0
}

/**
 * Calculate innovation fitness
 * 
 * Innovation fitness measures how many novel strategies an agent
 * has discovered. Novel strategies are new approaches not seen
 * in previous generations.
 * 
 * Formula: weighted sum of novel strategies by effectiveness
 * Range: 0.0 to 1.0
 * 
 * @param agent - The agent to calculate fitness for
 * @param novelStrategies - List of novel strategies (optional, stored in agent.traits)
 * @returns Innovation fitness score (0.0 to 1.0)
 */
export function calculateInnovationFitness(
  agent: Agent,
  novelStrategies?: NovelStrategy[]
): number {
  // Extract novel strategies from agent traits if not provided
  if (!novelStrategies && agent.traits?.novelStrategies) {
    novelStrategies = agent.traits.novelStrategies as NovelStrategy[];
  }
  
  if (!novelStrategies || novelStrategies.length === 0) {
    return 0;
  }
  
  // Calculate weighted sum of strategies by effectiveness
  let totalEffectiveness = 0;
  for (const strategy of novelStrategies) {
    totalEffectiveness += strategy.effectiveness;
  }
  
  // Normalize using sigmoid to handle varying numbers of strategies
  // Using k=0.3 to scale appropriately
  const k = 0.3;
  const normalized = 1 / (1 + Math.exp(-k * totalEffectiveness));
  
  return normalized;
}

/**
 * Calculate overall fitness metrics for an agent
 * 
 * Combines all fitness dimensions into a comprehensive fitness profile:
 * - Survival: How long the agent lived
 * - Earnings: How much value created per day
 * - Offspring: How many successful children
 * - Adaptation: How well adapted to environment (tier improvements)
 * - Innovation: Novel strategies discovered
 * 
 * Each dimension is calculated independently and stored in the
 * agent's fitness metrics.
 * 
 * @param agent - The agent to calculate fitness for
 * @param tierHistory - Optional tier change history
 * @param novelStrategies - Optional novel strategies list
 * @returns Complete fitness metrics
 * 
 * Implements Requirements 3.6, 5.6
 */
export function calculateFitness(
  agent: Agent,
  tierHistory?: TierImprovement[],
  novelStrategies?: NovelStrategy[]
): FitnessMetrics {
  const survival = calculateSurvivalFitness(agent);
  const earnings = calculateEarningsFitness(agent);
  const offspring = calculateOffspringFitness(agent);
  const adaptation = calculateAdaptationFitness(agent, tierHistory);
  const innovation = calculateInnovationFitness(agent, novelStrategies);
  
  return {
    survival,
    earnings,
    offspring,
    adaptation,
    innovation,
  };
}

/**
 * Calculate aggregate fitness score
 * 
 * Combines all fitness dimensions into a single score using weighted average.
 * Default weights (can be customized):
 * - Survival: 0.2
 * - Earnings: 0.3
 * - Offspring: 0.2
 * - Adaptation: 0.15
 * - Innovation: 0.15
 * 
 * @param fitness - Fitness metrics to aggregate
 * @param weights - Optional custom weights (must sum to 1.0)
 * @returns Aggregate fitness score (0.0 to 1.0)
 */
export function calculateAggregateFitness(
  fitness: FitnessMetrics,
  weights?: {
    survival: number;
    earnings: number;
    offspring: number;
    adaptation: number;
    innovation: number;
  }
): number {
  // Default weights
  const w = weights || {
    survival: 0.2,
    earnings: 0.3,
    offspring: 0.2,
    adaptation: 0.15,
    innovation: 0.15,
  };
  
  // Validate weights sum to 1.0
  const sum = w.survival + w.earnings + w.offspring + w.adaptation + w.innovation;
  if (Math.abs(sum - 1.0) > 0.001) {
    throw new Error(`Weights must sum to 1.0, got ${sum}`);
  }
  
  const aggregate =
    fitness.survival * w.survival +
    fitness.earnings * w.earnings +
    fitness.offspring * w.offspring +
    fitness.adaptation * w.adaptation +
    fitness.innovation * w.innovation;
  
  return aggregate;
}
