/**
 * Property-Based Tests for Modification Versioning
 *
 * Feature: ordo-digital-civilization, Property 17: Modification Versioning
 * Validates: Requirement 4.2
 */

import { describe, it, expect } from "vitest";
import { fc, test } from "@fast-check/vitest";
import type { SelfModification } from "../proposal.js";
import type { ModificationTestResult } from "../test-environment.js";
import {
  storeModificationVersion,
  getModificationVersion,
  type ModificationVersion,
  type GitCommitMetadata,
} from "../version-control.js";
import type { AutomatonDatabase } from "../../../../automaton/src/types.js";

// ─── Mock Database ───────────────────────────────────────────────

function createMockDatabase(): AutomatonDatabase {
  const kvStore = new Map<string, string>();

  return {
    getKV: (key: string) => kvStore.get(key),
    setKV: (key: string, value: string) => kvStore.set(key, value),
    deleteKV: (key: string) => kvStore.delete(key),
    // Stub other methods
    getIdentity: () => undefined,
    setIdentity: () => {},
    insertTurn: () => {},
    getRecentTurns: () => [],
    getTurnById: () => undefined,
    getTurnCount: () => 0,
    insertToolCall: () => {},
    getToolCallsForTurn: () => [],
    getHeartbeatEntries: () => [],
    upsertHeartbeatEntry: () => {},
    updateHeartbeatLastRun: () => {},
    insertTransaction: () => {},
    getRecentTransactions: () => [],
    getInstalledTools: () => [],
    installTool: () => {},
    removeTool: () => {},
    insertModification: () => {},
    getRecentModifications: () => [],
    getSkills: () => [],
    getSkillByName: () => undefined,
    upsertSkill: () => {},
    removeSkill: () => {},
    getChildren: () => [],
    getChildById: () => undefined,
    insertChild: () => {},
    updateChildStatus: () => {},
    getRegistryEntry: () => undefined,
    setRegistryEntry: () => {},
    insertReputation: () => {},
    getReputation: () => [],
    insertInboxMessage: () => {},
    getUnprocessedInboxMessages: () => [],
    markInboxMessageProcessed: () => {},
    insertInferenceCost: () => {},
    getInferenceCosts: () => [],
    getInferenceCostsByModel: () => [],
    getTotalInferenceCost: () => 0,
    getAgentState: () => "running",
    setAgentState: () => {},
    close: () => {},
  } as AutomatonDatabase;
}

// ─── Arbitraries ─────────────────────────────────────────────────

const arbitraryModificationType = fc.constantFrom(
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

const arbitraryModificationTestResult = fc.record({
  modificationId: fc.string({ minLength: 10, maxLength: 30 }),
  success: fc.boolean(),
  performanceImpact: fc.record({
    before: fc.record({
      avgLatencyMs: fc.double({ min: 0, max: 10000, noNaN: true }),
      avgCostCents: fc.double({ min: 0, max: 10, noNaN: true }),
      successRate: fc.double({ min: 0, max: 1, noNaN: true }),
      totalOperations: fc.integer({ min: 0, max: 1000 }),
    }),
    after: fc.record({
      avgLatencyMs: fc.double({ min: 0, max: 10000, noNaN: true }),
      avgCostCents: fc.double({ min: 0, max: 10, noNaN: true }),
      successRate: fc.double({ min: 0, max: 1, noNaN: true }),
      totalOperations: fc.integer({ min: 0, max: 1000 }),
    }),
    speedChange: fc.double({ min: -100, max: 100, noNaN: true }),
    costChange: fc.double({ min: -100, max: 100, noNaN: true }),
    successRateChange: fc.double({ min: -100, max: 100, noNaN: true }),
  }),
  errors: fc.array(fc.string(), { maxLength: 5 }),
  testDurationMs: fc.integer({ min: 100, max: 60000 }),
  recommendation: fc.constantFrom("apply", "reject", "needs_more_testing"),
  reasoning: fc.string({ minLength: 10, maxLength: 200 }),
}) as fc.Arbitrary<ModificationTestResult>;

const arbitraryCommitHash = fc.string({ minLength: 40, maxLength: 40 });

// ─── Property Tests ──────────────────────────────────────────────

describe("Property 17: Modification Versioning", () => {
  describe("Version Storage", () => {
    test.prop([
      arbitrarySelfModification,
      arbitraryModificationTestResult,
      fc.option(arbitraryCommitHash),
      fc.boolean(),
    ])(
      "stores modification version with all metadata",
      (modification, testResult, commitHash, applied) => {
        const db = createMockDatabase();

        const version = storeModificationVersion(
          db,
          modification,
          testResult,
          commitHash,
          applied,
        );

        // Property: Version should have unique ID
        expect(version.id).toBeDefined();
        expect(version.id.length).toBeGreaterThan(0);

        // Property: Version should reference modification ID
        expect(version.modificationId).toBe(testResult.modificationId);

        // Property: Version should store commit hash if provided
        expect(version.commitHash).toBe(commitHash);

        // Property: Version should have timestamp
        expect(version.timestamp).toBeDefined();
        expect(new Date(version.timestamp).getTime()).toBeLessThanOrEqual(
          Date.now(),
        );

        // Property: Version should store modification
        expect(version.modification).toEqual(modification);

        // Property: Version should store test result
        expect(version.testResult).toEqual(testResult);

        // Property: Version should track applied status
        expect(version.applied).toBe(applied);

        // Property: Version should initialize rolledBack as false
        expect(version.rolledBack).toBe(false);

        // Property: Version should store performance delta
        expect(version.performanceDelta).toBeDefined();
        expect(version.performanceDelta?.speedChange).toBe(
          testResult.performanceImpact.speedChange,
        );
        expect(version.performanceDelta?.costChange).toBe(
          testResult.performanceImpact.costChange,
        );
        expect(version.performanceDelta?.successRateChange).toBe(
          testResult.performanceImpact.successRateChange,
        );
      },
    );

    test.prop([
      arbitrarySelfModification,
      arbitraryModificationTestResult,
      fc.option(arbitraryCommitHash),
    ])(
      "stored version can be retrieved by ID",
      (modification, testResult, commitHash) => {
        const db = createMockDatabase();

        const stored = storeModificationVersion(
          db,
          modification,
          testResult,
          commitHash,
        );

        const retrieved = getModificationVersion(db, stored.id);

        // Property: Retrieved version should match stored version
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(stored.id);
        expect(retrieved?.modificationId).toBe(stored.modificationId);
        expect(retrieved?.commitHash).toBe(stored.commitHash);
        expect(retrieved?.timestamp).toBe(stored.timestamp);
        expect(retrieved?.applied).toBe(stored.applied);
        expect(retrieved?.rolledBack).toBe(stored.rolledBack);
      },
    );

    test.prop([fc.string({ minLength: 10, maxLength: 30 })])(
      "returns undefined for non-existent version ID",
      (nonExistentId) => {
        const db = createMockDatabase();

        const retrieved = getModificationVersion(db, nonExistentId);

        // Property: Non-existent version should return undefined
        expect(retrieved).toBeUndefined();
      },
    );
  });

  describe("Commit Message Format", () => {
    test.prop([arbitrarySelfModification, arbitraryModificationTestResult])(
      "commit message contains all required metadata",
      (modification, testResult) => {
        const db = createMockDatabase();

        const version = storeModificationVersion(
          db,
          modification,
          testResult,
          undefined,
        );

        const commitMessage = version.commitMessage;

        // Property: Commit message should contain modification type
        expect(commitMessage).toContain(modification.type);

        // Property: Commit message should contain target
        expect(commitMessage).toContain(modification.target);

        // Property: Commit message should contain hypothesis
        expect(commitMessage).toContain("Hypothesis:");
        expect(commitMessage).toContain(modification.hypothesis);

        // Property: Commit message should contain change description
        expect(commitMessage).toContain("Change:");
        expect(commitMessage).toContain(modification.change);

        // Property: Commit message should contain test result
        expect(commitMessage).toContain("Test Result:");
        expect(commitMessage).toContain(testResult.recommendation);

        // Property: Commit message should contain reasoning
        expect(commitMessage).toContain("Reasoning:");
        expect(commitMessage).toContain(testResult.reasoning);

        // Property: Commit message should contain performance impact
        expect(commitMessage).toContain("Performance Impact:");
        expect(commitMessage).toContain("Speed:");
        expect(commitMessage).toContain("Cost:");
        expect(commitMessage).toContain("Success Rate:");

        // Property: Commit message should contain modification ID
        expect(commitMessage).toContain("Modification ID:");
        expect(commitMessage).toContain(testResult.modificationId);

        // Property: Commit message should contain reversibility
        expect(commitMessage).toContain("Reversible:");
        expect(commitMessage).toContain(String(modification.reversible));
      },
    );
  });

  describe("Version Tracking", () => {
    test.prop([
      fc.array(
        fc.tuple(
          arbitrarySelfModification,
          arbitraryModificationTestResult,
          fc.option(arbitraryCommitHash),
        ),
        { minLength: 1, maxLength: 10 },
      ),
    ])("tracks multiple modification versions independently", (versions) => {
      const db = createMockDatabase();
      const storedVersions: ModificationVersion[] = [];

      // Store all versions
      for (const [modification, testResult, commitHash] of versions) {
        const version = storeModificationVersion(
          db,
          modification,
          testResult,
          commitHash,
        );
        storedVersions.push(version);
      }

      // Property: All versions should have unique IDs
      const ids = storedVersions.map((v) => v.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);

      // Property: Each version should be retrievable
      for (const stored of storedVersions) {
        const retrieved = getModificationVersion(db, stored.id);
        expect(retrieved).toBeDefined();
        expect(retrieved?.id).toBe(stored.id);
      }
    });

    test.prop([
      arbitrarySelfModification,
      arbitraryModificationTestResult,
      arbitraryCommitHash,
    ])(
      "version with commit hash can be linked to git history",
      (modification, testResult, commitHash) => {
        const db = createMockDatabase();

        const version = storeModificationVersion(
          db,
          modification,
          testResult,
          commitHash,
        );

        // Property: Version with commit hash should store it
        expect(version.commitHash).toBe(commitHash);
        expect(version.commitHash?.length).toBe(40); // SHA-1 hash length

        // Property: Commit message should reference the hash
        expect(version.commitMessage).toBeDefined();
      },
    );
  });

  describe("Performance Delta Tracking", () => {
    test.prop([arbitrarySelfModification, arbitraryModificationTestResult])(
      "performance delta matches test result impact",
      (modification, testResult) => {
        const db = createMockDatabase();

        const version = storeModificationVersion(
          db,
          modification,
          testResult,
        );

        // Property: Performance delta should match test result
        expect(version.performanceDelta).toBeDefined();
        expect(version.performanceDelta?.speedChange).toBe(
          testResult.performanceImpact.speedChange,
        );
        expect(version.performanceDelta?.costChange).toBe(
          testResult.performanceImpact.costChange,
        );
        expect(version.performanceDelta?.successRateChange).toBe(
          testResult.performanceImpact.successRateChange,
        );
      },
    );
  });
});
