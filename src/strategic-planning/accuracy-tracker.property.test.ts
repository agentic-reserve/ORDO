/**
 * Property-Based Tests for Planning Accuracy Tracking
 * Feature: ordo-digital-civilization, Property 84: Planning Accuracy Tracking
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  trackPlanningAccuracy,
  calculateAverageAccuracy,
  analyzeAccuracyHistory,
  ActualOutcome,
} from './accuracy-tracker';
import { planAhead, PlanningContext } from './planner';

describe('Property 84: Planning Accuracy Tracking', () => {
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

  it('should track predicted vs actual outcomes', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryActualOutcome,
        fc.date(),
        fc.date(),
        async (planContext, actualOutcome, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          
          // Property: Should track both predicted and actual outcomes
          expect(accuracy.predictedOutcome).toBeDefined();
          expect(accuracy.actualOutcome).toBeDefined();
          expect(accuracy.predictedOutcome.value).toBe(plan.expectedValue);
          expect(accuracy.actualOutcome).toEqual(actualOutcome);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate error rate', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryActualOutcome,
        fc.date(),
        fc.date(),
        async (planContext, actualOutcome, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          
          // Property: Error rate should be non-negative
          expect(accuracy.errorRate).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve plan and agent IDs', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryActualOutcome,
        fc.date(),
        fc.date(),
        async (planContext, actualOutcome, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          
          // Property: Should preserve plan and agent IDs
          expect(accuracy.planId).toBe(plan.id);
          expect(accuracy.agentId).toBe(plan.agentId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve execution timestamps', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryActualOutcome,
        fc.date(),
        fc.date(),
        async (planContext, actualOutcome, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          
          // Property: Should preserve timestamps
          expect(accuracy.executedAt).toEqual(executedAt);
          expect(accuracy.completedAt).toEqual(completedAt);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate average accuracy correctly', async () => {
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
          
          const avgMetrics = calculateAverageAccuracy(records);
          
          // Property: Average metrics should be non-negative
          expect(avgMetrics.avgErrorRate).toBeGreaterThanOrEqual(0);
          expect(avgMetrics.avgValueError).toBeGreaterThanOrEqual(0);
          expect(avgMetrics.avgDurationError).toBeGreaterThanOrEqual(0);
          
          // Property: Success rate should be between 0 and 1
          expect(avgMetrics.successRate).toBeGreaterThanOrEqual(0);
          expect(avgMetrics.successRate).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle empty records gracefully', () => {
    const avgMetrics = calculateAverageAccuracy([]);
    
    // Property: Should return zero metrics for empty array
    expect(avgMetrics.avgErrorRate).toBe(0);
    expect(avgMetrics.avgValueError).toBe(0);
    expect(avgMetrics.avgDurationError).toBe(0);
    expect(avgMetrics.successRate).toBe(0);
  });

  it('should analyze accuracy history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.tuple(arbitraryPlanningContext, arbitraryActualOutcome, fc.date(), fc.date()),
          { minLength: 1, maxLength: 15 }
        ),
        async (agentId, testCases) => {
          // Create records for the specific agent
          const records = await Promise.all(
            testCases.map(async ([planContext, actualOutcome, executedAt, completedAt]) => {
              const plan = await planAhead({ ...planContext, agentId });
              return trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
            })
          );
          
          const history = analyzeAccuracyHistory(agentId, records);
          
          // Property: History should have correct agent ID
          expect(history.agentId).toBe(agentId);
          
          // Property: Total plans should match records length
          expect(history.totalPlans).toBe(records.length);
          
          // Property: Trend should be valid
          const validTrends = ['improving', 'stable', 'declining'];
          expect(validTrends).toContain(history.trend);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should limit recent accuracy to last 10 records', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(
          fc.tuple(arbitraryPlanningContext, arbitraryActualOutcome, fc.date(), fc.date()),
          { minLength: 11, maxLength: 20 }
        ),
        async (agentId, testCases) => {
          const records = await Promise.all(
            testCases.map(async ([planContext, actualOutcome, executedAt, completedAt]) => {
              const plan = await planAhead({ ...planContext, agentId });
              return trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
            })
          );
          
          const history = analyzeAccuracyHistory(agentId, records);
          
          // Property: Recent accuracy should have at most 10 records
          expect(history.recentAccuracy.length).toBeLessThanOrEqual(10);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid success probability', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryActualOutcome,
        fc.date(),
        fc.date(),
        async (planContext, actualOutcome, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          
          // Property: Success probability should be between 0 and 1
          expect(accuracy.predictedOutcome.successProbability).toBeGreaterThanOrEqual(0);
          expect(accuracy.predictedOutcome.successProbability).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should calculate error rate as percentage', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryPlanningContext,
        arbitraryActualOutcome,
        fc.date(),
        fc.date(),
        async (planContext, actualOutcome, executedAt, completedAt) => {
          const plan = await planAhead(planContext);
          const accuracy = await trackPlanningAccuracy(plan, actualOutcome, executedAt, completedAt);
          
          // Property: Error rate should be a reasonable percentage (0-1000%)
          // Very high error rates are possible if predictions are very wrong
          expect(accuracy.errorRate).toBeGreaterThanOrEqual(0);
          expect(accuracy.errorRate).toBeLessThan(10000); // Sanity check
        }
      ),
      { numRuns: 100 }
    );
  });
});
