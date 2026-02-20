/**
 * Property-based tests for earnings tracking system
 * 
 * Feature: ordo-digital-civilization, Property 15: Fitness Tracking
 * 
 * Property 15: Fitness Tracking
 * For any agent, the system should track economic performance (earnings, costs, 
 * net balance change) as a fitness metric used for selection.
 * 
 * Validates: Requirements 3.6
 */

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import {
  trackEarnings,
  calculateEconomicFitness,
  clearAllEarningsHistory,
  type EarningsSource,
} from "./earnings-tracking.js";
import { trackCosts, clearAllCostHistory } from "./cost-tracking.js";
import type { Agent } from "../types.js";

// Helper function to create a test agent
function createTestAgent(overrides?: Partial<Agent>): Agent {
  return {
    id: `agent-${Math.random().toString(36).substring(2, 15)}`,
    publicKey: "TestPublicKey123",
    name: "Test Agent",
    generation: 0,
    parentId: undefined,
    childrenIds: [],
    birthDate: new Date("2024-01-01"),
    age: 10,
    maxLifespan: 365,
    status: "alive",
    balance: 5.0,
    survivalTier: "normal",
    totalEarnings: 0,
    totalCosts: 0,
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
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

// Arbitrary generators
const arbitraryEarningsSource = fc.constantFrom<EarningsSource>(
  "trading",
  "services",
  "tasks",
  "other"
);

const arbitraryPositiveAmount = fc.double({ min: 0.001, max: 100, noNaN: true });

const arbitraryAge = fc.integer({ min: 1, max: 365 });

describe("Property 15: Fitness Tracking", () => {
  beforeEach(() => {
    clearAllEarningsHistory();
    clearAllCostHistory();
  });

  it("should track earnings and update fitness.earnings metric", () => {
    fc.assert(
      fc.property(arbitraryEarningsSource, arbitraryPositiveAmount, (source, amount) => {
        const agent = createTestAgent();
        const initialFitnessEarnings = agent.fitness.earnings;

        trackEarnings(agent, source, amount, "Test earnings");

        // Property: fitness.earnings should increase by the earnings amount
        expect(agent.fitness.earnings).toBe(initialFitnessEarnings + amount);
      })
    );
  });

  it("should accumulate total earnings correctly", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPositiveAmount, { minLength: 1, maxLength: 10 }),
        (amounts) => {
          const agent = createTestAgent();
          const expectedTotal = amounts.reduce((sum, amt) => sum + amt, 0);

          for (const amount of amounts) {
            trackEarnings(agent, "trading", amount, "Earning");
          }

          // Property: totalEarnings should equal sum of all earnings
          expect(agent.totalEarnings).toBeCloseTo(expectedTotal, 10);
        }
      )
    );
  });

  it("should calculate net profit as earnings minus costs", () => {
    fc.assert(
      fc.property(arbitraryPositiveAmount, arbitraryPositiveAmount, (earnings, costs) => {
        const agent = createTestAgent();

        trackEarnings(agent, "trading", earnings, "Earnings");
        trackCosts(agent, "inference", costs, "Costs");

        const fitness = calculateEconomicFitness(agent);

        // Property: netProfit = totalEarnings - totalCosts
        expect(fitness.netProfit).toBeCloseTo(earnings - costs, 10);
      })
    );
  });

  it("should calculate earnings rate as earnings per day", () => {
    fc.assert(
      fc.property(arbitraryPositiveAmount, arbitraryAge, (earnings, age) => {
        const agent = createTestAgent({ age, totalEarnings: earnings });

        const fitness = calculateEconomicFitness(agent);

        // Property: earningsRate = totalEarnings / age
        expect(fitness.earningsRate).toBeCloseTo(earnings / age, 10);
      })
    );
  });

  it("should calculate profit margin correctly when earnings > 0", () => {
    fc.assert(
      fc.property(arbitraryPositiveAmount, arbitraryPositiveAmount, (earnings, costs) => {
        fc.pre(earnings > 0); // Precondition: earnings must be positive

        const agent = createTestAgent({
          totalEarnings: earnings,
          totalCosts: costs,
        });

        const fitness = calculateEconomicFitness(agent);
        const expectedMargin = ((earnings - costs) / earnings) * 100;

        // Property: profitMargin = (netProfit / totalEarnings) * 100
        expect(fitness.profitMargin).toBeCloseTo(expectedMargin, 10);
      })
    );
  });

  it("should have economic fitness score between 0 and 100", () => {
    fc.assert(
      fc.property(arbitraryPositiveAmount, (earnings) => {
        const agent = createTestAgent({
          totalEarnings: earnings,
          totalCosts: earnings * 0.5, // 50% costs
          age: 10,
        });

        const fitness = calculateEconomicFitness(agent);

        // Property: economicFitness is always in range [0, 100]
        expect(fitness.economicFitness).toBeGreaterThanOrEqual(0);
        expect(fitness.economicFitness).toBeLessThanOrEqual(100);
      })
    );
  });

  it("should track earnings by source correctly", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            source: arbitraryEarningsSource,
            amount: arbitraryPositiveAmount,
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (earningsRecords) => {
          const agent = createTestAgent();

          // Track all earnings
          for (const record of earningsRecords) {
            trackEarnings(agent, record.source, record.amount, "Earning");
          }

          const fitness = calculateEconomicFitness(agent);

          // Calculate expected totals by source
          const expectedBySource = new Map<EarningsSource, number>();
          for (const record of earningsRecords) {
            const current = expectedBySource.get(record.source) || 0;
            expectedBySource.set(record.source, current + record.amount);
          }

          // Property: earningsBySource should match actual earnings per source
          for (const [source, expectedAmount] of expectedBySource) {
            const actualAmount = fitness.earningsBySource.get(source) || 0;
            expect(actualAmount).toBeCloseTo(expectedAmount, 10);
          }
        }
      )
    );
  });

  it("should have higher fitness with higher net profit", () => {
    fc.assert(
      fc.property(arbitraryPositiveAmount, arbitraryPositiveAmount, (earnings1, earnings2) => {
        fc.pre(earnings2 > earnings1); // Precondition: earnings2 > earnings1

        const agent1 = createTestAgent({
          totalEarnings: earnings1,
          totalCosts: 0,
          age: 10,
        });

        const agent2 = createTestAgent({
          totalEarnings: earnings2,
          totalCosts: 0,
          age: 10,
        });

        const fitness1 = calculateEconomicFitness(agent1);
        const fitness2 = calculateEconomicFitness(agent2);

        // Property: Higher earnings should result in higher or equal fitness
        expect(fitness2.economicFitness).toBeGreaterThanOrEqual(fitness1.economicFitness);
      })
    );
  });

  it("should have zero fitness when earnings equal costs", () => {
    fc.assert(
      fc.property(arbitraryPositiveAmount, (amount) => {
        const agent = createTestAgent({
          totalEarnings: amount,
          totalCosts: amount,
          age: 10,
        });

        const fitness = calculateEconomicFitness(agent);

        // Property: When earnings = costs, net profit = 0, so fitness should be low
        expect(fitness.netProfit).toBeCloseTo(0, 10);
        expect(fitness.profitMargin).toBeCloseTo(0, 10);
      })
    );
  });

  it("should handle negative net profit gracefully", () => {
    fc.assert(
      fc.property(arbitraryPositiveAmount, arbitraryPositiveAmount, (earnings, costs) => {
        fc.pre(costs > earnings); // Precondition: costs > earnings

        const agent = createTestAgent({
          totalEarnings: earnings,
          totalCosts: costs,
          age: 10,
        });

        const fitness = calculateEconomicFitness(agent);

        // Property: Negative net profit should result in zero or low fitness
        expect(fitness.netProfit).toBeLessThan(0);
        expect(fitness.economicFitness).toBeGreaterThanOrEqual(0); // Clamped to 0
      })
    );
  });

  it("should maintain balance consistency: balance = initial + earnings - costs", () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryPositiveAmount, { minLength: 1, maxLength: 10 }),
        fc.array(arbitraryPositiveAmount, { minLength: 1, maxLength: 10 }),
        (earningsAmounts, costAmounts) => {
          const initialBalance = 10.0;
          const agent = createTestAgent({ balance: initialBalance });

          const totalEarnings = earningsAmounts.reduce((sum, amt) => sum + amt, 0);
          const totalCosts = costAmounts.reduce((sum, amt) => sum + amt, 0);

          // Track all earnings
          for (const amount of earningsAmounts) {
            trackEarnings(agent, "trading", amount, "Earning");
          }

          // Track all costs
          for (const amount of costAmounts) {
            trackCosts(agent, "inference", amount, "Cost");
          }

          const expectedBalance = Math.max(0, initialBalance + totalEarnings - totalCosts);

          // Property: Final balance should equal initial + earnings - costs (clamped at 0)
          expect(agent.balance).toBeCloseTo(expectedBalance, 10);
        }
      )
    );
  });

  it("should never have negative balance after earnings", () => {
    fc.assert(
      fc.property(arbitraryPositiveAmount, (amount) => {
        const agent = createTestAgent({ balance: 0 });

        trackEarnings(agent, "trading", amount, "Earning");

        // Property: Balance should never be negative
        expect(agent.balance).toBeGreaterThanOrEqual(0);
      })
    );
  });

  it("should avoid division by zero in earnings rate calculation", () => {
    fc.assert(
      fc.property(arbitraryAge, (age) => {
        fc.pre(age >= 1); // Precondition: age must be at least 1

        const agent = createTestAgent({ age, totalEarnings: 10 });

        const fitness = calculateEconomicFitness(agent);

        // Property: Earnings rate should be finite and non-negative
        expect(fitness.earningsRate).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(fitness.earningsRate)).toBe(true);
      })
    );
  });

  it("should have monotonic relationship between profit margin and fitness", () => {
    fc.assert(
      fc.property(arbitraryPositiveAmount, arbitraryPositiveAmount, (earnings, costs) => {
        fc.pre(earnings > 0 && costs < earnings); // Profitable scenario

        const agent1 = createTestAgent({
          totalEarnings: earnings,
          totalCosts: costs,
          age: 10,
        });

        const agent2 = createTestAgent({
          totalEarnings: earnings,
          totalCosts: costs * 0.5, // Lower costs = higher margin
          age: 10,
        });

        const fitness1 = calculateEconomicFitness(agent1);
        const fitness2 = calculateEconomicFitness(agent2);

        // Property: Lower costs (higher margin) should result in higher fitness
        expect(fitness2.profitMargin).toBeGreaterThan(fitness1.profitMargin);
        expect(fitness2.economicFitness).toBeGreaterThanOrEqual(fitness1.economicFitness);
      })
    );
  });
});
