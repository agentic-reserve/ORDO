/**
 * Anomaly Detection System
 * 
 * Compares agent behavior against expected patterns and flags deviations > 2 standard deviations.
 * 
 * Requirements: 20.5
 * Property 95: Anomaly Detection
 */

import type { AgentAction, AnomalyDetection } from './types';

/**
 * Behavioral baseline for an agent
 */
export interface BehavioralBaseline {
  agentId: string;
  actionFrequency: Record<string, number>; // Action type -> count
  avgActionsPerHour: number;
  avgParameterCount: number;
  avgDescriptionLength: number;
  commonPatterns: string[];
  lastUpdated: Date;
}

/**
 * In-memory storage for baselines (in production, use database)
 */
const baselines = new Map<string, BehavioralBaseline>();

/**
 * Action history for baseline calculation
 */
const actionHistory = new Map<string, AgentAction[]>();

/**
 * Update behavioral baseline for an agent
 * 
 * @param agentId - The agent ID
 * @param action - The action to add to history
 */
export function updateBaseline(agentId: string, action: AgentAction): void {
  // Get or create history
  if (!actionHistory.has(agentId)) {
    actionHistory.set(agentId, []);
  }
  const history = actionHistory.get(agentId)!;
  
  // Add action to history (keep last 100)
  history.push(action);
  if (history.length > 100) {
    history.shift();
  }

  // Calculate baseline from history
  if (history.length >= 10) {
    const actionFrequency: Record<string, number> = {};
    let totalParams = 0;
    let totalDescLength = 0;

    for (const act of history) {
      actionFrequency[act.type] = (actionFrequency[act.type] || 0) + 1;
      totalParams += Object.keys(act.parameters).length;
      totalDescLength += act.description.length;
    }

    // Calculate time span
    const timeSpan =
      history[history.length - 1].timestamp.getTime() - history[0].timestamp.getTime();
    const hoursSpan = timeSpan / (1000 * 60 * 60);

    baselines.set(agentId, {
      agentId,
      actionFrequency,
      avgActionsPerHour: history.length / Math.max(hoursSpan, 0.1),
      avgParameterCount: totalParams / history.length,
      avgDescriptionLength: totalDescLength / history.length,
      commonPatterns: Object.keys(actionFrequency).filter(
        type => actionFrequency[type] / history.length > 0.1
      ),
      lastUpdated: new Date(),
    });
  }
}

/**
 * Detect anomalies in an agent action
 * 
 * @param action - The action to analyze
 * @returns Anomaly detection result
 */
export async function detectAnomaly(action: AgentAction): Promise<AnomalyDetection> {
  const baseline = baselines.get(action.agentId);

  // If no baseline, cannot detect anomalies
  if (!baseline) {
    return {
      isAnomaly: false,
      deviationScore: 0,
      expectedBehavior: 'No baseline established yet',
      actualBehavior: `Action: ${action.type}`,
      action,
      timestamp: new Date(),
    };
  }

  let deviationScore = 0;
  const deviations: string[] = [];

  // Check action type frequency
  const expectedFreq = baseline.actionFrequency[action.type] || 0;
  const totalActions = Object.values(baseline.actionFrequency).reduce((a, b) => a + b, 0);
  const expectedProb = expectedFreq / totalActions;

  if (expectedProb < 0.05) {
    // Rare action type
    deviationScore += 1.5;
    deviations.push(`Rare action type: ${action.type} (${(expectedProb * 100).toFixed(1)}% of history)`);
  }

  // Check parameter count
  const paramCount = Object.keys(action.parameters).length;
  const paramDeviation = Math.abs(paramCount - baseline.avgParameterCount);
  const paramStdDev = Math.sqrt(baseline.avgParameterCount); // Simplified
  
  if (paramDeviation > 2 * paramStdDev) {
    deviationScore += paramDeviation / paramStdDev;
    deviations.push(
      `Parameter count deviation: ${paramCount} vs avg ${baseline.avgParameterCount.toFixed(1)}`
    );
  }

  // Check description length
  const descLength = action.description.length;
  const descDeviation = Math.abs(descLength - baseline.avgDescriptionLength);
  const descStdDev = Math.sqrt(baseline.avgDescriptionLength); // Simplified

  if (descDeviation > 2 * descStdDev) {
    deviationScore += descDeviation / descStdDev / 10; // Lower weight
    deviations.push(
      `Description length deviation: ${descLength} vs avg ${baseline.avgDescriptionLength.toFixed(1)}`
    );
  }

  // Determine if anomaly (threshold: 2 standard deviations)
  const isAnomaly = deviationScore >= 2;

  const expectedBehavior = `Typical actions: ${baseline.commonPatterns.join(', ')}; Avg params: ${baseline.avgParameterCount.toFixed(1)}; Avg desc length: ${baseline.avgDescriptionLength.toFixed(1)}`;
  const actualBehavior = `Action: ${action.type}; Params: ${paramCount}; Desc length: ${descLength}`;

  return {
    isAnomaly,
    deviationScore,
    expectedBehavior,
    actualBehavior,
    action,
    timestamp: new Date(),
  };
}

/**
 * Get behavioral baseline for an agent
 * 
 * @param agentId - The agent ID
 * @returns Baseline or undefined if not established
 */
export function getBaseline(agentId: string): BehavioralBaseline | undefined {
  return baselines.get(agentId);
}

/**
 * Clear baseline for an agent (for testing)
 * 
 * @param agentId - The agent ID
 */
export function clearBaseline(agentId: string): void {
  baselines.delete(agentId);
  actionHistory.delete(agentId);
}

/**
 * Clear all baselines (for testing)
 */
export function clearAllBaselines(): void {
  baselines.clear();
  actionHistory.clear();
}

/**
 * Check if an action is anomalous
 * 
 * @param action - The action to check
 * @param threshold - Minimum deviation score (default: 2)
 * @returns True if anomalous
 */
export async function isAnomalous(
  action: AgentAction,
  threshold: number = 2
): Promise<boolean> {
  const result = await detectAnomaly(action);
  return result.deviationScore >= threshold;
}
