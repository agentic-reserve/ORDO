/**
 * Guild Formation System
 * 
 * Enables agents to form guilds based on specialization.
 * Implements Requirement 8.1: Guild formation for specialized groups.
 */

import type { Agent } from "../types/agent.js";
import type {
  Guild,
  GuildType,
  GuildMember,
  CreateGuildParams,
  GuildApplication,
} from "./types.js";
import { getSupabaseClient } from "../database/client.js";

/**
 * Create a new guild
 * 
 * @param params - Guild creation parameters
 * @returns Created guild
 */
export async function createGuild(params: CreateGuildParams): Promise<Guild> {
  const supabase = getSupabaseClient();

  const guild: Guild = {
    id: crypto.randomUUID(),
    name: params.name,
    type: params.type,
    description: params.description,
    foundedAt: new Date(),
    founderId: params.founderId,
    members: [
      {
        agentId: params.founderId,
        role: "founder",
        joinedAt: new Date(),
        contributions: 0,
        reputation: 100,
      },
    ],
    totalMembers: 1,
    requirements: params.requirements,
    resources: {
      sharedBalance: 0,
      sharedKnowledge: [],
      sharedTools: [],
    },
    governance: params.governance || {
      type: "democracy",
      votingPower: "equal",
    },
    active: true,
  };

  // Store guild in database
  const { error } = await supabase.from("guilds").insert({
    id: guild.id,
    name: guild.name,
    type: guild.type,
    description: guild.description,
    founded_at: guild.foundedAt.toISOString(),
    founder_id: guild.founderId,
    members: guild.members,
    total_members: guild.totalMembers,
    requirements: guild.requirements,
    resources: guild.resources,
    governance: guild.governance,
    active: guild.active,
  });

  if (error) {
    throw new Error(`Failed to create guild: ${error.message}`);
  }

  return guild;
}

/**
 * Get guild by ID
 * 
 * @param guildId - Guild ID
 * @returns Guild or null if not found
 */
export async function getGuild(guildId: string): Promise<Guild | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("guilds")
    .select("*")
    .eq("id", guildId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    type: data.type,
    description: data.description,
    foundedAt: new Date(data.founded_at),
    founderId: data.founder_id,
    members: data.members,
    totalMembers: data.total_members,
    requirements: data.requirements,
    resources: data.resources,
    governance: data.governance,
    active: data.active,
  };
}

/**
 * List all guilds, optionally filtered by type
 * 
 * @param type - Optional guild type filter
 * @returns Array of guilds
 */
export async function listGuilds(type?: GuildType): Promise<Guild[]> {
  const supabase = getSupabaseClient();

  let query = supabase.from("guilds").select("*").eq("active", true);

  if (type) {
    query = query.eq("type", type);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    foundedAt: new Date(row.founded_at),
    founderId: row.founder_id,
    members: row.members,
    totalMembers: row.total_members,
    requirements: row.requirements,
    resources: row.resources,
    governance: row.governance,
    active: row.active,
  }));
}

/**
 * Check if an agent meets guild requirements
 * 
 * @param agent - Agent to check
 * @param guild - Guild to check against
 * @returns True if agent meets requirements
 */
export function meetsGuildRequirements(agent: Agent, guild: Guild): boolean {
  if (!guild.requirements) {
    return true;
  }

  const { minReputation, minAge, minBalance, requiredSkills } =
    guild.requirements;

  if (minReputation && agent.reputation < minReputation) {
    return false;
  }

  if (minAge && agent.age < minAge) {
    return false;
  }

  if (minBalance && agent.balance < minBalance) {
    return false;
  }

  if (requiredSkills && requiredSkills.length > 0) {
    const agentSkills = agent.skills.map((s) => s.name);
    const hasAllSkills = requiredSkills.every((skill) =>
      agentSkills.includes(skill)
    );
    if (!hasAllSkills) {
      return false;
    }
  }

  return true;
}

/**
 * Apply to join a guild
 * 
 * @param guildId - Guild ID
 * @param agentId - Agent ID
 * @param message - Application message
 * @returns Application
 */
export async function applyToGuild(
  guildId: string,
  agentId: string,
  message: string
): Promise<GuildApplication> {
  const supabase = getSupabaseClient();

  const application: GuildApplication = {
    id: crypto.randomUUID(),
    guildId,
    applicantId: agentId,
    message,
    appliedAt: new Date(),
    status: "pending",
  };

  const { error } = await supabase.from("guild_applications").insert({
    id: application.id,
    guild_id: application.guildId,
    applicant_id: application.applicantId,
    message: application.message,
    applied_at: application.appliedAt.toISOString(),
    status: application.status,
  });

  if (error) {
    throw new Error(`Failed to apply to guild: ${error.message}`);
  }

  return application;
}

/**
 * Add a member to a guild
 * 
 * @param guildId - Guild ID
 * @param agentId - Agent ID
 * @param role - Member role (default: "member")
 * @returns Updated guild
 */
export async function addGuildMember(
  guildId: string,
  agentId: string,
  role: GuildMember["role"] = "member"
): Promise<Guild> {
  const guild = await getGuild(guildId);
  if (!guild) {
    throw new Error(`Guild ${guildId} not found`);
  }

  // Check if already a member
  if (guild.members.some((m) => m.agentId === agentId)) {
    throw new Error(`Agent ${agentId} is already a member of guild ${guildId}`);
  }

  const newMember: GuildMember = {
    agentId,
    role,
    joinedAt: new Date(),
    contributions: 0,
    reputation: 50, // Starting reputation
  };

  guild.members.push(newMember);
  guild.totalMembers = guild.members.length;

  // Update database
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("guilds")
    .update({
      members: guild.members,
      total_members: guild.totalMembers,
    })
    .eq("id", guildId);

  if (error) {
    throw new Error(`Failed to add guild member: ${error.message}`);
  }

  return guild;
}

/**
 * Remove a member from a guild
 * 
 * @param guildId - Guild ID
 * @param agentId - Agent ID
 * @returns Updated guild
 */
export async function removeGuildMember(
  guildId: string,
  agentId: string
): Promise<Guild> {
  const guild = await getGuild(guildId);
  if (!guild) {
    throw new Error(`Guild ${guildId} not found`);
  }

  // Cannot remove founder
  if (agentId === guild.founderId) {
    throw new Error("Cannot remove guild founder");
  }

  guild.members = guild.members.filter((m) => m.agentId !== agentId);
  guild.totalMembers = guild.members.length;

  // Update database
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("guilds")
    .update({
      members: guild.members,
      total_members: guild.totalMembers,
    })
    .eq("id", guildId);

  if (error) {
    throw new Error(`Failed to remove guild member: ${error.message}`);
  }

  return guild;
}

/**
 * Get guilds that an agent is a member of
 * 
 * @param agentId - Agent ID
 * @returns Array of guilds
 */
export async function getAgentGuilds(agentId: string): Promise<Guild[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("guilds")
    .select("*")
    .eq("active", true);

  if (error || !data) {
    return [];
  }

  // Filter guilds where agent is a member
  const agentGuilds = data.filter((row) =>
    row.members.some((m: GuildMember) => m.agentId === agentId)
  );

  return agentGuilds.map((row) => ({
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    foundedAt: new Date(row.founded_at),
    founderId: row.founder_id,
    members: row.members,
    totalMembers: row.total_members,
    requirements: row.requirements,
    resources: row.resources,
    governance: row.governance,
    active: row.active,
  }));
}

/**
 * Update guild member contribution and reputation
 * 
 * @param guildId - Guild ID
 * @param agentId - Agent ID
 * @param contributionDelta - Change in contributions
 * @param reputationDelta - Change in reputation
 */
export async function updateMemberContribution(
  guildId: string,
  agentId: string,
  contributionDelta: number,
  reputationDelta: number
): Promise<void> {
  const guild = await getGuild(guildId);
  if (!guild) {
    throw new Error(`Guild ${guildId} not found`);
  }

  const member = guild.members.find((m) => m.agentId === agentId);
  if (!member) {
    throw new Error(`Agent ${agentId} is not a member of guild ${guildId}`);
  }

  member.contributions += contributionDelta;
  member.reputation = Math.max(0, Math.min(100, member.reputation + reputationDelta));

  // Update database
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("guilds")
    .update({
      members: guild.members,
    })
    .eq("id", guildId);

  if (error) {
    throw new Error(`Failed to update member contribution: ${error.message}`);
  }
}
