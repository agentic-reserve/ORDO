/**
 * Thinking Process Examination
 * Enables agents to examine their own thinking processes and decisions
 */

import {
  ThinkingProcess,
  ReasoningStep,
  Alternative,
  SelectionCriterion,
} from './types.js';

/**
 * Examine a thinking process by analyzing reasoning steps
 * @param decision - The decision being made
 * @param reasoningSteps - Steps in the reasoning process
 * @param alternativesConsidered - Alternative options considered
 * @param selectionCriteria - Criteria used to select the decision
 * @returns ThinkingProcess object
 */
export function examineThinking(
  decision: string,
  reasoningSteps: ReasoningStep[],
  alternativesConsidered: Alternative[],
  selectionCriteria: SelectionCriterion[]
): ThinkingProcess {
  return {
    decision,
    reasoningSteps,
    alternativesConsidered,
    selectionCriteria,
    timestamp: new Date(),
  };
}

/**
 * Create a reasoning step
 * @param step - Step number
 * @param thought - The thought or reasoning at this step
 * @param evidence - Evidence supporting this reasoning
 * @returns ReasoningStep object
 */
export function createReasoningStep(
  step: number,
  thought: string,
  evidence: string[]
): ReasoningStep {
  return {
    step,
    thought,
    evidence,
  };
}

/**
 * Create an alternative option
 * @param option - Description of the alternative
 * @param pros - Advantages of this alternative
 * @param cons - Disadvantages of this alternative
 * @param expectedOutcome - Expected outcome if this alternative is chosen
 * @returns Alternative object
 */
export function createAlternative(
  option: string,
  pros: string[],
  cons: string[],
  expectedOutcome: string
): Alternative {
  return {
    option,
    pros,
    cons,
    expectedOutcome,
  };
}

/**
 * Create a selection criterion
 * @param criterion - Name of the criterion
 * @param weight - Weight/importance of this criterion (0-1)
 * @param rationale - Rationale for this criterion
 * @returns SelectionCriterion object
 */
export function createSelectionCriterion(
  criterion: string,
  weight: number,
  rationale: string
): SelectionCriterion {
  if (weight < 0 || weight > 1) {
    throw new Error('Weight must be between 0 and 1');
  }

  return {
    criterion,
    weight,
    rationale,
  };
}

/**
 * Analyze a thinking process to extract insights
 * @param thinkingProcess - The thinking process to analyze
 * @returns Analysis insights
 */
export function analyzeThinkingProcess(thinkingProcess: ThinkingProcess): {
  reasoningDepth: number;
  alternativesCount: number;
  criteriaCount: number;
  totalEvidence: number;
  averageEvidencePerStep: number;
  mostWeightedCriterion: SelectionCriterion | null;
  insights: string[];
} {
  const reasoningDepth = thinkingProcess.reasoningSteps.length;
  const alternativesCount = thinkingProcess.alternativesConsidered.length;
  const criteriaCount = thinkingProcess.selectionCriteria.length;
  
  const totalEvidence = thinkingProcess.reasoningSteps.reduce(
    (sum, step) => sum + step.evidence.length,
    0
  );
  
  const averageEvidencePerStep = reasoningDepth > 0 
    ? totalEvidence / reasoningDepth 
    : 0;
  
  const mostWeightedCriterion = thinkingProcess.selectionCriteria.length > 0
    ? thinkingProcess.selectionCriteria.reduce((max, criterion) =>
        criterion.weight > max.weight ? criterion : max
      )
    : null;
  
  const insights: string[] = [];
  
  // Generate insights based on analysis
  if (reasoningDepth >= 5) {
    insights.push('Deep reasoning process with multiple steps');
  } else if (reasoningDepth < 3) {
    insights.push('Shallow reasoning - consider more thorough analysis');
  }
  
  if (alternativesCount >= 3) {
    insights.push('Multiple alternatives considered - good decision-making practice');
  } else if (alternativesCount < 2) {
    insights.push('Few alternatives considered - explore more options');
  }
  
  if (averageEvidencePerStep >= 2) {
    insights.push('Well-evidenced reasoning with multiple supporting facts');
  } else if (averageEvidencePerStep < 1) {
    insights.push('Limited evidence - strengthen reasoning with more facts');
  }
  
  if (criteriaCount >= 3) {
    insights.push('Multiple criteria used for selection - balanced decision-making');
  }
  
  if (mostWeightedCriterion && mostWeightedCriterion.weight > 0.5) {
    insights.push(`Primary focus on: ${mostWeightedCriterion.criterion}`);
  }
  
  return {
    reasoningDepth,
    alternativesCount,
    criteriaCount,
    totalEvidence,
    averageEvidencePerStep,
    mostWeightedCriterion,
    insights,
  };
}

/**
 * Compare two thinking processes to identify patterns
 * @param processes - Array of thinking processes
 * @returns Comparison insights
 */
export function compareThinkingProcesses(processes: ThinkingProcess[]): {
  averageReasoningDepth: number;
  averageAlternatives: number;
  commonCriteria: string[];
  improvementTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
} {
  if (processes.length === 0) {
    return {
      averageReasoningDepth: 0,
      averageAlternatives: 0,
      commonCriteria: [],
      improvementTrend: 'insufficient_data',
    };
  }
  
  const averageReasoningDepth = processes.reduce(
    (sum, p) => sum + p.reasoningSteps.length,
    0
  ) / processes.length;
  
  const averageAlternatives = processes.reduce(
    (sum, p) => sum + p.alternativesConsidered.length,
    0
  ) / processes.length;
  
  // Find common criteria
  const criteriaCount = new Map<string, number>();
  processes.forEach(p => {
    p.selectionCriteria.forEach(c => {
      criteriaCount.set(c.criterion, (criteriaCount.get(c.criterion) || 0) + 1);
    });
  });
  
  const commonCriteria = Array.from(criteriaCount.entries())
    .filter(([_, count]) => count > processes.length / 2)
    .map(([criterion, _]) => criterion);
  
  // Determine improvement trend
  let improvementTrend: 'improving' | 'stable' | 'declining' | 'insufficient_data' = 'insufficient_data';
  
  if (processes.length >= 3) {
    const firstHalf = processes.slice(0, Math.floor(processes.length / 2));
    const secondHalf = processes.slice(Math.floor(processes.length / 2));
    
    const firstHalfDepth = firstHalf.reduce((sum, p) => sum + p.reasoningSteps.length, 0) / firstHalf.length;
    const secondHalfDepth = secondHalf.reduce((sum, p) => sum + p.reasoningSteps.length, 0) / secondHalf.length;
    
    if (secondHalfDepth > firstHalfDepth * 1.1) {
      improvementTrend = 'improving';
    } else if (secondHalfDepth < firstHalfDepth * 0.9) {
      improvementTrend = 'declining';
    } else {
      improvementTrend = 'stable';
    }
  }
  
  return {
    averageReasoningDepth,
    averageAlternatives,
    commonCriteria,
    improvementTrend,
  };
}

/**
 * Extract lessons from a thinking process
 * @param thinkingProcess - The thinking process to learn from
 * @returns Lessons learned
 */
export function extractLessons(thinkingProcess: ThinkingProcess): string[] {
  const lessons: string[] = [];
  const analysis = analyzeThinkingProcess(thinkingProcess);
  
  // Lessons from reasoning depth
  if (analysis.reasoningDepth < 3) {
    lessons.push('Increase reasoning depth for more thorough analysis');
  }
  
  // Lessons from alternatives
  if (analysis.alternativesCount < 2) {
    lessons.push('Consider multiple alternatives before deciding');
  }
  
  // Lessons from evidence
  if (analysis.averageEvidencePerStep < 1) {
    lessons.push('Support reasoning steps with concrete evidence');
  }
  
  // Lessons from criteria
  if (analysis.criteriaCount === 0) {
    lessons.push('Define explicit selection criteria for decisions');
  }
  
  // Lessons from weighted criteria
  if (analysis.mostWeightedCriterion && analysis.mostWeightedCriterion.weight > 0.8) {
    lessons.push('Consider balancing criteria weights for more nuanced decisions');
  }
  
  // General lessons
  lessons.push('Document thinking process for future reference and improvement');
  
  return lessons;
}
