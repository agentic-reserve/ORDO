/**
 * Unit tests for cost validation system
 * 
 * Tests Requirement 23.6: Cost Optimization and FinOps
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { Agent } from "../types.js";
import { trackCosts, clearAllCostHistory } from "./cost-tracking.js";
import {
  calculateCostPerAgentPerDay,
  validateCostReduction,
  calculatePopulationCostMetrics,
  generateCostComparisonReport,
  generatePopulationCostReport,
  COST_CONSTANTS,
} from "./cost-validation.js";

describe("Cost Validation System", () => {
  let testAgent: Agent;
  let startDate: Date;
  let endDate: Date;

  beforeEach(() => {
    clearAllCostHistory();
    
    startDate = new Date("2024-01-01T00:00:00Z");
    endDate = new Date("2024-01-02T00:00:00Z"); // 1 day period
    
    testAgent = {
      id: "test-agent-1",
      publicKey: "test-pubkey",
      name: "Test Agent",
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
  });

  describe("calculateCostPerAgentPerDay", () => {
    it("should calculate cost per day correctly", () => {
      // Track some costs with timestamps in the test period
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.0001, "Test inference", undefined, costDate);
      trackCosts(testAgent, "transaction", 0.000005, "Test transaction", undefined, costDate);
      trackCosts(testAgent, "storage", 0.00001, "Test storage", undefined, costDate);
      
      const result = calculateCostPerAgentPerDay(testAgent, startDate, endDate);
      
      expect(result.agentId).toBe(testAgent.id);
      expect(result.periodDays).toBe(1);
      expect(result.totalCostSOL).toBeCloseTo(0.000115, 6);
      expect(result.costPerDaySOL).toBeCloseTo(0.000115, 6);
    });

    it("should convert SOL to USD correctly", () => {
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.0001, "Test inference", undefined, costDate);
      
      const solToUsdRate = 100; // $100 per SOL
      const result = calculateCostPerAgentPerDay(testAgent, startDate, endDate, solToUsdRate);
      
      expect(result.totalCostUSD).toBeCloseTo(0.01, 4); // 0.0001 SOL * $100
      expect(result.costPerDayUSD).toBeCloseTo(0.01, 4);
    });

    it("should calculate cost reduction vs EVM correctly", () => {
      // Track minimal costs to achieve target
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.0003, "Test inference", undefined, costDate);
      
      const result = calculateCostPerAgentPerDay(testAgent, startDate, endDate);
      
      // EVM baseline is $1.30 per day
      // Solana cost is 0.0003 SOL * $100 = $0.03 per day
      // Reduction = (1.30 - 0.03) / 1.30 * 100 = 97.69%
      expect(result.evmBaselineCostUSD).toBe(1.30);
      expect(result.costReductionPercent).toBeGreaterThan(97);
    });

    it("should validate if meets target cost", () => {
      // Track costs below target
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.0002, "Test inference", undefined, costDate);
      
      const result = calculateCostPerAgentPerDay(testAgent, startDate, endDate);
      
      expect(result.meetsTarget).toBe(true);
      expect(result.costPerDaySOL).toBeLessThanOrEqual(COST_CONSTANTS.TARGET_COST_PER_AGENT_PER_DAY_SOL);
    });

    it("should detect when target is not met", () => {
      // Track costs above target
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.001, "Test inference", undefined, costDate);
      
      const result = calculateCostPerAgentPerDay(testAgent, startDate, endDate);
      
      expect(result.meetsTarget).toBe(false);
      expect(result.costPerDaySOL).toBeGreaterThan(COST_CONSTANTS.TARGET_COST_PER_AGENT_PER_DAY_SOL);
    });

    it("should calculate savings correctly", () => {
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.0003, "Test inference", undefined, costDate);
      
      const result = calculateCostPerAgentPerDay(testAgent, startDate, endDate);
      
      // Savings = EVM cost - Solana cost
      const expectedSavings = 1.30 - (0.0003 * 100);
      expect(result.savings.absoluteUSD).toBeCloseTo(expectedSavings, 2);
    });

    it("should handle multi-day periods", () => {
      const multiDayEnd = new Date("2024-01-08T00:00:00Z"); // 7 days
      
      // Track costs over 7 days
      trackCosts(testAgent, "inference", 0.0003, "Day 1", undefined, new Date("2024-01-01T12:00:00Z"));
      trackCosts(testAgent, "inference", 0.0003, "Day 2", undefined, new Date("2024-01-02T12:00:00Z"));
      trackCosts(testAgent, "inference", 0.0003, "Day 3", undefined, new Date("2024-01-03T12:00:00Z"));
      
      const result = calculateCostPerAgentPerDay(testAgent, startDate, multiDayEnd);
      
      expect(result.periodDays).toBe(7);
      expect(result.totalCostSOL).toBeCloseTo(0.0009, 6);
      expect(result.costPerDaySOL).toBeCloseTo(0.0009 / 7, 6);
    });

    it("should throw error for invalid date range", () => {
      expect(() => {
        calculateCostPerAgentPerDay(testAgent, endDate, startDate);
      }).toThrow("End date must be after start date");
    });
  });

  describe("validateCostReduction", () => {
    it("should return true when cost reduction meets target", () => {
      // Track very minimal costs to achieve 99.95%+ reduction
      // EVM cost = $1.30, Target = 99.95% reduction
      // Allowed cost = $1.30 * 0.0005 = $0.00065
      // In SOL at $100/SOL = 0.0000065 SOL
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.000006, "Minimal cost", undefined, costDate);
      
      const result = validateCostReduction(testAgent, startDate, endDate);
      
      expect(result).toBe(true);
    });

    it("should return false when cost reduction does not meet target", () => {
      // Track high costs that don't achieve 99.95% reduction
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.01, "High cost", undefined, costDate);
      
      const result = validateCostReduction(testAgent, startDate, endDate);
      
      expect(result).toBe(false);
    });

    it("should validate at target threshold exactly", () => {
      // Calculate exact cost for 99.95% reduction
      // EVM cost = $1.30
      // Target reduction = 99.95%
      // Allowed cost = $1.30 * (1 - 0.9995) = $0.00065
      // In SOL at $100/SOL = 0.0000065 SOL
      // Use slightly less to ensure we're at or below threshold
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.0000064, "At threshold", undefined, costDate);
      
      const result = validateCostReduction(testAgent, startDate, endDate);
      
      expect(result).toBe(true);
    });
  });

  describe("calculatePopulationCostMetrics", () => {
    it("should calculate metrics for multiple agents", () => {
      const agents: Agent[] = [
        { ...testAgent, id: "agent-1" },
        { ...testAgent, id: "agent-2" },
        { ...testAgent, id: "agent-3" },
      ];
      
      // Track costs for each agent
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(agents[0], "inference", 0.0001, "Agent 1", undefined, costDate);
      trackCosts(agents[1], "inference", 0.0002, "Agent 2", undefined, costDate);
      trackCosts(agents[2], "inference", 0.0003, "Agent 3", undefined, costDate);
      
      const metrics = calculatePopulationCostMetrics(agents, startDate, endDate);
      
      expect(metrics.totalAgents).toBe(3);
      expect(metrics.periodDays).toBe(1);
      expect(metrics.totalCostSOL).toBeCloseTo(0.0006, 6);
      expect(metrics.avgCostPerAgentPerDaySOL).toBeCloseTo(0.0002, 6);
    });

    it("should calculate EVM equivalent cost for population", () => {
      const agents: Agent[] = [
        { ...testAgent, id: "agent-1" },
        { ...testAgent, id: "agent-2" },
      ];
      
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(agents[0], "inference", 0.0001, "Agent 1", undefined, costDate);
      trackCosts(agents[1], "inference", 0.0001, "Agent 2", undefined, costDate);
      
      const metrics = calculatePopulationCostMetrics(agents, startDate, endDate);
      
      // EVM cost = $1.30 per agent per day * 2 agents * 1 day = $2.60
      expect(metrics.evmEquivalentCostUSD).toBe(2.60);
    });

    it("should calculate total savings for population", () => {
      const agents: Agent[] = [
        { ...testAgent, id: "agent-1" },
        { ...testAgent, id: "agent-2" },
      ];
      
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(agents[0], "inference", 0.0001, "Agent 1", undefined, costDate);
      trackCosts(agents[1], "inference", 0.0001, "Agent 2", undefined, costDate);
      
      const metrics = calculatePopulationCostMetrics(agents, startDate, endDate);
      
      // Solana cost = 0.0002 SOL * $100 = $0.02
      // EVM cost = $2.60
      // Savings = $2.60 - $0.02 = $2.58
      expect(metrics.totalSavingsUSD).toBeCloseTo(2.58, 2);
    });

    it("should count agents meeting target", () => {
      const agents: Agent[] = [
        { ...testAgent, id: "agent-1" },
        { ...testAgent, id: "agent-2" },
        { ...testAgent, id: "agent-3" },
      ];
      
      // Agent 1 and 2 meet target, agent 3 does not
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(agents[0], "inference", 0.0001, "Agent 1 - meets target", undefined, costDate);
      trackCosts(agents[1], "inference", 0.0002, "Agent 2 - meets target", undefined, costDate);
      trackCosts(agents[2], "inference", 0.001, "Agent 3 - exceeds target", undefined, costDate);
      
      const metrics = calculatePopulationCostMetrics(agents, startDate, endDate);
      
      expect(metrics.agentsMeetingTarget).toBe(2);
      expect(metrics.percentMeetingTarget).toBeCloseTo(66.67, 1);
    });

    it("should throw error for empty population", () => {
      expect(() => {
        calculatePopulationCostMetrics([], startDate, endDate);
      }).toThrow("Cannot calculate metrics for empty population");
    });
  });

  describe("generateCostComparisonReport", () => {
    it("should generate formatted report", () => {
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.0001, "Test inference", undefined, costDate);
      
      const report = generateCostComparisonReport(testAgent, startDate, endDate);
      
      expect(report).toContain("COST COMPARISON REPORT");
      expect(report).toContain("Agent ID: test-agent-1");
      expect(report).toContain("SOLANA COSTS:");
      expect(report).toContain("EVM BASELINE:");
      expect(report).toContain("COST REDUCTION:");
      expect(report).toContain("TARGET VALIDATION:");
    });

    it("should show success indicator when target is met", () => {
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.0001, "Test inference", undefined, costDate);
      
      const report = generateCostComparisonReport(testAgent, startDate, endDate);
      
      expect(report).toContain("✅ YES");
    });

    it("should show failure indicator when target is not met", () => {
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(testAgent, "inference", 0.001, "High cost", undefined, costDate);
      
      const report = generateCostComparisonReport(testAgent, startDate, endDate);
      
      expect(report).toContain("❌ NO");
    });
  });

  describe("generatePopulationCostReport", () => {
    it("should generate formatted population report", () => {
      const agents: Agent[] = [
        { ...testAgent, id: "agent-1" },
        { ...testAgent, id: "agent-2" },
      ];
      
      const costDate = new Date("2024-01-01T12:00:00Z");
      trackCosts(agents[0], "inference", 0.0001, "Agent 1", undefined, costDate);
      trackCosts(agents[1], "inference", 0.0002, "Agent 2", undefined, costDate);
      
      const report = generatePopulationCostReport(agents, startDate, endDate);
      
      expect(report).toContain("POPULATION COST METRICS");
      expect(report).toContain("Total Agents: 2");
      expect(report).toContain("SOLANA COSTS:");
      expect(report).toContain("EVM EQUIVALENT:");
      expect(report).toContain("COST REDUCTION:");
      expect(report).toContain("TARGET VALIDATION:");
    });
  });

  describe("Real-world cost scenarios", () => {
    it("should validate typical agent daily costs", () => {
      // Simulate realistic daily costs for an agent
      // - 100 AI inferences at 1000 tokens each
      // - 10 Solana transactions
      // - 1MB storage
      
      const costDate = new Date("2024-01-01T12:00:00Z");
      
      // AI inference: 100 * 1000 tokens * 0.000001 SOL/token = 0.0001 SOL
      trackCosts(testAgent, "inference", 0.0001, "Daily AI usage", undefined, costDate);
      
      // Transactions: 10 * 0.000005 SOL = 0.00005 SOL
      trackCosts(testAgent, "transaction", 0.00005, "Daily transactions", undefined, costDate);
      
      // Storage: 1MB * 0.0000001 SOL/byte = 0.0001 SOL
      trackCosts(testAgent, "storage", 0.0001, "Daily storage", undefined, costDate);
      
      const result = calculateCostPerAgentPerDay(testAgent, startDate, endDate);
      
      // Total: 0.00025 SOL per day
      expect(result.costPerDaySOL).toBeCloseTo(0.00025, 6);
      expect(result.meetsTarget).toBe(true); // Below 0.0003 target
      expect(result.costReductionPercent).toBeGreaterThan(98); // 98.07% reduction
    });

    it("should validate cost reduction for 1000 agent population", () => {
      const agents: Agent[] = Array.from({ length: 1000 }, (_, i) => ({
        ...testAgent,
        id: `agent-${i}`,
      }));
      
      const costDate = new Date("2024-01-01T12:00:00Z");
      
      // Each agent costs 0.0002 SOL per day
      agents.forEach(agent => {
        trackCosts(agent, "inference", 0.0002, "Daily costs", undefined, costDate);
      });
      
      const metrics = calculatePopulationCostMetrics(agents, startDate, endDate);
      
      // Solana: 1000 agents * 0.0002 SOL * $100 = $20
      // EVM: 1000 agents * $1.30 = $1,300
      // Savings: $1,280 per day
      expect(metrics.totalCostUSD).toBeCloseTo(20, 0);
      expect(metrics.evmEquivalentCostUSD).toBe(1300);
      expect(metrics.totalSavingsUSD).toBeCloseTo(1280, 0);
      expect(metrics.avgCostReductionPercent).toBeGreaterThan(98);
    });
  });
});
