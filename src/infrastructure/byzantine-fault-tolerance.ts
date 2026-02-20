/**
 * Byzantine Fault Tolerance System
 * 
 * Implements Byzantine fault tolerance with 33% node failure tolerance.
 * Based on the Byzantine Generals Problem, the system can tolerate up to f faulty nodes
 * where f < n/3 (n = total nodes). This means the system can tolerate 33% node failures
 * while maintaining consensus and operation.
 * 
 * Requirements: 21.2
 * Property 97: Byzantine Fault Tolerance
 */

export interface BFTNode {
  id: string;
  healthy: boolean;
  lastHeartbeat: Date;
  faultyBehaviorCount: number;
}

export interface ConsensusRequest {
  id: string;
  data: any;
  timestamp: Date;
}

export interface ConsensusResponse {
  nodeId: string;
  requestId: string;
  vote: boolean; // true = accept, false = reject
  signature?: string;
}

export interface ConsensusResult {
  requestId: string;
  accepted: boolean;
  votes: {
    accept: number;
    reject: number;
    total: number;
  };
  participatingNodes: string[];
}

/**
 * Byzantine Fault Tolerance threshold: 33% (1/3)
 * System can tolerate up to f faulty nodes where f < n/3
 */
export const BFT_FAULT_THRESHOLD = 1 / 3;

/**
 * Minimum nodes required for BFT consensus: 3f + 1
 * For f=1 fault, need at least 4 nodes
 */
export const BFT_MIN_NODES = 4;

/**
 * Heartbeat timeout in milliseconds (30 seconds)
 */
export const HEARTBEAT_TIMEOUT_MS = 30000;

/**
 * Maximum faulty behavior count before marking node as permanently faulty
 */
export const MAX_FAULTY_BEHAVIOR = 10;

/**
 * Byzantine Fault Tolerance System
 */
export class ByzantineFaultToleranceSystem {
  private nodes: Map<string, BFTNode>;
  private consensusHistory: Map<string, ConsensusResult>;

  constructor() {
    this.nodes = new Map();
    this.consensusHistory = new Map();
  }

  /**
   * Register a node in the BFT system
   */
  registerNode(nodeId: string): void {
    this.nodes.set(nodeId, {
      id: nodeId,
      healthy: true,
      lastHeartbeat: new Date(),
      faultyBehaviorCount: 0,
    });
  }

  /**
   * Unregister a node from the system
   */
  unregisterNode(nodeId: string): void {
    this.nodes.delete(nodeId);
  }

  /**
   * Update node heartbeat
   */
  updateHeartbeat(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.lastHeartbeat = new Date();
      node.healthy = true;
    }
  }

  /**
   * Mark node as faulty
   */
  markNodeFaulty(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.faultyBehaviorCount++;
      if (node.faultyBehaviorCount >= MAX_FAULTY_BEHAVIOR) {
        node.healthy = false;
      }
    }
  }

  /**
   * Check for nodes with expired heartbeats
   */
  checkHeartbeats(): void {
    const now = new Date();
    for (const node of this.nodes.values()) {
      const timeSinceHeartbeat = now.getTime() - node.lastHeartbeat.getTime();
      if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        node.healthy = false;
      }
    }
  }

  /**
   * Get all healthy nodes
   */
  getHealthyNodes(): BFTNode[] {
    return Array.from(this.nodes.values()).filter(node => node.healthy);
  }

  /**
   * Get total node count
   */
  getTotalNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get healthy node count
   */
  getHealthyNodeCount(): number {
    return this.getHealthyNodes().length;
  }

  /**
   * Get faulty node count
   */
  getFaultyNodeCount(): number {
    return this.getTotalNodeCount() - this.getHealthyNodeCount();
  }

  /**
   * Calculate maximum tolerable faults
   * f < n/3, so max_f = floor((n-1)/3)
   */
  getMaxTolerableFaults(): number {
    const n = this.getTotalNodeCount();
    return Math.floor((n - 1) / 3);
  }

  /**
   * Check if system can tolerate current faults
   * Returns true if faulty_nodes <= max_tolerable_faults
   */
  canTolerateCurrentFaults(): boolean {
    const faultyCount = this.getFaultyNodeCount();
    const maxTolerable = this.getMaxTolerableFaults();
    return faultyCount <= maxTolerable;
  }

  /**
   * Calculate fault tolerance percentage
   * Returns the percentage of nodes that can fail while maintaining consensus
   */
  getFaultTolerancePercentage(): number {
    const n = this.getTotalNodeCount();
    if (n === 0) return 0;
    const maxFaults = this.getMaxTolerableFaults();
    return (maxFaults / n) * 100;
  }

  /**
   * Check if system has minimum nodes for BFT
   */
  hasMinimumNodes(): boolean {
    return this.getTotalNodeCount() >= BFT_MIN_NODES;
  }

  /**
   * Request consensus from all healthy nodes
   * 
   * For consensus to be reached:
   * - Need at least 2f + 1 votes (simple majority of honest nodes)
   * - Where f is the maximum tolerable faults
   */
  async requestConsensus(request: ConsensusRequest, responses: ConsensusResponse[]): Promise<ConsensusResult> {
    const healthyNodes = this.getHealthyNodes();
    
    if (!this.hasMinimumNodes()) {
      throw new Error(`Insufficient nodes for BFT. Need at least ${BFT_MIN_NODES}, have ${this.getTotalNodeCount()}`);
    }

    if (!this.canTolerateCurrentFaults()) {
      throw new Error('Too many faulty nodes. System cannot maintain consensus.');
    }

    // Filter responses to only include healthy nodes
    const validResponses = responses.filter(r => 
      healthyNodes.some(n => n.id === r.nodeId) && r.requestId === request.id
    );

    // Count votes
    const acceptVotes = validResponses.filter(r => r.vote).length;
    const rejectVotes = validResponses.filter(r => !r.vote).length;
    const totalVotes = validResponses.length;

    // Calculate required votes for consensus (2f + 1)
    const maxFaults = this.getMaxTolerableFaults();
    const requiredVotes = 2 * maxFaults + 1;

    // Consensus is reached if accept votes >= required votes
    const accepted = acceptVotes >= requiredVotes;

    const result: ConsensusResult = {
      requestId: request.id,
      accepted,
      votes: {
        accept: acceptVotes,
        reject: rejectVotes,
        total: totalVotes,
      },
      participatingNodes: validResponses.map(r => r.nodeId),
    };

    // Store in history
    this.consensusHistory.set(request.id, result);

    return result;
  }

  /**
   * Get consensus result from history
   */
  getConsensusResult(requestId: string): ConsensusResult | undefined {
    return this.consensusHistory.get(requestId);
  }

  /**
   * Clear consensus history
   */
  clearConsensusHistory(): void {
    this.consensusHistory.clear();
  }

  /**
   * Reset all nodes to healthy state
   */
  resetNodes(): void {
    for (const node of this.nodes.values()) {
      node.healthy = true;
      node.lastHeartbeat = new Date();
      node.faultyBehaviorCount = 0;
    }
  }
}
