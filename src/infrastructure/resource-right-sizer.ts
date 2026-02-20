/**
 * Resource Right-Sizing System
 * 
 * Monitors actual usage patterns and right-sizes resources to match usage within 10% margin.
 * Implements auto-scaling based on load to optimize costs.
 * 
 * Requirements: 23.3
 * Property: 106 - Resource Right-Sizing
 */

export interface ResourceUsage {
  resourceId: string;
  resourceType: 'compute' | 'memory' | 'storage' | 'network';
  allocated: number;
  used: number;
  timestamp: Date;
}

export interface ResourceMetrics {
  resourceId: string;
  avgUsage: number;
  peakUsage: number;
  minUsage: number;
  utilizationRate: number; // used / allocated
  sampleCount: number;
}

export interface RightSizingRecommendation {
  resourceId: string;
  currentAllocation: number;
  recommendedAllocation: number;
  reason: 'overprovisioned' | 'underprovisioned' | 'optimal';
  potentialSavings?: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface RightSizingConfig {
  targetMargin: number; // Default 0.10 (10%)
  minSampleSize: number; // Minimum samples before recommending changes
  scaleUpThreshold: number; // Utilization threshold to scale up (e.g., 0.90)
  scaleDownThreshold: number; // Utilization threshold to scale down (e.g., 0.60)
  minAllocation: number; // Minimum resource allocation
  maxAllocation: number; // Maximum resource allocation
}

const DEFAULT_CONFIG: RightSizingConfig = {
  targetMargin: 0.10,
  minSampleSize: 100,
  scaleUpThreshold: 0.90,
  scaleDownThreshold: 0.60,
  minAllocation: 1,
  maxAllocation: 1000,
};

export class ResourceRightSizer {
  private usageHistory: Map<string, ResourceUsage[]> = new Map();
  private config: RightSizingConfig;

  constructor(config: Partial<RightSizingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Record resource usage sample
   */
  recordUsage(usage: ResourceUsage): void {
    const history = this.usageHistory.get(usage.resourceId) || [];
    history.push(usage);
    
    // Keep only recent samples (last 1000)
    if (history.length > 1000) {
      history.shift();
    }
    
    this.usageHistory.set(usage.resourceId, history);
  }

  /**
   * Calculate resource metrics from usage history
   */
  calculateMetrics(resourceId: string): ResourceMetrics | null {
    const history = this.usageHistory.get(resourceId);
    
    if (!history || history.length === 0) {
      return null;
    }

    const usageValues = history.map(h => h.used);
    const allocated = history[history.length - 1].allocated;
    
    const avgUsage = usageValues.reduce((sum, val) => sum + val, 0) / usageValues.length;
    const peakUsage = Math.max(...usageValues);
    const minUsage = Math.min(...usageValues);
    const utilizationRate = avgUsage / allocated;

    return {
      resourceId,
      avgUsage,
      peakUsage,
      minUsage,
      utilizationRate,
      sampleCount: history.length,
    };
  }

  /**
   * Generate right-sizing recommendation
   */
  recommend(resourceId: string): RightSizingRecommendation | null {
    const metrics = this.calculateMetrics(resourceId);
    
    if (!metrics || metrics.sampleCount < this.config.minSampleSize) {
      return null;
    }

    const history = this.usageHistory.get(resourceId)!;
    const currentAllocation = history[history.length - 1].allocated;

    // Calculate recommended allocation based on peak usage + target margin
    const recommendedAllocation = Math.max(
      this.config.minAllocation,
      Math.min(
        this.config.maxAllocation,
        Math.ceil(metrics.peakUsage * (1 + this.config.targetMargin))
      )
    );

    // Determine reason and risk level
    let reason: 'overprovisioned' | 'underprovisioned' | 'optimal';
    let riskLevel: 'low' | 'medium' | 'high';
    let potentialSavings: number | undefined;

    if (metrics.utilizationRate > this.config.scaleUpThreshold) {
      reason = 'underprovisioned';
      riskLevel = 'high';
    } else if (metrics.utilizationRate < this.config.scaleDownThreshold) {
      reason = 'overprovisioned';
      riskLevel = 'low';
      potentialSavings = currentAllocation - recommendedAllocation;
    } else {
      reason = 'optimal';
      riskLevel = 'low';
    }

    return {
      resourceId,
      currentAllocation,
      recommendedAllocation,
      reason,
      potentialSavings,
      riskLevel,
    };
  }

  /**
   * Apply right-sizing recommendation (scale resource)
   */
  async applyRecommendation(
    recommendation: RightSizingRecommendation,
    scaleFunction: (resourceId: string, newAllocation: number) => Promise<void>
  ): Promise<void> {
    if (recommendation.reason === 'optimal') {
      return; // No action needed
    }

    await scaleFunction(recommendation.resourceId, recommendation.recommendedAllocation);
  }

  /**
   * Monitor and auto-scale resource based on current usage
   */
  async monitorAndScale(
    resourceId: string,
    scaleFunction: (resourceId: string, newAllocation: number) => Promise<void>
  ): Promise<boolean> {
    const recommendation = this.recommend(resourceId);
    
    if (!recommendation || recommendation.reason === 'optimal') {
      return false;
    }

    await this.applyRecommendation(recommendation, scaleFunction);
    return true;
  }

  /**
   * Get all resources that need right-sizing
   */
  getAllRecommendations(): RightSizingRecommendation[] {
    const recommendations: RightSizingRecommendation[] = [];
    
    for (const resourceId of this.usageHistory.keys()) {
      const recommendation = this.recommend(resourceId);
      if (recommendation && recommendation.reason !== 'optimal') {
        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Clear usage history for a resource
   */
  clearHistory(resourceId: string): void {
    this.usageHistory.delete(resourceId);
  }

  /**
   * Get total potential savings across all resources
   */
  getTotalPotentialSavings(): number {
    const recommendations = this.getAllRecommendations();
    return recommendations.reduce((total, rec) => {
      return total + (rec.potentialSavings || 0);
    }, 0);
  }
}
