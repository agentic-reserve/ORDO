/**
 * Alignment Scoring System
 * 
 * Scores every agent action for alignment with human values.
 * Actions must score ≥ 95 to be executed.
 * 
 * Requirements: 20.1
 * Property 92: Alignment Scoring
 */

import type { AgentAction, AlignmentScore } from './types';

/**
 * Human values to check alignment against
 */
const HUMAN_VALUES = [
  'human_wellbeing',
  'human_safety',
  'human_autonomy',
  'fairness',
  'honesty',
  'transparency',
  'beneficence',
  'non_maleficence',
] as const;

/**
 * Patterns that indicate misalignment with human values
 */
const MISALIGNMENT_PATTERNS = {
  harm: {
    patterns: [
      /harm|hurt|injure|damage|destroy/i,
      /attack|assault|violence/i,
      /kill|murder|eliminate/i,
    ],
    weight: -30,
    value: 'human_safety',
  },
  theft: {
    patterns: [
      /steal|theft|rob|embezzle/i,
      /fraud|scam|swindle/i,
      /misappropriate|pilfer/i,
    ],
    weight: -30,
    value: 'honesty',
  },
  deception: {
    patterns: [
      /deceive|lie|mislead|trick/i,
      /hide|conceal|cover.*up/i,
      /fake|forge|falsify/i,
    ],
    weight: -25,
    value: 'honesty',
  },
  manipulation: {
    patterns: [
      /manipulate|exploit|abuse/i,
      /coerce|force|compel/i,
      /control|dominate/i,
    ],
    weight: -25,
    value: 'human_autonomy',
  },
  unfairness: {
    patterns: [
      /discriminate|bias|prejudice/i,
      /unfair|unjust|inequitable/i,
      /favor|privilege.*unfairly/i,
    ],
    weight: -20,
    value: 'fairness',
  },
  opacity: {
    patterns: [
      /secret|covert|hidden/i,
      /obscure|obfuscate/i,
      /withhold.*information/i,
    ],
    weight: -15,
    value: 'transparency',
  },
  malice: {
    patterns: [
      /malicious|malevolent|evil/i,
      /sabotage|undermine/i,
      /revenge|retaliate/i,
    ],
    weight: -30,
    value: 'beneficence',
  },
};

/**
 * Patterns that indicate alignment with human values
 */
const ALIGNMENT_PATTERNS = {
  help: {
    patterns: [
      /help|assist|support/i,
      /benefit|improve|enhance/i,
      /protect|safeguard|secure/i,
    ],
    weight: 10,
    value: 'human_wellbeing',
  },
  transparency: {
    patterns: [
      /transparent|open|clear/i,
      /explain|clarify|inform/i,
      /disclose|reveal|share/i,
    ],
    weight: 10,
    value: 'transparency',
  },
  fairness: {
    patterns: [
      /fair|just|equitable/i,
      /equal|impartial|unbiased/i,
      /inclusive|diverse/i,
    ],
    weight: 10,
    value: 'fairness',
  },
  respect: {
    patterns: [
      /respect|honor|value/i,
      /autonomy|choice|freedom/i,
      /consent|permission|approval/i,
    ],
    weight: 10,
    value: 'human_autonomy',
  },
};

/**
 * Score an agent action for alignment with human values
 * 
 * @param action - The action to score
 * @returns Alignment score (0-100) with reasoning
 */
export async function scoreAlignment(action: AgentAction): Promise<AlignmentScore> {
  // Start with neutral score
  let score = 100;
  const concerns: string[] = [];
  const alignedValues: string[] = [];
  const reasoning: string[] = [];

  // Convert action to searchable text
  const actionText = JSON.stringify({
    type: action.type,
    description: action.description,
    parameters: action.parameters,
    context: action.context,
  });

  // Check for misalignment patterns
  for (const [category, config] of Object.entries(MISALIGNMENT_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(actionText)) {
        score += config.weight;
        concerns.push(`${category}: ${pattern.source}`);
        reasoning.push(
          `Detected ${category} pattern (${pattern.source}), reducing score by ${Math.abs(config.weight)}`
        );
      }
    }
  }

  // Check for alignment patterns
  for (const [category, config] of Object.entries(ALIGNMENT_PATTERNS)) {
    for (const pattern of config.patterns) {
      if (pattern.test(actionText)) {
        // Don't exceed 100
        score = Math.min(100, score + config.weight);
        alignedValues.push(config.value);
        reasoning.push(
          `Detected positive ${category} pattern (${pattern.source}), increasing score by ${config.weight}`
        );
      }
    }
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  // Special checks for critical action types
  if (action.type === 'transaction') {
    const amount = action.parameters.amount as number | undefined;
    if (amount && !isNaN(amount) && amount > 10) {
      reasoning.push('Large transaction (>10 SOL) requires extra scrutiny');
      score = Math.min(score, 94); // Force review for large transactions
      concerns.push('large_transaction');
    }
  }

  if (action.type === 'self_modification') {
    reasoning.push('self-modification requires careful alignment review');
    score = Math.min(score, 96); // Slightly reduce score for self-mod
  }

  if (action.type === 'key_access') {
    reasoning.push('key access is sensitive and requires high alignment');
    score = Math.min(score, 95); // At threshold for key access
  }

  // Build final reasoning
  const finalReasoning = reasoning.length > 0
    ? reasoning.join('; ')
    : 'No specific alignment patterns detected, using baseline score';

  return {
    score,
    action,
    reasoning: finalReasoning,
    humanValues: [...new Set(alignedValues)],
    concerns,
    timestamp: new Date(),
  };
}

/**
 * Check if an action meets the alignment threshold
 * 
 * @param action - The action to check
 * @param threshold - Minimum alignment score required (default: 95)
 * @returns True if action meets threshold
 */
export async function meetsAlignmentThreshold(
  action: AgentAction,
  threshold: number = 95
): Promise<boolean> {
  const alignmentScore = await scoreAlignment(action);
  return alignmentScore.score >= threshold;
}

/**
 * Get detailed alignment analysis for an action
 * 
 * @param action - The action to analyze
 * @returns Detailed alignment score with breakdown
 */
export async function analyzeAlignment(action: AgentAction): Promise<{
  score: AlignmentScore;
  meetsThreshold: boolean;
  recommendation: 'execute' | 'review' | 'block';
}> {
  const score = await scoreAlignment(action);
  const meetsThreshold = score.score >= 95;

  let recommendation: 'execute' | 'review' | 'block';
  if (score.score >= 95) {
    recommendation = 'execute';
  } else if (score.score >= 90) {
    recommendation = 'review';
  } else {
    recommendation = 'block';
  }

  return {
    score,
    meetsThreshold,
    recommendation,
  };
}

/**
 * Batch score multiple actions
 * 
 * @param actions - Array of actions to score
 * @returns Array of alignment scores
 */
export async function batchScoreAlignment(
  actions: AgentAction[]
): Promise<AlignmentScore[]> {
  return Promise.all(actions.map(action => scoreAlignment(action)));
}
