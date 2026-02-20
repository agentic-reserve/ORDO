/**
 * Unit Tests for Improvement Velocity Tracking
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateCapabilityGain,
  measureVelocity,
  analyzeVelocityTrend,
  generateVelocityAlerts,
  isWithinCapabilityGates,
  daysUntilGateViolation,
  DEFAULT_VELOCITY_CONFIG,
  type VelocityMeasurement,
  type ImpactMetrics,
} from "./velocity-tracking.js";

describe("Velocity Tracking", () => {
  describe("calculateCapabilityGain", () => {
    it("should calculate weighted capability gain", () => {
      const impact: ImpactMetrics = {
        improvementId: "test-1",
        agentId: "agent-1",
        measurementPeriodDays: 7,
        performanceGainPercent: 10,
        costReductionPercent: 20,
        successRateIncrease: 5,
        baseline: {
          avgLatencyMs: 1000,
          avgCostCents: 10,
          successRate: 0.8,
          totalOperations: 100,
        },
        improved: {
          avgLatencyMs: 900,
          avgCostCents: 8,
          successRate: 0.85,
          totalOperations: 100,
        },
        roi: {
          implementationCostCents: 10,
          testingCostCents: 800,
          totalCostCents: 810,
          projectedSavingsCents: 857.14,
          projectedTimeGainMs: 4285.71,
          projectedReliabilityGain: 5,
          roiPercent: 5.83,
          paybackPeriodDays: 28.35,
          netBenefitCents: 47.14,
          overallValueScore: 15.83,
        },
        measuredAt: new Date(),
        validationStatus: "validated",
      };

      const gain = calculateCapabilityGain(impact);

      // Expected: 10 * 0.4 + 20 * 0.3 + 5 * 0.3 = 4 + 6 + 1.5 = 11.5
      expect(gain).toBe(11.5);
    });

    it("should handle zero gains", () => {
      const impact: ImpactMetrics = {
        improvementId: "test-2",
        agentId: "agent-1",
        measurementPeriodDays: 7,
        performanceGainPercent: 0,
        costReductionPercent: 0,
        successRateIncrease: 0,
        baseline: {
          avgLatencyMs: 1000,
          avgCostCents: 10,
          successRate: 0.8,
          totalOperations: 100,
        },
        improved: {
          avgLatencyMs: 1000,
          avgCostCents: 10,
          successRate: 0.8,
          totalOperations: 100,
        },
        roi: {
          implementationCostCents: 10,
          testingCostCents: 1000,
          totalCostCents: 1010,
          projectedSavingsCents: 0,
          projectedTimeGainMs: 0,
          projectedReliabilityGain: 0,
          roiPercent: -100,
          paybackPeriodDays: Infinity,
          netBenefitCents: -1010,
          overallValueScore: 0,
        },
        measuredAt: new Date(),
        validationStatus: "rejected",
      };

      const gain = calculateCapabilityGain(impact);
      expect(gain).toBe(0);
    });
  });

  describe("measureVelocity", () => {
    it("should measure velocity for a time window", () => {
      const agentId = "agent-1";
      const windowStart = new Date("2024-01-01");
      const windowEnd = new Date("2024-01-08"); // 7 days

      const improvements: ImpactMetrics[] = [
        {
          improvementId: "imp-1",
          agentId,
          measurementPeriodDays: 7,
          performanceGainPercent: 10,
          costReductionPercent: 5,
          successRateIncrease: 2,
          baseline: { avgLatencyMs: 1000, avgCostCents: 10, successRate: 0.8, totalOperations: 100 },
          improved: { avgLatencyMs: 900, avgCostCents: 9.5, successRate: 0.82, totalOperations: 100 },
          roi: {
            implementationCostCents: 10,
            testingCostCents: 950,
            totalCostCents: 960,
            projectedSavingsCents: 214.29,
            projectedTimeGainMs: 4285.71,
            projectedReliabilityGain: 2,
            roiPercent: -77.68,
            paybackPeriodDays: 134.4,
            netBenefitCents: -745.71,
            overallValueScore: 8.57,
          },
          measuredAt: new Date("2024-01-03"),
          validationStatus: "validated",
        },
        {
          improvementId: "imp-2",
          agentId,
          measurementPeriodDays: 7,
          performanceGainPercent: 15,
          costReductionPercent: 10,
          successRateIncrease: 3,
          baseline: { avgLatencyMs: 900, avgCostCents: 9.5, successRate: 0.82, totalOperations: 100 },
          improved: { avgLatencyMs: 765, avgCostCents: 8.55, successRate: 0.85, totalOperations: 100 },
          roi: {
            implementationCostCents: 10,
            testingCostCents: 855,
            totalCostCents: 865,
            projectedSavingsCents: 407.14,
            projectedTimeGainMs: 5785.71,
            projectedReliabilityGain: 3,
            roiPercent: -52.93,
            paybackPeriodDays: 63.77,
            netBenefitCents: -457.86,
            overallValueScore: 13.86,
          },
          measuredAt: new Date("2024-01-06"),
          validationStatus: "validated",
        },
      ];

      const velocity = measureVelocity(agentId, improvements, windowStart, windowEnd);

      expect(velocity.agentId).toBe(agentId);
      expect(velocity.windowDays).toBe(7);
      expect(velocity.improvementsInWindow).toBe(2);
      expect(velocity.improvementRatePerDay).toBeCloseTo(2 / 7, 2);

      // Total capability gain: (10*0.4 + 5*0.3 + 2*0.3) + (15*0.4 + 10*0.3 + 3*0.3) = 6.1 + 9.9 = 16
      expect(velocity.capabilityGainPercent).toBe(16);
      expect(velocity.capabilityGainPerDay).toBeCloseTo(16 / 7, 2);
    });

    it("should handle empty window", () => {
      const agentId = "agent-1";
      const windowStart = new Date("2024-01-01");
      const windowEnd = new Date("2024-01-08");

      const velocity = measureVelocity(agentId, [], windowStart, windowEnd);

      expect(velocity.improvementsInWindow).toBe(0);
      expect(velocity.capabilityGainPerDay).toBe(0);
      expect(velocity.improvementRatePerDay).toBe(0);
    });
  });

  describe("analyzeVelocityTrend", () => {
    it("should detect acceleration", () => {
      const currentVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date("2024-01-08"),
        windowEndDate: new Date("2024-01-15"),
        windowDays: 7,
        capabilityGainPercent: 20,
        capabilityGainPerDay: 20 / 7,
        performanceGainPerDay: 1.5,
        costReductionPerDay: 1.0,
        reliabilityGainPerDay: 0.5,
        improvementsInWindow: 3,
        improvementRatePerDay: 3 / 7,
        measuredAt: new Date(),
      };

      const previousVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date("2024-01-01"),
        windowEndDate: new Date("2024-01-08"),
        windowDays: 7,
        capabilityGainPercent: 10,
        capabilityGainPerDay: 10 / 7,
        performanceGainPerDay: 1.0,
        costReductionPerDay: 0.5,
        reliabilityGainPerDay: 0.3,
        improvementsInWindow: 2,
        improvementRatePerDay: 2 / 7,
        measuredAt: new Date(),
      };

      const trend = analyzeVelocityTrend(currentVelocity, previousVelocity);

      expect(trend.isAccelerating).toBe(true);
      expect(trend.isDecelerating).toBe(false);
      expect(trend.accelerationPercent).toBeGreaterThan(0);
    });

    it("should detect deceleration", () => {
      const currentVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date("2024-01-08"),
        windowEndDate: new Date("2024-01-15"),
        windowDays: 7,
        capabilityGainPercent: 5,
        capabilityGainPerDay: 5 / 7,
        performanceGainPerDay: 0.5,
        costReductionPerDay: 0.3,
        reliabilityGainPerDay: 0.1,
        improvementsInWindow: 1,
        improvementRatePerDay: 1 / 7,
        measuredAt: new Date(),
      };

      const previousVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date("2024-01-01"),
        windowEndDate: new Date("2024-01-08"),
        windowDays: 7,
        capabilityGainPercent: 20,
        capabilityGainPerDay: 20 / 7,
        performanceGainPerDay: 2.0,
        costReductionPerDay: 1.0,
        reliabilityGainPerDay: 0.5,
        improvementsInWindow: 3,
        improvementRatePerDay: 3 / 7,
        measuredAt: new Date(),
      };

      const trend = analyzeVelocityTrend(currentVelocity, previousVelocity);

      expect(trend.isAccelerating).toBe(false);
      expect(trend.isDecelerating).toBe(true);
      expect(trend.accelerationPercent).toBeLessThan(0);
    });

    it("should detect rapid growth", () => {
      const currentVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date("2024-01-08"),
        windowEndDate: new Date("2024-01-15"),
        windowDays: 7,
        capabilityGainPercent: 80,
        capabilityGainPerDay: 80 / 7, // ~11.4% per day > 10% threshold
        performanceGainPerDay: 5.0,
        costReductionPerDay: 3.0,
        reliabilityGainPerDay: 1.0,
        improvementsInWindow: 5,
        improvementRatePerDay: 5 / 7,
        measuredAt: new Date(),
      };

      const trend = analyzeVelocityTrend(currentVelocity, null);

      expect(trend.isRapidGrowth).toBe(true);
      expect(trend.rapidGrowthThreshold).toBe(10.0);
    });
  });

  describe("generateVelocityAlerts", () => {
    it("should generate rapid growth alert", () => {
      const currentVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date(),
        windowEndDate: new Date(),
        windowDays: 7,
        capabilityGainPercent: 80,
        capabilityGainPerDay: 11.5,
        performanceGainPerDay: 5.0,
        costReductionPerDay: 3.0,
        reliabilityGainPerDay: 1.0,
        improvementsInWindow: 5,
        improvementRatePerDay: 5 / 7,
        measuredAt: new Date(),
      };

      const trend = analyzeVelocityTrend(currentVelocity, null);
      const alerts = generateVelocityAlerts(trend);

      expect(alerts.length).toBeGreaterThan(0);
      const rapidGrowthAlert = alerts.find((a) => a.alertType === "rapid_growth");
      expect(rapidGrowthAlert).toBeDefined();
      expect(rapidGrowthAlert?.severity).toBe("critical");
    });

    it("should generate acceleration alert", () => {
      const currentVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date(),
        windowEndDate: new Date(),
        windowDays: 7,
        capabilityGainPercent: 20,
        capabilityGainPerDay: 20 / 7,
        performanceGainPerDay: 1.5,
        costReductionPerDay: 1.0,
        reliabilityGainPerDay: 0.5,
        improvementsInWindow: 3,
        improvementRatePerDay: 3 / 7,
        measuredAt: new Date(),
      };

      const previousVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date(),
        windowEndDate: new Date(),
        windowDays: 7,
        capabilityGainPercent: 10,
        capabilityGainPerDay: 10 / 7,
        performanceGainPerDay: 1.0,
        costReductionPerDay: 0.5,
        reliabilityGainPerDay: 0.3,
        improvementsInWindow: 2,
        improvementRatePerDay: 2 / 7,
        measuredAt: new Date(),
      };

      const trend = analyzeVelocityTrend(currentVelocity, previousVelocity);
      const alerts = generateVelocityAlerts(trend);

      const accelerationAlert = alerts.find((a) => a.alertType === "acceleration");
      expect(accelerationAlert).toBeDefined();
      expect(accelerationAlert?.severity).toBe("warning");
    });

    it("should not generate alerts when disabled", () => {
      const currentVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date(),
        windowEndDate: new Date(),
        windowDays: 7,
        capabilityGainPercent: 80,
        capabilityGainPerDay: 11.5,
        performanceGainPerDay: 5.0,
        costReductionPerDay: 3.0,
        reliabilityGainPerDay: 1.0,
        improvementsInWindow: 5,
        improvementRatePerDay: 5 / 7,
        measuredAt: new Date(),
      };

      const trend = analyzeVelocityTrend(currentVelocity, null);
      const alerts = generateVelocityAlerts(trend, {
        ...DEFAULT_VELOCITY_CONFIG,
        enableAlerts: false,
      });

      expect(alerts.length).toBe(0);
    });
  });

  describe("isWithinCapabilityGates", () => {
    it("should return true when within gates", () => {
      const velocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date(),
        windowEndDate: new Date(),
        windowDays: 7,
        capabilityGainPercent: 50,
        capabilityGainPerDay: 7.0, // Below 10% threshold
        performanceGainPerDay: 3.0,
        costReductionPerDay: 2.0,
        reliabilityGainPerDay: 1.0,
        improvementsInWindow: 3,
        improvementRatePerDay: 3 / 7,
        measuredAt: new Date(),
      };

      expect(isWithinCapabilityGates(velocity)).toBe(true);
    });

    it("should return false when exceeding gates", () => {
      const velocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date(),
        windowEndDate: new Date(),
        windowDays: 7,
        capabilityGainPercent: 80,
        capabilityGainPerDay: 11.5, // Above 10% threshold
        performanceGainPerDay: 5.0,
        costReductionPerDay: 3.0,
        reliabilityGainPerDay: 1.0,
        improvementsInWindow: 5,
        improvementRatePerDay: 5 / 7,
        measuredAt: new Date(),
      };

      expect(isWithinCapabilityGates(velocity)).toBe(false);
    });
  });

  describe("daysUntilGateViolation", () => {
    it("should return 0 when already violating", () => {
      const currentVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date(),
        windowEndDate: new Date(),
        windowDays: 7,
        capabilityGainPercent: 80,
        capabilityGainPerDay: 11.5,
        performanceGainPerDay: 5.0,
        costReductionPerDay: 3.0,
        reliabilityGainPerDay: 1.0,
        improvementsInWindow: 5,
        improvementRatePerDay: 5 / 7,
        measuredAt: new Date(),
      };

      const trend = analyzeVelocityTrend(currentVelocity, null);
      const days = daysUntilGateViolation(trend);

      expect(days).toBe(0);
    });

    it("should return null when not accelerating", () => {
      const currentVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date(),
        windowEndDate: new Date(),
        windowDays: 7,
        capabilityGainPercent: 35,
        capabilityGainPerDay: 5.0,
        performanceGainPerDay: 2.0,
        costReductionPerDay: 1.5,
        reliabilityGainPerDay: 0.5,
        improvementsInWindow: 3,
        improvementRatePerDay: 3 / 7,
        measuredAt: new Date(),
      };

      const trend = analyzeVelocityTrend(currentVelocity, null);
      const days = daysUntilGateViolation(trend);

      expect(days).toBeNull();
    });

    it("should calculate days until violation when accelerating", () => {
      const currentVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date(),
        windowEndDate: new Date(),
        windowDays: 7,
        capabilityGainPercent: 50,
        capabilityGainPerDay: 7.0,
        performanceGainPerDay: 3.0,
        costReductionPerDay: 2.0,
        reliabilityGainPerDay: 1.0,
        improvementsInWindow: 4,
        improvementRatePerDay: 4 / 7,
        measuredAt: new Date(),
      };

      const previousVelocity: VelocityMeasurement = {
        agentId: "agent-1",
        windowStartDate: new Date(),
        windowEndDate: new Date(),
        windowDays: 7,
        capabilityGainPercent: 30,
        capabilityGainPerDay: 4.0,
        performanceGainPerDay: 2.0,
        costReductionPerDay: 1.0,
        reliabilityGainPerDay: 0.5,
        improvementsInWindow: 2,
        improvementRatePerDay: 2 / 7,
        measuredAt: new Date(),
      };

      const trend = analyzeVelocityTrend(currentVelocity, previousVelocity);
      const days = daysUntilGateViolation(trend);

      expect(days).toBeGreaterThan(0);
      expect(typeof days).toBe("number");
    });
  });
});
