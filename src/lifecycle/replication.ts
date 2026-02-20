/**
 * Agent replication and inheritance system
 * 
 * Implements Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 * 
 * This module handles:
 * - Replication eligibility checking
 * - Trait inheritance from parent to offspring
 * - Mutation application for genetic variation
 * - Resource transfer during replication
 * - Complete replication orchestration
 */

import type { Agent } from "../types.js";
import { config } from "../config.js";
import { determineTier } from "../economic/survival-tiers.js";

/**
 * Trait interface for inheritable characteristics
 * 
 * Traits represent inheritable characteristics that can be passed
 * from parent to offspring with potential mutations.
 */
export interface Trait {
  name: string;
  value: unknown;
  mutable: boolean;
  category: "strategy" | "knowledge" | "skill" | "preference" | "other";
}

/**
 * Replication eligibility result
 */
export interface ReplicationEligibility {
  eligible: boolean;
  reasons: string[];
  balance: number;
  age: number;
  tier: string;
}

/**
 * Check if an agent is eligible for replication
 * 
 * An agent can replicate if:
 * 1. Balance > 10 SOL (replicationMinBalance)
 * 2. Age > 30 days (replicationMinAgeDays)
 * 3. Survival tier allows replication (thriving or normal)
 * 
 * @param agent - The agent to check
 * @returns Eligibility result with reasons
 * 
 * Implements Requirement 5.1: Replication and Inheritance
 * Validates Property 21: Reproduction Eligibility
 */
export function checkReplicationEligibility(agent: Agent): ReplicationEligibility {
  const reasons: string[] = [];
  let eligible = true;

  // Check balance requirement
  const minBalance = config.agent.replicationMinBalance;
  if (agent.balance < minBalance) {
    eligible = false;
    reasons.push(`Balance ${agent.balance} SOL is below minimum ${minBalance} SOL`);
  }

  // Check age requirement
  const minAge = config.agent.replicationMinAgeDays;
  if (agent.age < minAge) {
    eligible = false;
    reasons.push(`Age ${agent.age} days is below minimum ${minAge} days`);
  }

  // Check tier allows replication
  const tier = determineTier(agent.balance);
  if (!tier.canReplicate) {
    eligible = false;
    reasons.push(`Survival tier "${tier.name}" does not allow replication`);
  }

  // Check agent is alive
  if (agent.status !== "alive") {
    eligible = false;
    reasons.push(`Agent status is "${agent.status}", must be "alive"`);
  }

  if (eligible) {
    reasons.push("All replication requirements met");
  }

  return {
    eligible,
    reasons,
    balance: agent.balance,
    age: agent.age,
    tier: tier.name,
  };
}

/**
 * Convert agent data to inheritable traits
 * 
 * Extracts inheritable characteristics from an agent including:
 * - Strategies (decision-making patterns)
 * - Knowledge (learned information)
 * - Skills (capabilities)
 * - Preferences (model choices, tool preferences)
 * 
 * @param agent - The parent agent
 * @returns Array of traits that can be inherited
 */
function extractTraits(agent: Agent): Trait[] {
  const traits: Trait[] = [];

  // Extract strategy traits from agent's traits object
  if (agent.traits && typeof agent.traits === "object") {
    for (const [key, value] of Object.entries(agent.traits)) {
      traits.push({
        name: key,
        value,
        mutable: true,
        category: "strategy",
      });
    }
  }

  // Extract knowledge traits
  if (agent.knowledgeBase && typeof agent.knowledgeBase === "object") {
    for (const [key, value] of Object.entries(agent.knowledgeBase)) {
      traits.push({
        name: `knowledge_${key}`,
        value,
        mutable: true,
        category: "knowledge",
      });
    }
  }

  // Extract skill traits
  for (const skill of agent.skills) {
    traits.push({
      name: `skill_${skill}`,
      value: skill,
      mutable: false, // Skills are not mutated, only added/removed
      category: "skill",
    });
  }

  // Extract preference traits
  traits.push({
    name: "preferred_model",
    value: agent.model,
    mutable: true,
    category: "preference",
  });

  traits.push({
    name: "tool_preferences",
    value: agent.tools,
    mutable: true,
    category: "preference",
  });

  return traits;
}

/**
 * Inherit traits from parent to child
 * 
 * Creates a child agent with traits copied from the parent.
 * This includes:
 * - Strategies (decision-making patterns)
 * - Knowledge (learned information)
 * - Skills (capabilities)
 * - Preferences (model choices, tool preferences)
 * 
 * Traits are copied before mutation is applied.
 * 
 * @param parent - The parent agent
 * @param childTraits - Initial child traits object (will be populated)
 * @param childKnowledge - Initial child knowledge object (will be populated)
 * @param childSkills - Initial child skills array (will be populated)
 * @returns Array of inherited traits for tracking
 * 
 * Implements Requirement 5.2: Replication and Inheritance
 * Validates Property 22: Trait Inheritance
 */
export function inheritTraits(
  parent: Agent,
  childTraits: Record<string, unknown>,
  childKnowledge: Record<string, unknown>,
  childSkills: string[]
): Trait[] {
  const parentTraits = extractTraits(parent);
  const inheritedTraits: Trait[] = [];

  for (const trait of parentTraits) {
    // Deep copy the trait value to avoid reference sharing
    const copiedValue = JSON.parse(JSON.stringify(trait.value));

    // Store trait in appropriate child data structure
    if (trait.category === "strategy") {
      childTraits[trait.name] = copiedValue;
    } else if (trait.category === "knowledge") {
      const knowledgeKey = trait.name.replace("knowledge_", "");
      childKnowledge[knowledgeKey] = copiedValue;
    } else if (trait.category === "skill") {
      const skill = trait.value as string;
      if (!childSkills.includes(skill)) {
        childSkills.push(skill);
      }
    } else if (trait.category === "preference") {
      // Preferences are handled separately in replicateAgent
      // but we track them for mutation purposes
    }

    // Track inherited trait
    inheritedTraits.push({
      name: trait.name,
      value: copiedValue,
      mutable: trait.mutable,
      category: trait.category,
    });
  }

  return inheritedTraits;
}


/**
 * Mutation types that can be applied to traits
 */
export type MutationType = "value_change" | "addition" | "deletion";

/**
 * Mutation result
 */
export interface MutationResult {
  trait: Trait;
  mutationType: MutationType;
  originalValue: unknown;
  mutatedValue: unknown;
}

/**
 * Apply mutations to offspring traits
 * 
 * Mutations create genetic variation by modifying 10-20% of offspring traits.
 * Supported mutation types:
 * - value_change: Modify the value of an existing trait
 * - addition: Add a new trait (for extensible categories)
 * - deletion: Remove a trait (for non-essential traits)
 * 
 * Mutations preserve core functionality by:
 * - Only mutating traits marked as mutable
 * - Keeping mutations within reasonable bounds
 * - Not deleting essential traits
 * 
 * @param traits - Array of inherited traits
 * @param mutationRate - Probability of mutation (0.1-0.2 for 10-20%)
 * @returns Array of mutation results
 * 
 * Implements Requirements 4.5, 5.3: Replication and Inheritance
 * Validates Property 19: Replication Mutation
 * Validates Property 23: Mutation Rate Compliance
 */
export function applyMutations(
  traits: Trait[],
  mutationRate: number
): MutationResult[] {
  const mutations: MutationResult[] = [];

  // Validate mutation rate
  if (mutationRate < 0 || mutationRate > 1) {
    throw new Error(`Invalid mutation rate: ${mutationRate}. Must be between 0 and 1.`);
  }

  for (const trait of traits) {
    // Skip non-mutable traits
    if (!trait.mutable) {
      continue;
    }

    // Decide if this trait should mutate
    if (Math.random() < mutationRate) {
      const originalValue = trait.value;
      let mutatedValue: unknown;
      let mutationType: MutationType;

      // Determine mutation type based on trait value type
      if (typeof trait.value === "number") {
        // For numbers: add random variation (-20% to +20%)
        mutationType = "value_change";
        const variation = (Math.random() - 0.5) * 0.4; // -0.2 to +0.2
        mutatedValue = trait.value * (1 + variation);
      } else if (typeof trait.value === "string") {
        // For strings: append mutation marker
        mutationType = "value_change";
        mutatedValue = `${trait.value}_mutated_${Math.random().toString(36).substring(7)}`;
      } else if (typeof trait.value === "boolean") {
        // For booleans: flip with 50% probability
        mutationType = "value_change";
        mutatedValue = Math.random() < 0.5 ? !trait.value : trait.value;
      } else if (Array.isArray(trait.value)) {
        // For arrays: add, remove, or modify elements
        const arrayMutationType = Math.random();
        if (arrayMutationType < 0.33 && trait.value.length > 0) {
          // Remove random element
          mutationType = "deletion";
          mutatedValue = trait.value.filter((_, i) => i !== Math.floor(Math.random() * trait.value.length));
        } else if (arrayMutationType < 0.66) {
          // Add random element
          mutationType = "addition";
          mutatedValue = [...trait.value, `new_element_${Math.random().toString(36).substring(7)}`];
        } else {
          // Modify random element
          mutationType = "value_change";
          const index = Math.floor(Math.random() * trait.value.length);
          mutatedValue = [...trait.value];
          (mutatedValue as unknown[])[index] = `modified_${trait.value[index]}`;
        }
      } else if (typeof trait.value === "object" && trait.value !== null) {
        // For objects: modify a random property
        mutationType = "value_change";
        const keys = Object.keys(trait.value);
        if (keys.length > 0) {
          const keyToMutate = keys[Math.floor(Math.random() * keys.length)];
          mutatedValue = {
            ...trait.value,
            [keyToMutate]: `mutated_${(trait.value as Record<string, unknown>)[keyToMutate]}`,
          };
        } else {
          mutatedValue = trait.value;
        }
      } else {
        // For other types: no mutation
        continue;
      }

      // Apply mutation to trait
      trait.value = mutatedValue;

      // Record mutation
      mutations.push({
        trait,
        mutationType,
        originalValue,
        mutatedValue,
      });
    }
  }

  return mutations;
}

/**
 * Calculate actual mutation rate from a batch of offspring
 * 
 * This function measures what percentage of traits were actually mutated,
 * which should be close to the configured mutation rate.
 * 
 * @param totalTraits - Total number of mutable traits
 * @param mutatedTraits - Number of traits that were mutated
 * @returns Actual mutation rate (0-1)
 */
export function calculateMutationRate(
  totalTraits: number,
  mutatedTraits: number
): number {
  if (totalTraits === 0) {
    return 0;
  }
  return mutatedTraits / totalTraits;
}


/**
 * Resource transfer result
 */
export interface ResourceTransferResult {
  parentBalanceBefore: number;
  parentBalanceAfter: number;
  childBalance: number;
  replicationCost: number;
  transferred: number;
}

/**
 * Transfer resources from parent to child during replication
 * 
 * Resource transfer follows these rules:
 * 1. Deduct replication cost from parent (configurable, default 1 SOL)
 * 2. Transfer remaining resources to child
 * 3. Ensure conservation: parent_after + child = parent_before - cost
 * 
 * The parent must have sufficient balance to cover both the replication
 * cost and provide initial resources to the child.
 * 
 * @param parent - The parent agent (will be modified)
 * @param childBalance - Initial balance to give to child
 * @param replicationCost - Cost of replication (deducted from parent)
 * @returns Resource transfer result
 * 
 * Implements Requirement 5.4: Replication and Inheritance
 * Validates Property 24: Resource Transfer
 */
export function transferResources(
  parent: Agent,
  childBalance: number,
  replicationCost: number = 1.0
): ResourceTransferResult {
  const parentBalanceBefore = parent.balance;

  // Validate parent has sufficient balance
  const totalRequired = childBalance + replicationCost;
  if (parent.balance < totalRequired) {
    throw new Error(
      `Insufficient balance for replication. Required: ${totalRequired} SOL, Available: ${parent.balance} SOL`
    );
  }

  // Deduct replication cost and child balance from parent
  parent.balance -= totalRequired;
  const parentBalanceAfter = parent.balance;

  // Verify conservation of resources
  const conserved = Math.abs(
    (parentBalanceAfter + childBalance) - (parentBalanceBefore - replicationCost)
  ) < 0.0001; // Allow for floating point precision

  if (!conserved) {
    throw new Error(
      `Resource conservation violated: parent_after (${parentBalanceAfter}) + child (${childBalance}) != parent_before (${parentBalanceBefore}) - cost (${replicationCost})`
    );
  }

  return {
    parentBalanceBefore,
    parentBalanceAfter,
    childBalance,
    replicationCost,
    transferred: childBalance,
  };
}


/**
 * Replication result
 */
export interface ReplicationResult {
  parent: Agent;
  offspring: Agent[];
  resourceTransfer: ResourceTransferResult[];
  mutations: MutationResult[][];
  inheritedTraits: Trait[][];
}

/**
 * Replicate an agent - Create offspring with inherited traits and mutations
 * 
 * This orchestration function combines all replication steps:
 * 1. Check eligibility (balance, age, tier)
 * 2. Inherit traits from parent
 * 3. Apply mutations to create variation
 * 4. Transfer resources from parent to children
 * 5. Create offspring agents via birthAgent()
 * 6. Record lineage relationships
 * 7. Update parent and child states
 * 
 * @param parent - The parent agent
 * @param numOffspring - Number of offspring to create (default 1)
 * @param childBalance - Initial balance for each child (default 1 SOL)
 * @param replicationCost - Cost per offspring (default 1 SOL)
 * @returns Replication result with parent, offspring, and metadata
 * 
 * Implements Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export async function replicateAgent(
  parent: Agent,
  numOffspring: number = 1,
  childBalance: number = 1.0,
  replicationCost: number = 1.0
): Promise<ReplicationResult> {
  // Import dependencies (to avoid circular imports)
  const { birthAgent } = await import("./birth.js");
  const { recordLineage } = await import("./lineage.js");
  const { updateAgent } = await import("../database/operations.js");

  // 1. Check eligibility
  const eligibility = checkReplicationEligibility(parent);
  if (!eligibility.eligible) {
    throw new Error(
      `Agent ${parent.id} is not eligible for replication: ${eligibility.reasons.join(", ")}`
    );
  }

  // Validate number of offspring
  if (numOffspring < 1) {
    throw new Error(`Number of offspring must be at least 1, got ${numOffspring}`);
  }

  // Validate parent has sufficient balance for all offspring
  const totalRequired = (childBalance + replicationCost) * numOffspring;
  if (parent.balance < totalRequired) {
    throw new Error(
      `Insufficient balance for ${numOffspring} offspring. Required: ${totalRequired} SOL, Available: ${parent.balance} SOL`
    );
  }

  const offspring: Agent[] = [];
  const resourceTransfers: ResourceTransferResult[] = [];
  const allMutations: MutationResult[][] = [];
  const allInheritedTraits: Trait[][] = [];

  // Create each offspring
  for (let i = 0; i < numOffspring; i++) {
    // 2. Inherit traits from parent
    const childTraits: Record<string, unknown> = {};
    const childKnowledge: Record<string, unknown> = {};
    const childSkills: string[] = [];

    const inheritedTraits = inheritTraits(
      parent,
      childTraits,
      childKnowledge,
      childSkills
    );

    // 3. Apply mutations to create variation
    const mutationRate = config.agent.mutationRate;
    const mutations = applyMutations(inheritedTraits, mutationRate);

    // 4. Transfer resources from parent to child
    const transfer = transferResources(parent, childBalance, replicationCost);

    // 5. Create offspring agent via birthAgent()
    const childName = `${parent.name}-offspring-${parent.childrenIds.length + i + 1}`;
    const child = await birthAgent({
      name: childName,
      parent: parent.id,
      initialBalance: childBalance,
      mutationRate,
    });

    // Apply inherited traits and mutations to child
    child.traits = childTraits;
    child.knowledgeBase = childKnowledge;
    child.skills = childSkills;
    child.mutations = mutations.map(m => `${m.trait.name}:${m.mutationType}`);

    // Update child in database
    await updateAgent(child.id, {
      traits: child.traits,
      knowledgeBase: child.knowledgeBase,
      skills: child.skills,
      mutations: child.mutations,
    });

    // 6. Record lineage relationship
    await recordLineage(parent, child);

    // Track results
    offspring.push(child);
    resourceTransfers.push(transfer);
    allMutations.push(mutations);
    allInheritedTraits.push(inheritedTraits);

    // Update parent's children list
    parent.childrenIds.push(child.id);
  }

  // 7. Update parent state
  parent.fitness.offspring += numOffspring;
  await updateAgent(parent.id, {
    balance: parent.balance,
    childrenIds: parent.childrenIds,
    fitness: parent.fitness,
  });

  return {
    parent,
    offspring,
    resourceTransfer: resourceTransfers,
    mutations: allMutations,
    inheritedTraits: allInheritedTraits,
  };
}
