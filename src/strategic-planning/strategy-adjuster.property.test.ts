/**
 * Property-Based Tests for Strategy Adjustment
 * Feature: ordo-digital-civilization, Property 85: Strategy Adjustment
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  adjustStrategyIfNeeded,
  getAdjustmentRecommendation,
} from './strategy-adjuster';
import { planAhead, PlanningContext } from './planner';
import { trackPlanningAccuracy, ActualOutcome } from './accuracy-tracker';

describe('Property 85: Strategy Adjustment', () => {
  // Arbitrary generator for ActualOutcome
  const arbitraryActualOutcome = fc.record({
    value: fc.double({ min: -5, max: 10, noNaN: true }),
    duration: fc.double({ min: 1, max: 200, noNaN: true }),
    success: fc.boolean(),
  });

  // Arbitrary generator for PlanningContext
  const arbitraryPlanningContext = fc.record({
    agentId: fc.uuid(),
    goal: fc.string({ minLength: 10, maxLength: 100 }),
    currentBalance: fc.double({ min: 0.1, max: 100, noNaN: true }),
    currentSkills: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
  });

  it('should detect forecast errors > 20%', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryActualOutcome,
        fc.date(),
        fc.date(),
        async (planContext, actualOutcome, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          const adjustment = await adjustStrategyIfNeeded(accuracy, plan, planContext);
          
          // Property: Should adjust if error > 20%, not adjust if error <= 20%
          if (accuracy.errorRate > 20) {
            expect(adjustment).not.toBeNull();
          } else {
            expect(adjustment).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide adjustment when error exceeds threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        fc.date(),
        fc.date(),
        async (planContext, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          
          // Create an outcome with high error
          const actualOutcome: ActualOutcome = {
            value: plan.expectedValue * 0.3, // 70% error in value
            duration: plan.totalEstimatedDuration * 2, // 100% error in duration
            success: false,
          };
          
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          const adjustment = await adjustStrategyIfNeeded(accuracy, plan, planContext);
          
          // Property: Should provide adjustment for high error
          expect(adjustment).not.toBeNull();
          if (adjustment) {
            expect(adjustment.forecastError).toBeGreaterThan(20);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should classify adjustment type correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        fc.date(),
        fc.date(),
        async (planContext, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          
          // Create outcome with very high error
          const actualOutcome: ActualOutcome = {
            value: plan.expectedValue * 0.2, // 80% error
            duration: plan.totalEstimatedDuration * 3,
            success: false,
          };
          
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          const adjustment = await adjustStrategyIfNeeded(accuracy, plan, planContext);
          
          // Property: Adjustment type should be valid
          if (adjustment) {
            const validTypes = ['minor', 'major', 'complete_revision'];
            expect(validTypes).toContain(adjustment.adjustmentType);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide reason for adjustment', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        fc.date(),
        fc.date(),
        async (planContext, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          
          const actualOutcome: ActualOutcome = {
            value: plan.expectedValue * 0.4,
            duration: plan.totalEstimatedDuration * 1.8,
            success: false,
          };
          
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          const adjustment = await adjustStrategyIfNeeded(accuracy, plan, planContext);
          
          // Property: Adjustment should include reason
          if (adjustment) {
            expect(adjustment.reason).toBeDefined();
            expect(typeof adjustment.reason).toBe('string');
            expect(adjustment.reason.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve agent ID in adjustment', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        fc.date(),
        fc.date(),
        async (planContext, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          
          const actualOutcome: ActualOutcome = {
            value: plan.expectedValue * 0.3,
            duration: plan.totalEstimatedDuration * 2,
            success: false,
          };
          
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          const adjustment = await adjustStrategyIfNeeded(accuracy, plan, planContext);
          
          // Property: Should preserve agent ID
          if (adjustment) {
            expect(adjustment.agentId).toBe(planContext.agentId);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include original and adjusted strategies', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        fc.date(),
        fc.date(),
        async (planContext, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          
          const actualOutcome: ActualOutcome = {
            value: plan.expectedValue * 0.3,
            duration: plan.totalEstimatedDuration * 2,
            success: false,
          };
          
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          const adjustment = await adjustStrategyIfNeeded(accuracy, plan, planContext);
          
          // Property: Should include both strategies
          if (adjustment) {
            expect(adjustment.originalStrategy).toBeDefined();
            expect(adjustment.adjustedStrategy).toBeDefined();
            expect(typeof adjustment.originalStrategy).toBe('string');
            expect(typeof adjustment.adjustedStrategy).toBe('string');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide adjustment recommendations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.tuple(arbitraryPlanningContext, arbitraryActualOutcome, fc.date(), fc.date()),
          { minLength: 1, maxLength: 10 }
        ),
        async (testCases) => {
          const records = await Promise.all(
            testCases.map(async ([planContext, actualOutcome, executedAt, completedAt]) => {
              const plan = await planAhead(planContext);
              return trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
            })
          );
          
          const recommendation = getAdjustmentRecommendation(records);
          
          // Property: Recommendation should have valid structure
          expect(recommendation.shouldAdjust).toBeDefined();
          expect(typeof recommendation.shouldAdjust).toBe('boolean');
          expect(recommendation.reason).toBeDefined();
          expect(Array.isArray(recommendation.recommendedChanges)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should recommend adjustment for high average error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(arbitraryPlanningContext, { minLength: 3, maxLength: 5 }),
        fc.date(),
        fc.date(),
        async (agentId, planContexts, executedAt, completedAt) => {
          // Create records with high error
          const records = await Promise.all(
            planContexts.map(async (planContext) => {
              const plan = await planAhead({ ...planContext, agentId });
              const actualOutcome: ActualOutcome = {
                value: plan.expectedValue * 0.3, // High error
                duration: plan.totalEstimatedDuration * 2,
                success: false,
              };
              return trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
            })
          );
          
          const recommendation = getAdjustmentRecommendation(records);
          
          // Property: Should recommend adjustment for high error
          expect(recommendation.shouldAdjust).toBe(true);
          expect(recommendation.recommendedChanges.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty records gracefully', () => {
    const recommendation = getAdjustmentRecommendation([]);
    
    // Property: Should handle empty array
    expect(recommendation.shouldAdjust).toBe(false);
    expect(recommendation.reason).toBe('No accuracy records available');
  });

  it('should include forecast error in adjustment', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        fc.date(),
        fc.date(),
        async (planContext, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          
          const actualOutcome: ActualOutcome = {
            value: plan.expectedValue * 0.3,
            duration: plan.totalEstimatedDuration * 2,
            success: false,
          };
          
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          const adjustment = await adjustStrategyIfNeeded(accuracy, plan, planContext);
          
          // Property: Should include forecast error
          if (adjustment) {
            expect(adjustment.forecastError).toBeDefined();
            expect(adjustment.forecastError).toBe(accuracy.errorRate);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
