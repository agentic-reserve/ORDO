/**
 * Property-based tests for thinking process examination
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  examineThinking,
  createReasoningStep,
  createAlternative,
  createSelectionCriterion,
  analyzeThinkingProcess,
  compareThinkingProcesses,
  extractLessons,
} from "./thinking-examination.js";

describe("Thinking Process Examination Property Tests", () => {
  /**
   * Property 32: Thinking Process Examination
   * 
   * For any agent decision, the system should enable examination of
   * the thinking process including reasoning steps, alternatives considered,
   * and selection criteria.
   * 
   * **Validates: Requirements 7.3**
   */
  describe("Property 32: Thinking Process Examination", () => {
    it("should create complete thinking process record", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.array(
            fc.record({
              step: fc.integer({ min: 1, max: 10 }),
              thought: fc.string({ minLength: 5 }),
              evidence: fc.array(fc.string({ minLength: 3 }), { minLength: 0, maxLength: 5 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.array(
            fc.record({
              option: fc.string({ minLength: 5 }),
              pros: fc.array(fc.string({ minLength: 3 }), { minLength: 0, maxLength: 5 }),
              cons: fc.array(fc.string({ minLength: 3 }), { minLength: 0, maxLength: 5 }),
              expectedOutcome: fc.string({ minLength: 5 }),
            }),
            { minLength: 0, maxLength: 5 }
          ),
          fc.array(
            fc.record({
              criterion: fc.string({ minLength: 3 }),
              weight: fc.double({ min: 0, max: 1, noNaN: true }),
              rationale: fc.string({ minLength: 5 }),
            }),
            { minLength: 0, maxLength: 5 }
          ),
          (decision, reasoningSteps, alternatives, criteria) => {
            const thinkingProcess = examineThinking(
              decision,
              reasoningSteps,
              alternatives,
              criteria
            );

            expect(thinkingProcess.decision).toBe(decision);
            expect(thinkingProcess.reasoningSteps).toEqual(reasoningSteps);
            expect(thinkingProcess.alternativesConsidered).toEqual(alternatives);
            expect(thinkingProcess.selectionCriteria).toEqual(criteria);
            expect(thinkingProcess.timestamp).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should track reasoning steps with evidence", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.string({ minLength: 5 }),
          fc.array(fc.string({ minLength: 3 }), { minLength: 1, maxLength: 5 }),
          (step, thought, evidence) => {
            const reasoningStep = createReasoningStep(step, thought, evidence);

            expect(reasoningStep.step).toBe(step);
            expect(reasoningStep.thought).toBe(thought);
            expect(reasoningStep.evidence).toEqual(evidence);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should track alternatives with pros and cons", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5 }),
          fc.array(fc.string({ minLength: 3 }), { minLength: 0, maxLength: 5 }),
          fc.array(fc.string({ minLength: 3 }), { minLength: 0, maxLength: 5 }),
          fc.string({ minLength: 5 }),
          (option, pros, cons, expectedOutcome) => {
            const alternative = createAlternative(option, pros, cons, expectedOutcome);

            expect(alternative.option).toBe(option);
            expect(alternative.pros).toEqual(pros);
            expect(alternative.cons).toEqual(cons);
            expect(alternative.expectedOutcome).toBe(expectedOutcome);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should track selection criteria with weights", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 3 }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.string({ minLength: 5 }),
          (criterion, weight, rationale) => {
            const selectionCriterion = createSelectionCriterion(criterion, weight, rationale);

            expect(selectionCriterion.criterion).toBe(criterion);
            expect(selectionCriterion.weight).toBe(weight);
            expect(selectionCriterion.rationale).toBe(rationale);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject invalid criterion weights", () => {
      expect(() => createSelectionCriterion("test", -0.1, "rationale")).toThrow();
      expect(() => createSelectionCriterion("test", 1.1, "rationale")).toThrow();
    });

    it("should analyze thinking process depth", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              step: fc.integer({ min: 1 }),
              thought: fc.string({ minLength: 5 }),
              evidence: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (reasoningSteps) => {
            const thinkingProcess = examineThinking(
              "test decision",
              reasoningSteps,
              [],
              []
            );

            const analysis = analyzeThinkingProcess(thinkingProcess);

            expect(analysis.reasoningDepth).toBe(reasoningSteps.length);
            expect(analysis.insights).toBeDefined();
            expect(Array.isArray(analysis.insights)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate average evidence per step", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              step: fc.integer({ min: 1 }),
              thought: fc.string({ minLength: 5 }),
              evidence: fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (reasoningSteps) => {
            const thinkingProcess = examineThinking(
              "test decision",
              reasoningSteps,
              [],
              []
            );

            const analysis = analyzeThinkingProcess(thinkingProcess);

            const totalEvidence = reasoningSteps.reduce(
              (sum, step) => sum + step.evidence.length,
              0
            );
            const expectedAverage = totalEvidence / reasoningSteps.length;

            expect(analysis.averageEvidencePerStep).toBe(expectedAverage);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should identify most weighted criterion", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              criterion: fc.string({ minLength: 3 }),
              weight: fc.double({ min: 0, max: 1, noNaN: true }),
              rationale: fc.string({ minLength: 5 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (criteria) => {
            const thinkingProcess = examineThinking(
              "test decision",
              [],
              [],
              criteria
            );

            const analysis = analyzeThinkingProcess(thinkingProcess);

            if (criteria.length > 0) {
              const maxWeight = Math.max(...criteria.map(c => c.weight));
              expect(analysis.mostWeightedCriterion).toBeDefined();
              expect(analysis.mostWeightedCriterion!.weight).toBe(maxWeight);
            } else {
              expect(analysis.mostWeightedCriterion).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should compare multiple thinking processes", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              decision: fc.string({ minLength: 5 }),
              reasoningSteps: fc.array(
                fc.record({
                  step: fc.integer({ min: 1 }),
                  thought: fc.string({ minLength: 5 }),
                  evidence: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
                }),
                { minLength: 1, maxLength: 5 }
              ),
              alternatives: fc.array(
                fc.record({
                  option: fc.string({ minLength: 5 }),
                  pros: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
                  cons: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
                  expectedOutcome: fc.string({ minLength: 5 }),
                }),
                { minLength: 0, maxLength: 3 }
              ),
              criteria: fc.array(
                fc.record({
                  criterion: fc.string({ minLength: 3 }),
                  weight: fc.double({ min: 0, max: 1, noNaN: true }),
                  rationale: fc.string({ minLength: 5 }),
                }),
                { minLength: 0, maxLength: 3 }
              ),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (processesData) => {
            const processes = processesData.map(p =>
              examineThinking(p.decision, p.reasoningSteps, p.alternatives, p.criteria)
            );

            const comparison = compareThinkingProcesses(processes);

            expect(typeof comparison.averageReasoningDepth).toBe('number');
            expect(typeof comparison.averageAlternatives).toBe('number');
            expect(Array.isArray(comparison.commonCriteria)).toBe(true);
            expect(['improving', 'stable', 'declining', 'insufficient_data']).toContain(
              comparison.improvementTrend
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should extract lessons from thinking process", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5 }),
          fc.array(
            fc.record({
              step: fc.integer({ min: 1 }),
              thought: fc.string({ minLength: 5 }),
              evidence: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (decision, reasoningSteps) => {
            const thinkingProcess = examineThinking(decision, reasoningSteps, [], []);
            const lessons = extractLessons(thinkingProcess);

            expect(Array.isArray(lessons)).toBe(true);
            expect(lessons.length).toBeGreaterThan(0);
            lessons.forEach(lesson => {
              expect(typeof lesson).toBe('string');
              expect(lesson.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle empty thinking process", () => {
      const thinkingProcess = examineThinking("test", [], [], []);
      const analysis = analyzeThinkingProcess(thinkingProcess);

      expect(analysis.reasoningDepth).toBe(0);
      expect(analysis.alternativesCount).toBe(0);
      expect(analysis.criteriaCount).toBe(0);
      expect(analysis.totalEvidence).toBe(0);
      expect(analysis.averageEvidencePerStep).toBe(0);
      expect(analysis.mostWeightedCriterion).toBeNull();
    });

    it("should handle empty process list in comparison", () => {
      const comparison = compareThinkingProcesses([]);

      expect(comparison.averageReasoningDepth).toBe(0);
      expect(comparison.averageAlternatives).toBe(0);
      expect(comparison.commonCriteria.length).toBe(0);
      expect(comparison.improvementTrend).toBe('insufficient_data');
    });
  });
});
