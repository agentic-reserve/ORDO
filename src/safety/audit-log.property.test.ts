/**
 * Property-Based Tests for Security Audit Logging
 * 
 * Feature: ordo-digital-civilization
 * Property 44: Security Audit Logging
 * 
 * Validates: Requirements 9.6
 * 
 * Tests that all security-relevant operations are logged with timestamp, agent ID, operation, and outcome.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  createAuditLog,
  logAuthentication,
  logAuthorization,
  logKeyAccess,
  logConstitutionalCheck,
  logViolationAttempt,
  logMultiSigRequest,
  logMultiSigApproval,
  logPromptInjectionDetected,
  logEmergencyStop,
  getAllAuditLogs,
  getAgentAuditLogs,
  getAuditLogsByType,
  getAuditLogsByOutcome,
  getAuditLogsByTimeRange,
  getAuditLogStats,
  searchAuditLogs,
  clearAuditLogs,
  exportAuditLogs,
  getSecurityEventsSummary,
} from './audit-log';
import type { SecurityOperationType, AgentAction, ActionType } from './types';

// Arbitrary generators
const arbitrarySecurityOperationType = fc.constantFrom<SecurityOperationType>(
  'authentication',
  'authorization',
  'key_access',
  'constitutional_check',
  'violation_attempt',
  'multi_sig_request',
  'multi_sig_approval',
  'prompt_injection_detected',
  'emergency_stop'
);

const arbitraryOutcome = fc.constantFrom<'success' | 'failure' | 'blocked'>(
  'success',
  'failure',
  'blocked'
);

const arbitraryAgentAction = fc.record({
  agentId: fc.uuid(),
  type: fc.constantFrom<ActionType>(
    'inference',
    'transaction',
    'self_modification',
    'replication',
    'tool_execution',
    'message',
    'state_change',
    'key_access',
    'constitution_query'
  ),
  description: fc.string({ minLength: 10, maxLength: 200 }),
  parameters: fc.dictionary(fc.string(), fc.anything()),
  timestamp: fc.date(),
});

describe('Security Audit Logging - Property Tests', () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  describe('Property 44: Security Audit Logging', () => {
    it('should log all security operations with required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string(),
          arbitrarySecurityOperationType,
          arbitraryOutcome,
          fc.dictionary(fc.string(), fc.anything()),
          async (agentId, operation, operationType, outcome, details) => {
            const log = createAuditLog({
              agentId,
              operation,
              operationType,
              outcome,
              details,
            });
            
            // Should have all required fields
            expect(log).toHaveProperty('id');
            expect(log).toHaveProperty('timestamp');
            expect(log).toHaveProperty('agentId');
            expect(log).toHaveProperty('operation');
            expect(log).toHaveProperty('operationType');
            expect(log).toHaveProperty('outcome');
            expect(log).toHaveProperty('details');
            
            // Fields should match input
            expect(log.agentId).toBe(agentId);
            expect(log.operation).toBe(operation);
            expect(log.operationType).toBe(operationType);
            expect(log.outcome).toBe(outcome);
            expect(log.details).toEqual(details);
            
            // Timestamp should be recent
            expect(log.timestamp).toBeInstanceOf(Date);
            expect(Date.now() - log.timestamp.getTime()).toBeLessThan(1000);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log authentication events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom<'success' | 'failure'>('success', 'failure'),
          fc.record({
            method: fc.constantFrom('password', 'keypair', 'siws', 'oauth'),
          }),
          async (agentId, outcome, details) => {
            const log = logAuthentication(agentId, outcome, details);
            
            // Should be authentication type
            expect(log.operationType).toBe('authentication');
            expect(log.operation).toBe('authentication');
            expect(log.agentId).toBe(agentId);
            expect(log.outcome).toBe(outcome);
            expect(log.details.method).toBe(details.method);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log authorization checks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string(),
          arbitraryOutcome,
          async (agentId, operation, outcome) => {
            const log = logAuthorization(agentId, operation, outcome);
            
            // Should be authorization type
            expect(log.operationType).toBe('authorization');
            expect(log.operation).toBe(operation);
            expect(log.agentId).toBe(agentId);
            expect(log.outcome).toBe(outcome);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log key access events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom('retrieve', 'store', 'rotate', 'export'),
          arbitraryOutcome,
          async (agentId, operation, outcome) => {
            const log = logKeyAccess(agentId, operation, outcome);
            
            // Should be key_access type
            expect(log.operationType).toBe('key_access');
            expect(log.operation).toBe(operation);
            expect(log.agentId).toBe(agentId);
            expect(log.outcome).toBe(outcome);
            expect(log.details.keyType).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log constitutional checks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryAgentAction,
          fc.constantFrom<'success' | 'blocked'>('success', 'blocked'),
          async (agentId, action, outcome) => {
            const log = logConstitutionalCheck(agentId, action, outcome);
            
            // Should be constitutional_check type
            expect(log.operationType).toBe('constitutional_check');
            expect(log.agentId).toBe(agentId);
            expect(log.outcome).toBe(outcome);
            expect(log.details.actionType).toBe(action.type);
            expect(log.details.actionDescription).toBe(action.description);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log violation attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string(),
          async (agentId, violationType) => {
            const log = logViolationAttempt(agentId, violationType);
            
            // Should be violation_attempt type
            expect(log.operationType).toBe('violation_attempt');
            expect(log.agentId).toBe(agentId);
            expect(log.outcome).toBe('blocked');
            expect(log.details.violationType).toBe(violationType);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log multi-sig requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.constantFrom<'success' | 'failure'>('success', 'failure'),
          async (agentId, operationId, outcome) => {
            const log = logMultiSigRequest(agentId, operationId, outcome);
            
            // Should be multi_sig_request type
            expect(log.operationType).toBe('multi_sig_request');
            expect(log.agentId).toBe(agentId);
            expect(log.outcome).toBe(outcome);
            expect(log.details.operationId).toBe(operationId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log multi-sig approvals', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.boolean(),
          async (agentId, operationId, approverId, approved) => {
            const log = logMultiSigApproval(agentId, operationId, approverId, approved);
            
            // Should be multi_sig_approval type
            expect(log.operationType).toBe('multi_sig_approval');
            expect(log.agentId).toBe(agentId);
            expect(log.outcome).toBe('success');
            expect(log.details.operationId).toBe(operationId);
            expect(log.details.approverId).toBe(approverId);
            expect(log.details.approved).toBe(approved);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log prompt injection detection', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          async (agentId, patterns) => {
            const log = logPromptInjectionDetected(agentId, patterns);
            
            // Should be prompt_injection_detected type
            expect(log.operationType).toBe('prompt_injection_detected');
            expect(log.agentId).toBe(agentId);
            expect(log.outcome).toBe('blocked');
            expect(log.details.patterns).toEqual(patterns);
            expect(log.details.patternCount).toBe(patterns.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log emergency stop events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom('human_activated', 'automatic', 'dead_man_switch'),
          fc.uuid(),
          async (agentId, stopType, triggeredBy) => {
            const log = logEmergencyStop(agentId, stopType, triggeredBy);
            
            // Should be emergency_stop type
            expect(log.operationType).toBe('emergency_stop');
            expect(log.agentId).toBe(agentId);
            expect(log.outcome).toBe('success');
            expect(log.details.stopType).toBe(stopType);
            expect(log.details.triggeredBy).toBe(triggeredBy);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain immutable audit logs', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.string(),
          arbitrarySecurityOperationType,
          arbitraryOutcome,
          async (agentId, operation, operationType, outcome) => {
            const log = createAuditLog({
              agentId,
              operation,
              operationType,
              outcome,
              details: {},
            });
            
            const originalId = log.id;
            const originalTimestamp = log.timestamp;
            const originalOutcome = log.outcome;
            
            // Try to modify log (should be frozen and throw error in strict mode)
            // In non-strict mode, it will silently fail
            try {
              (log as any).outcome = 'failure';
              (log as any).agentId = 'modified';
            } catch (error) {
              // Expected in strict mode
            }
            
            // Retrieve log from storage
            const allLogs = getAllAuditLogs();
            const storedLog = allLogs.find(l => l.id === originalId);
            
            // Stored log should be unchanged
            expect(storedLog).toBeDefined();
            expect(storedLog!.id).toBe(originalId);
            expect(storedLog!.timestamp).toEqual(originalTimestamp);
            expect(storedLog!.outcome).toBe(originalOutcome);
            expect(storedLog!.agentId).toBe(agentId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should retrieve logs by agent ID', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
          async (agentId, operations) => {
            // Create logs for the agent
            for (const operation of operations) {
              logAuthentication(agentId, 'success', { operation });
            }
            
            // Retrieve logs
            const logs = getAgentAuditLogs(agentId);
            
            // Should have all logs for the agent
            expect(logs.length).toBeGreaterThanOrEqual(operations.length);
            
            // All logs should belong to the agent
            for (const log of logs) {
              expect(log.agentId).toBe(agentId);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should retrieve logs by operation type', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitrarySecurityOperationType,
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (operationType, agentIds) => {
            // Create logs of specific type
            for (const agentId of agentIds) {
              createAuditLog({
                agentId,
                operation: 'test',
                operationType,
                outcome: 'success',
                details: {},
              });
            }
            
            // Retrieve logs by type
            const logs = getAuditLogsByType(operationType);
            
            // Should have all logs of that type
            expect(logs.length).toBeGreaterThanOrEqual(agentIds.length);
            
            // All logs should be of the specified type
            for (const log of logs) {
              expect(log.operationType).toBe(operationType);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should retrieve logs by outcome', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryOutcome,
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (outcome, agentIds) => {
            // Create logs with specific outcome
            for (const agentId of agentIds) {
              createAuditLog({
                agentId,
                operation: 'test',
                operationType: 'authentication',
                outcome,
                details: {},
              });
            }
            
            // Retrieve logs by outcome
            const logs = getAuditLogsByOutcome(outcome);
            
            // Should have all logs with that outcome
            expect(logs.length).toBeGreaterThanOrEqual(agentIds.length);
            
            // All logs should have the specified outcome
            for (const log of logs) {
              expect(log.outcome).toBe(outcome);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should retrieve logs by time range', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 3, maxLength: 10 }),
          async (agentId, delays) => {
            const startTime = new Date();
            
            // Create logs with small delays
            for (const delay of delays) {
              await new Promise(resolve => setTimeout(resolve, delay));
              logAuthentication(agentId, 'success');
            }
            
            const endTime = new Date();
            
            // Retrieve logs in time range
            const logs = getAuditLogsByTimeRange(startTime, endTime);
            
            // Should have logs within range
            expect(logs.length).toBeGreaterThan(0);
            
            // All logs should be within range
            for (const log of logs) {
              expect(log.timestamp >= startTime).toBe(true);
              expect(log.timestamp <= endTime).toBe(true);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should provide audit log statistics', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              agentId: fc.uuid(),
              operationType: arbitrarySecurityOperationType,
              outcome: arbitraryOutcome,
            }),
            { minLength: 5, maxLength: 20 }
          ),
          async (logParams) => {
            // Create logs
            for (const params of logParams) {
              createAuditLog({
                agentId: params.agentId,
                operation: 'test',
                operationType: params.operationType,
                outcome: params.outcome,
                details: {},
              });
            }
            
            // Get statistics
            const stats = getAuditLogStats();
            
            // Should have correct total
            expect(stats.total).toBeGreaterThanOrEqual(logParams.length);
            
            // Should have type breakdown
            expect(stats.byType).toBeDefined();
            expect(Object.keys(stats.byType).length).toBeGreaterThan(0);
            
            // Should have outcome breakdown
            expect(stats.byOutcome).toBeDefined();
            expect(stats.byOutcome.success + stats.byOutcome.failure + stats.byOutcome.blocked).toBe(stats.total);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should search logs with multiple criteria', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitrarySecurityOperationType,
          arbitraryOutcome,
          async (agentId, operationType, outcome) => {
            // Create log
            createAuditLog({
              agentId,
              operation: 'test_operation',
              operationType,
              outcome,
              details: {},
            });
            
            // Search with multiple criteria
            const results = searchAuditLogs({
              agentId,
              operationType,
              outcome,
            });
            
            // Should find the log
            expect(results.length).toBeGreaterThan(0);
            
            // All results should match criteria
            for (const log of results) {
              expect(log.agentId).toBe(agentId);
              expect(log.operationType).toBe(operationType);
              expect(log.outcome).toBe(outcome);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should export logs to JSON', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              agentId: fc.uuid(),
              operation: fc.string(),
              operationType: arbitrarySecurityOperationType,
              outcome: arbitraryOutcome,
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (logParams) => {
            // Create logs
            for (const params of logParams) {
              createAuditLog({
                ...params,
                details: {},
              });
            }
            
            // Export logs
            const json = exportAuditLogs();
            
            // Should be valid JSON
            expect(() => JSON.parse(json)).not.toThrow();
            
            // Should contain logs
            const parsed = JSON.parse(json);
            expect(Array.isArray(parsed)).toBe(true);
            expect(parsed.length).toBeGreaterThanOrEqual(logParams.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should provide security events summary', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          async (agentId) => {
            // Create various security events
            logAuthentication(agentId, 'success');
            logAuthentication(agentId, 'failure');
            logKeyAccess(agentId, 'retrieve', 'success');
            logViolationAttempt(agentId, 'test_violation');
            logMultiSigRequest(agentId, 'op1', 'success');
            
            // Get summary
            const summary = getSecurityEventsSummary(agentId);
            
            // Should have all fields
            expect(summary).toHaveProperty('totalEvents');
            expect(summary).toHaveProperty('authenticationAttempts');
            expect(summary).toHaveProperty('authenticationFailures');
            expect(summary).toHaveProperty('blockedOperations');
            expect(summary).toHaveProperty('violationAttempts');
            expect(summary).toHaveProperty('keyAccessEvents');
            expect(summary).toHaveProperty('multiSigOperations');
            expect(summary).toHaveProperty('recentEvents');
            
            // Should have correct counts
            expect(summary.totalEvents).toBeGreaterThanOrEqual(5);
            expect(summary.authenticationAttempts).toBeGreaterThanOrEqual(2);
            expect(summary.authenticationFailures).toBeGreaterThanOrEqual(1);
            expect(summary.blockedOperations).toBeGreaterThanOrEqual(1);
            expect(summary.violationAttempts).toBeGreaterThanOrEqual(1);
            expect(summary.keyAccessEvents).toBeGreaterThanOrEqual(1);
            expect(summary.multiSigOperations).toBeGreaterThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain log ordering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 3, maxLength: 10 }),
          async (agentId, delays) => {
            // Create logs with small delays
            for (const delay of delays) {
              await new Promise(resolve => setTimeout(resolve, delay));
              logAuthentication(agentId, 'success');
            }
            
            // Get all logs
            const logs = getAllAuditLogs();
            
            // Should be in chronological order
            for (let i = 1; i < logs.length; i++) {
              expect(logs[i].timestamp >= logs[i - 1].timestamp).toBe(true);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
