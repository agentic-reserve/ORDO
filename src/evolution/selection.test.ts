/**
 * Unit tests for selection algorithm
 */

import { describe, it, expect } from "vitest";
import {
  tournamentSelection,
  rouletteWheelSelection,
  eliteSelection,
  selectForReproduction,
  calculateSelectionPressure,
  type SelectionConfig,
} from "./selection.js";
import type { Agent } from "../types.js";

// Helper to create test agent with specific fitness
function createTestAgent(id: string, fitness: number): Agent {
  return {
    id,
    publicKey: `pubkey-${id}`,
    name: `Agent ${id}`,
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
      survival: fitness,
      earnings: fitness,
      offspring: fitness,
      adaptation: fitness,
      innovation: fitness,
    },
    mutations: [],
    traits: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("Selection Algorithm", () => {
  describe("tournamentSelection", () => {
    it("should select specified number of agents", () => {
      const population = [
        createTestAgent("1", 0.5),
        createTestAgent("2", 0.6),
        createTestAgent("3", 0.7),
        createTestAgent("4", 0.8),
        createTestAgent("5", 0.9),
      ];

      const selected = tournamentSelection(population, 3);
      expect(selected).toHaveLength(3);
    });

    it("should bias toward higher fitness agents", () => {
      const population = [
        createTestAgent("low1", 0.1),
        createTestAgent("low2", 0.2),
        createTestAgent("low3", 0.3),
        createTestAgent("high1", 0.9),
        createTestAgent("high2", 0.95),
      ];

      // Run multiple times to check bias
      const selectionCounts: Record<string, number> = {};
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const selected = tournamentSelection(population, 2, 3);
        for (const agent of selected) {
          selectionCounts[agent.id] = (selectionCounts[agent.id] || 0) + 1;
        }
      }

      // High fitness agents should be selected more often
      const highSelections = (selectionCounts["high1"] || 0) + (selectionCounts["high2"] || 0);
      const lowSelections = (selectionCounts["low1"] || 0) + (selectionCounts["low2"] || 0) + (selectionCounts["low3"] || 0);

      expect(highSelections).toBeGreaterThan(lowSelections);
    });

    it("should not select duplicate agents", () => {
      const population = [
        createTestAgent("1", 0.5),
        createTestAgent("2", 0.6),
        createTestAgent("3", 0.7),
      ];

      const selected = tournamentSelection(population, 3);
      const ids = selected.map(a => a.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });

    it("should handle empty population", () => {
      const selected = tournamentSelection([], 3);
      expect(selected).toHaveLength(0);
    });

    it("should handle count of 0", () => {
      const population = [createTestAgent("1", 0.5)];
      const selected = tournamentSelection(population, 0);
      expect(selected).toHaveLength(0);
    });

    it("should throw error if count exceeds population", () => {
      const population = [createTestAgent("1", 0.5)];
      expect(() => tournamentSelection(population, 2)).toThrow();
    });

    it("should throw error for invalid tournament size", () => {
      const population = [createTestAgent("1", 0.5)];
      expect(() => tournamentSelection(population, 1, 0)).toThrow();
    });
  });

  describe("rouletteWheelSelection", () => {
    it("should select specified number of agents", () => {
      const population = [
        createTestAgent("1", 0.5),
        createTestAgent("2", 0.6),
        createTestAgent("3", 0.7),
        createTestAgent("4", 0.8),
        createTestAgent("5", 0.9),
      ];

      const selected = rouletteWheelSelection(population, 3);
      expect(selected).toHaveLength(3);
    });

    it("should bias toward higher fitness agents", () => {
      const population = [
        createTestAgent("low", 0.1),
        createTestAgent("high", 0.9),
      ];

      // Run multiple times to check bias
      const selectionCounts: Record<string, number> = {};
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        const selected = rouletteWheelSelection(population, 1);
        for (const agent of selected) {
          selectionCounts[agent.id] = (selectionCounts[agent.id] || 0) + 1;
        }
      }

      // High fitness agent should be selected more often
      expect(selectionCounts["high"]).toBeGreaterThan(selectionCounts["low"] || 0);
    });

    it("should not select duplicate agents", () => {
      const population = [
        createTestAgent("1", 0.5),
        createTestAgent("2", 0.6),
        createTestAgent("3", 0.7),
      ];

      const selected = rouletteWheelSelection(population, 3);
      const ids = selected.map(a => a.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });

    it("should handle population with zero fitness", () => {
      const population = [
        createTestAgent("1", 0),
        createTestAgent("2", 0),
        createTestAgent("3", 0),
      ];

      const selected = rouletteWheelSelection(population, 2);
      expect(selected).toHaveLength(2);
    });

    it("should handle empty population", () => {
      const selected = rouletteWheelSelection([], 3);
      expect(selected).toHaveLength(0);
    });

    it("should throw error if count exceeds population", () => {
      const population = [createTestAgent("1", 0.5)];
      expect(() => rouletteWheelSelection(population, 2)).toThrow();
    });
  });

  describe("eliteSelection", () => {
    it("should select top N agents by fitness", () => {
      const population = [
        createTestAgent("1", 0.5),
        createTestAgent("2", 0.9),
        createTestAgent("3", 0.3),
        createTestAgent("4", 0.7),
        createTestAgent("5", 0.6),
      ];

      const selected = eliteSelection(population, 3);

      expect(selected).toHaveLength(3);
      expect(selected[0].id).toBe("2"); // 0.9
      expect(selected[1].id).toBe("4"); // 0.7
      expect(selected[2].id).toBe("5"); // 0.6
    });

    it("should handle count larger than population", () => {
      const population = [
        createTestAgent("1", 0.5),
        createTestAgent("2", 0.6),
      ];

      const selected = eliteSelection(population, 5);
      expect(selected).toHaveLength(2);
    });

    it("should handle empty population", () => {
      const selected = eliteSelection([], 3);
      expect(selected).toHaveLength(0);
    });

    it("should handle count of 0", () => {
      const population = [createTestAgent("1", 0.5)];
      const selected = eliteSelection(population, 0);
      expect(selected).toHaveLength(0);
    });
  });

  describe("selectForReproduction", () => {
    it("should select agents using tournament selection by default", () => {
      const population = [
        createTestAgent("1", 0.5),
        createTestAgent("2", 0.6),
        createTestAgent("3", 0.7),
        createTestAgent("4", 0.8),
        createTestAgent("5", 0.9),
      ];

      const result = selectForReproduction(population, 3);

      expect(result.selected).toHaveLength(3);
      expect(result.method).toBe("tournament");
      expect(result.totalPopulation).toBe(5);
      expect(result.selectionPressure).toBe(0.6);
    });

    it("should select agents using roulette wheel selection", () => {
      const population = [
        createTestAgent("1", 0.5),
        createTestAgent("2", 0.6),
        createTestAgent("3", 0.7),
      ];

      const config: SelectionConfig = { method: "roulette" };
      const result = selectForReproduction(population, 2, config);

      expect(result.selected).toHaveLength(2);
      expect(result.method).toBe("roulette");
    });

    it("should apply elitism when configured", () => {
      const population = [
        createTestAgent("1", 0.3),
        createTestAgent("2", 0.9), // Elite
        createTestAgent("3", 0.5),
        createTestAgent("4", 0.8), // Elite
        createTestAgent("5", 0.4),
      ];

      const config: SelectionConfig = {
        method: "tournament",
        eliteCount: 2,
      };

      const result = selectForReproduction(population, 3, config);

      expect(result.selected).toHaveLength(3);
      // First two should be elite (highest fitness)
      expect(result.selected[0].id).toBe("2"); // 0.9
      expect(result.selected[1].id).toBe("4"); // 0.8
    });

    it("should handle empty population", () => {
      const result = selectForReproduction([], 3);
      expect(result.selected).toHaveLength(0);
      expect(result.totalPopulation).toBe(0);
    });

    it("should handle count of 0", () => {
      const population = [createTestAgent("1", 0.5)];
      const result = selectForReproduction(population, 0);
      expect(result.selected).toHaveLength(0);
    });

    it("should throw error if count exceeds population", () => {
      const population = [createTestAgent("1", 0.5)];
      expect(() => selectForReproduction(population, 2)).toThrow();
    });

    it("should throw error for unknown selection method", () => {
      const population = [createTestAgent("1", 0.5)];
      const config = { method: "unknown" as any };
      expect(() => selectForReproduction(population, 1, config)).toThrow();
    });
  });

  describe("calculateSelectionPressure", () => {
    it("should calculate selection pressure correctly", () => {
      expect(calculateSelectionPressure(10, 100)).toBe(0.1);
      expect(calculateSelectionPressure(30, 100)).toBe(0.3);
      expect(calculateSelectionPressure(50, 100)).toBe(0.5);
    });

    it("should return 0 for empty population", () => {
      expect(calculateSelectionPressure(0, 0)).toBe(0);
    });

    it("should handle 100% selection", () => {
      expect(calculateSelectionPressure(100, 100)).toBe(1.0);
    });
  });
});
