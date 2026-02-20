/**
 * Bottleneck Analysis System
 *
 * Analyzes agent performance to identify bottlenecks and improvement opportunities.
 * Implements Requirements 16.1.
 */

import type { OrdoDatabase, Agent, AgentTurn, ToolCallResult } from "../types/index.js";

/**
 * Performance bottleneck detected in agent operations
 */
export interface PerformanceBottleneck {
  type: "slow_operation" | "high_cost" | "low_success_rate";
  operation: string;
  severity: "critical" | "high" | "medium" | "low";
  currentValue: number;
  targetValue: number;
  impact: number; // 0-100 score
  affectedOperations: number;
  recommendation: string;
}

/**
 * Comprehensive bottleneck analysis result
 */
export interface BottleneckAnalysisResult {
  agentId: string;
  analyzedAt: Date;
  analysisWindowDays: number;
  
  // Detected bottlenecks
  bottlenecks: PerformanceBottleneck[];
  
  // Overall metrics
  overallMetrics: {
    avgLatencyMs: number;
    avgCostCents: number;
    successRate: number;
    totalOperations: number;
  };
  
  // Prioritized improvement opportunities
  topOpportunities: ImprovementOpportunity[];
}

/**
 * Improvement opportunity identified from bottleneck analysis
 */
export interface ImprovementOpportunity {
  id: string;
  category: "speed" | "cost" | "reliability";
  description: string;
  currentMetric: number;
  targetMetric: number;
  expectedImpact: number; // 0-100 score
  priority: "critical" | "high" | "medium" | "low";
  estimatedEffort: "low" | "medium" | "high";
  affectedOperations: string[];
}

/**
 * Analyze agent performance to identify bottlenecks
 * 
 * This function examines recent agent operations to detect:
 * - Slow operations (high latency)
 * - High cost operations (expensive inference or tools)
 * - Low success rate operations (frequent failures)
 */
export async function analyzeBottlenecks(
  db: OrdoDatabase,
  agentId: string,
  windowDays: number = 7
): Promise<BottleneckAnalysisResult> {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - windowDays);
  
  // Get recent turns for analysis
  const recentTurns = await db.getRecentTurns(agentId, 1000);
  
  // Analyze tool call performance
  const toolStats = await analyzeToolPerformance(recentTurns);
  
  // Analyze inference costs
  const costStats = await analyzeInferenceCosts(db, agentId, startDate, endDate);
  
  // Detect bottlenecks
  const bottlenecks = detectBottlenecks(toolStats, costStats);
  
  // Calculate overall metrics
  const overallMetrics = calculateOverallMetrics(recentTurns);
  
  // Identify and prioritize improvement opportunities
  const topOpportunities = identifyImprovementOpportunities(bottlenecks);
  
  return {
    agentId,
    analyzedAt: new Date(),
    analysisWindowDays: windowDays,
    bottlenecks,
    overallMetrics,
    topOpportunities,
  };
}

/**
 * Analyze tool call performance to identify slow or failing tools
 */
async function analyzeToolPerformance(turns: AgentTurn[]): Promise<Map<string, {
  count: number;
  totalLatency: number;
  avgLatency: number;
  successCount: number;
  failureCount: number;
  successRate: number;
}>> {
  const toolStats = new Map<string, {
    count: number;
    totalLatency: number;
    avgLatency: number;
    successCount: number;
    failureCount: number;
    successRate: number;
  }>();
  
  for (const turn of turns) {
    if (!turn.toolCalls) continue;
    
    for (const toolCall of turn.toolCalls) {
      const stats = toolStats.get(toolCall.toolName) || {
        count: 0,
        totalLatency: 0,
        avgLatency: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
      };
      
      stats.count += 1;
      stats.totalLatency += toolCall.latency;
      
      if (toolCall.success) {
        stats.successCount += 1;
      } else {
        stats.failureCount += 1;
      }
      
      toolStats.set(toolCall.toolName, stats);
    }
  }
  
  // Calculate averages
  for (const [toolName, stats] of toolStats.entries()) {
    stats.avgLatency = stats.totalLatency / stats.count;
    stats.successRate = stats.successCount / stats.count;
    toolStats.set(toolName, stats);
  }
  
  return toolStats;
}

/**
 * Analyze inference costs to identify expensive models or operations
 */
async function analyzeInferenceCosts(
  db: OrdoDatabase,
  agentId: string,
  startDate: Date,
  endDate: Date
): Promise<Map<string, {
  count: number;
  totalCost: number;
  avgCost: number;
}>> {
  const costs = await db.getInferenceCosts(agentId, startDate, endDate);
  const costStats = new Map<string, {
    count: number;
    totalCost: number;
    avgCost: number;
  }>();
  
  for (const cost of costs) {
    const stats = costStats.get(cost.model) || {
      count: 0,
      totalCost: 0,
      avgCost: 0,
    };
    
    stats.count += 1;
    stats.totalCost += cost.cost;
    
    costStats.set(cost.model, stats);
  }
  
  // Calculate averages
  for (const [model, stats] of costStats.entries()) {
    stats.avgCost = stats.totalCost / stats.count;
    costStats.set(model, stats);
  }
  
  return costStats;
}

/**
 * Detect bottlenecks from performance statistics
 */
function detectBottlenecks(
  toolStats: Map<string, any>,
  costStats: Map<string, any>
): PerformanceBottleneck[] {
  const bottlenecks: PerformanceBottleneck[] = [];
  
  // Detect slow operations (latency > 1000ms)
  for (const [toolName, stats] of toolStats.entries()) {
    if (stats.avgLatency > 1000) {
      const severity = classifySeverity(stats.avgLatency, 1000, 2000, 5000);
      const impact = calculateImpact(stats.avgLatency, 1000, stats.count);
      
      bottlenecks.push({
        type: "slow_operation",
        operation: toolName,
        severity,
        currentValue: stats.avgLatency,
        targetValue: 500, // Target 500ms
        impact,
        affectedOperations: stats.count,
        recommendation: `Optimize ${toolName} to reduce latency from ${stats.avgLatency.toFixed(0)}ms to 500ms`,
      });
    }
  }
  
  // Detect high cost operations (cost > 1 cent)
  for (const [model, stats] of costStats.entries()) {
    if (stats.avgCost > 1) {
      const severity = classifySeverity(stats.avgCost, 1, 5, 10);
      const impact = calculateImpact(stats.avgCost, 1, stats.count);
      
      bottlenecks.push({
        type: "high_cost",
        operation: model,
        severity,
        currentValue: stats.avgCost,
        targetValue: 0.5, // Target 0.5 cents
        impact,
        affectedOperations: stats.count,
        recommendation: `Switch to more cost-effective model or optimize ${model} usage`,
      });
    }
  }
  
  // Detect low success rate operations (success rate < 90%)
  for (const [toolName, stats] of toolStats.entries()) {
    if (stats.successRate < 0.9) {
      const severity = classifySeverity(1 - stats.successRate, 0.1, 0.2, 0.5);
      const impact = calculateImpact(1 - stats.successRate, 0.1, stats.count);
      
      bottlenecks.push({
        type: "low_success_rate",
        operation: toolName,
        severity,
        currentValue: stats.successRate * 100,
        targetValue: 95, // Target 95% success rate
        impact,
        affectedOperations: stats.count,
        recommendation: `Improve error handling and retry logic for ${toolName}`,
      });
    }
  }
  
  // Sort by impact (highest first)
  bottlenecks.sort((a, b) => b.impact - a.impact);
  
  return bottlenecks;
}

/**
 * Classify severity based on value and thresholds
 */
function classifySeverity(
  value: number,
  mediumThreshold: number,
  highThreshold: number,
  criticalThreshold: number
): "critical" | "high" | "medium" | "low" {
  if (value >= criticalThreshold) return "critical";
  if (value >= highThreshold) return "high";
  if (value >= mediumThreshold) return "medium";
  return "low";
}

/**
 * Calculate impact score (0-100) based on deviation and frequency
 */
function calculateImpact(
  currentValue: number,
  threshold: number,
  frequency: number
): number {
  // Impact = (deviation from threshold) * (frequency weight)
  const deviation = Math.max(0, currentValue - threshold) / threshold;
  const frequencyWeight = Math.min(1, frequency / 100); // Normalize to 0-1
  
  return Math.min(100, deviation * frequencyWeight * 100);
}

/**
 * Calculate overall performance metrics
 */
function calculateOverallMetrics(turns: AgentTurn[]): {
  avgLatencyMs: number;
  avgCostCents: number;
  successRate: number;
  totalOperations: number;
} {
  if (turns.length === 0) {
    return {
      avgLatencyMs: 0,
      avgCostCents: 0,
      successRate: 1.0,
      totalOperations: 0,
    };
  }
  
  let totalLatency = 0;
  let totalCost = 0;
  let totalOperations = 0;
  let successfulOperations = 0;
  
  for (const turn of turns) {
    if (turn.toolCalls) {
      for (const toolCall of turn.toolCalls) {
        totalLatency += toolCall.latency;
        totalOperations += 1;
        if (toolCall.success) {
          successfulOperations += 1;
        }
      }
    }
    
    if (turn.cost) {
      totalCost += turn.cost;
    }
  }
  
  return {
    avgLatencyMs: totalOperations > 0 ? totalLatency / totalOperations : 0,
    avgCostCents: turns.length > 0 ? totalCost / turns.length : 0,
    successRate: totalOperations > 0 ? successfulOperations / totalOperations : 1.0,
    totalOperations,
  };
}

/**
 * Identify and prioritize improvement opportunities from bottlenecks
 */
function identifyImprovementOpportunities(
  bottlenecks: PerformanceBottleneck[]
): ImprovementOpportunity[] {
  const opportunities: ImprovementOpportunity[] = [];
  
  for (const bottleneck of bottlenecks) {
    const opportunity: ImprovementOpportunity = {
      id: `opp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      category: bottleneck.type === "slow_operation" ? "speed" :
                bottleneck.type === "high_cost" ? "cost" : "reliability",
      description: bottleneck.recommendation,
      currentMetric: bottleneck.currentValue,
      targetMetric: bottleneck.targetValue,
      expectedImpact: bottleneck.impact,
      priority: bottleneck.severity,
      estimatedEffort: estimateEffort(bottleneck),
      affectedOperations: [bottleneck.operation],
    };
    
    opportunities.push(opportunity);
  }
  
  // Sort by priority and impact
  opportunities.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    
    if (priorityDiff !== 0) return priorityDiff;
    return b.expectedImpact - a.expectedImpact;
  });
  
  // Return top 10 opportunities
  return opportunities.slice(0, 10);
}

/**
 * Estimate effort required to address a bottleneck
 */
function estimateEffort(bottleneck: PerformanceBottleneck): "low" | "medium" | "high" {
  // Simple heuristic based on type and severity
  if (bottleneck.type === "high_cost") {
    return "low"; // Usually just switching models
  }
  
  if (bottleneck.type === "slow_operation") {
    return bottleneck.severity === "critical" ? "high" : "medium";
  }
  
  if (bottleneck.type === "low_success_rate") {
    return "medium"; // Requires error handling improvements
  }
  
  return "medium";
}

/**
 * Prioritize improvement opportunities by impact
 * 
 * Returns the top N opportunities sorted by expected impact
 */
export function prioritizeImprovementOpportunities(
  opportunities: ImprovementOpportunity[],
  limit: number = 5
): ImprovementOpportunity[] {
  return opportunities
    .sort((a, b) => {
      // First by priority
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by impact
      return b.expectedImpact - a.expectedImpact;
    })
    .slice(0, limit);
}
