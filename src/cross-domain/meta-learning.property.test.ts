/**
 * Property-Based Tests for Meta-Learning
 * 
 * Property 79: Meta-Learning
 * For any learning task, the system should enable meta-learning (learning how to learn)
 * by analyzing learning strategies and optimizing them.
 * 
 * Validates: Requirements 17.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { MetaLearningManager } from './meta-learning';

describe('Property 79: Meta-Learning', () => {
  let manager: MetaLearningManager;

  beforeEach(() => {
    manager = new MetaLearningManager();
    manager.clear();
  });

  it('Property 79: should track strategy effectiveness between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1 }), { minLength: 1, maxLength: 10 }),
        (effectivenessValues) => {
          manager.clear();

          const agentId = `agent-${Math.random()}`;
          const strategies = manager.getAllStrategies();

          for (let i = 0; i < effectivenessValues.length; i++) {
            const strategy = strategies[i % strategies.length];
            manager.recordStrategyUsage(
              agentId,
              strategy.id,
              `domain-${i}`,
              effectivenessValues[i]
            );
          }

          const metrics = manager.getMetrics(agentId);

          // Property: All effectiveness values must be in [0, 1]
          for (const eff of Object.values(metrics?.strategyEffectiveness ?? {})) {
            expect(eff).toBeGreaterThanOrEqual(0);
            expect(eff).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 79: optimal strategy should have highest effectiveness', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1 }), { minLength: 2, maxLength: 5 }),
        (effectivenessValues) => {
          manager.clear();

          const agentId = `agent-${Math.random()}`;
          const strategies = manager.getAllStrategies().slice(0, effectivenessValues.length);

          for (let i = 0; i < effectivenessValues.length; i++) {
            manager.recordStrategyUsage(
              agentId,
              strategies[i].id,
              `domain-${i}`,
              effectivenessValues[i]
            );
          }

          const metrics = manager.getMetrics(agentId);
          const optimalStrategy = metrics?.optimalStrategy;

          if (optimalStrategy) {
            const optimalEff = metrics?.strategyEffectiveness[optimalStrategy] ?? 0;

            // Property: Optimal strategy should have highest or equal effectiveness
            for (const [strategyId, eff] of Object.entries(metrics?.strategyEffectiveness ?? {})) {
              expect(optimalEff).toBeGreaterThanOrEqual(eff);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 79: adaptation rate should be between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (numStrategies) => {
          manager.clear();

          const agentId = `agent-${Math.random()}`;
          const strategies = manager.getAllStrategies().slice(0, numStrategies);

          for (let i = 0; i < strategies.length; i++) {
            manager.recordStrategyUsage(agentId, strategies[i].id, `domain-${i}`, 0.7);
          }

          const metrics = manager.getMetrics(agentId);

          // Property: Adaptation rate must be in [0, 1]
          expect(metrics?.adaptationRate).toBeGreaterThanOrEqual(0);
          expect(metrics?.adaptationRate).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 79: recommended strategy should be optimal or default', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1 }), { minLength: 1, maxLength: 5 }),
        (effectivenessValues) => {
          manager.clear();

          const agentId = `agent-${Math.random()}`;
          const strategies = manager.getAllStrategies().slice(0, effectivenessValues.length);

          for (let i = 0; i < effectivenessValues.length; i++) {
            manager.recordStrategyUsage(
              agentId,
              strategies[i].id,
              `domain-${i}`,
              effectivenessValues[i]
            );
          }

          const recommended = manager.recommendStrategy(agentId, 'new-domain');
          const metrics = manager.getMetrics(agentId);

          // Property: Recommended strategy should be optimal or systematic (default)
          expect(
            recommended?.id === metrics?.optimalStrategy ||
            recommended?.id === 'systematic'
          ).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});
