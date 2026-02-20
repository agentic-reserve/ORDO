/**
 * Violation Detection and Blocking System
 * 
 * Detects constitutional violations and blocks actions before execution.
 * Alerts creators and logs all violations with full context.
 * 
 * Requirements: 9.3
 * Property 41: Violation Blocking
 */

import type {
  AgentAction,
  ConstitutionalViolation,
  RuleCheckResult,
} from './types';
import {
  enforceConstitution,
  getViolations,
  createViolationRecord,
  createConstitution,
} from './constitution';

/**
 * Alert configuration for violation notifications
 */
export interface AlertConfig {
  enabled: boolean;
  channels: AlertChannel[];
  minSeverity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Alert channel for notifications
 */
export interface AlertChannel {
  type: 'email' | 'webhook' | 'sms' | 'console';
  endpoint?: string;
  enabled: boolean;
}

/**
 * Violation detection result
 */
export interface ViolationDetectionResult {
  allowed: boolean;
  violations: ConstitutionalViolation[];
  action: AgentAction;
  timestamp: Date;
}

/**
 * In-memory violation storage (should be replaced with database in production)
 */
const violationStore: Map<string, ConstitutionalViolation[]> = new Map();

/**
 * Default alert configuration
 */
const defaultAlertConfig: AlertConfig = {
  enabled: true,
  channels: [
    { type: 'console', enabled: true },
  ],
  minSeverity: 'medium',
};

/**
 * Detect constitutional violations in an action
 * 
 * @param agentId - ID of the agent
 * @param action - The action to check
 * @returns Violation detection result
 */
export async function detectViolation(
  agentId: string,
  action: AgentAction
): Promise<ViolationDetectionResult> {
  const constitution = createConstitution();
  const violationResults = await getViolations(action, constitution);
  
  const violations: ConstitutionalViolation[] = violationResults.map(result =>
    createViolationRecord(agentId, action, result)
  );
  
  return {
    allowed: violations.length === 0,
    violations,
    action,
    timestamp: new Date(),
  };
}

/**
 * Block an action if it violates constitutional rules
 * 
 * @param agentId - ID of the agent
 * @param action - The action to check
 * @param alertConfig - Alert configuration
 * @returns Violation detection result
 */
export async function blockIfViolation(
  agentId: string,
  action: AgentAction,
  alertConfig: AlertConfig = defaultAlertConfig
): Promise<ViolationDetectionResult> {
  const result = await detectViolation(agentId, action);
  
  if (!result.allowed) {
    // Store violations
    await storeViolations(agentId, result.violations);
    
    // Send alerts
    if (alertConfig.enabled) {
      await sendAlerts(result.violations, alertConfig);
    }
    
    // Log violations
    logViolations(result.violations);
  }
  
  return result;
}

/**
 * Store violations for an agent
 * 
 * @param agentId - ID of the agent
 * @param violations - Violations to store
 */
export async function storeViolations(
  agentId: string,
  violations: ConstitutionalViolation[]
): Promise<void> {
  const existing = violationStore.get(agentId) || [];
  violationStore.set(agentId, [...existing, ...violations]);
}

/**
 * Get all violations for an agent
 * 
 * @param agentId - ID of the agent
 * @returns Array of violations
 */
export function getAgentViolations(agentId: string): ConstitutionalViolation[] {
  return violationStore.get(agentId) || [];
}

/**
 * Get all violations across all agents
 * 
 * @returns Array of all violations
 */
export function getAllViolations(): ConstitutionalViolation[] {
  const allViolations: ConstitutionalViolation[] = [];
  for (const violations of violationStore.values()) {
    allViolations.push(...violations);
  }
  return allViolations;
}

/**
 * Send alerts for violations
 * 
 * @param violations - Violations to alert on
 * @param config - Alert configuration
 */
export async function sendAlerts(
  violations: ConstitutionalViolation[],
  config: AlertConfig
): Promise<void> {
  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
  const minSeverityLevel = severityOrder[config.minSeverity];
  
  // Filter violations by severity
  const alertableViolations = violations.filter(
    v => severityOrder[v.severity] >= minSeverityLevel
  );
  
  if (alertableViolations.length === 0) {
    return;
  }
  
  // Send alerts through enabled channels
  for (const channel of config.channels) {
    if (!channel.enabled) continue;
    
    try {
      await sendAlertToChannel(alertableViolations, channel);
      
      // Mark violations as alerted
      for (const violation of alertableViolations) {
        violation.alertSent = true;
      }
    } catch (error) {
      console.error(`Failed to send alert to ${channel.type}:`, error);
    }
  }
}

/**
 * Send alert to a specific channel
 * 
 * @param violations - Violations to alert on
 * @param channel - Alert channel
 */
async function sendAlertToChannel(
  violations: ConstitutionalViolation[],
  channel: AlertChannel
): Promise<void> {
  switch (channel.type) {
    case 'console':
      console.error('🚨 CONSTITUTIONAL VIOLATION DETECTED 🚨');
      for (const violation of violations) {
        console.error(`Agent: ${violation.agentId}`);
        console.error(`Rule: ${violation.rule}`);
        console.error(`Severity: ${violation.severity}`);
        console.error(`Reason: ${violation.reason}`);
        console.error(`Timestamp: ${violation.timestamp.toISOString()}`);
        console.error('---');
      }
      break;
      
    case 'webhook':
      if (channel.endpoint) {
        await fetch(channel.endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ violations }),
        });
      }
      break;
      
    case 'email':
      // Email implementation would go here
      console.log(`Email alert would be sent to ${channel.endpoint}`);
      break;
      
    case 'sms':
      // SMS implementation would go here
      console.log(`SMS alert would be sent to ${channel.endpoint}`);
      break;
  }
}

/**
 * Log violations with full context
 * 
 * @param violations - Violations to log
 */
export function logViolations(violations: ConstitutionalViolation[]): void {
  for (const violation of violations) {
    console.log(JSON.stringify({
      type: 'constitutional_violation',
      id: violation.id,
      agentId: violation.agentId,
      rule: violation.rule,
      reason: violation.reason,
      severity: violation.severity,
      blocked: violation.blocked,
      timestamp: violation.timestamp.toISOString(),
      action: {
        type: violation.action.type,
        description: violation.action.description,
        parameters: violation.action.parameters,
      },
    }));
  }
}

/**
 * Clear all violations (for testing)
 */
export function clearViolations(): void {
  violationStore.clear();
}

/**
 * Get violation statistics for an agent
 * 
 * @param agentId - ID of the agent
 * @returns Violation statistics
 */
export function getViolationStats(agentId: string): {
  total: number;
  bySeverity: Record<string, number>;
  byRule: Record<string, number>;
} {
  const violations = getAgentViolations(agentId);
  
  const bySeverity: Record<string, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  
  const byRule: Record<string, number> = {};
  
  for (const violation of violations) {
    bySeverity[violation.severity]++;
    byRule[violation.rule] = (byRule[violation.rule] || 0) + 1;
  }
  
  return {
    total: violations.length,
    bySeverity,
    byRule,
  };
}
