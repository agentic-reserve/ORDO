/**
 * Impact Measurement System
 *
 * Tracks performance gain percentage, cost reduction percentage,
 * success rate increase, and calculates ROI of improvements.
 * Implements Requirements 16.3.
 */

import type { OrdoDatabase, Agent, SelfModification } from "../types/index.js";
import type { ImpactMeasurementResult } from "./improvement-testing.js";

/**
 * Impact metrics for an improvement
 */
export interface ImpactMetrics {
  improvementId: string;
  agentId: string;
  measurementPeriodDays: number;
  
  // Performance metrics
  performanceGainPercent: number; // Positive = faster
  costReductionPercent: number; // Positive = cheaper
  successRateIncrease: number; // Percentage points increase
  
  // Baseline vs improved
  baseline: {
    avgLatencyMs: number;
    avgCostCents: number;
    successRate: number;
    totalOperations: number;
  };
  
  improved: {
    avgLatencyMs: number;
    avgCostCents: number;
    successRate: number;
    totalOperations: number;
  };
  
  // ROI calculation
  roi: ROICalculation;
  
  // Measurement metadata
  measuredAt: Date;
  validationStatus: "validated" | "rejected" | "pending";
}

/**
 * Return on Investment calculation
 */
export interface ROICalculation {
  // Costs
  implementationCostCents: number; // Cost to implement the improvement
  testingCostCents: number; // Cost to test over 7 days
  totalCostCents: number;
  
  // Benefits (projected over 30 days)
  projectedSavingsCents: number; // Cost savings from improvement
  projectedTimeGainMs: number; // Time savings from improvement
  projectedReliabilityGain: number; // Success rate improvement
  
  // ROI metrics
  roiPercent: number; // (benefit - cost) / cost * 100
  paybackPeriodDays: number; // Days to recover implementation cost
  netBenefitCents: number; // Total benefit - total cost
  
  // Value scoring
  overallValueScore: number; // 0-100 composite score
}

/**
 * Historical impact tracking for an agent
 */
export interface ImpactHistory {
  agentId: string;
  improvements: ImpactMetrics[];
  
  // Aggregate metrics
  totalImprovements: number;
  successfulImprovements: number;
  successRate: number;
  
  // Cumulative impact
  cumulativePerformanceGain: number;
  cumulativeCostReduction: number;
  cumulativeReliabilityGain: number;
  cumulativeROI: number;
  
  // Trends
  improvementVelocity: number; // Improvements per week
  avgROI: number;
  avgPaybackPeriodDays: number;
}

/**
 * Track performance gain percentage
 * 
 * Calculates the percentage improvement in performance (speed)
 * Positive values indicate faster performance
 */
export function trackPerformanceGain(
  baselineLatencyMs: number,
  improvedLatencyMs: number
): number {
  if (baselineLatencyMs === 0) return 0;
  
  // Performance gain = (baseline - improved) / baseline * 100
  // Positive = faster (latency decreased)
  const gain = ((baselineLatencyMs - improvedLatencyMs) / baselineLatencyMs) * 100;
  
  return Math.round(gain * 100) / 100; // Round to 2 decimal places
}

/**
 * Track cost reduction percentage
 * 
 * Calculates the percentage reduction in costs
 * Positive values indicate cost savings
 */
export function trackCostReduction(
  baselineCostCents: number,
  improvedCostCents: number
): number {
  if (baselineCostCents === 0) return 0;
  
  // Cost reduction = (baseline - improved) / baseline * 100
  // Positive = cheaper (cost decreased)
  const reduction = ((baselineCostCents - improvedCostCents) / baselineCostCents) * 100;
  
  return Math.round(reduction * 100) / 100; // Round to 2 decimal places
}

/**
 * Track success rate increase
 * 
 * Calculates the percentage point increase in success rate
 * Positive values indicate improved reliability
 */
export function trackSuccessRateIncrease(
  baselineSuccessRate: number,
  improvedSuccessRate: number
): number {
  // Success rate increase in percentage points
  // e.g., 0.85 to 0.90 = 5 percentage points increase
  const increase = (improvedSuccessRate - baselineSuccessRate) * 100;
  
  return Math.round(increase * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate ROI of an improvement
 * 
 * Considers implementation costs, testing costs, and projected benefits
 */
export function calculateROI(
  baseline: {
    avgLatencyMs: number;
    avgCostCents: number;
    successRate: number;
    totalOperations: number;
  },
  improved: {
    avgLatencyMs: number;
    avgCostCents: number;
    successRate: number;
    totalOperations: number;
  },
  implementationCostCents: number = 10, // Default: ~$0.10 for testing
  projectionDays: number = 30
): ROICalculation {
  // Calculate testing cost (7 days of operations)
  const testingCostCents = improved.avgCostCents * improved.totalOperations;
  const totalCostCents = implementationCostCents + testingCostCents;
  
  // Project savings over 30 days
  const costSavingsPerOperation = baseline.avgCostCents - improved.avgCostCents;
  const avgOperationsPerDay = improved.totalOperations / 7; // 7-day measurement period
  const projectedOperations = avgOperationsPerDay * projectionDays;
  const projectedSavingsCents = costSavingsPerOperation * projectedOperations;
  
  // Project time gains
  const timeSavingsPerOperation = baseline.avgLatencyMs - improved.avgLatencyMs;
  const projectedTimeGainMs = timeSavingsPerOperation * projectedOperations;
  
  // Project reliability gains
  const projectedReliabilityGain = (improved.successRate - baseline.successRate) * 100;
  
  // Calculate ROI
  const roiPercent = totalCostCents > 0
    ? ((projectedSavingsCents - totalCostCents) / totalCostCents) * 100
    : 0;
  
  // Calculate payback period (days to recover implementation cost)
  const dailySavingsCents = projectedSavingsCents / projectionDays;
  const paybackPeriodDays = dailySavingsCents > 0
    ? totalCostCents / dailySavingsCents
    : Infinity;
  
  // Net benefit
  const netBenefitCents = projectedSavingsCents - totalCostCents;
  
  // Overall value score (0-100)
  const overallValueScore = calculateValueScore({
    roiPercent,
    paybackPeriodDays,
    projectedReliabilityGain,
    projectedTimeGainMs,
  });
  
  return {
    implementationCostCents,
    testingCostCents,
    totalCostCents,
    projectedSavingsCents,
    projectedTimeGainMs,
    projectedReliabilityGain,
    roiPercent: Math.round(roiPercent * 100) / 100,
    paybackPeriodDays: Math.round(paybackPeriodDays * 100) / 100,
    netBenefitCents: Math.round(netBenefitCents * 100) / 100,
    overallValueScore: Math.round(overallValueScore * 100) / 100,
  };
}

/**
 * Calculate overall value score (0-100) from multiple factors
 */
function calculateValueScore(factors: {
  roiPercent: number;
  paybackPeriodDays: number;
  projectedReliabilityGain: number;
  projectedTimeGainMs: number;
}): number {
  // ROI score (0-40 points)
  // 100% ROI = 20 points, 500% ROI = 40 points
  const roiScore = Math.min(40, Math.max(0, factors.roiPercent / 5));
  
  // Payback period score (0-20 points)
  // 1 day = 20 points, 30 days = 10 points, >60 days = 0 points
  const paybackScore = factors.paybackPeriodDays < Infinity
    ? Math.max(0, 20 - (factors.paybackPeriodDays / 3))
    : 0;
  
  // Reliability score (0-20 points)
  // 5pp improvement = 10 points, 10pp improvement = 20 points
  const reliabilityScore = Math.min(20, Math.max(0, factors.projectedReliabilityGain * 2));
  
  // Time savings score (0-20 points)
  // 10 seconds saved = 10 points, 30 seconds saved = 20 points
  const timeSavingsSeconds = factors.projectedTimeGainMs / 1000;
  const timeScore = Math.min(20, Math.max(0, timeSavingsSeconds / 1.5));
  
  return roiScore + paybackScore + reliabilityScore + timeScore;
}

/**
 * Measure impact of an improvement
 * 
 * Combines all impact metrics into a comprehensive measurement
 */
export function measureImpact(
  improvementId: string,
  agentId: string,
  impactResult: ImpactMeasurementResult,
  implementationCostCents: number = 10
): ImpactMetrics {
  const performanceGainPercent = trackPerformanceGain(
    impactResult.baseline.avgLatencyMs,
    impactResult.testPeriod.avgLatencyMs
  );
  
  const costReductionPercent = trackCostReduction(
    impactResult.baseline.avgCostCents,
    impactResult.testPeriod.avgCostCents
  );
  
  const successRateIncrease = trackSuccessRateIncrease(
    impactResult.baseline.successRate,
    impactResult.testPeriod.successRate
  );
  
  const roi = calculateROI(
    impactResult.baseline,
    impactResult.testPeriod,
    implementationCostCents
  );
  
  return {
    improvementId,
    agentId,
    measurementPeriodDays: impactResult.measurementPeriodDays,
    performanceGainPercent,
    costReductionPercent,
    successRateIncrease,
    baseline: impactResult.baseline,
    improved: impactResult.testPeriod,
    roi,
    measuredAt: new Date(),
    validationStatus: impactResult.validated ? "validated" : "rejected",
  };
}

/**
 * Get impact history for an agent
 * 
 * Retrieves all historical improvements and calculates aggregate metrics
 */
export async function getImpactHistory(
  db: OrdoDatabase,
  agentId: string
): Promise<ImpactHistory> {
  // Get all modifications for the agent
  const modifications = await db.getModifications(agentId);
  
  // Convert to impact metrics
  const improvements: ImpactMetrics[] = [];
  
  for (const mod of modifications) {
    if (mod.testResult && mod.status === "implemented") {
      const impact = measureImpact(
        mod.id,
        agentId,
        mod.testResult as ImpactMeasurementResult
      );
      improvements.push(impact);
    }
  }
  
  // Calculate aggregate metrics
  const totalImprovements = improvements.length;
  const successfulImprovements = improvements.filter(
    i => i.validationStatus === "validated"
  ).length;
  const successRate = totalImprovements > 0
    ? successfulImprovements / totalImprovements
    : 0;
  
  // Calculate cumulative impact
  const cumulativePerformanceGain = improvements.reduce(
    (sum, i) => sum + i.performanceGainPercent,
    0
  );
  const cumulativeCostReduction = improvements.reduce(
    (sum, i) => sum + i.costReductionPercent,
    0
  );
  const cumulativeReliabilityGain = improvements.reduce(
    (sum, i) => sum + i.successRateIncrease,
    0
  );
  const cumulativeROI = improvements.reduce(
    (sum, i) => sum + i.roi.roiPercent,
    0
  );
  
  // Calculate trends
  const avgROI = totalImprovements > 0 ? cumulativeROI / totalImprovements : 0;
  const avgPaybackPeriodDays = totalImprovements > 0
    ? improvements.reduce((sum, i) => sum + i.roi.paybackPeriodDays, 0) / totalImprovements
    : 0;
  
  // Calculate improvement velocity (improvements per week)
  const oldestImprovement = improvements.length > 0
    ? improvements.reduce((oldest, i) =>
        i.measuredAt < oldest.measuredAt ? i : oldest
      )
    : null;
  
  const daysSinceFirst = oldestImprovement
    ? (Date.now() - oldestImprovement.measuredAt.getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  
  const improvementVelocity = daysSinceFirst > 0
    ? (totalImprovements / daysSinceFirst) * 7 // Per week
    : 0;
  
  return {
    agentId,
    improvements,
    totalImprovements,
    successfulImprovements,
    successRate,
    cumulativePerformanceGain,
    cumulativeCostReduction,
    cumulativeReliabilityGain,
    cumulativeROI,
    improvementVelocity,
    avgROI,
    avgPaybackPeriodDays,
  };
}

/**
 * Compare impact across multiple improvements
 * 
 * Useful for identifying which types of improvements are most effective
 */
export function compareImpacts(
  impacts: ImpactMetrics[]
): {
  bestPerformanceGain: ImpactMetrics | null;
  bestCostReduction: ImpactMetrics | null;
  bestReliabilityGain: ImpactMetrics | null;
  bestROI: ImpactMetrics | null;
  bestOverallValue: ImpactMetrics | null;
} {
  if (impacts.length === 0) {
    return {
      bestPerformanceGain: null,
      bestCostReduction: null,
      bestReliabilityGain: null,
      bestROI: null,
      bestOverallValue: null,
    };
  }
  
  const bestPerformanceGain = impacts.reduce((best, current) =>
    current.performanceGainPercent > best.performanceGainPercent ? current : best
  );
  
  const bestCostReduction = impacts.reduce((best, current) =>
    current.costReductionPercent > best.costReductionPercent ? current : best
  );
  
  const bestReliabilityGain = impacts.reduce((best, current) =>
    current.successRateIncrease > best.successRateIncrease ? current : best
  );
  
  const bestROI = impacts.reduce((best, current) =>
    current.roi.roiPercent > best.roi.roiPercent ? current : best
  );
  
  const bestOverallValue = impacts.reduce((best, current) =>
    current.roi.overallValueScore > best.roi.overallValueScore ? current : best
  );
  
  return {
    bestPerformanceGain,
    bestCostReduction,
    bestReliabilityGain,
    bestROI,
    bestOverallValue,
  };
}

/**
 * Generate impact report for an agent
 * 
 * Creates a human-readable summary of improvement impacts
 */
export function generateImpactReport(history: ImpactHistory): string {
  const lines: string[] = [];
  
  lines.push(`Impact Report for Agent ${history.agentId}`);
  lines.push(`${"=".repeat(60)}`);
  lines.push("");
  
  lines.push(`Total Improvements: ${history.totalImprovements}`);
  lines.push(`Successful: ${history.successfulImprovements} (${(history.successRate * 100).toFixed(1)}%)`);
  lines.push(`Improvement Velocity: ${history.improvementVelocity.toFixed(2)} per week`);
  lines.push("");
  
  lines.push(`Cumulative Impact:`);
  lines.push(`  Performance Gain: ${history.cumulativePerformanceGain.toFixed(1)}%`);
  lines.push(`  Cost Reduction: ${history.cumulativeCostReduction.toFixed(1)}%`);
  lines.push(`  Reliability Gain: ${history.cumulativeReliabilityGain.toFixed(1)}pp`);
  lines.push(`  Total ROI: ${history.cumulativeROI.toFixed(1)}%`);
  lines.push("");
  
  lines.push(`Average Metrics:`);
  lines.push(`  ROI: ${history.avgROI.toFixed(1)}%`);
  lines.push(`  Payback Period: ${history.avgPaybackPeriodDays.toFixed(1)} days`);
  lines.push("");
  
  if (history.improvements.length > 0) {
    const comparison = compareImpacts(history.improvements);
    
    lines.push(`Best Improvements:`);
    if (comparison.bestPerformanceGain) {
      lines.push(`  Performance: ${comparison.bestPerformanceGain.performanceGainPercent.toFixed(1)}% gain (${comparison.bestPerformanceGain.improvementId})`);
    }
    if (comparison.bestCostReduction) {
      lines.push(`  Cost: ${comparison.bestCostReduction.costReductionPercent.toFixed(1)}% reduction (${comparison.bestCostReduction.improvementId})`);
    }
    if (comparison.bestReliabilityGain) {
      lines.push(`  Reliability: ${comparison.bestReliabilityGain.successRateIncrease.toFixed(1)}pp increase (${comparison.bestReliabilityGain.improvementId})`);
    }
    if (comparison.bestROI) {
      lines.push(`  ROI: ${comparison.bestROI.roi.roiPercent.toFixed(1)}% (${comparison.bestROI.improvementId})`);
    }
  }
  
  return lines.join("\n");
}

/**
 * Save impact metrics to database
 */
export async function saveImpactMetrics(
  db: OrdoDatabase,
  metrics: ImpactMetrics
): Promise<void> {
  // Store impact metrics in database
  // This would be implemented based on the database schema
  await db.saveImpactMetrics(metrics);
}

/**
 * Get recent impact metrics for an agent
 */
export async function getRecentImpactMetrics(
  db: OrdoDatabase,
  agentId: string,
  limit: number = 10
): Promise<ImpactMetrics[]> {
  const history = await getImpactHistory(db, agentId);
  
  // Sort by measurement date (most recent first)
  const sorted = history.improvements.sort(
    (a, b) => b.measuredAt.getTime() - a.measuredAt.getTime()
  );
  
  return sorted.slice(0, limit);
}
