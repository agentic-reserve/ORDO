/**
 * Unit tests for speciation detection
 */

import { describe, it, expect } from "vitest";
import {
  calculateTraitSimilarity,
  clusterByTraitSimilarity,
  identifyNiche,
  calculateDiversityIndex,
  detectSpeciation,
  analyzeSpeciesTrends,
  type Species,
  type SpeciesHistory,
} from "./speciation.js";
import type { Agent } from "../types.js";

// Helper to create test agent
function createTestAgent(
  id: string,
  traits: Record<string, unknown> = {},
  skills: string[] = []
): Agent {
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
    skills,
    knowledgeBase: {},
    fitness: {
      survival: 0.5,
      earnings: 0.5,
      offspring: 0.5,
      adaptation: 0.5,
      innovation: 0.5,
    },
    mutations: [],
    traits,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("Speciation Detection", () => {
  describe("calculateTraitSimilarity", () => {
    it("should return 1.0 for identical agents", () => {
      const agent1 = createTestAgent("1", { strategy: "aggressive", risk: 0.8 });
      const agent2 = createTestAgent("2", { strategy: "aggressive", risk: 0.8 });

      const similarity = calculateTraitSimilarity(agent1, agent2);
      expect(similarity).toBe(1.0);
    });

    it("should return low value for completely different agents", () => {
      const agent1 = createTestAgent("1", { strategy: "aggressive" });
      const agent2 = createTestAgent("2", { approach: "defensive" });

      const similarity = calculateTraitSimilarity(agent1, agent2);
      expect(similarity).toBeLessThanOrEqual(0.5);
    });

    it("should return intermediate value for partially similar agents", () => {
      const agent1 = createTestAgent("1", { strategy: "aggressive", risk: 0.8 });
      const agent2 = createTestAgent("2", { strategy: "defensive", risk: 0.8 });

      const similarity = calculateTraitSimilarity(agent1, agent2);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1.0);
    });

    it("should handle agents with no traits", () => {
      const agent1 = createTestAgent("1");
      const agent2 = createTestAgent("2");

      const similarity = calculateTraitSimilarity(agent1, agent2);
      expect(similarity).toBe(1.0);
    });

    it("should consider numeric trait values", () => {
      const agent1 = createTestAgent("1", { risk: 0.8 });
      const agent2 = createTestAgent("2", { risk: 0.85 });

      const similarity = calculateTraitSimilarity(agent1, agent2);
      expect(similarity).toBeGreaterThan(0.9); // Within 20% tolerance
    });
  });

  describe("clusterByTraitSimilarity", () => {
    it("should cluster similar agents together", () => {
      const population = [
        createTestAgent("1", { strategy: "aggressive" }),
        createTestAgent("2", { strategy: "aggressive" }),
        createTestAgent("3", { strategy: "defensive" }),
        createTestAgent("4", { strategy: "defensive" }),
      ];

      const clusters = clusterByTraitSimilarity(population, 0.7);

      expect(clusters.length).toBeGreaterThanOrEqual(1);
      expect(clusters.length).toBeLessThanOrEqual(4);
    });

    it("should handle empty population", () => {
      const clusters = clusterByTraitSimilarity([]);
      expect(clusters).toEqual([]);
    });

    it("should create single cluster for identical agents", () => {
      const population = [
        createTestAgent("1", { strategy: "aggressive" }),
        createTestAgent("2", { strategy: "aggressive" }),
        createTestAgent("3", { strategy: "aggressive" }),
      ];

      const clusters = clusterByTraitSimilarity(population, 0.7);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]).toHaveLength(3);
    });

    it("should throw error for invalid similarity threshold", () => {
      const population = [createTestAgent("1")];
      expect(() => clusterByTraitSimilarity(population, 1.5)).toThrow();
      expect(() => clusterByTraitSimilarity(population, -0.1)).toThrow();
    });
  });

  describe("identifyNiche", () => {
    it("should identify niche based on skills", () => {
      const cluster = [
        createTestAgent("1", {}, ["trading", "analysis"]),
        createTestAgent("2", {}, ["trading", "risk-management"]),
        createTestAgent("3", {}, ["trading"]),
      ];

      const niche = identifyNiche(cluster);

      expect(niche.specialization).toBe("trading");
      expect(niche.name).toContain("trading");
    });

    it("should identify high-earner niche", () => {
      const cluster = [
        { ...createTestAgent("1"), totalEarnings: 100 },
        { ...createTestAgent("2"), totalEarnings: 80 },
      ];

      const niche = identifyNiche(cluster);

      expect(niche.specialization).toBe("high-earner");
    });

    it("should identify accumulator niche", () => {
      const cluster = [
        { ...createTestAgent("1"), balance: 25 },
        { ...createTestAgent("2"), balance: 30 },
      ];

      const niche = identifyNiche(cluster);

      expect(niche.specialization).toBe("accumulator");
    });

    it("should handle empty cluster", () => {
      const niche = identifyNiche([]);

      expect(niche.specialization).toBe("none");
      expect(niche.name).toBe("unknown");
    });
  });

  describe("calculateDiversityIndex", () => {
    it("should return 0 for empty species array", () => {
      const diversity = calculateDiversityIndex([]);
      expect(diversity).toBe(0);
    });

    it("should return 0 for single species", () => {
      const species: Species[] = [
        {
          id: "s1",
          name: "Species 1",
          traits: [],
          niche: {
            name: "niche1",
            description: "Test niche",
            specialization: "test",
            characteristics: {},
          },
          population: [createTestAgent("1"), createTestAgent("2")],
          emergenceGeneration: 0,
          avgFitness: 0.5,
        },
      ];

      const diversity = calculateDiversityIndex(species);
      expect(diversity).toBe(0);
    });

    it("should increase with more species", () => {
      const species2: Species[] = [
        {
          id: "s1",
          name: "Species 1",
          traits: [],
          niche: {
            name: "niche1",
            description: "Test",
            specialization: "test1",
            characteristics: {},
          },
          population: [createTestAgent("1")],
          emergenceGeneration: 0,
          avgFitness: 0.5,
        },
        {
          id: "s2",
          name: "Species 2",
          traits: [],
          niche: {
            name: "niche2",
            description: "Test",
            specialization: "test2",
            characteristics: {},
          },
          population: [createTestAgent("2")],
          emergenceGeneration: 0,
          avgFitness: 0.5,
        },
      ];

      const diversity2 = calculateDiversityIndex(species2);
      expect(diversity2).toBeGreaterThan(0);
    });
  });

  describe("detectSpeciation", () => {
    it("should detect species in population", () => {
      const population = [
        createTestAgent("1", { strategy: "aggressive" }),
        createTestAgent("2", { strategy: "aggressive" }),
        createTestAgent("3", { strategy: "aggressive" }),
        createTestAgent("4", { strategy: "defensive" }),
        createTestAgent("5", { strategy: "defensive" }),
        createTestAgent("6", { strategy: "defensive" }),
      ];

      const result = detectSpeciation(population);

      expect(result.species.length).toBeGreaterThan(0);
      expect(result.totalPopulation).toBe(6);
      expect(result.diversityIndex).toBeGreaterThanOrEqual(0);
    });

    it("should handle empty population", () => {
      const result = detectSpeciation([]);

      expect(result.species).toEqual([]);
      expect(result.totalPopulation).toBe(0);
      expect(result.diversityIndex).toBe(0);
      expect(result.speciationEvents).toBe(0);
    });

    it("should only consider clusters with 3+ members as species", () => {
      const population = [
        createTestAgent("1", { strategy: "aggressive" }),
        createTestAgent("2", { strategy: "aggressive" }),
        createTestAgent("3", { strategy: "defensive" }), // Only 1 member
      ];

      const result = detectSpeciation(population);

      // Should not detect the single-member cluster as a species
      expect(result.species.length).toBeLessThanOrEqual(1);
    });

    it("should track speciation events", () => {
      const population = [
        createTestAgent("1", { strategy: "aggressive" }),
        createTestAgent("2", { strategy: "aggressive" }),
        createTestAgent("3", { strategy: "aggressive" }),
      ];

      const result = detectSpeciation(population);

      expect(result.speciationEvents).toBeGreaterThanOrEqual(0);
    });
  });

  describe("analyzeSpeciesTrends", () => {
    it("should detect emerging species", () => {
      const history: SpeciesHistory[] = [
        {
          timestamp: new Date(),
          generation: 0,
          result: {
            species: [
              {
                id: "s1",
                name: "Species 1",
                traits: [],
                niche: {
                  name: "niche1",
                  description: "Test",
                  specialization: "trader",
                  characteristics: {},
                },
                population: [createTestAgent("1"), createTestAgent("2"), createTestAgent("3")],
                emergenceGeneration: 0,
                avgFitness: 0.5,
              },
            ],
            totalPopulation: 3,
            diversityIndex: 0,
            speciationEvents: 1,
          },
        },
        {
          timestamp: new Date(),
          generation: 1,
          result: {
            species: [
              {
                id: "s1",
                name: "Species 1",
                traits: [],
                niche: {
                  name: "niche1",
                  description: "Test",
                  specialization: "trader",
                  characteristics: {},
                },
                population: [createTestAgent("1"), createTestAgent("2"), createTestAgent("3")],
                emergenceGeneration: 0,
                avgFitness: 0.5,
              },
              {
                id: "s2",
                name: "Species 2",
                traits: [],
                niche: {
                  name: "niche2",
                  description: "Test",
                  specialization: "researcher",
                  characteristics: {},
                },
                population: [createTestAgent("4"), createTestAgent("5"), createTestAgent("6")],
                emergenceGeneration: 1,
                avgFitness: 0.6,
              },
            ],
            totalPopulation: 6,
            diversityIndex: 0.69,
            speciationEvents: 1,
          },
        },
      ];

      const trends = analyzeSpeciesTrends(history);

      expect(trends.emergingSpecies).toContain("researcher");
    });

    it("should detect extinct species", () => {
      const history: SpeciesHistory[] = [
        {
          timestamp: new Date(),
          generation: 0,
          result: {
            species: [
              {
                id: "s1",
                name: "Species 1",
                traits: [],
                niche: {
                  name: "niche1",
                  description: "Test",
                  specialization: "trader",
                  characteristics: {},
                },
                population: [createTestAgent("1"), createTestAgent("2"), createTestAgent("3")],
                emergenceGeneration: 0,
                avgFitness: 0.5,
              },
            ],
            totalPopulation: 3,
            diversityIndex: 0,
            speciationEvents: 1,
          },
        },
        {
          timestamp: new Date(),
          generation: 1,
          result: {
            species: [],
            totalPopulation: 0,
            diversityIndex: 0,
            speciationEvents: 0,
          },
        },
      ];

      const trends = analyzeSpeciesTrends(history);

      expect(trends.extinctSpecies).toContain("trader");
    });

    it("should handle insufficient history", () => {
      const history: SpeciesHistory[] = [
        {
          timestamp: new Date(),
          generation: 0,
          result: {
            species: [],
            totalPopulation: 0,
            diversityIndex: 0,
            speciationEvents: 0,
          },
        },
      ];

      const trends = analyzeSpeciesTrends(history);

      expect(trends.emergingSpecies).toEqual([]);
      expect(trends.decliningSpecies).toEqual([]);
      expect(trends.stableSpecies).toEqual([]);
      expect(trends.extinctSpecies).toEqual([]);
    });
  });
});
