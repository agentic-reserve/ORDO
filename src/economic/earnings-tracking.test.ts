/**
 * Unit tests for earnings tracking system
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  trackEarnings,
  trackTradingEarnings,
  trackServiceEarnings,
  trackTaskEarnings,
  calculateEconomicFitness,
  getEarningsHistory,
  getEarningsBySource,
  getEarningsInPeriod,
  clearEarningsHistory,
  clearAllEarningsHistory,
  type EarningsSource,
} from "./earnings-tracking.js";
import type { Agent } from "../types.js";

// Helper function to create a test agent
function createTestAgent(overrides?: Partial<Agent>): Agent {
  return {
    id: "test-agent-1",
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

describe("Earnings Tracking System", () => {
  beforeEach(() => {
    clearAllEarningsHistory();
  });

  describe("trackEarnings", () => {
    it("should add earnings to agent balance", () => {
      const agent = createTestAgent({ balance: 5.0 });
      const result = trackEarnings(agent, "trading", 2.5, "Test earnings");

      expect(agent.balance).toBe(7.5);
      expect(result.previousBalance).toBe(5.0);
      expect(result.newBalance).toBe(7.5);
      expect(result.earningsAmount).toBe(2.5);
    });

    it("should update total earnings", () => {
      const agent = createTestAgent({ totalEarnings: 10.0 });
      trackEarnings(agent, "services", 3.0, "Service payment");

      expect(agent.totalEarnings).toBe(13.0);
    });

    it("should update fitness earnings metric", () => {
      const agent = createTestAgent();
      trackEarnings(agent, "tasks", 1.5, "Task reward");

      expect(agent.fitness.earnings).toBe(1.5);
    });

    it("should store earnings record in history", () => {
      const agent = createTestAgent();
      trackEarnings(agent, "trading", 2.0, "Trading profit");

      const history = getEarningsHistory(agent.id);
      expect(history).toHaveLength(1);
      expect(history[0].amount).toBe(2.0);
      expect(history[0].source).toBe("trading");
      expect(history[0].description).toBe("Trading profit");
    });

    it("should reject negative earnings", () => {
      const agent = createTestAgent();
      
      expect(() => {
        trackEarnings(agent, "trading", -1.0, "Invalid");
      }).toThrow("Earnings amount cannot be negative");
    });

    it("should reject infinite earnings", () => {
      const agent = createTestAgent();
      
      expect(() => {
        trackEarnings(agent, "trading", Infinity, "Invalid");
      }).toThrow("Earnings amount must be finite");
    });

    it("should handle zero earnings", () => {
      const agent = createTestAgent({ balance: 5.0 });
      trackEarnings(agent, "other", 0, "No earnings");

      expect(agent.balance).toBe(5.0);
      expect(agent.totalEarnings).toBe(0);
    });

    it("should include metadata in earnings record", () => {
      const agent = createTestAgent();
      const metadata = { tradingPair: "SOL/USDC", profit: 2.5 };
      
      trackEarnings(agent, "trading", 2.5, "Trading", metadata);

      const history = getEarningsHistory(agent.id);
      expect(history[0].metadata).toEqual(metadata);
    });

    it("should update agent timestamp", () => {
      const agent = createTestAgent();
      const beforeUpdate = agent.updatedAt;
      
      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        trackEarnings(agent, "tasks", 1.0, "Task");
        expect(agent.updatedAt.getTime()).toBeGreaterThan(beforeUpdate.getTime());
      }, 10);
    });
  });

  describe("trackTradingEarnings", () => {
    it("should track trading earnings with trading pair", () => {
      const agent = createTestAgent({ balance: 10.0 });
      const result = trackTradingEarnings(agent, "SOL/USDC", 3.5, "tx123");

      expect(agent.balance).toBe(13.5);
      expect(result.earningsSource).toBe("trading");
      
      const history = getEarningsHistory(agent.id);
      expect(history[0].metadata?.tradingPair).toBe("SOL/USDC");
      expect(history[0].metadata?.transactionSignature).toBe("tx123");
    });
  });

  describe("trackServiceEarnings", () => {
    it("should track service earnings with service type", () => {
      const agent = createTestAgent({ balance: 5.0 });
      const result = trackServiceEarnings(agent, "code_review", 2.0, "client-123");

      expect(agent.balance).toBe(7.0);
      expect(result.earningsSource).toBe("services");
      
      const history = getEarningsHistory(agent.id);
      expect(history[0].metadata?.serviceType).toBe("code_review");
      expect(history[0].metadata?.clientId).toBe("client-123");
    });
  });

  describe("trackTaskEarnings", () => {
    it("should track task earnings with task details", () => {
      const agent = createTestAgent({ balance: 8.0 });
      const result = trackTaskEarnings(agent, "task-456", 1.5, "Data analysis");

      expect(agent.balance).toBe(9.5);
      expect(result.earningsSource).toBe("tasks");
      
      const history = getEarningsHistory(agent.id);
      expect(history[0].metadata?.taskId).toBe("task-456");
      expect(history[0].metadata?.taskDescription).toBe("Data analysis");
    });
  });

  describe("calculateEconomicFitness", () => {
    it("should calculate net profit correctly", () => {
      const agent = createTestAgent({
        totalEarnings: 15.0,
        totalCosts: 5.0,
      });

      const fitness = calculateEconomicFitness(agent);
      expect(fitness.netProfit).toBe(10.0);
    });

    it("should calculate profit margin correctly", () => {
      const agent = createTestAgent({
        totalEarnings: 20.0,
        totalCosts: 5.0,
      });

      const fitness = calculateEconomicFitness(agent);
      expect(fitness.profitMargin).toBe(75); // (15/20) * 100
    });

    it("should calculate earnings rate correctly", () => {
      const agent = createTestAgent({
        totalEarnings: 30.0,
        age: 10,
      });

      const fitness = calculateEconomicFitness(agent);
      expect(fitness.earningsRate).toBe(3.0); // 30 / 10
    });

    it("should calculate earnings by source", () => {
      const agent = createTestAgent();
      
      trackEarnings(agent, "trading", 5.0, "Trade 1");
      trackEarnings(agent, "trading", 3.0, "Trade 2");
      trackEarnings(agent, "services", 2.0, "Service 1");
      trackEarnings(agent, "tasks", 1.0, "Task 1");

      const fitness = calculateEconomicFitness(agent);
      expect(fitness.earningsBySource.get("trading")).toBe(8.0);
      expect(fitness.earningsBySource.get("services")).toBe(2.0);
      expect(fitness.earningsBySource.get("tasks")).toBe(1.0);
    });

    it("should calculate economic fitness score (0-100)", () => {
      const agent = createTestAgent({
        totalEarnings: 10.0,
        totalCosts: 2.0,
        age: 10,
      });

      const fitness = calculateEconomicFitness(agent);
      expect(fitness.economicFitness).toBeGreaterThanOrEqual(0);
      expect(fitness.economicFitness).toBeLessThanOrEqual(100);
    });

    it("should handle zero earnings gracefully", () => {
      const agent = createTestAgent({
        totalEarnings: 0,
        totalCosts: 0,
        age: 5,
      });

      const fitness = calculateEconomicFitness(agent);
      expect(fitness.netProfit).toBe(0);
      expect(fitness.profitMargin).toBe(0);
      expect(fitness.earningsRate).toBe(0);
      expect(fitness.economicFitness).toBe(0);
    });

    it("should handle negative net profit", () => {
      const agent = createTestAgent({
        totalEarnings: 5.0,
        totalCosts: 10.0,
      });

      const fitness = calculateEconomicFitness(agent);
      expect(fitness.netProfit).toBe(-5.0);
      expect(fitness.economicFitness).toBe(0); // Clamped to 0
    });

    it("should cap fitness score at 100", () => {
      const agent = createTestAgent({
        totalEarnings: 100.0,
        totalCosts: 0,
        age: 10,
      });

      const fitness = calculateEconomicFitness(agent);
      expect(fitness.economicFitness).toBeLessThanOrEqual(100);
    });
  });

  describe("getEarningsHistory", () => {
    it("should return all earnings records", () => {
      const agent = createTestAgent();
      
      trackEarnings(agent, "trading", 1.0, "Earning 1");
      trackEarnings(agent, "services", 2.0, "Earning 2");
      trackEarnings(agent, "tasks", 3.0, "Earning 3");

      const history = getEarningsHistory(agent.id);
      expect(history).toHaveLength(3);
    });

    it("should limit returned records when limit specified", () => {
      const agent = createTestAgent();
      
      trackEarnings(agent, "trading", 1.0, "Earning 1");
      trackEarnings(agent, "services", 2.0, "Earning 2");
      trackEarnings(agent, "tasks", 3.0, "Earning 3");

      const history = getEarningsHistory(agent.id, 2);
      expect(history).toHaveLength(2);
      expect(history[0].amount).toBe(2.0); // Last 2 records
      expect(history[1].amount).toBe(3.0);
    });

    it("should return empty array for agent with no earnings", () => {
      const history = getEarningsHistory("nonexistent-agent");
      expect(history).toEqual([]);
    });
  });

  describe("getEarningsBySource", () => {
    it("should aggregate earnings by source", () => {
      const agent = createTestAgent();
      
      trackEarnings(agent, "trading", 5.0, "Trade 1");
      trackEarnings(agent, "trading", 3.0, "Trade 2");
      trackEarnings(agent, "services", 2.0, "Service 1");

      const bySource = getEarningsBySource(agent.id);
      expect(bySource.get("trading")).toBe(8.0);
      expect(bySource.get("services")).toBe(2.0);
    });

    it("should return empty map for agent with no earnings", () => {
      const bySource = getEarningsBySource("nonexistent-agent");
      expect(bySource.size).toBe(0);
    });
  });

  describe("getEarningsInPeriod", () => {
    it("should return earnings within date range", () => {
      const agent = createTestAgent();
      
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      // Add earnings and manually set timestamps
      trackEarnings(agent, "trading", 5.0, "Before period");
      const history1 = getEarningsHistory(agent.id);
      history1[0].timestamp = new Date("2023-12-31"); // Before period

      trackEarnings(agent, "services", 3.0, "In period");
      const history2 = getEarningsHistory(agent.id);
      history2[1].timestamp = new Date("2024-01-15"); // In period

      trackEarnings(agent, "tasks", 2.0, "In period");
      const history3 = getEarningsHistory(agent.id);
      history3[2].timestamp = new Date("2024-01-20"); // In period

      const total = getEarningsInPeriod(agent.id, startDate, endDate);
      expect(total).toBe(5.0); // Only the last two earnings (3.0 + 2.0)
    });

    it("should return zero for period with no earnings", () => {
      const agent = createTestAgent();
      
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const total = getEarningsInPeriod(agent.id, startDate, endDate);
      expect(total).toBe(0);
    });
  });

  describe("clearEarningsHistory", () => {
    it("should clear earnings history for specific agent", () => {
      const agent1 = createTestAgent({ id: "agent-1" });
      const agent2 = createTestAgent({ id: "agent-2" });
      
      trackEarnings(agent1, "trading", 1.0, "Agent 1");
      trackEarnings(agent2, "services", 2.0, "Agent 2");

      clearEarningsHistory(agent1.id);

      expect(getEarningsHistory(agent1.id)).toHaveLength(0);
      expect(getEarningsHistory(agent2.id)).toHaveLength(1);
    });
  });

  describe("clearAllEarningsHistory", () => {
    it("should clear all earnings history", () => {
      const agent1 = createTestAgent({ id: "agent-1" });
      const agent2 = createTestAgent({ id: "agent-2" });
      
      trackEarnings(agent1, "trading", 1.0, "Agent 1");
      trackEarnings(agent2, "services", 2.0, "Agent 2");

      clearAllEarningsHistory();

      expect(getEarningsHistory(agent1.id)).toHaveLength(0);
      expect(getEarningsHistory(agent2.id)).toHaveLength(0);
    });
  });
});
