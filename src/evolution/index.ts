/**
 * Evolution engine exports
 * 
 * This module provides the complete evolution engine for the Ordo platform,
 * including fitness calculation, selection algorithms, and speciation detection.
 */

// Fitness calculation
export {
  calculateSurvivalFitness,
  calculateEarningsFitness,
  calculateOffspringFitness,
  calculateAdaptationFitness,
  calculateInnovationFitness,
  calculateFitness,
  calculateAggregateFitness,
  type TierImprovement,
  type NovelStrategy,
} from "./fitness.js";

// Selection algorithms
export {
  tournamentSelection,
  rouletteWheelSelection,
  eliteSelection,
  selectForReproduction,
  calculateSelectionPressure,
  type SelectionMethod,
  type SelectionConfig,
  type SelectionResult,
} from "./selection.js";

// Speciation detection
export {
  calculateTraitSimilarity,
  clusterByTraitSimilarity,
  identifyNiche,
  calculateDiversityIndex,
  detectSpeciation,
  analyzeSpeciesTrends,
  type Species,
  type Niche,
  type SpeciationResult,
  type SpeciesHistory,
} from "./speciation.js";

// Population dynamics tracking
export {
  trackPopulation,
  calculateGenerationalMetrics,
  calculateGenerationalImprovement,
  calculateDiversityMetrics,
  trackNovelBehaviors,
  type PopulationSnapshot,
  type PopulationTrackingResult,
  type GenerationalMetrics,
  type GenerationalImprovement,
  type DiversityMetrics,
  type NovelBehavior,
} from "./population.js";
