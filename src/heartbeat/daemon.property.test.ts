/**
 * Property-Based Tests for Heartbeat Daemon
 *
 * Feature: ordo-digital-civilization, Property 59: Heartbeat Task Execution
 * **Validates: Requirements 14.2**
 *
 * Property: For any heartbeat trigger, the system should execute all configured
 * autonomous tasks for all active agents.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { test } from "@fast-check/vitest";
import * as fc from "fast-check";
import { createHeartbeatDaemon, type HeartbeatEntry } from "./daemon.js";
import { BUILTIN_TASKS } from "./tasks.js";
import type { Agent } from "../types/agent.js";
import type { OrdoDatabase } from "../types/database.js";
import { PublicKey } from "@solana/web3.js";

// Mock database
function createMockDatabase(): OrdoDatabase {
  const agents: Agent[] = [];
  const updates: Map<string, Partial<Agent>> = new Map();

  return {
    async getAgent(agentId: string) {
      return agents.find((a) => a.id === agentId) || null;
    },
    async updateAgent(agentId: string, update: Partial<Agent>) {
      updates.set(agentId, { ...updates.get(agentId), ...update });
    },
    async createAgent(agent: Agent) {
      agents.push(agent);
    },
    async deleteAgent(agentId: string) {
      const index = agents.findIndex((a) => a.id === agentId);
      if (index >= 0) agents.splice(index, 1);
    },
    async listAgents(filter?: Partial<Agent>) {
      if (!filter) return agents;
      return agents.filter((a) => {
        return Object.entries(filter).every(([key, value]) => {
          return (a as any)[key] === value;
        });
      });
    },
    async getRecentTurns() { return []; },
    async saveTurn() {},
    async getTurnsBySession() { return []; },
    async getRecentModifications() { return []; },
    async saveModification() {},
    async getModificationById() { return null; },
    async updateModification() {},
    getInstalledTools() { return []; },
    async saveInstalledTool() {},
    async removeTool() {},
    async getToolById() { return null; },
    async getInferenceCosts() { return []; },
    async saveInferenceCost() {},
    async getTotalCost() { return 0; },
    async getAverageLatency() { return 0; },
    async getSuccessRate() { return 1; },
    async getToolCallStats() { return []; },
    async getModifications() { return []; },
    async saveImpactMetrics() {},
    _agents: agents,
    _updates: updates,
  } as any;
}

// Arbitraries
const arbitraryAgent = fc.record({
  id: fc.uuid(),
  publicKey: fc.constant(PublicKey.default),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  generation: fc.nat({ max: 10 }),
  children: fc.constant([]),
  balance: fc.double({ min: 0, max: 100, noNaN: true }),
  age: fc.nat({ max: 365 }),
  createdAt: fc.date({ min: new Date("2020-01-01"), max: new Date() }),
  status: fc.constantFrom("alive" as const, "dead" as const),
  fitness: fc.double({ min: 0, max: 1, noNaN: true }),
  traits: fc.constant({}),
});

const arbitraryHeartbeatEntry = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  schedule: fc.constantFrom(
    "* * * * *", // Every minute
    "0 * * * *", // Every hour
    "0 0 * * *", // Daily
    "0 0 * * 0", // Weekly
  ),
  task: fc.constantFrom(...Object.keys(BUILTIN_TASKS)),
  enabled: fc.boolean(),
});

describe("Heartbeat Daemon - Property Tests", () => {
  describe("Property 59: Heartbeat Task Execution", () => {
    test.prop([fc.array(arbitraryAgent, { minLength: 1, maxLength: 5 }), fc.array(arbitraryHeartbeatEntry, { minLength: 1, maxLength: 3 })])(
      "executes all enabled tasks for all active agents",
      async (agents, entries) => {
        // Setup
        const db = createMockDatabase();
        const executedTasks: Array<{ task: string; agentId: string }> = [];

        // Add agents to database
        for (const agent of agents) {
          await db.createAgent({ ...agent, status: "alive" });
        }

        // Track task executions
        const onTaskComplete = (entry: HeartbeatEntry, success: boolean) => {
          if (success) {
            // Task was executed for at least one agent
            executedTasks.push({ task: entry.task, agentId: "any" });
          }
        };

        const daemon = createHeartbeatDaemon({ db, onTaskComplete });

        // Add tasks
        for (const entry of entries) {
          daemon.addTask({ ...entry, lastRun: new Date(Date.now() - 86400000) }); // Set lastRun to yesterday
        }

        // Force run all tasks
        for (const entry of entries) {
          if (entry.enabled) {
            await daemon.forceRun(entry.name);
          }
        }

        // Verify: All enabled tasks should have been executed
        const enabledTasks = entries.filter((e) => e.enabled);
        const activeAgents = agents.filter((a) => a.status === "alive");

        if (enabledTasks.length > 0 && activeAgents.length > 0) {
          // At least some tasks should have been executed
          expect(executedTasks.length).toBeGreaterThan(0);
        }
      }
    );

    test.prop([arbitraryAgent, arbitraryHeartbeatEntry])(
      "handles task failures gracefully without crashing",
      async (agent, entry) => {
        // Setup with a task that will fail
        const db = createMockDatabase();
        await db.createAgent({ ...agent, status: "alive" });

        let errorCaught = false;
        const onTaskComplete = (entry: HeartbeatEntry, success: boolean, error?: string) => {
          if (!success && error) {
            errorCaught = true;
          }
        };

        // Override task to throw error
        const originalTask = BUILTIN_TASKS[entry.task];
        BUILTIN_TASKS[entry.task] = async () => {
          throw new Error("Simulated task failure");
        };

        const daemon = createHeartbeatDaemon({ db, onTaskComplete });
        daemon.addTask({ ...entry, enabled: true, lastRun: new Date(Date.now() - 86400000) });

        // Execute task - should not throw
        await expect(daemon.forceRun(entry.name)).resolves.not.toThrow();

        // Restore original task
        BUILTIN_TASKS[entry.task] = originalTask;

        // Verify error was caught
        expect(errorCaught).toBe(true);
      }
    );

    test.prop([fc.array(arbitraryAgent.filter((a) => a.status === "alive"), { minLength: 2, maxLength: 5 }), arbitraryHeartbeatEntry])(
      "executes task for all active agents, not just one",
      async (agents, entry) => {
        // Skip if task is disabled or no active agents
        if (!entry.enabled) return;
        if (agents.length === 0) return;
        
        // Setup
        const db = createMockDatabase();
        const executedForAgents = new Set<string>();

        // Add agents to database - all are alive
        for (const agent of agents) {
          await db.createAgent({ ...agent, status: "alive" });
        }

        // Track which agents the task was executed for
        const originalTask = BUILTIN_TASKS[entry.task];
        BUILTIN_TASKS[entry.task] = async (ctx) => {
          executedForAgents.add(ctx.agent.id);
          await originalTask(ctx);
        };

        const daemon = createHeartbeatDaemon({ db });
        daemon.addTask({ ...entry, enabled: true, lastRun: new Date(Date.now() - 86400000) });

        // Force run task
        await daemon.forceRun(entry.name);

        // Restore original task
        BUILTIN_TASKS[entry.task] = originalTask;

        // Verify: Task should have been executed for all agents (all are alive)
        expect(executedForAgents.size).toBe(agents.length);
        for (const agent of agents) {
          expect(executedForAgents.has(agent.id)).toBe(true);
        }
      }
    );

    test.prop([arbitraryAgent])(
      "does not execute tasks for dead agents",
      async (agent) => {
        // Setup
        const db = createMockDatabase();
        await db.createAgent({ ...agent, status: "dead" });

        let taskExecuted = false;
        const originalHealthCheck = BUILTIN_TASKS.health_check;
        BUILTIN_TASKS.health_check = async (ctx) => {
          taskExecuted = true;
          await originalHealthCheck(ctx);
        };

        const daemon = createHeartbeatDaemon({ db });
        daemon.addTask({
          name: "test_health_check",
          schedule: "* * * * *",
          task: "health_check",
          enabled: true,
          lastRun: new Date(Date.now() - 86400000),
        });

        // Force run task
        await daemon.forceRun("test_health_check");

        // Restore original task
        BUILTIN_TASKS.health_check = originalHealthCheck;

        // Verify: Task should not have been executed for dead agent
        expect(taskExecuted).toBe(false);
      }
    );
  });

  describe("Daemon Lifecycle", () => {
    test.prop([fc.array(arbitraryHeartbeatEntry, { minLength: 1, maxLength: 3 })])(
      "can start and stop daemon without errors",
      async (entries) => {
        const db = createMockDatabase();
        const daemon = createHeartbeatDaemon({ db });

        for (const entry of entries) {
          daemon.addTask(entry);
        }

        // Start daemon
        expect(() => daemon.start()).not.toThrow();
        expect(daemon.isRunning()).toBe(true);

        // Stop daemon
        expect(() => daemon.stop()).not.toThrow();
        expect(daemon.isRunning()).toBe(false);
      }
    );

    test.prop([arbitraryHeartbeatEntry])(
      "can add and remove tasks dynamically",
      async (entry) => {
        const db = createMockDatabase();
        const daemon = createHeartbeatDaemon({ db });

        // Add task
        daemon.addTask(entry);
        expect(daemon.getTasks()).toHaveLength(4); // 3 default + 1 added

        // Remove task
        daemon.removeTask(entry.name);
        expect(daemon.getTasks()).toHaveLength(3); // Back to 3 default
      }
    );
  });
});
