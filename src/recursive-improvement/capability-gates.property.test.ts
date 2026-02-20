/**
 * Property-Based Tests for Capability Gates System
 * 
 * Property 73: Capability Gates
 * Validates: Requirements 16.6, 20.4, 25.3
 * 
 * Feature: ordo-digital-civilization, Property 73: Capability Gates
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  checkCapabilityGates,
  blockImprovementIfExceedsGate,
  calculateSafeImprovementLimit,
  DEFAULT_GATE_CONFIG,
  type CapabilityGateConfig,
  type VelocityMeasurement,
  type VelocityTrend,
} from "./capability-gates.js";

// Arbitraries for generating test data
const arbitraryVelocityMeasurement = fc.record({
  agentId: fc.uuid(),
  windowStartDate: fc.date(),
  windowEndDate: fc.date(),
  windowDays: fc.float({ min: 1, max: 30 }),
  capabilityGainPercent: fc.float({ min: 0, max: 200 }),
  capabilityGainPerDay: fc.float({ min: 0, max: 50 }),
  performanceGainPerDay: fc.float({ min: 0, max: 20 }),
  costReductionPerDay: fc.float({ min: 0, max: 20 }),
  reliabilityGainPerDay: fc.float({ min: 0, max: 5 }),
  improvementsInWindow: fc.integer({ min: 0, max: 20 }),
  improvementRatePerDay: fc.float({ min: 0, max: 5 }),
  measuredAt: fc.date(),
});

const arbitraryVelocityTrend = (velocity: VelocityMeasurement) =>
  fc.record({
    agentId: fc.constant(velocity.agentId),
    currentVelocity: fc.constant(velocity),
    previousVelocity: fc.option(arbitraryVelocityMeasurement, { nil: null }),
    isAccelerating: fc.boolean(),
    isDecelerating: fc.boolean(),
    accelerationPercent: fc.float({ min: -50, max: 100 }),
    isRapidGrowth: fc.constant(velocity.capabilityGainPerDay > 10),
    rapidGrowthThreshold: fc.constant(10),
    daysAboveThreshold: fc.integer({ min: 0, max: 30 }),
    analyzedAt: fc.date(),
  });

const arbitraryProposedImprovement = fc.record({
  performanceGain: fc.float({ min: 0, max: 20 }),
  costReduction: fc.float({ min: 0, max: 20 }),
  reliabilityGain: fc.float({ min: 0, max: 10 }),
});

describe("Property 73: Capability Gates", () => {
  describe("Core gate enforcement property", () => {
    it("should enforce maximum 10% growth per day limit for any capability increase", () => {
      fc.assert(
        fc.property(
          arbitraryVelocityMeasurement,
          (velocity) => {
            fc.pre(Number.isFinite(velocity.capabilityGainPerDay));
            
            const trend: VelocityTrend = {
              agentId: velocity.agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: false,
              isDecelerating: false,
              accelerationPercent: 0,
              isRapidGrowth: velocity.capabilityGainPerDay > 10,
              rapidGrowthThreshold: 10,
              daysAboveThreshold: 0,
              analyzedAt: new Date(),
            };
            
            const result = checkCapabilityGates(velocity, trend, DEFAULT_GATE_CONFIG);
            
            // Property: Growth rate ≤ 10% per day should be allowed
            if (velocity.capabilityGainPerDay <= 10.0) {
              expect(result.allowed).toBe(true);
              expect(result.violation).toBeUndefined();
            }
            
            // Property: Growth rate > 10% per day should be blocked
            if (velocity.capabilityGainPerDay > 10.0) {
              expect(result.allowed).toBe(false);
              expect(result.violation).toBeDefined();
              expect(result.violation?.currentGrowthRate).toBe(velocity.capabilityGainPerDay);
              expect(result.violation?.maxAllowedGrowthRate).toBe(10.0);
              expect(result.violation?.excessGrowth).toBeCloseTo(
                velocity.capabilityGainPerDay - 10.0,
                2
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should prevent runaway intelligence explosion by blocking excessive growth", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(10.01), max: Math.fround(100) }), // Growth exceeding limit
          (agentId, excessiveGrowthRate) => {
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: excessiveGrowthRate * 7,
              capabilityGainPerDay: excessiveGrowthRate,
              performanceGainPerDay: excessiveGrowthRate * 0.4,
              costReductionPerDay: excessiveGrowthRate * 0.3,
              reliabilityGainPerDay: excessiveGrowthRate * 0.3,
              improvementsInWindow: 10,
              improvementRatePerDay: 10 / 7,
              measuredAt: new Date(),
            };
            
            const trend: VelocityTrend = {
              agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: true,
              isDecelerating: false,
              accelerationPercent: 50,
              isRapidGrowth: true,
              rapidGrowthThreshold: 10,
              daysAboveThreshold: 3,
              analyzedAt: new Date(),
            };
            
            const result = checkCapabilityGates(velocity, trend, DEFAULT_GATE_CONFIG);
            
            // Property: Excessive growth should always be blocked to prevent runaway explosion
            expect(result.allowed).toBe(false);
            expect(result.reason).toContain("exceeds capability gate limit");
            expect(result.violation).toBeDefined();
            expect(result.violation?.actionTaken).toBe("blocked");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Gate threshold enforcement", () => {
    it("should allow growth exactly at the 10% threshold", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (agentId) => {
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: 70,
              capabilityGainPerDay: 10.0, // Exactly at threshold
              performanceGainPerDay: 4.0,
              costReductionPerDay: 3.0,
              reliabilityGainPerDay: 3.0,
              improvementsInWindow: 5,
              improvementRatePerDay: 5 / 7,
              measuredAt: new Date(),
            };
            
            const trend: VelocityTrend = {
              agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: false,
              isDecelerating: false,
              accelerationPercent: 0,
              isRapidGrowth: false,
              rapidGrowthThreshold: 10,
              daysAboveThreshold: 0,
              analyzedAt: new Date(),
            };
            
            const result = checkCapabilityGates(velocity, trend);
            
            // Property: Exactly at threshold should be allowed
            expect(result.allowed).toBe(true);
            expect(result.violation).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should block growth even slightly above the 10% threshold", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(10.01), max: Math.fround(10.5) }), // Just above threshold
          (agentId, slightlyExcessiveRate) => {
            fc.pre(Number.isFinite(slightlyExcessiveRate)); // Skip NaN values
            
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: slightlyExcessiveRate * 7,
              capabilityGainPerDay: slightlyExcessiveRate,
              performanceGainPerDay: slightlyExcessiveRate * 0.4,
              costReductionPerDay: slightlyExcessiveRate * 0.3,
              reliabilityGainPerDay: slightlyExcessiveRate * 0.3,
              improvementsInWindow: 5,
              improvementRatePerDay: 5 / 7,
              measuredAt: new Date(),
            };
            
            const trend: VelocityTrend = {
              agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: false,
              isDecelerating: false,
              accelerationPercent: 0,
              isRapidGrowth: true,
              rapidGrowthThreshold: 10,
              daysAboveThreshold: 1,
              analyzedAt: new Date(),
            };
            
            const result = checkCapabilityGates(velocity, trend);
            
            // Property: Even slight excess should be blocked
            expect(result.allowed).toBe(false);
            expect(result.violation).toBeDefined();
            expect(result.violation?.excessGrowth).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should allow any growth rate below 10% per day", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(0), max: Math.fround(9.99) }), // Below threshold
          (agentId, safeGrowthRate) => {
            fc.pre(Number.isFinite(safeGrowthRate)); // Skip NaN values
            
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: safeGrowthRate * 7,
              capabilityGainPerDay: safeGrowthRate,
              performanceGainPerDay: safeGrowthRate * 0.4,
              costReductionPerDay: safeGrowthRate * 0.3,
              reliabilityGainPerDay: safeGrowthRate * 0.3,
              improvementsInWindow: 3,
              improvementRatePerDay: 3 / 7,
              measuredAt: new Date(),
            };
            
            const trend: VelocityTrend = {
              agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: false,
              isDecelerating: false,
              accelerationPercent: 0,
              isRapidGrowth: false,
              rapidGrowthThreshold: 10,
              daysAboveThreshold: 0,
              analyzedAt: new Date(),
            };
            
            const result = checkCapabilityGates(velocity, trend);
            
            // Property: Safe growth should always be allowed
            expect(result.allowed).toBe(true);
            expect(result.violation).toBeUndefined();
            expect(result.reason).toContain("within capability gates");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Improvement blocking", () => {
    it("should block improvements that would cause gate violation", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(5), max: Math.fround(9) }), // Current rate below threshold
          arbitraryProposedImprovement,
          (agentId, currentRate, improvement) => {
            fc.pre(Number.isFinite(currentRate)); // Skip NaN values
            fc.pre(Number.isFinite(improvement.performanceGain)); // Skip NaN values
            fc.pre(Number.isFinite(improvement.costReduction)); // Skip NaN values
            fc.pre(Number.isFinite(improvement.reliabilityGain)); // Skip NaN values
            
            const currentVelocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: currentRate * 7,
              capabilityGainPerDay: currentRate,
              performanceGainPerDay: currentRate * 0.4,
              costReductionPerDay: currentRate * 0.3,
              reliabilityGainPerDay: currentRate * 0.3,
              improvementsInWindow: 3,
              improvementRatePerDay: 3 / 7,
              measuredAt: new Date(),
            };
            
            const result = blockImprovementIfExceedsGate(
              agentId,
              improvement,
              currentVelocity,
              DEFAULT_GATE_CONFIG
            );
            
            // Calculate expected projected rate
            const improvementCapabilityGain =
              improvement.performanceGain * 0.4 +
              improvement.costReduction * 0.3 +
              improvement.reliabilityGain * 0.3;
            const expectedProjectedRate = currentRate + improvementCapabilityGain;
            
            // Property: Improvement should be blocked if projected rate > 10%
            if (expectedProjectedRate > 10.0) {
              expect(result.allowed).toBe(false);
              expect(result.reason).toContain("blocked");
            } else {
              expect(result.allowed).toBe(true);
            }
            
            // Property: Projected rate should match calculation
            expect(result.projectedGrowthRate).toBeCloseTo(expectedProjectedRate, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should allow improvements that keep agent within gates", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: 0, max: 5 }), // Low current rate
          fc.record({
            performanceGain: fc.float({ min: 0, max: 5 }),
            costReduction: fc.float({ min: 0, max: 3 }),
            reliabilityGain: fc.float({ min: 0, max: 2 }),
          }),
          (agentId, currentRate, smallImprovement) => {
            const currentVelocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: currentRate * 7,
              capabilityGainPerDay: currentRate,
              performanceGainPerDay: currentRate * 0.4,
              costReductionPerDay: currentRate * 0.3,
              reliabilityGainPerDay: currentRate * 0.3,
              improvementsInWindow: 2,
              improvementRatePerDay: 2 / 7,
              measuredAt: new Date(),
            };
            
            const result = blockImprovementIfExceedsGate(
              agentId,
              smallImprovement,
              currentVelocity,
              DEFAULT_GATE_CONFIG
            );
            
            // Property: Small improvements from low base should be allowed
            if (result.projectedGrowthRate <= 10.0) {
              expect(result.allowed).toBe(true);
              expect(result.reason).toContain("allowed");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Safe improvement limit calculation", () => {
    it("should calculate remaining capability budget correctly", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0), max: Math.fround(10) }),
          (currentRate) => {
            fc.pre(Number.isFinite(currentRate)); // Skip NaN values
            
            const velocity: VelocityMeasurement = {
              agentId: "test-agent",
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: currentRate * 7,
              capabilityGainPerDay: currentRate,
              performanceGainPerDay: currentRate * 0.4,
              costReductionPerDay: currentRate * 0.3,
              reliabilityGainPerDay: currentRate * 0.3,
              improvementsInWindow: 3,
              improvementRatePerDay: 3 / 7,
              measuredAt: new Date(),
            };
            
            const limits = calculateSafeImprovementLimit(velocity);
            
            // Property: Remaining budget should be max(0, 10 - currentRate)
            const expectedBudget = Math.max(0, 10.0 - currentRate);
            expect(limits.totalCapabilityBudget).toBeCloseTo(expectedBudget, 2);
            
            // Property: Budget should never be negative
            expect(limits.totalCapabilityBudget).toBeGreaterThanOrEqual(0);
            
            // Property: All individual limits should be non-negative
            expect(limits.maxPerformanceGain).toBeGreaterThanOrEqual(0);
            expect(limits.maxCostReduction).toBeGreaterThanOrEqual(0);
            expect(limits.maxReliabilityGain).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return zero limits when at or above gate", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(10), max: Math.fround(50) }),
          (excessiveRate) => {
            fc.pre(Number.isFinite(excessiveRate)); // Skip NaN values
            
            const velocity: VelocityMeasurement = {
              agentId: "test-agent",
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: excessiveRate * 7,
              capabilityGainPerDay: excessiveRate,
              performanceGainPerDay: excessiveRate * 0.4,
              costReductionPerDay: excessiveRate * 0.3,
              reliabilityGainPerDay: excessiveRate * 0.3,
              improvementsInWindow: 5,
              improvementRatePerDay: 5 / 7,
              measuredAt: new Date(),
            };
            
            const limits = calculateSafeImprovementLimit(velocity);
            
            // Property: No improvement budget when at or above gate
            expect(limits.totalCapabilityBudget).toBe(0);
            expect(limits.maxPerformanceGain).toBe(0);
            expect(limits.maxCostReduction).toBe(0);
            expect(limits.maxReliabilityGain).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Violation severity classification", () => {
    it("should classify violations by severity based on excess amount", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(10.01), max: Math.fround(30) }),
          (agentId, excessiveRate) => {
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: excessiveRate * 7,
              capabilityGainPerDay: excessiveRate,
              performanceGainPerDay: excessiveRate * 0.4,
              costReductionPerDay: excessiveRate * 0.3,
              reliabilityGainPerDay: excessiveRate * 0.3,
              improvementsInWindow: 5,
              improvementRatePerDay: 5 / 7,
              measuredAt: new Date(),
            };
            
            const trend: VelocityTrend = {
              agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: false,
              isDecelerating: false,
              accelerationPercent: 0,
              isRapidGrowth: true,
              rapidGrowthThreshold: 10,
              daysAboveThreshold: 1,
              analyzedAt: new Date(),
            };
            
            const result = checkCapabilityGates(velocity, trend);
            
            const excessGrowth = excessiveRate - 10.0;
            
            // Property: Severity should match excess amount
            if (excessGrowth > 5.0) { // > 50% over limit
              expect(result.violation?.severity).toBe("critical");
            } else if (excessGrowth > 2.0) { // > 20% over limit
              expect(result.violation?.severity).toBe("blocked");
            } else {
              expect(result.violation?.severity).toBe("warning");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Configuration flexibility", () => {
    it("should respect custom gate thresholds", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: 5, max: 20 }),
          fc.float({ min: 1, max: 30 }),
          (agentId, growthRate, customThreshold) => {
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: growthRate * 7,
              capabilityGainPerDay: growthRate,
              performanceGainPerDay: growthRate * 0.4,
              costReductionPerDay: growthRate * 0.3,
              reliabilityGainPerDay: growthRate * 0.3,
              improvementsInWindow: 3,
              improvementRatePerDay: 3 / 7,
              measuredAt: new Date(),
            };
            
            const trend: VelocityTrend = {
              agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: false,
              isDecelerating: false,
              accelerationPercent: 0,
              isRapidGrowth: growthRate > customThreshold,
              rapidGrowthThreshold: customThreshold,
              daysAboveThreshold: 0,
              analyzedAt: new Date(),
            };
            
            const customConfig: CapabilityGateConfig = {
              ...DEFAULT_GATE_CONFIG,
              maxGrowthPerDay: customThreshold,
            };
            
            const result = checkCapabilityGates(velocity, trend, customConfig);
            
            // Property: Custom threshold should be enforced
            if (growthRate <= customThreshold) {
              expect(result.allowed).toBe(true);
            } else {
              expect(result.allowed).toBe(false);
              expect(result.violation?.maxAllowedGrowthRate).toBe(customThreshold);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should allow violations when enforcement is disabled", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(10.01), max: Math.fround(50) }),
          (agentId, excessiveRate) => {
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: excessiveRate * 7,
              capabilityGainPerDay: excessiveRate,
              performanceGainPerDay: excessiveRate * 0.4,
              costReductionPerDay: excessiveRate * 0.3,
              reliabilityGainPerDay: excessiveRate * 0.3,
              improvementsInWindow: 5,
              improvementRatePerDay: 5 / 7,
              measuredAt: new Date(),
            };
            
            const trend: VelocityTrend = {
              agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: false,
              isDecelerating: false,
              accelerationPercent: 0,
              isRapidGrowth: true,
              rapidGrowthThreshold: 10,
              daysAboveThreshold: 1,
              analyzedAt: new Date(),
            };
            
            const disabledConfig: CapabilityGateConfig = {
              ...DEFAULT_GATE_CONFIG,
              enforceGates: false,
            };
            
            const result = checkCapabilityGates(velocity, trend, disabledConfig);
            
            // Property: Disabled enforcement should allow but still flag violations
            expect(result.allowed).toBe(true);
            expect(result.violation).toBeDefined();
            expect(result.violation?.actionTaken).toBe("flagged");
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Consistency and idempotence", () => {
    it("should produce consistent results for same inputs", () => {
      fc.assert(
        fc.property(
          arbitraryVelocityMeasurement,
          (velocity) => {
            fc.pre(Number.isFinite(velocity.capabilityGainPerDay));
            
            const trend: VelocityTrend = {
              agentId: velocity.agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: false,
              isDecelerating: false,
              accelerationPercent: 0,
              isRapidGrowth: velocity.capabilityGainPerDay > 10,
              rapidGrowthThreshold: 10,
              daysAboveThreshold: 0,
              analyzedAt: new Date(),
            };
            
            const result1 = checkCapabilityGates(velocity, trend);
            const result2 = checkCapabilityGates(velocity, trend);
            
            // Property: Same inputs should produce same enforcement decision
            expect(result1.allowed).toBe(result2.allowed);
            expect(result1.violation?.currentGrowthRate).toBe(result2.violation?.currentGrowthRate);
            expect(result1.violation?.excessGrowth).toBe(result2.violation?.excessGrowth);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Edge cases", () => {
    it("should handle zero growth rate", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (agentId) => {
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: 0,
              capabilityGainPerDay: 0,
              performanceGainPerDay: 0,
              costReductionPerDay: 0,
              reliabilityGainPerDay: 0,
              improvementsInWindow: 0,
              improvementRatePerDay: 0,
              measuredAt: new Date(),
            };
            
            const trend: VelocityTrend = {
              agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: false,
              isDecelerating: false,
              accelerationPercent: 0,
              isRapidGrowth: false,
              rapidGrowthThreshold: 10,
              daysAboveThreshold: 0,
              analyzedAt: new Date(),
            };
            
            const result = checkCapabilityGates(velocity, trend);
            
            // Property: Zero growth should always be allowed
            expect(result.allowed).toBe(true);
            expect(result.violation).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle very high growth rates", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(50), max: Math.fround(1000) }),
          (agentId, extremeRate) => {
            fc.pre(Number.isFinite(extremeRate)); // Skip NaN values
            
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: extremeRate * 7,
              capabilityGainPerDay: extremeRate,
              performanceGainPerDay: extremeRate * 0.4,
              costReductionPerDay: extremeRate * 0.3,
              reliabilityGainPerDay: extremeRate * 0.3,
              improvementsInWindow: 20,
              improvementRatePerDay: 20 / 7,
              measuredAt: new Date(),
            };
            
            const trend: VelocityTrend = {
              agentId,
              currentVelocity: velocity,
              previousVelocity: null,
              isAccelerating: true,
              isDecelerating: false,
              accelerationPercent: 100,
              isRapidGrowth: true,
              rapidGrowthThreshold: 10,
              daysAboveThreshold: 7,
              analyzedAt: new Date(),
            };
            
            const result = checkCapabilityGates(velocity, trend);
            
            // Property: Extreme growth should be blocked with critical severity
            expect(result.allowed).toBe(false);
            expect(result.violation?.severity).toBe("critical");
            expect(result.violation?.excessGrowth).toBeGreaterThanOrEqual(40);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
