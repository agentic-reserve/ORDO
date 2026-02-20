/**
 * Core type definitions for Ordo platform
 */

import type { PublicKey } from "@solana/web3.js";

/**
 * Agent lifecycle status
 */
export type AgentStatus = "alive" | "dead";

/**
 * Death causes for agents
 */
export type DeathCause = "starvation" | "old_age" | "terminated" | "error";

/**
 * Survival tiers based on SOL balance
 */
export type SurvivalTier = "thriving" | "normal" | "low_compute" | "critical" | "dead";

/**
 * Agent specialization roles
 */
export type AgentRole = "generalist" | "researcher" | "coder" | "trader" | "coordinator";

/**
 * Self-modification types
 */
export type ModificationType = "code_edit" | "tool_install" | "prompt_change" | "strategy_update";

/**
 * Basic agent identity
 */
export interface AgentIdentity {
  publicKey: PublicKey;
  name: string;
  generation: number;
  parent?: PublicKey;
  children: PublicKey[];
  birthDate: Date;
  age: number;
  status: AgentStatus;
}

/**
 * Complete Agent data model with all lifecycle fields
 */
export interface Agent {
  // Identity
  id: string;                    // ULID for database primary key
  publicKey: string;             // Solana public key (base58)
  name: string;
  generation: number;
  parentId?: string;             // Parent agent ID (for lineage)
  childrenIds: string[];         // Array of child agent IDs
  
  // Lifecycle
  birthDate: Date;
  age: number;                   // Age in days
  maxLifespan: number;           // Maximum lifespan in days
  status: AgentStatus;
  deathCause?: DeathCause;
  deathDate?: Date;
  
  // Economic
  balance: number;               // SOL balance
  survivalTier: SurvivalTier;
  totalEarnings: number;
  totalCosts: number;
  
  // Capabilities
  model: string;                 // Current AI model
  tools: string[];               // Available tools
  skills: string[];              // Learned skills
  knowledgeBase: Record<string, unknown>;  // Knowledge storage
  
  // Evolution
  fitness: FitnessMetrics;
  mutations: string[];           // Applied mutations
  traits: Record<string, unknown>;  // Inheritable traits
  
  // Consciousness (optional, for future phases)
  consciousness?: ConsciousnessMetrics;
  
  // Social (optional, for future phases)
  reputation?: number;
  guildId?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;             // When agent was archived after death
}

/**
 * Fitness metrics for evolution
 */
export interface FitnessMetrics {
  survival: number;      // How long agent lived
  earnings: number;      // How much value created
  offspring: number;     // How many successful children
  adaptation: number;    // How well adapted to environment
  innovation: number;    // Novel strategies discovered
}

/**
 * Consciousness metrics
 */
export interface ConsciousnessMetrics {
  selfAwarenessLevel: number;      // 0-100
  introspectionDepth: number;      // 0-100
  theoryOfMindAccuracy: number;    // 0-100
}

/**
 * Platform version info
 */
export interface VersionInfo {
  version: string;
  buildDate: string;
  commit: string;
}
