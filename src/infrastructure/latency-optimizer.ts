/**
 * Real-Time Latency Optimizer with 33ms Target
 * 
 * Implements latency monitoring and optimization targeting 33ms for real-time operations.
 * The number 33 represents the Christ consciousness frequency and optimal real-time response,
 * applied here as the target latency for critical path operations.
 * 
 * Requirements: 21.6
 * Property 101: Real-Time Latency Target
 */

export interface LatencyMeasurement {
  operationName: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  exceedsTarget: boolean;
  timestamp: Date;
}

export interface LatencyStats {
  operationName: string;
  count: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  exceedanceRate: number; // Percentage of operations exceeding 33ms
}

export interface LatencyWarning {
  operationName: string;
  durationMs: number;
  targetMs: number;
  exceedanceMs: number;
  timestamp: Date;
  message: string;
}

export interface LatencyConfig {
  targetLatencyMs: number; // Default: 33ms
  warningThreshold: number; // Default: 1.5x target (49.5ms)
  criticalThreshold: number; // Default: 2x target (66ms)
  maxHistorySize: number; // Maximum measurements to keep in memory
}

/**
 * Optimal real-time latency target: 33ms
 * Represents the threshold for human perception of real-time interaction
 */
export const TARGET_LATENCY_MS = 33;

/**
 * Warning threshold: 1.5x target (49.5ms)
 * Operations exceeding this should be logged as warnings
 */
export const WARNING_THRESHOLD_MS = TARGET_LATENCY_MS * 1.5;

/**
 * Critical threshold: 2x target (66ms)
 * Operations exceeding this should trigger alerts
 */
export const CRITICAL_THRESHOLD_MS = TARGET_LATENCY_MS * 2;

/**
 * Default latency configuration
 */
export const DEFAULT_LATENCY_CONFIG: LatencyConfig = {
  targetLatencyMs: TARGET_LATENCY_MS,
  warningThreshold: WARNING_THRESHOLD_MS,
  criticalThreshold: CRITICAL_THRESHOLD_MS,
  maxHistorySize: 1000,
};

/**
 * Latency Monitor
 * 
 * Tracks operation timing and provides utilities to measure and optimize critical paths
 */
export class LatencyMonitor {
  private config: LatencyConfig;
  private measurements: Map<string, LatencyMeasurement[]>;
  private activeOperations: Map<string, number>;
  private warnings: LatencyWarning[];

  constructor(config: Partial<LatencyConfig> = {}) {
    this.config = { ...DEFAULT_LATENCY_CONFIG, ...config };
    this.measurements = new Map();
    this.activeOperations = new Map();
    this.warnings = [];
  }

  /**
   * Start timing an operation
   * Returns an operation ID that should be passed to endOperation
   */
  startOperation(operationName: string): string {
    const operationId = `${operationName}:${Date.now()}:${Math.random()}`;
    this.activeOperations.set(operationId, performance.now());
    return operationId;
  }

  /**
   * End timing an operation and record the measurement
   */
  endOperation(operationId: string): LatencyMeasurement | null {
    const startTime = this.activeOperations.get(operationId);
    if (startTime === undefined) {
      return null;
    }

    const endTime = performance.now();
    const durationMs = endTime - startTime;
    const operationName = operationId.split(':')[0];
    const exceedsTarget = durationMs > this.config.targetLatencyMs;

    const measurement: LatencyMeasurement = {
      operationName,
      startTime,
      endTime,
      durationMs,
      exceedsTarget,
      timestamp: new Date(),
    };

    // Store measurement
    if (!this.measurements.has(operationName)) {
      this.measurements.set(operationName, []);
    }
    const history = this.measurements.get(operationName)!;
    history.push(measurement);

    // Trim history if needed
    if (history.length > this.config.maxHistorySize) {
      history.shift();
    }

    // Check for warnings
    if (durationMs > this.config.warningThreshold) {
      this.recordWarning(measurement);
    }

    // Clean up active operation
    this.activeOperations.delete(operationId);

    return measurement;
  }

  /**
   * Measure an async operation
   * Convenience wrapper that handles start/end automatically
   */
  async measureAsync<T>(
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const operationId = this.startOperation(operationName);
    try {
      const result = await operation();
      this.endOperation(operationId);
      return result;
    } catch (error) {
      this.endOperation(operationId);
      throw error;
    }
  }

  /**
   * Measure a synchronous operation
   * Convenience wrapper that handles start/end automatically
   */
  measureSync<T>(operationName: string, operation: () => T): T {
    const operationId = this.startOperation(operationName);
    try {
      const result = operation();
      this.endOperation(operationId);
      return result;
    } catch (error) {
      this.endOperation(operationId);
      throw error;
    }
  }

  /**
   * Record a latency warning
   */
  private recordWarning(measurement: LatencyMeasurement): void {
    const isCritical = measurement.durationMs > this.config.criticalThreshold;
    const severity = isCritical ? 'CRITICAL' : 'WARNING';
    
    const warning: LatencyWarning = {
      operationName: measurement.operationName,
      durationMs: measurement.durationMs,
      targetMs: this.config.targetLatencyMs,
      exceedanceMs: measurement.durationMs - this.config.targetLatencyMs,
      timestamp: measurement.timestamp,
      message: `[${severity}] Operation '${measurement.operationName}' took ${measurement.durationMs.toFixed(2)}ms (target: ${this.config.targetLatencyMs}ms, exceeded by ${(measurement.durationMs - this.config.targetLatencyMs).toFixed(2)}ms)`,
    };

    this.warnings.push(warning);

    // Keep only last 100 warnings
    if (this.warnings.length > 100) {
      this.warnings.shift();
    }
  }

  /**
   * Get statistics for a specific operation
   */
  getStats(operationName: string): LatencyStats | null {
    const history = this.measurements.get(operationName);
    if (!history || history.length === 0) {
      return null;
    }

    const durations = history.map(m => m.durationMs).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const exceedances = history.filter(m => m.exceedsTarget).length;

    return {
      operationName,
      count,
      avgLatencyMs: sum / count,
      minLatencyMs: durations[0],
      maxLatencyMs: durations[count - 1],
      p50LatencyMs: this.percentile(durations, 50),
      p95LatencyMs: this.percentile(durations, 95),
      p99LatencyMs: this.percentile(durations, 99),
      exceedanceRate: (exceedances / count) * 100,
    };
  }

  /**
   * Get statistics for all operations
   */
  getAllStats(): LatencyStats[] {
    const stats: LatencyStats[] = [];
    for (const operationName of this.measurements.keys()) {
      const stat = this.getStats(operationName);
      if (stat) {
        stats.push(stat);
      }
    }
    return stats;
  }

  /**
   * Get recent warnings
   */
  getWarnings(limit: number = 10): LatencyWarning[] {
    return this.warnings.slice(-limit);
  }

  /**
   * Get all warnings
   */
  getAllWarnings(): LatencyWarning[] {
    return [...this.warnings];
  }

  /**
   * Clear all measurements and warnings
   */
  clear(): void {
    this.measurements.clear();
    this.activeOperations.clear();
    this.warnings = [];
  }

  /**
   * Clear measurements for a specific operation
   */
  clearOperation(operationName: string): void {
    this.measurements.delete(operationName);
  }

  /**
   * Get configuration
   */
  getConfig(): LatencyConfig {
    return { ...this.config };
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, index)];
  }

  /**
   * Check if an operation is within target latency
   */
  isWithinTarget(durationMs: number): boolean {
    return durationMs <= this.config.targetLatencyMs;
  }

  /**
   * Get the number of active operations
   */
  getActiveOperationCount(): number {
    return this.activeOperations.size;
  }

  /**
   * Get all operation names being tracked
   */
  getTrackedOperations(): string[] {
    return Array.from(this.measurements.keys());
  }
}

/**
 * Global latency monitor instance
 * Can be used across the application for consistent latency tracking
 */
export const globalLatencyMonitor = new LatencyMonitor();

/**
 * Decorator for measuring method latency
 * Usage: @measureLatency('operationName')
 */
export function measureLatency(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const opName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      return globalLatencyMonitor.measureAsync(opName, () =>
        originalMethod.apply(this, args)
      );
    };

    return descriptor;
  };
}
