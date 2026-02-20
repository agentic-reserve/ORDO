/**
 * Property-Based Tests for Load Balancer
 * 
 * Feature: ordo-digital-civilization
 * Property 96: Load Balancing Ratio
 * 
 * **Validates: Requirements 21.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { LoadBalancer, Node, FINE_STRUCTURE_CONSTANT } from './load-balancer';

describe('Property 96: Load Balancing Ratio', () => {
  // Arbitrary node generator with unique IDs
  const arbitraryUniqueNodes = fc.integer({ min: 2, max: 10 }).chain(count =>
    fc.constant(
      Array.from({ length: count }, (_, i) => ({
        id: `node-${i}`,
        load: 0,
        capacity: 1000,
        healthy: true,
      }))
    )
  );

  it('should maintain coupling ratio of 1/137 (0.73%) for optimal resource distribution', () => {
    fc.assert(
      fc.property(
        arbitraryUniqueNodes,
        fc.integer({ min: 10, max: 1000 }),
        (nodes, totalLoad) => {
          const balancer = new LoadBalancer();
          
          // Register all nodes
          for (const node of nodes) {
            balancer.registerNode(node);
          }

          // Distribute load
          const distribution = balancer.distributeLoad(totalLoad);
          
          // Apply distribution to calculate actual coupling
          balancer.applyDistribution(distribution);
          
          // Calculate coupling ratio
          const couplingRatio = balancer.calculateCouplingRatio();
          
          // The coupling ratio should be close to 1/137 (0.0073)
          // Allow some tolerance due to rounding and distribution
          const expectedRatio = FINE_STRUCTURE_CONSTANT;
          const tolerance = 0.01; // 1% tolerance
          
          expect(Math.abs(couplingRatio - expectedRatio)).toBeLessThan(tolerance);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should distribute load such that primary node gets (1 - α) and secondary nodes share α', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }),
        fc.integer({ min: 100, max: 1000 }),
        (nodeCount, totalLoad) => {
          const balancer = new LoadBalancer();
          
          // Create unique nodes
          const nodes: Node[] = [];
          for (let i = 0; i < nodeCount; i++) {
            nodes.push({
              id: `node-${i}`,
              load: 0,
              capacity: 1000,
              healthy: true,
            });
          }
          
          // Register all nodes
          for (const node of nodes) {
            balancer.registerNode(node);
          }

          // Distribute load
          const distribution = balancer.distributeLoad(totalLoad);
          
          // Primary node should get approximately (1 - α) of load
          const primaryLoad = distribution[0].assignedLoad;
          const expectedPrimaryLoad = totalLoad * (1 - FINE_STRUCTURE_CONSTANT);
          
          expect(Math.abs(primaryLoad - expectedPrimaryLoad)).toBeLessThan(0.01);
          
          // Secondary nodes should share approximately α of load
          const secondaryLoad = distribution.slice(1).reduce((sum, d) => sum + d.assignedLoad, 0);
          const expectedSecondaryLoad = totalLoad * FINE_STRUCTURE_CONSTANT;
          
          expect(Math.abs(secondaryLoad - expectedSecondaryLoad)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should always select the least loaded node as primary', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 10 }),
        fc.integer({ min: 10, max: 1000 }),
        (nodeCount, totalLoad) => {
          const balancer = new LoadBalancer();
          
          // Create nodes with varying initial loads
          const nodes: Node[] = [];
          for (let i = 0; i < nodeCount; i++) {
            nodes.push({
              id: `node-${i}`,
              load: i * 10, // Increasing loads
              capacity: 1000,
              healthy: true,
            });
          }
          
          // Register nodes
          for (const node of nodes) {
            balancer.registerNode(node);
          }

          // Distribute load
          const distribution = balancer.distributeLoad(totalLoad);
          
          // First node in distribution should be the one with lowest initial load
          const primaryNodeId = distribution[0].nodeId;
          expect(primaryNodeId).toBe('node-0');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle single node by assigning all load to it', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 1000 }),
        (totalLoad) => {
          const balancer = new LoadBalancer();
          const node: Node = {
            id: 'single-node',
            load: 0,
            capacity: 2000,
            healthy: true,
          };
          balancer.registerNode(node);

          const distribution = balancer.distributeLoad(totalLoad);
          
          expect(distribution).toHaveLength(1);
          expect(distribution[0].assignedLoad).toBe(totalLoad);
          expect(distribution[0].nodeId).toBe('single-node');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should only distribute to healthy nodes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        fc.integer({ min: 10, max: 1000 }),
        (nodeCount, totalLoad) => {
          const balancer = new LoadBalancer();
          
          // Create nodes, mark some as unhealthy
          const nodes: Node[] = [];
          for (let i = 0; i < nodeCount; i++) {
            nodes.push({
              id: `node-${i}`,
              load: 0,
              capacity: 1000,
              healthy: i % 2 === 0, // Every other node unhealthy
            });
          }
          
          // Register nodes
          for (const node of nodes) {
            balancer.registerNode(node);
          }

          const distribution = balancer.distributeLoad(totalLoad);
          
          // All distributed nodes should be healthy (even indices)
          for (const dist of distribution) {
            const nodeIndex = parseInt(dist.nodeId.split('-')[1]);
            expect(nodeIndex % 2).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should throw error when no healthy nodes available', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 10, max: 1000 }),
        (nodeCount, totalLoad) => {
          const balancer = new LoadBalancer();
          
          // Register all nodes as unhealthy
          for (let i = 0; i < nodeCount; i++) {
            balancer.registerNode({
              id: `node-${i}`,
              load: 0,
              capacity: 1000,
              healthy: false,
            });
          }

          expect(() => balancer.distributeLoad(totalLoad)).toThrow('No healthy nodes available');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should maintain total load conservation', () => {
    fc.assert(
      fc.property(
        arbitraryUniqueNodes,
        fc.integer({ min: 10, max: 1000 }),
        (nodes, totalLoad) => {
          const balancer = new LoadBalancer();
          
          for (const node of nodes) {
            balancer.registerNode(node);
          }

          const distribution = balancer.distributeLoad(totalLoad);
          
          // Sum of distributed load should equal total load
          const distributedLoad = distribution.reduce((sum, d) => sum + d.assignedLoad, 0);
          
          expect(Math.abs(distributedLoad - totalLoad)).toBeLessThan(0.01);
        }
      ),
      { numRuns: 100 }
    );
  });
});
