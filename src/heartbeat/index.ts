/**
 * Heartbeat System
 *
 * Autonomous task execution system for the Ordo platform.
 * Executes scheduled tasks for agents without user intervention.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6
 */

// Core daemon
export {
  createHeartbeatDaemon,
  type HeartbeatDaemon,
  type HeartbeatEntry,
  type HeartbeatDaemonOptions,
} from "./daemon.js";

// Built-in tasks
export {
  BUILTIN_TASKS,
  type HeartbeatTaskContext,
  type HeartbeatTaskFn,
} from "./tasks.js";

// Configuration
export {
  DEFAULT_HEARTBEAT_TASKS,
  CRON_PATTERNS,
  isValidCronExpression,
  getNextExecutionTime,
} from "./config.js";

// Custom tasks
export {
  createCustomTask,
  updateCustomTask,
  deleteCustomTask,
  getAgentCustomTasks,
  enableCustomTask,
  disableCustomTask,
  CUSTOM_TASK_TEMPLATES,
  type CreateCustomTaskParams,
} from "./custom-tasks.js";

// Execution tracking
export {
  getTaskMetrics,
  getCustomTaskMetrics,
  getSystemMetrics,
  getFailingTasks,
  getSlowTasks,
  getStaleTasks,
  generateHealthReport,
  type HeartbeatExecutionMetrics,
  type HeartbeatSystemMetrics,
} from "./tracking.js";

// Autonomous execution
export {
  createAutonomousHeartbeat,
  verifyAutonomousExecution,
  startAutonomousHeartbeatService,
  type AutonomousHeartbeatOptions,
} from "./autonomous.js";
