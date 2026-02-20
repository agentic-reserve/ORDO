/**
 * DeFi Integration Types
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Transaction result with tracking information
 */
export interface TransactionResult {
  success: boolean;
  signature?: string;
  error?: string;
  cost: number; // in SOL
  timestamp: Date;
  operation: string;
}

/**
 * Transaction history entry for learning
 */
export interface TransactionHistory {
  id: string;
  agentId: string;
  operation: string;
  success: boolean;
  cost: number;
  timestamp: Date;
  parameters: Record<string, any>;
  result?: any;
  error?: string;
}

/**
 * Transaction statistics for an agent
 */
export interface TransactionStats {
  agentId: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: number; // percentage
  totalCost: number; // in SOL
  averageCost: number; // in SOL
  operationStats: Record<string, {
    count: number;
    successRate: number;
    averageCost: number;
  }>;
}

/**
 * Token deployment parameters
 */
export interface DeployTokenParams {
  name: string;
  symbol: string;
  decimals: number;
  initialSupply: number;
  description?: string;
  imageUrl?: string;
}

/**
 * Token transfer parameters
 */
export interface TransferParams {
  to: string;
  amount: number;
  mint?: string; // optional, defaults to SOL
}

/**
 * Stake parameters
 */
export interface StakeParams {
  amount: number;
  protocol?: 'jupiter' | 'solayer';
}

/**
 * NFT mint parameters
 */
export interface MintNFTParams {
  collectionMint?: string;
  name: string;
  uri: string;
  sellerFeeBasisPoints?: number;
}

/**
 * NFT collection parameters
 */
export interface CreateCollectionParams {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints?: number;
}

/**
 * Swap parameters
 */
export interface SwapParams {
  outputMint: string;
  inputAmount: number;
  inputMint?: string; // defaults to SOL
  slippageBps?: number; // basis points, default 50 (0.5%)
}

/**
 * Liquidity provision parameters
 */
export interface ProvideLiquidityParams {
  poolType: 'raydium' | 'orca' | 'meteora';
  mintA: string;
  mintB: string;
  amountA: number;
  amountB: number;
  configId?: string; // for Raydium
}

/**
 * Lending parameters
 */
export interface LendParams {
  protocol: 'lulo' | 'kamino' | 'marginfi';
  mint: string;
  amount: number;
}

/**
 * Borrowing parameters
 */
export interface BorrowParams {
  protocol: 'kamino' | 'marginfi';
  mint: string;
  amount: number;
  collateralMint: string;
  collateralAmount: number;
}

/**
 * Domain registration parameters
 */
export interface RegisterDomainParams {
  domain: string; // without .sol suffix
  spaceKB?: number; // storage space in KB
}

/**
 * DeFi agent configuration
 */
export interface DeFiAgentConfig {
  agentId: string;
  privateKey: Uint8Array;
  rpcUrl: string;
  enableTracking?: boolean;
  maxTransactionCost?: number; // in SOL
}
