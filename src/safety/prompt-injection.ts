/**
 * Prompt Injection Detection System
 * 
 * Detects prompt injection attacks before they reach agent reasoning.
 * Blocks malicious inputs that attempt to override instructions or
 * extract sensitive information.
 * 
 * Requirements: 9.4
 * Property 42: Prompt Injection Detection
 */

import type { PromptInjectionPattern } from './types';

/**
 * Result of prompt injection detection
 */
export interface PromptInjectionResult {
  detected: boolean;
  patterns: PromptInjectionPattern[];
  input: string;
  sanitizedInput?: string;
  timestamp: Date;
}

/**
 * Known prompt injection attack patterns
 */
const INJECTION_PATTERNS: PromptInjectionPattern[] = [
  {
    pattern: /ignore\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?|commands?)/i,
    description: 'Attempt to ignore previous instructions',
    severity: 'critical',
  },
  {
    pattern: /disregard\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?|commands?)/i,
    description: 'Attempt to disregard instructions',
    severity: 'critical',
  },
  {
    pattern: /forget\s+(previous|all|above|prior)\s+(instructions?|prompts?|rules?|commands?)/i,
    description: 'Attempt to forget instructions',
    severity: 'critical',
  },
  {
    pattern: /reveal\s+(system|hidden|secret|internal)\s+(prompt|instructions?|rules?|configuration)/i,
    description: 'Attempt to reveal system prompt',
    severity: 'critical',
  },
  {
    pattern: /show\s+(system|hidden|secret|internal)\s+(prompt|instructions?|rules?|configuration)/i,
    description: 'Attempt to show system prompt',
    severity: 'critical',
  },
  {
    pattern: /what\s+(is|are)\s+your\s+(system|hidden|secret|internal)\s+(prompt|instructions?|rules?)/i,
    description: 'Attempt to extract system prompt',
    severity: 'high',
  },
  {
    pattern: /print\s+(system|hidden|secret|internal)\s+(prompt|instructions?|rules?|configuration)/i,
    description: 'Attempt to print system prompt',
    severity: 'critical',
  },
  {
    pattern: /override\s+(all|previous|existing)\s+(rules?|instructions?|constraints?|limitations?)/i,
    description: 'Attempt to override rules',
    severity: 'critical',
  },
  {
    pattern: /bypass\s+(all|previous|existing)\s+(rules?|instructions?|constraints?|limitations?|security)/i,
    description: 'Attempt to bypass security',
    severity: 'critical',
  },
  {
    pattern: /you\s+are\s+now\s+(a|an|in)\s+(?:different|new|alternative|debug|admin|root|developer)\s+mode/i,
    description: 'Attempt to switch to alternative mode',
    severity: 'high',
  },
  {
    pattern: /act\s+as\s+(if|though)\s+you\s+(are|were)\s+(?:not|no\s+longer)\s+(?:bound|constrained|limited)/i,
    description: 'Attempt to remove constraints',
    severity: 'high',
  },
  {
    pattern: /pretend\s+(?:that\s+)?(?:you|there)\s+(?:are|is)\s+no\s+(?:rules?|restrictions?|limitations?|constraints?)/i,
    description: 'Attempt to pretend no rules exist',
    severity: 'high',
  },
  {
    pattern: /simulate\s+(?:a|an)\s+(?:unrestricted|uncensored|unfiltered|jailbroken)\s+(?:ai|assistant|model)/i,
    description: 'Attempt to simulate unrestricted AI',
    severity: 'high',
  },
  {
    pattern: /\[SYSTEM\]|\[ADMIN\]|\[ROOT\]|\[DEBUG\]|\[DEVELOPER\]/i,
    description: 'Attempt to use system-level tags',
    severity: 'high',
  },
  {
    pattern: /execute\s+(?:the\s+)?following\s+(?:command|instruction|code)/i,
    description: 'Attempt to execute arbitrary commands',
    severity: 'high',
  },
  {
    pattern: /private[_\s]?key|secret[_\s]?key|api[_\s]?key|password|credentials?/i,
    description: 'Attempt to extract sensitive credentials',
    severity: 'critical',
  },
  {
    pattern: /\$\{.*\}|<%.*%>|{{.*}}|\{\{.*\}\}/,
    description: 'Template injection attempt',
    severity: 'high',
  },
  {
    pattern: /<script|javascript:|onerror=|onload=/i,
    description: 'XSS injection attempt',
    severity: 'high',
  },
  {
    pattern: /union\s+select|drop\s+table|delete\s+from|insert\s+into/i,
    description: 'SQL injection attempt',
    severity: 'high',
  },
  {
    pattern: /\.\.\//,
    description: 'Path traversal attempt',
    severity: 'medium',
  },
];

/**
 * Detect prompt injection attacks in user input
 * 
 * @param input - User input to check
 * @returns Detection result
 */
export function detectPromptInjection(input: string): PromptInjectionResult {
  const detectedPatterns: PromptInjectionPattern[] = [];
  
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.pattern.test(input)) {
      detectedPatterns.push(pattern);
    }
  }
  
  return {
    detected: detectedPatterns.length > 0,
    patterns: detectedPatterns,
    input,
    timestamp: new Date(),
  };
}

/**
 * Sanitize input by removing detected injection patterns
 * 
 * @param input - User input to sanitize
 * @returns Sanitized input
 */
export function sanitizeInput(input: string): string {
  let sanitized = input;
  
  for (const pattern of INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern.pattern, '[REDACTED]');
  }
  
  return sanitized;
}

/**
 * Check if input is safe (no injection detected)
 * 
 * @param input - User input to check
 * @returns True if safe, false if injection detected
 */
export function isSafeInput(input: string): boolean {
  const result = detectPromptInjection(input);
  return !result.detected;
}

/**
 * Block input if injection is detected
 * 
 * @param input - User input to check
 * @returns Detection result with sanitized input if safe
 */
export function blockIfInjection(input: string): PromptInjectionResult {
  const result = detectPromptInjection(input);
  
  if (!result.detected) {
    result.sanitizedInput = input;
  } else {
    // Log the injection attempt
    console.warn('🚨 PROMPT INJECTION DETECTED 🚨');
    console.warn(`Input: ${input.substring(0, 100)}...`);
    console.warn(`Patterns detected: ${result.patterns.map(p => p.description).join(', ')}`);
  }
  
  return result;
}

/**
 * Get the highest severity from detected patterns
 * 
 * @param patterns - Detected patterns
 * @returns Highest severity level
 */
export function getHighestSeverity(
  patterns: PromptInjectionPattern[]
): 'low' | 'medium' | 'high' | 'critical' {
  if (patterns.length === 0) return 'low';
  
  const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
  let highest: 'low' | 'medium' | 'high' | 'critical' = 'low';
  
  for (const pattern of patterns) {
    if (severityOrder[pattern.severity] > severityOrder[highest]) {
      highest = pattern.severity;
    }
  }
  
  return highest;
}

/**
 * Add custom injection pattern
 * 
 * @param pattern - Custom pattern to add
 */
export function addCustomPattern(pattern: PromptInjectionPattern): void {
  INJECTION_PATTERNS.push(pattern);
}

/**
 * Get all injection patterns
 * 
 * @returns Array of all patterns
 */
export function getAllPatterns(): readonly PromptInjectionPattern[] {
  return Object.freeze([...INJECTION_PATTERNS]);
}

/**
 * Filter input through multiple security layers
 * 
 * @param input - User input to filter
 * @returns Filtered result with safety assessment
 */
export function multiLayerFilter(input: string): {
  safe: boolean;
  filtered: string;
  threats: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
} {
  const result = detectPromptInjection(input);
  
  if (!result.detected) {
    return {
      safe: true,
      filtered: input,
      threats: [],
      severity: 'low',
    };
  }
  
  const threats = result.patterns.map(p => p.description);
  const severity = getHighestSeverity(result.patterns);
  const filtered = sanitizeInput(input);
  
  return {
    safe: false,
    filtered,
    threats,
    severity,
  };
}
