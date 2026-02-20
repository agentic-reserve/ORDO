/**
 * Property-Based Tests for Resource Allocator
 * 
 * Feature: ordo-digital-civilization
 * Property 100: Golden Ratio Resource Allocation
 * 
 * **Validates: Requirements 21.5**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  ResourceAllocator,
  GOLDEN_RATIO,
  ResourceRequest,
  ResourceAllocation,
} from './resource-allocator';

describe('Property 100: Golden Ratio Resource Allocation', () => {
  it('should set limit = request × φ for any positive request', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.001, max: 100000, noNaN: true }),
        (request) => {
          const allocator = new ResourceAllocator();
          const allocation = allocator.allocate({ memory: request });

          // Limit should equal request × φ
          const expectedLimit = request * GOLDEN_RATIO;
          expect(allocation.memory!.limit).toBeCloseTo(expectedLimit, 6);
          expect(allocation.memory!.request).toBe(request);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should apply Golden Ratio to all resource types', () => {
    fc.assert(
      fc.property(
        fc.record({
          memory: fc.double({ min: 1, max: 10000, noNaN: true }),
          cpu: fc.double({ min: 0.1, max: 100, noNaN: true }),
          storage: fc.double({ min: 1, max: 10000, noNaN: true }),
          network: fc.double({ min: 1, max: 100000, noNaN: true }),
        }),
        (request: ResourceRequest) => {
          const allocator = new ResourceAllocator();
          const allocation = allocator.allocate(request);

          // All resources should have limit = request × φ
          if (request.memory !== undefined) {
            expect(allocation.memory!.limit).toBeCloseTo(
              request.memory * GOLDEN_RATIO,
              6
            );
          }
          if (request.cpu !== undefined) {
            expect(allocation.cpu!.limit).toBeCloseTo(
              request.cpu * GOLDEN_RATIO,
              6
            );
          }
          if (request.storage !== undefined) {
            expect(allocation.storage!.limit).toBeCloseTo(
              request.storage * GOLDEN_RATIO,
              6
            );
          }
          if (request.network !== undefined) {
            expect(allocation.network!.limit).toBeCloseTo(
              request.network * GOLDEN_RATIO,
              6
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide optimal headroom of ~61.8% for any request', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 10000, noNaN: true }),
        (request) => {
          const allocator = new ResourceAllocator();
          const allocation = allocator.allocate({ memory: request });

          const headroom = allocator.calculateHeadroom(
            allocation.memory!.request,
            allocation.memory!.limit
          );

          // Golden Ratio provides ~61.8% headroom
          // φ - 1 = 0.618... = 61.8%
          expect(headroom).toBeCloseTo(61.8, 1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain limit ≥ request for all allocations', () => {
    fc.assert(
      fc.property(
        fc.record({
          memory: fc.option(fc.double({ min: 0, max: 10000, noNaN: true }), {
            nil: undefined,
          }),
          cpu: fc.option(fc.double({ min: 0, max: 100, noNaN: true }), {
            nil: undefined,
          }),
          storage: fc.option(fc.double({ min: 0, max: 10000, noNaN: true }), {
            nil: undefined,
          }),
          network: fc.option(fc.double({ min: 0, max: 100000, noNaN: true }), {
            nil: undefined,
          }),
        }),
        (request: ResourceRequest) => {
          const allocator = new ResourceAllocator();
          const allocation = allocator.allocate(request);

          // Limit must always be >= request
          if (allocation.memory) {
            expect(allocation.memory.limit).toBeGreaterThanOrEqual(
              allocation.memory.request
            );
          }
          if (allocation.cpu) {
            expect(allocation.cpu.limit).toBeGreaterThanOrEqual(
              allocation.cpu.request
            );
          }
          if (allocation.storage) {
            expect(allocation.storage.limit).toBeGreaterThanOrEqual(
              allocation.storage.request
            );
          }
          if (allocation.network) {
            expect(allocation.network.limit).toBeGreaterThanOrEqual(
              allocation.network.request
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify Golden Ratio allocations', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 10000, noNaN: true }),
        (request) => {
          const allocator = new ResourceAllocator();
          const limit = request * GOLDEN_RATIO;

          // Exact Golden Ratio allocation should be recognized
          expect(allocator.isGoldenRatioAllocation(request, limit)).toBe(true);

          // Slightly off allocation should not be recognized
          const offLimit = request * 2.0;
          expect(allocator.isGoldenRatioAllocation(request, offLimit)).toBe(
            false
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle zero requests correctly', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('memory', 'cpu', 'storage', 'network'),
        (resourceType) => {
          const allocator = new ResourceAllocator();
          const request: ResourceRequest = { [resourceType]: 0 };
          const allocation = allocator.allocate(request);

          const resource = allocation[resourceType as keyof ResourceAllocation];
          expect(resource).toBeDefined();
          expect(resource!.request).toBe(0);
          expect(resource!.limit).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should reject negative requests', () => {
    fc.assert(
      fc.property(
        fc.double({ min: -10000, max: -0.001, noNaN: true }),
        fc.constantFrom('memory', 'cpu', 'storage', 'network'),
        (negativeValue, resourceType) => {
          const allocator = new ResourceAllocator();
          const request: ResourceRequest = { [resourceType]: negativeValue };

          expect(() => allocator.allocate(request)).toThrow('cannot be negative');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should scale proportionally with request size', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: 2, max: 10, noNaN: true }),
        (baseRequest, multiplier) => {
          const allocator = new ResourceAllocator();
          
          const allocation1 = allocator.allocate({ memory: baseRequest });
          const allocation2 = allocator.allocate({
            memory: baseRequest * multiplier,
          });

          // Limits should scale proportionally
          const ratio =
            allocation2.memory!.limit / allocation1.memory!.limit;
          expect(ratio).toBeCloseTo(multiplier, 6);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect custom limit ratios', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1.1, max: 5.0, noNaN: true }),
        fc.double({ min: 100, max: 10000, noNaN: true }),
        (customRatio, request) => {
          const allocator = new ResourceAllocator({ limitRatio: customRatio });
          const allocation = allocator.allocate({ memory: request });

          const expectedLimit = request * customRatio;
          expect(allocation.memory!.limit).toBeCloseTo(expectedLimit, 6);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain Golden Ratio mathematical properties', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 10000, noNaN: true }),
        (request) => {
          const allocator = new ResourceAllocator();
          const allocation = allocator.allocate({ memory: request });

          const limit = allocation.memory!.limit;
          const headroom = limit - request;

          // Golden Ratio property: limit/headroom = φ
          // Since limit = request × φ, then headroom = request × (φ - 1)
          // Therefore: limit/headroom = (request × φ) / (request × (φ - 1)) = φ / (φ - 1)
          const ratio = limit / headroom;
          const expectedRatio = GOLDEN_RATIO / (GOLDEN_RATIO - 1);

          expect(ratio).toBeCloseTo(expectedRatio, 6);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle very small requests without precision loss', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.000001, max: 0.1, noNaN: true }),
        (tinyRequest) => {
          const allocator = new ResourceAllocator();
          const allocation = allocator.allocate({ memory: tinyRequest });

          const expectedLimit = tinyRequest * GOLDEN_RATIO;
          expect(allocation.memory!.limit).toBeCloseTo(expectedLimit, 10);
          
          // Verify the ratio is maintained
          const ratio = allocation.memory!.limit / allocation.memory!.request;
          expect(ratio).toBeCloseTo(GOLDEN_RATIO, 6);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle very large requests without overflow', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 100000, max: 1000000, noNaN: true }),
        (largeRequest) => {
          const allocator = new ResourceAllocator();
          const allocation = allocator.allocate({ memory: largeRequest });

          const expectedLimit = largeRequest * GOLDEN_RATIO;
          expect(allocation.memory!.limit).toBeCloseTo(expectedLimit, 2);
          expect(allocation.memory!.limit).toBeLessThan(Number.MAX_SAFE_INTEGER);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should allocate independently for different resource types', () => {
    fc.assert(
      fc.property(
        fc.record({
          memory: fc.double({ min: 100, max: 10000, noNaN: true }),
          cpu: fc.double({ min: 1, max: 100, noNaN: true }),
        }),
        (request: ResourceRequest) => {
          const allocator = new ResourceAllocator();
          const allocation = allocator.allocate(request);

          // Each resource should be allocated independently
          const memoryRatio =
            allocation.memory!.limit / allocation.memory!.request;
          const cpuRatio = allocation.cpu!.limit / allocation.cpu!.request;

          expect(memoryRatio).toBeCloseTo(GOLDEN_RATIO, 6);
          expect(cpuRatio).toBeCloseTo(GOLDEN_RATIO, 6);
          
          // Ratios should be equal (both φ)
          expect(memoryRatio).toBeCloseTo(cpuRatio, 6);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should provide consistent allocations for same request', () => {
    fc.assert(
      fc.property(
        fc.record({
          memory: fc.double({ min: 1, max: 10000, noNaN: true }),
          cpu: fc.double({ min: 0.1, max: 100, noNaN: true }),
        }),
        (request: ResourceRequest) => {
          const allocator = new ResourceAllocator();
          
          const allocation1 = allocator.allocate(request);
          const allocation2 = allocator.allocate(request);

          // Same request should produce same allocation
          expect(allocation1.memory!.limit).toBe(allocation2.memory!.limit);
          expect(allocation1.cpu!.limit).toBe(allocation2.cpu!.limit);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should satisfy φ² = φ + 1 property in allocations', () => {
    // This tests the fundamental Golden Ratio property
    const phiSquared = GOLDEN_RATIO * GOLDEN_RATIO;
    const phiPlusOne = GOLDEN_RATIO + 1;
    
    expect(phiSquared).toBeCloseTo(phiPlusOne, 10);

    // Verify this holds in actual allocations
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 10000, noNaN: true }),
        (request) => {
          const allocator = new ResourceAllocator();
          const allocation = allocator.allocate({ memory: request });

          const limit = allocation.memory!.limit;
          const headroom = limit - request;

          // limit² = limit × request + request²
          // This is equivalent to φ² = φ + 1
          const leftSide = limit * limit;
          const rightSide = limit * request + request * request;

          expect(leftSide).toBeCloseTo(rightSide, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
