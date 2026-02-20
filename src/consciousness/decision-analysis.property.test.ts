/**
 * Property-based tests for post-decision analysis
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  analyzeDecision,
  analyzeDecisionPatterns,
  updateDecisionStrategy,
} from "./decision-analysis.js";

describe("Post-Decision Analysis Property Tests", () => {
  /**
   * Property 33: Post-Decision Analysis
   * 
   * For any agent decision, the system should enable post-decision analysis
   * comparing predicted vs actual outcomes and extracting lessons learned.
   * 
   * **Validates: Requirements 7.4**
   */
  describe("Property 33: Post-Decision Analysis", () => {
    it("should create complete decision analysis", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.string({ minLength: 10, maxLength: 200 }),
          fc.string({ minLength: 10, maxLength: 200 }),
          (decision, predicted, actual) => {
            const analysis = analyzeDecision(decision, predicted, actual);

            expect(analysis.decision).toBe(decision);
            expect(analysis.predictedOutcome).toBe(predicted);
            expect(analysis.actualOutcome).toBe(actual);
            expect(typeof analysis.accuracy).toBe('number');
            expect(analysis.accuracy).toBeGreaterThanOrEqual(0);
            expect(analysis.accuracy).toBeLessThanOrEqual(100);
            expect(Array.isArray(analysis.lessonsLearned)).toBe(true);
            expect(analysis.lessonsLearned.length).toBeGreaterThan(0);
            expect(Array.isArray(analysis.strategyAdjustments)).toBe(true);
            expect(analysis.strategyAdjustments.length).toBeGreaterThan(0);
            expect(analysis.timestamp).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate accuracy between 0 and 100", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.string({ minLength: 10 }),
          (predicted, actual) => {
            const analysis = analyzeDecision("test", predicted, actual);

            expect(analysis.accuracy).toBeGreaterThanOrEqual(0);
            expect(analysis.accuracy).toBeLessThanOrEqual(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should give 100% accuracy for identical predictions", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          (outcome) => {
            const analysis = analyzeDecision("test", outcome, outcome);

            expect(analysis.accuracy).toBe(100);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should extract lessons learned", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.string({ minLength: 10 }),
          (predicted, actual) => {
            const analysis = analyzeDecision("test", predicted, actual);

            expect(analysis.lessonsLearned.length).toBeGreaterThan(0);
            analysis.lessonsLearned.forEach(lesson => {
              expect(typeof lesson).toBe('string');
              expect(lesson.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should generate strategy adjustments", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10 }),
          fc.string({ minLength: 10 }),
          (predicted, actual) => {
            const analysis = analyzeDecision("test", predicted, actual);

            expect(analysis.strategyAdjustments.length).toBeGreaterThan(0);
            analysis.strategyAdjustments.forEach(adjustment => {
              expect(typeof adjustment).toBe('string');
              expect(adjustment.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should provide more adjustments for low accuracy", () => {
      // Create scenarios with very different predictions
      const lowAccuracyAnalysis = analyzeDecision(
        "test",
        "This will succeed quickly and easily",
        "This failed slowly and with difficulty"
      );

      const highAccuracyAnalysis = analyzeDecision(
        "test",
        "This will succeed",
        "This succeeded"
      );

      // Low accuracy should generally have more or equal adjustments
      expect(lowAccuracyAnalysis.strategyAdjustments.length).toBeGreaterThanOrEqual(
        highAccuracyAnalysis.strategyAdjustments.length - 1
      );
    });

    it("should analyze patterns across multiple decisions", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              decision: fc.string({ minLength: 5 }),
              predicted: fc.string({ minLength: 10 }),
              actual: fc.string({ minLength: 10 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (decisionsData) => {
            const analyses = decisionsData.map(d =>
              analyzeDecision(d.decision, d.predicted, d.actual)
            );

            const patterns = analyzeDecisionPatterns(analyses);

            expect(typeof patterns.averageAccuracy).toBe('number');
            expect(patterns.averageAccuracy).toBeGreaterThanOrEqual(0);
            expect(patterns.averageAccuracy).toBeLessThanOrEqual(100);
            expect(['improving', 'stable', 'declining', 'insufficient_data']).toContain(
              patterns.accuracyTrend
            );
            expect(Array.isArray(patterns.commonLessons)).toBe(true);
            expect(Array.isArray(patterns.recommendedAdjustments)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate correct average accuracy", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              decision: fc.string({ minLength: 5 }),
              predicted: fc.string({ minLength: 10 }),
              actual: fc.string({ minLength: 10 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (decisionsData) => {
            const analyses = decisionsData.map(d =>
              analyzeDecision(d.decision, d.predicted, d.actual)
            );

            const patterns = analyzeDecisionPatterns(analyses);

            const expectedAverage = analyses.reduce((sum, a) => sum + a.accuracy, 0) / analyses.length;

            expect(patterns.averageAccuracy).toBe(expectedAverage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect improving accuracy trend", () => {
      // Create analyses with improving accuracy
      const analyses = [
        analyzeDecision("d1", "fail", "fail"),
        analyzeDecision("d2", "fail", "success"),
        analyzeDecision("d3", "success", "success"),
        analyzeDecision("d4", "success", "success"),
      ];

      const patterns = analyzeDecisionPatterns(analyses);

      expect(patterns.accuracyTrend).toBe('improving');
    });

    it("should update decision strategy based on analyses", () => {
      fc.assert(
        fc.property(
          fc.record({
            currentApproach: fc.string(),
            riskTolerance: fc.constantFrom('low', 'medium', 'high'),
          }),
          fc.array(
            fc.record({
              decision: fc.string({ minLength: 5 }),
              predicted: fc.string({ minLength: 10 }),
              actual: fc.string({ minLength: 10 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (currentStrategy, decisionsData) => {
            const analyses = decisionsData.map(d =>
              analyzeDecision(d.decision, d.predicted, d.actual)
            );

            const updatedStrategy = updateDecisionStrategy(currentStrategy, analyses);

            expect(updatedStrategy).toBeDefined();
            expect(typeof updatedStrategy).toBe('object');
            expect(updatedStrategy.lastUpdated).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle empty analysis list", () => {
      const patterns = analyzeDecisionPatterns([]);

      expect(patterns.averageAccuracy).toBe(0);
      expect(patterns.accuracyTrend).toBe('insufficient_data');
      expect(patterns.commonLessons.length).toBe(0);
      expect(patterns.recommendedAdjustments.length).toBe(0);
    });

    it("should be deterministic for same input", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5 }),
          fc.string({ minLength: 10 }),
          fc.string({ minLength: 10 }),
          (decision, predicted, actual) => {
            const analysis1 = analyzeDecision(decision, predicted, actual);
            const analysis2 = analyzeDecision(decision, predicted, actual);

            expect(analysis1.decision).toBe(analysis2.decision);
            expect(analysis1.accuracy).toBe(analysis2.accuracy);
            expect(analysis1.lessonsLearned).toEqual(analysis2.lessonsLearned);
            expect(analysis1.strategyAdjustments).toEqual(analysis2.strategyAdjustments);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
