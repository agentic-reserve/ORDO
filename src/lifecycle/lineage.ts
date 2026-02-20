/**
 * Lineage recording module
 * Tracks parent-child relationships and family trees
 */

import { recordLineage as dbRecordLineage, getAncestors, getDescendants } from "../database/operations.js";
import type { Agent } from "../types.js";

/**
 * Record lineage relationship between parent and child
 * Stores the relationship in the database and updates on-chain registry
 * 
 * @param parent - The parent agent
 * @param child - The child agent
 */
export async function recordLineage(parent: Agent, child: Agent): Promise<void> {
  // Validate parent-child relationship
  if (child.parentId !== parent.id) {
    throw new Error("Child agent does not reference parent");
  }

  if (child.generation !== parent.generation + 1) {
    throw new Error("Child generation must be parent generation + 1");
  }

  // Record lineage in database
  await dbRecordLineage(parent.id, child.id);
}

/**
 * Get all ancestors of an agent (parents, grandparents, etc.)
 * 
 * @param agent - The agent to get ancestors for
 * @returns Array of ancestor agents
 */
export async function getAgentAncestors(agent: Agent): Promise<Agent[]> {
  return await getAncestors(agent.id);
}

/**
 * Get all descendants of an agent (children, grandchildren, etc.)
 * 
 * @param agent - The agent to get descendants for
 * @returns Array of descendant agents
 */
export async function getAgentDescendants(agent: Agent): Promise<Agent[]> {
  return await getDescendants(agent.id);
}

/**
 * Build a family tree for an agent
 * Returns ancestors, the agent itself, and descendants
 * 
 * @param agent - The agent to build family tree for
 * @returns Family tree with ancestors, agent, and descendants
 */
export async function buildFamilyTree(agent: Agent): Promise<{
  ancestors: Agent[];
  agent: Agent;
  descendants: Agent[];
}> {
  const [ancestors, descendants] = await Promise.all([
    getAgentAncestors(agent),
    getAgentDescendants(agent),
  ]);

  return {
    ancestors,
    agent,
    descendants,
  };
}

/**
 * Calculate lineage depth (number of generations from genesis)
 * 
 * @param agent - The agent to calculate depth for
 * @returns Lineage depth (0 for genesis agents)
 */
export function calculateLineageDepth(agent: Agent): number {
  return agent.generation;
}

/**
 * Check if two agents are related
 * 
 * @param agent1 - First agent
 * @param agent2 - Second agent
 * @returns true if agents share a common ancestor
 */
export async function areAgentsRelated(agent1: Agent, agent2: Agent): Promise<boolean> {
  // If same agent, they are related
  if (agent1.id === agent2.id) {
    return true;
  }

  // If one is parent of the other
  if (agent1.parentId === agent2.id || agent2.parentId === agent1.id) {
    return true;
  }

  // If they share a parent
  if (agent1.parentId && agent2.parentId && agent1.parentId === agent2.parentId) {
    return true;
  }

  // Check if they share any common ancestor
  const ancestors1 = await getAgentAncestors(agent1);
  const ancestors2 = await getAgentAncestors(agent2);

  const ancestorIds1 = new Set(ancestors1.map(a => a.id));
  const ancestorIds2 = new Set(ancestors2.map(a => a.id));

  for (const id of ancestorIds1) {
    if (ancestorIds2.has(id)) {
      return true;
    }
  }

  return false;
}

/**
 * Get siblings of an agent (agents with same parent)
 * 
 * @param agent - The agent to get siblings for
 * @returns Array of sibling agents
 */
export async function getSiblings(agent: Agent): Promise<Agent[]> {
  if (!agent.parentId) {
    return []; // Genesis agents have no siblings
  }

  const ancestors = await getAgentAncestors(agent);
  const parent = ancestors.find(a => a.id === agent.parentId);

  if (!parent) {
    return [];
  }

  const descendants = await getAgentDescendants(parent);
  
  // Filter to only direct children (siblings) excluding the agent itself
  return descendants.filter(d => 
    d.parentId === parent.id && 
    d.id !== agent.id &&
    d.generation === agent.generation
  );
}

/**
 * Calculate genetic distance between two agents
 * (Number of generations between them)
 * 
 * @param agent1 - First agent
 * @param agent2 - Second agent
 * @returns Genetic distance (0 if same agent, -1 if not related)
 */
export async function calculateGeneticDistance(agent1: Agent, agent2: Agent): Promise<number> {
  if (agent1.id === agent2.id) {
    return 0;
  }

  // Check if one is ancestor of the other
  const ancestors1 = await getAgentAncestors(agent1);
  const ancestors2 = await getAgentAncestors(agent2);

  // If agent2 is ancestor of agent1
  if (ancestors1.some(a => a.id === agent2.id)) {
    return agent1.generation - agent2.generation;
  }

  // If agent1 is ancestor of agent2
  if (ancestors2.some(a => a.id === agent1.id)) {
    return agent2.generation - agent1.generation;
  }

  // Find common ancestor
  const ancestorIds1 = new Set(ancestors1.map(a => a.id));
  
  for (const ancestor of ancestors2) {
    if (ancestorIds1.has(ancestor.id)) {
      // Found common ancestor
      const distance1 = agent1.generation - ancestor.generation;
      const distance2 = agent2.generation - ancestor.generation;
      return distance1 + distance2;
    }
  }

  // Not related
  return -1;
}
