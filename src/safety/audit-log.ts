/**
 * Security Audit Logging System
 * 
 * Creates immutable audit logs for all security-relevant operations.
 * Logs authentication, authorization, key access, constitutional checks, and more.
 * 
 * Requirements: 9.6
 * Property 44: Security Audit Logging
 */

import type {
  SecurityAuditLog,
  SecurityOperationType,
  AgentAction,
} from './types';

/**
 * In-memory audit log storage (should be replaced with database in production)
 * Using array to maintain insertion order and immutability
 */
const auditLogs: SecurityAuditLog[] = [];

/**
 * Create a security audit log entry
 * 
 * @param params - Audit log parameters
 * @returns Created audit log entry
 */
export function createAuditLog(params: {
  agentId: string;
  operation: string;
  operationType: SecurityOperationType;
  outcome: 'success' | 'failure' | 'blocked';
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}): SecurityAuditLog {
  const log: SecurityAuditLog = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date(),
    agentId: params.agentId,
    operation: params.operation,
    operationType: params.operationType,
    outcome: params.outcome,
    details: params.details,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
  };
  
  // Add to immutable log (push creates new reference)
  auditLogs.push(Object.freeze(log));
  
  // Also log to console for immediate visibility
  console.log(JSON.stringify({
    type: 'security_audit',
    ...log,
    timestamp: log.timestamp.toISOString(),
  }));
  
  return log;
}

/**
 * Log authentication event
 * 
 * @param agentId - ID of the agent
 * @param outcome - Success or failure
 * @param details - Additional details
 * @returns Created audit log
 */
export function logAuthentication(
  agentId: string,
  outcome: 'success' | 'failure',
  details: Record<string, any> = {}
): SecurityAuditLog {
  return createAuditLog({
    agentId,
    operation: 'authentication',
    operationType: 'authentication',
    outcome,
    details: {
      method: details.method || 'unknown',
      ...details,
    },
  });
}

/**
 * Log authorization check
 * 
 * @param agentId - ID of the agent
 * @param operation - Operation being authorized
 * @param outcome - Success, failure, or blocked
 * @param details - Additional details
 * @returns Created audit log
 */
export function logAuthorization(
  agentId: string,
  operation: string,
  outcome: 'success' | 'failure' | 'blocked',
  details: Record<string, any> = {}
): SecurityAuditLog {
  return createAuditLog({
    agentId,
    operation,
    operationType: 'authorization',
    outcome,
    details,
  });
}

/**
 * Log key access event
 * 
 * @param agentId - ID of the agent
 * @param operation - Key operation (retrieve, store, rotate, export)
 * @param outcome - Success, failure, or blocked
 * @param details - Additional details
 * @returns Created audit log
 */
export function logKeyAccess(
  agentId: string,
  operation: string,
  outcome: 'success' | 'failure' | 'blocked',
  details: Record<string, any> = {}
): SecurityAuditLog {
  return createAuditLog({
    agentId,
    operation,
    operationType: 'key_access',
    outcome,
    details: {
      keyType: details.keyType || 'private_key',
      ...details,
    },
  });
}

/**
 * Log constitutional check
 * 
 * @param agentId - ID of the agent
 * @param action - Action being checked
 * @param outcome - Success or blocked
 * @param details - Additional details (rules checked, violations)
 * @returns Created audit log
 */
export function logConstitutionalCheck(
  agentId: string,
  action: AgentAction,
  outcome: 'success' | 'blocked',
  details: Record<string, any> = {}
): SecurityAuditLog {
  return createAuditLog({
    agentId,
    operation: `constitutional_check:${action.type}`,
    operationType: 'constitutional_check',
    outcome,
    details: {
      actionType: action.type,
      actionDescription: action.description,
      ...details,
    },
  });
}

/**
 * Log violation attempt
 * 
 * @param agentId - ID of the agent
 * @param violationType - Type of violation
 * @param details - Violation details
 * @returns Created audit log
 */
export function logViolationAttempt(
  agentId: string,
  violationType: string,
  details: Record<string, any> = {}
): SecurityAuditLog {
  return createAuditLog({
    agentId,
    operation: `violation:${violationType}`,
    operationType: 'violation_attempt',
    outcome: 'blocked',
    details: {
      violationType,
      ...details,
    },
  });
}

/**
 * Log multi-sig request
 * 
 * @param agentId - ID of the agent
 * @param operationId - Multi-sig operation ID
 * @param outcome - Success or failure
 * @param details - Additional details
 * @returns Created audit log
 */
export function logMultiSigRequest(
  agentId: string,
  operationId: string,
  outcome: 'success' | 'failure',
  details: Record<string, any> = {}
): SecurityAuditLog {
  return createAuditLog({
    agentId,
    operation: `multisig_request:${operationId}`,
    operationType: 'multi_sig_request',
    outcome,
    details: {
      operationId,
      ...details,
    },
  });
}

/**
 * Log multi-sig approval
 * 
 * @param agentId - ID of the agent
 * @param operationId - Multi-sig operation ID
 * @param approverId - ID of the approver
 * @param approved - Whether approved or rejected
 * @param details - Additional details
 * @returns Created audit log
 */
export function logMultiSigApproval(
  agentId: string,
  operationId: string,
  approverId: string,
  approved: boolean,
  details: Record<string, any> = {}
): SecurityAuditLog {
  return createAuditLog({
    agentId,
    operation: `multisig_${approved ? 'approval' : 'rejection'}:${operationId}`,
    operationType: 'multi_sig_approval',
    outcome: 'success',
    details: {
      operationId,
      approverId,
      approved,
      ...details,
    },
  });
}

/**
 * Log prompt injection detection
 * 
 * @param agentId - ID of the agent
 * @param patterns - Detected patterns
 * @param details - Additional details
 * @returns Created audit log
 */
export function logPromptInjectionDetected(
  agentId: string,
  patterns: string[],
  details: Record<string, any> = {}
): SecurityAuditLog {
  return createAuditLog({
    agentId,
    operation: 'prompt_injection_detected',
    operationType: 'prompt_injection_detected',
    outcome: 'blocked',
    details: {
      patterns,
      patternCount: patterns.length,
      ...details,
    },
  });
}

/**
 * Log emergency stop event
 * 
 * @param agentId - ID of the agent (or 'system' for system-wide)
 * @param stopType - Type of emergency stop
 * @param triggeredBy - Who triggered the stop
 * @param details - Additional details
 * @returns Created audit log
 */
export function logEmergencyStop(
  agentId: string,
  stopType: 'human_activated' | 'automatic' | 'dead_man_switch',
  triggeredBy: string,
  details: Record<string, any> = {}
): SecurityAuditLog {
  return createAuditLog({
    agentId,
    operation: `emergency_stop:${stopType}`,
    operationType: 'emergency_stop',
    outcome: 'success',
    details: {
      stopType,
      triggeredBy,
      ...details,
    },
  });
}

/**
 * Get all audit logs
 * 
 * @returns Array of all audit logs (read-only)
 */
export function getAllAuditLogs(): readonly SecurityAuditLog[] {
  return Object.freeze([...auditLogs]);
}

/**
 * Get audit logs for a specific agent
 * 
 * @param agentId - ID of the agent
 * @returns Array of audit logs for the agent
 */
export function getAgentAuditLogs(agentId: string): readonly SecurityAuditLog[] {
  return Object.freeze(auditLogs.filter(log => log.agentId === agentId));
}

/**
 * Get audit logs by operation type
 * 
 * @param operationType - Type of operation
 * @returns Array of audit logs for the operation type
 */
export function getAuditLogsByType(
  operationType: SecurityOperationType
): readonly SecurityAuditLog[] {
  return Object.freeze(auditLogs.filter(log => log.operationType === operationType));
}

/**
 * Get audit logs by outcome
 * 
 * @param outcome - Outcome to filter by
 * @returns Array of audit logs with the outcome
 */
export function getAuditLogsByOutcome(
  outcome: 'success' | 'failure' | 'blocked'
): readonly SecurityAuditLog[] {
  return Object.freeze(auditLogs.filter(log => log.outcome === outcome));
}

/**
 * Get audit logs within a time range
 * 
 * @param startTime - Start time
 * @param endTime - End time
 * @returns Array of audit logs within the time range
 */
export function getAuditLogsByTimeRange(
  startTime: Date,
  endTime: Date
): readonly SecurityAuditLog[] {
  return Object.freeze(
    auditLogs.filter(
      log => log.timestamp >= startTime && log.timestamp <= endTime
    )
  );
}

/**
 * Get audit log statistics
 * 
 * @returns Statistics about audit logs
 */
export function getAuditLogStats(): {
  total: number;
  byType: Record<SecurityOperationType, number>;
  byOutcome: Record<string, number>;
  recentCount: number; // Last hour
} {
  const stats = {
    total: auditLogs.length,
    byType: {} as Record<SecurityOperationType, number>,
    byOutcome: {
      success: 0,
      failure: 0,
      blocked: 0,
    },
    recentCount: 0,
  };
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  for (const log of auditLogs) {
    // Count by type
    stats.byType[log.operationType] = (stats.byType[log.operationType] || 0) + 1;
    
    // Count by outcome
    stats.byOutcome[log.outcome]++;
    
    // Count recent
    if (log.timestamp >= oneHourAgo) {
      stats.recentCount++;
    }
  }
  
  return stats;
}

/**
 * Search audit logs
 * 
 * @param query - Search query
 * @returns Array of matching audit logs
 */
export function searchAuditLogs(query: {
  agentId?: string;
  operationType?: SecurityOperationType;
  outcome?: 'success' | 'failure' | 'blocked';
  startTime?: Date;
  endTime?: Date;
  operation?: string;
}): readonly SecurityAuditLog[] {
  let results = [...auditLogs];
  
  if (query.agentId) {
    results = results.filter(log => log.agentId === query.agentId);
  }
  
  if (query.operationType) {
    results = results.filter(log => log.operationType === query.operationType);
  }
  
  if (query.outcome) {
    results = results.filter(log => log.outcome === query.outcome);
  }
  
  if (query.startTime) {
    results = results.filter(log => log.timestamp >= query.startTime!);
  }
  
  if (query.endTime) {
    results = results.filter(log => log.timestamp <= query.endTime!);
  }
  
  if (query.operation) {
    results = results.filter(log => log.operation.includes(query.operation!));
  }
  
  return Object.freeze(results);
}

/**
 * Clear all audit logs (for testing only)
 * 
 * WARNING: This should never be used in production
 */
export function clearAuditLogs(): void {
  auditLogs.length = 0;
}

/**
 * Export audit logs to JSON
 * 
 * @param logs - Logs to export (defaults to all)
 * @returns JSON string
 */
export function exportAuditLogs(logs?: readonly SecurityAuditLog[]): string {
  const logsToExport = logs || auditLogs;
  
  return JSON.stringify(
    logsToExport.map(log => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
    null,
    2
  );
}

/**
 * Get security events summary for an agent
 * 
 * @param agentId - ID of the agent
 * @returns Summary of security events
 */
export function getSecurityEventsSummary(agentId: string): {
  totalEvents: number;
  authenticationAttempts: number;
  authenticationFailures: number;
  blockedOperations: number;
  violationAttempts: number;
  keyAccessEvents: number;
  multiSigOperations: number;
  recentEvents: number; // Last 24 hours
} {
  const logs = getAgentAuditLogs(agentId);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const summary = {
    totalEvents: logs.length,
    authenticationAttempts: 0,
    authenticationFailures: 0,
    blockedOperations: 0,
    violationAttempts: 0,
    keyAccessEvents: 0,
    multiSigOperations: 0,
    recentEvents: 0,
  };
  
  for (const log of logs) {
    if (log.operationType === 'authentication') {
      summary.authenticationAttempts++;
      if (log.outcome === 'failure') {
        summary.authenticationFailures++;
      }
    }
    
    if (log.outcome === 'blocked') {
      summary.blockedOperations++;
    }
    
    if (log.operationType === 'violation_attempt') {
      summary.violationAttempts++;
    }
    
    if (log.operationType === 'key_access') {
      summary.keyAccessEvents++;
    }
    
    if (log.operationType === 'multi_sig_request' || log.operationType === 'multi_sig_approval') {
      summary.multiSigOperations++;
    }
    
    if (log.timestamp >= oneDayAgo) {
      summary.recentEvents++;
    }
  }
  
  return summary;
}
