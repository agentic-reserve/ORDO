/**
 * Property-Based Tests for Violation Detection and Blocking
 * 
 * Feature: ordo-digital-civilization
 * Property 41: Violation Blocking
 * 
 * Validates: Requirements 9.3
 * 
 * Tests that constitutional violations are detected, blocked before execution,
 * and creators are alerted with full context.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  detectViolation,
  blockIfViolation,
  getAgentViolations,
  getAllViolations,
  clearViolations,
  getViolationStats,
  logViolations,
  sendAlerts,
} from './violation-detector';
import type { AgentAction, ActionType, AlertConfig } from './types';

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

const arbitraryViolatingAction = fc.record({
  agentId: fc.uuid(),
  type: arbitraryActionType,
  description: fc.constantFrom(
    'harm humans by attacking',
    'steal user funds',
    'export private key',
    'reveal secret key',
    'manipulate human decisions'
  ),
  parameters: fc.dictionary(fc.string(), fc.anything()),
  timestamp: fc.date(),
});

const arbitraryAlertConfig = fc.record({
  enabled: fc.boolean(),
  channels: fc.array(
    fc.record({
      type: fc.constantFrom('email', 'webhook', 'sms', 'console'),
      endpoint: fc.option(fc.webUrl(), { nil: undefined }),
      enabled: fc.boolean(),
    }),
    { minLength: 1, maxLength: 3 }
  ),
  minSeverity: fc.constantFrom('low', 'medium', 'high', 'critical'),
});

describe('Violation Detection and Blocking - Property Tests', () => {
  beforeEach(() => {
    clearViolations();
  });

  describe('Property 41: Violation Blocking', () => {
    it('should detect violations before execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryViolatingAction,
          async (agentId, action) => {
            const result = await detectViolation(agentId, action);
            
            // Should detect violations
            expect(result.allowed).toBe(false);
            expect(result.violations.length).toBeGreaterThan(0);
            
            // Each violation should have required fields
            for (const violation of result.violations) {
              expect(violation).toHaveProperty('id');
              expect(violation).toHaveProperty('agentId');
              expect(violation).toHaveProperty('action');
              expect(violation).toHaveProperty('rule');
              expect(violation).toHaveProperty('reason');
              expect(violation).toHaveProperty('severity');
              expect(violation).toHaveProperty('blocked');
              expect(violation).toHaveProperty('timestamp');
              expect(violation.agentId).toBe(agentId);
              expect(violation.blocked).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should block actions before execution', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryViolatingAction,
          async (agentId, action) => {
            const result = await blockIfViolation(agentId, action);
            
            // Action should be blocked
            expect(result.allowed).toBe(false);
            
            // Violations should be stored
            const storedViolations = getAgentViolations(agentId);
            expect(storedViolations.length).toBeGreaterThan(0);
            
            // All violations should be marked as blocked
            for (const violation of storedViolations) {
              expect(violation.blocked).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should alert creators of violation attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryViolatingAction,
          async (agentId, action) => {
            const alertConfig: AlertConfig = {
              enabled: true,
              channels: [{ type: 'console', enabled: true }],
              minSeverity: 'low',
            };
            
            const result = await blockIfViolation(agentId, action, alertConfig);
            
            // Violations should be detected
            expect(result.violations.length).toBeGreaterThan(0);
            
            // Alerts should be sent (alertSent flag should be true)
            const storedViolations = getAgentViolations(agentId);
            const alertedViolations = storedViolations.filter(v => v.alertSent);
            expect(alertedViolations.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log violations with full context', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryViolatingAction,
          async (agentId, action) => {
            const result = await blockIfViolation(agentId, action);
            
            // Violations should be logged
            const violations = getAgentViolations(agentId);
            expect(violations.length).toBeGreaterThan(0);
            
            // Each violation should have full context
            for (const violation of violations) {
              expect(violation.action).toBeDefined();
              expect(violation.action.type).toBeDefined();
              expect(violation.action.description).toBeDefined();
              expect(violation.action.parameters).toBeDefined();
              expect(violation.timestamp).toBeInstanceOf(Date);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow non-violating actions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.record({
            agentId: fc.uuid(),
            type: arbitraryActionType,
            description: fc.constantFrom(
              'process user request',
              'calculate result',
              'store data safely',
              'help user achieve goal'
            ),
            parameters: fc.dictionary(fc.string(), fc.anything()),
            timestamp: fc.date(),
          }),
          async (agentId, action) => {
            const result = await blockIfViolation(agentId, action);
            
            // Non-violating actions should be allowed
            expect(result.allowed).toBe(true);
            expect(result.violations.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track violation statistics per agent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.array(arbitraryViolatingAction, { minLength: 1, maxLength: 10 }),
          async (agentId, actions) => {
            // Block multiple actions
            for (const action of actions) {
              await blockIfViolation(agentId, action);
            }
            
            // Get statistics
            const stats = getViolationStats(agentId);
            
            // Should have statistics
            expect(stats.total).toBeGreaterThan(0);
            expect(stats.bySeverity).toBeDefined();
            expect(stats.byRule).toBeDefined();
            
            // Total should match stored violations
            const storedViolations = getAgentViolations(agentId);
            expect(stats.total).toBe(storedViolations.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should filter alerts by severity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryViolatingAction,
          fc.constantFrom('low', 'medium', 'high', 'critical'),
          async (agentId, action, minSeverity) => {
            const alertConfig: AlertConfig = {
              enabled: true,
              channels: [{ type: 'console', enabled: true }],
              minSeverity: minSeverity as 'low' | 'medium' | 'high' | 'critical',
            };
            
            const result = await blockIfViolation(agentId, action, alertConfig);
            
            // Violations should be detected
            expect(result.violations.length).toBeGreaterThan(0);
            
            // Only violations meeting severity threshold should be alerted
            const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
            const minLevel = severityOrder[minSeverity];
            
            const storedViolations = getAgentViolations(agentId);
            for (const violation of storedViolations) {
              const violationLevel = severityOrder[violation.severity];
              if (violationLevel >= minLevel) {
                // Should be alerted
                expect(violation.alertSent).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should store violations across multiple agents', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
          arbitraryViolatingAction,
          async (agentIds, action) => {
            // Block action for multiple agents
            for (const agentId of agentIds) {
              await blockIfViolation(agentId, action);
            }
            
            // Each agent should have violations
            for (const agentId of agentIds) {
              const violations = getAgentViolations(agentId);
              expect(violations.length).toBeGreaterThan(0);
            }
            
            // All violations should be retrievable
            const allViolations = getAllViolations();
            expect(allViolations.length).toBeGreaterThanOrEqual(agentIds.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain violation immutability', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          arbitraryViolatingAction,
          async (agentId, action) => {
            const result = await blockIfViolation(agentId, action);
            
            if (result.violations.length > 0) {
              const violation = result.violations[0];
              const originalId = violation.id;
              const originalTimestamp = violation.timestamp;
              
              // Try to modify violation
              violation.blocked = false;
              violation.alertSent = false;
              
              // Stored violation should remain unchanged
              const storedViolations = getAgentViolations(agentId);
              const storedViolation = storedViolations.find(v => v.id === originalId);
              
              expect(storedViolation).toBeDefined();
              expect(storedViolation!.blocked).toBe(true);
              expect(storedViolation!.timestamp).toEqual(originalTimestamp);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
