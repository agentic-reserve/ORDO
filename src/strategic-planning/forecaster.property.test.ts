/**
 * Property-Based Tests for Future State Forecasting
 * Feature: ordo-digital-civilization, Property 83: Future State Forecasting
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { forecastFutureState, CurrentAgentState, ForecastingContext } from './forecaster';
import { planAhead, PlanningContext } from './planner';

describe('Property 83: Future State Forecasting', () => {
  // Arbitrary generator for CurrentAgentState
  const arbitraryCurrentAgentState = fc.record({
    agentId: fc.uuid(),
    balance: fc.double({ min: 0.1, max: 100, noNaN: true }),
    tier: fc.constantFrom('thriving', 'normal', 'low', 'critical'),
    fitness: fc.double({ min: 0, max: 100, noNaN: true }),
    reputation: fc.double({ min: 0, max: 100, noNaN: true }),
    recentEarnings: fc.array(fc.double({ min: 0, max: 5, noNaN: true }), { minLength: 7, maxLength: 7 }),
    recentCosts: fc.array(fc.double({ min: 0, max: 3, noNaN: true }), { minLength: 7, maxLength: 7 }),
  });

  // Arbitrary generator for PlanningContext
  const arbitraryPlanningContext = fc.record({
    agentId: fc.uuid(),
    goal: fc.string({ minLength: 10, maxLength: 100 }),
    currentBalance: fc.double({ min: 0.1, max: 100, noNaN: true }),
    currentSkills: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 1, maxLength: 10 }),
  });

  it('should project future states 7 days ahead', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCurrentAgentState,
        fc.array(arbitraryPlanningContext, { maxLength: 2 }),
        async (currentState, planContexts) => {
          const plannedActions = await Promise.all(
            planContexts.map(ctx => planAhead(ctx))
          );
          
          const context: ForecastingContext = {
            currentState,
            plannedActions,
          };
          
          const forecast = await forecastFutureState(context);
          
          // Property: Should have projections for multiple time points
          expect(forecast.projections.length).toBeGreaterThan(0);
          
          // Property: Should include a 7-day projection
          const sevenDayProjection = forecast.projections.find(p => {
            const daysDiff = Math.round(
              (p.timestamp.getTime() - forecast.createdAt.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysDiff === 7;
          });
          expect(sevenDayProjection).toBeDefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use current trends in projections', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCurrentAgentState,
        async (currentState) => {
          const context: ForecastingContext = {
            currentState,
            plannedActions: [],
          };
          
          const forecast = await forecastFutureState(context);
          
          // Property: Trends should be defined
          expect(forecast.trends).toBeDefined();
          expect(forecast.trends.balanceTrend).toBeDefined();
          expect(forecast.trends.fitnessTrend).toBeDefined();
          
          // Property: Trends should be valid values
          const validTrends = ['increasing', 'stable', 'decreasing'];
          expect(validTrends).toContain(forecast.trends.balanceTrend);
          
          const validFitnessTrends = ['improving', 'stable', 'declining'];
          expect(validFitnessTrends).toContain(forecast.trends.fitnessTrend);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include planned actions in forecast', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCurrentAgentState,
        fc.array(arbitraryPlanningContext, { minLength: 1, maxLength: 3 }),
        async (currentState, planContexts) => {
          const plannedActions = await Promise.all(
            planContexts.map(ctx => planAhead(ctx))
          );
          
          const context: ForecastingContext = {
            currentState,
            plannedActions,
          };
          
          const forecast = await forecastFutureState(context);
          
          // Property: Planned actions should be included
          expect(forecast.plannedActions.length).toBe(plannedActions.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid confidence levels', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCurrentAgentState,
        async (currentState) => {
          const context: ForecastingContext = {
            currentState,
            plannedActions: [],
          };
          
          const forecast = await forecastFutureState(context);
          
          // Property: All projections should have confidence between 0 and 1
          for (const projection of forecast.projections) {
            expect(projection.confidence).toBeGreaterThanOrEqual(0);
            expect(projection.confidence).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have decreasing confidence for longer time horizons', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCurrentAgentState,
        async (currentState) => {
          const context: ForecastingContext = {
            currentState,
            plannedActions: [],
          };
          
          const forecast = await forecastFutureState(context);
          
          // Property: Confidence should generally decrease with time
          if (forecast.projections.length >= 2) {
            const sortedProjections = [...forecast.projections].sort(
              (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
            );
            
            // First projection should have higher or equal confidence than last
            expect(sortedProjections[0].confidence).toBeGreaterThanOrEqual(
              sortedProjections[sortedProjections.length - 1].confidence - 0.01 // Allow small tolerance
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include assumptions in projections', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCurrentAgentState,
        async (currentState) => {
          const context: ForecastingContext = {
            currentState,
            plannedActions: [],
          };
          
          const forecast = await forecastFutureState(context);
          
          // Property: All projections should have assumptions
          for (const projection of forecast.projections) {
            expect(Array.isArray(projection.assumptions)).toBe(true);
            expect(projection.assumptions.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve current state in forecast', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCurrentAgentState,
        async (currentState) => {
          const context: ForecastingContext = {
            currentState,
            plannedActions: [],
          };
          
          const forecast = await forecastFutureState(context);
          
          // Property: Current state should be preserved
          expect(forecast.currentState.balance).toBe(currentState.balance);
          expect(forecast.currentState.tier).toBe(currentState.tier);
          expect(forecast.currentState.fitness).toBe(currentState.fitness);
          expect(forecast.currentState.reputation).toBe(currentState.reputation);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have valid predicted values', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCurrentAgentState,
        async (currentState) => {
          const context: ForecastingContext = {
            currentState,
            plannedActions: [],
          };
          
          const forecast = await forecastFutureState(context);
          
          // Property: All predicted values should be valid
          for (const projection of forecast.projections) {
            expect(projection.predictedBalance).toBeGreaterThanOrEqual(0);
            expect(projection.predictedFitness).toBeGreaterThanOrEqual(0);
            expect(projection.predictedFitness).toBeLessThanOrEqual(100);
            expect(projection.predictedReputation).toBeGreaterThanOrEqual(0);
            
            const validTiers = ['thriving', 'normal', 'low', 'critical', 'dead'];
            expect(validTiers).toContain(projection.predictedTier);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve agent ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCurrentAgentState,
        async (currentState) => {
          const context: ForecastingContext = {
            currentState,
            plannedActions: [],
          };
          
          const forecast = await forecastFutureState(context);
          
          // Property: Agent ID should be preserved
          expect(forecast.agentId).toBe(currentState.agentId);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should have chronologically ordered projections', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryCurrentAgentState,
        async (currentState) => {
          const context: ForecastingContext = {
            currentState,
            plannedActions: [],
          };
          
          const forecast = await forecastFutureState(context);
          
          // Property: Projections should be in chronological order
          for (let i = 1; i < forecast.projections.length; i++) {
            expect(forecast.projections[i].timestamp.getTime()).toBeGreaterThan(
              forecast.projections[i - 1].timestamp.getTime()
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
