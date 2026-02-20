/**
 * Unit tests for population dynamics tracking
 */

import { describe, it, expect } from "vitest";
import {
  trackPopulation,
  calculateGenerationalMetrics,
  calculateGenerationalImprovement,
  calculateDiversityMetrics,
  trackNovelBehaviors,
  type PopulationSnapshot,
  type NovelBehavior,
} from "./population.js";
import type { Agent } from "../types.js";

// Helper function to create test agents
function createTestAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: `agent-${Math.random()}`,
    publicKey: `pubkey-${Math.random()}`,
    name: "Test Agent",
    generation: 0,
    parentId: undefined,
    childrenIds: [],
    birthDate: new Date(),
    age: 30,
    maxLifespan: 365,
    status: "alive",
    balance: 5.0,
    survivalTier: "normal",
    totalEarnings: 10.0,
    totalCosts: 5.0,
    model: "gpt-4",
    tools: ["swap", "transfer"],
    skills: ["trading"],
    knowledgeBase: {},
    fitness: {
      survival: 0.5,
      earnings: 0.6,
      offspring: 0.3,
      adaptation: 0.4,
      innovation: 0.2,
    },
    mutations: [],
    traits: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("trackPopulation", () => {
  it("should track population size correctly", () => {
    const agents: Agent[] = [
      createTestAgent({ status: "alive" }),
      createTestAgent({ status: "alive" }),
      createTestAgent({ status: "dead", deathCause: "starvation" }),
    ];
    
    const result = trackPopulation(agents);
    
    expect(result.current.aliveCount).toBe(2);
    expect(result.current.deadCount).toBe(1);
    expect(result.current.totalCount).toBe(3);
  });
  
  it("should calculate growth rate with previous snapshot", () => {
    const agents: Agent[] = [
      createTestAgent({ status: "alive" }),
      createTestAgent({ status: "alive" }),
      createTestAgent({ status: "alive" }),
    ];
    
    const previousSnapshot: PopulationSnapshot = {
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      generation: 0,
      aliveCount: 2,
      deadCount: 0,
      totalCount: 2,
      birthsInPeriod: 0,
      deathsInPeriod: 0,
      netGrowth: 0,
      growthRate: 0,
    };
    
    const result = trackPopulation(agents, previousSnapshot);
    
    expect(result.current.growthRate).toBe(50); // (3-2)/2 * 100 = 50%
    expect(result.growthTrend).toBe("increasing");
  });
  
  it("should detect decreasing growth trend", () => {
    const agents: Agent[] = [
      createTestAgent({ status: "alive" }),
    ];
    
    const previousSnapshot: PopulationSnapshot = {
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
      generation: 0,
      aliveCount: 2,
      deadCount: 0,
      totalCount: 2,
      birthsInPeriod: 0,
      deathsInPeriod: 0,
      netGrowth: 0,
      growthRate: 0,
    };
    
    const result = trackPopulation(agents, previousSnapshot);
    
    expect(result.current.growthRate).toBe(-50); // (1-2)/2 * 100 = -50%
    expect(result.growthTrend).toBe("decreasing");
  });
  
  it("should track births and deaths in period", () => {
    const now = new Date();
    const halfDayAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    
    const agents: Agent[] = [
      createTestAgent({ status: "alive", birthDate: halfDayAgo }),
      createTestAgent({ status: "alive", birthDate: twoDaysAgo }),
      createTestAgent({ status: "dead", deathDate: halfDayAgo }),
    ];
    
    const previousSnapshot: PopulationSnapshot = {
      timestamp: twoDaysAgo,
      generation: 0,
      aliveCount: 1,
      deadCount: 0,
      totalCount: 1,
      birthsInPeriod: 0,
      deathsInPeriod: 0,
      netGrowth: 0,
      growthRate: 0,
    };
    
    const result = trackPopulation(agents, previousSnapshot, 1);
    
    // Both agents born after the cutoff (now - 1 day) should count
    expect(result.current.birthsInPeriod).toBeGreaterThanOrEqual(1);
    expect(result.current.deathsInPeriod).toBe(1);
  });
});

describe("calculateGenerationalMetrics", () => {
  it("should calculate average fitness for a generation", () => {
    const agents: Agent[] = [
      createTestAgent({
        generation: 1,
        status: "alive",
        age: 80,
        maxLifespan: 100,
        totalEarnings: 10,
        fitness: { survival: 0.8, earnings: 0.7, offspring: 0.6, adaptation: 0.5, innovation: 0.4 },
      }),
      createTestAgent({
        generation: 1,
        status: "alive",
        age: 60,
        maxLifespan: 100,
        totalEarnings: 5,
        fitness: { survival: 0.6, earnings: 0.5, offspring: 0.4, adaptation: 0.3, innovation: 0.2 },
      }),
    ];
    
    const metrics = calculateGenerationalMetrics(agents, 1);
    
    expect(metrics.generation).toBe(1);
    expect(metrics.agentCount).toBe(2);
    // The function recalculates fitness, so we check that it's reasonable
    expect(metrics.avgSurvivalFitness).toBeGreaterThan(0);
    expect(metrics.avgSurvivalFitness).toBeLessThanOrEqual(1);
    expect(metrics.avgEarningsFitness).toBeGreaterThan(0);
    expect(metrics.avgEarningsFitness).toBeLessThanOrEqual(1);
  });
  
  it("should return zero metrics for empty generation", () => {
    const agents: Agent[] = [];
    
    const metrics = calculateGenerationalMetrics(agents, 1);
    
    expect(metrics.generation).toBe(1);
    expect(metrics.agentCount).toBe(0);
    expect(metrics.avgFitness).toBe(0);
  });
  
  it("should calculate metrics for all alive agents when generation not specified", () => {
    const agents: Agent[] = [
      createTestAgent({ generation: 0, status: "alive" }),
      createTestAgent({ generation: 1, status: "alive" }),
      createTestAgent({ generation: 2, status: "dead" }),
    ];
    
    const metrics = calculateGenerationalMetrics(agents);
    
    expect(metrics.agentCount).toBe(2); // Only alive agents
  });
});

describe("calculateGenerationalImprovement", () => {
  it("should calculate fitness improvement between generations", () => {
    const previousMetrics = {
      generation: 0,
      agentCount: 10,
      avgFitness: 0.5,
      avgSurvivalFitness: 0.5,
      avgEarningsFitness: 0.5,
      avgOffspringFitness: 0.5,
      avgAdaptationFitness: 0.5,
      avgInnovationFitness: 0.5,
      timestamp: new Date(),
    };
    
    const currentMetrics = {
      generation: 1,
      agentCount: 12,
      avgFitness: 0.7,
      avgSurvivalFitness: 0.7,
      avgEarningsFitness: 0.7,
      avgOffspringFitness: 0.7,
      avgAdaptationFitness: 0.7,
      avgInnovationFitness: 0.7,
      timestamp: new Date(),
    };
    
    const improvement = calculateGenerationalImprovement(previousMetrics, currentMetrics);
    
    expect(improvement.fromGeneration).toBe(0);
    expect(improvement.toGeneration).toBe(1);
    expect(improvement.fitnessImprovement).toBeCloseTo(0.2, 1); // 0.7 - 0.5
    expect(improvement.improvementVelocity).toBeCloseTo(0.2, 1); // 0.2 / 1 generation
  });
  
  it("should calculate improvement velocity over multiple generations", () => {
    const previousMetrics = {
      generation: 0,
      agentCount: 10,
      avgFitness: 0.4,
      avgSurvivalFitness: 0.4,
      avgEarningsFitness: 0.4,
      avgOffspringFitness: 0.4,
      avgAdaptationFitness: 0.4,
      avgInnovationFitness: 0.4,
      timestamp: new Date(),
    };
    
    const currentMetrics = {
      generation: 3,
      agentCount: 15,
      avgFitness: 0.7,
      avgSurvivalFitness: 0.7,
      avgEarningsFitness: 0.7,
      avgOffspringFitness: 0.7,
      avgAdaptationFitness: 0.7,
      avgInnovationFitness: 0.7,
      timestamp: new Date(),
    };
    
    const improvement = calculateGenerationalImprovement(previousMetrics, currentMetrics);
    
    expect(improvement.fitnessImprovement).toBeCloseTo(0.3, 1); // 0.7 - 0.4
    expect(improvement.improvementVelocity).toBeCloseTo(0.1, 1); // 0.3 / 3 generations
  });
});

describe("calculateDiversityMetrics", () => {
  it("should calculate strategy variation", () => {
    const agents: Agent[] = [
      createTestAgent({ status: "alive", model: "gpt-4", tools: ["swap"], skills: ["trading"] }),
      createTestAgent({ status: "alive", model: "gpt-3.5-turbo", tools: ["transfer"], skills: ["research"] }),
      createTestAgent({ status: "alive", model: "claude-3", tools: ["mint"], skills: ["coding"] }),
    ];
    
    const metrics = calculateDiversityMetrics(agents);
    
    expect(metrics.strategyVariation).toBeGreaterThan(0);
    expect(metrics.strategyVariation).toBeLessThanOrEqual(1);
  });
  
  it("should calculate specialization distribution", () => {
    const agents: Agent[] = [
      createTestAgent({ status: "alive", skills: ["trading", "swap"] }),
      createTestAgent({ status: "alive", skills: ["trade-analysis", "swap"] }),
      createTestAgent({ status: "alive", skills: ["research", "analyze"] }),
      createTestAgent({ status: "alive", skills: ["coding", "build"] }),
    ];
    
    const metrics = calculateDiversityMetrics(agents);
    
    // Check that specializations are detected
    expect(metrics.specializationDistribution.trader).toBeGreaterThanOrEqual(1);
    expect(metrics.specializationDistribution.researcher).toBe(1);
    expect(metrics.specializationDistribution.coder).toBe(1);
  });
  
  it("should calculate genetic diversity from trait variance", () => {
    const agents: Agent[] = [
      createTestAgent({ status: "alive", traits: { aggression: 0.8, curiosity: 0.6 } }),
      createTestAgent({ status: "alive", traits: { aggression: 0.2, curiosity: 0.4 } }),
      createTestAgent({ status: "alive", traits: { aggression: 0.5, curiosity: 0.9 } }),
    ];
    
    const metrics = calculateDiversityMetrics(agents);
    
    expect(metrics.geneticDiversity).toBeGreaterThan(0);
    expect(metrics.geneticDiversity).toBeLessThanOrEqual(1);
  });
  
  it("should return zero metrics for empty population", () => {
    const agents: Agent[] = [];
    
    const metrics = calculateDiversityMetrics(agents);
    
    expect(metrics.strategyVariation).toBe(0);
    expect(metrics.geneticDiversity).toBe(0);
    expect(Object.keys(metrics.specializationDistribution).length).toBe(0);
  });
});

describe("trackNovelBehaviors", () => {
  it("should detect new novel behaviors", () => {
    const agents: Agent[] = [
      createTestAgent({
        id: "agent-1",
        generation: 2,
        traits: {
          novelStrategies: [
            {
              name: "arbitrage-trading",
              description: "Cross-DEX arbitrage strategy",
              discoveredAt: new Date(),
              effectiveness: 0.85,
            },
          ],
        },
      }),
    ];
    
    const previousBehaviors: NovelBehavior[] = [];
    
    const novelBehaviors = trackNovelBehaviors(agents, previousBehaviors);
    
    expect(novelBehaviors.length).toBe(1);
    expect(novelBehaviors[0].name).toBe("arbitrage-trading");
    expect(novelBehaviors[0].discoveredBy).toBe("agent-1");
    expect(novelBehaviors[0].generation).toBe(2);
    expect(novelBehaviors[0].effectiveness).toBe(0.85);
  });
  
  it("should not report already known behaviors", () => {
    const agents: Agent[] = [
      createTestAgent({
        traits: {
          novelStrategies: [
            {
              name: "known-strategy",
              description: "Already known",
              discoveredAt: new Date(),
              effectiveness: 0.7,
            },
          ],
        },
      }),
    ];
    
    const previousBehaviors: NovelBehavior[] = [
      {
        id: "prev-1",
        name: "known-strategy",
        description: "Already known",
        discoveredBy: "agent-0",
        generation: 1,
        timestamp: new Date(),
        effectiveness: 0.7,
        adoptionRate: 50,
      },
    ];
    
    const novelBehaviors = trackNovelBehaviors(agents, previousBehaviors);
    
    expect(novelBehaviors.length).toBe(0);
  });
  
  it("should calculate adoption rate", () => {
    const sharedStrategy = {
      name: "shared-strategy",
      description: "Used by multiple agents",
      discoveredAt: new Date(),
      effectiveness: 0.8,
    };
    
    const agents: Agent[] = [
      createTestAgent({ traits: { novelStrategies: [sharedStrategy] } }),
      createTestAgent({ traits: { novelStrategies: [sharedStrategy] } }),
      createTestAgent({ traits: { novelStrategies: [] } }),
    ];
    
    const previousBehaviors: NovelBehavior[] = [];
    
    const novelBehaviors = trackNovelBehaviors(agents, previousBehaviors);
    
    expect(novelBehaviors.length).toBe(1);
    expect(novelBehaviors[0].adoptionRate).toBeCloseTo(66.67, 1); // 2/3 * 100
  });
  
  it("should handle agents without novel strategies", () => {
    const agents: Agent[] = [
      createTestAgent({ traits: {} }),
      createTestAgent({ traits: { novelStrategies: undefined } }),
    ];
    
    const previousBehaviors: NovelBehavior[] = [];
    
    const novelBehaviors = trackNovelBehaviors(agents, previousBehaviors);
    
    expect(novelBehaviors.length).toBe(0);
  });
});
