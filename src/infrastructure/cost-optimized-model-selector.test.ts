import { describe, it, expect, beforeEach } from 'vitest';
import { CostOptimizedModelSelector, InferenceRecord } from './cost-optimized-model-selector';

describe('CostOptimizedModelSelector', () => {
  let selector: CostOptimizedModelSelector;

  beforeEach(() => {
    selector = new CostOptimizedModelSelector(70, 1000);
  });

  describe('trackInference', () => {
    it('should track inference records', () => {
      const record: InferenceRecord = {
        agentId: 'agent-1',
        model: 'gpt-4',
        costCents: 10,
        tokens: 1000,
        latencyMs: 500,
        success: true,
        qualityScore: 90,
        timestamp: new Date(),
      };

      selector.trackInference(record);
      const history = selector.getInferenceHistory('agent-1');

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(record);
    });

    it('should update model cost records', () => {
      for (let i = 0; i < 5; i++) {
        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-4',
          costCents: 10,
          tokens: 1000,
          latencyMs: 500,
          success: true,
          qualityScore: 90,
          timestamp: new Date(),
        });
      }

      const costRecord = selector.getModelCostRecord('agent-1', 'gpt-4');

      expect(costRecord).toBeDefined();
      expect(costRecord?.inferenceCount).toBe(5);
      expect(costRecord?.totalCost).toBe(50);
      expect(costRecord?.avgCostPerInference).toBe(10);
      expect(costRecord?.avgQualityScore).toBe(90);
    });
  });

  describe('getCostByModel', () => {
    it('should return cost breakdown by model', () => {
      selector.trackInference({
        agentId: 'agent-1',
        model: 'gpt-4',
        costCents: 10,
        tokens: 1000,
        latencyMs: 500,
        success: true,
        timestamp: new Date(),
      });

      selector.trackInference({
        agentId: 'agent-1',
        model: 'gpt-3.5',
        costCents: 2,
        tokens: 1000,
        latencyMs: 300,
        success: true,
        timestamp: new Date(),
      });

      const costMap = selector.getCostByModel('agent-1');

      expect(costMap.get('gpt-4')).toBe(10);
      expect(costMap.get('gpt-3.5')).toBe(2);
    });

    it('should return empty map for unknown agent', () => {
      const costMap = selector.getCostByModel('unknown');
      expect(costMap.size).toBe(0);
    });
  });

  describe('calculateModelPerformance', () => {
    it('should calculate performance metrics', () => {
      for (let i = 0; i < 10; i++) {
        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-4',
          costCents: 10,
          tokens: 1000,
          latencyMs: 500,
          success: i < 9, // 90% success rate
          qualityScore: 90,
          timestamp: new Date(),
        });
      }

      const metrics = selector.calculateModelPerformance('gpt-4', 'agent-1');

      expect(metrics).toBeDefined();
      expect(metrics?.successRate).toBe(0.9);
      expect(metrics?.qualityScore).toBe(90);
      expect(metrics?.avgLatency).toBe(500);
      expect(metrics?.costEfficiency).toBe(9); // 90 quality / 10 cost
    });

    it('should return null for unknown model', () => {
      const metrics = selector.calculateModelPerformance('unknown');
      expect(metrics).toBeNull();
    });
  });

  describe('recommendModel', () => {
    it('should recommend cheaper model with similar quality', () => {
      // Track expensive model
      for (let i = 0; i < 10; i++) {
        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-4',
          costCents: 10,
          tokens: 1000,
          latencyMs: 500,
          success: true,
          qualityScore: 90,
          timestamp: new Date(),
        });
      }

      // Track cheaper model with similar quality
      for (let i = 0; i < 10; i++) {
        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-3.5',
          costCents: 2,
          tokens: 1000,
          latencyMs: 300,
          success: true,
          qualityScore: 85,
          timestamp: new Date(),
        });
      }

      const recommendation = selector.recommendModel('agent-1', 'gpt-4');

      expect(recommendation).toBeDefined();
      expect(recommendation?.recommendedModel).toBe('gpt-3.5');
      expect(recommendation?.potentialSavings).toBe(8);
      expect(recommendation?.qualityImpact).toBe(-5);
    });

    it('should not recommend if quality is below threshold', () => {
      // Track expensive model
      for (let i = 0; i < 10; i++) {
        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-4',
          costCents: 10,
          tokens: 1000,
          latencyMs: 500,
          success: true,
          qualityScore: 90,
          timestamp: new Date(),
        });
      }

      // Track cheaper model with low quality
      for (let i = 0; i < 10; i++) {
        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-3.5',
          costCents: 2,
          tokens: 1000,
          latencyMs: 300,
          success: true,
          qualityScore: 60, // Below threshold
          timestamp: new Date(),
        });
      }

      const recommendation = selector.recommendModel('agent-1', 'gpt-4');

      expect(recommendation).toBeNull();
    });

    it('should return null if insufficient data', () => {
      selector.trackInference({
        agentId: 'agent-1',
        model: 'gpt-4',
        costCents: 10,
        tokens: 1000,
        latencyMs: 500,
        success: true,
        timestamp: new Date(),
      });

      const recommendation = selector.recommendModel('agent-1', 'gpt-4');
      expect(recommendation).toBeNull();
    });
  });

  describe('getMostCostEfficientModel', () => {
    it('should return the most cost-efficient model', () => {
      // Track multiple models
      for (let i = 0; i < 10; i++) {
        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-4',
          costCents: 10,
          tokens: 1000,
          latencyMs: 500,
          success: true,
          qualityScore: 90,
          timestamp: new Date(),
        });

        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-3.5',
          costCents: 2,
          tokens: 1000,
          latencyMs: 300,
          success: true,
          qualityScore: 85,
          timestamp: new Date(),
        });

        selector.trackInference({
          agentId: 'agent-1',
          model: 'claude',
          costCents: 8,
          tokens: 1000,
          latencyMs: 400,
          success: true,
          qualityScore: 88,
          timestamp: new Date(),
        });
      }

      const mostEfficient = selector.getMostCostEfficientModel('agent-1');

      // gpt-3.5 has best cost efficiency: 85/2 = 42.5
      expect(mostEfficient).toBe('gpt-3.5');
    });

    it('should return null for unknown agent', () => {
      const mostEfficient = selector.getMostCostEfficientModel('unknown');
      expect(mostEfficient).toBeNull();
    });
  });

  describe('getTotalCost', () => {
    it('should calculate total cost for agent', () => {
      selector.trackInference({
        agentId: 'agent-1',
        model: 'gpt-4',
        costCents: 10,
        tokens: 1000,
        latencyMs: 500,
        success: true,
        timestamp: new Date(),
      });

      selector.trackInference({
        agentId: 'agent-1',
        model: 'gpt-3.5',
        costCents: 2,
        tokens: 1000,
        latencyMs: 300,
        success: true,
        timestamp: new Date(),
      });

      const totalCost = selector.getTotalCost('agent-1');
      expect(totalCost).toBe(12);
    });

    it('should return 0 for unknown agent', () => {
      const totalCost = selector.getTotalCost('unknown');
      expect(totalCost).toBe(0);
    });
  });

  describe('getTotalPotentialSavings', () => {
    it('should calculate potential savings', () => {
      // Track expensive model (10 inferences)
      for (let i = 0; i < 10; i++) {
        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-4',
          costCents: 10,
          tokens: 1000,
          latencyMs: 500,
          success: true,
          qualityScore: 90,
          timestamp: new Date(),
        });
      }

      // Track cheaper model (10 inferences)
      for (let i = 0; i < 10; i++) {
        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-3.5',
          costCents: 2,
          tokens: 1000,
          latencyMs: 300,
          success: true,
          qualityScore: 85,
          timestamp: new Date(),
        });
      }

      const savings = selector.getTotalPotentialSavings('agent-1');

      // Savings = (10 - 2) * 10 = 80 cents
      expect(savings).toBe(80);
    });

    it('should return 0 if no savings possible', () => {
      for (let i = 0; i < 10; i++) {
        selector.trackInference({
          agentId: 'agent-1',
          model: 'gpt-4',
          costCents: 10,
          tokens: 1000,
          latencyMs: 500,
          success: true,
          qualityScore: 90,
          timestamp: new Date(),
        });
      }

      const savings = selector.getTotalPotentialSavings('agent-1');
      expect(savings).toBe(0);
    });
  });
});
