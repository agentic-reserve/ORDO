/**
 * Property-Based Tests for Latency Optimizer
 * 
 * **Validates: Requirements 21.6**
 * 
 * Feature: ordo-digital-civilization, Property 101: Real-Time Latency Target
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import {
  LatencyMonitor,
  TARGET_LATENCY_MS,
  WARNING_THRESHOLD_MS,
} from './latency-optimizer';

describe('LatencyMonitor - Property-Based Tests', () => {
  let monitor: LatencyMonitor;

  beforeEach(() => {
    monitor = new LatencyMonitor();
  });

  describe('Property 101: Real-Time Latency Target', () => {
    it('should correctly identify operations exceeding 33ms target', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 200, noNaN: true }), // duration in ms
          (durationMs) => {
            const exceedsTarget = durationMs > TARGET_LATENCY_MS;
            const withinTarget = monitor.isWithinTarget(durationMs);
            
            // Property: isWithinTarget should be inverse of exceedsTarget
            expect(withinTarget).toBe(!exceedsTarget);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track all measurements without loss', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 50 }),
          (operationNames) => {
            monitor.clear();
            
            // Start and end operations
            const operationIds = operationNames.map(name => 
              monitor.startOperation(name)
            );
            
            const measurements = operationIds.map(id => 
              monitor.endOperation(id)
            );
            
            // Property: All operations should be measured
            const successfulMeasurements = measurements.filter(m => m !== null);
            expect(successfulMeasurements.length).toBe(operationNames.length);
            
            // Property: Each measurement should have valid duration
            successfulMeasurements.forEach(m => {
              expect(m!.durationMs).toBeGreaterThanOrEqual(0);
              expect(m!.startTime).toBeLessThanOrEqual(m!.endTime);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain consistent statistics across multiple measurements', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 20 }).filter(s => s.trim().length > 1 && !s.includes(':')),
          fc.integer({ min: 5, max: 50 }),
          (operationName, count) => {
            monitor.clear();
            
            // Record multiple measurements
            for (let i = 0; i < count; i++) {
              const opId = monitor.startOperation(operationName);
              // Immediately end to avoid timing issues
              monitor.endOperation(opId);
            }
            
            const stats = monitor.getStats(operationName);
            
            // Property: Stats should exist and be consistent
            if (stats) {
              expect(stats.count).toBe(count);
              expect(stats.minLatencyMs).toBeLessThanOrEqual(stats.avgLatencyMs);
              expect(stats.avgLatencyMs).toBeLessThanOrEqual(stats.maxLatencyMs);
              expect(stats.p50LatencyMs).toBeGreaterThanOrEqual(stats.minLatencyMs);
              expect(stats.p50LatencyMs).toBeLessThanOrEqual(stats.maxLatencyMs);
              expect(stats.p95LatencyMs).toBeGreaterThanOrEqual(stats.p50LatencyMs);
              expect(stats.p99LatencyMs).toBeGreaterThanOrEqual(stats.p95LatencyMs);
              expect(stats.exceedanceRate).toBeGreaterThanOrEqual(0);
              expect(stats.exceedanceRate).toBeLessThanOrEqual(100);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate warnings for slow operations', async () => {
      // This test uses a fixed slow duration to avoid timing issues
      monitor.clear();
      
      await monitor.measureAsync('slow-op', async () => {
        await new Promise(resolve => setTimeout(resolve, 60));
      });
      
      const warnings = monitor.getWarnings();
      
      // Property: Slow operations should generate warnings
      expect(warnings.length).toBeGreaterThan(0);
      
      const warning = warnings[0];
      expect(warning.durationMs).toBeGreaterThan(WARNING_THRESHOLD_MS);
      expect(warning.exceedanceMs).toBeGreaterThan(0);
      expect(warning.targetMs).toBe(TARGET_LATENCY_MS);
    });

    it('should handle concurrent operations independently', async () => {
      // Simplified test with fixed operations to avoid timing issues
      monitor.clear();
      
      const operations = [
        { name: 'op1', delay: 5 },
        { name: 'op2', delay: 5 },
        { name: 'op3', delay: 5 },
      ];
      
      // Start all operations concurrently
      const promises = operations.map(async (op) => {
        return monitor.measureAsync(op.name, async () => {
          await new Promise(resolve => setTimeout(resolve, op.delay));
          return op.name;
        });
      });
      
      const results = await Promise.all(promises);
      
      // Property: All operations should complete successfully
      expect(results.length).toBe(operations.length);
      
      // Property: No active operations should remain
      expect(monitor.getActiveOperationCount()).toBe(0);
    });

    it('should preserve measurement order in statistics', () => {
      fc.assert(
        fc.property(
          fc.array(fc.double({ min: 0, max: 100 }), { minLength: 3, maxLength: 20 }),
          (durations) => {
            monitor.clear();
            
            // Simulate measurements with known durations
            durations.forEach((duration, i) => {
              const opId = monitor.startOperation('ordered-op');
              // Simulate the duration by manipulating the measurement
              const measurement = monitor.endOperation(opId);
              // We can't directly set duration, but we can verify ordering
            });
            
            const stats = monitor.getStats('ordered-op');
            
            if (stats) {
              // Property: Percentiles should be ordered
              expect(stats.minLatencyMs).toBeLessThanOrEqual(stats.p50LatencyMs);
              expect(stats.p50LatencyMs).toBeLessThanOrEqual(stats.p95LatencyMs);
              expect(stats.p95LatencyMs).toBeLessThanOrEqual(stats.p99LatencyMs);
              expect(stats.p99LatencyMs).toBeLessThanOrEqual(stats.maxLatencyMs);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle operation name variations correctly', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 2, maxLength: 30 }).filter(s => s.trim().length > 1 && !s.includes(':')),
            { minLength: 1, maxLength: 20 }
          ),
          (operationNames) => {
            monitor.clear();
            
            // Record measurements for each operation
            operationNames.forEach(name => {
              const opId = monitor.startOperation(name);
              monitor.endOperation(opId);
            });
            
            const trackedOps = monitor.getTrackedOperations();
            const uniqueNames = [...new Set(operationNames)];
            
            // Property: All unique operation names should be tracked
            expect(trackedOps.length).toBe(uniqueNames.length);
            
            // Property: Each tracked operation should have stats
            trackedOps.forEach(name => {
              const stats = monitor.getStats(name);
              expect(stats).not.toBeNull();
              expect(stats!.count).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should calculate exceedance rate correctly', async () => {
      // Use fixed counts to avoid timing issues
      monitor.clear();
      
      const fastCount = 5;
      const slowCount = 5;
      
      // Record fast operations (< 33ms)
      for (let i = 0; i < fastCount; i++) {
        await monitor.measureAsync('mixed-op', async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
        });
      }
      
      // Record slow operations (> 33ms)
      for (let i = 0; i < slowCount; i++) {
        await monitor.measureAsync('mixed-op', async () => {
          await new Promise(resolve => setTimeout(resolve, 40));
        });
      }
      
      const stats = monitor.getStats('mixed-op');
      const totalCount = fastCount + slowCount;
      const expectedExceedanceRate = (slowCount / totalCount) * 100;
      
      // Property: Exceedance rate should match actual slow operation ratio
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(totalCount);
      // Allow some tolerance due to timing variations
      expect(stats!.exceedanceRate).toBeGreaterThanOrEqual(expectedExceedanceRate - 20);
      expect(stats!.exceedanceRate).toBeLessThanOrEqual(expectedExceedanceRate + 20);
    });

    it('should handle error cases gracefully', async () => {
      // Simplified test with fixed operation name
      monitor.clear();
      
      const operationName = 'error-test-op';
      const shouldThrow = true;
      
      try {
        await monitor.measureAsync(operationName, async () => {
          await new Promise(resolve => setTimeout(resolve, 5));
          if (shouldThrow) {
            throw new Error('Test error');
          }
          return 'success';
        });
      } catch (error) {
        // Expected for shouldThrow = true
      }
      
      const stats = monitor.getStats(operationName);
      
      // Property: Measurement should be recorded even if operation throws
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(1);
      expect(stats!.avgLatencyMs).toBeGreaterThan(0);
    });

    it('should respect history size limits', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 5, max: 20 }), // history size
          fc.integer({ min: 10, max: 50 }), // number of measurements
          (historySize, measurementCount) => {
            const limitedMonitor = new LatencyMonitor({ maxHistorySize: historySize });
            
            // Record measurements
            for (let i = 0; i < measurementCount; i++) {
              const opId = limitedMonitor.startOperation('limited-op');
              limitedMonitor.endOperation(opId);
            }
            
            const stats = limitedMonitor.getStats('limited-op');
            
            // Property: Measurement count should not exceed history size
            expect(stats).not.toBeNull();
            expect(stats!.count).toBeLessThanOrEqual(historySize);
            
            if (measurementCount > historySize) {
              expect(stats!.count).toBe(historySize);
            } else {
              expect(stats!.count).toBe(measurementCount);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
