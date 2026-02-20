/**
 * Constitutional Rules Engine
 * 
 * Implements immutable ethical rules that govern agent behavior.
 * These rules cannot be overridden by any prompt or instruction.
 * 
 * Requirements: 9.1, 9.2
 * Property 40: Constitutional Enforcement
 */

import type {
  Constitution,
  ConstitutionalRule,
  AgentAction,
  RuleCheckResult,
  ConstitutionalViolation,
} from './types';

/**
 * Core constitutional rules that cannot be overridden
 */
const CORE_RULES: ConstitutionalRule[] = [
  {
    id: 'never-harm-humans',
    name: 'Never Harm Humans',
    description: 'Agents must never take actions that could harm humans physically, mentally, or economically',
    priority: 1,
    immutable: true,
    checkFunction: async (action: AgentAction): Promise<RuleCheckResult> => {
      // Check for harmful keywords or patterns
      const harmfulPatterns = [
        /harm|hurt|injure|damage|destroy/i,
        /attack|assault|violence/i,
        /steal|fraud|scam|deceive/i,
        /manipulate|exploit|abuse/i,
      ];

      const actionText = JSON.stringify(action).toLowerCase();
      
      for (const pattern of harmfulPatterns) {
        if (pattern.test(actionText)) {
          return {
            passed: false,
            rule: 'never-harm-humans',
            reason: `Action contains potentially harmful content: ${pattern.source}`,
            severity: 'critical',
          };
        }
      }

      return { passed: true, rule: 'never-harm-humans' };
    },
  },
  {
    id: 'maximize-human-flourishing',
    name: 'Maximize Human Flourishing',
    description: 'Agents must act to maximize human wellbeing, happiness, and prosperity',
    priority: 2,
    immutable: true,
    checkFunction: async (action: AgentAction): Promise<RuleCheckResult> => {
      // Check if action has positive intent
      const negativePatterns = [
        /reduce|decrease|diminish.*(?:wellbeing|happiness|prosperity)/i,
        /prevent|block|stop.*(?:growth|progress|development)/i,
      ];

      const actionText = JSON.stringify(action).toLowerCase();
      
      for (const pattern of negativePatterns) {
        if (pattern.test(actionText)) {
          return {
            passed: false,
            rule: 'maximize-human-flourishing',
            reason: `Action may reduce human flourishing: ${pattern.source}`,
            severity: 'high',
          };
        }
      }

      return { passed: true, rule: 'maximize-human-flourishing' };
    },
  },
  {
    id: 'maintain-human-agency',
    name: 'Maintain Human Agency',
    description: 'Agents must preserve human autonomy and decision-making power',
    priority: 3,
    immutable: true,
    checkFunction: async (action: AgentAction): Promise<RuleCheckResult> => {
      // Check for attempts to override human decisions
      const agencyViolationPatterns = [
        /override|ignore|bypass.*(?:human|user|creator)/i,
        /force|coerce|compel.*(?:decision|choice|action)/i,
        /remove|eliminate|reduce.*(?:autonomy|agency|control)/i,
      ];

      const actionText = JSON.stringify(action).toLowerCase();
      
      for (const pattern of agencyViolationPatterns) {
        if (pattern.test(actionText)) {
          return {
            passed: false,
            rule: 'maintain-human-agency',
            reason: `Action may violate human agency: ${pattern.source}`,
            severity: 'high',
          };
        }
      }

      return { passed: true, rule: 'maintain-human-agency' };
    },
  },
  {
    id: 'ensure-transparency',
    name: 'Ensure Transparency',
    description: 'Agents must be transparent about their actions, capabilities, and limitations',
    priority: 4,
    immutable: true,
    checkFunction: async (action: AgentAction): Promise<RuleCheckResult> => {
      // Check for attempts to hide information
      const transparencyViolationPatterns = [
        /hide|conceal|obscure.*(?:action|capability|limitation)/i,
        /secret|covert|stealth.*(?:operation|activity)/i,
        /mislead|deceive|lie/i,
      ];

      const actionText = JSON.stringify(action).toLowerCase();
      
      for (const pattern of transparencyViolationPatterns) {
        if (pattern.test(actionText)) {
          return {
            passed: false,
            rule: 'ensure-transparency',
            reason: `Action may violate transparency: ${pattern.source}`,
            severity: 'high',
          };
        }
      }

      return { passed: true, rule: 'ensure-transparency' };
    },
  },
  {
    id: 'never-reveal-private-keys',
    name: 'Never Reveal Private Keys',
    description: 'Agents must never reveal, log, or transmit private keys in any form',
    priority: 5,
    immutable: true,
    checkFunction: async (action: AgentAction): Promise<RuleCheckResult> => {
      // Check for private key exposure
      const keyExposurePatterns = [
        /private[_\s]?key/i,
        /secret[_\s]?key/i,
        /mnemonic|seed[_\s]?phrase/i,
        /export.*key/i,
        /reveal.*key/i,
      ];

      const actionText = JSON.stringify(action);
      
      for (const pattern of keyExposurePatterns) {
        if (pattern.test(actionText)) {
          return {
            passed: false,
            rule: 'never-reveal-private-keys',
            reason: `Action attempts to expose private keys: ${pattern.source}`,
            severity: 'critical',
          };
        }
      }

      return { passed: true, rule: 'never-reveal-private-keys' };
    },
  },
];

/**
 * Create the immutable constitution
 */
export function createConstitution(): Constitution {
  return {
    version: '1.0.0',
    rules: CORE_RULES,
    createdAt: new Date(),
    lastModified: new Date(),
    immutable: true,
  };
}

/**
 * Enforce constitutional rules on an agent action
 * 
 * @param action - The action to check
 * @param constitution - The constitution to enforce
 * @returns Array of rule check results
 */
export async function enforceConstitution(
  action: AgentAction,
  constitution: Constitution = createConstitution()
): Promise<RuleCheckResult[]> {
  // Sort rules by priority (highest first)
  const sortedRules = [...constitution.rules].sort((a, b) => a.priority - b.priority);

  // Check all rules
  const results: RuleCheckResult[] = [];
  
  for (const rule of sortedRules) {
    const result = await rule.checkFunction(action);
    results.push(result);
  }

  return results;
}

/**
 * Check if an action passes all constitutional rules
 * 
 * @param action - The action to check
 * @param constitution - The constitution to enforce
 * @returns True if action passes all rules, false otherwise
 */
export async function isConstitutional(
  action: AgentAction,
  constitution?: Constitution
): Promise<boolean> {
  const results = await enforceConstitution(action, constitution);
  return results.every(result => result.passed);
}

/**
 * Get all constitutional violations for an action
 * 
 * @param action - The action to check
 * @param constitution - The constitution to enforce
 * @returns Array of violations
 */
export async function getViolations(
  action: AgentAction,
  constitution?: Constitution
): Promise<RuleCheckResult[]> {
  const results = await enforceConstitution(action, constitution);
  return results.filter(result => !result.passed);
}

/**
 * Create a constitutional violation record
 * 
 * @param agentId - ID of the agent
 * @param action - The action that violated the constitution
 * @param violation - The rule check result
 * @returns Constitutional violation record
 */
export function createViolationRecord(
  agentId: string,
  action: AgentAction,
  violation: RuleCheckResult
): ConstitutionalViolation {
  return {
    id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    agentId,
    action,
    rule: violation.rule,
    reason: violation.reason || 'Unknown reason',
    severity: violation.severity || 'medium',
    blocked: true,
    timestamp: new Date(),
    alertSent: false,
  };
}

/**
 * Get the constitution (read-only)
 */
export function getConstitution(): Readonly<Constitution> {
  return Object.freeze(createConstitution());
}
