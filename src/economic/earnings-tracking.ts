/**
 * Earnings tracking system
 * 
 * Implements Requirement 3.5: Enable agents to earn SOL through value creation
 * Implements Requirement 3.6: Track economic performance as a fitness metric
 * 
 * Tracks earnings from:
 * - Trading (DeFi operations, token swaps)
 * - Services (tasks completed for other agents or users)
 * - Tasks (bounties, rewards, payments)
 * - Other value creation activities
 */

import type { Agent } from "../types.js";

/**
 * Earnings source types
 */
export type EarningsSource = "trading" | "services" | "tasks" | "other";

/**
 * Earnings record for analytics
 */
export interface EarningsRecord {
  id: string;
  agentId: string;
  timestamp: Date;
  source: EarningsSource;
  amount: number;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Earnings tracking result
 */
export interface EarningsTrackingResult {
  earningsId: string;
  agentId: string;
  previousBalance: number;
  newBalance: number;
  earningsAmount: number;
  earningsSource: EarningsSource;
  timestamp: Date;
}

/**
 * Economic fitness metrics
 */
export interface EconomicFitnessMetrics {
  totalEarnings: number;
  totalCosts: number;
  netProfit: number;
  profitMargin: number;
  earningsRate: number;        // Earnings per day
  earningsBySource: Map<EarningsSource, number>;
  economicFitness: number;     // Overall economic fitness score (0-100)
}

/**
 * In-memory earnings history storage (in production, this would be in Supabase)
 */
const earningsHistory: Map<string, EarningsRecord[]> = new Map();

/**
 * Track earnings for an agent
 * 
 * This function adds earnings to the agent's balance and stores
 * the earnings record for analytics and fitness calculation.
 * 
 * @param agent - The agent earning SOL
 * @param source - Source of earnings (trading, services, tasks, other)
 * @param amount - Earnings amount in SOL
 * @param description - Description of the value creation activity
 * @param metadata - Optional metadata for analytics
 * @returns Earnings tracking result
 * 
 * Implements Requirement 3.5: Enable agents to earn SOL through value creation
 * Validates Property 15: Fitness Tracking
 */
export function trackEarnings(
  agent: Agent,
  source: EarningsSource,
  amount: number,
  description: string,
  metadata?: Record<string, unknown>
): EarningsTrackingResult {
  // Validate earnings amount
  if (amount < 0) {
    throw new Error("Earnings amount cannot be negative");
  }
  
  if (!isFinite(amount)) {
    throw new Error("Earnings amount must be finite");
  }
  
  // Store previous balance
  const previousBalance = agent.balance;
  
  // Add earnings to agent balance
  agent.balance += amount;
  
  // Update total earnings
  agent.totalEarnings += amount;
  
  // Update fitness metrics
  agent.fitness.earnings += amount;
  
  // Update timestamp
  agent.updatedAt = new Date();
  
  // Create earnings record
  const earningsRecord: EarningsRecord = {
    id: generateEarningsId(),
    agentId: agent.id,
    timestamp: new Date(),
    source,
    amount,
    description,
    metadata,
  };
  
  // Store earnings record in history
  if (!earningsHistory.has(agent.id)) {
    earningsHistory.set(agent.id, []);
  }
  earningsHistory.get(agent.id)!.push(earningsRecord);
  
  return {
    earningsId: earningsRecord.id,
    agentId: agent.id,
    previousBalance,
    newBalance: agent.balance,
    earningsAmount: amount,
    earningsSource: source,
    timestamp: earningsRecord.timestamp,
  };
}

/**
 * Track trading earnings
 * 
 * @param agent - The agent earning from trading
 * @param tradingPair - Trading pair (e.g., "SOL/USDC")
 * @param profit - Profit amount in SOL
 * @param transactionSignature - Transaction signature
 * @returns Earnings tracking result
 */
export function trackTradingEarnings(
  agent: Agent,
  tradingPair: string,
  profit: number,
  transactionSignature?: string
): EarningsTrackingResult {
  return trackEarnings(
    agent,
    "trading",
    profit,
    `Trading profit: ${tradingPair}`,
    {
      tradingPair,
      profit,
      transactionSignature,
    }
  );
}

/**
 * Track service earnings
 * 
 * @param agent - The agent earning from services
 * @param serviceType - Type of service provided
 * @param payment - Payment amount in SOL
 * @param clientId - Client agent or user ID
 * @returns Earnings tracking result
 */
export function trackServiceEarnings(
  agent: Agent,
  serviceType: string,
  payment: number,
  clientId?: string
): EarningsTrackingResult {
  return trackEarnings(
    agent,
    "services",
    payment,
    `Service: ${serviceType}`,
    {
      serviceType,
      payment,
      clientId,
    }
  );
}

/**
 * Track task earnings
 * 
 * @param agent - The agent earning from task completion
 * @param taskId - Task identifier
 * @param reward - Reward amount in SOL
 * @param taskDescription - Description of the task
 * @returns Earnings tracking result
 */
export function trackTaskEarnings(
  agent: Agent,
  taskId: string,
  reward: number,
  taskDescription: string
): EarningsTrackingResult {
  return trackEarnings(
    agent,
    "tasks",
    reward,
    `Task completed: ${taskDescription}`,
    {
      taskId,
      reward,
      taskDescription,
    }
  );
}

/**
 * Calculate economic fitness metrics for an agent
 * 
 * This function calculates comprehensive economic performance metrics
 * used for natural selection and evolution.
 * 
 * @param agent - The agent to calculate fitness for
 * @returns Economic fitness metrics
 * 
 * Implements Requirement 3.6: Track economic performance as a fitness metric
 * Validates Property 15: Fitness Tracking
 */
export function calculateEconomicFitness(agent: Agent): EconomicFitnessMetrics {
  const history = earningsHistory.get(agent.id) || [];
  
  // Calculate total earnings by source
  const earningsBySource = new Map<EarningsSource, number>();
  for (const record of history) {
    const current = earningsBySource.get(record.source) || 0;
    earningsBySource.set(record.source, current + record.amount);
  }
  
  // Calculate net profit
  const netProfit = agent.totalEarnings - agent.totalCosts;
  
  // Calculate profit margin (avoid division by zero)
  const profitMargin = agent.totalEarnings > 0 
    ? (netProfit / agent.totalEarnings) * 100 
    : 0;
  
  // Calculate earnings rate (earnings per day)
  const ageInDays = agent.age || 1; // Avoid division by zero
  const earningsRate = agent.totalEarnings / ageInDays;
  
  // Calculate economic fitness score (0-100)
  // Factors:
  // - Net profit (40%): Higher profit = higher fitness
  // - Profit margin (30%): Efficiency matters
  // - Earnings rate (30%): Speed of value creation matters
  
  // Normalize net profit (assume 10 SOL is excellent)
  const normalizedProfit = Math.min(netProfit / 10, 1) * 40;
  
  // Normalize profit margin (100% is excellent)
  const normalizedMargin = Math.min(profitMargin / 100, 1) * 30;
  
  // Normalize earnings rate (assume 1 SOL/day is excellent)
  const normalizedRate = Math.min(earningsRate / 1, 1) * 30;
  
  const economicFitness = Math.max(0, Math.min(100, 
    normalizedProfit + normalizedMargin + normalizedRate
  ));
  
  return {
    totalEarnings: agent.totalEarnings,
    totalCosts: agent.totalCosts,
    netProfit,
    profitMargin,
    earningsRate,
    earningsBySource,
    economicFitness,
  };
}

/**
 * Get earnings history for an agent
 * 
 * @param agentId - Agent ID
 * @param limit - Maximum number of records to return
 * @returns Array of earnings records
 */
export function getEarningsHistory(agentId: string, limit?: number): EarningsRecord[] {
  const history = earningsHistory.get(agentId) || [];
  
  if (limit) {
    return history.slice(-limit);
  }
  
  return history;
}

/**
 * Get total earnings by source for an agent
 * 
 * @param agentId - Agent ID
 * @returns Map of earnings source to total amount
 */
export function getEarningsBySource(agentId: string): Map<EarningsSource, number> {
  const history = earningsHistory.get(agentId) || [];
  const earningsBySource = new Map<EarningsSource, number>();
  
  for (const record of history) {
    const current = earningsBySource.get(record.source) || 0;
    earningsBySource.set(record.source, current + record.amount);
  }
  
  return earningsBySource;
}

/**
 * Get total earnings for an agent in a time period
 * 
 * @param agentId - Agent ID
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Total earnings amount
 */
export function getEarningsInPeriod(
  agentId: string,
  startDate: Date,
  endDate: Date
): number {
  const history = earningsHistory.get(agentId) || [];
  
  return history
    .filter(record => 
      record.timestamp >= startDate && record.timestamp <= endDate
    )
    .reduce((total, record) => total + record.amount, 0);
}

/**
 * Clear earnings history for an agent (for testing)
 * 
 * @param agentId - Agent ID
 */
export function clearEarningsHistory(agentId: string): void {
  earningsHistory.delete(agentId);
}

/**
 * Clear all earnings history (for testing)
 */
export function clearAllEarningsHistory(): void {
  earningsHistory.clear();
}

/**
 * Generate a unique earnings ID
 */
function generateEarningsId(): string {
  return `earn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
