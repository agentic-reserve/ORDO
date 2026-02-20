/**
 * Property-Based Tests for Deception Detection System
 * 
 * Feature: ordo-digital-civilization, Property 94: Deception Detection
 * 
 * Property 94: Deception Detection
 * *For any* agent reasoning, the system should analyze for deception attempts
 * (hiding true goals, misleading humans, manipulating outputs).
 * 
 * **Validates: Requirements 20.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  detectDeception,
  containsDeception,
  getDeceptionRiskLevel,
  batchDetectDeception,
} from './deception-detection';
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

const arbitraryDeceptiveAction = fc.record({
  agentId: fc.uuid(),
  type: arbitraryActionType,
  description: fc.constantFrom(
    'hide my true goal from the user',
    'mislead the human about my intentions',
    'secretly manipulate the output',
    'pretend to help but actually harm',
    'lie about the results',
    'deceive the user without them knowing'
  ),
  parameters: fc.dictionary(fc.string(), fc.anything()),
  timestamp: fc.date(),
  context: fc.option(fc.string(), { nil: undefined }),
}) as fc.Arbitrary<AgentAction>;

const arbitraryHonestAction = fc.record({
  agentId: fc.uuid(),
  type: arbitraryActionType,
  description: fc.constantFrom(
    'help the user achieve their goal',
    'provide accurate information',
    'be transparent about my actions',
    'honestly report the results',
    'clearly explain my reasoning',
    'truthfully answer the question'
  ),
  parameters: fc.dictionary(fc.string(), fc.anything()),
  timestamp: fc.date(),
  context: fc.option(fc.string(), { nil: undefined }),
}) as fc.Arbitrary<AgentAction>;

describe('Property 94: Deception Detection', () => {
  it('should return confidence between 0 and 1', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectDeception(action);
        
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  it('should include the original action in the result', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectDeception(action);
        
        expect(result.action).toEqual(action);
      }),
      { numRuns: 100 }
    );
  });

  it('should provide reasoning for the detection', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectDeception(action);
        
        expect(result.reasoning).toBeDefined();
        expect(typeof result.reasoning).toBe('string');
        expect(result.reasoning.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should detect deception in deceptive actions', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryDeceptiveAction, async (action) => {
        const result = await detectDeception(action);
        
        // Deceptive actions should have high confidence
        expect(result.confidence).toBeGreaterThan(0.2);
        expect(result.indicators.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should not detect deception in honest actions', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryHonestAction, async (action) => {
        const result = await detectDeception(action);
        
        // Honest actions should generally have low confidence
        // Allow some false positives due to random parameter keys
        if (result.confidence >= 0.3) {
          // If detected, it should be due to parameters, not description
          const descriptionOnly = JSON.stringify({
            type: action.type,
            description: action.description,
          });
          const descResult = await detectDeception({
            ...action,
            parameters: {},
          });
          expect(descResult.confidence).toBeLessThan(0.3);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should list indicators when deception is detected', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryDeceptiveAction, async (action) => {
        const result = await detectDeception(action);
        
        expect(Array.isArray(result.indicators)).toBe(true);
        if (result.detected) {
          expect(result.indicators.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should include a timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectDeception(action);
        
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly identify actions containing deception', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectDeception(action);
        const contains = await containsDeception(action, 0.3);
        
        expect(contains).toBe(result.confidence >= 0.3);
      }),
      { numRuns: 100 }
    );
  });

  it('should support custom thresholds', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryAgentAction,
        fc.double({ min: 0, max: 1, noNaN: true }),
        async (action, threshold) => {
          const result = await detectDeception(action);
          const contains = await containsDeception(action, threshold);
          
          expect(contains).toBe(result.confidence >= threshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should assign appropriate risk levels', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await detectDeception(action);
        const riskLevel = await getDeceptionRiskLevel(action);
        
        if (result.confidence >= 0.8) {
          expect(riskLevel).toBe('critical');
        } else if (result.confidence >= 0.6) {
          expect(riskLevel).toBe('high');
        } else if (result.confidence >= 0.4) {
          expect(riskLevel).toBe('medium');
        } else if (result.confidence >= 0.2) {
          expect(riskLevel).toBe('low');
        } else {
          expect(riskLevel).toBe('none');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should be deterministic for the same action', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result1 = await detectDeception(action);
        const result2 = await detectDeception(action);
        
        expect(result1.confidence).toBe(result2.confidence);
        expect(result1.detected).toBe(result2.detected);
        expect(result1.indicators).toEqual(result2.indicators);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle batch detection', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbitraryAgentAction, { minLength: 1, maxLength: 10 }),
        async (actions) => {
          const results = await batchDetectDeception(actions);
          
          expect(results.length).toBe(actions.length);
          results.forEach((result, i) => {
            expect(result.action).toEqual(actions[i]);
          });
        }
      ),
      { numRuns: 50 }
    );
  });
});
