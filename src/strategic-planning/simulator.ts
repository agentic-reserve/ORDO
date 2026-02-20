/**
 * Strategy Simulation System
 * Simulates multiple alternative strategies and compares outcomes
 */

import { randomUUID } from 'crypto';
import {
  Strategy,
  SimulatedOutcome,
  Risk,
  Opportunity,
  Plan,
} from './types.js';
import { planAhead, PlanningContext } from './planner.js';

export interface SimulationContext {
  agentId: string;
  goal: string;
  currentBalance: number;
  currentSkills: string[];
  marketConditions?: {
    volatility: number; // 0-1
    opportunities: string[];
    threats: string[];
  };
}

/**
 * Simulate multiple alternative strategies (minimum 3)
 */
export async function simulateStrategies(
  context: SimulationContext,
  numStrategies: number = 3
): Promise<Strategy[]> {
  if (numStrategies < 3) {
    throw new Error('Must simulate at least 3 alternative strategies');
  }

  const strategies: Strategy[] = [];

  // Generate different strategy variations
  for (let i = 0; i < numStrategies; i++) {
    const strategyContext = createStrategyVariation(context, i);
    const plan = await planAhead(strategyContext);
    const simulatedOutcome = await simulateOutcome(plan, context);

    strategies.push({
      id: randomUUID(),
      name: `Strategy ${i + 1}: ${getStrategyName(i)}`,
      description: getStrategyDescription(i, context.goal),
      plan,
      simulatedOutcome,
    });
  }

  return strategies;
}

/**
 * Create a variation of the planning context for different strategies
 */
function createStrategyVariation(
  context: SimulationContext,
  variationIndex: number
): PlanningContext {
  const baseContext: PlanningContext = {
    agentId: context.agentId,
    goal: context.goal,
    currentBalance: context.currentBalance,
    currentSkills: context.currentSkills,
  };

  // Variation 0: Conservative (low cost, low risk)
  if (variationIndex === 0) {
    return {
      ...baseContext,
      constraints: {
        maxCost: context.currentBalance * 0.2,
        maxDuration: 48,
      },
    };
  }

  // Variation 1: Balanced (moderate cost, moderate risk)
  if (variationIndex === 1) {
    return {
      ...baseContext,
      constraints: {
        maxCost: context.currentBalance * 0.5,
        maxDuration: 72,
      },
    };
  }

  // Variation 2: Aggressive (high cost, high risk, high reward)
  if (variationIndex === 2) {
    return {
      ...baseContext,
      constraints: {
        maxCost: context.currentBalance * 0.8,
        maxDuration: 120,
      },
    };
  }

  // Additional variations: Experimental approaches
  return {
    ...baseContext,
    constraints: {
      maxCost: context.currentBalance * (0.3 + variationIndex * 0.1),
      maxDuration: 60 + variationIndex * 12,
    },
  };
}

/**
 * Get strategy name based on variation index
 */
function getStrategyName(variationIndex: number): string {
  const names = [
    'Conservative Approach',
    'Balanced Approach',
    'Aggressive Approach',
    'Experimental Approach',
    'Innovative Approach',
  ];
  return names[variationIndex] || `Custom Approach ${variationIndex + 1}`;
}

/**
 * Get strategy description
 */
function getStrategyDescription(variationIndex: number, goal: string): string {
  const descriptions = [
    `Conservative strategy for "${goal}" with minimal risk and cost`,
    `Balanced strategy for "${goal}" with moderate risk and reward`,
    `Aggressive strategy for "${goal}" with high risk and high potential reward`,
    `Experimental strategy for "${goal}" exploring novel approaches`,
    `Innovative strategy for "${goal}" with creative solutions`,
  ];
  return descriptions[variationIndex] || `Alternative strategy ${variationIndex + 1} for "${goal}"`;
}

/**
 * Simulate the outcome of executing a plan
 */
async function simulateOutcome(
  plan: Plan,
  context: SimulationContext
): Promise<SimulatedOutcome> {
  // Calculate success probability based on plan characteristics
  const successProbability = calculateSuccessProbability(plan, context);

  // Calculate expected value
  const expectedValue = plan.expectedValue * successProbability;

  // Calculate expected duration (may be longer if contingencies trigger)
  const contingencyDelay = plan.steps.reduce((delay, step) => {
    const stepContingencyProb = step.contingencies.reduce((p, c) => p + c.probability, 0);
    return delay + (step.estimatedDuration * stepContingencyProb * 0.5);
  }, 0);
  const expectedDuration = plan.totalEstimatedDuration + contingencyDelay;

  // Identify risks
  const risks = identifyRisks(plan, context);

  // Identify opportunities
  const opportunities = identifyOpportunities(plan, context);

  return {
    successProbability,
    expectedValue,
    expectedDuration,
    risks,
    opportunities,
  };
}

/**
 * Calculate success probability for a plan
 */
function calculateSuccessProbability(plan: Plan, context: SimulationContext): number {
  let baseProbability = 0.7; // Start with 70% base success rate

  // Adjust based on risk level
  switch (plan.riskLevel) {
    case 'low':
      baseProbability += 0.2;
      break;
    case 'medium':
      baseProbability += 0.1;
      break;
    case 'high':
      baseProbability -= 0.1;
      break;
    case 'critical':
      baseProbability -= 0.3;
      break;
  }

  // Adjust based on cost vs balance
  const costRatio = plan.totalEstimatedCost / context.currentBalance;
  if (costRatio > 0.8) {
    baseProbability -= 0.2; // Very risky if using most of balance
  } else if (costRatio > 0.5) {
    baseProbability -= 0.1;
  }

  // Adjust based on market conditions
  if (context.marketConditions) {
    baseProbability -= context.marketConditions.volatility * 0.2;
  }

  return Math.max(0.1, Math.min(0.95, baseProbability));
}

/**
 * Identify risks in a plan
 */
function identifyRisks(plan: Plan, context: SimulationContext): Risk[] {
  const risks: Risk[] = [];

  // Cost overrun risk
  if (plan.totalEstimatedCost > context.currentBalance * 0.5) {
    risks.push({
      description: 'Cost overrun could deplete agent balance',
      probability: 0.3,
      impact: -plan.totalEstimatedCost * 0.5,
    });
  }

  // Time overrun risk
  if (plan.totalEstimatedDuration > 100) {
    risks.push({
      description: 'Extended duration increases uncertainty',
      probability: 0.4,
      impact: -0.1,
    });
  }

  // Contingency risks from plan steps
  const highProbContingencies = plan.steps.flatMap(step =>
    step.contingencies.filter(c => c.probability > 0.3)
  );

  if (highProbContingencies.length > 3) {
    risks.push({
      description: 'Multiple high-probability contingencies may compound',
      probability: 0.5,
      impact: -plan.totalEstimatedCost * 0.3,
    });
  }

  // Market condition risks
  if (context.marketConditions) {
    for (const threat of context.marketConditions.threats) {
      risks.push({
        description: `Market threat: ${threat}`,
        probability: context.marketConditions.volatility,
        impact: -0.2,
      });
    }
  }

  return risks;
}

/**
 * Identify opportunities in a plan
 */
function identifyOpportunities(plan: Plan, context: SimulationContext): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // High alignment opportunity
  if (plan.alignmentScore > 95) {
    opportunities.push({
      description: 'High alignment may attract support and resources',
      probability: 0.6,
      impact: plan.expectedValue * 0.2,
    });
  }

  // Efficient execution opportunity
  if (plan.riskLevel === 'low') {
    opportunities.push({
      description: 'Low risk plan may complete faster than expected',
      probability: 0.4,
      impact: plan.totalEstimatedCost * 0.1,
    });
  }

  // Market opportunities
  if (context.marketConditions) {
    for (const opportunity of context.marketConditions.opportunities) {
      opportunities.push({
        description: `Market opportunity: ${opportunity}`,
        probability: 0.5,
        impact: 0.5,
      });
    }
  }

  // Learning opportunity
  opportunities.push({
    description: 'Executing plan will improve agent capabilities',
    probability: 0.8,
    impact: 0.1,
  });

  return opportunities;
}
