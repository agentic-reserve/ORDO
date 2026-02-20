/**
 * Unit tests for cost tracking system
 * 
 * Tests Requirement 3.4: Economic Survival Model - Cost Tracking
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { Agent } from "../types.js";
import {
  trackCosts,
  trackInferenceCost,
  trackTransactionCost,
  trackStorageCost,
  trackComputeCost,
  getCostHistory,
  getCostsByType,
  getCostsInPeriod,
  clearCostHistory,
  clearAllCostHistory,
} from "./cost-tracking.js";

// Helper function to create a test agent
function createTestAgent(balance: number = 10.0): Agent {
  return {
    id: `agent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
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

describe("Cost Tracking System", () => {
  beforeEach(() => {
    // Clear all cost history before each test
    clearAllCostHistory();
  });

  describe("trackCosts", () => {
    it("should deduct cost from agent balance", () => {
      const agent = createTestAgent(10.0);
      const result = trackCosts(agent, "inference", 0.5, "Test operation");

      expect(agent.balance).toBe(9.5);
      expect(result.previousBalance).toBe(10.0);
      expect(result.newBalance).toBe(9.5);
      expect(result.costAmount).toBe(0.5);
    });

    it("should update agent totalCosts", () => {
      const agent = createTestAgent(10.0);
      
      trackCosts(agent, "inference", 0.3, "Operation 1");
      expect(agent.totalCosts).toBe(0.3);
      
      trackCosts(agent, "transaction", 0.2, "Operation 2");
      expect(agent.totalCosts).toBe(0.5);
    });

    it("should not allow negative balance", () => {
      const agent = createTestAgent(1.0);
      trackCosts(agent, "inference", 2.0, "Expensive operation");

      expect(agent.balance).toBe(0);
      expect(agent.balance).toBeGreaterThanOrEqual(0);
    });

    it("should store cost record in history", () => {
      const agent = createTestAgent(10.0);
      trackCosts(agent, "inference", 0.5, "Test operation");

      const history = getCostHistory(agent.id);
      expect(history).toHaveLength(1);
      expect(history[0].agentId).toBe(agent.id);
      expect(history[0].type).toBe("inference");
      expect(history[0].amount).toBe(0.5);
      expect(history[0].description).toBe("Test operation");
    });

    it("should include metadata in cost record", () => {
      const agent = createTestAgent(10.0);
      const metadata = { model: "gpt-4", tokens: 1000 };
      
      trackCosts(agent, "inference", 0.5, "Test operation", metadata);

      const history = getCostHistory(agent.id);
      expect(history[0].metadata).toEqual(metadata);
    });

    it("should update agent updatedAt timestamp", () => {
      const agent = createTestAgent(10.0);
      const beforeUpdate = agent.updatedAt;
      
      // Wait a tiny bit to ensure timestamp changes
      setTimeout(() => {
        trackCosts(agent, "inference", 0.1, "Test");
        expect(agent.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      }, 1);
    });

    it("should return complete cost tracking result", () => {
      const agent = createTestAgent(10.0);
      const result = trackCosts(agent, "inference", 0.5, "Test operation");

      expect(result).toHaveProperty("costId");
      expect(result).toHaveProperty("agentId");
      expect(result).toHaveProperty("previousBalance");
      expect(result).toHaveProperty("newBalance");
      expect(result).toHaveProperty("costAmount");
      expect(result).toHaveProperty("costType");
      expect(result).toHaveProperty("timestamp");

      expect(result.agentId).toBe(agent.id);
      expect(result.costType).toBe("inference");
    });

    it("should throw error for negative cost amount", () => {
      const agent = createTestAgent(10.0);
      
      expect(() => {
        trackCosts(agent, "inference", -0.5, "Invalid cost");
      }).toThrow("Cost amount cannot be negative");
    });

    it("should throw error for infinite cost amount", () => {
      const agent = createTestAgent(10.0);
      
      expect(() => {
        trackCosts(agent, "inference", Infinity, "Invalid cost");
      }).toThrow("Cost amount must be finite");
    });

    it("should handle zero cost", () => {
      const agent = createTestAgent(10.0);
      const result = trackCosts(agent, "inference", 0, "Free operation");

      expect(agent.balance).toBe(10.0);
      expect(result.costAmount).toBe(0);
    });

    it("should handle very small costs", () => {
      const agent = createTestAgent(10.0);
      const result = trackCosts(agent, "inference", 0.000001, "Tiny cost");

      expect(agent.balance).toBeCloseTo(9.999999, 6);
      expect(result.costAmount).toBe(0.000001);
    });
  });

  describe("trackInferenceCost", () => {
    it("should calculate cost based on token count", () => {
      const agent = createTestAgent(10.0);
      const result = trackInferenceCost(
        agent,
        "gpt-4",
        1000,  // input tokens
        500,   // output tokens
        0.000001  // cost per token
      );

      const expectedCost = (1000 + 500) * 0.000001;
      expect(result.costAmount).toBe(expectedCost);
      expect(agent.balance).toBeCloseTo(10.0 - expectedCost, 10);
    });

    it("should store model and token metadata", () => {
      const agent = createTestAgent(10.0);
      trackInferenceCost(agent, "gpt-4", 1000, 500);

      const history = getCostHistory(agent.id);
      expect(history[0].metadata).toHaveProperty("model", "gpt-4");
      expect(history[0].metadata).toHaveProperty("inputTokens", 1000);
      expect(history[0].metadata).toHaveProperty("outputTokens", 500);
      expect(history[0].metadata).toHaveProperty("totalTokens", 1500);
    });

    it("should use default cost per token if not provided", () => {
      const agent = createTestAgent(10.0);
      trackInferenceCost(agent, "gpt-4", 1000, 500);

      const history = getCostHistory(agent.id);
      expect(history[0].metadata).toHaveProperty("costPerToken", 0.000001);
    });

    it("should create inference type cost record", () => {
      const agent = createTestAgent(10.0);
      trackInferenceCost(agent, "gpt-4", 1000, 500);

      const history = getCostHistory(agent.id);
      expect(history[0].type).toBe("inference");
      expect(history[0].description).toContain("AI inference");
      expect(history[0].description).toContain("gpt-4");
    });
  });

  describe("trackTransactionCost", () => {
    it("should charge transaction fee", () => {
      const agent = createTestAgent(10.0);
      const result = trackTransactionCost(
        agent,
        "token_transfer",
        "signature123",
        0.000005
      );

      expect(result.costAmount).toBe(0.000005);
      expect(agent.balance).toBeCloseTo(9.999995, 6);
    });

    it("should store transaction metadata", () => {
      const agent = createTestAgent(10.0);
      trackTransactionCost(agent, "token_transfer", "signature123", 0.000005);

      const history = getCostHistory(agent.id);
      expect(history[0].metadata).toHaveProperty("transactionType", "token_transfer");
      expect(history[0].metadata).toHaveProperty("signature", "signature123");
      expect(history[0].metadata).toHaveProperty("fee", 0.000005);
    });

    it("should use default fee if not provided", () => {
      const agent = createTestAgent(10.0);
      trackTransactionCost(agent, "token_transfer", "signature123");

      const history = getCostHistory(agent.id);
      expect(history[0].amount).toBe(0.000005);
    });

    it("should create transaction type cost record", () => {
      const agent = createTestAgent(10.0);
      trackTransactionCost(agent, "token_transfer", "signature123");

      const history = getCostHistory(agent.id);
      expect(history[0].type).toBe("transaction");
      expect(history[0].description).toContain("Transaction");
      expect(history[0].description).toContain("token_transfer");
    });
  });

  describe("trackStorageCost", () => {
    it("should calculate cost based on bytes", () => {
      const agent = createTestAgent(10.0);
      const result = trackStorageCost(
        agent,
        "database",
        10000,  // bytes
        0.0000001  // cost per byte
      );

      const expectedCost = 10000 * 0.0000001;
      expect(result.costAmount).toBe(expectedCost);
      expect(agent.balance).toBeCloseTo(10.0 - expectedCost, 10);
    });

    it("should store storage metadata", () => {
      const agent = createTestAgent(10.0);
      trackStorageCost(agent, "database", 10000, 0.0000001);

      const history = getCostHistory(agent.id);
      expect(history[0].metadata).toHaveProperty("storageType", "database");
      expect(history[0].metadata).toHaveProperty("bytes", 10000);
      expect(history[0].metadata).toHaveProperty("costPerByte", 0.0000001);
    });

    it("should use default cost per byte if not provided", () => {
      const agent = createTestAgent(10.0);
      trackStorageCost(agent, "database", 10000);

      const history = getCostHistory(agent.id);
      expect(history[0].metadata).toHaveProperty("costPerByte", 0.0000001);
    });

    it("should create storage type cost record", () => {
      const agent = createTestAgent(10.0);
      trackStorageCost(agent, "database", 10000);

      const history = getCostHistory(agent.id);
      expect(history[0].type).toBe("storage");
      expect(history[0].description).toContain("Storage");
      expect(history[0].description).toContain("database");
    });
  });

  describe("trackComputeCost", () => {
    it("should calculate cost based on duration", () => {
      const agent = createTestAgent(10.0);
      const result = trackComputeCost(
        agent,
        "data_processing",
        5000,  // 5 seconds in ms
        0.00001  // cost per second
      );

      const expectedCost = 5 * 0.00001;
      expect(result.costAmount).toBe(expectedCost);
      expect(agent.balance).toBeCloseTo(10.0 - expectedCost, 10);
    });

    it("should store compute metadata", () => {
      const agent = createTestAgent(10.0);
      trackComputeCost(agent, "data_processing", 5000, 0.00001);

      const history = getCostHistory(agent.id);
      expect(history[0].metadata).toHaveProperty("operation", "data_processing");
      expect(history[0].metadata).toHaveProperty("durationMs", 5000);
      expect(history[0].metadata).toHaveProperty("durationSeconds", 5);
      expect(history[0].metadata).toHaveProperty("costPerSecond", 0.00001);
    });

    it("should use default cost per second if not provided", () => {
      const agent = createTestAgent(10.0);
      trackComputeCost(agent, "data_processing", 5000);

      const history = getCostHistory(agent.id);
      expect(history[0].metadata).toHaveProperty("costPerSecond", 0.00001);
    });

    it("should create compute type cost record", () => {
      const agent = createTestAgent(10.0);
      trackComputeCost(agent, "data_processing", 5000);

      const history = getCostHistory(agent.id);
      expect(history[0].type).toBe("compute");
      expect(history[0].description).toContain("Compute");
      expect(history[0].description).toContain("data_processing");
    });

    it("should handle sub-second durations", () => {
      const agent = createTestAgent(10.0);
      trackComputeCost(agent, "quick_operation", 100, 0.00001);  // 100ms

      const history = getCostHistory(agent.id);
      expect(history[0].metadata).toHaveProperty("durationSeconds", 0.1);
    });
  });

  describe("getCostHistory", () => {
    it("should return empty array for agent with no costs", () => {
      const agent = createTestAgent(10.0);
      const history = getCostHistory(agent.id);

      expect(history).toEqual([]);
    });

    it("should return all cost records for an agent", () => {
      const agent = createTestAgent(10.0);
      
      trackCosts(agent, "inference", 0.1, "Op 1");
      trackCosts(agent, "transaction", 0.2, "Op 2");
      trackCosts(agent, "storage", 0.3, "Op 3");

      const history = getCostHistory(agent.id);
      expect(history).toHaveLength(3);
    });

    it("should limit results when limit parameter is provided", () => {
      const agent = createTestAgent(10.0);
      
      for (let i = 0; i < 10; i++) {
        trackCosts(agent, "inference", 0.1, `Op ${i}`);
      }

      const history = getCostHistory(agent.id, 5);
      expect(history).toHaveLength(5);
    });

    it("should return most recent records when limited", () => {
      const agent = createTestAgent(10.0);
      
      trackCosts(agent, "inference", 0.1, "Op 1");
      trackCosts(agent, "inference", 0.2, "Op 2");
      trackCosts(agent, "inference", 0.3, "Op 3");

      const history = getCostHistory(agent.id, 2);
      expect(history).toHaveLength(2);
      expect(history[0].description).toBe("Op 2");
      expect(history[1].description).toBe("Op 3");
    });

    it("should not affect other agents' history", () => {
      const agent1 = createTestAgent(10.0);
      const agent2 = createTestAgent(10.0);
      
      trackCosts(agent1, "inference", 0.1, "Agent 1 Op");
      trackCosts(agent2, "inference", 0.2, "Agent 2 Op");

      const history1 = getCostHistory(agent1.id);
      const history2 = getCostHistory(agent2.id);

      expect(history1).toHaveLength(1);
      expect(history2).toHaveLength(1);
      expect(history1[0].description).toBe("Agent 1 Op");
      expect(history2[0].description).toBe("Agent 2 Op");
    });
  });

  describe("getCostsByType", () => {
    it("should return empty map for agent with no costs", () => {
      const agent = createTestAgent(10.0);
      const costsByType = getCostsByType(agent.id);

      expect(costsByType.size).toBe(0);
    });

    it("should aggregate costs by type", () => {
      const agent = createTestAgent(10.0);
      
      trackCosts(agent, "inference", 0.1, "Op 1");
      trackCosts(agent, "inference", 0.2, "Op 2");
      trackCosts(agent, "transaction", 0.3, "Op 3");
      trackCosts(agent, "storage", 0.4, "Op 4");

      const costsByType = getCostsByType(agent.id);

      expect(costsByType.get("inference")).toBeCloseTo(0.3, 10);
      expect(costsByType.get("transaction")).toBeCloseTo(0.3, 10);
      expect(costsByType.get("storage")).toBeCloseTo(0.4, 10);
    });

    it("should handle multiple costs of same type", () => {
      const agent = createTestAgent(10.0);
      
      trackCosts(agent, "inference", 0.1, "Op 1");
      trackCosts(agent, "inference", 0.2, "Op 2");
      trackCosts(agent, "inference", 0.3, "Op 3");

      const costsByType = getCostsByType(agent.id);

      expect(costsByType.get("inference")).toBeCloseTo(0.6, 10);
    });
  });

  describe("getCostsInPeriod", () => {
    it("should return 0 for agent with no costs", () => {
      const agent = createTestAgent(10.0);
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const total = getCostsInPeriod(agent.id, startDate, endDate);
      expect(total).toBe(0);
    });

    it("should sum costs within date range", () => {
      const agent = createTestAgent(10.0);
      
      trackCosts(agent, "inference", 0.1, "Op 1");
      trackCosts(agent, "inference", 0.2, "Op 2");
      trackCosts(agent, "inference", 0.3, "Op 3");

      const startDate = new Date(Date.now() - 1000);
      const endDate = new Date(Date.now() + 1000);

      const total = getCostsInPeriod(agent.id, startDate, endDate);
      expect(total).toBeCloseTo(0.6, 10);
    });

    it("should exclude costs outside date range", () => {
      const agent = createTestAgent(10.0);
      
      trackCosts(agent, "inference", 0.1, "Op 1");

      const startDate = new Date(Date.now() + 10000);
      const endDate = new Date(Date.now() + 20000);

      const total = getCostsInPeriod(agent.id, startDate, endDate);
      expect(total).toBe(0);
    });
  });

  describe("clearCostHistory", () => {
    it("should clear history for specific agent", () => {
      const agent = createTestAgent(10.0);
      
      trackCosts(agent, "inference", 0.1, "Op 1");
      expect(getCostHistory(agent.id)).toHaveLength(1);

      clearCostHistory(agent.id);
      expect(getCostHistory(agent.id)).toHaveLength(0);
    });

    it("should not affect other agents' history", () => {
      const agent1 = createTestAgent(10.0);
      const agent2 = createTestAgent(10.0);
      
      trackCosts(agent1, "inference", 0.1, "Agent 1 Op");
      trackCosts(agent2, "inference", 0.2, "Agent 2 Op");

      clearCostHistory(agent1.id);

      expect(getCostHistory(agent1.id)).toHaveLength(0);
      expect(getCostHistory(agent2.id)).toHaveLength(1);
    });
  });

  describe("clearAllCostHistory", () => {
    it("should clear history for all agents", () => {
      const agent1 = createTestAgent(10.0);
      const agent2 = createTestAgent(10.0);
      
      trackCosts(agent1, "inference", 0.1, "Agent 1 Op");
      trackCosts(agent2, "inference", 0.2, "Agent 2 Op");

      clearAllCostHistory();

      expect(getCostHistory(agent1.id)).toHaveLength(0);
      expect(getCostHistory(agent2.id)).toHaveLength(0);
    });
  });

  describe("Requirement 3.4 validation", () => {
    it("should charge agents for compute usage in real-time", () => {
      const agent = createTestAgent(10.0);
      const initialBalance = agent.balance;

      // Perform multiple operations
      trackInferenceCost(agent, "gpt-4", 1000, 500);
      trackTransactionCost(agent, "transfer", "sig123");
      trackStorageCost(agent, "database", 5000);
      trackComputeCost(agent, "processing", 2000);

      // Balance should be reduced
      expect(agent.balance).toBeLessThan(initialBalance);
      
      // Total costs should be tracked
      expect(agent.totalCosts).toBeGreaterThan(0);
      
      // All operations should be in history
      const history = getCostHistory(agent.id);
      expect(history).toHaveLength(4);
    });

    it("should store cost history for analytics", () => {
      const agent = createTestAgent(10.0);

      // Track various costs
      trackInferenceCost(agent, "gpt-4", 1000, 500);
      trackTransactionCost(agent, "transfer", "sig123");
      trackStorageCost(agent, "database", 5000);

      // History should be retrievable
      const history = getCostHistory(agent.id);
      expect(history).toHaveLength(3);

      // Each record should have complete information
      history.forEach(record => {
        expect(record).toHaveProperty("id");
        expect(record).toHaveProperty("agentId");
        expect(record).toHaveProperty("timestamp");
        expect(record).toHaveProperty("type");
        expect(record).toHaveProperty("amount");
        expect(record).toHaveProperty("description");
      });

      // Costs should be aggregatable by type
      const costsByType = getCostsByType(agent.id);
      expect(costsByType.size).toBeGreaterThan(0);
    });

    it("should deduct costs from agent balance immediately", () => {
      const agent = createTestAgent(10.0);

      // Track cost
      const result = trackCosts(agent, "inference", 1.5, "Expensive operation");

      // Balance should be updated immediately
      expect(result.previousBalance).toBe(10.0);
      expect(result.newBalance).toBe(8.5);
      expect(agent.balance).toBe(8.5);

      // Cost should be logged
      expect(result.costAmount).toBe(1.5);
    });

    it("should handle agent running out of funds", () => {
      const agent = createTestAgent(0.5);

      // Perform expensive operation
      trackCosts(agent, "inference", 1.0, "Expensive operation");

      // Balance should not go negative
      expect(agent.balance).toBe(0);
      expect(agent.balance).toBeGreaterThanOrEqual(0);

      // Cost should still be tracked
      expect(agent.totalCosts).toBe(1.0);
    });
  });

  describe("Integration with survival tiers", () => {
    it("should track costs across tier transitions", () => {
      const agent = createTestAgent(10.5);  // Start in thriving tier

      // Spend enough to drop to normal tier
      trackCosts(agent, "inference", 0.6, "Op 1");
      expect(agent.balance).toBeCloseTo(9.9, 10);

      // Continue spending
      trackCosts(agent, "inference", 5.0, "Op 2");
      expect(agent.balance).toBeCloseTo(4.9, 10);

      // All costs should be tracked
      const history = getCostHistory(agent.id);
      expect(history).toHaveLength(2);

      const total = history.reduce((sum, record) => sum + record.amount, 0);
      expect(total).toBeCloseTo(5.6, 10);
    });

    it("should track costs as agent approaches death threshold", () => {
      const agent = createTestAgent(0.05);  // Critical tier

      // Spend to approach death threshold (0.01 SOL)
      trackCosts(agent, "inference", 0.03, "Op 1");
      expect(agent.balance).toBeCloseTo(0.02, 10);

      // One more operation pushes below death threshold
      trackCosts(agent, "inference", 0.015, "Op 2");
      expect(agent.balance).toBeCloseTo(0.005, 10);

      // Agent is now in dead tier (< 0.01 SOL)
      expect(agent.balance).toBeLessThan(0.01);
    });
  });
});
