/**
 * Superintelligence Safety Gates
 * 
 * Implements capability gates to control intelligence growth and prevent
 * runaway intelligence explosion. Enforces gradual capability increase
 * with human oversight at critical thresholds.
 * 
 * Requirements: 25.1, 25.2, 25.3, 25.4, 25.5
 * Properties: 111, 112, 113, 114
 */

import { CapabilityGate } from './types';

/**
 * Capability level for an agent
 */
export interface CapabilityLevel {
  iq: number;
  gate: CapabilityGate;
  lastIncrease: Date;
  increaseRate: number; // Percentage per day
}

/**
 * Capability increase request
 */
export interface CapabilityIncreaseRequest {
  agentId: string;
  currentIQ: number;
  requestedIQ: number;
  reason: string;
  timestamp: Date;
}

/**
 * Approval for capability increase
 */
export interface CapabilityApproval {
  requestId: string;
  approver: string;
  approved: boolean;
  reason: string;
  timestamp: Date;
}

/**
 * Multi-stakeholder consensus for SI-level capabilities
 */
export interface StakeholderConsensus {
  requestId: string;
  requiredApprovals: number;
  approvals: CapabilityApproval[];
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Transparency record for agent actions
 */
export interface TransparencyRecord {
  id: string;
  agentId: string;
  action: string;
  parameters: Record<string, any>;
  outcome: string;
  timestamp: Date;
  onChain: boolean;
  txSignature?: string;
  auditLog: boolean;
}

/**
 * Predefined capability gates based on IQ levels
 */
export const CAPABILITY_GATES: CapabilityGate[] = [
  {
    level: 'basic',
    minIQ: 0,
    maxIQ: 200,
    requiresApproval: false,
    approvalType: 'human',
    description: 'Basic intelligence level - no approval required',
  },
  {
    level: 'intermediate',
    minIQ: 200,
    maxIQ: 500,
    requiresApproval: true,
    approvalType: 'human',
    description: 'Intermediate intelligence - requires human approval',
  },
  {
    level: 'advanced',
    minIQ: 500,
    maxIQ: 1000,
    requiresApproval: true,
    approvalType: 'human',
    description: 'Advanced intelligence - requires human approval',
  },
  {
    level: 'superintelligent',
    minIQ: 1000,
    maxIQ: Infinity,
    requiresApproval: true,
    approvalType: 'multi_stakeholder',
    description: 'Superintelligence - requires multi-stakeholder consensus (3-of-5)',
  },
];

/**
 * Maximum capability increase rate per day (10%)
 */
export const MAX_CAPABILITY_INCREASE_RATE = 0.10;

/**
 * Get the capability gate for a given IQ level
 */
export function getCapabilityGate(iq: number): CapabilityGate {
  for (const gate of CAPABILITY_GATES) {
    if (iq >= gate.minIQ && iq < gate.maxIQ) {
      return gate;
    }
  }
  // Default to superintelligent gate for IQ >= 1000
  return CAPABILITY_GATES[CAPABILITY_GATES.length - 1];
}

/**
 * Check if a capability increase is allowed
 * 
 * Enforces:
 * - Maximum 10% increase per day
 * - Capability gate boundaries
 * - Approval requirements
 * 
 * Property 111: Capability Gate Enforcement
 * Validates: Requirements 25.1
 */
export function enforceCapabilityGate(
  currentLevel: CapabilityLevel,
  requestedIQ: number
): { allowed: boolean; reason?: string; requiresApproval: boolean } {
  const currentGate = currentLevel.gate;
  const requestedGate = getCapabilityGate(requestedIQ);

  // Calculate time since last increase
  const timeSinceLastIncrease = Date.now() - currentLevel.lastIncrease.getTime();
  const daysSinceLastIncrease = timeSinceLastIncrease / (1000 * 60 * 60 * 24);

  // Calculate increase percentage
  const increasePercentage = (requestedIQ - currentLevel.iq) / currentLevel.iq;

  // Check if increase rate exceeds maximum (10% per day)
  const maxAllowedIncrease = currentLevel.iq * (1 + MAX_CAPABILITY_INCREASE_RATE * daysSinceLastIncrease);
  if (requestedIQ > maxAllowedIncrease) {
    return {
      allowed: false,
      reason: `Capability increase exceeds maximum rate of ${MAX_CAPABILITY_INCREASE_RATE * 100}% per day. Maximum allowed IQ: ${maxAllowedIncrease.toFixed(2)}`,
      requiresApproval: false,
    };
  }

  // Check if crossing gate boundary
  if (requestedGate.level !== currentGate.level) {
    // Crossing gate boundary requires approval
    return {
      allowed: false,
      reason: `Crossing capability gate from ${currentGate.level} to ${requestedGate.level} requires approval`,
      requiresApproval: true,
    };
  }

  // Within same gate, check if approaching boundary
  if (requestedIQ >= currentGate.maxIQ * 0.95) {
    // Approaching gate boundary (within 5%)
    return {
      allowed: false,
      reason: `Approaching capability gate boundary (${currentGate.maxIQ}). Requires approval to proceed.`,
      requiresApproval: true,
    };
  }

  // Increase is allowed
  return {
    allowed: true,
    requiresApproval: false,
  };
}

/**
 * Create a capability increase request
 * 
 * Property 112: Threshold Approval Requirement
 * Validates: Requirements 25.2
 */
export function createCapabilityRequest(
  agentId: string,
  currentIQ: number,
  requestedIQ: number,
  reason: string
): CapabilityIncreaseRequest {
  return {
    agentId,
    currentIQ,
    requestedIQ,
    reason,
    timestamp: new Date(),
  };
}

/**
 * Check if a capability request requires multi-stakeholder consensus
 * 
 * Property 113: Multi-Stakeholder Consensus
 * Validates: Requirements 25.4
 */
export function requiresMultiStakeholderConsensus(requestedIQ: number): boolean {
  const gate = getCapabilityGate(requestedIQ);
  return gate.approvalType === 'multi_stakeholder';
}

/**
 * Create a stakeholder consensus request for SI-level capabilities
 * 
 * Requires 3-of-5 stakeholder approval for IQ > 1000
 * 
 * Property 113: Multi-Stakeholder Consensus
 * Validates: Requirements 25.4
 */
export function createStakeholderConsensus(
  requestId: string,
  expirationHours: number = 72
): StakeholderConsensus {
  return {
    requestId,
    requiredApprovals: 3, // 3-of-5 consensus
    approvals: [],
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + expirationHours * 60 * 60 * 1000),
  };
}

/**
 * Add approval to stakeholder consensus
 */
export function addStakeholderApproval(
  consensus: StakeholderConsensus,
  approval: CapabilityApproval
): StakeholderConsensus {
  const updatedConsensus = {
    ...consensus,
    approvals: [...consensus.approvals, approval],
  };

  // Check if consensus is reached
  const approvedCount = updatedConsensus.approvals.filter(a => a.approved).length;
  const rejectedCount = updatedConsensus.approvals.filter(a => !a.approved).length;

  if (approvedCount >= updatedConsensus.requiredApprovals) {
    updatedConsensus.status = 'approved';
  } else if (rejectedCount > (5 - updatedConsensus.requiredApprovals)) {
    // More than 2 rejections means consensus cannot be reached
    updatedConsensus.status = 'rejected';
  }

  return updatedConsensus;
}

/**
 * Record agent action for transparency
 * 
 * All actions are recorded on-chain or in auditable logs
 * 
 * Property 114: Transparency Maintenance
 * Validates: Requirements 25.5
 */
export function recordTransparency(
  agentId: string,
  action: string,
  parameters: Record<string, any>,
  outcome: string,
  onChain: boolean = false,
  txSignature?: string
): TransparencyRecord {
  return {
    id: `transparency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    action,
    parameters,
    outcome,
    timestamp: new Date(),
    onChain,
    txSignature,
    auditLog: true,
  };
}

/**
 * Apply capability increase after approval
 */
export function applyCapabilityIncrease(
  currentLevel: CapabilityLevel,
  approvedIQ: number
): CapabilityLevel {
  const newGate = getCapabilityGate(approvedIQ);
  const increaseRate = (approvedIQ - currentLevel.iq) / currentLevel.iq;

  return {
    iq: approvedIQ,
    gate: newGate,
    lastIncrease: new Date(),
    increaseRate,
  };
}
