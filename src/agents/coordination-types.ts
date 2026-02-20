/**
 * Type definitions for multi-agent coordination
 */

/**
 * Metadata for shared memory entries
 */
export interface SharedMemoryMetadata {
  tags?: string[];
  context?: string;
  priority?: number;
  source?: string;
  [key: string]: unknown;
}

/**
 * Shared memory entry
 */
export interface SharedMemoryEntry {
  id: string;
  key: string;
  value: unknown;
  metadata: SharedMemoryMetadata;
  agentId?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

/**
 * Query options for shared memory
 */
export interface SharedMemoryQueryOptions {
  context?: string;
  tags?: string[];
  agentId?: string;
  limit?: number;
  orderBy?: "created_at" | "updated_at";
  orderDirection?: "asc" | "desc";
}

/**
 * Subscription callback for real-time updates
 */
export type SharedMemorySubscriptionCallback = (entry: SharedMemoryEntry) => void;

/**
 * Subscription handle
 */
export interface SharedMemorySubscription {
  unsubscribe: () => void;
}

/**
 * Agent specialization roles
 */
export type SpecialistRole = "researcher" | "coder" | "trader" | "coordinator";

/**
 * Subtask for task decomposition
 */
export interface SubTask {
  id: string;
  description: string;
  dependencies: string[];  // IDs of subtasks that must complete first
  assignedRole?: SpecialistRole;
  assignedAgentId?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: unknown;
  error?: string;
}

/**
 * Complex task for decomposition
 */
export interface ComplexTask {
  id: string;
  description: string;
  requirements: string[];
  constraints?: string[];
  expectedOutput?: string;
}

/**
 * Task result
 */
export interface TaskResult {
  taskId: string;
  success: boolean;
  output: unknown;
  subtaskResults: Map<string, unknown>;
  errors: string[];
  completedAt: Date;
}

/**
 * Agent swarm for coordination
 */
export interface AgentSwarm {
  coordinatorId: string;
  specialistIds: string[];
  sharedMemorySpace: string;  // Namespace for this swarm's shared memory
  communicationProtocol: "message_passing" | "shared_state";
}

/**
 * Collaboration record
 */
export interface CollaborationRecord {
  id: string;
  taskId: string;
  participantIds: string[];
  startedAt: Date;
  completedAt?: Date;
  success: boolean;
  outcome?: unknown;
}

/**
 * Agent capabilities for role assignment
 */
export interface AgentCapabilities {
  skills: string[];
  tools: string[];
  experience: number;
  fitness: number;
}
