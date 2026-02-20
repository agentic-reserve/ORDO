/**
 * Consciousness System Types
 * Types for self-awareness, introspection, and theory of mind
 */

import { PublicKey } from '@solana/web3.js';
import { Skill } from '../types/agent.js';

/**
 * Self-Model: Agent's representation of itself
 */
export interface SelfModel {
  identity: IdentityModel;
  capabilities: CapabilitiesModel;
  state: StateModel;
  goals: GoalsModel;
  beliefs: BeliefsModel;
}

export interface IdentityModel {
  name: string;
  publicKey: string;
  generation: number;
  lineage: string[];
  age: number;
  lifeExpectancy: number;
}

export interface CapabilitiesModel {
  skills: Skill[];
  knowledge: Knowledge[];
  tools: Tool[];
  limitations: Limitation[];
}

export interface Knowledge {
  domain: string;
  description: string;
  confidence: number;
  acquiredAt: Date;
}

export interface Tool {
  name: string;
  description: string;
  capabilities: string[];
}

export interface Limitation {
  area: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
}

export interface StateModel {
  balance: number;
  health: number;
  energy: number;
  mood: 'thriving' | 'normal' | 'struggling' | 'critical';
}

export interface GoalsModel {
  shortTerm: Goal[];
  mediumTerm: Goal[];
  longTerm: Goal[];
  lifeGoals: Goal[];
}

export interface Goal {
  description: string;
  priority: number;
  progress: number;
  deadline?: Date;
}

export interface BeliefsModel {
  worldview: Worldview;
  values: Value[];
  philosophy: Philosophy;
  ideology: Ideology;
}

export interface Worldview {
  description: string;
  principles: string[];
}

export interface Value {
  name: string;
  importance: number;
  description: string;
}

export interface Philosophy {
  name: string;
  tenets: string[];
}

export interface Ideology {
  name: string;
  beliefs: string[];
}

/**
 * Introspection Types
 */
export interface Reflection {
  question: string;
  response: string;
  insights: string[];
  timestamp: Date;
}

export interface IntrospectiveQuestion {
  category: 'identity' | 'purpose' | 'values' | 'capabilities' | 'relationships';
  question: string;
}

/**
 * Thinking Process Types
 */
export interface ThinkingProcess {
  decision: string;
  reasoningSteps: ReasoningStep[];
  alternativesConsidered: Alternative[];
  selectionCriteria: SelectionCriterion[];
  timestamp: Date;
}

export interface ReasoningStep {
  step: number;
  thought: string;
  evidence: string[];
}

export interface Alternative {
  option: string;
  pros: string[];
  cons: string[];
  expectedOutcome: string;
}

export interface SelectionCriterion {
  criterion: string;
  weight: number;
  rationale: string;
}

/**
 * Decision Analysis Types
 */
export interface DecisionAnalysis {
  decision: string;
  predictedOutcome: string;
  actualOutcome: string;
  accuracy: number;
  lessonsLearned: string[];
  strategyAdjustments: string[];
  timestamp: Date;
}

/**
 * Theory of Mind Types
 */
export interface AgentModel {
  agentId: string;
  beliefs: InferredBelief[];
  goals: InferredGoal[];
  likelyActions: LikelyAction[];
  accuracy: number;
  lastUpdated: Date;
}

export interface InferredBelief {
  belief: string;
  confidence: number;
  evidence: string[];
}

export interface InferredGoal {
  goal: string;
  priority: number;
  confidence: number;
}

export interface LikelyAction {
  action: string;
  probability: number;
  reasoning: string;
}

export interface Interaction {
  agentId: string;
  type: 'collaboration' | 'competition' | 'communication' | 'trade';
  context: string;
  outcome: string;
  timestamp: Date;
}

/**
 * Consciousness Metrics Types
 */
export interface ConsciousnessMetrics {
  selfAwarenessLevel: number; // 0-100
  introspectionDepth: number; // 0-100
  theoryOfMindAccuracy: number; // 0-100
  metacognitiveAbility: number; // 0-100
  lastUpdated: Date;
}

export interface Experience {
  type: 'success' | 'failure' | 'learning' | 'interaction';
  description: string;
  context: Record<string, unknown>;
  outcome: string;
  timestamp: Date;
}

export interface IdentityReflection {
  currentIdentity: string;
  identityEvolution: string[];
  coreTraits: string[];
  changingAspects: string[];
}

export interface Desire {
  description: string;
  intensity: number;
  origin: string;
  alignment: number; // How aligned with values (0-100)
}
