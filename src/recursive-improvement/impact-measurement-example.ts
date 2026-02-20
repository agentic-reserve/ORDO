/**
 * Impact Measurement System - Usage Example
 * 
 * This example demonstrates how to use the impact measurement system
 * to track performance gains, cost reductions, and ROI of improvements.
 */

import {
  trackPerformanceGain,
  trackCostReduction,
  trackSuccessRateIncrease,
  calculateROI,
  measureImpact,
  generateImpactReport,
  type ImpactMetrics,
  type ImpactHistory,
} from "./impact-measurement.js";
import type { ImpactMeasurementResult } from "./improvement-testing.js";

/**
 * Example 1: Track individual metrics
 */
function example1_TrackIndividualMetrics() {
  console.log("=== Example 1: Track Individual Metrics ===\n");
  
  // Performance gain: latency reduced from 1000ms to 500ms
  const performanceGain = trackPerformanceGain(1000, 500);
  console.log(`Performance Gain: ${performanceGain}% (50% faster)`);
  
  // Cost reduction: cost reduced from 10 cents to 5 cents
  const costReduction = trackCostReduction(10, 5);
  console.log(`Cost Reduction: ${costReduction}% (50% cheaper)`);
  
  // Success rate increase: from 85% to 95%
  const successRateIncrease = trackSuccessRateIncrease(0.85, 0.95);
  console.log(`Success Rate Increase: ${successRateIncrease}pp (10 percentage points)\n`);
}

/**
 * Example 2: Calculate ROI of an improvement
 */
function example2_CalculateROI() {
  console.log("=== Example 2: Calculate ROI ===\n");
  
  const baseline = {
    avgLatencyMs: 1000,
    avgCostCents: 10,
    successRate: 0.85,
    totalOperations: 700, // 7 days * 100 ops/day
  };
  
  const improved = {
    avgLatencyMs: 500,
    avgCostCents: 5,
    successRate: 0.95,
    totalOperations: 700,
  };
  
  const roi = calculateROI(baseline, improved, 10, 30);
  
  console.log(`Implementation Cost: $${(roi.implementationCostCents / 100).toFixed(2)}`);
  console.log(`Testing Cost: $${(roi.testingCostCents / 100).toFixed(2)}`);
  console.log(`Total Cost: $${(roi.totalCostCents / 100).toFixed(2)}`);
  console.log(`Projected Savings (30 days): $${(roi.projectedSavingsCents / 100).toFixed(2)}`);
  console.log(`ROI: ${roi.roiPercent.toFixed(1)}%`);
  console.log(`Payback Period: ${roi.paybackPeriodDays.toFixed(1)} days`);
  console.log(`Net Benefit: $${(roi.netBenefitCents / 100).toFixed(2)}`);
  console.log(`Overall Value Score: ${roi.overallValueScore.toFixed(1)}/100\n`);
}

/**
 * Example 3: Measure complete impact of an improvement
 */
function example3_MeasureCompleteImpact() {
  console.log("=== Example 3: Measure Complete Impact ===\n");
  
  // Simulate an improvement test result
  const impactResult: ImpactMeasurementResult = {
    improvementId: "imp-model-switch-001",
    measurementPeriodDays: 7,
    startDate: new Date("2024-01-01"),
    endDate: new Date("2024-01-08"),
    baseline: {
      avgLatencyMs: 1200,
      avgCostCents: 12,
      successRate: 0.88,
      totalOperations: 700,
    },
    testPeriod: {
      avgLatencyMs: 600,
      avgCostCents: 6,
      successRate: 0.96,
      totalOperations: 700,
    },
    improvements: {
      speedImprovement: 50,
      costReduction: 50,
      reliabilityImprovement: 8,
    },
    dailyMeasurements: [],
    validated: true,
    validationReason: "All metrics improved significantly",
  };
  
  const impact = measureImpact(
    "imp-model-switch-001",
    "agent-alpha-001",
    impactResult,
    15 // $0.15 implementation cost
  );
  
  console.log(`Improvement ID: ${impact.improvementId}`);
  console.log(`Agent ID: ${impact.agentId}`);
  console.log(`Measurement Period: ${impact.measurementPeriodDays} days`);
  console.log(`Validation Status: ${impact.validationStatus}`);
  console.log();
  console.log("Impact Metrics:");
  console.log(`  Performance Gain: ${impact.performanceGainPercent.toFixed(1)}%`);
  console.log(`  Cost Reduction: ${impact.costReductionPercent.toFixed(1)}%`);
  console.log(`  Success Rate Increase: ${impact.successRateIncrease.toFixed(1)}pp`);
  console.log();
  console.log("ROI Analysis:");
  console.log(`  ROI: ${impact.roi.roiPercent.toFixed(1)}%`);
  console.log(`  Payback Period: ${impact.roi.paybackPeriodDays.toFixed(1)} days`);
  console.log(`  Net Benefit: $${(impact.roi.netBenefitCents / 100).toFixed(2)}`);
  console.log(`  Value Score: ${impact.roi.overallValueScore.toFixed(1)}/100\n`);
}

/**
 * Example 4: Generate impact report for an agent
 */
function example4_GenerateImpactReport() {
  console.log("=== Example 4: Generate Impact Report ===\n");
  
  // Simulate impact history for an agent
  const history: ImpactHistory = {
    agentId: "agent-alpha-001",
    improvements: [
      {
        improvementId: "imp-001",
        agentId: "agent-alpha-001",
        measurementPeriodDays: 7,
        performanceGainPercent: 50,
        costReductionPercent: 40,
        successRateIncrease: 8,
        baseline: { avgLatencyMs: 1200, avgCostCents: 12, successRate: 0.88, totalOperations: 700 },
        improved: { avgLatencyMs: 600, avgCostCents: 7.2, successRate: 0.96, totalOperations: 700 },
        roi: {
          implementationCostCents: 15,
          testingCostCents: 504,
          totalCostCents: 519,
          projectedSavingsCents: 2057,
          projectedTimeGainMs: 60000,
          projectedReliabilityGain: 8,
          roiPercent: 296.5,
          paybackPeriodDays: 7.6,
          netBenefitCents: 1538,
          overallValueScore: 82.3,
        },
        measuredAt: new Date("2024-01-08"),
        validationStatus: "validated",
      },
      {
        improvementId: "imp-002",
        agentId: "agent-alpha-001",
        measurementPeriodDays: 7,
        performanceGainPercent: 25,
        costReductionPercent: 60,
        successRateIncrease: 3,
        baseline: { avgLatencyMs: 600, avgCostCents: 7.2, successRate: 0.96, totalOperations: 700 },
        improved: { avgLatencyMs: 450, avgCostCents: 2.88, successRate: 0.99, totalOperations: 700 },
        roi: {
          implementationCostCents: 10,
          testingCostCents: 202,
          totalCostCents: 212,
          projectedSavingsCents: 1853,
          projectedTimeGainMs: 15000,
          projectedReliabilityGain: 3,
          roiPercent: 774.1,
          paybackPeriodDays: 3.4,
          netBenefitCents: 1641,
          overallValueScore: 91.7,
        },
        measuredAt: new Date("2024-01-15"),
        validationStatus: "validated",
      },
    ],
    totalImprovements: 2,
    successfulImprovements: 2,
    successRate: 1.0,
    cumulativePerformanceGain: 75,
    cumulativeCostReduction: 100,
    cumulativeReliabilityGain: 11,
    cumulativeROI: 1070.6,
    improvementVelocity: 1.0, // 1 improvement per week
    avgROI: 535.3,
    avgPaybackPeriodDays: 5.5,
  };
  
  const report = generateImpactReport(history);
  console.log(report);
  console.log();
}

/**
 * Example 5: Compare multiple improvements
 */
function example5_CompareImprovements() {
  console.log("=== Example 5: Compare Multiple Improvements ===\n");
  
  const improvements: ImpactMetrics[] = [
    {
      improvementId: "imp-speed-focused",
      agentId: "agent-001",
      measurementPeriodDays: 7,
      performanceGainPercent: 70,
      costReductionPercent: 20,
      successRateIncrease: 2,
      baseline: { avgLatencyMs: 1000, avgCostCents: 10, successRate: 0.9, totalOperations: 700 },
      improved: { avgLatencyMs: 300, avgCostCents: 8, successRate: 0.92, totalOperations: 700 },
      roi: {
        implementationCostCents: 20,
        testingCostCents: 560,
        totalCostCents: 580,
        projectedSavingsCents: 857,
        projectedTimeGainMs: 70000,
        projectedReliabilityGain: 2,
        roiPercent: 47.8,
        paybackPeriodDays: 20.3,
        netBenefitCents: 277,
        overallValueScore: 68.5,
      },
      measuredAt: new Date(),
      validationStatus: "validated",
    },
    {
      improvementId: "imp-cost-focused",
      agentId: "agent-001",
      measurementPeriodDays: 7,
      performanceGainPercent: 10,
      costReductionPercent: 80,
      successRateIncrease: 1,
      baseline: { avgLatencyMs: 1000, avgCostCents: 10, successRate: 0.9, totalOperations: 700 },
      improved: { avgLatencyMs: 900, avgCostCents: 2, successRate: 0.91, totalOperations: 700 },
      roi: {
        implementationCostCents: 10,
        testingCostCents: 140,
        totalCostCents: 150,
        projectedSavingsCents: 3429,
        projectedTimeGainMs: 10000,
        projectedReliabilityGain: 1,
        roiPercent: 2186.0,
        paybackPeriodDays: 1.3,
        netBenefitCents: 3279,
        overallValueScore: 95.2,
      },
      measuredAt: new Date(),
      validationStatus: "validated",
    },
    {
      improvementId: "imp-reliability-focused",
      agentId: "agent-001",
      measurementPeriodDays: 7,
      performanceGainPercent: 5,
      costReductionPercent: 10,
      successRateIncrease: 15,
      baseline: { avgLatencyMs: 1000, avgCostCents: 10, successRate: 0.8, totalOperations: 700 },
      improved: { avgLatencyMs: 950, avgCostCents: 9, successRate: 0.95, totalOperations: 700 },
      roi: {
        implementationCostCents: 15,
        testingCostCents: 630,
        totalCostCents: 645,
        projectedSavingsCents: 429,
        projectedTimeGainMs: 5000,
        projectedReliabilityGain: 15,
        roiPercent: -33.5,
        paybackPeriodDays: 45.1,
        netBenefitCents: -216,
        overallValueScore: 42.8,
      },
      measuredAt: new Date(),
      validationStatus: "validated",
    },
  ];
  
  console.log("Comparing 3 improvements:");
  console.log("1. Speed-focused: 70% faster, 20% cheaper, +2pp reliability");
  console.log("2. Cost-focused: 10% faster, 80% cheaper, +1pp reliability");
  console.log("3. Reliability-focused: 5% faster, 10% cheaper, +15pp reliability");
  console.log();
  
  improvements.forEach((imp, idx) => {
    console.log(`Improvement ${idx + 1} (${imp.improvementId}):`);
    console.log(`  Performance: ${imp.performanceGainPercent.toFixed(1)}%`);
    console.log(`  Cost: ${imp.costReductionPercent.toFixed(1)}%`);
    console.log(`  Reliability: ${imp.successRateIncrease.toFixed(1)}pp`);
    console.log(`  ROI: ${imp.roi.roiPercent.toFixed(1)}%`);
    console.log(`  Value Score: ${imp.roi.overallValueScore.toFixed(1)}/100`);
    console.log();
  });
  
  console.log("Winner: Cost-focused improvement");
  console.log("  - Highest ROI: 2186%");
  console.log("  - Fastest payback: 1.3 days");
  console.log("  - Best value score: 95.2/100\n");
}

/**
 * Run all examples
 */
function runAllExamples() {
  example1_TrackIndividualMetrics();
  example2_CalculateROI();
  example3_MeasureCompleteImpact();
  example4_GenerateImpactReport();
  example5_CompareImprovements();
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllExamples();
}

export {
  example1_TrackIndividualMetrics,
  example2_CalculateROI,
  example3_MeasureCompleteImpact,
  example4_GenerateImpactReport,
  example5_CompareImprovements,
  runAllExamples,
};
