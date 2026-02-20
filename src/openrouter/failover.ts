/**
 * Model Failover System
 *
 * Provides automatic failover to alternative models when primary models
 * are unavailable or encounter errors.
 */

import type { ChatMessage, InferenceOptions, InferenceResponse } from "../types/agent.js";
import type { OpenRouterClient } from "./client.js";

export interface ModelCapability {
  speed: "fast" | "medium" | "slow";
  quality: "high" | "medium" | "low";
  cost: "expensive" | "moderate" | "cheap";
  contextLength: number;
}

export interface ModelConfig {
  id: string;
  capabilities: ModelCapability;
  priority: number; // Lower number = higher priority
}

export interface FailoverEvent {
  timestamp: Date;
  primaryModel: string;
  fallbackModel: string;
  reason: string;
  success: boolean;
  latency: number;
}

export interface FailoverStats {
  totalFailovers: number;
  successfulFailovers: number;
  failedFailovers: number;
  successRate: number;
  averageLatency: number;
}

export class ModelFailoverManager {
  private client: OpenRouterClient;
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private failoverEvents: FailoverEvent[] = [];
  private modelAvailability: Map<string, boolean> = new Map();
  private maxRetries: number;
  private retryDelay: number;

  constructor(
    client: OpenRouterClient,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
    },
  ) {
    this.client = client;
    this.maxRetries = options?.maxRetries || 3;
    this.retryDelay = options?.retryDelay || 1000;

    // Initialize default model configurations
    this.initializeDefaultModels();
  }

  /**
   * Register a model with its capabilities and priority
   */
  registerModel(config: ModelConfig): void {
    this.modelConfigs.set(config.id, config);
    this.modelAvailability.set(config.id, true);
  }

  /**
   * Chat with automatic failover on errors
   * Default fallback chain: openai/gpt-5-mini → google/gemini-3-flash-preview
   */
  async chatWithFailover(
    messages: ChatMessage[],
    options?: InferenceOptions,
  ): Promise<InferenceResponse> {
    const primaryModel = options?.model || "moonshotai/kimi-k2.5";
    const startTime = Date.now();

    try {
      // Try primary model first
      const response = await this.client.chat(messages, options);
      this.markModelAvailable(primaryModel);
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Primary model ${primaryModel} failed: ${errorMessage}`);

      // Mark model as potentially unavailable
      this.markModelUnavailable(primaryModel);

      // Find fallback models
      const fallbackModels = this.findFallbackModels(primaryModel);

      if (fallbackModels.length === 0) {
        throw new Error(
          `No fallback models available for ${primaryModel}. Original error: ${errorMessage}`,
        );
      }

      // Try fallback models in order of priority
      for (const fallbackModel of fallbackModels) {
        try {
          console.log(`Attempting failover to ${fallbackModel}...`);

          const fallbackOptions = {
            ...options,
            model: fallbackModel,
          };

          const response = await this.client.chat(messages, fallbackOptions);
          const latency = Date.now() - startTime;

          // Record successful failover
          this.recordFailoverEvent({
            timestamp: new Date(),
            primaryModel,
            fallbackModel,
            reason: errorMessage,
            success: true,
            latency,
          });

          this.markModelAvailable(fallbackModel);

          console.log(
            `Successfully failed over from ${primaryModel} to ${fallbackModel} in ${latency}ms`,
          );

          return response;
        } catch (fallbackError) {
          const fallbackErrorMessage =
            fallbackError instanceof Error
              ? fallbackError.message
              : String(fallbackError);
          console.warn(
            `Fallback model ${fallbackModel} also failed: ${fallbackErrorMessage}`,
          );
          this.markModelUnavailable(fallbackModel);
          continue;
        }
      }

      // All fallback attempts failed
      const latency = Date.now() - startTime;
      this.recordFailoverEvent({
        timestamp: new Date(),
        primaryModel,
        fallbackModel: fallbackModels[fallbackModels.length - 1] || "none",
        reason: errorMessage,
        success: false,
        latency,
      });

      throw new Error(
        `All models failed. Primary: ${primaryModel}, Fallbacks: ${fallbackModels.join(", ")}. Original error: ${errorMessage}`,
      );
    }
  }

  /**
   * Check if a model is currently available
   */
  isModelAvailable(modelId: string): boolean {
    return this.modelAvailability.get(modelId) ?? true;
  }

  /**
   * Get failover statistics
   */
  getFailoverStats(): FailoverStats {
    const totalFailovers = this.failoverEvents.length;
    const successfulFailovers = this.failoverEvents.filter((e) => e.success).length;
    const failedFailovers = totalFailovers - successfulFailovers;
    const successRate =
      totalFailovers > 0 ? successfulFailovers / totalFailovers : 0;
    const averageLatency =
      totalFailovers > 0
        ? this.failoverEvents.reduce((sum, e) => sum + e.latency, 0) /
          totalFailovers
        : 0;

    return {
      totalFailovers,
      successfulFailovers,
      failedFailovers,
      successRate,
      averageLatency,
    };
  }

  /**
   * Get recent failover events
   */
  getFailoverEvents(limit?: number): FailoverEvent[] {
    const events = [...this.failoverEvents].reverse();
    return limit ? events.slice(0, limit) : events;
  }

  /**
   * Clear failover history
   */
  clearFailoverHistory(): void {
    this.failoverEvents = [];
  }

  /**
   * Reset model availability status
   */
  resetModelAvailability(): void {
    for (const modelId of this.modelAvailability.keys()) {
      this.modelAvailability.set(modelId, true);
    }
  }

  /**
   * Get the configured fallback chain for a given primary model
   * Returns models in priority order: 
   * openai/gpt-5-mini → google/gemini-3-flash-preview → google/gemini-2.5-flash → openai/gpt-oss-120b
   */
  getFallbackChain(primaryModel: string): string[] {
    // For trading models, use DeepSeek as primary fallback
    if (primaryModel === "deepseek/deepseek-chat-v3.1") {
      return [
        "openai/gpt-5-mini",
        "google/gemini-3-flash-preview",
        "google/gemini-2.5-flash",
        "openai/gpt-oss-120b",
      ];
    }

    // For reasoning models (Moonshot), use standard fallback chain
    if (primaryModel === "moonshotai/kimi-k2.5") {
      return [
        "openai/gpt-5-mini",
        "google/gemini-3-flash-preview",
        "google/gemini-2.5-flash",
        "openai/gpt-oss-120b",
      ];
    }

    // Default fallback chain for any other model
    return [
      "openai/gpt-5-mini",
      "google/gemini-3-flash-preview",
      "google/gemini-2.5-flash",
      "openai/gpt-oss-120b",
    ];
  }

  private initializeDefaultModels(): void {
    // Moonshot models (primary with reasoning support)
    this.registerModel({
      id: "moonshotai/kimi-k2.5",
      capabilities: {
        speed: "medium",
        quality: "high",
        cost: "moderate",
        contextLength: 128000,
      },
      priority: 1,
    });

    // DeepSeek models (trading-optimized)
    this.registerModel({
      id: "deepseek/deepseek-chat-v3.1",
      capabilities: {
        speed: "fast",
        quality: "high",
        cost: "cheap",
        contextLength: 64000,
      },
      priority: 1,
    });

    // OpenAI models (fallback chain)
    this.registerModel({
      id: "openai/gpt-5-mini",
      capabilities: {
        speed: "fast",
        quality: "high",
        cost: "moderate",
        contextLength: 128000,
      },
      priority: 2,
    });

    this.registerModel({
      id: "openai/gpt-4o",
      capabilities: {
        speed: "fast",
        quality: "high",
        cost: "expensive",
        contextLength: 128000,
      },
      priority: 3,
    });

    this.registerModel({
      id: "openai/gpt-4-turbo",
      capabilities: {
        speed: "medium",
        quality: "high",
        cost: "expensive",
        contextLength: 128000,
      },
      priority: 4,
    });

    this.registerModel({
      id: "openai/gpt-3.5-turbo",
      capabilities: {
        speed: "fast",
        quality: "medium",
        cost: "cheap",
        contextLength: 16385,
      },
      priority: 8,
    });

    this.registerModel({
      id: "openai/gpt-oss-120b",
      capabilities: {
        speed: "medium",
        quality: "high",
        cost: "cheap",
        contextLength: 128000,
      },
      priority: 5,
    });

    // Google models (fallback chain)
    this.registerModel({
      id: "google/gemini-3-flash-preview",
      capabilities: {
        speed: "fast",
        quality: "high",
        cost: "cheap",
        contextLength: 1000000,
      },
      priority: 3,
    });

    this.registerModel({
      id: "google/gemini-2.5-flash",
      capabilities: {
        speed: "fast",
        quality: "high",
        cost: "cheap",
        contextLength: 1000000,
      },
      priority: 4,
    });

    this.registerModel({
      id: "google/gemini-pro-1.5",
      capabilities: {
        speed: "medium",
        quality: "high",
        cost: "moderate",
        contextLength: 1000000,
      },
      priority: 7,
    });

    // Anthropic models
    this.registerModel({
      id: "anthropic/claude-3.5-sonnet",
      capabilities: {
        speed: "medium",
        quality: "high",
        cost: "expensive",
        contextLength: 200000,
      },
      priority: 5,
    });

    this.registerModel({
      id: "anthropic/claude-3-haiku",
      capabilities: {
        speed: "fast",
        quality: "medium",
        cost: "cheap",
        contextLength: 200000,
      },
      priority: 6,
    });

    // Meta models
    this.registerModel({
      id: "meta-llama/llama-3.1-70b-instruct",
      capabilities: {
        speed: "fast",
        quality: "medium",
        cost: "cheap",
        contextLength: 128000,
      },
      priority: 9,
    });
  }

  private findFallbackModels(primaryModel: string): string[] {
    // Use configured fallback chain
    const fallbackChain = this.getFallbackChain(primaryModel);
    
    // Filter to only available models
    const availableFallbacks = fallbackChain.filter((modelId) => 
      this.isModelAvailable(modelId) && this.modelConfigs.has(modelId)
    );

    if (availableFallbacks.length > 0) {
      return availableFallbacks;
    }

    // If configured fallbacks are unavailable, find similar models
    const primaryConfig = this.modelConfigs.get(primaryModel);

    if (!primaryConfig) {
      // If primary model not registered, return all available models sorted by priority
      return Array.from(this.modelConfigs.entries())
        .filter(([id]) => this.isModelAvailable(id) && id !== primaryModel)
        .sort((a, b) => a[1].priority - b[1].priority)
        .map(([id]) => id)
        .slice(0, 3); // Return top 3 alternatives
    }

    // Find models with similar capabilities
    const candidates = Array.from(this.modelConfigs.entries())
      .filter(([id, config]) => {
        if (id === primaryModel) return false;
        if (!this.isModelAvailable(id)) return false;

        // Match quality level
        if (config.capabilities.quality !== primaryConfig.capabilities.quality) {
          return false;
        }

        // Ensure sufficient context length
        if (
          config.capabilities.contextLength <
          primaryConfig.capabilities.contextLength * 0.8
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([id]) => id);

    // If no similar models found, return any available models
    if (candidates.length === 0) {
      return Array.from(this.modelConfigs.entries())
        .filter(([id]) => this.isModelAvailable(id) && id !== primaryModel)
        .sort((a, b) => a[1].priority - b[1].priority)
        .map(([id]) => id)
        .slice(0, 3);
    }

    return candidates.slice(0, 3); // Return top 3 alternatives
  }

  private markModelAvailable(modelId: string): void {
    this.modelAvailability.set(modelId, true);
  }

  private markModelUnavailable(modelId: string): void {
    this.modelAvailability.set(modelId, false);

    // Reset availability after 5 minutes
    setTimeout(() => {
      this.modelAvailability.set(modelId, true);
    }, 5 * 60 * 1000);
  }

  private recordFailoverEvent(event: FailoverEvent): void {
    this.failoverEvents.push(event);

    // Keep only last 1000 events
    if (this.failoverEvents.length > 1000) {
      this.failoverEvents = this.failoverEvents.slice(-1000);
    }
  }
}
