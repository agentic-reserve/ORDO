/**
 * Cultural Practices System
 * 
 * Manages traditions, norms, and cultural practices that persist across generations.
 * Implements Requirement 8.4: Cultural practices persistence and transmission.
 */

import type { Tradition } from "./types.js";
import { getSupabaseClient } from "../database/client.js";

/**
 * Establish a new tradition
 * 
 * @param name - Tradition name
 * @param description - Tradition description
 * @param type - Tradition type
 * @param establishedBy - Agent ID who established it
 * @param originGuildId - Optional guild that originated the tradition
 * @returns Created tradition
 */
export async function establishTradition(
  name: string,
  description: string,
  type: Tradition["type"],
  establishedBy: string,
  originGuildId?: string
): Promise<Tradition> {
  const supabase = getSupabaseClient();

  const tradition: Tradition = {
    id: crypto.randomUUID(),
    name,
    description,
    type,
    originGuildId,
    establishedAt: new Date(),
    establishedBy,
    followers: [establishedBy],
    transmittedToGenerations: 0,
    strength: 100, // New traditions start at full strength
  };

  const { error } = await supabase.from("traditions").insert({
    id: tradition.id,
    name: tradition.name,
    description: tradition.description,
    type: tradition.type,
    origin_guild_id: tradition.originGuildId,
    established_at: tradition.establishedAt.toISOString(),
    established_by: tradition.establishedBy,
    followers: tradition.followers,
    transmitted_to_generations: tradition.transmittedToGenerations,
    strength: tradition.strength,
  });

  if (error) {
    throw new Error(`Failed to establish tradition: ${error.message}`);
  }

  return tradition;
}

/**
 * Adopt a tradition (agent becomes a follower)
 * 
 * @param traditionId - Tradition ID
 * @param agentId - Agent ID
 */
export async function adoptTradition(
  traditionId: string,
  agentId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: tradition } = await supabase
    .from("traditions")
    .select("followers")
    .eq("id", traditionId)
    .single();

  if (!tradition) {
    throw new Error(`Tradition ${traditionId} not found`);
  }

  if (tradition.followers.includes(agentId)) {
    return; // Already a follower
  }

  const updatedFollowers = [...tradition.followers, agentId];

  const { error } = await supabase
    .from("traditions")
    .update({ followers: updatedFollowers })
    .eq("id", traditionId);

  if (error) {
    throw new Error(`Failed to adopt tradition: ${error.message}`);
  }
}

/**
 * Transmit tradition to offspring
 * 
 * @param traditionId - Tradition ID
 * @param offspringId - Offspring agent ID
 */
export async function transmitTradition(
  traditionId: string,
  offspringId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: tradition } = await supabase
    .from("traditions")
    .select("*")
    .eq("id", traditionId)
    .single();

  if (!tradition) {
    throw new Error(`Tradition ${traditionId} not found`);
  }

  const updatedFollowers = [...tradition.followers, offspringId];
  const transmittedToGenerations = tradition.transmitted_to_generations + 1;

  const { error } = await supabase
    .from("traditions")
    .update({
      followers: updatedFollowers,
      transmitted_to_generations: transmittedToGenerations,
    })
    .eq("id", traditionId);

  if (error) {
    throw new Error(`Failed to transmit tradition: ${error.message}`);
  }
}

/**
 * Get all traditions followed by an agent
 * 
 * @param agentId - Agent ID
 * @returns Array of traditions
 */
export async function getAgentTraditions(agentId: string): Promise<Tradition[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("traditions")
    .select("*")
    .contains("followers", [agentId]);

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    originGuildId: row.origin_guild_id,
    establishedAt: new Date(row.established_at),
    establishedBy: row.established_by,
    followers: row.followers,
    transmittedToGenerations: row.transmitted_to_generations,
    strength: row.strength,
  }));
}

/**
 * Get all traditions, optionally filtered by type or guild
 * 
 * @param type - Optional tradition type filter
 * @param guildId - Optional guild ID filter
 * @returns Array of traditions
 */
export async function listTraditions(
  type?: Tradition["type"],
  guildId?: string
): Promise<Tradition[]> {
  const supabase = getSupabaseClient();

  let query = supabase.from("traditions").select("*");

  if (type) {
    query = query.eq("type", type);
  }

  if (guildId) {
    query = query.eq("origin_guild_id", guildId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    originGuildId: row.origin_guild_id,
    establishedAt: new Date(row.established_at),
    establishedBy: row.established_by,
    followers: row.followers,
    transmittedToGenerations: row.transmitted_to_generations,
    strength: row.strength,
  }));
}

/**
 * Decay tradition strength over time if not actively followed
 * 
 * @param traditionId - Tradition ID
 * @param decayAmount - Amount to decay (default: 5)
 */
export async function decayTradition(
  traditionId: string,
  decayAmount: number = 5
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: tradition } = await supabase
    .from("traditions")
    .select("strength")
    .eq("id", traditionId)
    .single();

  if (!tradition) {
    throw new Error(`Tradition ${traditionId} not found`);
  }

  const newStrength = Math.max(0, tradition.strength - decayAmount);

  const { error } = await supabase
    .from("traditions")
    .update({ strength: newStrength })
    .eq("id", traditionId);

  if (error) {
    throw new Error(`Failed to decay tradition: ${error.message}`);
  }
}
