/**
 * Unit Tests for Improvement Testing System
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createSandboxEnvironment,
  testImprovementInSandbox,
  measureImpactOver7Days,
  applyToProduction,
  testAndApplyImprovement,
  type ImprovementProposal,
  type SandboxEnvironment,
  type ImpactMeasurementResult,
} from "./improvement-testing.js";
import type { OrdoDatabase, Agent, InstalledTool } from "../types/index.js";
import type { ImprovementOpportunity } from "./bottleneck-analysis.js";
import { PublicKey } from "@solana/web3.js";

// Mock database
function createMockDatabase(): OrdoDatabase {
  return {
    getAgent: vi.fn(async (agentId: string) => ({
      id: agentId,
      publicKey: PublicKey.default,
      name: "Test Agent",
      generation: 1,
      children: [],
      balance: 5.0,
      age: 10,
      createdAt: new Date(),
      status: "alive" as const,
      fitness: 0.8,
      traits: {},
    })),
    updateAgent: vi.fn(),
    createAgent: vi.fn(),
    deleteAgent: vi.fn(),
    listAgents: vi.fn(),
    getRecentTurns: vi.fn(async () => []),
    saveTurn: vi.fn(),
    getTurnsBySession: vi.fn(),
    getRecentModifications: vi.fn(),
    saveModification: vi.fn(),
    getModificationById: vi.fn(),
    updateModification: vi.fn(),
    getInstalledTools: vi.fn(() => []),
    saveInstalledTool: vi.fn(),
    removeTool: vi.fn(),
    getToolById: vi.fn(),
    getInferenceCosts: vi.fn(async () => []),
    saveInferenceCost: vi.fn(),
    getTotalCost: vi.fn(async () => 0.5),
    getAverageLatency: vi.fn(async () => 150),
    getSuccessRate: vi.fn(async () => 0.92),
    getToolCallStats: vi.fn(async () => []),
  } as any;
}

describe("Improvement Testing System", () => {
  let mockDb: OrdoDatabase;
  let testImprovement: ImprovementProposal;

  beforeEach(() => {
    mockDb = createMockDatabase();
    testImprovement = {
      id: "imp-test-123",
      agentId: "agent-1",
      opportunityId: "opp-1",
      type: "model_switch",
      description: "Switch to GPT-3.5 for cost reduction",
      hypothesis: "Using GPT-3.5 will reduce costs by 50% with minimal quality impact",
      targetMetric: "cost",
      expectedImprovement: 50,
      createdAt: new Date(),
      status: "proposed",
    };
  });

  describe("createSandboxEnvironment", () => {
    it("should create a sandbox environment for testing", async () => {
      const sandbox = await createSandboxEnvironment(
        mockDb,
        "agent-1",
        testImprovement
      );

      expect(sandbox.id).toBe("sandbox-imp-test-123");
      expect(sandbox.agentId).toBe("agent-1");
      expect(sandbox.improvementId).toBe("imp-test-123");
      expect(sandbox.isolatedState).toBeDefined();
      expect(sandbox.isolatedState.config).toBeDefined();
      expect(sandbox.isolatedState.tools).toBeDefined();
    });

    it("should throw error if agent not found", async () => {
      mockDb.getAgent = vi.fn(async () => null);

      await expect(
        createSandboxEnvironment(mockDb, "nonexistent", testImprovement)
      ).rejects.toThrow("Agent nonexistent not found");
    });

    it("should clone agent tools into sandbox", async () => {
      const mockTools: InstalledTool[] = [
        {
          id: "tool-1",
          agentId: "agent-1",
          name: "web_search",
          type: "mcp",
          version: "1.0.0",
          installedAt: new Date(),
        },
        {
          id: "tool-2",
          agentId: "agent-1",
          name: "calculator",
          type: "npm",
          version: "2.0.0",
          installedAt: new Date(),
        },
      ];

      mockDb.getInstalledTools = vi.fn(() => mockTools);

      const sandbox = await createSandboxEnvironment(
        mockDb,
        "agent-1",
        testImprovement
      );

      expect(sandbox.isolatedState.tools).toEqual(["web_search", "calculator"]);
    });
  });

  describe("testImprovementInSandbox", () => {
    it("should test improvement and return metrics", async () => {
      const sandbox: SandboxEnvironment = {
        id: "sandbox-test",
        agentId: "agent-1",
        improvementId: "imp-test-123",
        createdAt: new Date(),
        isolatedState: {
          config: {},
          tools: [],
          model: "gpt-4",
        },
      };

      const result = await testImprovementInSandbox(
        mockDb,
        testImprovement,
        sandbox,
        10
      );

      expect(result.success).toBeDefined();
      expect(result.errors).toBeInstanceOf(Array);
      expect(result.initialMetrics).toBeDefined();
      expect(result.initialMetrics.avgLatencyMs).toBeGreaterThanOrEqual(0);
      expect(result.initialMetrics.avgCostCents).toBeGreaterThanOrEqual(0);
      expect(result.initialMetrics.successRate).toBeGreaterThanOrEqual(0);
      expect(result.initialMetrics.successRate).toBeLessThanOrEqual(1);
    });

    it("should handle test failures gracefully", async () => {
      const sandbox: SandboxEnvironment = {
        id: "sandbox-test",
        agentId: "agent-1",
        improvementId: "imp-test-123",
        createdAt: new Date(),
        isolatedState: {
          config: {},
          tools: [],
          model: "gpt-4",
        },
      };

      // Force an error by making the improvement invalid
      const badImprovement = { ...testImprovement, type: "invalid" as any };

      const result = await testImprovementInSandbox(
        mockDb,
        badImprovement,
        sandbox,
        5
      );

      // Should still return a result, even if there are errors
      expect(result).toBeDefined();
      expect(result.initialMetrics).toBeDefined();
    });
  });

  describe("measureImpactOver7Days", () => {
    it("should measure impact over 7 days", async () => {
      const sandbox: SandboxEnvironment = {
        id: "sandbox-test",
        agentId: "agent-1",
        improvementId: "imp-test-123",
        createdAt: new Date(),
        isolatedState: {
          config: {},
          tools: [],
          model: "gpt-3.5-turbo",
        },
      };

      const result = await measureImpactOver7Days(
        mockDb,
        "agent-1",
        testImprovement,
        sandbox
      );

      expect(result.improvementId).toBe("imp-test-123");
      expect(result.measurementPeriodDays).toBe(7);
      expect(result.baseline).toBeDefined();
      expect(result.testPeriod).toBeDefined();
      expect(result.improvements).toBeDefined();
      expect(result.dailyMeasurements).toHaveLength(7);
      expect(result.validated).toBeDefined();
      expect(result.validationReason).toBeDefined();
    });

    it("should calculate improvements correctly", async () => {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      
      // Mock better performance in test period
      mockDb.getAverageLatency = vi.fn(async (agentId, start, end) => {
        // Return lower latency for recent dates (test period)
        return start.getTime() > sevenDaysAgo ? 100 : 150;
      });

      mockDb.getTotalCost = vi.fn(async (agentId, start, end) => {
        // Return lower cost for recent dates (test period)
        return start.getTime() > sevenDaysAgo ? 0.25 : 0.5;
      });

      const sandbox: SandboxEnvironment = {
        id: "sandbox-test",
        agentId: "agent-1",
        improvementId: "imp-test-123",
        createdAt: new Date(),
        isolatedState: {
          config: {},
          tools: [],
          model: "gpt-3.5-turbo",
        },
      };

      const result = await measureImpactOver7Days(
        mockDb,
        "agent-1",
        testImprovement,
        sandbox
      );

      // Should show improvements (baseline is worse than test period)
      expect(result.improvements.speedImprovement).toBeGreaterThanOrEqual(0);
      expect(result.improvements.costReduction).toBeGreaterThanOrEqual(0);
    });

    it("should validate improvement if thresholds are met", async () => {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      
      // Mock significant cost reduction
      mockDb.getTotalCost = vi.fn(async (agentId, start, end) => {
        return start.getTime() > sevenDaysAgo ? 0.2 : 0.5;
      });
      
      mockDb.getAverageLatency = vi.fn(async (agentId, start, end) => {
        return start.getTime() > sevenDaysAgo ? 100 : 150;
      });

      const sandbox: SandboxEnvironment = {
        id: "sandbox-test",
        agentId: "agent-1",
        improvementId: "imp-test-123",
        createdAt: new Date(),
        isolatedState: {
          config: {},
          tools: [],
          model: "gpt-3.5-turbo",
        },
      };

      const result = await measureImpactOver7Days(
        mockDb,
        "agent-1",
        testImprovement,
        sandbox
      );

      // Should be validated if cost reduction > 10%
      // The improvement should show significant cost reduction
      expect(result.improvements.costReduction).toBeGreaterThan(10);
      if (result.validated) {
        expect(result.validationReason).toContain("Cost reduced");
      }
    });

    it("should reject if reliability degrades significantly", async () => {
      // Mock degraded success rate
      mockDb.getSuccessRate = vi.fn(async (agentId, start, end) => {
        return start > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) ? 0.8 : 0.92;
      });

      const sandbox: SandboxEnvironment = {
        id: "sandbox-test",
        agentId: "agent-1",
        improvementId: "imp-test-123",
        createdAt: new Date(),
        isolatedState: {
          config: {},
          tools: [],
          model: "gpt-3.5-turbo",
        },
      };

      const result = await measureImpactOver7Days(
        mockDb,
        "agent-1",
        testImprovement,
        sandbox
      );

      // Should be rejected due to reliability degradation
      expect(result.validated).toBe(false);
      expect(result.validationReason).toContain("Reliability degraded");
    });
  });

  describe("applyToProduction", () => {
    it("should apply validated improvement to production", async () => {
      const impactResult: ImpactMeasurementResult = {
        improvementId: "imp-test-123",
        measurementPeriodDays: 7,
        startDate: new Date(),
        endDate: new Date(),
        baseline: {
          avgLatencyMs: 150,
          avgCostCents: 0.5,
          successRate: 0.92,
          totalOperations: 1000,
        },
        testPeriod: {
          avgLatencyMs: 140,
          avgCostCents: 0.25,
          successRate: 0.93,
          totalOperations: 1000,
        },
        improvements: {
          speedImprovement: 6.7,
          costReduction: 50,
          reliabilityImprovement: 1,
        },
        dailyMeasurements: [],
        validated: true,
        validationReason: "Cost reduced by 50%",
      };

      const result = await applyToProduction(
        mockDb,
        "agent-1",
        testImprovement,
        impactResult
      );

      expect(result.success).toBe(true);
      expect(result.improvementId).toBe("imp-test-123");
      expect(result.changes).toBeInstanceOf(Array);
      expect(result.changes.length).toBeGreaterThan(0);
      expect(result.rollbackPlan).toBeDefined();
      expect(mockDb.saveModification).toHaveBeenCalled();
    });

    it("should throw error if improvement not validated", async () => {
      const impactResult: ImpactMeasurementResult = {
        improvementId: "imp-test-123",
        measurementPeriodDays: 7,
        startDate: new Date(),
        endDate: new Date(),
        baseline: {
          avgLatencyMs: 150,
          avgCostCents: 0.5,
          successRate: 0.92,
          totalOperations: 1000,
        },
        testPeriod: {
          avgLatencyMs: 145,
          avgCostCents: 0.48,
          successRate: 0.91,
          totalOperations: 1000,
        },
        improvements: {
          speedImprovement: 3.3,
          costReduction: 4,
          reliabilityImprovement: -1,
        },
        dailyMeasurements: [],
        validated: false,
        validationReason: "Improvements below threshold",
      };

      await expect(
        applyToProduction(mockDb, "agent-1", testImprovement, impactResult)
      ).rejects.toThrow("Cannot apply unvalidated improvement");
    });

    it("should create rollback plan", async () => {
      const impactResult: ImpactMeasurementResult = {
        improvementId: "imp-test-123",
        measurementPeriodDays: 7,
        startDate: new Date(),
        endDate: new Date(),
        baseline: {
          avgLatencyMs: 150,
          avgCostCents: 0.5,
          successRate: 0.92,
          totalOperations: 1000,
        },
        testPeriod: {
          avgLatencyMs: 140,
          avgCostCents: 0.25,
          successRate: 0.93,
          totalOperations: 1000,
        },
        improvements: {
          speedImprovement: 6.7,
          costReduction: 50,
          reliabilityImprovement: 1,
        },
        dailyMeasurements: [],
        validated: true,
        validationReason: "Cost reduced by 50%",
      };

      const result = await applyToProduction(
        mockDb,
        "agent-1",
        testImprovement,
        impactResult
      );

      expect(result.rollbackPlan).toBeDefined();
      expect(result.rollbackPlan.steps).toBeInstanceOf(Array);
      expect(result.rollbackPlan.steps.length).toBeGreaterThan(0);
      expect(result.rollbackPlan.estimatedDurationMs).toBeGreaterThan(0);
    });
  });

  describe("testAndApplyImprovement (Integration)", () => {
    it("should orchestrate full improvement lifecycle", async () => {
      const now = Date.now();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      
      const opportunity: ImprovementOpportunity = {
        id: "opp-1",
        category: "cost",
        description: "Switch to cheaper model",
        currentMetric: 0.5,
        targetMetric: 0.25,
        expectedImpact: 50,
        priority: "high",
        estimatedEffort: "low",
        affectedOperations: ["inference"],
      };

      // Mock successful cost reduction
      mockDb.getTotalCost = vi.fn(async (agentId, start, end) => {
        return start.getTime() > sevenDaysAgo ? 0.2 : 0.5;
      });
      
      mockDb.getAverageLatency = vi.fn(async (agentId, start, end) => {
        return start.getTime() > sevenDaysAgo ? 100 : 150;
      });

      const result = await testAndApplyImprovement(mockDb, "agent-1", opportunity);

      expect(result.proposal).toBeDefined();
      // Should be applied if cost reduction is significant
      if (result.impactResult.validated) {
        expect(result.proposal.status).toBe("applied");
        expect(result.productionResult).toBeDefined();
        expect(result.productionResult?.success).toBe(true);
      } else {
        expect(result.proposal.status).toBe("rejected");
      }
      expect(result.sandboxResult).toBeDefined();
      expect(result.impactResult).toBeDefined();
    });

    it("should stop if sandbox testing fails", async () => {
      const opportunity: ImprovementOpportunity = {
        id: "opp-1",
        category: "cost",
        description: "Switch to cheaper model",
        currentMetric: 0.5,
        targetMetric: 0.25,
        expectedImpact: 50,
        priority: "high",
        estimatedEffort: "low",
        affectedOperations: ["inference"],
      };

      // Force sandbox failure by making agent not found
      mockDb.getAgent = vi.fn(async () => null);

      await expect(
        testAndApplyImprovement(mockDb, "agent-1", opportunity)
      ).rejects.toThrow();
    });

    it("should not apply if validation fails", async () => {
      const opportunity: ImprovementOpportunity = {
        id: "opp-1",
        category: "cost",
        description: "Switch to cheaper model",
        currentMetric: 0.5,
        targetMetric: 0.25,
        expectedImprovement: 50,
        priority: "high",
        estimatedEffort: "low",
        affectedOperations: ["inference"],
      };

      // Mock insufficient improvement
      mockDb.getTotalCost = vi.fn(async () => 0.48);

      const result = await testAndApplyImprovement(mockDb, "agent-1", opportunity);

      expect(result.proposal.status).toBe("rejected");
      expect(result.impactResult.validated).toBe(false);
      expect(result.productionResult).toBeUndefined();
    });
  });
});
