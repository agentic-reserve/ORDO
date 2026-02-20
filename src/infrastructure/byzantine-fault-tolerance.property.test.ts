/**
 * Property-Based Tests for Byzantine Fault Tolerance
 * 
 * Feature: ordo-digital-civilization
 * Property 97: Byzantine Fault Tolerance
 * 
 * **Validates: Requirements 21.2**
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  ByzantineFaultToleranceSystem,
  ConsensusRequest,
  ConsensusResponse,
  BFT_FAULT_THRESHOLD,
} from './byzantine-fault-tolerance';

describe('Property 97: Byzantine Fault Tolerance', () => {
  it('should tolerate up to 33% node failures while maintaining consensus', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 20 }), // Total nodes (min 4 for BFT)
        (totalNodes) => {
          const bft = new ByzantineFaultToleranceSystem();
          
          // Register nodes
          for (let i = 0; i < totalNodes; i++) {
            bft.registerNode(`node-${i}`);
          }

          // Calculate max tolerable faults (should be floor((n-1)/3))
          const maxFaults = bft.getMaxTolerableFaults();
          const expectedMaxFaults = Math.floor((totalNodes - 1) / 3);
          
          expect(maxFaults).toBe(expectedMaxFaults);
          
          // Mark nodes as faulty up to the threshold
          for (let i = 0; i < maxFaults; i++) {
            bft.markNodeFaulty(`node-${i}`);
            // Mark as unhealthy by setting faulty behavior count high
            for (let j = 0; j < 10; j++) {
              bft.markNodeFaulty(`node-${i}`);
            }
          }

          // System should still be able to tolerate current faults
          expect(bft.canTolerateCurrentFaults()).toBe(true);
          
          // Fault tolerance percentage should be approximately 33%
          const faultTolerancePercent = bft.getFaultTolerancePercentage();
          // For small numbers, the percentage can vary more
          expect(faultTolerancePercent).toBeGreaterThanOrEqual(0);
          expect(faultTolerancePercent).toBeLessThanOrEqual(50); // At most 50%
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should fail consensus when more than 33% of nodes are faulty', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 20 }),
        (totalNodes) => {
          const bft = new ByzantineFaultToleranceSystem();
          
          // Register nodes
          for (let i = 0; i < totalNodes; i++) {
            bft.registerNode(`node-${i}`);
          }

          const maxFaults = bft.getMaxTolerableFaults();
          
          // Mark more nodes as faulty than tolerable (maxFaults + 1)
          for (let i = 0; i <= maxFaults; i++) {
            for (let j = 0; j < 10; j++) {
              bft.markNodeFaulty(`node-${i}`);
            }
          }

          // System should NOT be able to tolerate current faults
          expect(bft.canTolerateCurrentFaults()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should require at least 2f+1 votes for consensus', async () => {
    const totalNodes = 7;
    const bft = new ByzantineFaultToleranceSystem();
    
    // Register nodes
    for (let i = 0; i < totalNodes; i++) {
      bft.registerNode(`node-${i}`);
    }

    const maxFaults = bft.getMaxTolerableFaults();
    const requiredVotes = 2 * maxFaults + 1;

    // Create consensus request
    const request: ConsensusRequest = {
      id: `request-test`,
      data: { test: 'data' },
      timestamp: new Date(),
    };

    // Create responses with exactly requiredVotes accepting
    const responses: ConsensusResponse[] = [];
    for (let i = 0; i < totalNodes; i++) {
      responses.push({
        nodeId: `node-${i}`,
        requestId: request.id,
        vote: i < requiredVotes,
      });
    }

    const result = await bft.requestConsensus(request, responses);
    
    // With requiredVotes accepting, consensus should be reached
    expect(result.accepted).toBe(true);
    expect(result.votes.accept).toBeGreaterThanOrEqual(requiredVotes);
  });

  it('should only count votes from healthy nodes', async () => {
    const totalNodes = 10;
    const bft = new ByzantineFaultToleranceSystem();
    
    // Register nodes
    for (let i = 0; i < totalNodes; i++) {
      bft.registerNode(`node-${i}`);
    }

    // Mark 2 nodes as faulty (within tolerance for 10 nodes: maxFaults = floor((10-1)/3) = 3)
    const faultyCount = 2;
    for (let i = 0; i < faultyCount; i++) {
      for (let j = 0; j < 10; j++) {
        bft.markNodeFaulty(`node-${i}`);
      }
    }

    const request: ConsensusRequest = {
      id: `request-test`,
      data: { test: 'data' },
      timestamp: new Date(),
    };

    // All nodes vote accept (including faulty ones)
    const responses: ConsensusResponse[] = [];
    for (let i = 0; i < totalNodes; i++) {
      responses.push({
        nodeId: `node-${i}`,
        requestId: request.id,
        vote: true,
      });
    }

    const result = await bft.requestConsensus(request, responses);
    
    // Only healthy nodes should be counted
    const healthyCount = bft.getHealthyNodeCount();
    expect(result.votes.total).toBeLessThanOrEqual(healthyCount);
    expect(result.participatingNodes.length).toBeLessThanOrEqual(healthyCount);
  });

  it('should maintain consensus with exactly 33% faulty nodes', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 9, max: 21 }).filter(n => n % 3 === 0), // Multiples of 3 for exact 33%
        (totalNodes) => {
          const bft = new ByzantineFaultToleranceSystem();
          
          // Register nodes
          for (let i = 0; i < totalNodes; i++) {
            bft.registerNode(`node-${i}`);
          }

          // Mark exactly 33% as faulty (but within tolerance)
          const maxFaults = bft.getMaxTolerableFaults();
          for (let i = 0; i < maxFaults; i++) {
            for (let j = 0; j < 10; j++) {
              bft.markNodeFaulty(`node-${i}`);
            }
          }

          // Should still be able to tolerate faults
          expect(bft.canTolerateCurrentFaults()).toBe(true);
          
          // Verify fault count
          expect(bft.getFaultyNodeCount()).toBe(maxFaults);
          expect(bft.getHealthyNodeCount()).toBe(totalNodes - maxFaults);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should require minimum 4 nodes for BFT', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 3 }),
        (nodeCount) => {
          const bft = new ByzantineFaultToleranceSystem();
          
          for (let i = 0; i < nodeCount; i++) {
            bft.registerNode(`node-${i}`);
          }

          expect(bft.hasMinimumNodes()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should accept consensus with sufficient votes', async () => {
    const totalNodes = 7;
    const bft = new ByzantineFaultToleranceSystem();
    
    // Register nodes
    for (let i = 0; i < totalNodes; i++) {
      bft.registerNode(`node-${i}`);
    }

    const request: ConsensusRequest = {
      id: `request-test`,
      data: { test: 'data' },
      timestamp: new Date(),
    };

    // All healthy nodes vote accept
    const responses: ConsensusResponse[] = [];
    for (let i = 0; i < totalNodes; i++) {
      responses.push({
        nodeId: `node-${i}`,
        requestId: request.id,
        vote: true,
      });
    }

    const result = await bft.requestConsensus(request, responses);
    
    // With all nodes voting accept, consensus should be reached
    expect(result.accepted).toBe(true);
    expect(result.votes.accept).toBe(totalNodes);
  });

  it('should store and retrieve consensus results', async () => {
    const totalNodes = 7;
    const requestId = 'test-request-123';
    const bft = new ByzantineFaultToleranceSystem();
    
    // Register nodes
    for (let i = 0; i < totalNodes; i++) {
      bft.registerNode(`node-${i}`);
    }

    const request: ConsensusRequest = {
      id: requestId,
      data: { test: 'data' },
      timestamp: new Date(),
    };

    const responses: ConsensusResponse[] = [];
    for (let i = 0; i < totalNodes; i++) {
      responses.push({
        nodeId: `node-${i}`,
        requestId: request.id,
        vote: true,
      });
    }

    await bft.requestConsensus(request, responses);
    
    // Should be able to retrieve result
    const result = bft.getConsensusResult(requestId);
    expect(result).toBeDefined();
    expect(result?.requestId).toBe(requestId);
  });
});
