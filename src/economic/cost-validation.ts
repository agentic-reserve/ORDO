/**
 * Cost validation system for EVM comparison
 * 
 * Implements Requirement 23.6: Cost Optimization and FinOps
 * 
 * Validates that Ordo achieves 99.95% cost reduction vs EVM-based platforms
 * Target: $0.0003 per agent per day (vs $1.30 on EVM)
 */

import type { Agent } from "../types.js";
import { getCostsInPeriod } from "./cost-tracking.js";

/**
 * Cost comparison constants
 */
export const COST_CONSTANTS = {
  // Target cost per agent per day on Solana (in SOL)
  TARGET_COST_PER_AGENT_PER_DAY_SOL: 0.0003,
  
  // EVM baseline cost per agent per day (in USD)
  EVM_BASELINE_COST_USD: 1.30,
  
  // Target cost reduction percentage
  TARGET_COST_REDUCTION_PERCENT: 99.95,
  
  // SOL to USD conversion rate (approximate, should be updated from oracle)
  SOL_TO_USD_RATE: 100, // $100 per SOL (example rate)
} as const;

/**
 * Cost validation result
 */
export interface CostValidationResult {
  agentId: string;
  periodDays: number;
  totalCostSOL: number;
  totalCostUSD: number;
  costPerDaySOL: number;
  costPerDayUSD: number;
  evmBaselineCostUSD: number;
  costReductionPercent: number;
  meetsTarget: boolean;
  targetCostPerDaySOL: number;
  targetCostPerDayUSD: number;
  savings: {
    absoluteUSD: number;
    percentReduction: number;
  };
}

/**
 * Population cost metrics
 */
export interface PopulationCostMetrics {
  totalAgents: number;
  periodDays: number;
  totalCostSOL: number;
  totalCostUSD: number;
  avgCostPerAgentPerDaySOL: number;
  avgCostPerAgentPerDayUSD: number;
  evmEquivalentCostUSD: number;
  totalSavingsUSD: number;
  avgCostReductionPercent: number;
  agentsMeetingTarget: number;
  percentMeetingTarget: number;
}

/**
 * Calculate cost per agent per day
 * 
 * @param agent - The agent to calculate costs for
 * @param startDate - Start date of the period
 * @param endDate - End date of the period
 * @param solToUsdRate - SOL to USD conversion rate (optional, uses default if not provided)
 * @returns Cost validation result
 * 
 * Implements Requirement 23.6: Calculate cost per agent per day
 */
export function calculateCostPerAgentPerDay(
  agent: Agent,
  startDate: Date,
  endDate: Date,
  solToUsdRate: number = COST_CONSTANTS.SOL_TO_USD_RATE
): CostValidationResult {
  // Calculate period in days
  const periodMs = endDate.getTime() - startDate.getTime();
  const periodDays = periodMs / (1000 * 60 * 60 * 24);
  
  if (periodDays <= 0) {
    throw new Error("End date must be after start date");
  }
  
  // Get total costs in the period
  const totalCostSOL = getCostsInPeriod(agent.id, startDate, endDate);
  
  // Convert to USD
  const totalCostUSD = totalCostSOL * solToUsdRate;
  
  // Calculate cost per day
  const costPerDaySOL = totalCostSOL / periodDays;
  const costPerDayUSD = totalCostUSD / periodDays;
  
  // Calculate EVM baseline cost for the same period
  const evmBaselineCostUSD = COST_CONSTANTS.EVM_BASELINE_COST_USD * periodDays;
  
  // Calculate cost reduction
  const costReductionPercent = ((evmBaselineCostUSD - totalCostUSD) / evmBaselineCostUSD) * 100;
  
  // Check if meets target
  const targetCostPerDaySOL = COST_CONSTANTS.TARGET_COST_PER_AGENT_PER_DAY_SOL;
  const targetCostPerDayUSD = targetCostPerDaySOL * solToUsdRate;
  const meetsTarget = costPerDaySOL <= targetCostPerDaySOL;
  
  // Calculate savings
  const absoluteSavingsUSD = evmBaselineCostUSD - totalCostUSD;
  
  return {
    agentId: agent.id,
    periodDays,
    totalCostSOL,
    totalCostUSD,
    costPerDaySOL,
    costPerDayUSD,
    evmBaselineCostUSD,
    costReductionPercent,
    meetsTarget,
    targetCostPerDaySOL,
    targetCostPerDayUSD,
    savings: {
      absoluteUSD: absoluteSavingsUSD,
      percentReduction: costReductionPercent,
    },
  };
}

/**
 * Validate cost reduction vs EVM baseline
 * 
 * @param agent - The agent to validate
 * @param startDate - Start date of the period
 * @param endDate - End date of the period
 * @param solToUsdRate - SOL to USD conversion rate (optional)
 * @returns True if cost reduction meets or exceeds target (99.95%)
 * 
 * Implements Requirement 23.6: Compare to EVM baseline
 */
export function validateCostReduction(
  agent: Agent,
  startDate: Date,
  endDate: Date,
  solToUsdRate?: number
): boolean {
  const result = calculateCostPerAgentPerDay(agent, startDate, endDate, solToUsdRate);
  return result.costReductionPercent >= COST_CONSTANTS.TARGET_COST_REDUCTION_PERCENT;
}

/**
 * Calculate population-wide cost metrics
 * 
 * @param agents - Array of agents to analyze
 * @param startDate - Start date of the period
 * @param endDate - End date of the period
 * @param solToUsdRate - SOL to USD conversion rate (optional)
 * @returns Population cost metrics
 * 
 * Implements Requirement 23.6: Track cost metrics across population
 */
export function calculatePopulationCostMetrics(
  agents: Agent[],
  startDate: Date,
  endDate: Date,
  solToUsdRate: number = COST_CONSTANTS.SOL_TO_USD_RATE
): PopulationCostMetrics {
  if (agents.length === 0) {
    throw new Error("Cannot calculate metrics for empty population");
  }
  
  // Calculate period in days
  const periodMs = endDate.getTime() - startDate.getTime();
  const periodDays = periodMs / (1000 * 60 * 60 * 24);
  
  // Calculate individual agent metrics
  const agentResults = agents.map(agent => 
    calculateCostPerAgentPerDay(agent, startDate, endDate, solToUsdRate)
  );
  
  // Aggregate metrics
  const totalCostSOL = agentResults.reduce((sum, r) => sum + r.totalCostSOL, 0);
  const totalCostUSD = agentResults.reduce((sum, r) => sum + r.totalCostUSD, 0);
  const avgCostPerAgentPerDaySOL = agentResults.reduce((sum, r) => sum + r.costPerDaySOL, 0) / agents.length;
  const avgCostPerAgentPerDayUSD = agentResults.reduce((sum, r) => sum + r.costPerDayUSD, 0) / agents.length;
  const avgCostReductionPercent = agentResults.reduce((sum, r) => sum + r.costReductionPercent, 0) / agents.length;
  
  // Calculate EVM equivalent cost
  const evmEquivalentCostUSD = COST_CONSTANTS.EVM_BASELINE_COST_USD * agents.length * periodDays;
  
  // Calculate total savings
  const totalSavingsUSD = evmEquivalentCostUSD - totalCostUSD;
  
  // Count agents meeting target
  const agentsMeetingTarget = agentResults.filter(r => r.meetsTarget).length;
  const percentMeetingTarget = (agentsMeetingTarget / agents.length) * 100;
  
  return {
    totalAgents: agents.length,
    periodDays,
    totalCostSOL,
    totalCostUSD,
    avgCostPerAgentPerDaySOL,
    avgCostPerAgentPerDayUSD,
    evmEquivalentCostUSD,
    totalSavingsUSD,
    avgCostReductionPercent,
    agentsMeetingTarget,
    percentMeetingTarget,
  };
}

/**
 * Generate cost comparison report
 * 
 * @param agent - The agent to generate report for
 * @param startDate - Start date of the period
 * @param endDate - End date of the period
 * @param solToUsdRate - SOL to USD conversion rate (optional)
 * @returns Formatted cost comparison report
 */
export function generateCostComparisonReport(
  agent: Agent,
  startDate: Date,
  endDate: Date,
  solToUsdRate?: number
): string {
  const result = calculateCostPerAgentPerDay(agent, startDate, endDate, solToUsdRate);
  
  const lines = [
    "=".repeat(60),
    "COST COMPARISON REPORT: SOLANA vs EVM",
    "=".repeat(60),
    "",
    `Agent ID: ${result.agentId}`,
    `Period: ${result.periodDays.toFixed(2)} days`,
    "",
    "SOLANA COSTS:",
    `  Total Cost: ${result.totalCostSOL.toFixed(6)} SOL ($${result.totalCostUSD.toFixed(4)})`,
    `  Cost per Day: ${result.costPerDaySOL.toFixed(6)} SOL ($${result.costPerDayUSD.toFixed(4)})`,
    "",
    "EVM BASELINE:",
    `  Total Cost: $${result.evmBaselineCostUSD.toFixed(2)}`,
    `  Cost per Day: $${COST_CONSTANTS.EVM_BASELINE_COST_USD.toFixed(2)}`,
    "",
    "COST REDUCTION:",
    `  Absolute Savings: $${result.savings.absoluteUSD.toFixed(2)}`,
    `  Percent Reduction: ${result.costReductionPercent.toFixed(2)}%`,
    `  Target Reduction: ${COST_CONSTANTS.TARGET_COST_REDUCTION_PERCENT}%`,
    "",
    "TARGET VALIDATION:",
    `  Target Cost per Day: ${result.targetCostPerDaySOL.toFixed(6)} SOL ($${result.targetCostPerDayUSD.toFixed(4)})`,
    `  Actual Cost per Day: ${result.costPerDaySOL.toFixed(6)} SOL ($${result.costPerDayUSD.toFixed(4)})`,
    `  Meets Target: ${result.meetsTarget ? "✅ YES" : "❌ NO"}`,
    "",
    "=".repeat(60),
  ];
  
  return lines.join("\n");
}

/**
 * Generate population cost report
 * 
 * @param agents - Array of agents to analyze
 * @param startDate - Start date of the period
 * @param endDate - End date of the period
 * @param solToUsdRate - SOL to USD conversion rate (optional)
 * @returns Formatted population cost report
 */
export function generatePopulationCostReport(
  agents: Agent[],
  startDate: Date,
  endDate: Date,
  solToUsdRate?: number
): string {
  const metrics = calculatePopulationCostMetrics(agents, startDate, endDate, solToUsdRate);
  
  const lines = [
    "=".repeat(60),
    "POPULATION COST METRICS: SOLANA vs EVM",
    "=".repeat(60),
    "",
    `Total Agents: ${metrics.totalAgents}`,
    `Period: ${metrics.periodDays.toFixed(2)} days`,
    "",
    "SOLANA COSTS:",
    `  Total Cost: ${metrics.totalCostSOL.toFixed(6)} SOL ($${metrics.totalCostUSD.toFixed(2)})`,
    `  Avg Cost per Agent per Day: ${metrics.avgCostPerAgentPerDaySOL.toFixed(6)} SOL ($${metrics.avgCostPerAgentPerDayUSD.toFixed(4)})`,
    "",
    "EVM EQUIVALENT:",
    `  Total Cost: $${metrics.evmEquivalentCostUSD.toFixed(2)}`,
    `  Cost per Agent per Day: $${COST_CONSTANTS.EVM_BASELINE_COST_USD.toFixed(2)}`,
    "",
    "COST REDUCTION:",
    `  Total Savings: $${metrics.totalSavingsUSD.toFixed(2)}`,
    `  Avg Reduction: ${metrics.avgCostReductionPercent.toFixed(2)}%`,
    `  Target Reduction: ${COST_CONSTANTS.TARGET_COST_REDUCTION_PERCENT}%`,
    "",
    "TARGET VALIDATION:",
    `  Agents Meeting Target: ${metrics.agentsMeetingTarget} / ${metrics.totalAgents} (${metrics.percentMeetingTarget.toFixed(1)}%)`,
    "",
    "=".repeat(60),
  ];
  
  return lines.join("\n");
}
