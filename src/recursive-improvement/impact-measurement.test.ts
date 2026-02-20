/**
 * Unit tests for Impact Measurement System
 */

import { describe, it, expect } from "vitest";
import {
  trackPerformanceGain,
  trackCostReduction,
  trackSuccessRateIncrease,
  calculateROI,
  measureImpact,
  compareImpacts,
  generateImpactReport,
  type ImpactMetrics,
  type ROICalculation,
} from "./impact-measurement.js";
import type { ImpactMeasurementResult } from "./improvement-testing.js";

describe("Impact Measurement System", () => {
  describe("trackPerformanceGain", () => {
    it("should calculate positive gain when latency decreases", () => {
      const gain = trackPerformanceGain(1000, 500);
      expect(gain).toBe(50); // 50% faster
    });

    it("should calculate negative gain when latency increases", () => {
      const gain = trackPerformanceGain(500, 1000);
      expect(gain).toBe(-100); // 100% slower
    });

    it("should return 0 when baseline is 0", () => {
      const gain = trackPerformanceGain(0, 500);
      expect(gain).toBe(0);
    });

    it("should return 0 when latency unchanged", () => {
      const gain = trackPerformanceGain(1000, 1000);
      expect(gain).toBe(0);
    });

    it("should round to 2 decimal places", () => {
      const gain = trackPerformanceGain(1000, 667);
      expect(gain).toBe(33.3);
    });
  });

  describe("trackCostReduction", () => {
    it("should calculate positive reduction when cost decreases", () => {
      const reduction = trackCostReduction(10, 5);
      expect(reduction).toBe(50); // 50% cheaper
    });

    it("should calculate negative reduction when cost increases", () => {
      const reduction = trackCostReduction(5, 10);
      expect(reduction).toBe(-100); // 100% more expensive
    });

    it("should return 0 when baseline is 0", () => {
      const reduction = trackCostReduction(0, 5);
      expect(reduction).toBe(0);
    });

    it("should return 0 when cost unchanged", () => {
      const reduction = trackCostReduction(10, 10);
      expect(reduction).toBe(0);
    });

    it("should round to 2 decimal places", () => {
      const reduction = trackCostReduction(10, 6.67);
      expect(reduction).toBe(33.3);
    });
  });

  describe("trackSuccessRateIncrease", () => {
    it("should calculate positive increase when success rate improves", () => {
      const increase = trackSuccessRateIncrease(0.85, 0.95);
      expect(increase).toBe(10); // 10 percentage points
    });

    it("should calculate negative increase when success rate degrades", () => {
      const increase = trackSuccessRateIncrease(0.95, 0.85);
      expect(increase).toBe(-10); // -10 percentage points
    });

    it("should return 0 when success rate unchanged", () => {
      const increase = trackSuccessRateIncrease(0.9, 0.9);
      expect(increase).toBe(0);
    });

    it("should handle perfect success rate", () => {
      const increase = trackSuccessRateIncrease(0.95, 1.0);
      expect(increase).toBe(5);
    });

    it("should round to 2 decimal places", () => {
      const increase = trackSuccessRateIncrease(0.85, 0.9167);
      expect(increase).toBe(6.67);
    });
  });

  describe("calculateROI", () => {
    it("should calculate positive ROI for cost-saving improvement", () => {
      const baseline = {
        avgLatencyMs: 1000,
        avgCostCents: 10,
        successRate: 0.9,
        totalOperations: 700, // 7 days * 100 ops/day
      };

      const improved = {
        avgLatencyMs: 500,
        avgCostCents: 5,
        successRate: 0.95,
        totalOperations: 700,
      };

      const roi = calculateROI(baseline, improved, 10, 30);

      // Cost savings: (10 - 5) * 100 ops/day * 30 days = 15,000 cents
      // Total cost: 10 + (5 * 700) = 3,510 cents
      // ROI: (15,000 - 3,510) / 3,510 * 100 = ~327%
      expect(roi.roiPercent).toBeGreaterThan(300);
      expect(roi.projectedSavingsCents).toBeGreaterThan(10000);
      expect(roi.netBenefitCents).toBeGreaterThan(0);
    });

    it("should calculate negative ROI for cost-increasing improvement", () => {
      const baseline = {
        avgLatencyMs: 1000,
        avgCostCents: 5,
        successRate: 0.9,
        totalOperations: 700,
      };

      const improved = {
        avgLatencyMs: 500,
        avgCostCents: 10,
        successRate: 0.95,
        totalOperations: 700,
      };

      const roi = calculateROI(baseline, improved, 10, 30);

      expect(roi.roiPercent).toBeLessThan(0);
      expect(roi.netBenefitCents).toBeLessThan(0);
    });

    it("should calculate payback period correctly", () => {
      const baseline = {
        avgLatencyMs: 1000,
        avgCostCents: 10,
        successRate: 0.9,
        totalOperations: 700,
      };

      const improved = {
        avgLatencyMs: 500,
        avgCostCents: 5,
        successRate: 0.95,
        totalOperations: 700,
      };

      const roi = calculateROI(baseline, improved, 100, 30);

      // Daily savings: (10 - 5) * 100 ops/day = 500 cents/day
      // Total cost: 100 + (5 * 700) = 3,600 cents
      // Payback: 3,600 / 500 = 7.2 days
      expect(roi.paybackPeriodDays).toBeGreaterThan(5);
      expect(roi.paybackPeriodDays).toBeLessThan(10);
    });

    it("should calculate overall value score", () => {
      const baseline = {
        avgLatencyMs: 1000,
        avgCostCents: 10,
        successRate: 0.85,
        totalOperations: 700,
      };

      const improved = {
        avgLatencyMs: 500,
        avgCostCents: 5,
        successRate: 0.95,
        totalOperations: 700,
      };

      const roi = calculateROI(baseline, improved, 10, 30);

      expect(roi.overallValueScore).toBeGreaterThan(0);
      expect(roi.overallValueScore).toBeLessThanOrEqual(100);
    });

    it("should handle zero operations gracefully", () => {
      const baseline = {
        avgLatencyMs: 1000,
        avgCostCents: 10,
        successRate: 0.9,
        totalOperations: 0,
      };

      const improved = {
        avgLatencyMs: 500,
        avgCostCents: 5,
        successRate: 0.95,
        totalOperations: 0,
      };

      const roi = calculateROI(baseline, improved, 10, 30);

      expect(roi.projectedSavingsCents).toBe(0);
      expect(roi.paybackPeriodDays).toBe(Infinity);
    });
  });

  describe("measureImpact", () => {
    it("should combine all impact metrics", () => {
      const impactResult: ImpactMeasurementResult = {
        improvementId: "imp-123",
        measurementPeriodDays: 7,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-08"),
        baseline: {
          avgLatencyMs: 1000,
          avgCostCents: 10,
          successRate: 0.85,
          totalOperations: 700,
        },
        testPeriod: {
          avgLatencyMs: 500,
          avgCostCents: 5,
          successRate: 0.95,
          totalOperations: 700,
        },
        improvements: {
          speedImprovement: 50,
          costReduction: 50,
          reliabilityImprovement: 10,
        },
        dailyMeasurements: [],
        validated: true,
        validationReason: "All metrics improved",
      };

      const impact = measureImpact("imp-123", "agent-456", impactResult, 10);

      expect(impact.improvementId).toBe("imp-123");
      expect(impact.agentId).toBe("agent-456");
      expect(impact.performanceGainPercent).toBe(50);
      expect(impact.costReductionPercent).toBe(50);
      expect(impact.successRateIncrease).toBe(10);
      expect(impact.validationStatus).toBe("validated");
      expect(impact.roi).toBeDefined();
      expect(impact.roi.roiPercent).toBeGreaterThan(0);
    });

    it("should mark rejected improvements correctly", () => {
      const impactResult: ImpactMeasurementResult = {
        improvementId: "imp-123",
        measurementPeriodDays: 7,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-08"),
        baseline: {
          avgLatencyMs: 1000,
          avgCostCents: 10,
          successRate: 0.95,
          totalOperations: 700,
        },
        testPeriod: {
          avgLatencyMs: 1500,
          avgCostCents: 15,
          successRate: 0.85,
          totalOperations: 700,
        },
        improvements: {
          speedImprovement: -50,
          costReduction: -50,
          reliabilityImprovement: -10,
        },
        dailyMeasurements: [],
        validated: false,
        validationReason: "All metrics degraded",
      };

      const impact = measureImpact("imp-123", "agent-456", impactResult, 10);

      expect(impact.validationStatus).toBe("rejected");
      expect(impact.performanceGainPercent).toBeLessThan(0);
      expect(impact.costReductionPercent).toBeLessThan(0);
      expect(impact.successRateIncrease).toBeLessThan(0);
    });
  });

  describe("compareImpacts", () => {
    it("should identify best improvements across categories", () => {
      const impacts: ImpactMetrics[] = [
        {
          improvementId: "imp-1",
          agentId: "agent-1",
          measurementPeriodDays: 7,
          performanceGainPercent: 50,
          costReductionPercent: 30,
          successRateIncrease: 5,
          baseline: { avgLatencyMs: 1000, avgCostCents: 10, successRate: 0.9, totalOperations: 700 },
          improved: { avgLatencyMs: 500, avgCostCents: 7, successRate: 0.95, totalOperations: 700 },
          roi: {
            implementationCostCents: 10,
            testingCostCents: 100,
            totalCostCents: 110,
            projectedSavingsCents: 500,
            projectedTimeGainMs: 50000,
            projectedReliabilityGain: 5,
            roiPercent: 354.55,
            paybackPeriodDays: 6.6,
            netBenefitCents: 390,
            overallValueScore: 75,
          },
          measuredAt: new Date(),
          validationStatus: "validated",
        },
        {
          improvementId: "imp-2",
          agentId: "agent-1",
          measurementPeriodDays: 7,
          performanceGainPercent: 30,
          costReductionPercent: 60,
          successRateIncrease: 10,
          baseline: { avgLatencyMs: 1000, avgCostCents: 10, successRate: 0.85, totalOperations: 700 },
          improved: { avgLatencyMs: 700, avgCostCents: 4, successRate: 0.95, totalOperations: 700 },
          roi: {
            implementationCostCents: 10,
            testingCostCents: 100,
            totalCostCents: 110,
            projectedSavingsCents: 800,
            projectedTimeGainMs: 30000,
            projectedReliabilityGain: 10,
            roiPercent: 627.27,
            paybackPeriodDays: 4.13,
            netBenefitCents: 690,
            overallValueScore: 85,
          },
          measuredAt: new Date(),
          validationStatus: "validated",
        },
      ];

      const comparison = compareImpacts(impacts);

      expect(comparison.bestPerformanceGain?.improvementId).toBe("imp-1");
      expect(comparison.bestCostReduction?.improvementId).toBe("imp-2");
      expect(comparison.bestReliabilityGain?.improvementId).toBe("imp-2");
      expect(comparison.bestROI?.improvementId).toBe("imp-2");
      expect(comparison.bestOverallValue?.improvementId).toBe("imp-2");
    });

    it("should handle empty impacts array", () => {
      const comparison = compareImpacts([]);

      expect(comparison.bestPerformanceGain).toBeNull();
      expect(comparison.bestCostReduction).toBeNull();
      expect(comparison.bestReliabilityGain).toBeNull();
      expect(comparison.bestROI).toBeNull();
      expect(comparison.bestOverallValue).toBeNull();
    });
  });

  describe("generateImpactReport", () => {
    it("should generate readable report with all metrics", () => {
      const history = {
        agentId: "agent-123",
        improvements: [
          {
            improvementId: "imp-1",
            agentId: "agent-123",
            measurementPeriodDays: 7,
            performanceGainPercent: 50,
            costReductionPercent: 30,
            successRateIncrease: 5,
            baseline: { avgLatencyMs: 1000, avgCostCents: 10, successRate: 0.9, totalOperations: 700 },
            improved: { avgLatencyMs: 500, avgCostCents: 7, successRate: 0.95, totalOperations: 700 },
            roi: {
              implementationCostCents: 10,
              testingCostCents: 100,
              totalCostCents: 110,
              projectedSavingsCents: 500,
              projectedTimeGainMs: 50000,
              projectedReliabilityGain: 5,
              roiPercent: 354.55,
              paybackPeriodDays: 6.6,
              netBenefitCents: 390,
              overallValueScore: 75,
            },
            measuredAt: new Date(),
            validationStatus: "validated" as const,
          },
        ],
        totalImprovements: 1,
        successfulImprovements: 1,
        successRate: 1.0,
        cumulativePerformanceGain: 50,
        cumulativeCostReduction: 30,
        cumulativeReliabilityGain: 5,
        cumulativeROI: 354.55,
        improvementVelocity: 0.5,
        avgROI: 354.55,
        avgPaybackPeriodDays: 6.6,
      };

      const report = generateImpactReport(history);

      expect(report).toContain("agent-123");
      expect(report).toContain("Total Improvements: 1");
      expect(report).toContain("Successful: 1");
      expect(report).toContain("Performance Gain: 50.0%");
      expect(report).toContain("Cost Reduction: 30.0%");
      expect(report).toContain("Reliability Gain: 5.0pp");
      expect(report).toMatch(/Total ROI: 354\.[56]%/); // Allow for rounding differences
    });
  });
});
