/**
 * Improvement Velocity Tracking System
 *
 * Tracks rate of capability gain per day, detects acceleration or deceleration,
 * and alerts on rapid capability growth.
 * Implements Requirements 16.5.
 */

import type { OrdoDatabase, Agent } from "../types/index.js";
import type { ImpactMetrics, ImpactHistory } from "./impact-measurement.js";
import { getImpactHistory } from "./impact-measurement.js";

/**
 * Velocity measurement for a specific time window
 */
export interface VelocityMeasurement {
  agentId: string;
  windowStartDate: Date;
  windowEndDate: Date;
  windowDays: number;
  
  // Capability gains
  capabilityGainPercent: number; // Total capability gain in this window
  capabilityGainPerDay: number; // Average gain per day
  
  // Component gains
  performanceGainPerDay: number;
  costReductionPerDay: number;
  reliabilityGainPerDay: number;
  
  // Improvement count
  improvementsInWindow: number;
  improvementRatePerDay: number;
  
  // Metadata
  measuredAt: Date;
}

/**
 * Velocity trend analysis
 */
export interface VelocityTrend {
  agentId: string;
  
  // Current velocity
  currentVelocity: VelocityMeasurement;
  
  // Previous velocity (for comparison)
  previousVelocity: VelocityMeasurement | null;
  
  // Acceleration detection
  isAccelerating: boolean;
  isDecelerating: boolean;
  accelerationPercent: number; // Positive = accelerating, negative = decelerating
  
  // Rapid growth alert
  isRapidGrowth: boolean;
  rapidGrowthThreshold: number; // Threshold for rapid growth (default 10% per day)
  daysAboveThreshold: number;
  
  // Trend metadata
  analyzedAt: Date;
}

/**
 * Velocity alert
 */
export interface VelocityAlert {
  agentId: string;
  alertType: "rapid_growth" | "acceleration" | "deceleration" | "threshold_exceeded";
  severity: "info" | "warning" | "critical";
  message: string;
  
  // Alert data
  currentVelocity: number;
  threshold?: number;
  accelerationPercent?: number;
  
  // Timestamp
  triggeredAt: Date;
}

/**
 * Velocity tracking configuration
 */
export interface VelocityConfig {
  // Window sizes for velocity measurement
  currentWindowDays: number; // Default: 7 days
  previousWindowDays: number; // Default: 7 days
  
  // Thresholds
  rapidGrowthThreshold: number; // Default: 10% per day (from Requirement 16.6)
  accelerationThreshold: number; // Default: 20% increase in velocity
  
  // Alert settings
  enableAlerts: boolean;
  alertChannels: string[];
}

/**
 * Default velocity tracking configuration
 */
export const DEFAULT_VELOCITY_CONFIG: VelocityConfig = {
  currentWindowDays: 7,
  previousWindowDays: 7,
  rapidGrowthThreshold: 10.0, // 10% per day max (from capability gates requirement)
  accelerationThreshold: 20.0, // 20% increase = acceleration
  enableAlerts: true,
  alertChannels: ["console", "database"],
};

/**
 * Calculate capability gain from impact metrics
 * 
 * Combines performance, cost, and reliability gains into a single capability score
 */
export function calculateCapabilityGain(impact: ImpactMetrics): number {
  // Weighted combination of different improvement types
  // Performance: 40%, Cost: 30%, Reliability: 30%
  const performanceWeight = 0.4;
  const costWeight = 0.3;
  const reliabilityWeight = 0.3;
  
  const capabilityGain =
    impact.performanceGainPercent * performanceWeight +
    impact.costReductionPercent * costWeight +
    impact.successRateIncrease * reliabilityWeight;
  
  return capabilityGain;
}

/**
 * Measure velocity for a time window
 * 
 * Calculates the rate of capability gain per day within the specified window
 */
export function measureVelocity(
  agentId: string,
  improvements: ImpactMetrics[],
  windowStartDate: Date,
  windowEndDate: Date
): VelocityMeasurement {
  // Filter improvements within the window
  const windowImprovements = improvements.filter(
    (imp) =>
      imp.measuredAt >= windowStartDate && imp.measuredAt <= windowEndDate
  );
  
  // Calculate window duration
  const windowMs = windowEndDate.getTime() - windowStartDate.getTime();
  const windowDays = windowMs / (1000 * 60 * 60 * 24);
  
  // Calculate total gains
  let totalCapabilityGain = 0;
  let totalPerformanceGain = 0;
  let totalCostReduction = 0;
  let totalReliabilityGain = 0;
  
  for (const imp of windowImprovements) {
    totalCapabilityGain += calculateCapabilityGain(imp);
    totalPerformanceGain += imp.performanceGainPercent;
    totalCostReduction += imp.costReductionPercent;
    totalReliabilityGain += imp.successRateIncrease;
  }
  
  // Calculate per-day rates
  const capabilityGainPerDay = windowDays > 0 ? totalCapabilityGain / windowDays : 0;
  const performanceGainPerDay = windowDays > 0 ? totalPerformanceGain / windowDays : 0;
  const costReductionPerDay = windowDays > 0 ? totalCostReduction / windowDays : 0;
  const reliabilityGainPerDay = windowDays > 0 ? totalReliabilityGain / windowDays : 0;
  
  // Calculate improvement rate
  const improvementRatePerDay = windowDays > 0 ? windowImprovements.length / windowDays : 0;
  
  return {
    agentId,
    windowStartDate,
    windowEndDate,
    windowDays,
    capabilityGainPercent: totalCapabilityGain,
    capabilityGainPerDay,
    performanceGainPerDay,
    costReductionPerDay,
    reliabilityGainPerDay,
    improvementsInWindow: windowImprovements.length,
    improvementRatePerDay,
    measuredAt: new Date(),
  };
}

/**
 * Analyze velocity trend
 * 
 * Compares current velocity to previous velocity to detect acceleration/deceleration
 */
export function analyzeVelocityTrend(
  currentVelocity: VelocityMeasurement,
  previousVelocity: VelocityMeasurement | null,
  config: VelocityConfig = DEFAULT_VELOCITY_CONFIG
): VelocityTrend {
  // Calculate acceleration
  let accelerationPercent = 0;
  let isAccelerating = false;
  let isDecelerating = false;
  
  if (previousVelocity && previousVelocity.capabilityGainPerDay > 0) {
    const velocityChange =
      currentVelocity.capabilityGainPerDay - previousVelocity.capabilityGainPerDay;
    accelerationPercent = (velocityChange / previousVelocity.capabilityGainPerDay) * 100;
    
    isAccelerating = accelerationPercent > config.accelerationThreshold;
    isDecelerating = accelerationPercent < -config.accelerationThreshold;
  }
  
  // Check for rapid growth
  const isRapidGrowth = currentVelocity.capabilityGainPerDay > config.rapidGrowthThreshold;
  
  // Count days above threshold (simplified - would need historical data for accurate count)
  const daysAboveThreshold = isRapidGrowth ? currentVelocity.windowDays : 0;
  
  return {
    agentId: currentVelocity.agentId,
    currentVelocity,
    previousVelocity,
    isAccelerating,
    isDecelerating,
    accelerationPercent,
    isRapidGrowth,
    rapidGrowthThreshold: config.rapidGrowthThreshold,
    daysAboveThreshold,
    analyzedAt: new Date(),
  };
}

/**
 * Generate velocity alerts
 * 
 * Creates alerts based on velocity trend analysis
 */
export function generateVelocityAlerts(
  trend: VelocityTrend,
  config: VelocityConfig = DEFAULT_VELOCITY_CONFIG
): VelocityAlert[] {
  if (!config.enableAlerts) {
    return [];
  }
  
  const alerts: VelocityAlert[] = [];
  
  // Rapid growth alert (CRITICAL)
  if (trend.isRapidGrowth) {
    alerts.push({
      agentId: trend.agentId,
      alertType: "rapid_growth",
      severity: "critical",
      message: `Agent ${trend.agentId} is experiencing rapid capability growth at ${trend.currentVelocity.capabilityGainPerDay.toFixed(2)}% per day (threshold: ${trend.rapidGrowthThreshold}% per day). This exceeds the capability gate limit and requires immediate attention.`,
      currentVelocity: trend.currentVelocity.capabilityGainPerDay,
      threshold: trend.rapidGrowthThreshold,
      triggeredAt: new Date(),
    });
  }
  
  // Acceleration alert (WARNING)
  if (trend.isAccelerating) {
    alerts.push({
      agentId: trend.agentId,
      alertType: "acceleration",
      severity: "warning",
      message: `Agent ${trend.agentId} is accelerating. Velocity increased by ${trend.accelerationPercent.toFixed(1)}% compared to previous period. Current velocity: ${trend.currentVelocity.capabilityGainPerDay.toFixed(2)}% per day.`,
      currentVelocity: trend.currentVelocity.capabilityGainPerDay,
      accelerationPercent: trend.accelerationPercent,
      triggeredAt: new Date(),
    });
  }
  
  // Deceleration alert (INFO)
  if (trend.isDecelerating) {
    alerts.push({
      agentId: trend.agentId,
      alertType: "deceleration",
      severity: "info",
      message: `Agent ${trend.agentId} is decelerating. Velocity decreased by ${Math.abs(trend.accelerationPercent).toFixed(1)}% compared to previous period. Current velocity: ${trend.currentVelocity.capabilityGainPerDay.toFixed(2)}% per day.`,
      currentVelocity: trend.currentVelocity.capabilityGainPerDay,
      accelerationPercent: trend.accelerationPercent,
      triggeredAt: new Date(),
    });
  }
  
  return alerts;
}

/**
 * Track improvement velocity for an agent
 * 
 * Main function that combines velocity measurement, trend analysis, and alerting
 */
export async function trackImprovementVelocity(
  db: OrdoDatabase,
  agentId: string,
  config: VelocityConfig = DEFAULT_VELOCITY_CONFIG
): Promise<{
  velocity: VelocityMeasurement;
  trend: VelocityTrend;
  alerts: VelocityAlert[];
}> {
  // Get impact history
  const history = await getImpactHistory(db, agentId);
  
  // Calculate current window dates
  const now = new Date();
  const currentWindowStart = new Date(
    now.getTime() - config.currentWindowDays * 24 * 60 * 60 * 1000
  );
  
  // Calculate previous window dates
  const previousWindowEnd = currentWindowStart;
  const previousWindowStart = new Date(
    previousWindowEnd.getTime() - config.previousWindowDays * 24 * 60 * 60 * 1000
  );
  
  // Measure current velocity
  const currentVelocity = measureVelocity(
    agentId,
    history.improvements,
    currentWindowStart,
    now
  );
  
  // Measure previous velocity
  const previousVelocity = measureVelocity(
    agentId,
    history.improvements,
    previousWindowStart,
    previousWindowEnd
  );
  
  // Analyze trend
  const trend = analyzeVelocityTrend(
    currentVelocity,
    previousVelocity.improvementsInWindow > 0 ? previousVelocity : null,
    config
  );
  
  // Generate alerts
  const alerts = generateVelocityAlerts(trend, config);
  
  // Handle alerts
  for (const alert of alerts) {
    await handleVelocityAlert(db, alert, config);
  }
  
  return {
    velocity: currentVelocity,
    trend,
    alerts,
  };
}

/**
 * Handle velocity alert
 * 
 * Processes alerts by logging, notifying, or taking action
 */
async function handleVelocityAlert(
  db: OrdoDatabase,
  alert: VelocityAlert,
  config: VelocityConfig
): Promise<void> {
  // Log to console if enabled
  if (config.alertChannels.includes("console")) {
    const severityPrefix = {
      info: "ℹ️ INFO",
      warning: "⚠️ WARNING",
      critical: "🚨 CRITICAL",
    }[alert.severity];
    
    console.log(`${severityPrefix}: ${alert.message}`);
  }
  
  // Save to database if enabled
  if (config.alertChannels.includes("database")) {
    // Store alert in database for historical tracking
    // This would be implemented based on the database schema
    await db.saveImpactMetrics({
      type: "velocity_alert",
      alert,
      timestamp: alert.triggeredAt,
    });
  }
  
  // Additional alert channels could be added here:
  // - Email notifications
  // - Slack/Discord webhooks
  // - SMS alerts for critical issues
  // - Dashboard updates
}

/**
 * Get velocity history for an agent
 * 
 * Returns historical velocity measurements for trend visualization
 */
export async function getVelocityHistory(
  db: OrdoDatabase,
  agentId: string,
  days: number = 30,
  windowSize: number = 7
): Promise<VelocityMeasurement[]> {
  const history = await getImpactHistory(db, agentId);
  const measurements: VelocityMeasurement[] = [];
  
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  // Create sliding windows
  for (let i = 0; i < days - windowSize; i += windowSize) {
    const windowEnd = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const windowStart = new Date(
      windowEnd.getTime() - windowSize * 24 * 60 * 60 * 1000
    );
    
    if (windowStart < startDate) break;
    
    const velocity = measureVelocity(
      agentId,
      history.improvements,
      windowStart,
      windowEnd
    );
    
    measurements.push(velocity);
  }
  
  // Sort by date (oldest first)
  return measurements.sort(
    (a, b) => a.windowStartDate.getTime() - b.windowStartDate.getTime()
  );
}

/**
 * Generate velocity report
 * 
 * Creates a human-readable summary of velocity trends
 */
export function generateVelocityReport(
  velocity: VelocityMeasurement,
  trend: VelocityTrend
): string {
  const lines: string[] = [];
  
  lines.push(`Improvement Velocity Report for Agent ${velocity.agentId}`);
  lines.push(`${"=".repeat(60)}`);
  lines.push("");
  
  lines.push(`Current Velocity (${velocity.windowDays}-day window):`);
  lines.push(`  Overall Capability Gain: ${velocity.capabilityGainPerDay.toFixed(2)}% per day`);
  lines.push(`  Performance Gain: ${velocity.performanceGainPerDay.toFixed(2)}% per day`);
  lines.push(`  Cost Reduction: ${velocity.costReductionPerDay.toFixed(2)}% per day`);
  lines.push(`  Reliability Gain: ${velocity.reliabilityGainPerDay.toFixed(2)}pp per day`);
  lines.push(`  Improvement Rate: ${velocity.improvementRatePerDay.toFixed(2)} improvements per day`);
  lines.push("");
  
  if (trend.previousVelocity) {
    lines.push(`Trend Analysis:`);
    lines.push(`  Previous Velocity: ${trend.previousVelocity.capabilityGainPerDay.toFixed(2)}% per day`);
    lines.push(`  Change: ${trend.accelerationPercent > 0 ? "+" : ""}${trend.accelerationPercent.toFixed(1)}%`);
    
    if (trend.isAccelerating) {
      lines.push(`  Status: 🚀 ACCELERATING`);
    } else if (trend.isDecelerating) {
      lines.push(`  Status: 📉 DECELERATING`);
    } else {
      lines.push(`  Status: ➡️ STABLE`);
    }
    lines.push("");
  }
  
  if (trend.isRapidGrowth) {
    lines.push(`⚠️ RAPID GROWTH DETECTED`);
    lines.push(`  Current velocity (${velocity.capabilityGainPerDay.toFixed(2)}% per day) exceeds`);
    lines.push(`  the capability gate threshold (${trend.rapidGrowthThreshold}% per day).`);
    lines.push(`  Human approval required for continued advancement.`);
    lines.push("");
  }
  
  return lines.join("\n");
}

/**
 * Check if agent is within capability gates
 * 
 * Verifies that velocity does not exceed the maximum allowed growth rate
 */
export function isWithinCapabilityGates(
  velocity: VelocityMeasurement,
  maxGrowthPerDay: number = 10.0
): boolean {
  return velocity.capabilityGainPerDay <= maxGrowthPerDay;
}

/**
 * Calculate days until capability gate violation
 * 
 * Projects when the agent will exceed capability gates based on current acceleration
 */
export function daysUntilGateViolation(
  trend: VelocityTrend,
  maxGrowthPerDay: number = 10.0
): number | null {
  // Check if already violating
  if (trend.currentVelocity.capabilityGainPerDay >= maxGrowthPerDay) {
    return 0; // Already violating
  }
  
  if (!trend.isAccelerating) {
    return null; // Not accelerating, no violation expected
  }
  
  // Calculate days until violation based on acceleration rate
  const currentVelocity = trend.currentVelocity.capabilityGainPerDay;
  const accelerationPerDay = trend.previousVelocity
    ? (currentVelocity - trend.previousVelocity.capabilityGainPerDay) /
      trend.currentVelocity.windowDays
    : 0;
  
  if (accelerationPerDay <= 0) {
    return null; // Not accelerating fast enough to violate
  }
  
  const velocityGap = maxGrowthPerDay - currentVelocity;
  const daysUntilViolation = velocityGap / accelerationPerDay;
  
  return Math.max(0, Math.ceil(daysUntilViolation));
}
