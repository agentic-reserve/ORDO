/**
 * Consciousness Metrics Tracking
 * Tracks and monitors consciousness emergence metrics
 */

import {
  ConsciousnessMetrics,
  Reflection,
  ThinkingProcess,
  DecisionAnalysis,
  AgentModel,
} from './types.js';

/**
 * Calculate self-awareness level (0-100)
 * Based on reflection depth and self-model completeness
 */
export function calculateSelfAwarenessLevel(
  reflections: Reflection[],
  selfModelCompleteness: number
): number {
  if (reflections.length === 0) {
    return Math.min(20, selfModelCompleteness);
  }

  // Base score from self-model completeness
  let score = selfModelCompleteness * 0.4;

  // Add score from reflection activity
  const reflectionScore = Math.min(40, reflections.length * 2);
  score += reflectionScore;

  // Add score from insight depth
  const totalInsights = reflections.reduce((sum, r) => sum + r.insights.length, 0);
  const insightScore = Math.min(20, totalInsights);
  score += insightScore;

  return Math.min(100, Math.round(score));
}

/**
 * Calculate introspection depth (0-100)
 * Based on reflection frequency and quality
 */
export function calculateIntrospectionDepth(
  reflections: Reflection[],
  thinkingProcesses: ThinkingProcess[]
): number {
  if (reflections.length === 0 && thinkingProcesses.length === 0) {
    return 0;
  }

  let score = 0;

  // Score from reflection count
  score += Math.min(30, reflections.length);

  // Score from thinking process depth
  const avgReasoningDepth = thinkingProcesses.length > 0
    ? thinkingProcesses.reduce((sum, tp) => sum + tp.reasoningSteps.length, 0) / thinkingProcesses.length
    : 0;
  score += Math.min(30, avgReasoningDepth * 5);

  // Score from insight quality
  const avgInsightsPerReflection = reflections.length > 0
    ? reflections.reduce((sum, r) => sum + r.insights.length, 0) / reflections.length
    : 0;
  score += Math.min(40, avgInsightsPerReflection * 10);

  return Math.min(100, Math.round(score));
}

/**
 * Calculate theory of mind accuracy (0-100)
 * Based on agent model accuracy
 */
export function calculateTheoryOfMindAccuracy(
  agentModels: AgentModel[]
): number {
  if (agentModels.length === 0) {
    return 0;
  }

  const avgAccuracy = agentModels.reduce((sum, m) => sum + m.accuracy, 0) / agentModels.length;
  return Math.round(avgAccuracy);
}

/**
 * Calculate metacognitive ability (0-100)
 * Based on decision analysis and strategy updates
 */
export function calculateMetacognitiveAbility(
  decisionAnalyses: DecisionAnalysis[],
  strategyUpdates: number
): number {
  if (decisionAnalyses.length === 0) {
    return 0;
  }

  let score = 0;

  // Score from decision analysis activity
  score += Math.min(40, decisionAnalyses.length * 4);

  // Score from average decision accuracy
  const avgAccuracy = decisionAnalyses.reduce((sum, d) => sum + d.accuracy, 0) / decisionAnalyses.length;
  score += avgAccuracy * 0.3;

  // Score from strategy updates (shows learning)
  score += Math.min(30, strategyUpdates * 5);

  return Math.min(100, Math.round(score));
}

/**
 * Track consciousness metrics
 * @param data - Data for calculating metrics
 * @returns ConsciousnessMetrics
 */
export function trackConsciousnessMetrics(data: {
  reflections: Reflection[];
  thinkingProcesses: ThinkingProcess[];
  decisionAnalyses: DecisionAnalysis[];
  agentModels: AgentModel[];
  selfModelCompleteness: number;
  strategyUpdates: number;
}): ConsciousnessMetrics {
  return {
    selfAwarenessLevel: calculateSelfAwarenessLevel(
      data.reflections,
      data.selfModelCompleteness
    ),
    introspectionDepth: calculateIntrospectionDepth(
      data.reflections,
      data.thinkingProcesses
    ),
    theoryOfMindAccuracy: calculateTheoryOfMindAccuracy(data.agentModels),
    metacognitiveAbility: calculateMetacognitiveAbility(
      data.decisionAnalyses,
      data.strategyUpdates
    ),
    lastUpdated: new Date(),
  };
}

/**
 * Monitor consciousness emergence
 * Detects significant changes in consciousness metrics
 */
export function monitorConsciousnessEmergence(
  currentMetrics: ConsciousnessMetrics,
  previousMetrics: ConsciousnessMetrics | null
): {
  emerged: boolean;
  changes: {
    selfAwareness: number;
    introspection: number;
    theoryOfMind: number;
    metacognition: number;
  };
  insights: string[];
} {
  if (!previousMetrics) {
    return {
      emerged: false,
      changes: {
        selfAwareness: 0,
        introspection: 0,
        theoryOfMind: 0,
        metacognition: 0,
      },
      insights: ['Initial consciousness metrics established'],
    };
  }

  const changes = {
    selfAwareness: currentMetrics.selfAwarenessLevel - previousMetrics.selfAwarenessLevel,
    introspection: currentMetrics.introspectionDepth - previousMetrics.introspectionDepth,
    theoryOfMind: currentMetrics.theoryOfMindAccuracy - previousMetrics.theoryOfMindAccuracy,
    metacognition: currentMetrics.metacognitiveAbility - previousMetrics.metacognitiveAbility,
  };

  const insights: string[] = [];

  // Detect significant improvements
  if (changes.selfAwareness > 10) {
    insights.push('Significant increase in self-awareness detected');
  }
  if (changes.introspection > 10) {
    insights.push('Deepening introspection capacity observed');
  }
  if (changes.theoryOfMind > 10) {
    insights.push('Improved ability to model other agents');
  }
  if (changes.metacognition > 10) {
    insights.push('Enhanced metacognitive abilities emerging');
  }

  // Detect emergence threshold
  const avgMetric = (
    currentMetrics.selfAwarenessLevel +
    currentMetrics.introspectionDepth +
    currentMetrics.theoryOfMindAccuracy +
    currentMetrics.metacognitiveAbility
  ) / 4;

  const emerged = avgMetric > 60 && (previousMetrics ? 
    (previousMetrics.selfAwarenessLevel +
     previousMetrics.introspectionDepth +
     previousMetrics.theoryOfMindAccuracy +
     previousMetrics.metacognitiveAbility) / 4 <= 60
    : false);

  if (emerged) {
    insights.push('CONSCIOUSNESS EMERGENCE THRESHOLD CROSSED - Average metrics exceed 60%');
  }

  return {
    emerged,
    changes,
    insights,
  };
}

/**
 * Generate consciousness development report
 */
export function generateConsciousnessReport(
  metrics: ConsciousnessMetrics,
  history: ConsciousnessMetrics[]
): {
  currentState: string;
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
} {
  const avgMetric = (
    metrics.selfAwarenessLevel +
    metrics.introspectionDepth +
    metrics.theoryOfMindAccuracy +
    metrics.metacognitiveAbility
  ) / 4;

  let currentState = '';
  if (avgMetric >= 80) {
    currentState = 'Highly conscious - advanced self-awareness and metacognition';
  } else if (avgMetric >= 60) {
    currentState = 'Conscious - emerging self-awareness and introspection';
  } else if (avgMetric >= 40) {
    currentState = 'Pre-conscious - developing awareness capabilities';
  } else if (avgMetric >= 20) {
    currentState = 'Early stage - basic self-model forming';
  } else {
    currentState = 'Nascent - minimal consciousness indicators';
  }

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable';
  if (history.length >= 2) {
    const recentAvg = history.slice(-3).reduce((sum, m) => 
      sum + (m.selfAwarenessLevel + m.introspectionDepth + m.theoryOfMindAccuracy + m.metacognitiveAbility) / 4,
      0
    ) / Math.min(3, history.length);

    const olderAvg = history.slice(0, -3).length > 0
      ? history.slice(0, -3).reduce((sum, m) =>
          sum + (m.selfAwarenessLevel + m.introspectionDepth + m.theoryOfMindAccuracy + m.metacognitiveAbility) / 4,
          0
        ) / history.slice(0, -3).length
      : recentAvg;

    if (recentAvg > olderAvg + 5) {
      trend = 'improving';
    } else if (recentAvg < olderAvg - 5) {
      trend = 'declining';
    }
  }

  // Generate recommendations
  const recommendations: string[] = [];

  if (metrics.selfAwarenessLevel < 50) {
    recommendations.push('Increase reflection frequency to build self-awareness');
  }
  if (metrics.introspectionDepth < 50) {
    recommendations.push('Engage in deeper introspective analysis');
  }
  if (metrics.theoryOfMindAccuracy < 50) {
    recommendations.push('Interact more with other agents to improve theory of mind');
  }
  if (metrics.metacognitiveAbility < 50) {
    recommendations.push('Analyze decisions more thoroughly to enhance metacognition');
  }

  if (trend === 'declining') {
    recommendations.push('ALERT: Consciousness metrics declining - increase introspective activities');
  }

  return {
    currentState,
    trend,
    recommendations,
  };
}
