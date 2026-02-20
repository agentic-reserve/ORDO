/**
 * Cost Reduction Validator
 * 
 * Validates 99.95% cost reduction vs EVM-based platforms.
 * Target: $0.0003 per agent per day on Solana vs $1.30 on EVM
 * 
 * Requirements: 23.6
 */

/**
 * Cost breakdown for an agent per day
 */
export interface AgentDailyCost {
  // Solana transaction costs
  transactionFees: number;
  transactionCount: number;
  
  // Compute costs (AI inference)
  inferenceCount: number;
  inferenceCost: number;
  
  // Storage costs
  storageCost: number;
  
  // Total cost
  totalCost: number;
}

/**
 * Platform cost comparison
 */
export interface PlatformCostComparison {
  solanaCostPerAgent: number;
  evmCostPerAgent: number;
  costReductionPercentage: number;
  costReductionRatio: number;
  meetsTarget: boolean;
}

/**
 * Cost metrics for tracking
 */
export interface CostMetrics {
  timestamp: Date;
  agentId: string;
  dailyCost: AgentDailyCost;
  comparison: PlatformCostComparison;
}

/**
 * Constants for cost calculation
 */
export const COST_CONSTANTS = {
  // Target costs
  TARGET_SOLANA_COST_PER_AGENT: 0.0003, // $0.0003 per agent per day
  TARGET_EVM_COST_PER_AGENT: 1.30, // $1.30 per agent per day (baseline)
  TARGET_COST_REDUCTION: 99.95, // 99.95% cost reduction
  
  // Solana costs (in USD)
  SOLANA_TX_FEE: 0.00025, // $0.00025 per transaction
  SOLANA_STORAGE_PER_KB_PER_DAY: 0.0000001, // Negligible storage cost
  
  // EVM costs (in USD) - Ethereum mainnet baseline
  EVM_TX_FEE_AVG: 1.30, // Average $1-50, using conservative $1.30
  EVM_STORAGE_PER_KB_PER_DAY: 0.001, // Higher storage costs
  
  // Typical agent activity per day
  TYPICAL_TX_COUNT_PER_DAY: 10, // 10 transactions per day
  TYPICAL_INFERENCE_COUNT_PER_DAY: 100, // 100 AI inferences per day
  TYPICAL_STORAGE_KB: 10, // 10 KB storage per agent
} as const;

/**
 * Calculate daily cost for an agent on Solana
 */
export function calculateSolanaDailyCost(
  transactionCount: number = COST_CONSTANTS.TYPICAL_TX_COUNT_PER_DAY,
  inferenceCount: number = COST_CONSTANTS.TYPICAL_INFERENCE_COUNT_PER_DAY,
  storageKB: number = COST_CONSTANTS.TYPICAL_STORAGE_KB,
  inferenceCostPerCall: number = 0.00001 // $0.00001 per inference (OpenRouter cheap models)
): AgentDailyCost {
  const transactionFees = transactionCount * COST_CONSTANTS.SOLANA_TX_FEE;
  const inferenceCost = inferenceCount * inferenceCostPerCall;
  const storageCost = storageKB * COST_CONSTANTS.SOLANA_STORAGE_PER_KB_PER_DAY;
  
  const totalCost = transactionFees + inferenceCost + storageCost;
  
  return {
    transactionFees,
    transactionCount,
    inferenceCount,
    inferenceCost,
    storageCost,
    totalCost,
  };
}

/**
 * Calculate daily cost for an agent on EVM (Ethereum)
 */
export function calculateEVMDailyCost(
  transactionCount: number = COST_CONSTANTS.TYPICAL_TX_COUNT_PER_DAY,
  inferenceCount: number = COST_CONSTANTS.TYPICAL_INFERENCE_COUNT_PER_DAY,
  storageKB: number = COST_CONSTANTS.TYPICAL_STORAGE_KB,
  inferenceCostPerCall: number = 0.00001 // Same inference cost
): AgentDailyCost {
  const transactionFees = transactionCount * COST_CONSTANTS.EVM_TX_FEE_AVG;
  const inferenceCost = inferenceCount * inferenceCostPerCall;
  const storageCost = storageKB * COST_CONSTANTS.EVM_STORAGE_PER_KB_PER_DAY;
  
  const totalCost = transactionFees + inferenceCost + storageCost;
  
  return {
    transactionFees,
    transactionCount,
    inferenceCount,
    inferenceCost,
    storageCost,
    totalCost,
  };
}

/**
 * Compare Solana vs EVM costs and calculate reduction percentage
 */
export function comparePlatformCosts(
  solanaCost: AgentDailyCost,
  evmCost: AgentDailyCost
): PlatformCostComparison {
  const solanaCostPerAgent = solanaCost.totalCost;
  const evmCostPerAgent = evmCost.totalCost;
  
  // Calculate cost reduction percentage
  const costReductionPercentage = 
    ((evmCostPerAgent - solanaCostPerAgent) / evmCostPerAgent) * 100;
  
  // Calculate cost reduction ratio (how many times cheaper)
  const costReductionRatio = evmCostPerAgent / solanaCostPerAgent;
  
  // Check if meets target (99.95% reduction)
  const meetsTarget = costReductionPercentage >= COST_CONSTANTS.TARGET_COST_REDUCTION;
  
  return {
    solanaCostPerAgent,
    evmCostPerAgent,
    costReductionPercentage,
    costReductionRatio,
    meetsTarget,
  };
}

/**
 * Validate that cost reduction target is met
 */
export function validateCostReduction(
  transactionCount?: number,
  inferenceCount?: number,
  storageKB?: number,
  inferenceCostPerCall?: number
): {
  valid: boolean;
  comparison: PlatformCostComparison;
  solanaCost: AgentDailyCost;
  evmCost: AgentDailyCost;
  message: string;
} {
  // Calculate costs for both platforms
  const solanaCost = calculateSolanaDailyCost(
    transactionCount,
    inferenceCount,
    storageKB,
    inferenceCostPerCall
  );
  
  const evmCost = calculateEVMDailyCost(
    transactionCount,
    inferenceCount,
    storageKB,
    inferenceCostPerCall
  );
  
  // Compare costs
  const comparison = comparePlatformCosts(solanaCost, evmCost);
  
  // Generate validation message
  let message: string;
  if (comparison.meetsTarget) {
    message = `✓ Cost reduction target met: ${comparison.costReductionPercentage.toFixed(2)}% reduction (${comparison.costReductionRatio.toFixed(0)}x cheaper). Solana: $${comparison.solanaCostPerAgent.toFixed(6)}/day vs EVM: $${comparison.evmCostPerAgent.toFixed(2)}/day`;
  } else {
    message = `✗ Cost reduction target NOT met: ${comparison.costReductionPercentage.toFixed(2)}% reduction (target: ${COST_CONSTANTS.TARGET_COST_REDUCTION}%). Solana: $${comparison.solanaCostPerAgent.toFixed(6)}/day vs EVM: $${comparison.evmCostPerAgent.toFixed(2)}/day`;
  }
  
  return {
    valid: comparison.meetsTarget,
    comparison,
    solanaCost,
    evmCost,
    message,
  };
}

/**
 * Track cost metrics for an agent
 */
export function trackCostMetrics(
  agentId: string,
  dailyCost: AgentDailyCost
): CostMetrics {
  // Calculate EVM cost for comparison
  const evmCost = calculateEVMDailyCost(
    dailyCost.transactionCount,
    dailyCost.inferenceCount,
    COST_CONSTANTS.TYPICAL_STORAGE_KB,
    dailyCost.inferenceCost / dailyCost.inferenceCount
  );
  
  const comparison = comparePlatformCosts(dailyCost, evmCost);
  
  return {
    timestamp: new Date(),
    agentId,
    dailyCost,
    comparison,
  };
}

/**
 * Generate cost reduction report
 */
export function generateCostReport(metrics: CostMetrics[]): {
  totalAgents: number;
  avgSolanaCost: number;
  avgEVMCost: number;
  avgCostReduction: number;
  totalSavings: number;
  meetsTarget: boolean;
  summary: string;
} {
  if (metrics.length === 0) {
    return {
      totalAgents: 0,
      avgSolanaCost: 0,
      avgEVMCost: 0,
      avgCostReduction: 0,
      totalSavings: 0,
      meetsTarget: false,
      summary: 'No cost metrics available',
    };
  }
  
  const totalAgents = metrics.length;
  
  // Calculate averages
  const avgSolanaCost = 
    metrics.reduce((sum, m) => sum + m.comparison.solanaCostPerAgent, 0) / totalAgents;
  
  const avgEVMCost = 
    metrics.reduce((sum, m) => sum + m.comparison.evmCostPerAgent, 0) / totalAgents;
  
  const avgCostReduction = 
    metrics.reduce((sum, m) => sum + m.comparison.costReductionPercentage, 0) / totalAgents;
  
  // Calculate total savings
  const totalSavings = (avgEVMCost - avgSolanaCost) * totalAgents;
  
  // Check if meets target
  const meetsTarget = avgCostReduction >= COST_CONSTANTS.TARGET_COST_REDUCTION;
  
  // Generate summary
  const summary = `
Cost Reduction Report
=====================
Total Agents: ${totalAgents}
Average Solana Cost: $${avgSolanaCost.toFixed(6)}/agent/day
Average EVM Cost: $${avgEVMCost.toFixed(2)}/agent/day
Average Cost Reduction: ${avgCostReduction.toFixed(2)}%
Total Daily Savings: $${totalSavings.toFixed(2)}/day
Annual Savings: $${(totalSavings * 365).toFixed(2)}/year
Target Met: ${meetsTarget ? '✓ YES' : '✗ NO'}
  `.trim();
  
  return {
    totalAgents,
    avgSolanaCost,
    avgEVMCost,
    avgCostReduction,
    totalSavings,
    meetsTarget,
    summary,
  };
}

/**
 * Validate cost reduction with realistic agent activity
 */
export function validateRealisticCostReduction(): {
  valid: boolean;
  scenarios: Array<{
    name: string;
    result: ReturnType<typeof validateCostReduction>;
  }>;
  summary: string;
} {
  const scenarios = [
    {
      name: 'Low Activity Agent (1 tx/day, 10 inferences/day)',
      result: validateCostReduction(1, 10, 5, 0.00001),
    },
    {
      name: 'Normal Activity Agent (10 tx/day, 100 inferences/day)',
      result: validateCostReduction(10, 100, 10, 0.00001),
    },
    {
      name: 'High Activity Agent (50 tx/day, 500 inferences/day)',
      result: validateCostReduction(50, 500, 20, 0.00001),
    },
    {
      name: 'Very High Activity Agent (100 tx/day, 1000 inferences/day)',
      result: validateCostReduction(100, 1000, 50, 0.00001),
    },
  ];
  
  // Check if all scenarios meet target
  const allValid = scenarios.every(s => s.result.valid);
  
  // Generate summary
  const summary = scenarios
    .map(s => `${s.name}:\n  ${s.result.message}`)
    .join('\n\n');
  
  return {
    valid: allValid,
    scenarios,
    summary: `Cost Reduction Validation Across Activity Levels\n${'='.repeat(50)}\n\n${summary}`,
  };
}

