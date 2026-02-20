/**
 * Cost-Optimized Model Selection System
 * 
 * Tracks cost per model per agent and optimizes model selection to minimize cost
 * while maintaining quality requirements.
 * 
 * Requirements: 23.4
 * Property: 107 - Cost-Optimized Model Selection
 */

export interface ModelCostRecord {
  agentId: string;
  model: string;
  totalCost: number; // in cents
  inferenceCount: number;
  avgCostPerInference: number;
  totalTokens: number;
  avgTokensPerInference: number;
  successRate: number;
  avgQualityScore: number; // 0-100
}

export interface ModelPerformanceMetrics {
  model: string;
  costEfficiency: number; // quality per dollar
  avgLatency: number;
  successRate: number;
  qualityScore: number;
}

export interface CostOptimizationRecommendation {
  agentId: string;
  currentModel: string;
  recommendedModel: string;
  potentialSavings: number; // cents per inference
  qualityImpact: number; // -100 to +100
  reason: string;
}

export interface InferenceRecord {
  agentId: string;
  model: string;
  costCents: number;
  tokens: number;
  latencyMs: number;
  success: boolean;
  qualityScore?: number;
  timestamp: Date;
}

export class CostOptimizedModelSelector {
  private inferenceHistory: InferenceRecord[] = [];
  private modelCosts: Map<string, Map<string, ModelCostRecord>> = new Map(); // agentId -> model -> record
  private qualityThreshold: number;
  private maxHistorySize: number;

  constructor(qualityThreshold: number = 70, maxHistorySize: number = 10000) {
    this.qualityThreshold = qualityThreshold;
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Track an inference for cost optimization
   */
  trackInference(record: InferenceRecord): void {
    this.inferenceHistory.push(record);

    // Limit history size
    if (this.inferenceHistory.length > this.maxHistorySize) {
      this.inferenceHistory.shift();
    }

    // Update model cost records
    this.updateModelCostRecord(record);
  }

  /**
   * Get cost breakdown by model for an agent
   */
  getCostByModel(agentId: string): Map<string, number> {
    const agentCosts = this.modelCosts.get(agentId);
    if (!agentCosts) {
      return new Map();
    }

    const costMap = new Map<string, number>();
    for (const [model, record] of agentCosts.entries()) {
      costMap.set(model, record.totalCost);
    }

    return costMap;
  }

  /**
   * Get model cost record for an agent
   */
  getModelCostRecord(agentId: string, model: string): ModelCostRecord | null {
    const agentCosts = this.modelCosts.get(agentId);
    if (!agentCosts) {
      return null;
    }

    return agentCosts.get(model) || null;
  }

  /**
   * Get all model cost records for an agent
   */
  getAllModelCostRecords(agentId: string): ModelCostRecord[] {
    const agentCosts = this.modelCosts.get(agentId);
    if (!agentCosts) {
      return [];
    }

    return Array.from(agentCosts.values());
  }

  /**
   * Calculate model performance metrics
   */
  calculateModelPerformance(model: string, agentId?: string): ModelPerformanceMetrics | null {
    const records = agentId
      ? this.inferenceHistory.filter(r => r.model === model && r.agentId === agentId)
      : this.inferenceHistory.filter(r => r.model === model);

    if (records.length === 0) {
      return null;
    }

    const avgCost = records.reduce((sum, r) => sum + r.costCents, 0) / records.length;
    const avgLatency = records.reduce((sum, r) => sum + r.latencyMs, 0) / records.length;
    const successRate = records.filter(r => r.success).length / records.length;
    
    const qualityScores = records.filter(r => r.qualityScore !== undefined).map(r => r.qualityScore!);
    const avgQuality = qualityScores.length > 0
      ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length
      : 70; // Default quality score

    // Cost efficiency = quality per cent
    const costEfficiency = avgCost > 0 ? avgQuality / avgCost : 0;

    return {
      model,
      costEfficiency,
      avgLatency,
      successRate,
      qualityScore: avgQuality,
    };
  }

  /**
   * Recommend cost-optimized model for an agent
   */
  recommendModel(agentId: string, currentModel: string): CostOptimizationRecommendation | null {
    const agentCosts = this.modelCosts.get(agentId);
    if (!agentCosts || agentCosts.size < 2) {
      return null; // Need at least 2 models to compare
    }

    const currentRecord = agentCosts.get(currentModel);
    if (!currentRecord) {
      return null;
    }

    // Find the most cost-efficient model that meets quality threshold
    let bestModel: string | null = null;
    let bestCostEfficiency = 0;
    let bestRecord: ModelCostRecord | null = null;

    for (const [model, record] of agentCosts.entries()) {
      if (model === currentModel) continue;
      if (record.avgQualityScore < this.qualityThreshold) continue;
      if (record.inferenceCount < 5) continue; // Need sufficient data

      const costEfficiency = record.avgQualityScore / record.avgCostPerInference;
      
      if (costEfficiency > bestCostEfficiency) {
        bestCostEfficiency = costEfficiency;
        bestModel = model;
        bestRecord = record;
      }
    }

    if (!bestModel || !bestRecord) {
      return null;
    }

    const potentialSavings = currentRecord.avgCostPerInference - bestRecord.avgCostPerInference;
    const qualityImpact = bestRecord.avgQualityScore - currentRecord.avgQualityScore;

    // Only recommend if there are actual savings
    if (potentialSavings <= 0) {
      return null;
    }

    return {
      agentId,
      currentModel,
      recommendedModel: bestModel,
      potentialSavings,
      qualityImpact,
      reason: this.generateRecommendationReason(potentialSavings, qualityImpact, bestRecord),
    };
  }

  /**
   * Get the most cost-efficient model for an agent
   */
  getMostCostEfficientModel(agentId: string): string | null {
    const agentCosts = this.modelCosts.get(agentId);
    if (!agentCosts || agentCosts.size === 0) {
      return null;
    }

    let bestModel: string | null = null;
    let bestCostEfficiency = 0;

    for (const [model, record] of agentCosts.entries()) {
      if (record.avgQualityScore < this.qualityThreshold) continue;
      if (record.inferenceCount < 5) continue;

      const costEfficiency = record.avgQualityScore / record.avgCostPerInference;
      
      if (costEfficiency > bestCostEfficiency) {
        bestCostEfficiency = costEfficiency;
        bestModel = model;
      }
    }

    return bestModel;
  }

  /**
   * Get total cost for an agent
   */
  getTotalCost(agentId: string): number {
    const agentCosts = this.modelCosts.get(agentId);
    if (!agentCosts) {
      return 0;
    }

    let total = 0;
    for (const record of agentCosts.values()) {
      total += record.totalCost;
    }

    return total;
  }

  /**
   * Get total potential savings for an agent
   */
  getTotalPotentialSavings(agentId: string): number {
    const agentCosts = this.modelCosts.get(agentId);
    if (!agentCosts || agentCosts.size < 2) {
      return 0;
    }

    const mostEfficientModel = this.getMostCostEfficientModel(agentId);
    if (!mostEfficientModel) {
      return 0;
    }

    const efficientRecord = agentCosts.get(mostEfficientModel);
    if (!efficientRecord) {
      return 0;
    }

    let totalSavings = 0;
    for (const [model, record] of agentCosts.entries()) {
      if (model === mostEfficientModel) continue;
      
      const savingsPerInference = record.avgCostPerInference - efficientRecord.avgCostPerInference;
      if (savingsPerInference > 0) {
        totalSavings += savingsPerInference * record.inferenceCount;
      }
    }

    return totalSavings;
  }

  /**
   * Clear inference history
   */
  clearHistory(): void {
    this.inferenceHistory = [];
    this.modelCosts.clear();
  }

  /**
   * Get inference history for an agent
   */
  getInferenceHistory(agentId: string): InferenceRecord[] {
    return this.inferenceHistory.filter(r => r.agentId === agentId);
  }

  private updateModelCostRecord(record: InferenceRecord): void {
    let agentCosts = this.modelCosts.get(record.agentId);
    if (!agentCosts) {
      agentCosts = new Map();
      this.modelCosts.set(record.agentId, agentCosts);
    }

    let modelRecord = agentCosts.get(record.model);
    if (!modelRecord) {
      modelRecord = {
        agentId: record.agentId,
        model: record.model,
        totalCost: 0,
        inferenceCount: 0,
        avgCostPerInference: 0,
        totalTokens: 0,
        avgTokensPerInference: 0,
        successRate: 0,
        avgQualityScore: 0,
      };
      agentCosts.set(record.model, modelRecord);
    }

    // Update totals
    modelRecord.totalCost += record.costCents;
    modelRecord.inferenceCount += 1;
    modelRecord.totalTokens += record.tokens;

    // Update averages
    modelRecord.avgCostPerInference = modelRecord.totalCost / modelRecord.inferenceCount;
    modelRecord.avgTokensPerInference = modelRecord.totalTokens / modelRecord.inferenceCount;

    // Update success rate
    const agentRecords = this.inferenceHistory.filter(
      r => r.agentId === record.agentId && r.model === record.model
    );
    const successCount = agentRecords.filter(r => r.success).length;
    modelRecord.successRate = successCount / agentRecords.length;

    // Update quality score
    const qualityScores = agentRecords
      .filter(r => r.qualityScore !== undefined)
      .map(r => r.qualityScore!);
    
    if (qualityScores.length > 0) {
      modelRecord.avgQualityScore = qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length;
    } else {
      modelRecord.avgQualityScore = 70; // Default quality score
    }
  }

  private generateRecommendationReason(
    savings: number,
    qualityImpact: number,
    record: ModelCostRecord
  ): string {
    const savingsPercent = (savings / (record.avgCostPerInference + savings)) * 100;
    
    if (qualityImpact > 5) {
      return `Save ${savings.toFixed(2)}¢ per inference (${savingsPercent.toFixed(1)}%) with ${qualityImpact.toFixed(1)}% better quality`;
    } else if (qualityImpact < -5) {
      return `Save ${savings.toFixed(2)}¢ per inference (${savingsPercent.toFixed(1)}%) with ${Math.abs(qualityImpact).toFixed(1)}% quality tradeoff`;
    } else {
      return `Save ${savings.toFixed(2)}¢ per inference (${savingsPercent.toFixed(1)}%) with similar quality`;
    }
  }
}
