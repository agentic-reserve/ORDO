/**
 * Unit tests for Meta-Learning System
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetaLearningManager } from './meta-learning';

describe('MetaLearningManager', () => {
  let manager: MetaLearningManager;

  beforeEach(() => {
    manager = new MetaLearningManager();
    manager.clear();
  });

  describe('default strategies', () => {
    it('should have default learning strategies registered', () => {
      const strategies = manager.getAllStrategies();
      expect(strategies.length).toBeGreaterThan(0);
      expect(strategies.some(s => s.id === 'trial-and-error')).toBe(true);
      expect(strategies.some(s => s.id === 'analogy-based')).toBe(true);
      expect(strategies.some(s => s.id === 'systematic')).toBe(true);
    });

    it('should retrieve strategy by ID', () => {
      const strategy = manager.getStrategy('systematic');
      expect(strategy).toBeDefined();
      expect(strategy?.name).toBe('Systematic Learning');
    });
  });

  describe('recordStrategyUsage', () => {
    it('should record strategy effectiveness', () => {
      manager.recordStrategyUsage('agent-1', 'systematic', 'domain-1', 0.8);

      const metrics = manager.getMetrics('agent-1');
      expect(metrics).toBeDefined();
      expect(metrics?.strategyEffectiveness['systematic']).toBe(0.8);
    });

    it('should update optimal strategy', () => {
      manager.recordStrategyUsage('agent-1', 'systematic', 'domain-1', 0.8);
      manager.recordStrategyUsage('agent-1', 'trial-and-error', 'domain-2', 0.6);

      const metrics = manager.getMetrics('agent-1');
      expect(metrics?.optimalStrategy).toBe('systematic');
    });

    it('should calculate adaptation rate', () => {
      manager.recordStrategyUsage('agent-1', 'systematic', 'domain-1', 0.8);
      manager.recordStrategyUsage('agent-1', 'trial-and-error', 'domain-2', 0.6);

      const metrics = manager.getMetrics('agent-1');
      expect(metrics?.adaptationRate).toBeGreaterThan(0);
    });
  });

  describe('recommendStrategy', () => {
    it('should recommend optimal strategy', () => {
      manager.recordStrategyUsage('agent-1', 'systematic', 'domain-1', 0.9);
      manager.recordStrategyUsage('agent-1', 'trial-and-error', 'domain-2', 0.5);

      const recommended = manager.recommendStrategy('agent-1', 'domain-3');
      expect(recommended?.id).toBe('systematic');
    });

    it('should default to systematic for new agents', () => {
      const recommended = manager.recommendStrategy('agent-1', 'domain-1');
      expect(recommended?.id).toBe('systematic');
    });
  });

  describe('analyzeStrategies', () => {
    it('should identify most and least effective strategies', () => {
      manager.recordStrategyUsage('agent-1', 'systematic', 'domain-1', 0.9);
      manager.recordStrategyUsage('agent-1', 'trial-and-error', 'domain-2', 0.5);
      manager.recordStrategyUsage('agent-1', 'analogy-based', 'domain-3', 0.7);

      const analysis = manager.analyzeStrategies('agent-1');
      expect(analysis.mostEffective?.id).toBe('systematic');
      expect(analysis.leastEffective?.id).toBe('trial-and-error');
      expect(analysis.avgEffectiveness).toBeCloseTo(0.7, 1);
    });

    it('should return empty analysis for new agent', () => {
      const analysis = manager.analyzeStrategies('agent-1');
      expect(analysis.mostEffective).toBeUndefined();
      expect(analysis.leastEffective).toBeUndefined();
      expect(analysis.avgEffectiveness).toBe(0);
    });
  });

  describe('registerStrategy', () => {
    it('should register custom strategy', () => {
      const customStrategy = {
        id: 'custom',
        name: 'Custom Strategy',
        description: 'A custom learning strategy',
        approach: 'custom',
        applicableDomains: ['domain-1'],
        successRate: 0.85,
        avgTimeToMastery: 18,
      };

      manager.registerStrategy(customStrategy);

      const retrieved = manager.getStrategy('custom');
      expect(retrieved).toEqual(customStrategy);
    });
  });
});
