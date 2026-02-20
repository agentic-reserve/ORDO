/**
 * Property-Based Tests for Auto-Scaling System
 * 
 * Feature: ordo-digital-civilization
 * Property 98: Scaling Threshold
 * 
 * **Validates: Requirements 21.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  AutoScaler,
  ResourceMetrics,
  SCALE_UP_THRESHOLD,
  SCALE_DOWN_THRESHOLD,
} from './auto-scaler';

describe('Property 98: Scaling Threshold', () => {
  it('should trigger scale up when utilization reaches exactly 88.8%', () => {
    fc.assert(
      fc.property(
        fc.record({
          cpu: fc.constant(88.8),
          memory: fc.double({ min: 0, max: 88.7, noNaN: true }),
          disk: fc.double({ min: 0, max: 88.7, noNaN: true }),
          network: fc.double({ min: 0, max: 88.7, noNaN: true }),
        }),
        (metrics: ResourceMetrics) => {
          const scaler = new AutoScaler();
          const decision = scaler.evaluateScaling(metrics);

          // At exactly 88.8%, should trigger scale up
          expect(decision.shouldScale).toBe(true);
          expect(decision.direction).toBe('up');
          expect(decision.currentUtilization).toBe(88.8);
          expect(decision.threshold).toBe(SCALE_UP_THRESHOLD);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should trigger scale up when any resource exceeds 88.8%', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 88.8, max: 100, noNaN: true }),
        fc.oneof(
          fc.constant('cpu'),
          fc.constant('memory'),
          fc.constant('disk'),
          fc.constant('network')
        ),
        (utilization, resourceType) => {
          const scaler = new AutoScaler();
          
          // Create metrics with one resource at high utilization
          const metrics: ResourceMetrics = {
            cpu: 50,
            memory: 50,
            disk: 50,
            network: 50,
          };
          metrics[resourceType as keyof ResourceMetrics] = utilization;

          const decision = scaler.evaluateScaling(metrics);

          // Should trigger scale up
          expect(decision.shouldScale).toBe(true);
          expect(decision.direction).toBe('up');
          expect(decision.currentUtilization).toBeGreaterThanOrEqual(88.8);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should NOT trigger scale up when utilization is below 88.8%', () => {
    fc.assert(
      fc.property(
        fc.record({
          cpu: fc.double({ min: 30.1, max: 88.79, noNaN: true }),
          memory: fc.double({ min: 30.1, max: 88.79, noNaN: true }),
          disk: fc.double({ min: 30.1, max: 88.79, noNaN: true }),
          network: fc.double({ min: 30.1, max: 88.79, noNaN: true }),
        }),
        (metrics: ResourceMetrics) => {
          const scaler = new AutoScaler();
          const decision = scaler.evaluateScaling(metrics);

          // Below threshold, should not scale up
          expect(decision.direction).not.toBe('up');
          expect(decision.currentUtilization).toBeLessThan(88.8);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should use maximum utilization across all resources', () => {
    fc.assert(
      fc.property(
        fc.record({
          cpu: fc.double({ min: 0, max: 100, noNaN: true }),
          memory: fc.double({ min: 0, max: 100, noNaN: true }),
          disk: fc.double({ min: 0, max: 100, noNaN: true }),
          network: fc.double({ min: 0, max: 100, noNaN: true }),
        }),
        (metrics: ResourceMetrics) => {
          const scaler = new AutoScaler();
          const utilization = scaler.calculateUtilization(metrics);

          // Utilization should be the maximum of all resources
          const expectedMax = Math.max(
            metrics.cpu,
            metrics.memory,
            metrics.disk,
            metrics.network
          );
          expect(utilization).toBe(expectedMax);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect cooldown period between scaling actions', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 88.8, max: 100, noNaN: true }),
        (utilization) => {
          const scaler = new AutoScaler({ cooldownPeriodMs: 5000 });
          
          const metrics: ResourceMetrics = {
            cpu: utilization,
            memory: 50,
            disk: 50,
            network: 50,
          };

          // First scaling should succeed
          const decision1 = scaler.evaluateScaling(metrics);
          expect(decision1.shouldScale).toBe(true);
          scaler.scale(decision1);

          // Immediate second scaling should be blocked by cooldown
          const decision2 = scaler.evaluateScaling(metrics);
          expect(decision2.shouldScale).toBe(false);
          expect(decision2.reason).toContain('Cooldown');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should scale down when utilization is at or below 30%', () => {
    fc.assert(
      fc.property(
        fc.record({
          cpu: fc.double({ min: 0, max: 30, noNaN: true }),
          memory: fc.double({ min: 0, max: 30, noNaN: true }),
          disk: fc.double({ min: 0, max: 30, noNaN: true }),
          network: fc.double({ min: 0, max: 30, noNaN: true }),
        }),
        (metrics: ResourceMetrics) => {
          const scaler = new AutoScaler({}, 5); // Start with 5 instances
          const decision = scaler.evaluateScaling(metrics);

          // At or below 30%, should trigger scale down
          expect(decision.shouldScale).toBe(true);
          expect(decision.direction).toBe('down');
          expect(decision.currentUtilization).toBeLessThanOrEqual(30);
          expect(decision.threshold).toBe(SCALE_DOWN_THRESHOLD);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect minimum and maximum instance limits', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 11, max: 100 }),
        (minInstances, maxInstances) => {
          const scaler = new AutoScaler(
            { minInstances, maxInstances },
            minInstances
          );

          // Try to scale down below minimum
          const lowMetrics: ResourceMetrics = {
            cpu: 10,
            memory: 10,
            disk: 10,
            network: 10,
          };
          const downDecision = scaler.evaluateScaling(lowMetrics);
          expect(downDecision.shouldScale).toBe(false);
          expect(downDecision.reason).toContain('minimum');

          // Scale up to maximum
          const highMetrics: ResourceMetrics = {
            cpu: 95,
            memory: 95,
            disk: 95,
            network: 95,
          };
          
          // Scale up to max
          for (let i = minInstances; i < maxInstances; i++) {
            scaler.resetCooldown();
            const decision = scaler.evaluateScaling(highMetrics);
            if (decision.shouldScale) {
              scaler.scale(decision);
            }
          }

          // Try to scale up beyond maximum
          scaler.resetCooldown();
          const upDecision = scaler.evaluateScaling(highMetrics);
          expect(upDecision.shouldScale).toBe(false);
          expect(upDecision.reason).toContain('maximum');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly calculate scaling decision at boundary values', () => {
    const scaler = new AutoScaler({}, 2); // Start with 2 instances for scale down tests

    // Test at exactly 88.8% (should scale up)
    const at888 = scaler.evaluateScaling({
      cpu: 88.8,
      memory: 50,
      disk: 50,
      network: 50,
    });
    expect(at888.shouldScale).toBe(true);
    expect(at888.direction).toBe('up');

    // Test at 88.79% (should NOT scale up)
    scaler.resetCooldown();
    const below888 = scaler.evaluateScaling({
      cpu: 88.79,
      memory: 50,
      disk: 50,
      network: 50,
    });
    expect(below888.direction).not.toBe('up');

    // Test at exactly 30% (should scale down)
    scaler.resetCooldown();
    const at30 = scaler.evaluateScaling({
      cpu: 30,
      memory: 20,
      disk: 20,
      network: 20,
    });
    expect(at30.shouldScale).toBe(true);
    expect(at30.direction).toBe('down');

    // Test at 30.01% (should NOT scale down)
    scaler.resetCooldown();
    const above30 = scaler.evaluateScaling({
      cpu: 30.01,
      memory: 20,
      disk: 20,
      network: 20,
    });
    expect(above30.direction).not.toBe('down');
  });

  it('should maintain correct instance count after scaling', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.array(fc.boolean(), { minLength: 1, maxLength: 20 }),
        (initialInstances, scaleUpSequence) => {
          const scaler = new AutoScaler(
            { maxInstances: 50 },
            initialInstances
          );

          let expectedInstances = initialInstances;

          for (const shouldScaleUp of scaleUpSequence) {
            scaler.resetCooldown();
            
            const metrics: ResourceMetrics = shouldScaleUp
              ? { cpu: 95, memory: 95, disk: 95, network: 95 }
              : { cpu: 10, memory: 10, disk: 10, network: 10 };

            const decision = scaler.evaluateScaling(metrics);
            const newCount = scaler.scale(decision);

            if (decision.shouldScale) {
              if (decision.direction === 'up') {
                expectedInstances = Math.min(expectedInstances + 1, 50);
              } else if (decision.direction === 'down') {
                expectedInstances = Math.max(expectedInstances - 1, 1);
              }
            }

            expect(newCount).toBe(expectedInstances);
            expect(scaler.getCurrentInstances()).toBe(expectedInstances);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
