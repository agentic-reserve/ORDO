import { describe, it, expect, beforeEach } from 'vitest';
import { ResourceRightSizer, ResourceUsage } from './resource-right-sizer';

describe('ResourceRightSizer', () => {
  let rightSizer: ResourceRightSizer;

  beforeEach(() => {
    rightSizer = new ResourceRightSizer({
      targetMargin: 0.10,
      minSampleSize: 10,
      scaleUpThreshold: 0.90,
      scaleDownThreshold: 0.60,
      minAllocation: 1,
      maxAllocation: 1000,
    });
  });

  describe('recordUsage', () => {
    it('should record resource usage', () => {
      const usage: ResourceUsage = {
        resourceId: 'resource-1',
        resourceType: 'compute',
        allocated: 100,
        used: 50,
        timestamp: new Date(),
      };

      rightSizer.recordUsage(usage);
      const metrics = rightSizer.calculateMetrics('resource-1');

      expect(metrics).toBeDefined();
      expect(metrics?.sampleCount).toBe(1);
    });

    it('should maintain usage history', () => {
      for (let i = 0; i < 20; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-1',
          resourceType: 'compute',
          allocated: 100,
          used: 50 + i,
          timestamp: new Date(),
        });
      }

      const metrics = rightSizer.calculateMetrics('resource-1');
      expect(metrics?.sampleCount).toBe(20);
    });
  });

  describe('calculateMetrics', () => {
    it('should calculate correct metrics', () => {
      const usages = [60, 70, 80, 90, 100];
      
      usages.forEach(used => {
        rightSizer.recordUsage({
          resourceId: 'resource-1',
          resourceType: 'compute',
          allocated: 100,
          used,
          timestamp: new Date(),
        });
      });

      const metrics = rightSizer.calculateMetrics('resource-1');
      
      expect(metrics).toBeDefined();
      expect(metrics?.avgUsage).toBe(80);
      expect(metrics?.peakUsage).toBe(100);
      expect(metrics?.minUsage).toBe(60);
      expect(metrics?.utilizationRate).toBe(0.80);
    });

    it('should return null for unknown resource', () => {
      const metrics = rightSizer.calculateMetrics('unknown');
      expect(metrics).toBeNull();
    });
  });

  describe('recommend', () => {
    it('should recommend scale up for underprovisioned resources', () => {
      // Record high utilization (95%)
      for (let i = 0; i < 15; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-1',
          resourceType: 'compute',
          allocated: 100,
          used: 95,
          timestamp: new Date(),
        });
      }

      const recommendation = rightSizer.recommend('resource-1');
      
      expect(recommendation).toBeDefined();
      expect(recommendation?.reason).toBe('underprovisioned');
      expect(recommendation?.riskLevel).toBe('high');
      expect(recommendation?.recommendedAllocation).toBeGreaterThan(100);
    });

    it('should recommend scale down for overprovisioned resources', () => {
      // Record low utilization (30%)
      for (let i = 0; i < 15; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-1',
          resourceType: 'compute',
          allocated: 100,
          used: 30,
          timestamp: new Date(),
        });
      }

      const recommendation = rightSizer.recommend('resource-1');
      
      expect(recommendation).toBeDefined();
      expect(recommendation?.reason).toBe('overprovisioned');
      expect(recommendation?.riskLevel).toBe('low');
      expect(recommendation?.recommendedAllocation).toBeLessThan(100);
      expect(recommendation?.potentialSavings).toBeGreaterThan(0);
    });

    it('should recommend optimal for well-sized resources', () => {
      // Record optimal utilization (75%)
      for (let i = 0; i < 15; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-1',
          resourceType: 'compute',
          allocated: 100,
          used: 75,
          timestamp: new Date(),
        });
      }

      const recommendation = rightSizer.recommend('resource-1');
      
      expect(recommendation).toBeDefined();
      expect(recommendation?.reason).toBe('optimal');
      expect(recommendation?.riskLevel).toBe('low');
    });

    it('should return null if insufficient samples', () => {
      rightSizer.recordUsage({
        resourceId: 'resource-1',
        resourceType: 'compute',
        allocated: 100,
        used: 50,
        timestamp: new Date(),
      });

      const recommendation = rightSizer.recommend('resource-1');
      expect(recommendation).toBeNull();
    });

    it('should respect 10% margin in recommendations', () => {
      // Record usage with peak at 90
      for (let i = 0; i < 15; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-1',
          resourceType: 'compute',
          allocated: 100,
          used: 80 + (i % 10),
          timestamp: new Date(),
        });
      }

      const recommendation = rightSizer.recommend('resource-1');
      const metrics = rightSizer.calculateMetrics('resource-1');
      
      expect(recommendation).toBeDefined();
      expect(metrics).toBeDefined();
      
      // Recommended should be peak * 1.10 (within 10% margin)
      const expectedRecommendation = Math.ceil(metrics!.peakUsage * 1.10);
      expect(recommendation?.recommendedAllocation).toBe(expectedRecommendation);
    });
  });

  describe('monitorAndScale', () => {
    it('should auto-scale underprovisioned resources', async () => {
      let scaledTo: number | null = null;
      
      const scaleFunction = async (resourceId: string, newAllocation: number) => {
        scaledTo = newAllocation;
      };

      // Record high utilization
      for (let i = 0; i < 15; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-1',
          resourceType: 'compute',
          allocated: 100,
          used: 95,
          timestamp: new Date(),
        });
      }

      const scaled = await rightSizer.monitorAndScale('resource-1', scaleFunction);
      
      expect(scaled).toBe(true);
      expect(scaledTo).toBeGreaterThan(100);
    });

    it('should not scale optimal resources', async () => {
      let scaleCalled = false;
      
      const scaleFunction = async () => {
        scaleCalled = true;
      };

      // Record optimal utilization
      for (let i = 0; i < 15; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-1',
          resourceType: 'compute',
          allocated: 100,
          used: 75,
          timestamp: new Date(),
        });
      }

      const scaled = await rightSizer.monitorAndScale('resource-1', scaleFunction);
      
      expect(scaled).toBe(false);
      expect(scaleCalled).toBe(false);
    });
  });

  describe('getAllRecommendations', () => {
    it('should return all non-optimal recommendations', () => {
      // Create overprovisioned resource
      for (let i = 0; i < 15; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-1',
          resourceType: 'compute',
          allocated: 100,
          used: 30,
          timestamp: new Date(),
        });
      }

      // Create underprovisioned resource
      for (let i = 0; i < 15; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-2',
          resourceType: 'memory',
          allocated: 100,
          used: 95,
          timestamp: new Date(),
        });
      }

      // Create optimal resource
      for (let i = 0; i < 15; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-3',
          resourceType: 'storage',
          allocated: 100,
          used: 75,
          timestamp: new Date(),
        });
      }

      const recommendations = rightSizer.getAllRecommendations();
      
      expect(recommendations).toHaveLength(2);
      expect(recommendations.some(r => r.resourceId === 'resource-1')).toBe(true);
      expect(recommendations.some(r => r.resourceId === 'resource-2')).toBe(true);
      expect(recommendations.some(r => r.resourceId === 'resource-3')).toBe(false);
    });
  });

  describe('getTotalPotentialSavings', () => {
    it('should calculate total potential savings', () => {
      // Create two overprovisioned resources
      for (let i = 0; i < 15; i++) {
        rightSizer.recordUsage({
          resourceId: 'resource-1',
          resourceType: 'compute',
          allocated: 100,
          used: 30,
          timestamp: new Date(),
        });
        
        rightSizer.recordUsage({
          resourceId: 'resource-2',
          resourceType: 'memory',
          allocated: 200,
          used: 60,
          timestamp: new Date(),
        });
      }

      const totalSavings = rightSizer.getTotalPotentialSavings();
      expect(totalSavings).toBeGreaterThan(0);
    });
  });
});
