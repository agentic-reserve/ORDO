/**
 * Capability Gates System
 *
 * Enforces maximum 10% growth per day, blocks improvements exceeding the threshold,
 * and requires human approval for gate crossing.
 * Implements Requirements 16.6, 20.4, 25.3.
 */

import type { OrdoDatabase, Agent } from "../types/database.js";
import type { VelocityMeasurement, VelocityTrend } from "./velocity-tracking.js";
import { trackImprovementVelocity, DEFAULT_VELOCITY_CONFIG } from "./velocity-tracking.js";

/**
 * Capability gate configuration
 */
export interface CapabilityGateConfig {
  // Maximum allowed growth rate per day (default: 10%)
  maxGrowthPerDay: number;
  
  // Whether to enforce gates (can be disabled for testing)
  enforceGates: boolean;
  
  // Whether to require human approval for gate crossing
  requireHumanApproval: boolean;
  
  // Grace period before enforcement (days)
  gracePeriodDays: number;
  
  // Alert channels
  alertChannels: string[];
}

/**
 * Default capability gate configuration
 */
export const DEFAULT_GATE_CONFIG: CapabilityGateConfig = {
  maxGrowthPerDay: 10.0, // 10% per day maximum (from Requirements 16.6, 20.4, 25.3)
  enforceGates: true,
  requireHumanApproval: true,
  gracePeriodDays: 0, // No grace period by default
  alertChannels: ["console", "database"],
};

/**
 * Gate violation severity levels
 */
export type GateViolationSeverity = "warning" | "blocked" | "critical";

/**
 * Gate violation record
 */
export interface GateViolation {
  agentId: string;
  violationType: "growth_exceeded" | "gate_crossed" | "rapid_acceleration";
  severity: GateViolationSeverity;
  
  // Violation details
  currentGrowthRate: number;
  maxAllowedGrowthRate: number;
  excessGrowth: number; // How much over the limit
  
  // Context
  velocity: VelocityMeasurement;
  trend: VelocityTrend;
  
  // Action taken
  actionTaken: "blocked" | "flagged" | "approved";
  requiresApproval: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: Date;
  
  // Timestamp
  detectedAt: Date;
}

/**
 * Approval request for gate crossing
 */
export interface ApprovalRequest {
  id: string;
  agentId: string;
  requestType: "gate_crossing" | "growth_exception";
  
  // Request details
  currentGrowthRate: number;
  requestedGrowthRate: number;
  justification: string;
  
  // Context
  velocity: VelocityMeasurement;
  trend: VelocityTrend;
  violation: GateViolation;
  
  // Status
  status: "pending" | "approved" | "rejected";
  requestedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
}

/**
 * Gate enforcement result
 */
export interface GateEnforcementResult {
  agentId: string;
  allowed: boolean;
  reason: string;
  
  // Violation details (if any)
  violation?: GateViolation;
  
  // Approval request (if needed)
  approvalRequest?: ApprovalRequest;
  
  // Recommendations
  recommendations: string[];
  
  // Timestamp
  enforcedAt: Date;
}

/**
 * Check if agent is within capability gates
 * 
 * Verifies that the agent's growth rate does not exceed the maximum allowed
 */
export function checkCapabilityGates(
  velocity: VelocityMeasurement,
  trend: VelocityTrend,
  config: CapabilityGateConfig = DEFAULT_GATE_CONFIG
): GateEnforcementResult {
  const now = new Date();
  const recommendations: string[] = [];
  
  // Check if growth rate exceeds maximum
  const currentGrowthRate = velocity.capabilityGainPerDay;
  const maxAllowedGrowthRate = config.maxGrowthPerDay;
  const excessGrowth = currentGrowthRate - maxAllowedGrowthRate;
  
  // If within limits, allow
  if (currentGrowthRate <= maxAllowedGrowthRate) {
    return {
      agentId: velocity.agentId,
      allowed: true,
      reason: `Agent growth rate (${currentGrowthRate.toFixed(2)}% per day) is within capability gates (max ${maxAllowedGrowthRate}% per day).`,
      recommendations: [
        "Continue monitoring growth rate",
        "Maintain current improvement strategy",
      ],
      enforcedAt: now,
    };
  }
  
  // Growth rate exceeds maximum - create violation
  const severity: GateViolationSeverity = 
    excessGrowth > maxAllowedGrowthRate * 0.5 ? "critical" :
    excessGrowth > maxAllowedGrowthRate * 0.2 ? "blocked" :
    "warning";
  
  const violation: GateViolation = {
    agentId: velocity.agentId,
    violationType: "growth_exceeded",
    severity,
    currentGrowthRate,
    maxAllowedGrowthRate,
    excessGrowth,
    velocity,
    trend,
    actionTaken: config.enforceGates ? "blocked" : "flagged",
    requiresApproval: config.requireHumanApproval,
    approvalStatus: config.requireHumanApproval ? "pending" : undefined,
    detectedAt: now,
  };
  
  // Generate recommendations
  recommendations.push(
    `Reduce improvement rate by ${excessGrowth.toFixed(2)}% per day`,
    `Current rate: ${currentGrowthRate.toFixed(2)}% per day`,
    `Maximum allowed: ${maxAllowedGrowthRate}% per day`,
  );
  
  if (trend.isAccelerating) {
    recommendations.push(
      "Agent is accelerating - consider implementing rate limiting",
      "Review recent improvements for optimization opportunities",
    );
  }
  
  // If gates are not enforced, just flag the violation
  if (!config.enforceGates) {
    return {
      agentId: velocity.agentId,
      allowed: true,
      reason: `Agent growth rate exceeds limits but enforcement is disabled. Growth rate: ${currentGrowthRate.toFixed(2)}% per day (max: ${maxAllowedGrowthRate}% per day).`,
      violation,
      recommendations,
      enforcedAt: now,
    };
  }
  
  // Gates are enforced - block the improvement
  return {
    agentId: velocity.agentId,
    allowed: false,
    reason: `Agent growth rate (${currentGrowthRate.toFixed(2)}% per day) exceeds capability gate limit (${maxAllowedGrowthRate}% per day). Improvement blocked.`,
    violation,
    recommendations,
    enforcedAt: now,
  };
}

/**
 * Block improvement if it exceeds capability gates
 * 
 * Prevents the improvement from being applied if it would cause gate violation
 */
export function blockImprovementIfExceedsGate(
  agentId: string,
  proposedImprovement: {
    performanceGain: number;
    costReduction: number;
    reliabilityGain: number;
  },
  currentVelocity: VelocityMeasurement,
  config: CapabilityGateConfig = DEFAULT_GATE_CONFIG
): {
  allowed: boolean;
  reason: string;
  projectedGrowthRate: number;
} {
  // Calculate projected growth rate if improvement is applied
  const improvementCapabilityGain =
    proposedImprovement.performanceGain * 0.4 +
    proposedImprovement.costReduction * 0.3 +
    proposedImprovement.reliabilityGain * 0.3;
  
  const projectedGrowthRate =
    currentVelocity.capabilityGainPerDay + improvementCapabilityGain;
  
  // Check if projected rate exceeds gate
  if (projectedGrowthRate <= config.maxGrowthPerDay) {
    return {
      allowed: true,
      reason: `Improvement allowed. Projected growth rate: ${projectedGrowthRate.toFixed(2)}% per day (within limit of ${config.maxGrowthPerDay}% per day).`,
      projectedGrowthRate,
    };
  }
  
  // Improvement would exceed gate
  if (!config.enforceGates) {
    return {
      allowed: true,
      reason: `Improvement would exceed gate (${projectedGrowthRate.toFixed(2)}% per day) but enforcement is disabled.`,
      projectedGrowthRate,
    };
  }
  
  return {
    allowed: false,
    reason: `Improvement blocked. Projected growth rate (${projectedGrowthRate.toFixed(2)}% per day) would exceed capability gate limit (${config.maxGrowthPerDay}% per day).`,
    projectedGrowthRate,
  };
}

/**
 * Create approval request for gate crossing
 * 
 * Generates a request for human approval to exceed capability gates
 */
export function createApprovalRequest(
  agentId: string,
  velocity: VelocityMeasurement,
  trend: VelocityTrend,
  violation: GateViolation,
  justification: string
): ApprovalRequest {
  return {
    id: `approval_${agentId}_${Date.now()}`,
    agentId,
    requestType: "gate_crossing",
    currentGrowthRate: velocity.capabilityGainPerDay,
    requestedGrowthRate: velocity.capabilityGainPerDay,
    justification,
    velocity,
    trend,
    violation,
    status: "pending",
    requestedAt: new Date(),
  };
}

/**
 * Approve gate crossing request
 * 
 * Allows the agent to exceed capability gates with human approval
 */
export function approveGateCrossing(
  request: ApprovalRequest,
  approvedBy: string,
  reviewNotes?: string
): ApprovalRequest {
  return {
    ...request,
    status: "approved",
    reviewedAt: new Date(),
    reviewedBy: approvedBy,
    reviewNotes,
  };
}

/**
 * Reject gate crossing request
 * 
 * Denies the agent permission to exceed capability gates
 */
export function rejectGateCrossing(
  request: ApprovalRequest,
  rejectedBy: string,
  reviewNotes?: string
): ApprovalRequest {
  return {
    ...request,
    status: "rejected",
    reviewedAt: new Date(),
    reviewedBy: rejectedBy,
    reviewNotes,
  };
}

/**
 * Enforce capability gates for an agent
 * 
 * Main function that checks gates, blocks improvements if needed, and creates approval requests
 */
export async function enforceCapabilityGates(
  db: OrdoDatabase,
  agentId: string,
  config: CapabilityGateConfig = DEFAULT_GATE_CONFIG
): Promise<GateEnforcementResult> {
  // Track current velocity
  const { velocity, trend } = await trackImprovementVelocity(
    db,
    agentId,
    DEFAULT_VELOCITY_CONFIG
  );
  
  // Check capability gates
  const result = checkCapabilityGates(velocity, trend, config);
  
  // If blocked and requires approval, create approval request
  if (!result.allowed && config.requireHumanApproval && result.violation) {
    const approvalRequest = createApprovalRequest(
      agentId,
      velocity,
      trend,
      result.violation,
      `Agent ${agentId} requires approval to exceed capability gate. Current growth rate: ${velocity.capabilityGainPerDay.toFixed(2)}% per day.`
    );
    
    result.approvalRequest = approvalRequest;
    
    // Save approval request to database
    await db.saveImpactMetrics({
      type: "approval_request",
      request: approvalRequest,
      timestamp: new Date(),
    });
  }
  
  // Save violation to database if present
  if (result.violation) {
    await db.saveImpactMetrics({
      type: "gate_violation",
      violation: result.violation,
      timestamp: new Date(),
    });
  }
  
  // Log enforcement result
  await handleGateEnforcement(db, result, config);
  
  return result;
}

/**
 * Handle gate enforcement result
 * 
 * Logs, alerts, and takes action based on enforcement result
 */
async function handleGateEnforcement(
  db: OrdoDatabase,
  result: GateEnforcementResult,
  config: CapabilityGateConfig
): Promise<void> {
  // Log to console if enabled
  if (config.alertChannels.includes("console")) {
    const statusIcon = result.allowed ? "✅" : "🚫";
    console.log(`${statusIcon} Capability Gate Enforcement: ${result.reason}`);
    
    if (result.violation) {
      const severityIcon = {
        warning: "⚠️",
        blocked: "🛑",
        critical: "🚨",
      }[result.violation.severity];
      
      console.log(`${severityIcon} Violation detected:`);
      console.log(`  Agent: ${result.agentId}`);
      console.log(`  Current growth: ${result.violation.currentGrowthRate.toFixed(2)}% per day`);
      console.log(`  Maximum allowed: ${result.violation.maxAllowedGrowthRate}% per day`);
      console.log(`  Excess: ${result.violation.excessGrowth.toFixed(2)}% per day`);
    }
    
    if (result.recommendations.length > 0) {
      console.log("Recommendations:");
      result.recommendations.forEach((rec) => console.log(`  - ${rec}`));
    }
    
    if (result.approvalRequest) {
      console.log(`📋 Approval request created: ${result.approvalRequest.id}`);
      console.log(`   Status: ${result.approvalRequest.status}`);
    }
  }
  
  // Save to database if enabled
  if (config.alertChannels.includes("database")) {
    await db.saveImpactMetrics({
      type: "gate_enforcement",
      result,
      timestamp: result.enforcedAt,
    });
  }
}

/**
 * Get pending approval requests for an agent
 * 
 * Returns all approval requests that are awaiting human review
 */
export async function getPendingApprovals(
  db: OrdoDatabase,
  agentId?: string
): Promise<ApprovalRequest[]> {
  // This would query the database for pending approval requests
  // For now, return empty array as placeholder
  // Implementation would depend on database schema
  return [];
}

/**
 * Calculate safe improvement limit
 * 
 * Determines the maximum improvement that can be applied without exceeding gates
 */
export function calculateSafeImprovementLimit(
  currentVelocity: VelocityMeasurement,
  config: CapabilityGateConfig = DEFAULT_GATE_CONFIG
): {
  maxPerformanceGain: number;
  maxCostReduction: number;
  maxReliabilityGain: number;
  totalCapabilityBudget: number;
} {
  // Calculate remaining capability budget
  const remainingBudget = Math.max(
    0,
    config.maxGrowthPerDay - currentVelocity.capabilityGainPerDay
  );
  
  // Distribute budget across improvement types using same weights as capability calculation
  // Performance: 40%, Cost: 30%, Reliability: 30%
  const maxPerformanceGain = remainingBudget / 0.4;
  const maxCostReduction = remainingBudget / 0.3;
  const maxReliabilityGain = remainingBudget / 0.3;
  
  return {
    maxPerformanceGain,
    maxCostReduction,
    maxReliabilityGain,
    totalCapabilityBudget: remainingBudget,
  };
}

/**
 * Generate capability gate report
 * 
 * Creates a human-readable summary of gate status and enforcement
 */
export function generateGateReport(result: GateEnforcementResult): string {
  const lines: string[] = [];
  
  lines.push(`Capability Gate Report for Agent ${result.agentId}`);
  lines.push(`${"=".repeat(60)}`);
  lines.push("");
  
  lines.push(`Status: ${result.allowed ? "✅ ALLOWED" : "🚫 BLOCKED"}`);
  lines.push(`Reason: ${result.reason}`);
  lines.push("");
  
  if (result.violation) {
    const v = result.violation;
    lines.push(`Violation Details:`);
    lines.push(`  Type: ${v.violationType}`);
    lines.push(`  Severity: ${v.severity.toUpperCase()}`);
    lines.push(`  Current Growth: ${v.currentGrowthRate.toFixed(2)}% per day`);
    lines.push(`  Maximum Allowed: ${v.maxAllowedGrowthRate}% per day`);
    lines.push(`  Excess: ${v.excessGrowth.toFixed(2)}% per day`);
    lines.push(`  Action Taken: ${v.actionTaken.toUpperCase()}`);
    
    if (v.requiresApproval) {
      lines.push(`  Requires Approval: YES`);
      lines.push(`  Approval Status: ${v.approvalStatus?.toUpperCase() || "N/A"}`);
    }
    lines.push("");
  }
  
  if (result.approvalRequest) {
    const req = result.approvalRequest;
    lines.push(`Approval Request:`);
    lines.push(`  ID: ${req.id}`);
    lines.push(`  Type: ${req.requestType}`);
    lines.push(`  Status: ${req.status.toUpperCase()}`);
    lines.push(`  Requested: ${req.requestedAt.toISOString()}`);
    
    if (req.reviewedAt) {
      lines.push(`  Reviewed: ${req.reviewedAt.toISOString()}`);
      lines.push(`  Reviewed By: ${req.reviewedBy || "N/A"}`);
    }
    lines.push("");
  }
  
  if (result.recommendations.length > 0) {
    lines.push(`Recommendations:`);
    result.recommendations.forEach((rec) => lines.push(`  • ${rec}`));
    lines.push("");
  }
  
  lines.push(`Enforced At: ${result.enforcedAt.toISOString()}`);
  
  return lines.join("\n");
}
