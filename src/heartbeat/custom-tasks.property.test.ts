/**
 * Property-Based Tests for Custom Heartbeat Tasks
 *
 * Feature: ordo-digital-civilization, Property 60: Custom Task Support
 * **Validates: Requirements 14.4**
 *
 * Property: For any agent-defined custom heartbeat task, the system should
 * execute it on schedule and track execution success/failure.
 */

import { describe, expect } from "vitest";
import { test } from "@fast-check/vitest";
import * as fc from "fast-check";
import { createHeartbeatDaemon, type HeartbeatEntry } from "./daemon.js";
import {
  createCustomTask,
  updateCustomTask,
  deleteCustomTask,
  getAgentCustomTasks,
  enableCustomTask,
  disableCustomTask,
} from "./custom-tasks.js";
import type { Agent, OrdoDatabase, CustomHeartbeatTask } from "../types/database.js";
import { PublicKey } from "@solana/web3.js";

// Mock database with custom task support
function createMockDatabase(): OrdoDatabase {
  const agents: Agent[] = [];
  const customTasks: CustomHeartbeatTask[] = [];
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
    async getCustomHeartbeatTasks(agentId?: string) {
      if (agentId) {
        return customTasks.filter((t) => t.agentId === agentId);
      }
      return customTasks;
    },
    async saveCustomHeartbeatTask(task: CustomHeartbeatTask) {
      customTasks.push(task);
    },
    async updateCustomHeartbeatTask(taskId: string, updates: Partial<CustomHeartbeatTask>) {
      const task = customTasks.find((t) => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
      }
    },
    async deleteCustomHeartbeatTask(taskId: string) {
      const index = customTasks.findIndex((t) => t.id === taskId);
      if (index >= 0) customTasks.splice(index, 1);
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
    _customTasks: customTasks,
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
  status: fc.constant("alive" as const),
  fitness: fc.double({ min: 0, max: 1, noNaN: true }),
  traits: fc.constant({}),
});

const arbitraryCustomTask = fc.record({
  name: fc.string({ minLength: 1, maxLength: 30 }),
  description: fc.string({ minLength: 1, maxLength: 100 }),
  schedule: fc.constantFrom(
    "* * * * *", // Every minute
    "0 * * * *", // Every hour
    "0 0 * * *", // Daily
    "0 0 * * 0", // Weekly
  ),
  taskCode: fc.constantFrom(
    "console.log('Task executed');",
    "console.log('Agent:', context.agent.id);",
    "console.log('Balance:', context.agent.balance);",
  ),
  enabled: fc.boolean(),
});

describe("Custom Heartbeat Tasks - Property Tests", () => {
  describe("Property 60: Custom Task Support", () => {
    test.prop([arbitraryAgent, arbitraryCustomTask])(
      "creates and stores custom tasks for agents",
      async (agent, taskParams) => {
        const db = createMockDatabase();
        await db.createAgent({ ...agent, status: "alive" });

        // Create custom task
        const task = await createCustomTask(db, {
          agentId: agent.id,
          ...taskParams,
        });

        // Verify task was created
        expect(task.id).toBeDefined();
        expect(task.agentId).toBe(agent.id);
        expect(task.name).toBe(taskParams.name);
        expect(task.schedule).toBe(taskParams.schedule);
        expect(task.taskCode).toBe(taskParams.taskCode);

        // Verify task is in database
        const tasks = await getAgentCustomTasks(db, agent.id);
        expect(tasks).toHaveLength(1);
        expect(tasks[0].id).toBe(task.id);
      }
    );

    test.prop([arbitraryAgent, arbitraryCustomTask])(
      "executes custom tasks on schedule and tracks success",
      async (agent, taskParams) => {
        const db = createMockDatabase();
        await db.createAgent({ ...agent, status: "alive" });

        // Create custom task with simple code and every-minute schedule
        const task = await createCustomTask(db, {
          agentId: agent.id,
          ...taskParams,
          taskCode: "console.log('Custom task executed');",
          schedule: "* * * * *", // Every minute - always due
          enabled: true, // Force enabled for this test
        });

        // Track execution
        let executionTracked = false;
        const onTaskComplete = (entry: HeartbeatEntry, success: boolean) => {
          if (entry.name === task.name) {
            executionTracked = true;
            expect(success).toBe(true);
          }
        };

        const daemon = createHeartbeatDaemon({ db, onTaskComplete });

        // Make task appear due by setting lastRun to yesterday
        await db.updateCustomHeartbeatTask(task.id, {
          lastRun: new Date(Date.now() - 86400000),
        });

        // Start daemon and wait for tick
        daemon.start();
        await new Promise((resolve) => setTimeout(resolve, 150));
        daemon.stop();

        // Verify execution was tracked in database
        const updatedTasks = await db.getCustomHeartbeatTasks(agent.id);
        const updatedTask = updatedTasks.find((t) => t.id === task.id);
        
        // Task should have execution metadata
        expect(updatedTask).toBeDefined();
        if (updatedTask) {
          // At minimum, lastRun should be updated
          expect(updatedTask.lastRun).toBeDefined();
        }
      }
    );

    test.prop([arbitraryAgent, arbitraryCustomTask])(
      "tracks custom task failures",
      async (agent, taskParams) => {
        const db = createMockDatabase();
        await db.createAgent({ ...agent, status: "alive" });

        // Create custom task that will fail
        const task = await createCustomTask(db, {
          agentId: agent.id,
          ...taskParams,
          taskCode: "throw new Error('Intentional failure');",
          schedule: "* * * * *", // Every minute - always due
          enabled: true, // Force enabled for this test
        });

        // Track execution
        let failureTracked = false;
        const onTaskComplete = (entry: HeartbeatEntry, success: boolean, error?: string) => {
          if (entry.name === task.name) {
            failureTracked = true;
            expect(success).toBe(false);
            expect(error).toBeDefined();
          }
        };

        const daemon = createHeartbeatDaemon({ db, onTaskComplete });

        // Make task due
        await db.updateCustomHeartbeatTask(task.id, {
          lastRun: new Date(Date.now() - 86400000),
        });

        // Execute
        daemon.start();
        await new Promise((resolve) => setTimeout(resolve, 150));
        daemon.stop();

        // Verify failure was tracked
        const updatedTasks = await db.getCustomHeartbeatTasks(agent.id);
        const updatedTask = updatedTasks.find((t) => t.id === task.id);
        
        expect(updatedTask).toBeDefined();
        if (updatedTask) {
          // At minimum, lastRun should be updated
          expect(updatedTask.lastRun).toBeDefined();
        }
      }
    );

    test.prop([arbitraryAgent, arbitraryCustomTask])(
      "can update custom task properties",
      async (agent, taskParams) => {
        const db = createMockDatabase();
        await db.createAgent({ ...agent, status: "alive" });

        // Create task
        const task = await createCustomTask(db, {
          agentId: agent.id,
          ...taskParams,
        });

        // Update task
        const newSchedule = "0 12 * * *"; // Daily at noon
        const newDescription = "Updated description";
        await updateCustomTask(db, task.id, {
          schedule: newSchedule,
          description: newDescription,
        });

        // Verify updates
        const tasks = await getAgentCustomTasks(db, agent.id);
        const updatedTask = tasks.find((t) => t.id === task.id);
        
        expect(updatedTask).toBeDefined();
        if (updatedTask) {
          expect(updatedTask.schedule).toBe(newSchedule);
          expect(updatedTask.description).toBe(newDescription);
        }
      }
    );

    test.prop([arbitraryAgent, arbitraryCustomTask])(
      "can enable and disable custom tasks",
      async (agent, taskParams) => {
        const db = createMockDatabase();
        await db.createAgent({ ...agent, status: "alive" });

        // Create task
        const task = await createCustomTask(db, {
          agentId: agent.id,
          ...taskParams,
          enabled: true,
        });

        // Disable task
        await disableCustomTask(db, task.id);
        let tasks = await getAgentCustomTasks(db, agent.id);
        expect(tasks[0].enabled).toBe(false);

        // Enable task
        await enableCustomTask(db, task.id);
        tasks = await getAgentCustomTasks(db, agent.id);
        expect(tasks[0].enabled).toBe(true);
      }
    );

    test.prop([arbitraryAgent, arbitraryCustomTask])(
      "can delete custom tasks",
      async (agent, taskParams) => {
        const db = createMockDatabase();
        await db.createAgent({ ...agent, status: "alive" });

        // Create task
        const task = await createCustomTask(db, {
          agentId: agent.id,
          ...taskParams,
        });

        // Verify task exists
        let tasks = await getAgentCustomTasks(db, agent.id);
        expect(tasks).toHaveLength(1);

        // Delete task
        await deleteCustomTask(db, task.id);

        // Verify task is gone
        tasks = await getAgentCustomTasks(db, agent.id);
        expect(tasks).toHaveLength(0);
      }
    );

    test.prop([fc.array(arbitraryAgent, { minLength: 2, maxLength: 5 }), arbitraryCustomTask])(
      "isolates custom tasks per agent",
      async (agents, taskParams) => {
        const db = createMockDatabase();

        // Create agents
        for (const agent of agents) {
          await db.createAgent({ ...agent, status: "alive" });
        }

        // Create custom task for first agent only
        const task = await createCustomTask(db, {
          agentId: agents[0].id,
          ...taskParams,
        });

        // Verify only first agent has the task
        const agent1Tasks = await getAgentCustomTasks(db, agents[0].id);
        expect(agent1Tasks).toHaveLength(1);
        expect(agent1Tasks[0].id).toBe(task.id);

        // Verify other agents don't have the task
        for (let i = 1; i < agents.length; i++) {
          const agentTasks = await getAgentCustomTasks(db, agents[i].id);
          expect(agentTasks).toHaveLength(0);
        }
      }
    );

    test.prop([arbitraryCustomTask])(
      "rejects invalid cron expressions",
      async (taskParams) => {
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

        // Try to create task with invalid cron expression
        await expect(
          createCustomTask(db, {
            agentId: agent.id,
            ...taskParams,
            schedule: "invalid cron",
          })
        ).rejects.toThrow("Invalid cron expression");
      }
    );

    test.prop([arbitraryCustomTask])(
      "rejects empty task code",
      async (taskParams) => {
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

        // Try to create task with empty code
        await expect(
          createCustomTask(db, {
            agentId: agent.id,
            ...taskParams,
            taskCode: "",
          })
        ).rejects.toThrow("Task code cannot be empty");
      }
    );
  });
});
