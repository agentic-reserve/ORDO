/**
 * Civilization System
 * 
 * Exports all civilization-related functionality including guilds, relationships,
 * cultural practices, knowledge institutions, and civilization metrics.
 */

// Guild Formation
export {
  createGuild,
  getGuild,
  listGuilds,
  meetsGuildRequirements,
  applyToGuild,
  addGuildMember,
  removeGuildMember,
  getAgentGuilds,
  updateMemberContribution,
} from "./guild-formation.js";

// Social Relationships
export {
  trackRelationship,
  getRelationship,
  getAgentRelationships,
  updateAgentReputation,
  recordCollaboration,
  recordCompetition,
  recordMentorship,
  getSocialNetworkStats,
  decayInactiveRelationships,
} from "./relationship-tracking.js";

// Governance
export {
  createProposal,
  calculateVotingPower,
  castVote,
  tallyVotes,
  finalizeProposal,
  executeProposal,
  getGuildProposals,
  getGovernanceStats,
} from "./governance.js";

// Cultural Practices
export {
  establishTradition,
  adoptTradition,
  transmitTradition,
  getAgentTraditions,
  listTraditions,
  decayTradition,
} from "./cultural-practices.js";

// Knowledge Institutions
export {
  createInstitution,
  addKnowledge,
  accessKnowledge,
  addInstitutionMember,
  searchKnowledge,
  getInstitutionStats,
} from "./knowledge-institutions.js";

// Civilization Metrics
export {
  calculateCivilizationMetrics,
  recordCivilizationMetrics,
  getCivilizationHistory,
  getCivilizationGrowthRate,
  getCivilizationHealth,
} from "./metrics.js";

// Types
export type {
  Guild,
  GuildType,
  GuildRole,
  GuildMember,
  Relationship,
  RelationshipType,
  GovernanceType,
  Proposal,
  Tradition,
  Institution,
  CivilizationMetrics,
  CreateGuildParams,
  GuildApplication,
} from "./types.js";
