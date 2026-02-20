/**
 * Cost Tracker Unit Tests
 *
 * Tests for AI inference cost tracking functionality
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CostTracker, DEFAULT_MODEL_PRICING } from "../cost-tracker.js";
import type { TokenUsage } from "../../types.js";

describe("CostTracker", () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  describe("calculateCost", () => {
    it("should calculate cost correctly for known models", () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = tracker.calculateCost(usage, "openai/gpt-4o");

      // Expected: (1000/1M * 250) + (500/1M * 1000) = 0.25 + 0.5 = 0.75 cents
      expect(cost).toBeCloseTo(0.75, 2);
    });

    it("should use fallback pricing for unknown models", () => {
      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = tracker.calculateCost(usage, "unknown/model");

      // Fallback: (1000/1M * 10) + (500/1M * 30) = 0.01 + 0.015 = 0.025 cents
      expect(cost).toBeCloseTo(0.025, 3);
    });

    it("should handle zero tokens", () => {
      const usage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      const cost = tracker.calculateCost(usage, "openai/gpt-4o");
      expect(cost).toBe(0);
    });
  });

  describe("trackInference", () => {
    it("should track inference records", () => {
      const record = {
        id: "test-1",
        agentId: "agent-1",
        model: "openai/gpt-4o",
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        costCents: 0.75,
        latencyMs: 1500,
        timestamp: new Date().toISOString(),
      };

      tracker.trackInference(record);

      const records = tracker.getRecordsByAgent("agent-1");
      expect(records).toHaveLength(1);
      expect(records[0]).toEqual(record);
    });

    it("should track multiple inferences", () => {
      for (let i = 0; i < 5; i++) {
        tracker.trackInference({
          id: `test-${i}`,
          agentId: "agent-1",
          model: "openai/gpt-4o",
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
          costCents: 0.75,
          latencyMs: 1500,
          timestamp: new Date().toISOString(),
        });
      }

      const records = tracker.getRecordsByAgent("agent-1");
      expect(records).toHaveLength(5);
    });
  });

  describe("getAnalytics", () => {
    beforeEach(() => {
      // Add test data
      tracker.trackInference({
        id: "test-1",
        agentId: "agent-1",
        model: "openai/gpt-4o",
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        costCents: 0.75,
        latencyMs: 1500,
        timestamp: new Date().toISOString(),
      });

      tracker.trackInference({
        id: "test-2",
        agentId: "agent-1",
        model: "openai/gpt-3.5-turbo",
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
        costCents: 0.25,
        latencyMs: 800,
        timestamp: new Date().toISOString(),
      });
    });

    it("should calculate total cost", () => {
      const analytics = tracker.getAnalytics("agent-1");
      expect(analytics.totalCost).toBe(1.0);
    });

    it("should calculate total tokens", () => {
      const analytics = tracker.getAnalytics("agent-1");
      expect(analytics.totalTokens).toBe(4500);
    });

    it("should calculate total inferences", () => {
      const analytics = tracker.getAnalytics("agent-1");
      expect(analytics.totalInferences).toBe(2);
    });

    it("should calculate average cost per inference", () => {
      const analytics = tracker.getAnalytics("agent-1");
      expect(analytics.averageCostPerInference).toBe(0.5);
    });

    it("should calculate average tokens per inference", () => {
      const analytics = tracker.getAnalytics("agent-1");
      expect(analytics.averageTokensPerInference).toBe(2250);
    });

    it("should calculate average latency", () => {
      const analytics = tracker.getAnalytics("agent-1");
      expect(analytics.averageLatency).toBe(1150);
    });

    it("should break down cost by model", () => {
      const analytics = tracker.getAnalytics("agent-1");
      expect(analytics.costByModel.get("openai/gpt-4o")).toBe(0.75);
      expect(analytics.costByModel.get("openai/gpt-3.5-turbo")).toBe(0.25);
    });

    it("should return empty analytics for no records", () => {
      const analytics = tracker.getAnalytics("non-existent-agent");
      expect(analytics.totalCost).toBe(0);
      expect(analytics.totalTokens).toBe(0);
      expect(analytics.totalInferences).toBe(0);
    });
  });

  describe("getTotalCost", () => {
    it("should return total cost for specific agent", () => {
      tracker.trackInference({
        id: "test-1",
        agentId: "agent-1",
        model: "openai/gpt-4o",
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        costCents: 0.75,
        latencyMs: 1500,
        timestamp: new Date().toISOString(),
      });

      tracker.trackInference({
        id: "test-2",
        agentId: "agent-2",
        model: "openai/gpt-4o",
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        costCents: 0.75,
        latencyMs: 1500,
        timestamp: new Date().toISOString(),
      });

      expect(tracker.getTotalCost("agent-1")).toBe(0.75);
      expect(tracker.getTotalCost("agent-2")).toBe(0.75);
      expect(tracker.getTotalCost()).toBe(1.5);
    });
  });

  describe("getTotalTokens", () => {
    it("should return total tokens for specific agent", () => {
      tracker.trackInference({
        id: "test-1",
        agentId: "agent-1",
        model: "openai/gpt-4o",
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        costCents: 0.75,
        latencyMs: 1500,
        timestamp: new Date().toISOString(),
      });

      const tokens = tracker.getTotalTokens("agent-1");
      expect(tokens.promptTokens).toBe(1000);
      expect(tokens.completionTokens).toBe(500);
      expect(tokens.totalTokens).toBe(1500);
    });
  });

  describe("getCostByModel", () => {
    it("should return cost breakdown by model", () => {
      tracker.trackInference({
        id: "test-1",
        agentId: "agent-1",
        model: "openai/gpt-4o",
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        costCents: 0.75,
        latencyMs: 1500,
        timestamp: new Date().toISOString(),
      });

      tracker.trackInference({
        id: "test-2",
        agentId: "agent-1",
        model: "openai/gpt-3.5-turbo",
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
        costCents: 0.25,
        latencyMs: 800,
        timestamp: new Date().toISOString(),
      });

      const costByModel = tracker.getCostByModel("agent-1");
      expect(costByModel.get("openai/gpt-4o")).toBe(0.75);
      expect(costByModel.get("openai/gpt-3.5-turbo")).toBe(0.25);
    });
  });

  describe("getMostCostEffectiveModel", () => {
    it("should identify the most cost-effective model", () => {
      // GPT-4o: 0.75 cents / 1500 tokens = 0.0005 cents/token
      tracker.trackInference({
        id: "test-1",
        agentId: "agent-1",
        model: "openai/gpt-4o",
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        costCents: 0.75,
        latencyMs: 1500,
        timestamp: new Date().toISOString(),
      });

      // GPT-3.5: 0.25 cents / 3000 tokens = 0.000083 cents/token (more efficient)
      tracker.trackInference({
        id: "test-2",
        agentId: "agent-1",
        model: "openai/gpt-3.5-turbo",
        promptTokens: 2000,
        completionTokens: 1000,
        totalTokens: 3000,
        costCents: 0.25,
        latencyMs: 800,
        timestamp: new Date().toISOString(),
      });

      const mostEffective = tracker.getMostCostEffectiveModel();
      expect(mostEffective).toBe("openai/gpt-3.5-turbo");
    });

    it("should return null for no records", () => {
      const mostEffective = tracker.getMostCostEffectiveModel();
      expect(mostEffective).toBeNull();
    });
  });

  describe("updateModelPricing", () => {
    it("should update pricing for a model", () => {
      const customPricing = {
        promptTokensPerMillion: 100,
        completionTokensPerMillion: 200,
      };

      tracker.updateModelPricing("custom/model", customPricing);

      const usage: TokenUsage = {
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
      };

      const cost = tracker.calculateCost(usage, "custom/model");
      // (1000/1M * 100) + (500/1M * 200) = 0.1 + 0.1 = 0.2 cents
      expect(cost).toBeCloseTo(0.2, 2);
    });
  });

  describe("clearRecords", () => {
    it("should clear all records", () => {
      tracker.trackInference({
        id: "test-1",
        agentId: "agent-1",
        model: "openai/gpt-4o",
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        costCents: 0.75,
        latencyMs: 1500,
        timestamp: new Date().toISOString(),
      });

      tracker.clearRecords();

      const records = tracker.getRecordsByAgent("agent-1");
      expect(records).toHaveLength(0);
    });
  });
});
