/**
 * Property-Based Tests for AI Cost Tracking
 *
 * Tests universal properties for cost tracking and token usage tracking
 * across all models and agents.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { test } from "@fast-check/vitest";
import * as fc from "fast-check";
import { CostTracker, type InferenceCostRecord } from "../cost-tracker.js";
import { OpenRouterClient } from "../client.js";
import type { TokenUsage } from "../../types.js";

// ─── Generators ──────────────────────────────────────────────────

const arbitraryTokenUsage = fc.record({
  promptTokens: fc.nat({ max: 100000 }),
  completionTokens: fc.nat({ max: 100000 }),
  totalTokens: fc.nat({ max: 200000 }),
});

const arbitraryModel = fc.constantFrom(
  "openai/gpt-4o",
  "openai/gpt-4-turbo",
  "openai/gpt-3.5-turbo",
  "anthropic/claude-3.5-sonnet",
  "anthropic/claude-3-haiku",
  "google/gemini-pro-1.5",
  "meta-llama/llama-3.1-70b-instruct",
);

const arbitraryAgentId = fc.string({ minLength: 1, maxLength: 50 });

const arbitraryInferenceCostRecord = fc.record({
  id: fc.string({ minLength: 1, maxLength: 50 }),
  agentId: arbitraryAgentId,
  model: arbitraryModel,
  promptTokens: fc.nat({ max: 100000 }),
  completionTokens: fc.nat({ max: 100000 }),
  totalTokens: fc.nat({ max: 200000 }),
  costCents: fc.double({ min: 0, max: 1000, noNaN: true }),
  latencyMs: fc.nat({ max: 60000 }),
  timestamp: fc.integer({ min: 1577836800000, max: 1924905600000 }).map((ms) => new Date(ms).toISOString()),
  turnId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
});

// ─── Property 51: Cost Tracking ──────────────────────────────────

describe("Property 51: Cost Tracking", () => {
  // Feature: ordo-digital-civilization, Property 51: Cost Tracking
  test.prop([fc.array(arbitraryInferenceCostRecord, { minLength: 1, maxLength: 100 })])(
    "should track cost per model and per agent for all inferences",
    (records) => {
      const tracker = new CostTracker();

      // Track all inferences
      for (const record of records) {
        tracker.trackInference(record);
      }

      // Verify cost tracking per agent
      const uniqueAgents = [...new Set(records.map((r) => r.agentId))];
      for (const agentId of uniqueAgents) {
        const agentRecords = records.filter((r) => r.agentId === agentId);
        const expectedCost = agentRecords.reduce((sum, r) => sum + r.costCents, 0);
        const actualCost = tracker.getTotalCost(agentId);

        expect(actualCost).toBeCloseTo(expectedCost, 5);
      }

      // Verify cost tracking per model
      const uniqueModels = [...new Set(records.map((r) => r.model))];
      for (const model of uniqueModels) {
        const modelRecords = records.filter((r) => r.model === model);
        const expectedCost = modelRecords.reduce((sum, r) => sum + r.costCents, 0);
        const costByModel = tracker.getCostByModel();
        const actualCost = costByModel.get(model) || 0;

        expect(actualCost).toBeCloseTo(expectedCost, 5);
      }

      // Verify total cost across all agents and models
      const expectedTotalCost = records.reduce((sum, r) => sum + r.costCents, 0);
      const actualTotalCost = tracker.getTotalCost();
      expect(actualTotalCost).toBeCloseTo(expectedTotalCost, 5);
    },
  );

  // Feature: ordo-digital-civilization, Property 51: Cost Tracking
  test.prop([arbitraryAgentId, fc.array(arbitraryInferenceCostRecord, { minLength: 1, maxLength: 50 })])(
    "should enable cost optimization and budget management per agent",
    (targetAgentId, records) => {
      const tracker = new CostTracker();

      // Add target agent ID to some records
      const modifiedRecords = records.map((r, i) =>
        i % 3 === 0 ? { ...r, agentId: targetAgentId } : r,
      );

      for (const record of modifiedRecords) {
        tracker.trackInference(record);
      }

      // Get analytics for target agent
      const analytics = tracker.getAnalytics(targetAgentId);

      // Verify analytics enable budget management
      expect(analytics.totalCost).toBeGreaterThanOrEqual(0);
      expect(analytics.totalInferences).toBeGreaterThanOrEqual(0);
      expect(analytics.averageCostPerInference).toBeGreaterThanOrEqual(0);

      // Verify cost breakdown by model enables optimization
      expect(analytics.costByModel).toBeInstanceOf(Map);
      expect(analytics.costByModel.size).toBeGreaterThanOrEqual(0);

      // Verify we can identify most cost-effective model
      if (modifiedRecords.filter((r) => r.agentId === targetAgentId).length > 0) {
        const mostEffective = tracker.getMostCostEffectiveModel();
        expect(mostEffective === null || typeof mostEffective === "string").toBe(true);
      }
    },
  );

  // Feature: ordo-digital-civilization, Property 51: Cost Tracking
  test.prop([arbitraryTokenUsage, arbitraryModel])(
    "should calculate cost correctly for any token usage and model",
    (usage, model) => {
      const tracker = new CostTracker();

      // Ensure totalTokens is consistent
      const consistentUsage: TokenUsage = {
        ...usage,
        totalTokens: usage.promptTokens + usage.completionTokens,
      };

      const cost = tracker.calculateCost(consistentUsage, model);

      // Cost should be non-negative
      expect(cost).toBeGreaterThanOrEqual(0);

      // Cost should be finite
      expect(Number.isFinite(cost)).toBe(true);

      // Cost should be proportional to token usage
      if (consistentUsage.totalTokens === 0) {
        expect(cost).toBe(0);
      } else {
        expect(cost).toBeGreaterThan(0);
      }
    },
  );

  // Feature: ordo-digital-civilization, Property 51: Cost Tracking
  test.prop([fc.array(arbitraryInferenceCostRecord, { minLength: 2, maxLength: 50 })])(
    "should maintain cost tracking accuracy across multiple agents",
    (records) => {
      const tracker = new CostTracker();

      for (const record of records) {
        tracker.trackInference(record);
      }

      // Sum of per-agent costs should equal total cost
      const uniqueAgents = [...new Set(records.map((r) => r.agentId))];
      const sumOfAgentCosts = uniqueAgents.reduce(
        (sum, agentId) => sum + tracker.getTotalCost(agentId),
        0,
      );
      const totalCost = tracker.getTotalCost();

      expect(sumOfAgentCosts).toBeCloseTo(totalCost, 5);
    },
  );
});

// ─── Property 54: Token Usage Tracking ───────────────────────────

describe("Property 54: Token Usage Tracking", () => {
  // Feature: ordo-digital-civilization, Property 54: Token Usage Tracking
  test.prop([fc.array(arbitraryInferenceCostRecord, { minLength: 1, maxLength: 100 })])(
    "should track token usage (input, output, total) across all models",
    (records) => {
      const tracker = new CostTracker();

      for (const record of records) {
        tracker.trackInference(record);
      }

      // Verify token tracking per agent
      const uniqueAgents = [...new Set(records.map((r) => r.agentId))];
      for (const agentId of uniqueAgents) {
        const agentRecords = records.filter((r) => r.agentId === agentId);
        const expectedPromptTokens = agentRecords.reduce((sum, r) => sum + r.promptTokens, 0);
        const expectedCompletionTokens = agentRecords.reduce(
          (sum, r) => sum + r.completionTokens,
          0,
        );
        const expectedTotalTokens = agentRecords.reduce((sum, r) => sum + r.totalTokens, 0);

        const actualTokens = tracker.getTotalTokens(agentId);

        expect(actualTokens.promptTokens).toBe(expectedPromptTokens);
        expect(actualTokens.completionTokens).toBe(expectedCompletionTokens);
        expect(actualTokens.totalTokens).toBe(expectedTotalTokens);
      }
    },
  );

  // Feature: ordo-digital-civilization, Property 54: Token Usage Tracking
  test.prop([arbitraryAgentId, fc.array(arbitraryInferenceCostRecord, { minLength: 1, maxLength: 50 })])(
    "should provide per-agent analytics for token usage",
    (targetAgentId, records) => {
      const tracker = new CostTracker();

      // Add target agent ID to some records
      const modifiedRecords = records.map((r, i) =>
        i % 2 === 0 ? { ...r, agentId: targetAgentId } : r,
      );

      for (const record of modifiedRecords) {
        tracker.trackInference(record);
      }

      const analytics = tracker.getAnalytics(targetAgentId);

      // Verify analytics provide token usage information
      expect(analytics.totalTokens).toBeGreaterThanOrEqual(0);
      expect(analytics.averageTokensPerInference).toBeGreaterThanOrEqual(0);

      // Verify tokens by model breakdown
      expect(analytics.tokensByModel).toBeInstanceOf(Map);
      expect(analytics.tokensByModel.size).toBeGreaterThanOrEqual(0);

      // Verify token counts are consistent
      const targetRecords = modifiedRecords.filter((r) => r.agentId === targetAgentId);
      if (targetRecords.length > 0) {
        const expectedTotalTokens = targetRecords.reduce((sum, r) => sum + r.totalTokens, 0);
        expect(analytics.totalTokens).toBe(expectedTotalTokens);

        const expectedAvgTokens = expectedTotalTokens / targetRecords.length;
        expect(analytics.averageTokensPerInference).toBeCloseTo(expectedAvgTokens, 5);
      }
    },
  );

  // Feature: ordo-digital-civilization, Property 54: Token Usage Tracking
  test.prop([fc.array(arbitraryInferenceCostRecord, { minLength: 1, maxLength: 50 })])(
    "should track token usage by model for optimization",
    (records) => {
      const tracker = new CostTracker();

      for (const record of records) {
        tracker.trackInference(record);
      }

      const analytics = tracker.getAnalytics();

      // Verify tokens by model tracking
      const uniqueModels = [...new Set(records.map((r) => r.model))];
      for (const model of uniqueModels) {
        const modelRecords = records.filter((r) => r.model === model);
        const expectedTokens = modelRecords.reduce((sum, r) => sum + r.totalTokens, 0);
        const actualTokens = analytics.tokensByModel.get(model) || 0;

        expect(actualTokens).toBe(expectedTokens);
      }
    },
  );

  // Feature: ordo-digital-civilization, Property 54: Token Usage Tracking
  test.prop([fc.array(arbitraryInferenceCostRecord, { minLength: 1, maxLength: 50 })])(
    "should maintain token conservation (prompt + completion = total)",
    (records) => {
      const tracker = new CostTracker();

      for (const record of records) {
        // Ensure token conservation in records
        const consistentRecord = {
          ...record,
          totalTokens: record.promptTokens + record.completionTokens,
        };
        tracker.trackInference(consistentRecord);
      }

      // Verify token conservation for each agent
      const uniqueAgents = [...new Set(records.map((r) => r.agentId))];
      for (const agentId of uniqueAgents) {
        const tokens = tracker.getTotalTokens(agentId);

        // Total tokens should equal prompt + completion
        expect(tokens.totalTokens).toBe(tokens.promptTokens + tokens.completionTokens);
      }
    },
  );

  // Feature: ordo-digital-civilization, Property 54: Token Usage Tracking
  test.prop([fc.array(arbitraryInferenceCostRecord, { minLength: 2, maxLength: 50 })])(
    "should aggregate token usage correctly across multiple inferences",
    (records) => {
      const tracker = new CostTracker();

      for (const record of records) {
        tracker.trackInference(record);
      }

      const analytics = tracker.getAnalytics();

      // Verify total tokens equals sum of all records
      const expectedTotalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
      expect(analytics.totalTokens).toBe(expectedTotalTokens);

      // Verify average tokens per inference
      const expectedAvgTokens = expectedTotalTokens / records.length;
      expect(analytics.averageTokensPerInference).toBeCloseTo(expectedAvgTokens, 5);

      // Verify inference count
      expect(analytics.totalInferences).toBe(records.length);
    },
  );
});

// ─── Integration Properties ──────────────────────────────────────

describe("Cost and Token Tracking Integration", () => {
  // Feature: ordo-digital-civilization, Property 51 & 54: Integration
  test.prop([fc.array(arbitraryInferenceCostRecord, { minLength: 1, maxLength: 50 })])(
    "should maintain consistency between cost and token tracking",
    (records) => {
      const tracker = new CostTracker();

      for (const record of records) {
        tracker.trackInference(record);
      }

      const analytics = tracker.getAnalytics();

      // Verify cost and token metrics are consistent
      expect(analytics.totalCost).toBeGreaterThanOrEqual(0);
      expect(analytics.totalTokens).toBeGreaterThanOrEqual(0);
      expect(analytics.totalInferences).toBe(records.length);

      // If there are tokens, there should be cost (unless all free)
      if (analytics.totalTokens > 0) {
        expect(analytics.totalCost).toBeGreaterThanOrEqual(0);
      }

      // Average metrics should be consistent
      if (records.length > 0) {
        expect(analytics.averageCostPerInference).toBeCloseTo(
          analytics.totalCost / records.length,
          5,
        );
        expect(analytics.averageTokensPerInference).toBeCloseTo(
          analytics.totalTokens / records.length,
          5,
        );
      }
    },
  );

  // Feature: ordo-digital-civilization, Property 51 & 54: Integration
  test.prop([arbitraryAgentId, fc.array(arbitraryInferenceCostRecord, { minLength: 1, maxLength: 30 })])(
    "should enable cost-per-token analysis for optimization",
    (targetAgentId, records) => {
      const tracker = new CostTracker();

      const modifiedRecords = records.map((r) => ({ ...r, agentId: targetAgentId }));

      for (const record of modifiedRecords) {
        tracker.trackInference(record);
      }

      const analytics = tracker.getAnalytics(targetAgentId);

      // Calculate cost per token
      if (analytics.totalTokens > 0) {
        const costPerToken = analytics.totalCost / analytics.totalTokens;

        expect(costPerToken).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(costPerToken)).toBe(true);

        // Verify we can identify most cost-effective model
        const mostEffective = tracker.getMostCostEffectiveModel();
        if (mostEffective) {
          expect(typeof mostEffective).toBe("string");
        }
      }
    },
  );
});
