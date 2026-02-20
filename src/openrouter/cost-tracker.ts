/**
 * AI Inference Cost Tracking System
 *
 * Tracks token usage per model and per agent, calculates costs,
 * and stores usage analytics for optimization.
 */

import type { TokenUsage } from "../types.js";

export interface InferenceCostRecord {
  id: string;
  agentId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costCents: number;
  latencyMs: number;
  timestamp: string;
  turnId?: string;
}

export interface CostAnalytics {
  totalCost: number;
  totalTokens: number;
  totalInferences: number;
  averageCostPerInference: number;
  averageTokensPerInference: number;
  averageLatency: number;
  costByModel: Map<string, number>;
  tokensByModel: Map<string, number>;
  inferencesByModel: Map<string, number>;
}

export interface ModelPricing {
  promptTokensPerMillion: number; // Cost in cents per 1M prompt tokens
  completionTokensPerMillion: number; // Cost in cents per 1M completion tokens
}

/**
 * Default pricing for common models (in cents per 1M tokens)
 * These should be updated from OpenRouter API in production
 */
export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
  "openai/gpt-4o": {
    promptTokensPerMillion: 250, // $2.50
    completionTokensPerMillion: 1000, // $10.00
  },
  "openai/gpt-4-turbo": {
    promptTokensPerMillion: 1000, // $10.00
    completionTokensPerMillion: 3000, // $30.00
  },
  "openai/gpt-3.5-turbo": {
    promptTokensPerMillion: 50, // $0.50
    completionTokensPerMillion: 150, // $1.50
  },
  "anthropic/claude-3.5-sonnet": {
    promptTokensPerMillion: 300, // $3.00
    completionTokensPerMillion: 1500, // $15.00
  },
  "anthropic/claude-3-haiku": {
    promptTokensPerMillion: 25, // $0.25
    completionTokensPerMillion: 125, // $1.25
  },
  "google/gemini-pro-1.5": {
    promptTokensPerMillion: 125, // $1.25
    completionTokensPerMillion: 500, // $5.00
  },
  "meta-llama/llama-3.1-70b-instruct": {
    promptTokensPerMillion: 40, // $0.40
    completionTokensPerMillion: 80, // $0.80
  },
};

export class CostTracker {
  private records: InferenceCostRecord[] = [];
  private modelPricing: Map<string, ModelPricing> = new Map();

  constructor(customPricing?: Record<string, ModelPricing>) {
    // Initialize with default pricing
    for (const [model, pricing] of Object.entries(DEFAULT_MODEL_PRICING)) {
      this.modelPricing.set(model, pricing);
    }

    // Override with custom pricing if provided
    if (customPricing) {
      for (const [model, pricing] of Object.entries(customPricing)) {
        this.modelPricing.set(model, pricing);
      }
    }
  }

  /**
   * Track a single inference cost
   */
  trackInference(record: InferenceCostRecord): void {
    this.records.push(record);
  }

  /**
   * Calculate cost for a given token usage and model
   */
  calculateCost(usage: TokenUsage, model: string): number {
    const pricing = this.modelPricing.get(model);

    if (!pricing) {
      // Fallback to default pricing if model not found
      const promptCost = (usage.promptTokens / 1_000_000) * 10; // $0.01 per 1M tokens
      const completionCost = (usage.completionTokens / 1_000_000) * 30; // $0.03 per 1M tokens
      return promptCost + completionCost;
    }

    const promptCost =
      (usage.promptTokens / 1_000_000) * pricing.promptTokensPerMillion;
    const completionCost =
      (usage.completionTokens / 1_000_000) * pricing.completionTokensPerMillion;

    return promptCost + completionCost;
  }

  /**
   * Get all cost records for a specific agent
   */
  getRecordsByAgent(agentId: string): InferenceCostRecord[] {
    return this.records.filter((r) => r.agentId === agentId);
  }

  /**
   * Get all cost records for a specific model
   */
  getRecordsByModel(model: string): InferenceCostRecord[] {
    return this.records.filter((r) => r.model === model);
  }

  /**
   * Get cost analytics for a specific agent
   */
  getAnalytics(agentId?: string): CostAnalytics {
    const records = agentId
      ? this.getRecordsByAgent(agentId)
      : this.records;

    if (records.length === 0) {
      return {
        totalCost: 0,
        totalTokens: 0,
        totalInferences: 0,
        averageCostPerInference: 0,
        averageTokensPerInference: 0,
        averageLatency: 0,
        costByModel: new Map(),
        tokensByModel: new Map(),
        inferencesByModel: new Map(),
      };
    }

    const totalCost = records.reduce((sum, r) => sum + r.costCents, 0);
    const totalTokens = records.reduce((sum, r) => sum + r.totalTokens, 0);
    const totalInferences = records.length;
    const totalLatency = records.reduce((sum, r) => sum + r.latencyMs, 0);

    const costByModel = new Map<string, number>();
    const tokensByModel = new Map<string, number>();
    const inferencesByModel = new Map<string, number>();

    for (const record of records) {
      costByModel.set(
        record.model,
        (costByModel.get(record.model) || 0) + record.costCents,
      );
      tokensByModel.set(
        record.model,
        (tokensByModel.get(record.model) || 0) + record.totalTokens,
      );
      inferencesByModel.set(
        record.model,
        (inferencesByModel.get(record.model) || 0) + 1,
      );
    }

    return {
      totalCost,
      totalTokens,
      totalInferences,
      averageCostPerInference: totalCost / totalInferences,
      averageTokensPerInference: totalTokens / totalInferences,
      averageLatency: totalLatency / totalInferences,
      costByModel,
      tokensByModel,
      inferencesByModel,
    };
  }

  /**
   * Get total cost for a specific agent
   */
  getTotalCost(agentId?: string): number {
    const records = agentId
      ? this.getRecordsByAgent(agentId)
      : this.records;
    return records.reduce((sum, r) => sum + r.costCents, 0);
  }

  /**
   * Get total token usage for a specific agent
   */
  getTotalTokens(agentId?: string): {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } {
    const records = agentId
      ? this.getRecordsByAgent(agentId)
      : this.records;

    return records.reduce(
      (acc, r) => ({
        promptTokens: acc.promptTokens + r.promptTokens,
        completionTokens: acc.completionTokens + r.completionTokens,
        totalTokens: acc.totalTokens + r.totalTokens,
      }),
      { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    );
  }

  /**
   * Get cost breakdown by model for a specific agent
   */
  getCostByModel(agentId?: string): Map<string, number> {
    const records = agentId
      ? this.getRecordsByAgent(agentId)
      : this.records;

    const costByModel = new Map<string, number>();

    for (const record of records) {
      costByModel.set(
        record.model,
        (costByModel.get(record.model) || 0) + record.costCents,
      );
    }

    return costByModel;
  }

  /**
   * Get the most cost-effective model based on historical data
   */
  getMostCostEffectiveModel(): string | null {
    if (this.records.length === 0) return null;

    const costPerToken = new Map<string, number>();
    const tokensByModel = new Map<string, number>();

    for (const record of this.records) {
      const currentCost = costPerToken.get(record.model) || 0;
      const currentTokens = tokensByModel.get(record.model) || 0;

      costPerToken.set(record.model, currentCost + record.costCents);
      tokensByModel.set(record.model, currentTokens + record.totalTokens);
    }

    let mostEffective: string | null = null;
    let lowestCostPerToken = Infinity;

    for (const [model, cost] of costPerToken.entries()) {
      const tokens = tokensByModel.get(model) || 1;
      const costPerTokenValue = cost / tokens;

      if (costPerTokenValue < lowestCostPerToken) {
        lowestCostPerToken = costPerTokenValue;
        mostEffective = model;
      }
    }

    return mostEffective;
  }

  /**
   * Clear all cost records
   */
  clearRecords(): void {
    this.records = [];
  }

  /**
   * Update pricing for a specific model
   */
  updateModelPricing(model: string, pricing: ModelPricing): void {
    this.modelPricing.set(model, pricing);
  }

  /**
   * Get pricing for a specific model
   */
  getModelPricing(model: string): ModelPricing | undefined {
    return this.modelPricing.get(model);
  }
}
