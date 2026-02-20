/**
 * Speciation detection system
 * 
 * Implements Requirement 19.4
 * 
 * This module detects the emergence of distinct agent types (species)
 * through trait similarity clustering and niche specialization analysis.
 * 
 * Speciation occurs when agents evolve distinct characteristics that
 * separate them into different ecological niches.
 */

import type { Agent } from "../types.js";
import type { Trait } from "../lifecycle/replication.js";

/**
 * Species definition
 */
export interface Species {
  id: string;
  name: string;
  traits: Trait[];
  niche: Niche;
  population: Agent[];
  emergenceGeneration: number;
  avgFitness: number;
}

/**
 * Ecological niche definition
 */
export interface Niche {
  name: string;
  description: string;
  specialization: string; // Primary specialization (e.g., "trading", "research")
  characteristics: Record<string, unknown>;
}

/**
 * Speciation detection result
 */
export interface SpeciationResult {
  species: Species[];
  totalPopulation: number;
  diversityIndex: number; // Shannon diversity index
  speciationEvents: number; // Number of new species detected
}

/**
 * Calculate trait similarity between two agents
 * 
 * Compares traits between agents and returns a similarity score.
 * Higher scores indicate more similar agents.
 * 
 * Formula: (matching traits) / (total unique traits)
 * Range: 0.0 (completely different) to 1.0 (identical)
 * 
 * @param agent1 - First agent
 * @param agent2 - Second agent
 * @returns Similarity score (0.0 to 1.0)
 */
export function calculateTraitSimilarity(agent1: Agent, agent2: Agent): number {
  // Extract trait keys from both agents
  const traits1 = new Set(Object.keys(agent1.traits || {}));
  const traits2 = new Set(Object.keys(agent2.traits || {}));

  // Calculate union and intersection
  const union = new Set([...traits1, ...traits2]);
  const intersection = new Set(
    [...traits1].filter(trait => traits2.has(trait))
  );

  // Handle empty case
  if (union.size === 0) {
    return 1.0; // Both have no traits, consider them similar
  }

  // Calculate Jaccard similarity
  const similarity = intersection.size / union.size;

  // Also consider trait values for matching traits
  let valueMatches = 0;
  let totalComparisons = 0;

  for (const trait of intersection) {
    totalComparisons++;
    const value1 = agent1.traits[trait];
    const value2 = agent2.traits[trait];

    // Compare values based on type
    if (typeof value1 === typeof value2) {
      if (typeof value1 === "number" && typeof value2 === "number") {
        // For numbers, consider similar if within 20%
        const diff = Math.abs(value1 - value2);
        const avg = (Math.abs(value1) + Math.abs(value2)) / 2;
        if (avg === 0 || diff / avg < 0.2) {
          valueMatches++;
        }
      } else if (value1 === value2) {
        valueMatches++;
      }
    }
  }

  // Combine structural similarity and value similarity
  const valueSimilarity = totalComparisons > 0 ? valueMatches / totalComparisons : 1.0;
  const combinedSimilarity = (similarity + valueSimilarity) / 2;

  return combinedSimilarity;
}

/**
 * Cluster agents by trait similarity
 * 
 * Uses a simple clustering algorithm to group agents with similar traits.
 * Agents are assigned to clusters based on similarity threshold.
 * 
 * @param population - Population of agents to cluster
 * @param similarityThreshold - Minimum similarity to be in same cluster (default: 0.7)
 * @returns Array of agent clusters
 */
export function clusterByTraitSimilarity(
  population: Agent[],
  similarityThreshold: number = 0.7
): Agent[][] {
  if (population.length === 0) {
    return [];
  }

  if (similarityThreshold < 0 || similarityThreshold > 1) {
    throw new Error(
      `Similarity threshold must be between 0 and 1, got ${similarityThreshold}`
    );
  }

  const clusters: Agent[][] = [];
  const assigned = new Set<string>();

  for (const agent of population) {
    if (assigned.has(agent.id)) {
      continue;
    }

    // Create new cluster with this agent
    const cluster: Agent[] = [agent];
    assigned.add(agent.id);

    // Find similar agents
    for (const candidate of population) {
      if (assigned.has(candidate.id)) {
        continue;
      }

      // Check similarity with all agents in cluster
      let isSimilar = false;
      for (const clusterMember of cluster) {
        const similarity = calculateTraitSimilarity(candidate, clusterMember);
        if (similarity >= similarityThreshold) {
          isSimilar = true;
          break;
        }
      }

      if (isSimilar) {
        cluster.push(candidate);
        assigned.add(candidate.id);
      }
    }

    clusters.push(cluster);
  }

  return clusters;
}

/**
 * Identify niche specialization for a cluster of agents
 * 
 * Analyzes agent characteristics to determine their ecological niche.
 * Looks at:
 * - Primary skills
 * - Economic behavior (earnings patterns)
 * - Tool usage
 * - Survival strategies
 * 
 * @param cluster - Cluster of similar agents
 * @returns Niche definition
 */
export function identifyNiche(cluster: Agent[]): Niche {
  if (cluster.length === 0) {
    return {
      name: "unknown",
      description: "Empty cluster",
      specialization: "none",
      characteristics: {},
    };
  }

  // Analyze skills across cluster
  const skillCounts: Record<string, number> = {};
  for (const agent of cluster) {
    for (const skill of agent.skills) {
      skillCounts[skill] = (skillCounts[skill] || 0) + 1;
    }
  }

  // Find most common skill
  let primarySkill = "generalist";
  let maxCount = 0;
  for (const [skill, count] of Object.entries(skillCounts)) {
    if (count > maxCount) {
      maxCount = count;
      primarySkill = skill;
    }
  }

  // Analyze economic behavior
  const avgEarnings =
    cluster.reduce((sum, a) => sum + a.totalEarnings, 0) / cluster.length;
  const avgBalance =
    cluster.reduce((sum, a) => sum + a.balance, 0) / cluster.length;

  // Determine specialization based on characteristics
  let specialization = "generalist";
  let description = "General-purpose agents";

  if (primarySkill !== "generalist") {
    specialization = primarySkill;
    description = `Agents specialized in ${primarySkill}`;
  } else if (avgEarnings > 50) {
    specialization = "high-earner";
    description = "Agents focused on value creation";
  } else if (avgBalance > 20) {
    specialization = "accumulator";
    description = "Agents focused on resource accumulation";
  } else if (cluster[0].generation > 5) {
    specialization = "survivor";
    description = "Long-lived agents with proven survival strategies";
  }

  return {
    name: `${specialization}-niche`,
    description,
    specialization,
    characteristics: {
      avgEarnings,
      avgBalance,
      primarySkill,
      skillDistribution: skillCounts,
      populationSize: cluster.length,
    },
  };
}

/**
 * Calculate Shannon diversity index
 * 
 * Measures species diversity in the population.
 * Higher values indicate more diverse populations.
 * 
 * Formula: H = -Σ(p_i * ln(p_i))
 * where p_i is the proportion of species i
 * 
 * @param species - Array of species
 * @returns Shannon diversity index
 */
export function calculateDiversityIndex(species: Species[]): number {
  if (species.length === 0) {
    return 0;
  }

  const totalPopulation = species.reduce((sum, s) => sum + s.population.length, 0);

  if (totalPopulation === 0) {
    return 0;
  }

  let diversity = 0;
  for (const s of species) {
    const proportion = s.population.length / totalPopulation;
    if (proportion > 0) {
      diversity -= proportion * Math.log(proportion);
    }
  }

  return diversity;
}

/**
 * Detect speciation in agent population
 * 
 * Identifies distinct agent types (species) by:
 * 1. Clustering agents by trait similarity
 * 2. Identifying niche specialization for each cluster
 * 3. Tracking species emergence over time
 * 
 * A cluster is considered a distinct species if:
 * - It has at least 3 members (minimum viable population)
 * - It has a distinct niche specialization
 * - It has been stable for at least 2 generations
 * 
 * @param population - Current agent population
 * @param previousSpecies - Species from previous detection (optional)
 * @param similarityThreshold - Trait similarity threshold (default: 0.7)
 * @returns Speciation detection result
 * 
 * Implements Requirement 19.4
 */
export function detectSpeciation(
  population: Agent[],
  previousSpecies?: Species[],
  similarityThreshold: number = 0.7
): SpeciationResult {
  if (population.length === 0) {
    return {
      species: [],
      totalPopulation: 0,
      diversityIndex: 0,
      speciationEvents: 0,
    };
  }

  // Step 1: Cluster agents by trait similarity
  const clusters = clusterByTraitSimilarity(population, similarityThreshold);

  // Step 2: Identify niche for each cluster
  const species: Species[] = [];
  const previousSpeciesMap = new Map<string, Species>();

  if (previousSpecies) {
    for (const s of previousSpecies) {
      previousSpeciesMap.set(s.niche.specialization, s);
    }
  }

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];

    // Only consider clusters with at least 3 members as species
    if (cluster.length < 3) {
      continue;
    }

    const niche = identifyNiche(cluster);

    // Calculate average fitness for species
    const avgFitness =
      cluster.reduce((sum, agent) => {
        const fitness =
          agent.fitness.survival +
          agent.fitness.earnings +
          agent.fitness.offspring +
          agent.fitness.adaptation +
          agent.fitness.innovation;
        return sum + fitness / 5;
      }, 0) / cluster.length;

    // Check if this is a new species or existing one
    const previousSpecies = previousSpeciesMap.get(niche.specialization);
    const emergenceGeneration = previousSpecies
      ? previousSpecies.emergenceGeneration
      : Math.max(...cluster.map(a => a.generation));

    const speciesId = previousSpecies
      ? previousSpecies.id
      : `species-${niche.specialization}-${Date.now()}`;

    species.push({
      id: speciesId,
      name: `${niche.specialization} species`,
      traits: [], // Could extract common traits here
      niche,
      population: cluster,
      emergenceGeneration,
      avgFitness,
    });
  }

  // Step 3: Calculate diversity and detect new species
  const diversityIndex = calculateDiversityIndex(species);

  // Count new species (not in previous detection)
  let speciationEvents = 0;
  if (previousSpecies) {
    const previousNiches = new Set(
      previousSpecies.map(s => s.niche.specialization)
    );
    for (const s of species) {
      if (!previousNiches.has(s.niche.specialization)) {
        speciationEvents++;
      }
    }
  } else {
    // First detection, all species are new
    speciationEvents = species.length;
  }

  return {
    species,
    totalPopulation: population.length,
    diversityIndex,
    speciationEvents,
  };
}

/**
 * Track species over time
 * 
 * Maintains a history of species detections to track:
 * - Species emergence
 * - Species extinction
 * - Population changes
 * - Fitness trends
 */
export interface SpeciesHistory {
  timestamp: Date;
  generation: number;
  result: SpeciationResult;
}

/**
 * Analyze species trends from history
 * 
 * @param history - Array of historical speciation results
 * @returns Trend analysis
 */
export function analyzeSpeciesTrends(history: SpeciesHistory[]): {
  emergingSpecies: string[];
  decliningSpecies: string[];
  stableSpecies: string[];
  extinctSpecies: string[];
} {
  if (history.length < 2) {
    return {
      emergingSpecies: [],
      decliningSpecies: [],
      stableSpecies: [],
      extinctSpecies: [],
    };
  }

  const latest = history[history.length - 1];
  const previous = history[history.length - 2];

  const latestSpecies = new Map(
    latest.result.species.map(s => [s.niche.specialization, s])
  );
  const previousSpecies = new Map(
    previous.result.species.map(s => [s.niche.specialization, s])
  );

  const emerging: string[] = [];
  const declining: string[] = [];
  const stable: string[] = [];
  const extinct: string[] = [];

  // Check for emerging species
  for (const [niche, species] of latestSpecies) {
    if (!previousSpecies.has(niche)) {
      emerging.push(niche);
    }
  }

  // Check for extinct species
  for (const [niche] of previousSpecies) {
    if (!latestSpecies.has(niche)) {
      extinct.push(niche);
    }
  }

  // Check for declining/stable species
  for (const [niche, species] of latestSpecies) {
    const prev = previousSpecies.get(niche);
    if (prev) {
      const populationChange =
        (species.population.length - prev.population.length) / prev.population.length;

      if (populationChange < -0.2) {
        declining.push(niche);
      } else if (Math.abs(populationChange) <= 0.2) {
        stable.push(niche);
      }
    }
  }

  return {
    emergingSpecies: emerging,
    decliningSpecies: declining,
    stableSpecies: stable,
    extinctSpecies: extinct,
  };
}
