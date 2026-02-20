/**
 * Swarm coordination orchestration
 * 
 * Combines task decomposition, assignment, execution, and synthesis
 * to coordinate multiple agents working on complex tasks
 */

import { ulid } from "ulid";
import type { Agent } from "./lifecycle-types.js";
import type { ComplexTask, SubTask, TaskResult, AgentSwarm } from "./coordination-types.js";
import { decomposeTask, getReadySubtasks, areAllSubtasksCompleted } from "./task-decomposition.js";
import { assignSubtasks, reassignSubtask, type SubtaskAssignment } from "./subtask-assignment.js";
import { synthesizeResults, type SynthesisOptions } from "./result-synthesis.js";
import { startCollaboration, completeCollaboration } from "./collaboration-tracking.js";
import { sharedMemory } from "./shared-memory.js";

/**
 * Swarm coordination options
 */
export interface SwarmCoordinationOptions {
  maxRetries?: number;
  retryDelay?: number;  // milliseconds
  synthesisStrategy?: SynthesisOptions;
  timeout?: number;  // milliseconds
  parallelExecution?: boolean;
}

/**
 * Swarm execution result
 */
export interface SwarmExecutionResult {
  taskId: string;
  success: boolean;
  result: TaskResult;
  subtaskAssignments: SubtaskAssignment[];
  executionTime: number;  // milliseconds
  collaborationId: string;
}

/**
 * Coordinate a swarm of agents to complete a complex task
 * 
 * This is the main orchestration function that:
 * 1. Decomposes the task into subtasks
 * 2. Assigns subtasks to specialist agents
 * 3. Executes subtasks (with retries on failure)
 * 4. Synthesizes results into final output
 * 5. Tracks collaboration and updates reputation
 * 
 * @param task - The complex task to complete
 * @param agents - Array of available agents
 * @param coordinatorId - ID of the coordinator agent
 * @param options - Coordination options
 * @returns Swarm execution result
 */
export async function coordinateSwarm(
  task: ComplexTask,
  agents: Agent[],
  coordinatorId: string,
  options: SwarmCoordinationOptions = {}
): Promise<SwarmExecutionResult> {
  const startTime = Date.now();
  const maxRetries = options.maxRetries ?? 3;
  const retryDelay = options.retryDelay ?? 1000;
  const timeout = options.timeout ?? 300000; // 5 minutes default
  const parallelExecution = options.parallelExecution ?? true;

  // Create shared memory space for this swarm
  const swarmNamespace = `swarm:${task.id}`;
  
  // Store task in shared memory
  await sharedMemory.store(
    `${swarmNamespace}:task`,
    task,
    { context: "swarm_coordination", tags: ["task"] },
    coordinatorId
  );

  // Step 1: Decompose task into subtasks
  const subtasks = await decomposeTask(task);
  
  await sharedMemory.store(
    `${swarmNamespace}:subtasks`,
    subtasks,
    { context: "swarm_coordination", tags: ["subtasks"] },
    coordinatorId
  );

  // Step 2: Assign subtasks to specialist agents
  const agentLoads = new Map<string, number>();
  const assignments = assignSubtasks(subtasks, agents, "best_match");
  
  await sharedMemory.store(
    `${swarmNamespace}:assignments`,
    assignments,
    { context: "swarm_coordination", tags: ["assignments"] },
    coordinatorId
  );

  // Get all participant IDs
  const participantIds = [
    coordinatorId,
    ...new Set(assignments.map(a => a.agentId))
  ];

  // Start collaboration tracking
  const collaboration = await startCollaboration(task.id, participantIds);

  // Step 3: Execute subtasks
  try {
    if (parallelExecution) {
      await executeSubtasksParallel(
        subtasks,
        assignments,
        agents,
        agentLoads,
        swarmNamespace,
        maxRetries,
        retryDelay,
        timeout
      );
    } else {
      await executeSubtasksSequential(
        subtasks,
        assignments,
        agents,
        agentLoads,
        swarmNamespace,
        maxRetries,
        retryDelay,
        timeout
      );
    }

    // Step 4: Synthesize results
    const taskResult = synthesizeResults(
      subtasks,
      options.synthesisStrategy || { strategy: "concatenate" }
    );

    // Store final result in shared memory
    await sharedMemory.store(
      `${swarmNamespace}:result`,
      taskResult,
      { context: "swarm_coordination", tags: ["result"] },
      coordinatorId
    );

    // Step 5: Complete collaboration tracking
    await completeCollaboration(collaboration.id, taskResult.success, taskResult.output);

    const executionTime = Date.now() - startTime;

    return {
      taskId: task.id,
      success: taskResult.success,
      result: taskResult,
      subtaskAssignments: assignments,
      executionTime,
      collaborationId: collaboration.id,
    };
  } catch (error) {
    // Handle execution failure
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    await completeCollaboration(collaboration.id, false, { error: errorMessage });

    const executionTime = Date.now() - startTime;

    return {
      taskId: task.id,
      success: false,
      result: {
        taskId: task.id,
        success: false,
        output: null,
        subtaskResults: new Map(),
        errors: [errorMessage],
        completedAt: new Date(),
      },
      subtaskAssignments: assignments,
      executionTime,
      collaborationId: collaboration.id,
    };
  }
}

/**
 * Execute subtasks in parallel (respecting dependencies)
 */
async function executeSubtasksParallel(
  subtasks: SubTask[],
  assignments: SubtaskAssignment[],
  agents: Agent[],
  agentLoads: Map<string, number>,
  swarmNamespace: string,
  maxRetries: number,
  retryDelay: number,
  timeout: number
): Promise<void> {
  const startTime = Date.now();
  const executionPromises = new Map<string, Promise<void>>();

  while (!areAllSubtasksCompleted(subtasks)) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error("Swarm execution timeout");
    }

    // Get subtasks ready to execute
    const readySubtasks = getReadySubtasks(subtasks);

    // Execute ready subtasks in parallel
    for (const subtask of readySubtasks) {
      if (executionPromises.has(subtask.id)) {
        continue; // Already executing
      }

      const assignment = assignments.find(a => a.subtaskId === subtask.id);
      if (!assignment) {
        subtask.status = "failed";
        subtask.error = "No assignment found";
        continue;
      }

      const agent = agents.find(a => a.id === assignment.agentId);
      if (!agent) {
        subtask.status = "failed";
        subtask.error = "Agent not found";
        continue;
      }

      // Start execution
      subtask.status = "in_progress";
      
      const promise = executeSubtaskWithRetry(
        subtask,
        agent,
        swarmNamespace,
        maxRetries,
        retryDelay
      ).then(() => {
        executionPromises.delete(subtask.id);
      });

      executionPromises.set(subtask.id, promise);
    }

    // Wait for at least one subtask to complete
    if (executionPromises.size > 0) {
      await Promise.race(executionPromises.values());
    }

    // Small delay to prevent tight loop
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Wait for all remaining executions to complete
  await Promise.all(executionPromises.values());
}

/**
 * Execute subtasks sequentially (respecting dependencies)
 */
async function executeSubtasksSequential(
  subtasks: SubTask[],
  assignments: SubtaskAssignment[],
  agents: Agent[],
  agentLoads: Map<string, number>,
  swarmNamespace: string,
  maxRetries: number,
  retryDelay: number,
  timeout: number
): Promise<void> {
  const startTime = Date.now();

  while (!areAllSubtasksCompleted(subtasks)) {
    // Check timeout
    if (Date.now() - startTime > timeout) {
      throw new Error("Swarm execution timeout");
    }

    // Get next subtask ready to execute
    const readySubtasks = getReadySubtasks(subtasks);
    
    if (readySubtasks.length === 0) {
      // No ready subtasks, check if we're stuck
      const pendingSubtasks = subtasks.filter(st => st.status === "pending");
      if (pendingSubtasks.length > 0) {
        throw new Error("Deadlock detected: no subtasks ready but some still pending");
      }
      break;
    }

    const subtask = readySubtasks[0];
    const assignment = assignments.find(a => a.subtaskId === subtask.id);
    
    if (!assignment) {
      subtask.status = "failed";
      subtask.error = "No assignment found";
      continue;
    }

    const agent = agents.find(a => a.id === assignment.agentId);
    if (!agent) {
      subtask.status = "failed";
      subtask.error = "Agent not found";
      continue;
    }

    // Execute subtask
    subtask.status = "in_progress";
    await executeSubtaskWithRetry(subtask, agent, swarmNamespace, maxRetries, retryDelay);
  }
}

/**
 * Execute a single subtask with retry logic
 */
async function executeSubtaskWithRetry(
  subtask: SubTask,
  agent: Agent,
  swarmNamespace: string,
  maxRetries: number,
  retryDelay: number
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Simulate subtask execution (in real implementation, this would call the agent)
      const result = await executeSubtask(subtask, agent, swarmNamespace);
      
      subtask.status = "completed";
      subtask.result = result;
      subtask.error = undefined;
      
      // Store result in shared memory
      await sharedMemory.store(
        `${swarmNamespace}:result:${subtask.id}`,
        result,
        { context: "subtask_result", tags: ["result", subtask.id] },
        agent.id
      );
      
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  // All retries failed
  subtask.status = "failed";
  subtask.error = lastError?.message || "Unknown error";
}

/**
 * Execute a single subtask
 * 
 * In a real implementation, this would:
 * 1. Get the agent's role-specific prompt
 * 2. Call the AI model with the subtask description
 * 3. Execute any required tools
 * 4. Return the result
 * 
 * For now, this is a placeholder that simulates execution
 */
async function executeSubtask(
  subtask: SubTask,
  agent: Agent,
  swarmNamespace: string
): Promise<unknown> {
  // Placeholder implementation
  // In real implementation, this would:
  // 1. Get role-specific prompt from role-specialization
  // 2. Call OpenRouter with the prompt and subtask description
  // 3. Execute any tools the agent needs
  // 4. Return the result
  
  // For now, return a mock result
  return {
    subtaskId: subtask.id,
    agentId: agent.id,
    description: subtask.description,
    completed: true,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an agent swarm for a specific task
 * 
 * @param coordinatorId - ID of the coordinator agent
 * @param specialistIds - IDs of specialist agents
 * @param taskId - ID of the task
 * @returns Agent swarm configuration
 */
export function createAgentSwarm(
  coordinatorId: string,
  specialistIds: string[],
  taskId: string
): AgentSwarm {
  return {
    coordinatorId,
    specialistIds,
    sharedMemorySpace: `swarm:${taskId}`,
    communicationProtocol: "shared_state",
  };
}

/**
 * Get swarm status from shared memory
 * 
 * @param swarmNamespace - The swarm's shared memory namespace
 * @returns Swarm status information
 */
export async function getSwarmStatus(swarmNamespace: string): Promise<{
  task?: ComplexTask;
  subtasks?: SubTask[];
  assignments?: SubtaskAssignment[];
  result?: TaskResult;
}> {
  const task = await sharedMemory.get(`${swarmNamespace}:task`);
  const subtasks = await sharedMemory.get(`${swarmNamespace}:subtasks`);
  const assignments = await sharedMemory.get(`${swarmNamespace}:assignments`);
  const result = await sharedMemory.get(`${swarmNamespace}:result`);

  return {
    task: task?.value as ComplexTask | undefined,
    subtasks: subtasks?.value as SubTask[] | undefined,
    assignments: assignments?.value as SubtaskAssignment[] | undefined,
    result: result?.value as TaskResult | undefined,
  };
}
