/**
 * Unit tests for fitness calculation system
 */

import { describe, it, expect } from "vitest";
import {
  calculateSurvivalFitness,
  calculateEarningsFitness,
  calculateOffspringFitness,
  calculateAdaptationFitness,
  calculateInnovationFitness,
  calculateFitness,
  calculateAggregateFitness,
  type TierImprovement,
  type NovelStrategy,
} from "./fitness.js";
import type { Agent, FitnessMetrics } from "../types.js";

// Helper to create test agent
function createTestAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "test-agent-1",
    publicKey: "test-pubkey",
    name: "Test Agent",
    generation: 0,
    parentId: undefined,
    childrenIds: [],
    birthDate: new Date(),
    age: 30,
    maxLifespan: 100,
    status: "alive",
    balance: 5.0,
    survivalTier: "normal",
    totalEarnings: 10.0,
    totalCosts: 5.0,
    model: "gpt-4",
    tools: [],
    skills: [],
    knowledgeBase: {},
    fitness: {
      survival: 0,
      earnings: 0,
      offspring: 0,
      adaptation: 0,
      innovation: 0,
    },
    mutations: [],
    traits: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("Fitness Calculation System", () => {
  describe("calculateSurvivalFitness", () => {
    it("should calculate survival fitness as age / maxLifespan", () => {
      const agent = createTestAgent({ age: 30, maxLifespan: 100 });
      const fitness = calculateSurvivalFitness(agent);
      expect(fitness).toBe(0.3);
    });

    it("should return 0 for maxLifespan of 0", () => {
      const agent = createTestAgent({ age: 30, maxLifespan: 0 });
      const fitness = calculateSurvivalFitness(agent);
      expect(fitness).toBe(0);
    });

    it("should handle agents that exceed maxLifespan", () => {
      const agent = createTestAgent({ age: 150, maxLifespan: 100 });
      const fitness = calculateSurvivalFitness(agent);
      expect(fitness).toBe(1.5);
    });

    it("should return 0 for newborn agents", () => {
      const agent = createTestAgent({ age: 0, maxLifespan: 100 });
      const fitness = calculateSurvivalFitness(agent);
      expect(fitness).toBe(0);
    });
  });

  describe("calculateEarningsFitness", () => {
    it("should calculate earnings fitness based on earnings per day", () => {
      const agent = createTestAgent({ totalEarnings: 10.0, age: 10 });
      const fitness = calculateEarningsFitness(agent);
      // earnings per day = 1.0, sigmoid(0.1 * 1.0) ≈ 0.525
      expect(fitness).toBeGreaterThan(0.5);
      expect(fitness).toBeLessThan(0.6);
    });

    it("should return 0 for newborn agents", () => {
      const agent = createTestAgent({ totalEarnings: 10.0, age: 0 });
      const fitness = calculateEarningsFitness(agent);
      expect(fitness).toBe(0);
    });

    it("should handle agents with no earnings", () => {
      const agent = createTestAgent({ totalEarnings: 0, age: 10 });
      const fitness = calculateEarningsFitness(agent);
      // sigmoid(0) = 0.5
      expect(fitness).toBeCloseTo(0.5, 1);
    });

    it("should increase with higher earnings", () => {
      const agent1 = createTestAgent({ totalEarnings: 10.0, age: 10 });
      const agent2 = createTestAgent({ totalEarnings: 100.0, age: 10 });
      const fitness1 = calculateEarningsFitness(agent1);
      const fitness2 = calculateEarningsFitness(agent2);
      expect(fitness2).toBeGreaterThan(fitness1);
    });
  });

  describe("calculateOffspringFitness", () => {
    it("should calculate offspring fitness based on offspring count", () => {
      const agent = createTestAgent({
        fitness: {
          survival: 0,
          earnings: 0,
          offspring: 3,
          adaptation: 0,
          innovation: 0,
        },
      });
      const fitness = calculateOffspringFitness(agent);
      // sigmoid(0.5 * 3) ≈ 0.817
      expect(fitness).toBeGreaterThan(0.8);
      expect(fitness).toBeLessThan(0.9);
    });

    it("should return ~0.5 for agents with no offspring", () => {
      const agent = createTestAgent({
        fitness: {
          survival: 0,
          earnings: 0,
          offspring: 0,
          adaptation: 0,
          innovation: 0,
        },
      });
      const fitness = calculateOffspringFitness(agent);
      // sigmoid(0) = 0.5
      expect(fitness).toBeCloseTo(0.5, 1);
    });

    it("should increase with more offspring", () => {
      const agent1 = createTestAgent({
        fitness: { survival: 0, earnings: 0, offspring: 1, adaptation: 0, innovation: 0 },
      });
      const agent2 = createTestAgent({
        fitness: { survival: 0, earnings: 0, offspring: 5, adaptation: 0, innovation: 0 },
      });
      const fitness1 = calculateOffspringFitness(agent1);
      const fitness2 = calculateOffspringFitness(agent2);
      expect(fitness2).toBeGreaterThan(fitness1);
    });
  });

  describe("calculateAdaptationFitness", () => {
    it("should calculate adaptation fitness from current tier when no history", () => {
      const agent = createTestAgent({ survivalTier: "thriving" });
      const fitness = calculateAdaptationFitness(agent);
      // thriving = 4, max = 4, so 4/4 = 1.0
      expect(fitness).toBe(1.0);
    });

    it("should calculate adaptation fitness from tier improvements", () => {
      const tierHistory: TierImprovement[] = [
        { fromTier: "critical", toTier: "low_compute", timestamp: new Date() },
        { fromTier: "low_compute", toTier: "normal", timestamp: new Date() },
      ];
      const agent = createTestAgent({ survivalTier: "normal" });
      const fitness = calculateAdaptationFitness(agent, tierHistory);
      // Improvements: (2-1) + (3-2) = 2, normalized by max 4 = 0.5
      expect(fitness).toBe(0.5);
    });

    it("should ignore tier downgrades", () => {
      const tierHistory: TierImprovement[] = [
        { fromTier: "normal", toTier: "low_compute", timestamp: new Date() },
        { fromTier: "low_compute", toTier: "normal", timestamp: new Date() },
      ];
      const agent = createTestAgent({ survivalTier: "normal" });
      const fitness = calculateAdaptationFitness(agent, tierHistory);
      // Only the upgrade counts: (3-2) = 1, normalized by max 4 = 0.25
      expect(fitness).toBe(0.25);
    });

    it("should handle agents in dead tier", () => {
      const agent = createTestAgent({ survivalTier: "dead" });
      const fitness = calculateAdaptationFitness(agent);
      // dead = 0, max = 4, so 0/4 = 0.0
      expect(fitness).toBe(0.0);
    });
  });

  describe("calculateInnovationFitness", () => {
    it("should return 0 for agents with no novel strategies", () => {
      const agent = createTestAgent();
      const fitness = calculateInnovationFitness(agent);
      expect(fitness).toBe(0);
    });

    it("should calculate innovation fitness from novel strategies", () => {
      const novelStrategies: NovelStrategy[] = [
        {
          name: "strategy1",
          description: "Novel approach",
          discoveredAt: new Date(),
          effectiveness: 0.8,
        },
        {
          name: "strategy2",
          description: "Another approach",
          discoveredAt: new Date(),
          effectiveness: 0.6,
        },
      ];
      const agent = createTestAgent();
      const fitness = calculateInnovationFitness(agent, novelStrategies);
      // Total effectiveness = 1.4, sigmoid(0.3 * 1.4) ≈ 0.603
      expect(fitness).toBeGreaterThan(0.6);
      expect(fitness).toBeLessThan(0.65);
    });

    it("should increase with more effective strategies", () => {
      const strategies1: NovelStrategy[] = [
        {
          name: "strategy1",
          description: "Low effectiveness",
          discoveredAt: new Date(),
          effectiveness: 0.2,
        },
      ];
      const strategies2: NovelStrategy[] = [
        {
          name: "strategy2",
          description: "High effectiveness",
          discoveredAt: new Date(),
          effectiveness: 0.9,
        },
      ];
      const agent = createTestAgent();
      const fitness1 = calculateInnovationFitness(agent, strategies1);
      const fitness2 = calculateInnovationFitness(agent, strategies2);
      expect(fitness2).toBeGreaterThan(fitness1);
    });
  });

  describe("calculateFitness", () => {
    it("should calculate all fitness dimensions", () => {
      const agent = createTestAgent({
        age: 50,
        maxLifespan: 100,
        totalEarnings: 20.0,
        survivalTier: "thriving",
        fitness: {
          survival: 0,
          earnings: 0,
          offspring: 2,
          adaptation: 0,
          innovation: 0,
        },
      });

      const fitness = calculateFitness(agent);

      expect(fitness.survival).toBe(0.5); // 50/100
      expect(fitness.earnings).toBeGreaterThan(0); // Based on earnings per day
      expect(fitness.offspring).toBeGreaterThan(0); // Based on offspring count
      expect(fitness.adaptation).toBe(1.0); // Thriving tier
      expect(fitness.innovation).toBe(0); // No novel strategies
    });

    it("should use tier history and novel strategies if provided", () => {
      const agent = createTestAgent({
        age: 30,
        maxLifespan: 100,
        totalEarnings: 10.0,
        survivalTier: "normal",
        fitness: {
          survival: 0,
          earnings: 0,
          offspring: 1,
          adaptation: 0,
          innovation: 0,
        },
      });

      const tierHistory: TierImprovement[] = [
        { fromTier: "critical", toTier: "normal", timestamp: new Date() },
      ];

      const novelStrategies: NovelStrategy[] = [
        {
          name: "strategy1",
          description: "Novel approach",
          discoveredAt: new Date(),
          effectiveness: 0.7,
        },
      ];

      const fitness = calculateFitness(agent, tierHistory, novelStrategies);

      expect(fitness.adaptation).toBeGreaterThan(0);
      expect(fitness.innovation).toBeGreaterThan(0);
    });
  });

  describe("calculateAggregateFitness", () => {
    it("should calculate weighted average of fitness dimensions", () => {
      const fitness: FitnessMetrics = {
        survival: 0.5,
        earnings: 0.6,
        offspring: 0.7,
        adaptation: 0.8,
        innovation: 0.9,
      };

      const aggregate = calculateAggregateFitness(fitness);

      // Default weights: 0.2, 0.3, 0.2, 0.15, 0.15
      // Expected: 0.5*0.2 + 0.6*0.3 + 0.7*0.2 + 0.8*0.15 + 0.9*0.15 = 0.675
      expect(aggregate).toBeCloseTo(0.675, 2);
    });

    it("should use custom weights if provided", () => {
      const fitness: FitnessMetrics = {
        survival: 0.5,
        earnings: 0.6,
        offspring: 0.7,
        adaptation: 0.8,
        innovation: 0.9,
      };

      const weights = {
        survival: 0.5,
        earnings: 0.2,
        offspring: 0.1,
        adaptation: 0.1,
        innovation: 0.1,
      };

      const aggregate = calculateAggregateFitness(fitness, weights);

      // Expected: 0.5*0.5 + 0.6*0.2 + 0.7*0.1 + 0.8*0.1 + 0.9*0.1 = 0.61
      expect(aggregate).toBeCloseTo(0.61, 2);
    });

    it("should throw error if weights don't sum to 1.0", () => {
      const fitness: FitnessMetrics = {
        survival: 0.5,
        earnings: 0.6,
        offspring: 0.7,
        adaptation: 0.8,
        innovation: 0.9,
      };

      const invalidWeights = {
        survival: 0.5,
        earnings: 0.5,
        offspring: 0.5,
        adaptation: 0.5,
        innovation: 0.5,
      };

      expect(() => calculateAggregateFitness(fitness, invalidWeights)).toThrow(
        "Weights must sum to 1.0"
      );
    });
  });
});
