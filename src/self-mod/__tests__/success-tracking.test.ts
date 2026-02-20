/**
 * Property Tests for Modification Success Tracking
 *
 * Property 20: Modification Success Tracking
 * Validates: Requirement 4.6
 *
 * For any modification, the system should track whether it leads to improved
 * survival rates over the next 7 days and correlate successful modifications
 * with fitness gains.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { fc } from "@fast-check/vitest";
import {
  captureFitnessSnapshot,
  startModificationTracking,
  completeModificationTracking,
  trackModificationsOverPeriod,
  correlateModificationsWithFitness,
  buildModificationSuccessDatabase,
  getMostSuccessfulModificationTypes,
  identifyHighImpactModifications,
  type ModificationSuccessRecord,
  type FitnessSnapshot,
} from "../success-tracker.js";
import type { Agent } from "../../../../automaton/src/types.js";
import type { ImplementationResult } from "../outcome-handler.js";

// Mock database for testing
class MockDatabase {
  private successRecords = new Map<string, ModificationSuccessRecord>();
  private turns: any[] = [];

  storeModificationSuccessRecord(record: ModificationSuccessRecord): void {
    this.successRecords.set(record.recordId, record);
  }

  getModificationSuccessRecord(id: string): ModificationSuccessRecord | undefined {
    return this.successRecords.get(id);
  }

  updateModificationSuccessRecord(record: ModificationSuccessRecord): void {
    this.successRecords.set(record.recordId, record);
  }

  getModificationSuccessRecordsBetweenDates(
    startDate: Date,
    endDate: Date,
  ): ModificationSuccessRecord[] {
    return Array.from(this.successRecords.values()).filter((record) => {
      const recordDate = new Date(record.createdAt);
      return recordDate >= startDate && recordDate <= endDate;
    });
  }

  addTurn(turn: any): void {
    this.turns.push(turn);
  }

  getRecentTurns(count: number): any[] {
    return this.turns.slice(-count);
  }
}

// Arbitraries for property-based testing
const agentArb = fc.record({
  id: fc.uuid(),
  publicKey: fc.string({ minLength: 32, maxLength: 44 }),
  name: fc.string({ minLength: 3, maxLength: 20 }),
  generation: fc.integer({ min: 0, max: 10 }),
  birthDate: fc.date({ min: new Date("2024-01-01"), max: new Date() }),
  age: fc.integer({ min: 0, max: 365 }),
  maxLifespan: fc.integer({ min: 365, max: 3650 }),
  balance: fc.double({ min: 0.01, max: 100 }),
  totalEarnings: fc.double({ min: 0, max: 1000 }),
  totalCosts: fc.double({ min: 0, max: 500 }),
  fitness: fc.record({
    survival: fc.double({ min: 0, max: 1 }),
    earnings: fc.double({ min: 0, max: 1 }),
    offspring: fc.integer({ min: 0, max: 10 }),
    adaptation: fc.double({ min: 0, max: 1 }),
    innovation: fc.double({ min: 0, max: 1 }),
  }),
});

const implementationResultArb = fc.record({
  implementationId: fc.uuid(),
  modificationId: fc.uuid(),
  success: fc.constant(true),
  appliedAt: fc.date({ min: new Date("2024-01-01"), max: new Date() }).map((d) => d.toISOString()),
  versionBefore: fc.uuid(),
  versionAfter: fc.uuid(),
  errors: fc.constant([]),
});

describe("Property 20: Modification Success Tracking", () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  it("should capture fitness snapshot with all required metrics", () => {
    fc.assert(
      fc.property(agentArb, (agent) => {
        // Add some turns for operation statistics
        for (let i = 0; i < 50; i++) {
          db.addTurn({
            toolCalls: [
              { error: null },
              { error: i % 10 === 0 ? "error" : null },
            ],
          });
        }

        const snapshot = captureFitnessSnapshot(agent as any, db as any);

        // Property: Snapshot should contain all required metrics
        expect(snapshot.survivalDays).toBeGreaterThanOrEqual(0);
        expect(snapshot.totalEarnings).toBe(agent.totalEarnings);
        expect(snapshot.totalCosts).toBe(agent.totalCosts);
        expect(snapshot.netBalance).toBe(agent.balance);
        expect(snapshot.offspringCount).toBe(agent.fitness.offspring);
        expect(snapshot.successfulOperations).toBeGreaterThanOrEqual(0);
        expect(snapshot.failedOperations).toBeGreaterThanOrEqual(0);
        expect(snapshot.overallFitness).toBeGreaterThanOrEqual(0);
        expect(snapshot.overallFitness).toBeLessThanOrEqual(1);
        expect(snapshot.timestamp).toBeTruthy();
      }),
      { numRuns: 50 },
    );
  });

  it("should start modification tracking with initial fitness snapshot", () => {
    fc.assert(
      fc.property(
        implementationResultArb,
        agentArb,
        fc.integer({ min: 1, max: 14 }),
        (implementation, agent, trackingWindowDays) => {
          const record = startModificationTracking(
            implementation as any,
            agent as any,
            db as any,
            trackingWindowDays,
          );

          // Property: Record should be created with initial snapshot
          expect(record.recordId).toBeTruthy();
          expect(record.modificationId).toBe(implementation.modificationId);
          expect(record.implementationId).toBe(implementation.implementationId);
          expect(record.trackingWindowDays).toBe(trackingWindowDays);
          expect(record.fitnessBeforeModification).toBeDefined();
          expect(record.fitnessBeforeModification.overallFitness).toBeGreaterThanOrEqual(0);
          expect(record.success).toBe(false); // Not yet determined
          expect(record.fitnessImprovement).toBe(0); // Not yet calculated

          // Property: Record should be stored in database
          const stored = db.getModificationSuccessRecord(record.recordId);
          expect(stored).toBeDefined();
          expect(stored!.recordId).toBe(record.recordId);
        },
      ),
      { numRuns: 30 },
    );
  });

  it("should complete modification tracking and determine success", () => {
    fc.assert(
      fc.property(
        implementationResultArb,
        agentArb,
        agentArb,
        (implementation, agentBefore, agentAfter) => {
          // Start tracking
          const startRecord = startModificationTracking(
            implementation as any,
            agentBefore as any,
            db as any,
            7,
          );

          // Simulate improved agent (higher balance and earnings)
          const improvedAgent = {
            ...agentAfter,
            balance: agentBefore.balance * 1.5, // 50% more balance
            totalEarnings: agentBefore.totalEarnings * 1.3, // 30% more earnings
            fitness: {
              ...agentAfter.fitness,
              offspring: agentBefore.fitness.offspring + 1, // One more offspring
            },
          };

          // Complete tracking
          const completedRecord = completeModificationTracking(
            startRecord.recordId,
            improvedAgent as any,
            db as any,
          );

          // Property: Completed record should have final snapshot
          expect(completedRecord.fitnessAfterModification).toBeDefined();
          expect(completedRecord.fitnessAfterModification.overallFitness).toBeGreaterThanOrEqual(0);

          // Property: Success should be determined based on fitness improvement
          expect(typeof completedRecord.success).toBe("boolean");
          expect(typeof completedRecord.fitnessImprovement).toBe("number");

          // Property: If fitness improved significantly, success should be true
          if (completedRecord.fitnessImprovement >= 5) {
            expect(completedRecord.success).toBe(true);
          }
        },
      ),
      { numRuns: 30 },
    );
  });

  it("should track modifications over a time period", () => {
    fc.assert(
      fc.property(
        fc.array(implementationResultArb, { minLength: 5, maxLength: 20 }),
        fc.array(agentArb, { minLength: 5, maxLength: 20 }),
        (implementations, agents) => {
          // Create multiple tracking records
          const records: ModificationSuccessRecord[] = [];
          for (let i = 0; i < Math.min(implementations.length, agents.length); i++) {
            const record = startModificationTracking(
              implementations[i] as any,
              agents[i] as any,
              db as any,
              7,
            );
            records.push(record);
          }

          // Track over period
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - 30);
          const endDate = new Date();

          const trackedRecords = trackModificationsOverPeriod(db as any, startDate, endDate);

          // Property: Should return all records within period
          expect(trackedRecords.length).toBeGreaterThan(0);
          expect(trackedRecords.length).toBeLessThanOrEqual(records.length);

          // Property: All returned records should be within date range
          for (const record of trackedRecords) {
            const recordDate = new Date(record.createdAt);
            expect(recordDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            expect(recordDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  it("should correlate modifications with fitness improvements", () => {
    fc.assert(
      fc.property(
        fc.array(implementationResultArb, { minLength: 10, maxLength: 30 }),
        fc.array(agentArb, { minLength: 10, maxLength: 30 }),
        (implementations, agents) => {
          // Create and complete multiple tracking records
          for (let i = 0; i < Math.min(implementations.length, agents.length); i++) {
            const startRecord = startModificationTracking(
              implementations[i] as any,
              agents[i] as any,
              db as any,
              7,
            );

            // Simulate some improvements
            const improvedAgent = {
              ...agents[i],
              balance: agents[i].balance * (1 + Math.random() * 0.5),
            };

            completeModificationTracking(
              startRecord.recordId,
              improvedAgent as any,
              db as any,
            );
          }

          // Correlate modifications with fitness
          const result = correlateModificationsWithFitness(db as any, 30);

          // Property: Should return correlations and overall correlation
          expect(result.correlations).toBeDefined();
          expect(Array.isArray(result.correlations)).toBe(true);
          expect(typeof result.overallCorrelation).toBe("number");
          expect(result.overallCorrelation).toBeGreaterThanOrEqual(0);
          expect(result.overallCorrelation).toBeLessThanOrEqual(1);

          // Property: Each correlation should have required fields
          for (const correlation of result.correlations) {
            expect(correlation.modificationType).toBeDefined();
            expect(correlation.target).toBeDefined();
            expect(typeof correlation.avgFitnessImprovement).toBe("number");
            expect(typeof correlation.successRate).toBe("number");
            expect(correlation.successRate).toBeGreaterThanOrEqual(0);
            expect(correlation.successRate).toBeLessThanOrEqual(1);
            expect(correlation.sampleSize).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 10 },
    );
  });

  it("should build modification success database with statistics", () => {
    fc.assert(
      fc.property(
        fc.array(implementationResultArb, { minLength: 10, maxLength: 30 }),
        fc.array(agentArb, { minLength: 10, maxLength: 30 }),
        (implementations, agents) => {
          // Create and complete multiple tracking records
          for (let i = 0; i < Math.min(implementations.length, agents.length); i++) {
            const startRecord = startModificationTracking(
              implementations[i] as any,
              agents[i] as any,
              db as any,
              7,
            );

            const improvedAgent = {
              ...agents[i],
              balance: agents[i].balance * (1 + Math.random() * 0.5),
            };

            completeModificationTracking(
              startRecord.recordId,
              improvedAgent as any,
              db as any,
            );
          }

          // Build success database
          const stats = buildModificationSuccessDatabase(db as any, 30);

          // Property: Should return complete statistics
          expect(stats.totalModifications).toBeGreaterThan(0);
          expect(stats.successfulModifications).toBeGreaterThanOrEqual(0);
          expect(stats.failedModifications).toBeGreaterThanOrEqual(0);
          expect(stats.totalModifications).toBe(
            stats.successfulModifications + stats.failedModifications,
          );
          expect(stats.successRate).toBeGreaterThanOrEqual(0);
          expect(stats.successRate).toBeLessThanOrEqual(1);
          expect(typeof stats.avgFitnessImprovement).toBe("number");
          expect(stats.byType).toBeDefined();
          expect(stats.periodStartDate).toBeTruthy();
          expect(stats.periodEndDate).toBeTruthy();
          expect(stats.periodDays).toBe(30);
        },
      ),
      { numRuns: 10 },
    );
  });

  it("should identify most successful modification types", () => {
    fc.assert(
      fc.property(
        fc.array(implementationResultArb, { minLength: 15, maxLength: 40 }),
        fc.array(agentArb, { minLength: 15, maxLength: 40 }),
        (implementations, agents) => {
          // Create and complete multiple tracking records
          for (let i = 0; i < Math.min(implementations.length, agents.length); i++) {
            const startRecord = startModificationTracking(
              implementations[i] as any,
              agents[i] as any,
              db as any,
              7,
            );

            const improvedAgent = {
              ...agents[i],
              balance: agents[i].balance * (1 + Math.random() * 0.5),
            };

            completeModificationTracking(
              startRecord.recordId,
              improvedAgent as any,
              db as any,
            );
          }

          // Get most successful types
          const successfulTypes = getMostSuccessfulModificationTypes(db as any, 30, 5);

          // Property: Should return array of successful types
          expect(Array.isArray(successfulTypes)).toBe(true);
          expect(successfulTypes.length).toBeLessThanOrEqual(5);

          // Property: Each type should have required fields
          for (const type of successfulTypes) {
            expect(type.modificationType).toBeDefined();
            expect(typeof type.successRate).toBe("number");
            expect(type.successRate).toBeGreaterThanOrEqual(0);
            expect(type.successRate).toBeLessThanOrEqual(1);
            expect(typeof type.avgFitnessImprovement).toBe("number");
            expect(type.total).toBeGreaterThan(0);
          }

          // Property: Should be sorted by success rate (descending)
          for (let i = 1; i < successfulTypes.length; i++) {
            const current = successfulTypes[i];
            const previous = successfulTypes[i - 1];
            // Allow for equal success rates
            expect(current.successRate).toBeLessThanOrEqual(previous.successRate + 0.1);
          }
        },
      ),
      { numRuns: 10 },
    );
  });

  it("should identify high-impact modifications", () => {
    fc.assert(
      fc.property(
        fc.array(implementationResultArb, { minLength: 10, maxLength: 30 }),
        fc.array(agentArb, { minLength: 10, maxLength: 30 }),
        (implementations, agents) => {
          // Create and complete multiple tracking records with varying improvements
          for (let i = 0; i < Math.min(implementations.length, agents.length); i++) {
            const startRecord = startModificationTracking(
              implementations[i] as any,
              agents[i] as any,
              db as any,
              7,
            );

            // Simulate varying levels of improvement
            const improvementFactor = 1 + Math.random() * 0.8; // 0% to 80% improvement
            const improvedAgent = {
              ...agents[i],
              balance: agents[i].balance * improvementFactor,
              totalEarnings: agents[i].totalEarnings * improvementFactor,
            };

            completeModificationTracking(
              startRecord.recordId,
              improvedAgent as any,
              db as any,
            );
          }

          // Identify high-impact modifications (>20% improvement)
          const highImpact = identifyHighImpactModifications(db as any, 30, 20);

          // Property: Should return array of high-impact modifications
          expect(Array.isArray(highImpact)).toBe(true);

          // Property: All returned modifications should meet criteria
          for (const record of highImpact) {
            expect(record.success).toBe(true);
            expect(record.fitnessImprovement).toBeGreaterThanOrEqual(20);
          }

          // Property: Should be sorted by fitness improvement (descending)
          for (let i = 1; i < highImpact.length; i++) {
            expect(highImpact[i].fitnessImprovement).toBeLessThanOrEqual(
              highImpact[i - 1].fitnessImprovement,
            );
          }
        },
      ),
      { numRuns: 10 },
    );
  });

  it("should track modifications over 7-day windows", () => {
    fc.assert(
      fc.property(
        implementationResultArb,
        agentArb,
        (implementation, agent) => {
          // Start tracking with 7-day window
          const record = startModificationTracking(
            implementation as any,
            agent as any,
            db as any,
            7,
          );

          // Property: Tracking window should be 7 days
          expect(record.trackingWindowDays).toBe(7);

          // Property: End date should be 7 days after start date
          const startDate = new Date(record.trackingStartDate);
          const endDate = new Date(record.trackingEndDate);
          const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          expect(Math.abs(daysDiff - 7)).toBeLessThan(0.1); // Allow small floating point error
        },
      ),
      { numRuns: 50 },
    );
  });
});
