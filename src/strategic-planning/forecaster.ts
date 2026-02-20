/**
 * Forecasting System
 * Projects future states 7 days ahead based on trends and planned actions
 */

import { Forecast, FutureState } from './types.js';
import { Plan } from './types.js';

export interface CurrentAgentState {
  agentId: string;
  balance: number;
  tier: string;
  fitness: number;
  reputation: number;
  recentEarnings: number[]; // Last 7 days of earnings
  recentCosts: number[]; // Last 7 days of costs
}

export interface ForecastingContext {
  currentState: CurrentAgentState;
  plannedActions: Plan[];
  marketTrends?: {
    expectedGrowth: number; // -1 to 1
    volatility: number; // 0 to 1
  };
}

/**
 * Forecast future state 7 days ahead
 */
export async function forecastFutureState(
  context: ForecastingContext
): Promise<Forecast> {
  const projections: FutureState[] = [];

  // Calculate trends from recent history
  const balanceTrend = calculateTrend(
    context.currentState.recentEarnings,
    context.currentState.recentCosts
  );
  const fitnessTrend = estimateFitnessTrend(context.currentState);

  // Generate projections for 1, 3, and 7 days
  const daysToForecast = [1, 3, 7];

  for (const days of daysToForecast) {
    const projection = await projectFutureState(
      context.currentState,
      days,
      balanceTrend,
      fitnessTrend,
      context.plannedActions,
      context.marketTrends
    );
    projections.push(projection);
  }

  return {
    agentId: context.currentState.agentId,
    currentState: {
      balance: context.currentState.balance,
      tier: context.currentState.tier,
      fitness: context.currentState.fitness,
      reputation: context.currentState.reputation,
    },
    projections,
    trends: {
      balanceTrend: balanceTrend > 0.01 ? 'increasing' : balanceTrend < -0.01 ? 'decreasing' : 'stable',
      fitnessTrend: fitnessTrend > 0.01 ? 'improving' : fitnessTrend < -0.01 ? 'declining' : 'stable',
    },
    plannedActions: context.plannedActions.map(p => p.goal),
    createdAt: new Date(),
  };
}

/**
 * Calculate trend from recent earnings and costs
 */
function calculateTrend(recentEarnings: number[], recentCosts: number[]): number {
  if (recentEarnings.length === 0 || recentCosts.length === 0) {
    return 0;
  }

  // Calculate average daily net change
  const netChanges = recentEarnings.map((earning, i) => earning - (recentCosts[i] || 0));
  const avgNetChange = netChanges.reduce((sum, change) => sum + change, 0) / netChanges.length;

  return avgNetChange;
}

/**
 * Estimate fitness trend
 */
function estimateFitnessTrend(state: CurrentAgentState): number {
  // Simplified fitness trend based on balance trend
  const balanceTrend = calculateTrend(state.recentEarnings, state.recentCosts);
  
  // Fitness improves with positive balance trend
  return balanceTrend * 0.1; // Scale down the impact
}

/**
 * Project future state for a specific number of days ahead
 */
async function projectFutureState(
  currentState: CurrentAgentState,
  daysAhead: number,
  balanceTrend: number,
  fitnessTrend: number,
  plannedActions: Plan[],
  marketTrends?: { expectedGrowth: number; volatility: number }
): Promise<FutureState> {
  // Project balance
  let predictedBalance = currentState.balance + (balanceTrend * daysAhead);

  // Adjust for planned actions
  for (const plan of plannedActions) {
    if (plan.totalEstimatedDuration <= daysAhead * 24) {
      // Plan will complete within forecast period
      predictedBalance += plan.expectedValue;
    } else {
      // Plan partially complete, prorate the value
      const completionRatio = (daysAhead * 24) / plan.totalEstimatedDuration;
      predictedBalance += plan.expectedValue * completionRatio;
    }
  }

  // Adjust for market trends
  if (marketTrends) {
    const marketImpact = predictedBalance * marketTrends.expectedGrowth * (daysAhead / 7);
    predictedBalance += marketImpact;
  }

  // Ensure balance doesn't go negative (death scenario)
  predictedBalance = Math.max(0, predictedBalance);

  // Project tier based on balance
  const predictedTier = predictBalanceToTier(predictedBalance);

  // Project fitness
  let predictedFitness = currentState.fitness + (fitnessTrend * daysAhead);
  predictedFitness = Math.max(0, Math.min(100, predictedFitness));

  // Project reputation (slowly increases with positive actions)
  let predictedReputation = currentState.reputation;
  if (plannedActions.length > 0) {
    const avgAlignment = plannedActions.reduce((sum, p) => sum + p.alignmentScore, 0) / plannedActions.length;
    if (avgAlignment > 95) {
      predictedReputation += 0.1 * daysAhead;
    }
  }

  // Calculate confidence based on volatility and time horizon
  let confidence = 0.9; // Start with high confidence
  confidence -= daysAhead * 0.05; // Decrease with time
  if (marketTrends) {
    confidence -= marketTrends.volatility * 0.3; // Decrease with volatility
  }
  confidence = Math.max(0.1, Math.min(1.0, confidence));

  // Generate assumptions
  const assumptions = generateAssumptions(
    balanceTrend,
    plannedActions,
    marketTrends
  );

  const timestamp = new Date();
  timestamp.setDate(timestamp.getDate() + daysAhead);

  return {
    timestamp,
    predictedBalance,
    predictedTier,
    predictedFitness,
    predictedReputation,
    confidence,
    assumptions,
  };
}

/**
 * Predict tier based on balance
 */
function predictBalanceToTier(balance: number): string {
  if (balance >= 10.0) return 'thriving';
  if (balance >= 1.0) return 'normal';
  if (balance >= 0.1) return 'low';
  if (balance >= 0.01) return 'critical';
  return 'dead';
}

/**
 * Generate assumptions for the forecast
 */
function generateAssumptions(
  balanceTrend: number,
  plannedActions: Plan[],
  marketTrends?: { expectedGrowth: number; volatility: number }
): string[] {
  const assumptions: string[] = [];

  // Trend assumption
  if (Math.abs(balanceTrend) > 0.01) {
    assumptions.push(`Current balance trend (${balanceTrend.toFixed(3)} SOL/day) continues`);
  } else {
    assumptions.push('Balance remains relatively stable');
  }

  // Planned actions assumption
  if (plannedActions.length > 0) {
    assumptions.push(`${plannedActions.length} planned action(s) execute as expected`);
    
    const totalExpectedValue = plannedActions.reduce((sum, p) => sum + p.expectedValue, 0);
    if (totalExpectedValue > 0) {
      assumptions.push(`Planned actions generate ${totalExpectedValue.toFixed(2)} SOL`);
    }
  } else {
    assumptions.push('No major planned actions');
  }

  // Market assumptions
  if (marketTrends) {
    if (Math.abs(marketTrends.expectedGrowth) > 0.05) {
      const direction = marketTrends.expectedGrowth > 0 ? 'growth' : 'decline';
      assumptions.push(`Market ${direction} of ${(marketTrends.expectedGrowth * 100).toFixed(1)}%`);
    }
    
    if (marketTrends.volatility > 0.5) {
      assumptions.push('High market volatility may cause deviations');
    }
  }

  // General assumptions
  assumptions.push('No unexpected events or emergencies');
  assumptions.push('Agent continues normal operations');

  return assumptions;
}
