/**
 * Multi-Signature System
 * 
 * Implements multi-signature approval for sensitive operations.
 * Requires n-of-m approval for large transfers, key exports, and constitution changes.
 * 
 * Requirements: 9.5
 * Property 43: Multi-Signature Requirement
 */

import type {
  MultiSigOperation,
  MultiSigApproval,
  AgentAction,
} from './types';

/**
 * Multi-signature configuration
 */
export interface MultiSigConfig {
  requiredApprovals: number; // n in n-of-m
  totalApprovers: number; // m in n-of-m
  approvers: string[]; // List of approver IDs
  expirationMinutes: number; // How long operations are valid
}

/**
 * Sensitive operation types requiring multi-sig
 */
export type SensitiveOperationType =
  | 'large_transfer' // Transfers > threshold
  | 'key_export' // Private key export
  | 'constitution_change' // Modify constitutional rules
  | 'capability_gate_override' // Override capability gates
  | 'emergency_stop_disable'; // Disable emergency stop

/**
 * Thresholds for sensitive operations
 */
export const SENSITIVE_OPERATION_THRESHOLDS = {
  large_transfer: 1.0, // SOL
  key_export: 0, // Always requires approval
  constitution_change: 0, // Always requires approval
  capability_gate_override: 0, // Always requires approval
  emergency_stop_disable: 0, // Always requires approval
};

/**
 * In-memory operation storage (should be replaced with database in production)
 */
const operationStore: Map<string, MultiSigOperation> = new Map();

/**
 * Default multi-sig configuration (3-of-5)
 */
const defaultConfig: MultiSigConfig = {
  requiredApprovals: 3,
  totalApprovers: 5,
  approvers: [], // Should be configured per deployment
  expirationMinutes: 60, // 1 hour
};

/**
 * Check if an action requires multi-signature approval
 * 
 * @param action - The action to check
 * @returns True if multi-sig required, false otherwise
 */
export function requiresMultiSig(action: AgentAction): boolean {
  // Check for large transfers
  if (action.type === 'transaction' && action.parameters.amount) {
    const amount = Number(action.parameters.amount);
    // Handle NaN and invalid amounts
    if (!isNaN(amount) && isFinite(amount) && amount > SENSITIVE_OPERATION_THRESHOLDS.large_transfer) {
      return true;
    }
  }
  
  // Check for key access operations
  if (action.type === 'key_access') {
    return true;
  }
  
  // Check for constitution queries (modifications)
  if (action.type === 'constitution_query' && action.parameters.modify) {
    return true;
  }
  
  // Check for self-modification that affects safety
  if (action.type === 'self_modification') {
    const modType = action.parameters.modificationType;
    if (modType === 'capability_gate' || modType === 'emergency_stop') {
      return true;
    }
  }
  
  return false;
}

/**
 * Create a multi-signature operation
 * 
 * @param agentId - ID of the agent
 * @param action - The action requiring approval
 * @param config - Multi-sig configuration
 * @returns Created operation
 */
export function createMultiSigOperation(
  agentId: string,
  action: AgentAction,
  config: MultiSigConfig = defaultConfig
): MultiSigOperation {
  const operationId = `multisig-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const operation: MultiSigOperation = {
    id: operationId,
    agentId,
    operation: action.type,
    parameters: action.parameters,
    requiredApprovals: config.requiredApprovals,
    approvals: [],
    status: 'pending',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + config.expirationMinutes * 60 * 1000),
  };
  
  operationStore.set(operationId, operation);
  
  return operation;
}

/**
 * Approve a multi-signature operation
 * 
 * @param operationId - ID of the operation
 * @param approverId - ID of the approver
 * @param signature - Optional cryptographic signature
 * @returns Updated operation
 */
export function approveOperation(
  operationId: string,
  approverId: string,
  signature?: string
): MultiSigOperation {
  const operation = operationStore.get(operationId);
  
  if (!operation) {
    throw new Error(`Operation ${operationId} not found`);
  }
  
  if (operation.status !== 'pending') {
    throw new Error(`Operation ${operationId} is not pending (status: ${operation.status})`);
  }
  
  if (new Date() > operation.expiresAt) {
    operation.status = 'rejected';
    throw new Error(`Operation ${operationId} has expired`);
  }
  
  // Check if approver already approved
  const existingApproval = operation.approvals.find(a => a.approver === approverId);
  if (existingApproval) {
    throw new Error(`Approver ${approverId} has already approved this operation`);
  }
  
  // Add approval
  const approval: MultiSigApproval = {
    approver: approverId,
    approved: true,
    timestamp: new Date(),
    signature,
  };
  
  operation.approvals.push(approval);
  
  // Check if we have enough approvals
  const approvedCount = operation.approvals.filter(a => a.approved).length;
  if (approvedCount >= operation.requiredApprovals) {
    operation.status = 'approved';
  }
  
  operationStore.set(operationId, operation);
  
  return operation;
}

/**
 * Reject a multi-signature operation
 * 
 * @param operationId - ID of the operation
 * @param approverId - ID of the approver
 * @returns Updated operation
 */
export function rejectOperation(
  operationId: string,
  approverId: string
): MultiSigOperation {
  const operation = operationStore.get(operationId);
  
  if (!operation) {
    throw new Error(`Operation ${operationId} not found`);
  }
  
  if (operation.status !== 'pending') {
    throw new Error(`Operation ${operationId} is not pending (status: ${operation.status})`);
  }
  
  // Add rejection
  const rejection: MultiSigApproval = {
    approver: approverId,
    approved: false,
    timestamp: new Date(),
  };
  
  operation.approvals.push(rejection);
  operation.status = 'rejected';
  
  operationStore.set(operationId, operation);
  
  return operation;
}

/**
 * Execute an approved multi-signature operation
 * 
 * @param operationId - ID of the operation
 * @returns Execution result
 */
export async function executeOperation(
  operationId: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const operation = operationStore.get(operationId);
  
  if (!operation) {
    throw new Error(`Operation ${operationId} not found`);
  }
  
  if (operation.status !== 'approved') {
    throw new Error(`Operation ${operationId} is not approved (status: ${operation.status})`);
  }
  
  if (new Date() > operation.expiresAt) {
    operation.status = 'rejected';
    throw new Error(`Operation ${operationId} has expired`);
  }
  
  try {
    // Mark as executed
    operation.status = 'executed';
    operationStore.set(operationId, operation);
    
    // In a real implementation, this would execute the actual operation
    // For now, we just return success
    return {
      success: true,
      result: {
        operationId,
        executedAt: new Date(),
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get operation status
 * 
 * @param operationId - ID of the operation
 * @returns Operation or undefined if not found
 */
export function getOperation(operationId: string): MultiSigOperation | undefined {
  return operationStore.get(operationId);
}

/**
 * Get all operations for an agent
 * 
 * @param agentId - ID of the agent
 * @returns Array of operations
 */
export function getAgentOperations(agentId: string): MultiSigOperation[] {
  const operations: MultiSigOperation[] = [];
  
  for (const operation of operationStore.values()) {
    if (operation.agentId === agentId) {
      operations.push(operation);
    }
  }
  
  return operations;
}

/**
 * Get pending operations requiring approval
 * 
 * @param approverId - ID of the approver
 * @returns Array of pending operations
 */
export function getPendingOperations(approverId?: string): MultiSigOperation[] {
  const operations: MultiSigOperation[] = [];
  
  for (const operation of operationStore.values()) {
    if (operation.status === 'pending' && new Date() <= operation.expiresAt) {
      // If approverId provided, check if they haven't approved yet
      if (approverId) {
        const hasApproved = operation.approvals.some(a => a.approver === approverId);
        if (!hasApproved) {
          operations.push(operation);
        }
      } else {
        operations.push(operation);
      }
    }
  }
  
  return operations;
}

/**
 * Clean up expired operations
 * 
 * @returns Number of operations cleaned up
 */
export function cleanupExpiredOperations(): number {
  let count = 0;
  const now = new Date();
  
  for (const [id, operation] of operationStore.entries()) {
    if (operation.status === 'pending' && now > operation.expiresAt) {
      operation.status = 'rejected';
      operationStore.set(id, operation);
      count++;
    }
  }
  
  return count;
}

/**
 * Clear all operations (for testing)
 */
export function clearOperations(): void {
  operationStore.clear();
}

/**
 * Get operation statistics
 * 
 * @returns Statistics about operations
 */
export function getOperationStats(): {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  executed: number;
} {
  const stats = {
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    executed: 0,
  };
  
  for (const operation of operationStore.values()) {
    stats.total++;
    
    switch (operation.status) {
      case 'pending':
        stats.pending++;
        break;
      case 'approved':
        stats.approved++;
        break;
      case 'rejected':
        stats.rejected++;
        break;
      case 'executed':
        stats.executed++;
        break;
    }
  }
  
  return stats;
}

/**
 * Check if action can proceed (either doesn't require multi-sig or is approved)
 * 
 * @param action - The action to check
 * @param operationId - Optional operation ID if multi-sig was created
 * @returns True if action can proceed, false otherwise
 */
export function canProceed(action: AgentAction, operationId?: string): boolean {
  // If doesn't require multi-sig, can proceed
  if (!requiresMultiSig(action)) {
    return true;
  }
  
  // If requires multi-sig, check if operation is approved
  if (operationId) {
    const operation = getOperation(operationId);
    return operation?.status === 'approved';
  }
  
  return false;
}
