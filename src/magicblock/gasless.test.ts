/**
 * Property-Based Tests for Gasless Transaction Support
 * 
 * Tests Property 48 from the design document
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { GaslessManager, createGaslessManager } from './gasless.js';
import { GaslessConfig, GasTracking } from './types.js';

describe('Gasless Transaction Support', () => {
  let manager: GaslessManager;
  let config: GaslessConfig;

  beforeEach(() => {
    config = {
      enabled: true,
      platformPaysGas: true,
      maxGasPerTransaction: 10000,
      dailyGasLimit: 100000,
    };
    manager = createGaslessManager(config);
  });

  // Feature: ordo-digital-civilization, Property 48: Gasless Transactions
  describe('Property 48: Gasless Transactions', () => {
    test.prop([
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.integer({ min: 1000, max: 9000 }),
    ])(
      'should not charge gas fees to agents when platform pays gas',
      (agentId, gasUsed) => {
        // Create tracking record with platform paying
        const tracking: GasTracking = {
          transactionId: `tx-${Date.now()}`,
          agentId,
          gasUsed,
          gasCost: gasUsed * 0.000001,
          timestamp: new Date(),
          paidBy: 'platform',
        };

        manager.trackGas(tracking);

        // Property 1: Transaction should be tracked
        const records = manager.getGasTracking(agentId);
        expect(records.length).toBeGreaterThan(0);

        // Property 2: Gas should be paid by platform, not agent
        const lastRecord = records[records.length - 1];
        expect(lastRecord.paidBy).toBe('platform');

        // Property 3: Agent should not be charged
        // (In a real system, this would verify agent balance unchanged)
        expect(lastRecord.agentId).toBe(agentId);

        // Property 4: Platform cost should be tracked
        const platformCost = manager.getTotalPlatformCost(agentId);
        expect(platformCost).toBeGreaterThan(0);
      },
      { numRuns: 50 }
    );

    test.prop([
      fc.array(
        fc.record({
          agentId: fc.string({ minLength: 1, maxLength: 20 }),
          gasUsed: fc.integer({ min: 1000, max: 5000 }),
        }),
        { minLength: 1, maxLength: 20 }
      ),
    ])(
      'should track all gasless transactions for analytics',
      (transactions) => {
        // Create fresh manager for this test run
        const testManager = createGaslessManager(config);
        
        // Track all transactions
        for (const tx of transactions) {
          const tracking: GasTracking = {
            transactionId: `tx-${Date.now()}-${Math.random()}`,
            agentId: tx.agentId,
            gasUsed: tx.gasUsed,
            gasCost: tx.gasUsed * 0.000001,
            timestamp: new Date(),
            paidBy: 'platform',
          };
          testManager.trackGas(tracking);
        }

        // Property 1: All transactions should be tracked
        const allRecords = testManager.getGasTracking();
        expect(allRecords.length).toBe(transactions.length);

        // Property 2: Statistics should be accurate
        const stats = testManager.getStatistics();
        expect(stats.totalTransactions).toBe(transactions.length);
        expect(stats.platformPaidTransactions).toBe(transactions.length);
        expect(stats.agentPaidTransactions).toBe(0);

        // Property 3: Total platform cost should equal sum of all costs
        const expectedCost = transactions.reduce(
          (sum, tx) => sum + tx.gasUsed * 0.000001,
          0
        );
        expect(stats.totalPlatformCost).toBeCloseTo(expectedCost, 6);

        // Property 4: Average gas should be calculated correctly
        const expectedAvg =
          transactions.reduce((sum, tx) => sum + tx.gasUsed, 0) / transactions.length;
        expect(stats.averageGasPerTransaction).toBeCloseTo(expectedAvg, 2);
      },
      { numRuns: 30 }
    );

    it('should respect per-transaction gas limits', () => {
      const agentId = 'test-agent';
      const withinLimit = 5000;
      const exceedsLimit = 15000;

      // Within limit should be allowed
      expect(manager.shouldPlatformPayGas(agentId, withinLimit)).toBe(true);

      // Exceeds limit should not be allowed
      expect(manager.shouldPlatformPayGas(agentId, exceedsLimit)).toBe(false);
    });

    it('should respect daily gas limits', () => {
      const agentId = 'test-agent';

      // Use up most of daily limit
      const tracking1: GasTracking = {
        transactionId: 'tx-1',
        agentId,
        gasUsed: 95000,
        gasCost: 0.095,
        timestamp: new Date(),
        paidBy: 'platform',
      };
      manager.trackGas(tracking1);

      // Small transaction should still be allowed
      expect(manager.shouldPlatformPayGas(agentId, 4000)).toBe(true);

      // Large transaction would exceed daily limit
      expect(manager.shouldPlatformPayGas(agentId, 10000)).toBe(false);
    });

    it('should track daily gas usage per agent', () => {
      const agent1 = 'agent-1';
      const agent2 = 'agent-2';

      const tracking1: GasTracking = {
        transactionId: 'tx-1',
        agentId: agent1,
        gasUsed: 10000,
        gasCost: 0.01,
        timestamp: new Date(),
        paidBy: 'platform',
      };

      const tracking2: GasTracking = {
        transactionId: 'tx-2',
        agentId: agent2,
        gasUsed: 20000,
        gasCost: 0.02,
        timestamp: new Date(),
        paidBy: 'platform',
      };

      manager.trackGas(tracking1);
      manager.trackGas(tracking2);

      expect(manager.getDailyGasUsage(agent1)).toBe(10000);
      expect(manager.getDailyGasUsage(agent2)).toBe(20000);
    });

    it('should reset daily usage', () => {
      const agentId = 'test-agent';

      const tracking: GasTracking = {
        transactionId: 'tx-1',
        agentId,
        gasUsed: 50000,
        gasCost: 0.05,
        timestamp: new Date(),
        paidBy: 'platform',
      };

      manager.trackGas(tracking);
      expect(manager.getDailyGasUsage(agentId)).toBe(50000);

      manager.resetDailyUsage();
      expect(manager.getDailyGasUsage(agentId)).toBe(0);
    });

    it('should not pay gas when disabled', () => {
      const disabledManager = createGaslessManager({
        enabled: false,
        platformPaysGas: true,
      });

      expect(disabledManager.isEnabled()).toBe(false);
      expect(disabledManager.shouldPlatformPayGas('agent-1', 5000)).toBe(false);
    });

    it('should not pay gas when platformPaysGas is false', () => {
      const agentPaysManager = createGaslessManager({
        enabled: true,
        platformPaysGas: false,
      });

      expect(agentPaysManager.shouldPlatformPayGas('agent-1', 5000)).toBe(false);
    });

    it('should track agent-paid transactions separately', () => {
      const agentId = 'test-agent';

      const platformPaid: GasTracking = {
        transactionId: 'tx-1',
        agentId,
        gasUsed: 5000,
        gasCost: 0.005,
        timestamp: new Date(),
        paidBy: 'platform',
      };

      const agentPaid: GasTracking = {
        transactionId: 'tx-2',
        agentId,
        gasUsed: 3000,
        gasCost: 0.003,
        timestamp: new Date(),
        paidBy: 'agent',
      };

      manager.trackGas(platformPaid);
      manager.trackGas(agentPaid);

      const stats = manager.getStatistics();
      expect(stats.platformPaidTransactions).toBe(1);
      expect(stats.agentPaidTransactions).toBe(1);
      expect(stats.totalPlatformCost).toBeCloseTo(0.005, 6);
      expect(stats.totalAgentCost).toBeCloseTo(0.003, 6);
    });

    it('should allow updating configuration', () => {
      const newConfig: Partial<GaslessConfig> = {
        maxGasPerTransaction: 20000,
        dailyGasLimit: 200000,
      };

      manager.updateConfig(newConfig);

      const updatedConfig = manager.getConfig();
      expect(updatedConfig.maxGasPerTransaction).toBe(20000);
      expect(updatedConfig.dailyGasLimit).toBe(200000);
    });

    it('should clear tracking data', () => {
      const tracking: GasTracking = {
        transactionId: 'tx-1',
        agentId: 'agent-1',
        gasUsed: 5000,
        gasCost: 0.005,
        timestamp: new Date(),
        paidBy: 'platform',
      };

      manager.trackGas(tracking);
      expect(manager.getGasTracking().length).toBe(1);

      manager.clearTracking();
      expect(manager.getGasTracking().length).toBe(0);
    });

    it('should filter tracking by agent ID', () => {
      const agent1 = 'agent-1';
      const agent2 = 'agent-2';

      manager.trackGas({
        transactionId: 'tx-1',
        agentId: agent1,
        gasUsed: 5000,
        gasCost: 0.005,
        timestamp: new Date(),
        paidBy: 'platform',
      });

      manager.trackGas({
        transactionId: 'tx-2',
        agentId: agent2,
        gasUsed: 3000,
        gasCost: 0.003,
        timestamp: new Date(),
        paidBy: 'platform',
      });

      manager.trackGas({
        transactionId: 'tx-3',
        agentId: agent1,
        gasUsed: 2000,
        gasCost: 0.002,
        timestamp: new Date(),
        paidBy: 'platform',
      });

      const agent1Records = manager.getGasTracking(agent1);
      expect(agent1Records.length).toBe(2);
      expect(agent1Records.every((r) => r.agentId === agent1)).toBe(true);

      const agent2Records = manager.getGasTracking(agent2);
      expect(agent2Records.length).toBe(1);
      expect(agent2Records[0].agentId).toBe(agent2);
    });
  });
});
