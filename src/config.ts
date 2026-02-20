/**
 * Configuration management for Ordo platform
 * Loads and validates environment variables
 */

import { config as dotenvConfig } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenvConfig({ path: join(__dirname, "../.env") });

/**
 * Platform configuration interface
 */
export interface OrdoConfig {
  nodeEnv: string;
  logLevel: string;
  debug: boolean;

  solana: {
    rpcUrl: string;
    network: string;
    heliusApiKey: string;
  };

  magicblock: {
    erUrl: string;
    teeUrl: string;
    apiKey: string;
  };

  openrouter: {
    apiKey: string;
    baseUrl: string;
  };

  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };

  agent: {
    maxLifespanDays: number;
    initialBalanceSol: number;
    mutationRate: number;
    replicationMinBalance: number;
    replicationMinAgeDays: number;
  };

  economic: {
    survivalTierThriving: number;
    survivalTierNormal: number;
    survivalTierLow: number;
    survivalTierCritical: number;
  };

  evolution: {
    populationMaxSize: number;
    generationIntervalHours: number;
    fitnessSelectionPressure: number;
  };

  safety: {
    alignmentThreshold: number;
    capabilityGateMaxGrowthRate: number;
    emergencyStopEnabled: boolean;
  };

  infrastructure: {
    loadBalancingRatio: number;
    byzantineFaultTolerance: number;
    autoScalingThreshold: number;
    realTimeLatencyTargetMs: number;
  };

  monitoring: {
    metricsEnabled: boolean;
    alertLowBalanceThreshold: number;
    alertErrorRateThreshold: number;
    alertLatencyThresholdMs: number;
  };

  heartbeat: {
    enabled: boolean;
    intervalMinutes: number;
    autonomous: boolean;
  };

  api: {
    port: number;
    host: string;
    jwtSecret: string;
    corsOrigins: string[];
  };
}

/**
 * Get environment variable with fallback
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get required environment variable (throws if missing)
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Parse boolean environment variable
 */
function parseBool(value: string): boolean {
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Parse float environment variable
 */
function parseFloat(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid float value: ${value}`);
  }
  return parsed;
}

/**
 * Parse integer environment variable
 */
function parseInt(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }
  return parsed;
}

/**
 * Load and validate configuration
 */
export const config: OrdoConfig = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  logLevel: getEnv("LOG_LEVEL", "info"),
  debug: parseBool(getEnv("DEBUG", "false")),

  solana: {
    rpcUrl: getEnv("SOLANA_RPC_URL", "https://api.mainnet-beta.solana.com"),
    network: getEnv("SOLANA_NETWORK", "mainnet-beta"),
    heliusApiKey: getEnv("HELIUS_API_KEY", ""),
  },

  magicblock: {
    erUrl: getEnv("MAGICBLOCK_ER_URL", "https://er.magicblock.app"),
    teeUrl: getEnv("MAGICBLOCK_TEE_URL", "https://tee.magicblock.app"),
  },

  openrouter: {
    apiKey: getEnv("OPENROUTER_API_KEY", ""),
    baseUrl: getEnv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
  },

  supabase: {
    url: getEnv("SUPABASE_URL", ""),
    anonKey: getEnv("SUPABASE_ANON_KEY", ""),
    serviceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY", ""),
  },

  agent: {
    maxLifespanDays: parseInt(getEnv("AGENT_MAX_LIFESPAN_DAYS", "365")),
    initialBalanceSol: parseFloat(getEnv("AGENT_INITIAL_BALANCE_SOL", "1.0")),
    mutationRate: parseFloat(getEnv("AGENT_MUTATION_RATE", "0.15")),
    replicationMinBalance: parseFloat(getEnv("AGENT_REPLICATION_MIN_BALANCE", "10.0")),
    replicationMinAgeDays: parseInt(getEnv("AGENT_REPLICATION_MIN_AGE_DAYS", "30")),
  },

  economic: {
    survivalTierThriving: parseFloat(getEnv("SURVIVAL_TIER_THRIVING", "10.0")),
    survivalTierNormal: parseFloat(getEnv("SURVIVAL_TIER_NORMAL", "1.0")),
    survivalTierLow: parseFloat(getEnv("SURVIVAL_TIER_LOW", "0.1")),
    survivalTierCritical: parseFloat(getEnv("SURVIVAL_TIER_CRITICAL", "0.01")),
  },

  evolution: {
    populationMaxSize: parseInt(getEnv("POPULATION_MAX_SIZE", "1000")),
    generationIntervalHours: parseInt(getEnv("GENERATION_INTERVAL_HOURS", "24")),
    fitnessSelectionPressure: parseFloat(getEnv("FITNESS_SELECTION_PRESSURE", "0.8")),
  },

  safety: {
    alignmentThreshold: parseInt(getEnv("ALIGNMENT_THRESHOLD", "95")),
    capabilityGateMaxGrowthRate: parseFloat(getEnv("CAPABILITY_GATE_MAX_GROWTH_RATE", "0.10")),
    emergencyStopEnabled: parseBool(getEnv("EMERGENCY_STOP_ENABLED", "true")),
  },

  infrastructure: {
    loadBalancingRatio: parseFloat(getEnv("LOAD_BALANCING_RATIO", "0.0073")),
    byzantineFaultTolerance: parseFloat(getEnv("BYZANTINE_FAULT_TOLERANCE", "0.33")),
    autoScalingThreshold: parseFloat(getEnv("AUTO_SCALING_THRESHOLD", "0.888")),
    realTimeLatencyTargetMs: parseInt(getEnv("REAL_TIME_LATENCY_TARGET_MS", "33")),
  },

  monitoring: {
    metricsEnabled: parseBool(getEnv("METRICS_ENABLED", "true")),
    alertLowBalanceThreshold: parseFloat(getEnv("ALERT_LOW_BALANCE_THRESHOLD", "0.1")),
    alertErrorRateThreshold: parseFloat(getEnv("ALERT_ERROR_RATE_THRESHOLD", "0.10")),
    alertLatencyThresholdMs: parseInt(getEnv("ALERT_LATENCY_THRESHOLD_MS", "1000")),
  },

  heartbeat: {
    enabled: parseBool(getEnv("HEARTBEAT_ENABLED", "true")),
    intervalMinutes: parseInt(getEnv("HEARTBEAT_INTERVAL_MINUTES", "60")),
    autonomous: parseBool(getEnv("HEARTBEAT_AUTONOMOUS", "true")),
  },

  api: {
    port: parseInt(getEnv("API_PORT", "3001")),
    host: getEnv("API_HOST", "0.0.0.0"),
    jwtSecret: getEnv("JWT_SECRET", "ordo-secret-change-in-production"),
    corsOrigins: getEnv("CORS_ORIGINS", "http://localhost:3000,http://localhost:19006").split(","),
  },
};

/**
 * Get configuration
 */
export function getConfig(): OrdoConfig {
  return config;
}
