/**
 * MagicBlock Integration Types
 * 
 * Types for MagicBlock Ephemeral Rollups and TEE integration
 */

import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

/**
 * Ephemeral Rollup delegation status
 */
export interface DelegationStatus {
  account: PublicKey;
  delegated: boolean;
  delegatedAt?: Date;
  rollupId?: string;
}

/**
 * Ephemeral Rollup execution result
 */
export interface ERExecutionResult<T = any> {
  success: boolean;
  result?: T;
  error?: string;
  latency: number; // milliseconds
  timestamp: Date;
}

/**
 * State commitment result
 */
export interface CommitmentResult {
  signature: string;
  slot: number;
  committedAt: Date;
  accounts: PublicKey[];
}

/**
 * Operation to execute on Ephemeral Rollup
 */
export interface EROperation {
  type: 'transaction' | 'instruction' | 'custom';
  payload: Transaction | VersionedTransaction | any;
  accounts?: PublicKey[];
  priority?: 'low' | 'normal' | 'high';
}

/**
 * TEE (Trusted Execution Environment) key reference
 */
export interface TEEKeyReference {
  keyId: string;
  publicKey: PublicKey;
  createdAt: Date;
  attestation?: TEEAttestation;
}

/**
 * TEE attestation proof
 */
export interface TEEAttestation {
  quote: string; // Base64 encoded attestation quote
  signature: string;
  timestamp: Date;
  teeType: 'intel-tdx' | 'amd-sev' | 'arm-trustzone';
  verified: boolean;
}

/**
 * TEE execution result with proof
 */
export interface TEEExecutionResult<T = any> {
  result: T;
  proof: TEEAttestation;
  latency: number;
  timestamp: Date;
}

/**
 * Gasless transaction configuration
 */
export interface GaslessConfig {
  enabled: boolean;
  platformPaysGas: boolean;
  maxGasPerTransaction?: number;
  dailyGasLimit?: number;
}

/**
 * Gas tracking for analytics
 */
export interface GasTracking {
  transactionId: string;
  agentId: string;
  gasUsed: number;
  gasCost: number; // in SOL
  timestamp: Date;
  paidBy: 'agent' | 'platform';
}

/**
 * MagicBlock client configuration
 */
export interface MagicBlockConfig {
  rpcEndpoint: string;
  erEndpoint?: string;
  perEndpoint?: string;
  teeEndpoint?: string;
  usePrivateER?: boolean;
  teeType?: 'intel-tdx' | 'amd-sev' | 'arm-trustzone';
  gaslessConfig: GaslessConfig;
  commitInterval?: number; // milliseconds
  commitThreshold?: number; // number of operations
}
