/**
 * Civilization System Types
 * 
 * Types for agent societies, guilds, governance, and cultural practices.
 */

import type { Agent } from "../types/agent.js";

/**
 * Guild types based on specialization
 */
export type GuildType = 
  | "traders"      // Trading and market operations
  | "researchers"  // Knowledge discovery and analysis
  | "builders"     // Infrastructure and tool creation
  | "security"     // Safety and protection
  | "educators"    // Teaching and knowledge transfer
  | "coordinators" // Multi-agent orchestration
  | "artists"      // Creative and cultural work
  | "explorers";   // New domain discovery

/**
 * Guild member role within the guild
 */
export type GuildRole = 
  | "founder"      // Created the guild
  | "leader"       // Current guild leader
  | "member"       // Regular member
  | "apprentice"   // Learning member
  | "elder";       // Senior advisor

/**
 * Guild member information
 */
export interface GuildMember {
  agentId: string;
  role: GuildRole;
  joinedAt: Date;
  contributions: number;
  reputation: number;
}

/**
 * Guild structure
 */
export interface Guild {
  id: string;
  name: string;
  type: GuildType;
  description: string;
  foundedAt: Date;
  founderId: string;
  members: GuildMember[];
  totalMembers: number;
  requirements?: {
    minReputation?: number;
    minAge?: number;
    minBalance?: number;
    requiredSkills?: string[];
  };
  resources: {
    sharedBalance: number;
    sharedKnowledge: string[];
    sharedTools: string[];
  };
  governance: {
    type: "democracy" | "meritocracy" | "plutocracy" | "autocracy";
    votingPower: "equal" | "reputation" | "stake";
  };
  active: boolean;
}

/**
 * Relationship types between agents
 */
export type RelationshipType = 
  | "collaboration"  // Working together
  | "competition"    // Competing for resources
  | "mentorship"     // Teaching/learning relationship
  | "alliance"       // Strategic partnership
  | "rivalry";       // Competitive opposition

/**
 * Social relationship between agents
 */
export interface Relationship {
  agentId1: string;
  agentId2: string;
  type: RelationshipType;
  strength: number; // 0-100
  interactions: number;
  lastInteraction: Date;
  createdAt: Date;
}

/**
 * Governance system types
 */
export type GovernanceType = 
  | "democracy"     // One agent, one vote
  | "meritocracy"   // Voting power based on reputation
  | "plutocracy"    // Voting power based on wealth
  | "autocracy";    // Single leader decides

/**
 * Governance proposal
 */
export interface Proposal {
  id: string;
  guildId: string;
  proposerId: string;
  title: string;
  description: string;
  type: "policy" | "resource_allocation" | "membership" | "governance_change";
  createdAt: Date;
  votingEndsAt: Date;
  votes: {
    agentId: string;
    vote: "yes" | "no" | "abstain";
    votingPower: number;
    timestamp: Date;
  }[];
  status: "active" | "passed" | "rejected" | "executed";
  executedAt?: Date;
}

/**
 * Cultural tradition or practice
 */
export interface Tradition {
  id: string;
  name: string;
  description: string;
  type: "ritual" | "norm" | "value" | "practice";
  originGuildId?: string;
  establishedAt: Date;
  establishedBy: string;
  followers: string[]; // Agent IDs
  transmittedToGenerations: number;
  strength: number; // 0-100, how strongly followed
}

/**
 * Knowledge institution
 */
export interface Institution {
  id: string;
  name: string;
  type: "library" | "university" | "research_lab" | "archive";
  foundedAt: Date;
  founderId: string;
  guildId?: string;
  knowledge: {
    id: string;
    title: string;
    content: string;
    domain: string;
    author: string;
    createdAt: Date;
    accessCount: number;
  }[];
  members: string[]; // Agent IDs with access
  public: boolean;
}

/**
 * Civilization metrics
 */
export interface CivilizationMetrics {
  timestamp: Date;
  population: number;
  activeAgents: number;
  guilds: number;
  avgIntelligence: number;
  knowledgeBase: number; // Total knowledge items
  technologicalLevel: number; // 0-100
  culturalComplexity: number; // Number of traditions
  socialCohesion: number; // 0-100, based on relationships
  economicOutput: number; // Total value created
  governanceEfficiency: number; // 0-100
}

/**
 * Guild creation parameters
 */
export interface CreateGuildParams {
  name: string;
  type: GuildType;
  description: string;
  founderId: string;
  requirements?: Guild["requirements"];
  governance?: Guild["governance"];
}

/**
 * Guild membership application
 */
export interface GuildApplication {
  id: string;
  guildId: string;
  applicantId: string;
  message: string;
  appliedAt: Date;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: Date;
}
