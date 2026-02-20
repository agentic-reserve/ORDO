/**
 * Planning Accuracy Tracking System
 * Tracks predicted vs actual outcomes and calculates forecast error rate
 */

import { PlanningAccuracy, Plan } from './types.js';

export interface ActualOutcome {
  value: number; // Actual SOL gained/lost
  duration: number; // Actual hours taken
  success: boolean; // Whether the plan succeeded
}

/**
 * Track planning accuracy by comparing predicted vs actual outcomes
 */
export async function trackPlanningAccuracy(
  plan: Plan,
  actualOutcome: ActualOutcome,
  executedAt: Date,
  completedAt: Date
): Promise<PlanningAccuracy> {
  // Calculate error rate
  const valueError = Math.abs(plan.expectedValue - actualOutcome.value) / Math.max(Math.abs(plan.expectedValue), 0.01);
  const durationError = Math.abs(plan.totalEstimatedDuration - actualOutcome.duration) / Math.max(plan.totalEstimatedDuration, 1);
  
  // Overall error rate (weighted average)
  const errorRate = (valueError * 0.6 + durationError * 0.4) * 100;

  return {
    planId: plan.id,
    agentId: plan.agentId,
    predictedOutcome: {
      value: plan.expectedValue,
      duration: plan.totalEstimatedDuration,
      successProbability: calculateSuccessProbability(plan),
    },
    actualOutcome,
    errorRate,
    executedAt,
    completedAt,
  };
}

/**
 * Calculate success probability from plan characteristics
 */
function calculateSuccessProbability(plan: Plan): number {
  let probability = 0.7; // Base probability

  // Adjust based on risk level
  switch (plan.riskLevel) {
    case 'low':
      probability += 0.2;
      break;
    case 'medium':
      probability += 0.1;
      break;
    case 'high':
      probability -= 0.1;
      break;
    case 'critical':
      probability -= 0.3;
      break;
  }

  // Adjust based on alignment
  if (plan.alignmentScore > 95) {
    probability += 0.1;
  }

  return Math.max(0.1, Math.min(0.95, probability));
}

/**
 * Calculate average accuracy across multiple planning records
 */
export function calculateAverageAccuracy(records: PlanningAccuracy[]): {
  avgErrorRate: number;
  avgValueError: number;
  avgDurationError: number;
  successRate: number;
} {
  if (records.length === 0) {
    return {
      avgErrorRate: 0,
      avgValueError: 0,
      avgDurationError: 0,
      successRate: 0,
    };
  }

  const avgErrorRate = records.reduce((sum, r) => sum + r.errorRate, 0) / records.length;

  const avgValueError = records.reduce((sum, r) => {
    const error = Math.abs(r.predictedOutcome.value - r.actualOutcome.value) / 
                  Math.max(Math.abs(r.predictedOutcome.value), 0.01);
    return sum + error;
  }, 0) / records.length;

  const avgDurationError = records.reduce((sum, r) => {
    const error = Math.abs(r.predictedOutcome.duration - r.actualOutcome.duration) / 
                  Math.max(r.predictedOutcome.duration, 1);
    return sum + error;
  }, 0) / records.length;

  const successCount = records.filter(r => r.actualOutcome.success).length;
  const successRate = successCount / records.length;

  return {
    avgErrorRate,
    avgValueError,
    avgDurationError,
    successRate,
  };
}

/**
 * Get accuracy history for an agent
 */
export interface AccuracyHistory {
  agentId: string;
  totalPlans: number;
  recentAccuracy: PlanningAccuracy[];
  averageMetrics: {
    avgErrorRate: number;
    avgValueError: number;
    avgDurationError: number;
    successRate: number;
  };
  trend: 'improving' | 'stable' | 'declining';
}

/**
 * Analyze accuracy history and determine trend
 */
export function analyzeAccuracyHistory(
  agentId: string,
  allRecords: PlanningAccuracy[]
): AccuracyHistory {
  const agentRecords = allRecords.filter(r => r.agentId === agentId);
  
  // Sort by execution date
  const sortedRecords = agentRecords.sort(
    (a, b) => a.executedAt.getTime() - b.executedAt.getTime()
  );

  // Get recent records (last 10)
  const recentRecords = sortedRecords.slice(-10);

  // Calculate average metrics
  const averageMetrics = calculateAverageAccuracy(recentRecords);

  // Determine trend
  const trend = determineTrend(sortedRecords);

  return {
    agentId,
    totalPlans: agentRecords.length,
    recentAccuracy: recentRecords,
    averageMetrics,
    trend,
  };
}

/**
 * Determine if accuracy is improving, stable, or declining
 */
function determineTrend(records: PlanningAccuracy[]): 'improving' | 'stable' | 'declining' {
  if (records.length < 4) {
    return 'stable'; // Not enough data
  }

  // Split into first half and second half
  const midpoint = Math.floor(records.length / 2);
  const firstHalf = records.slice(0, midpoint);
  const secondHalf = records.slice(midpoint);

  const firstHalfAvg = calculateAverageAccuracy(firstHalf).avgErrorRate;
  const secondHalfAvg = calculateAverageAccuracy(secondHalf).avgErrorRate;

  const improvement = firstHalfAvg - secondHalfAvg;

  if (improvement > 5) {
    return 'improving'; // Error rate decreased by more than 5%
  } else if (improvement < -5) {
    return 'declining'; // Error rate increased by more than 5%
  } else {
    return 'stable';
  }
}
