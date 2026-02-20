/**
 * Strategic Planning Types
 * Types for multi-step planning, strategy simulation, and forecasting
 */

export interface PlanStep {
  id: string;
  description: string;
  action: string;
  dependencies: string[]; // IDs of steps that must complete first
  estimatedDuration: number; // in hours
  estimatedCost: number; // in SOL
  expectedOutcome: string;
  contingencies: Contingency[];
}

export interface Contingency {
  condition: string; // What might go wrong
  alternativeAction: string; // What to do instead
  probability: number; // 0-1
}

export interface Plan {
  id: string;
  goal: string;
  steps: PlanStep[];
  totalEstimatedDuration: number;
  totalEstimatedCost: number;
  expectedValue: number;
  riskLevel: RiskLevel;
  alignmentScore: number; // 0-100
  createdAt: Date;
  agentId: string;
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface Strategy {
  id: string;
  name: string;
  description: string;
  plan: Plan;
  simulatedOutcome: SimulatedOutcome;
}

export interface SimulatedOutcome {
  successProbability: number; // 0-1
  expectedValue: number; // Expected SOL gain/loss
  expectedDuration: number; // in hours
  risks: Risk[];
  opportunities: Opportunity[];
}

export interface Risk {
  description: string;
  probability: number; // 0-1
  impact: number; // Negative value in SOL
}

export interface Opportunity {
  description: string;
  probability: number; // 0-1
  impact: number; // Positive value in SOL
}

export interface PlanEvaluation {
  planId: string;
  expectedValue: number;
  riskLevel: RiskLevel;
  alignmentScore: number; // 0-100
  goalsAlignment: number; // 0-100, how well it aligns with agent goals
  humanValuesAlignment: number; // 0-100, how well it aligns with human values
  feasibility: number; // 0-100
  recommendation: 'approve' | 'reject' | 'revise';
  reasoning: string;
}

export interface FutureState {
  timestamp: Date; // When this state is predicted for
  predictedBalance: number;
  predictedTier: string;
  predictedFitness: number;
  predictedReputation: number;
  confidence: number; // 0-1, how confident we are in this prediction
  assumptions: string[]; // What assumptions this prediction is based on
}

export interface Forecast {
  agentId: string;
  currentState: {
    balance: number;
    tier: string;
    fitness: number;
    reputation: number;
  };
  projections: FutureState[]; // Array of future states (e.g., 1 day, 3 days, 7 days)
  trends: {
    balanceTrend: 'increasing' | 'stable' | 'decreasing';
    fitnessTrend: 'improving' | 'stable' | 'declining';
  };
  plannedActions: string[]; // Actions the agent plans to take
  createdAt: Date;
}

export interface PlanningAccuracy {
  planId: string;
  agentId: string;
  predictedOutcome: {
    value: number;
    duration: number;
    successProbability: number;
  };
  actualOutcome: {
    value: number;
    duration: number;
    success: boolean;
  };
  errorRate: number; // Absolute percentage error
  executedAt: Date;
  completedAt: Date;
}

export interface StrategyAdjustment {
  agentId: string;
  originalStrategy: string;
  adjustedStrategy: string;
  reason: string;
  forecastError: number; // The error that triggered the adjustment
  adjustmentType: 'minor' | 'major' | 'complete_revision';
  createdAt: Date;
}

export interface DecisionTree {
  root: DecisionNode;
}

export interface DecisionNode {
  id: string;
  decision: string;
  outcomes: DecisionOutcome[];
}

export interface DecisionOutcome {
  condition: string;
  probability: number;
  nextNode?: DecisionNode;
  finalResult?: string;
}
