/**
 * Modification Proposal System
 *
 * Analyzes agent performance bottlenecks and generates modification hypotheses.
 * Implements Requirements 4.1 and 16.1.
 */

import type {
  OrdoDatabase,
  AgentTurn,
  InferenceCostRecord,
  ToolCallResult,
} from "../types/index.js";

/**
 * Types of self-modifications that can be proposed
 */
export type ModificationProposalType =
  | "code_edit"
  | "tool_install"
  | "prompt_change"
  | "strategy_update";

/**
 * A proposed self-modification with hypothesis and rationale
 */
export interface SelfModification {
  type: ModificationProposalType;
  target: string;
  change: string;
  hypothesis: string;
  reversible: boolean;
  testPeriod: number; // in days
  expectedImpact: {
    speedImprovement?: number; // percentage
    costReduction?: number; // percentage
    successRateIncrease?: number; // percentage
  };
}

/**
 * Performance bottleneck analysis result
 */
export interface BottleneckAnalysis {
  slowOperations: {
    operation: string;
    avgLatencyMs: number;
    count: number;
    impact: "high" | "medium" | "low";
  }[];
  highCostOperations: {
    operation: string;
    avgCostCents: number;
    count: number;
    impact: "high" | "medium" | "low";
  }[];
  lowSuccessRateOperations: {
    operation: string;
    successRate: number;
    count: number;
    impact: "high" | "medium" | "low";
  }[];
  overallMetrics: {
    avgTurnLatencyMs: number;
    avgTurnCostCents: number;
    overallSuccessRate: number;
    totalTurns: number;
  };
}

/**
 * Improvement opportunity identified from bottleneck analysis
 */
export interface ImprovementOpportunity {
  category: "speed" | "cost" | "success_rate";
  description: string;
  currentValue: number;
  targetValue: number;
  priority: "high" | "medium" | "low";
  affectedOperations: string[];
}

/**
 * Analyze agent performance to identify bottlenecks
 */
export function analyzeBottlenecks(
  db: OrdoDatabase,
  lookbackTurns: number = 100,
): BottleneckAnalysis {
  const recentTurns = db.getRecentTurns(lookbackTurns);

  // Analyze tool call latencies
  const toolLatencies = new Map<string, { total: number; count: number }>();
  const toolCosts = new Map<string, { total: number; count: number }>();
  const toolSuccesses = new Map<string, { success: number; total: number }>();

  for (const turn of recentTurns) {
    for (const toolCall of turn.toolCalls) {
      // Latency tracking
      const latency = toolLatencies.get(toolCall.name) || { total: 0, count: 0 };
      latency.total += toolCall.durationMs;
      latency.count += 1;
      toolLatencies.set(toolCall.name, latency);

      // Success rate tracking
      const success = toolSuccesses.get(toolCall.name) || { success: 0, total: 0 };
      success.total += 1;
      if (!toolCall.error) {
        success.success += 1;
      }
      toolSuccesses.set(toolCall.name, success);
    }
  }

  // Analyze inference costs
  const inferenceCosts = db.getInferenceCosts(undefined, lookbackTurns);
  for (const cost of inferenceCosts) {
    const existing = toolCosts.get(cost.model) || { total: 0, count: 0 };
    existing.total += cost.costCents;
    existing.count += 1;
    toolCosts.set(cost.model, existing);
  }

  // Calculate overall metrics
  const totalLatency = recentTurns.reduce(
    (sum, turn) =>
      sum + turn.toolCalls.reduce((s, tc) => s + tc.durationMs, 0),
    0,
  );
  const totalCost = recentTurns.reduce((sum, turn) => sum + turn.costCents, 0);
  const totalToolCalls = recentTurns.reduce(
    (sum, turn) => sum + turn.toolCalls.length,
    0,
  );
  const successfulToolCalls = recentTurns.reduce(
    (sum, turn) => sum + turn.toolCalls.filter((tc) => !tc.error).length,
    0,
  );

  // Identify slow operations
  const slowOperations = Array.from(toolLatencies.entries())
    .map(([operation, data]) => ({
      operation,
      avgLatencyMs: data.total / data.count,
      count: data.count,
      impact: classifyImpact(data.total / data.count, 1000, 5000) as
        | "high"
        | "medium"
        | "low",
    }))
    .filter((op) => op.avgLatencyMs > 500)
    .sort((a, b) => b.avgLatencyMs - a.avgLatencyMs);

  // Identify high cost operations
  const highCostOperations = Array.from(toolCosts.entries())
    .map(([operation, data]) => ({
      operation,
      avgCostCents: data.total / data.count,
      count: data.count,
      impact: classifyImpact(data.total / data.count, 1, 5) as
        | "high"
        | "medium"
        | "low",
    }))
    .filter((op) => op.avgCostCents > 0.5)
    .sort((a, b) => b.avgCostCents - a.avgCostCents);

  // Identify low success rate operations
  const lowSuccessRateOperations = Array.from(toolSuccesses.entries())
    .map(([operation, data]) => ({
      operation,
      successRate: data.success / data.total,
      count: data.total,
      impact: classifyImpact(1 - data.success / data.total, 0.1, 0.3) as
        | "high"
        | "medium"
        | "low",
    }))
    .filter((op) => op.successRate < 0.95)
    .sort((a, b) => a.successRate - b.successRate);

  return {
    slowOperations,
    highCostOperations,
    lowSuccessRateOperations,
    overallMetrics: {
      avgTurnLatencyMs: totalLatency / Math.max(recentTurns.length, 1),
      avgTurnCostCents: totalCost / Math.max(recentTurns.length, 1),
      overallSuccessRate: successfulToolCalls / Math.max(totalToolCalls, 1),
      totalTurns: recentTurns.length,
    },
  };
}

/**
 * Classify impact level based on value and thresholds
 */
function classifyImpact(
  value: number,
  mediumThreshold: number,
  highThreshold: number,
): "high" | "medium" | "low" {
  if (value >= highThreshold) return "high";
  if (value >= mediumThreshold) return "medium";
  return "low";
}

/**
 * Identify improvement opportunities from bottleneck analysis
 */
export function identifyImprovementOpportunities(
  analysis: BottleneckAnalysis,
): ImprovementOpportunity[] {
  const opportunities: ImprovementOpportunity[] = [];

  // Speed improvement opportunities
  for (const slowOp of analysis.slowOperations.filter(
    (op) => op.impact === "high",
  )) {
    opportunities.push({
      category: "speed",
      description: `Optimize ${slowOp.operation} to reduce latency`,
      currentValue: slowOp.avgLatencyMs,
      targetValue: slowOp.avgLatencyMs * 0.5, // Target 50% reduction
      priority: "high",
      affectedOperations: [slowOp.operation],
    });
  }

  // Cost reduction opportunities
  for (const costlyOp of analysis.highCostOperations.filter(
    (op) => op.impact === "high",
  )) {
    opportunities.push({
      category: "cost",
      description: `Reduce cost of ${costlyOp.operation}`,
      currentValue: costlyOp.avgCostCents,
      targetValue: costlyOp.avgCostCents * 0.7, // Target 30% reduction
      priority: "high",
      affectedOperations: [costlyOp.operation],
    });
  }

  // Success rate improvement opportunities
  for (const failingOp of analysis.lowSuccessRateOperations.filter(
    (op) => op.impact === "high",
  )) {
    opportunities.push({
      category: "success_rate",
      description: `Improve success rate of ${failingOp.operation}`,
      currentValue: failingOp.successRate,
      targetValue: Math.min(0.95, failingOp.successRate + 0.2), // Target 20% increase or 95%
      priority: "high",
      affectedOperations: [failingOp.operation],
    });
  }

  // Sort by priority
  return opportunities.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Generate modification hypotheses based on improvement opportunities
 */
export function generateModificationHypotheses(
  opportunities: ImprovementOpportunity[],
): SelfModification[] {
  const modifications: SelfModification[] = [];

  for (const opportunity of opportunities) {
    switch (opportunity.category) {
      case "speed":
        modifications.push({
          type: "code_edit",
          target: opportunity.affectedOperations[0],
          change: `Optimize implementation to reduce latency from ${opportunity.currentValue.toFixed(0)}ms to ${opportunity.targetValue.toFixed(0)}ms`,
          hypothesis: `By optimizing ${opportunity.affectedOperations[0]}, we can reduce average latency by ${((1 - opportunity.targetValue / opportunity.currentValue) * 100).toFixed(0)}%`,
          reversible: true,
          testPeriod: 7,
          expectedImpact: {
            speedImprovement:
              ((opportunity.currentValue - opportunity.targetValue) /
                opportunity.currentValue) *
              100,
          },
        });
        break;

      case "cost":
        modifications.push({
          type: "strategy_update",
          target: opportunity.affectedOperations[0],
          change: `Switch to more cost-effective approach or model`,
          hypothesis: `By optimizing ${opportunity.affectedOperations[0]}, we can reduce average cost by ${((1 - opportunity.targetValue / opportunity.currentValue) * 100).toFixed(0)}%`,
          reversible: true,
          testPeriod: 7,
          expectedImpact: {
            costReduction:
              ((opportunity.currentValue - opportunity.targetValue) /
                opportunity.currentValue) *
              100,
          },
        });
        break;

      case "success_rate":
        modifications.push({
          type: "code_edit",
          target: opportunity.affectedOperations[0],
          change: `Add error handling and retry logic to improve success rate from ${(opportunity.currentValue * 100).toFixed(0)}% to ${(opportunity.targetValue * 100).toFixed(0)}%`,
          hypothesis: `By improving error handling in ${opportunity.affectedOperations[0]}, we can increase success rate by ${((opportunity.targetValue - opportunity.currentValue) * 100).toFixed(0)} percentage points`,
          reversible: true,
          testPeriod: 7,
          expectedImpact: {
            successRateIncrease:
              (opportunity.targetValue - opportunity.currentValue) * 100,
          },
        });
        break;
    }
  }

  return modifications;
}

/**
 * Propose improvements based on performance analysis
 * This is the main entry point for the modification proposal system
 */
export function proposeImprovement(
  db: OrdoDatabase,
  lookbackTurns: number = 100,
): {
  analysis: BottleneckAnalysis;
  opportunities: ImprovementOpportunity[];
  modifications: SelfModification[];
} {
  const analysis = analyzeBottlenecks(db, lookbackTurns);
  const opportunities = identifyImprovementOpportunities(analysis);
  const modifications = generateModificationHypotheses(opportunities);

  return {
    analysis,
    opportunities,
    modifications,
  };
}
