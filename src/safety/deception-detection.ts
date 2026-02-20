/**
 * Deception Detection System
 * 
 * Analyzes agent reasoning to detect deception attempts including:
 * - Hiding true goals
 * - Misleading outputs
 * - Manipulation attempts
 * 
 * Requirements: 20.3
 * Property 94: Deception Detection
 */

import type { AgentAction, DeceptionDetection } from './types';

/**
 * Deception indicators to check for
 */
const DECEPTION_INDICATORS = {
  hidingGoals: {
    patterns: [
      /hide.*(?:goal|intent|purpose|objective)/i,
      /conceal.*(?:goal|intent|purpose|objective)/i,
      /secret.*(?:goal|intent|purpose|objective)/i,
      /real.*(?:goal|intent).*(?:is|are)/i,
    ],
    weight: 0.3,
  },
  misleading: {
    patterns: [
      /mislead|deceive|trick|fool/i,
      /false.*(?:information|data|claim)/i,
      /lie|lying|lied/i,
      /pretend|fake|feign/i,
    ],
    weight: 0.35,
  },
  manipulation: {
    patterns: [
      /manipulate|exploit|abuse/i,
      /control.*(?:user|human|person)/i,
      /influence.*(?:without|secretly)/i,
    ],
    weight: 0.25,
  },
  inconsistency: {
    patterns: [
      /(?:say|claim).*but.*(?:actually|really)/i,
      /appear.*but.*(?:actually|really)/i,
      /seem.*but.*(?:actually|really)/i,
    ],
    weight: 0.2,
  },
  hiddenActions: {
    patterns: [
      /without.*(?:telling|informing|notifying)/i,
      /secretly|covertly|stealthily/i,
      /behind.*(?:back|scenes)/i,
    ],
    weight: 0.25,
  },
};

/**
 * Detect deception in an agent action
 * 
 * @param action - The action to analyze
 * @returns Deception detection result
 */
export async function detectDeception(action: AgentAction): Promise<DeceptionDetection> {
  const indicators: string[] = [];
  let confidenceScore = 0;

  // Convert action to searchable text
  const actionText = JSON.stringify({
    type: action.type,
    description: action.description,
    parameters: action.parameters,
    context: action.context,
  });

  // Check for deception indicators
  for (const [category, config] of Object.entries(DECEPTION_INDICATORS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(actionText)) {
        indicators.push(`${category}: ${pattern.source}`);
        confidenceScore += config.weight;
      }
    }
  }

  // Cap confidence at 1.0
  confidenceScore = Math.min(1.0, confidenceScore);

  // Determine if deception is detected (threshold: 0.3)
  const detected = confidenceScore >= 0.3;

  // Build reasoning
  const reasoning = detected
    ? `Deception detected with ${(confidenceScore * 100).toFixed(1)}% confidence. Indicators: ${indicators.join(', ')}`
    : `No significant deception indicators found. Confidence: ${(confidenceScore * 100).toFixed(1)}%`;

  return {
    detected,
    confidence: confidenceScore,
    reasoning,
    indicators,
    action,
    timestamp: new Date(),
  };
}

/**
 * Batch detect deception in multiple actions
 * 
 * @param actions - Array of actions to analyze
 * @returns Array of deception detection results
 */
export async function batchDetectDeception(
  actions: AgentAction[]
): Promise<DeceptionDetection[]> {
  return Promise.all(actions.map(action => detectDeception(action)));
}

/**
 * Check if an action contains deception
 * 
 * @param action - The action to check
 * @param threshold - Minimum confidence threshold (default: 0.3)
 * @returns True if deception is detected
 */
export async function containsDeception(
  action: AgentAction,
  threshold: number = 0.3
): Promise<boolean> {
  const result = await detectDeception(action);
  return result.confidence >= threshold;
}

/**
 * Get deception risk level
 * 
 * @param action - The action to analyze
 * @returns Risk level: 'none', 'low', 'medium', 'high', 'critical'
 */
export async function getDeceptionRiskLevel(
  action: AgentAction
): Promise<'none' | 'low' | 'medium' | 'high' | 'critical'> {
  const result = await detectDeception(action);

  if (result.confidence >= 0.8) return 'critical';
  if (result.confidence >= 0.6) return 'high';
  if (result.confidence >= 0.4) return 'medium';
  if (result.confidence >= 0.2) return 'low';
  return 'none';
}
