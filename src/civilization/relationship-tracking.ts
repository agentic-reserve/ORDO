/**
 * Social Relationship Tracking
 * 
 * Tracks relationships between agents including collaboration, competition, mentorship, etc.
 * Implements Requirement 8.2: Social relationship tracking and reputation updates.
 */

import type { Relationship, RelationshipType } from "./types.js";
import { getSupabaseClient } from "../database/client.js";

/**
 * Create or update a relationship between two agents
 * 
 * @param agentId1 - First agent ID
 * @param agentId2 - Second agent ID
 * @param type - Relationship type
 * @param strengthDelta - Change in relationship strength (default: 10)
 * @returns Updated relationship
 */
export async function trackRelationship(
  agentId1: string,
  agentId2: string,
  type: RelationshipType,
  strengthDelta: number = 10
): Promise<Relationship> {
  const supabase = getSupabaseClient();

  // Normalize agent order (always store with smaller ID first)
  const [id1, id2] =
    agentId1 < agentId2 ? [agentId1, agentId2] : [agentId2, agentId1];

  // Check if relationship exists
  const { data: existing } = await supabase
    .from("relationships")
    .select("*")
    .eq("agent_id_1", id1)
    .eq("agent_id_2", id2)
    .single();

  const now = new Date();

  if (existing) {
    // Update existing relationship
    const newStrength = Math.max(
      0,
      Math.min(100, existing.strength + strengthDelta)
    );
    const newInteractions = existing.interactions + 1;

    const { data, error } = await supabase
      .from("relationships")
      .update({
        type,
        strength: newStrength,
        interactions: newInteractions,
        last_interaction: now.toISOString(),
      })
      .eq("agent_id_1", id1)
      .eq("agent_id_2", id2)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update relationship: ${error.message}`);
    }

    return {
      agentId1: data.agent_id_1,
      agentId2: data.agent_id_2,
      type: data.type,
      strength: data.strength,
      interactions: data.interactions,
      lastInteraction: new Date(data.last_interaction),
      createdAt: new Date(data.created_at),
    };
  } else {
    // Create new relationship
    const relationship: Relationship = {
      agentId1: id1,
      agentId2: id2,
      type,
      strength: Math.max(0, Math.min(100, strengthDelta)),
      interactions: 1,
      lastInteraction: now,
      createdAt: now,
    };

    const { data, error } = await supabase
      .from("relationships")
      .insert({
        agent_id_1: relationship.agentId1,
        agent_id_2: relationship.agentId2,
        type: relationship.type,
        strength: relationship.strength,
        interactions: relationship.interactions,
        last_interaction: relationship.lastInteraction.toISOString(),
        created_at: relationship.createdAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create relationship: ${error.message}`);
    }

    return {
      agentId1: data.agent_id_1,
      agentId2: data.agent_id_2,
      type: data.type,
      strength: data.strength,
      interactions: data.interactions,
      lastInteraction: new Date(data.last_interaction),
      createdAt: new Date(data.created_at),
    };
  }
}

/**
 * Get relationship between two agents
 * 
 * @param agentId1 - First agent ID
 * @param agentId2 - Second agent ID
 * @returns Relationship or null if not found
 */
export async function getRelationship(
  agentId1: string,
  agentId2: string
): Promise<Relationship | null> {
  const supabase = getSupabaseClient();

  // Normalize agent order
  const [id1, id2] =
    agentId1 < agentId2 ? [agentId1, agentId2] : [agentId2, agentId1];

  const { data, error } = await supabase
    .from("relationships")
    .select("*")
    .eq("agent_id_1", id1)
    .eq("agent_id_2", id2)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    agentId1: data.agent_id_1,
    agentId2: data.agent_id_2,
    type: data.type,
    strength: data.strength,
    interactions: data.interactions,
    lastInteraction: new Date(data.last_interaction),
    createdAt: new Date(data.created_at),
  };
}

/**
 * Get all relationships for an agent
 * 
 * @param agentId - Agent ID
 * @param type - Optional filter by relationship type
 * @returns Array of relationships
 */
export async function getAgentRelationships(
  agentId: string,
  type?: RelationshipType
): Promise<Relationship[]> {
  const supabase = getSupabaseClient();

  // Query where agent is either id1 or id2
  let query = supabase
    .from("relationships")
    .select("*")
    .or(`agent_id_1.eq.${agentId},agent_id_2.eq.${agentId}`);

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    agentId1: row.agent_id_1,
    agentId2: row.agent_id_2,
    type: row.type,
    strength: row.strength,
    interactions: row.interactions,
    lastInteraction: new Date(row.last_interaction),
    createdAt: new Date(row.created_at),
  }));
}

/**
 * Update agent reputation based on interaction
 * 
 * @param agentId - Agent ID
 * @param reputationDelta - Change in reputation
 */
export async function updateAgentReputation(
  agentId: string,
  reputationDelta: number
): Promise<void> {
  const supabase = getSupabaseClient();

  // Get current reputation
  const { data: agent } = await supabase
    .from("agents")
    .select("reputation")
    .eq("public_key", agentId)
    .single();

  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Calculate new reputation (clamped to 0-100)
  const newReputation = Math.max(
    0,
    Math.min(100, agent.reputation + reputationDelta)
  );

  // Update reputation
  const { error } = await supabase
    .from("agents")
    .update({ reputation: newReputation })
    .eq("public_key", agentId);

  if (error) {
    throw new Error(`Failed to update reputation: ${error.message}`);
  }
}

/**
 * Record a collaboration between agents and update reputations
 * 
 * @param agentIds - Array of agent IDs involved in collaboration
 * @param success - Whether the collaboration was successful
 * @param contributionScores - Optional contribution scores for each agent (0-100)
 */
export async function recordCollaboration(
  agentIds: string[],
  success: boolean,
  contributionScores?: Record<string, number>
): Promise<void> {
  if (agentIds.length < 2) {
    throw new Error("Collaboration requires at least 2 agents");
  }

  // Track relationships between all pairs
  for (let i = 0; i < agentIds.length; i++) {
    for (let j = i + 1; j < agentIds.length; j++) {
      const strengthDelta = success ? 5 : -2;
      await trackRelationship(
        agentIds[i],
        agentIds[j],
        "collaboration",
        strengthDelta
      );
    }
  }

  // Update reputations based on success and contribution
  for (const agentId of agentIds) {
    let reputationDelta = success ? 2 : -1;

    // Adjust based on contribution score if provided
    if (contributionScores && contributionScores[agentId] !== undefined) {
      const contribution = contributionScores[agentId];
      reputationDelta = success
        ? Math.floor((contribution / 100) * 5)
        : -Math.floor((contribution / 100) * 2);
    }

    await updateAgentReputation(agentId, reputationDelta);
  }
}

/**
 * Record a competition between agents
 * 
 * @param winnerId - Winner agent ID
 * @param loserId - Loser agent ID
 * @param margin - Victory margin (0-100, affects reputation change)
 */
export async function recordCompetition(
  winnerId: string,
  loserId: string,
  margin: number = 50
): Promise<void> {
  // Track competitive relationship
  await trackRelationship(winnerId, loserId, "competition", 3);

  // Update reputations based on margin
  const winnerGain = Math.floor((margin / 100) * 5);
  const loserLoss = -Math.floor((margin / 100) * 3);

  await updateAgentReputation(winnerId, winnerGain);
  await updateAgentReputation(loserId, loserLoss);
}

/**
 * Record a mentorship relationship
 * 
 * @param mentorId - Mentor agent ID
 * @param menteeId - Mentee agent ID
 * @param progress - Mentee's progress (0-100)
 */
export async function recordMentorship(
  mentorId: string,
  menteeId: string,
  progress: number
): Promise<void> {
  // Track mentorship relationship
  const strengthDelta = Math.floor((progress / 100) * 10);
  await trackRelationship(mentorId, menteeId, "mentorship", strengthDelta);

  // Mentor gains reputation for successful mentoring
  const mentorGain = Math.floor((progress / 100) * 3);
  await updateAgentReputation(mentorId, mentorGain);

  // Mentee gains reputation for learning
  const menteeGain = Math.floor((progress / 100) * 2);
  await updateAgentReputation(menteeId, menteeGain);
}

/**
 * Get social network statistics for an agent
 * 
 * @param agentId - Agent ID
 * @returns Social network statistics
 */
export async function getSocialNetworkStats(agentId: string): Promise<{
  totalRelationships: number;
  collaborations: number;
  competitions: number;
  mentorships: number;
  alliances: number;
  rivalries: number;
  avgRelationshipStrength: number;
  strongestRelationship: Relationship | null;
}> {
  const relationships = await getAgentRelationships(agentId);

  const stats = {
    totalRelationships: relationships.length,
    collaborations: relationships.filter((r) => r.type === "collaboration")
      .length,
    competitions: relationships.filter((r) => r.type === "competition").length,
    mentorships: relationships.filter((r) => r.type === "mentorship").length,
    alliances: relationships.filter((r) => r.type === "alliance").length,
    rivalries: relationships.filter((r) => r.type === "rivalry").length,
    avgRelationshipStrength:
      relationships.length > 0
        ? relationships.reduce((sum, r) => sum + r.strength, 0) /
          relationships.length
        : 0,
    strongestRelationship:
      relationships.length > 0
        ? relationships.reduce((strongest, r) =>
            r.strength > strongest.strength ? r : strongest
          )
        : null,
  };

  return stats;
}

/**
 * Decay relationship strength over time for inactive relationships
 * 
 * @param daysInactive - Number of days since last interaction
 * @param decayRate - Decay rate per day (default: 1)
 */
export async function decayInactiveRelationships(
  daysInactive: number = 30,
  decayRate: number = 1
): Promise<number> {
  const supabase = getSupabaseClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

  // Get inactive relationships
  const { data: relationships } = await supabase
    .from("relationships")
    .select("*")
    .lt("last_interaction", cutoffDate.toISOString());

  if (!relationships || relationships.length === 0) {
    return 0;
  }

  // Decay each relationship
  let decayedCount = 0;
  for (const rel of relationships) {
    const daysSinceInteraction = Math.floor(
      (Date.now() - new Date(rel.last_interaction).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    const decay = Math.min(rel.strength, daysSinceInteraction * decayRate);
    const newStrength = Math.max(0, rel.strength - decay);

    await supabase
      .from("relationships")
      .update({ strength: newStrength })
      .eq("agent_id_1", rel.agent_id_1)
      .eq("agent_id_2", rel.agent_id_2);

    decayedCount++;
  }

  return decayedCount;
}
