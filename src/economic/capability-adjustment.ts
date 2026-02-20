/**
 * Capability adjustment system
 * 
 * Implements Requirements 3.2, 3.3: Economic Survival Model
 * 
 * Adjusts agent capabilities based on survival tier:
 * - Model selection based on tier
 * - Feature enablement/disablement (replication, experimentation)
 * - Capability degradation on tier downgrade
 * - Capability upgrade on tier upgrade
 */

import type { Agent } from "../types.js";
import type { SurvivalTierConfig } from "./types.js";
import { determineTier, detectTierTransition } from "./survival-tiers.js";

/**
 * Capability adjustment result
 */
export interface CapabilityAdjustment {
  previousTier: SurvivalTierConfig;
  newTier: SurvivalTierConfig;
  modelChanged: boolean;
  previousModel: string;
  newModel: string;
  capabilitiesChanged: string[];
  replicationEnabled: boolean;
  experimentationEnabled: boolean;
}

/**
 * Degrade agent capabilities when tier downgrades
 * 
 * This function reduces agent capabilities when their balance decreases
 * and they move to a lower survival tier.
 * 
 * @param agent - The agent to degrade
 * @param newTier - The new (lower) survival tier
 * @returns Capability adjustment details
 * 
 * Implements Requirement 3.2: Capability degradation on tier downgrade
 * Validates Property 13: Capability Adjustment
 */
export function degradeCapabilities(
  agent: Agent,
  newTier: SurvivalTierConfig
): CapabilityAdjustment {
  const previousTier = determineTier(agent.balance);
  const capabilitiesChanged: string[] = [];
  
  // Store previous state
  const previousModel = agent.model;
  
  // Update model to lower tier model
  if (agent.model !== newTier.model) {
    agent.model = newTier.model;
    capabilitiesChanged.push(`model downgraded from ${previousModel} to ${newTier.model}`);
  }
  
  // Update survival tier
  agent.survivalTier = newTier.name;
  
  // Disable replication if new tier doesn't support it
  if (!newTier.canReplicate && previousTier.canReplicate) {
    capabilitiesChanged.push("replication disabled");
  }
  
  // Disable experimentation if new tier doesn't support it
  if (!newTier.canExperiment && previousTier.canExperiment) {
    capabilitiesChanged.push("experimentation disabled");
  }
  
  // Update timestamp
  agent.updatedAt = new Date();
  
  return {
    previousTier,
    newTier,
    modelChanged: previousModel !== newTier.model,
    previousModel,
    newModel: newTier.model,
    capabilitiesChanged,
    replicationEnabled: newTier.canReplicate,
    experimentationEnabled: newTier.canExperiment,
  };
}

/**
 * Upgrade agent capabilities when tier upgrades
 * 
 * This function enhances agent capabilities when their balance increases
 * and they move to a higher survival tier.
 * 
 * @param agent - The agent to upgrade
 * @param newTier - The new (higher) survival tier
 * @returns Capability adjustment details
 * 
 * Implements Requirement 3.3: Capability upgrade on tier upgrade
 * Validates Property 13: Capability Adjustment
 */
export function upgradeCapabilities(
  agent: Agent,
  newTier: SurvivalTierConfig
): CapabilityAdjustment {
  const previousTier = determineTier(agent.balance);
  const capabilitiesChanged: string[] = [];
  
  // Store previous state
  const previousModel = agent.model;
  
  // Update model to higher tier model
  if (agent.model !== newTier.model) {
    agent.model = newTier.model;
    capabilitiesChanged.push(`model upgraded from ${previousModel} to ${newTier.model}`);
  }
  
  // Update survival tier
  agent.survivalTier = newTier.name;
  
  // Enable replication if new tier supports it
  if (newTier.canReplicate && !previousTier.canReplicate) {
    capabilitiesChanged.push("replication enabled");
  }
  
  // Enable experimentation if new tier supports it
  if (newTier.canExperiment && !previousTier.canExperiment) {
    capabilitiesChanged.push("experimentation enabled");
  }
  
  // Update timestamp
  agent.updatedAt = new Date();
  
  return {
    previousTier,
    newTier,
    modelChanged: previousModel !== newTier.model,
    previousModel,
    newModel: newTier.model,
    capabilitiesChanged,
    replicationEnabled: newTier.canReplicate,
    experimentationEnabled: newTier.canExperiment,
  };
}

/**
 * Adjust agent capabilities based on balance change
 * 
 * This function automatically detects tier transitions and adjusts
 * capabilities accordingly (upgrade or downgrade).
 * 
 * @param agent - The agent to adjust
 * @param oldBalance - The agent's previous balance
 * @returns Capability adjustment details, or null if no tier change
 * 
 * Implements Requirements 3.2, 3.3: Automatic capability adjustment
 */
export function adjustCapabilities(
  agent: Agent,
  oldBalance: number
): CapabilityAdjustment | null {
  const transition = detectTierTransition(oldBalance, agent.balance);
  
  // No tier change, no adjustment needed
  if (transition.direction === "none") {
    return null;
  }
  
  // Upgrade capabilities
  if (transition.direction === "upgrade") {
    return upgradeCapabilities(agent, transition.to);
  }
  
  // Downgrade capabilities
  return degradeCapabilities(agent, transition.to);
}

/**
 * Check if agent can replicate at current tier
 * 
 * @param agent - The agent to check
 * @returns True if agent can replicate
 */
export function canAgentReplicate(agent: Agent): boolean {
  const tier = determineTier(agent.balance);
  return tier.canReplicate;
}

/**
 * Check if agent can experiment at current tier
 * 
 * @param agent - The agent to check
 * @returns True if agent can experiment
 */
export function canAgentExperiment(agent: Agent): boolean {
  const tier = determineTier(agent.balance);
  return tier.canExperiment;
}

/**
 * Get recommended model for agent's current balance
 * 
 * @param agent - The agent to check
 * @returns The recommended model name
 */
export function getRecommendedModel(agent: Agent): string {
  const tier = determineTier(agent.balance);
  return tier.model;
}

/**
 * Synchronize agent state with current tier
 * 
 * This function ensures the agent's model and capabilities match
 * their current survival tier. Useful for initialization or recovery.
 * 
 * @param agent - The agent to synchronize
 * @returns Capability adjustment details
 */
export function syncAgentWithTier(agent: Agent): CapabilityAdjustment {
  const currentTier = determineTier(agent.balance);
  const previousModel = agent.model;
  const previousTier = { ...currentTier, name: agent.survivalTier };
  
  // Update to current tier
  agent.model = currentTier.model;
  agent.survivalTier = currentTier.name;
  agent.updatedAt = new Date();
  
  const capabilitiesChanged: string[] = [];
  if (previousModel !== currentTier.model) {
    capabilitiesChanged.push(`model synchronized to ${currentTier.model}`);
  }
  
  return {
    previousTier,
    newTier: currentTier,
    modelChanged: previousModel !== currentTier.model,
    previousModel,
    newModel: currentTier.model,
    capabilitiesChanged,
    replicationEnabled: currentTier.canReplicate,
    experimentationEnabled: currentTier.canExperiment,
  };
}
