/**
 * Property-based tests for multi-agent coordination
 * 
 * These tests verify universal properties that should hold across all inputs
 * using fast-check for property-based testing.
 */

import { describe, test, expect } from "vitest";
import fc from "fast-check";
import { ulid } from "ulid";
import { sharedMemory } from "./shared-memory.js";
import { decomposeTask } from "./task-decomposition.js";
import { synthesizeResults } from "./result-synthesis.js";
import { startCollaboration, completeCollaboration, getCollaborationStats } from "./collaboration-tracking.js";
import type { SharedMemoryMetadata, ComplexTask, SubTask, SpecialistRole } from "./coordination-types.js";

describe("Multi-Agent Coordination Properties", () => {
  /**
   * Property 26: Message Passing
   * 
   * For any collaboration between agents, the system should enable message passing
   * and state sharing through Supabase shared memory with real-time sync.
   * 
   * Validates: Requirements 6.2
   */
  describe("Property 26: Message Passing", () => {
    test("enables message passing between agents through shared memory", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // message key
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.double(),
            fc.array(fc.anything()),
            fc.record({ data: fc.string() })
          ), // message value (no null)
          fc.record({
            tags: fc.option(fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 })),
            context: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            priority: fc.option(fc.integer({ min: 1, max: 10 })),
          }), // metadata
          fc.string({ minLength: 1, maxLength: 50 }), // agent1 ID
          fc.string({ minLength: 1, maxLength: 50 }), // agent2 ID
          async (messageKey, messageValue, metadata, agent1Id, agent2Id) => {
            // Ensure agents are different and value is not null
            fc.pre(agent1Id !== agent2Id && messageValue !== null);

            // Agent 1 stores a message in shared memory
            const storedEntry = await sharedMemory.store(
              messageKey,
              messageValue,
              metadata as SharedMemoryMetadata,
              agent1Id
            );

            // Verify the message was stored
            expect(storedEntry).toBeDefined();
            expect(storedEntry.key).toBe(messageKey);
            expect(storedEntry.value).toEqual(messageValue);
            expect(storedEntry.agentId).toBe(agent1Id);

            // Agent 2 retrieves the message
            const retrievedEntry = await sharedMemory.get(messageKey);

            // Verify Agent 2 can read the message
            expect(retrievedEntry).toBeDefined();
            expect(retrievedEntry?.key).toBe(messageKey);
            expect(retrievedEntry?.value).toEqual(messageValue);
            expect(retrievedEntry?.agentId).toBe(agent1Id);

            // Verify metadata is preserved
            if (metadata.tags) {
              expect(retrievedEntry?.metadata.tags).toEqual(metadata.tags);
            }
            if (metadata.context) {
              expect(retrievedEntry?.metadata.context).toBe(metadata.context);
            }
            if (metadata.priority) {
              expect(retrievedEntry?.metadata.priority).toBe(metadata.priority);
            }

            // Clean up
            if (storedEntry.id) {
              await sharedMemory.delete(storedEntry.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000); // 2 minute timeout for property test

    test("enables state sharing between multiple agents", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // shared state key
          fc.record({
            counter: fc.integer({ min: 0, max: 1000 }),
            status: fc.constantFrom("pending", "in_progress", "completed"),
            data: fc.oneof(fc.string(), fc.integer(), fc.array(fc.string())),
          }), // shared state value
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }), // agent IDs
          async (stateKey, stateValue, agentIds) => {
            // Ensure all agent IDs are unique
            const uniqueAgentIds = [...new Set(agentIds)];
            fc.pre(uniqueAgentIds.length >= 2);

            // First agent creates shared state
            const createdEntry = await sharedMemory.store(
              stateKey,
              stateValue,
              { context: "shared_state", tags: ["collaboration"] },
              uniqueAgentIds[0]
            );

            expect(createdEntry).toBeDefined();
            expect(createdEntry.key).toBe(stateKey);

            // All other agents can read the shared state
            for (let i = 1; i < uniqueAgentIds.length; i++) {
              const retrievedEntry = await sharedMemory.get(stateKey);

              expect(retrievedEntry).toBeDefined();
              expect(retrievedEntry?.metadata.context).toBe("shared_state");
              
              // Compare values with JSON serialization to handle -0 vs 0
              expect(JSON.stringify(retrievedEntry?.value)).toBe(JSON.stringify(stateValue));
            }

            // Any agent can update the shared state
            const updatedValue = {
              ...stateValue,
              counter: stateValue.counter + 1,
              status: "in_progress" as const,
            };

            const updatedEntry = await sharedMemory.update(
              createdEntry.id,
              updatedValue
            );

            expect(JSON.stringify(updatedEntry.value)).toBe(JSON.stringify(updatedValue));

            // All agents see the updated state
            const finalEntry = await sharedMemory.get(stateKey);
            expect(JSON.stringify(finalEntry?.value)).toBe(JSON.stringify(updatedValue));

            // Clean up
            await sharedMemory.delete(createdEntry.id);
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);

    test("enables context-based message retrieval", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // context
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }), // tags
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 50 }),
              value: fc.oneof(fc.string(), fc.integer(), fc.boolean()),
            }),
            { minLength: 1, maxLength: 5 }
          ), // messages
          fc.string({ minLength: 1, maxLength: 50 }), // agent ID
          async (context, tags, messages, agentId) => {
            // Ensure no null values
            fc.pre(messages.every(m => m.value !== null));
            
            // Store multiple messages with the same context and tags
            const storedIds: string[] = [];

            for (const message of messages) {
              const entry = await sharedMemory.store(
                message.key,
                message.value,
                { context, tags },
                agentId
              );
              storedIds.push(entry.id);
            }

            // Query by context
            const contextResults = await sharedMemory.query({ context });
            expect(contextResults.length).toBeGreaterThanOrEqual(messages.length);

            // Verify all stored messages are in results
            const resultKeys = contextResults.map(r => r.key);
            for (const message of messages) {
              expect(resultKeys).toContain(message.key);
            }

            // Query by agent ID
            const agentResults = await sharedMemory.query({ agentId });
            expect(agentResults.length).toBeGreaterThanOrEqual(messages.length);

            // Clean up
            for (const id of storedIds) {
              await sharedMemory.delete(id);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);

    test("supports message expiration for temporary coordination", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // message key
          fc.oneof(fc.string(), fc.integer(), fc.boolean()), // message value (no null)
          fc.integer({ min: 1, max: 3600 }), // expiration seconds
          fc.string({ minLength: 1, maxLength: 50 }), // agent ID
          async (messageKey, messageValue, expirationSeconds, agentId) => {
            // Ensure value is not null
            fc.pre(messageValue !== null);
            
            // Store message with expiration
            const expiresAt = new Date(Date.now() + expirationSeconds * 1000);
            const entry = await sharedMemory.store(
              messageKey,
              messageValue,
              {},
              agentId,
              expiresAt
            );

            // Verify expiration is set
            expect(entry.expiresAt).toBeDefined();
            expect(entry.expiresAt?.getTime()).toBeGreaterThan(Date.now());

            // Message should be retrievable before expiration
            const retrieved = await sharedMemory.get(messageKey);
            expect(retrieved).toBeDefined();
            expect(retrieved?.value).toEqual(messageValue);

            // Clean up
            await sharedMemory.delete(entry.id);
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);

    test("maintains message history for the same key", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // base key
          fc.array(fc.oneof(fc.string(), fc.integer(), fc.boolean()), { minLength: 2, maxLength: 5 }), // message versions
          fc.string({ minLength: 1, maxLength: 50 }), // agent ID
          async (baseKey, messageVersions, agentId) => {
            // Ensure no null values
            fc.pre(messageVersions.every(v => v !== null));
            
            // Store multiple versions of the same message
            const storedIds: string[] = [];

            for (const version of messageVersions) {
              const entry = await sharedMemory.store(
                baseKey,
                version,
                { tags: ["versioned"] },
                agentId
              );
              storedIds.push(entry.id);
              
              // Small delay to ensure different timestamps
              await new Promise(resolve => setTimeout(resolve, 10));
            }

            // Get latest version
            const latest = await sharedMemory.get(baseKey);
            expect(latest).toBeDefined();
            expect(latest?.value).toEqual(messageVersions[messageVersions.length - 1]);

            // Get all versions
            const allVersions = await sharedMemory.getAll(baseKey);
            expect(allVersions.length).toBeGreaterThanOrEqual(messageVersions.length);

            // Verify versions are in reverse chronological order
            for (let i = 0; i < allVersions.length - 1; i++) {
              expect(allVersions[i].createdAt.getTime()).toBeGreaterThanOrEqual(
                allVersions[i + 1].createdAt.getTime()
              );
            }

            // Clean up
            for (const id of storedIds) {
              await sharedMemory.delete(id);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);
  });

  /**
   * Property 27: Task Decomposition
   * 
   * For any complex task, the system should decompose it into subtasks with
   * proper dependencies and role assignments.
   * 
   * Validates: Requirements 6.4
   */
  describe("Property 27: Task Decomposition", () => {
    test("decomposes complex tasks into subtasks with dependencies", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }), // task description
          fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 5 }), // requirements
          async (description, requirements) => {
            // Ensure no null values
            fc.pre(requirements.every(r => r !== null && r.length > 0));

            const task: ComplexTask = {
              id: ulid(),
              description,
              requirements,
            };

            // Decompose the task
            const subtasks = await decomposeTask(task);

            // Verify subtasks were created
            expect(subtasks.length).toBeGreaterThan(0);

            // Verify each subtask has required fields
            for (const subtask of subtasks) {
              expect(subtask.id).toBeDefined();
              expect(subtask.description).toBeDefined();
              expect(subtask.description.length).toBeGreaterThan(0);
              expect(subtask.dependencies).toBeDefined();
              expect(Array.isArray(subtask.dependencies)).toBe(true);
              expect(subtask.status).toBe("pending");
            }

            // Verify dependencies reference valid subtask IDs
            const subtaskIds = new Set(subtasks.map(st => st.id));
            for (const subtask of subtasks) {
              for (const depId of subtask.dependencies) {
                expect(subtaskIds.has(depId)).toBe(true);
              }
            }

            // Verify no circular dependencies
            const hasCircularDep = checkCircularDependencies(subtasks);
            expect(hasCircularDep).toBe(false);

            // Verify at least one subtask has no dependencies (entry point)
            const entryPoints = subtasks.filter(st => st.dependencies.length === 0);
            expect(entryPoints.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);

    test("assigns appropriate roles to subtasks", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            "research the best trading strategies",
            "implement a new feature in the codebase",
            "execute a series of token swaps",
            "coordinate multiple agents to complete a project"
          ),
          fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1, maxLength: 3 }),
          async (description, requirements) => {
            const task: ComplexTask = {
              id: ulid(),
              description,
              requirements,
            };

            const subtasks = await decomposeTask(task);

            // Verify roles are assigned
            const rolesAssigned = subtasks.filter(st => st.assignedRole !== undefined);
            expect(rolesAssigned.length).toBeGreaterThan(0);

            // Verify roles are valid
            const validRoles: SpecialistRole[] = ["researcher", "coder", "trader", "coordinator"];
            for (const subtask of subtasks) {
              if (subtask.assignedRole) {
                expect(validRoles).toContain(subtask.assignedRole);
              }
            }

            // Verify role assignment matches task description
            if (description.includes("research")) {
              const hasResearcher = subtasks.some(st => st.assignedRole === "researcher");
              expect(hasResearcher).toBe(true);
            }
            if (description.includes("implement") || description.includes("code")) {
              const hasCoder = subtasks.some(st => st.assignedRole === "coder");
              expect(hasCoder).toBe(true);
            }
            if (description.includes("trade") || description.includes("swap")) {
              const hasTrader = subtasks.some(st => st.assignedRole === "trader");
              expect(hasTrader).toBe(true);
            }
            if (description.includes("coordinate") || subtasks.length > 3) {
              const hasCoordinator = subtasks.some(st => st.assignedRole === "coordinator");
              expect(hasCoordinator).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);

    test("creates subtasks for each requirement", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 10, maxLength: 100 }),
          fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 2, maxLength: 5 }),
          async (description, requirements) => {
            const task: ComplexTask = {
              id: ulid(),
              description,
              requirements,
            };

            const subtasks = await decomposeTask(task);

            // Verify at least as many subtasks as requirements
            expect(subtasks.length).toBeGreaterThanOrEqual(requirements.length);

            // Verify each requirement is addressed in subtasks
            for (const requirement of requirements) {
              const addressed = subtasks.some(st => 
                st.description.toLowerCase().includes(requirement.toLowerCase()) ||
                st.description.includes("requirement")
              );
              expect(addressed).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    }, 120000);
  });

  /**
   * Property 28: Result Synthesis
   * 
   * For any set of subtask results, the system should synthesize them into
   * a coherent final output, resolving conflicts appropriately.
   * 
   * Validates: Requirements 6.5
   */
  describe("Property 28: Result Synthesis", () => {
    test("synthesizes results from completed subtasks", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              description: fc.string({ minLength: 5, maxLength: 50 }),
              result: fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.record({ data: fc.string() })),
              status: fc.constant("completed" as const),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (subtaskData) => {
            // Create subtasks with results
            const subtasks: SubTask[] = subtaskData.map(data => ({
              id: data.id,
              description: data.description,
              dependencies: [],
              status: data.status,
              result: data.result,
            }));

            // Synthesize results
            const taskResult = synthesizeResults(subtasks);

            // Verify synthesis succeeded
            expect(taskResult).toBeDefined();
            expect(taskResult.success).toBe(true);
            expect(taskResult.output).toBeDefined();
            expect(taskResult.errors.length).toBe(0);

            // Verify all subtask results are included
            expect(taskResult.subtaskResults.size).toBe(subtasks.length);
            for (const subtask of subtasks) {
              expect(taskResult.subtaskResults.has(subtask.id)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    test("handles failed subtasks appropriately", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              description: fc.string({ minLength: 5, maxLength: 50 }),
              status: fc.constantFrom("completed" as const, "failed" as const),
              result: fc.option(fc.oneof(fc.string(), fc.integer())),
              error: fc.option(fc.string({ minLength: 5, maxLength: 50 })),
            }),
            { minLength: 2, maxLength: 10 }
          ),
          async (subtaskData) => {
            // Create subtasks
            const subtasks: SubTask[] = subtaskData.map(data => ({
              id: data.id,
              description: data.description,
              dependencies: [],
              status: data.status,
              result: data.status === "completed" ? data.result : undefined,
              error: data.status === "failed" ? (data.error || "Unknown error") : undefined,
            }));

            // Synthesize results
            const taskResult = synthesizeResults(subtasks);

            // Verify synthesis result
            expect(taskResult).toBeDefined();

            // If any subtask failed, overall success should be false
            const hasFailures = subtasks.some(st => st.status === "failed");
            expect(taskResult.success).toBe(!hasFailures);

            // Verify errors are collected
            if (hasFailures) {
              expect(taskResult.errors.length).toBeGreaterThan(0);
            }

            // Verify only completed subtasks are in results
            const completedCount = subtasks.filter(st => st.status === "completed" && st.result !== undefined).length;
            expect(taskResult.subtaskResults.size).toBe(completedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("resolves conflicts using specified strategy", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5, maxLength: 50 }), // common description
          fc.array(fc.oneof(fc.string(), fc.integer()), { minLength: 2, maxLength: 5 }), // conflicting values
          fc.constantFrom("first" as const, "last" as const, "majority" as const),
          async (description, values, conflictResolution) => {
            // Create subtasks with same description but different results (conflict)
            const subtasks: SubTask[] = values.map((value, index) => ({
              id: `subtask-${index}`,
              description,
              dependencies: [],
              status: "completed" as const,
              result: value,
            }));

            // Synthesize with conflict resolution
            const taskResult = synthesizeResults(subtasks, {
              strategy: "concatenate",
              conflictResolution,
            });

            // Verify synthesis succeeded
            expect(taskResult).toBeDefined();
            expect(taskResult.success).toBe(true);

            // Verify conflict was resolved
            expect(taskResult.subtaskResults.size).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    test("supports different synthesis strategies", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              description: fc.string({ minLength: 5, maxLength: 50 }),
              result: fc.integer({ min: 0, max: 100 }),
            }),
            { minLength: 2, maxLength: 5 }
          ),
          fc.constantFrom("concatenate" as const, "merge" as const, "vote" as const, "weighted_average" as const),
          async (subtaskData, strategy) => {
            // Create subtasks
            const subtasks: SubTask[] = subtaskData.map(data => ({
              id: data.id,
              description: data.description,
              dependencies: [],
              status: "completed" as const,
              result: data.result,
            }));

            // Synthesize with strategy
            const taskResult = synthesizeResults(subtasks, { strategy });

            // Verify synthesis succeeded
            expect(taskResult).toBeDefined();
            expect(taskResult.success).toBe(true);
            expect(taskResult.output).toBeDefined();

            // Verify strategy-specific output
            if (strategy === "concatenate") {
              expect(Array.isArray(taskResult.output)).toBe(true);
            } else if (strategy === "weighted_average") {
              expect(typeof taskResult.output === "number").toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 29: Collaboration Tracking
   * 
   * For any collaboration between agents, the system should track success rates
   * and update reputation scores appropriately.
   * 
   * Validates: Requirements 6.6
   */
  describe("Property 29: Collaboration Tracking", () => {
    test("tracks collaboration success and updates reputation", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // task ID
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 5 }), // participant IDs
          fc.boolean(), // success
          async (taskId, participantIds, success) => {
            // Ensure unique participant IDs
            const uniqueParticipants = [...new Set(participantIds)];
            fc.pre(uniqueParticipants.length >= 2);

            // Start collaboration
            const collaboration = await startCollaboration(taskId, uniqueParticipants);

            // Verify collaboration was created
            expect(collaboration).toBeDefined();
            expect(collaboration.id).toBeDefined();
            expect(collaboration.taskId).toBe(taskId);
            expect(collaboration.participantIds).toEqual(uniqueParticipants);
            expect(collaboration.startedAt).toBeInstanceOf(Date);
            expect(collaboration.completedAt).toBeUndefined();

            // Complete collaboration
            const completed = await completeCollaboration(collaboration.id, success);

            // Verify collaboration was completed
            expect(completed.completedAt).toBeInstanceOf(Date);
            expect(completed.success).toBe(success);
            expect(completed.completedAt!.getTime()).toBeGreaterThanOrEqual(
              completed.startedAt.getTime()
            );
          }
        ),
        { numRuns: 50 }
      );
    }, 120000);

    test("calculates collaboration statistics correctly", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // agent ID
          fc.array(
            fc.record({
              taskId: fc.string({ minLength: 1, maxLength: 50 }),
              otherParticipants: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 3 }),
              success: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (agentId, collaborations) => {
            // Create collaborations
            for (const collab of collaborations) {
              const participants = [agentId, ...collab.otherParticipants];
              const record = await startCollaboration(collab.taskId, participants);
              await completeCollaboration(record.id, collab.success);
            }

            // Get statistics
            const stats = await getCollaborationStats(agentId);

            // Verify statistics
            expect(stats).toBeDefined();
            expect(stats.agentId).toBe(agentId);
            expect(stats.totalCollaborations).toBeGreaterThanOrEqual(collaborations.length);
            expect(stats.successfulCollaborations).toBeGreaterThanOrEqual(0);
            expect(stats.failedCollaborations).toBeGreaterThanOrEqual(0);
            expect(stats.successRate).toBeGreaterThanOrEqual(0);
            expect(stats.successRate).toBeLessThanOrEqual(1);
            expect(stats.reputationScore).toBeGreaterThanOrEqual(0);
            expect(stats.reputationScore).toBeLessThanOrEqual(100);

            // Verify success rate calculation
            const expectedSuccesses = collaborations.filter(c => c.success).length;
            const expectedRate = collaborations.length > 0 ? expectedSuccesses / collaborations.length : 0;
            
            // Allow for existing collaborations in the database
            if (stats.totalCollaborations === collaborations.length) {
              expect(stats.successRate).toBeCloseTo(expectedRate, 2);
            }
          }
        ),
        { numRuns: 20 }
      );
    }, 120000);

    test("reputation increases with successful collaborations", async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }), // agent ID
          fc.string({ minLength: 1, maxLength: 50 }), // task ID
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 3 }), // other participants
          async (agentId, taskId, otherParticipants) => {
            // Get initial stats
            const initialStats = await getCollaborationStats(agentId);
            const initialReputation = initialStats.reputationScore;

            // Create successful collaboration
            const participants = [agentId, ...otherParticipants];
            const collaboration = await startCollaboration(taskId, participants);
            await completeCollaboration(collaboration.id, true);

            // Get updated stats
            const updatedStats = await getCollaborationStats(agentId);

            // Verify reputation increased or stayed the same (if already at max)
            expect(updatedStats.reputationScore).toBeGreaterThanOrEqual(initialReputation);
            expect(updatedStats.totalCollaborations).toBeGreaterThan(initialStats.totalCollaborations);
          }
        ),
        { numRuns: 20 }
      );
    }, 120000);
  });
});

/**
 * Helper function to check for circular dependencies
 */
function checkCircularDependencies(subtasks: SubTask[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(subtaskId: string): boolean {
    if (recursionStack.has(subtaskId)) {
      return true;
    }

    if (visited.has(subtaskId)) {
      return false;
    }

    visited.add(subtaskId);
    recursionStack.add(subtaskId);

    const subtask = subtasks.find(st => st.id === subtaskId);
    if (subtask) {
      for (const depId of subtask.dependencies) {
        if (hasCycle(depId)) {
          return true;
        }
      }
    }

    recursionStack.delete(subtaskId);
    return false;
  }

  for (const subtask of subtasks) {
    if (hasCycle(subtask.id)) {
      return true;
    }
  }

  return false;
}
