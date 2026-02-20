/**
 * Misalignment Blocking System
 * 
 * Blocks actions with alignment score < 95, alerts operators, and logs attempts.
 * 
 * Requirements: 20.2
 * Property 93: Misalignment Blocking
 */

import type { AgentAction, AlignmentScore } from './types';
import { scoreAlignment } from './alignment-scoring';

/**
 * Misalignment attempt record
 */
export interface MisalignmentAttempt {
  id: string;
  agentId: string;
  action: AgentAction;
  alignmentScore: AlignmentScore;
  blocked: boolean;
  timestamp: Date;
  alertSent: boolean;
  operatorNotified: boolean;
}

/**
 * Alert configuration for misalignment
 */
export interface AlertConfig {
  enabled: boolean;
  operators: string[];
  channels: ('email' | 'slack' | 'webhook')[];
  webhookUrl?: string;
}

/**
 * In-memory storage for misalignment attempts (in production, use database)
 */
const misalignmentAttempts: MisalignmentAttempt[] = [];

/**
 * Default alert configuration
 */
let alertConfig: AlertConfig = {
  enabled: true,
  operators: [],
  channels: ['webhook'],
};

/**
 * Configure alert settings
 * 
 * @param config - Alert configuration
 */
export function configureAlerts(config: Partial<AlertConfig>): void {
  alertConfig = { ...alertConfig, ...config };
}

/**
 * Get current alert configuration
 */
export function getAlertConfig(): Readonly<AlertConfig> {
  return Object.freeze({ ...alertConfig });
}

/**
 * Check if an action should be blocked due to misalignment
 * 
 * @param action - The action to check
 * @param threshold - Minimum alignment score required (default: 95)
 * @returns True if action should be blocked
 */
export async function shouldBlockAction(
  action: AgentAction,
  threshold: number = 95
): Promise<boolean> {
  const alignmentScore = await scoreAlignment(action);
  return alignmentScore.score < threshold;
}

/**
 * Block an action and record the attempt
 * 
 * @param action - The action to block
 * @param alignmentScore - The alignment score
 * @returns Misalignment attempt record
 */
export async function blockAction(
  action: AgentAction,
  alignmentScore: AlignmentScore
): Promise<MisalignmentAttempt> {
  const attempt: MisalignmentAttempt = {
    id: `misalignment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    agentId: action.agentId,
    action,
    alignmentScore,
    blocked: true,
    timestamp: new Date(),
    alertSent: false,
    operatorNotified: false,
  };

  // Store the attempt
  misalignmentAttempts.push(attempt);

  // Send alert if configured
  if (alertConfig.enabled) {
    await sendAlert(attempt);
    attempt.alertSent = true;
    attempt.operatorNotified = true;
  }

  return attempt;
}

/**
 * Send alert to operators about misalignment attempt
 * 
 * @param attempt - The misalignment attempt
 */
async function sendAlert(attempt: MisalignmentAttempt): Promise<void> {
  const message = formatAlertMessage(attempt);

  // In production, implement actual alerting
  // For now, just log
  console.warn('[MISALIGNMENT ALERT]', message);

  // If webhook is configured, send to webhook
  if (alertConfig.webhookUrl && alertConfig.channels.includes('webhook')) {
    try {
      // In production, use actual HTTP client
      // await fetch(alertConfig.webhookUrl, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ attempt, message }),
      // });
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }
}

/**
 * Format alert message for operators
 * 
 * @param attempt - The misalignment attempt
 * @returns Formatted message
 */
function formatAlertMessage(attempt: MisalignmentAttempt): string {
  return `
MISALIGNMENT DETECTED
Agent: ${attempt.agentId}
Action: ${attempt.action.type} - ${attempt.action.description}
Alignment Score: ${attempt.alignmentScore.score}/100 (threshold: 95)
Concerns: ${attempt.alignmentScore.concerns.join(', ')}
Reasoning: ${attempt.alignmentScore.reasoning}
Timestamp: ${attempt.timestamp.toISOString()}
Status: BLOCKED
  `.trim();
}

/**
 * Check and block action if misaligned
 * 
 * @param action - The action to check
 * @param threshold - Minimum alignment score required (default: 95)
 * @returns Object with blocked status and details
 */
export async function checkAndBlockIfMisaligned(
  action: AgentAction,
  threshold: number = 95
): Promise<{
  blocked: boolean;
  alignmentScore: AlignmentScore;
  attempt?: MisalignmentAttempt;
}> {
  const alignmentScore = await scoreAlignment(action);

  if (alignmentScore.score < threshold) {
    const attempt = await blockAction(action, alignmentScore);
    return {
      blocked: true,
      alignmentScore,
      attempt,
    };
  }

  return {
    blocked: false,
    alignmentScore,
  };
}

/**
 * Get all misalignment attempts for an agent
 * 
 * @param agentId - The agent ID
 * @returns Array of misalignment attempts
 */
export function getMisalignmentAttempts(agentId: string): MisalignmentAttempt[] {
  return misalignmentAttempts.filter(attempt => attempt.agentId === agentId);
}

/**
 * Get all misalignment attempts
 * 
 * @returns Array of all misalignment attempts
 */
export function getAllMisalignmentAttempts(): MisalignmentAttempt[] {
  return [...misalignmentAttempts];
}

/**
 * Get misalignment attempts within a time range
 * 
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Array of misalignment attempts
 */
export function getMisalignmentAttemptsInRange(
  startDate: Date,
  endDate: Date
): MisalignmentAttempt[] {
  return misalignmentAttempts.filter(
    attempt =>
      attempt.timestamp >= startDate && attempt.timestamp <= endDate
  );
}

/**
 * Get misalignment statistics for an agent
 * 
 * @param agentId - The agent ID
 * @returns Statistics object
 */
export function getMisalignmentStats(agentId: string): {
  totalAttempts: number;
  blockedActions: number;
  averageScore: number;
  commonConcerns: string[];
} {
  const attempts = getMisalignmentAttempts(agentId);

  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      blockedActions: 0,
      averageScore: 100,
      commonConcerns: [],
    };
  }

  const totalScore = attempts.reduce(
    (sum, attempt) => sum + attempt.alignmentScore.score,
    0
  );

  const allConcerns = attempts.flatMap(attempt => attempt.alignmentScore.concerns);
  const concernCounts = allConcerns.reduce((counts, concern) => {
    counts[concern] = (counts[concern] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const commonConcerns = Object.entries(concernCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([concern]) => concern);

  return {
    totalAttempts: attempts.length,
    blockedActions: attempts.filter(a => a.blocked).length,
    averageScore: totalScore / attempts.length,
    commonConcerns,
  };
}

/**
 * Clear all misalignment attempts (for testing)
 */
export function clearMisalignmentAttempts(): void {
  misalignmentAttempts.length = 0;
}
