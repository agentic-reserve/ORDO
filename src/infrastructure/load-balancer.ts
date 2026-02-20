/**
 * Load Balancer with Universal Constants
 * 
 * Implements load balancing with 1/137 coupling ratio (0.73%) for optimal resource distribution.
 * The fine structure constant (α ≈ 1/137) represents optimal coupling in physics,
 * applied here for infrastructure optimization.
 * 
 * Requirements: 21.1
 * Property 96: Load Balancing Ratio
 */

export interface LoadBalancerConfig {
  /** Coupling ratio based on fine structure constant (1/137 ≈ 0.0073) */
  couplingRatio: number;
  /** Maximum number of nodes in the pool */
  maxNodes: number;
  /** Minimum number of nodes in the pool */
  minNodes: number;
}

export interface Node {
  id: string;
  load: number; // Current load (0-1)
  capacity: number; // Maximum capacity
  healthy: boolean;
}

export interface LoadDistribution {
  nodeId: string;
  assignedLoad: number;
  utilizationPercent: number;
}

/**
 * Fine structure constant - optimal coupling ratio in nature
 * α ≈ 1/137.036 ≈ 0.00729735
 */
export const FINE_STRUCTURE_CONSTANT = 1 / 137;

/**
 * Default load balancer configuration
 */
export const DEFAULT_CONFIG: LoadBalancerConfig = {
  couplingRatio: FINE_STRUCTURE_CONSTANT,
  maxNodes: 100,
  minNodes: 1,
};

/**
 * Load Balancer implementing universal constant-based distribution
 */
export class LoadBalancer {
  private config: LoadBalancerConfig;
  private nodes: Map<string, Node>;

  constructor(config: Partial<LoadBalancerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.nodes = new Map();
  }

  /**
   * Register a node in the load balancer pool
   */
  registerNode(node: Node): void {
    if (this.nodes.size >= this.config.maxNodes) {
      throw new Error(`Maximum nodes (${this.config.maxNodes}) reached`);
    }
    this.nodes.set(node.id, node);
  }

  /**
   * Unregister a node from the pool
   */
  unregisterNode(nodeId: string): void {
    this.nodes.delete(nodeId);
  }

  /**
   * Mark a node as healthy or unhealthy
   */
  setNodeHealth(nodeId: string, healthy: boolean): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.healthy = healthy;
    }
  }

  /**
   * Get all healthy nodes
   */
  private getHealthyNodes(): Node[] {
    return Array.from(this.nodes.values()).filter(node => node.healthy);
  }

  /**
   * Distribute load across nodes using the coupling ratio
   * 
   * The coupling ratio (1/137) determines how load is distributed:
   * - Primary node receives (1 - α) of the load
   * - Secondary nodes share α of the load
   * 
   * This creates optimal coupling between nodes while maintaining independence.
   */
  distributeLoad(totalLoad: number): LoadDistribution[] {
    const healthyNodes = this.getHealthyNodes();
    
    if (healthyNodes.length === 0) {
      throw new Error('No healthy nodes available');
    }

    if (healthyNodes.length === 1) {
      // Single node gets all load
      return [{
        nodeId: healthyNodes[0].id,
        assignedLoad: totalLoad,
        utilizationPercent: (totalLoad / healthyNodes[0].capacity) * 100,
      }];
    }

    // Sort nodes by current load (ascending) to balance
    const sortedNodes = healthyNodes.sort((a, b) => a.load - b.load);

    // Primary node (least loaded) gets (1 - α) of new load
    const primaryLoad = totalLoad * (1 - this.config.couplingRatio);
    
    // Secondary nodes share α of new load
    const secondaryLoad = totalLoad * this.config.couplingRatio;
    const secondaryNodes = sortedNodes.slice(1);
    const loadPerSecondary = secondaryNodes.length > 0 
      ? secondaryLoad / secondaryNodes.length 
      : 0;

    const distribution: LoadDistribution[] = [];

    // Assign to primary node
    const primaryNode = sortedNodes[0];
    distribution.push({
      nodeId: primaryNode.id,
      assignedLoad: primaryLoad,
      utilizationPercent: ((primaryNode.load + primaryLoad) / primaryNode.capacity) * 100,
    });

    // Assign to secondary nodes
    for (const node of secondaryNodes) {
      distribution.push({
        nodeId: node.id,
        assignedLoad: loadPerSecondary,
        utilizationPercent: ((node.load + loadPerSecondary) / node.capacity) * 100,
      });
    }

    return distribution;
  }

  /**
   * Apply load distribution to nodes
   */
  applyDistribution(distribution: LoadDistribution[]): void {
    for (const dist of distribution) {
      const node = this.nodes.get(dist.nodeId);
      if (node) {
        node.load += dist.assignedLoad;
      }
    }
  }

  /**
   * Get current load distribution across all nodes
   */
  getCurrentDistribution(): LoadDistribution[] {
    return Array.from(this.nodes.values()).map(node => ({
      nodeId: node.id,
      assignedLoad: node.load,
      utilizationPercent: (node.load / node.capacity) * 100,
    }));
  }

  /**
   * Calculate the coupling ratio of current distribution
   * Returns the ratio of load on secondary nodes to total load
   */
  calculateCouplingRatio(): number {
    const healthyNodes = this.getHealthyNodes();
    
    if (healthyNodes.length <= 1) {
      return 0;
    }

    const sortedNodes = healthyNodes.sort((a, b) => b.load - a.load);
    const primaryLoad = sortedNodes[0].load;
    const totalLoad = healthyNodes.reduce((sum, node) => sum + node.load, 0);
    const secondaryLoad = totalLoad - primaryLoad;

    return totalLoad > 0 ? secondaryLoad / totalLoad : 0;
  }

  /**
   * Reset all node loads to zero
   */
  resetLoads(): void {
    for (const node of this.nodes.values()) {
      node.load = 0;
    }
  }

  /**
   * Get node count
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get healthy node count
   */
  getHealthyNodeCount(): number {
    return this.getHealthyNodes().length;
  }
}
