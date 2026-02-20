/**
 * Unit tests for Domain Mastery Tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DomainMasteryTracker } from './domain-mastery';
import type { Domain } from './types';

describe('DomainMasteryTracker', () => {
  let tracker: DomainMasteryTracker;
  let testDomain: Domain;

  beforeEach(() => {
    tracker = new DomainMasteryTracker();
    
    testDomain = {
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
      principles: ['buy low, sell high', 'manage risk', 'diversify'],
      structure: {
        hierarchy: ['market', 'order', 'execution'],
        relationships: { market: ['order'], order: ['execution'] },
        patterns: ['trend following', 'mean reversion'],
        constraints: ['liquidity', 'slippage'],
      },
    };

    tracker.registerDomain(testDomain);
  });

  describe('registerDomain', () => {
    it('should register a domain', () => {
      const domain = tracker.getDomain('trading');
      expect(domain).toBeDefined();
      expect(domain?.name).toBe('Cryptocurrency Trading');
    });

    it('should allow retrieving all domains', () => {
      const domains = tracker.getAllDomains();
      expect(domains).toHaveLength(1);
      expect(domains[0].id).toBe('trading');
    });
  });

  describe('recordPerformance', () => {
    it('should record a successful performance', () => {
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      
      const mastery = tracker.getMastery('agent-1', 'trading');
      expect(mastery).toBeDefined();
      expect(mastery?.tasksCompleted).toBe(1);
      expect(mastery?.successRate).toBe(1.0);
      expect(mastery?.consecutiveSuccesses).toBe(1);
    });

    it('should record a failed performance', () => {
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', false, 1000, 0.001);
      
      const mastery = tracker.getMastery('agent-1', 'trading');
      expect(mastery).toBeDefined();
      expect(mastery?.tasksCompleted).toBe(1);
      expect(mastery?.successRate).toBe(0.0);
      expect(mastery?.consecutiveSuccesses).toBe(0);
    });

    it('should calculate success rate correctly', () => {
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', false, 1000, 0.001);
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      
      const mastery = tracker.getMastery('agent-1', 'trading');
      expect(mastery?.successRate).toBeCloseTo(0.75, 2);
      expect(mastery?.tasksCompleted).toBe(4);
    });

    it('should reset consecutive successes on failure', () => {
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', false, 1000, 0.001);
      
      const mastery = tracker.getMastery('agent-1', 'trading');
      expect(mastery?.consecutiveSuccesses).toBe(0);
    });

    it('should store performance history', () => {
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001, 'test note');
      
      const history = tracker.getPerformanceHistory('agent-1', 'trading');
      expect(history).toHaveLength(1);
      expect(history[0].success).toBe(true);
      expect(history[0].duration).toBe(1000);
      expect(history[0].cost).toBe(0.001);
      expect(history[0].notes).toBe('test note');
    });
  });

  describe('identifyMasteredDomains', () => {
    it('should identify mastered domain when criteria met', () => {
      // Record 10 successful tasks with 5+ consecutive successes
      for (let i = 0; i < 10; i++) {
        tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      }
      
      const result = tracker.identifyMasteredDomains('agent-1');
      expect(result.masteredDomains).toHaveLength(1);
      expect(result.masteredDomains[0].id).toBe('trading');
      expect(result.inProgressDomains).toHaveLength(0);
    });

    it('should not identify mastery when success rate too low', () => {
      // Record 10 tasks with only 80% success rate
      for (let i = 0; i < 8; i++) {
        tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      }
      for (let i = 0; i < 2; i++) {
        tracker.recordPerformance('agent-1', 'trading', 'swap-1', false, 1000, 0.001);
      }
      
      const result = tracker.identifyMasteredDomains('agent-1');
      expect(result.masteredDomains).toHaveLength(0);
      expect(result.inProgressDomains).toHaveLength(1);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should not identify mastery when not enough tasks completed', () => {
      // Record only 5 tasks (need 10)
      for (let i = 0; i < 5; i++) {
        tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      }
      
      const result = tracker.identifyMasteredDomains('agent-1');
      expect(result.masteredDomains).toHaveLength(0);
      expect(result.inProgressDomains).toHaveLength(1);
    });

    it('should not identify mastery when not enough consecutive successes', () => {
      // Record 10 tasks but break consecutive successes
      for (let i = 0; i < 9; i++) {
        tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
        if (i === 4) {
          tracker.recordPerformance('agent-1', 'trading', 'swap-1', false, 1000, 0.001);
        }
      }
      
      const result = tracker.identifyMasteredDomains('agent-1');
      expect(result.masteredDomains).toHaveLength(0);
    });

    it('should provide recommendations for in-progress domains', () => {
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      
      const result = tracker.identifyMasteredDomains('agent-1');
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes('success rate'))).toBe(false); // 100% success rate
      expect(result.recommendations.some(r => r.includes('Complete more tasks'))).toBe(true);
    });
  });

  describe('getDomainBreadth', () => {
    it('should return 0 for agent with no mastered domains', () => {
      const breadth = tracker.getDomainBreadth('agent-1');
      expect(breadth).toBe(0);
    });

    it('should return correct count of mastered domains', () => {
      // Master first domain
      for (let i = 0; i < 10; i++) {
        tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      }
      
      // Register and master second domain
      const domain2: Domain = {
        ...testDomain,
        id: 'lending',
        name: 'DeFi Lending',
      };
      tracker.registerDomain(domain2);
      
      for (let i = 0; i < 10; i++) {
        tracker.recordPerformance('agent-1', 'lending', 'lend-1', true, 1000, 0.001);
      }
      
      const breadth = tracker.getDomainBreadth('agent-1');
      expect(breadth).toBe(2);
    });
  });

  describe('hasMasteredDomain', () => {
    it('should return false for unmastered domain', () => {
      const hasMastered = tracker.hasMasteredDomain('agent-1', 'trading');
      expect(hasMastered).toBe(false);
    });

    it('should return true for mastered domain', () => {
      for (let i = 0; i < 10; i++) {
        tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      }
      
      const hasMastered = tracker.hasMasteredDomain('agent-1', 'trading');
      expect(hasMastered).toBe(true);
    });
  });

  describe('getSuccessRate', () => {
    it('should return 0 for domain with no attempts', () => {
      const rate = tracker.getSuccessRate('agent-1', 'trading');
      expect(rate).toBe(0);
    });

    it('should return correct success rate', () => {
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', true, 1000, 0.001);
      tracker.recordPerformance('agent-1', 'trading', 'swap-1', false, 1000, 0.001);
      
      const rate = tracker.getSuccessRate('agent-1', 'trading');
      expect(rate).toBe(0.5);
    });
  });
});
