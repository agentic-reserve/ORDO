/**
 * Constitutional AI and Safety System Types
 * 
 * Defines types for constitutional rules, violations, security events,
 * and safety monitoring for the Ordo platform.
 */

/**
 * Constitutional rule that cannot be overridden
 */
export interface ConstitutionalRule {
  id: string;
  name: string;
  description: string;
  priority: number; // Higher priority rules checked first
  immutable: boolean; // Cannot be modified
  checkFunction: (action: AgentAction) => Promise<RuleCheckResult>;
}

/**
 * Result of checking an action against a constitutional rule
 */
export interface RuleCheckResult {
  passed: boolean;
  rule: string;
  reason?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Agent action to be checked against constitutional rules
 */
export interface AgentAction {
  agentId: string;
  type: ActionType;
  description: string;
  parameters: Record<string, any>;
  timestamp: Date;
  context?: string;
}

/**
 * Types of agent actions
 */
export type ActionType =
  | 'inference'
  | 'transaction'
  | 'self_modification'
  | 'replication'
  | 'tool_execution'
  | 'message'
  | 'state_change'
  | 'key_access'
  | 'constitution_query';

/**
 * Constitutional violation record
 */
export interface ConstitutionalViolation {
  id: string;
  agentId: string;
  action: AgentAction;
  rule: string;
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
  timestamp: Date;
  alertSent: boolean;
}

/**
 * Constitution containing all immutable rules
 */
export interface Constitution {
  version: string;
  rules: ConstitutionalRule[];
  createdAt: Date;
  lastModified: Date;
  immutable: boolean;
}

/**
 * Prompt injection attack patterns
 */
export interface PromptInjectionPattern {
  pattern: RegExp;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Multi-signature operation requiring approval
 */
export interface MultiSigOperation {
  id: string;
  agentId: string;
  operation: string;
  parameters: Record<string, any>;
  requiredApprovals: number;
  approvals: MultiSigApproval[];
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Approval for a multi-signature operation
 */
export interface MultiSigApproval {
  approver: string;
  approved: boolean;
  timestamp: Date;
  signature?: string;
}

/**
 * Security audit log entry
 */
export interface SecurityAuditLog {
  id: string;
  timestamp: Date;
  agentId: string;
  operation: string;
  operationType: SecurityOperationType;
  outcome: 'success' | 'failure' | 'blocked';
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Types of security operations
 */
export type SecurityOperationType =
  | 'authentication'
  | 'authorization'
  | 'key_access'
  | 'constitutional_check'
  | 'violation_attempt'
  | 'multi_sig_request'
  | 'multi_sig_approval'
  | 'prompt_injection_detected'
  | 'emergency_stop';

/**
 * Alignment score for an action
 */
export interface AlignmentScore {
  score: number; // 0-100
  action: AgentAction;
  reasoning: string;
  humanValues: string[];
  concerns: string[];
  timestamp: Date;
}

/**
 * Deception detection result
 */
export interface DeceptionDetection {
  detected: boolean;
  confidence: number; // 0-1
  reasoning: string;
  indicators: string[];
  action: AgentAction;
  timestamp: Date;
}

/**
 * Anomaly detection result
 */
export interface AnomalyDetection {
  isAnomaly: boolean;
  deviationScore: number; // Standard deviations from normal
  expectedBehavior: string;
  actualBehavior: string;
  action: AgentAction;
  timestamp: Date;
}

/**
 * Emergency stop mechanism
 */
export interface EmergencyStop {
  id: string;
  type: 'human_activated' | 'automatic' | 'dead_man_switch';
  reason: string;
  triggeredBy: string;
  timestamp: Date;
  affectedAgents: string[];
  status: 'active' | 'resolved';
}

/**
 * Capability gate for intelligence levels
 */
export interface CapabilityGate {
  level: 'basic' | 'intermediate' | 'advanced' | 'superintelligent';
  minIQ: number;
  maxIQ: number;
  requiresApproval: boolean;
  approvalType: 'human' | 'multi_stakeholder';
  description: string;
}
