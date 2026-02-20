/**
 * MagicBlock TEE (Trusted Execution Environment) Client
 * 
 * Provides secure key generation, signing, and private computation
 * with attestation proofs for verification
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import {
  TEEKeyReference,
  TEEAttestation,
  TEEExecutionResult,
  MagicBlockConfig,
} from './types.js';
import { ulid } from 'ulid';

export class TEEClient {
  private config: MagicBlockConfig;
  private keys: Map<string, TEEKeyReference>;
  private teeEndpoint: string;

  constructor(config: MagicBlockConfig) {
    this.config = config;
    this.keys = new Map();
    this.teeEndpoint = config.teeEndpoint || 'https://tee.magicblock.app';
  }

  async generateKeyInTEE(): Promise<TEEKeyReference> {
    try {
      const response = await fetch(`${this.teeEndpoint}/v1/keys/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teeType: this.config.teeType || 'intel-tdx',
        }),
      });

      if (!response.ok) {
        throw new Error(`TEE key generation failed: ${response.statusText}`);
      }

      const data = await response.json();
      const keyId = data.keyId || ulid();
      const publicKey = new PublicKey(data.publicKey);

      const attestation = await this.generateAttestation(keyId, 'key_generation');

      const keyRef: TEEKeyReference = {
        keyId,
        publicKey,
        createdAt: new Date(),
        attestation,
      };

      this.keys.set(keyId, keyRef);

      return keyRef;
    } catch (error) {
      throw new Error(
        `Failed to generate key in TEE: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async signInTEE(keyId: string, message: Buffer): Promise<Buffer> {
    try {
      const keyRef = this.keys.get(keyId);
      if (!keyRef) {
        throw new Error(`Key ${keyId} not found in TEE`);
      }

      const response = await fetch(`${this.teeEndpoint}/v1/keys/${keyId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.toString('base64'),
        }),
      });

      if (!response.ok) {
        throw new Error(`TEE signing failed: ${response.statusText}`);
      }

      const data = await response.json();
      return Buffer.from(data.signature, 'base64');
    } catch (error) {
      throw new Error(
        `Failed to sign in TEE: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async executeInTEE<T = any>(
    operation: string,
    data: any
  ): Promise<TEEExecutionResult<T>> {
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.teeEndpoint}/v1/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation,
          data,
          teeType: this.config.teeType || 'intel-tdx',
        }),
      });

      if (!response.ok) {
        throw new Error(`TEE execution failed: ${response.statusText}`);
      }

      const result = await response.json();
      const proof = await this.generateAttestation(operation, 'computation');

      const latency = Date.now() - startTime;

      return {
        result: result.output as T,
        proof,
        latency,
        timestamp: new Date(),
      };
    } catch (error) {
      throw new Error(
        `Failed to execute in TEE: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getAttestation(keyId: string): TEEAttestation | undefined {
    const keyRef = this.keys.get(keyId);
    return keyRef?.attestation;
  }

  async verifyAttestation(attestation: TEEAttestation): Promise<boolean> {
    try {
      const response = await fetch(`${this.teeEndpoint}/v1/attestation/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quote: attestation.quote,
          signature: attestation.signature,
          teeType: attestation.teeType,
        }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.verified === true;
    } catch {
      return false;
    }
  }

  getKeys(): TEEKeyReference[] {
    return Array.from(this.keys.values());
  }

  async deleteKey(keyId: string): Promise<void> {
    try {
      await fetch(`${this.teeEndpoint}/v1/keys/${keyId}`, {
        method: 'DELETE',
      });

      this.keys.delete(keyId);
    } catch (error) {
      throw new Error(
        `Failed to delete key: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async generateAttestation(
    context: string,
    operationType: string
  ): Promise<TEEAttestation> {
    try {
      const response = await fetch(`${this.teeEndpoint}/v1/attestation/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context,
          operationType,
          teeType: this.config.teeType || 'intel-tdx',
        }),
      });

      if (!response.ok) {
        throw new Error(`Attestation generation failed: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        quote: data.quote,
        signature: data.signature,
        timestamp: new Date(),
        teeType: (this.config.teeType || 'intel-tdx') as 'intel-tdx' | 'amd-sev' | 'arm-trustzone',
        verified: data.verified || false,
      };
    } catch (error) {
      throw new Error(
        `Failed to generate attestation: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}

export function createTEEClient(config: MagicBlockConfig): TEEClient {
  return new TEEClient(config);
}
