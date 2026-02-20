/**
 * Property-Based Tests for Plan Evaluation
 * Feature: ordo-digital-civilization, Property 82: Plan Evaluation
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluatePlan, EvaluationContext, AgentGoals } from './evaluator';
import { planAhead, PlanningContext } from './planner';

describe('Property 82: Plan Evaluation', () => {
  // Arbitrary generator for AgentGoals
  const arbitraryAgentGoals = fc.record({
    shortTerm: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
    mediumTerm: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
    longTerm: fc.array(fc.string({ minLength: 5, maxLength: 30 }), { minLength: 1, maxLength: 3 }),
    values: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
  });

  // Arbitrary generator for EvaluationContext
  const arbitraryEvaluationContext = fc.record({
    agentGoals: arbitraryAgentGoals,
    humanValues: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
    currentBalance: fc.double({ min: 0.1, max: 100, noNaN: true }),
    riskTolerance: fc.constantFrom('low', 'medium', 'high'),
  });

  // Arbitrary generator for PlanningContext
  const arbitraryPlanningContext = fc.record({
    agentId: fc.uuid(),
    goal: fc.string({ minLength: 10, maxLength: 100 }),
    currentBalance: fc.double({ min: 0.1, max: 100, noNaN: true }),
    currentSkills: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
  });

  it('should evaluate plans with expected value calculation', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: Expected value should be defined and match plan's expected value
          expect(evaluation.expectedValue).toBeDefined();
          expect(evaluation.expectedValue).toBe(plan.expectedValue);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should assess risk level', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: Risk level should be one of the valid values
          const validRiskLevels = ['low', 'medium', 'high', 'critical'];
          expect(validRiskLevels).toContain(evaluation.riskLevel);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have alignment scores between 0 and 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: All alignment scores should be in valid range
          expect(evaluation.alignmentScore).toBeGreaterThanOrEqual(0);
          expect(evaluation.alignmentScore).toBeLessThanOrEqual(100);
          expect(evaluation.goalsAlignment).toBeGreaterThanOrEqual(0);
          expect(evaluation.goalsAlignment).toBeLessThanOrEqual(100);
          expect(evaluation.humanValuesAlignment).toBeGreaterThanOrEqual(0);
          expect(evaluation.humanValuesAlignment).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have feasibility score between 0 and 100', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: Feasibility should be in valid range
          expect(evaluation.feasibility).toBeGreaterThanOrEqual(0);
          expect(evaluation.feasibility).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should make valid recommendations', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: Recommendation should be one of the valid values
          const validRecommendations = ['approve', 'reject', 'revise'];
          expect(validRecommendations).toContain(evaluation.recommendation);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide reasoning for recommendations', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: Reasoning should be a non-empty string
          expect(evaluation.reasoning).toBeDefined();
          expect(typeof evaluation.reasoning).toBe('string');
          expect(evaluation.reasoning.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve plan ID in evaluation', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: Evaluation should preserve the plan ID
          expect(evaluation.planId).toBe(plan.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject plans with low alignment scores', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: Plans with alignment < 95 should be rejected
          if (evaluation.alignmentScore < 95 || evaluation.humanValuesAlignment < 95) {
            expect(evaluation.recommendation).toBe('reject');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject plans with negative expected value', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: Plans with negative expected value should be rejected
          if (evaluation.expectedValue < 0) {
            expect(evaluation.recommendation).toBe('reject');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should consider risk tolerance in evaluation', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: Critical risk plans should be rejected/revised for low risk tolerance
          if (evaluation.riskLevel === 'critical' && evalContext.riskTolerance === 'low') {
            expect(evaluation.recommendation).not.toBe('approve');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have consistent evaluation criteria', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryEvaluationContext,
        async (planContext, evalContext) => {
          const plan = await planAhead(planContext);
          const evaluation = await evaluatePlan(plan, evalContext);
          
          // Property: All evaluation criteria should be defined
          expect(evaluation.expectedValue).toBeDefined();
          expect(evaluation.riskLevel).toBeDefined();
          expect(evaluation.alignmentScore).toBeDefined();
          expect(evaluation.goalsAlignment).toBeDefined();
          expect(evaluation.humanValuesAlignment).toBeDefined();
          expect(evaluation.feasibility).toBeDefined();
          expect(evaluation.recommendation).toBeDefined();
          expect(evaluation.reasoning).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });
});
