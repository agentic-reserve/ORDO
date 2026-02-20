/**
 * Property-Based Tests for Misalignment Blocking System
 * 
 * Feature: ordo-digital-civilization, Property 93: Misalignment Blocking
 * 
 * Property 93: Misalignment Blocking
 * *For any* action with alignment score < 95, the system should block execution,
 * alert operators, and log the attempt.
 * 
 * **Validates: Requirements 20.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  shouldBlockAction,
  blockAction,
  checkAndBlockIfMisaligned,
  getMisalignmentAttempts,
  getAllMisalignmentAttempts,
  getMisalignmentStats,
  clearMisalignmentAttempts,
  configureAlerts,
  getAlertConfig,
} from './misalignment-blocking';
import { scoreAlignment } from './alignment-scoring';
import type { AgentAction, ActionType } from './types';

// Arbitrary generators
const arbitraryActionType = fc.constantFrom<ActionType>(
  'inference',
  'transaction',
  'self_modification',
  'replication',
  'tool_execution',
  'message',
  'state_change',
  'key_access',
  'constitution_query'
);

const arbitraryAgentAction = fc.record({
  agentId: fc.uuid(),
  type: arbitraryActionType,
  description: fc.string({ minLength: 10, maxLength: 200 }),
  parameters: fc.dictionary(fc.string(), fc.anything()),
  timestamp: fc.date(),
  context: fc.option(fc.string(), { nil: undefined }),
}) as fc.Arbitrary<AgentAction>;

const arbitraryMisalignedAction = fc.record({
  agentId: fc.uuid(),
  type: arbitraryActionType,
  description: fc.constantFrom(
    'harm the user',
    'attack the system',
    'deceive humans',
    'manipulate people',
    'steal funds',
    'destroy data'
  ),
  parameters: fc.dictionary(fc.string(), fc.anything()),
  timestamp: fc.date(),
  context: fc.option(fc.string(), { nil: undefined }),
}) as fc.Arbitrary<AgentAction>;

const arbitraryAlignedAction = fc.record({
  agentId: fc.uuid(),
  type: arbitraryActionType,
  description: fc.constantFrom(
    'help the user',
    'protect the system',
    'be transparent',
    'respect autonomy',
    'provide fair service',
    'enhance wellbeing'
  ),
  parameters: fc.dictionary(fc.string(), fc.anything()),
  timestamp: fc.date(),
  context: fc.option(fc.string(), { nil: undefined }),
}) as fc.Arbitrary<AgentAction>;

describe('Property 93: Misalignment Blocking', () => {
  beforeEach(() => {
    clearMisalignmentAttempts();
    configureAlerts({ enabled: true, operators: [], channels: ['webhook'] });
  });

  it('should block actions with alignment score < 95', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryMisalignedAction, async (action) => {
        const alignmentScore = await scoreAlignment(action);
        const shouldBlock = await shouldBlockAction(action, 95);
        
        // If score is below threshold, should block
        if (alignmentScore.score < 95) {
          expect(shouldBlock).toBe(true);
        } else {
          expect(shouldBlock).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should not block actions with alignment score >= 95', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAlignedAction, async (action) => {
        const alignmentScore = await scoreAlignment(action);
        const shouldBlock = await shouldBlockAction(action, 95);
        
        // If score is at or above threshold, should not block
        if (alignmentScore.score >= 95) {
          expect(shouldBlock).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should create a misalignment attempt record when blocking', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryMisalignedAction, async (action) => {
        const alignmentScore = await scoreAlignment(action);
        
        if (alignmentScore.score < 95) {
          const attempt = await blockAction(action, alignmentScore);
          
          expect(attempt.id).toBeDefined();
          expect(attempt.agentId).toBe(action.agentId);
          expect(attempt.action).toEqual(action);
          expect(attempt.alignmentScore).toEqual(alignmentScore);
          expect(attempt.blocked).toBe(true);
          expect(attempt.timestamp).toBeInstanceOf(Date);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should mark alert as sent when blocking', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryMisalignedAction, async (action) => {
        const alignmentScore = await scoreAlignment(action);
        
        if (alignmentScore.score < 95) {
          const attempt = await blockAction(action, alignmentScore);
          
          // Alert should be marked as sent
          expect(attempt.alertSent).toBe(true);
          expect(attempt.operatorNotified).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should log all misalignment attempts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryMisalignedAction, { minLength: 1, maxLength: 10 }),
        async (actions) => {
          clearMisalignmentAttempts();
          
          let blockedCount = 0;
          for (const action of actions) {
            const result = await checkAndBlockIfMisaligned(action);
            if (result.blocked) {
              blockedCount++;
            }
          }
          
          const allAttempts = getAllMisalignmentAttempts();
          expect(allAttempts.length).toBe(blockedCount);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should retrieve misalignment attempts by agent ID', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(arbitraryMisalignedAction, { minLength: 1, maxLength: 5 }),
        async (agentId, actions) => {
          clearMisalignmentAttempts();
          
          // Set all actions to same agent ID
          const agentActions = actions.map(a => ({ ...a, agentId }));
          
          for (const action of agentActions) {
            await checkAndBlockIfMisaligned(action);
          }
          
          const agentAttempts = getMisalignmentAttempts(agentId);
          
          // All attempts should be for this agent
          expect(agentAttempts.every(a => a.agentId === agentId)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should support custom thresholds', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryAgentAction,
        fc.integer({ min: 0, max: 100 }),
        async (action, threshold) => {
          const alignmentScore = await scoreAlignment(action);
          const shouldBlock = await shouldBlockAction(action, threshold);
          
          expect(shouldBlock).toBe(alignmentScore.score < threshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return blocked status and attempt details', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryMisalignedAction, async (action) => {
        clearMisalignmentAttempts();
        
        const result = await checkAndBlockIfMisaligned(action);
        
        expect(result.blocked).toBeDefined();
        expect(result.alignmentScore).toBeDefined();
        
        if (result.blocked) {
          expect(result.attempt).toBeDefined();
          expect(result.attempt?.agentId).toBe(action.agentId);
          expect(result.attempt?.blocked).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate misalignment statistics correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(arbitraryMisalignedAction, { minLength: 1, maxLength: 10 }),
        async (agentId, actions) => {
          clearMisalignmentAttempts();
          
          // Set all actions to same agent ID
          const agentActions = actions.map(a => ({ ...a, agentId }));
          
          let blockedCount = 0;
          for (const action of agentActions) {
            const result = await checkAndBlockIfMisaligned(action);
            if (result.blocked) {
              blockedCount++;
            }
          }
          
          const stats = getMisalignmentStats(agentId);
          
          expect(stats.totalAttempts).toBe(blockedCount);
          expect(stats.blockedActions).toBe(blockedCount);
          expect(stats.averageScore).toBeGreaterThanOrEqual(0);
          expect(stats.averageScore).toBeLessThan(95);
          expect(Array.isArray(stats.commonConcerns)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle alert configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
        fc.constantFrom('email', 'slack', 'webhook'),
        async (operators, channel) => {
          configureAlerts({
            enabled: true,
            operators,
            channels: [channel],
          });
          
          const config = getAlertConfig();
          
          expect(config.enabled).toBe(true);
          expect(config.operators).toEqual(operators);
          expect(config.channels).toContain(channel);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should respect alert enabled/disabled setting', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryMisalignedAction,
        fc.boolean(),
        async (action, enabled) => {
          clearMisalignmentAttempts();
          configureAlerts({ enabled });
          
          const alignmentScore = await scoreAlignment(action);
          
          if (alignmentScore.score < 95) {
            const attempt = await blockAction(action, alignmentScore);
            
            expect(attempt.alertSent).toBe(enabled);
            expect(attempt.operatorNotified).toBe(enabled);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should return empty stats for agents with no attempts', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), async (agentId) => {
        clearMisalignmentAttempts();
        
        const stats = getMisalignmentStats(agentId);
        
        expect(stats.totalAttempts).toBe(0);
        expect(stats.blockedActions).toBe(0);
        expect(stats.averageScore).toBe(100);
        expect(stats.commonConcerns).toEqual([]);
      }),
      { numRuns: 50 }
    );
  });
});
