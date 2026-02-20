/**
 * Property-Based Tests for Heartbeat Execution Tracking
 *
 * Feature: ordo-digital-civilization, Property 61: Heartbeat Execution Tracking
 * **Validates: Requirements 14.5**
 *
 * Property: For any heartbeat execution, the system should track success/failure,
 * execution time, and any errors encountered.
 */

import { describe, expect } from "vitest";
import { test } from "@fast-check/vitest";
import * as fc from "fast-check";
import { createHeartbeatDaemon, type HeartbeatEntry } from "./daemon.js";
import { BUILTIN_TASKS } from "./tasks.js";
import {
  getTaskMetrics,
  getSystemMetrics,
  getFailingTasks,
  getSlowTasks,
  generateHealthReport,
} from "./tracking.js";
import type { Agent, OrdoDatabase } from "../types/database.js";
import { PublicKey } from "@solana/web3.js";

// Mock database
function createMockDatabase(): OrdoDatabase {
  const agents: Agent[] = [];
  const customTasks: any[] = [];

  return {
    async getAgent(agentId: string) {
      return agents.find((a) => a.id === agentId) || null;
    },
    async updateAgent(agentId: string, update: Partial<Agent>) {},
    async createAgent(agent: Agent) {
      agents.push(agent);
    },
    async deleteAgent(agentId: string) {},
    async listAgents(filter?: Partial<Agent>) {
      if (!filter) return agents;
      return agents.filter((a) => {
        return Object.entries(filter).every(([key, value]) => {
          return (a as any)[key] === value;
        });
      });
    },
    async getCustomHeartbeatTasks() {
      return customTasks;
    },
    async saveCustomHeartbeatTask(task: any) {
      customTasks.push(task);
    },
    async updateCustomHeartbeatTask(taskId: string, updates: any) {
      const task = customTasks.find((t) => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
      }
    },
    async deleteCustomHeartbeatTask(taskId: string) {},
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
    _customTasks: customTasks,
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
  status: fc.constant("alive" as const),
  fitness: fc.double({ min: 0, max: 1, noNaN: true }),
  traits: fc.constant({}),
});

const arbitraryHeartbeatEntry = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  schedule: fc.constantFrom("* * * * *", "0 * * * *", "0 0 * * *"),
  task: fc.constantFrom(...Object.keys(BUILTIN_TASKS)),
  enabled: fc.boolean(),
});

describe("Heartbeat Execution Tracking - Property Tests", () => {
  describe("Property 61: Heartbeat Execution Tracking", () => {
    test.prop([arbitraryAgent, arbitraryHeartbeatEntry])(
      "tracks success for successful task executions",
      async (agent, entryParams) => {
        const db = createMockDatabase();
        await db.createAgent({ ...agent, status: "alive" });

        let trackedEntry: HeartbeatEntry | null = null;
        const onTaskComplete = (entry: HeartbeatEntry, success: boolean) => {
          trackedEntry = entry;
        };

        const daemon = createHeartbeatDaemon({ db, onTaskComplete });
        
        const entry: HeartbeatEntry = {
          ...entryParams,
          enabled: true,
          lastRun: new Date(Date.now() - 86400000), // Yesterday
        };
        
        daemon.addTask(entry);

        // Force run the task
        await daemon.forceRun(entry.name);

        // Verify tracking
        expect(trackedEntry).not.toBeNull();
        if (trackedEntry) {
          expect(trackedEntry.lastRun).toBeDefined();
          expect(trackedEntry.lastSuccess).toBeDefined();
          expect(trackedEntry.executionTimeMs).toBeDefined();
          expect(trackedEntry.executionTimeMs).toBeGreaterThanOrEqual(0);
        }
      }
    );

    test.prop([arbitraryAgent])(
      "tracks failure and error message for failed task executions",
      async (agent) => {
        const db = createMockDatabase();
        await db.createAgent({ ...agent, status: "alive" });

        let trackedEntry: HeartbeatEntry | null = null;
        let trackedError: string | undefined;
        const onTaskComplete = (entry: HeartbeatEntry, success: boolean, error?: string) => {
          trackedEntry = entry;
          trackedError = error;
        };

        // Override a task to fail
        const originalTask = BUILTIN_TASKS.health_check;
        BUILTIN_TASKS.health_check = async () => {
          throw new Error("Test failure");
        };

        const daemon = createHeartbeatDaemon({ db, onTaskComplete });
        
        const entry: HeartbeatEntry = {
          name: "test_health_check",
          schedule: "* * * * *",
          task: "health_check",
          enabled: true,
          lastRun: new Date(Date.now() - 86400000),
        };
        
        daemon.addTask(entry);

        // Force run the task
        await daemon.forceRun(entry.name);

        // Restore original task
        BUILTIN_TASKS.health_check = originalTask;

        // Verify failure tracking
        expect(trackedEntry).not.toBeNull();
        if (trackedEntry) {
          expect(trackedEntry.lastSuccess).toBe(false);
          expect(trackedEntry.lastError).toBeDefined();
          expect(trackedError).toBeDefined();
        }
      }
    );

    test.prop([fc.array(arbitraryHeartbeatEntry, { minLength: 2, maxLength: 5 })])(
      "tracks execution time for all tasks",
      async (entries) => {
        const db = createMockDatabase();
        const agent = {
          id: "test-agent",
          publicKey: PublicKey.default,
          name: "Test Agent",
          generation: 0,
          children: [],
          balance: 10,
          age: 1,
          createdAt: new Date(),
          status: "alive" as const,
          fitness: 0.5,
          traits: {},
        };
        await db.createAgent(agent);

        const daemon = createHeartbeatDaemon({ db });

        // Add all tasks
        for (const entryParams of entries) {
          const entry: HeartbeatEntry = {
            ...entryParams,
            enabled: true,
            lastRun: new Date(Date.now() - 86400000),
          };
          daemon.addTask(entry);
        }

        // Force run all tasks
        for (const entryParams of entries) {
          await daemon.forceRun(entryParams.name);
        }

        // Get all tasks and verify execution time tracking
        const tasks = daemon.getTasks();
        for (const task of tasks) {
          if (task.lastRun) {
            expect(task.executionTimeMs).toBeDefined();
            expect(task.executionTimeMs).toBeGreaterThanOrEqual(0);
          }
        }
      }
    );

    test.prop([fc.array(arbitraryHeartbeatEntry, { minLength: 1, maxLength: 3 })])(
      "system metrics aggregate task execution data correctly",
      async (entries) => {
        const db = createMockDatabase();
        const agent = {
          id: "test-agent",
          publicKey: PublicKey.default,
          name: "Test Agent",
          generation: 0,
          children: [],
          balance: 10,
          age: 1,
          createdAt: new Date(),
          status: "alive" as const,
          fitness: 0.5,
          traits: {},
        };
        await db.createAgent(agent);

        const daemon = createHeartbeatDaemon({ db });

        // Add tasks
        const builtinTasks: HeartbeatEntry[] = [];
        for (const entryParams of entries) {
          const entry: HeartbeatEntry = {
            ...entryParams,
            enabled: true,
            lastRun: new Date(Date.now() - 86400000),
          };
          daemon.addTask(entry);
          builtinTasks.push(entry);
        }

        // Force run all tasks
        for (const entry of builtinTasks) {
          await daemon.forceRun(entry.name);
        }

        // Get system metrics
        const metrics = await getSystemMetrics(daemon.getTasks(), db);

        // Verify metrics
        expect(metrics.totalTasks).toBeGreaterThanOrEqual(entries.length);
        expect(metrics.taskMetrics.length).toBeGreaterThanOrEqual(entries.length);
        expect(metrics.overallSuccessRate).toBeGreaterThanOrEqual(0);
        expect(metrics.overallSuccessRate).toBeLessThanOrEqual(1);
      }
    );

    test.prop([fc.array(arbitraryHeartbeatEntry, { minLength: 2, maxLength: 5 })])(
      "identifies failing tasks correctly",
      async (entries) => {
        const db = createMockDatabase();
        const agent = {
          id: "test-agent",
          publicKey: PublicKey.default,
          name: "Test Agent",
          generation: 0,
          children: [],
          balance: 10,
          age: 1,
          createdAt: new Date(),
          status: "alive" as const,
          fitness: 0.5,
          traits: {},
        };
        await db.createAgent(agent);

        // Make one task fail
        const originalTask = BUILTIN_TASKS[entries[0].task];
        BUILTIN_TASKS[entries[0].task] = async () => {
          throw new Error("Intentional failure");
        };

        const daemon = createHeartbeatDaemon({ db });

        // Add tasks
        for (const entryParams of entries) {
          const entry: HeartbeatEntry = {
            ...entryParams,
            enabled: true,
            lastRun: new Date(Date.now() - 86400000),
          };
          daemon.addTask(entry);
        }

        // Force run all tasks
        for (const entry of entries) {
          await daemon.forceRun(entry.name);
        }

        // Restore original task
        BUILTIN_TASKS[entries[0].task] = originalTask;

        // Get system metrics
        const metrics = await getSystemMetrics(daemon.getTasks(), db);
        const failingTasks = getFailingTasks(metrics, 0.5);

        // At least one task should be identified as failing
        expect(failingTasks.length).toBeGreaterThan(0);
      }
    );

    test.prop([fc.array(arbitraryHeartbeatEntry, { minLength: 1, maxLength: 3 })])(
      "health report provides status and recommendations",
      async (entries) => {
        const db = createMockDatabase();
        const agent = {
          id: "test-agent",
          publicKey: PublicKey.default,
          name: "Test Agent",
          generation: 0,
          children: [],
          balance: 10,
          age: 1,
          createdAt: new Date(),
          status: "alive" as const,
          fitness: 0.5,
          traits: {},
        };
        await db.createAgent(agent);

        const daemon = createHeartbeatDaemon({ db });

        // Add tasks
        for (const entryParams of entries) {
          const entry: HeartbeatEntry = {
            ...entryParams,
            enabled: true,
            lastRun: new Date(Date.now() - 86400000),
          };
          daemon.addTask(entry);
        }

        // Force run all tasks
        for (const entry of entries) {
          await daemon.forceRun(entry.name);
        }

        // Generate health report
        const report = await generateHealthReport(daemon.getTasks(), db);

        // Verify report structure
        expect(report.status).toBeDefined();
        expect(["healthy", "degraded", "unhealthy"]).toContain(report.status);
        expect(report.metrics).toBeDefined();
        expect(report.issues).toBeDefined();
        expect(report.recommendations).toBeDefined();
        expect(Array.isArray(report.issues)).toBe(true);
        expect(Array.isArray(report.recommendations)).toBe(true);
      }
    );
  });
});
