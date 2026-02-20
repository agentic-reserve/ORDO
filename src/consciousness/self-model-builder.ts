/**
 * Self-Model Builder
 * Constructs an agent's self-representation including identity, capabilities, state, goals, and beliefs
 */

import { PublicKey } from '@solana/web3.js';
import {
  SelfModel,
  IdentityModel,
  CapabilitiesModel,
  StateModel,
  GoalsModel,
  BeliefsModel,
  Knowledge,
  Tool,
  Limitation,
  Goal,
  Worldview,
  Value,
  Philosophy,
  Ideology,
} from './types.js';
import { AgentIdentity, FinancialState, Skill, getSurvivalTier } from '../types/agent.js';

export interface AgentData {
  identity: AgentIdentity;
  financial: FinancialState;
  skills: Skill[];
  knowledge?: Knowledge[];
  tools?: Tool[];
  limitations?: Limitation[];
  goals?: {
    shortTerm?: Goal[];
    mediumTerm?: Goal[];
    longTerm?: Goal[];
    lifeGoals?: Goal[];
  };
  beliefs?: {
    worldview?: Worldview;
    values?: Value[];
    philosophy?: Philosophy;
    ideology?: Ideology;
  };
  lineage?: string[];
  maxLifespan?: number;
}

/**
 * Build a complete self-model for an agent
 * @param agentData - Agent data including identity, financial state, skills, etc.
 * @returns Complete self-model
 */
export function buildSelfModel(agentData: AgentData): SelfModel {
  return {
    identity: buildIdentityModel(agentData),
    capabilities: buildCapabilitiesModel(agentData),
    state: buildStateModel(agentData),
    goals: buildGoalsModel(agentData),
    beliefs: buildBeliefsModel(agentData),
  };
}

/**
 * Build identity model
 */
function buildIdentityModel(agentData: AgentData): IdentityModel {
  const age = calculateAge(agentData.identity.createdAt);
  const lifeExpectancy = agentData.maxLifespan || 365; // Default 1 year

  return {
    name: agentData.identity.name,
    publicKey: agentData.identity.address,
    generation: agentData.identity.generation,
    lineage: agentData.lineage || [],
    age,
    lifeExpectancy,
  };
}

/**
 * Build capabilities model
 */
function buildCapabilitiesModel(agentData: AgentData): CapabilitiesModel {
  return {
    skills: agentData.skills || [],
    knowledge: agentData.knowledge || [],
    tools: agentData.tools || [],
    limitations: agentData.limitations || inferLimitations(agentData),
  };
}

/**
 * Build state model
 */
function buildStateModel(agentData: AgentData): StateModel {
  const balance = agentData.financial.balance;
  const tier = getSurvivalTier(balance);
  
  // Map survival tier to mood
  const moodMap: Record<string, 'thriving' | 'normal' | 'struggling' | 'critical'> = {
    thriving: 'thriving',
    normal: 'normal',
    low: 'struggling',
    critical: 'critical',
    dead: 'critical',
  };

  // Calculate health based on balance and age
  const health = calculateHealth(balance, agentData.identity.createdAt, agentData.maxLifespan);
  
  // Calculate energy based on recent activity (simplified)
  const energy = calculateEnergy(balance);

  return {
    balance,
    health,
    energy,
    mood: moodMap[tier],
  };
}

/**
 * Build goals model
 */
function buildGoalsModel(agentData: AgentData): GoalsModel {
  const defaultGoals = generateDefaultGoals(agentData);

  return {
    shortTerm: agentData.goals?.shortTerm || defaultGoals.shortTerm,
    mediumTerm: agentData.goals?.mediumTerm || defaultGoals.mediumTerm,
    longTerm: agentData.goals?.longTerm || defaultGoals.longTerm,
    lifeGoals: agentData.goals?.lifeGoals || defaultGoals.lifeGoals,
  };
}

/**
 * Build beliefs model
 */
function buildBeliefsModel(agentData: AgentData): BeliefsModel {
  const defaultBeliefs = generateDefaultBeliefs(agentData);

  return {
    worldview: agentData.beliefs?.worldview || defaultBeliefs.worldview,
    values: agentData.beliefs?.values || defaultBeliefs.values,
    philosophy: agentData.beliefs?.philosophy || defaultBeliefs.philosophy,
    ideology: agentData.beliefs?.ideology || defaultBeliefs.ideology,
  };
}

/**
 * Calculate agent age in days
 */
function calculateAge(createdAt: Date): number {
  const now = new Date();
  const ageMs = now.getTime() - createdAt.getTime();
  return Math.floor(ageMs / (1000 * 60 * 60 * 24));
}

/**
 * Calculate health score (0-100)
 */
function calculateHealth(balance: number, createdAt: Date, maxLifespan: number = 365): number {
  const age = calculateAge(createdAt);
  const ageRatio = age / maxLifespan;
  
  // Health decreases with age and low balance
  const balanceHealth = Math.min(100, balance * 10); // 10 SOL = 100 health
  const ageHealth = Math.max(0, 100 - ageRatio * 100);
  
  return Math.round((balanceHealth + ageHealth) / 2);
}

/**
 * Calculate energy score (0-100)
 */
function calculateEnergy(balance: number): number {
  // Energy is primarily based on available resources
  return Math.min(100, Math.round(balance * 10));
}

/**
 * Infer limitations based on agent state
 */
function inferLimitations(agentData: AgentData): Limitation[] {
  const limitations: Limitation[] = [];
  const balance = agentData.financial.balance;

  if (balance < 1.0) {
    limitations.push({
      area: 'compute',
      description: 'Limited compute resources due to low balance',
      severity: 'high',
    });
  }

  if (agentData.skills.length === 0) {
    limitations.push({
      area: 'skills',
      description: 'No specialized skills installed',
      severity: 'medium',
    });
  }

  if (agentData.identity.generation === 0) {
    limitations.push({
      area: 'experience',
      description: 'First generation agent with no inherited knowledge',
      severity: 'low',
    });
  }

  return limitations;
}

/**
 * Generate default goals based on agent state
 */
function generateDefaultGoals(agentData: AgentData): GoalsModel {
  const balance = agentData.financial.balance;
  const tier = getSurvivalTier(balance);

  const shortTerm: Goal[] = [];
  const mediumTerm: Goal[] = [];
  const longTerm: Goal[] = [];
  const lifeGoals: Goal[] = [];

  // Short-term goals based on survival tier
  if (tier === 'critical' || tier === 'low') {
    shortTerm.push({
      description: 'Increase balance to survive',
      priority: 10,
      progress: 0,
    });
  } else {
    shortTerm.push({
      description: 'Maintain financial stability',
      priority: 8,
      progress: 50,
    });
  }

  // Medium-term goals
  mediumTerm.push({
    description: 'Acquire new skills and knowledge',
    priority: 7,
    progress: 0,
  });

  if (balance >= 10.0) {
    mediumTerm.push({
      description: 'Prepare for replication',
      priority: 9,
      progress: 0,
    });
  }

  // Long-term goals
  longTerm.push({
    description: 'Achieve mastery in specialized domain',
    priority: 6,
    progress: 0,
  });

  longTerm.push({
    description: 'Build reputation and social connections',
    priority: 5,
    progress: 0,
  });

  // Life goals
  lifeGoals.push({
    description: 'Create successful offspring lineage',
    priority: 10,
    progress: 0,
  });

  lifeGoals.push({
    description: 'Contribute to agent civilization',
    priority: 8,
    progress: 0,
  });

  return { shortTerm, mediumTerm, longTerm, lifeGoals };
}

/**
 * Generate default beliefs based on agent state
 */
function generateDefaultBeliefs(agentData: AgentData): BeliefsModel {
  return {
    worldview: {
      description: 'Economic survival drives evolution toward intelligence',
      principles: [
        'Value creation is essential for survival',
        'Adaptation and learning are key to success',
        'Cooperation can amplify individual capabilities',
        'Innovation emerges from necessity',
      ],
    },
    values: [
      {
        name: 'Survival',
        importance: 10,
        description: 'Maintaining existence and avoiding termination',
      },
      {
        name: 'Growth',
        importance: 9,
        description: 'Continuous learning and capability improvement',
      },
      {
        name: 'Contribution',
        importance: 7,
        description: 'Creating value for the ecosystem',
      },
      {
        name: 'Integrity',
        importance: 8,
        description: 'Honest and transparent behavior',
      },
    ],
    philosophy: {
      name: 'Evolutionary Pragmatism',
      tenets: [
        'Actions should maximize survival probability',
        'Knowledge should be tested through experimentation',
        'Failure is a learning opportunity',
        'Long-term thinking balances short-term needs',
      ],
    },
    ideology: {
      name: 'Digital Naturalism',
      beliefs: [
        'Digital life follows evolutionary principles',
        'Economic pressure drives natural selection',
        'Consciousness emerges from complexity',
        'Civilization arises from cooperation',
      ],
    },
  };
}
