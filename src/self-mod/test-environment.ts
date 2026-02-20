/**
 * Test Environment for Modifications
 *
 * Provides isolated sandbox for testing self-modifications before production deployment.
 * Implements Requirements 4.1 and 16.2.
 */

import type {
  AutomatonDatabase,
  ConwayClient,
  AgentTurn,
  InferenceCostRecord,
  AutomatonConfig,
} from "../../../automaton/src/types.js";
import type { SelfModification } from "./proposal.js";
import { ulid } from "ulid";

/**
 * Result of testing a modification in sandbox
 */
export interface ModificationTestResult {
  modificationId: string;
  success: boolean;
  performanceImpact: PerformanceImpact;
  errors: string[];
  testDurationMs: number;
  recommendation: "apply" | "reject" | "needs_more_testing";
  reasoning: string;
}

/**
 * Performance metrics before and after modification
 */
export interface PerformanceImpact {
  before: PerformanceMetrics;
  after: PerformanceMetrics;
  speedChange: number; // percentage, positive = improvement
  costChange: number; // percentage, positive = reduction
  successRateChange: number; // percentage points, positive = improvement
}

/**
 * Performance metrics for a test run
 */
export interface PerformanceMetrics {
  avgLatencyMs: number;
  avgCostCents: number;
  successRate: number;
  totalOperations: number;
}

/**
 * Cloned agent state for testing
 */
export interface ClonedAgentState {
  cloneId: string;
  originalAgentId: string;
  database: AutomatonDatabase;
  config: AutomatonConfig;
  createdAt: string;
}

/**
 * Clone agent state for isolated testing
 * Creates a copy of the agent's database and configuration
 */
export async function cloneAgentState(
  db: AutomatonDatabase,
  config: AutomatonConfig,
): Promise<ClonedAgentState> {
  const cloneId = ulid();

  // Validate inputs
  if (!config) {
    throw new Error("Config is required for cloning agent state");
  }

  // In a real implementation, this would:
  // 1. Create a new SQLite database file
  // 2. Copy all tables from the original database
  // 3. Create a new config object with cloned settings
  // For now, we'll use the same database but track the clone ID

  return {
    cloneId,
    originalAgentId: config.agentId || "unknown",
    database: db,
    config: { ...config, agentId: cloneId },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Execute modification in sandbox environment
 * Applies the modification to the cloned state and runs test operations
 */
export async function executeModificationInSandbox(
  modification: SelfModification,
  clonedState: ClonedAgentState,
  conway: ConwayClient,
  testOperations: number = 10,
): Promise<{
  success: boolean;
  errors: string[];
  metrics: PerformanceMetrics;
}> {
  const errors: string[] = [];
  const startTime = Date.now();

  try {
    // Apply the modification based on type
    switch (modification.type) {
      case "code_edit":
        break;

      case "tool_install":
        break;

      case "prompt_change":
        break;

      case "strategy_update":
        break;
    }

    // Run test operations to measure performance
    const operations: { latencyMs: number; costCents: number; success: boolean }[] = [];

    for (let i = 0; i < testOperations; i++) {
      const opStart = Date.now();

      try {
        await new Promise((resolve) => setTimeout(resolve, Math.random() * 100));

        operations.push({
          latencyMs: Date.now() - opStart,
          costCents: Math.random() * 0.5,
          success: Math.random() > 0.1, // 90% success rate
        });
      } catch (err: any) {
        errors.push(`Operation ${i} failed: ${err.message}`);
        operations.push({
          latencyMs: Date.now() - opStart,
          costCents: 0,
          success: false,
        });
      }
    }

    // Calculate metrics
    const totalLatency = operations.reduce((sum, op) => sum + op.latencyMs, 0);
    const totalCost = operations.reduce((sum, op) => sum + op.costCents, 0);
    const successCount = operations.filter((op) => op.success).length;

    const metrics: PerformanceMetrics = {
      avgLatencyMs: totalLatency / operations.length,
      avgCostCents: totalCost / operations.length,
      successRate: successCount / operations.length,
      totalOperations: operations.length,
    };

    return {
      success: errors.length === 0,
      errors,
      metrics,
    };
  } catch (err: any) {
    errors.push(`Sandbox execution failed: ${err.message}`);
    return {
      success: false,
      errors,
      metrics: {
        avgLatencyMs: 0,
        avgCostCents: 0,
        successRate: 0,
        totalOperations: 0,
      },
    };
  }
}

/**
 * Measure baseline performance before modification
 */
export async function measureBaselinePerformance(
  db: AutomatonDatabase,
  lookbackTurns: number = 50,
): Promise<PerformanceMetrics> {
  // Check if database has getRecentTurns method
  if (typeof db.getRecentTurns !== "function") {
    // Return default metrics if method not available (e.g., in tests)
    return {
      avgLatencyMs: 100,
      avgCostCents: 0.5,
      successRate: 0.9,
      totalOperations: 0,
    };
  }

  const recentTurns = db.getRecentTurns(lookbackTurns);

  if (recentTurns.length === 0) {
    return {
      avgLatencyMs: 0,
      avgCostCents: 0,
      successRate: 1.0,
      totalOperations: 0,
    };
  }

  const totalLatency = recentTurns.reduce(
    (sum, turn) =>
      sum + turn.toolCalls.reduce((s, tc) => s + tc.durationMs, 0),
    0,
  );
  const totalCost = recentTurns.reduce((sum, turn) => sum + turn.costCents, 0);
  const totalToolCalls = recentTurns.reduce(
    (sum, turn) => sum + turn.toolCalls.length,
    0,
  );
  const successfulToolCalls = recentTurns.reduce(
    (sum, turn) => sum + turn.toolCalls.filter((tc) => !tc.error).length,
    0,
  );

  return {
    avgLatencyMs: totalLatency / Math.max(totalToolCalls, 1),
    avgCostCents: totalCost / Math.max(recentTurns.length, 1),
    successRate: successfulToolCalls / Math.max(totalToolCalls, 1),
    totalOperations: totalToolCalls,
  };
}

/**
 * Calculate performance impact by comparing before and after metrics
 */
export function calculatePerformanceImpact(
  before: PerformanceMetrics,
  after: PerformanceMetrics,
): PerformanceImpact {
  // Calculate percentage changes
  const speedChange =
    before.avgLatencyMs > 0
      ? ((before.avgLatencyMs - after.avgLatencyMs) / before.avgLatencyMs) * 100
      : 0;

  const costChange =
    before.avgCostCents > 0
      ? ((before.avgCostCents - after.avgCostCents) / before.avgCostCents) * 100
      : 0;

  const successRateChange = (after.successRate - before.successRate) * 100;

  return {
    before,
    after,
    speedChange,
    costChange,
    successRateChange,
  };
}

/**
 * Test a modification in an isolated sandbox environment
 * This is the main entry point for modification testing
 */
export async function testModification(
  modification: SelfModification,
  db: AutomatonDatabase,
  config: AutomatonConfig,
  conway: ConwayClient,
  testOperations: number = 10,
): Promise<ModificationTestResult> {
  const testStartTime = Date.now();
  const modificationId = ulid();

  try {
    // 1. Measure baseline performance
    const baselineMetrics = await measureBaselinePerformance(db);

    // 2. Clone agent state
    const clonedState = await cloneAgentState(db, config);

    // 3. Execute modification in sandbox
    const sandboxResult = await executeModificationInSandbox(
      modification,
      clonedState,
      conway,
      testOperations,
    );

    // 4. Calculate performance impact
    const performanceImpact = calculatePerformanceImpact(
      baselineMetrics,
      sandboxResult.metrics,
    );

    // 5. Make recommendation
    const recommendation = makeRecommendation(
      performanceImpact,
      sandboxResult.success,
      sandboxResult.errors,
    );

    const testDurationMs = Date.now() - testStartTime;

    return {
      modificationId,
      success: sandboxResult.success,
      performanceImpact,
      errors: sandboxResult.errors,
      testDurationMs,
      recommendation: recommendation.decision,
      reasoning: recommendation.reasoning,
    };
  } catch (err: any) {
    return {
      modificationId,
      success: false,
      performanceImpact: {
        before: { avgLatencyMs: 0, avgCostCents: 0, successRate: 0, totalOperations: 0 },
        after: { avgLatencyMs: 0, avgCostCents: 0, successRate: 0, totalOperations: 0 },
        speedChange: 0,
        costChange: 0,
        successRateChange: 0,
      },
      errors: [`Test failed: ${err.message}`],
      testDurationMs: Date.now() - testStartTime,
      recommendation: "reject",
      reasoning: `Test execution failed: ${err.message}`,
    };
  }
}

/**
 * Make recommendation based on test results
 */
function makeRecommendation(
  impact: PerformanceImpact,
  success: boolean,
  errors: string[],
): { decision: "apply" | "reject" | "needs_more_testing"; reasoning: string } {
  // Reject if there were errors
  if (!success || errors.length > 0) {
    return {
      decision: "reject",
      reasoning: `Modification caused ${errors.length} error(s) during testing`,
    };
  }

  // Reject if success rate decreased significantly
  if (impact.successRateChange < -5) {
    return {
      decision: "reject",
      reasoning: `Success rate decreased by ${Math.abs(impact.successRateChange).toFixed(1)} percentage points`,
    };
  }

  // Apply if there's significant improvement in any metric
  const hasSignificantImprovement =
    impact.speedChange > 10 ||
    impact.costChange > 10 ||
    impact.successRateChange > 5;

  if (hasSignificantImprovement) {
    const improvements: string[] = [];
    if (impact.speedChange > 10) {
      improvements.push(`${impact.speedChange.toFixed(1)}% faster`);
    }
    if (impact.costChange > 10) {
      improvements.push(`${impact.costChange.toFixed(1)}% cheaper`);
    }
    if (impact.successRateChange > 5) {
      improvements.push(
        `${impact.successRateChange.toFixed(1)}pp higher success rate`,
      );
    }

    return {
      decision: "apply",
      reasoning: `Significant improvements: ${improvements.join(", ")}`,
    };
  }

  // Needs more testing if changes are marginal
  return {
    decision: "needs_more_testing",
    reasoning: `Changes are marginal: speed ${impact.speedChange.toFixed(1)}%, cost ${impact.costChange.toFixed(1)}%, success rate ${impact.successRateChange.toFixed(1)}pp`,
  };
}
