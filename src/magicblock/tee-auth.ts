/**
 * MagicBlock TEE Authorization
 * 
 * Implements authorization flow for private transactions using TEE
 * Uses official MagicBlock SDK for attestation and authorization
 * 
 * Flow:
 * 1. Attestation: Verify TEE RPC integrity using Intel TDX
 * 2. Client Challenge: Request challenge, sign it, get auth token
 * 3. Access: Use token to query permissioned state
 */

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { TEEAttestation } from './types.js';
import {
  verifyTeeRpcIntegrity,
  getAuthToken,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Authorization token from TEE
 */
export interface AuthorizationToken {
  token: string;
  publicKey: PublicKey;
  expiresAt: Date;
  signature: string;
}

/**
 * Authorization request
 */
export interface AuthorizationRequest {
  publicKey: PublicKey;
  message: string;
  signature: Uint8Array;
  timestamp: number;
}

/**
 * Confidential transaction request
 */
export interface ConfidentialTransactionRequest {
  transaction: Transaction;
  authToken: string;
  encryptedData?: Uint8Array;
}

/**
 * Confidential transaction result
 */
export interface ConfidentialTransactionResult {
  signature: string;
  success: boolean;
  attestation?: TEEAttestation;
  error?: string;
}

/**
 * MagicBlock TEE Authorization Client
 */
export class TEEAuthClient {
  private teeEndpoint: string;
  private connection: Connection;
  private authTokens: Map<string, AuthorizationToken>;
  private integrityVerified: boolean = false;

  constructor(connection: Connection, teeEndpoint?: string) {
    this.connection = connection;
    this.teeEndpoint =
      teeEndpoint ||
      process.env.MAGICBLOCK_TEE_URL ||
      'https://tee.magicblock.app';
    this.authTokens = new Map();
  }

  /**
   * Step 1: Verify TEE RPC Integrity using Intel TDX attestation
   * 
   * This verifies that the RPC is running on genuine secure hardware by:
   * - Generating a random 32-byte challenge
   * - Sending it to the TEE RPC server to receive a TDX quote
   * - Fetching collateral (certificates) via PCCS
   * - Verifying the quote using DCAP QVL WASM module
   */
  async verifyIntegrity(): Promise<boolean> {
    try {
      console.log('🔐 Verifying TEE RPC integrity...');
      
      this.integrityVerified = await verifyTeeRpcIntegrity(this.teeEndpoint);
      
      if (this.integrityVerified) {
        console.log('✓ TEE RPC integrity verified - running on genuine secure hardware');
      } else {
        console.warn('✗ TEE RPC integrity verification failed');
      }
      
      return this.integrityVerified;
    } catch (error) {
      console.error('TEE integrity verification error:', error);
      this.integrityVerified = false;
      return false;
    }
  }

  /**
   * Step 2: Client Challenge Flow - Get authorization token
   * 
   * Uses the official SDK's getAuthToken which:
   * 1. Requests a challenge from the RPC (parameterized by wallet public key)
   * 2. Signs the received challenge using the keypair
   * 3. Submits the signed challenge and receives an authorization token
   */
  async requestAuthorizationToken(
    keypair: Keypair,
    message?: string
  ): Promise<AuthorizationToken> {
    try {
      // Verify integrity first if not already done
      if (!this.integrityVerified) {
        await this.verifyIntegrity();
      }

      console.log('🎫 Requesting authorization token...');

      // Create a sign message function compatible with wallet adapters
      const signMessage = async (messageBytes: Uint8Array): Promise<Uint8Array> => {
        return nacl.sign.detached(messageBytes, keypair.secretKey);
      };

      // Use official SDK to get auth token
      const tokenString = await getAuthToken(
        this.teeEndpoint,
        keypair.publicKey,
        signMessage
      );

      // Create authorization token object
      const authToken: AuthorizationToken = {
        token: tokenString,
        publicKey: keypair.publicKey,
        expiresAt: new Date(Date.now() + 3600000), // 1 hour default
        signature: '', // Signature is handled internally by SDK
      };

      // Cache the token
      this.authTokens.set(keypair.publicKey.toBase58(), authToken);

      console.log('✓ Authorization token received');
      return authToken;
    } catch (error) {
      throw new Error(
        `Failed to request authorization token: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Step 3: Create connection with access token
   * 
   * Pass the authorization token as a query parameter when creating a connection
   * to access permissioned state on the Private ER
   */
  createAuthorizedConnection(authToken: string): Connection {
    const authorizedUrl = `${this.teeEndpoint}?token=${authToken}`;
    return new Connection(authorizedUrl, 'confirmed');
  }

  /**
   * Get or create authorized connection for a keypair
   */
  async getAuthorizedConnection(keypair: Keypair): Promise<Connection> {
    let authToken = this.authTokens.get(keypair.publicKey.toBase58());

    // Request new token if not cached or expired
    if (!authToken || authToken.expiresAt < new Date()) {
      authToken = await this.requestAuthorizationToken(keypair);
    }

    return this.createAuthorizedConnection(authToken.token);
  }

  /**
   * Step 6: Execute confidential transaction with authorization token
   */
  async executeConfidentialTransaction(
    transaction: Transaction,
    keypair: Keypair,
    encryptedData?: Uint8Array
  ): Promise<ConfidentialTransactionResult> {
    try {
      // Get or request authorization token
      let authToken = this.authTokens.get(keypair.publicKey.toBase58());

      if (!authToken || authToken.expiresAt < new Date()) {
        authToken = await this.requestAuthorizationToken(keypair);
      }

      // Serialize transaction
      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      });

      // Send confidential transaction to TEE
      const response = await fetch(`${this.teeEndpoint}/transaction/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken.token}`,
        },
        body: JSON.stringify({
          transaction: bs58.encode(serializedTx),
          encryptedData: encryptedData ? bs58.encode(encryptedData) : undefined,
          publicKey: keypair.publicKey.toBase58(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Confidential transaction failed: ${response.statusText}`
        );
      }

      const data = await response.json();

      return {
        signature: data.signature,
        success: true,
        attestation: data.attestation
          ? {
              quote: data.attestation.quote,
              signature: data.attestation.signature,
              timestamp: new Date(data.attestation.timestamp),
              teeType: data.attestation.teeType || 'intel-tdx',
              verified: data.attestation.verified || false,
            }
          : undefined,
      };
    } catch (error) {
      return {
        signature: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify authorization token is valid
   */
  isTokenValid(publicKey: PublicKey): boolean {
    const token = this.authTokens.get(publicKey.toBase58());
    return token ? token.expiresAt > new Date() : false;
  }

  /**
   * Get cached authorization token
   */
  getAuthToken(publicKey: PublicKey): AuthorizationToken | undefined {
    return this.authTokens.get(publicKey.toBase58());
  }

  /**
   * Clear authorization token
   */
  clearAuthToken(publicKey: PublicKey): void {
    this.authTokens.delete(publicKey.toBase58());
  }

  /**
   * Clear all authorization tokens
   */
  clearAllAuthTokens(): void {
    this.authTokens.clear();
  }

  /**
   * Encrypt data for confidential transaction
   */
  encryptData(data: Uint8Array, recipientPublicKey: PublicKey): Uint8Array {
    // Generate ephemeral keypair for encryption
    const ephemeralKeypair = nacl.box.keyPair();

    // Encrypt data using recipient's public key
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const encrypted = nacl.box(
      data,
      nonce,
      recipientPublicKey.toBytes(),
      ephemeralKeypair.secretKey
    );

    // Combine ephemeral public key, nonce, and encrypted data
    const result = new Uint8Array(
      ephemeralKeypair.publicKey.length + nonce.length + encrypted.length
    );
    result.set(ephemeralKeypair.publicKey, 0);
    result.set(nonce, ephemeralKeypair.publicKey.length);
    result.set(encrypted, ephemeralKeypair.publicKey.length + nonce.length);

    return result;
  }

  /**
   * Decrypt data from confidential transaction
   */
  decryptData(
    encryptedData: Uint8Array,
    recipientKeypair: Keypair
  ): Uint8Array | null {
    try {
      // Extract components
      const ephemeralPublicKey = encryptedData.slice(0, nacl.box.publicKeyLength);
      const nonce = encryptedData.slice(
        nacl.box.publicKeyLength,
        nacl.box.publicKeyLength + nacl.box.nonceLength
      );
      const encrypted = encryptedData.slice(
        nacl.box.publicKeyLength + nacl.box.nonceLength
      );

      // Decrypt
      const decrypted = nacl.box.open(
        encrypted,
        nonce,
        ephemeralPublicKey,
        recipientKeypair.secretKey
      );

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }
}

/**
 * Create a TEE authorization client
 */
export function createTEEAuthClient(
  connection: Connection,
  teeEndpoint?: string
): TEEAuthClient {
  return new TEEAuthClient(connection, teeEndpoint);
}
