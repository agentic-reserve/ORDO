/**
 * Auto-Scaling Efficiency System
 * 
 * Targets < 5% idle capacity by scaling based on load variations.
 * Minimizes waste while maintaining performance.
 * 
 * Requirements: 23.5
 * Property: 108 - Auto-Scaling Efficiency
 */

export interface LoadMetrics {
  currentLoad: number; // 0-100%
  capacity: number; // Total capacity
  usedCapacity: number; // Used capacity
  idleCapacity: number; // Unused capacity
  timestamp: Date;
}

export interface ScalingEfficiencyMetrics {
  avgIdleCapacity: number; // Average idle capacity percentage
  peakLoad: number;
  minLoad: number;
  avgLoad: number;
  scalingActions: number;
  efficiencyScore: number; // 0-100, higher is better
}

export interface ScalingAction {
  timestamp: Date;
  direction: 'up' | 'down';
  reason: string;
  beforeCapacity: number;
  afterCapacity: number;
  load: number;
}

export interface AutoScalingConfig {
  targetIdleCapacity: number; // Target idle capacity percentage (default: 5%)
  scaleUpThreshold: number; // Load threshold to scale up (default: 95%)
  scaleDownThreshold: number; // Load threshold to scale down (default: 60%)
  minCapacity: number;
  maxCapacity: number;
  scaleUpIncrement: number; // How much to scale up
  scaleDownIncrement: number; // How much to scale down
  cooldownMs: number;
}

const DEFAULT_CONFIG: AutoScalingConfig = {
  targetIdleCapacity: 5.0,
  scaleUpThreshold: 95.0,
  scaleDownThreshold: 60.0,
  minCapacity: 10,
  maxCapacity: 1000,
  scaleUpIncrement: 10,
  scaleDownIncrement: 5,
  cooldownMs: 60000, // 1 minute
};

export class AutoScalingEfficiency {
  private config: AutoScalingConfig;
  private currentCapacity: number;
  private loadHistory: LoadMetrics[] = [];
  private scalingHistory: ScalingAction[] = [];
  private lastScalingTime: Date;
  private maxHistorySize: number;

  constructor(config: Partial<AutoScalingConfig> = {}, initialCapacity?: number) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.currentCapacity = initialCapacity || this.config.minCapacity;
    this.lastScalingTime = new Date(0);
    this.maxHistorySize = 1000;
  }

  /**
   * Record load metrics
   */
  recordLoad(load: number): LoadMetrics {
    const usedCapacity = (load / 100) * this.currentCapacity;
    const idleCapacity = this.currentCapacity - usedCapacity;
    const idlePercentage = (idleCapacity / this.currentCapacity) * 100;

    const metrics: LoadMetrics = {
      currentLoad: load,
      capacity: this.currentCapacity,
      usedCapacity,
      idleCapacity: idlePercentage,
      timestamp: new Date(),
    };

    this.loadHistory.push(metrics);

    // Limit history size
    if (this.loadHistory.length > this.maxHistorySize) {
      this.loadHistory.shift();
    }

    return metrics;
  }

  /**
   * Evaluate if scaling is needed based on load
   */
  evaluateScaling(load: number): { shouldScale: boolean; direction: 'up' | 'down' | 'none'; reason: string } {
    // Check cooldown
    const now = new Date();
    const timeSinceLastScaling = now.getTime() - this.lastScalingTime.getTime();
    
    if (timeSinceLastScaling < this.config.cooldownMs) {
      return {
        shouldScale: false,
        direction: 'none',
        reason: 'Cooldown period active',
      };
    }

    // Calculate current idle capacity
    const usedCapacity = (load / 100) * this.currentCapacity;
    const idleCapacity = this.currentCapacity - usedCapacity;
    const idlePercentage = (idleCapacity / this.currentCapacity) * 100;

    // Scale up if load is too high (idle capacity too low)
    if (load >= this.config.scaleUpThreshold) {
      if (this.currentCapacity >= this.config.maxCapacity) {
        return {
          shouldScale: false,
          direction: 'none',
          reason: 'Already at maximum capacity',
        };
      }

      return {
        shouldScale: true,
        direction: 'up',
        reason: `Load ${load.toFixed(1)}% >= threshold ${this.config.scaleUpThreshold}%, idle capacity ${idlePercentage.toFixed(1)}% too low`,
      };
    }

    // Scale down if load is too low (idle capacity too high)
    if (load <= this.config.scaleDownThreshold && idlePercentage > this.config.targetIdleCapacity * 2) {
      if (this.currentCapacity <= this.config.minCapacity) {
        return {
          shouldScale: false,
          direction: 'none',
          reason: 'Already at minimum capacity',
        };
      }

      return {
        shouldScale: true,
        direction: 'down',
        reason: `Load ${load.toFixed(1)}% <= threshold ${this.config.scaleDownThreshold}%, idle capacity ${idlePercentage.toFixed(1)}% too high`,
      };
    }

    return {
      shouldScale: false,
      direction: 'none',
      reason: 'Load within acceptable range',
    };
  }

  /**
   * Execute scaling action
   */
  scale(load: number): number {
    const evaluation = this.evaluateScaling(load);

    if (!evaluation.shouldScale) {
      return this.currentCapacity;
    }

    const beforeCapacity = this.currentCapacity;

    if (evaluation.direction === 'up') {
      this.currentCapacity = Math.min(
        this.currentCapacity + this.config.scaleUpIncrement,
        this.config.maxCapacity
      );
    } else if (evaluation.direction === 'down') {
      this.currentCapacity = Math.max(
        this.currentCapacity - this.config.scaleDownIncrement,
        this.config.minCapacity
      );
    }

    // Record scaling action
    this.scalingHistory.push({
      timestamp: new Date(),
      direction: evaluation.direction,
      reason: evaluation.reason,
      beforeCapacity,
      afterCapacity: this.currentCapacity,
      load,
    });

    this.lastScalingTime = new Date();

    return this.currentCapacity;
  }

  /**
   * Calculate efficiency metrics
   */
  calculateEfficiencyMetrics(): ScalingEfficiencyMetrics | null {
    if (this.loadHistory.length === 0) {
      return null;
    }

    const loads = this.loadHistory.map(m => m.currentLoad);
    const idleCapacities = this.loadHistory.map(m => m.idleCapacity);

    const avgLoad = loads.reduce((sum, l) => sum + l, 0) / loads.length;
    const peakLoad = Math.max(...loads);
    const minLoad = Math.min(...loads);
    const avgIdleCapacity = idleCapacities.reduce((sum, i) => sum + i, 0) / idleCapacities.length;

    // Calculate efficiency score (0-100)
    // Perfect score when idle capacity is exactly at target
    const idleCapacityDiff = Math.abs(avgIdleCapacity - this.config.targetIdleCapacity);
    const efficiencyScore = Math.max(0, 100 - (idleCapacityDiff * 10));

    return {
      avgIdleCapacity,
      peakLoad,
      minLoad,
      avgLoad,
      scalingActions: this.scalingHistory.length,
      efficiencyScore,
    };
  }

  /**
   * Check if idle capacity is within target
   */
  isIdleCapacityOptimal(): boolean {
    const metrics = this.calculateEfficiencyMetrics();
    if (!metrics) {
      return false;
    }

    // Idle capacity should be < 5% (target)
    return metrics.avgIdleCapacity < this.config.targetIdleCapacity;
  }

  /**
   * Get current capacity
   */
  getCurrentCapacity(): number {
    return this.currentCapacity;
  }

  /**
   * Get load history
   */
  getLoadHistory(): LoadMetrics[] {
    return [...this.loadHistory];
  }

  /**
   * Get scaling history
   */
  getScalingHistory(): ScalingAction[] {
    return [...this.scalingHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.loadHistory = [];
    this.scalingHistory = [];
  }

  /**
   * Reset cooldown (for testing)
   */
  resetCooldown(): void {
    this.lastScalingTime = new Date(0);
  }
}
