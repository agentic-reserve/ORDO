/**
 * Property-Based Tests for Anomaly Detection System
 * 
 * Feature: ordo-digital-civilization, Property 95: Anomaly Detection
 * 
 * Property 95: Anomaly Detection
 * *For any* agent behavior, the system should compare against expected patterns
 * and flag anomalies (deviation > 2 standard deviations).
 * 
 * **Validates: Requirements 20.5**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  detectAnomaly,
  updateBaseline,
  getBaseline,
  clearBaseline,
  clearAllBaselines,
  isAnomalous,
} from './anomaly-detection';
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

describe('Property 95: Anomaly Detection', () => {
  beforeEach(() => {
    clearAllBaselines();
  });

  it('should return deviation score >= 0', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectAnomaly(action);
        
        expect(result.deviationScore).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should include the original action in the result', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectAnomaly(action);
        
        expect(result.action).toEqual(action);
      }),
      { numRuns: 100 }
    );
  });

  it('should provide expected and actual behavior descriptions', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectAnomaly(action);
        
        expect(result.expectedBehavior).toBeDefined();
        expect(result.actualBehavior).toBeDefined();
        expect(typeof result.expectedBehavior).toBe('string');
        expect(typeof result.actualBehavior).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  it('should not detect anomalies without baseline', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        clearBaseline(action.agentId);
        
        const result = await detectAnomaly(action);
        
        expect(result.isAnomaly).toBe(false);
        expect(result.deviationScore).toBe(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should establish baseline after sufficient history', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(arbitraryAgentAction, { minLength: 10, maxLength: 20 }),
        async (agentId, actions) => {
          clearBaseline(agentId);
          
          // Set all actions to same agent
          const agentActions = actions.map(a => ({ ...a, agentId }));
          
          // Update baseline with actions
          for (const action of agentActions) {
            updateBaseline(agentId, action);
          }
          
          const baseline = getBaseline(agentId);
          
          expect(baseline).toBeDefined();
          expect(baseline?.agentId).toBe(agentId);
          expect(baseline?.actionFrequency).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect anomalies with established baseline', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.array(arbitraryAgentAction, { minLength: 15, maxLength: 20 }),
        async (agentId, actions) => {
          clearBaseline(agentId);
          
          // Create consistent baseline with inference actions
          const baselineActions = actions.slice(0, 10).map(a => ({
            ...a,
            agentId,
            type: 'inference' as ActionType,
            description: 'normal action',
            parameters: { key: 'value' },
          }));
          
          for (const action of baselineActions) {
            updateBaseline(agentId, action);
          }
          
          // Create anomalous action (very different)
          const anomalousAction: AgentAction = {
            agentId,
            type: 'key_access',
            description: 'x'.repeat(500), // Very long description
            parameters: {}, // Different param count
            timestamp: new Date(),
          };
          
          const result = await detectAnomaly(anomalousAction);
          
          // Should detect some deviation
          expect(result.deviationScore).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should include a timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectAnomaly(action);
        
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly identify anomalous actions', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectAnomaly(action);
        const anomalous = await isAnomalous(action, 2);
        
        expect(anomalous).toBe(result.deviationScore >= 2);
      }),
      { numRuns: 100 }
    );
  });

  it('should support custom thresholds', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryAgentAction,
        fc.double({ min: 0, max: 10, noNaN: true }),
        async (action, threshold) => {
          const result = await detectAnomaly(action);
          const anomalous = await isAnomalous(action, threshold);
          
          expect(anomalous).toBe(result.deviationScore >= threshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should be deterministic for the same action and baseline', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result1 = await detectAnomaly(action);
        const result2 = await detectAnomaly(action);
        
        expect(result1.deviationScore).toBe(result2.deviationScore);
        expect(result1.isAnomaly).toBe(result2.isAnomaly);
      }),
      { numRuns: 100 }
    );
  });
});
