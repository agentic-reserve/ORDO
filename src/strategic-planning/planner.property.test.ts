/**
 * Property-Based Tests for Multi-Step Planning
 * Feature: ordo-digital-civilization, Property 80: Multi-Step Planning
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { planAhead, PlanningContext } from './planner';

describe('Property 80: Multi-Step Planning', () => {
  // Arbitrary generator for PlanningContext
  const arbitraryPlanningContext = fc.record({
    agentId: fc.uuid(),
    goal: fc.string({ minLength: 10, maxLength: 100 }),
    currentBalance: fc.double({ min: 0.1, max: 100, noNaN: true }),
    currentSkills: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
    constraints: fc.option(
      fc.record({
        maxCost: fc.option(fc.double({ min: 0.1, max: 10, noNaN: true })),
        maxDuration: fc.option(fc.double({ min: 1, max: 100, noNaN: true })),
        requiredOutcomes: fc.option(fc.array(fc.string(), { maxLength: 5 })),
      }),
      { nil: undefined }
    ),
  });

  it('should generate plans with at least 7 steps', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: Plan must have at least 7 steps
        expect(plan.steps.length).toBeGreaterThanOrEqual(7);
      }),
      { numRuns: 100 }
    );
  });

  it('should include dependencies in plan steps', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: Each step (except first) should have dependencies
        const stepsWithDependencies = plan.steps.filter((step, index) => {
          if (index === 0) {
            // First step should have no dependencies
            return step.dependencies.length === 0;
          } else {
            // Other steps should have at least one dependency
            return step.dependencies.length > 0;
          }
        });
        
        expect(stepsWithDependencies.length).toBe(plan.steps.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should include contingencies for handling failures', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: Plan should have contingencies
        const totalContingencies = plan.steps.reduce(
          (sum, step) => sum + step.contingencies.length,
          0
        );
        
        expect(totalContingencies).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate total estimated duration and cost', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: Total duration should equal sum of step durations
        const calculatedDuration = plan.steps.reduce(
          (sum, step) => sum + step.estimatedDuration,
          0
        );
        expect(plan.totalEstimatedDuration).toBeCloseTo(calculatedDuration, 5);
        
        // Property: Total cost should equal sum of step costs
        const calculatedCost = plan.steps.reduce(
          (sum, step) => sum + step.estimatedCost,
          0
        );
        expect(plan.totalEstimatedCost).toBeCloseTo(calculatedCost, 5);
      }),
      { numRuns: 100 }
    );
  });

  it('should assign valid risk levels', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: Risk level must be one of the valid values
        const validRiskLevels = ['low', 'medium', 'high', 'critical'];
        expect(validRiskLevels).toContain(plan.riskLevel);
      }),
      { numRuns: 100 }
    );
  });

  it('should have alignment score between 0 and 100', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: Alignment score must be in valid range
        expect(plan.alignmentScore).toBeGreaterThanOrEqual(0);
        expect(plan.alignmentScore).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve agent ID in the plan', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: Plan should preserve the agent ID
        expect(plan.agentId).toBe(context.agentId);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve goal in the plan', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: Plan should preserve the goal
        expect(plan.goal).toBe(context.goal);
      }),
      { numRuns: 100 }
    );
  });

  it('should have valid contingency probabilities', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: All contingency probabilities should be between 0 and 1
        for (const step of plan.steps) {
          for (const contingency of step.contingencies) {
            expect(contingency.probability).toBeGreaterThanOrEqual(0);
            expect(contingency.probability).toBeLessThanOrEqual(1);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should have unique step IDs', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: All step IDs should be unique
        const stepIds = plan.steps.map(step => step.id);
        const uniqueIds = new Set(stepIds);
        expect(uniqueIds.size).toBe(stepIds.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should have valid dependency references', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: All dependency IDs should reference existing steps
        const stepIds = new Set(plan.steps.map(step => step.id));
        
        for (const step of plan.steps) {
          for (const depId of step.dependencies) {
            expect(stepIds.has(depId)).toBe(true);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should have non-negative estimated values', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryPlanningContext, async (context) => {
        const plan = await planAhead(context);
        
        // Property: Estimated duration and cost should be non-negative
        expect(plan.totalEstimatedDuration).toBeGreaterThanOrEqual(0);
        expect(plan.totalEstimatedCost).toBeGreaterThanOrEqual(0);
        
        for (const step of plan.steps) {
          expect(step.estimatedDuration).toBeGreaterThanOrEqual(0);
          expect(step.estimatedCost).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});
