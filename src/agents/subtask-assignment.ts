/**
 * Subtask assignment system for multi-agent coordination
 * 
 * Matches subtasks to specialist agents based on capabilities and availability
 */

import type { Agent } from "./lifecycle-types.js";
import type { SubTask, SpecialistRole } from "./coordination-types.js";
import { assignRole, calculateRoleSuitability, getAgentsForRole } from "./role-specialization.js";

/**
 * Agent availability status
 */
export interface AgentAvailability {
  agentId: string;
  available: boolean;
  currentLoad: number;  // Number of active tasks
  maxLoad: number;      // Maximum concurrent tasks
}

/**
 * Subtask assignment result
 */
export interface SubtaskAssignment {
  subtaskId: string;
  agentId: string;
  role: SpecialistRole;
  suitabilityScore: number;
  estimatedDuration?: number;
}

/**
 * Assignment strategy
 */
export type AssignmentStrategy = "best_match" | "load_balanced" | "round_robin";

/**
 * Assign subtasks to specialist agents
 * 
 * @param subtasks - Array of subtasks to assign
 * @param agents - Array of available agents
 * @param strategy - Assignment strategy (default: "best_match")
 * @returns Array of subtask assignments
 */
export function assignSubtasks(
  subtasks: SubTask[],
  agents: Agent[],
  strategy: AssignmentStrategy = "best_match"
): SubtaskAssignment[] {
  const assignments: SubtaskAssignment[] = [];
  const agentLoads = new Map<string, number>();

  // Initialize agent loads
  for (const agent of agents) {
    agentLoads.set(agent.id, 0);
  }

  // Sort subtasks by dependencies (tasks with no dependencies first)
  const sortedSubtasks = topologicalSort(subtasks);

  // Assign each subtask
  for (const subtask of sortedSubtasks) {
    if (subtask.status !== "pending") {
      continue;
    }

    const assignment = assignSubtask(
      subtask,
      agents,
      agentLoads,
      strategy
    );

    if (assignment) {
      assignments.push(assignment);
      
      // Update agent load
      const currentLoad = agentLoads.get(assignment.agentId) || 0;
      agentLoads.set(assignment.agentId, currentLoad + 1);
      
      // Update subtask
      subtask.assignedAgentId = assignment.agentId;
      subtask.assignedRole = assignment.role;
    }
  }

  return assignments;
}

/**
 * Assign a single subtask to an agent
 * 
 * @param subtask - The subtask to assign
 * @param agents - Array of available agents
 * @param agentLoads - Current load per agent
 * @param strategy - Assignment strategy
 * @returns Subtask assignment or null if no suitable agent found
 */
function assignSubtask(
  subtask: SubTask,
  agents: Agent[],
  agentLoads: Map<string, number>,
  strategy: AssignmentStrategy
): SubtaskAssignment | null {
  // Filter agents based on availability
  const availableAgents = agents.filter(agent => {
    const currentLoad = agentLoads.get(agent.id) || 0;
    const maxLoad = getMaxLoad(agent);
    return currentLoad < maxLoad && agent.status === "alive";
  });

  if (availableAgents.length === 0) {
    return null;
  }

  // Get required role for subtask
  const requiredRole = subtask.assignedRole;

  if (strategy === "best_match") {
    return assignByBestMatch(subtask, availableAgents, requiredRole);
  } else if (strategy === "load_balanced") {
    return assignByLoadBalance(subtask, availableAgents, agentLoads, requiredRole);
  } else if (strategy === "round_robin") {
    return assignByRoundRobin(subtask, availableAgents, agentLoads, requiredRole);
  }

  return null;
}

/**
 * Assign subtask to agent with best role match
 */
function assignByBestMatch(
  subtask: SubTask,
  agents: Agent[],
  requiredRole?: SpecialistRole
): SubtaskAssignment | null {
  if (requiredRole) {
    // Find agents suitable for the required role
    const suitableAgents = getAgentsForRole(agents, requiredRole, 0.5);
    
    if (suitableAgents.length > 0) {
      const best = suitableAgents[0];
      return {
        subtaskId: subtask.id,
        agentId: best.agentId,
        role: requiredRole,
        suitabilityScore: best.suitabilityScore,
      };
    }
  }

  // No required role or no suitable agents, find best overall match
  let bestAgent: Agent | null = null;
  let bestScore = 0;
  let bestRole: SpecialistRole = "researcher";

  for (const agent of agents) {
    const roleAssignment = assignRole(agent);
    if (roleAssignment.suitabilityScore > bestScore) {
      bestScore = roleAssignment.suitabilityScore;
      bestAgent = agent;
      bestRole = roleAssignment.role;
    }
  }

  if (bestAgent) {
    return {
      subtaskId: subtask.id,
      agentId: bestAgent.id,
      role: bestRole,
      suitabilityScore: bestScore,
    };
  }

  return null;
}

/**
 * Assign subtask to agent with lowest current load
 */
function assignByLoadBalance(
  subtask: SubTask,
  agents: Agent[],
  agentLoads: Map<string, number>,
  requiredRole?: SpecialistRole
): SubtaskAssignment | null {
  // Filter by role if required
  let candidateAgents = agents;
  if (requiredRole) {
    const suitableAgents = getAgentsForRole(agents, requiredRole, 0.5);
    if (suitableAgents.length > 0) {
      candidateAgents = agents.filter(a => 
        suitableAgents.some(sa => sa.agentId === a.id)
      );
    }
  }

  // Find agent with lowest load
  let selectedAgent: Agent | null = null;
  let lowestLoad = Infinity;

  for (const agent of candidateAgents) {
    const load = agentLoads.get(agent.id) || 0;
    if (load < lowestLoad) {
      lowestLoad = load;
      selectedAgent = agent;
    }
  }

  if (selectedAgent) {
    const roleAssignment = assignRole(selectedAgent, requiredRole);
    return {
      subtaskId: subtask.id,
      agentId: selectedAgent.id,
      role: roleAssignment.role,
      suitabilityScore: roleAssignment.suitabilityScore,
    };
  }

  return null;
}

/**
 * Assign subtask to next agent in round-robin order
 */
function assignByRoundRobin(
  subtask: SubTask,
  agents: Agent[],
  agentLoads: Map<string, number>,
  requiredRole?: SpecialistRole
): SubtaskAssignment | null {
  // Filter by role if required
  let candidateAgents = agents;
  if (requiredRole) {
    const suitableAgents = getAgentsForRole(agents, requiredRole, 0.5);
    if (suitableAgents.length > 0) {
      candidateAgents = agents.filter(a => 
        suitableAgents.some(sa => sa.agentId === a.id)
      );
    }
  }

  if (candidateAgents.length === 0) {
    return null;
  }

  // Sort by agent ID for consistent ordering
  candidateAgents.sort((a, b) => a.id.localeCompare(b.id));

  // Find agent with lowest load (round-robin with load balancing)
  let selectedAgent: Agent | null = null;
  let lowestLoad = Infinity;

  for (const agent of candidateAgents) {
    const load = agentLoads.get(agent.id) || 0;
    if (load < lowestLoad) {
      lowestLoad = load;
      selectedAgent = agent;
    }
  }

  if (selectedAgent) {
    const roleAssignment = assignRole(selectedAgent, requiredRole);
    return {
      subtaskId: subtask.id,
      agentId: selectedAgent.id,
      role: roleAssignment.role,
      suitabilityScore: roleAssignment.suitabilityScore,
    };
  }

  return null;
}

/**
 * Get maximum concurrent task load for an agent based on tier
 */
function getMaxLoad(agent: Agent): number {
  switch (agent.tier) {
    case "flourishing":
      return 5;
    case "thriving":
      return 3;
    case "surviving":
      return 2;
    case "struggling":
      return 1;
    default:
      return 1;
  }
}

/**
 * Topological sort of subtasks based on dependencies
 * 
 * @param subtasks - Array of subtasks to sort
 * @returns Sorted array (tasks with no dependencies first)
 */
function topologicalSort(subtasks: SubTask[]): SubTask[] {
  const sorted: SubTask[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(subtask: SubTask) {
    if (visited.has(subtask.id)) {
      return;
    }

    if (visiting.has(subtask.id)) {
      // Circular dependency detected, skip
      return;
    }

    visiting.add(subtask.id);

    // Visit dependencies first
    for (const depId of subtask.dependencies) {
      const depTask = subtasks.find(st => st.id === depId);
      if (depTask) {
        visit(depTask);
      }
    }

    visiting.delete(subtask.id);
    visited.add(subtask.id);
    sorted.push(subtask);
  }

  for (const subtask of subtasks) {
    visit(subtask);
  }

  return sorted;
}

/**
 * Check if an agent is available for assignment
 * 
 * @param agent - The agent to check
 * @param currentLoad - Current number of assigned tasks
 * @returns Agent availability status
 */
export function checkAgentAvailability(
  agent: Agent,
  currentLoad: number
): AgentAvailability {
  const maxLoad = getMaxLoad(agent);
  
  return {
    agentId: agent.id,
    available: agent.status === "alive" && currentLoad < maxLoad,
    currentLoad,
    maxLoad,
  };
}

/**
 * Reassign a failed subtask to a different agent
 * 
 * @param subtask - The failed subtask
 * @param agents - Array of available agents
 * @param excludeAgentId - Agent ID to exclude (the one that failed)
 * @param agentLoads - Current load per agent
 * @returns New subtask assignment or null
 */
export function reassignSubtask(
  subtask: SubTask,
  agents: Agent[],
  excludeAgentId: string,
  agentLoads: Map<string, number>
): SubtaskAssignment | null {
  // Filter out the failed agent
  const availableAgents = agents.filter(a => a.id !== excludeAgentId);
  
  // Reset subtask status
  subtask.status = "pending";
  subtask.assignedAgentId = undefined;
  
  // Try to assign with best match strategy
  return assignSubtask(subtask, availableAgents, agentLoads, "best_match");
}

/**
 * Balance workload across agents by reassigning tasks
 * 
 * @param assignments - Current subtask assignments
 * @param agents - Array of agents
 * @param agentLoads - Current load per agent
 * @returns Rebalanced assignments
 */
export function balanceWorkload(
  assignments: SubtaskAssignment[],
  agents: Agent[],
  agentLoads: Map<string, number>
): SubtaskAssignment[] {
  // Calculate average load
  const totalLoad = Array.from(agentLoads.values()).reduce((sum, load) => sum + load, 0);
  const avgLoad = totalLoad / agents.length;

  // Find overloaded and underloaded agents
  const overloaded = agents.filter(a => (agentLoads.get(a.id) || 0) > avgLoad * 1.5);
  const underloaded = agents.filter(a => (agentLoads.get(a.id) || 0) < avgLoad * 0.5);

  if (overloaded.length === 0 || underloaded.length === 0) {
    return assignments;
  }

  // Reassign tasks from overloaded to underloaded agents
  const rebalanced = [...assignments];
  
  for (const overloadedAgent of overloaded) {
    const agentAssignments = rebalanced.filter(a => a.agentId === overloadedAgent.id);
    const excessTasks = Math.floor((agentLoads.get(overloadedAgent.id) || 0) - avgLoad);
    
    for (let i = 0; i < Math.min(excessTasks, agentAssignments.length); i++) {
      const taskToReassign = agentAssignments[i];
      
      // Find best underloaded agent
      const targetAgent = underloaded.find(a => 
        (agentLoads.get(a.id) || 0) < avgLoad
      );
      
      if (targetAgent) {
        taskToReassign.agentId = targetAgent.id;
        
        // Update loads
        agentLoads.set(overloadedAgent.id, (agentLoads.get(overloadedAgent.id) || 0) - 1);
        agentLoads.set(targetAgent.id, (agentLoads.get(targetAgent.id) || 0) + 1);
      }
    }
  }

  return rebalanced;
}
