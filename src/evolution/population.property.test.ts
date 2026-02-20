/**
 * Property-based tests for population dynamics tracking
 * 
 * These tests verify universal properties that should hold across all inputs.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  trackPopulation,
  calculateGenerationalMetrics,
  calculateGenerationalImprovement,
  calculateDiversityMetrics,
  trackNovelBehaviors,
  type PopulationSnapshot,
} from "./population.js";
import type { Agent, AgentStatus, SurvivalTier } from "../types.js";

// Arbitrary generators for property-based testing

const arbitraryAgentStatus = fc.constantFrom<AgentStatus>("alive", "dead");

const arbitrarySurvivalTier = fc.constantFrom<SurvivalTier>(
  "thriving",
  "normal",
  "low_compute",
  "critical",
  "dead"
);

const arbitraryAgent = fc.record({
  id: fc.uuid(),
  publicKey: fc.string({ minLength: 32, maxLength: 44 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  generation: fc.nat({ max: 100 }),
  parentId: fc.option(fc.uuid(), { nil: undefined }),
  childrenIds: fc.array(fc.uuid(), { maxLength: 10 }),
  birthDate: fc.date({ min: new Date(2024, 0, 1), max: new Date() }),
  age: fc.nat({ max: 365 }),
  maxLifespan: fc.integer({ min: 30, max: 730 }),
  status: arbitraryAgentStatus,
  deathCause: fc.option(fc.constantFrom("starvation", "old_age", "terminated", "error"), { nil: undefined }),
  deathDate: fc.option(fc.date({ min: new Date(2024, 0, 1), max: new Date() }), { nil: undefined }),
  balance: fc.double({ min: 0, max: 100, noNaN: true }),
  survivalTier: arbitrarySurvivalTier,
  totalEarnings: fc.double({ min: 0, max: 1000, noNaN: true }),
  totalCosts: fc.double({ min: 0, max: 1000, noNaN: true }),
  model: fc.constantFrom("gpt-4", "gpt-3.5-turbo", "claude-3", "claude-2"),
  tools: fc.array(fc.constantFrom("swap", "transfer", "stake", "mint"), { maxLength: 5 }),
  skills: fc.array(fc.constantFrom("trading", "research", "coding", "coordination"), { maxLength: 5 }),
  knowledgeBase: fc.dictionary(fc.string(), fc.anything()),
  fitness: fc.record({
    survival: fc.double({ min: 0, max: 1, noNaN: true }),
    earnings: fc.double({ min: 0, max: 1, noNaN: true }),
    offspring: fc.double({ min: 0, max: 1, noNaN: true }),
    adaptation: fc.double({ min: 0, max: 1, noNaN: true }),
    innovation: fc.double({ min: 0, max: 1, noNaN: true }),
  }),
  mutations: fc.array(fc.string(), { maxLength: 10 }),
  traits: fc.dictionary(fc.string(), fc.anything()),
  createdAt: fc.date({ min: new Date(2024, 0, 1), max: new Date() }),
  updatedAt: fc.date({ min: new Date(2024, 0, 1), max: new Date() }),
}) as fc.Arbitrary<Agent>;

const arbitraryPopulation = fc.array(arbitraryAgent, { minLength: 0, maxLength: 100 });

describe("Property 86: Population Size Tracking", () => {
  it("should always track population size correctly (alive + dead = total)", () => {
    fc.assert(
      fc.property(arbitraryPopulation, (agents) => {
        const result = trackPopulation(agents);
        
        // Property: alive + dead = total
        expect(result.current.aliveCount + result.current.deadCount).toBe(result.current.totalCount);
        
        // Property: counts are non-negative
        expect(result.current.aliveCount).toBeGreaterThanOrEqual(0);
        expect(result.current.deadCount).toBeGreaterThanOrEqual(0);
        expect(result.current.totalCount).toBeGreaterThanOrEqual(0);
        
        // Property: total count equals input length
        expect(result.current.totalCount).toBe(agents.length);
      }),
      { numRuns: 100 }
    );
  });
  
  it("should calculate growth rate correctly with previous snapshot", () => {
    fc.assert(
      fc.property(
        arbitraryPopulation,
        fc.nat({ max: 100 }),
        (agents, previousAliveCount) => {
          const previousSnapshot: PopulationSnapshot = {
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
            generation: 0,
            aliveCount: previousAliveCount,
            deadCount: 0,
            totalCount: previousAliveCount,
            birthsInPeriod: 0,
            deathsInPeriod: 0,
            netGrowth: 0,
            growthRate: 0,
          };
          
          const result = trackPopulation(agents, previousSnapshot);
          
          // Property: growth rate calculation is correct
          if (previousAliveCount > 0) {
            const expectedGrowthRate = ((result.current.aliveCount - previousAliveCount) / previousAliveCount) * 100;
            expect(result.current.growthRate).toBeCloseTo(expectedGrowthRate, 5);
          }
          
          // Property: growth trend matches growth rate
          if (result.current.growthRate > 5) {
            expect(result.growthTrend).toBe("increasing");
          } else if (result.current.growthRate < -5) {
            expect(result.growthTrend).toBe("decreasing");
          } else {
            expect(result.growthTrend).toBe("stable");
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it("should track net growth as births minus deaths", () => {
    fc.assert(
      fc.property(arbitraryPopulation, (agents) => {
        const previousSnapshot: PopulationSnapshot = {
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          generation: 0,
          aliveCount: 0,
          deadCount: 0,
          totalCount: 0,
          birthsInPeriod: 0,
          deathsInPeriod: 0,
          netGrowth: 0,
          growthRate: 0,
        };
        
        const result = trackPopulation(agents, previousSnapshot, 1);
        
        // Property: net growth = births - deaths
        expect(result.current.netGrowth).toBe(
          result.current.birthsInPeriod - result.current.deathsInPeriod
        );
        
        // Property: births and deaths are non-negative
        expect(result.current.birthsInPeriod).toBeGreaterThanOrEqual(0);
        expect(result.current.deathsInPeriod).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });
  
  it("should maintain consistent generation tracking", () => {
    fc.assert(
      fc.property(arbitraryPopulation, (agents) => {
        const result = trackPopulation(agents);
        
        // Property: current generation is max generation of alive agents
        const aliveAgents = agents.filter(a => a.status === "alive");
        if (aliveAgents.length > 0) {
          const maxGeneration = Math.max(...aliveAgents.map(a => a.generation));
          expect(result.current.generation).toBe(maxGeneration);
        } else {
          expect(result.current.generation).toBe(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 87: Generational Fitness", () => {
  it("should calculate average fitness correctly for any generation", () => {
    fc.assert(
      fc.property(
        arbitraryPopulation,
        fc.nat({ max: 10 }),
        (agents, targetGeneration) => {
          const metrics = calculateGenerationalMetrics(agents, targetGeneration);
          
          // Property: agent count matches filtered agents
          const targetAgents = agents.filter(
            a => a.generation === targetGeneration && a.status === "alive"
          );
          expect(metrics.agentCount).toBe(targetAgents.length);
          
          // Property: generation number is correct
          expect(metrics.generation).toBe(targetGeneration);
          
          // Property: all fitness values are non-negative
          // Note: survival fitness can exceed 1.0 if agent lives beyond maxLifespan
          expect(metrics.avgFitness).toBeGreaterThanOrEqual(0);
          expect(metrics.avgSurvivalFitness).toBeGreaterThanOrEqual(0);
          expect(metrics.avgEarningsFitness).toBeGreaterThanOrEqual(0);
          expect(metrics.avgEarningsFitness).toBeLessThanOrEqual(1);
          expect(metrics.avgOffspringFitness).toBeGreaterThanOrEqual(0);
          expect(metrics.avgOffspringFitness).toBeLessThanOrEqual(1);
          expect(metrics.avgAdaptationFitness).toBeGreaterThanOrEqual(0);
          expect(metrics.avgAdaptationFitness).toBeLessThanOrEqual(1);
          expect(metrics.avgInnovationFitness).toBeGreaterThanOrEqual(0);
          expect(metrics.avgInnovationFitness).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it("should return zero metrics for empty generation", () => {
    fc.assert(
      fc.property(fc.nat({ max: 100 }), (generation) => {
        const emptyPopulation: Agent[] = [];
        const metrics = calculateGenerationalMetrics(emptyPopulation, generation);
        
        // Property: empty generation has zero metrics
        expect(metrics.agentCount).toBe(0);
        expect(metrics.avgFitness).toBe(0);
        expect(metrics.avgSurvivalFitness).toBe(0);
        expect(metrics.avgEarningsFitness).toBe(0);
        expect(metrics.avgOffspringFitness).toBe(0);
        expect(metrics.avgAdaptationFitness).toBe(0);
        expect(metrics.avgInnovationFitness).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 90: Generational Improvement", () => {
  it("should calculate improvement velocity correctly", () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 10 }),
        fc.nat({ max: 10 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (gen1, gen2, fitness1, fitness2) => {
          const previousMetrics = {
            generation: gen1,
            agentCount: 10,
            avgFitness: fitness1,
            avgSurvivalFitness: fitness1,
            avgEarningsFitness: fitness1,
            avgOffspringFitness: fitness1,
            avgAdaptationFitness: fitness1,
            avgInnovationFitness: fitness1,
            timestamp: new Date(),
          };
          
          const currentMetrics = {
            generation: gen2,
            agentCount: 12,
            avgFitness: fitness2,
            avgSurvivalFitness: fitness2,
            avgEarningsFitness: fitness2,
            avgOffspringFitness: fitness2,
            avgAdaptationFitness: fitness2,
            avgInnovationFitness: fitness2,
            timestamp: new Date(),
          };
          
          const improvement = calculateGenerationalImprovement(previousMetrics, currentMetrics);
          
          // Property: fitness improvement is difference between generations
          expect(improvement.fitnessImprovement).toBeCloseTo(fitness2 - fitness1, 5);
          
          // Property: improvement velocity is improvement per generation
          const generationGap = gen2 - gen1;
          if (generationGap > 0) {
            expect(improvement.improvementVelocity).toBeCloseTo(
              (fitness2 - fitness1) / generationGap,
              5
            );
          } else {
            expect(improvement.improvementVelocity).toBe(0);
          }
          
          // Property: generation numbers are preserved
          expect(improvement.fromGeneration).toBe(gen1);
          expect(improvement.toGeneration).toBe(gen2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 88: Diversity Metrics", () => {
  it("should calculate diversity metrics in valid range", () => {
    fc.assert(
      fc.property(arbitraryPopulation, (agents) => {
        const metrics = calculateDiversityMetrics(agents);
        
        // Property: strategy variation is in [0, 1]
        expect(metrics.strategyVariation).toBeGreaterThanOrEqual(0);
        expect(metrics.strategyVariation).toBeLessThanOrEqual(1);
        
        // Property: genetic diversity is in [0, 1]
        expect(metrics.geneticDiversity).toBeGreaterThanOrEqual(0);
        expect(metrics.geneticDiversity).toBeLessThanOrEqual(1);
        
        // Property: specialization counts are non-negative
        for (const count of Object.values(metrics.specializationDistribution)) {
          expect(count).toBeGreaterThanOrEqual(0);
        }
        
        // Property: sum of specialization counts equals alive agent count
        const aliveCount = agents.filter(a => a.status === "alive").length;
        const specializationSum = Object.values(metrics.specializationDistribution).reduce(
          (sum, count) => sum + count,
          0
        );
        expect(specializationSum).toBe(aliveCount);
      }),
      { numRuns: 100 }
    );
  });
  
  it("should return zero diversity for empty population", () => {
    fc.assert(
      fc.property(fc.constant([]), (emptyPopulation: Agent[]) => {
        const metrics = calculateDiversityMetrics(emptyPopulation);
        
        // Property: empty population has zero diversity
        expect(metrics.strategyVariation).toBe(0);
        expect(metrics.geneticDiversity).toBe(0);
        expect(Object.keys(metrics.specializationDistribution).length).toBe(0);
      }),
      { numRuns: 100 }
    );
  });
});

describe("Property 91: Novel Behavior Tracking", () => {
  it("should never report the same behavior twice", () => {
    fc.assert(
      fc.property(
        arbitraryPopulation,
        fc.array(
          fc.record({
            id: fc.uuid(),
            name: fc.string({ minLength: 1, maxLength: 50 }),
            description: fc.string(),
            discoveredBy: fc.uuid(),
            generation: fc.nat({ max: 10 }),
            timestamp: fc.date(),
            effectiveness: fc.double({ min: 0, max: 1, noNaN: true }),
            adoptionRate: fc.double({ min: 0, max: 100, noNaN: true }),
          }),
          { maxLength: 20 }
        ),
        (agents, previousBehaviors) => {
          const novelBehaviors = trackNovelBehaviors(agents, previousBehaviors);
          
          // Property: no novel behavior name appears in previous behaviors
          const previousNames = new Set(previousBehaviors.map(b => b.name));
          for (const behavior of novelBehaviors) {
            expect(previousNames.has(behavior.name)).toBe(false);
          }
          
          // Property: all novel behaviors have valid effectiveness [0, 1]
          for (const behavior of novelBehaviors) {
            expect(behavior.effectiveness).toBeGreaterThanOrEqual(0);
            expect(behavior.effectiveness).toBeLessThanOrEqual(1);
          }
          
          // Property: all novel behaviors have valid adoption rate [0, 100]
          for (const behavior of novelBehaviors) {
            expect(behavior.adoptionRate).toBeGreaterThanOrEqual(0);
            expect(behavior.adoptionRate).toBeLessThanOrEqual(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it("should calculate adoption rate correctly", () => {
    fc.assert(
      fc.property(arbitraryPopulation, (agents) => {
        const novelBehaviors = trackNovelBehaviors(agents, []);
        
        // Property: adoption rate is percentage of agents using the behavior
        for (const behavior of novelBehaviors) {
          const agentsWithBehavior = agents.filter(a => {
            const strategies = a.traits?.novelStrategies as Array<{ name: string }> | undefined;
            return strategies?.some(s => s.name === behavior.name);
          }).length;
          
          const expectedAdoptionRate = agents.length > 0
            ? (agentsWithBehavior / agents.length) * 100
            : 0;
          
          expect(behavior.adoptionRate).toBeCloseTo(expectedAdoptionRate, 1);
        }
      }),
      { numRuns: 100 }
    );
  });
});
