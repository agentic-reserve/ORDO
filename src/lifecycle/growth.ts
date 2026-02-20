/**
 * Agent growth tracking module
 * Tracks age, experience, and fitness metrics
 */

import { updateAgent, logAgentEvent } from "../database/operations.js";
import { config } from "../config.js";
import type { Agent } from "../types.js";
import type { GrowthMetrics } from "./types.js";

/**
 * Track growth for an agent
 * Updates age, experience, and fitness metrics
 * 
 * @param agent - The agent to track growth for
 * @returns Growth metrics
 */
export async function trackGrowth(agent: Agent): Promise<GrowthMetrics> {
  // Calculate age in days
  const now = new Date();
  const ageInMs = now.getTime() - agent.birthDate.getTime();
  const ageInDays = Math.floor(ageInMs / (1000 * 60 * 60 * 24));

  const experience = ageInDays * 10;

  // Calculate wisdom (knowledge accumulated over time)
  // Wisdom grows with age and experience
  const wisdom = Math.floor(Math.sqrt(experience));

  // Calculate overall fitness score (0-1 scale)
  const fitness = calculateOverallFitness(agent);

  // Check if agent is ready to reproduce
  const readinessToReproduce = checkReproductionReadiness(agent, ageInDays);

  // Update agent age in database
  if (ageInDays !== agent.age) {
    await updateAgent(agent.id, { age: ageInDays });
    
    // Log growth event
    await logAgentEvent(agent.id, "growth", {
      age: ageInDays,
      experience,
      wisdom,
      fitness,
    });
  }

  return {
    age: ageInDays,
    experience,
    wisdom,
    fitness,
    readinessToReproduce,
  };
}

/**
 * Calculate overall fitness score from multi-dimensional fitness metrics
 * 
 * @param agent - The agent to calculate fitness for
 * @returns Overall fitness score (0-1)
 */
function calculateOverallFitness(agent: Agent): number {
  const weights = {
    survival: 0.3,
    earnings: 0.3,
    offspring: 0.2,
    adaptation: 0.1,
    innovation: 0.1,
  };

  const fitness =
    agent.fitness.survival * weights.survival +
    agent.fitness.earnings * weights.earnings +
    agent.fitness.offspring * weights.offspring +
    agent.fitness.adaptation * weights.adaptation +
    agent.fitness.innovation * weights.innovation;

  return Math.min(1.0, Math.max(0.0, fitness));
}

/**
 * Check if agent is ready to reproduce
 * 
 * Requirements:
 * - Balance > replicationMinBalance (default 10 SOL)
 * - Age > replicationMinAgeDays (default 30 days)
 * - Status is alive
 * 
 * @param agent - The agent to check
 * @param ageInDays - Current age in days
 * @returns true if ready to reproduce
 */
function checkReproductionReadiness(agent: Agent, ageInDays: number): boolean {
  return (
    agent.status === "alive" &&
    agent.balance >= config.agent.replicationMinBalance &&
    ageInDays >= config.agent.replicationMinAgeDays
  );
}

/**
 * Update fitness metrics for an agent
 * 
 * @param agent - The agent to update
 * @param updates - Partial fitness metric updates
 */
export async function updateFitnessMetrics(
  agent: Agent,
  updates: Partial<{
    survival: number;
    earnings: number;
    offspring: number;
    adaptation: number;
    innovation: number;
  }>
): Promise<void> {
  const newFitness = {
    ...agent.fitness,
    ...updates,
  };

  await updateAgent(agent.id, { fitness: newFitness });

  // Log fitness update
  await logAgentEvent(agent.id, "growth", {
    fitnessUpdate: updates,
    newFitness,
  });
}

/**
 * Calculate survival fitness based on lifespan
 * 
 * @param agent - The agent
 * @returns Survival fitness (0-1)
 */
export function calculateSurvivalFitness(agent: Agent): number {
  const ageInMs = new Date().getTime() - agent.birthDate.getTime();
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);
  const maxLifespan = agent.maxLifespan;

  // Survival fitness = how long agent has lived / max lifespan
  return Math.min(1.0, ageInDays / maxLifespan);
}

/**
 * Calculate earnings fitness based on economic performance
 * 
 * @param agent - The agent
 * @returns Earnings fitness (0-1)
 */
export function calculateEarningsFitness(agent: Agent): number {
  const ageInMs = new Date().getTime() - agent.birthDate.getTime();
  const ageInDays = Math.max(1, ageInMs / (1000 * 60 * 60 * 24)); // Avoid division by zero

  // Earnings fitness = total earnings / time alive
  // Normalized to 0-1 scale (assuming 1 SOL per day is excellent)
  const earningsPerDay = agent.totalEarnings / ageInDays;
  return Math.min(1.0, earningsPerDay);
}

/**
 * Calculate offspring fitness based on successful children
 * 
 * @param agent - The agent
 * @returns Offspring fitness (0-1)
 */
export function calculateOffspringFitness(agent: Agent): number {
  // Offspring fitness = number of successful children
  // Normalized to 0-1 scale (assuming 10 children is excellent)
  const childrenCount = agent.childrenIds.length;
  return Math.min(1.0, childrenCount / 10);
}

/**
 * Calculate adaptation fitness based on tier improvements
 * 
 * @param agent - The agent
 * @returns Adaptation fitness (0-1)
 */
export function calculateAdaptationFitness(agent: Agent): number {
  // Adaptation fitness based on current survival tier
  const tierScores = {
    dead: 0.0,
    critical: 0.2,
    low_compute: 0.4,
    normal: 0.6,
    thriving: 1.0,
  };

  return tierScores[agent.survivalTier] || 0.0;
}

/**
 * Background job to update agent ages
 * Should be called periodically (e.g., hourly via heartbeat)
 * 
 * @param agents - Array of agents to update
 */
export async function updateAgentAges(agents: Agent[]): Promise<void> {
  for (const agent of agents) {
    if (agent.status === "alive") {
      await trackGrowth(agent);
    }
  }
}
