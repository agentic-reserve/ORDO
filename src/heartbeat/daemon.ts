/**
 * Heartbeat Daemon
 *
 * Runs periodic tasks on cron schedules for autonomous agent operations.
 * Supports hourly, daily, and weekly intervals.
 * Executes tasks for all active agents without user prompts.
 *
 * Requirements: 14.1, 14.3, 14.6
 */

import cronParser from "cron-parser";
import type { Agent } from "../types/database.js";
import type { OrdoDatabase, CustomHeartbeatTask } from "../types/database.js";
import { BUILTIN_TASKS, type HeartbeatTaskContext } from "./tasks.js";

export interface HeartbeatEntry {
  name: string;
  schedule: string; // Cron expression
  task: string;
  enabled: boolean;
  agentId?: string; // If specified, only run for this agent
  params?: Record<string, any>;
  lastRun?: Date;
  lastSuccess?: boolean;
  lastError?: string;
  executionTimeMs?: number;
}

export interface HeartbeatDaemonOptions {
  db: OrdoDatabase;
  onTaskComplete?: (entry: HeartbeatEntry, success: boolean, error?: string) => void;
}

export interface HeartbeatDaemon {
  start(): void;
  stop(): void;
  isRunning(): boolean;
  forceRun(taskName: string, agentId?: string): Promise<void>;
  addTask(entry: HeartbeatEntry): void;
  removeTask(taskName: string): void;
  getTasks(): HeartbeatEntry[];
}

/**
 * Create and return the heartbeat daemon.
 */
export function createHeartbeatDaemon(
  options: HeartbeatDaemonOptions,
): HeartbeatDaemon {
  const { db, onTaskComplete } = options;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let running = false;
  const tasks = new Map<string, HeartbeatEntry>();

  // Default tasks - can be customized per agent
  const defaultTasks: HeartbeatEntry[] = [
    {
      name: "hourly_health_check",
      schedule: "0 * * * *", // Every hour
      task: "health_check",
      enabled: true,
    },
    {
      name: "daily_metrics_report",
      schedule: "0 0 * * *", // Daily at midnight
      task: "metrics_report",
      enabled: true,
    },
    {
      name: "weekly_evolution_check",
      schedule: "0 0 * * 0", // Weekly on Sunday
      task: "evolution_check",
      enabled: true,
    },
  ];

  // Initialize with default tasks
  for (const task of defaultTasks) {
    tasks.set(task.name, task);
  }

  /**
   * Check if a heartbeat entry is due to run.
   */
  function isDue(entry: HeartbeatEntry): boolean {
    if (!entry.enabled) return false;
    if (!entry.schedule) return false;

    try {
      const interval = cronParser.parseExpression(entry.schedule, {
        currentDate: entry.lastRun || new Date(Date.now() - 86400000), // If never run, assume due
      });

      const nextRun = interval.next().toDate();
      return nextRun <= new Date();
    } catch {
      return false;
    }
  }

  /**
   * Execute a single heartbeat task for an agent.
   */
  async function executeTask(entry: HeartbeatEntry, agent: Agent): Promise<void> {
    const taskFn = BUILTIN_TASKS[entry.task];
    if (!taskFn) {
      console.warn(`[HEARTBEAT] Unknown task: ${entry.task}`);
      return;
    }

    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const context: HeartbeatTaskContext = {
        agent,
        db,
        params: entry.params,
      };

      await taskFn(context);
      success = true;
    } catch (err: any) {
      success = false;
      error = err.message;
      console.error(
        `[HEARTBEAT] Task '${entry.name}' failed for agent ${agent.id}: ${err.message}`,
      );
    }

    const executionTimeMs = Date.now() - startTime;

    // Update task metadata
    entry.lastRun = new Date();
    entry.lastSuccess = success;
    entry.lastError = error;
    entry.executionTimeMs = executionTimeMs;

    // Notify callback
    if (onTaskComplete) {
      onTaskComplete(entry, success, error);
    }
  }

  /**
   * Execute a custom heartbeat task for an agent.
   */
  async function executeCustomTask(customTask: CustomHeartbeatTask, agent: Agent): Promise<void> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      // Create a safe execution context for custom task code
      const context: HeartbeatTaskContext = {
        agent,
        db,
        params: {},
      };

      // Execute the custom task code
      // Note: In production, this should use a sandboxed environment
      const taskFunction = new Function('context', customTask.taskCode);
      await taskFunction(context);
      
      success = true;
    } catch (err: any) {
      success = false;
      error = err.message;
      console.error(
        `[HEARTBEAT] Custom task '${customTask.name}' failed for agent ${agent.id}: ${err.message}`,
      );
    }

    const executionTimeMs = Date.now() - startTime;

    // Update custom task metadata in database
    await db.updateCustomHeartbeatTask(customTask.id, {
      lastRun: new Date(),
      lastSuccess: success,
      lastError: error,
      executionTimeMs,
    });

    // Notify callback
    if (onTaskComplete) {
      const entry: HeartbeatEntry = {
        name: customTask.name,
        schedule: customTask.schedule,
        task: 'custom',
        enabled: customTask.enabled,
        agentId: customTask.agentId,
        lastRun: new Date(),
        lastSuccess: success,
        lastError: error,
        executionTimeMs,
      };
      onTaskComplete(entry, success, error);
    }
  }

  /**
   * The main tick function. Runs on every interval.
   */
  async function tick(): Promise<void> {
    try {
      // Get all active agents
      const agents = await db.listAgents({ status: "alive" });

      // Execute built-in tasks
      for (const entry of tasks.values()) {
        if (!entry.enabled) continue;
        if (!isDue(entry)) continue;

        // If task is agent-specific, only run for that agent
        if (entry.agentId) {
          const agent = agents.find((a) => a.id === entry.agentId);
          if (agent) {
            await executeTask(entry, agent);
          }
        } else {
          // Run for all active agents
          for (const agent of agents) {
            await executeTask(entry, agent);
          }
        }
      }

      // Execute custom tasks
      const customTasks = await db.getCustomHeartbeatTasks();
      for (const customTask of customTasks) {
        if (!customTask.enabled) continue;
        
        // Check if custom task is due
        const isDueCustom = isDue({
          name: customTask.name,
          schedule: customTask.schedule,
          task: 'custom',
          enabled: customTask.enabled,
          lastRun: customTask.lastRun,
        });
        
        if (!isDueCustom) continue;

        // Execute for specific agent or all agents
        if (customTask.agentId) {
          const agent = agents.find((a) => a.id === customTask.agentId);
          if (agent) {
            await executeCustomTask(customTask, agent);
          }
        } else {
          // Run for all active agents
          for (const agent of agents) {
            await executeCustomTask(customTask, agent);
          }
        }
      }
    } catch (err: any) {
      console.error(`[HEARTBEAT] Tick failed: ${err.message}`);
    }
  }

  // ─── Public API ──────────────────────────────────────────────

  const start = (): void => {
    if (running) return;
    running = true;

    // Tick every 60 seconds to check for due tasks
    const tickMs = 60_000;

    // Run first tick immediately
    tick().catch((err) => {
      console.error(`[HEARTBEAT] First tick failed: ${err.message}`);
    });

    intervalId = setInterval(() => {
      tick().catch((err) => {
        console.error(`[HEARTBEAT] Tick failed: ${err.message}`);
      });
    }, tickMs);

    console.log(
      `[HEARTBEAT] Daemon started. Tick interval: ${tickMs / 1000}s`,
    );
  };

  const stop = (): void => {
    if (!running) return;
    running = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    console.log("[HEARTBEAT] Daemon stopped.");
  };

  const isRunning = (): boolean => running;

  const forceRun = async (taskName: string, agentId?: string): Promise<void> => {
    const entry = tasks.get(taskName);
    if (!entry) {
      throw new Error(`Task not found: ${taskName}`);
    }

    if (agentId) {
      const agent = await db.getAgent(agentId);
      if (agent) {
        await executeTask(entry, agent);
      }
    } else {
      const agents = await db.listAgents({ status: "alive" });
      for (const agent of agents) {
        await executeTask(entry, agent);
      }
    }
  };

  const addTask = (entry: HeartbeatEntry): void => {
    tasks.set(entry.name, entry);
  };

  const removeTask = (taskName: string): void => {
    tasks.delete(taskName);
  };

  const getTasks = (): HeartbeatEntry[] => {
    return Array.from(tasks.values());
  };

  return { start, stop, isRunning, forceRun, addTask, removeTask, getTasks };
}
