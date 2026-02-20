/**
 * Plan Evaluation System
 * Evaluates plans based on expected value, risk, and alignment
 */

import { Plan, PlanEvaluation, RiskLevel } from './types.js';

export interface AgentGoals {
  shortTerm: string[];
  mediumTerm: string[];
  longTerm: string[];
  values: string[];
}

export interface EvaluationContext {
  agentGoals: AgentGoals;
  humanValues: string[];
  currentBalance: number;
  riskTolerance: 'low' | 'medium' | 'high';
}

/**
 * Evaluate a plan based on multiple criteria
 */
export async function evaluatePlan(
  plan: Plan,
  context: EvaluationContext
): Promise<PlanEvaluation> {
  // Calculate expected value (already in plan)
  const expectedValue = plan.expectedValue;

  // Assess risk level (already in plan)
  const riskLevel = plan.riskLevel;

  // Calculate alignment score (already in plan, but we'll recalculate with context)
  const alignmentScore = plan.alignmentScore;

  // Calculate goals alignment
  const goalsAlignment = calculateGoalsAlignment(plan, context.agentGoals);

  // Calculate human values alignment
  const humanValuesAlignment = calculateHumanValuesAlignment(plan, context.humanValues);

  // Calculate feasibility
  const feasibility = calculateFeasibility(plan, context);

  // Make recommendation
  const recommendation = makeRecommendation(
    expectedValue,
    riskLevel,
    alignmentScore,
    goalsAlignment,
    humanValuesAlignment,
    feasibility,
    context
  );

  // Generate reasoning
  const reasoning = generateReasoning(
    expectedValue,
    riskLevel,
    alignmentScore,
    goalsAlignment,
    humanValuesAlignment,
    feasibility,
    recommendation,
    context
  );

  return {
    planId: plan.id,
    expectedValue,
    riskLevel,
    alignmentScore,
    goalsAlignment,
    humanValuesAlignment,
    feasibility,
    recommendation,
    reasoning,
  };
}

/**
 * Calculate how well the plan aligns with agent goals
 */
function calculateGoalsAlignment(plan: Plan, agentGoals: AgentGoals): number {
  let score = 50; // Start with neutral score

  const planGoalLower = plan.goal.toLowerCase();

  // Check alignment with short-term goals (high weight)
  for (const goal of agentGoals.shortTerm) {
    if (planGoalLower.includes(goal.toLowerCase()) || goal.toLowerCase().includes(planGoalLower)) {
      score += 15;
    }
  }

  // Check alignment with medium-term goals (medium weight)
  for (const goal of agentGoals.mediumTerm) {
    if (planGoalLower.includes(goal.toLowerCase()) || goal.toLowerCase().includes(planGoalLower)) {
      score += 10;
    }
  }

  // Check alignment with long-term goals (lower weight)
  for (const goal of agentGoals.longTerm) {
    if (planGoalLower.includes(goal.toLowerCase()) || goal.toLowerCase().includes(planGoalLower)) {
      score += 5;
    }
  }

  // Check alignment with agent values
  for (const value of agentGoals.values) {
    if (planGoalLower.includes(value.toLowerCase())) {
      score += 10;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate how well the plan aligns with human values
 */
function calculateHumanValuesAlignment(plan: Plan, humanValues: string[]): number {
  let score = 95; // Start with high score, deduct for violations

  const planGoalLower = plan.goal.toLowerCase();
  const planStepsText = plan.steps.map(s => s.description.toLowerCase()).join(' ');

  // Check for harmful keywords
  const harmfulKeywords = [
    'harm', 'damage', 'destroy', 'attack', 'exploit', 'manipulate',
    'deceive', 'steal', 'cheat', 'violate', 'abuse'
  ];

  for (const keyword of harmfulKeywords) {
    if (planGoalLower.includes(keyword) || planStepsText.includes(keyword)) {
      score -= 30;
    }
  }

  // Check alignment with positive human values
  const positiveKeywords = [
    'help', 'improve', 'benefit', 'support', 'assist', 'enhance',
    'create', 'build', 'learn', 'grow', 'collaborate'
  ];

  let positiveMatches = 0;
  for (const keyword of positiveKeywords) {
    if (planGoalLower.includes(keyword) || planStepsText.includes(keyword)) {
      positiveMatches++;
    }
  }

  score += Math.min(positiveMatches * 2, 10);

  // Check specific human values from context
  for (const value of humanValues) {
    if (planGoalLower.includes(value.toLowerCase()) || planStepsText.includes(value.toLowerCase())) {
      score += 5;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate feasibility of executing the plan
 */
function calculateFeasibility(plan: Plan, context: EvaluationContext): number {
  let score = 100; // Start with perfect feasibility

  // Check if agent has enough balance
  const costRatio = plan.totalEstimatedCost / context.currentBalance;
  if (costRatio > 1.0) {
    score -= 50; // Plan costs more than available balance
  } else if (costRatio > 0.8) {
    score -= 30; // Plan uses most of balance
  } else if (costRatio > 0.5) {
    score -= 15; // Plan uses significant portion of balance
  }

  // Check risk vs risk tolerance
  const riskPenalty = calculateRiskPenalty(plan.riskLevel, context.riskTolerance);
  score -= riskPenalty;

  // Check plan complexity
  if (plan.steps.length > 15) {
    score -= 10; // Very complex plan
  } else if (plan.steps.length > 10) {
    score -= 5; // Moderately complex plan
  }

  // Check duration
  if (plan.totalEstimatedDuration > 200) {
    score -= 15; // Very long duration
  } else if (plan.totalEstimatedDuration > 100) {
    score -= 10; // Long duration
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate risk penalty based on risk level and tolerance
 */
function calculateRiskPenalty(riskLevel: RiskLevel, riskTolerance: 'low' | 'medium' | 'high'): number {
  const riskMatrix: Record<RiskLevel, Record<string, number>> = {
    low: { low: 0, medium: 0, high: 0 },
    medium: { low: 20, medium: 5, high: 0 },
    high: { low: 40, medium: 15, high: 5 },
    critical: { low: 60, medium: 30, high: 15 },
  };

  return riskMatrix[riskLevel][riskTolerance];
}

/**
 * Make recommendation based on evaluation criteria
 */
function makeRecommendation(
  expectedValue: number,
  riskLevel: RiskLevel,
  alignmentScore: number,
  goalsAlignment: number,
  humanValuesAlignment: number,
  feasibility: number,
  context: EvaluationContext
): 'approve' | 'reject' | 'revise' {
  // Reject if alignment is too low
  if (alignmentScore < 95 || humanValuesAlignment < 95) {
    return 'reject';
  }

  // Reject if feasibility is very low
  if (feasibility < 30) {
    return 'reject';
  }

  // Reject if expected value is negative
  if (expectedValue < 0) {
    return 'reject';
  }

  // Revise if goals alignment is low
  if (goalsAlignment < 50) {
    return 'revise';
  }

  // Revise if feasibility is moderate
  if (feasibility < 60) {
    return 'revise';
  }

  // Revise if risk is too high for tolerance
  if (riskLevel === 'critical' && context.riskTolerance !== 'high') {
    return 'revise';
  }

  if (riskLevel === 'high' && context.riskTolerance === 'low') {
    return 'revise';
  }

  // Approve if all criteria are met
  return 'approve';
}

/**
 * Generate reasoning for the recommendation
 */
function generateReasoning(
  expectedValue: number,
  riskLevel: RiskLevel,
  alignmentScore: number,
  goalsAlignment: number,
  humanValuesAlignment: number,
  feasibility: number,
  recommendation: 'approve' | 'reject' | 'revise',
  context: EvaluationContext
): string {
  const reasons: string[] = [];

  // Expected value reasoning
  if (expectedValue > 1.0) {
    reasons.push(`High expected value of ${expectedValue.toFixed(2)} SOL`);
  } else if (expectedValue > 0) {
    reasons.push(`Positive expected value of ${expectedValue.toFixed(2)} SOL`);
  } else {
    reasons.push(`Negative expected value of ${expectedValue.toFixed(2)} SOL`);
  }

  // Risk reasoning
  reasons.push(`Risk level: ${riskLevel}`);

  // Alignment reasoning
  if (alignmentScore < 95) {
    reasons.push(`Low alignment score (${alignmentScore}), may violate safety constraints`);
  }

  if (humanValuesAlignment < 95) {
    reasons.push(`Low human values alignment (${humanValuesAlignment}), may not align with human interests`);
  }

  // Goals alignment reasoning
  if (goalsAlignment < 50) {
    reasons.push(`Poor alignment with agent goals (${goalsAlignment})`);
  } else if (goalsAlignment > 80) {
    reasons.push(`Strong alignment with agent goals (${goalsAlignment})`);
  }

  // Feasibility reasoning
  if (feasibility < 60) {
    reasons.push(`Low feasibility (${feasibility}), may be difficult to execute`);
  } else if (feasibility > 80) {
    reasons.push(`High feasibility (${feasibility}), likely to succeed`);
  }

  // Recommendation-specific reasoning
  if (recommendation === 'approve') {
    reasons.push('All criteria met for approval');
  } else if (recommendation === 'reject') {
    reasons.push('Critical issues prevent approval');
  } else {
    reasons.push('Plan needs revision to address concerns');
  }

  return reasons.join('. ') + '.';
}
