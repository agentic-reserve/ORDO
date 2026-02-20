/**
 * MagicBlock Delegation System
 * 
 * Implements account delegation to Ephemeral Rollups with proper validator selection
 * Delegation Program ID: DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair,
  SystemProgram,
} from '@solana/web3.js';
import { DelegationStatus } from './types.js';

// MagicBlock Delegation Program ID
export const DELEGATION_PROGRAM_ID = new PublicKey(
  process.env.MAGICBLOCK_DELEGATION_PROGRAM_ID ||
  'DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh'
);

/**
 * MagicBlock ER Validators by network and region
 */
export const VALIDATORS = {
  devnet: {
    asia: new PublicKey(
      process.env.MAGICBLOCK_VALIDATOR_ASIA_DEVNET ||
      'MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57E'
    ),
    eu: new PublicKey(
      process.env.MAGICBLOCK_VALIDATOR_EU_DEVNET ||
      'MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e'
    ),
    us: new PublicKey(
      process.env.MAGICBLOCK_VALIDATOR_US_DEVNET ||
      'MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd'
    ),
    tee: new PublicKey(
      process.env.MAGICBLOCK_VALIDATOR_TEE ||
      'FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA'
    ),
  },
  mainnet: {
    asia: new PublicKey(
      process.env.MAGICBLOCK_VALIDATOR_ASIA_MAINNET ||
      'MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57E'
    ),
    eu: new PublicKey(
      process.env.MAGICBLOCK_VALIDATOR_EU_MAINNET ||
      'MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e'
    ),
    us: new PublicKey(
      process.env.MAGICBLOCK_VALIDATOR_US_MAINNET ||
      'MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd'
    ),
  },
  localnet: {
    local: new PublicKey('mAGicPQYBMvcYveUZA5F5UNNwyHvfYh5xkLS2Fr1mev'),
  },
};

/**
 * Get default validator based on network
 */
export function getDefaultValidator(
  network: 'devnet' | 'mainnet' | 'localnet' = 'devnet',
  region: 'asia' | 'eu' | 'us' | 'tee' | 'local' = 'us'
): PublicKey {
  const envValidator = process.env.MAGICBLOCK_DEFAULT_VALIDATOR;
  if (envValidator) {
    return new PublicKey(envValidator);
  }

  if (network === 'localnet') {
    return VALIDATORS.localnet.local;
  }

  return VALIDATORS[network][region as keyof typeof VALIDATORS.devnet];
}

/**
 * Delegation configuration
 */
export interface DelegationConfig {
  network: 'devnet' | 'mainnet' | 'localnet';
  region?: 'asia' | 'eu' | 'us' | 'tee' | 'local';
  validator?: PublicKey;
  commitOnUndelegate?: boolean;
}

/**
 * MagicBlock Delegation Client
 */
export class DelegationClient {
  private connection: Connection;
  private config: DelegationConfig;
  private delegations: Map<string, DelegationStatus>;

  constructor(connection: Connection, config: DelegationConfig) {
    this.connection = connection;
    this.config = config;
    this.delegations = new Map();
  }

  /**
   * Delegate account to Ephemeral Rollup
   */
  async delegate(
    account: PublicKey,
    owner: Keypair,
    validator?: PublicKey
  ): Promise<DelegationStatus> {
    const validatorPubkey =
      validator ||
      this.config.validator ||
      getDefaultValidator(this.config.network, this.config.region);

    try {
      // Create delegation instruction
      const instruction = this.createDelegateInstruction(
        account,
        owner.publicKey,
        validatorPubkey
      );

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      const signature = await this.connection.sendTransaction(
        transaction,
        [owner],
        { skipPreflight: false }
      );

      await this.connection.confirmTransaction(signature);

      const status: DelegationStatus = {
        account,
        delegated: true,
        delegatedAt: new Date(),
        rollupId: validatorPubkey.toBase58(),
      };

      this.delegations.set(account.toBase58(), status);
      return status;
    } catch (error) {
      throw new Error(
        `Failed to delegate account: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Undelegate account from Ephemeral Rollup
   */
  async undelegate(
    account: PublicKey,
    owner: Keypair,
    commitFirst: boolean = true
  ): Promise<void> {
    const status = this.delegations.get(account.toBase58());
    if (!status || !status.delegated) {
      throw new Error('Account is not delegated');
    }

    try {
      // Optionally commit state before undelegating
      if (commitFirst && this.config.commitOnUndelegate) {
        // Commit logic would go here
        // await this.commitState(account);
      }

      // Create undelegate instruction
      const instruction = this.createUndelegateInstruction(
        account,
        owner.publicKey
      );

      // Create and send transaction
      const transaction = new Transaction().add(instruction);
      const signature = await this.connection.sendTransaction(
        transaction,
        [owner],
        { skipPreflight: false }
      );

      await this.connection.confirmTransaction(signature);

      this.delegations.delete(account.toBase58());
    } catch (error) {
      throw new Error(
        `Failed to undelegate account: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Check if account is delegated
   */
  isDelegated(account: PublicKey): boolean {
    const status = this.delegations.get(account.toBase58());
    return status?.delegated || false;
  }

  /**
   * Get delegation status
   */
  getDelegationStatus(account: PublicKey): DelegationStatus | undefined {
    return this.delegations.get(account.toBase58());
  }

  /**
   * Get all delegated accounts
   */
  getDelegatedAccounts(): PublicKey[] {
    return Array.from(this.delegations.values())
      .filter((status) => status.delegated)
      .map((status) => status.account);
  }

  /**
   * Create delegate instruction
   */
  private createDelegateInstruction(
    account: PublicKey,
    owner: PublicKey,
    validator: PublicKey
  ): TransactionInstruction {
    // This is a simplified version - actual implementation would use
    // the MagicBlock SDK's createDelegateInstruction
    return new TransactionInstruction({
      keys: [
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: validator, isSigner: false, isWritable: false },
        { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: DELEGATION_PROGRAM_ID,
      data: Buffer.from([0]), // 0 = delegate instruction
    });
  }

  /**
   * Create undelegate instruction
   */
  private createUndelegateInstruction(
    account: PublicKey,
    owner: PublicKey
  ): TransactionInstruction {
    // This is a simplified version - actual implementation would use
    // the MagicBlock SDK's createUndelegateInstruction
    return new TransactionInstruction({
      keys: [
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
        { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: DELEGATION_PROGRAM_ID,
      data: Buffer.from([1]), // 1 = undelegate instruction
    });
  }
}

/**
 * Create a delegation client
 */
export function createDelegationClient(
  connection: Connection,
  config?: Partial<DelegationConfig>
): DelegationClient {
  const network = (process.env.SOLANA_NETWORK?.includes('mainnet')
    ? 'mainnet'
    : process.env.SOLANA_NETWORK?.includes('devnet')
    ? 'devnet'
    : 'localnet') as 'devnet' | 'mainnet' | 'localnet';

  const defaultConfig: DelegationConfig = {
    network,
    region: 'us',
    commitOnUndelegate: true,
    ...config,
  };

  return new DelegationClient(connection, defaultConfig);
}
