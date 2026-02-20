/**
 * Post-Decision Analysis
 * Enables agents to analyze decisions by comparing predicted vs actual outcomes
 */

import { DecisionAnalysis } from './types.js';

/**
 * Analyze a decision by comparing predicted vs actual outcomes
 * @param decision - The decision that was made
 * @param predictedOutcome - What was expected to happen
 * @param actualOutcome - What actually happened
 * @returns DecisionAnalysis object
 */
export function analyzeDecision(
  decision: string,
  predictedOutcome: string,
  actualOutcome: string
): DecisionAnalysis {
  const accuracy = calculateAccuracy(predictedOutcome, actualOutcome);
  const lessonsLearned = extractLessonsLearned(predictedOutcome, actualOutcome, accuracy);
  const strategyAdjustments = generateStrategyAdjustments(accuracy, lessonsLearned);

  return {
    decision,
    predictedOutcome,
    actualOutcome,
    accuracy,
    lessonsLearned,
    strategyAdjustments,
    timestamp: new Date(),
  };
}

/**
 * Calculate accuracy of prediction (0-100)
 * This is a simplified implementation - in production, use more sophisticated comparison
 */
function calculateAccuracy(predicted: string, actual: string): number {
  // Simple string similarity as a proxy for accuracy
  const predictedLower = predicted.toLowerCase();
  const actualLower = actual.toLowerCase();

  if (predictedLower === actualLower) {
    return 100;
  }

  // Calculate word overlap
  const predictedWords = new Set(predictedLower.split(/\s+/));
  const actualWords = new Set(actualLower.split(/\s+/));

  const intersection = new Set(
    [...predictedWords].filter(word => actualWords.has(word))
  );

  const union = new Set([...predictedWords, ...actualWords]);

  if (union.size === 0) {
    return 0;
  }

  return Math.round((intersection.size / union.size) * 100);
}

/**
 * Extract lessons learned from the decision
 */
function extractLessonsLearned(
  predicted: string,
  actual: string,
  accuracy: number
): string[] {
  const lessons: string[] = [];

  if (accuracy >= 90) {
    lessons.push('Prediction was highly accurate - current decision-making approach is effective');
  } else if (accuracy >= 70) {
    lessons.push('Prediction was reasonably accurate - minor refinements needed');
  } else if (accuracy >= 50) {
    lessons.push('Prediction was partially accurate - significant improvements needed');
  } else {
    lessons.push('Prediction was inaccurate - fundamental reassessment of approach required');
  }

  // Analyze specific differences
  if (predicted.toLowerCase().includes('success') && actual.toLowerCase().includes('fail')) {
    lessons.push('Overestimated likelihood of success - be more conservative in predictions');
  }

  if (predicted.toLowerCase().includes('fail') && actual.toLowerCase().includes('success')) {
    lessons.push('Underestimated likelihood of success - be more optimistic when warranted');
  }

  if (predicted.toLowerCase().includes('quick') && actual.toLowerCase().includes('slow')) {
    lessons.push('Underestimated time requirements - allow more time for complex tasks');
  }

  if (predicted.toLowerCase().includes('slow') && actual.toLowerCase().includes('quick')) {
    lessons.push('Overestimated time requirements - efficiency may be higher than expected');
  }

  // General lessons
  lessons.push('Continue tracking predictions vs outcomes to improve forecasting accuracy');

  return lessons;
}

/**
 * Generate strategy adjustments based on analysis
 */
function generateStrategyAdjustments(accuracy: number, lessons: string[]): string[] {
  const adjustments: string[] = [];

  if (accuracy < 70) {
    adjustments.push('Gather more information before making predictions');
    adjustments.push('Consider more variables in decision-making process');
  }

  if (accuracy < 50) {
    adjustments.push('Seek feedback from other agents or experts');
    adjustments.push('Review and update mental models and assumptions');
  }

  // Extract specific adjustments from lessons
  lessons.forEach(lesson => {
    if (lesson.includes('conservative')) {
      adjustments.push('Apply more conservative estimates in similar situations');
    }
    if (lesson.includes('optimistic')) {
      adjustments.push('Apply more optimistic estimates when evidence supports it');
    }
    if (lesson.includes('time')) {
      adjustments.push('Improve time estimation by tracking actual durations');
    }
  });

  // Ensure at least one adjustment
  if (adjustments.length === 0) {
    adjustments.push('Continue current approach while monitoring for changes');
  }

  return adjustments;
}

/**
 * Analyze multiple decisions to identify patterns
 * @param analyses - Array of decision analyses
 * @returns Pattern analysis
 */
export function analyzeDecisionPatterns(analyses: DecisionAnalysis[]): {
  averageAccuracy: number;
  accuracyTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
  commonLessons: string[];
  recommendedAdjustments: string[];
} {
  if (analyses.length === 0) {
    return {
      averageAccuracy: 0,
      accuracyTrend: 'insufficient_data',
      commonLessons: [],
      recommendedAdjustments: [],
    };
  }

  const averageAccuracy = analyses.reduce((sum, a) => sum + a.accuracy, 0) / analyses.length;

  // Determine accuracy trend
  let accuracyTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data';

  if (analyses.length >= 3) {
    const firstHalf = analyses.slice(0, Math.floor(analyses.length / 2));
    const secondHalf = analyses.slice(Math.floor(analyses.length / 2));

    const firstHalfAccuracy = firstHalf.reduce((sum, a) => sum + a.accuracy, 0) / firstHalf.length;
    const secondHalfAccuracy = secondHalf.reduce((sum, a) => sum + a.accuracy, 0) / secondHalf.length;

    if (secondHalfAccuracy > firstHalfAccuracy + 5) {
      accuracyTrend = 'improving';
    } else if (secondHalfAccuracy < firstHalfAccuracy - 5) {
      accuracyTrend = 'declining';
    } else {
      accuracyTrend = 'stable';
    }
  }

  // Find common lessons
  const lessonCount = new Map<string, number>();
  analyses.forEach(a => {
    a.lessonsLearned.forEach(lesson => {
      const key = lesson.toLowerCase();
      lessonCount.set(key, (lessonCount.get(key) || 0) + 1);
    });
  });

  const commonLessons = Array.from(lessonCount.entries())
    .filter(([_, count]) => count > analyses.length / 3)
    .sort((a, b) => b[1] - a[1])
    .map(([lesson, _]) => lesson);

  // Aggregate recommended adjustments
  const adjustmentCount = new Map<string, number>();
  analyses.forEach(a => {
    a.strategyAdjustments.forEach(adjustment => {
      const key = adjustment.toLowerCase();
      adjustmentCount.set(key, (adjustmentCount.get(key) || 0) + 1);
    });
  });

  const recommendedAdjustments = Array.from(adjustmentCount.entries())
    .filter(([_, count]) => count > analyses.length / 3)
    .sort((a, b) => b[1] - a[1])
    .map(([adjustment, _]) => adjustment);

  return {
    averageAccuracy,
    accuracyTrend,
    commonLessons,
    recommendedAdjustments,
  };
}

/**
 * Update decision-making strategy based on analysis
 * @param currentStrategy - Current decision-making strategy
 * @param analyses - Recent decision analyses
 * @returns Updated strategy
 */
export function updateDecisionStrategy(
  currentStrategy: Record<string, unknown>,
  analyses: DecisionAnalysis[]
): Record<string, unknown> {
  const patterns = analyzeDecisionPatterns(analyses);
  const updatedStrategy = { ...currentStrategy };

  // Update based on accuracy trend
  if (patterns.accuracyTrend === 'declining') {
    updatedStrategy.requireMoreEvidence = true;
    updatedStrategy.conservativeMode = true;
  } else if (patterns.accuracyTrend === 'improving') {
    updatedStrategy.confidenceLevel = 'high';
  }

  // Update based on average accuracy
  if (patterns.averageAccuracy < 50) {
    updatedStrategy.requirePeerReview = true;
    updatedStrategy.minimumEvidenceThreshold = 5;
  } else if (patterns.averageAccuracy >= 80) {
    updatedStrategy.allowFastDecisions = true;
  }

  // Apply recommended adjustments
  patterns.recommendedAdjustments.forEach(adjustment => {
    if (adjustment.includes('conservative')) {
      updatedStrategy.riskTolerance = 'low';
    }
    if (adjustment.includes('information')) {
      updatedStrategy.researchDepth = 'thorough';
    }
    if (adjustment.includes('feedback')) {
      updatedStrategy.seekExternalInput = true;
    }
  });

  updatedStrategy.lastUpdated = new Date().toISOString();

  return updatedStrategy;
}
