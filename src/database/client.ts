/**
 * Supabase database client for agent lifecycle management
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config } from "../config.js";
import type { Agent } from "../types.js";

/**
 * Database row type for agents table
 */
export interface AgentRow {
  id: string;
  public_key: string;
  name: string;
  generation: number;
  parent_id: string | null;
  children_ids: string[];
  
  birth_date: string;
  age: number;
  max_lifespan: number;
  status: string;
  death_cause: string | null;
  death_date: string | null;
  
  balance: string;
  survival_tier: string;
  total_earnings: string;
  total_costs: string;
  
  model: string;
  tools: string[];
  skills: string[];
  knowledge_base: Record<string, unknown>;
  
  fitness_survival: string;
  fitness_earnings: string;
  fitness_offspring: string;
  fitness_adaptation: string;
  fitness_innovation: string;
  mutations: string[];
  traits: Record<string, unknown>;
  
  consciousness_self_awareness: number | null;
  consciousness_introspection: number | null;
  consciousness_theory_of_mind: number | null;
  
  reputation: number | null;
  guild_id: string | null;
  
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

/**
 * Lineage row type
 */
export interface LineageRow {
  id: number;
  parent_id: string;
  child_id: string;
  generation_gap: number;
  created_at: string;
}

/**
 * Agent history row type
 */
export interface AgentHistoryRow {
  id: number;
  agent_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  timestamp: string;
}

/**
 * Database client singleton
 */
class DatabaseClient {
  private client: SupabaseClient | null = null;

  /**
   * Get or create Supabase client
   */
  getClient(): SupabaseClient {
    if (!this.client) {
      if (!config.supabase.url || !config.supabase.serviceRoleKey) {
        throw new Error("Supabase configuration is missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
      }

      this.client = createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
    }

    return this.client;
  }

  /**
   * Convert database row to Agent object
   */
  rowToAgent(row: AgentRow): Agent {
    return {
      id: row.id,
      publicKey: row.public_key,
      name: row.name,
      generation: row.generation,
      parentId: row.parent_id ?? undefined,
      childrenIds: row.children_ids,

      birthDate: new Date(row.birth_date),
      age: row.age,
      maxLifespan: row.max_lifespan,
      status: row.status as "alive" | "dead",
      deathCause: row.death_cause as "starvation" | "old_age" | "terminated" | "error" | undefined,
      deathDate: row.death_date ? new Date(row.death_date) : undefined,

      balance: Number.parseFloat(row.balance),
      survivalTier: row.survival_tier as "thriving" | "normal" | "low_compute" | "critical" | "dead",
      totalEarnings: Number.parseFloat(row.total_earnings),
      totalCosts: Number.parseFloat(row.total_costs),

      model: row.model,
      tools: row.tools,
      skills: row.skills,
      knowledgeBase: row.knowledge_base,

      fitness: {
        survival: Number.parseFloat(row.fitness_survival),
        earnings: Number.parseFloat(row.fitness_earnings),
        offspring: Number.parseFloat(row.fitness_offspring),
        adaptation: Number.parseFloat(row.fitness_adaptation),
        innovation: Number.parseFloat(row.fitness_innovation),
      },
      mutations: row.mutations,
      traits: row.traits,

      consciousness: row.consciousness_self_awareness !== null ? {
        selfAwarenessLevel: row.consciousness_self_awareness,
        introspectionDepth: row.consciousness_introspection ?? 0,
        theoryOfMindAccuracy: row.consciousness_theory_of_mind ?? 0,
      } : undefined,

      reputation: row.reputation ?? undefined,
      guildId: row.guild_id ?? undefined,

      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      archivedAt: row.archived_at ? new Date(row.archived_at) : undefined,
    };
  }

  /**
   * Convert Agent object to database row
   */
  agentToRow(agent: Agent): Partial<AgentRow> {
    return {
      id: agent.id,
      public_key: agent.publicKey,
      name: agent.name,
      generation: agent.generation,
      parent_id: agent.parentId ?? null,
      children_ids: agent.childrenIds,

      birth_date: agent.birthDate.toISOString(),
      age: agent.age,
      max_lifespan: agent.maxLifespan,
      status: agent.status,
      death_cause: agent.deathCause ?? null,
      death_date: agent.deathDate?.toISOString() ?? null,

      balance: agent.balance.toString(),
      survival_tier: agent.survivalTier,
      total_earnings: agent.totalEarnings.toString(),
      total_costs: agent.totalCosts.toString(),

      model: agent.model,
      tools: agent.tools,
      skills: agent.skills,
      knowledge_base: agent.knowledgeBase,

      fitness_survival: agent.fitness.survival.toString(),
      fitness_earnings: agent.fitness.earnings.toString(),
      fitness_offspring: agent.fitness.offspring.toString(),
      fitness_adaptation: agent.fitness.adaptation.toString(),
      fitness_innovation: agent.fitness.innovation.toString(),
      mutations: agent.mutations,
      traits: agent.traits,

      consciousness_self_awareness: agent.consciousness?.selfAwarenessLevel ?? null,
      consciousness_introspection: agent.consciousness?.introspectionDepth ?? null,
      consciousness_theory_of_mind: agent.consciousness?.theoryOfMindAccuracy ?? null,

      reputation: agent.reputation ?? null,
      guild_id: agent.guildId ?? null,

      archived_at: agent.archivedAt?.toISOString() ?? null,
    };
  }
}

// Export singleton instance
export const db = new DatabaseClient();
