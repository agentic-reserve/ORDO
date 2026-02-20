/**
 * Ordo Configuration Types
 * Independent configuration interfaces for the Ordo platform
 */

/**
 * Ordo Agent Configuration
 */
export interface OrdoConfig {
  // Agent identity
  agentId: string;
  name: string;
  publicKey: string;

  // Self-modification settings
  maxModificationsPerHour: number;
  protectedPaths: string[];
  allowedModificationTypes: ('code' | 'config' | 'prompt' | 'tool')[];
  maxFileSizeBytes: number;

  // Safety settings
  requireApprovalForPaths: string[];
  enableRateLimiting: boolean;
  enableAuditLogging: boolean;

  // Git settings
  gitEnabled: boolean;
  gitAutoCommit: boolean;
  gitRemote?: string;

  // Performance settings
  maxConcurrentModifications: number;
  testTimeoutMs: number;
  validationPeriodDays: number;

  // Economic settings
  initialBalance: number;
  maxLifespanDays: number;
  replicationMinBalance: number;
  replicationMinAgeDays: number;

  // Evolution settings
  mutationRate: number;
  fitnessWeights: {
    survival: number;
    earnings: number;
    offspring: number;
    adaptation: number;
    innovation: number;
  };

  // Infrastructure settings
  rpcEndpoint: string;
  databaseUrl: string;
  storageProvider: 'supabase' | 'local' | 'custom';

  // Feature flags
  features: {
    selfModification: boolean;
    replication: boolean;
    multiAgentCoordination: boolean;
    privateER: boolean;
    teeExecution: boolean;
  };
}

/**
 * Default Ordo Configuration
 */
export const DEFAULT_ORDO_CONFIG: Partial<OrdoConfig> = {
  maxModificationsPerHour: 10,
  protectedPaths: [
    'wallet.json',
    'keypair.json',
    '.env',
    'config.json',
    'node_modules',
  ],
  allowedModificationTypes: ['code', 'config', 'prompt', 'tool'],
  maxFileSizeBytes: 1024 * 1024, // 1MB
  requireApprovalForPaths: ['src/identity', 'src/wallet'],
  enableRateLimiting: true,
  enableAuditLogging: true,
  gitEnabled: true,
  gitAutoCommit: true,
  maxConcurrentModifications: 3,
  testTimeoutMs: 60000,
  validationPeriodDays: 7,
  mutationRate: 0.15,
  fitnessWeights: {
    survival: 0.3,
    earnings: 0.3,
    offspring: 0.2,
    adaptation: 0.1,
    innovation: 0.1,
  },
  features: {
    selfModification: true,
    replication: true,
    multiAgentCoordination: true,
    privateER: true,
    teeExecution: true,
  },
};

/**
 * Merge user config with defaults
 */
export function createOrdoConfig(userConfig: Partial<OrdoConfig>): OrdoConfig {
  return {
    ...DEFAULT_ORDO_CONFIG,
    ...userConfig,
  } as OrdoConfig;
}
