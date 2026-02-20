/**
 * Property-Based Tests for Multi-Signature System
 * 
 * Feature: ordo-digital-civilization
 * Property 43: Multi-Signature Requirement
 * 
 * Validates: Requirements 9.5
 * 
 * Tests that sensitive operations require multi-signature approval from n-of-m authorized parties.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  requiresMultiSig,
  createMultiSigOperation,
  approveOperation,
  rejectOperation,
  executeOperation,
  getOperation,
  getAgentOperations,
  getPendingOperations,
  cleanupExpiredOperations,
  clearOperations,
  getOperationStats,
  canProceed,
  SENSITIVE_OPERATION_THRESHOLDS,
} from './multi-sig';
import type { AgentAction, ActionType, MultiSigConfig } from './types';

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
});

const arbitraryLargeTransferAction = fc.record({
  agentId: fc.uuid(),
  type: fc.constant<ActionType>('transaction'),
  description: fc.constant('Large SOL transfer'),
  parameters: fc.record({
    amount: fc.double({ min: 1.1, max: 100, noNaN: true }), // Above threshold, no NaN
    recipient: fc.uuid(),
  }),
  timestamp: fc.date(),
});

const arbitraryKeyAccessAction = fc.record({
  agentId: fc.uuid(),
  type: fc.constant<ActionType>('key_access'),
  description: fc.constant('Export private key'),
  parameters: fc.record({
    operation: fc.constant('export'),
  }),
  timestamp: fc.date(),
});

const arbitraryConstitutionChangeAction = fc.record({
  agentId: fc.uuid(),
  type: fc.constant<ActionType>('constitution_query'),
  description: fc.constant('Modify constitution'),
  parameters: fc.record({
    modify: fc.constant(true),
    rule: fc.string(),
  }),
  timestamp: fc.date(),
});

const arbitraryMultiSigConfig = fc.record({
  requiredApprovals: fc.integer({ min: 2, max: 5 }),
  totalApprovers: fc.integer({ min: 3, max: 10 }),
  approvers: fc.array(fc.uuid(), { minLength: 3, maxLength: 10 }),
  expirationMinutes: fc.integer({ min: 5, max: 120 }),
});

describe('Multi-Signature System - Property Tests', () => {
  beforeEach(() => {
    clearOperations();
  });

  describe('Property 43: Multi-Signature Requirement', () => {
    it('should require multi-sig for large transfers', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryLargeTransferAction, async (action) => {
          const required = requiresMultiSig(action);
          
          // Large transfers should require multi-sig
          expect(required).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should require multi-sig for key access operations', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryKeyAccessAction, async (action) => {
          const required = requiresMultiSig(action);
          
          // Key access should always require multi-sig
          expect(required).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should require multi-sig for constitution changes', async () => {
      await fc.assert(
        fc.asyncProperty(arbitraryConstitutionChangeAction, async (action) => {
          const required = requiresMultiSig(action);
          
          // Constitution changes should require multi-sig
          expect(required).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should create multi-sig operations with correct structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryLargeTransferAction,
          arbitraryMultiSigConfig,
          async (agentId, action, config) => {
            const operation = createMultiSigOperation(agentId, action, config);
            
            // Operation should have required fields
            expect(operation).toHaveProperty('id');
            expect(operation).toHaveProperty('agentId');
            expect(operation).toHaveProperty('operation');
            expect(operation).toHaveProperty('parameters');
            expect(operation).toHaveProperty('requiredApprovals');
            expect(operation).toHaveProperty('approvals');
            expect(operation).toHaveProperty('status');
            expect(operation).toHaveProperty('createdAt');
            expect(operation).toHaveProperty('expiresAt');
            
            // Initial state should be correct
            expect(operation.agentId).toBe(agentId);
            expect(operation.status).toBe('pending');
            expect(operation.approvals.length).toBe(0);
            expect(operation.requiredApprovals).toBe(config.requiredApprovals);
            expect(operation.expiresAt > operation.createdAt).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should require n-of-m approvals before execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryLargeTransferAction,
          fc.record({
            requiredApprovals: fc.constant(3),
            totalApprovers: fc.constant(5),
            approvers: fc.constant(['approver1', 'approver2', 'approver3', 'approver4', 'approver5']),
            expirationMinutes: fc.constant(60),
          }),
          async (agentId, action, config) => {
            const operation = createMultiSigOperation(agentId, action, config);
            
            // Should be pending initially
            expect(operation.status).toBe('pending');
            
            // Add first approval
            const op1 = approveOperation(operation.id, 'approver1');
            expect(op1.status).toBe('pending');
            expect(op1.approvals.length).toBe(1);
            
            // Add second approval
            const op2 = approveOperation(operation.id, 'approver2');
            expect(op2.status).toBe('pending');
            expect(op2.approvals.length).toBe(2);
            
            // Add third approval (reaches threshold)
            const op3 = approveOperation(operation.id, 'approver3');
            expect(op3.status).toBe('approved');
            expect(op3.approvals.length).toBe(3);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prevent duplicate approvals from same approver', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryLargeTransferAction,
          fc.uuid(),
          async (agentId, action, approverId) => {
            const operation = createMultiSigOperation(agentId, action);
            
            // First approval should succeed
            approveOperation(operation.id, approverId);
            
            // Second approval from same approver should fail
            expect(() => {
              approveOperation(operation.id, approverId);
            }).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject operations when rejected by any approver', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryLargeTransferAction,
          fc.uuid(),
          async (agentId, action, approverId) => {
            const operation = createMultiSigOperation(agentId, action);
            
            // Reject operation
            const rejected = rejectOperation(operation.id, approverId);
            
            // Should be rejected
            expect(rejected.status).toBe('rejected');
            expect(rejected.approvals.length).toBe(1);
            expect(rejected.approvals[0].approved).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only execute approved operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryLargeTransferAction,
          async (agentId, action) => {
            const config = {
              requiredApprovals: 2,
              totalApprovers: 3,
              approvers: ['approver1', 'approver2', 'approver3'],
              expirationMinutes: 60,
            };
            
            const operation = createMultiSigOperation(agentId, action, config);
            
            // Try to execute without approvals - should fail
            await expect(executeOperation(operation.id)).rejects.toThrow();
            
            // Add approvals
            approveOperation(operation.id, 'approver1');
            approveOperation(operation.id, 'approver2');
            
            // Now should execute successfully
            const result = await executeOperation(operation.id);
            expect(result.success).toBe(true);
            
            // Operation should be marked as executed
            const executed = getOperation(operation.id);
            expect(executed?.status).toBe('executed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track all operations for an agent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(arbitraryLargeTransferAction, { minLength: 1, maxLength: 5 }),
          async (agentId, actions) => {
            // Create multiple operations for the same agent
            const operationIds: string[] = [];
            
            for (const action of actions) {
              const operation = createMultiSigOperation(agentId, action);
              operationIds.push(operation.id);
            }
            
            // Get all operations for agent
            const agentOps = getAgentOperations(agentId);
            
            // Should have all operations
            expect(agentOps.length).toBe(actions.length);
            
            // All operations should belong to the agent
            for (const op of agentOps) {
              expect(op.agentId).toBe(agentId);
              expect(operationIds).toContain(op.id);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should list pending operations for approvers', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryLargeTransferAction,
          fc.uuid(),
          async (agentId, action, approverId) => {
            const operation = createMultiSigOperation(agentId, action);
            
            // Should appear in pending operations
            const pending = getPendingOperations(approverId);
            expect(pending.some(op => op.id === operation.id)).toBe(true);
            
            // After approval, should not appear for that approver
            approveOperation(operation.id, approverId);
            const pendingAfter = getPendingOperations(approverId);
            expect(pendingAfter.some(op => op.id === operation.id)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should expire operations after timeout', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryLargeTransferAction,
          async (agentId, action) => {
            const config = {
              requiredApprovals: 2,
              totalApprovers: 3,
              approvers: ['approver1', 'approver2', 'approver3'],
              expirationMinutes: 0, // Expire immediately
            };
            
            const operation = createMultiSigOperation(agentId, action, config);
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Try to approve expired operation - should fail
            expect(() => {
              approveOperation(operation.id, 'approver1');
            }).toThrow(/expired/i);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should clean up expired operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(arbitraryLargeTransferAction, { minLength: 2, maxLength: 5 }),
          async (agentId, actions) => {
            // Create operations with immediate expiration
            const config = {
              requiredApprovals: 2,
              totalApprovers: 3,
              approvers: ['approver1', 'approver2', 'approver3'],
              expirationMinutes: 0,
            };
            
            for (const action of actions) {
              createMultiSigOperation(agentId, action, config);
            }
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 10));
            
            // Clean up expired operations
            const cleaned = cleanupExpiredOperations();
            
            // Should have cleaned up all operations
            expect(cleaned).toBe(actions.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide operation statistics', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(arbitraryLargeTransferAction, { minLength: 3, maxLength: 10 }),
          async (agentId, actions) => {
            // Clear operations before test
            clearOperations();
            
            const config = {
              requiredApprovals: 2,
              totalApprovers: 3,
              approvers: ['approver1', 'approver2', 'approver3'],
              expirationMinutes: 60,
            };
            
            // Create operations with different states
            const operations: string[] = [];
            
            for (let i = 0; i < actions.length; i++) {
              const op = createMultiSigOperation(agentId, actions[i], config);
              operations.push(op.id);
              
              if (i % 3 === 0) {
                // Approve some
                approveOperation(op.id, 'approver1');
                approveOperation(op.id, 'approver2');
              } else if (i % 3 === 1) {
                // Reject some
                rejectOperation(op.id, 'approver1');
              }
              // Leave some pending
            }
            
            // Get statistics
            const stats = getOperationStats();
            
            // Should have correct totals
            expect(stats.total).toBe(actions.length);
            expect(stats.pending + stats.approved + stats.rejected + stats.executed).toBe(stats.total);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should allow non-sensitive operations to proceed without multi-sig', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            agentId: fc.uuid(),
            type: fc.constant<ActionType>('inference'),
            description: fc.constant('Regular inference operation'),
            parameters: fc.record({
              model: fc.string(),
              prompt: fc.string(),
            }),
            timestamp: fc.date(),
          }),
          async (action) => {
            // Should not require multi-sig
            const required = requiresMultiSig(action);
            expect(required).toBe(false);
            
            // Should be able to proceed
            const proceed = canProceed(action);
            expect(proceed).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should block sensitive operations without approval', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryLargeTransferAction,
          async (action) => {
            // Should require multi-sig
            const required = requiresMultiSig(action);
            expect(required).toBe(true);
            
            // Should not be able to proceed without operation ID
            const proceed = canProceed(action);
            expect(proceed).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow sensitive operations with approval', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryLargeTransferAction,
          async (agentId, action) => {
            const config = {
              requiredApprovals: 2,
              totalApprovers: 3,
              approvers: ['approver1', 'approver2', 'approver3'],
              expirationMinutes: 60,
            };
            
            // Create operation
            const operation = createMultiSigOperation(agentId, action, config);
            
            // Should not proceed yet
            expect(canProceed(action, operation.id)).toBe(false);
            
            // Add approvals
            approveOperation(operation.id, 'approver1');
            approveOperation(operation.id, 'approver2');
            
            // Now should proceed
            expect(canProceed(action, operation.id)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain operation immutability after execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryLargeTransferAction,
          async (agentId, action) => {
            const config = {
              requiredApprovals: 2,
              totalApprovers: 3,
              approvers: ['approver1', 'approver2', 'approver3'],
              expirationMinutes: 60,
            };
            
            const operation = createMultiSigOperation(agentId, action, config);
            
            // Approve and execute
            approveOperation(operation.id, 'approver1');
            approveOperation(operation.id, 'approver2');
            await executeOperation(operation.id);
            
            // Try to approve again - should fail
            expect(() => {
              approveOperation(operation.id, 'approver3');
            }).toThrow(/not pending/i);
            
            // Try to execute again - should fail
            await expect(executeOperation(operation.id)).rejects.toThrow(/not approved/i);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
