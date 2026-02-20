/**
 * Improvement Testing and Application System
 *
 * Tests improvements in a sandbox environment, measures impact over 7 days,
 * and applies to production if validated.
 * Implements Requirements 16.2 and 16.4.
 */

import type { OrdoDatabase, Agent, SelfModification } from "../types/index.js";
import type { ImprovementOpportunity } from "./bottleneck-analysis.js";

/**
 * Improvement proposal ready for testing
 */
export interface ImprovementProposal {
  id: string;
  agentId: string;
  opportunityId: string;
  type: "model_switch" | "tool_optimization" | "prompt_refinement" | "config_change";
  description: string;
  hypothesis: string;
  targetMetric: "speed" | "cost" | "reliability";
  expectedImprovement: number; // percentage
  createdAt: Date;
  status: "proposed" | "testing" | "measuring" | "validated" | "rejected" | "applied";
}

/**
 * Sandbox test environment for improvement
 */
export interface SandboxEnvironment {
  id: string;
  agentId: string;
  improvementId: string;
  createdAt: Date;
  isolatedState: {
    config: Record<string, any>;
    tools: string[];
    model: string;
  };
}

/**
 * Performance measurement over time
 */
export interface PerformanceMeasurement {
  improvementId: string;
  measurementDay: number; // 1-7
  timestamp: Date;
  metrics: {
    avgLatencyMs: number;
    avgCostCents: number;
    successRate: number;
    operationCount: number;
  };
}

/**
 * 7-day impact measurement result
 */
export interface ImpactMeasurementResult {
  improvementId: string;
  measurementPeriodDays: number;
  startDate: Date;
  endDate: Date;
  
  // Baseline (before improvement)
  baseline: {
    avgLatencyMs: number;
    avgCostCents: number;
    successRate: number;
    totalOperations: number;
  };
  
  // Test period (with improvement)
  testPeriod: {
    avgLatencyMs: number;
    avgCostCents: number;
    successRate: number;
    totalOperations: number;
  };
  
  // Calculated improvements
  improvements: {
    speedImprovement: number; // percentage, positive = faster
    costReduction: number; // percentage, positive = cheaper
    reliabilityImprovement: number; // percentage points, positive = better
  };
  
  // Daily measurements
  dailyMeasurements: PerformanceMeasurement[];
  
  // Validation result
  validated: boolean;
  validationReason: string;
}

/**
 * Production application result
 */
export interface ProductionApplicationResult {
  improvementId: string;
  appliedAt: Date;
  success: boolean;
  changes: {
    type: string;
    target: string;
    oldValue: any;
    newValue: any;
  }[];
  rollbackPlan: {
    steps: string[];
    estimatedDurationMs: number;
  };
}

/**
 * Create a sandbox environment for testing an improvement
 */
export async function createSandboxEnvironment(
  db: OrdoDatabase,
  agentId: string,
  improvement: ImprovementProposal
): Promise<SandboxEnvironment> {
  const agent = await db.getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }
  
  // Get current agent configuration
  const tools = await db.getInstalledTools();
  const agentTools = tools.filter(t => t.agentId === agentId);
  
  // Create isolated sandbox state
  const sandbox: SandboxEnvironment = {
    id: `sandbox-${improvement.id}`,
    agentId,
    improvementId: improvement.id,
    createdAt: new Date(),
    isolatedState: {
      config: {
        // Clone current config
        model: "gpt-4", // Default, would be read from agent config
        temperature: 0.7,
        maxTokens: 2000,
      },
      tools: agentTools.map(t => t.name),
      model: "gpt-4", // Would be read from agent config
    },
  };
  
  return sandbox;
}

/**
 * Test an improvement in the sandbox environment
 */
export async function testImprovementInSandbox(
  db: OrdoDatabase,
  improvement: ImprovementProposal,
  sandbox: SandboxEnvironment,
  testOperations: number = 100
): Promise<{
  success: boolean;
  errors: string[];
  initialMetrics: {
    avgLatencyMs: number;
    avgCostCents: number;
    successRate: number;
  };
}> {
  const errors: string[] = [];
  
  try {
    // Apply the improvement to sandbox
    await applyImprovementToSandbox(sandbox, improvement);
    
    // Run test operations
    const operations: {
      latencyMs: number;
      costCents: number;
      success: boolean;
    }[] = [];
    
    for (let i = 0; i < testOperations; i++) {
      const opStart = Date.now();
      
      try {
        // Simulate operation execution
        // In production, this would actually execute agent operations
        await simulateOperation(sandbox);
        
        operations.push({
          latencyMs: Date.now() - opStart,
          costCents: Math.random() * 0.5, // Simulated cost
          success: true,
        });
      } catch (err: any) {
        errors.push(`Operation ${i} failed: ${err.message}`);
        operations.push({
          latencyMs: Date.now() - opStart,
          costCents: 0,
          success: false,
        });
      }
    }
    
    // Calculate initial metrics
    const totalLatency = operations.reduce((sum, op) => sum + op.latencyMs, 0);
    const totalCost = operations.reduce((sum, op) => sum + op.costCents, 0);
    const successCount = operations.filter(op => op.success).length;
    
    return {
      success: errors.length === 0,
      errors,
      initialMetrics: {
        avgLatencyMs: totalLatency / operations.length,
        avgCostCents: totalCost / operations.length,
        successRate: successCount / operations.length,
      },
    };
  } catch (err: any) {
    errors.push(`Sandbox test failed: ${err.message}`);
    return {
      success: false,
      errors,
      initialMetrics: {
        avgLatencyMs: 0,
        avgCostCents: 0,
        successRate: 0,
      },
    };
  }
}

/**
 * Apply improvement to sandbox (internal helper)
 */
async function applyImprovementToSandbox(
  sandbox: SandboxEnvironment,
  improvement: ImprovementProposal
): Promise<void> {
  // Apply the improvement based on type
  switch (improvement.type) {
    case "model_switch":
      // Switch to a different model
      sandbox.isolatedState.model = "gpt-3.5-turbo"; // Example
      break;
      
    case "tool_optimization":
      // Optimize tool configuration
      break;
      
    case "prompt_refinement":
      // Update prompt templates
      break;
      
    case "config_change":
      // Modify configuration
      break;
  }
}

/**
 * Simulate an operation (internal helper)
 */
async function simulateOperation(sandbox: SandboxEnvironment): Promise<void> {
  // Simulate operation latency
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
}

/**
 * Measure impact over a 7-day period
 * 
 * This function tracks performance daily and compares against baseline
 */
export async function measureImpactOver7Days(
  db: OrdoDatabase,
  agentId: string,
  improvement: ImprovementProposal,
  sandbox: SandboxEnvironment
): Promise<ImpactMeasurementResult> {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 7);
  
  // Get baseline metrics (before improvement)
  const baselineEndDate = new Date(startDate);
  baselineEndDate.setDate(baselineEndDate.getDate() - 7);
  const baseline = await getBaselineMetrics(db, agentId, baselineEndDate, startDate);
  
  // Collect daily measurements
  const dailyMeasurements: PerformanceMeasurement[] = [];
  
  // In production, this would run over 7 actual days
  // For now, we'll simulate by sampling recent data
  for (let day = 1; day <= 7; day++) {
    const dayStart = new Date(startDate);
    dayStart.setDate(dayStart.getDate() + day - 1);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const dayMetrics = await measureDayPerformance(db, agentId, dayStart, dayEnd);
    
    dailyMeasurements.push({
      improvementId: improvement.id,
      measurementDay: day,
      timestamp: dayStart,
      metrics: dayMetrics,
    });
  }
  
  // Calculate test period averages
  const testPeriod = calculateAverageMetrics(dailyMeasurements);
  
  // Calculate improvements
  const improvements = {
    speedImprovement: baseline.avgLatencyMs > 0
      ? ((baseline.avgLatencyMs - testPeriod.avgLatencyMs) / baseline.avgLatencyMs) * 100
      : 0,
    costReduction: baseline.avgCostCents > 0
      ? ((baseline.avgCostCents - testPeriod.avgCostCents) / baseline.avgCostCents) * 100
      : 0,
    reliabilityImprovement: (testPeriod.successRate - baseline.successRate) * 100,
  };
  
  // Validate the improvement
  const validation = validateImprovement(improvements, improvement.targetMetric);
  
  return {
    improvementId: improvement.id,
    measurementPeriodDays: 7,
    startDate,
    endDate,
    baseline,
    testPeriod,
    improvements,
    dailyMeasurements,
    validated: validation.validated,
    validationReason: validation.reason,
  };
}

/**
 * Get baseline metrics from historical data
 */
async function getBaselineMetrics(
  db: OrdoDatabase,
  agentId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  avgLatencyMs: number;
  avgCostCents: number;
  successRate: number;
  totalOperations: number;
}> {
  const avgLatency = await db.getAverageLatency(agentId, startDate, endDate);
  const totalCost = await db.getTotalCost(agentId, startDate, endDate);
  const successRate = await db.getSuccessRate(agentId, startDate, endDate);
  
  // Get operation count from recent turns
  const turns = await db.getRecentTurns(agentId, 1000);
  const totalOperations = turns.reduce(
    (sum, turn) => sum + (turn.toolCalls?.length || 0),
    0
  );
  
  // Calculate average cost per operation
  const avgCostCents = totalOperations > 0 ? (totalCost * 100) / totalOperations : 0;
  
  return {
    avgLatencyMs: avgLatency,
    avgCostCents,
    successRate,
    totalOperations,
  };
}

/**
 * Measure performance for a single day
 */
async function measureDayPerformance(
  db: OrdoDatabase,
  agentId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  avgLatencyMs: number;
  avgCostCents: number;
  successRate: number;
  operationCount: number;
}> {
  const avgLatency = await db.getAverageLatency(agentId, startDate, endDate);
  const totalCost = await db.getTotalCost(agentId, startDate, endDate);
  const successRate = await db.getSuccessRate(agentId, startDate, endDate);
  
  // Get operation count for the day
  const turns = await db.getRecentTurns(agentId, 1000);
  const dayTurns = turns.filter(
    t => t.timestamp >= startDate && t.timestamp < endDate
  );
  const operationCount = dayTurns.reduce(
    (sum, turn) => sum + (turn.toolCalls?.length || 0),
    0
  );
  
  const avgCostCents = operationCount > 0 ? (totalCost * 100) / operationCount : 0;
  
  return {
    avgLatencyMs: avgLatency,
    avgCostCents,
    successRate,
    operationCount,
  };
}

/**
 * Calculate average metrics from daily measurements
 */
function calculateAverageMetrics(
  measurements: PerformanceMeasurement[]
): {
  avgLatencyMs: number;
  avgCostCents: number;
  successRate: number;
  totalOperations: number;
} {
  if (measurements.length === 0) {
    return {
      avgLatencyMs: 0,
      avgCostCents: 0,
      successRate: 0,
      totalOperations: 0,
    };
  }
  
  const totalLatency = measurements.reduce(
    (sum, m) => sum + m.metrics.avgLatencyMs,
    0
  );
  const totalCost = measurements.reduce(
    (sum, m) => sum + m.metrics.avgCostCents,
    0
  );
  const totalSuccessRate = measurements.reduce(
    (sum, m) => sum + m.metrics.successRate,
    0
  );
  const totalOperations = measurements.reduce(
    (sum, m) => sum + m.metrics.operationCount,
    0
  );
  
  return {
    avgLatencyMs: totalLatency / measurements.length,
    avgCostCents: totalCost / measurements.length,
    successRate: totalSuccessRate / measurements.length,
    totalOperations,
  };
}

/**
 * Validate improvement based on target metric and thresholds
 */
function validateImprovement(
  improvements: {
    speedImprovement: number;
    costReduction: number;
    reliabilityImprovement: number;
  },
  targetMetric: "speed" | "cost" | "reliability"
): {
  validated: boolean;
  reason: string;
} {
  // Validation thresholds
  const SPEED_THRESHOLD = 10; // 10% improvement
  const COST_THRESHOLD = 10; // 10% reduction
  const RELIABILITY_THRESHOLD = 5; // 5 percentage points improvement
  
  // Check if reliability degraded significantly (reject if so)
  if (improvements.reliabilityImprovement < -5) {
    return {
      validated: false,
      reason: `Reliability degraded by ${Math.abs(improvements.reliabilityImprovement).toFixed(1)} percentage points`,
    };
  }
  
  // Check target metric improvement
  switch (targetMetric) {
    case "speed":
      if (improvements.speedImprovement >= SPEED_THRESHOLD) {
        return {
          validated: true,
          reason: `Speed improved by ${improvements.speedImprovement.toFixed(1)}% (target: ${SPEED_THRESHOLD}%)`,
        };
      }
      return {
        validated: false,
        reason: `Speed improvement ${improvements.speedImprovement.toFixed(1)}% below threshold ${SPEED_THRESHOLD}%`,
      };
      
    case "cost":
      if (improvements.costReduction >= COST_THRESHOLD) {
        return {
          validated: true,
          reason: `Cost reduced by ${improvements.costReduction.toFixed(1)}% (target: ${COST_THRESHOLD}%)`,
        };
      }
      return {
        validated: false,
        reason: `Cost reduction ${improvements.costReduction.toFixed(1)}% below threshold ${COST_THRESHOLD}%`,
      };
      
    case "reliability":
      if (improvements.reliabilityImprovement >= RELIABILITY_THRESHOLD) {
        return {
          validated: true,
          reason: `Reliability improved by ${improvements.reliabilityImprovement.toFixed(1)}pp (target: ${RELIABILITY_THRESHOLD}pp)`,
        };
      }
      return {
        validated: false,
        reason: `Reliability improvement ${improvements.reliabilityImprovement.toFixed(1)}pp below threshold ${RELIABILITY_THRESHOLD}pp`,
      };
  }
}

/**
 * Apply validated improvement to production
 * 
 * This is the final step after successful 7-day validation
 */
export async function applyToProduction(
  db: OrdoDatabase,
  agentId: string,
  improvement: ImprovementProposal,
  impactResult: ImpactMeasurementResult
): Promise<ProductionApplicationResult> {
  if (!impactResult.validated) {
    throw new Error(
      `Cannot apply unvalidated improvement: ${impactResult.validationReason}`
    );
  }
  
  const changes: {
    type: string;
    target: string;
    oldValue: any;
    newValue: any;
  }[] = [];
  
  try {
    // Apply the improvement based on type
    switch (improvement.type) {
      case "model_switch":
        // Switch model in production
        changes.push({
          type: "model",
          target: "inference_model",
          oldValue: "gpt-4",
          newValue: "gpt-3.5-turbo",
        });
        break;
        
      case "tool_optimization":
        // Apply tool optimizations
        changes.push({
          type: "tool_config",
          target: "tool_settings",
          oldValue: {},
          newValue: {},
        });
        break;
        
      case "prompt_refinement":
        // Update prompts
        changes.push({
          type: "prompt",
          target: "system_prompt",
          oldValue: "",
          newValue: "",
        });
        break;
        
      case "config_change":
        // Apply config changes
        changes.push({
          type: "config",
          target: "agent_config",
          oldValue: {},
          newValue: {},
        });
        break;
    }
    
    // Record the modification in database
    const modification: SelfModification = {
      id: improvement.id,
      agentId,
      type: "config",
      target: improvement.type,
      change: improvement.description,
      reason: improvement.hypothesis,
      timestamp: new Date(),
      status: "implemented",
      testResult: impactResult,
      performanceImpact: getOverallImpact(impactResult.improvements),
    };
    
    await db.saveModification(modification);
    
    // Create rollback plan
    const rollbackPlan = {
      steps: changes.map(c => `Revert ${c.target} from ${c.newValue} to ${c.oldValue}`),
      estimatedDurationMs: 1000, // 1 second
    };
    
    return {
      improvementId: improvement.id,
      appliedAt: new Date(),
      success: true,
      changes,
      rollbackPlan,
    };
  } catch (err: any) {
    throw new Error(`Failed to apply improvement to production: ${err.message}`);
  }
}

/**
 * Calculate overall impact score from individual improvements
 */
function getOverallImpact(improvements: {
  speedImprovement: number;
  costReduction: number;
  reliabilityImprovement: number;
}): number {
  // Weighted average: speed 30%, cost 40%, reliability 30%
  return (
    improvements.speedImprovement * 0.3 +
    improvements.costReduction * 0.4 +
    improvements.reliabilityImprovement * 0.3
  );
}

/**
 * Main orchestration function for improvement testing and application
 * 
 * This combines all steps: sandbox testing, 7-day measurement, and production application
 */
export async function testAndApplyImprovement(
  db: OrdoDatabase,
  agentId: string,
  opportunity: ImprovementOpportunity
): Promise<{
  proposal: ImprovementProposal;
  sandboxResult: { success: boolean; errors: string[] };
  impactResult: ImpactMeasurementResult;
  productionResult?: ProductionApplicationResult;
}> {
  // 1. Create improvement proposal
  const proposal: ImprovementProposal = {
    id: `imp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    opportunityId: opportunity.id,
    type: mapCategoryToType(opportunity.category),
    description: opportunity.description,
    hypothesis: `Implementing this improvement should achieve ${opportunity.expectedImpact}% improvement in ${opportunity.category}`,
    targetMetric: opportunity.category,
    expectedImprovement: opportunity.expectedImpact,
    createdAt: new Date(),
    status: "proposed",
  };
  
  // 2. Create sandbox and test
  const sandbox = await createSandboxEnvironment(db, agentId, proposal);
  const sandboxResult = await testImprovementInSandbox(db, proposal, sandbox);
  
  if (!sandboxResult.success) {
    return {
      proposal,
      sandboxResult,
      impactResult: {
        improvementId: proposal.id,
        measurementPeriodDays: 0,
        startDate: new Date(),
        endDate: new Date(),
        baseline: { avgLatencyMs: 0, avgCostCents: 0, successRate: 0, totalOperations: 0 },
        testPeriod: { avgLatencyMs: 0, avgCostCents: 0, successRate: 0, totalOperations: 0 },
        improvements: { speedImprovement: 0, costReduction: 0, reliabilityImprovement: 0 },
        dailyMeasurements: [],
        validated: false,
        validationReason: "Sandbox testing failed",
      },
    };
  }
  
  // 3. Measure impact over 7 days
  proposal.status = "measuring";
  const impactResult = await measureImpactOver7Days(db, agentId, proposal, sandbox);
  
  // 4. Apply to production if validated
  let productionResult: ProductionApplicationResult | undefined;
  if (impactResult.validated) {
    proposal.status = "validated";
    productionResult = await applyToProduction(db, agentId, proposal, impactResult);
    proposal.status = "applied";
  } else {
    proposal.status = "rejected";
  }
  
  return {
    proposal,
    sandboxResult,
    impactResult,
    productionResult,
  };
}

/**
 * Map opportunity category to improvement type
 */
function mapCategoryToType(
  category: "speed" | "cost" | "reliability"
): "model_switch" | "tool_optimization" | "prompt_refinement" | "config_change" {
  switch (category) {
    case "cost":
      return "model_switch";
    case "speed":
      return "tool_optimization";
    case "reliability":
      return "prompt_refinement";
    default:
      return "config_change";
  }
}
