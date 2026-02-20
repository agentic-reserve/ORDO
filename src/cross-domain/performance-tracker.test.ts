/**
 * Unit tests for Cross-Domain Performance Tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CrossDomainPerformanceTracker } from './performance-tracker';
import { domainMasteryTracker } from './domain-mastery';
import type { Domain } from './types';

describe('CrossDomainPerformanceTracker', () => {
  let tracker: CrossDomainPerformanceTracker;
  let testDomain: Domain;

  beforeEach(() => {
    tracker = new CrossDomainPerformanceTracker();
    tracker.clear();
    domainMasteryTracker.clear();

    testDomain = {
      id: 'test-domain',
      name: 'Test Domain',
      description: 'A test domain',
      tasks: [],
      successCriteria: {
        minSuccessRate: 0.95,
        minTasksCompleted: 10,
        minConsecutiveSuccesses: 5,
      },
      principles: ['test'],
      structure: {
        hierarchy: ['concept'],
        relationships: {},
        patterns: ['pattern'],
        constraints: ['constraint'],
      },
    };

    domainMasteryTracker.registerDomain(testDomain);
  });

  describe('recordNovelTaskAttempt', () => {
    it('should record successful novel task attempt', () => {
      tracker.recordNovelTaskAttempt('agent-1', 'test-domain', true);

      const performance = tracker.getPerformance('agent-1');
      expect(performance.novelTaskSuccessRate).toBe(1.0);
    });

    it('should record failed novel task attempt', () => {
      tracker.recordNovelTaskAttempt('agent-1', 'test-domain', false);

      const performance = tracker.getPerformance('agent-1');
      expect(performance.novelTaskSuccessRate).toBe(0.0);
    });

    it('should calculate correct success rate', () => {
      tracker.recordNovelTaskAttempt('agent-1', 'test-domain', true);
      tracker.recordNovelTaskAttempt('agent-1', 'test-domain', true);
      tracker.recordNovelTaskAttempt('agent-1', 'test-domain', false);

      const performance = tracker.getPerformance('agent-1');
      expect(performance.novelTaskSuccessRate).toBeCloseTo(0.667, 2);
    });
  });

  describe('recordImprovementRate', () => {
    it('should record improvement rate', () => {
      tracker.recordImprovementRate('agent-1', 'test-domain', 0.1);

      const rate = tracker.getDomainImprovementRate('agent-1', 'test-domain');
      expect(rate).toBe(0.1);
    });

    it('should track multiple improvement rates', () => {
      tracker.recordImprovementRate('agent-1', 'test-domain', 0.1);
      tracker.recordImprovementRate('agent-1', 'test-domain', 0.2);

      const rate = tracker.getDomainImprovementRate('agent-1', 'test-domain');
      expect(rate).toBe(0.2); // Most recent
    });

    it('should calculate average improvement rate', () => {
      tracker.recordImprovementRate('agent-1', 'test-domain', 0.1);
      tracker.recordImprovementRate('agent-1', 'test-domain', 0.3);

      const performance = tracker.getPerformance('agent-1');
      expect(performance.improvementRate).toBe(0.2);
    });
  });

  describe('getPerformance', () => {
    it('should return complete performance metrics', () => {
      tracker.recordNovelTaskAttempt('agent-1', 'test-domain', true);
      tracker.recordImprovementRate('agent-1', 'test-domain', 0.15);

      const performance = tracker.getPerformance('agent-1');

      expect(performance.agentId).toBe('agent-1');
      expect(performance.novelTaskSuccessRate).toBe(1.0);
      expect(performance.improvementRate).toBe(0.15);
      expect(performance.domainBreadth).toBeGreaterThanOrEqual(0);
      expect(performance.lastUpdated).toBeInstanceOf(Date);
    });

    it('should include domain breadth from mastery tracker', () => {
      // Master a domain
      for (let i = 0; i < 10; i++) {
        domainMasteryTracker.recordPerformance('agent-1', 'test-domain', 'task-1', true, 1000, 0.001);
      }

      const performance = tracker.getPerformance('agent-1');
      expect(performance.domainBreadth).toBe(1);
    });
  });

  describe('getDomainNovelTaskSuccessRate', () => {
    it('should return success rate for specific domain', () => {
      tracker.recordNovelTaskAttempt('agent-1', 'test-domain', true);
      tracker.recordNovelTaskAttempt('agent-1', 'test-domain', false);

      const rate = tracker.getDomainNovelTaskSuccessRate('agent-1', 'test-domain');
      expect(rate).toBe(0.5);
    });

    it('should return 0 for domain with no attempts', () => {
      const rate = tracker.getDomainNovelTaskSuccessRate('agent-1', 'test-domain');
      expect(rate).toBe(0);
    });
  });
});
