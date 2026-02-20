/**
 * Property-Based Tests for Improvement Testing and Application
 * 
 * Property 70: Improvement Testing and Application
 * Validates: Requirements 16.2, 16.4
 * 
 * Feature: ordo-digital-civilization, Property 70: Improvement Testing and Application
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  createSandboxEnvironment,
  testImprovementInSandbox,
  measureImpactOver7Days,
  applyToProduction,
  testAndApplyImprovement,
  type ImprovementProposal,
} from "./improvement-testing.js";
import type { OrdoDatabase } from "../types/index.js";
import type { ImprovementOpportunity } from "./bottleneck-analysis.js";
import { PublicKey } from "@solana/web3.js";

// Mock database factory
function createMockDatabase(
  avgLatencyBefore: number,
  avgLatencyAfter: number,
  costBefore: number,
  costAfter: number,
  successRateBefore: number,
  successRateAfter: number
): OrdoDatabase {
  // The baseline period is 14-7 days ago
  // The test period is 0-7 days ago (recent)
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  
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
    async createAgent() {
      return {
        id: "new-agent",
        publicKey: PublicKey.default,
        name: "New Agent",
        generation: 1,
        children: [],
        balance: 10,
        age: 0,
        createdAt: new Date(),
        status: "alive" as const,
        fitness: 0,
        traits: {},
      };
    },
    async deleteAgent() {},
    async listAgents() {
      return [];
    },
    async getRecentTurns() {
      return [];
    },
    async saveTurn() {},
    async getTurnsBySession() {
      return [];
    },
    async getRecentModifications() {
      return [];
    },
    async saveModification() {},
    async getModificationById() {
      return null;
    },
    async updateModification() {},
    async getInstalledTools() {
      return [];
    },
    async saveInstalledTool() {},
    async removeTool() {},
    async getToolById() {
      return null;
    },
    async getInferenceCosts() {
      return [];
    },
    async saveInferenceCost() {},
    async getTotalCost(agentId: string, start: Date, end: Date) {
      // If the end date is recent (within last 7 days), return "after" cost
      // Otherwise return "before" cost (baseline period)
      return end.getTime() > sevenDaysAgo ? costAfter : costBefore;
    },
    async getAverageLatency(agentId: string, start: Date, end: Date) {
      // If the end date is recent (within last 7 days), return "after" latency
      // Otherwise return "before" latency (baseline period)
      return end.getTime() > sevenDaysAgo ? avgLatencyAfter : avgLatencyBefore;
    },
    async getSuccessRate(agentId: string, start: Date, end: Date) {
      // If the end date is recent (within last 7 days), return "after" success rate
      // Otherwise return "before" success rate (baseline period)
      return end.getTime() > sevenDaysAgo ? successRateAfter : successRateBefore;
    },
    async getToolCallStats() {
      return [];
    },
  
  } as any;
}

// Arbitraries for property-based testing

const arbitraryImprovementType = fc.constantFrom(
  "model_switch",
  "tool_optimization",
  "prompt_refinement",
  "config_change"
);

const arbitraryTargetMetric = fc.constantFrom("speed", "cost", "reliability");

const arbitraryImprovementProposal = fc.record({
  id: fc.string({ minLength: 5, maxLength: 20 }),
  agentId: fc.string({ minLength: 5, maxLength: 20 }),
  opportunityId: fc.string({ minLength: 5, maxLength: 20 }),
  type: arbitraryImprovementType,
  description: fc.string({ minLength: 10, maxLength: 100 }),
  hypothesis: fc.string({ minLength: 10, maxLength: 100 }),
  targetMetric: arbitraryTargetMetric,
  expectedImprovement: fc.double({ min: 5, max: 80 }),
  createdAt: fc.date(),
  status: fc.constantFrom("proposed", "testing", "measuring", "validated", "rejected", "applied"),
}) as fc.Arbitrary<ImprovementProposal>;

const arbitraryOpportunity = fc.record({
  id: fc.string({ minLength: 5, maxLength: 20 }),
  category: arbitraryTargetMetric,
  description: fc.string({ minLength: 10, maxLength: 100 }),
  currentMetric: fc.double({ min: 0.1, max: 10 }),
  targetMetric: fc.double({ min: 0.05, max: 5 }),
  expectedImpact: fc.double({ min: 5, max: 80 }),
  priority: fc.constantFrom("low", "medium", "high"),
  estimatedEffort: fc.constantFrom("low", "medium", "high"),
  affectedOperations: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
}) as fc.Arbitrary<ImprovementOpportunity>;

// Property Tests

describe("Property 70: Improvement Testing and Application", () => {
  it("should test improvements in sandbox before production", () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryImprovementProposal,
        fc.double({ min: 50, max: 200 }),
        fc.double({ min: 0.1, max: 2 }),
        fc.double({ min: 0.7, max: 1.0 }),
        async (improvement, avgLatency, avgCost, successRate) => {
          const mockDb = createMockDatabase(
            avgLatency,
            avgLatency,
            avgCost,
            avgCost,
            successRate,
            successRate
          );

          // Create sandbox environment
          const sandbox = await createSandboxEnvironment(
            mockDb,
            improvement.agentId,
            improvement
          );

          // Test in sandbox
          const sandboxResult = await testImprovementInSandbox(
            mockDb,
            improvement,
            sandbox,
            10
          );

          // Property: Sandbox testing must complete and return metrics
          expect(sandboxResult).toBeDefined();
          expect(sandboxResult.success).toBeDefined();
          expect(sandboxResult.errors).toBeInstanceOf(Array);
          expect(sandboxResult.initialMetrics).toBeDefined();
          expect(sandboxResult.initialMetrics.avgLatencyMs).toBeGreaterThanOrEqual(0);
          expect(sandboxResult.initialMetrics.avgCostCents).toBeGreaterThanOrEqual(0);
          expect(sandboxResult.initialMetrics.successRate).toBeGreaterThanOrEqual(0);
          expect(sandboxResult.initialMetrics.successRate).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should measure impact over 7 days before applying to production", () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryImprovementProposal,
        fc.double({ min: 100, max: 300 }),
        fc.double({ min: 50, max: 250 }),
        fc.double({ min: 0.2, max: 1.0 }),
        fc.double({ min: 0.1, max: 0.8 }),
        fc.double({ min: 0.85, max: 0.98 }),
        fc.double({ min: 0.85, max: 0.98 }),
        async (
          improvement,
          latencyBefore,
          latencyAfter,
          costBefore,
          costAfter,
          successBefore,
          successAfter
        ) => {
          const mockDb = createMockDatabase(
            latencyBefore,
            latencyAfter,
            costBefore,
            costAfter,
            successBefore,
            successAfter
          );

          const sandbox = await createSandboxEnvironment(
            mockDb,
            improvement.agentId,
            improvement
          );

          // Measure impact over 7 days
          const impactResult = await measureImpactOver7Days(
            mockDb,
            improvement.agentId,
            improvement,
            sandbox
          );

          // Property: Impact measurement must span 7 days
          expect(impactResult.measurementPeriodDays).toBe(7);
          expect(impactResult.dailyMeasurements).toHaveLength(7);

          // Property: Must have baseline and test period metrics
          expect(impactResult.baseline).toBeDefined();
          expect(impactResult.testPeriod).toBeDefined();

          // Property: Must calculate improvements
          expect(impactResult.improvements).toBeDefined();
          expect(impactResult.improvements.speedImprovement).toBeDefined();
          expect(impactResult.improvements.costReduction).toBeDefined();
          expect(impactResult.improvements.reliabilityImprovement).toBeDefined();

          // Property: Must have validation result
          expect(impactResult.validated).toBeDefined();
          expect(impactResult.validationReason).toBeDefined();
          expect(typeof impactResult.validationReason).toBe("string");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should only apply to production if validated", () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryImprovementProposal,
        fc.double({ min: 100, max: 300 }),
        fc.double({ min: 50, max: 250 }),
        fc.double({ min: 0.2, max: 1.0 }),
        fc.double({ min: 0.1, max: 0.8 }),
        fc.double({ min: 0.85, max: 0.98 }),
        fc.double({ min: 0.85, max: 0.98 }),
        async (
          improvement,
          latencyBefore,
          latencyAfter,
          costBefore,
          costAfter,
          successBefore,
          successAfter
        ) => {
          const mockDb = createMockDatabase(
            latencyBefore,
            latencyAfter,
            costBefore,
            costAfter,
            successBefore,
            successAfter
          );

          const sandbox = await createSandboxEnvironment(
            mockDb,
            improvement.agentId,
            improvement
          );

          const impactResult = await measureImpactOver7Days(
            mockDb,
            improvement.agentId,
            improvement,
            sandbox
          );

          // Property: If validated, should be able to apply to production
          if (impactResult.validated) {
            const productionResult = await applyToProduction(
              mockDb,
              improvement.agentId,
              improvement,
              impactResult
            );

            expect(productionResult.success).toBe(true);
            expect(productionResult.changes).toBeInstanceOf(Array);
            expect(productionResult.rollbackPlan).toBeDefined();
          } else {
            // Property: If not validated, should throw error when trying to apply
            await expect(
              applyToProduction(mockDb, improvement.agentId, improvement, impactResult)
            ).rejects.toThrow("Cannot apply unvalidated improvement");
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should validate improvements based on target metric thresholds", () => {
    fc.assert(
      fc.asyncProperty(
        fc.record({
          targetMetric: arbitraryTargetMetric,
          latencyBefore: fc.double({ min: 100, max: 300 }),
          latencyAfter: fc.double({ min: 50, max: 250 }),
          costBefore: fc.double({ min: 0.2, max: 1.0 }),
          costAfter: fc.double({ min: 0.1, max: 0.8 }),
          successBefore: fc.double({ min: 0.85, max: 0.98 }),
          successAfter: fc.double({ min: 0.85, max: 0.98 }),
        }),
        async (params) => {
          const improvement: ImprovementProposal = {
            id: "test-imp",
            agentId: "test-agent",
            opportunityId: "test-opp",
            type: "model_switch",
            description: "Test improvement",
            hypothesis: "Should improve performance",
            targetMetric: params.targetMetric,
            expectedImprovement: 20,
            createdAt: new Date(),
            status: "proposed",
          };

          const mockDb = createMockDatabase(
            params.latencyBefore,
            params.latencyAfter,
            params.costBefore,
            params.costAfter,
            params.successBefore,
            params.successAfter
          );

          const sandbox = await createSandboxEnvironment(
            mockDb,
            improvement.agentId,
            improvement
          );

          const impactResult = await measureImpactOver7Days(
            mockDb,
            improvement.agentId,
            improvement,
            sandbox
          );

          // Property: Improvements should be calculated correctly
          expect(impactResult.improvements.speedImprovement).toBeDefined();
          expect(impactResult.improvements.costReduction).toBeDefined();
          expect(impactResult.improvements.reliabilityImprovement).toBeDefined();

          // Property: Should reject if reliability degrades significantly (>= 5 percentage points)
          // Note: The implementation checks if reliabilityImprovement < -5
          // which means degradation of more than 5 percentage points
          const reliabilityChange = (params.successAfter - params.successBefore) * 100;
          if (reliabilityChange < -5) {
            // Reliability degraded by more than 5 percentage points
            expect(impactResult.validated).toBe(false);
            expect(impactResult.validationReason).toContain("Reliability degraded");
          }

          // Property: If validated, the target metric should show improvement
          // AND reliability should not have degraded significantly
          if (impactResult.validated) {
            // Reliability must not have degraded by more than 5 percentage points
            expect(impactResult.improvements.reliabilityImprovement).toBeGreaterThanOrEqual(-5);
            
            switch (params.targetMetric) {
              case "speed":
                // If validated for speed, speed improvement should be >= 10%
                expect(impactResult.improvements.speedImprovement).toBeGreaterThanOrEqual(10);
                break;
              case "cost":
                // If validated for cost, cost reduction should be >= 10%
                expect(impactResult.improvements.costReduction).toBeGreaterThanOrEqual(10);
                break;
              case "reliability":
                // If validated for reliability, reliability improvement should be >= 5pp
                expect(impactResult.improvements.reliabilityImprovement).toBeGreaterThanOrEqual(5);
                break;
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should create rollback plan when applying to production", () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryImprovementProposal,
        async (improvement) => {
          // Create scenario with significant cost reduction (validated)
          const mockDb = createMockDatabase(
            150, // latency before
            140, // latency after
            0.5, // cost before
            0.25, // cost after (50% reduction)
            0.92, // success before
            0.93, // success after
          );

          const sandbox = await createSandboxEnvironment(
            mockDb,
            improvement.agentId,
            improvement
          );

          const impactResult = await measureImpactOver7Days(
            mockDb,
            improvement.agentId,
            improvement,
            sandbox
          );

          // Only test if validated
          if (impactResult.validated) {
            const productionResult = await applyToProduction(
              mockDb,
              improvement.agentId,
              improvement,
              impactResult
            );

            // Property: Must have rollback plan
            expect(productionResult.rollbackPlan).toBeDefined();
            expect(productionResult.rollbackPlan.steps).toBeInstanceOf(Array);
            expect(productionResult.rollbackPlan.steps.length).toBeGreaterThan(0);
            expect(productionResult.rollbackPlan.estimatedDurationMs).toBeGreaterThan(0);

            // Property: Each change should have a corresponding rollback step
            expect(productionResult.rollbackPlan.steps.length).toBeGreaterThanOrEqual(
              productionResult.changes.length
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should complete full improvement lifecycle from opportunity to production", () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryOpportunity,
        fc.double({ min: 100, max: 300 }),
        fc.double({ min: 50, max: 250 }),
        fc.double({ min: 0.2, max: 1.0 }),
        fc.double({ min: 0.1, max: 0.8 }),
        fc.double({ min: 0.85, max: 0.98 }),
        fc.double({ min: 0.85, max: 0.98 }),
        async (
          opportunity,
          latencyBefore,
          latencyAfter,
          costBefore,
          costAfter,
          successBefore,
          successAfter
        ) => {
          const mockDb = createMockDatabase(
            latencyBefore,
            latencyAfter,
            costBefore,
            costAfter,
            successBefore,
            successAfter
          );

          // Run full lifecycle
          const result = await testAndApplyImprovement(
            mockDb,
            "test-agent",
            opportunity
          );

          // Property: Must return all lifecycle components
          expect(result.proposal).toBeDefined();
          expect(result.sandboxResult).toBeDefined();
          expect(result.impactResult).toBeDefined();

          // Property: Proposal status must reflect outcome
          if (result.impactResult.validated) {
            expect(result.proposal.status).toBe("applied");
            expect(result.productionResult).toBeDefined();
          } else {
            expect(result.proposal.status).toBe("rejected");
            expect(result.productionResult).toBeUndefined();
          }

          // Property: Sandbox must complete successfully for lifecycle to continue
          if (!result.sandboxResult.success) {
            expect(result.impactResult.validated).toBe(false);
            expect(result.productionResult).toBeUndefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should preserve improvement metadata throughout lifecycle", () => {
    fc.assert(
      fc.asyncProperty(
        arbitraryOpportunity,
        async (opportunity) => {
          const mockDb = createMockDatabase(
            150, // latency before
            100, // latency after (33% improvement)
            0.5, // cost before
            0.25, // cost after (50% reduction)
            0.92, // success before
            0.93, // success after
          );

          const result = await testAndApplyImprovement(
            mockDb,
            "test-agent",
            opportunity
          );

          // Property: Opportunity ID must be preserved in proposal
          expect(result.proposal.opportunityId).toBe(opportunity.id);

          // Property: Target metric must match opportunity category
          expect(result.proposal.targetMetric).toBe(opportunity.category);

          // Property: Impact result must reference proposal
          expect(result.impactResult.improvementId).toBe(result.proposal.id);

          // Property: Production result (if exists) must reference proposal
          if (result.productionResult) {
            expect(result.productionResult.improvementId).toBe(result.proposal.id);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
