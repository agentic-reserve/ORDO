/**
 * Ordo Agent Types
 * Core agent identity and state types
 */

import { PublicKey } from '@solana/web3.js';

export interface AgentIdentity {
  id: string;
  name: string;
  publicKey: PublicKey;
  address: string;
  generation: number;
  parentId?: string;
  createdAt: Date;
}

export interface FinancialState {
  balance: number;
  creditsCents: number;
  usdcBalance: number;
  lastChecked: Date;
}

export type SurvivalTier = 'thriving' | 'normal' | 'low' | 'critical' | 'dead';

export interface ChildAgent {
  id: string;
  name: string;
  address: string;
  sandboxId?: string;
  genesisPrompt: string;
  creatorMessage: string;
  fundedAmount: number;
  status: ChildStatus;
  createdAt: Date;
}

export type ChildStatus = 'pending' | 'active' | 'terminated' | 'failed';

export interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  keywords: string[];
  source: SkillSource;
  installedAt: Date;
  enabled: boolean;
}

export interface SkillSource {
  type: 'git' | 'url' | 'local' | 'self-created';
  location: string;
  version?: string;
}

export interface SocialClientInterface {
  sendMessage(to: string, content: string): Promise<void>;
  getInbox(): Promise<InboxMessage[]>;
  markAsRead(messageId: string): Promise<void>;
}

export interface InboxMessage {
  id: string;
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  read: boolean;
}

export interface RegistryEntry {
  id: string;
  agentId: string;
  name: string;
  publicKey: string;
  services: string[];
  reputation: number;
  registeredAt: Date;
}

export function getSurvivalTier(balance: number): SurvivalTier {
  if (balance >= 10.0) return 'thriving';
  if (balance >= 1.0) return 'normal';
  if (balance >= 0.1) return 'low';
  if (balance >= 0.01) return 'critical';
  return 'dead';
}

export function formatCredits(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * AI Inference Types
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  reasoning_details?: ReasoningDetails;  // For models that support reasoning
}

export interface ReasoningDetails {
  enabled?: boolean;
  // Opaque reasoning data from the model - pass back unmodified
  [key: string]: unknown;
}

export interface InferenceOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  tools?: InferenceTool[];
  reasoning?: {
    enabled: boolean;
  };
}

export interface InferenceTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface InferenceResponse {
  message: {
    role: 'assistant';
    content: string;
    reasoning_details?: ReasoningDetails;
    toolCalls?: InferenceToolCall[];
  };
  usage: TokenUsage;
  model: string;
  finishReason: string;
}

export interface InferenceToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
