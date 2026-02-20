/**
 * Agent death handling module
 * Handles agent termination, legacy distribution, and archival
 */

import { updateAgent, logAgentEvent, getChildren } from "../database/operations.js";
import { config } from "../config.js";
import type { Agent, DeathCause } from "../types.js";
import type { Legacy } from "./types.js";

/**
 * Terminate an agent and handle death procedures
 * 
 * This function:
 * 1. Marks agent as dead with death cause
 * 2. Distributes remaining balance to offspring
 * 3. Archives agent state to permanent storage
 * 4. Returns legacy information
 * 
 * @param agent - The agent to terminate
 * @param cause - The cause of death
 * @returns Legacy information
 */
export async function terminateAgent(agent: Agent, cause: DeathCause): Promise<Legacy> {
  // 1. Mark agent as dead
  const deathDate = new Date();
  
  await updateAgent(agent.id, {
    status: "dead",
    deathCause: cause,
    deathDate,
    archivedAt: deathDate,
  });

  // 2. Distribute remaining balance to offspring
  const offspring = await getChildren(agent.id);
  const remainingBalance = agent.balance;
  
  if (offspring.length > 0 && remainingBalance > 0) {
    const balancePerChild = remainingBalance / offspring.length;
    
    for (const child of offspring) {
      if (child.status === "alive") {
        const newBalance = child.balance + balancePerChild;
        await updateAgent(child.id, { balance: newBalance });
        
        // Log inheritance event
        await logAgentEvent(child.id, "earning", {
          source: "inheritance",
          amount: balancePerChild,
          from: agent.id,
        });
      }
    }
  }

  // 3. Log death event
  await logAgentEvent(agent.id, "death", {
    cause,
    age: agent.age,
    balance: remainingBalance,
    offspringCount: offspring.length,
    totalEarnings: agent.totalEarnings,
    totalCosts: agent.totalCosts,
    fitness: agent.fitness,
  });

  // 4. Build legacy information
  const legacy: Legacy = {
    knowledge: [agent.knowledgeBase],
    offspring,
    contributions: agent.skills,
    reputation: agent.reputation || 0,
    artifacts: [agent.traits],
  };

  return legacy;
}

/**
 * Check if agent should die from starvation
 * 
 * @param agent - The agent to check
 * @returns true if agent should die from starvation
 */
export function checkStarvation(agent: Agent): boolean {
  return agent.balance < config.economic.survivalTierCritical;
}

/**
 * Check if agent should die from old age
 * 
 * @param agent - The agent to check
 * @returns true if agent should die from old age
 */
export function checkOldAge(agent: Agent): boolean {
  return agent.age >= agent.maxLifespan;
}

/**
 * Check survival conditions for an agent
 * Returns the death cause if agent should die, null otherwise
 * 
 * @param agent - The agent to check
 * @returns Death cause if agent should die, null otherwise
 */
export function checkSurvivalConditions(agent: Agent): DeathCause | null {
  if (checkStarvation(agent)) {
    return "starvation";
  }
  
  if (checkOldAge(agent)) {
    return "old_age";
  }
  
  return null;
}

/**
 * Process death for agents that meet death conditions
 * Should be called periodically (e.g., via heartbeat)
 * 
 * @param agents - Array of agents to check
 * @returns Array of agents that died
 */
export async function processDeaths(agents: Agent[]): Promise<Agent[]> {
  const deadAgents: Agent[] = [];

  for (const agent of agents) {
    if (agent.status === "alive") {
      const deathCause = checkSurvivalConditions(agent);
      
      if (deathCause) {
        await terminateAgent(agent, deathCause);
        deadAgents.push(agent);
      }
    }
  }

  return deadAgents;
}

/**
 * Distribute balance to offspring
 * Helper function for legacy distribution
 * 
 * @param parentBalance - Parent's remaining balance
 * @param offspring - Array of offspring agents
 */
export async function distributeBalanceToOffspring(
  parentBalance: number,
  offspring: Agent[]
): Promise<void> {
  if (offspring.length === 0 || parentBalance <= 0) {
    return;
  }

  const balancePerChild = parentBalance / offspring.length;

  for (const child of offspring) {
    if (child.status === "alive") {
      const newBalance = child.balance + balancePerChild;
      await updateAgent(child.id, { balance: newBalance });
    }
  }
}
