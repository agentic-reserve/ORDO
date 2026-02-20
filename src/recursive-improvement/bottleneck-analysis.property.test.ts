/**
 * Property-Based Tests for Bottleneck Analysis
 * 
 * Property 69: Bottleneck Analysis
 * Validates: Requirements 16.1
 * 
 * Feature: ordo-digital-civilization, Property 69: Bottleneck Analysis
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  analyzeBottlenecks,
  prioritizeImprovementOpportunities,
  type PerformanceBottleneck,
  type ImprovementOpportunity,
} from "./bottleneck-analysis.js";
import type { OrdoDatabase, Agent, AgentTurn, ToolCallResult, InferenceCostRecord } from "../types/index.js";
import { PublicKey } from "@solana/web3.js";

// Mock database for testing
function createMockDatabase(turns: AgentTurn[], costs: InferenceCostRecord[]): OrdoDatabase {
  return {
    async getAgent(agentId: string) {
      return {
        id: agentId,
        publicKey: PublicKey.default,
        name: "Test Agent",
        generation: 1,
        children: [],
        balance: 10,
        age: 30,
        createdAt: new Date(),
        status: "alive" as const,
        fitness: 0.8,
        traits: {},
      };
    },
    async updateAgent() {},
    async createAgent() {},
    async deleteAgent() {},
    async listAgents() { return []; },
    async getRecentTurns() { return turns; },
    async saveTurn() {},
    async getTurnsBySession() { return []; },
    async getRecentModifications() { return []; },
    async saveModification() {},
    async getModificationById() { return null; },
    async updateModification() {},
    getInstalledTools() { return []; },
    async saveInstalledTool() {},
    async removeTool() {},
    async getToolById() { return null; },
    async getInferenceCosts() { return costs; },
    async saveInferenceCost() {},
    async getTotalCost() { return 0; },
    async getAverageLatency() { return 0; },
    async getSuccessRate() { return 1.0; },
    async getToolCallStats() { return []; },
  };
}

// Arbitraries for generating test data
const arbitraryToolCall = fc.record({
  toolName: fc.constantFrom("search", "calculate", "fetch", "process", "analyze"),
  input: fc.anything(),
  output: fc.anything(),
  success: fc.boolean(),
  error: fc.option(fc.string(), { nil: undefined }),
  latency: fc.integer({ min: 10, max: 10000 }),
  timestamp: fc.date(),
});

const arbitraryAgentTurn = fc.record({
  id: fc.uuid(),
  agentId: fc.uuid(),
  sessionId: fc.uuid(),
  role: fc.constantFrom("user", "assistant", "system") as fc.Arbitrary<"user" | "assistant" | "system">,
  content: fc.string(),
  timestamp: fc.date(),
  model: fc.option(fc.constantFrom("gpt-4", "claude-3", "gpt-3.5"), { nil: undefined }),
  tokenCount: fc.option(fc.integer({ min: 10, max: 10000 }), { nil: undefined }),
  cost: fc.option(fc.float({ min: Math.fround(0.001), max: Math.fround(10) }), { nil: undefined }),
  toolCalls: fc.option(fc.array(arbitraryToolCall, { minLength: 0, maxLength: 5 }), { nil: undefined }),
});

const arbitraryInferenceCost = fc.record({
  id: fc.uuid(),
  agentId: fc.uuid(),
  model: fc.constantFrom("gpt-4", "claude-3", "gpt-3.5"),
  promptTokens: fc.integer({ min: 10, max: 5000 }),
  completionTokens: fc.integer({ min: 10, max: 2000 }),
  totalTokens: fc.integer({ min: 20, max: 7000 }),
  cost: fc.float({ min: Math.fround(0.001), max: Math.fround(10) }),
  timestamp: fc.date(),
});

describe("Property 69: Bottleneck Analysis", () => {
  it("should always identify bottlenecks when performance issues exist", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryAgentTurn, { minLength: 10, maxLength: 100 }),
        fc.array(arbitraryInferenceCost, { minLength: 5, maxLength: 50 }),
        async (turns, costs) => {
          // Create at least one slow operation
          if (turns.length > 0 && turns[0].toolCalls && turns[0].toolCalls.length > 0) {
            turns[0].toolCalls[0].latency = 5000; // 5 seconds - definitely slow
          }
          
          const db = createMockDatabase(turns, costs);
          const result = await analyzeBottlenecks(db, "test-agent", 7);
          
          // Property: Analysis should complete successfully
          expect(result).toBeDefined();
          expect(result.agentId).toBe("test-agent");
          expect(result.analyzedAt).toBeInstanceOf(Date);
          
          // Property: Should detect the slow operation we created
          const hasSlowOperation = result.bottlenecks.some(
            b => b.type === "slow_operation" && b.currentValue >= 5000
          );
          
          // If we have tool calls, we should detect the slow one
          const hasToolCalls = turns.some(t => t.toolCalls && t.toolCalls.length > 0);
          if (hasToolCalls) {
            expect(hasSlowOperation).toBe(true);
          }
          
          // Property: Overall metrics should be calculated
          expect(result.overallMetrics).toBeDefined();
          expect(result.overallMetrics.avgLatencyMs).toBeGreaterThanOrEqual(0);
          expect(result.overallMetrics.avgCostCents).toBeGreaterThanOrEqual(0);
          expect(result.overallMetrics.successRate).toBeGreaterThanOrEqual(0);
          expect(result.overallMetrics.successRate).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should prioritize bottlenecks by impact", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryAgentTurn, { minLength: 20, maxLength: 100 }),
        fc.array(arbitraryInferenceCost, { minLength: 10, maxLength: 50 }),
        async (turns, costs) => {
          // Create multiple bottlenecks with different severities
          if (turns.length >= 3) {
            // Critical slow operation
            if (turns[0].toolCalls && turns[0].toolCalls.length > 0) {
              turns[0].toolCalls[0].latency = 10000; // 10 seconds
              turns[0].toolCalls[0].toolName = "critical-op";
            }
            
            // Medium slow operation
            if (turns[1].toolCalls && turns[1].toolCalls.length > 0) {
              turns[1].toolCalls[0].latency = 2000; // 2 seconds
              turns[1].toolCalls[0].toolName = "medium-op";
            }
            
            // Low slow operation
            if (turns[2].toolCalls && turns[2].toolCalls.length > 0) {
              turns[2].toolCalls[0].latency = 1100; // 1.1 seconds
              turns[2].toolCalls[0].toolName = "low-op";
            }
          }
          
          const db = createMockDatabase(turns, costs);
          const result = await analyzeBottlenecks(db, "test-agent", 7);
          
          // Property: Bottlenecks should be sorted by impact (highest first)
          for (let i = 0; i < result.bottlenecks.length - 1; i++) {
            expect(result.bottlenecks[i].impact).toBeGreaterThanOrEqual(
              result.bottlenecks[i + 1].impact
            );
          }
          
          // Property: Top opportunities should be prioritized
          for (let i = 0; i < result.topOpportunities.length - 1; i++) {
            const current = result.topOpportunities[i];
            const next = result.topOpportunities[i + 1];
            
            const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
            const currentPriority = priorityOrder[current.priority];
            const nextPriority = priorityOrder[next.priority];
            
            // Either same priority or higher priority comes first
            expect(currentPriority).toBeLessThanOrEqual(nextPriority);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should detect slow operations above threshold", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1000, max: 10000 }),
        fc.integer({ min: 5, max: 50 }),
        async (latency, count) => {
          // Create turns with consistent slow operations
          const turns: AgentTurn[] = [];
          for (let i = 0; i < count; i++) {
            turns.push({
              id: `turn-${i}`,
              agentId: "test-agent",
              sessionId: "session-1",
              role: "assistant",
              content: "test",
              timestamp: new Date(),
              toolCalls: [{
                toolName: "slow-tool",
                input: {},
                output: {},
                success: true,
                latency,
                timestamp: new Date(),
              }],
            });
          }
          
          const db = createMockDatabase(turns, []);
          const result = await analyzeBottlenecks(db, "test-agent", 7);
          
          // Property: Should detect slow operation
          const slowBottleneck = result.bottlenecks.find(
            b => b.type === "slow_operation" && b.operation === "slow-tool"
          );
          
          expect(slowBottleneck).toBeDefined();
          expect(slowBottleneck!.currentValue).toBeGreaterThanOrEqual(1000);
          expect(slowBottleneck!.affectedOperations).toBe(count);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should detect high cost operations", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(1), max: Math.fround(20) }),
        fc.integer({ min: 5, max: 50 }),
        async (cost, count) => {
          // Create inference costs with high cost
          const costs: InferenceCostRecord[] = [];
          for (let i = 0; i < count; i++) {
            costs.push({
              id: `cost-${i}`,
              agentId: "test-agent",
              model: "expensive-model",
              promptTokens: 1000,
              completionTokens: 500,
              totalTokens: 1500,
              cost,
              timestamp: new Date(),
            });
          }
          
          const db = createMockDatabase([], costs);
          const result = await analyzeBottlenecks(db, "test-agent", 7);
          
          // Property: Should detect high cost operation
          const costBottleneck = result.bottlenecks.find(
            b => b.type === "high_cost" && b.operation === "expensive-model"
          );
          
          expect(costBottleneck).toBeDefined();
          expect(costBottleneck!.currentValue).toBeGreaterThanOrEqual(1);
          expect(costBottleneck!.affectedOperations).toBe(count);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should detect low success rate operations", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.89) }),
        fc.integer({ min: 10, max: 50 }),
        async (successRate, count) => {
          // Create turns with low success rate
          const turns: AgentTurn[] = [];
          for (let i = 0; i < count; i++) {
            turns.push({
              id: `turn-${i}`,
              agentId: "test-agent",
              sessionId: "session-1",
              role: "assistant",
              content: "test",
              timestamp: new Date(),
              toolCalls: [{
                toolName: "unreliable-tool",
                input: {},
                output: {},
                success: Math.random() < successRate,
                error: Math.random() >= successRate ? "Random failure" : undefined,
                latency: 100,
                timestamp: new Date(),
              }],
            });
          }
          
          const db = createMockDatabase(turns, []);
          const result = await analyzeBottlenecks(db, "test-agent", 7);
          
          // Property: Should detect low success rate if below 90%
          if (successRate < 0.9) {
            const reliabilityBottleneck = result.bottlenecks.find(
              b => b.type === "low_success_rate" && b.operation === "unreliable-tool"
            );
            
            expect(reliabilityBottleneck).toBeDefined();
            expect(reliabilityBottleneck!.currentValue).toBeLessThan(90);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should provide actionable recommendations for each bottleneck", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryAgentTurn, { minLength: 10, maxLength: 50 }),
        fc.array(arbitraryInferenceCost, { minLength: 5, maxLength: 30 }),
        async (turns, costs) => {
          const db = createMockDatabase(turns, costs);
          const result = await analyzeBottlenecks(db, "test-agent", 7);
          
          // Property: Every bottleneck should have a recommendation
          for (const bottleneck of result.bottlenecks) {
            expect(bottleneck.recommendation).toBeDefined();
            expect(bottleneck.recommendation.length).toBeGreaterThan(0);
            expect(bottleneck.targetValue).toBeLessThan(bottleneck.currentValue);
          }
          
          // Property: Every opportunity should have a description
          for (const opportunity of result.topOpportunities) {
            expect(opportunity.description).toBeDefined();
            expect(opportunity.description.length).toBeGreaterThan(0);
            expect(opportunity.expectedImpact).toBeGreaterThanOrEqual(0);
            expect(opportunity.expectedImpact).toBeLessThanOrEqual(100);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should limit top opportunities to reasonable number", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryAgentTurn, { minLength: 50, maxLength: 200 }),
        fc.array(arbitraryInferenceCost, { minLength: 20, maxLength: 100 }),
        async (turns, costs) => {
          const db = createMockDatabase(turns, costs);
          const result = await analyzeBottlenecks(db, "test-agent", 7);
          
          // Property: Should not overwhelm with too many opportunities
          expect(result.topOpportunities.length).toBeLessThanOrEqual(10);
          
          // Property: If there are bottlenecks, there should be opportunities
          if (result.bottlenecks.length > 0) {
            expect(result.topOpportunities.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("prioritizeImprovementOpportunities", () => {
  it("should respect priority ordering", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            category: fc.constantFrom("speed", "cost", "reliability") as fc.Arbitrary<"speed" | "cost" | "reliability">,
            description: fc.string(),
            currentMetric: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
            targetMetric: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
            expectedImpact: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
            priority: fc.constantFrom("critical", "high", "medium", "low") as fc.Arbitrary<"critical" | "high" | "medium" | "low">,
            estimatedEffort: fc.constantFrom("low", "medium", "high") as fc.Arbitrary<"low" | "medium" | "high">,
            affectedOperations: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        fc.integer({ min: 1, max: 10 }),
        (opportunities, limit) => {
          const prioritized = prioritizeImprovementOpportunities(opportunities, limit);
          
          // Property: Should not exceed limit
          expect(prioritized.length).toBeLessThanOrEqual(limit);
          expect(prioritized.length).toBeLessThanOrEqual(opportunities.length);
          
          // Property: Should be sorted by priority then impact
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          for (let i = 0; i < prioritized.length - 1; i++) {
            const currentPriority = priorityOrder[prioritized[i].priority];
            const nextPriority = priorityOrder[prioritized[i + 1].priority];
            
            expect(currentPriority).toBeLessThanOrEqual(nextPriority);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
