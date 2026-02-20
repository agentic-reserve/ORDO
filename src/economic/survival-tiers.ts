/**
 * Survival tier configuration
 * 
 * Implements Requirement 3.1: Economic Survival Model
 * 
 * Survival tiers based on SOL balance:
 * - thriving: > 10 SOL - Full capabilities, can replicate and experiment
 * - normal: 1-10 SOL - Standard capabilities, can replicate
 * - low_compute: 0.1-1 SOL - Degraded model, limited features
 * - critical: 0.01-0.1 SOL - Minimal model, survival mode
 * - dead: < 0.01 SOL - Agent terminated
 */

import type { SurvivalTierConfig } from "./types.js";

/**
 * Survival tier definitions with thresholds and capabilities
 * 
 * Each tier defines:
 * - minBalance: Minimum SOL balance required for this tier
 * - capabilities: Description of available features
 * - model: AI model to use at this tier
 * - canReplicate: Whether agent can create offspring
 * - canExperiment: Whether agent can try experimental strategies
 */
export const SURVIVAL_TIERS: Record<string, SurvivalTierConfig> = {
  thriving: {
    name: "thriving",
    minBalance: 10.0,
    capabilities: "Full capabilities: advanced reasoning, all tools, experimentation, replication",
    model: "anthropic/claude-3.5-sonnet",
    canReplicate: true,
    canExperiment: true,
  },
  
  normal: {
    name: "normal",
    minBalance: 1.0,
    capabilities: "Standard capabilities: good reasoning, most tools, replication enabled",
    model: "anthropic/claude-3-haiku",
    canReplicate: true,
    canExperiment: false,
  },
  
  low_compute: {
    name: "low_compute",
    minBalance: 0.1,
    capabilities: "Degraded capabilities: basic reasoning, essential tools only, no replication",
    model: "openai/gpt-4o-mini",
    canReplicate: false,
    canExperiment: false,
  },
  
  critical: {
    name: "critical",
    minBalance: 0.01,
    capabilities: "Survival mode: minimal reasoning, emergency actions only",
    model: "openai/gpt-3.5-turbo",
    canReplicate: false,
    canExperiment: false,
  },
  
  dead: {
    name: "dead",
    minBalance: 0.0,
    capabilities: "No capabilities - agent terminated",
    model: "none",
    canReplicate: false,
    canExperiment: false,
  },
};

/**
 * Ordered list of tiers from highest to lowest
 * Used for tier evaluation
 */
export const TIER_ORDER: SurvivalTierConfig[] = [
  SURVIVAL_TIERS.thriving,
  SURVIVAL_TIERS.normal,
  SURVIVAL_TIERS.low_compute,
  SURVIVAL_TIERS.critical,
  SURVIVAL_TIERS.dead,
];

/**
 * Get survival tier configuration by name
 */
export function getTierByName(name: string): SurvivalTierConfig | undefined {
  return SURVIVAL_TIERS[name];
}

/**
 * Get all tier configurations
 */
export function getAllTiers(): SurvivalTierConfig[] {
  return TIER_ORDER;
}

/**
 * Determine survival tier based on SOL balance
 * 
 * @param balance - Agent's current SOL balance
 * @returns The appropriate survival tier configuration
 */
export function determineTier(balance: number): SurvivalTierConfig {
  // Find the highest tier that the balance qualifies for
  for (const tier of TIER_ORDER) {
    if (balance >= tier.minBalance) {
      return tier;
    }
  }
  
  // Default to dead tier if balance is below all thresholds
  return SURVIVAL_TIERS.dead;
}

/**
 * Check if an agent can replicate at their current balance
 */
export function canReplicate(balance: number): boolean {
  const tier = determineTier(balance);
  return tier.canReplicate;
}

/**
 * Check if an agent can experiment at their current balance
 */
export function canExperiment(balance: number): boolean {
  const tier = determineTier(balance);
  return tier.canExperiment;
}

/**
 * Get the recommended model for a given balance
 */
export function getModelForBalance(balance: number): string {
  const tier = determineTier(balance);
  return tier.model;
}

/**
 * Evaluate survival tier for an agent
 * 
 * This function classifies an agent into the appropriate survival tier
 * based on their current SOL balance.
 * 
 * @param agent - The agent to evaluate
 * @returns The survival tier configuration for the agent
 * 
 * Implements Requirement 3.1: Economic Survival Model
 * Validates Property 12: Tier Classification
 */
export function evaluateSurvival(agent: { balance: number }): SurvivalTierConfig {
  return determineTier(agent.balance);
}

/**
 * Tier transition information
 */
export interface TierTransition {
  from: SurvivalTierConfig;
  to: SurvivalTierConfig;
  direction: "upgrade" | "downgrade" | "none";
  balanceChange: number;
}

/**
 * Detect tier transition between old and new balance
 * 
 * This function determines if an agent has moved between survival tiers
 * and provides information about the transition.
 * 
 * @param oldBalance - The agent's previous balance
 * @param newBalance - The agent's current balance
 * @returns Tier transition information
 * 
 * Implements Requirement 3.1: Economic Survival Model
 */
export function detectTierTransition(
  oldBalance: number,
  newBalance: number
): TierTransition {
  const fromTier = determineTier(oldBalance);
  const toTier = determineTier(newBalance);
  
  let direction: "upgrade" | "downgrade" | "none";
  
  if (fromTier.name === toTier.name) {
    direction = "none";
  } else if (toTier.minBalance > fromTier.minBalance) {
    direction = "upgrade";
  } else {
    direction = "downgrade";
  }
  
  return {
    from: fromTier,
    to: toTier,
    direction,
    balanceChange: newBalance - oldBalance,
  };
}
