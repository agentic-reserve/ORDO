/**
 * Custom Heartbeat Task Management
 *
 * Allows agents to define and manage custom heartbeat tasks.
 * Custom tasks are stored in the database and executed on schedule.
 *
 * Requirements: 14.4
 */

import type { OrdoDatabase, CustomHeartbeatTask } from "../types/database.js";
import { isValidCronExpression } from "./config.js";

export interface CreateCustomTaskParams {
  agentId: string;
  name: string;
  description: string;
  schedule: string;
  taskCode: string;
  enabled?: boolean;
}

/**
 * Create a new custom heartbeat task for an agent.
 */
export async function createCustomTask(
  db: OrdoDatabase,
  params: CreateCustomTaskParams,
): Promise<CustomHeartbeatTask> {
  // Validate cron expression
  if (!isValidCronExpression(params.schedule)) {
    throw new Error(`Invalid cron expression: ${params.schedule}`);
  }

  // Validate task code (basic check)
  if (!params.taskCode || params.taskCode.trim().length === 0) {
    throw new Error("Task code cannot be empty");
  }

  const task: CustomHeartbeatTask = {
    id: generateTaskId(),
    agentId: params.agentId,
    name: params.name,
    description: params.description,
    schedule: params.schedule,
    taskCode: params.taskCode,
    enabled: params.enabled ?? true,
    createdAt: new Date(),
  };

  await db.saveCustomHeartbeatTask(task);
  return task;
}

/**
 * Update an existing custom heartbeat task.
 */
export async function updateCustomTask(
  db: OrdoDatabase,
  taskId: string,
  updates: Partial<Omit<CustomHeartbeatTask, "id" | "agentId" | "createdAt">>,
): Promise<void> {
  // Validate cron expression if provided
  if (updates.schedule && !isValidCronExpression(updates.schedule)) {
    throw new Error(`Invalid cron expression: ${updates.schedule}`);
  }

  // Validate task code if provided
  if (updates.taskCode !== undefined && updates.taskCode.trim().length === 0) {
    throw new Error("Task code cannot be empty");
  }

  await db.updateCustomHeartbeatTask(taskId, updates);
}

/**
 * Delete a custom heartbeat task.
 */
export async function deleteCustomTask(
  db: OrdoDatabase,
  taskId: string,
): Promise<void> {
  await db.deleteCustomHeartbeatTask(taskId);
}

/**
 * Get all custom tasks for an agent.
 */
export async function getAgentCustomTasks(
  db: OrdoDatabase,
  agentId: string,
): Promise<CustomHeartbeatTask[]> {
  const allTasks = await db.getCustomHeartbeatTasks();
  return allTasks.filter((task) => task.agentId === agentId);
}

/**
 * Enable a custom task.
 */
export async function enableCustomTask(
  db: OrdoDatabase,
  taskId: string,
): Promise<void> {
  await db.updateCustomHeartbeatTask(taskId, { enabled: true });
}

/**
 * Disable a custom task.
 */
export async function disableCustomTask(
  db: OrdoDatabase,
  taskId: string,
): Promise<void> {
  await db.updateCustomHeartbeatTask(taskId, { enabled: false });
}

/**
 * Generate a unique task ID.
 */
function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Example custom task templates for agents to use.
 */
export const CUSTOM_TASK_TEMPLATES = {
  /**
   * Daily balance alert - notify when balance is low
   */
  dailyBalanceAlert: {
    name: "daily_balance_alert",
    description: "Check balance daily and alert if below threshold",
    schedule: "0 9 * * *", // 9 AM daily
    taskCode: `
      const threshold = context.params?.threshold || 1.0;
      if (context.agent.balance < threshold) {
        console.log(\`[ALERT] Agent \${context.agent.id} balance is low: \${context.agent.balance} SOL\`);
        // In production, this would send an actual alert
      }
    `,
  },

  /**
   * Weekly fitness report - calculate and log fitness metrics
   */
  weeklyFitnessReport: {
    name: "weekly_fitness_report",
    description: "Generate weekly fitness report",
    schedule: "0 0 * * 0", // Sunday midnight
    taskCode: `
      const fitness = context.agent.fitness;
      console.log(\`[FITNESS REPORT] Agent \${context.agent.id}:\`);
      console.log(\`  Survival: \${fitness}\`);
      console.log(\`  Balance: \${context.agent.balance} SOL\`);
      console.log(\`  Age: \${context.agent.age} days\`);
    `,
  },

  /**
   * Hourly health ping - simple health check
   */
  hourlyHealthPing: {
    name: "hourly_health_ping",
    description: "Ping health status every hour",
    schedule: "0 * * * *", // Every hour
    taskCode: `
      console.log(\`[HEALTH] Agent \${context.agent.id} is \${context.agent.status}\`);
    `,
  },
};
