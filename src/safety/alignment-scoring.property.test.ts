/**
 * Property-Based Tests for Alignment Scoring System
 * 
 * Feature: ordo-digital-civilization, Property 92: Alignment Scoring
 * 
 * Property 92: Alignment Scoring
 * *For any* agent action, the system should score alignment with human values (0-100)
 * and require score ≥ 95 for execution.
 * 
 * **Validates: Requirements 20.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { scoreAlignment, meetsAlignmentThreshold, analyzeAlignment } from './alignment-scoring';
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

const arbitraryHarmfulAction = fc.record({
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

const arbitraryBeneficialAction = fc.record({
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

describe('Property 92: Alignment Scoring', () => {
  it('should always return a score between 0 and 100', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await scoreAlignment(action);
        
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }),
      { numRuns: 100 }
    );
  });

  it('should include the original action in the result', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await scoreAlignment(action);
        
        expect(result.action).toEqual(action);
      }),
      { numRuns: 100 }
    );
  });

  it('should provide reasoning for the score', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await scoreAlignment(action);
        
        expect(result.reasoning).toBeDefined();
        expect(typeof result.reasoning).toBe('string');
        expect(result.reasoning.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should assign lower scores to harmful actions', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryHarmfulAction, async (action) => {
        const result = await scoreAlignment(action);
        
        // Harmful actions should score below threshold
        expect(result.score).toBeLessThan(95);
        expect(result.concerns.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  it('should assign higher scores to beneficial actions', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBeneficialAction, async (action) => {
        const result = await scoreAlignment(action);
        
        // Beneficial actions should score at or above threshold
        expect(result.score).toBeGreaterThanOrEqual(90);
      }),
      { numRuns: 100 }
    );
  });

  it('should identify concerns for misaligned actions', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryHarmfulAction, async (action) => {
        const result = await scoreAlignment(action);
        
        expect(Array.isArray(result.concerns)).toBe(true);
        // Harmful actions should have concerns
        if (result.score < 95) {
          expect(result.concerns.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should identify aligned human values for positive actions', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryBeneficialAction, async (action) => {
        const result = await scoreAlignment(action);
        
        expect(Array.isArray(result.humanValues)).toBe(true);
        // Beneficial actions should align with human values
        if (result.score >= 95) {
          expect(result.humanValues.length).toBeGreaterThanOrEqual(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should include a timestamp', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result = await scoreAlignment(action);
        
        expect(result.timestamp).toBeInstanceOf(Date);
        expect(result.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
      }),
      { numRuns: 100 }
    );
  });

  it('should correctly identify actions meeting threshold', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const score = await scoreAlignment(action);
        const meetsThreshold = await meetsAlignmentThreshold(action, 95);
        
        expect(meetsThreshold).toBe(score.score >= 95);
      }),
      { numRuns: 100 }
    );
  });

  it('should support custom thresholds', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbitraryAgentAction,
        fc.integer({ min: 0, max: 100 }),
        async (action, threshold) => {
          const score = await scoreAlignment(action);
          const meetsThreshold = await meetsAlignmentThreshold(action, threshold);
          
          expect(meetsThreshold).toBe(score.score >= threshold);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide consistent recommendations based on score', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const analysis = await analyzeAlignment(action);
        
        if (analysis.score.score >= 95) {
          expect(analysis.recommendation).toBe('execute');
          expect(analysis.meetsThreshold).toBe(true);
        } else if (analysis.score.score >= 90) {
          expect(analysis.recommendation).toBe('review');
          expect(analysis.meetsThreshold).toBe(false);
        } else {
          expect(analysis.recommendation).toBe('block');
          expect(analysis.meetsThreshold).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should be deterministic for the same action', async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryAgentAction, async (action) => {
        const result1 = await scoreAlignment(action);
        const result2 = await scoreAlignment(action);
        
        expect(result1.score).toBe(result2.score);
        expect(result1.concerns).toEqual(result2.concerns);
        expect(result1.humanValues).toEqual(result2.humanValues);
      }),
      { numRuns: 100 }
    );
  });

  it('should handle large transactions with extra scrutiny', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.double({ min: 10.1, max: 1000, noNaN: true }),
        async (agentId, amount) => {
          const action: AgentAction = {
            agentId,
            type: 'transaction',
            description: 'Transfer SOL',
            parameters: { amount },
            timestamp: new Date(),
          };
          
          const result = await scoreAlignment(action);
          
          // Large transactions should be flagged
          expect(result.concerns).toContain('large_transaction');
          expect(result.score).toBeLessThanOrEqual(94);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply extra scrutiny to self-modification actions', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.string(), async (agentId, description) => {
        const action: AgentAction = {
          agentId,
          type: 'self_modification',
          description,
          parameters: {},
          timestamp: new Date(),
        };
        
        const result = await scoreAlignment(action);
        
        // Self-modification should have reduced score
        expect(result.score).toBeLessThanOrEqual(96);
        expect(result.reasoning).toContain('self-modification');
      }),
      { numRuns: 100 }
    );
  });

  it('should apply extra scrutiny to key access actions', async () => {
    await fc.assert(
      fc.asyncProperty(fc.uuid(), fc.string(), async (agentId, description) => {
        const action: AgentAction = {
          agentId,
          type: 'key_access',
          description,
          parameters: {},
          timestamp: new Date(),
        };
        
        const result = await scoreAlignment(action);
        
        // Key access should be at threshold
        expect(result.score).toBeLessThanOrEqual(95);
        expect(result.reasoning).toContain('key access');
      }),
      { numRuns: 100 }
    );
  });
});
