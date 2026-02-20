import { describe, it, expect, beforeEach } from 'vitest';
import { AutoScalingEfficiency } from './auto-scaling-efficiency';

describe('AutoScalingEfficiency', () => {
  let scaler: AutoScalingEfficiency;

  beforeEach(() => {
    scaler = new AutoScalingEfficiency({
      targetIdleCapacity: 5.0,
      scaleUpThreshold: 95.0,
      scaleDownThreshold: 60.0,
      minCapacity: 10,
      maxCapacity: 100,
      scaleUpIncrement: 10,
      scaleDownIncrement: 5,
      cooldownMs: 1000,
    }, 50);
  });

  describe('recordLoad', () => {
    it('should record load metrics', () => {
      const metrics = scaler.recordLoad(80);

      expect(metrics.currentLoad).toBe(80);
      expect(metrics.capacity).toBe(50);
      expect(metrics.usedCapacity).toBe(40);
      expect(metrics.idleCapacity).toBe(20); // 10/50 * 100 = 20%
    });

    it('should maintain load history', () => {
      scaler.recordLoad(70);
      scaler.recordLoad(80);
      scaler.recordLoad(90);

      const history = scaler.getLoadHistory();
      expect(history).toHaveLength(3);
    });
  });

  describe('evaluateScaling', () => {
    it('should recommend scale up when load is high', () => {
      const evaluation = scaler.evaluateScaling(96);

      expect(evaluation.shouldScale).toBe(true);
      expect(evaluation.direction).toBe('up');
      expect(evaluation.reason).toContain('Load 96.0%');
    });

    it('should recommend scale down when load is low', () => {
      const evaluation = scaler.evaluateScaling(50);

      expect(evaluation.shouldScale).toBe(true);
      expect(evaluation.direction).toBe('down');
      expect(evaluation.reason).toContain('Load 50.0%');
    });

    it('should not scale when load is optimal', () => {
      const evaluation = scaler.evaluateScaling(80);

      expect(evaluation.shouldScale).toBe(false);
      expect(evaluation.direction).toBe('none');
    });

    it('should respect cooldown period', () => {
      scaler.scale(96); // Trigger scaling
      
      const evaluation = scaler.evaluateScaling(96);
      expect(evaluation.shouldScale).toBe(false);
      expect(evaluation.reason).toBe('Cooldown period active');
    });

    it('should not scale beyond max capacity', () => {
      const maxScaler = new AutoScalingEfficiency({
        maxCapacity: 50,
      }, 50);

      const evaluation = maxScaler.evaluateScaling(96);
      expect(evaluation.shouldScale).toBe(false);
      expect(evaluation.reason).toBe('Already at maximum capacity');
    });

    it('should not scale below min capacity', () => {
      const minScaler = new AutoScalingEfficiency({
        minCapacity: 10,
      }, 10);

      const evaluation = minScaler.evaluateScaling(20);
      expect(evaluation.shouldScale).toBe(false);
      expect(evaluation.reason).toBe('Already at minimum capacity');
    });
  });

  describe('scale', () => {
    it('should scale up capacity when load is high', () => {
      scaler.resetCooldown();
      const newCapacity = scaler.scale(96);

      expect(newCapacity).toBe(60); // 50 + 10
      expect(scaler.getCurrentCapacity()).toBe(60);
    });

    it('should scale down capacity when load is low', () => {
      scaler.resetCooldown();
      const newCapacity = scaler.scale(50);

      expect(newCapacity).toBe(45); // 50 - 5
      expect(scaler.getCurrentCapacity()).toBe(45);
    });

    it('should not scale when load is optimal', () => {
      const initialCapacity = scaler.getCurrentCapacity();
      scaler.resetCooldown();
      const newCapacity = scaler.scale(80);

      expect(newCapacity).toBe(initialCapacity);
    });

    it('should record scaling actions', () => {
      scaler.resetCooldown();
      scaler.scale(96);

      const history = scaler.getScalingHistory();
      expect(history).toHaveLength(1);
      expect(history[0].direction).toBe('up');
      expect(history[0].beforeCapacity).toBe(50);
      expect(history[0].afterCapacity).toBe(60);
    });
  });

  describe('calculateEfficiencyMetrics', () => {
    it('should calculate efficiency metrics', () => {
      scaler.recordLoad(70);
      scaler.recordLoad(80);
      scaler.recordLoad(90);

      const metrics = scaler.calculateEfficiencyMetrics();

      expect(metrics).toBeDefined();
      expect(metrics?.avgLoad).toBe(80);
      expect(metrics?.peakLoad).toBe(90);
      expect(metrics?.minLoad).toBe(70);
    });

    it('should return null when no history', () => {
      const metrics = scaler.calculateEfficiencyMetrics();
      expect(metrics).toBeNull();
    });

    it('should calculate efficiency score', () => {
      // Record loads that result in ~5% idle capacity
      for (let i = 0; i < 10; i++) {
        scaler.recordLoad(95); // 95% load = 5% idle
      }

      const metrics = scaler.calculateEfficiencyMetrics();
      expect(metrics).toBeDefined();
      expect(metrics?.avgIdleCapacity).toBeCloseTo(5, 1);
      expect(metrics?.efficiencyScore).toBeGreaterThan(90);
    });
  });

  describe('isIdleCapacityOptimal', () => {
    it('should return true when idle capacity is below target', () => {
      for (let i = 0; i < 10; i++) {
        scaler.recordLoad(96); // 96% load = 4% idle
      }

      expect(scaler.isIdleCapacityOptimal()).toBe(true);
    });

    it('should return false when idle capacity is above target', () => {
      for (let i = 0; i < 10; i++) {
        scaler.recordLoad(80); // 80% load = 20% idle
      }

      expect(scaler.isIdleCapacityOptimal()).toBe(false);
    });
  });

  describe('auto-scaling behavior', () => {
    it('should maintain idle capacity near target through scaling', () => {
      scaler.resetCooldown();

      // Simulate varying load
      const loads = [95, 96, 97, 95, 96, 90, 85, 80, 75, 70];
      
      loads.forEach(load => {
        scaler.recordLoad(load);
        scaler.scale(load);
        scaler.resetCooldown(); // Allow immediate scaling for test
      });

      const metrics = scaler.calculateEfficiencyMetrics();
      expect(metrics).toBeDefined();
      
      // Should have scaled to maintain efficiency
      const scalingActions = scaler.getScalingHistory();
      expect(scalingActions.length).toBeGreaterThan(0);
    });

    it('should minimize idle capacity waste', () => {
      scaler.resetCooldown();

      // Simulate high load scenario
      for (let i = 0; i < 20; i++) {
        scaler.recordLoad(95);
        scaler.scale(95);
        scaler.resetCooldown();
      }

      const metrics = scaler.calculateEfficiencyMetrics();
      expect(metrics).toBeDefined();
      expect(metrics!.avgIdleCapacity).toBeLessThan(10); // Should keep idle low
    });
  });
});
