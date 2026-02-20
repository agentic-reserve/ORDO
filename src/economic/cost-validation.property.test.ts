/**
 * Property-based tests for cost validation system
 * 
 * Tests Requirement 23.6: Cost Optimization and FinOps
 * 
 * Property: Cost Reduction Validation
 * For any agent with costs tracked over a period, the system should correctly
 * calculate cost per day, compare to EVM baseline, and validate cost reduction.
 */

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import type { Agent } from "../types.js";
import { trackCosts, clearAllCostHistory } from "./cost-tracking.js";
import {
  calculateCostPerAgentPerDay,
  validateCostReduction,
  calculatePopulationCostMetrics,
  COST_CONSTANTS,
} from "./cost-validation.js";

describe("Cost Validation Properties", () => {
  beforeEach(() => {
    clearAllCostHistory();
  });

  /**
   * Property: Cost calculation should be deterministic
   * 
   * For any agent with tracked costs, calculating cost per day multiple times
   * should always return the same result.
   */
  it("property: cost calculation is deterministic", () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 20 }),
          costs: fc.array(fc.double({ min: 0, max: Math.fround(0.01), noNaN: true }), { minLength: 1, maxLength: 10 }),
          periodDays: fc.integer({ min: 1, max: 30 }),
        }),
        ({ agentId, costs, periodDays }) => {
          clearAllCostHistory();
          
          const agent: Agent = createTestAgent(agentId);
          const startDate = new Date("2024-01-01T00:00:00Z");
          const endDate = new Date(startDate.getTime() + periodDays * 24 * 60 * 60 * 1000);
          
          // Track costs
          const costDate = new Date("2024-01-01T12:00:00Z");
          costs.forEach((cost, i) => {
            trackCosts(agent, "inference", cost, `Cost ${i}`, undefined, costDate);
          });
          
          // Calculate twice
          const result1 = calculateCostPerAgentPerDay(agent, startDate, endDate);
          const result2 = calculateCostPerAgentPerDay(agent, startDate, endDate);
          
          // Results should be identical
          expect(result1.totalCostSOL).toBeCloseTo(result2.totalCostSOL, 10);
          expect(result1.costPerDaySOL).toBeCloseTo(result2.costPerDaySOL, 10);
          expect(result1.costReductionPercent).toBeCloseTo(result2.costReductionPercent, 10);
          expect(result1.meetsTarget).toBe(result2.meetsTarget);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cost per day should equal total cost divided by period
   * 
   * For any agent with tracked costs over a period, the cost per day should
   * always equal the total cost divided by the number of days.
   */
  it("property: cost per day equals total cost divided by period", () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 20 }),
          totalCost: fc.float({ min: 0, max: 0.1 }),
          periodDays: fc.integer({ min: 1, max: 365 }),
        }),
        ({ agentId, totalCost, periodDays }) => {
          clearAllCostHistory();
          
          const agent: Agent = createTestAgent(agentId);
          const startDate = new Date("2024-01-01T00:00:00Z");
          const endDate = new Date(startDate.getTime() + periodDays * 24 * 60 * 60 * 1000);
          
          // Track total cost
          trackCosts(agent, "inference", totalCost, "Total cost");
          
          const result = calculateCostPerAgentPerDay(agent, startDate, endDate);
          
          // Cost per day should equal total cost / period days
          const expectedCostPerDay = totalCost / periodDays;
          expect(result.costPerDaySOL).toBeCloseTo(expectedCostPerDay, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cost reduction percentage should be between 0 and 100
   * 
   * For any agent with tracked costs, the cost reduction percentage compared
   * to EVM should always be between 0% and 100%.
   */
  it("property: cost reduction percentage is between 0 and 100", () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 20 }),
          cost: fc.float({ min: 0, max: 1 }),
        }),
        ({ agentId, cost }) => {
          clearAllCostHistory();
          
          const agent: Agent = createTestAgent(agentId);
          const startDate = new Date("2024-01-01T00:00:00Z");
          const endDate = new Date("2024-01-02T00:00:00Z");
          
          trackCosts(agent, "inference", cost, "Test cost");
          
          const result = calculateCostPerAgentPerDay(agent, startDate, endDate);
          
          // Cost reduction should be between 0 and 100
          expect(result.costReductionPercent).toBeGreaterThanOrEqual(0);
          expect(result.costReductionPercent).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Meeting target implies cost per day <= target
   * 
   * For any agent, if meetsTarget is true, then costPerDaySOL must be
   * less than or equal to the target cost.
   */
  it("property: meeting target implies cost per day <= target", () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 20 }),
          cost: fc.float({ min: 0, max: 0.01 }),
        }),
        ({ agentId, cost }) => {
          clearAllCostHistory();
          
          const agent: Agent = createTestAgent(agentId);
          const startDate = new Date("2024-01-01T00:00:00Z");
          const endDate = new Date("2024-01-02T00:00:00Z");
          
          trackCosts(agent, "inference", cost, "Test cost");
          
          const result = calculateCostPerAgentPerDay(agent, startDate, endDate);
          
          // If meets target, cost per day must be <= target
          if (result.meetsTarget) {
            expect(result.costPerDaySOL).toBeLessThanOrEqual(
              COST_CONSTANTS.TARGET_COST_PER_AGENT_PER_DAY_SOL
            );
          } else {
            expect(result.costPerDaySOL).toBeGreaterThan(
              COST_CONSTANTS.TARGET_COST_PER_AGENT_PER_DAY_SOL
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Savings should equal EVM cost minus Solana cost
   * 
   * For any agent with tracked costs, the absolute savings should always
   * equal the EVM baseline cost minus the Solana cost.
   */
  it("property: savings equals EVM cost minus Solana cost", () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 20 }),
          cost: fc.float({ min: 0, max: 0.1 }),
          periodDays: fc.integer({ min: 1, max: 30 }),
          solToUsdRate: fc.float({ min: 50, max: 200 }),
        }),
        ({ agentId, cost, periodDays, solToUsdRate }) => {
          clearAllCostHistory();
          
          const agent: Agent = createTestAgent(agentId);
          const startDate = new Date("2024-01-01T00:00:00Z");
          const endDate = new Date(startDate.getTime() + periodDays * 24 * 60 * 60 * 1000);
          
          trackCosts(agent, "inference", cost, "Test cost");
          
          const result = calculateCostPerAgentPerDay(agent, startDate, endDate, solToUsdRate);
          
          // Calculate expected savings
          const evmCost = COST_CONSTANTS.EVM_BASELINE_COST_USD * periodDays;
          const solanaCost = cost * solToUsdRate;
          const expectedSavings = evmCost - solanaCost;
          
          expect(result.savings.absoluteUSD).toBeCloseTo(expectedSavings, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Population metrics should aggregate individual agent metrics
   * 
   * For any population of agents, the total cost should equal the sum of
   * individual agent costs, and average metrics should be correct.
   */
  it("property: population metrics aggregate correctly", () => {
    fc.assert(
      fc.property(
        fc.record({
          agentCount: fc.integer({ min: 1, max: 10 }),
          costs: fc.array(fc.float({ min: 0, max: 0.01 }), { minLength: 1, maxLength: 10 }),
        }),
        ({ agentCount, costs }) => {
          clearAllCostHistory();
          
          const agents: Agent[] = Array.from({ length: agentCount }, (_, i) =>
            createTestAgent(`agent-${i}`)
          );
          
          const startDate = new Date("2024-01-01T00:00:00Z");
          const endDate = new Date("2024-01-02T00:00:00Z");
          
          // Track costs for each agent
          agents.forEach((agent, i) => {
            const cost = costs[i % costs.length];
            trackCosts(agent, "inference", cost, "Test cost");
          });
          
          const metrics = calculatePopulationCostMetrics(agents, startDate, endDate);
          
          // Total agents should match
          expect(metrics.totalAgents).toBe(agentCount);
          
          // Calculate expected total cost
          const expectedTotalCost = agents.reduce((sum, agent, i) => {
            return sum + costs[i % costs.length];
          }, 0);
          
          expect(metrics.totalCostSOL).toBeCloseTo(expectedTotalCost, 6);
          
          // Average cost per agent per day should be total / agent count
          const expectedAvgCost = expectedTotalCost / agentCount;
          expect(metrics.avgCostPerAgentPerDaySOL).toBeCloseTo(expectedAvgCost, 6);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Validation result should be consistent with cost reduction percentage
   * 
   * For any agent, validateCostReduction should return true if and only if
   * the cost reduction percentage is >= target (99.95%).
   */
  it("property: validation consistent with cost reduction percentage", () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 20 }),
          cost: fc.float({ min: 0, max: 0.1 }),
        }),
        ({ agentId, cost }) => {
          clearAllCostHistory();
          
          const agent: Agent = createTestAgent(agentId);
          const startDate = new Date("2024-01-01T00:00:00Z");
          const endDate = new Date("2024-01-02T00:00:00Z");
          
          trackCosts(agent, "inference", cost, "Test cost");
          
          const validationResult = validateCostReduction(agent, startDate, endDate);
          const calculationResult = calculateCostPerAgentPerDay(agent, startDate, endDate);
          
          // Validation should match cost reduction percentage
          if (calculationResult.costReductionPercent >= COST_CONSTANTS.TARGET_COST_REDUCTION_PERCENT) {
            expect(validationResult).toBe(true);
          } else {
            expect(validationResult).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Zero costs should result in 100% cost reduction
   * 
   * For any agent with zero costs, the cost reduction should be 100%
   * compared to EVM baseline.
   */
  it("property: zero costs result in 100% cost reduction", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        (agentId) => {
          clearAllCostHistory();
          
          const agent: Agent = createTestAgent(agentId);
          const startDate = new Date("2024-01-01T00:00:00Z");
          const endDate = new Date("2024-01-02T00:00:00Z");
          
          // Don't track any costs
          
          const result = calculateCostPerAgentPerDay(agent, startDate, endDate);
          
          // Zero cost should result in 100% reduction
          expect(result.totalCostSOL).toBe(0);
          expect(result.costReductionPercent).toBe(100);
          expect(result.meetsTarget).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Cost per day should scale linearly with period
   * 
   * For any agent with constant daily costs, doubling the period should
   * double the total cost but keep cost per day the same.
   */
  it("property: cost per day scales linearly with period", () => {
    fc.assert(
      fc.property(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 20 }),
          dailyCost: fc.float({ min: 0.0001, max: 0.001 }),
          periodDays: fc.integer({ min: 1, max: 15 }),
        }),
        ({ agentId, dailyCost, periodDays }) => {
          clearAllCostHistory();
          
          const agent: Agent = createTestAgent(agentId);
          const startDate = new Date("2024-01-01T00:00:00Z");
          
          // Period 1: original period
          const endDate1 = new Date(startDate.getTime() + periodDays * 24 * 60 * 60 * 1000);
          trackCosts(agent, "inference", dailyCost * periodDays, "Period 1");
          const result1 = calculateCostPerAgentPerDay(agent, startDate, endDate1);
          
          clearAllCostHistory();
          
          // Period 2: double the period
          const endDate2 = new Date(startDate.getTime() + (periodDays * 2) * 24 * 60 * 60 * 1000);
          trackCosts(agent, "inference", dailyCost * periodDays * 2, "Period 2");
          const result2 = calculateCostPerAgentPerDay(agent, startDate, endDate2);
          
          // Cost per day should be the same
          expect(result1.costPerDaySOL).toBeCloseTo(result2.costPerDaySOL, 6);
          
          // Total cost should double
          expect(result2.totalCostSOL).toBeCloseTo(result1.totalCostSOL * 2, 6);
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Helper function to create a test agent
 */
function createTestAgent(id: string): Agent {
  return {
    id,
    publicKey: `pubkey-${id}`,
    name: `Agent ${id}`,
    balance: 1.0,
    totalCosts: 0,
    totalEarnings: 0,
    generation: 0,
    birthDate: new Date("2024-01-01T00:00:00Z"),
    age: 0,
    maxLifespan: 365,
    status: "alive",
    survivalTier: "normal",
    model: "gpt-4",
    tools: [],
    skills: [],
    knowledge: [],
    fitness: {
      survival: 0,
      earnings: 0,
      offspring: 0,
      adaptation: 0,
      innovation: 0,
    },
    mutations: [],
    traits: [],
    reputation: 0,
    relationships: new Map(),
    createdAt: new Date("2024-01-01T00:00:00Z"),
    updatedAt: new Date("2024-01-01T00:00:00Z"),
  };
}
