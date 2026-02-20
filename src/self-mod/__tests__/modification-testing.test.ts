/**
 * Property-Based Tests for Modification Testing
 *
 * Feature: ordo-digital-civilization, Property 16: Modification Testing
 * Validates: Requirements 4.1
 */

import { describe, expect } from "vitest";
import { fc, test } from "@fast-check/vitest";
import type { Agent, ModificationType } from "../../types.js";
import type { SelfModification } from "../proposal.js";
import {
  testModification,
  cloneAgentState,
  executeModificationInSandbox,
  measureBaselinePerformance,
  calculatePerformanceImpact,
  type PerformanceMetrics,
} from "../test-environment.js";

// ─── Arbitraries ─────────────────────────────────────────────────

const arbitraryModificationType = fc.constantFrom<ModificationType>(
  "code_edit",
  "tool_install",
  "prompt_change",
  "strategy_update",
);

const arbitrarySelfModification = fc.record({
  type: arbitraryModificationType,
  target: fc.string({ minLength: 1, maxLength: 50 }),
  change: fc.string({ minLength: 10, maxLength: 200 }),
  hypothesis: fc.string({ minLength: 10, maxLength: 200 }),
  reversible: fc.boolean(),
  testPeriod: fc.integer({ min: 1, max: 30 }),
  expectedImpact: fc.record({
    speedImprovement: fc.option(fc.double({ min: 0, max: 100, noNaN: true })),
    costReduction: fc.option(fc.double({ min: 0, max: 100, noNaN: true })),
    successRateIncrease: fc.option(fc.double({ min: 0, max: 100, noNaN: true })),
  }),
}) as fc.Arbitrary<SelfModification>;

const arbitraryAgent = fc.record({
  id: fc.string({ minLength: 10, maxLength: 30 }),
  publicKey: fc.string({ minLength: 32, maxLength: 44 }),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  generation: fc.integer({ min: 0, max: 100 }),
  parentId: fc.option(fc.string()),
  childrenIds: fc.array(fc.string(), { maxLength: 5 }),
  birthDate: fc.date(),
  age: fc.integer({ min: 0, max: 365 }),
  maxLifespan: fc.integer({ min: 30, max: 365 }),
  status: fc.constantFrom("alive", "dead"),
  balance: fc.double({ min: 0, max: 100, noNaN: true }),
  survivalTier: fc.constantFrom("thriving", "normal", "low_compute", "critical", "dead"),
  totalEarnings: fc.double({ min: 0, max: 1000, noNaN: true }),
  totalCosts: fc.double({ min: 0, max: 1000, noNaN: true }),
  model: fc.string(),
  tools: fc.array(fc.string(), { maxLength: 10 }),
  skills: fc.array(fc.string(), { maxLength: 10 }),
  knowledgeBase: fc.object(),
  fitness: fc.record({
    survival: fc.double({ min: 0, max: 1, noNaN: true }),
    earnings: fc.double({ min: 0, max: 1, noNaN: true }),
    offspring: fc.integer({ min: 0, max: 10 }),
    adaptation: fc.double({ min: 0, max: 1, noNaN: true }),
    innovation: fc.double({ min: 0, max: 1, noNaN: true }),
  }),
  mutations: fc.array(fc.string(), { maxLength: 5 }),
  traits: fc.object(),
  createdAt: fc.date(),
  updatedAt: fc.date(),
}) as fc.Arbitrary<Agent>;

const arbitraryPerformanceMetrics = fc.record({
  avgLatencyMs: fc.double({ min: 0, max: 10000, noNaN: true }),
  avgCostCents: fc.double({ min: 0, max: 10, noNaN: true }),
  successRate: fc.double({ min: 0, max: 1, noNaN: true }),
  totalOperations: fc.integer({ min: 0, max: 1000 }),
}) as fc.Arbitrary<PerformanceMetrics>;

const arbitraryOperation = fc.record({
  latencyMs: fc.double({ min: 0, max: 5000, noNaN: true }),
  costCents: fc.double({ min: 0, max: 5, noNaN: true }),
  success: fc.boolean(),
});

// ─── Test Helpers ────────────────────────────────────────────────

/**
 * Create a mock database for testing
 */
function createMockDatabase(): any {
  return {
    getRecentTurns: () => [],
    // Add other methods as needed
  };
}

/**
 * Create a mock config from an agent
 */
function createMockConfig(agent: Agent): any {
  return {
    agentId: agent.id,
    name: agent.name,
    model: agent.model,
    // Add other config fields as needed
  };
}

// ─── Property Tests ──────────────────────────────────────────────

describe("Property 16: Modification Testing", () => {
  describe("Isolated Test Environment", () => {
    test.prop([arbitraryAgent])(
      "creates isolated test environment for any agent",
      async (agent) => {
        const mockDb = createMockDatabase();
        const mockConfig = createMockConfig(agent);
        
        const clonedState = await cloneAgentState(mockDb, mockConfig);

        // Property: Clone should have unique ID
        expect(clonedState.cloneId).toBeDefined();
        expect(clonedState.cloneId).not.toBe(agent.id);

        // Property: Clone should reference original agent
        expect(clonedState.originalAgentId).toBe(agent.id);

        // Property: Clone should have timestamp
        expect(clonedState.createdAt).toBeDefined();
        const createdTime = new Date(clonedState.createdAt).getTime();
        expect(createdTime).toBeLessThanOrEqual(Date.now());

        // Property: Cloned config should have new agent ID
        expect(clonedState.config.agentId).toBe(clonedState.cloneId);
      },
    );

    test.prop([arbitrarySelfModification, arbitraryAgent])(
      "executes modification in sandbox without affecting original",
      async (modification, agent) => {
        const mockDb = createMockDatabase();
        const mockConfig = createMockConfig(agent);
        const clonedState = await cloneAgentState(mockDb, mockConfig);
        
        const originalAgentId = agent.id;
        const originalToolsCount = agent.tools.length;

        const result = await executeModificationInSandbox(
          modification,
          clonedState,
          {} as any, // mock conway client
          5,
        );

        // Property: Sandbox execution should complete
        expect(result).toBeDefined();
        expect(result.metrics).toBeDefined();

        // Property: Original agent should be unchanged
        expect(agent.id).toBe(originalAgentId);
        expect(agent.tools.length).toBe(originalToolsCount);

        // Property: Metrics should be valid
        expect(result.metrics.avgLatencyMs).toBeGreaterThanOrEqual(0);
        expect(result.metrics.avgCostCents).toBeGreaterThanOrEqual(0);
        expect(result.metrics.successRate).toBeGreaterThanOrEqual(0);
        expect(result.metrics.successRate).toBeLessThanOrEqual(1);
      },
    );
  });

  describe("Performance Impact Measurement", () => {
    test.prop([arbitraryPerformanceMetrics, arbitraryPerformanceMetrics])(
      "measures performance impact for any before/after metrics",
      (before, after) => {
        const impact = calculatePerformanceImpact(before, after);

        // Property: Impact should have before and after metrics
        expect(impact.before).toEqual(before);
        expect(impact.after).toEqual(after);

        // Property: Speed change should be calculated correctly
        if (before.avgLatencyMs > 0) {
          const expectedSpeedChange =
            ((before.avgLatencyMs - after.avgLatencyMs) / before.avgLatencyMs) *
            100;
          expect(impact.speedChange).toBeCloseTo(expectedSpeedChange, 2);
        }

        // Property: Cost change should be calculated correctly
        if (before.avgCostCents > 0) {
          const expectedCostChange =
            ((before.avgCostCents - after.avgCostCents) / before.avgCostCents) *
            100;
          expect(impact.costChange).toBeCloseTo(expectedCostChange, 2);
        }

        // Property: Success rate change should be in percentage points
        const expectedSuccessRateChange =
          (after.successRate - before.successRate) * 100;
        expect(impact.successRateChange).toBeCloseTo(
          expectedSuccessRateChange,
          2,
        );
      },
    );

    test.prop([arbitraryPerformanceMetrics])(
      "handles zero baseline metrics gracefully",
      (after) => {
        const before: PerformanceMetrics = {
          avgLatencyMs: 0,
          avgCostCents: 0,
          successRate: 0,
          totalOperations: 0,
        };

        const impact = calculatePerformanceImpact(before, after);

        // Property: Should not throw error
        expect(impact).toBeDefined();

        // Property: Changes should be 0 when baseline is 0
        expect(impact.speedChange).toBe(0);
        expect(impact.costChange).toBe(0);
      },
    );
  });

  describe("Complete Modification Testing", () => {
    test.prop([arbitrarySelfModification, arbitraryAgent])(
      "tests any modification and returns valid result",
      async (modification, agent) => {
        const mockDb = createMockDatabase();
        const mockConfig = createMockConfig(agent);
        
        const result = await testModification(
          modification,
          mockDb,
          mockConfig,
          {} as any, // mock conway client
          5,
        );

        // Property: Result should have modification ID
        expect(result.modificationId).toBeDefined();

        // Property: Result should have performance impact
        expect(result.performanceImpact).toBeDefined();
        expect(result.performanceImpact.before).toBeDefined();
        expect(result.performanceImpact.after).toBeDefined();

        // Property: Result should have recommendation
        expect(result.recommendation).toMatch(/^(apply|reject|needs_more_testing)$/);

        // Property: Result should have reasoning
        expect(result.reasoning).toBeDefined();
        expect(result.reasoning.length).toBeGreaterThan(0);

        // Property: Test duration should be positive
        expect(result.testDurationMs).toBeGreaterThan(0);

        // Property: Errors should be an array
        expect(Array.isArray(result.errors)).toBe(true);
      },
    );

    test.prop([arbitrarySelfModification, arbitraryAgent])(
      "recommendation is 'reject' when errors occur",
      async (modification, agent) => {
        const mockDb = createMockDatabase();
        const mockConfig = createMockConfig(agent);
        
        const result = await testModification(
          modification,
          mockDb,
          mockConfig,
          {} as any, // mock conway client
          5,
        );

        // Property: If there are errors, recommendation should be reject
        if (result.errors.length > 0) {
          expect(result.recommendation).toBe("reject");
          expect(result.reasoning).toContain("error");
        }
      },
    );
  });

  describe("Baseline Performance Measurement", () => {
    test("measures baseline from database", async () => {
      const mockDb = createMockDatabase();
      
      const baseline = await measureBaselinePerformance(mockDb);

      // Property: Baseline should have valid metrics
      expect(baseline.avgLatencyMs).toBeGreaterThanOrEqual(0);
      expect(baseline.avgCostCents).toBeGreaterThanOrEqual(0);
      expect(baseline.successRate).toBeGreaterThanOrEqual(0);
      expect(baseline.successRate).toBeLessThanOrEqual(1);
    });

    test("handles empty operation history", async () => {
      const mockDb = createMockDatabase();
      
      const baseline = await measureBaselinePerformance(mockDb);

      // Property: Empty history should return default metrics
      expect(baseline.avgLatencyMs).toBeGreaterThanOrEqual(0);
      expect(baseline.avgCostCents).toBeGreaterThanOrEqual(0);
      expect(baseline.successRate).toBeGreaterThanOrEqual(0);
      expect(baseline.successRate).toBeLessThanOrEqual(1);
    });
  });
});
