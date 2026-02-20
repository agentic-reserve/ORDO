/**
 * Property-Based Tests for Cross-Domain Performance Tracking
 * 
 * Property 77: Cross-Domain Performance
 * Property 78: Domain Breadth Measurement
 * 
 * Validates: Requirements 17.4, 17.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { CrossDomainPerformanceTracker } from './performance-tracker';
import { domainMasteryTracker } from './domain-mastery';
import type { Domain } from './types';

describe('Property 77 & 78: Cross-Domain Performance', () => {
  let tracker: CrossDomainPerformanceTracker;

  beforeEach(() => {
    tracker = new CrossDomainPerformanceTracker();
    tracker.clear();
    domainMasteryTracker.clear();
  });

  it('Property 77: novel task success rate should be between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        fc.double({ min: 0, max: 1 }),
        (numTasks, successRate) => {
          tracker.clear();

          const agentId = `agent-${Math.random()}`;
          const numSuccesses = Math.floor(numTasks * successRate);

          for (let i = 0; i < numSuccesses; i++) {
            tracker.recordNovelTaskAttempt(agentId, 'domain-1', true);
          }
          for (let i = numSuccesses; i < numTasks; i++) {
            tracker.recordNovelTaskAttempt(agentId, 'domain-1', false);
          }

          const performance = tracker.getPerformance(agentId);

          // Property: Success rate must be in [0, 1]
          expect(performance.novelTaskSuccessRate).toBeGreaterThanOrEqual(0);
          expect(performance.novelTaskSuccessRate).toBeLessThanOrEqual(1);

          // Property: Success rate should match input
          expect(performance.novelTaskSuccessRate).toBeCloseTo(successRate, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 78: domain breadth should equal number of mastered domains', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (numDomains) => {
          tracker.clear();
          domainMasteryTracker.clear();

          const agentId = `agent-${Math.random()}`;

          // Create and master multiple domains
          for (let i = 0; i < numDomains; i++) {
            const domain: Domain = {
              id: `domain-${i}`,
              name: `Domain ${i}`,
              description: 'Test',
              tasks: [],
              successCriteria: {
                minSuccessRate: 0.95,
                minTasksCompleted: 10,
                minConsecutiveSuccesses: 5,
              },
              principles: [],
              structure: {
                hierarchy: [],
                relationships: {},
                patterns: [],
                constraints: [],
              },
            };

            domainMasteryTracker.registerDomain(domain);

            // Master the domain
            for (let j = 0; j < 10; j++) {
              domainMasteryTracker.recordPerformance(agentId, domain.id, 'task-1', true, 1000, 0.001);
            }
          }

          const performance = tracker.getPerformance(agentId);

          // Property: Domain breadth should equal number of mastered domains
          expect(performance.domainBreadth).toBe(numDomains);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 77: improvement rate should be between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1 }), { minLength: 1, maxLength: 10 }),
        (rates) => {
          tracker.clear();

          const agentId = `agent-${Math.random()}`;

          for (const rate of rates) {
            tracker.recordImprovementRate(agentId, 'domain-1', rate);
          }

          const performance = tracker.getPerformance(agentId);

          // Property: Improvement rate must be in [0, 1]
          expect(performance.improvementRate).toBeGreaterThanOrEqual(0);
          expect(performance.improvementRate).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
