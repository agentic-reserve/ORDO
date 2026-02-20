/**
 * Modification Success Tracking
 *
 * Tracks modifications over 7-day windows and correlates with fitness improvements.
 * Implements Requirement 4.6.
 */

import type {
  OrdoDatabase,
  Agent,
} from "../types/index.js";
import type { SelfModification } from "./proposal.js";
import type { ImplementationResult } from "./outcome-handler.js";
import { ulid } from "ulid";

/**
 * Success tracking record for a modification
 */
export interface ModificationSuccessRecord {
  recordId: string;
  modificationId: string;
  implementationId: string;
  modificationType: string;
  target: string;
  
  // Tracking window
  trackingStartDate: string;
  trackingEndDate: string;
  trackingWindowDays: number;
  
  // Fitness metrics before modification
  fitnessBeforeModification: FitnessSnapshot;
  
  // Fitness metrics after modification
  fitnessAfterModification: FitnessSnapshot;
  
  // Success determination
  success: boolean;
  fitnessImprovement: number; // percentage
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Fitness snapshot at a point in time
 */
export interface FitnessSnapshot {
  survivalDays: number;
  totalEarnings: number;
  totalCosts: number;
  netBalance: number;
  offspringCount: number;
  successfulOperations: number;
  failedOperations: number;
  overallFitness: number;
  timestamp: string;
}

/**
 * Aggregated success statistics for modifications
 */
export interface ModificationSuccessStatistics {
  totalModifications: number;
  successfulModifications: number;
  failedModifications: number;
  successRate: number;
  avgFitnessImprovement: number;
  
  // By modification type
  byType: Record<string, {
    total: number;
    successful: number;
    successRate: number;
    avgFitnessImprovement: number;
  }>;
  
  // Time period
  periodStartDate: string;
  periodEndDate: string;
  periodDays: number;
}

/**
 * Capture fitness snapshot for an agent at current time
 */
export function captureFitnessSnapshot(
  agent: Agent,
  db: AutomatonDatabase,
): FitnessSnapshot {
  const now = new Date();
  
  // Calculate survival days
  const birthDate = new Date(agent.birthDate);
  const survivalDays = (now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24);
  
  // Get operation statistics
  const recentTurns = db.getRecentTurns(1000);
  const successfulOperations = recentTurns.reduce(
    (sum, turn) => sum + turn.toolCalls.filter((tc) => !tc.error).length,
    0,
  );
  const failedOperations = recentTurns.reduce(
    (sum, turn) => sum + turn.toolCalls.filter((tc) => tc.error).length,
    0,
  );
  
  // Calculate overall fitness (weighted combination)
  const survivalFitness = Math.min(survivalDays / agent.maxLifespan, 1.0);
  const economicFitness = agent.balance / 10.0; // Normalized to 10 SOL
  const offspringFitness = agent.fitness.offspring / 5.0; // Normalized to 5 offspring
  const operationFitness = successfulOperations / Math.max(successfulOperations + failedOperations, 1);
  
  const overallFitness =
    survivalFitness * 0.25 +
    economicFitness * 0.35 +
    offspringFitness * 0.20 +
    operationFitness * 0.20;
  
  return {
    survivalDays,
    totalEarnings: agent.totalEarnings,
    totalCosts: agent.totalCosts,
    netBalance: agent.balance,
    offspringCount: agent.fitness.offspring,
    successfulOperations,
    failedOperations,
    overallFitness,
    timestamp: now.toISOString(),
  };
}

/**
 * Start tracking a modification's success
 * Captures initial fitness snapshot
 */
export function startModificationTracking(
  implementation: ImplementationResult,
  agent: Agent,
  db: AutomatonDatabase,
  trackingWindowDays: number = 7,
): ModificationSuccessRecord {
  const recordId = ulid();
  const now = new Date();
  const trackingEndDate = new Date(now);
  trackingEndDate.setDate(trackingEndDate.getDate() + trackingWindowDays);
  
  const fitnessBeforeModification = captureFitnessSnapshot(agent, db);
  
  const record: ModificationSuccessRecord = {
    recordId,
    modificationId: implementation.modificationId,
    implementationId: implementation.implementationId,
    modificationType: "unknown", // Will be filled from implementation details
    target: "unknown",
    trackingStartDate: now.toISOString(),
    trackingEndDate: trackingEndDate.toISOString(),
    trackingWindowDays,
    fitnessBeforeModification,
    fitnessAfterModification: {
      survivalDays: 0,
      totalEarnings: 0,
      totalCosts: 0,
      netBalance: 0,
      offspringCount: 0,
      successfulOperations: 0,
      failedOperations: 0,
      overallFitness: 0,
      timestamp: "",
    },
    success: false,
    fitnessImprovement: 0,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
  
  // Store in database
  db.storeModificationSuccessRecord(record);
  
  return record;
}

/**
 * Complete tracking for a modification
 * Captures final fitness snapshot and determines success
 */
export function completeModificationTracking(
  recordId: string,
  agent: Agent,
  db: AutomatonDatabase,
): ModificationSuccessRecord {
  const record = db.getModificationSuccessRecord(recordId);
  if (!record) {
    throw new Error(`Modification success record ${recordId} not found`);
  }
  
  const now = new Date();
  const fitnessAfterModification = captureFitnessSnapshot(agent, db);
  
  // Calculate fitness improvement
  const fitnessImprovement =
    fitnessAfterModification.overallFitness > 0
      ? ((fitnessAfterModification.overallFitness -
          record.fitnessBeforeModification.overallFitness) /
          record.fitnessBeforeModification.overallFitness) *
        100
      : 0;
  
  // Determine success (at least 5% improvement)
  const success = fitnessImprovement >= 5;
  
  const updatedRecord: ModificationSuccessRecord = {
    ...record,
    fitnessAfterModification,
    success,
    fitnessImprovement,
    updatedAt: now.toISOString(),
  };
  
  // Update in database
  db.updateModificationSuccessRecord(updatedRecord);
  
  return updatedRecord;
}

/**
 * Track modifications over a time period
 * Returns all modifications within the period with their success status
 */
export function trackModificationsOverPeriod(
  db: AutomatonDatabase,
  startDate: Date,
  endDate: Date,
): ModificationSuccessRecord[] {
  const records = db.getModificationSuccessRecordsBetweenDates(startDate, endDate);
  return records;
}

/**
 * Correlate modifications with fitness improvements
 * Analyzes which modifications led to fitness gains
 */
export function correlateModificationsWithFitness(
  db: AutomatonDatabase,
  periodDays: number = 30,
): {
  correlations: Array<{
    modificationType: string;
    target: string;
    avgFitnessImprovement: number;
    successRate: number;
    sampleSize: number;
  }>;
  overallCorrelation: number;
} {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - periodDays);
  
  const records = trackModificationsOverPeriod(db, startDate, endDate);
  
  // Group by modification type and target
  const groups = new Map<string, ModificationSuccessRecord[]>();
  
  for (const record of records) {
    const key = `${record.modificationType}:${record.target}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(record);
  }
  
  // Calculate correlations for each group
  const correlations = Array.from(groups.entries()).map(([key, groupRecords]) => {
    const [modificationType, target] = key.split(":");
    const successfulCount = groupRecords.filter((r) => r.success).length;
    const totalFitnessImprovement = groupRecords.reduce(
      (sum, r) => sum + r.fitnessImprovement,
      0,
    );
    
    return {
      modificationType,
      target,
      avgFitnessImprovement: totalFitnessImprovement / groupRecords.length,
      successRate: successfulCount / groupRecords.length,
      sampleSize: groupRecords.length,
    };
  });
  
  // Calculate overall correlation
  const totalSuccessful = records.filter((r) => r.success).length;
  const overallCorrelation = records.length > 0 ? totalSuccessful / records.length : 0;
  
  return {
    correlations: correlations.sort((a, b) => b.avgFitnessImprovement - a.avgFitnessImprovement),
    overallCorrelation,
  };
}

/**
 * Build modification success database
 * Aggregates statistics about modification success rates
 */
export function buildModificationSuccessDatabase(
  db: AutomatonDatabase,
  periodDays: number = 30,
): ModificationSuccessStatistics {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - periodDays);
  
  const records = trackModificationsOverPeriod(db, startDate, endDate);
  
  const totalModifications = records.length;
  const successfulModifications = records.filter((r) => r.success).length;
  const failedModifications = totalModifications - successfulModifications;
  const successRate = totalModifications > 0 ? successfulModifications / totalModifications : 0;
  
  const totalFitnessImprovement = records.reduce(
    (sum, r) => sum + r.fitnessImprovement,
    0,
  );
  const avgFitnessImprovement =
    totalModifications > 0 ? totalFitnessImprovement / totalModifications : 0;
  
  // Group by modification type
  const byType: Record<string, {
    total: number;
    successful: number;
    successRate: number;
    avgFitnessImprovement: number;
  }> = {};
  
  for (const record of records) {
    const type = record.modificationType;
    if (!byType[type]) {
      byType[type] = {
        total: 0,
        successful: 0,
        successRate: 0,
        avgFitnessImprovement: 0,
      };
    }
    
    byType[type].total += 1;
    if (record.success) {
      byType[type].successful += 1;
    }
    byType[type].avgFitnessImprovement += record.fitnessImprovement;
  }
  
  // Calculate averages for each type
  for (const type in byType) {
    const stats = byType[type];
    stats.successRate = stats.total > 0 ? stats.successful / stats.total : 0;
    stats.avgFitnessImprovement = stats.total > 0 ? stats.avgFitnessImprovement / stats.total : 0;
  }
  
  return {
    totalModifications,
    successfulModifications,
    failedModifications,
    successRate,
    avgFitnessImprovement,
    byType,
    periodStartDate: startDate.toISOString(),
    periodEndDate: endDate.toISOString(),
    periodDays,
  };
}

/**
 * Get most successful modification types
 * Returns modification types ranked by success rate and fitness improvement
 */
export function getMostSuccessfulModificationTypes(
  db: AutomatonDatabase,
  periodDays: number = 30,
  limit: number = 10,
): Array<{
  modificationType: string;
  successRate: number;
  avgFitnessImprovement: number;
  total: number;
}> {
  const stats = buildModificationSuccessDatabase(db, periodDays);
  
  const types = Object.entries(stats.byType).map(([type, data]) => ({
    modificationType: type,
    successRate: data.successRate,
    avgFitnessImprovement: data.avgFitnessImprovement,
    total: data.total,
  }));
  
  // Sort by success rate first, then by fitness improvement
  types.sort((a, b) => {
    if (Math.abs(a.successRate - b.successRate) > 0.1) {
      return b.successRate - a.successRate;
    }
    return b.avgFitnessImprovement - a.avgFitnessImprovement;
  });
  
  return types.slice(0, limit);
}

/**
 * Identify high-impact modifications
 * Returns modifications that led to significant fitness improvements
 */
export function identifyHighImpactModifications(
  db: AutomatonDatabase,
  periodDays: number = 30,
  minImprovementPercent: number = 20,
): ModificationSuccessRecord[] {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - periodDays);
  
  const records = trackModificationsOverPeriod(db, startDate, endDate);
  
  return records
    .filter((r) => r.success && r.fitnessImprovement >= minImprovementPercent)
    .sort((a, b) => b.fitnessImprovement - a.fitnessImprovement);
}
