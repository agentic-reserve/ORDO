/**
 * Selection algorithm for agent reproduction
 * 
 * Implements Requirement 5.6
 * 
 * This module implements fitness-based selection algorithms to choose
 * which agents should reproduce. Higher fitness agents have a higher
 * probability of being selected for reproduction.
 * 
 * Supported selection methods:
 * - Tournament selection: Select best from random subsets
 * - Roulette wheel selection: Probability proportional to fitness
 */

import type { Agent } from "../types.js";
import { calculateAggregateFitness } from "./fitness.js";

/**
 * Selection method types
 */
export type SelectionMethod = "tournament" | "roulette";

/**
 * Selection configuration
 */
export interface SelectionConfig {
  method: SelectionMethod;
  tournamentSize?: number;  // For tournament selection (default: 3)
  eliteCount?: number;      // Number of top agents to always select (default: 0)
}

/**
 * Selection result
 */
export interface SelectionResult {
  selected: Agent[];
  method: SelectionMethod;
  totalPopulation: number;
  selectionPressure: number; // Ratio of selected to total
}

/**
 * Tournament selection
 * 
 * Randomly select k agents (tournament size) and choose the one with
 * highest fitness. Repeat until desired number of agents selected.
 * 
 * This method provides good selection pressure while maintaining diversity.
 * Larger tournament sizes increase selection pressure.
 * 
 * @param population - Population of agents to select from
 * @param count - Number of agents to select
 * @param tournamentSize - Number of agents in each tournament (default: 3)
 * @returns Array of selected agents
 */
export function tournamentSelection(
  population: Agent[],
  count: number,
  tournamentSize: number = 3
): Agent[] {
  if (population.length === 0) {
    return [];
  }

  if (count <= 0) {
    return [];
  }

  if (count > population.length) {
    throw new Error(
      `Cannot select ${count} agents from population of ${population.length}`
    );
  }

  if (tournamentSize < 1) {
    throw new Error(`Tournament size must be at least 1, got ${tournamentSize}`);
  }

  // Ensure tournament size doesn't exceed population
  const effectiveTournamentSize = Math.min(tournamentSize, population.length);

  const selected: Agent[] = [];
  const selectedIds = new Set<string>();

  // If we need to select all or most of the population, just sort by fitness
  if (count >= population.length * 0.8) {
    const sorted = [...population].sort((a, b) => {
      const fitnessA = calculateAggregateFitness(a.fitness);
      const fitnessB = calculateAggregateFitness(b.fitness);
      return fitnessB - fitnessA;
    });
    return sorted.slice(0, count);
  }

  // Limit attempts to avoid infinite loops
  const maxAttempts = count * 100;
  let attempts = 0;

  while (selected.length < count && attempts < maxAttempts) {
    attempts++;

    // Randomly select tournament participants
    const tournament: Agent[] = [];
    const tournamentIds = new Set<string>();

    while (tournament.length < effectiveTournamentSize) {
      const randomIndex = Math.floor(Math.random() * population.length);
      const candidate = population[randomIndex];

      // Avoid duplicates in tournament
      if (!tournamentIds.has(candidate.id)) {
        tournament.push(candidate);
        tournamentIds.add(candidate.id);
      }
    }

    // Find winner (highest fitness)
    let winner = tournament[0];
    let maxFitness = calculateAggregateFitness(winner.fitness);

    for (let i = 1; i < tournament.length; i++) {
      const fitness = calculateAggregateFitness(tournament[i].fitness);
      if (fitness > maxFitness) {
        maxFitness = fitness;
        winner = tournament[i];
      }
    }

    // Add winner if not already selected
    if (!selectedIds.has(winner.id)) {
      selected.push(winner);
      selectedIds.add(winner.id);
    }
  }

  if (selected.length < count) {
    throw new Error(
      `Could not select ${count} unique agents after ${maxAttempts} attempts. Selected ${selected.length}.`
    );
  }

  return selected;
}

/**
 * Roulette wheel selection (fitness-proportionate selection)
 * 
 * Each agent's probability of selection is proportional to its fitness.
 * Agents with higher fitness have a higher chance of being selected.
 * 
 * This method maintains diversity but provides less selection pressure
 * than tournament selection.
 * 
 * @param population - Population of agents to select from
 * @param count - Number of agents to select
 * @returns Array of selected agents
 */
export function rouletteWheelSelection(
  population: Agent[],
  count: number
): Agent[] {
  if (population.length === 0) {
    return [];
  }

  if (count <= 0) {
    return [];
  }

  if (count > population.length) {
    throw new Error(
      `Cannot select ${count} agents from population of ${population.length}`
    );
  }

  // Calculate fitness for all agents
  const fitnessScores = population.map(agent =>
    calculateAggregateFitness(agent.fitness)
  );

  // Calculate total fitness
  const totalFitness = fitnessScores.reduce((sum, f) => sum + f, 0);

  // Handle edge case where all fitness is 0
  if (totalFitness === 0) {
    // Random selection if all fitness is 0
    const shuffled = [...population].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  // Calculate cumulative probabilities
  const cumulativeProbabilities: number[] = [];
  let cumulative = 0;

  for (const fitness of fitnessScores) {
    cumulative += fitness / totalFitness;
    cumulativeProbabilities.push(cumulative);
  }

  // Select agents using roulette wheel
  const selected: Agent[] = [];
  const selectedIds = new Set<string>();

  // Limit attempts to avoid infinite loops
  const maxAttempts = count * 100;
  let attempts = 0;

  while (selected.length < count && attempts < maxAttempts) {
    attempts++;

    const spin = Math.random();

    // Find agent corresponding to this spin
    let selectedIndex = 0;
    for (let i = 0; i < cumulativeProbabilities.length; i++) {
      if (spin <= cumulativeProbabilities[i]) {
        selectedIndex = i;
        break;
      }
    }

    const candidate = population[selectedIndex];

    // Add if not already selected
    if (!selectedIds.has(candidate.id)) {
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }

  if (selected.length < count) {
    throw new Error(
      `Could not select ${count} unique agents after ${maxAttempts} attempts. Selected ${selected.length}.`
    );
  }

  return selected;
}

/**
 * Elite selection
 * 
 * Select the top N agents by fitness. This ensures the best agents
 * always reproduce (elitism).
 * 
 * @param population - Population of agents to select from
 * @param count - Number of elite agents to select
 * @returns Array of elite agents (sorted by fitness, highest first)
 */
export function eliteSelection(
  population: Agent[],
  count: number
): Agent[] {
  if (population.length === 0) {
    return [];
  }

  if (count <= 0) {
    return [];
  }

  // Sort by fitness (highest first)
  const sorted = [...population].sort((a, b) => {
    const fitnessA = calculateAggregateFitness(a.fitness);
    const fitnessB = calculateAggregateFitness(b.fitness);
    return fitnessB - fitnessA;
  });

  // Return top N
  return sorted.slice(0, Math.min(count, population.length));
}

/**
 * Select agents for reproduction using fitness-based selection
 * 
 * This is the main selection function that combines different selection
 * strategies. It supports:
 * - Elitism: Always select top N agents
 * - Tournament or roulette wheel selection for remaining slots
 * 
 * The selection process biases toward higher fitness agents, implementing
 * natural selection pressure that drives evolution toward intelligence.
 * 
 * @param population - Population of agents to select from
 * @param count - Number of agents to select for reproduction
 * @param config - Selection configuration
 * @returns Selection result with selected agents
 * 
 * Implements Requirement 5.6
 */
export function selectForReproduction(
  population: Agent[],
  count: number,
  config: SelectionConfig = { method: "tournament" }
): SelectionResult {
  if (population.length === 0) {
    return {
      selected: [],
      method: config.method,
      totalPopulation: 0,
      selectionPressure: 0,
    };
  }

  if (count <= 0) {
    return {
      selected: [],
      method: config.method,
      totalPopulation: population.length,
      selectionPressure: 0,
    };
  }

  if (count > population.length) {
    throw new Error(
      `Cannot select ${count} agents from population of ${population.length}`
    );
  }

  const selected: Agent[] = [];
  const selectedIds = new Set<string>();

  // Step 1: Elite selection (if configured)
  const eliteCount = config.eliteCount || 0;
  if (eliteCount > 0) {
    const elite = eliteSelection(population, Math.min(eliteCount, count));
    for (const agent of elite) {
      selected.push(agent);
      selectedIds.add(agent.id);
    }
  }

  // Step 2: Select remaining agents using configured method
  const remaining = count - selected.length;
  if (remaining > 0) {
    // Filter out already selected agents
    const availablePopulation = population.filter(
      agent => !selectedIds.has(agent.id)
    );

    let additionalSelected: Agent[];

    if (config.method === "tournament") {
      const tournamentSize = config.tournamentSize || 3;
      additionalSelected = tournamentSelection(
        availablePopulation,
        remaining,
        tournamentSize
      );
    } else if (config.method === "roulette") {
      additionalSelected = rouletteWheelSelection(availablePopulation, remaining);
    } else {
      throw new Error(`Unknown selection method: ${config.method}`);
    }

    selected.push(...additionalSelected);
  }

  return {
    selected,
    method: config.method,
    totalPopulation: population.length,
    selectionPressure: count / population.length,
  };
}

/**
 * Calculate selection pressure
 * 
 * Selection pressure is the ratio of selected agents to total population.
 * Higher values indicate stronger selection (fewer agents reproduce).
 * 
 * Typical values:
 * - 0.1 (10%): Strong selection pressure
 * - 0.3 (30%): Moderate selection pressure
 * - 0.5 (50%): Weak selection pressure
 * 
 * @param selectedCount - Number of agents selected
 * @param totalPopulation - Total population size
 * @returns Selection pressure (0.0 to 1.0)
 */
export function calculateSelectionPressure(
  selectedCount: number,
  totalPopulation: number
): number {
  if (totalPopulation === 0) {
    return 0;
  }
  return selectedCount / totalPopulation;
}
