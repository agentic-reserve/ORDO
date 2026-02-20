/**
 * Strategy Adjustment System
 * Detects forecast errors > 20% and adjusts strategies accordingly
 */

import { StrategyAdjustment, Plan } from './types.js';
import { PlanningAccuracy } from './types.js';
import { planAhead, PlanningContext } from './planner.js';

/**
 * Detect if forecast error exceeds threshold and adjust strategy
 */
export async function adjustStrategyIfNeeded(
  accuracy: PlanningAccuracy,
  originalPlan: Plan,
  planningContext: PlanningContext
): Promise<StrategyAdjustment | null> {
  const errorThreshold = 20; // 20% error threshold

  // Check if error exceeds threshold
  if (accuracy.errorRate <= errorThreshold) {
    return null; // No adjustment needed
  }

  // Determine adjustment type based on error magnitude
  const adjustmentType = determineAdjustmentType(accuracy.errorRate);

  // Analyze what went wrong
  const analysisReason = analyzeError(accuracy, originalPlan);

  // Generate adjusted strategy
  const adjustedContext = adjustPlanningContext(planningContext, accuracy, originalPlan);
  const adjustedPlan = await planAhead(adjustedContext);

  return {
    agentId: accuracy.agentId,
    originalStrategy: originalPlan.goal,
    adjustedStrategy: adjustedPlan.goal,
    reason: analysisReason,
    forecastError: accuracy.errorRate,
    adjustmentType,
    createdAt: new Date(),
  };
}

/**
 * Determine adjustment type based on error magnitude
 */
function determineAdjustmentType(errorRate: number): 'minor' | 'major' | 'complete_revision' {
  if (errorRate > 50) {
    return 'complete_revision';
  } else if (errorRate > 35) {
    return 'major';
  } else {
    return 'minor';
  }
}

/**
 * Analyze what went wrong in the plan execution
 */
function analyzeError(accuracy: PlanningAccuracy, originalPlan: Plan): string {
  const reasons: string[] = [];

  // Value error analysis
  const valueError = Math.abs(accuracy.predictedOutcome.value - accuracy.actualOutcome.value);
  const valueErrorPercent = (valueError / Math.max(Math.abs(accuracy.predictedOutcome.value), 0.01)) * 100;

  if (valueErrorPercent > 30) {
    if (accuracy.actualOutcome.value < accuracy.predictedOutcome.value) {
      reasons.push('Expected value was significantly overestimated');
    } else {
      reasons.push('Expected value was significantly underestimated');
    }
  }

  // Duration error analysis
  const durationError = Math.abs(accuracy.predictedOutcome.duration - accuracy.actualOutcome.duration);
  const durationErrorPercent = (durationError / Math.max(accuracy.predictedOutcome.duration, 1)) * 100;

  if (durationErrorPercent > 30) {
    if (accuracy.actualOutcome.duration > accuracy.predictedOutcome.duration) {
      reasons.push('Plan took significantly longer than expected');
    } else {
      reasons.push('Plan completed faster than expected');
    }
  }

  // Success analysis
  if (!accuracy.actualOutcome.success) {
    reasons.push('Plan failed to achieve its goal');
  }

  // Risk analysis
  if (originalPlan.riskLevel === 'high' || originalPlan.riskLevel === 'critical') {
    reasons.push('High risk level contributed to poor outcomes');
  }

  return reasons.join('. ') + '. Strategy needs adjustment to improve future predictions.';
}

/**
 * Adjust planning context based on learned errors
 */
function adjustPlanningContext(
  originalContext: PlanningContext,
  accuracy: PlanningAccuracy,
  originalPlan: Plan
): PlanningContext {
  const adjustedContext = { ...originalContext };

  // Adjust constraints based on what went wrong
  if (!adjustedContext.constraints) {
    adjustedContext.constraints = {};
  }

  // If duration was underestimated, increase buffer
  if (accuracy.actualOutcome.duration > accuracy.predictedOutcome.duration * 1.3) {
    adjustedContext.constraints.maxDuration = originalPlan.totalEstimatedDuration * 1.5;
  }

  // If cost was underestimated, reduce budget
  if (accuracy.actualOutcome.value < accuracy.predictedOutcome.value * 0.7) {
    adjustedContext.constraints.maxCost = originalPlan.totalEstimatedCost * 0.8;
  }

  // If plan failed, be more conservative
  if (!accuracy.actualOutcome.success) {
    adjustedContext.constraints.maxCost = (adjustedContext.constraints.maxCost || originalContext.currentBalance * 0.5) * 0.7;
  }

  return adjustedContext;
}

/**
 * Batch adjust strategies based on multiple accuracy records
 */
export async function batchAdjustStrategies(
  accuracyRecords: PlanningAccuracy[],
  plansByPlanId: Map<string, Plan>,
  contextsByAgentId: Map<string, PlanningContext>
): Promise<StrategyAdjustment[]> {
  const adjustments: StrategyAdjustment[] = [];

  for (const accuracy of accuracyRecords) {
    const originalPlan = plansByPlanId.get(accuracy.planId);
    const context = contextsByAgentId.get(accuracy.agentId);

    if (!originalPlan || !context) {
      continue; // Skip if we don't have the necessary data
    }

    const adjustment = await adjustStrategyIfNeeded(accuracy, originalPlan, context);
    if (adjustment) {
      adjustments.push(adjustment);
    }
  }

  return adjustments;
}

/**
 * Get adjustment recommendations for an agent
 */
export interface AdjustmentRecommendation {
  agentId: string;
  shouldAdjust: boolean;
  reason: string;
  recommendedChanges: string[];
}

/**
 * Analyze if an agent should adjust their strategy
 */
export function getAdjustmentRecommendation(
  recentAccuracyRecords: PlanningAccuracy[]
): AdjustmentRecommendation {
  if (recentAccuracyRecords.length === 0) {
    return {
      agentId: '',
      shouldAdjust: false,
      reason: 'No accuracy records available',
      recommendedChanges: [],
    };
  }

  const agentId = recentAccuracyRecords[0].agentId;
  const avgErrorRate = recentAccuracyRecords.reduce((sum, r) => sum + r.errorRate, 0) / recentAccuracyRecords.length;
  const highErrorCount = recentAccuracyRecords.filter(r => r.errorRate > 20).length;
  const failureCount = recentAccuracyRecords.filter(r => !r.actualOutcome.success).length;

  const shouldAdjust = avgErrorRate > 20 || highErrorCount > recentAccuracyRecords.length / 2;

  const recommendedChanges: string[] = [];
  let reason = '';

  if (avgErrorRate > 20) {
    reason = `Average forecast error rate (${avgErrorRate.toFixed(1)}%) exceeds 20% threshold`;
    recommendedChanges.push('Improve estimation accuracy');
    recommendedChanges.push('Use more conservative estimates');
  }

  if (highErrorCount > recentAccuracyRecords.length / 2) {
    reason += `. ${highErrorCount} out of ${recentAccuracyRecords.length} recent plans had high error rates`;
    recommendedChanges.push('Review planning methodology');
  }

  if (failureCount > recentAccuracyRecords.length / 3) {
    reason += `. ${failureCount} out of ${recentAccuracyRecords.length} plans failed`;
    recommendedChanges.push('Reduce risk level in future plans');
    recommendedChanges.push('Increase contingency planning');
  }

  if (!shouldAdjust) {
    reason = 'Planning accuracy is within acceptable range';
  }

  return {
    agentId,
    shouldAdjust,
    reason,
    recommendedChanges,
  };
}
