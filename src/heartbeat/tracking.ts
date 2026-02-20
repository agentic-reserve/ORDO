/**
 * Heartbeat Execution Tracking
 *
 * Tracks and analyzes heartbeat task execution metrics including
 * success rates, execution times, and error patterns.
 *
 * Requirements: 14.5
 */

import type { HeartbeatEntry } from "./daemon.js";
import type { OrdoDatabase, CustomHeartbeatTask } from "../types/database.js";

export interface HeartbeatExecutionMetrics {
  taskName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgExecutionTimeMs: number;
  lastRun?: Date;
  lastSuccess?: boolean;
  lastError?: string;
  recentErrors: string[];
}

export interface HeartbeatSystemMetrics {
  totalTasks: number;
  enabledTasks: number;
  disabledTasks: number;
  overallSuccessRate: number;
  avgExecutionTimeMs: number;
  taskMetrics: HeartbeatExecutionMetrics[];
}

/**
 * Get execution metrics for a specific heartbeat task.
 */
export function getTaskMetrics(entry: HeartbeatEntry): HeartbeatExecutionMetrics {
  // For built-in tasks, we track metrics in the entry itself
  // In a real implementation, this would query a metrics database
  return {
    taskName: entry.name,
    totalExecutions: entry.lastRun ? 1 : 0,
    successfulExecutions: entry.lastSuccess ? 1 : 0,
    failedExecutions: entry.lastSuccess === false ? 1 : 0,
    successRate: entry.lastSuccess ? 1.0 : 0.0,
    avgExecutionTimeMs: entry.executionTimeMs || 0,
    lastRun: entry.lastRun,
    lastSuccess: entry.lastSuccess,
    lastError: entry.lastError,
    recentErrors: entry.lastError ? [entry.lastError] : [],
  };
}

/**
 * Get execution metrics for a custom heartbeat task.
 */
export function getCustomTaskMetrics(task: CustomHeartbeatTask): HeartbeatExecutionMetrics {
  return {
    taskName: task.name,
    totalExecutions: task.lastRun ? 1 : 0,
    successfulExecutions: task.lastSuccess ? 1 : 0,
    failedExecutions: task.lastSuccess === false ? 1 : 0,
    successRate: task.lastSuccess ? 1.0 : 0.0,
    avgExecutionTimeMs: task.executionTimeMs || 0,
    lastRun: task.lastRun,
    lastSuccess: task.lastSuccess,
    lastError: task.lastError,
    recentErrors: task.lastError ? [task.lastError] : [],
  };
}

/**
 * Get system-wide heartbeat metrics.
 */
export async function getSystemMetrics(
  builtinTasks: HeartbeatEntry[],
  db: OrdoDatabase,
): Promise<HeartbeatSystemMetrics> {
  const customTasks = await db.getCustomHeartbeatTasks();
  
  const allTaskMetrics: HeartbeatExecutionMetrics[] = [
    ...builtinTasks.map(getTaskMetrics),
    ...customTasks.map(getCustomTaskMetrics),
  ];

  const totalTasks = builtinTasks.length + customTasks.length;
  const enabledTasks = builtinTasks.filter((t) => t.enabled).length + 
                       customTasks.filter((t) => t.enabled).length;
  const disabledTasks = totalTasks - enabledTasks;

  const totalSuccessful = allTaskMetrics.reduce((sum, m) => sum + m.successfulExecutions, 0);
  const totalExecutions = allTaskMetrics.reduce((sum, m) => sum + m.totalExecutions, 0);
  const overallSuccessRate = totalExecutions > 0 ? totalSuccessful / totalExecutions : 0;

  const totalExecutionTime = allTaskMetrics.reduce((sum, m) => sum + m.avgExecutionTimeMs, 0);
  const avgExecutionTimeMs = allTaskMetrics.length > 0 ? totalExecutionTime / allTaskMetrics.length : 0;

  return {
    totalTasks,
    enabledTasks,
    disabledTasks,
    overallSuccessRate,
    avgExecutionTimeMs,
    taskMetrics: allTaskMetrics,
  };
}

/**
 * Get tasks that are failing frequently.
 */
export function getFailingTasks(
  metrics: HeartbeatSystemMetrics,
  threshold: number = 0.5,
): HeartbeatExecutionMetrics[] {
  return metrics.taskMetrics.filter((m) => {
    return m.totalExecutions > 0 && m.successRate < threshold;
  });
}

/**
 * Get tasks that are taking too long to execute.
 */
export function getSlowTasks(
  metrics: HeartbeatSystemMetrics,
  thresholdMs: number = 1000,
): HeartbeatExecutionMetrics[] {
  return metrics.taskMetrics.filter((m) => {
    return m.avgExecutionTimeMs > thresholdMs;
  });
}

/**
 * Get tasks that haven't run recently.
 */
export function getStaleTasks(
  metrics: HeartbeatSystemMetrics,
  staleThresholdMs: number = 24 * 60 * 60 * 1000, // 24 hours
): HeartbeatExecutionMetrics[] {
  const now = Date.now();
  return metrics.taskMetrics.filter((m) => {
    if (!m.lastRun) return true;
    return now - m.lastRun.getTime() > staleThresholdMs;
  });
}

/**
 * Generate a health report for the heartbeat system.
 */
export async function generateHealthReport(
  builtinTasks: HeartbeatEntry[],
  db: OrdoDatabase,
): Promise<{
  status: "healthy" | "degraded" | "unhealthy";
  metrics: HeartbeatSystemMetrics;
  issues: string[];
  recommendations: string[];
}> {
  const metrics = await getSystemMetrics(builtinTasks, db);
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Check overall success rate
  if (metrics.overallSuccessRate < 0.9) {
    issues.push(`Low overall success rate: ${(metrics.overallSuccessRate * 100).toFixed(1)}%`);
    recommendations.push("Investigate failing tasks and fix underlying issues");
  }

  // Check for failing tasks
  const failingTasks = getFailingTasks(metrics, 0.5);
  if (failingTasks.length > 0) {
    issues.push(`${failingTasks.length} tasks failing frequently`);
    recommendations.push(`Review and fix: ${failingTasks.map((t) => t.taskName).join(", ")}`);
  }

  // Check for slow tasks
  const slowTasks = getSlowTasks(metrics, 1000);
  if (slowTasks.length > 0) {
    issues.push(`${slowTasks.length} tasks taking >1s to execute`);
    recommendations.push(`Optimize: ${slowTasks.map((t) => t.taskName).join(", ")}`);
  }

  // Check for stale tasks
  const staleTasks = getStaleTasks(metrics, 24 * 60 * 60 * 1000);
  if (staleTasks.length > 0) {
    issues.push(`${staleTasks.length} tasks haven't run in 24+ hours`);
    recommendations.push("Check if stale tasks should be disabled or have schedule issues");
  }

  // Determine overall status
  let status: "healthy" | "degraded" | "unhealthy";
  if (issues.length === 0) {
    status = "healthy";
  } else if (metrics.overallSuccessRate < 0.5 || failingTasks.length > metrics.totalTasks / 2) {
    status = "unhealthy";
  } else {
    status = "degraded";
  }

  return {
    status,
    metrics,
    issues,
    recommendations,
  };
}
