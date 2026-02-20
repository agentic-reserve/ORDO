/**
 * Auto-Scaling System with 88.8% Threshold
 * 
 * Implements auto-scaling that triggers at 88.8% utilization.
 * The number 888 represents abundance and optimal flow in numerology,
 * applied here as the threshold for scaling decisions.
 * 
 * Requirements: 21.3
 * Property 98: Scaling Threshold
 */

export interface ResourceMetrics {
  cpu: number; // 0-100%
  memory: number; // 0-100%
  disk: number; // 0-100%
  network: number; // 0-100%
}

export interface ScalingDecision {
  shouldScale: boolean;
  direction: 'up' | 'down' | 'none';
  reason: string;
  currentUtilization: number;
  threshold: number;
}

export interface ScalingConfig {
  scaleUpThreshold: number; // Default: 88.8%
  scaleDownThreshold: number; // Default: 30%
  cooldownPeriodMs: number; // Minimum time between scaling actions
  minInstances: number;
  maxInstances: number;
}

/**
 * Optimal scaling threshold: 88.8%
 * Represents the point of maximum efficiency before resource constraints
 */
export const SCALE_UP_THRESHOLD = 88.8;

/**
 * Scale down threshold: 30%
 * Allows for cost optimization when utilization is low
 */
export const SCALE_DOWN_THRESHOLD = 30;

/**
 * Cooldown period: 5 minutes
 * Prevents thrashing from rapid scaling actions
 */
export const COOLDOWN_PERIOD_MS = 5 * 60 * 1000;

/**
 * Default scaling configuration
 */
export const DEFAULT_SCALING_CONFIG: ScalingConfig = {
  scaleUpThreshold: SCALE_UP_THRESHOLD,
  scaleDownThreshold: SCALE_DOWN_THRESHOLD,
  cooldownPeriodMs: COOLDOWN_PERIOD_MS,
  minInstances: 1,
  maxInstances: 100,
};

/**
 * Auto-Scaling System
 */
export class AutoScaler {
  private config: ScalingConfig;
  private currentInstances: number;
  private lastScalingAction: Date;

  constructor(config: Partial<ScalingConfig> = {}, initialInstances: number = 1) {
    this.config = { ...DEFAULT_SCALING_CONFIG, ...config };
    this.currentInstances = initialInstances;
    this.lastScalingAction = new Date(0); // Epoch start
  }

  /**
   * Calculate overall utilization from resource metrics
   * Uses maximum utilization across all resources
   */
  calculateUtilization(metrics: ResourceMetrics): number {
    return Math.max(metrics.cpu, metrics.memory, metrics.disk, metrics.network);
  }

  /**
   * Check if cooldown period has elapsed
   */
  isCooldownElapsed(): boolean {
    const now = new Date();
    const timeSinceLastScaling = now.getTime() - this.lastScalingAction.getTime();
    return timeSinceLastScaling >= this.config.cooldownPeriodMs;
  }

  /**
   * Evaluate whether scaling is needed
   */
  evaluateScaling(metrics: ResourceMetrics): ScalingDecision {
    const utilization = this.calculateUtilization(metrics);

    // Check if in cooldown period
    if (!this.isCooldownElapsed()) {
      return {
        shouldScale: false,
        direction: 'none',
        reason: 'Cooldown period active',
        currentUtilization: utilization,
        threshold: this.config.scaleUpThreshold,
      };
    }

    // Scale up if utilization >= 88.8%
    if (utilization >= this.config.scaleUpThreshold) {
      if (this.currentInstances >= this.config.maxInstances) {
        return {
          shouldScale: false,
          direction: 'none',
          reason: 'Already at maximum instances',
          currentUtilization: utilization,
          threshold: this.config.scaleUpThreshold,
        };
      }

      return {
        shouldScale: true,
        direction: 'up',
        reason: `Utilization ${utilization.toFixed(1)}% >= threshold ${this.config.scaleUpThreshold}%`,
        currentUtilization: utilization,
        threshold: this.config.scaleUpThreshold,
      };
    }

    // Scale down if utilization <= 30%
    if (utilization <= this.config.scaleDownThreshold) {
      if (this.currentInstances <= this.config.minInstances) {
        return {
          shouldScale: false,
          direction: 'none',
          reason: 'Already at minimum instances',
          currentUtilization: utilization,
          threshold: this.config.scaleDownThreshold,
        };
      }

      return {
        shouldScale: true,
        direction: 'down',
        reason: `Utilization ${utilization.toFixed(1)}% <= threshold ${this.config.scaleDownThreshold}%`,
        currentUtilization: utilization,
        threshold: this.config.scaleDownThreshold,
      };
    }

    // No scaling needed
    return {
      shouldScale: false,
      direction: 'none',
      reason: 'Utilization within acceptable range',
      currentUtilization: utilization,
      threshold: this.config.scaleUpThreshold,
    };
  }

  /**
   * Execute scaling action
   */
  scale(decision: ScalingDecision): number {
    if (!decision.shouldScale) {
      return this.currentInstances;
    }

    if (decision.direction === 'up') {
      this.currentInstances = Math.min(
        this.currentInstances + 1,
        this.config.maxInstances
      );
    } else if (decision.direction === 'down') {
      this.currentInstances = Math.max(
        this.currentInstances - 1,
        this.config.minInstances
      );
    }

    this.lastScalingAction = new Date();
    return this.currentInstances;
  }

  /**
   * Get current instance count
   */
  getCurrentInstances(): number {
    return this.currentInstances;
  }

  /**
   * Get scaling configuration
   */
  getConfig(): ScalingConfig {
    return { ...this.config };
  }

  /**
   * Get time since last scaling action
   */
  getTimeSinceLastScaling(): number {
    const now = new Date();
    return now.getTime() - this.lastScalingAction.getTime();
  }

  /**
   * Reset cooldown (for testing)
   */
  resetCooldown(): void {
    this.lastScalingAction = new Date(0);
  }
}
