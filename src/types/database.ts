/**
 * Ordo Database Interface
 * Independent database abstraction for the Ordo platform
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Agent data model
 */
export interface Agent {
  id: string;
  publicKey: PublicKey;
  name: string;
  generation: number;
  parentId?: string;
  children: string[];
  balance: number;
  age: number;
  createdAt: Date;
  status: 'alive' | 'dead';
  deathCause?: string;
  fitness: number;
  traits: Record<string, any>;
}

/**
 * Agent turn/conversation record
 */
export interface AgentTurn {
  id: string;
  agentId: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
  tokenCount?: number;
  cost?: number;
  toolCalls?: ToolCallResult[];
}

/**
 * Tool call result
 */
export interface ToolCallResult {
  toolName: string;
  input: any;
  output: any;
  success: boolean;
  error?: string;
  latency: number;
  timestamp: Date;
}

/**
 * Inference cost record
 */
export interface InferenceCostRecord {
  id: string;
  agentId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  timestamp: Date;
}

/**
 * Self-modification record
 */
export interface SelfModification {
  id: string;
  agentId: string;
  type: 'code' | 'config' | 'prompt' | 'tool';
  target: string;
  change: string;
  reason: string;
  timestamp: Date;
  status: 'proposed' | 'testing' | 'implemented' | 'rolled_back';
  testResult?: any;
  performanceImpact?: number;
}

/**
 * Installed tool record
 */
export interface InstalledTool {
  id: string;
  agentId: string;
  name: string;
  type: 'npm' | 'mcp' | 'custom';
  version: string;
  installedAt: Date;
  config?: Record<string, any>;
}

/**
 * Custom heartbeat task record
 */
export interface CustomHeartbeatTask {
  id: string;
  agentId: string;
  name: string;
  description: string;
  schedule: string; // Cron expression
  taskCode: string; // JavaScript code to execute
  enabled: boolean;
  createdAt: Date;
  lastRun?: Date;
  lastSuccess?: boolean;
  lastError?: string;
  executionTimeMs?: number;
}

/**
 * Ordo Database Interface
 * Provides all database operations for the Ordo platform
 */
export interface OrdoDatabase {
  // Agent operations
  getAgent(agentId: string): Promise<Agent | null>;
  updateAgent(agentId: string, updates: Partial<Agent>): Promise<void>;
  createAgent(agent: Agent): Promise<void>;
  deleteAgent(agentId: string): Promise<void>;
  listAgents(filter?: Partial<Agent>): Promise<Agent[]>;

  // Turn/session operations
  getRecentTurns(agentId: string, limit: number): Promise<AgentTurn[]>;
  saveTurn(turn: AgentTurn): Promise<void>;
  getTurnsBySession(sessionId: string): Promise<AgentTurn[]>;

  // Modification tracking
  getRecentModifications(hours: number): Promise<SelfModification[]>;
  saveModification(mod: SelfModification): Promise<void>;
  getModificationById(id: string): Promise<SelfModification | null>;
  updateModification(id: string, updates: Partial<SelfModification>): Promise<void>;

  // Tool management
  getInstalledTools(): InstalledTool[];
  saveInstalledTool(tool: InstalledTool): Promise<void>;
  removeTool(toolId: string): Promise<void>;
  getToolById(toolId: string): Promise<InstalledTool | null>;

  // Custom heartbeat tasks
  getCustomHeartbeatTasks(agentId?: string): Promise<CustomHeartbeatTask[]>;
  saveCustomHeartbeatTask(task: CustomHeartbeatTask): Promise<void>;
  updateCustomHeartbeatTask(taskId: string, updates: Partial<CustomHeartbeatTask>): Promise<void>;
  deleteCustomHeartbeatTask(taskId: string): Promise<void>;

  // Cost tracking
  getInferenceCosts(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<InferenceCostRecord[]>;
  saveInferenceCost(cost: InferenceCostRecord): Promise<void>;
  getTotalCost(agentId: string, startDate: Date, endDate: Date): Promise<number>;

  // Performance metrics
  getAverageLatency(agentId: string, startDate: Date, endDate: Date): Promise<number>;
  getSuccessRate(agentId: string, startDate: Date, endDate: Date): Promise<number>;
  getToolCallStats(
    agentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{ toolName: string; count: number; successRate: number }[]>;

  // Modification history
  getModifications(agentId: string): Promise<SelfModification[]>;

  // Impact metrics
  saveImpactMetrics(metrics: any): Promise<void>;
}
