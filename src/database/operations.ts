/**
 * Database operations for agent lifecycle management
 */

import { db, type AgentRow, type LineageRow, type AgentHistoryRow } from "./client.js";
import type { Agent } from "../types.js";

/**
 * Create a new agent in the database
 */
export async function createAgent(agent: Agent): Promise<Agent> {
  const client = db.getClient();
  const row = db.agentToRow(agent);

  const { data, error } = await client
    .from("agents")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create agent: ${error.message}`);
  }

  return db.rowToAgent(data as AgentRow);
}

/**
 * Get agent by ID
 */
export async function getAgentById(id: string): Promise<Agent | null> {
  const client = db.getClient();

  const { data, error } = await client
    .from("agents")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw new Error(`Failed to get agent: ${error.message}`);
  }

  return db.rowToAgent(data as AgentRow);
}

/**
 * Get agent by public key
 */
export async function getAgentByPublicKey(publicKey: string): Promise<Agent | null> {
  const client = db.getClient();

  const { data, error } = await client
    .from("agents")
    .select("*")
    .eq("public_key", publicKey)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // Not found
      return null;
    }
    throw new Error(`Failed to get agent: ${error.message}`);
  }

  return db.rowToAgent(data as AgentRow);
}

/**
 * Update agent in the database
 */
export async function updateAgent(id: string, updates: Partial<Agent>): Promise<Agent> {
  const client = db.getClient();
  
  // Convert updates to row format
  const rowUpdates: Partial<AgentRow> = {};
  
  if (updates.age !== undefined) rowUpdates.age = updates.age;
  if (updates.status !== undefined) rowUpdates.status = updates.status;
  if (updates.deathCause !== undefined) rowUpdates.death_cause = updates.deathCause;
  if (updates.deathDate !== undefined) rowUpdates.death_date = updates.deathDate.toISOString();
  if (updates.balance !== undefined) rowUpdates.balance = updates.balance.toString();
  if (updates.survivalTier !== undefined) rowUpdates.survival_tier = updates.survivalTier;
  if (updates.totalEarnings !== undefined) rowUpdates.total_earnings = updates.totalEarnings.toString();
  if (updates.totalCosts !== undefined) rowUpdates.total_costs = updates.totalCosts.toString();
  if (updates.model !== undefined) rowUpdates.model = updates.model;
  if (updates.tools !== undefined) rowUpdates.tools = updates.tools;
  if (updates.skills !== undefined) rowUpdates.skills = updates.skills;
  if (updates.knowledgeBase !== undefined) rowUpdates.knowledge_base = updates.knowledgeBase;
  if (updates.fitness !== undefined) {
    rowUpdates.fitness_survival = updates.fitness.survival.toString();
    rowUpdates.fitness_earnings = updates.fitness.earnings.toString();
    rowUpdates.fitness_offspring = updates.fitness.offspring.toString();
    rowUpdates.fitness_adaptation = updates.fitness.adaptation.toString();
    rowUpdates.fitness_innovation = updates.fitness.innovation.toString();
  }
  if (updates.mutations !== undefined) rowUpdates.mutations = updates.mutations;
  if (updates.traits !== undefined) rowUpdates.traits = updates.traits;
  if (updates.childrenIds !== undefined) rowUpdates.children_ids = updates.childrenIds;
  if (updates.archivedAt !== undefined) rowUpdates.archived_at = updates.archivedAt.toISOString();

  const { data, error } = await client
    .from("agents")
    .update(rowUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update agent: ${error.message}`);
  }

  return db.rowToAgent(data as AgentRow);
}

/**
 * Get all active (alive) agents
 */
export async function getActiveAgents(): Promise<Agent[]> {
  const client = db.getClient();

  const { data, error } = await client
    .from("agents")
    .select("*")
    .eq("status", "alive")
    .order("birth_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to get active agents: ${error.message}`);
  }

  return (data as AgentRow[]).map(row => db.rowToAgent(row));
}

/**
 * Get all agents (alive and dead)
 */
export async function getAllAgents(): Promise<Agent[]> {
  const client = db.getClient();

  const { data, error } = await client
    .from("agents")
    .select("*")
    .order("birth_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to get all agents: ${error.message}`);
  }

  return (data as AgentRow[]).map(row => db.rowToAgent(row));
}

/**
 * Get agents by generation
 */
export async function getAgentsByGeneration(generation: number): Promise<Agent[]> {
  const client = db.getClient();

  const { data, error } = await client
    .from("agents")
    .select("*")
    .eq("generation", generation)
    .order("birth_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to get agents by generation: ${error.message}`);
  }

  return (data as AgentRow[]).map(row => db.rowToAgent(row));
}

/**
 * Get children of an agent
 */
export async function getChildren(parentId: string): Promise<Agent[]> {
  const client = db.getClient();

  const { data, error } = await client
    .from("agents")
    .select("*")
    .eq("parent_id", parentId)
    .order("birth_date", { ascending: false });

  if (error) {
    throw new Error(`Failed to get children: ${error.message}`);
  }

  return (data as AgentRow[]).map(row => db.rowToAgent(row));
}

/**
 * Record lineage relationship
 */
export async function recordLineage(parentId: string, childId: string): Promise<void> {
  const client = db.getClient();

  // Get parent and child to calculate generation gap
  const parent = await getAgentById(parentId);
  const child = await getAgentById(childId);

  if (!parent || !child) {
    throw new Error("Parent or child agent not found");
  }

  const generationGap = child.generation - parent.generation;

  const { error } = await client
    .from("lineage")
    .insert({
      parent_id: parentId,
      child_id: childId,
      generation_gap: generationGap,
    });

  if (error) {
    throw new Error(`Failed to record lineage: ${error.message}`);
  }
}

/**
 * Get ancestors of an agent (recursive)
 */
export async function getAncestors(agentId: string): Promise<Agent[]> {
  const client = db.getClient();

  const { data, error } = await client
    .from("lineage")
    .select("parent_id")
    .eq("child_id", agentId);

  if (error) {
    throw new Error(`Failed to get ancestors: ${error.message}`);
  }

  const ancestors: Agent[] = [];
  
  for (const row of data as LineageRow[]) {
    const parent = await getAgentById(row.parent_id);
    if (parent) {
      ancestors.push(parent);
      // Recursively get parent's ancestors
      const parentAncestors = await getAncestors(parent.id);
      ancestors.push(...parentAncestors);
    }
  }

  return ancestors;
}

/**
 * Get descendants of an agent (recursive)
 */
export async function getDescendants(agentId: string): Promise<Agent[]> {
  const client = db.getClient();

  const { data, error } = await client
    .from("lineage")
    .select("child_id")
    .eq("parent_id", agentId);

  if (error) {
    throw new Error(`Failed to get descendants: ${error.message}`);
  }

  const descendants: Agent[] = [];
  
  for (const row of data as LineageRow[]) {
    const child = await getAgentById(row.child_id);
    if (child) {
      descendants.push(child);
      // Recursively get child's descendants
      const childDescendants = await getDescendants(child.id);
      descendants.push(...childDescendants);
    }
  }

  return descendants;
}

/**
 * Log agent history event
 */
export async function logAgentEvent(
  agentId: string,
  eventType: string,
  eventData: Record<string, unknown>
): Promise<void> {
  const client = db.getClient();

  const { error } = await client
    .from("agent_history")
    .insert({
      agent_id: agentId,
      event_type: eventType,
      event_data: eventData,
    });

  if (error) {
    throw new Error(`Failed to log agent event: ${error.message}`);
  }
}

/**
 * Get agent history
 */
export async function getAgentHistory(agentId: string): Promise<AgentHistoryRow[]> {
  const client = db.getClient();

  const { data, error } = await client
    .from("agent_history")
    .select("*")
    .eq("agent_id", agentId)
    .order("timestamp", { ascending: false });

  if (error) {
    throw new Error(`Failed to get agent history: ${error.message}`);
  }

  return data as AgentHistoryRow[];
}

/**
 * Get population statistics
 */
export async function getPopulationStats(): Promise<{
  aliveCount: number;
  deadCount: number;
  totalCount: number;
  avgAgeAlive: number;
  avgBalanceAlive: number;
  maxGeneration: number;
  avgGenerationAlive: number;
  totalPlatformEarnings: number;
  totalPlatformCosts: number;
}> {
  const client = db.getClient();

  const { data, error } = await client
    .from("population_stats")
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to get population stats: ${error.message}`);
  }

  return {
    aliveCount: data.alive_count || 0,
    deadCount: data.dead_count || 0,
    totalCount: data.total_count || 0,
    avgAgeAlive: Number.parseFloat(data.avg_age_alive || "0"),
    avgBalanceAlive: Number.parseFloat(data.avg_balance_alive || "0"),
    maxGeneration: data.max_generation || 0,
    avgGenerationAlive: Number.parseFloat(data.avg_generation_alive || "0"),
    totalPlatformEarnings: Number.parseFloat(data.total_platform_earnings || "0"),
    totalPlatformCosts: Number.parseFloat(data.total_platform_costs || "0"),
  };
}
