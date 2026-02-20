/**
 * Property-Based Tests for Improvement Velocity Tracking
 * 
 * Property 72: Improvement Velocity Tracking
 * Validates: Requirements 16.5
 * 
 * Feature: ordo-digital-civilization, Property 72: Improvement Velocity Tracking
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateCapabilityGain,
  measureVelocity,
  analyzeVelocityTrend,
  generateVelocityAlerts,
  isWithinCapabilityGates,
  daysUntilGateViolation,
  DEFAULT_VELOCITY_CONFIG,
  type VelocityMeasurement,
  type VelocityTrend,
  type ImpactMetrics,
} from "./velocity-tracking.js";

// Arbitraries for generating test data
const arbitraryImpactMetrics = fc.record({
  improvementId: fc.uuid(),
  agentId: fc.uuid(),
  measurementPeriodDays: fc.constant(7),
  performanceGainPercent: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
  costReductionPercent: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
  successRateIncrease: fc.float({ min: Math.fround(0), max: Math.fround(20) }),
  baseline: fc.record({
    avgLatencyMs: fc.float({ min: Math.fround(100), max: Math.fround(10000) }),
    avgCostCents: fc.float({ min: Math.fround(1), max: Math.fround(100) }),
    successRate: fc.float({ min: Math.fround(0.5), max: Math.fround(1.0) }),
    totalOperations: fc.integer({ min: 10, max: 1000 }),
  }),
  improved: fc.record({
    avgLatencyMs: fc.float({ min: Math.fround(50), max: Math.fround(9000) }),
    avgCostCents: fc.float({ min: Math.fround(0.5), max: Math.fround(90) }),
    successRate: fc.float({ min: Math.fround(0.6), max: Math.fround(1.0) }),
    totalOperations: fc.integer({ min: 10, max: 1000 }),
  }),
  roi: fc.record({
    implementationCostCents: fc.float({ min: Math.fround(1), max: Math.fround(100) }),
    testingCostCents: fc.float({ min: Math.fround(10), max: Math.fround(1000) }),
    totalCostCents: fc.float({ min: Math.fround(11), max: Math.fround(1100) }),
    projectedSavingsCents: fc.float({ min: Math.fround(-100), max: Math.fround(10000) }),
    projectedTimeGainMs: fc.float({ min: Math.fround(-1000), max: Math.fround(100000) }),
    projectedReliabilityGain: fc.float({ min: Math.fround(-5), max: Math.fround(20) }),
    roiPercent: fc.float({ min: Math.fround(-100), max: Math.fround(1000) }),
    paybackPeriodDays: fc.float({ min: Math.fround(0.1), max: Math.fround(365) }),
    netBenefitCents: fc.float({ min: Math.fround(-1000), max: Math.fround(10000) }),
    overallValueScore: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
  }),
  measuredAt: fc.date(),
  validationStatus: fc.constantFrom("validated", "rejected", "pending") as fc.Arbitrary<"validated" | "rejected" | "pending">,
});

const arbitraryVelocityMeasurement = fc.record({
  agentId: fc.uuid(),
  windowStartDate: fc.date(),
  windowEndDate: fc.date(),
  windowDays: fc.float({ min: Math.fround(1), max: Math.fround(30) }),
  capabilityGainPercent: fc.float({ min: Math.fround(0), max: Math.fround(200) }),
  capabilityGainPerDay: fc.float({ min: Math.fround(0), max: Math.fround(50) }),
  performanceGainPerDay: fc.float({ min: Math.fround(0), max: Math.fround(20) }),
  costReductionPerDay: fc.float({ min: Math.fround(0), max: Math.fround(20) }),
  reliabilityGainPerDay: fc.float({ min: Math.fround(0), max: Math.fround(5) }),
  improvementsInWindow: fc.integer({ min: 0, max: 20 }),
  improvementRatePerDay: fc.float({ min: Math.fround(0), max: Math.fround(5) }),
  measuredAt: fc.date(),
});

describe("Property 72: Improvement Velocity Tracking", () => {
  describe("Velocity measurement properties", () => {
    it("should track rate of capability gain per day for any agent", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(arbitraryImpactMetrics, { minLength: 0, maxLength: 20 }),
          fc.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }),
          fc.integer({ min: 1, max: 30 }),
          (agentId, improvements, endDate, windowDays) => {
            // Filter out improvements with NaN values
            const validImprovements = improvements.filter(imp =>
              Number.isFinite(imp.performanceGainPercent) &&
              Number.isFinite(imp.costReductionPercent) &&
              Number.isFinite(imp.successRateIncrease)
            );
            
            const windowStart = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
            
            // Set improvement dates within window
            const windowImprovements = validImprovements.map(imp => ({
              ...imp,
              agentId,
              measuredAt: new Date(
                windowStart.getTime() + Math.random() * (endDate.getTime() - windowStart.getTime())
              ),
            }));
            
            const velocity = measureVelocity(agentId, windowImprovements, windowStart, endDate);
            
            // Property: Velocity should track rate of capability gain per day
            expect(velocity.agentId).toBe(agentId);
            expect(Number.isFinite(velocity.windowDays)).toBe(true);
            expect(velocity.capabilityGainPerDay).toBeGreaterThanOrEqual(0);
            expect(Number.isFinite(velocity.capabilityGainPerDay)).toBe(true);
            
            // Property: Per-day rates should be non-negative
            expect(velocity.performanceGainPerDay).toBeGreaterThanOrEqual(0);
            expect(velocity.costReductionPerDay).toBeGreaterThanOrEqual(0);
            expect(velocity.reliabilityGainPerDay).toBeGreaterThanOrEqual(0);
            expect(velocity.improvementRatePerDay).toBeGreaterThanOrEqual(0);
            
            // Property: Improvement count should match filtered improvements
            expect(velocity.improvementsInWindow).toBe(windowImprovements.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate velocity as total gain divided by window days", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(arbitraryImpactMetrics, { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 1, max: 30 }),
          (agentId, improvements, windowDays) => {
            // Filter out improvements with NaN values
            const validImprovements = improvements.filter(imp =>
              Number.isFinite(imp.performanceGainPercent) &&
              Number.isFinite(imp.costReductionPercent) &&
              Number.isFinite(imp.successRateIncrease)
            );
            
            fc.pre(validImprovements.length > 0);
            
            const endDate = new Date();
            const windowStart = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
            
            const windowImprovements = validImprovements.map(imp => ({
              ...imp,
              agentId,
              measuredAt: new Date(
                windowStart.getTime() + Math.random() * (endDate.getTime() - windowStart.getTime())
              ),
            }));
            
            const velocity = measureVelocity(agentId, windowImprovements, windowStart, endDate);
            
            // Calculate expected total gain
            const expectedTotalGain = windowImprovements.reduce(
              (sum, imp) => sum + calculateCapabilityGain(imp),
              0
            );
            
            // Property: Capability gain per day = total gain / window days
            const expectedPerDayGain = expectedTotalGain / windowDays;
            expect(velocity.capabilityGainPerDay).toBeCloseTo(expectedPerDayGain, 2);
            expect(velocity.capabilityGainPercent).toBeCloseTo(expectedTotalGain, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle empty improvement windows gracefully", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.date(),
          fc.integer({ min: 1, max: 30 }),
          (agentId, endDate, windowDays) => {
            const windowStart = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
            
            const velocity = measureVelocity(agentId, [], windowStart, endDate);
            
            // Property: Empty window should have zero velocity
            expect(velocity.capabilityGainPerDay).toBe(0);
            expect(velocity.improvementsInWindow).toBe(0);
            expect(velocity.improvementRatePerDay).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Acceleration and deceleration detection", () => {
    it("should detect acceleration when velocity increases significantly", () => {
      fc.assert(
        fc.property(
          arbitraryVelocityMeasurement,
          fc.float({ min: Math.fround(1.3), max: Math.fround(3.0) }),
          (previousVelocity, accelerationFactor) => {
            fc.pre(previousVelocity.capabilityGainPerDay > 0); // Ensure meaningful acceleration
            fc.pre(Number.isFinite(accelerationFactor)); // Ensure valid factor
            
            // Create current velocity with higher gain per day
            const currentVelocity: VelocityMeasurement = {
              ...previousVelocity,
              capabilityGainPerDay: previousVelocity.capabilityGainPerDay * accelerationFactor,
              windowStartDate: new Date(previousVelocity.windowEndDate.getTime() + 1),
              windowEndDate: new Date(previousVelocity.windowEndDate.getTime() + 7 * 24 * 60 * 60 * 1000),
            };
            
            const trend = analyzeVelocityTrend(currentVelocity, previousVelocity);
            
            // Property: Significant velocity increase should be detected as acceleration
            expect(trend.isAccelerating).toBe(true);
            expect(trend.accelerationPercent).toBeGreaterThan(0);
            expect(trend.currentVelocity.capabilityGainPerDay).toBeGreaterThan(
              trend.previousVelocity?.capabilityGainPerDay || 0
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect deceleration when velocity decreases significantly", () => {
      fc.assert(
        fc.property(
          arbitraryVelocityMeasurement,
          fc.float({ min: Math.fround(0.3), max: Math.fround(0.7) }),
          (previousVelocity, decelerationFactor) => {
            fc.pre(previousVelocity.capabilityGainPerDay > 1); // Ensure meaningful deceleration
            fc.pre(Number.isFinite(decelerationFactor)); // Ensure valid factor
            
            // Create current velocity with lower gain per day
            const currentVelocity: VelocityMeasurement = {
              ...previousVelocity,
              capabilityGainPerDay: previousVelocity.capabilityGainPerDay * decelerationFactor,
              windowStartDate: new Date(previousVelocity.windowEndDate.getTime() + 1),
              windowEndDate: new Date(previousVelocity.windowEndDate.getTime() + 7 * 24 * 60 * 60 * 1000),
            };
            
            const trend = analyzeVelocityTrend(currentVelocity, previousVelocity);
            
            // Property: Significant velocity decrease should be detected as deceleration
            expect(trend.isDecelerating).toBe(true);
            expect(trend.accelerationPercent).toBeLessThan(0);
            expect(trend.currentVelocity.capabilityGainPerDay).toBeLessThan(
              trend.previousVelocity?.capabilityGainPerDay || Infinity
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not detect acceleration/deceleration for stable velocity", () => {
      fc.assert(
        fc.property(
          arbitraryVelocityMeasurement,
          fc.float({ min: Math.fround(0.95), max: Math.fround(1.05) }),
          (previousVelocity, stableFactor) => {
            fc.pre(Number.isFinite(stableFactor)); // Ensure valid factor
            fc.pre(previousVelocity.capabilityGainPerDay > 0); // Ensure meaningful comparison
            
            // Create current velocity with similar gain per day
            const currentVelocity: VelocityMeasurement = {
              ...previousVelocity,
              capabilityGainPerDay: previousVelocity.capabilityGainPerDay * stableFactor,
              windowStartDate: new Date(previousVelocity.windowEndDate.getTime() + 1),
              windowEndDate: new Date(previousVelocity.windowEndDate.getTime() + 7 * 24 * 60 * 60 * 1000),
            };
            
            const trend = analyzeVelocityTrend(currentVelocity, previousVelocity);
            
            // Property: Stable velocity should not trigger acceleration or deceleration
            expect(trend.isAccelerating).toBe(false);
            expect(trend.isDecelerating).toBe(false);
            expect(Number.isFinite(trend.accelerationPercent)).toBe(true);
            expect(Math.abs(trend.accelerationPercent)).toBeLessThan(DEFAULT_VELOCITY_CONFIG.accelerationThreshold);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Rapid growth detection and alerting", () => {
    it("should detect rapid growth when velocity exceeds threshold", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(10.1), max: Math.fround(50) }),
          fc.integer({ min: 1, max: 30 }),
          (agentId, velocityPerDay, windowDays) => {
            fc.pre(Number.isFinite(velocityPerDay)); // Ensure valid velocity
            
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays,
              capabilityGainPercent: velocityPerDay * windowDays,
              capabilityGainPerDay: velocityPerDay,
              performanceGainPerDay: velocityPerDay * 0.4,
              costReductionPerDay: velocityPerDay * 0.3,
              reliabilityGainPerDay: velocityPerDay * 0.3,
              improvementsInWindow: 5,
              improvementRatePerDay: 5 / windowDays,
              measuredAt: new Date(),
            };
            
            const trend = analyzeVelocityTrend(velocity, null);
            
            // Property: Velocity > 10% per day should be detected as rapid growth
            expect(trend.isRapidGrowth).toBe(true);
            expect(trend.currentVelocity.capabilityGainPerDay).toBeGreaterThan(
              DEFAULT_VELOCITY_CONFIG.rapidGrowthThreshold
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should generate critical alert for rapid growth", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(10.1), max: Math.fround(50) }),
          (agentId, velocityPerDay) => {
            fc.pre(Number.isFinite(velocityPerDay)); // Ensure valid velocity
            
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: velocityPerDay * 7,
              capabilityGainPerDay: velocityPerDay,
              performanceGainPerDay: velocityPerDay * 0.4,
              costReductionPerDay: velocityPerDay * 0.3,
              reliabilityGainPerDay: velocityPerDay * 0.3,
              improvementsInWindow: 5,
              improvementRatePerDay: 5 / 7,
              measuredAt: new Date(),
            };
            
            const trend = analyzeVelocityTrend(velocity, null);
            const alerts = generateVelocityAlerts(trend);
            
            // Property: Rapid growth should generate critical alert
            const rapidGrowthAlert = alerts.find(a => a.alertType === "rapid_growth");
            expect(rapidGrowthAlert).toBeDefined();
            expect(rapidGrowthAlert?.severity).toBe("critical");
            expect(rapidGrowthAlert?.currentVelocity).toBeGreaterThan(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not detect rapid growth when velocity is below threshold", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(0), max: Math.fround(10) }),
          (agentId, velocityPerDay) => {
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: velocityPerDay * 7,
              capabilityGainPerDay: velocityPerDay,
              performanceGainPerDay: velocityPerDay * 0.4,
              costReductionPerDay: velocityPerDay * 0.3,
              reliabilityGainPerDay: velocityPerDay * 0.3,
              improvementsInWindow: 3,
              improvementRatePerDay: 3 / 7,
              measuredAt: new Date(),
            };
            
            const trend = analyzeVelocityTrend(velocity, null);
            
            // Property: Velocity ≤ 10% per day should not be rapid growth
            expect(trend.isRapidGrowth).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Capability gate enforcement", () => {
    it("should identify when agent is within capability gates", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(0), max: Math.fround(10) }),
          (agentId, velocityPerDay) => {
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: velocityPerDay * 7,
              capabilityGainPerDay: velocityPerDay,
              performanceGainPerDay: velocityPerDay * 0.4,
              costReductionPerDay: velocityPerDay * 0.3,
              reliabilityGainPerDay: velocityPerDay * 0.3,
              improvementsInWindow: 3,
              improvementRatePerDay: 3 / 7,
              measuredAt: new Date(),
            };
            
            // Property: Velocity ≤ 10% per day should be within gates
            expect(isWithinCapabilityGates(velocity)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should identify when agent exceeds capability gates", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(10.01), max: Math.fround(50) }),
          (agentId, velocityPerDay) => {
            const velocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: velocityPerDay * 7,
              capabilityGainPerDay: velocityPerDay,
              performanceGainPerDay: velocityPerDay * 0.4,
              costReductionPerDay: velocityPerDay * 0.3,
              reliabilityGainPerDay: velocityPerDay * 0.3,
              improvementsInWindow: 5,
              improvementRatePerDay: 5 / 7,
              measuredAt: new Date(),
            };
            
            // Property: Velocity > 10% per day should exceed gates
            expect(isWithinCapabilityGates(velocity)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate days until gate violation for accelerating agents", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.float({ min: Math.fround(5), max: Math.fround(9) }),
          fc.float({ min: Math.fround(1.3), max: Math.fround(2.0) }),
          (agentId, currentVelocity, accelerationFactor) => {
            const previousVelocity: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
              windowEndDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              windowDays: 7,
              capabilityGainPercent: currentVelocity * 7 / accelerationFactor,
              capabilityGainPerDay: currentVelocity / accelerationFactor,
              performanceGainPerDay: (currentVelocity / accelerationFactor) * 0.4,
              costReductionPerDay: (currentVelocity / accelerationFactor) * 0.3,
              reliabilityGainPerDay: (currentVelocity / accelerationFactor) * 0.3,
              improvementsInWindow: 2,
              improvementRatePerDay: 2 / 7,
              measuredAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            };
            
            const current: VelocityMeasurement = {
              agentId,
              windowStartDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              windowEndDate: new Date(),
              windowDays: 7,
              capabilityGainPercent: currentVelocity * 7,
              capabilityGainPerDay: currentVelocity,
              performanceGainPerDay: currentVelocity * 0.4,
              costReductionPerDay: currentVelocity * 0.3,
              reliabilityGainPerDay: currentVelocity * 0.3,
              improvementsInWindow: 3,
              improvementRatePerDay: 3 / 7,
              measuredAt: new Date(),
            };
            
            const trend = analyzeVelocityTrend(current, previousVelocity);
            const days = daysUntilGateViolation(trend);
            
            // Property: Accelerating agent below threshold should have positive days until violation
            if (trend.isAccelerating && currentVelocity < 10) {
              expect(days).toBeGreaterThanOrEqual(0);
              expect(typeof days).toBe("number");
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Alert generation properties", () => {
    it("should generate appropriate alerts based on trend analysis", () => {
      fc.assert(
        fc.property(
          arbitraryVelocityMeasurement,
          fc.option(arbitraryVelocityMeasurement, { nil: null }),
          (currentVelocity, previousVelocity) => {
            const trend = analyzeVelocityTrend(currentVelocity, previousVelocity);
            const alerts = generateVelocityAlerts(trend);
            
            // Property: Alerts should match trend conditions
            if (trend.isRapidGrowth) {
              const rapidGrowthAlert = alerts.find(a => a.alertType === "rapid_growth");
              expect(rapidGrowthAlert).toBeDefined();
              expect(rapidGrowthAlert?.severity).toBe("critical");
            }
            
            if (trend.isAccelerating) {
              const accelerationAlert = alerts.find(a => a.alertType === "acceleration");
              expect(accelerationAlert).toBeDefined();
              expect(accelerationAlert?.severity).toBe("warning");
            }
            
            if (trend.isDecelerating) {
              const decelerationAlert = alerts.find(a => a.alertType === "deceleration");
              expect(decelerationAlert).toBeDefined();
              expect(decelerationAlert?.severity).toBe("info");
            }
            
            // Property: All alerts should have required fields
            for (const alert of alerts) {
              expect(alert.agentId).toBe(currentVelocity.agentId);
              expect(alert.message).toBeTruthy();
              expect(alert.triggeredAt).toBeInstanceOf(Date);
              expect(alert.currentVelocity).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not generate alerts when alerts are disabled", () => {
      fc.assert(
        fc.property(
          arbitraryVelocityMeasurement,
          (velocity) => {
            const trend = analyzeVelocityTrend(velocity, null);
            const alerts = generateVelocityAlerts(trend, {
              ...DEFAULT_VELOCITY_CONFIG,
              enableAlerts: false,
            });
            
            // Property: Disabled alerts should return empty array
            expect(alerts).toEqual([]);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Velocity tracking consistency", () => {
    it("should produce consistent velocity measurements for same inputs", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(arbitraryImpactMetrics, { minLength: 1, maxLength: 10 }),
          fc.date(),
          fc.integer({ min: 1, max: 30 }),
          (agentId, improvements, endDate, windowDays) => {
            const windowStart = new Date(endDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
            
            const velocity1 = measureVelocity(agentId, improvements, windowStart, endDate);
            const velocity2 = measureVelocity(agentId, improvements, windowStart, endDate);
            
            // Property: Same inputs should produce same measurements (except timestamp)
            expect(velocity1.capabilityGainPerDay).toBe(velocity2.capabilityGainPerDay);
            expect(velocity1.performanceGainPerDay).toBe(velocity2.performanceGainPerDay);
            expect(velocity1.costReductionPerDay).toBe(velocity2.costReductionPerDay);
            expect(velocity1.reliabilityGainPerDay).toBe(velocity2.reliabilityGainPerDay);
            expect(velocity1.improvementsInWindow).toBe(velocity2.improvementsInWindow);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should maintain velocity relationships across time windows", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(arbitraryImpactMetrics, { minLength: 2, maxLength: 20 }),
          fc.date(),
          (agentId, improvements, endDate) => {
            // Measure velocity for 7-day and 14-day windows
            const window7Start = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            const window14Start = new Date(endDate.getTime() - 14 * 24 * 60 * 60 * 1000);
            
            const velocity7 = measureVelocity(agentId, improvements, window7Start, endDate);
            const velocity14 = measureVelocity(agentId, improvements, window14Start, endDate);
            
            // Property: Longer window should include more or equal improvements
            expect(velocity14.improvementsInWindow).toBeGreaterThanOrEqual(velocity7.improvementsInWindow);
            
            // Property: Both velocities should be non-negative
            expect(velocity7.capabilityGainPerDay).toBeGreaterThanOrEqual(0);
            expect(velocity14.capabilityGainPerDay).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Edge cases and boundary conditions", () => {
    it("should handle zero velocity gracefully", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.date(),
          (agentId, endDate) => {
            const windowStart = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            
            const velocity = measureVelocity(agentId, [], windowStart, endDate);
            const trend = analyzeVelocityTrend(velocity, null);
            
            // Property: Zero velocity should not trigger any alerts
            expect(velocity.capabilityGainPerDay).toBe(0);
            expect(trend.isRapidGrowth).toBe(false);
            expect(trend.isAccelerating).toBe(false);
            expect(trend.isDecelerating).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle exactly at threshold velocity", () => {
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
            
            // Property: Exactly at threshold should be within gates
            expect(isWithinCapabilityGates(velocity, 10.0)).toBe(true);
            
            const trend = analyzeVelocityTrend(velocity, null);
            // Property: Exactly at threshold should not be rapid growth
            expect(trend.isRapidGrowth).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
