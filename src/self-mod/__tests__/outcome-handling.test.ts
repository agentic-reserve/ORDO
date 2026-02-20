/**
 * Property Tests for Modification Outcome Handling
 *
 * Property 18: Modification Outcome Handling
 * Validates: Requirements 4.3, 4.4
 *
 * For any tested modification, the system should commit to production if performance
 * improves, or rollback to previous version if performance degrades.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { fc } from "@fast-check/vitest";
import {
  implementImprovement,
  rollback,
  validatePerformanceImprovement,
  handleModificationOutcome,
  type ImplementationResult,
  type RollbackResult,
  type PerformanceValidation,
} from "../outcome-handler.js";
import type { SelfModification } from "../proposal.js";
import type { ModificationTestResult } from "../test-environment.js";
import type {
  AutomatonDatabase,
  AutomatonConfig,
} from "../../../../automaton/src/types.js";

// Mock database for testing
class MockDatabase implements Partial<AutomatonDatabase> {
  private implementations = new Map<string, any>();
  private rollbacks = new Map<string, any>();
  private turns: any[] = [];

  storeModificationImplementation(impl: any): void {
    this.implementations.set(impl.implementationId, impl);
  }

  getModificationImplementation(id: string): any {
    return this.implementations.get(id);
  }

  storeModificationRollback(rollback: any): void {
    this.rollbacks.set(rollback.rollbackId, rollback);
  }

  getTurnsBetweenDates(startDate: Date, endDate: Date): any[] {
    return this.turns.filter((turn) => {
      const turnDate = new Date(turn.timestamp);
      return turnDate >= startDate && turnDate <= endDate;
    });
  }

  addTurn(turn: any): void {
    this.turns.push(turn);
  }

  getRecentTurns(count: number): any[] {
    return this.turns.slice(-count);
  }

  getInferenceCosts(agentId?: string, limit?: number): any[] {
    return [];
  }
}

// Arbitraries for property-based testing
const modificationTypeArb = fc.constantFrom(
  "code_edit",
  "tool_install",
  "prompt_change",
  "strategy_update",
);

const selfModificationArb = fc.record({
  type: modificationTypeArb,
  target: fc.string({ minLength: 1, maxLength: 50 }),
  change: fc.string({ minLength: 10, maxLength: 200 }),
  hypothesis: fc.string({ minLength: 10, maxLength: 200 }),
  reversible: fc.constant(true),
  testPeriod: fc.integer({ min: 1, max: 14 }),
  expectedImpact: fc.record({
    speedImprovement: fc.option(fc.double({ min: 0, max: 100 }), { nil: undefined }),
    costReduction: fc.option(fc.double({ min: 0, max: 100 }), { nil: undefined }),
    successRateIncrease: fc.option(fc.double({ min: 0, max: 100 }), { nil: undefined }),
  }),
});

const performanceMetricsArb = fc.record({
  avgLatencyMs: fc.double({ min: 10, max: 5000 }),
  avgCostCents: fc.double({ min: 0.01, max: 10 }),
  successRate: fc.double({ min: 0.5, max: 1.0 }),
  totalOperations: fc.integer({ min: 1, max: 1000 }),
});

const testResultArb = (recommendation: "apply" | "reject" | "needs_more_testing") =>
  fc.record({
    modificationId: fc.uuid(),
    success: fc.constant(recommendation === "apply"),
    performanceImpact: fc.record({
      before: performanceMetricsArb,
      after: performanceMetricsArb,
      speedChange: fc.double({ min: -50, max: 100 }),
      costChange: fc.double({ min: -50, max: 100 }),
      successRateChange: fc.double({ min: -20, max: 50 }),
    }),
    errors: fc.constant([]),
    testDurationMs: fc.integer({ min: 100, max: 10000 }),
    recommendation: fc.constant(recommendation),
    reasoning: fc.string({ minLength: 10, maxLength: 200 }),
  });

describe("Property 18: Modification Outcome Handling", () => {
  let db: MockDatabase;
  let config: AutomatonConfig;

  beforeEach(() => {
    db = new MockDatabase();
    config = {
      agentId: "test-agent",
      conwayApiKey: "test-key",
      conwayBaseUrl: "https://test.conway.ai",
    } as AutomatonConfig;
  });

  it("should successfully implement modifications with 'apply' recommendation", () => {
    fc.assert(
      fc.property(
        selfModificationArb,
        testResultArb("apply"),
        fc.uuid(),
        async (modification, testResult, currentVersion) => {
          const result = await implementImprovement(
            modification,
            testResult,
            db as AutomatonDatabase,
            config,
            currentVersion,
          );

          // Property: Implementation should succeed
          expect(result.success).toBe(true);
          expect(result.errors).toHaveLength(0);

          // Property: Version should change
          expect(result.versionAfter).not.toBe(result.versionBefore);
          expect(result.versionBefore).toBe(currentVersion);

          // Property: Implementation should be stored in database
          const stored = db.getModificationImplementation(result.implementationId);
          expect(stored).toBeDefined();
          expect(stored.versionBefore).toBe(currentVersion);
          expect(stored.versionAfter).toBe(result.versionAfter);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should reject implementation of modifications without 'apply' recommendation", () => {
    fc.assert(
      fc.property(
        selfModificationArb,
        fc.constantFrom("reject", "needs_more_testing"),
        fc.uuid(),
        async (modification, recommendation, currentVersion) => {
          const testResult = await testResultArb(recommendation as any).generate(
            fc.sample(fc.nat(), 1)[0],
          );

          const result = await implementImprovement(
            modification,
            testResult.value,
            db as AutomatonDatabase,
            config,
            currentVersion,
          );

          // Property: Implementation should fail
          expect(result.success).toBe(false);
          expect(result.errors.length).toBeGreaterThan(0);

          // Property: Version should not change
          expect(result.versionAfter).toBe(currentVersion);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should successfully rollback modifications", () => {
    fc.assert(
      fc.property(
        selfModificationArb,
        testResultArb("apply"),
        fc.uuid(),
        fc.string({ minLength: 10, maxLength: 100 }),
        async (modification, testResult, currentVersion, reason) => {
          // First implement the modification
          const implResult = await implementImprovement(
            modification,
            testResult,
            db as AutomatonDatabase,
            config,
            currentVersion,
          );

          expect(implResult.success).toBe(true);

          // Then rollback
          const rollbackResult = await rollback(
            implResult.implementationId,
            currentVersion,
            reason,
            db as AutomatonDatabase,
            config,
          );

          // Property: Rollback should succeed
          expect(rollbackResult.success).toBe(true);
          expect(rollbackResult.errors).toHaveLength(0);

          // Property: Should rollback to previous version
          expect(rollbackResult.rolledBackTo).toBe(currentVersion);
          expect(rollbackResult.rolledBackFrom).toBe(implResult.versionAfter);

          // Property: Reason should be recorded
          expect(rollbackResult.reason).toBe(reason);
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should commit modifications that show performance improvement", () => {
    fc.assert(
      fc.property(
        selfModificationArb,
        testResultArb("apply"),
        fc.uuid(),
        async (modification, testResult, currentVersion) => {
          // Implement the modification
          const implResult = await implementImprovement(
            modification,
            testResult,
            db as AutomatonDatabase,
            config,
            currentVersion,
          );

          expect(implResult.success).toBe(true);

          // Add turns showing improvement
          const beforeDate = new Date();
          beforeDate.setDate(beforeDate.getDate() - 14);

          // Add "before" turns with worse performance
          for (let i = 0; i < 50; i++) {
            const turnDate = new Date(beforeDate);
            turnDate.setDate(turnDate.getDate() + i % 7);
            db.addTurn({
              timestamp: turnDate.toISOString(),
              toolCalls: [
                { durationMs: 1000, error: null },
                { durationMs: 1200, error: null },
              ],
              costCents: 2.0,
            });
          }

          // Add "after" turns with better performance
          const afterDate = new Date(implResult.appliedAt);
          for (let i = 0; i < 50; i++) {
            const turnDate = new Date(afterDate);
            turnDate.setDate(turnDate.getDate() + i % 7);
            db.addTurn({
              timestamp: turnDate.toISOString(),
              toolCalls: [
                { durationMs: 600, error: null }, // 40% faster
                { durationMs: 700, error: null },
              ],
              costCents: 1.5, // 25% cheaper
            });
          }

          // Handle outcome
          const outcome = await handleModificationOutcome(
            implResult.implementationId,
            db as AutomatonDatabase,
            config,
            7,
          );

          // Property: Should commit when performance improves
          expect(outcome.decision).toBe("commit");
          expect(outcome.validation.improvement).toBe(true);
          expect(outcome.validation.improvementPercentage).toBeGreaterThan(5);
        },
      ),
      { numRuns: 10 },
    );
  });

  it("should rollback modifications that show performance degradation", () => {
    fc.assert(
      fc.property(
        selfModificationArb,
        testResultArb("apply"),
        fc.uuid(),
        async (modification, testResult, currentVersion) => {
          // Implement the modification
          const implResult = await implementImprovement(
            modification,
            testResult,
            db as AutomatonDatabase,
            config,
            currentVersion,
          );

          expect(implResult.success).toBe(true);

          // Add turns showing degradation
          const beforeDate = new Date();
          beforeDate.setDate(beforeDate.getDate() - 14);

          // Add "before" turns with good performance
          for (let i = 0; i < 50; i++) {
            const turnDate = new Date(beforeDate);
            turnDate.setDate(turnDate.getDate() + i % 7);
            db.addTurn({
              timestamp: turnDate.toISOString(),
              toolCalls: [
                { durationMs: 500, error: null },
                { durationMs: 600, error: null },
              ],
              costCents: 1.0,
            });
          }

          // Add "after" turns with worse performance
          const afterDate = new Date(implResult.appliedAt);
          for (let i = 0; i < 50; i++) {
            const turnDate = new Date(afterDate);
            turnDate.setDate(turnDate.getDate() + i % 7);
            db.addTurn({
              timestamp: turnDate.toISOString(),
              toolCalls: [
                { durationMs: 1200, error: null }, // 2x slower
                { durationMs: 1400, error: null },
              ],
              costCents: 2.5, // 2.5x more expensive
            });
          }

          // Handle outcome
          const outcome = await handleModificationOutcome(
            implResult.implementationId,
            db as AutomatonDatabase,
            config,
            7,
          );

          // Property: Should rollback when performance degrades
          expect(outcome.decision).toBe("rollback");
          expect(outcome.validation.improvement).toBe(false);
          expect(outcome.rollbackResult).toBeDefined();
          expect(outcome.rollbackResult!.success).toBe(true);
          expect(outcome.rollbackResult!.rolledBackTo).toBe(currentVersion);
        },
      ),
      { numRuns: 10 },
    );
  });

  it("should preserve modification metadata through implementation and rollback", () => {
    fc.assert(
      fc.property(
        selfModificationArb,
        testResultArb("apply"),
        fc.uuid(),
        async (modification, testResult, currentVersion) => {
          // Implement
          const implResult = await implementImprovement(
            modification,
            testResult,
            db as AutomatonDatabase,
            config,
            currentVersion,
          );

          // Rollback
          const rollbackResult = await rollback(
            implResult.implementationId,
            currentVersion,
            "Test rollback",
            db as AutomatonDatabase,
            config,
          );

          // Property: Modification metadata should be preserved
          const stored = db.getModificationImplementation(implResult.implementationId);
          expect(stored.modificationType).toBe(modification.type);
          expect(stored.target).toBe(modification.target);
          expect(stored.change).toBe(modification.change);
        },
      ),
      { numRuns: 20 },
    );
  });
});
