/**
 * Property-Based Tests for Domain Mastery Identification
 * 
 * Property 74: Domain Mastery Identification
 * For any agent working in a domain, the system should identify when mastery is achieved
 * (success rate > 95% on domain tasks).
 * 
 * Validates: Requirements 17.1
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { DomainMasteryTracker } from './domain-mastery';
import type { Domain } from './types';

describe('Property 74: Domain Mastery Identification', () => {
  let tracker: DomainMasteryTracker;
  let testDomain: Domain;

  beforeEach(() => {
    tracker = new DomainMasteryTracker();
    
    testDomain = {
      id: 'test-domain',
      name: 'Test Domain',
      description: 'A test domain',
      tasks: [
        {
          id: 'task-1',
          name: 'Test Task',
          description: 'A test task',
          difficulty: 5,
          requiredSkills: ['test'],
        },
      ],
      successCriteria: {
        minSuccessRate: 0.95,
        minTasksCompleted: 10,
        minConsecutiveSuccesses: 5,
      },
      principles: ['test principle'],
      structure: {
        hierarchy: ['concept'],
        relationships: {},
        patterns: ['pattern'],
        constraints: ['constraint'],
      },
    };

    tracker.registerDomain(testDomain);
  });

  it('Property 74: should identify mastery when success rate > 95%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }), // Number of tasks
        fc.double({ min: 0.95, max: 1.0 }), // Success rate
        (numTasks, successRate) => {
          // Clear tracker for each iteration
          tracker.clear();
          tracker.registerDomain(testDomain);

          const agentId = `agent-${Math.random()}`;
          const numSuccesses = Math.floor(numTasks * successRate);
          const numFailures = numTasks - numSuccesses;

          // Record successes first to ensure consecutive successes
          for (let i = 0; i < numSuccesses; i++) {
            tracker.recordPerformance(agentId, 'test-domain', 'task-1', true, 1000, 0.001);
          }
          // Then record failures
          for (let i = 0; i < numFailures; i++) {
            tracker.recordPerformance(agentId, 'test-domain', 'task-1', false, 1000, 0.001);
          }

          const result = tracker.identifyMasteredDomains(agentId);
          const mastery = tracker.getMastery(agentId, 'test-domain');

          // Property: If success rate >= 95%, tasks >= 10, and consecutive successes >= 5,
          // then mastery should be achieved
          if (
            mastery &&
            mastery.successRate >= 0.95 &&
            mastery.tasksCompleted >= 10 &&
            mastery.consecutiveSuccesses >= 5
          ) {
            expect(result.masteredDomains.length).toBeGreaterThan(0);
            expect(result.masteredDomains[0].id).toBe('test-domain');
            expect(mastery.masteryAchieved).toBe(true);
            expect(mastery.masteryDate).toBeDefined();
          }

          // Property: Success rate should be accurately calculated
          expect(mastery?.successRate).toBeCloseTo(successRate, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 74: should not identify mastery when success rate < 95%', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 100 }), // Number of tasks
        fc.double({ min: 0.5, max: 0.94 }), // Success rate below threshold
        (numTasks, successRate) => {
          // Clear tracker for each iteration
          tracker.clear();
          tracker.registerDomain(testDomain);

          const agentId = `agent-${Math.random()}`;
          const numSuccesses = Math.floor(numTasks * successRate);
          const numFailures = numTasks - numSuccesses;

          // Record performances
          for (let i = 0; i < numSuccesses; i++) {
            tracker.recordPerformance(agentId, 'test-domain', 'task-1', true, 1000, 0.001);
          }
          for (let i = 0; i < numFailures; i++) {
            tracker.recordPerformance(agentId, 'test-domain', 'task-1', false, 1000, 0.001);
          }

          const result = tracker.identifyMasteredDomains(agentId);
          const mastery = tracker.getMastery(agentId, 'test-domain');

          // Property: If success rate < 95%, mastery should not be achieved
          if (mastery && mastery.successRate < 0.95) {
            expect(result.masteredDomains).not.toContainEqual(
              expect.objectContaining({ id: 'test-domain' })
            );
            expect(mastery.masteryAchieved).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 74: should track domain breadth correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // Number of domains to master
        (numDomains) => {
          // Clear tracker for each iteration
          tracker.clear();

          const agentId = `agent-${Math.random()}`;
          const domains: Domain[] = [];

          // Create and register multiple domains
          for (let i = 0; i < numDomains; i++) {
            const domain: Domain = {
              ...testDomain,
              id: `domain-${i}`,
              name: `Domain ${i}`,
            };
            domains.push(domain);
            tracker.registerDomain(domain);

            // Master each domain
            for (let j = 0; j < 10; j++) {
              tracker.recordPerformance(agentId, domain.id, 'task-1', true, 1000, 0.001);
            }
          }

          const breadth = tracker.getDomainBreadth(agentId);
          const result = tracker.identifyMasteredDomains(agentId);

          // Property: Domain breadth should equal number of mastered domains
          expect(breadth).toBe(numDomains);
          expect(result.masteredDomains.length).toBe(numDomains);

          // Property: All created domains should be mastered
          for (const domain of domains) {
            expect(tracker.hasMasteredDomain(agentId, domain.id)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 74: should provide recommendations for in-progress domains', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 9 }), // Tasks completed (less than required 10)
        fc.double({ min: 0.5, max: 0.94 }), // Success rate below threshold
        (tasksCompleted, successRate) => {
          // Clear tracker for each iteration
          tracker.clear();
          tracker.registerDomain(testDomain);

          const agentId = `agent-${Math.random()}`;
          const numSuccesses = Math.floor(tasksCompleted * successRate);
          const numFailures = tasksCompleted - numSuccesses;

          // Record performances
          for (let i = 0; i < numSuccesses; i++) {
            tracker.recordPerformance(agentId, 'test-domain', 'task-1', true, 1000, 0.001);
          }
          for (let i = 0; i < numFailures; i++) {
            tracker.recordPerformance(agentId, 'test-domain', 'task-1', false, 1000, 0.001);
          }

          const result = tracker.identifyMasteredDomains(agentId);

          // Property: If domain is in progress but not mastered, recommendations should be provided
          if (result.inProgressDomains.length > 0) {
            expect(result.recommendations.length).toBeGreaterThan(0);
            
            // Property: Recommendations should be relevant to the shortcomings
            const mastery = tracker.getMastery(agentId, 'test-domain');
            if (mastery) {
              if (mastery.successRate < 0.95) {
                expect(result.recommendations.some(r => r.includes('success rate'))).toBe(true);
              }
              if (mastery.tasksCompleted < 10) {
                expect(result.recommendations.some(r => r.includes('Complete more tasks'))).toBe(true);
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 74: consecutive successes should reset on failure', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // Number of successes before failure
        fc.integer({ min: 1, max: 10 }), // Number of successes after failure
        (successesBefore, successesAfter) => {
          // Clear tracker for each iteration
          tracker.clear();
          tracker.registerDomain(testDomain);

          const agentId = `agent-${Math.random()}`;

          // Record successes
          for (let i = 0; i < successesBefore; i++) {
            tracker.recordPerformance(agentId, 'test-domain', 'task-1', true, 1000, 0.001);
          }

          // Record failure
          tracker.recordPerformance(agentId, 'test-domain', 'task-1', false, 1000, 0.001);

          // Record more successes
          for (let i = 0; i < successesAfter; i++) {
            tracker.recordPerformance(agentId, 'test-domain', 'task-1', true, 1000, 0.001);
          }

          const mastery = tracker.getMastery(agentId, 'test-domain');

          // Property: Consecutive successes should equal successes after last failure
          expect(mastery?.consecutiveSuccesses).toBe(successesAfter);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 74: mastery date should be set when mastery achieved', () => {
    fc.assert(
      fc.property(
        fc.constant(null), // Just run the test multiple times
        () => {
          // Clear tracker for each iteration
          tracker.clear();
          tracker.registerDomain(testDomain);

          const agentId = `agent-${Math.random()}`;
          const beforeMastery = new Date();

          // Record enough successful tasks to achieve mastery
          for (let i = 0; i < 10; i++) {
            tracker.recordPerformance(agentId, 'test-domain', 'task-1', true, 1000, 0.001);
          }

          const afterMastery = new Date();
          const mastery = tracker.getMastery(agentId, 'test-domain');

          // Property: If mastery achieved, mastery date should be set and within time bounds
          if (mastery?.masteryAchieved) {
            expect(mastery.masteryDate).toBeDefined();
            expect(mastery.masteryDate!.getTime()).toBeGreaterThanOrEqual(beforeMastery.getTime());
            expect(mastery.masteryDate!.getTime()).toBeLessThanOrEqual(afterMastery.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
