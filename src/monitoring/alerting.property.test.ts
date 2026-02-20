/**
 * Property-Based Tests for Critical State Alerting
 * 
 * Feature: ordo-digital-civilization, Property 57: Critical State Alerting
 * Validates: Requirements 13.4
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { AlertingSystem, type AlertConfig } from './alerting.js
import { AgentMetricsTracker } from './agent-metrics.js

describe('Property 57: Critical State Alerting', () => {
  let alerting: AlertingSystem;
  let metricsTracker: AgentMetricsTracker;

  beforeEach(() => {
    const config: Partial<AlertConfig> = {
      channels: [{ type: 'console', config: {} }],
      thresholds: {
        criticalBalance: 0.1,
        warningBalance: 1.0,
        errorRateThreshold: 10,
        latencyThreshold: 1000,
      },
    };
    alerting = new AlertingSystem(config);
    metricsTracker = new AgentMetricsTracker();
  });

  afterEach(() => {
    alerting.clearAlertHistory();
    metricsTracker.clearCache();
  });

  it('should alert when balance < 0.1 SOL', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 0.099, noNaN: true }),
        async (agentId, balance) => {
          // Initialize agent with low balance
          await metricsTracker.initializeMetrics(agentId, balance);

          // Check state
          const alerts = await alerting.checkAgentState(agentId);

          // Should generate critical balance alert
          const balanceAlerts = alerts.filter((a) => a.type === 'balance');
          expect(balanceAlerts.length).toBeGreaterThan(0);
          expect(balanceAlerts[0].severity).toBe('critical');
          expect(balanceAlerts[0].message).toContain('critically low');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should alert when error rate > 10%', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 1, max: 100, noNaN: true }),
        fc.array(fc.boolean(), { minLength: 10, maxLength: 20 }),
        async (agentId, initialBalance, outcomes) => {
          // Initialize agent
          await metricsTracker.initializeMetrics(agentId, initialBalance);

          // Create outcomes with high error rate
          const errorRate = outcomes.filter((o) => !o).length / outcomes.length;
          
          // Only test if error rate is actually > 10%
          if (errorRate <= 0.1) {
            return;
          }

          // Track outcomes
          for (const success of outcomes) {
            await metricsTracker.updateMetrics({
              agentId,
              success,
            });
          }

          // Check state
          const alerts = await alerting.checkAgentState(agentId);

          // Should generate error rate alert
          const errorAlerts = alerts.filter((a) => a.type === 'error_rate');
          expect(errorAlerts.length).toBeGreaterThan(0);
          expect(errorAlerts[0].severity).toBe('critical');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should alert when latency > 1s', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 1, max: 100, noNaN: true }),
        fc.array(fc.double({ min: 1001, max: 5000, noNaN: true }), { minLength: 5, maxLength: 10 }),
        async (agentId, initialBalance, latencies) => {
          // Initialize agent
          await metricsTracker.initializeMetrics(agentId, initialBalance);

          // Track high latencies
          for (const latency of latencies) {
            await metricsTracker.updateMetrics({
              agentId,
              latency,
            });
          }

          // Check state
          const alerts = await alerting.checkAgentState(agentId);

          // Should generate latency alert
          const latencyAlerts = alerts.filter((a) => a.type === 'latency');
          expect(latencyAlerts.length).toBeGreaterThan(0);
          expect(latencyAlerts[0].severity).toBe('critical');
          expect(latencyAlerts[0].message).toContain('latency high');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should send alerts via configured channels', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 0.05, noNaN: true }),
        async (agentId, balance) => {
          // Initialize agent with critical balance
          await metricsTracker.initializeMetrics(agentId, balance);

          // Check state (this will send alerts)
          const alerts = await alerting.checkAgentState(agentId);

          // Verify alerts were generated
          expect(alerts.length).toBeGreaterThan(0);
          expect(alerts[0].agentId).toBe(agentId);
          expect(alerts[0].timestamp).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should include metadata in alerts', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 0.099, noNaN: true }),
        async (agentId, balance) => {
          // Initialize agent
          await metricsTracker.initializeMetrics(agentId, balance);

          // Check state
          const alerts = await alerting.checkAgentState(agentId);

          // Verify metadata
          const balanceAlerts = alerts.filter((a) => a.type === 'balance');
          expect(balanceAlerts.length).toBeGreaterThan(0);
          expect(balanceAlerts[0].metadata).toBeDefined();
          expect(balanceAlerts[0].metadata?.balance).toBe(balance);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should not alert when metrics are healthy', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 10, max: 100, noNaN: true }),
        fc.array(fc.boolean(), { minLength: 10, maxLength: 20 }),
        fc.array(fc.double({ min: 0, max: 500, noNaN: true }), { minLength: 5, maxLength: 10 }),
        async (agentId, balance, outcomes, latencies) => {
          // Ensure high success rate
          const successRate = outcomes.filter((o) => o).length / outcomes.length;
          if (successRate < 0.9) {
            return; // Skip this test case
          }

          // Initialize agent with healthy metrics
          await metricsTracker.initializeMetrics(agentId, balance);

          // Track healthy outcomes
          for (const success of outcomes) {
            await metricsTracker.updateMetrics({
              agentId,
              success,
            });
          }

          // Track low latencies
          for (const latency of latencies) {
            await metricsTracker.updateMetrics({
              agentId,
              latency,
            });
          }

          // Check state
          const alerts = await alerting.checkAgentState(agentId);

          // Should not generate any alerts
          expect(alerts.length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should categorize alerts by severity', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.double({ min: 0, max: 2, noNaN: true }),
        async (agentId, balance) => {
          // Initialize agent
          await metricsTracker.initializeMetrics(agentId, balance);

          // Check state
          const alerts = await alerting.checkAgentState(agentId);

          // Verify severity is set correctly
          for (const alert of alerts) {
            expect(['critical', 'warning', 'info']).toContain(alert.severity);
            
            if (balance < 0.1) {
              expect(alert.severity).toBe('critical');
            } else if (balance < 1.0) {
              expect(alert.severity).toBe('warning');
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
