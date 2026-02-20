/**
 * Property-Based Tests for Action Logging
 * 
 * Feature: ordo-digital-civilization, Property 58: Action Logging
 * Validates: Requirements 13.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { ActionLogger, type ActionLog } from './action-logger.js';

describe('Property 58: Action Logging', () => {
  let logger: ActionLogger;

  beforeEach(() => {
    // Use small buffer and long flush interval for testing
    logger = new ActionLogger(10, 60000);
  });

  afterEach(async () => {
    await logger.flush();
    logger.destroy();
  });

  it('should log actions with timestamp, type, inputs, outputs, cost, and outcome', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.record({
          param1: fc.string(),
          param2: fc.integer(),
        }),
        fc.record({
          result: fc.string(),
        }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.constantFrom('success', 'failure', 'partial'),
        async (agentId, actionType, inputs, outputs, cost, outcome) => {
          // Log action
          await logger.logAction({
            agentId,
            actionType,
            inputs,
            outputs,
            cost,
            outcome: outcome as 'success' | 'failure' | 'partial',
          });

          // Flush to database
          await logger.flush();

          // Query logs
          const logs = await logger.queryLogs({ agentId, limit: 1 });

          // Verify log was recorded
          expect(logs.length).toBeGreaterThan(0);
          const log = logs[0];
          expect(log.agentId).toBe(agentId);
          expect(log.actionType).toBe(actionType);
          expect(log.inputs).toEqual(inputs);
          expect(log.outputs).toEqual(outputs);
          expect(log.cost).toBe(cost);
          expect(log.outcome).toBe(outcome);
          expect(log.timestamp).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should log successful actions', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.record({ input: fc.string() }),
        fc.record({ output: fc.string() }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.integer({ min: 0, max: 5000 }),
        async (agentId, actionType, inputs, outputs, cost, duration) => {
          // Log success
          await logger.logSuccess(agentId, actionType, inputs, outputs, cost, duration);

          // Flush to database
          await logger.flush();

          // Query logs
          const logs = await logger.queryLogs({ agentId, outcome: 'success', limit: 1 });

          // Verify success was logged
          expect(logs.length).toBeGreaterThan(0);
          expect(logs[0].outcome).toBe('success');
          expect(logs[0].duration).toBe(duration);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should log failed actions with error messages', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.record({ input: fc.string() }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.string({ minLength: 1 }),
        async (agentId, actionType, inputs, cost, errorMessage) => {
          // Log failure
          await logger.logFailure(agentId, actionType, inputs, cost, errorMessage);

          // Flush to database
          await logger.flush();

          // Query logs
          const logs = await logger.queryLogs({ agentId, outcome: 'failure', limit: 1 });

          // Verify failure was logged
          expect(logs.length).toBeGreaterThan(0);
          expect(logs[0].outcome).toBe('failure');
          expect(logs[0].errorMessage).toBe(errorMessage);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should store logs in searchable format', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.array(
          fc.record({
            actionType: fc.string({ minLength: 1 }),
            cost: fc.double({ min: 0, max: 1, noNaN: true }),
            outcome: fc.constantFrom('success', 'failure'),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (agentId, actions) => {
          // Log multiple actions
          for (const action of actions) {
            await logger.logAction({
              agentId,
              actionType: action.actionType,
              inputs: {},
              outputs: {},
              cost: action.cost,
              outcome: action.outcome as 'success' | 'failure',
            });
          }

          // Flush to database
          await logger.flush();

          // Query by agent ID
          const allLogs = await logger.queryLogs({ agentId });
          expect(allLogs.length).toBeGreaterThanOrEqual(actions.length);

          // Query by outcome
          const successLogs = await logger.queryLogs({ agentId, outcome: 'success' });
          const expectedSuccesses = actions.filter((a) => a.outcome === 'success').length;
          expect(successLogs.length).toBeGreaterThanOrEqual(expectedSuccesses);

          // Query by action type
          const firstActionType = actions[0].actionType;
          const typeLogs = await logger.queryLogs({ agentId, actionType: firstActionType });
          const expectedTypeCount = actions.filter((a) => a.actionType === firstActionType).length;
          expect(typeLogs.length).toBeGreaterThanOrEqual(expectedTypeCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should track action statistics', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.array(
          fc.record({
            actionType: fc.string({ minLength: 1 }),
            cost: fc.double({ min: 0, max: 1, noNaN: true }),
            outcome: fc.constantFrom('success', 'failure'),
            duration: fc.integer({ min: 0, max: 5000 }),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        async (agentId, actions) => {
          // Log actions
          for (const action of actions) {
            await logger.logAction({
              agentId,
              actionType: action.actionType,
              inputs: {},
              outputs: {},
              cost: action.cost,
              outcome: action.outcome as 'success' | 'failure',
              duration: action.duration,
            });
          }

          // Flush to database
          await logger.flush();

          // Get stats
          const startDate = new Date(Date.now() - 60000);
          const endDate = new Date();
          const stats = await logger.getActionStats(agentId, startDate, endDate);

          // Verify stats
          expect(stats.totalActions).toBeGreaterThanOrEqual(actions.length);
          expect(stats.successCount).toBeGreaterThanOrEqual(0);
          expect(stats.failureCount).toBeGreaterThanOrEqual(0);
          expect(stats.successRate).toBeGreaterThanOrEqual(0);
          expect(stats.successRate).toBeLessThanOrEqual(100);
          expect(stats.totalCost).toBeGreaterThanOrEqual(0);
          expect(stats.avgDuration).toBeGreaterThanOrEqual(0);
          expect(Object.keys(stats.actionsByType).length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should buffer logs and flush periodically', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.array(
          fc.record({
            actionType: fc.string({ minLength: 1 }),
            cost: fc.double({ min: 0, max: 1, noNaN: true }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (agentId, actions) => {
          // Log actions (they go to buffer)
          for (const action of actions) {
            await logger.logAction({
              agentId,
              actionType: action.actionType,
              inputs: {},
              outputs: {},
              cost: action.cost,
              outcome: 'success',
            });
          }

          // Flush manually
          await logger.flush();

          // Verify logs were persisted
          const logs = await logger.queryLogs({ agentId });
          expect(logs.length).toBeGreaterThanOrEqual(actions.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should query logs by date range', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.integer({ min: 1, max: 10 }),
        async (agentId, actionCount) => {
          const startDate = new Date();

          // Log actions
          for (let i = 0; i < actionCount; i++) {
            await logger.logAction({
              agentId,
              actionType: 'test',
              inputs: {},
              outputs: {},
              cost: 0.1,
              outcome: 'success',
            });
          }

          // Flush to database
          await logger.flush();

          const endDate = new Date();

          // Query by date range
          const logs = await logger.queryLogs({ agentId, startDate, endDate });

          // Verify logs are within date range
          expect(logs.length).toBeGreaterThanOrEqual(actionCount);
          for (const log of logs) {
            expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
            expect(log.timestamp.getTime()).toBeLessThanOrEqual(endDate.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
