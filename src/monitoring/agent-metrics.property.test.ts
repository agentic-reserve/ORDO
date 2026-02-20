/**
 * Property-Based Tests for Agent Metrics Tracking
 * 
 * Feature: ordo-digital-civilization, Property 56: Agent Metrics Tracking
 * Validates: Requirements 13.2
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AgentMetricsTracker, type MetricUpdate } from './agent-metrics.js

describe('Property 56: Agent Metrics Tracking', () => {
  let tracker: AgentMetricsTracker;

  beforeEach(() => {
    tracker = new AgentMetricsTracker();
  });

  afterEach(() => {
    tracker.clearCache();
  });

  it('should continuously track balance, turns, costs, success rate, and latency', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.array(
          fc.record({
            turnIncrement: fc.integer({ min: 0, max: 10 }),
            costIncrement: fc.double({ min: 0, max: 1, noNaN: true }),
            success: fc.boolean(),
            latency: fc.double({ min: 0, max: 5000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        async (agentId, initialBalance, updates) => {
          // Initialize metrics
          const initialMetrics = await tracker.initializeMetrics(agentId, initialBalance);
          
          expect(initialMetrics.agentId).toBe(agentId);
          expect(initialMetrics.balance).toBe(initialBalance);
          expect(initialMetrics.turns).toBe(0);
          expect(initialMetrics.totalCosts).toBe(0);
          expect(initialMetrics.successRate).toBe(100);
          expect(initialMetrics.avgLatency).toBe(0);

          // Apply updates
          let expectedTurns = 0;
          let expectedCosts = 0;

          for (const update of updates) {
            expectedTurns += update.turnIncrement;
            expectedCosts += update.costIncrement;

            await tracker.updateMetrics({
              agentId,
              turnIncrement: update.turnIncrement,
              costIncrement: update.costIncrement,
              success: update.success,
              latency: update.latency,
            });
          }

          // Get final metrics
          const finalMetrics = await tracker.getMetrics(agentId);

          // Verify metrics are tracked
          expect(finalMetrics.agentId).toBe(agentId);
          expect(finalMetrics.balance).toBe(initialBalance); // Balance unchanged unless explicitly updated
          expect(finalMetrics.turns).toBe(expectedTurns);
          expect(finalMetrics.totalCosts).toBeCloseTo(expectedCosts, 5);
          expect(finalMetrics.successRate).toBeGreaterThanOrEqual(0);
          expect(finalMetrics.successRate).toBeLessThanOrEqual(100);
          expect(finalMetrics.avgLatency).toBeGreaterThanOrEqual(0);
          expect(finalMetrics.lastUpdated).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should update metrics in real-time', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        async (agentId, initialBalance, newBalance) => {
          // Initialize metrics
          await tracker.initializeMetrics(agentId, initialBalance);

          // Update balance
          await tracker.updateBalance(agentId, newBalance);

          // Get metrics immediately
          const metrics = await tracker.getMetrics(agentId);

          // Verify real-time update
          expect(metrics.balance).toBe(newBalance);
          
          // Verify lastUpdated is recent (within last second)
          const now = new Date();
          const timeDiff = now.getTime() - metrics.lastUpdated.getTime();
          expect(timeDiff).toBeLessThan(1000);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track turns correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.array(fc.integer({ min: 1, max: 5 }), { minLength: 1, maxLength: 10 }),
        async (agentId, initialBalance, turnIncrements) => {
          // Initialize metrics
          await tracker.initializeMetrics(agentId, initialBalance);

          // Track turns
          let expectedTurns = 0;
          for (const increment of turnIncrements) {
            expectedTurns += increment;
            await tracker.updateMetrics({
              agentId,
              turnIncrement: increment,
            });
          }

          // Verify turn count
          const metrics = await tracker.getMetrics(agentId);
          expect(metrics.turns).toBe(expectedTurns);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track costs correctly', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.array(fc.double({ min: 0, max: 1, noNaN: true }), { minLength: 1, maxLength: 10 }),
        async (agentId, initialBalance, costs) => {
          // Initialize metrics
          await tracker.initializeMetrics(agentId, initialBalance);

          // Track costs
          let expectedCosts = 0;
          for (const cost of costs) {
            expectedCosts += cost;
            await tracker.updateMetrics({
              agentId,
              costIncrement: cost,
            });
          }

          // Verify total costs
          const metrics = await tracker.getMetrics(agentId);
          expect(metrics.totalCosts).toBeCloseTo(expectedCosts, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track success rate between 0-100', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        async (agentId, initialBalance, successes) => {
          // Initialize metrics
          await tracker.initializeMetrics(agentId, initialBalance);

          // Track successes
          for (const success of successes) {
            await tracker.updateMetrics({
              agentId,
              success,
            });
          }

          // Verify success rate is in valid range
          const metrics = await tracker.getMetrics(agentId);
          expect(metrics.successRate).toBeGreaterThanOrEqual(0);
          expect(metrics.successRate).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track average latency', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.array(fc.double({ min: 0, max: 5000, noNaN: true }), { minLength: 1, maxLength: 10 }),
        async (agentId, initialBalance, latencies) => {
          // Initialize metrics
          await tracker.initializeMetrics(agentId, initialBalance);

          // Track latencies
          for (const latency of latencies) {
            await tracker.updateMetrics({
              agentId,
              latency,
            });
          }

          // Verify average latency is non-negative
          const metrics = await tracker.getMetrics(agentId);
          expect(metrics.avgLatency).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track turn execution with all metrics', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 100, noNaN: true }),
        fc.array(
          fc.record({
            cost: fc.double({ min: 0, max: 1, noNaN: true }),
            success: fc.boolean(),
            latency: fc.double({ min: 0, max: 5000, noNaN: true }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (agentId, initialBalance, turns) => {
          // Initialize metrics
          await tracker.initializeMetrics(agentId, initialBalance);

          // Track turns
          for (const turn of turns) {
            await tracker.trackTurn(agentId, turn.cost, turn.success, turn.latency);
          }

          // Verify all metrics are updated
          const metrics = await tracker.getMetrics(agentId);
          expect(metrics.turns).toBe(turns.length);
          expect(metrics.totalCosts).toBeGreaterThanOrEqual(0);
          expect(metrics.successRate).toBeGreaterThanOrEqual(0);
          expect(metrics.successRate).toBeLessThanOrEqual(100);
          expect(metrics.avgLatency).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
