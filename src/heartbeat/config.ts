/**
 * Heartbeat Configuration
 *
 * Manages heartbeat task configuration for the Ordo platform.
 * Supports hourly, daily, and weekly intervals via cron expressions.
 *
 * Requirements: 14.1, 14.3
 */

import type { HeartbeatEntry } from "./daemon.js";

/**
 * Default heartbeat configuration with common intervals
 */
export const DEFAULT_HEARTBEAT_TASKS: HeartbeatEntry[] = [
  {
    name: "hourly_health_check",
    schedule: "0 * * * *", // Every hour at minute 0
    task: "health_check",
    enabled: true,
  },
  {
    name: "hourly_balance_check",
    schedule: "15 * * * *", // Every hour at minute 15
    task: "balance_check",
    enabled: true,
  },
  {
    name: "hourly_age_update",
    schedule: "30 * * * *", // Every hour at minute 30
    task: "age_update",
    enabled: true,
  },
  {
    name: "daily_metrics_report",
    schedule: "0 0 * * *", // Daily at midnight
    task: "metrics_report",
    enabled: true,
  },
  {
    name: "weekly_evolution_check",
    schedule: "0 0 * * 0", // Weekly on Sunday at midnight
    task: "evolution_check",
    enabled: true,
  },
];

/**
 * Common cron schedule patterns
 */
export const CRON_PATTERNS = {
  // Hourly patterns
  EVERY_HOUR: "0 * * * *",
  EVERY_2_HOURS: "0 */2 * * *",
  EVERY_6_HOURS: "0 */6 * * *",
  EVERY_12_HOURS: "0 */12 * * *",
  
  // Daily patterns
  DAILY_MIDNIGHT: "0 0 * * *",
  DAILY_NOON: "0 12 * * *",
  DAILY_6AM: "0 6 * * *",
  DAILY_6PM: "0 18 * * *",
  
  // Weekly patterns
  WEEKLY_SUNDAY: "0 0 * * 0",
  WEEKLY_MONDAY: "0 0 * * 1",
  WEEKLY_FRIDAY: "0 0 * * 5",
  
  // Testing patterns
  EVERY_MINUTE: "* * * * *",
  EVERY_5_MINUTES: "*/5 * * * *",
  EVERY_15_MINUTES: "*/15 * * * *",
};

/**
 * Validate a cron expression
 */
export function isValidCronExpression(expression: string): boolean {
  try {
    const cronParser = require("cron-parser");
    cronParser.parseExpression(expression);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get next execution time for a cron expression
 */
export function getNextExecutionTime(expression: string, from?: Date): Date | null {
  try {
    const cronParser = require("cron-parser");
    const interval = cronParser.parseExpression(expression, {
      currentDate: from || new Date(),
    });
    return interval.next().toDate();
  } catch {
    return null;
  }
}
