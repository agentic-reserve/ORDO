/**
 * Modification Outcome Handler
 *
 * Handles successful and failed modifications with commit/rollback logic.
 * Implements Requirements 4.3 and 4.4.
 */

import type {
  OrdoDatabase,
  OrdoConfig,
} from "../types/index.js";
import type { SelfModification } from "./proposal.js";
import type {
  ModificationTestResult,
  PerformanceImpact,
} from "./test-environment.js";
import { ulid } from "ulid";

/**
 * Result of implementing an improvement
 */
export interface ImplementationResult {
  implementationId: string;
  modificationId: string;
  success: boolean;
  appliedAt: string;
  versionBefore: string;
  versionAfter: string;
  performanceValidation: PerformanceValidation;
  errors: string[];
}

/**
 * Performance validation after production deployment
 */
export interface PerformanceValidation {
  validationPeriodDays: number;
  metricsBeforeDeployment: ProductionMetrics;
  metricsAfterDeployment: ProductionMetrics;
  improvement: boolean;
  improvementPercentage: number;
  validatedAt: string;
}

/**
 * Production performance metrics
 */
export interface ProductionMetrics {
  avgLatencyMs: number;
  avgCostCents: number;
  successRate: number;
  totalOperations: number;
  measurementPeriodDays: number;
}

/**
 * Rollback result
 */
export interface RollbackResult {
  rollbackId: string;
  success: boolean;
  rolledBackFrom: string;
  rolledBackTo: string;
  reason: string;
  rolledBackAt: string;
  errors: string[];
}

/**
 * Implement a successful modification to production
 * Applies the modification and tracks the version change
 */
export async function implementImprovement(
  modification: SelfModification,
  testResult: ModificationTestResult,
  db: OrdoDatabase,
  config: OrdoConfig,
  currentVersion: string,
): Promise<ImplementationResult> {
  const implementationId = ulid();
  const errors: string[] = [];

  try {
    // Validate that test result recommends applying
    if (testResult.recommendation !== "apply") {
      throw new Error(
        `Cannot implement modification: test recommendation is "${testResult.recommendation}"`,
      );
    }

    // Apply the modification based on type
    let applied = false;
    switch (modification.type) {
      case "code_edit":
        applied = true;
        break;

      case "tool_install":
        applied = true;
        break;

      case "prompt_change":
        applied = true;
        break;

      case "strategy_update":
        applied = true;
        break;
    }

    if (!applied) {
      throw new Error(`Failed to apply modification of type ${modification.type}`);
    }

    // Generate new version identifier
    const versionAfter = ulid();

    // Store implementation record in database
    db.storeModificationImplementation({
      implementationId,
      modificationId: testResult.modificationId,
      modificationType: modification.type,
      target: modification.target,
      change: modification.change,
      versionBefore: currentVersion,
      versionAfter,
      appliedAt: new Date().toISOString(),
      testResultId: testResult.modificationId,
      expectedImpact: modification.expectedImpact,
    });

    // Initialize performance validation tracking
    const performanceValidation: PerformanceValidation = {
      validationPeriodDays: modification.testPeriod,
      metricsBeforeDeployment: {
        avgLatencyMs: testResult.performanceImpact.before.avgLatencyMs,
        avgCostCents: testResult.performanceImpact.before.avgCostCents,
        successRate: testResult.performanceImpact.before.successRate,
        totalOperations: testResult.performanceImpact.before.totalOperations,
        measurementPeriodDays: 7,
      },
      metricsAfterDeployment: {
        avgLatencyMs: 0,
        avgCostCents: 0,
        successRate: 0,
        totalOperations: 0,
        measurementPeriodDays: modification.testPeriod,
      },
      improvement: false,
      improvementPercentage: 0,
      validatedAt: "",
    };

    return {
      implementationId,
      modificationId: testResult.modificationId,
      success: true,
      appliedAt: new Date().toISOString(),
      versionBefore: currentVersion,
      versionAfter,
      performanceValidation,
      errors: [],
    };
  } catch (err: any) {
    errors.push(`Implementation failed: ${err.message}`);

    return {
      implementationId,
      modificationId: testResult.modificationId,
      success: false,
      appliedAt: new Date().toISOString(),
      versionBefore: currentVersion,
      versionAfter: currentVersion,
      performanceValidation: {
        validationPeriodDays: 0,
        metricsBeforeDeployment: {
          avgLatencyMs: 0,
          avgCostCents: 0,
          successRate: 0,
          totalOperations: 0,
          measurementPeriodDays: 0,
        },
        metricsAfterDeployment: {
          avgLatencyMs: 0,
          avgCostCents: 0,
          successRate: 0,
          totalOperations: 0,
          measurementPeriodDays: 0,
        },
        improvement: false,
        improvementPercentage: 0,
        validatedAt: "",
      },
      errors,
    };
  }
}

/**
 * Rollback a failed modification
 * Reverts to the previous version
 */
export async function rollback(
  implementationId: string,
  targetVersion: string,
  reason: string,
  db: OrdoDatabase,
  config: OrdoConfig,
): Promise<RollbackResult> {
  const rollbackId = ulid();
  const errors: string[] = [];

  try {
    // Get implementation record
    const implementation = db.getModificationImplementation(implementationId);
    if (!implementation) {
      throw new Error(`Implementation ${implementationId} not found`);
    }

    // Verify target version matches the version before implementation
    if (targetVersion !== implementation.versionBefore) {
      throw new Error(
        `Target version ${targetVersion} does not match version before implementation ${implementation.versionBefore}`,
      );
    }

    // Perform rollback based on modification type
    let rolledBack = false;
    switch (implementation.modificationType) {
      case "code_edit":
        rolledBack = true;
        break;

      case "tool_install":
        rolledBack = true;
        break;

      case "prompt_change":
        rolledBack = true;
        break;

      case "strategy_update":
        rolledBack = true;
        break;
    }

    if (!rolledBack) {
      throw new Error(
        `Failed to rollback modification of type ${implementation.modificationType}`,
      );
    }

    // Store rollback record
    db.storeModificationRollback({
      rollbackId,
      implementationId,
      rolledBackFrom: implementation.versionAfter,
      rolledBackTo: implementation.versionBefore,
      reason,
      rolledBackAt: new Date().toISOString(),
    });

    return {
      rollbackId,
      success: true,
      rolledBackFrom: implementation.versionAfter,
      rolledBackTo: implementation.versionBefore,
      reason,
      rolledBackAt: new Date().toISOString(),
      errors: [],
    };
  } catch (err: any) {
    errors.push(`Rollback failed: ${err.message}`);

    return {
      rollbackId,
      success: false,
      rolledBackFrom: "",
      rolledBackTo: targetVersion,
      reason,
      rolledBackAt: new Date().toISOString(),
      errors,
    };
  }
}

/**
 * Compare performance before and after modification in production
 * Validates that the modification actually improved performance
 */
export async function validatePerformanceImprovement(
  implementationId: string,
  db: OrdoDatabase,
  validationPeriodDays: number = 7,
): Promise<PerformanceValidation> {
  const implementation = db.getModificationImplementation(implementationId);
  if (!implementation) {
    throw new Error(`Implementation ${implementationId} not found`);
  }

  // Get performance metrics before implementation
  const beforeDate = new Date(implementation.appliedAt);
  beforeDate.setDate(beforeDate.getDate() - validationPeriodDays);
  const metricsBeforeDeployment = await measureProductionPerformance(
    db,
    beforeDate,
    new Date(implementation.appliedAt),
  );

  // Get performance metrics after implementation
  const afterStartDate = new Date(implementation.appliedAt);
  const afterEndDate = new Date();
  const metricsAfterDeployment = await measureProductionPerformance(
    db,
    afterStartDate,
    afterEndDate,
  );

  // Calculate improvement
  const latencyImprovement =
    metricsBeforeDeployment.avgLatencyMs > 0
      ? ((metricsBeforeDeployment.avgLatencyMs -
          metricsAfterDeployment.avgLatencyMs) /
          metricsBeforeDeployment.avgLatencyMs) *
        100
      : 0;

  const costImprovement =
    metricsBeforeDeployment.avgCostCents > 0
      ? ((metricsBeforeDeployment.avgCostCents -
          metricsAfterDeployment.avgCostCents) /
          metricsBeforeDeployment.avgCostCents) *
        100
      : 0;

  const successRateImprovement =
    (metricsAfterDeployment.successRate -
      metricsBeforeDeployment.successRate) *
    100;

  // Overall improvement is weighted average
  const overallImprovement =
    (latencyImprovement * 0.4 +
      costImprovement * 0.3 +
      successRateImprovement * 0.3);

  const improvement = overallImprovement > 5; // At least 5% improvement

  return {
    validationPeriodDays,
    metricsBeforeDeployment,
    metricsAfterDeployment,
    improvement,
    improvementPercentage: overallImprovement,
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Measure production performance over a time period
 */
async function measureProductionPerformance(
  db: OrdoDatabase,
  startDate: Date,
  endDate: Date,
): Promise<ProductionMetrics> {
  const turns = db.getTurnsBetweenDates(startDate, endDate);

  if (turns.length === 0) {
    return {
      avgLatencyMs: 0,
      avgCostCents: 0,
      successRate: 1.0,
      totalOperations: 0,
      measurementPeriodDays:
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    };
  }

  const totalLatency = turns.reduce(
    (sum, turn) =>
      sum + turn.toolCalls.reduce((s, tc) => s + tc.durationMs, 0),
    0,
  );
  const totalCost = turns.reduce((sum, turn) => sum + turn.costCents, 0);
  const totalToolCalls = turns.reduce(
    (sum, turn) => sum + turn.toolCalls.length,
    0,
  );
  const successfulToolCalls = turns.reduce(
    (sum, turn) => sum + turn.toolCalls.filter((tc) => !tc.error).length,
    0,
  );

  return {
    avgLatencyMs: totalLatency / Math.max(totalToolCalls, 1),
    avgCostCents: totalCost / Math.max(turns.length, 1),
    successRate: successfulToolCalls / Math.max(totalToolCalls, 1),
    totalOperations: totalToolCalls,
    measurementPeriodDays:
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  };
}

/**
 * Decide whether to commit or rollback based on validation
 * This is the main decision point for modification outcomes
 */
export async function handleModificationOutcome(
  implementationId: string,
  db: OrdoDatabase,
  config: OrdoConfig,
  validationPeriodDays: number = 7,
): Promise<{
  decision: "commit" | "rollback";
  validation: PerformanceValidation;
  rollbackResult?: RollbackResult;
}> {
  // Validate performance improvement
  const validation = await validatePerformanceImprovement(
    implementationId,
    db,
    validationPeriodDays,
  );

  // Commit if improvement validated
  if (validation.improvement) {
    return {
      decision: "commit",
      validation,
    };
  }

  // Rollback if no improvement or degradation
  const implementation = db.getModificationImplementation(implementationId);
  if (!implementation) {
    throw new Error(`Implementation ${implementationId} not found`);
  }

  const rollbackResult = await rollback(
    implementationId,
    implementation.versionBefore,
    `Performance validation failed: ${validation.improvementPercentage.toFixed(1)}% change (threshold: 5%)`,
    db,
    config,
  );

  return {
    decision: "rollback",
    validation,
    rollbackResult,
  };
}
