/**
 * Unit tests for Knowledge Transfer System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { KnowledgeTransferManager } from './knowledge-transfer';
import { domainMasteryTracker } from './domain-mastery';
import type { Domain } from './types';

describe('KnowledgeTransferManager', () => {
  let manager: KnowledgeTransferManager;
  let tradingDomain: Domain;
  let lendingDomain: Domain;

  beforeEach(() => {
    manager = new KnowledgeTransferManager();
    domainMasteryTracker.clear();

    tradingDomain = {
      id: 'trading',
      name: 'Cryptocurrency Trading',
      description: 'Trading cryptocurrencies on DEXs',
      tasks: [
        {
          id: 'swap-1',
          name: 'Execute token swap',
          description: 'Swap tokens on Jupiter',
          difficulty: 5,
          requiredSkills: ['defi', 'solana'],
        },
      ],
      successCriteria: {
        minSuccessRate: 0.95,
        minTasksCompleted: 10,
        minConsecutiveSuccesses: 5,
      },
      principles: [
        'buy low, sell high',
        'manage risk',
        'diversify portfolio',
      ],
      structure: {
        hierarchy: ['market', 'order', 'execution'],
        relationships: { market: ['order'], order: ['execution'] },
        patterns: ['trend following', 'mean reversion'],
        constraints: ['liquidity', 'slippage'],
      },
    };

    lendingDomain = {
      id: 'lending',
      name: 'DeFi Lending',
      description: 'Lending and borrowing on DeFi protocols',
      tasks: [
        {
          id: 'lend-1',
          name: 'Lend tokens',
          description: 'Lend tokens on Kamino',
          difficulty: 5,
          requiredSkills: ['defi', 'solana'],
        },
      ],
      successCriteria: {
        minSuccessRate: 0.95,
        minTasksCompleted: 10,
        minConsecutiveSuccesses: 5,
      },
      principles: [
        'manage risk',
        'diversify portfolio',
        'optimize yield',
      ],
      structure: {
        hierarchy: ['market', 'position', 'collateral'],
        relationships: { market: ['position'], position: ['collateral'] },
        patterns: ['yield farming', 'leverage'],
        constraints: ['liquidity', 'collateralization ratio'],
      },
    };

    domainMasteryTracker.registerDomain(tradingDomain);
    domainMasteryTracker.registerDomain(lendingDomain);
  });

  describe('transferKnowledge', () => {
    it('should transfer knowledge from mastered source to target domain', async () => {
      const agentId = 'agent-1';

      // Master trading domain
      for (let i = 0; i < 10; i++) {
        domainMasteryTracker.recordPerformance(agentId, 'trading', 'swap-1', true, 1000, 0.001);
      }

      // Transfer knowledge to lending
      const result = await manager.transferKnowledge(agentId, 'trading', 'lending');

      expect(result.success).toBe(true);
      expect(result.transfer).toBeDefined();
      expect(result.transfer.sourceDomainId).toBe('trading');
      expect(result.transfer.targetDomainId).toBe('lending');
      expect(result.transfer.principlesApplied.length).toBeGreaterThan(0);
      expect(result.lessonsLearned.length).toBeGreaterThan(0);
    });

    it('should throw error if source domain not mastered', async () => {
      const agentId = 'agent-1';

      // Don't master trading domain
      await expect(
        manager.transferKnowledge(agentId, 'trading', 'lending')
      ).rejects.toThrow('Agent must master source domain');
    });

    it('should throw error if domain not found', async () => {
      const agentId = 'agent-1';

      await expect(
        manager.transferKnowledge(agentId, 'nonexistent', 'lending')
      ).rejects.toThrow('Source or target domain not found');
    });

    it('should apply transferable principles', async () => {
      const agentId = 'agent-1';

      // Master trading domain
      for (let i = 0; i < 10; i++) {
        domainMasteryTracker.recordPerformance(agentId, 'trading', 'swap-1', true, 1000, 0.001);
      }

      const result = await manager.transferKnowledge(agentId, 'trading', 'lending');

      // Should identify shared principles like "manage risk" and "diversify portfolio"
      expect(result.transfer.principlesApplied).toContain('manage risk');
      expect(result.transfer.principlesApplied).toContain('diversify portfolio');
    });

    it('should generate lessons learned', async () => {
      const agentId = 'agent-1';

      // Master trading domain
      for (let i = 0; i < 10; i++) {
        domainMasteryTracker.recordPerformance(agentId, 'trading', 'swap-1', true, 1000, 0.001);
      }

      const result = await manager.transferKnowledge(agentId, 'trading', 'lending');

      expect(result.lessonsLearned.length).toBeGreaterThan(0);
      // Lessons should mention applying principles
      expect(result.lessonsLearned.some(l => l.includes('Apply'))).toBe(true);
    });
  });

  describe('getAgentTransfers', () => {
    it('should return all transfers for an agent', async () => {
      const agentId = 'agent-1';

      // Master trading domain
      for (let i = 0; i < 10; i++) {
        domainMasteryTracker.recordPerformance(agentId, 'trading', 'swap-1', true, 1000, 0.001);
      }

      // Perform transfer
      await manager.transferKnowledge(agentId, 'trading', 'lending');

      const transfers = manager.getAgentTransfers(agentId);
      expect(transfers).toHaveLength(1);
      expect(transfers[0].agentId).toBe(agentId);
    });

    it('should return empty array for agent with no transfers', () => {
      const transfers = manager.getAgentTransfers('agent-1');
      expect(transfers).toHaveLength(0);
    });
  });

  describe('getTransfersFromDomain', () => {
    it('should return transfers from specific source domain', async () => {
      const agentId = 'agent-1';

      // Master trading domain
      for (let i = 0; i < 10; i++) {
        domainMasteryTracker.recordPerformance(agentId, 'trading', 'swap-1', true, 1000, 0.001);
      }

      await manager.transferKnowledge(agentId, 'trading', 'lending');

      const transfers = manager.getTransfersFromDomain(agentId, 'trading');
      expect(transfers).toHaveLength(1);
      expect(transfers[0].sourceDomainId).toBe('trading');
    });
  });

  describe('getTransfersToDomain', () => {
    it('should return transfers to specific target domain', async () => {
      const agentId = 'agent-1';

      // Master trading domain
      for (let i = 0; i < 10; i++) {
        domainMasteryTracker.recordPerformance(agentId, 'trading', 'swap-1', true, 1000, 0.001);
      }

      await manager.transferKnowledge(agentId, 'trading', 'lending');

      const transfers = manager.getTransfersToDomain(agentId, 'lending');
      expect(transfers).toHaveLength(1);
      expect(transfers[0].targetDomainId).toBe('lending');
    });
  });

  describe('getAverageEffectiveness', () => {
    it('should calculate average effectiveness', async () => {
      const agentId = 'agent-1';

      // Master trading domain
      for (let i = 0; i < 10; i++) {
        domainMasteryTracker.recordPerformance(agentId, 'trading', 'swap-1', true, 1000, 0.001);
      }

      await manager.transferKnowledge(agentId, 'trading', 'lending');

      const avgEffectiveness = manager.getAverageEffectiveness(agentId);
      expect(avgEffectiveness).toBeGreaterThanOrEqual(0);
      expect(avgEffectiveness).toBeLessThanOrEqual(1);
    });

    it('should return 0 for agent with no transfers', () => {
      const avgEffectiveness = manager.getAverageEffectiveness('agent-1');
      expect(avgEffectiveness).toBe(0);
    });
  });

  describe('getMostEffectiveTransfer', () => {
    it('should return most effective transfer', async () => {
      const agentId = 'agent-1';

      // Master trading domain
      for (let i = 0; i < 10; i++) {
        domainMasteryTracker.recordPerformance(agentId, 'trading', 'swap-1', true, 1000, 0.001);
      }

      await manager.transferKnowledge(agentId, 'trading', 'lending');

      const mostEffective = manager.getMostEffectiveTransfer(agentId);
      expect(mostEffective).toBeDefined();
      expect(mostEffective?.agentId).toBe(agentId);
    });

    it('should return undefined for agent with no transfers', () => {
      const mostEffective = manager.getMostEffectiveTransfer('agent-1');
      expect(mostEffective).toBeUndefined();
    });
  });
});
