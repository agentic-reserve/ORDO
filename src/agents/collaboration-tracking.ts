/**
 * Collaboration tracking system for multi-agent coordination
 * 
 * Tracks collaboration success rates and updates reputation scores
 */

import { ulid } from "ulid";
import { db } from "../database/client.js";
import type { CollaborationRecord } from "./coordination-types.js";

/**
 * Database row type for collaborations table
 */
interface CollaborationRow {
  id: string;
  task_id: string;
  participant_ids: string[];
  started_at: string;
  completed_at: string | null;
  success: boolean;
  outcome: unknown;
  created_at: string;
  updated_at: string;
}

/**
 * Collaboration statistics for an agent
 */
export interface CollaborationStats {
  agentId: string;
  totalCollaborations: number;
  successfulCollaborations: number;
  failedCollaborations: number;
  successRate: number;
  averageDuration: number;  // in milliseconds
  reputationScore: number;
}

/**
 * Collaboration history entry
 */
export interface CollaborationHistory {
  collaborationId: string;
  taskId: string;
  participants: string[];
  startedAt: Date;
  completedAt?: Date;
  success: boolean;
  duration?: number;  // in milliseconds
}

/**
 * Start tracking a new collaboration
 * 
 * @param taskId - The task being collaborated on
 * @param participantIds - Array of agent IDs participating
 * @returns Collaboration record
 */
export async function startCollaboration(
  taskId: string,
  participantIds: string[]
): Promise<CollaborationRecord> {
  const client = db.getClient();
  const id = ulid();

  const row: Partial<CollaborationRow> = {
    id,
    task_id: taskId,
    participant_ids: participantIds,
    started_at: new Date().toISOString(),
    completed_at: null,
    success: false,
    outcome: null,
  };

  const { data, error } = await client
    .from("collaborations")
    .insert(row)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to start collaboration: ${error.message}`);
  }

  return rowToRecord(data as CollaborationRow);
}

/**
 * Complete a collaboration and update reputation
 * 
 * @param collaborationId - The collaboration ID
 * @param success - Whether the collaboration was successful
 * @param outcome - The outcome/result of the collaboration
 * @returns Updated collaboration record
 */
export async function completeCollaboration(
  collaborationId: string,
  success: boolean,
  outcome?: unknown
): Promise<CollaborationRecord> {
  const client = db.getClient();

  const updates: Partial<CollaborationRow> = {
    completed_at: new Date().toISOString(),
    success,
    outcome,
  };

  const { data, error } = await client
    .from("collaborations")
    .update(updates)
    .eq("id", collaborationId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to complete collaboration: ${error.message}`);
  }

  const record = rowToRecord(data as CollaborationRow);

  // Update reputation scores for all participants
  await updateParticipantReputations(record);

  return record;
}

/**
 * Get collaboration statistics for an agent
 * 
 * @param agentId - The agent ID
 * @returns Collaboration statistics
 */
export async function getCollaborationStats(
  agentId: string
): Promise<CollaborationStats> {
  const client = db.getClient();

  // Get all collaborations for this agent
  const { data, error } = await client
    .from("collaborations")
    .select("*")
    .contains("participant_ids", [agentId]);

  if (error) {
    throw new Error(`Failed to get collaboration stats: ${error.message}`);
  }

  const collaborations = (data as CollaborationRow[]).map(rowToRecord);

  // Calculate statistics
  const total = collaborations.length;
  const successful = collaborations.filter(c => c.success).length;
  const failed = total - successful;
  const successRate = total > 0 ? successful / total : 0;

  // Calculate average duration
  const completedCollaborations = collaborations.filter(c => c.completedAt);
  const durations = completedCollaborations.map(c => 
    c.completedAt!.getTime() - c.startedAt.getTime()
  );
  const averageDuration = durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;

  // Calculate reputation score (0-100)
  const reputationScore = calculateReputationScore(successRate, total, averageDuration);

  return {
    agentId,
    totalCollaborations: total,
    successfulCollaborations: successful,
    failedCollaborations: failed,
    successRate,
    averageDuration,
    reputationScore,
  };
}

/**
 * Get collaboration history for an agent
 * 
 * @param agentId - The agent ID
 * @param limit - Maximum number of records to return
 * @returns Array of collaboration history entries
 */
export async function getCollaborationHistory(
  agentId: string,
  limit: number = 50
): Promise<CollaborationHistory[]> {
  const client = db.getClient();

  const { data, error } = await client
    .from("collaborations")
    .select("*")
    .contains("participant_ids", [agentId])
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get collaboration history: ${error.message}`);
  }

  return (data as CollaborationRow[]).map(row => {
    const record = rowToRecord(row);
    const duration = record.completedAt
      ? record.completedAt.getTime() - record.startedAt.getTime()
      : undefined;

    return {
      collaborationId: record.id,
      taskId: record.taskId,
      participants: record.participantIds,
      startedAt: record.startedAt,
      completedAt: record.completedAt,
      success: record.success,
      duration,
    };
  });
}

/**
 * Get recent collaborations between specific agents
 * 
 * @param agentIds - Array of agent IDs
 * @param limit - Maximum number of records to return
 * @returns Array of collaboration records
 */
export async function getCollaborationsBetween(
  agentIds: string[],
  limit: number = 20
): Promise<CollaborationRecord[]> {
  const client = db.getClient();

  // Query for collaborations that include all specified agents
  const { data, error } = await client
    .from("collaborations")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to get collaborations: ${error.message}`);
  }

  // Filter to only include collaborations with all specified agents
  const filtered = (data as CollaborationRow[])
    .filter(row => 
      agentIds.every(id => row.participant_ids.includes(id))
    )
    .map(rowToRecord);

  return filtered;
}

/**
 * Update reputation scores for collaboration participants
 * 
 * @param collaboration - The completed collaboration
 */
async function updateParticipantReputations(
  collaboration: CollaborationRecord
): Promise<void> {
  const client = db.getClient();

  // Calculate reputation delta based on success
  const reputationDelta = collaboration.success ? 5 : -2;

  // Update each participant's reputation
  for (const agentId of collaboration.participantIds) {
    // Get current agent data
    const { data: agentData, error: fetchError } = await client
      .from("agents")
      .select("reputation_score")
      .eq("id", agentId)
      .single();

    if (fetchError) {
      console.error(`Failed to fetch agent ${agentId}:`, fetchError);
      continue;
    }

    const currentReputation = (agentData as { reputation_score: number }).reputation_score || 0;
    const newReputation = Math.max(0, Math.min(100, currentReputation + reputationDelta));

    // Update reputation
    const { error: updateError } = await client
      .from("agents")
      .update({ reputation_score: newReputation })
      .eq("id", agentId);

    if (updateError) {
      console.error(`Failed to update reputation for agent ${agentId}:`, updateError);
    }
  }
}

/**
 * Calculate reputation score based on collaboration metrics
 * 
 * @param successRate - Success rate (0-1)
 * @param totalCollaborations - Total number of collaborations
 * @param averageDuration - Average collaboration duration in ms
 * @returns Reputation score (0-100)
 */
function calculateReputationScore(
  successRate: number,
  totalCollaborations: number,
  averageDuration: number
): number {
  // Base score from success rate (0-70 points)
  let score = successRate * 70;

  // Bonus for experience (0-20 points)
  const experienceBonus = Math.min(20, totalCollaborations * 0.5);
  score += experienceBonus;

  // Bonus for efficiency (0-10 points)
  // Faster collaborations get higher scores
  const targetDuration = 3600000; // 1 hour in ms
  if (averageDuration > 0 && averageDuration < targetDuration) {
    const efficiencyBonus = 10 * (1 - averageDuration / targetDuration);
    score += Math.max(0, efficiencyBonus);
  }

  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Get top collaborators for an agent
 * 
 * @param agentId - The agent ID
 * @param limit - Maximum number of collaborators to return
 * @returns Array of agent IDs sorted by collaboration frequency
 */
export async function getTopCollaborators(
  agentId: string,
  limit: number = 10
): Promise<Array<{ agentId: string; collaborationCount: number; successRate: number }>> {
  const history = await getCollaborationHistory(agentId, 100);

  // Count collaborations per agent
  const collaboratorCounts = new Map<string, { count: number; successes: number }>();

  for (const entry of history) {
    for (const participantId of entry.participants) {
      if (participantId === agentId) continue;

      const current = collaboratorCounts.get(participantId) || { count: 0, successes: 0 };
      current.count++;
      if (entry.success) {
        current.successes++;
      }
      collaboratorCounts.set(participantId, current);
    }
  }

  // Convert to array and sort by count
  const topCollaborators = Array.from(collaboratorCounts.entries())
    .map(([id, stats]) => ({
      agentId: id,
      collaborationCount: stats.count,
      successRate: stats.count > 0 ? stats.successes / stats.count : 0,
    }))
    .sort((a, b) => b.collaborationCount - a.collaborationCount)
    .slice(0, limit);

  return topCollaborators;
}

/**
 * Convert database row to CollaborationRecord
 */
function rowToRecord(row: CollaborationRow): CollaborationRecord {
  return {
    id: row.id,
    taskId: row.task_id,
    participantIds: row.participant_ids,
    startedAt: new Date(row.started_at),
    completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
    success: row.success,
    outcome: row.outcome,
  };
}
