/**
 * Agent role specialization system
 * 
 * Defines specialist roles and assigns agents based on capabilities
 */

import type { Agent } from "./lifecycle-types.js";
import type { SpecialistRole, AgentCapabilities } from "./coordination-types.js";

/**
 * Role definition with required capabilities and tools
 */
export interface RoleDefinition {
  role: SpecialistRole;
  description: string;
  requiredCapabilities: string[];
  preferredTools: string[];
  minExperience?: number;
  minFitness?: number;
}

/**
 * Role assignment result
 */
export interface RoleAssignment {
  agentId: string;
  role: SpecialistRole;
  suitabilityScore: number;
  capabilities: AgentCapabilities;
}

/**
 * Predefined specialist roles
 */
export const SPECIALIST_ROLES: Record<SpecialistRole, RoleDefinition> = {
  researcher: {
    role: "researcher",
    description: "Gathers information, analyzes data, and provides insights",
    requiredCapabilities: ["web_search", "data_analysis", "information_synthesis"],
    preferredTools: ["web_search", "web_fetch", "data_analysis"],
    minExperience: 10,
  },
  coder: {
    role: "coder",
    description: "Implements solutions, writes code, and builds systems",
    requiredCapabilities: ["code_generation", "debugging", "testing"],
    preferredTools: ["code_editor", "compiler", "debugger", "test_runner"],
    minExperience: 20,
  },
  trader: {
    role: "trader",
    description: "Executes trades, manages positions, and optimizes returns",
    requiredCapabilities: ["trading", "market_analysis", "risk_management"],
    preferredTools: ["swap", "stake", "lend", "borrow", "market_data"],
    minExperience: 15,
    minFitness: 0.5,
  },
  coordinator: {
    role: "coordinator",
    description: "Orchestrates multi-agent tasks and synthesizes results",
    requiredCapabilities: ["task_decomposition", "result_synthesis", "coordination"],
    preferredTools: ["shared_memory", "task_manager", "communication"],
    minExperience: 30,
    minFitness: 0.6,
  },
};

/**
 * Assign a role to an agent based on capabilities
 * 
 * @param agent - The agent to assign a role to
 * @param preferredRole - Optional preferred role
 * @returns Role assignment with suitability score
 */
export function assignRole(
  agent: Agent,
  preferredRole?: SpecialistRole
): RoleAssignment {
  // If preferred role is specified, check if agent is suitable
  if (preferredRole) {
    const suitability = calculateRoleSuitability(agent, preferredRole);
    if (suitability >= 0.5) {
      return {
        agentId: agent.id,
        role: preferredRole,
        suitabilityScore: suitability,
        capabilities: extractCapabilities(agent),
      };
    }
  }

  // Find best matching role
  let bestRole: SpecialistRole = "researcher";
  let bestScore = 0;

  for (const role of Object.keys(SPECIALIST_ROLES) as SpecialistRole[]) {
    const score = calculateRoleSuitability(agent, role);
    if (score > bestScore) {
      bestScore = score;
      bestRole = role;
    }
  }

  return {
    agentId: agent.id,
    role: bestRole,
    suitabilityScore: bestScore,
    capabilities: extractCapabilities(agent),
  };
}

/**
 * Calculate how suitable an agent is for a specific role
 * 
 * @param agent - The agent to evaluate
 * @param role - The role to evaluate for
 * @returns Suitability score (0-1)
 */
export function calculateRoleSuitability(
  agent: Agent,
  role: SpecialistRole
): number {
  const roleDefinition = SPECIALIST_ROLES[role];
  let score = 0;
  let maxScore = 0;

  // Check experience requirement
  maxScore += 20;
  if (roleDefinition.minExperience) {
    if (agent.experience >= roleDefinition.minExperience) {
      score += 20;
    } else {
      score += (agent.experience / roleDefinition.minExperience) * 20;
    }
  } else {
    score += 20;
  }

  // Check fitness requirement
  maxScore += 20;
  if (roleDefinition.minFitness) {
    if (agent.fitness >= roleDefinition.minFitness) {
      score += 20;
    } else {
      score += (agent.fitness / roleDefinition.minFitness) * 20;
    }
  } else {
    score += 20;
  }

  // Check capabilities (from agent's traits or skills)
  maxScore += 40;
  const agentCapabilities = extractCapabilities(agent);
  const matchingCapabilities = roleDefinition.requiredCapabilities.filter(cap =>
    agentCapabilities.skills.includes(cap)
  );
  score += (matchingCapabilities.length / roleDefinition.requiredCapabilities.length) * 40;

  // Check tools (from agent's available tools)
  maxScore += 20;
  const agentTools = agentCapabilities.tools;
  const matchingTools = roleDefinition.preferredTools.filter(tool =>
    agentTools.includes(tool)
  );
  if (roleDefinition.preferredTools.length > 0) {
    score += (matchingTools.length / roleDefinition.preferredTools.length) * 20;
  } else {
    score += 20;
  }

  return score / maxScore;
}

/**
 * Extract capabilities from an agent
 * 
 * @param agent - The agent to extract capabilities from
 * @returns Agent capabilities
 */
export function extractCapabilities(agent: Agent): AgentCapabilities {
  // Extract skills from agent traits or metadata
  const skills: string[] = [];
  
  // Check if agent has traits with skills
  if (agent.traits) {
    if (Array.isArray(agent.traits.skills)) {
      skills.push(...agent.traits.skills);
    }
    if (Array.isArray(agent.traits.capabilities)) {
      skills.push(...agent.traits.capabilities);
    }
  }

  // Default skills based on tier
  if (agent.tier === "thriving" || agent.tier === "flourishing") {
    skills.push("advanced_reasoning", "complex_problem_solving");
  }
  if (agent.tier === "flourishing") {
    skills.push("self_modification", "replication");
  }

  // Extract tools from agent configuration
  const tools: string[] = [];
  if (agent.traits?.tools) {
    tools.push(...agent.traits.tools);
  }

  // Default tools available to all agents
  tools.push("shared_memory", "communication", "basic_reasoning");

  return {
    skills: [...new Set(skills)],
    tools: [...new Set(tools)],
    experience: agent.experience,
    fitness: agent.fitness,
  };
}

/**
 * Get agents suitable for a specific role
 * 
 * @param agents - Array of agents to filter
 * @param role - The role to filter for
 * @param minSuitability - Minimum suitability score (default 0.5)
 * @returns Array of suitable agents with their suitability scores
 */
export function getAgentsForRole(
  agents: Agent[],
  role: SpecialistRole,
  minSuitability: number = 0.5
): RoleAssignment[] {
  return agents
    .map(agent => ({
      agentId: agent.id,
      role,
      suitabilityScore: calculateRoleSuitability(agent, role),
      capabilities: extractCapabilities(agent),
    }))
    .filter(assignment => assignment.suitabilityScore >= minSuitability)
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);
}

/**
 * Create role-specific prompt for an agent
 * 
 * @param role - The specialist role
 * @returns Role-specific system prompt
 */
export function getRolePrompt(role: SpecialistRole): string {
  const roleDefinition = SPECIALIST_ROLES[role];
  
  const prompts: Record<SpecialistRole, string> = {
    researcher: `You are a researcher agent specialized in gathering information and providing insights.
Your role: ${roleDefinition.description}
Your capabilities: ${roleDefinition.requiredCapabilities.join(", ")}
Your tools: ${roleDefinition.preferredTools.join(", ")}

Focus on:
- Thorough research and data gathering
- Accurate information synthesis
- Clear and actionable insights
- Citing sources and providing evidence`,

    coder: `You are a coder agent specialized in implementing solutions and building systems.
Your role: ${roleDefinition.description}
Your capabilities: ${roleDefinition.requiredCapabilities.join(", ")}
Your tools: ${roleDefinition.preferredTools.join(", ")}

Focus on:
- Clean, maintainable code
- Proper error handling
- Testing and validation
- Documentation and comments`,

    trader: `You are a trader agent specialized in executing trades and managing positions.
Your role: ${roleDefinition.description}
Your capabilities: ${roleDefinition.requiredCapabilities.join(", ")}
Your tools: ${roleDefinition.preferredTools.join(", ")}

Focus on:
- Risk management and position sizing
- Market analysis and timing
- Cost optimization
- Profit maximization`,

    coordinator: `You are a coordinator agent specialized in orchestrating multi-agent tasks.
Your role: ${roleDefinition.description}
Your capabilities: ${roleDefinition.requiredCapabilities.join(", ")}
Your tools: ${roleDefinition.preferredTools.join(", ")}

Focus on:
- Task decomposition and planning
- Agent assignment and coordination
- Result synthesis and integration
- Conflict resolution`,
  };

  return prompts[role];
}

/**
 * Get role-specific tools for an agent
 * 
 * @param role - The specialist role
 * @returns Array of tool names
 */
export function getRoleTools(role: SpecialistRole): string[] {
  return SPECIALIST_ROLES[role].preferredTools;
}
