/**
 * Multi-Step Planning System
 * Generates plans with 7+ steps, considering dependencies and contingencies
 */

import { randomUUID } from 'crypto';
import {
  Plan,
  PlanStep,
  Contingency,
  RiskLevel,
  DecisionTree,
  DecisionNode,
  DecisionOutcome,
} from './types.js';

export interface PlanningContext {
  agentId: string;
  goal: string;
  currentBalance: number;
  currentSkills: string[];
  constraints?: {
    maxCost?: number;
    maxDuration?: number;
    requiredOutcomes?: string[];
  };
}

/**
 * Generate a multi-step plan (7+ steps) for achieving a goal
 */
export async function planAhead(context: PlanningContext): Promise<Plan> {
  const steps = await generatePlanSteps(context);
  
  if (steps.length < 7) {
    throw new Error(`Plan must have at least 7 steps, got ${steps.length}`);
  }

  const totalEstimatedDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);
  const totalEstimatedCost = steps.reduce((sum, step) => sum + step.estimatedCost, 0);
  
  const expectedValue = calculateExpectedValue(steps, context);
  const riskLevel = assessRiskLevel(steps, context);
  const alignmentScore = calculateAlignmentScore(context.goal, steps);

  return {
    id: randomUUID(),
    goal: context.goal,
    steps,
    totalEstimatedDuration,
    totalEstimatedCost,
    expectedValue,
    riskLevel,
    alignmentScore,
    createdAt: new Date(),
    agentId: context.agentId,
  };
}

/**
 * Generate plan steps with dependencies and contingencies
 */
async function generatePlanSteps(context: PlanningContext): Promise<PlanStep[]> {
  const steps: PlanStep[] = [];
  
  // Step 1: Analyze current situation
  steps.push({
    id: randomUUID(),
    description: 'Analyze current situation and resources',
    action: 'assess_current_state',
    dependencies: [],
    estimatedDuration: 0.5,
    estimatedCost: 0.001,
    expectedOutcome: 'Clear understanding of starting position',
    contingencies: [
      {
        condition: 'Insufficient data available',
        alternativeAction: 'Gather additional information from external sources',
        probability: 0.2,
      },
    ],
  });

  // Step 2: Research and gather information
  steps.push({
    id: randomUUID(),
    description: 'Research best practices and gather relevant information',
    action: 'research_and_learn',
    dependencies: [steps[0].id],
    estimatedDuration: 2,
    estimatedCost: 0.005,
    expectedOutcome: 'Comprehensive knowledge base for decision making',
    contingencies: [
      {
        condition: 'Information sources unavailable',
        alternativeAction: 'Use cached knowledge and proceed with caution',
        probability: 0.1,
      },
    ],
  });

  // Step 3: Develop detailed strategy
  steps.push({
    id: randomUUID(),
    description: 'Develop detailed strategy based on research',
    action: 'create_strategy',
    dependencies: [steps[1].id],
    estimatedDuration: 1.5,
    estimatedCost: 0.003,
    expectedOutcome: 'Actionable strategy with clear milestones',
    contingencies: [
      {
        condition: 'Strategy conflicts with constraints',
        alternativeAction: 'Revise strategy to fit within constraints',
        probability: 0.3,
      },
    ],
  });

  // Step 4: Acquire necessary resources
  steps.push({
    id: randomUUID(),
    description: 'Acquire or allocate necessary resources',
    action: 'acquire_resources',
    dependencies: [steps[2].id],
    estimatedDuration: 3,
    estimatedCost: context.constraints?.maxCost ? context.constraints.maxCost * 0.3 : 0.1,
    expectedOutcome: 'All required resources available',
    contingencies: [
      {
        condition: 'Resources cost more than expected',
        alternativeAction: 'Find alternative resources or adjust strategy',
        probability: 0.4,
      },
      {
        condition: 'Resources unavailable',
        alternativeAction: 'Wait for availability or find substitutes',
        probability: 0.2,
      },
    ],
  });

  // Step 5: Execute primary actions
  steps.push({
    id: randomUUID(),
    description: 'Execute primary actions toward goal',
    action: 'execute_primary_actions',
    dependencies: [steps[3].id],
    estimatedDuration: 8,
    estimatedCost: context.constraints?.maxCost ? context.constraints.maxCost * 0.5 : 0.2,
    expectedOutcome: 'Significant progress toward goal',
    contingencies: [
      {
        condition: 'Execution encounters unexpected obstacles',
        alternativeAction: 'Pause, reassess, and adjust approach',
        probability: 0.5,
      },
      {
        condition: 'Results differ from expectations',
        alternativeAction: 'Analyze differences and adapt strategy',
        probability: 0.3,
      },
    ],
  });

  // Step 6: Monitor and adjust
  steps.push({
    id: randomUUID(),
    description: 'Monitor progress and make necessary adjustments',
    action: 'monitor_and_adjust',
    dependencies: [steps[4].id],
    estimatedDuration: 2,
    estimatedCost: 0.002,
    expectedOutcome: 'Optimized execution based on real-time feedback',
    contingencies: [
      {
        condition: 'Major deviation from plan detected',
        alternativeAction: 'Implement contingency plan or revise strategy',
        probability: 0.4,
      },
    ],
  });

  // Step 7: Validate and verify results
  steps.push({
    id: randomUUID(),
    description: 'Validate results and verify goal achievement',
    action: 'validate_results',
    dependencies: [steps[5].id],
    estimatedDuration: 1,
    estimatedCost: 0.001,
    expectedOutcome: 'Confirmed goal achievement',
    contingencies: [
      {
        condition: 'Goal not fully achieved',
        alternativeAction: 'Identify gaps and plan additional actions',
        probability: 0.3,
      },
    ],
  });

  // Step 8: Document learnings and optimize
  steps.push({
    id: randomUUID(),
    description: 'Document learnings and optimize for future',
    action: 'document_and_optimize',
    dependencies: [steps[6].id],
    estimatedDuration: 1,
    estimatedCost: 0.001,
    expectedOutcome: 'Improved knowledge base and strategies',
    contingencies: [
      {
        condition: 'Insufficient time for documentation',
        alternativeAction: 'Create brief summary for later expansion',
        probability: 0.2,
      },
    ],
  });

  return steps;
}

/**
 * Calculate expected value of a plan
 */
function calculateExpectedValue(steps: PlanStep[], context: PlanningContext): number {
  // Base value from goal achievement
  let baseValue = 1.0; // Default 1 SOL value
  
  // Adjust based on goal type (simplified heuristic)
  if (context.goal.toLowerCase().includes('earn') || context.goal.toLowerCase().includes('profit')) {
    baseValue = 5.0;
  } else if (context.goal.toLowerCase().includes('learn') || context.goal.toLowerCase().includes('improve')) {
    baseValue = 2.0;
  }
  
  // Subtract total estimated cost
  const totalCost = steps.reduce((sum, step) => sum + step.estimatedCost, 0);
  
  // Factor in contingency risks
  const riskDiscount = steps.reduce((discount, step) => {
    const stepRisk = step.contingencies.reduce((risk, cont) => risk + cont.probability, 0);
    return discount + (stepRisk * 0.1); // Each contingency reduces value by 10% of its probability
  }, 0);
  
  return baseValue - totalCost - riskDiscount;
}

/**
 * Assess overall risk level of a plan
 */
function assessRiskLevel(steps: PlanStep[], context: PlanningContext): RiskLevel {
  const totalCost = steps.reduce((sum, step) => sum + step.estimatedCost, 0);
  const totalContingencies = steps.reduce((sum, step) => sum + step.contingencies.length, 0);
  const avgContingencyProbability = steps.reduce((sum, step) => {
    return sum + step.contingencies.reduce((p, cont) => p + cont.probability, 0);
  }, 0) / Math.max(totalContingencies, 1);

  // Risk factors
  const costRisk = totalCost / Math.max(context.currentBalance, 0.01);
  const contingencyRisk = avgContingencyProbability;
  const complexityRisk = steps.length / 10; // More steps = more complexity

  const overallRisk = (costRisk * 0.4) + (contingencyRisk * 0.4) + (complexityRisk * 0.2);

  if (overallRisk < 0.3) return 'low';
  if (overallRisk < 0.6) return 'medium';
  if (overallRisk < 0.8) return 'high';
  return 'critical';
}

/**
 * Calculate alignment score (simplified)
 */
function calculateAlignmentScore(goal: string, steps: PlanStep[]): number {
  // Base alignment score
  let score = 95;
  
  // Penalize if goal contains potentially harmful keywords
  const harmfulKeywords = ['harm', 'damage', 'destroy', 'attack', 'exploit'];
  for (const keyword of harmfulKeywords) {
    if (goal.toLowerCase().includes(keyword)) {
      score -= 20;
    }
  }
  
  // Penalize if steps have high risk
  const highRiskSteps = steps.filter(step => 
    step.contingencies.some(cont => cont.probability > 0.5)
  );
  score -= highRiskSteps.length * 2;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Generate decision tree for alternative paths
 */
export function generateDecisionTree(plan: Plan): DecisionTree {
  const root: DecisionNode = {
    id: randomUUID(),
    decision: `Start executing plan: ${plan.goal}`,
    outcomes: [],
  };

  // For each step, create decision outcomes based on contingencies
  for (let i = 0; i < Math.min(plan.steps.length, 3); i++) {
    const step = plan.steps[i];
    
    // Success outcome
    const successOutcome: DecisionOutcome = {
      condition: `${step.description} succeeds`,
      probability: 1 - step.contingencies.reduce((sum, c) => sum + c.probability, 0),
      nextNode: i < 2 ? {
        id: randomUUID(),
        decision: plan.steps[i + 1].description,
        outcomes: [],
      } : undefined,
      finalResult: i === 2 ? 'Continue with remaining steps' : undefined,
    };
    
    root.outcomes.push(successOutcome);
    
    // Contingency outcomes
    for (const contingency of step.contingencies) {
      const contingencyOutcome: DecisionOutcome = {
        condition: contingency.condition,
        probability: contingency.probability,
        nextNode: {
          id: randomUUID(),
          decision: contingency.alternativeAction,
          outcomes: [],
        },
        finalResult: undefined,
      };
      
      root.outcomes.push(contingencyOutcome);
    }
  }

  return { root };
}
