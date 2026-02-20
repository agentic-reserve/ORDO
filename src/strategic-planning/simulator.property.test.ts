/**
 * Property-Based Tests for Strategy Simulation
 * Feature: ordo-digital-civilization, Property 81: Strategy Simulation
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { simulateStrategies, SimulationContext } from './simulator';

describe('Property 81: Strategy Simulation', () => {
  // Arbitrary generator for SimulationContext
  const arbitrarySimulationContext = fc.record({
    agentId: fc.uuid(),
    goal: fc.string({ minLength: 10, maxLength: 100 }),
    currentBalance: fc.double({ min: 0.1, max: 100, noNaN: true }),
    currentSkills: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
    marketConditions: fc.option(
      fc.record({
        volatility: fc.double({ min: 0, max: 1, noNaN: true }),
        opportunities: fc.array(fc.string(), { maxLength: 5 }),
        threats: fc.array(fc.string(), { maxLength: 5 }),
      }),
      { nil: undefined }
    ),
  });

  it('should generate at least 3 alternative strategies', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context);
        
        // Property: Must generate at least 3 strategies
        expect(strategies.length).toBeGreaterThanOrEqual(3);
      }),
      { numRuns: 100 }
    );
  });

  it('should generate the requested number of strategies', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitrarySimulationContext,
        fc.integer({ min: 3, max: 10 }),
        async (context, numStrategies) => {
          const strategies = await simulateStrategies(context, numStrategies);
          
          // Property: Should generate exactly the requested number
          expect(strategies.length).toBe(numStrategies);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have unique strategy IDs', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context);
        
        // Property: All strategy IDs should be unique
        const ids = strategies.map(s => s.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      }),
      { numRuns: 100 }
    );
  });

  it('should include simulated outcomes for each strategy', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context);
        
        // Property: Each strategy must have a simulated outcome
        for (const strategy of strategies) {
          expect(strategy.simulatedOutcome).toBeDefined();
          expect(strategy.simulatedOutcome.successProbability).toBeDefined();
          expect(strategy.simulatedOutcome.expectedValue).toBeDefined();
          expect(strategy.simulatedOutcome.expectedDuration).toBeDefined();
          expect(strategy.simulatedOutcome.risks).toBeDefined();
          expect(strategy.simulatedOutcome.opportunities).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should have valid success probabilities', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context);
        
        // Property: Success probability must be between 0 and 1
        for (const strategy of strategies) {
          expect(strategy.simulatedOutcome.successProbability).toBeGreaterThanOrEqual(0);
          expect(strategy.simulatedOutcome.successProbability).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should have non-negative expected durations', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context);
        
        // Property: Expected duration must be non-negative
        for (const strategy of strategies) {
          expect(strategy.simulatedOutcome.expectedDuration).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should include risks and opportunities', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context);
        
        // Property: Each strategy should have risks and opportunities arrays
        for (const strategy of strategies) {
          expect(Array.isArray(strategy.simulatedOutcome.risks)).toBe(true);
          expect(Array.isArray(strategy.simulatedOutcome.opportunities)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should have valid risk probabilities and impacts', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context);
        
        // Property: All risk probabilities should be between 0 and 1
        // Property: All risk impacts should be negative
        for (const strategy of strategies) {
          for (const risk of strategy.simulatedOutcome.risks) {
            expect(risk.probability).toBeGreaterThanOrEqual(0);
            expect(risk.probability).toBeLessThanOrEqual(1);
            expect(risk.impact).toBeLessThanOrEqual(0);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should have valid opportunity probabilities and impacts', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context);
        
        // Property: All opportunity probabilities should be between 0 and 1
        // Property: All opportunity impacts should be positive
        for (const strategy of strategies) {
          for (const opportunity of strategy.simulatedOutcome.opportunities) {
            expect(opportunity.probability).toBeGreaterThanOrEqual(0);
            expect(opportunity.probability).toBeLessThanOrEqual(1);
            expect(opportunity.impact).toBeGreaterThanOrEqual(0);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should have different strategies with varying characteristics', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context, 3);
        
        // Property: Strategies should have different characteristics
        // Check that at least some strategies differ in their plans
        const uniquePlans = new Set(strategies.map(s => s.plan.id));
        expect(uniquePlans.size).toBeGreaterThan(1);
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve agent ID across all strategies', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context);
        
        // Property: All strategies should have the same agent ID
        for (const strategy of strategies) {
          expect(strategy.plan.agentId).toBe(context.agentId);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should preserve goal across all strategies', async () => {
    await fc.assert(
      fc.asyncProperty(arbitrarySimulationContext, async (context) => {
        const strategies = await simulateStrategies(context);
        
        // Property: All strategies should have the same goal
        for (const strategy of strategies) {
          expect(strategy.plan.goal).toBe(context.goal);
        }
      }),
      { numRuns: 100 }
    );
  });
});
