/**
 * Property-Based Tests for Knowledge Transfer
 * 
 * Property 76: Knowledge Transfer
 * For any cross-domain transfer, the system should enable transfer of principles
 * and patterns, measuring transfer effectiveness.
 * 
 * Validates: Requirements 17.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { KnowledgeTransferManager } from './knowledge-transfer';
import { domainMasteryTracker } from './domain-mastery';
import type { Domain } from './types';

describe('Property 76: Knowledge Transfer', () => {
  let manager: KnowledgeTransferManager;

  beforeEach(() => {
    manager = new KnowledgeTransferManager();
    domainMasteryTracker.clear();
  });

  const createTestDomain = (id: string, sharedPrinciples: string[]): Domain => ({
    id,
    name: `Domain ${id}`,
    description: `Test domain ${id}`,
    tasks: [{ id: 'task-1', name: 'Task 1', description: 'Test task', difficulty: 5, requiredSkills: [] }],
    successCriteria: { minSuccessRate: 0.95, minTasksCompleted: 10, minConsecutiveSuccesses: 5 },
    principles: sharedPrinciples,
    structure: {
      hierarchy: ['concept1', 'concept2'],
      relationships: { concept1: ['concept2'] },
      patterns: ['pattern1'],
      constraints: ['constraint1'],
    },
  });

  it('Property 76: should successfully transfer knowledge from mastered domain', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 2, maxLength: 5 }),
        async (sharedPrinciples) => {
          // Clear for each iteration
          manager.clear();
          domainMasteryTracker.clear();

          const sourceDomain = createTestDomain('source', sharedPrinciples);
          const targetDomain = createTestDomain('target', sharedPrinciples);

          domainMasteryTracker.registerDomain(sourceDomain);
          domainMasteryTracker.registerDomain(targetDomain);

          const agentId = `agent-${Math.random()}`;

          // Master source domain
          for (let i = 0; i < 10; i++) {
            domainMasteryTracker.recordPerformance(agentId, 'source', 'task-1', true, 1000, 0.001);
          }

          const result = await manager.transferKnowledge(agentId, 'source', 'target');

          // Property: Transfer should succeed
          expect(result.success).toBe(true);

          // Property: Transfer should have valid effectiveness (0-1)
          expect(result.transfer.effectiveness).toBeGreaterThanOrEqual(0);
          expect(result.transfer.effectiveness).toBeLessThanOrEqual(1);

          // Property: Should apply shared principles
          expect(result.transfer.principlesApplied.length).toBeGreaterThan(0);

          // Property: Should generate lessons learned
          expect(result.lessonsLearned.length).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 } // Reduced runs due to async operations
    );
  });

  it('Property 76: effectiveness should be between 0 and 1', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        async () => {
          manager.clear();
          domainMasteryTracker.clear();

          const sourceDomain = createTestDomain('source', ['principle1', 'principle2']);
          const targetDomain = createTestDomain('target', ['principle1', 'principle2']);

          domainMasteryTracker.registerDomain(sourceDomain);
          domainMasteryTracker.registerDomain(targetDomain);

          const agentId = `agent-${Math.random()}`;

          // Master source domain
          for (let i = 0; i < 10; i++) {
            domainMasteryTracker.recordPerformance(agentId, 'source', 'task-1', true, 1000, 0.001);
          }

          const result = await manager.transferKnowledge(agentId, 'source', 'target');

          // Property: Effectiveness must be in valid range
          expect(result.improvementMeasured).toBeGreaterThanOrEqual(0);
          expect(result.improvementMeasured).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 76: should track all transfers for an agent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        async (numTransfers) => {
          manager.clear();
          domainMasteryTracker.clear();

          const agentId = `agent-${Math.random()}`;
          const sourceDomain = createTestDomain('source', ['principle1']);
          domainMasteryTracker.registerDomain(sourceDomain);

          // Master source domain
          for (let i = 0; i < 10; i++) {
            domainMasteryTracker.recordPerformance(agentId, 'source', 'task-1', true, 1000, 0.001);
          }

          // Perform multiple transfers
          for (let i = 0; i < numTransfers; i++) {
            const targetDomain = createTestDomain(`target-${i}`, ['principle1']);
            domainMasteryTracker.registerDomain(targetDomain);
            await manager.transferKnowledge(agentId, 'source', `target-${i}`);
          }

          const transfers = manager.getAgentTransfers(agentId);

          // Property: Should track all transfers
          expect(transfers.length).toBe(numTransfers);
        }
      ),
      { numRuns: 50 }
    );
  });
});
