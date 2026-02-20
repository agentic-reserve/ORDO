/**
 * Property-Based Tests for Cost-Optimized Model Selection
 * 
 * Feature: ordo-digital-civilization, Property 107: Cost-Optimized Model Selection
 * 
 * Property 107: Cost-Optimized Model Selection
 * For any agent, the system should track cost per model and optimize model selection
 * to minimize cost while maintaining quality.
 * 
 * Validates: Requirements 23.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CostOptimizedModelSelector, InferenceRecord } from './cost-optimized-model-selector';

describe('Property 107: Cost-Optimized Model Selection', () => {
  // Arbitrary inference record generator
  const arbInferenceRecord = (agentId: string, model: string) =>
    fc.record({
      agentId: fc.constant(agentId),
      model: fc.constant(model),
      costCents: fc.integer({ min: 1, max: 20 }),
      tokens: fc.integer({ min: 100, max: 5000 }),
      latencyMs: fc.integer({ min: 100, max: 2000 }),
      success: fc.boolean(),
      qualityScore: fc.integer({ min: 60, max: 100 }),
      timestamp: fc.date(),
    }) as fc.Arbitrary<InferenceRecord>;

  it('Property 107.1: System should track cost per model per agent', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
        fc.integer({ min: 5, max: 20 }),
        (agentId, models, inferenceCount) => {
          const selector = new CostOptimizedModelSelector();

          // Track inferences for each model
          models.forEach(model => {
            for (let i = 0; i < inferenceCount; i++) {
              const record = fc.sample(arbInferenceRecord(agentId, model), 1)[0];
              selector.trackInference(record);
            }
          });

          // Verify cost tracking for each model
          const costMap = selector.getCostByModel(agentId);
          
          expect(costMap.size).toBe(models.length);
          
          models.forEach(model => {
            const costRecord = selector.getModelCostRecord(agentId, model);
            expect(costRecord).toBeDefined();
            expect(costRecord?.inferenceCount).toBe(inferenceCount);
            expect(costRecord?.totalCost).toBeGreaterThan(0);
          });
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 107.2: Most cost-efficient model should have best quality-to-cost ratio', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(
          fc.record({
            model: fc.string({ minLength: 1, maxLength: 20 }),
            cost: fc.integer({ min: 1, max: 20 }),
            quality: fc.integer({ min: 70, max: 100 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (agentId, modelConfigs) => {
          const selector = new CostOptimizedModelSelector(70);

          // Track inferences for each model
          modelConfigs.forEach(config => {
            for (let i = 0; i < 10; i++) {
              selector.trackInference({
                agentId,
                model: config.model,
                costCents: config.cost,
                tokens: 1000,
                latencyMs: 500,
                success: true,
                qualityScore: config.quality,
                timestamp: new Date(),
              });
            }
          });

          const mostEfficient = selector.getMostCostEfficientModel(agentId);
          
          if (mostEfficient) {
            const efficientRecord = selector.getModelCostRecord(agentId, mostEfficient);
            expect(efficientRecord).toBeDefined();
            
            // Calculate cost efficiency for all models
            const efficiencies = modelConfigs.map(config => ({
              model: config.model,
              efficiency: config.quality / config.cost,
            }));
            
            // Most efficient should have highest or near-highest efficiency
            const maxEfficiency = Math.max(...efficiencies.map(e => e.efficiency));
            const efficientConfig = modelConfigs.find(c => c.model === mostEfficient);
            
            if (efficientConfig) {
              const actualEfficiency = efficientConfig.quality / efficientConfig.cost;
              expect(actualEfficiency).toBeGreaterThanOrEqual(maxEfficiency * 0.95); // Within 5%
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 107.3: Recommendations should only suggest models meeting quality threshold', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 70, max: 90 }),
        (agentId, qualityThreshold) => {
          const selector = new CostOptimizedModelSelector(qualityThreshold);

          // Track expensive model with high quality
          for (let i = 0; i < 10; i++) {
            selector.trackInference({
              agentId,
              model: 'expensive-model',
              costCents: 10,
              tokens: 1000,
              latencyMs: 500,
              success: true,
              qualityScore: 95,
              timestamp: new Date(),
            });
          }

          // Track cheap model with low quality (below threshold)
          for (let i = 0; i < 10; i++) {
            selector.trackInference({
              agentId,
              model: 'cheap-low-quality',
              costCents: 2,
              tokens: 1000,
              latencyMs: 300,
              success: true,
              qualityScore: qualityThreshold - 5,
              timestamp: new Date(),
            });
          }

          // Track cheap model with acceptable quality
          for (let i = 0; i < 10; i++) {
            selector.trackInference({
              agentId,
              model: 'cheap-good-quality',
              costCents: 3,
              tokens: 1000,
              latencyMs: 300,
              success: true,
              qualityScore: qualityThreshold + 5,
              timestamp: new Date(),
            });
          }

          const recommendation = selector.recommendModel(agentId, 'expensive-model');
          
          if (recommendation) {
            const recommendedRecord = selector.getModelCostRecord(agentId, recommendation.recommendedModel);
            expect(recommendedRecord).toBeDefined();
            expect(recommendedRecord!.avgQualityScore).toBeGreaterThanOrEqual(qualityThreshold);
            
            // Should recommend the good quality cheap model, not the low quality one
            expect(recommendation.recommendedModel).not.toBe('cheap-low-quality');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 107.4: Total cost should equal sum of individual model costs', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(
          fc.record({
            model: fc.string({ minLength: 1, maxLength: 20 }),
            inferences: fc.array(
              fc.record({
                cost: fc.integer({ min: 1, max: 20 }),
                tokens: fc.integer({ min: 100, max: 5000 }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (agentId, modelData) => {
          const selector = new CostOptimizedModelSelector();

          let expectedTotal = 0;

          // Track inferences
          modelData.forEach(data => {
            data.inferences.forEach(inf => {
              selector.trackInference({
                agentId,
                model: data.model,
                costCents: inf.cost,
                tokens: inf.tokens,
                latencyMs: 500,
                success: true,
                timestamp: new Date(),
              });
              expectedTotal += inf.cost;
            });
          });

          const totalCost = selector.getTotalCost(agentId);
          expect(totalCost).toBe(expectedTotal);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 107.5: Potential savings should be non-negative', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(
          fc.record({
            model: fc.string({ minLength: 1, maxLength: 20 }),
            cost: fc.integer({ min: 1, max: 20 }),
            quality: fc.integer({ min: 70, max: 100 }),
          }),
          { minLength: 2, maxLength: 5 }
        ),
        (agentId, modelConfigs) => {
          const selector = new CostOptimizedModelSelector(70);

          // Track inferences
          modelConfigs.forEach(config => {
            for (let i = 0; i < 10; i++) {
              selector.trackInference({
                agentId,
                model: config.model,
                costCents: config.cost,
                tokens: 1000,
                latencyMs: 500,
                success: true,
                qualityScore: config.quality,
                timestamp: new Date(),
              });
            }
          });

          const totalSavings = selector.getTotalPotentialSavings(agentId);
          expect(totalSavings).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 107.6: Recommended model should have lower cost than current model', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.integer({ min: 5, max: 15 }),
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 75, max: 95 }),
        fc.integer({ min: 75, max: 95 }),
        (agentId, expensiveCost, cheapCost, expensiveQuality, cheapQuality) => {
          const selector = new CostOptimizedModelSelector(70);

          // Track expensive model
          for (let i = 0; i < 10; i++) {
            selector.trackInference({
              agentId,
              model: 'expensive',
              costCents: expensiveCost,
              tokens: 1000,
              latencyMs: 500,
              success: true,
              qualityScore: expensiveQuality,
              timestamp: new Date(),
            });
          }

          // Track cheaper model
          for (let i = 0; i < 10; i++) {
            selector.trackInference({
              agentId,
              model: 'cheap',
              costCents: cheapCost,
              tokens: 1000,
              latencyMs: 300,
              success: true,
              qualityScore: cheapQuality,
              timestamp: new Date(),
            });
          }

          const recommendation = selector.recommendModel(agentId, 'expensive');
          
          if (recommendation) {
            expect(recommendation.potentialSavings).toBeGreaterThan(0);
            
            const currentRecord = selector.getModelCostRecord(agentId, 'expensive');
            const recommendedRecord = selector.getModelCostRecord(agentId, recommendation.recommendedModel);
            
            expect(currentRecord).toBeDefined();
            expect(recommendedRecord).toBeDefined();
            expect(recommendedRecord!.avgCostPerInference).toBeLessThan(currentRecord!.avgCostPerInference);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 107.7: Model performance metrics should be consistent with tracked data', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 20 }),
        fc.array(
          fc.record({
            cost: fc.integer({ min: 1, max: 20 }),
            latency: fc.integer({ min: 100, max: 2000 }),
            success: fc.boolean(),
            quality: fc.integer({ min: 60, max: 100 }),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        (agentId, model, inferences) => {
          const selector = new CostOptimizedModelSelector();

          // Track inferences
          inferences.forEach(inf => {
            selector.trackInference({
              agentId,
              model,
              costCents: inf.cost,
              tokens: 1000,
              latencyMs: inf.latency,
              success: inf.success,
              qualityScore: inf.quality,
              timestamp: new Date(),
            });
          });

          const metrics = selector.calculateModelPerformance(model, agentId);
          
          expect(metrics).toBeDefined();
          
          // Verify metrics match tracked data
          const avgLatency = inferences.reduce((sum, inf) => sum + inf.latency, 0) / inferences.length;
          const successRate = inferences.filter(inf => inf.success).length / inferences.length;
          const avgQuality = inferences.reduce((sum, inf) => sum + inf.quality, 0) / inferences.length;
          
          expect(metrics!.avgLatency).toBeCloseTo(avgLatency, 1);
          expect(metrics!.successRate).toBeCloseTo(successRate, 2);
          expect(metrics!.qualityScore).toBeCloseTo(avgQuality, 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
