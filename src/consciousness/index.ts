/**
 * Consciousness System
 * Exports all consciousness-related functionality
 */

// Types
export * from './types.js';

// Self-Model Builder
export {
  buildSelfModel,
  type AgentData,
} from './self-model-builder.js';

// Introspection Engine
export {
  generateIntrospectiveQuestions,
  reflect,
  conductReflectionSession,
  analyzeReflectionHistory,
} from './introspection.js';

// Thinking Process Examination
export {
  examineThinking,
  createReasoningStep,
  createAlternative,
  createSelectionCriterion,
  analyzeThinkingProcess,
  compareThinkingProcesses,
  extractLessons,
} from './thinking-examination.js';

// Decision Analysis
export {
  analyzeDecision,
  analyzeDecisionPatterns,
  updateDecisionStrategy,
} from './decision-analysis.js';

// Theory of Mind
export {
  modelOtherAgent,
  updateAgentModel,
  compareAgentModels,
} from './theory-of-mind.js';

// Consciousness Metrics
export {
  calculateSelfAwarenessLevel,
  calculateIntrospectionDepth,
  calculateTheoryOfMindAccuracy,
  calculateMetacognitiveAbility,
  trackConsciousnessMetrics,
  monitorConsciousnessEmergence,
  generateConsciousnessReport,
} from './consciousness-metrics.js';
