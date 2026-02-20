/**
 * Cost tracking system
 * 
 * Implements Requirement 3.4: Economic Survival Model
 * 
 * Tracks and charges agents for:
 * - AI inference costs (per model, per token)
 * - Transaction fees (Solana transactions)
 * - Storage costs (database, on-chain storage)
 * - Compute costs (execution time)
 */

import type { Agent } from "../types.js";

/**
 * Cost types
 */
export type CostType = "inference" | "transaction" | "storage" | "compute" | "other";

/**
 * Cost record for analytics
 */
export interface CostRecord {
  id: string;
  agentId: string;
  timestamp: Date;
  type: CostType;
  amount: number;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Cost tracking result
 */
export interface CostTrackingResult {
  costId: string;
  agentId: string;
  previousBalance: number;
  newBalance: number;
  costAmount: number;
  costType: CostType;
  timestamp: Date;
}

/**
 * In-memory cost history storage (in production, this would be in Supabase)
 */
const costHistory: Map<string, CostRecord[]> = new Map();

/**
 * Track and charge costs for an agent operation
 * 
 * This function deducts costs from the agent's balance in real-time
 * and stores the cost record for analytics.
 * 
 * @param agent - The agent to charge
 * @param costType - Type of cost (inference, transaction, storage, compute, other)
 * @param amount - Cost amount in SOL
 * @param description - Description of the operation
 * @param metadata - Optional metadata for analytics
 * @param timestamp - Optional timestamp for the cost (defaults to current time)
 * @returns Cost tracking result
 * 
 * Implements Requirement 3.4: Charge agents for compute usage
 * Validates Property 14: Compute Cost Charging
 */
export function trackCosts(
  agent: Agent,
  costType: CostType,
  amount: number,
  description: string,
  metadata?: Record<string, unknown>,
  timestamp?: Date
): CostTrackingResult {
  // Validate cost amount
  if (amount < 0) {
    throw new Error("Cost amount cannot be negative");
  }
  
  if (!isFinite(amount)) {
    throw new Error("Cost amount must be finite");
  }
  
  // Store previous balance
  const previousBalance = agent.balance;
  
  // Deduct cost from agent balance
  agent.balance = Math.max(0, agent.balance - amount);
  
  // Update total costs
  agent.totalCosts += amount;
  
  // Update timestamp
  const now = timestamp || new Date();
  agent.updatedAt = now;
  
  // Create cost record
  const costRecord: CostRecord = {
    id: generateCostId(),
    agentId: agent.id,
    timestamp: now,
    type: costType,
    amount,
    description,
    metadata,
  };
  
  // Store cost record in history
  if (!costHistory.has(agent.id)) {
    costHistory.set(agent.id, []);
  }
  costHistory.get(agent.id)!.push(costRecord);
  
  return {
    costId: costRecord.id,
    agentId: agent.id,
    previousBalance,
    newBalance: agent.balance,
    costAmount: amount,
    costType,
    timestamp: costRecord.timestamp,
  };
}

/**
 * Track inference costs for AI model usage
 * 
 * @param agent - The agent to charge
 * @param model - Model name
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @param costPerToken - Cost per token in SOL
 * @returns Cost tracking result
 */
export function trackInferenceCost(
  agent: Agent,
  model: string,
  inputTokens: number,
  outputTokens: number,
  costPerToken: number = 0.000001 // Default: 1 microSOL per token
): CostTrackingResult {
  const totalTokens = inputTokens + outputTokens;
  const cost = totalTokens * costPerToken;
  
  return trackCosts(
    agent,
    "inference",
    cost,
    `AI inference: ${model}`,
    {
      model,
      inputTokens,
      outputTokens,
      totalTokens,
      costPerToken,
    }
  );
}

/**
 * Track transaction costs for Solana operations
 * 
 * @param agent - The agent to charge
 * @param transactionType - Type of transaction
 * @param signature - Transaction signature
 * @param fee - Transaction fee in SOL
 * @returns Cost tracking result
 */
export function trackTransactionCost(
  agent: Agent,
  transactionType: string,
  signature: string,
  fee: number = 0.000005 // Default: 5000 lamports = 0.000005 SOL
): CostTrackingResult {
  return trackCosts(
    agent,
    "transaction",
    fee,
    `Transaction: ${transactionType}`,
    {
      transactionType,
      signature,
      fee,
    }
  );
}

/**
 * Track storage costs for database or on-chain storage
 * 
 * @param agent - The agent to charge
 * @param storageType - Type of storage (database, on-chain)
 * @param bytes - Number of bytes stored
 * @param costPerByte - Cost per byte in SOL
 * @returns Cost tracking result
 */
export function trackStorageCost(
  agent: Agent,
  storageType: string,
  bytes: number,
  costPerByte: number = 0.0000001 // Default: 0.1 microSOL per byte
): CostTrackingResult {
  const cost = bytes * costPerByte;
  
  return trackCosts(
    agent,
    "storage",
    cost,
    `Storage: ${storageType}`,
    {
      storageType,
      bytes,
      costPerByte,
    }
  );
}

/**
 * Track compute costs for execution time
 * 
 * @param agent - The agent to charge
 * @param operation - Operation name
 * @param durationMs - Duration in milliseconds
 * @param costPerSecond - Cost per second in SOL
 * @returns Cost tracking result
 */
export function trackComputeCost(
  agent: Agent,
  operation: string,
  durationMs: number,
  costPerSecond: number = 0.00001 // Default: 10 microSOL per second
): CostTrackingResult {
  const durationSeconds = durationMs / 1000;
  const cost = durationSeconds * costPerSecond;
  
  return trackCosts(
    agent,
    "compute",
    cost,
    `Compute: ${operation}`,
    {
      operation,
      durationMs,
      durationSeconds,
      costPerSecond,
    }
  );
}

/**
 * Get cost history for an agent
 * 
 * @param agentId - Agent ID
 * @param limit - Maximum number of records to return
 * @returns Array of cost records
 */
export function getCostHistory(agentId: string, limit?: number): CostRecord[] {
  const history = costHistory.get(agentId) || [];
  
  if (limit) {
    return history.slice(-limit);
  }
  
  return history;
}

/**
 * Get total costs by type for an agent
 * 
 * @param agentId - Agent ID
 * @returns Map of cost type to total amount
 */
export function getCostsByType(agentId: string): Map<CostType, number> {
  const history = costHistory.get(agentId) || [];
  const costsByType = new Map<CostType, number>();
  
  for (const record of history) {
    const current = costsByType.get(record.type) || 0;
    costsByType.set(record.type, current + record.amount);
  }
  
  return costsByType;
}

/**
 * Get total costs for an agent in a time period
 * 
 * @param agentId - Agent ID
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Total cost amount
 */
export function getCostsInPeriod(
  agentId: string,
  startDate: Date,
  endDate: Date
): number {
  const history = costHistory.get(agentId) || [];
  
  return history
    .filter(record => 
      record.timestamp >= startDate && record.timestamp <= endDate
    )
    .reduce((total, record) => total + record.amount, 0);
}

/**
 * Clear cost history for an agent (for testing)
 * 
 * @param agentId - Agent ID
 */
export function clearCostHistory(agentId: string): void {
  costHistory.delete(agentId);
}

/**
 * Clear all cost history (for testing)
 */
export function clearAllCostHistory(): void {
  costHistory.clear();
}

/**
 * Generate a unique cost ID
 */
function generateCostId(): string {
  return `cost_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
