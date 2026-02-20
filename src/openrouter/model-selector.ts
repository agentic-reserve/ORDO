/**
 * Model Selection System
 *
 * Selects the most appropriate AI model based on task requirements,
 * considering speed, quality, and cost tradeoffs, with support for
 * agent-specific preferences.
 */

import type { ModelCapability, ModelConfig } from "./failover.js";

export interface TaskRequirements {
  speed?: "fast" | "medium" | "slow";
  quality?: "high" | "medium" | "low";
  cost?: "expensive" | "moderate" | "cheap";
  minContextLength?: number;
  capabilities?: string[];
}

export interface AgentPreferences {
  agentId: string;
  preferredModels?: string[];
  avoidModels?: string[];
  maxCostPerInference?: number; // in cents
  prioritize?: "speed" | "quality" | "cost";
}

export interface ModelSelectionResult {
  model: string;
  score: number;
  reasoning: string;
  alternatives: Array<{ model: string; score: number }>;
}

export interface ModelScore {
  model: string;
  speedScore: number;
  qualityScore: number;
  costScore: number;
  preferenceScore: number;
  totalScore: number;
}

export class ModelSelector {
  private modelConfigs: Map<string, ModelConfig> = new Map();
  private agentPreferences: Map<string, AgentPreferences> = new Map();
  private defaultWeights = {
    speed: 0.33,
    quality: 0.34,
    cost: 0.33,
  };

  constructor() {
    this.initializeDefaultModels();
  }

  /**
   * Register a model with its capabilities
   */
  registerModel(config: ModelConfig): void {
    this.modelConfigs.set(config.id, config);
  }

  /**
   * Set agent-specific preferences
   */
  setAgentPreferences(preferences: AgentPreferences): void {
    this.agentPreferences.set(preferences.agentId, preferences);
  }

  /**
   * Get agent preferences
   */
  getAgentPreferences(agentId: string): AgentPreferences | undefined {
    return this.agentPreferences.get(agentId);
  }

  /**
   * Select the most appropriate model based on task requirements
   */
  selectModel(
    requirements: TaskRequirements,
    agentId?: string,
  ): ModelSelectionResult {
    const preferences = agentId
      ? this.agentPreferences.get(agentId)
      : undefined;

    // Filter models based on hard requirements
    const eligibleModels = this.filterEligibleModels(requirements, preferences);

    if (eligibleModels.length === 0) {
      throw new Error(
        "No models match the specified requirements and preferences",
      );
    }

    // Score each eligible model
    const scoredModels = eligibleModels.map((config) =>
      this.scoreModel(config, requirements, preferences),
    );

    // Sort by total score (descending)
    scoredModels.sort((a, b) => b.totalScore - a.totalScore);

    const topModel = scoredModels[0];
    const alternatives = scoredModels
      .slice(1, 4)
      .map((s) => ({ model: s.model, score: s.totalScore }));

    const reasoning = this.generateReasoning(
      topModel,
      requirements,
      preferences,
    );

    return {
      model: topModel.model,
      score: topModel.totalScore,
      reasoning,
      alternatives,
    };
  }

  /**
   * Get all registered models
   */
  getRegisteredModels(): ModelConfig[] {
    return Array.from(this.modelConfigs.values());
  }

  /**
   * Get model configuration by ID
   */
  getModelConfig(modelId: string): ModelConfig | undefined {
    return this.modelConfigs.get(modelId);
  }

  private filterEligibleModels(
    requirements: TaskRequirements,
    preferences?: AgentPreferences,
  ): ModelConfig[] {
    return Array.from(this.modelConfigs.values()).filter((config) => {
      // Filter by context length requirement
      if (
        requirements.minContextLength &&
        config.capabilities.contextLength < requirements.minContextLength
      ) {
        return false;
      }

      // Filter by agent preferences
      if (preferences) {
        // Exclude avoided models
        if (preferences.avoidModels?.includes(config.id)) {
          return false;
        }
      }

      return true;
    });
  }

  private scoreModel(
    config: ModelConfig,
    requirements: TaskRequirements,
    preferences?: AgentPreferences,
  ): ModelScore {
    // Calculate individual dimension scores (0-1 scale)
    const speedScore = this.calculateSpeedScore(
      config.capabilities.speed,
      requirements.speed,
    );
    const qualityScore = this.calculateQualityScore(
      config.capabilities.quality,
      requirements.quality,
    );
    const costScore = this.calculateCostScore(
      config.capabilities.cost,
      requirements.cost,
    );
    const preferenceScore = this.calculatePreferenceScore(
      config.id,
      preferences,
    );

    // Determine weights based on agent preferences or defaults
    const weights = this.getWeights(requirements, preferences);

    // Calculate weighted total score
    const totalScore =
      speedScore * weights.speed +
      qualityScore * weights.quality +
      costScore * weights.cost +
      preferenceScore * 0.1; // Preference bonus

    return {
      model: config.id,
      speedScore,
      qualityScore,
      costScore,
      preferenceScore,
      totalScore,
    };
  }

  private calculateSpeedScore(
    modelSpeed: "fast" | "medium" | "slow",
    requiredSpeed?: "fast" | "medium" | "slow",
  ): number {
    const speedValues = { fast: 1.0, medium: 0.6, slow: 0.3 };
    const modelValue = speedValues[modelSpeed];

    if (!requiredSpeed) {
      return modelValue;
    }

    const requiredValue = speedValues[requiredSpeed];

    // Perfect match gets 1.0, meeting requirement gets 0.8, not meeting gets 0.3
    if (modelValue >= requiredValue) {
      return modelValue === requiredValue ? 1.0 : 0.8;
    }

    return 0.3;
  }

  private calculateQualityScore(
    modelQuality: "high" | "medium" | "low",
    requiredQuality?: "high" | "medium" | "low",
  ): number {
    const qualityValues = { high: 1.0, medium: 0.6, low: 0.3 };
    const modelValue = qualityValues[modelQuality];

    if (!requiredQuality) {
      return modelValue;
    }

    const requiredValue = qualityValues[requiredQuality];

    // Perfect match gets 1.0, exceeding requirement gets 0.9, meeting gets 0.8
    if (modelValue >= requiredValue) {
      return modelValue === requiredValue ? 1.0 : 0.9;
    }

    return 0.3;
  }

  private calculateCostScore(
    modelCost: "expensive" | "moderate" | "cheap",
    requiredCost?: "expensive" | "moderate" | "cheap",
  ): number {
    // For cost, cheaper is better (inverted scoring)
    const costValues = { cheap: 1.0, moderate: 0.6, expensive: 0.3 };
    const modelValue = costValues[modelCost];

    if (!requiredCost) {
      return modelValue;
    }

    const requiredValue = costValues[requiredCost];

    // Cheaper than required gets bonus, meeting requirement gets 1.0
    if (modelValue >= requiredValue) {
      return 1.0;
    }

    return 0.3;
  }

  private calculatePreferenceScore(
    modelId: string,
    preferences?: AgentPreferences,
  ): number {
    if (!preferences) {
      return 0.5; // Neutral score
    }

    // Preferred models get bonus
    if (preferences.preferredModels?.includes(modelId)) {
      return 1.0;
    }

    // Avoided models already filtered out, so this is neutral
    return 0.5;
  }

  private getWeights(
    requirements: TaskRequirements,
    preferences?: AgentPreferences,
  ): { speed: number; quality: number; cost: number } {
    // If agent has prioritization preference, adjust weights
    if (preferences?.prioritize) {
      switch (preferences.prioritize) {
        case "speed":
          return { speed: 0.5, quality: 0.25, cost: 0.25 };
        case "quality":
          return { speed: 0.25, quality: 0.5, cost: 0.25 };
        case "cost":
          return { speed: 0.25, quality: 0.25, cost: 0.5 };
      }
    }

    // Otherwise use default balanced weights
    return this.defaultWeights;
  }

  private generateReasoning(
    score: ModelScore,
    requirements: TaskRequirements,
    preferences?: AgentPreferences,
  ): string {
    const reasons: string[] = [];

    // Add requirement-based reasoning
    if (requirements.speed) {
      reasons.push(`speed requirement: ${requirements.speed}`);
    }
    if (requirements.quality) {
      reasons.push(`quality requirement: ${requirements.quality}`);
    }
    if (requirements.cost) {
      reasons.push(`cost requirement: ${requirements.cost}`);
    }

    // Add score-based reasoning
    const topDimension = this.getTopDimension(score);
    reasons.push(`excels in ${topDimension}`);

    // Add preference-based reasoning
    if (preferences?.prioritize) {
      reasons.push(`agent prioritizes ${preferences.prioritize}`);
    }

    if (preferences?.preferredModels?.includes(score.model)) {
      reasons.push("agent preferred model");
    }

    return `Selected ${score.model} (score: ${score.totalScore.toFixed(2)}) - ${reasons.join(", ")}`;
  }

  private getTopDimension(score: ModelScore): string {
    const dimensions = [
      { name: "speed", value: score.speedScore },
      { name: "quality", value: score.qualityScore },
      { name: "cost efficiency", value: score.costScore },
    ];

    dimensions.sort((a, b) => b.value - a.value);
    return dimensions[0].name;
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
      priority: 7,
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
      priority: 6,
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
      priority: 4,
    });

    this.registerModel({
      id: "anthropic/claude-3-haiku",
      capabilities: {
        speed: "fast",
        quality: "medium",
        cost: "cheap",
        contextLength: 200000,
      },
      priority: 7,
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
      priority: 8,
    });

    // Additional cost-effective models
    this.registerModel({
      id: "meta-llama/llama-3.1-8b-instruct",
      capabilities: {
        speed: "fast",
        quality: "low",
        cost: "cheap",
        contextLength: 128000,
      },
      priority: 10,
    });

    this.registerModel({
      id: "mistralai/mistral-7b-instruct",
      capabilities: {
        speed: "fast",
        quality: "medium",
        cost: "cheap",
        contextLength: 32768,
      },
      priority: 9,
    });
  }
}
