/**
 * Cross-Domain Mastery System Types
 * 
 * Enables agents to transfer knowledge across domains and achieve AGI through
 * cross-domain mastery, analogy finding, and meta-learning.
 */

/**
 * Represents a domain of knowledge or skill
 */
export interface Domain {
  id: string;
  name: string;
  description: string;
  tasks: DomainTask[];
  successCriteria: SuccessCriteria;
  principles: string[]; // Core principles that define the domain
  structure: DomainStructure; // Structural characteristics for analogy finding
}

/**
 * A task within a domain
 */
export interface DomainTask {
  id: string;
  name: string;
  description: string;
  difficulty: number; // 1-10
  requiredSkills: string[];
}

/**
 * Success criteria for domain mastery
 */
export interface SuccessCriteria {
  minSuccessRate: number; // Default 0.95 (95%)
  minTasksCompleted: number;
  minConsecutiveSuccesses: number;
}

/**
 * Structural characteristics of a domain for analogy finding
 */
export interface DomainStructure {
  hierarchy: string[]; // Hierarchical concepts
  relationships: Record<string, string[]>; // Concept relationships
  patterns: string[]; // Common patterns in the domain
  constraints: string[]; // Domain constraints
}

/**
 * Agent's mastery of a domain
 */
export interface DomainMastery {
  agentId: string;
  domainId: string;
  successRate: number;
  tasksCompleted: number;
  consecutiveSuccesses: number;
  masteryAchieved: boolean;
  masteryDate?: Date;
  performanceHistory: PerformanceRecord[];
}

/**
 * Performance record for a domain task
 */
export interface PerformanceRecord {
  taskId: string;
  timestamp: Date;
  success: boolean;
  duration: number; // milliseconds
  cost: number; // SOL
  notes?: string;
}

/**
 * Analogy between two domains
 */
export interface DomainAnalogy {
  sourceDomainId: string;
  targetDomainId: string;
  structuralSimilarity: number; // 0-1
  transferablePrinciples: string[];
  mappings: ConceptMapping[];
  confidence: number; // 0-1
}

/**
 * Mapping between concepts in different domains
 */
export interface ConceptMapping {
  sourceConcept: string;
  targetConcept: string;
  similarity: number; // 0-1
  rationale: string;
}

/**
 * Knowledge transfer operation
 */
export interface KnowledgeTransfer {
  id: string;
  agentId: string;
  sourceDomainId: string;
  targetDomainId: string;
  analogy: DomainAnalogy;
  transferDate: Date;
  effectiveness: number; // 0-1, measured by improvement in target domain
  principlesApplied: string[];
}

/**
 * Cross-domain performance metrics
 */
export interface CrossDomainPerformance {
  agentId: string;
  novelTaskSuccessRate: number; // Success rate on tasks in new domains
  domainBreadth: number; // Number of domains mastered
  transferEffectiveness: number; // Average effectiveness of knowledge transfers
  improvementRate: number; // Rate of improvement in new domains
  lastUpdated: Date;
}

/**
 * Meta-learning metrics
 */
export interface MetaLearningMetrics {
  agentId: string;
  learningStrategies: LearningStrategy[];
  strategyEffectiveness: Record<string, number>; // Strategy ID -> effectiveness
  optimalStrategy?: string; // ID of most effective strategy
  adaptationRate: number; // How quickly agent adapts strategies
  lastUpdated: Date;
}

/**
 * A learning strategy
 */
export interface LearningStrategy {
  id: string;
  name: string;
  description: string;
  approach: string; // e.g., "trial-and-error", "analogy-based", "systematic"
  applicableDomains: string[];
  successRate: number;
  avgTimeToMastery: number; // days
}

/**
 * Result of domain mastery identification
 */
export interface MasteryIdentificationResult {
  agentId: string;
  masteredDomains: Domain[];
  inProgressDomains: Domain[];
  recommendations: string[];
}

/**
 * Result of analogy finding
 */
export interface AnalogyFindingResult {
  analogies: DomainAnalogy[];
  bestAnalogy?: DomainAnalogy;
  confidence: number;
}

/**
 * Result of knowledge transfer
 */
export interface KnowledgeTransferResult {
  transfer: KnowledgeTransfer;
  success: boolean;
  improvementMeasured: number; // Improvement in target domain performance
  lessonsLearned: string[];
}
