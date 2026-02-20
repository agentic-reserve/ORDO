/**
 * Result synthesis system for multi-agent coordination
 * 
 * Combines outputs from multiple agents into coherent final results
 */

import type { SubTask, TaskResult } from "./coordination-types.js";

/**
 * Synthesis strategy
 */
export type SynthesisStrategy = "concatenate" | "merge" | "vote" | "weighted_average" | "custom";

/**
 * Synthesis options
 */
export interface SynthesisOptions {
  strategy: SynthesisStrategy;
  conflictResolution?: "first" | "last" | "majority" | "highest_quality";
  weights?: Map<string, number>;  // Agent ID to weight mapping
  customSynthesizer?: (results: Map<string, unknown>) => unknown;
}

/**
 * Conflict in results
 */
export interface ResultConflict {
  subtaskIds: string[];
  conflictingValues: unknown[];
  resolution: unknown;
  resolutionMethod: string;
}

/**
 * Synthesize results from multiple subtasks
 * 
 * @param subtasks - Array of completed subtasks
 * @param options - Synthesis options
 * @returns Synthesized result
 */
export function synthesizeResults(
  subtasks: SubTask[],
  options: SynthesisOptions = { strategy: "concatenate" }
): TaskResult {
  const completedSubtasks = subtasks.filter(st => st.status === "completed");
  const failedSubtasks = subtasks.filter(st => st.status === "failed");

  // Collect results from completed subtasks
  const subtaskResults = new Map<string, unknown>();
  for (const subtask of completedSubtasks) {
    if (subtask.result !== undefined) {
      subtaskResults.set(subtask.id, subtask.result);
    }
  }

  // Detect conflicts
  const conflicts = detectConflicts(completedSubtasks);

  // Resolve conflicts
  const resolvedResults = resolveConflicts(
    subtaskResults,
    conflicts,
    options.conflictResolution || "first"
  );

  // Synthesize final output
  let finalOutput: unknown;
  
  switch (options.strategy) {
    case "concatenate":
      finalOutput = concatenateResults(resolvedResults);
      break;
    case "merge":
      finalOutput = mergeResults(resolvedResults);
      break;
    case "vote":
      finalOutput = voteResults(resolvedResults);
      break;
    case "weighted_average":
      finalOutput = weightedAverageResults(resolvedResults, options.weights);
      break;
    case "custom":
      if (options.customSynthesizer) {
        finalOutput = options.customSynthesizer(resolvedResults);
      } else {
        finalOutput = concatenateResults(resolvedResults);
      }
      break;
    default:
      finalOutput = concatenateResults(resolvedResults);
  }

  // Collect errors from failed subtasks
  const errors: string[] = [];
  for (const subtask of failedSubtasks) {
    if (subtask.error) {
      errors.push(`Subtask ${subtask.id}: ${subtask.error}`);
    }
  }

  return {
    taskId: subtasks[0]?.id || "unknown",
    success: failedSubtasks.length === 0,
    output: finalOutput,
    subtaskResults: resolvedResults,
    errors,
    completedAt: new Date(),
  };
}

/**
 * Detect conflicts between subtask results
 * 
 * @param subtasks - Array of completed subtasks
 * @returns Array of detected conflicts
 */
function detectConflicts(subtasks: SubTask[]): ResultConflict[] {
  const conflicts: ResultConflict[] = [];
  
  // Group subtasks by similar descriptions (potential duplicates)
  const groups = new Map<string, SubTask[]>();
  
  for (const subtask of subtasks) {
    const key = normalizeDescription(subtask.description);
    const group = groups.get(key) || [];
    group.push(subtask);
    groups.set(key, group);
  }

  // Check for conflicts within groups
  for (const [key, group] of groups) {
    if (group.length > 1) {
      const results = group.map(st => st.result);
      const uniqueResults = new Set(results.map(r => JSON.stringify(r)));
      
      if (uniqueResults.size > 1) {
        conflicts.push({
          subtaskIds: group.map(st => st.id),
          conflictingValues: results,
          resolution: results[0],  // Default to first
          resolutionMethod: "first",
        });
      }
    }
  }

  return conflicts;
}

/**
 * Normalize description for conflict detection
 */
function normalizeDescription(description: string): string {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 5)  // First 5 words
    .join(" ");
}

/**
 * Resolve conflicts in results
 * 
 * @param results - Map of subtask results
 * @param conflicts - Array of detected conflicts
 * @param method - Conflict resolution method
 * @returns Resolved results
 */
function resolveConflicts(
  results: Map<string, unknown>,
  conflicts: ResultConflict[],
  method: "first" | "last" | "majority" | "highest_quality"
): Map<string, unknown> {
  const resolved = new Map(results);

  for (const conflict of conflicts) {
    let resolution: unknown;

    switch (method) {
      case "first":
        resolution = conflict.conflictingValues[0];
        break;
      case "last":
        resolution = conflict.conflictingValues[conflict.conflictingValues.length - 1];
        break;
      case "majority":
        resolution = getMajorityValue(conflict.conflictingValues);
        break;
      case "highest_quality":
        resolution = getHighestQualityValue(conflict.conflictingValues);
        break;
      default:
        resolution = conflict.conflictingValues[0];
    }

    // Update all conflicting subtasks with the resolution
    for (const subtaskId of conflict.subtaskIds) {
      resolved.set(subtaskId, resolution);
    }

    conflict.resolution = resolution;
    conflict.resolutionMethod = method;
  }

  return resolved;
}

/**
 * Get majority value from conflicting values
 */
function getMajorityValue(values: unknown[]): unknown {
  const counts = new Map<string, { value: unknown; count: number }>();

  for (const value of values) {
    const key = JSON.stringify(value);
    const entry = counts.get(key);
    if (entry) {
      entry.count++;
    } else {
      counts.set(key, { value, count: 1 });
    }
  }

  let maxCount = 0;
  let majorityValue: unknown = values[0];

  for (const entry of counts.values()) {
    if (entry.count > maxCount) {
      maxCount = entry.count;
      majorityValue = entry.value;
    }
  }

  return majorityValue;
}

/**
 * Get highest quality value (longest string, largest number, most complete object)
 */
function getHighestQualityValue(values: unknown[]): unknown {
  let bestValue: unknown = values[0];
  let bestScore = 0;

  for (const value of values) {
    let score = 0;

    if (typeof value === "string") {
      score = value.length;
    } else if (typeof value === "number") {
      score = Math.abs(value);
    } else if (typeof value === "object" && value !== null) {
      score = Object.keys(value).length * 10;
    } else if (Array.isArray(value)) {
      score = value.length * 5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestValue = value;
    }
  }

  return bestValue;
}

/**
 * Concatenate results into an array
 */
function concatenateResults(results: Map<string, unknown>): unknown[] {
  return Array.from(results.values());
}

/**
 * Merge results into a single object
 */
function mergeResults(results: Map<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const [key, value] of results) {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(merged, value);
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Vote on results (return most common value)
 */
function voteResults(results: Map<string, unknown>): unknown {
  const values = Array.from(results.values());
  return getMajorityValue(values);
}

/**
 * Calculate weighted average of results
 */
function weightedAverageResults(
  results: Map<string, unknown>,
  weights?: Map<string, number>
): number | unknown {
  const values = Array.from(results.entries());

  // Check if all values are numbers
  const allNumbers = values.every(([_, value]) => typeof value === "number");

  if (!allNumbers) {
    // Fall back to concatenation if not all numbers
    return concatenateResults(results);
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, value] of values) {
    const weight = weights?.get(key) || 1;
    weightedSum += (value as number) * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Generate a coherent summary from multiple results
 * 
 * @param results - Map of subtask results
 * @param format - Output format ("text" | "json" | "markdown")
 * @returns Formatted summary
 */
export function generateSummary(
  results: Map<string, unknown>,
  format: "text" | "json" | "markdown" = "text"
): string {
  const entries = Array.from(results.entries());

  if (format === "json") {
    return JSON.stringify(Object.fromEntries(entries), null, 2);
  }

  if (format === "markdown") {
    let markdown = "# Task Results\n\n";
    for (const [key, value] of entries) {
      markdown += `## Subtask ${key}\n\n`;
      markdown += `${JSON.stringify(value, null, 2)}\n\n`;
    }
    return markdown;
  }

  // Text format
  let text = "Task Results:\n\n";
  for (const [key, value] of entries) {
    text += `Subtask ${key}:\n`;
    text += `${JSON.stringify(value, null, 2)}\n\n`;
  }
  return text;
}

/**
 * Validate result completeness
 * 
 * @param subtasks - Array of all subtasks
 * @param results - Map of subtask results
 * @returns Validation result
 */
export function validateResults(
  subtasks: SubTask[],
  results: Map<string, unknown>
): {
  complete: boolean;
  missingSubtasks: string[];
  failedSubtasks: string[];
} {
  const missingSubtasks: string[] = [];
  const failedSubtasks: string[] = [];

  for (const subtask of subtasks) {
    if (subtask.status === "failed") {
      failedSubtasks.push(subtask.id);
    } else if (subtask.status === "completed" && !results.has(subtask.id)) {
      missingSubtasks.push(subtask.id);
    }
  }

  return {
    complete: missingSubtasks.length === 0 && failedSubtasks.length === 0,
    missingSubtasks,
    failedSubtasks,
  };
}
