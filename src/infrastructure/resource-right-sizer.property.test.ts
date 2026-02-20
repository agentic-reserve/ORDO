/**
 * Property-Based Tests for Resource Right-Sizing
 * 
 * Feature: ordo-digital-civilization, Property 106: Resource Right-Sizing
 * 
 * Property 106: Resource Right-Sizing
 * For any resource, the system should monitor actual usage patterns and right-size 
 * (scale up/down) to match usage within 10% margin.
 * 
 * Validates: Requirements 23.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ResourceRightSizer, ResourceUsage } from './resource-right-sizer';

describe('Property 106: Resource Right-Sizing', () => {
  // Arbitrary resource usage generator
  const arbResourceUsage = (resourceId: string, allocated: number) =>
    fc.record({
      resourceId: fc.constant(resourceId),
      resourceType: fc.constantFrom('compute', 'memory', 'storage', 'network'),
      allocated: fc.constant(allocated),
      used: fc.integer({ min: 0, max: allocated }),
      timestamp: fc.date(),
    }) as fc.Arbitrary<ResourceUsage>;

  // Generator for usage patterns
  const arbUsagePattern = (resourceId: string, allocated: number, avgUtilization: number) => {
    // Handle edge cases
    if (!Number.isFinite(avgUtilization) || avgUtilization <= 0) {
      avgUtilization = 0.5;
    }
    if (!Number.isFinite(allocated) || allocated <= 0) {
      allocated = 100;
    }
    
    const minUsed = Math.max(0, Math.floor(allocated * avgUtilization * 0.8));
    const maxUsed = Math.min(allocated, Math.ceil(allocated * avgUtilization * 1.2));
    
    return fc.array(
      fc.record({
        resourceId: fc.constant(resourceId),
        resourceType: fc.constantFrom('compute', 'memory', 'storage', 'network'),
        allocated: fc.constant(allocated),
        used: fc.integer({
          min: minUsed,
          max: Math.max(minUsed, maxUsed),
        }),
        timestamp: fc.date(),
      }) as fc.Arbitrary<ResourceUsage>,
      { minLength: 15, maxLength: 100 }
    );
  };

  it('Property 106.1: Recommended allocation should be within 10% margin of peak usage', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 10, max: 1000 }),
        fc.double({ min: 0.1, max: 1.0 }),
        (resourceId, allocated, avgUtilization) => {
          const rightSizer = new ResourceRightSizer({
            targetMargin: 0.10,
            minSampleSize: 10,
          });

          // Generate usage pattern
          const usages = fc.sample(arbUsagePattern(resourceId, allocated, avgUtilization), 1)[0];
          
          usages.forEach(usage => rightSizer.recordUsage(usage));

          const recommendation = rightSizer.recommend(resourceId);
          
          if (recommendation) {
            const metrics = rightSizer.calculateMetrics(resourceId);
            expect(metrics).toBeDefined();
            
            // Recommended allocation should be peak usage * 1.10 (within 10% margin)
            const expectedMin = Math.ceil(metrics!.peakUsage);
            const expectedMax = Math.ceil(metrics!.peakUsage * 1.10);
            
            expect(recommendation.recommendedAllocation).toBeGreaterThanOrEqual(expectedMin);
            expect(recommendation.recommendedAllocation).toBeLessThanOrEqual(expectedMax);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 106.2: System should detect overprovisioned resources (low utilization)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 100, max: 1000 }),
        (resourceId, allocated) => {
          const rightSizer = new ResourceRightSizer({
            targetMargin: 0.10,
            minSampleSize: 10,
            scaleDownThreshold: 0.60,
          });

          // Generate low utilization pattern (30-50%)
          const usages = fc.sample(arbUsagePattern(resourceId, allocated, 0.40), 1)[0];
          
          usages.forEach(usage => rightSizer.recordUsage(usage));

          const recommendation = rightSizer.recommend(resourceId);
          const metrics = rightSizer.calculateMetrics(resourceId);
          
          if (recommendation && metrics && metrics.utilizationRate < 0.60) {
            expect(recommendation.reason).toBe('overprovisioned');
            expect(recommendation.recommendedAllocation).toBeLessThan(allocated);
            expect(recommendation.potentialSavings).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 106.3: System should detect underprovisioned resources (high utilization)', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 100, max: 1000 }),
        (resourceId, allocated) => {
          const rightSizer = new ResourceRightSizer({
            targetMargin: 0.10,
            minSampleSize: 10,
            scaleUpThreshold: 0.90,
          });

          // Generate high utilization pattern (90-100%)
          const usages = fc.sample(arbUsagePattern(resourceId, allocated, 0.95), 1)[0];
          
          usages.forEach(usage => rightSizer.recordUsage(usage));

          const recommendation = rightSizer.recommend(resourceId);
          const metrics = rightSizer.calculateMetrics(resourceId);
          
          if (recommendation && metrics && metrics.utilizationRate > 0.90) {
            expect(recommendation.reason).toBe('underprovisioned');
            expect(recommendation.riskLevel).toBe('high');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 106.4: System should auto-scale resources based on load', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 100, max: 1000 }),
        fc.constantFrom(0.30, 0.95), // Low or high utilization
        async (resourceId, allocated, avgUtilization) => {
          const rightSizer = new ResourceRightSizer({
            targetMargin: 0.10,
            minSampleSize: 10,
            scaleUpThreshold: 0.90,
            scaleDownThreshold: 0.60,
          });

          let scaledTo: number | null = null;
          const scaleFunction = async (id: string, newAllocation: number) => {
            scaledTo = newAllocation;
          };

          // Generate usage pattern
          const usages = fc.sample(arbUsagePattern(resourceId, allocated, avgUtilization), 1)[0];
          
          usages.forEach(usage => rightSizer.recordUsage(usage));

          const scaled = await rightSizer.monitorAndScale(resourceId, scaleFunction);
          const metrics = rightSizer.calculateMetrics(resourceId);
          
          if (metrics) {
            if (metrics.utilizationRate > 0.90 || metrics.utilizationRate < 0.60) {
              // Should scale for non-optimal resources
              expect(scaled).toBe(true);
              expect(scaledTo).not.toBeNull();
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 106.5: Metrics calculation should be accurate', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 100, max: 1000 }),
        fc.array(fc.integer({ min: 0, max: 100 }), { minLength: 15, maxLength: 100 }),
        (resourceId, allocated, usedValues) => {
          const rightSizer = new ResourceRightSizer();

          usedValues.forEach(used => {
            rightSizer.recordUsage({
              resourceId,
              resourceType: 'compute',
              allocated,
              used: Math.min(used, allocated),
              timestamp: new Date(),
            });
          });

          const metrics = rightSizer.calculateMetrics(resourceId);
          
          expect(metrics).toBeDefined();
          expect(metrics!.sampleCount).toBe(usedValues.length);
          
          // Verify metrics accuracy
          const validUsed = usedValues.map(u => Math.min(u, allocated));
          const expectedAvg = validUsed.reduce((sum, val) => sum + val, 0) / validUsed.length;
          const expectedPeak = Math.max(...validUsed);
          const expectedMin = Math.min(...validUsed);
          
          expect(metrics!.avgUsage).toBeCloseTo(expectedAvg, 2);
          expect(metrics!.peakUsage).toBe(expectedPeak);
          expect(metrics!.minUsage).toBe(expectedMin);
          expect(metrics!.utilizationRate).toBeCloseTo(expectedAvg / allocated, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 106.6: Total potential savings should equal sum of individual savings', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            resourceId: fc.string({ minLength: 1, maxLength: 20 }),
            allocated: fc.integer({ min: 100, max: 1000 }),
            avgUtilization: fc.double({ min: 0.2, max: 0.5 }), // Overprovisioned
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (resources) => {
          const rightSizer = new ResourceRightSizer({
            targetMargin: 0.10,
            minSampleSize: 10,
            scaleDownThreshold: 0.60,
          });

          // Record usage for all resources
          resources.forEach(resource => {
            const usages = fc.sample(
              arbUsagePattern(resource.resourceId, resource.allocated, resource.avgUtilization),
              1
            )[0];
            
            usages.forEach(usage => rightSizer.recordUsage(usage));
          });

          const totalSavings = rightSizer.getTotalPotentialSavings();
          const recommendations = rightSizer.getAllRecommendations();
          
          const expectedTotal = recommendations.reduce((sum, rec) => {
            return sum + (rec.potentialSavings || 0);
          }, 0);
          
          expect(totalSavings).toBeCloseTo(expectedTotal, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 106.7: Recommendations should respect min/max allocation bounds', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 10, max: 20 }), // minAllocation
        fc.integer({ min: 500, max: 1000 }), // maxAllocation
        fc.integer({ min: 100, max: 1000 }),
        fc.double({ min: 0.1, max: 1.0 }),
        (resourceId, minAllocation, maxAllocation, allocated, avgUtilization) => {
          const rightSizer = new ResourceRightSizer({
            targetMargin: 0.10,
            minSampleSize: 10,
            minAllocation,
            maxAllocation,
          });

          const usages = fc.sample(arbUsagePattern(resourceId, allocated, avgUtilization), 1)[0];
          
          usages.forEach(usage => rightSizer.recordUsage(usage));

          const recommendation = rightSizer.recommend(resourceId);
          
          if (recommendation) {
            expect(recommendation.recommendedAllocation).toBeGreaterThanOrEqual(minAllocation);
            expect(recommendation.recommendedAllocation).toBeLessThanOrEqual(maxAllocation);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
