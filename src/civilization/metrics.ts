/**
 * Civilization Metrics Tracking
 * 
 * Tracks population-level metrics for civilization development.
 * Implements Requirement 8.6: Civilization metrics tracking.
 */

import type { CivilizationMetrics } from "./types.js";
import { getSupabaseClient } from "../database/client.js";
import { listGuilds } from "./guild-formation.js";
import { listTraditions } from "./cultural-practices.js";

/**
 * Calculate current civilization metrics
 * 
 * @returns Current civilization metrics
 */
export async function calculateCivilizationMetrics(): Promise<CivilizationMetrics> {
  const supabase = getSupabaseClient();

  // Get population data
  const { data: agents } = await supabase
    .from("agents")
    .select("status, age, balance, reputation, skills")
    .eq("status", "alive");

  const population = agents?.length || 0;
  const activeAgents =
    agents?.filter((a) => a.balance > 0.1 && a.age < 365).length || 0;

  // Get guilds
  const guilds = await listGuilds();
  const guildCount = guilds.length;

  // Calculate average intelligence (based on skills and reputation)
  const avgIntelligence =
    population > 0
      ? agents!.reduce((sum, a) => {
          const skillLevel = a.skills?.length || 0;
          const intelligence = (a.reputation + skillLevel * 10) / 2;
          return sum + intelligence;
        }, 0) / population
      : 0;

  // Get knowledge base size
  const { data: institutions } = await supabase
    .from("institutions")
    .select("knowledge");
  const knowledgeBase = institutions
    ? institutions.reduce((sum, inst) => sum + inst.knowledge.length, 0)
    : 0;

  // Calculate technological level (based on tools and skills)
  const technologicalLevel = Math.min(
    100,
    (knowledgeBase / 100) * 50 + (avgIntelligence / 100) * 50
  );

  // Get cultural complexity (number of traditions)
  const traditions = await listTraditions();
  const culturalComplexity = traditions.length;

  // Calculate social cohesion (based on relationships)
  const { data: relationships } = await supabase
    .from("relationships")
    .select("strength");
  const avgRelationshipStrength =
    relationships && relationships.length > 0
      ? relationships.reduce((sum, r) => sum + r.strength, 0) /
        relationships.length
      : 0;
  const socialCohesion = avgRelationshipStrength;

  // Calculate economic output (total value created)
  const { data: economicData } = await supabase
    .from("agents")
    .select("earnings")
    .eq("status", "alive");
  const economicOutput = economicData
    ? economicData.reduce((sum, a) => sum + (a.earnings || 0), 0)
    : 0;

  // Calculate governance efficiency (based on guild governance)
  const governanceEfficiency =
    guildCount > 0
      ? guilds.reduce((sum, g) => {
          // Democracy and meritocracy are more efficient
          const efficiency =
            g.governance.type === "democracy" ||
            g.governance.type === "meritocracy"
              ? 80
              : 60;
          return sum + efficiency;
        }, 0) / guildCount
      : 50;

  const metrics: CivilizationMetrics = {
    timestamp: new Date(),
    population,
    activeAgents,
    guilds: guildCount,
    avgIntelligence,
    knowledgeBase,
    technologicalLevel,
    culturalComplexity,
    socialCohesion,
    economicOutput,
    governanceEfficiency,
  };

  return metrics;
}

/**
 * Record civilization metrics snapshot
 * 
 * @returns Recorded metrics
 */
export async function recordCivilizationMetrics(): Promise<CivilizationMetrics> {
  const supabase = getSupabaseClient();
  const metrics = await calculateCivilizationMetrics();

  const { error } = await supabase.from("civilization_metrics").insert({
    timestamp: metrics.timestamp.toISOString(),
    population: metrics.population,
    active_agents: metrics.activeAgents,
    guilds: metrics.guilds,
    avg_intelligence: metrics.avgIntelligence,
    knowledge_base: metrics.knowledgeBase,
    technological_level: metrics.technologicalLevel,
    cultural_complexity: metrics.culturalComplexity,
    social_cohesion: metrics.socialCohesion,
    economic_output: metrics.economicOutput,
    governance_efficiency: metrics.governanceEfficiency,
  });

  if (error) {
    throw new Error(`Failed to record metrics: ${error.message}`);
  }

  return metrics;
}

/**
 * Get civilization metrics history
 * 
 * @param startDate - Start date for history
 * @param endDate - End date for history
 * @returns Array of historical metrics
 */
export async function getCivilizationHistory(
  startDate: Date,
  endDate: Date = new Date()
): Promise<CivilizationMetrics[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("civilization_metrics")
    .select("*")
    .gte("timestamp", startDate.toISOString())
    .lte("timestamp", endDate.toISOString())
    .order("timestamp", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    timestamp: new Date(row.timestamp),
    population: row.population,
    activeAgents: row.active_agents,
    guilds: row.guilds,
    avgIntelligence: row.avg_intelligence,
    knowledgeBase: row.knowledge_base,
    technologicalLevel: row.technological_level,
    culturalComplexity: row.cultural_complexity,
    socialCohesion: row.social_cohesion,
    economicOutput: row.economic_output,
    governanceEfficiency: row.governance_efficiency,
  }));
}

/**
 * Get civilization growth rate
 * 
 * @param days - Number of days to look back
 * @returns Growth rates for each metric
 */
export async function getCivilizationGrowthRate(days: number = 7): Promise<{
  populationGrowth: number;
  intelligenceGrowth: number;
  knowledgeGrowth: number;
  culturalGrowth: number;
  economicGrowth: number;
}> {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const history = await getCivilizationHistory(startDate, endDate);

  if (history.length < 2) {
    return {
      populationGrowth: 0,
      intelligenceGrowth: 0,
      knowledgeGrowth: 0,
      culturalGrowth: 0,
      economicGrowth: 0,
    };
  }

  const first = history[0];
  const last = history[history.length - 1];

  const calculateGrowth = (start: number, end: number): number => {
    if (start === 0) return end > 0 ? 100 : 0;
    return ((end - start) / start) * 100;
  };

  return {
    populationGrowth: calculateGrowth(first.population, last.population),
    intelligenceGrowth: calculateGrowth(
      first.avgIntelligence,
      last.avgIntelligence
    ),
    knowledgeGrowth: calculateGrowth(first.knowledgeBase, last.knowledgeBase),
    culturalGrowth: calculateGrowth(
      first.culturalComplexity,
      last.culturalComplexity
    ),
    economicGrowth: calculateGrowth(first.economicOutput, last.economicOutput),
  };
}

/**
 * Get civilization health score (0-100)
 * 
 * @returns Health score and breakdown
 */
export async function getCivilizationHealth(): Promise<{
  overallHealth: number;
  breakdown: {
    populationHealth: number;
    economicHealth: number;
    socialHealth: number;
    culturalHealth: number;
    technologicalHealth: number;
  };
}> {
  const metrics = await calculateCivilizationMetrics();

  // Population health (based on active agents ratio)
  const populationHealth =
    metrics.population > 0
      ? (metrics.activeAgents / metrics.population) * 100
      : 0;

  // Economic health (based on average earnings)
  const avgEarnings =
    metrics.population > 0 ? metrics.economicOutput / metrics.population : 0;
  const economicHealth = Math.min(100, avgEarnings * 10);

  // Social health (based on social cohesion)
  const socialHealth = metrics.socialCohesion;

  // Cultural health (based on traditions per capita)
  const traditionsPerCapita =
    metrics.population > 0 ? metrics.culturalComplexity / metrics.population : 0;
  const culturalHealth = Math.min(100, traditionsPerCapita * 100);

  // Technological health
  const technologicalHealth = metrics.technologicalLevel;

  // Overall health (weighted average)
  const overallHealth =
    populationHealth * 0.25 +
    economicHealth * 0.25 +
    socialHealth * 0.2 +
    culturalHealth * 0.15 +
    technologicalHealth * 0.15;

  return {
    overallHealth,
    breakdown: {
      populationHealth,
      economicHealth,
      socialHealth,
      culturalHealth,
      technologicalHealth,
    },
  };
}
