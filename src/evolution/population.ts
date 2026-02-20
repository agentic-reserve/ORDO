/**
 * Population dynamics tracking system
 * 
 * Implements Requirements 19.1, 19.2, 19.3, 19.5, 19.6
 * 
 * This module tracks population-level metrics including:
 * - Population size over time (births, deaths, net growth)
 * - Generational fitness metrics
 * - Diversity metrics (strategy variation, specialization)
 * - Novel behavior tracking
 */

import type { Agent, FitnessMetrics } from "../types.js";
import { calculateFitness, calculateAggregateFitness } from "./fitness.js";

/**
 * Population snapshot at a point in time
 */
export interface PopulationSnapshot {
  timestamp: Date;
  generation: number;
  aliveCount: number;
  deadCount: number;
  totalCount: number;
  birthsInPeriod: number;
  deathsInPeriod: number;
  netGrowth: number;
  growthRate: number;  // Percentage change
}

/**
 * Population tracking result
 */
export interface PopulationTrackingResult {
  current: PopulationSnapshot;
  history: PopulationSnapshot[];
  growthTrend: "increasing" | "stable" | "decreasing";
}

/**
 * Generational metrics
 */
export interface GenerationalMetrics {
  generation: number;
  agentCount: number;
  avgFitness: number;
  avgSurvivalFitness: number;
  avgEarningsFitness: number;
  avgOffspringFitness: number;
  avgAdaptationFitness: number;
  avgInnovationFitness: number;
  timestamp: Date;
}

/**
 * Generational improvement metrics
 */
export interface GenerationalImprovement {
  fromGeneration: number;
  toGeneration: number;
  fitnessImprovement: number;
  improvementVelocity: number;  // Improvement per generation
  timestamp: Date;
}

/**
 * Diversity metrics
 */
export interface DiversityMetrics {
  strategyVariation: number;      // 0.0 to 1.0
  specializationDistribution: Record<string, number>;
  geneticDiversity: number;       // Trait variance, 0.0 to 1.0
  timestamp: Date;
}

/**
 * Novel behavior record
 */
export interface NovelBehavior {
  id: string;
  name: string;
  description: string;
  discoveredBy: string;  // Agent ID
  generation: number;
  timestamp: Date;
  effectiveness: number;  // 0.0 to 1.0
  adoptionRate: number;   // Percentage of population using it
}

/**
 * Track population dynamics over time
 * 
 * Monitors births and deaths, calculates population size, growth rate,
 * and net change. Stores historical snapshots for trend analysis.
 * 
 * @param agents - Current population of agents
 * @param previousSnapshot - Previous population snapshot (optional)
 * @param timePeriod - Time period for growth rate calculation in days (default: 1)
 * @returns Population tracking result with current snapshot and history
 * 
 * Implements Requirement 19.1
 */
export function trackPopulation(
  agents: Agent[],
  previousSnapshot?: PopulationSnapshot,
  timePeriod: number = 1
): PopulationTrackingResult {
  const now = new Date();
  
  // Count alive and dead agents
  const aliveCount = agents.filter(a => a.status === "alive").length;
  const deadCount = agents.filter(a => a.status === "dead").length;
  const totalCount = agents.length;
  
  // Calculate current generation (max generation among alive agents)
  const currentGeneration = agents
    .filter(a => a.status === "alive")
    .reduce((max, a) => Math.max(max, a.generation), 0);
  
  // Calculate births and deaths in period
  let birthsInPeriod = 0;
  let deathsInPeriod = 0;
  
  if (previousSnapshot) {
    // Births = new agents since last snapshot
    const cutoffDate = new Date(now.getTime() - timePeriod * 24 * 60 * 60 * 1000);
    birthsInPeriod = agents.filter(a => a.birthDate >= cutoffDate).length;
    
    // Deaths = agents that died since last snapshot
    deathsInPeriod = agents.filter(
      a => a.status === "dead" && a.deathDate && a.deathDate >= cutoffDate
    ).length;
  }
  
  // Calculate net growth and growth rate
  const netGrowth = birthsInPeriod - deathsInPeriod;
  const growthRate = previousSnapshot && previousSnapshot.aliveCount > 0
    ? ((aliveCount - previousSnapshot.aliveCount) / previousSnapshot.aliveCount) * 100
    : 0;
  
  // Create current snapshot
  const current: PopulationSnapshot = {
    timestamp: now,
    generation: currentGeneration,
    aliveCount,
    deadCount,
    totalCount,
    birthsInPeriod,
    deathsInPeriod,
    netGrowth,
    growthRate,
  };
  
  // Build history (include previous snapshot if provided)
  const history: PopulationSnapshot[] = previousSnapshot ? [previousSnapshot] : [];
  
  // Determine growth trend
  let growthTrend: "increasing" | "stable" | "decreasing" = "stable";
  if (growthRate > 5) {
    growthTrend = "increasing";
  } else if (growthRate < -5) {
    growthTrend = "decreasing";
  }
  
  return {
    current,
    history,
    growthTrend,
  };
}

/**
 * Calculate generational metrics
 * 
 * Calculates average fitness per generation and tracks fitness
 * improvement between generations. Measures generational improvement velocity.
 * 
 * @param agents - Population of agents
 * @param generation - Generation number to calculate metrics for (optional, defaults to all alive agents)
 * @returns Generational metrics
 * 
 * Implements Requirements 19.2, 19.5
 */
export function calculateGenerationalMetrics(
  agents: Agent[],
  generation?: number
): GenerationalMetrics {
  // Filter agents by generation if specified, otherwise use all alive agents
  const targetAgents = generation !== undefined
    ? agents.filter(a => a.generation === generation && a.status === "alive")
    : agents.filter(a => a.status === "alive");
  
  if (targetAgents.length === 0) {
    // Return zero metrics if no agents in generation
    return {
      generation: generation ?? 0,
      agentCount: 0,
      avgFitness: 0,
      avgSurvivalFitness: 0,
      avgEarningsFitness: 0,
      avgOffspringFitness: 0,
      avgAdaptationFitness: 0,
      avgInnovationFitness: 0,
      timestamp: new Date(),
    };
  }
  
  // Calculate fitness for each agent
  const fitnessScores = targetAgents.map(agent => {
    const fitness = calculateFitness(agent);
    const aggregate = calculateAggregateFitness(fitness);
    return { fitness, aggregate };
  });
  
  // Calculate averages
  const avgFitness = fitnessScores.reduce((sum, f) => sum + f.aggregate, 0) / fitnessScores.length;
  const avgSurvivalFitness = fitnessScores.reduce((sum, f) => sum + f.fitness.survival, 0) / fitnessScores.length;
  const avgEarningsFitness = fitnessScores.reduce((sum, f) => sum + f.fitness.earnings, 0) / fitnessScores.length;
  const avgOffspringFitness = fitnessScores.reduce((sum, f) => sum + f.fitness.offspring, 0) / fitnessScores.length;
  const avgAdaptationFitness = fitnessScores.reduce((sum, f) => sum + f.fitness.adaptation, 0) / fitnessScores.length;
  const avgInnovationFitness = fitnessScores.reduce((sum, f) => sum + f.fitness.innovation, 0) / fitnessScores.length;
  
  // Determine generation number
  const genNumber = generation ?? targetAgents[0]?.generation ?? 0;
  
  return {
    generation: genNumber,
    agentCount: targetAgents.length,
    avgFitness,
    avgSurvivalFitness,
    avgEarningsFitness,
    avgOffspringFitness,
    avgAdaptationFitness,
    avgInnovationFitness,
    timestamp: new Date(),
  };
}

/**
 * Calculate generational improvement
 * 
 * Measures fitness improvement between two generations and calculates
 * improvement velocity (rate of improvement per generation).
 * 
 * @param previousMetrics - Metrics from previous generation
 * @param currentMetrics - Metrics from current generation
 * @returns Generational improvement metrics
 * 
 * Implements Requirements 19.2, 19.5
 */
export function calculateGenerationalImprovement(
  previousMetrics: GenerationalMetrics,
  currentMetrics: GenerationalMetrics
): GenerationalImprovement {
  const fitnessImprovement = currentMetrics.avgFitness - previousMetrics.avgFitness;
  const generationGap = currentMetrics.generation - previousMetrics.generation;
  const improvementVelocity = generationGap > 0 ? fitnessImprovement / generationGap : 0;
  
  return {
    fromGeneration: previousMetrics.generation,
    toGeneration: currentMetrics.generation,
    fitnessImprovement,
    improvementVelocity,
    timestamp: new Date(),
  };
}

/**
 * Calculate diversity metrics
 * 
 * Measures strategy variation across population, specialization distribution,
 * and genetic diversity (trait variance).
 * 
 * @param agents - Population of agents
 * @returns Diversity metrics
 * 
 * Implements Requirement 19.3
 */
export function calculateDiversityMetrics(agents: Agent[]): DiversityMetrics {
  const aliveAgents = agents.filter(a => a.status === "alive");
  
  if (aliveAgents.length === 0) {
    return {
      strategyVariation: 0,
      specializationDistribution: {},
      geneticDiversity: 0,
      timestamp: new Date(),
    };
  }
  
  // Calculate strategy variation
  // Strategy variation is measured by the diversity of models, tools, and skills
  const uniqueModels = new Set(aliveAgents.map(a => a.model)).size;
  const uniqueToolCombinations = new Set(
    aliveAgents.map(a => JSON.stringify([...a.tools].sort()))
  ).size;
  const uniqueSkillCombinations = new Set(
    aliveAgents.map(a => JSON.stringify([...a.skills].sort()))
  ).size;
  
  // Normalize strategy variation (0 to 1)
  const maxVariation = aliveAgents.length;
  const strategyVariation = (
    (uniqueModels / maxVariation) +
    (uniqueToolCombinations / maxVariation) +
    (uniqueSkillCombinations / maxVariation)
  ) / 3;
  
  // Calculate specialization distribution
  // Group agents by their primary specialization (inferred from skills/tools)
  const specializationDistribution: Record<string, number> = {};
  
  for (const agent of aliveAgents) {
    // Infer specialization from skills
    let specialization = "generalist";
    
    if (agent.skills.some(s => s.includes("trade") || s.includes("swap"))) {
      specialization = "trader";
    } else if (agent.skills.some(s => s.includes("research") || s.includes("analyze"))) {
      specialization = "researcher";
    } else if (agent.skills.some(s => s.includes("code") || s.includes("build"))) {
      specialization = "coder";
    } else if (agent.skills.some(s => s.includes("coordinate") || s.includes("manage"))) {
      specialization = "coordinator";
    }
    
    specializationDistribution[specialization] = (specializationDistribution[specialization] || 0) + 1;
  }
  
  // Calculate genetic diversity (trait variance)
  // Measure variance in key traits across population
  const traitKeys = new Set<string>();
  for (const agent of aliveAgents) {
    if (agent.traits) {
      Object.keys(agent.traits).forEach(key => traitKeys.add(key));
    }
  }
  
  let totalVariance = 0;
  let traitCount = 0;
  
  for (const key of traitKeys) {
    const values: number[] = [];
    
    for (const agent of aliveAgents) {
      const value = agent.traits?.[key];
      if (typeof value === "number") {
        values.push(value);
      }
    }
    
    if (values.length > 1) {
      // Calculate variance for this trait
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      
      // Normalize variance (using coefficient of variation)
      const cv = mean !== 0 ? Math.sqrt(variance) / Math.abs(mean) : 0;
      totalVariance += Math.min(cv, 1.0);  // Cap at 1.0
      traitCount++;
    }
  }
  
  const geneticDiversity = traitCount > 0 ? totalVariance / traitCount : 0;
  
  return {
    strategyVariation,
    specializationDistribution,
    geneticDiversity,
    timestamp: new Date(),
  };
}

/**
 * Track novel behaviors
 * 
 * Detects emergence of new strategies not present in previous generations.
 * Tracks novel behaviors and stores them in a database.
 * 
 * @param agents - Current population of agents
 * @param previousBehaviors - Previously known behaviors
 * @returns Array of newly discovered novel behaviors
 * 
 * Implements Requirement 19.6
 */
export function trackNovelBehaviors(
  agents: Agent[],
  previousBehaviors: NovelBehavior[]
): NovelBehavior[] {
  const novelBehaviors: NovelBehavior[] = [];
  const knownBehaviorNames = new Set(previousBehaviors.map(b => b.name));
  
  // Extract novel strategies from agent traits
  for (const agent of agents) {
    if (!agent.traits?.novelStrategies) {
      continue;
    }
    
    const strategies = agent.traits.novelStrategies as Array<{
      name: string;
      description: string;
      discoveredAt: Date;
      effectiveness: number;
    }>;
    
    for (const strategy of strategies) {
      // Check if this is a truly novel behavior
      if (!knownBehaviorNames.has(strategy.name)) {
        // Calculate adoption rate (how many agents use this strategy)
        const adoptionCount = agents.filter(a => {
          const agentStrategies = a.traits?.novelStrategies as typeof strategies | undefined;
          return agentStrategies?.some(s => s.name === strategy.name);
        }).length;
        
        const adoptionRate = (adoptionCount / agents.length) * 100;
        
        const novelBehavior: NovelBehavior = {
          id: `${agent.id}-${strategy.name}-${Date.now()}`,
          name: strategy.name,
          description: strategy.description,
          discoveredBy: agent.id,
          generation: agent.generation,
          timestamp: new Date(strategy.discoveredAt),
          effectiveness: strategy.effectiveness,
          adoptionRate,
        };
        
        novelBehaviors.push(novelBehavior);
        knownBehaviorNames.add(strategy.name);
      }
    }
  }
  
  return novelBehaviors;
}
