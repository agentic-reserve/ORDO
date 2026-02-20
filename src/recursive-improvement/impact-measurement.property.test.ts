/**
 * Property-Based Tests for Impact Measurement System
 * 
 * Property 71: Impact Measurement
 * Validates: Requirements 16.3
 * 
 * Feature: ordo-digital-civilization, Property 71: Impact Measurement
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  trackPerformanceGain,
  trackCostReduction,
  trackSuccessRateIncrease,
  calculateROI,
  measureImpact,
  compareImpacts,
  type ImpactMetrics,
  type ROICalculation,
} from "./impact-measurement.js";
import type { ImpactMeasurementResult } from "./improvement-testing.js";

// Arbitraries for generating test data
const arbitraryLatency = fc.float({ min: Math.fround(10), max: Math.fround(10000) });
const arbitraryCost = fc.float({ min: Math.fround(0.01), max: Math.fround(100) });
const arbitrarySuccessRate = fc.float({ min: Math.fround(0), max: Math.fround(1) });
const arbitraryOperationCount = fc.integer({ min: 1, max: 10000 });

const arbitraryPerformanceMetrics = fc.record({
  avgLatencyMs: arbitraryLatency,
  avgCostCents: arbitraryCost,
  successRate: arbitrarySuccessRate,
  totalOperations: arbitraryOperationCount,
});

const arbitraryImpactMeasurementResult = fc.record({
  improvementId: fc.uuid(),
  measurementPeriodDays: fc.constant(7),
  startDate: fc.date(),
  endDate: fc.date(),
  baseline: arbitraryPerformanceMetrics,
  testPeriod: arbitraryPerformanceMetrics,
  improvements: fc.record({
    speedImprovement: fc.float({ min: Math.fround(-100), max: Math.fround(100) }),
    costReduction: fc.float({ min: Math.fround(-100), max: Math.fround(100) }),
    reliabilityImprovement: fc.float({ min: Math.fround(-100), max: Math.fround(100) }),
  }),
  dailyMeasurements: fc.constant([]),
  validated: fc.boolean(),
  validationReason: fc.string(),
});

describe("Property 71: Impact Measurement", () => {
  describe("trackPerformanceGain", () => {
    it("should always return a number", () => {
      fc.assert(
        fc.property(arbitraryLatency, arbitraryLatency, (baseline, improved) => {
          fc.pre(Number.isFinite(baseline) && Number.isFinite(improved));
          
          const gain = trackPerformanceGain(baseline, improved);
          expect(typeof gain).toBe("number");
          expect(Number.isFinite(gain)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should return positive gain when latency decreases", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(100), max: Math.fround(10000) }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.99) }),
          (baseline, reductionFactor) => {
            fc.pre(Number.isFinite(baseline) && Number.isFinite(reductionFactor));
            
            const improved = baseline * reductionFactor;
            const gain = trackPerformanceGain(baseline, improved);
            
            // Property: Latency decrease = positive gain
            expect(gain).toBeGreaterThan(0);
            expect(gain).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return negative gain when latency increases", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(100), max: Math.fround(5000) }),
          fc.float({ min: Math.fround(1.01), max: Math.fround(3) }),
          (baseline, increaseFactor) => {
            fc.pre(Number.isFinite(baseline) && Number.isFinite(increaseFactor));
            
            const improved = baseline * increaseFactor;
            const gain = trackPerformanceGain(baseline, improved);
            
            // Property: Latency increase = negative gain
            expect(gain).toBeLessThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("trackCostReduction", () => {
    it("should always return a number", () => {
      fc.assert(
        fc.property(arbitraryCost, arbitraryCost, (baseline, improved) => {
          fc.pre(Number.isFinite(baseline) && Number.isFinite(improved));
          
          const reduction = trackCostReduction(baseline, improved);
          expect(typeof reduction).toBe("number");
          expect(Number.isFinite(reduction)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should return positive reduction when cost decreases", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(1), max: Math.fround(100) }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.99) }),
          (baseline, reductionFactor) => {
            fc.pre(Number.isFinite(baseline) && Number.isFinite(reductionFactor));
            
            const improved = baseline * reductionFactor;
            const reduction = trackCostReduction(baseline, improved);
            
            // Property: Cost decrease = positive reduction
            expect(reduction).toBeGreaterThan(0);
            expect(reduction).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return negative reduction when cost increases", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(1), max: Math.fround(50) }),
          fc.float({ min: Math.fround(1.01), max: Math.fround(3) }),
          (baseline, increaseFactor) => {
            fc.pre(Number.isFinite(baseline) && Number.isFinite(increaseFactor));
            
            const improved = baseline * increaseFactor;
            const reduction = trackCostReduction(baseline, improved);
            
            // Property: Cost increase = negative reduction
            expect(reduction).toBeLessThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("trackSuccessRateIncrease", () => {
    it("should always return a number in valid range", () => {
      fc.assert(
        fc.property(arbitrarySuccessRate, arbitrarySuccessRate, (baseline, improved) => {
          fc.pre(Number.isFinite(baseline) && Number.isFinite(improved));
          
          const increase = trackSuccessRateIncrease(baseline, improved);
          expect(typeof increase).toBe("number");
          expect(Number.isFinite(increase)).toBe(true);
          
          // Property: Increase should be within [-100, 100] percentage points
          expect(increase).toBeGreaterThanOrEqual(-100);
          expect(increase).toBeLessThanOrEqual(100);
        }),
        { numRuns: 100 }
      );
    });

    it("should return positive increase when success rate improves", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.89) }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.1) }),
          (baseline, delta) => {
            fc.pre(Number.isFinite(baseline) && Number.isFinite(delta));
            
            const improved = Math.min(1.0, baseline + delta);
            const increase = trackSuccessRateIncrease(baseline, improved);
            
            // Property: Success rate improvement = positive increase
            expect(increase).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return negative increase when success rate degrades", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(0.2), max: Math.fround(1.0) }),
          fc.float({ min: Math.fround(0.01), max: Math.fround(0.1) }),
          (baseline, delta) => {
            fc.pre(Number.isFinite(baseline) && Number.isFinite(delta));
            
            const improved = Math.max(0, baseline - delta);
            const increase = trackSuccessRateIncrease(baseline, improved);
            
            // Property: Success rate degradation = negative increase
            expect(increase).toBeLessThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("calculateROI", () => {
    it("should always return valid ROI calculation", () => {
      fc.assert(
        fc.property(
          arbitraryPerformanceMetrics,
          arbitraryPerformanceMetrics,
          fc.float({ min: Math.fround(1), max: Math.fround(1000) }),
          fc.integer({ min: 1, max: 90 }),
          (baseline, improved, implementationCost, projectionDays) => {
            fc.pre(
              Number.isFinite(baseline.avgLatencyMs) &&
              Number.isFinite(baseline.avgCostCents) &&
              Number.isFinite(baseline.successRate) &&
              Number.isFinite(improved.avgLatencyMs) &&
              Number.isFinite(improved.avgCostCents) &&
              Number.isFinite(improved.successRate) &&
              Number.isFinite(implementationCost)
            );
            
            const roi = calculateROI(baseline, improved, implementationCost, projectionDays);
            
            // Property: All ROI fields should be defined and finite
            expect(roi.implementationCostCents).toBe(implementationCost);
            expect(Number.isFinite(roi.testingCostCents)).toBe(true);
            expect(Number.isFinite(roi.totalCostCents)).toBe(true);
            expect(Number.isFinite(roi.projectedSavingsCents)).toBe(true);
            expect(Number.isFinite(roi.projectedTimeGainMs)).toBe(true);
            expect(Number.isFinite(roi.projectedReliabilityGain)).toBe(true);
            expect(Number.isFinite(roi.roiPercent)).toBe(true);
            expect(Number.isFinite(roi.netBenefitCents)).toBe(true);
            
            // Property: Overall value score should be in [0, 100]
            expect(roi.overallValueScore).toBeGreaterThanOrEqual(0);
            expect(roi.overallValueScore).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have positive ROI when cost savings exceed implementation cost", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(10), max: Math.fround(100) }),
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.5) }),
          fc.integer({ min: 100, max: 1000 }),
          (baselineCost, reductionFactor, operations) => {
            fc.pre(Number.isFinite(baselineCost) && Number.isFinite(reductionFactor));
            
            const improvedCost = baselineCost * reductionFactor;
            const baseline = {
              avgLatencyMs: 1000,
              avgCostCents: baselineCost,
              successRate: 0.9,
              totalOperations: operations,
            };
            const improved = {
              avgLatencyMs: 500,
              avgCostCents: improvedCost,
              successRate: 0.95,
              totalOperations: operations,
            };
            
            const roi = calculateROI(baseline, improved, 10, 30);
            
            // Property: Significant cost reduction should yield positive ROI
            expect(roi.projectedSavingsCents).toBeGreaterThan(0);
            expect(roi.roiPercent).toBeGreaterThan(0);
            expect(roi.netBenefitCents).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should have payback period proportional to cost savings", () => {
      fc.assert(
        fc.property(
          fc.float({ min: Math.fround(10), max: Math.fround(100) }),
          fc.float({ min: Math.fround(0.5), max: Math.fround(0.9) }),
          fc.integer({ min: 100, max: 1000 }),
          (baselineCost, reductionFactor, operations) => {
            const improvedCost = baselineCost * reductionFactor;
            const baseline = {
              avgLatencyMs: 1000,
              avgCostCents: baselineCost,
              successRate: 0.9,
              totalOperations: operations,
            };
            const improved = {
              avgLatencyMs: 500,
              avgCostCents: improvedCost,
              successRate: 0.95,
              totalOperations: operations,
            };
            
            const roi = calculateROI(baseline, improved, 100, 30);
            
            // Property: Payback period should be positive and finite for cost-saving improvements
            if (improvedCost < baselineCost) {
              expect(roi.paybackPeriodDays).toBeGreaterThan(0);
              expect(Number.isFinite(roi.paybackPeriodDays)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate net benefit as savings minus costs", () => {
      fc.assert(
        fc.property(
          arbitraryPerformanceMetrics,
          arbitraryPerformanceMetrics,
          fc.float({ min: Math.fround(1), max: Math.fround(100) }),
          (baseline, improved, implementationCost) => {
            fc.pre(
              Number.isFinite(baseline.avgLatencyMs) &&
              Number.isFinite(baseline.avgCostCents) &&
              Number.isFinite(baseline.successRate) &&
              Number.isFinite(improved.avgLatencyMs) &&
              Number.isFinite(improved.avgCostCents) &&
              Number.isFinite(improved.successRate) &&
              Number.isFinite(implementationCost)
            );
            
            const roi = calculateROI(baseline, improved, implementationCost, 30);
            
            // Property: Net benefit = projected savings - total cost
            const expectedNetBenefit = roi.projectedSavingsCents - roi.totalCostCents;
            expect(Math.abs(roi.netBenefitCents - expectedNetBenefit)).toBeLessThan(0.1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("measureImpact - Property 71: Impact Measurement over 7 days", () => {
    it("should measure impact for any applied improvement over 7 days", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          arbitraryImpactMeasurementResult,
          fc.float({ min: Math.fround(1), max: Math.fround(100) }),
          (improvementId, agentId, impactResult, implementationCost) => {
            // Ensure measurement period is 7 days
            const result = { ...impactResult, measurementPeriodDays: 7 };
            
            const impact = measureImpact(improvementId, agentId, result, implementationCost);
            
            // Property: Impact should be measured over 7 days
            expect(impact.measurementPeriodDays).toBe(7);
            
            // Property: All core metrics should be calculated
            expect(typeof impact.performanceGainPercent).toBe("number");
            expect(typeof impact.costReductionPercent).toBe("number");
            expect(typeof impact.successRateIncrease).toBe("number");
            
            // Property: ROI should be calculated
            expect(impact.roi).toBeDefined();
            expect(impact.roi.roiPercent).toBeDefined();
            expect(impact.roi.paybackPeriodDays).toBeDefined();
            expect(impact.roi.netBenefitCents).toBeDefined();
            
            // Property: Baseline and improved metrics should be preserved
            expect(impact.baseline).toEqual(result.baseline);
            expect(impact.improved).toEqual(result.testPeriod);
            
            // Property: Validation status should match result
            expect(impact.validationStatus).toBe(result.validated ? "validated" : "rejected");
            
            // Property: Measurement timestamp should be recent
            expect(impact.measuredAt).toBeInstanceOf(Date);
            expect(impact.measuredAt.getTime()).toBeLessThanOrEqual(Date.now());
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should correctly identify validated vs rejected improvements", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          arbitraryPerformanceMetrics,
          arbitraryPerformanceMetrics,
          fc.boolean(),
          (improvementId, agentId, baseline, testPeriod, validated) => {
            const impactResult: ImpactMeasurementResult = {
              improvementId,
              measurementPeriodDays: 7,
              startDate: new Date(),
              endDate: new Date(),
              baseline,
              testPeriod,
              improvements: {
                speedImprovement: 0,
                costReduction: 0,
                reliabilityImprovement: 0,
              },
              dailyMeasurements: [],
              validated,
              validationReason: validated ? "Improvement validated" : "Improvement rejected",
            };
            
            const impact = measureImpact(improvementId, agentId, impactResult, 10);
            
            // Property: Validation status should match input
            expect(impact.validationStatus).toBe(validated ? "validated" : "rejected");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should track cumulative impact across multiple improvements", () => {
      fc.assert(
        fc.property(
          fc.array(arbitraryImpactMeasurementResult, { minLength: 2, maxLength: 10 }),
          fc.uuid(),
          (results, agentId) => {
            // Filter out results with NaN values
            const validResults = results.filter(r =>
              Number.isFinite(r.baseline.avgLatencyMs) &&
              Number.isFinite(r.baseline.avgCostCents) &&
              Number.isFinite(r.baseline.successRate) &&
              Number.isFinite(r.testPeriod.avgLatencyMs) &&
              Number.isFinite(r.testPeriod.avgCostCents) &&
              Number.isFinite(r.testPeriod.successRate)
            );
            
            fc.pre(validResults.length >= 2);
            
            const impacts = validResults.map((result, i) =>
              measureImpact(`imp-${i}`, agentId, { ...result, measurementPeriodDays: 7 }, 10)
            );
            
            // Property: Each impact should be independent
            expect(impacts.length).toBe(validResults.length);
            
            // Property: Can calculate cumulative metrics
            const totalPerformanceGain = impacts.reduce((sum, i) => sum + i.performanceGainPercent, 0);
            const totalCostReduction = impacts.reduce((sum, i) => sum + i.costReductionPercent, 0);
            const totalReliabilityGain = impacts.reduce((sum, i) => sum + i.successRateIncrease, 0);
            
            expect(Number.isFinite(totalPerformanceGain)).toBe(true);
            expect(Number.isFinite(totalCostReduction)).toBe(true);
            expect(Number.isFinite(totalReliabilityGain)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("compareImpacts", () => {
    it("should correctly identify best improvements across all categories", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              improvementId: fc.uuid(),
              agentId: fc.uuid(),
              measurementPeriodDays: fc.constant(7),
              performanceGainPercent: fc.float({ min: Math.fround(-50), max: Math.fround(100) }),
              costReductionPercent: fc.float({ min: Math.fround(-50), max: Math.fround(100) }),
              successRateIncrease: fc.float({ min: Math.fround(-20), max: Math.fround(20) }),
              baseline: arbitraryPerformanceMetrics,
              improved: arbitraryPerformanceMetrics,
              roi: fc.record({
                implementationCostCents: fc.float({ min: Math.fround(1), max: Math.fround(100) }),
                testingCostCents: fc.float({ min: Math.fround(1), max: Math.fround(1000) }),
                totalCostCents: fc.float({ min: Math.fround(2), max: Math.fround(1100) }),
                projectedSavingsCents: fc.float({ min: Math.fround(-1000), max: Math.fround(10000) }),
                projectedTimeGainMs: fc.float({ min: Math.fround(-10000), max: Math.fround(100000) }),
                projectedReliabilityGain: fc.float({ min: Math.fround(-20), max: Math.fround(20) }),
                roiPercent: fc.float({ min: Math.fround(-100), max: Math.fround(1000) }),
                paybackPeriodDays: fc.float({ min: Math.fround(0.1), max: Math.fround(365) }),
                netBenefitCents: fc.float({ min: Math.fround(-1000), max: Math.fround(10000) }),
                overallValueScore: fc.float({ min: Math.fround(0), max: Math.fround(100) }),
              }),
              measuredAt: fc.date(),
              validationStatus: fc.constantFrom("validated", "rejected", "pending") as fc.Arbitrary<"validated" | "rejected" | "pending">,
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (impacts) => {
            // Filter out impacts with NaN values
            const validImpacts = impacts.filter(i =>
              Number.isFinite(i.performanceGainPercent) &&
              Number.isFinite(i.costReductionPercent) &&
              Number.isFinite(i.successRateIncrease) &&
              Number.isFinite(i.roi.roiPercent) &&
              Number.isFinite(i.roi.overallValueScore)
            );
            
            fc.pre(validImpacts.length > 0);
            
            const comparison = compareImpacts(validImpacts);
            
            // Property: Best performance gain should have highest performance gain
            if (comparison.bestPerformanceGain) {
              const maxPerformanceGain = Math.max(...validImpacts.map(i => i.performanceGainPercent));
              expect(comparison.bestPerformanceGain.performanceGainPercent).toBe(maxPerformanceGain);
            }
            
            // Property: Best cost reduction should have highest cost reduction
            if (comparison.bestCostReduction) {
              const maxCostReduction = Math.max(...validImpacts.map(i => i.costReductionPercent));
              expect(comparison.bestCostReduction.costReductionPercent).toBe(maxCostReduction);
            }
            
            // Property: Best reliability gain should have highest reliability gain
            if (comparison.bestReliabilityGain) {
              const maxReliabilityGain = Math.max(...validImpacts.map(i => i.successRateIncrease));
              expect(comparison.bestReliabilityGain.successRateIncrease).toBe(maxReliabilityGain);
            }
            
            // Property: Best ROI should have highest ROI
            if (comparison.bestROI) {
              const maxROI = Math.max(...validImpacts.map(i => i.roi.roiPercent));
              expect(comparison.bestROI.roi.roiPercent).toBe(maxROI);
            }
            
            // Property: Best overall value should have highest value score
            if (comparison.bestOverallValue) {
              const maxValueScore = Math.max(...validImpacts.map(i => i.roi.overallValueScore));
              expect(comparison.bestOverallValue.roi.overallValueScore).toBe(maxValueScore);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle empty impacts array gracefully", () => {
      fc.assert(
        fc.property(fc.constant([]), (impacts) => {
          const comparison = compareImpacts(impacts);
          
          // Property: All best improvements should be null for empty array
          expect(comparison.bestPerformanceGain).toBeNull();
          expect(comparison.bestCostReduction).toBeNull();
          expect(comparison.bestReliabilityGain).toBeNull();
          expect(comparison.bestROI).toBeNull();
          expect(comparison.bestOverallValue).toBeNull();
        }),
        { numRuns: 10 }
      );
    });
  });

  describe("Impact measurement consistency", () => {
    it("should produce consistent results for identical inputs", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          arbitraryImpactMeasurementResult,
          fc.float({ min: Math.fround(1), max: Math.fround(100) }),
          (improvementId, agentId, impactResult, implementationCost) => {
            const result = { ...impactResult, measurementPeriodDays: 7 };
            
            const impact1 = measureImpact(improvementId, agentId, result, implementationCost);
            const impact2 = measureImpact(improvementId, agentId, result, implementationCost);
            
            // Property: Same inputs should produce same metrics (except timestamp)
            expect(impact1.performanceGainPercent).toBe(impact2.performanceGainPercent);
            expect(impact1.costReductionPercent).toBe(impact2.costReductionPercent);
            expect(impact1.successRateIncrease).toBe(impact2.successRateIncrease);
            expect(impact1.roi.roiPercent).toBe(impact2.roi.roiPercent);
            expect(impact1.roi.paybackPeriodDays).toBe(impact2.roi.paybackPeriodDays);
            expect(impact1.roi.netBenefitCents).toBe(impact2.roi.netBenefitCents);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should maintain metric relationships", () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          arbitraryPerformanceMetrics,
          arbitraryPerformanceMetrics,
          (improvementId, agentId, baseline, testPeriod) => {
            const impactResult: ImpactMeasurementResult = {
              improvementId,
              measurementPeriodDays: 7,
              startDate: new Date(),
              endDate: new Date(),
              baseline,
              testPeriod,
              improvements: {
                speedImprovement: 0,
                costReduction: 0,
                reliabilityImprovement: 0,
              },
              dailyMeasurements: [],
              validated: true,
              validationReason: "Test",
            };
            
            const impact = measureImpact(improvementId, agentId, impactResult, 10);
            
            // Property: Performance gain should match latency relationship
            const expectedPerformanceGain = trackPerformanceGain(
              baseline.avgLatencyMs,
              testPeriod.avgLatencyMs
            );
            expect(impact.performanceGainPercent).toBe(expectedPerformanceGain);
            
            // Property: Cost reduction should match cost relationship
            const expectedCostReduction = trackCostReduction(
              baseline.avgCostCents,
              testPeriod.avgCostCents
            );
            expect(impact.costReductionPercent).toBe(expectedCostReduction);
            
            // Property: Success rate increase should match success rate relationship
            const expectedSuccessRateIncrease = trackSuccessRateIncrease(
              baseline.successRate,
              testPeriod.successRate
            );
            expect(impact.successRateIncrease).toBe(expectedSuccessRateIncrease);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
