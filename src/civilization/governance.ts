/**
 * Governance Systems
 * 
 * Implements governance frameworks including democracy, meritocracy, and plutocracy.
 * Implements Requirement 8.3: Governance systems with voting and policy enforcement.
 */

import type { Proposal, GovernanceType, Guild } from "./types.js";
import { getSupabaseClient } from "../database/client.js";
import { getGuild } from "./guild-formation.js";

/**
 * Create a governance proposal
 * 
 * @param guildId - Guild ID
 * @param proposerId - Proposer agent ID
 * @param title - Proposal title
 * @param description - Proposal description
 * @param type - Proposal type
 * @param votingDurationDays - Voting duration in days (default: 7)
 * @returns Created proposal
 */
export async function createProposal(
  guildId: string,
  proposerId: string,
  title: string,
  description: string,
  type: Proposal["type"],
  votingDurationDays: number = 7
): Promise<Proposal> {
  const supabase = getSupabaseClient();

  const guild = await getGuild(guildId);
  if (!guild) {
    throw new Error(`Guild ${guildId} not found`);
  }

  // Check if proposer is a member
  if (!guild.members.some((m) => m.agentId === proposerId)) {
    throw new Error(`Agent ${proposerId} is not a member of guild ${guildId}`);
  }

  const now = new Date();
  const votingEndsAt = new Date(now);
  votingEndsAt.setDate(votingEndsAt.getDate() + votingDurationDays);

  const proposal: Proposal = {
    id: crypto.randomUUID(),
    guildId,
    proposerId,
    title,
    description,
    type,
    createdAt: now,
    votingEndsAt,
    votes: [],
    status: "active",
  };

  const { error } = await supabase.from("proposals").insert({
    id: proposal.id,
    guild_id: proposal.guildId,
    proposer_id: proposal.proposerId,
    title: proposal.title,
    description: proposal.description,
    type: proposal.type,
    created_at: proposal.createdAt.toISOString(),
    voting_ends_at: proposal.votingEndsAt.toISOString(),
    votes: proposal.votes,
    status: proposal.status,
  });

  if (error) {
    throw new Error(`Failed to create proposal: ${error.message}`);
  }

  return proposal;
}

/**
 * Calculate voting power for an agent based on governance type
 * 
 * @param guild - Guild
 * @param agentId - Agent ID
 * @returns Voting power
 */
export async function calculateVotingPower(
  guild: Guild,
  agentId: string
): Promise<number> {
  const member = guild.members.find((m) => m.agentId === agentId);
  if (!member) {
    return 0;
  }

  switch (guild.governance.votingPower) {
    case "equal":
      return 1;

    case "reputation":
      // Voting power based on reputation (0-100)
      return member.reputation;

    case "stake":
      // Voting power based on contributions
      return Math.max(1, member.contributions);

    default:
      return 1;
  }
}

/**
 * Cast a vote on a proposal
 * 
 * @param proposalId - Proposal ID
 * @param agentId - Agent ID
 * @param vote - Vote choice
 */
export async function castVote(
  proposalId: string,
  agentId: string,
  vote: "yes" | "no" | "abstain"
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  if (proposal.status !== "active") {
    throw new Error(`Proposal ${proposalId} is not active`);
  }

  // Check if voting period has ended
  if (new Date() > new Date(proposal.voting_ends_at)) {
    throw new Error(`Voting period for proposal ${proposalId} has ended`);
  }

  const guild = await getGuild(proposal.guild_id);
  if (!guild) {
    throw new Error(`Guild ${proposal.guild_id} not found`);
  }

  // Check if agent is a member
  if (!guild.members.some((m) => m.agentId === agentId)) {
    throw new Error(`Agent ${agentId} is not a member of guild ${proposal.guild_id}`);
  }

  // Check if already voted
  if (proposal.votes.some((v: any) => v.agentId === agentId)) {
    throw new Error(`Agent ${agentId} has already voted on proposal ${proposalId}`);
  }

  // Calculate voting power
  const votingPower = await calculateVotingPower(guild, agentId);

  const voteRecord = {
    agentId,
    vote,
    votingPower,
    timestamp: new Date(),
  };

  const updatedVotes = [...proposal.votes, voteRecord];

  const { error } = await supabase
    .from("proposals")
    .update({ votes: updatedVotes })
    .eq("id", proposalId);

  if (error) {
    throw new Error(`Failed to cast vote: ${error.message}`);
  }
}

/**
 * Tally votes for a proposal
 * 
 * @param proposalId - Proposal ID
 * @returns Vote tally
 */
export async function tallyVotes(proposalId: string): Promise<{
  yes: number;
  no: number;
  abstain: number;
  total: number;
  passed: boolean;
}> {
  const supabase = getSupabaseClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  let yesVotes = 0;
  let noVotes = 0;
  let abstainVotes = 0;

  for (const vote of proposal.votes) {
    if (vote.vote === "yes") {
      yesVotes += vote.votingPower;
    } else if (vote.vote === "no") {
      noVotes += vote.votingPower;
    } else if (vote.vote === "abstain") {
      abstainVotes += vote.votingPower;
    }
  }

  const total = yesVotes + noVotes + abstainVotes;

  // Proposal passes if yes votes > no votes (simple majority)
  const passed = yesVotes > noVotes;

  return {
    yes: yesVotes,
    no: noVotes,
    abstain: abstainVotes,
    total,
    passed,
  };
}

/**
 * Finalize a proposal (close voting and determine outcome)
 * 
 * @param proposalId - Proposal ID
 * @returns Final proposal status
 */
export async function finalizeProposal(
  proposalId: string
): Promise<"passed" | "rejected"> {
  const supabase = getSupabaseClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  if (proposal.status !== "active") {
    throw new Error(`Proposal ${proposalId} is not active`);
  }

  // Check if voting period has ended
  if (new Date() < new Date(proposal.voting_ends_at)) {
    throw new Error(`Voting period for proposal ${proposalId} has not ended yet`);
  }

  const tally = await tallyVotes(proposalId);
  const status = tally.passed ? "passed" : "rejected";

  const { error } = await supabase
    .from("proposals")
    .update({ status })
    .eq("id", proposalId);

  if (error) {
    throw new Error(`Failed to finalize proposal: ${error.message}`);
  }

  return status;
}

/**
 * Execute a passed proposal
 * 
 * @param proposalId - Proposal ID
 */
export async function executeProposal(proposalId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: proposal } = await supabase
    .from("proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (!proposal) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  if (proposal.status !== "passed") {
    throw new Error(`Proposal ${proposalId} has not passed`);
  }

  // Mark as executed
  const { error } = await supabase
    .from("proposals")
    .update({
      status: "executed",
      executed_at: new Date().toISOString(),
    })
    .eq("id", proposalId);

  if (error) {
    throw new Error(`Failed to execute proposal: ${error.message}`);
  }

  // Note: Actual execution logic would depend on proposal type
  // This would be implemented based on specific proposal types
}

/**
 * Get all proposals for a guild
 * 
 * @param guildId - Guild ID
 * @param status - Optional status filter
 * @returns Array of proposals
 */
export async function getGuildProposals(
  guildId: string,
  status?: Proposal["status"]
): Promise<Proposal[]> {
  const supabase = getSupabaseClient();

  let query = supabase
    .from("proposals")
    .select("*")
    .eq("guild_id", guildId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    guildId: row.guild_id,
    proposerId: row.proposer_id,
    title: row.title,
    description: row.description,
    type: row.type,
    createdAt: new Date(row.created_at),
    votingEndsAt: new Date(row.voting_ends_at),
    votes: row.votes,
    status: row.status,
    executedAt: row.executed_at ? new Date(row.executed_at) : undefined,
  }));
}

/**
 * Get governance statistics for a guild
 * 
 * @param guildId - Guild ID
 * @returns Governance statistics
 */
export async function getGovernanceStats(guildId: string): Promise<{
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  rejectedProposals: number;
  executedProposals: number;
  participationRate: number;
}> {
  const proposals = await getGuildProposals(guildId);
  const guild = await getGuild(guildId);

  if (!guild) {
    throw new Error(`Guild ${guildId} not found`);
  }

  const active = proposals.filter((p) => p.status === "active").length;
  const passed = proposals.filter((p) => p.status === "passed").length;
  const rejected = proposals.filter((p) => p.status === "rejected").length;
  const executed = proposals.filter((p) => p.status === "executed").length;

  // Calculate participation rate (average voters per proposal)
  const totalVotes = proposals.reduce((sum, p) => sum + p.votes.length, 0);
  const avgVotersPerProposal =
    proposals.length > 0 ? totalVotes / proposals.length : 0;
  const participationRate =
    guild.totalMembers > 0
      ? (avgVotersPerProposal / guild.totalMembers) * 100
      : 0;

  return {
    totalProposals: proposals.length,
    activeProposals: active,
    passedProposals: passed,
    rejectedProposals: rejected,
    executedProposals: executed,
    participationRate,
  };
}
