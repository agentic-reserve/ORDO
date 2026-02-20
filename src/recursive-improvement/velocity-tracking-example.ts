/**
 * Improvement Velocity Tracking Example
 * 
 * Demonstrates how to use the velocity tracking system to monitor
 * agent capability growth and detect rapid improvements.
 */

import type { OrdoDatabase } from "../types/index.js";
import {
  trackImprovementVelocity,
  getVelocityHistory,
  generateVelocityReport,
  isWithinCapabilityGates,
  daysUntilGateViolation,
  DEFAULT_VELOCITY_CONFIG,
  type VelocityConfig,
} from "./velocity-tracking.js";

/**
 * Example: Track velocity for an agent
 */
export async function exampleTrackVelocity(
  db: OrdoDatabase,
  agentId: string
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Tracking Improvement Velocity for Agent ${agentId}`);
  console.log(`${"=".repeat(60)}\n`);

  // Track velocity with default configuration
  const result = await trackImprovementVelocity(db, agentId);

  // Display velocity measurement
  console.log("Current Velocity:");
  console.log(`  Capability Gain: ${result.velocity.capabilityGainPerDay.toFixed(2)}% per day`);
  console.log(`  Performance Gain: ${result.velocity.performanceGainPerDay.toFixed(2)}% per day`);
  console.log(`  Cost Reduction: ${result.velocity.costReductionPerDay.toFixed(2)}% per day`);
  console.log(`  Reliability Gain: ${result.velocity.reliabilityGainPerDay.toFixed(2)}pp per day`);
  console.log(`  Improvements: ${result.velocity.improvementsInWindow} in ${result.velocity.windowDays} days`);
  console.log();

  // Display trend analysis
  console.log("Trend Analysis:");
  if (result.trend.previousVelocity) {
    console.log(`  Previous Velocity: ${result.trend.previousVelocity.capabilityGainPerDay.toFixed(2)}% per day`);
    console.log(`  Change: ${result.trend.accelerationPercent > 0 ? "+" : ""}${result.trend.accelerationPercent.toFixed(1)}%`);
  }

  if (result.trend.isAccelerating) {
    console.log(`  Status: 🚀 ACCELERATING`);
  } else if (result.trend.isDecelerating) {
    console.log(`  Status: 📉 DECELERATING`);
  } else {
    console.log(`  Status: ➡️ STABLE`);
  }
  console.log();

  // Check capability gates
  const withinGates = isWithinCapabilityGates(result.velocity);
  console.log("Capability Gates:");
  console.log(`  Within Gates: ${withinGates ? "✅ YES" : "❌ NO"}`);
  console.log(`  Threshold: ${DEFAULT_VELOCITY_CONFIG.rapidGrowthThreshold}% per day`);

  if (!withinGates) {
    console.log(`  ⚠️ Agent is exceeding capability gate limits!`);
  }

  const daysUntilViolation = daysUntilGateViolation(result.trend);
  if (daysUntilViolation !== null) {
    if (daysUntilViolation === 0) {
      console.log(`  Status: Currently violating capability gates`);
    } else {
      console.log(`  Projected Violation: ${daysUntilViolation} days`);
    }
  }
  console.log();

  // Display alerts
  if (result.alerts.length > 0) {
    console.log("Alerts:");
    for (const alert of result.alerts) {
      const icon = {
        info: "ℹ️",
        warning: "⚠️",
        critical: "🚨",
      }[alert.severity];
      console.log(`  ${icon} ${alert.alertType.toUpperCase()}: ${alert.message}`);
    }
    console.log();
  }

  // Generate full report
  const report = generateVelocityReport(result.velocity, result.trend);
  console.log("\n" + report);
}

/**
 * Example: Track velocity with custom configuration
 */
export async function exampleCustomVelocityTracking(
  db: OrdoDatabase,
  agentId: string
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Custom Velocity Tracking for Agent ${agentId}`);
  console.log(`${"=".repeat(60)}\n`);

  // Custom configuration with stricter thresholds
  const customConfig: VelocityConfig = {
    currentWindowDays: 14, // 2-week window
    previousWindowDays: 14,
    rapidGrowthThreshold: 5.0, // Stricter: 5% per day max
    accelerationThreshold: 15.0, // 15% increase = acceleration
    enableAlerts: true,
    alertChannels: ["console", "database"],
  };

  const result = await trackImprovementVelocity(db, agentId, customConfig);

  console.log("Configuration:");
  console.log(`  Window Size: ${customConfig.currentWindowDays} days`);
  console.log(`  Rapid Growth Threshold: ${customConfig.rapidGrowthThreshold}% per day`);
  console.log(`  Acceleration Threshold: ${customConfig.accelerationThreshold}%`);
  console.log();

  console.log("Results:");
  console.log(`  Current Velocity: ${result.velocity.capabilityGainPerDay.toFixed(2)}% per day`);
  console.log(`  Within Gates: ${isWithinCapabilityGates(result.velocity, customConfig.rapidGrowthThreshold) ? "✅" : "❌"}`);
  console.log(`  Alerts Generated: ${result.alerts.length}`);
  console.log();
}

/**
 * Example: View velocity history
 */
export async function exampleVelocityHistory(
  db: OrdoDatabase,
  agentId: string
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Velocity History for Agent ${agentId}`);
  console.log(`${"=".repeat(60)}\n`);

  // Get 30-day history with 7-day windows
  const history = await getVelocityHistory(db, agentId, 30, 7);

  if (history.length === 0) {
    console.log("No velocity history available.");
    return;
  }

  console.log(`Total Measurements: ${history.length}`);
  console.log();

  // Display each measurement
  console.log("Historical Velocity:");
  console.log(`${"Date".padEnd(12)} | ${"Velocity".padEnd(10)} | ${"Improvements".padEnd(13)} | Status`);
  console.log("-".repeat(60));

  for (const measurement of history) {
    const date = measurement.windowEndDate.toISOString().split("T")[0];
    const velocity = `${measurement.capabilityGainPerDay.toFixed(2)}%/day`;
    const improvements = `${measurement.improvementsInWindow} in ${measurement.windowDays}d`;
    const status = measurement.capabilityGainPerDay > 10 ? "⚠️ HIGH" : "✅ OK";

    console.log(`${date.padEnd(12)} | ${velocity.padEnd(10)} | ${improvements.padEnd(13)} | ${status}`);
  }
  console.log();

  // Calculate trend
  if (history.length >= 2) {
    const oldest = history[0];
    const newest = history[history.length - 1];
    const overallChange =
      ((newest.capabilityGainPerDay - oldest.capabilityGainPerDay) /
        oldest.capabilityGainPerDay) *
      100;

    console.log("Overall Trend:");
    console.log(`  Initial Velocity: ${oldest.capabilityGainPerDay.toFixed(2)}% per day`);
    console.log(`  Current Velocity: ${newest.capabilityGainPerDay.toFixed(2)}% per day`);
    console.log(`  Change: ${overallChange > 0 ? "+" : ""}${overallChange.toFixed(1)}%`);
    console.log();
  }
}

/**
 * Example: Monitor multiple agents
 */
export async function exampleMonitorMultipleAgents(
  db: OrdoDatabase,
  agentIds: string[]
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Monitoring ${agentIds.length} Agents`);
  console.log(`${"=".repeat(60)}\n`);

  const results = [];

  for (const agentId of agentIds) {
    const result = await trackImprovementVelocity(db, agentId);
    results.push({
      agentId,
      velocity: result.velocity.capabilityGainPerDay,
      isRapidGrowth: result.trend.isRapidGrowth,
      isAccelerating: result.trend.isAccelerating,
      alertCount: result.alerts.length,
    });
  }

  // Sort by velocity (highest first)
  results.sort((a, b) => b.velocity - a.velocity);

  console.log("Agent Velocity Summary:");
  console.log(`${"Agent ID".padEnd(15)} | ${"Velocity".padEnd(12)} | ${"Status".padEnd(15)} | Alerts`);
  console.log("-".repeat(60));

  for (const result of results) {
    const velocity = `${result.velocity.toFixed(2)}%/day`;
    let status = "Normal";
    if (result.isRapidGrowth) status = "🚨 Rapid Growth";
    else if (result.isAccelerating) status = "⚠️ Accelerating";

    console.log(
      `${result.agentId.padEnd(15)} | ${velocity.padEnd(12)} | ${status.padEnd(15)} | ${result.alertCount}`
    );
  }
  console.log();

  // Summary statistics
  const avgVelocity =
    results.reduce((sum, r) => sum + r.velocity, 0) / results.length;
  const rapidGrowthCount = results.filter((r) => r.isRapidGrowth).length;
  const acceleratingCount = results.filter((r) => r.isAccelerating).length;

  console.log("Summary:");
  console.log(`  Average Velocity: ${avgVelocity.toFixed(2)}% per day`);
  console.log(`  Rapid Growth: ${rapidGrowthCount} agents`);
  console.log(`  Accelerating: ${acceleratingCount} agents`);
  console.log(`  Total Alerts: ${results.reduce((sum, r) => sum + r.alertCount, 0)}`);
  console.log();
}

/**
 * Example: Continuous monitoring loop
 */
export async function exampleContinuousMonitoring(
  db: OrdoDatabase,
  agentIds: string[],
  intervalMinutes: number = 60
): Promise<void> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Starting Continuous Velocity Monitoring`);
  console.log(`${"=".repeat(60)}\n`);
  console.log(`Monitoring ${agentIds.length} agents every ${intervalMinutes} minutes`);
  console.log(`Press Ctrl+C to stop\n`);

  let iteration = 0;

  const monitor = async () => {
    iteration++;
    console.log(`\n[${new Date().toISOString()}] Iteration ${iteration}`);
    console.log("-".repeat(60));

    for (const agentId of agentIds) {
      try {
        const result = await trackImprovementVelocity(db, agentId);

        // Log only if there are alerts
        if (result.alerts.length > 0) {
          console.log(`\nAgent ${agentId}:`);
          for (const alert of result.alerts) {
            console.log(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
          }
        }
      } catch (error) {
        console.error(`Error monitoring agent ${agentId}:`, error);
      }
    }

    console.log(`\nNext check in ${intervalMinutes} minutes...`);
  };

  // Run initial check
  await monitor();

  // Schedule periodic checks
  setInterval(monitor, intervalMinutes * 60 * 1000);
}

/**
 * Main example runner
 */
export async function runVelocityTrackingExamples(
  db: OrdoDatabase
): Promise<void> {
  const exampleAgentId = "agent-example-1";
  const exampleAgentIds = ["agent-1", "agent-2", "agent-3"];

  // Example 1: Basic velocity tracking
  await exampleTrackVelocity(db, exampleAgentId);

  // Example 2: Custom configuration
  await exampleCustomVelocityTracking(db, exampleAgentId);

  // Example 3: Velocity history
  await exampleVelocityHistory(db, exampleAgentId);

  // Example 4: Monitor multiple agents
  await exampleMonitorMultipleAgents(db, exampleAgentIds);

  // Example 5: Continuous monitoring (commented out - runs indefinitely)
  // await exampleContinuousMonitoring(db, exampleAgentIds, 60);
}
