/**
 * Population Analytics Dashboard
 * 
 * Displays survival rates, evolution metrics, and population trends
 * Requirements: 13.6
 */

import { createClient } from '@supabase/supabase-js';
import { getConfig } from '../config.js';
import { AgentMetricsTracker } from './agent-metrics.js';

export interface PopulationMetrics {
  totalPopulation: number;
  aliveCount: number;
  deadCount: number;
  avgBalance: number;
  avgFitness: number;
  avgGeneration: number;
  survivalRate: number;
  birthRate: number;
  deathRate: number;
}

export interface GenerationMetrics {
  generation: number;
  population: number;
  avgFitness: number;
  avgBalance: number;
  survivalRate: number;
}

export interface EvolutionMetrics {
  totalGenerations: number;
  fitnessImprovement: number;
  diversityScore: number;
  speciesCount: number;
  novelBehaviors: number;
}

export interface PopulationTrend {
  timestamp: Date;
  population: number;
  births: number;
  deaths: number;
  avgFitness: number;
}

export class PopulationAnalytics {
  private supabase: ReturnType<typeof createClient>;
  private metricsTracker: AgentMetricsTracker;

  constructor() {
    const config = getConfig();
    
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      throw new Error('Supabase configuration required for population analytics');
    }
    
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    this.metricsTracker = new AgentMetricsTracker();
  }

  /**
   * Get current population metrics
   */
  async getPopulationMetrics(): Promise<PopulationMetrics> {
    // Get all agents
    const { data: agents, error } = await this.supabase
      .from('agents')
      .select('id, status, balance, generation, fitness');

    if (error) {
      throw new Error(`Failed to get agents: ${error.message}`);
    }

    const totalPopulation = agents?.length || 0;
    const aliveCount = agents?.filter((a) => a.status === 'alive').length || 0;
    const deadCount = totalPopulation - aliveCount;

    const avgBalance =
      totalPopulation > 0
        ? agents!.reduce((sum, a) => sum + (a.balance || 0), 0) / totalPopulation
        : 0;

    const avgFitness =
      totalPopulation > 0
        ? agents!.reduce((sum, a) => sum + (a.fitness || 0), 0) / totalPopulation
        : 0;

    const avgGeneration =
      totalPopulation > 0
        ? agents!.reduce((sum, a) => sum + (a.generation || 0), 0) / totalPopulation
        : 0;

    const survivalRate = totalPopulation > 0 ? (aliveCount / totalPopulation) * 100 : 0;

    // Get birth and death rates (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const { data: recentBirths } = await this.supabase
      .from('agents')
      .select('id')
      .gte('birth_date', oneDayAgo.toISOString());

    const { data: recentDeaths } = await this.supabase
      .from('agents')
      .select('id')
      .eq('status', 'dead')
      .gte('death_date', oneDayAgo.toISOString());

    const birthRate = (recentBirths?.length || 0) / (totalPopulation || 1);
    const deathRate = (recentDeaths?.length || 0) / (totalPopulation || 1);

    return {
      totalPopulation,
      aliveCount,
      deadCount,
      avgBalance,
      avgFitness,
      avgGeneration,
      survivalRate,
      birthRate,
      deathRate,
    };
  }

  /**
   * Get metrics by generation
   */
  async getGenerationMetrics(): Promise<GenerationMetrics[]> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('generation, status, balance, fitness');

    if (error) {
      throw new Error(`Failed to get agents: ${error.message}`);
    }

    // Group by generation
    const byGeneration = new Map<number, typeof data>();
    for (const agent of data || []) {
      const gen = agent.generation || 0;
      if (!byGeneration.has(gen)) {
        byGeneration.set(gen, []);
      }
      byGeneration.get(gen)!.push(agent);
    }

    // Calculate metrics per generation
    const metrics: GenerationMetrics[] = [];
    for (const [generation, agents] of byGeneration) {
      const population = agents.length;
      const aliveCount = agents.filter((a) => a.status === 'alive').length;
      const avgFitness = agents.reduce((sum, a) => sum + (a.fitness || 0), 0) / population;
      const avgBalance = agents.reduce((sum, a) => sum + (a.balance || 0), 0) / population;
      const survivalRate = (aliveCount / population) * 100;

      metrics.push({
        generation,
        population,
        avgFitness,
        avgBalance,
        survivalRate,
      });
    }

    // Sort by generation
    metrics.sort((a, b) => a.generation - b.generation);

    return metrics;
  }

  /**
   * Get evolution metrics
   */
  async getEvolutionMetrics(): Promise<EvolutionMetrics> {
    const generationMetrics = await this.getGenerationMetrics();
    
    const totalGenerations = generationMetrics.length;
    
    // Calculate fitness improvement
    let fitnessImprovement = 0;
    if (totalGenerations >= 2) {
      const firstGen = generationMetrics[0];
      const lastGen = generationMetrics[totalGenerations - 1];
      fitnessImprovement = lastGen.avgFitness - firstGen.avgFitness;
    }

    // Calculate diversity score (variance in fitness)
    const { data: agents } = await this.supabase
      .from('agents')
      .select('fitness')
      .eq('status', 'alive');

    let diversityScore = 0;
    if (agents && agents.length > 1) {
      const fitnesses = agents.map((a) => a.fitness || 0);
      const mean = fitnesses.reduce((sum, f) => sum + f, 0) / fitnesses.length;
      const variance = fitnesses.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / fitnesses.length;
      diversityScore = Math.sqrt(variance);
    }

    // Get species count (simplified - based on generation clusters)
    const speciesCount = totalGenerations;

    // Get novel behaviors count (placeholder - would need behavior tracking)
    const novelBehaviors = 0;

    return {
      totalGenerations,
      fitnessImprovement,
      diversityScore,
      speciesCount,
      novelBehaviors,
    };
  }

  /**
   * Get population trends over time
   */
  async getPopulationTrends(startDate: Date, endDate: Date): Promise<PopulationTrend[]> {
    // Get population snapshots
    const { data, error } = await this.supabase
      .from('population_snapshots')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
      .order('timestamp', { ascending: true });

    if (error) {
      throw new Error(`Failed to get population trends: ${error.message}`);
    }

    return (data || []).map((row) => ({
      timestamp: new Date(row.timestamp),
      population: row.population,
      births: row.births,
      deaths: row.deaths,
      avgFitness: row.avg_fitness,
    }));
  }

  /**
   * Take a population snapshot for trend tracking
   */
  async takeSnapshot(): Promise<void> {
    const metrics = await this.getPopulationMetrics();
    
    const { error } = await this.supabase.from('population_snapshots').insert({
      timestamp: new Date().toISOString(),
      population: metrics.totalPopulation,
      alive_count: metrics.aliveCount,
      dead_count: metrics.deadCount,
      avg_balance: metrics.avgBalance,
      avg_fitness: metrics.avgFitness,
      avg_generation: metrics.avgGeneration,
      survival_rate: metrics.survivalRate,
      birth_rate: metrics.birthRate,
      death_rate: metrics.deathRate,
    });

    if (error) {
      console.error('Failed to take population snapshot:', error);
    }
  }

  /**
   * Format population dashboard as text
   */
  formatDashboard(
    population: PopulationMetrics,
    evolution: EvolutionMetrics,
    generations: GenerationMetrics[]
  ): string {
    const lines: string[] = [];

    lines.push('='.repeat(60));
    lines.push('POPULATION ANALYTICS DASHBOARD');
    lines.push('='.repeat(60));
    lines.push('');

    // Population Metrics
    lines.push('POPULATION METRICS:');
    lines.push(`  Total Population: ${population.totalPopulation}`);
    lines.push(`  Alive: ${population.aliveCount} (${population.survivalRate.toFixed(1)}%)`);
    lines.push(`  Dead: ${population.deadCount}`);
    lines.push(`  Avg Balance: ${population.avgBalance.toFixed(4)} SOL`);
    lines.push(`  Avg Fitness: ${population.avgFitness.toFixed(2)}`);
    lines.push(`  Avg Generation: ${population.avgGeneration.toFixed(1)}`);
    lines.push(`  Birth Rate: ${(population.birthRate * 100).toFixed(1)}%`);
    lines.push(`  Death Rate: ${(population.deathRate * 100).toFixed(1)}%`);
    lines.push('');

    // Evolution Metrics
    lines.push('EVOLUTION METRICS:');
    lines.push(`  Total Generations: ${evolution.totalGenerations}`);
    lines.push(`  Fitness Improvement: ${evolution.fitnessImprovement >= 0 ? '+' : ''}${evolution.fitnessImprovement.toFixed(2)}`);
    lines.push(`  Diversity Score: ${evolution.diversityScore.toFixed(2)}`);
    lines.push(`  Species Count: ${evolution.speciesCount}`);
    lines.push(`  Novel Behaviors: ${evolution.novelBehaviors}`);
    lines.push('');

    // Generation Breakdown
    if (generations.length > 0) {
      lines.push('GENERATION BREAKDOWN:');
      lines.push('  Gen | Pop | Avg Fitness | Avg Balance | Survival');
      lines.push('  ' + '-'.repeat(54));
      
      for (const gen of generations.slice(-10)) {
        // Show last 10 generations
        lines.push(
          `  ${gen.generation.toString().padStart(3)} | ` +
          `${gen.population.toString().padStart(3)} | ` +
          `${gen.avgFitness.toFixed(2).padStart(11)} | ` +
          `${gen.avgBalance.toFixed(4).padStart(11)} | ` +
          `${gen.survivalRate.toFixed(1).padStart(8)}%`
        );
      }
      lines.push('');
    }

    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(): Promise<{
    population: PopulationMetrics;
    evolution: EvolutionMetrics;
    generations: GenerationMetrics[];
    trends: PopulationTrend[];
  }> {
    const population = await this.getPopulationMetrics();
    const evolution = await this.getEvolutionMetrics();
    const generations = await this.getGenerationMetrics();
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    const trends = await this.getPopulationTrends(startDate, endDate);

    return {
      population,
      evolution,
      generations,
      trends,
    };
  }
}
