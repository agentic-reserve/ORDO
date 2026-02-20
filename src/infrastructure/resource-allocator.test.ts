/**
 * Unit tests for Resource Allocator
 */

import { describe, it, expect } from 'vitest';
import {
  ResourceAllocator,
  GOLDEN_RATIO,
  allocateResources,
  calculateGoldenRatioLimit,
  type ResourceRequest,
} from './resource-allocator';

describe('ResourceAllocator', () => {
  describe('Golden Ratio constant', () => {
    it('should have correct value', () => {
      expect(GOLDEN_RATIO).toBeCloseTo(1.618033988749895, 10);
    });

    it('should satisfy φ² = φ + 1', () => {
      const phiSquared = GOLDEN_RATIO * GOLDEN_RATIO;
      const phiPlusOne = GOLDEN_RATIO + 1;
      expect(phiSquared).toBeCloseTo(phiPlusOne, 10);
    });
  });

  describe('constructor', () => {
    it('should create allocator with default config', () => {
      const allocator = new ResourceAllocator();
      const config = allocator.getConfig();
      
      expect(config.limitRatio).toBe(GOLDEN_RATIO);
      expect(config.minLimitRatio).toBe(1.0);
      expect(config.maxLimitRatio).toBe(10.0);
    });

    it('should create allocator with custom config', () => {
      const allocator = new ResourceAllocator({ limitRatio: 2.0 });
      const config = allocator.getConfig();
      
      expect(config.limitRatio).toBe(2.0);
    });

    it('should throw error if limitRatio < minLimitRatio', () => {
      expect(() => {
        new ResourceAllocator({ limitRatio: 0.5, minLimitRatio: 1.0 });
      }).toThrow('limitRatio');
    });

    it('should throw error if limitRatio > maxLimitRatio', () => {
      expect(() => {
        new ResourceAllocator({ limitRatio: 15.0, maxLimitRatio: 10.0 });
      }).toThrow('limitRatio');
    });
  });

  describe('allocate', () => {
    const allocator = new ResourceAllocator();

    it('should allocate memory with Golden Ratio limit', () => {
      const request: ResourceRequest = { memory: 1000 };
      const allocation = allocator.allocate(request);
      
      expect(allocation.memory).toBeDefined();
      expect(allocation.memory!.request).toBe(1000);
      expect(allocation.memory!.limit).toBeCloseTo(1000 * GOLDEN_RATIO, 2);
    });

    it('should allocate CPU with Golden Ratio limit', () => {
      const request: ResourceRequest = { cpu: 2 };
      const allocation = allocator.allocate(request);
      
      expect(allocation.cpu).toBeDefined();
      expect(allocation.cpu!.request).toBe(2);
      expect(allocation.cpu!.limit).toBeCloseTo(2 * GOLDEN_RATIO, 2);
    });

    it('should allocate storage with Golden Ratio limit', () => {
      const request: ResourceRequest = { storage: 100 };
      const allocation = allocator.allocate(request);
      
      expect(allocation.storage).toBeDefined();
      expect(allocation.storage!.request).toBe(100);
      expect(allocation.storage!.limit).toBeCloseTo(100 * GOLDEN_RATIO, 2);
    });

    it('should allocate network with Golden Ratio limit', () => {
      const request: ResourceRequest = { network: 1000 };
      const allocation = allocator.allocate(request);
      
      expect(allocation.network).toBeDefined();
      expect(allocation.network!.request).toBe(1000);
      expect(allocation.network!.limit).toBeCloseTo(1000 * GOLDEN_RATIO, 2);
    });

    it('should allocate multiple resources', () => {
      const request: ResourceRequest = {
        memory: 1024,
        cpu: 2,
        storage: 50,
        network: 100,
      };
      const allocation = allocator.allocate(request);
      
      expect(allocation.memory).toBeDefined();
      expect(allocation.cpu).toBeDefined();
      expect(allocation.storage).toBeDefined();
      expect(allocation.network).toBeDefined();
      
      expect(allocation.memory!.limit).toBeCloseTo(1024 * GOLDEN_RATIO, 2);
      expect(allocation.cpu!.limit).toBeCloseTo(2 * GOLDEN_RATIO, 2);
      expect(allocation.storage!.limit).toBeCloseTo(50 * GOLDEN_RATIO, 2);
      expect(allocation.network!.limit).toBeCloseTo(100 * GOLDEN_RATIO, 2);
    });

    it('should handle zero requests', () => {
      const request: ResourceRequest = { memory: 0 };
      const allocation = allocator.allocate(request);
      
      expect(allocation.memory!.request).toBe(0);
      expect(allocation.memory!.limit).toBe(0);
    });

    it('should throw error for negative memory request', () => {
      expect(() => {
        allocator.allocate({ memory: -100 });
      }).toThrow('Memory request cannot be negative');
    });

    it('should throw error for negative CPU request', () => {
      expect(() => {
        allocator.allocate({ cpu: -1 });
      }).toThrow('CPU request cannot be negative');
    });

    it('should throw error for negative storage request', () => {
      expect(() => {
        allocator.allocate({ storage: -50 });
      }).toThrow('Storage request cannot be negative');
    });

    it('should throw error for negative network request', () => {
      expect(() => {
        allocator.allocate({ network: -100 });
      }).toThrow('Network request cannot be negative');
    });

    it('should handle empty request', () => {
      const request: ResourceRequest = {};
      const allocation = allocator.allocate(request);
      
      expect(allocation.memory).toBeUndefined();
      expect(allocation.cpu).toBeUndefined();
      expect(allocation.storage).toBeUndefined();
      expect(allocation.network).toBeUndefined();
    });
  });

  describe('isGoldenRatioAllocation', () => {
    const allocator = new ResourceAllocator();

    it('should return true for exact Golden Ratio allocation', () => {
      const request = 1000;
      const limit = request * GOLDEN_RATIO;
      
      expect(allocator.isGoldenRatioAllocation(request, limit)).toBe(true);
    });

    it('should return true for allocation within tolerance', () => {
      const request = 1000;
      const limit = request * GOLDEN_RATIO * 1.0001; // 0.01% off
      
      expect(allocator.isGoldenRatioAllocation(request, limit)).toBe(true);
    });

    it('should return false for allocation outside tolerance', () => {
      const request = 1000;
      const limit = request * 2.0; // Way off
      
      expect(allocator.isGoldenRatioAllocation(request, limit)).toBe(false);
    });

    it('should handle zero request', () => {
      expect(allocator.isGoldenRatioAllocation(0, 0)).toBe(true);
    });
  });

  describe('calculateHeadroom', () => {
    const allocator = new ResourceAllocator();

    it('should calculate correct headroom percentage', () => {
      const request = 1000;
      const limit = 1618;
      const headroom = allocator.calculateHeadroom(request, limit);
      
      expect(headroom).toBeCloseTo(61.8, 1);
    });

    it('should return 0 for zero request', () => {
      expect(allocator.calculateHeadroom(0, 0)).toBe(0);
    });

    it('should calculate Golden Ratio headroom', () => {
      const request = 1000;
      const limit = request * GOLDEN_RATIO;
      const headroom = allocator.calculateHeadroom(request, limit);
      
      // Golden Ratio provides ~61.8% headroom
      expect(headroom).toBeCloseTo(61.8, 1);
    });
  });

  describe('convenience functions', () => {
    it('allocateResources should work', () => {
      const request: ResourceRequest = { memory: 1000, cpu: 2 };
      const allocation = allocateResources(request);
      
      expect(allocation.memory).toBeDefined();
      expect(allocation.cpu).toBeDefined();
      expect(allocation.memory!.limit).toBeCloseTo(1000 * GOLDEN_RATIO, 2);
      expect(allocation.cpu!.limit).toBeCloseTo(2 * GOLDEN_RATIO, 2);
    });

    it('calculateGoldenRatioLimit should work', () => {
      const limit = calculateGoldenRatioLimit(1000);
      expect(limit).toBeCloseTo(1618.033988749895, 2);
    });
  });

  describe('edge cases', () => {
    it('should handle very small requests', () => {
      const allocator = new ResourceAllocator();
      const request: ResourceRequest = { memory: 0.001 };
      const allocation = allocator.allocate(request);
      
      expect(allocation.memory!.limit).toBeCloseTo(0.001 * GOLDEN_RATIO, 6);
    });

    it('should handle very large requests', () => {
      const allocator = new ResourceAllocator();
      const request: ResourceRequest = { memory: 1000000 };
      const allocation = allocator.allocate(request);
      
      expect(allocation.memory!.limit).toBeCloseTo(1000000 * GOLDEN_RATIO, 2);
    });

    it('should respect minLimitRatio', () => {
      const allocator = new ResourceAllocator({
        limitRatio: 1.5,
        minLimitRatio: 1.5,
      });
      const request: ResourceRequest = { memory: 1000 };
      const allocation = allocator.allocate(request);
      
      // Should use minLimitRatio
      expect(allocation.memory!.limit).toBeCloseTo(1500, 2);
    });

    it('should respect maxLimitRatio', () => {
      const allocator = new ResourceAllocator({
        limitRatio: 3.0,
        maxLimitRatio: 3.0,
      });
      const request: ResourceRequest = { memory: 1000 };
      const allocation = allocator.allocate(request);
      
      // Should use maxLimitRatio
      expect(allocation.memory!.limit).toBeCloseTo(3000, 2);
    });
  });

  describe('real-world scenarios', () => {
    it('should allocate resources for a small agent', () => {
      const allocator = new ResourceAllocator();
      const request: ResourceRequest = {
        memory: 512, // 512 MB
        cpu: 0.5, // 0.5 cores
        storage: 10, // 10 GB
      };
      const allocation = allocator.allocate(request);
      
      expect(allocation.memory!.limit).toBeCloseTo(828.4, 1); // ~828 MB
      expect(allocation.cpu!.limit).toBeCloseTo(0.809, 2); // ~0.81 cores
      expect(allocation.storage!.limit).toBeCloseTo(16.18, 1); // ~16.2 GB
    });

    it('should allocate resources for a large agent', () => {
      const allocator = new ResourceAllocator();
      const request: ResourceRequest = {
        memory: 8192, // 8 GB
        cpu: 4, // 4 cores
        storage: 500, // 500 GB
        network: 10000, // 10 Gbps
      };
      const allocation = allocator.allocate(request);
      
      expect(allocation.memory!.limit).toBeCloseTo(13254.9, 1); // ~13.3 GB
      expect(allocation.cpu!.limit).toBeCloseTo(6.472, 2); // ~6.5 cores
      expect(allocation.storage!.limit).toBeCloseTo(809.0, 1); // ~809 GB
      expect(allocation.network!.limit).toBeCloseTo(16180.3, 1); // ~16.2 Gbps
    });
  });
});
