/**
 * Property-based tests for cost tracking system
 * 
 * Property 14: Compute Cost Charging
 * Validates: Requirements 3.4
 * 
 * For any agent operation (inference, transaction, storage), the system should
 * deduct the appropriate cost from the agent's balance and log the charge.
 */

import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import type { Agent } from "../types.js";
import {
  trackCosts,
  trackInferenceCost,
  trackTransactionCost,
  trackStorageCost,
  trackComputeCost,
  getCostHistory,
  clearAllCostHistory,
  type CostType,
} from "./cost-tracking.js";

// Helper function to create a test agent with arbitrary properties
function createArbitraryAgent(balance: number, id?: string): Agent {
  return {
    id: id || `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    publicKey: "test_public_key",
    name: "Test Agent",
    generation: 0,
    childrenIds: [],
    birthDate: new Date(),
    age: 0,
    maxLifespan: 365,
    status: "alive",
    balance,
    survivalTier: "thriving",
    totalEarnings: 0,
    totalCosts: 0,
    model: "anthropic/claude-3.5-sonnet",
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
  };
}

describe("Property 14: Compute Cost Charging", () => {
  beforeEach(() => {
    clearAllCostHistory();
  });

  it("should always deduct cost from agent balance", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: 0.001, max: 10, noNaN: true }),
        fc.constantFrom<CostType>("inference", "transaction", "storage", "compute", "other"),
        (initialBalance, costAmount, costType) => {
          const agent = createArbitraryAgent(initialBalance);
          const previousBalance = agent.balance;
          
          trackCosts(agent, costType, costAmount, "Test operation");
          
          // Balance should be reduced by cost amount (or to 0 if insufficient)
          const expectedBalance = Math.max(0, previousBalance - costAmount);
          expect(agent.balance).toBeCloseTo(expectedBalance, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should never allow negative balance", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 10, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        (initialBalance, costAmount) => {
          const agent = createArbitraryAgent(initialBalance);
          
          trackCosts(agent, "inference", costAmount, "Test operation");
          
          // Balance should never be negative
          expect(agent.balance).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always log cost in history", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: 0.001, max: 10, noNaN: true }),
        fc.constantFrom<CostType>("inference", "transaction", "storage", "compute", "other"),
        (initialBalance, costAmount, costType) => {
          const agent = createArbitraryAgent(initialBalance);
          const historyBefore = getCostHistory(agent.id).length;
          
          trackCosts(agent, costType, costAmount, "Test operation");
          
          const historyAfter = getCostHistory(agent.id);
          
          // History should have one more entry
          expect(historyAfter.length).toBe(historyBefore + 1);
          
          // Latest entry should match the cost
          const latestEntry = historyAfter[historyAfter.length - 1];
          expect(latestEntry.agentId).toBe(agent.id);
          expect(latestEntry.type).toBe(costType);
          expect(latestEntry.amount).toBe(costAmount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always update totalCosts", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: 0.001, max: 10, noNaN: true }),
        (initialBalance, costAmount) => {
          const agent = createArbitraryAgent(initialBalance);
          const previousTotalCosts = agent.totalCosts;
          
          trackCosts(agent, "inference", costAmount, "Test operation");
          
          // Total costs should increase by cost amount
          expect(agent.totalCosts).toBeCloseTo(previousTotalCosts + costAmount, 10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should track multiple costs cumulatively", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 1000, noNaN: true }),
        fc.array(fc.double({ min: 0.001, max: 1, noNaN: true }), { minLength: 1, maxLength: 10 }),
        (initialBalance, costs) => {
          const agent = createArbitraryAgent(initialBalance);
          const startBalance = agent.balance;
          
          // Track all costs
          costs.forEach(cost => {
            trackCosts(agent, "inference", cost, "Test operation");
          });
          
          // Total deduction should equal sum of costs (or balance if insufficient)
          const totalCost = costs.reduce((sum, cost) => sum + cost, 0);
          const expectedBalance = Math.max(0, startBalance - totalCost);
          
          expect(agent.balance).toBeCloseTo(expectedBalance, 10);
          
          // Total costs should equal sum of all costs
          expect(agent.totalCosts).toBeCloseTo(totalCost, 10);
          
          // History should have all entries
          const history = getCostHistory(agent.id);
          expect(history.length).toBe(costs.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return correct cost tracking result", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: 0.001, max: 10, noNaN: true }),
        fc.constantFrom<CostType>("inference", "transaction", "storage", "compute", "other"),
        (initialBalance, costAmount, costType) => {
          const agent = createArbitraryAgent(initialBalance);
          
          const result = trackCosts(agent, costType, costAmount, "Test operation");
          
          // Result should have all required fields
          expect(result).toHaveProperty("costId");
          expect(result).toHaveProperty("agentId");
          expect(result).toHaveProperty("previousBalance");
          expect(result).toHaveProperty("newBalance");
          expect(result).toHaveProperty("costAmount");
          expect(result).toHaveProperty("costType");
          expect(result).toHaveProperty("timestamp");
          
          // Values should be correct
          expect(result.agentId).toBe(agent.id);
          expect(result.previousBalance).toBe(initialBalance);
          expect(result.newBalance).toBe(agent.balance);
          expect(result.costAmount).toBe(costAmount);
          expect(result.costType).toBe(costType);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle zero cost correctly", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        (initialBalance) => {
          const agent = createArbitraryAgent(initialBalance);
          
          trackCosts(agent, "inference", 0, "Free operation");
          
          // Balance should remain unchanged
          expect(agent.balance).toBe(initialBalance);
          
          // But cost should still be logged
          const history = getCostHistory(agent.id);
          expect(history.length).toBe(1);
          expect(history[0].amount).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should reject negative costs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: -100, max: -0.001, noNaN: true }),
        (initialBalance, negativeCost) => {
          const agent = createArbitraryAgent(initialBalance);
          
          // Should throw error for negative cost
          expect(() => {
            trackCosts(agent, "inference", negativeCost, "Invalid operation");
          }).toThrow("Cost amount cannot be negative");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should reject infinite costs", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        (initialBalance) => {
          const agent = createArbitraryAgent(initialBalance);
          
          // Should throw error for infinite cost
          expect(() => {
            trackCosts(agent, "inference", Infinity, "Invalid operation");
          }).toThrow("Cost amount must be finite");
        }
      ),
      { numRuns: 100 }
    );
  });

  describe("Inference cost tracking", () => {
    it("should calculate cost based on token count", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 1000, noNaN: true }),
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }),
          fc.double({ min: 0.0000001, max: 0.001, noNaN: true }),
          (initialBalance, inputTokens, outputTokens, costPerToken) => {
            const agent = createArbitraryAgent(initialBalance);
            const previousBalance = agent.balance;
            
            trackInferenceCost(agent, "test-model", inputTokens, outputTokens, costPerToken);
            
            const expectedCost = (inputTokens + outputTokens) * costPerToken;
            const expectedBalance = Math.max(0, previousBalance - expectedCost);
            
            expect(agent.balance).toBeCloseTo(expectedBalance, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should store model and token metadata", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 1000, noNaN: true }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 10000 }),
          fc.integer({ min: 1, max: 10000 }),
          (initialBalance, model, inputTokens, outputTokens) => {
            const agent = createArbitraryAgent(initialBalance);
            
            trackInferenceCost(agent, model, inputTokens, outputTokens);
            
            const history = getCostHistory(agent.id);
            const latestEntry = history[history.length - 1];
            
            expect(latestEntry.type).toBe("inference");
            expect(latestEntry.metadata).toHaveProperty("model", model);
            expect(latestEntry.metadata).toHaveProperty("inputTokens", inputTokens);
            expect(latestEntry.metadata).toHaveProperty("outputTokens", outputTokens);
            expect(latestEntry.metadata).toHaveProperty("totalTokens", inputTokens + outputTokens);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Transaction cost tracking", () => {
    it("should charge transaction fee", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1000, noNaN: true }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.double({ min: 0.000001, max: 0.01, noNaN: true }),
          (initialBalance, signature, fee) => {
            const agent = createArbitraryAgent(initialBalance);
            const previousBalance = agent.balance;
            
            trackTransactionCost(agent, "test-tx", signature, fee);
            
            const expectedBalance = Math.max(0, previousBalance - fee);
            expect(agent.balance).toBeCloseTo(expectedBalance, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should store transaction metadata", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1000, noNaN: true }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (initialBalance, transactionType, signature) => {
            const agent = createArbitraryAgent(initialBalance);
            
            trackTransactionCost(agent, transactionType, signature);
            
            const history = getCostHistory(agent.id);
            const latestEntry = history[history.length - 1];
            
            expect(latestEntry.type).toBe("transaction");
            expect(latestEntry.metadata).toHaveProperty("transactionType", transactionType);
            expect(latestEntry.metadata).toHaveProperty("signature", signature);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Storage cost tracking", () => {
    it("should calculate cost based on bytes", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1000, noNaN: true }),
          fc.integer({ min: 1, max: 1000000 }),
          fc.double({ min: 0.00000001, max: 0.0001, noNaN: true }),
          (initialBalance, bytes, costPerByte) => {
            const agent = createArbitraryAgent(initialBalance);
            const previousBalance = agent.balance;
            
            trackStorageCost(agent, "test-storage", bytes, costPerByte);
            
            const expectedCost = bytes * costPerByte;
            const expectedBalance = Math.max(0, previousBalance - expectedCost);
            
            expect(agent.balance).toBeCloseTo(expectedBalance, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should store storage metadata", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1000, noNaN: true }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 1000000 }),
          (initialBalance, storageType, bytes) => {
            const agent = createArbitraryAgent(initialBalance);
            
            trackStorageCost(agent, storageType, bytes);
            
            const history = getCostHistory(agent.id);
            const latestEntry = history[history.length - 1];
            
            expect(latestEntry.type).toBe("storage");
            expect(latestEntry.metadata).toHaveProperty("storageType", storageType);
            expect(latestEntry.metadata).toHaveProperty("bytes", bytes);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Compute cost tracking", () => {
    it("should calculate cost based on duration", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1000, noNaN: true }),
          fc.integer({ min: 1, max: 60000 }),
          fc.double({ min: 0.000001, max: 0.01, noNaN: true }),
          (initialBalance, durationMs, costPerSecond) => {
            const agent = createArbitraryAgent(initialBalance);
            const previousBalance = agent.balance;
            
            trackComputeCost(agent, "test-operation", durationMs, costPerSecond);
            
            const durationSeconds = durationMs / 1000;
            const expectedCost = durationSeconds * costPerSecond;
            const expectedBalance = Math.max(0, previousBalance - expectedCost);
            
            expect(agent.balance).toBeCloseTo(expectedBalance, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should store compute metadata", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 1000, noNaN: true }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 1, max: 60000 }),
          (initialBalance, operation, durationMs) => {
            const agent = createArbitraryAgent(initialBalance);
            
            trackComputeCost(agent, operation, durationMs);
            
            const history = getCostHistory(agent.id);
            const latestEntry = history[history.length - 1];
            
            expect(latestEntry.type).toBe("compute");
            expect(latestEntry.metadata).toHaveProperty("operation", operation);
            expect(latestEntry.metadata).toHaveProperty("durationMs", durationMs);
            expect(latestEntry.metadata).toHaveProperty("durationSeconds", durationMs / 1000);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Cost conservation property", () => {
    it("should conserve total value: balance + totalCosts = initial balance (when sufficient funds)", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 100, max: 1000, noNaN: true }),
          fc.array(fc.double({ min: 0.001, max: 1, noNaN: true }), { minLength: 1, maxLength: 10 }),
          (initialBalance, costs) => {
            const agent = createArbitraryAgent(initialBalance);
            const totalCost = costs.reduce((sum, cost) => sum + cost, 0);
            
            // Only test when agent has sufficient funds
            if (totalCost <= initialBalance) {
              costs.forEach(cost => {
                trackCosts(agent, "inference", cost, "Test operation");
              });
              
              // Conservation: current balance + total costs = initial balance
              const conservedValue = agent.balance + agent.totalCosts;
              expect(conservedValue).toBeCloseTo(initialBalance, 10);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Idempotence property", () => {
    it("should produce same result when tracking same cost twice with fresh agent", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 1000, noNaN: true }),
          fc.double({ min: 0.001, max: 5, noNaN: true }),
          (initialBalance, costAmount) => {
            const agent1 = createArbitraryAgent(initialBalance, "agent1");
            const agent2 = createArbitraryAgent(initialBalance, "agent2");
            
            const result1 = trackCosts(agent1, "inference", costAmount, "Test operation");
            const result2 = trackCosts(agent2, "inference", costAmount, "Test operation");
            
            // Both agents should have same balance after same cost
            expect(agent1.balance).toBeCloseTo(agent2.balance, 10);
            expect(agent1.totalCosts).toBeCloseTo(agent2.totalCosts, 10);
            
            // Results should be equivalent (except IDs and timestamps)
            expect(result1.previousBalance).toBe(result2.previousBalance);
            expect(result1.newBalance).toBeCloseTo(result2.newBalance, 10);
            expect(result1.costAmount).toBe(result2.costAmount);
            expect(result1.costType).toBe(result2.costType);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Requirement 3.4 validation", () => {
    it("should charge agents for all operation types", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 1000, noNaN: true }),
          (initialBalance) => {
            const agent = createArbitraryAgent(initialBalance);
            const startBalance = agent.balance;
            
            // Track various operation types
            trackInferenceCost(agent, "gpt-4", 1000, 500);
            trackTransactionCost(agent, "transfer", "sig123");
            trackStorageCost(agent, "database", 5000);
            trackComputeCost(agent, "processing", 2000);
            
            // Balance should be reduced
            expect(agent.balance).toBeLessThan(startBalance);
            
            // Total costs should be positive
            expect(agent.totalCosts).toBeGreaterThan(0);
            
            // All operations should be logged
            const history = getCostHistory(agent.id);
            expect(history.length).toBe(4);
            
            // Each operation type should be present
            const types = history.map(record => record.type);
            expect(types).toContain("inference");
            expect(types).toContain("transaction");
            expect(types).toContain("storage");
            expect(types).toContain("compute");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should deduct costs in real-time", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 1000, noNaN: true }),
          fc.double({ min: 0.1, max: 5, noNaN: true }),
          (initialBalance, costAmount) => {
            const agent = createArbitraryAgent(initialBalance);
            
            const result = trackCosts(agent, "inference", costAmount, "Test operation");
            
            // Balance should be updated immediately
            expect(result.newBalance).toBe(agent.balance);
            expect(agent.balance).toBeCloseTo(initialBalance - costAmount, 10);
            
            // Cost should be logged immediately
            const history = getCostHistory(agent.id);
            expect(history.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
