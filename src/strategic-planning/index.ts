/**
 * Strategic Planning Module
 * Multi-step planning, strategy simulation, forecasting, and accuracy tracking
 */

// Types
export * from './types.js';

// Multi-step planning
export { planAhead, generateDecisionTree } from './planner.js';
export type { PlanningContext } from './planner.js';

// Strategy simulation
export { simulateStrategies } from './simulator.js';
export type { SimulationContext } from './simulator.js';

// Plan evaluation
export { evaluatePlan } from './evaluator.js';
export type { EvaluationContext, AgentGoals } from './evaluator.js';

// Forecasting
export { forecastFutureState } from './forecaster.js';
export type { CurrentAgentState, ForecastingContext } from './forecaster.js';

// Accuracy tracking
export {
  trackPlanningAccuracy,
  calculateAverageAccuracy,
  analyzeAccuracyHistory,
} from './accuracy-tracker.js';
export type { ActualOutcome, AccuracyHistory } from './accuracy-tracker.js';

// Strategy adjustment
export {
  adjustStrategyIfNeeded,
  batchAdjustStrategies,
  getAdjustmentRecommendation,
} from './strategy-adjuster.js';
export type { AdjustmentRecommendation } from './strategy-adjuster.js';
