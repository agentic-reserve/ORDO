/**
 * OpenRouter AI Integration Client
 *
 * Provides access to 200+ AI models through OpenRouter with automatic failover,
 * cost tracking, and model selection capabilities.
 */

import type {
  ChatMessage,
  InferenceOptions,
  InferenceResponse,
  InferenceToolCall,
  TokenUsage,
} from "../types/agent.js";
import { CostTracker, type InferenceCostRecord } from "./cost-tracker.js";
import {
  ModelSelector,
  type TaskRequirements,
  type AgentPreferences,
  type ModelSelectionResult,
} from "./model-selector.js";
import { ulid } from "ulid";

export interface OpenRouterClientOptions {
  apiKey: string;
  apiUrl?: string;
  defaultModel?: string;
  maxTokens?: number;
  siteUrl?: string;
  siteName?: string;
  agentId?: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  pricing: {
    prompt: number; // per million tokens
    completion: number; // per million tokens
  };
  contextLength: number;
  capabilities: string[];
}

export interface InferenceMetrics {
  model: string;
  agentId?: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latency: number;
  timestamp: Date;
}

export class OpenRouterClient {
  private apiKey: string;
  private apiUrl: string;
  private defaultModel: string;
  private maxTokens: number;
  private siteUrl?: string;
  private siteName?: string;
  private agentId?: string;
  private metrics: InferenceMetrics[] = [];
  private costTracker: CostTracker;
  private modelSelector: ModelSelector;

  constructor(options: OpenRouterClientOptions) {
    this.apiKey = options.apiKey;
    this.apiUrl = options.apiUrl || "https://openrouter.ai/api";
    // Default to Moonshot Kimi K2.5 with reasoning support
    this.defaultModel = options.defaultModel || "moonshotai/kimi-k2.5";
    this.maxTokens = options.maxTokens || 4096;
    this.siteUrl = options.siteUrl;
    this.siteName = options.siteName;
    this.agentId = options.agentId;
    this.costTracker = new CostTracker();
    this.modelSelector = new ModelSelector();
  }

  /**
   * Send a chat completion request to OpenRouter
   */
  async chat(
    messages: ChatMessage[],
    options?: InferenceOptions,
  ): Promise<InferenceResponse> {
    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || this.maxTokens;
    const temperature = options?.temperature;
    const tools = options?.tools;
    const reasoning = options?.reasoning;

    const startTime = Date.now();

    try {
      const body: Record<string, unknown> = {
        model,
        messages: messages.map(this.formatMessage),
        max_tokens: maxTokens,
      };

      if (temperature !== undefined) {
        body.temperature = temperature;
      }

      if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = "auto";
      }

      // Enable reasoning for supported models (e.g., moonshotai/kimi-k2.5)
      if (reasoning?.enabled) {
        body.reasoning = { enabled: true };
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      };

      if (this.siteUrl) {
        headers["HTTP-Referer"] = this.siteUrl;
      }

      if (this.siteName) {
        headers["X-Title"] = this.siteName;
      }

      const response = await fetch(`${this.apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenRouter API error (${response.status}): ${errorText}`,
        );
      }

      const data = (await response.json()) as any;
      const latency = Date.now() - startTime;

      const result = this.parseResponse(data, model);

      // Track metrics
      const costCents = this.costTracker.calculateCost(result.usage, model);
      
      this.trackMetrics({
        model,
        promptTokens: result.usage.promptTokens,
        completionTokens: result.usage.completionTokens,
        totalTokens: result.usage.totalTokens,
        cost: costCents,
        latency,
        timestamp: new Date(),
      });

      // Track in cost tracker
      if (this.agentId) {
        this.costTracker.trackInference({
          id: ulid(),
          agentId: this.agentId,
          model,
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
          costCents,
          latencyMs: latency,
          timestamp: new Date().toISOString(),
        });
      }

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      throw new Error(
        `OpenRouter chat error after ${latency}ms: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Stream a chat completion response from OpenRouter
   */
  async *streamChat(
    messages: ChatMessage[],
    options?: InferenceOptions,
  ): AsyncIterableIterator<InferenceChunk> {
    const model = options?.model || this.defaultModel;
    const maxTokens = options?.maxTokens || this.maxTokens;
    const temperature = options?.temperature;
    const tools = options?.tools;

    const body: Record<string, unknown> = {
      model,
      messages: messages.map(this.formatMessage),
      max_tokens: maxTokens,
      stream: true,
    };

    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    if (tools && tools.length > 0) {
      body.tools = tools;
      body.tool_choice = "auto";
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.siteUrl) {
      headers["HTTP-Referer"] = this.siteUrl;
    }

    if (this.siteName) {
      headers["X-Title"] = this.siteName;
    }

    const response = await fetch(`${this.apiUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `OpenRouter streaming error (${response.status}): ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === "data: [DONE]") continue;

          if (trimmed.startsWith("data: ")) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const chunk = this.parseStreamChunk(data);
              if (chunk) {
                yield chunk;
              }
            } catch (error) {
              console.error("Error parsing stream chunk:", error);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get cost tracker instance for advanced analytics
   */
  getCostTracker(): CostTracker {
    return this.costTracker;
  }

  /**
   * Get model selector instance
   */
  getModelSelector(): ModelSelector {
    return this.modelSelector;
  }

  /**
   * Select the most appropriate model based on task requirements
   */
  selectModel(
    requirements: TaskRequirements,
    agentId?: string,
  ): ModelSelectionResult {
    return this.modelSelector.selectModel(requirements, agentId || this.agentId);
  }

  /**
   * Set agent-specific model preferences
   */
  setAgentPreferences(preferences: AgentPreferences): void {
    this.modelSelector.setAgentPreferences(preferences);
  }

  /**
   * Get agent-specific model preferences
   */
  getAgentPreferences(agentId?: string): AgentPreferences | undefined {
    return this.modelSelector.getAgentPreferences(agentId || this.agentId || "");
  }

  /**
   * Get cost analytics for the agent
   */
  getCostAnalytics(agentId?: string) {
    return this.costTracker.getAnalytics(agentId || this.agentId);
  }

  /**
   * Get cost breakdown by model
   */
  getCostByModel(agentId?: string): Map<string, number> {
    return this.costTracker.getCostByModel(agentId || this.agentId);
  }

  /**
   * Get metrics for cost tracking and analytics
   */
  getMetrics(agentId?: string): InferenceMetrics[] {
    if (agentId) {
      return this.metrics.filter((m) => m.agentId === agentId);
    }
    return [...this.metrics];
  }

  /**
   * Clear metrics history
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get total cost across all tracked inferences
   */
  getTotalCost(agentId?: string): number {
    return this.costTracker.getTotalCost(agentId || this.agentId);
  }

  /**
   * Get token usage statistics
   */
  getTokenUsage(agentId?: string): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } {
    return this.costTracker.getTotalTokens(agentId || this.agentId);
  }

  /**
   * Select model for trading tasks
   * Uses DeepSeek for fast, cost-effective trading decisions
   */
  getTradingModel(): string {
    return "deepseek/deepseek-chat-v3.1";
  }

  /**
   * Select model for reasoning tasks
   * Uses Moonshot Kimi K2.5 with extended reasoning support
   */
  getReasoningModel(): string {
    return "moonshotai/kimi-k2.5";
  }

  private formatMessage(msg: ChatMessage): Record<string, unknown> {
    const formatted: Record<string, unknown> = {
      role: msg.role,
      content: msg.content,
    };

    // Preserve reasoning_details from previous assistant messages
    if (msg.reasoning_details) {
      formatted.reasoning_details = msg.reasoning_details;
    }

    return formatted;
  }

  private parseResponse(data: any, model: string): InferenceResponse {
    const choice = data.choices?.[0];

    if (!choice) {
      throw new Error("No completion choice returned from OpenRouter");
    }

    const message = choice.message;
    const usage: TokenUsage = {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    };

    const toolCalls: InferenceToolCall[] | undefined = message.tool_calls?.map(
      (tc: any) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }),
    );

    return {
      model: data.model || model,
      message: {
        role: message.role,
        content: message.content || "",
        reasoning_details: message.reasoning_details,  // Preserve reasoning details
        toolCalls,
      },
      usage,
      finishReason: choice.finish_reason || "stop",
    };
  }

  private parseStreamChunk(data: any): InferenceChunk | null {
    const choice = data.choices?.[0];
    if (!choice) return null;

    const delta = choice.delta;
    if (!delta) return null;

    return {
      id: data.id || "",
      model: data.model || "",
      delta: {
        role: delta.role,
        content: delta.content || "",
        tool_calls: delta.tool_calls,
      },
      finishReason: choice.finish_reason,
    };
  }

  private trackMetrics(metrics: InferenceMetrics): void {
    this.metrics.push(metrics);
  }
}

export interface InferenceChunk {
  id: string;
  model: string;
  delta: {
    role?: string;
    content: string;
    tool_calls?: any[];
  };
  finishReason?: string;
}
