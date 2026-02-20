/**
 * Cost Reduction Validator Tests
 * 
 * Tests for validating 99.95% cost reduction vs EVM.
 * 
 * Requirements: 23.6
 */

import { describe, it, expect } from 'vitest';
import {
  calculateSolanaDailyCost,
  calculateEVMDailyCost,
  comparePlatformCosts,
  validateCostReduction,
  trackCostMetrics,
  generateCostReport,
  validateRealisticCostReduction,
  COST_CONSTANTS,
} from './cost-reduction-validator.js';

describe('Cost Reduction Validator', () => {
  describe('calculateSolanaDailyCost', () => {
    it('should calculate Solana daily cost with default values', () => {
      const cost = calculateSolanaDailyCost();
      
      expect(cost.transactionCount).toBe(COST_CONSTANTS.TYPICAL_TX_COUNT_PER_DAY);
      expect(cost.transactionFees).toBeGreaterThan(0);
      expect(cost.inferenceCost).toBeGreaterThan(0);
      expect(cost.storageCost).toBeGreaterThanOrEqual(0);
      expect(cost.totalCost).toBe(
        cost.transactionFees + cost.inferenceCost + cost.storageCost
      );
    });

    it('should calculate Solana cost with custom values', () => {
      const cost = calculateSolanaDailyCost(5, 50, 5, 0.00002);
      
      expect(cost.transactionCount).toBe(5);
      expect(cost.inferenceCount).toBe(50);
      expect(cost.transactionFees).toBe(5 * COST_CONSTANTS.SOLANA_TX_FEE);
      expect(cost.inferenceCost).toBe(50 * 0.00002);
    });

    it('should have very low transaction fees on Solana', () => {
      const cost = calculateSolanaDailyCost(100, 0, 0, 0);
      
      // 100 transactions should cost less than $0.03
      expect(cost.totalCost).toBeLessThan(0.03);
    });
  });

  describe('calculateEVMDailyCost', () => {
    it('should calculate EVM daily cost with default values', () => {
      const cost = calculateEVMDailyCost();
      
      expect(cost.transactionCount).toBe(COST_CONSTANTS.TYPICAL_TX_COUNT_PER_DAY);
      expect(cost.transactionFees).toBeGreaterThan(0);
      expect(cost.totalCost).toBe(
        cost.transactionFees + cost.inferenceCost + cost.storageCost
      );
    });

    it('should have high transaction fees on EVM', () => {
      const cost = calculateEVMDailyCost(10, 0, 0, 0);
      
      // 10 transactions should cost $13 (10 * $1.30)
      expect(cost.totalCost).toBeGreaterThan(10);
    });

    it('should be significantly more expensive than Solana', () => {
      const solanaCost = calculateSolanaDailyCost(10, 100, 10);
      const evmCost = calculateEVMDailyCost(10, 100, 10);
      
      expect(evmCost.totalCost).toBeGreaterThan(solanaCost.totalCost * 100);
    });
  });

  describe('comparePlatformCosts', () => {
    it('should calculate cost reduction percentage', () => {
      const solanaCost = calculateSolanaDailyCost();
      const evmCost = calculateEVMDailyCost();
      const comparison = comparePlatformCosts(solanaCost, evmCost);
      
      expect(comparison.solanaCostPerAgent).toBe(solanaCost.totalCost);
      expect(comparison.evmCostPerAgent).toBe(evmCost.totalCost);
      expect(comparison.costReductionPercentage).toBeGreaterThan(0);
      expect(comparison.costReductionPercentage).toBeLessThanOrEqual(100);
    });

    it('should calculate cost reduction ratio', () => {
      const solanaCost = calculateSolanaDailyCost();
      const evmCost = calculateEVMDailyCost();
      const comparison = comparePlatformCosts(solanaCost, evmCost);
      
      expect(comparison.costReductionRatio).toBeGreaterThan(1);
      expect(comparison.costReductionRatio).toBe(
        comparison.evmCostPerAgent / comparison.solanaCostPerAgent
      );
    });

    it('should meet 99.95% cost reduction target', () => {
      const solanaCost = calculateSolanaDailyCost();
      const evmCost = calculateEVMDailyCost();
      const comparison = comparePlatformCosts(solanaCost, evmCost);
      
      expect(comparison.meetsTarget).toBe(true);
      expect(comparison.costReductionPercentage).toBeGreaterThanOrEqual(
        COST_CONSTANTS.TARGET_COST_REDUCTION
      );
    });
  });

  describe('validateCostReduction', () => {
    it('should validate cost reduction with default values', () => {
      const result = validateCostReduction();
      
      expect(result.valid).toBe(true);
      expect(result.comparison.meetsTarget).toBe(true);
      expect(result.message).toContain('✓');
      expect(result.message).toContain('Cost reduction target met');
    });

    it('should validate cost reduction with custom values', () => {
      const result = validateCostReduction(20, 200, 15, 0.00001);
      
      expect(result.valid).toBe(true);
      expect(result.solanaCost.transactionCount).toBe(20);
      expect(result.solanaCost.inferenceCount).toBe(200);
    });

    it('should provide detailed cost breakdown', () => {
      const result = validateCostReduction();
      
      expect(result.solanaCost).toBeDefined();
      expect(result.evmCost).toBeDefined();
      expect(result.comparison).toBeDefined();
      expect(result.message).toContain('Solana:');
      expect(result.message).toContain('EVM:');
    });

    it('should meet target for low activity agents', () => {
      const result = validateCostReduction(1, 10, 5, 0.00001);
      
      expect(result.valid).toBe(true);
      expect(result.comparison.costReductionPercentage).toBeGreaterThanOrEqual(99.95);
    });

    it('should meet target for high activity agents', () => {
      const result = validateCostReduction(100, 1000, 50, 0.00001);
      
      expect(result.valid).toBe(true);
      expect(result.comparison.costReductionPercentage).toBeGreaterThanOrEqual(99.95);
    });
  });

  describe('trackCostMetrics', () => {
    it('should track cost metrics for an agent', () => {
      const dailyCost = calculateSolanaDailyCost();
      const metrics = trackCostMetrics('agent-123', dailyCost);
      
      expect(metrics.agentId).toBe('agent-123');
      expect(metrics.dailyCost).toBe(dailyCost);
      expect(metrics.comparison).toBeDefined();
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should include platform comparison in metrics', () => {
      const dailyCost = calculateSolanaDailyCost();
      const metrics = trackCostMetrics('agent-123', dailyCost);
      
      expect(metrics.comparison.solanaCostPerAgent).toBe(dailyCost.totalCost);
      expect(metrics.comparison.evmCostPerAgent).toBeGreaterThan(dailyCost.totalCost);
      expect(metrics.comparison.meetsTarget).toBe(true);
    });
  });

  describe('generateCostReport', () => {
    it('should generate report for multiple agents', () => {
      const metrics = [
        trackCostMetrics('agent-1', calculateSolanaDailyCost(10, 100, 10)),
        trackCostMetrics('agent-2', calculateSolanaDailyCost(20, 200, 15)),
        trackCostMetrics('agent-3', calculateSolanaDailyCost(5, 50, 5)),
      ];
      
      const report = generateCostReport(metrics);
      
      expect(report.totalAgents).toBe(3);
      expect(report.avgSolanaCost).toBeGreaterThan(0);
      expect(report.avgEVMCost).toBeGreaterThan(report.avgSolanaCost);
      expect(report.avgCostReduction).toBeGreaterThanOrEqual(99.95);
      expect(report.meetsTarget).toBe(true);
    });

    it('should calculate total savings', () => {
      const metrics = [
        trackCostMetrics('agent-1', calculateSolanaDailyCost()),
        trackCostMetrics('agent-2', calculateSolanaDailyCost()),
      ];
      
      const report = generateCostReport(metrics);
      
      expect(report.totalSavings).toBeGreaterThan(0);
      expect(report.totalSavings).toBe(
        (report.avgEVMCost - report.avgSolanaCost) * report.totalAgents
      );
    });

    it('should generate formatted summary', () => {
      const metrics = [
        trackCostMetrics('agent-1', calculateSolanaDailyCost()),
      ];
      
      const report = generateCostReport(metrics);
      
      expect(report.summary).toContain('Cost Reduction Report');
      expect(report.summary).toContain('Total Agents:');
      expect(report.summary).toContain('Average Solana Cost:');
      expect(report.summary).toContain('Average EVM Cost:');
      expect(report.summary).toContain('Target Met:');
    });

    it('should handle empty metrics', () => {
      const report = generateCostReport([]);
      
      expect(report.totalAgents).toBe(0);
      expect(report.avgSolanaCost).toBe(0);
      expect(report.meetsTarget).toBe(false);
      expect(report.summary).toContain('No cost metrics available');
    });
  });

  describe('validateRealisticCostReduction', () => {
    it('should validate across multiple activity levels', () => {
      const result = validateRealisticCostReduction();
      
      expect(result.scenarios).toHaveLength(4);
      expect(result.scenarios[0].name).toContain('Low Activity');
      expect(result.scenarios[1].name).toContain('Normal Activity');
      expect(result.scenarios[2].name).toContain('High Activity');
      expect(result.scenarios[3].name).toContain('Very High Activity');
    });

    it('should meet target for all activity levels', () => {
      const result = validateRealisticCostReduction();
      
      expect(result.valid).toBe(true);
      result.scenarios.forEach(scenario => {
        expect(scenario.result.valid).toBe(true);
        expect(scenario.result.comparison.meetsTarget).toBe(true);
      });
    });

    it('should generate comprehensive summary', () => {
      const result = validateRealisticCostReduction();
      
      expect(result.summary).toContain('Cost Reduction Validation');
      expect(result.summary).toContain('Low Activity');
      expect(result.summary).toContain('Normal Activity');
      expect(result.summary).toContain('High Activity');
      expect(result.summary).toContain('Very High Activity');
    });
  });

  describe('Cost Reduction Target Validation', () => {
    it('should achieve near-target costs with minimal activity', () => {
      // With minimal activity (1 tx/day, 10 inferences/day)
      const cost = calculateSolanaDailyCost(1, 10, 5, 0.000001);
      
      // Should be very close to target
      expect(cost.totalCost).toBeLessThan(0.001); // Under $0.001/day
    });

    it('should be cost-effective with standard activity', () => {
      const cost = calculateSolanaDailyCost();
      
      // Should be under $0.01/day (still 130x+ cheaper than EVM)
      expect(cost.totalCost).toBeLessThan(0.01);
    });

    it('should achieve 99.95% cost reduction vs EVM baseline', () => {
      const result = validateCostReduction();
      
      expect(result.comparison.costReductionPercentage).toBeGreaterThanOrEqual(99.95);
    });

    it('should be at least 2000x cheaper than EVM', () => {
      const result = validateCostReduction();
      
      // 99.95% reduction = 2000x cheaper (1 / 0.0005 = 2000)
      expect(result.comparison.costReductionRatio).toBeGreaterThanOrEqual(2000);
    });

    it('should maintain cost advantage with increased activity', () => {
      const scenarios = [
        validateCostReduction(10, 100, 10),
        validateCostReduction(50, 500, 20),
        validateCostReduction(100, 1000, 50),
      ];
      
      scenarios.forEach(result => {
        expect(result.valid).toBe(true);
        expect(result.comparison.costReductionPercentage).toBeGreaterThanOrEqual(99.95);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should validate complete cost reduction workflow', () => {
      // Step 1: Calculate costs
      const solanaCost = calculateSolanaDailyCost();
      const evmCost = calculateEVMDailyCost();
      
      // Step 2: Compare platforms
      const comparison = comparePlatformCosts(solanaCost, evmCost);
      
      // Step 3: Validate reduction
      const validation = validateCostReduction();
      
      // Step 4: Track metrics
      const metrics = trackCostMetrics('test-agent', solanaCost);
      
      // Step 5: Generate report
      const report = generateCostReport([metrics]);
      
      // Verify complete workflow
      expect(comparison.meetsTarget).toBe(true);
      expect(validation.valid).toBe(true);
      expect(report.meetsTarget).toBe(true);
    });

    it('should demonstrate massive cost savings at scale', () => {
      // Simulate 1000 agents
      const agentCount = 1000;
      const metrics = Array.from({ length: agentCount }, (_, i) =>
        trackCostMetrics(`agent-${i}`, calculateSolanaDailyCost())
      );
      
      const report = generateCostReport(metrics);
      
      // With 1000 agents, daily savings should be significant
      expect(report.totalSavings).toBeGreaterThan(1000); // > $1000/day savings
      expect(report.meetsTarget).toBe(true);
      
      // Annual savings should be massive
      const annualSavings = report.totalSavings * 365;
      expect(annualSavings).toBeGreaterThan(365000); // > $365k/year savings
    });
  });
});

