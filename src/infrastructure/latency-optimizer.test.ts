/**
 * Unit Tests for Latency Optimizer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  LatencyMonitor,
  TARGET_LATENCY_MS,
  WARNING_THRESHOLD_MS,
  CRITICAL_THRESHOLD_MS,
  globalLatencyMonitor,
} from './latency-optimizer';

describe('LatencyMonitor', () => {
  let monitor: LatencyMonitor;

  beforeEach(() => {
    monitor = new LatencyMonitor();
  });

  describe('Basic Operation Timing', () => {
    it('should measure operation duration', async () => {
      const operationId = monitor.startOperation('test-op');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const measurement = monitor.endOperation(operationId);
      
      expect(measurement).not.toBeNull();
      expect(measurement!.operationName).toBe('test-op');
      expect(measurement!.durationMs).toBeGreaterThanOrEqual(10);
      expect(measurement!.durationMs).toBeLessThan(50);
    });

    it('should return null for unknown operation ID', () => {
      const measurement = monitor.endOperation('unknown-id');
      expect(measurement).toBeNull();
    });

    it('should track multiple operations independently', () => {
      const op1 = monitor.startOperation('op1');
      const op2 = monitor.startOperation('op2');
      
      const m1 = monitor.endOperation(op1);
      const m2 = monitor.endOperation(op2);
      
      expect(m1).not.toBeNull();
      expect(m2).not.toBeNull();
      expect(m1!.operationName).toBe('op1');
      expect(m2!.operationName).toBe('op2');
    });
  });

  describe('Target Latency Detection', () => {
    it('should detect when operation exceeds target', async () => {
      const operationId = monitor.startOperation('slow-op');
      
      // Simulate slow operation (> 33ms)
      await new Promise(resolve => setTimeout(resolve, 40));
      
      const measurement = monitor.endOperation(operationId);
      
      expect(measurement).not.toBeNull();
      expect(measurement!.exceedsTarget).toBe(true);
      expect(measurement!.durationMs).toBeGreaterThan(TARGET_LATENCY_MS);
    });

    it('should detect when operation is within target', async () => {
      const operationId = monitor.startOperation('fast-op');
      
      // Simulate fast operation (< 33ms)
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const measurement = monitor.endOperation(operationId);
      
      expect(measurement).not.toBeNull();
      expect(measurement!.exceedsTarget).toBe(false);
      expect(measurement!.durationMs).toBeLessThanOrEqual(TARGET_LATENCY_MS);
    });
  });

  describe('Async Measurement Helper', () => {
    it('should measure async operations', async () => {
      const result = await monitor.measureAsync('async-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'success';
      });
      
      expect(result).toBe('success');
      
      const stats = monitor.getStats('async-op');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.avgLatencyMs).toBeGreaterThanOrEqual(10);
    });

    it('should measure async operations that throw errors', async () => {
      await expect(
        monitor.measureAsync('error-op', async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          throw new Error('Test error');
        })
      ).rejects.toThrow('Test error');
      
      const stats = monitor.getStats('error-op');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });
  });

  describe('Sync Measurement Helper', () => {
    it('should measure sync operations', () => {
      const result = monitor.measureSync('sync-op', () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      });
      
      expect(result).toBe(499500);
      
      const stats = monitor.getStats('sync-op');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });

    it('should measure sync operations that throw errors', () => {
      expect(() =>
        monitor.measureSync('error-sync-op', () => {
          throw new Error('Sync error');
        })
      ).toThrow('Sync error');
      
      const stats = monitor.getStats('error-sync-op');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
    });
  });

  describe('Statistics Calculation', () => {
    it('should calculate statistics for operations', () => {
      // Record multiple measurements
      for (let i = 0; i < 10; i++) {
        const opId = monitor.startOperation('stat-op');
        monitor.endOperation(opId);
      }
      
      const stats = monitor.getStats('stat-op');
      
      expect(stats).not.toBeNull();
      expect(stats!.operationName).toBe('stat-op');
      expect(stats!.count).toBe(10);
      expect(stats!.avgLatencyMs).toBeGreaterThan(0);
      expect(stats!.minLatencyMs).toBeGreaterThan(0);
      expect(stats!.maxLatencyMs).toBeGreaterThanOrEqual(stats!.minLatencyMs);
      expect(stats!.p50LatencyMs).toBeGreaterThan(0);
      expect(stats!.p95LatencyMs).toBeGreaterThan(0);
      expect(stats!.p99LatencyMs).toBeGreaterThan(0);
    });

    it('should return null for operations with no measurements', () => {
      const stats = monitor.getStats('nonexistent-op');
      expect(stats).toBeNull();
    });

    it('should calculate exceedance rate', async () => {
      // Record 5 fast operations
      for (let i = 0; i < 5; i++) {
        await monitor.measureAsync('mixed-op', async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
        });
      }
      
      // Record 5 slow operations
      for (let i = 0; i < 5; i++) {
        await monitor.measureAsync('mixed-op', async () => {
          await new Promise(resolve => setTimeout(resolve, 40));
        });
      }
      
      const stats = monitor.getStats('mixed-op');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(10);
      expect(stats!.exceedanceRate).toBeGreaterThan(40); // ~50%
      expect(stats!.exceedanceRate).toBeLessThan(60);
    });
  });

  describe('Warning System', () => {
    it('should record warnings for slow operations', async () => {
      await monitor.measureAsync('warning-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
      });
      
      const warnings = monitor.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      
      const warning = warnings[0];
      expect(warning.operationName).toBe('warning-op');
      expect(warning.durationMs).toBeGreaterThan(WARNING_THRESHOLD_MS);
      expect(warning.exceedanceMs).toBeGreaterThan(0);
      expect(warning.message).toContain('warning-op');
    });

    it('should not record warnings for fast operations', async () => {
      monitor.clear();
      
      await monitor.measureAsync('fast-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 5));
      });
      
      const warnings = monitor.getWarnings();
      expect(warnings.length).toBe(0);
    });

    it('should limit warning history to 100 entries', async () => {
      monitor.clear();
      
      // Generate 150 warnings
      for (let i = 0; i < 150; i++) {
        await monitor.measureAsync(`warning-op-${i}`, async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        });
      }
      
      const allWarnings = monitor.getAllWarnings();
      expect(allWarnings.length).toBe(100);
    });
  });

  describe('History Management', () => {
    it('should limit measurement history per operation', () => {
      const smallMonitor = new LatencyMonitor({ maxHistorySize: 5 });
      
      // Record 10 measurements
      for (let i = 0; i < 10; i++) {
        const opId = smallMonitor.startOperation('history-op');
        smallMonitor.endOperation(opId);
      }
      
      const stats = smallMonitor.getStats('history-op');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(5); // Only last 5 kept
    });
  });

  describe('Utility Methods', () => {
    it('should check if duration is within target', () => {
      expect(monitor.isWithinTarget(20)).toBe(true);
      expect(monitor.isWithinTarget(33)).toBe(true);
      expect(monitor.isWithinTarget(40)).toBe(false);
    });

    it('should track active operations', () => {
      expect(monitor.getActiveOperationCount()).toBe(0);
      
      const op1 = monitor.startOperation('op1');
      expect(monitor.getActiveOperationCount()).toBe(1);
      
      const op2 = monitor.startOperation('op2');
      expect(monitor.getActiveOperationCount()).toBe(2);
      
      monitor.endOperation(op1);
      expect(monitor.getActiveOperationCount()).toBe(1);
      
      monitor.endOperation(op2);
      expect(monitor.getActiveOperationCount()).toBe(0);
    });

    it('should list tracked operations', () => {
      const op1 = monitor.startOperation('op1');
      monitor.endOperation(op1);
      
      const op2 = monitor.startOperation('op2');
      monitor.endOperation(op2);
      
      const operations = monitor.getTrackedOperations();
      expect(operations).toContain('op1');
      expect(operations).toContain('op2');
    });

    it('should clear all measurements', () => {
      const op1 = monitor.startOperation('op1');
      monitor.endOperation(op1);
      
      expect(monitor.getTrackedOperations().length).toBeGreaterThan(0);
      
      monitor.clear();
      
      expect(monitor.getTrackedOperations().length).toBe(0);
      expect(monitor.getActiveOperationCount()).toBe(0);
      expect(monitor.getAllWarnings().length).toBe(0);
    });

    it('should clear specific operation', () => {
      const op1 = monitor.startOperation('op1');
      monitor.endOperation(op1);
      
      const op2 = monitor.startOperation('op2');
      monitor.endOperation(op2);
      
      monitor.clearOperation('op1');
      
      expect(monitor.getStats('op1')).toBeNull();
      expect(monitor.getStats('op2')).not.toBeNull();
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = monitor.getConfig();
      
      expect(config.targetLatencyMs).toBe(TARGET_LATENCY_MS);
      expect(config.warningThreshold).toBe(WARNING_THRESHOLD_MS);
      expect(config.criticalThreshold).toBe(CRITICAL_THRESHOLD_MS);
    });

    it('should accept custom configuration', () => {
      const customMonitor = new LatencyMonitor({
        targetLatencyMs: 50,
        warningThreshold: 75,
        criticalThreshold: 100,
      });
      
      const config = customMonitor.getConfig();
      
      expect(config.targetLatencyMs).toBe(50);
      expect(config.warningThreshold).toBe(75);
      expect(config.criticalThreshold).toBe(100);
    });
  });

  describe('Global Monitor', () => {
    it('should provide a global monitor instance', () => {
      expect(globalLatencyMonitor).toBeInstanceOf(LatencyMonitor);
    });
  });
});
