/**
 * Property-Based Tests for MagicBlock TEE Client
 * 
 * Tests Property 49 from the design document
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { test, fc } from '@fast-check/vitest';
import { TEEClient, createTEEClient } from './tee-client.js';
import { MagicBlockConfig } from './types.js';

describe('MagicBlock TEE Client', () => {
  let client: TEEClient;
  let config: MagicBlockConfig;

  beforeEach(() => {
    config = {
      rpcEndpoint: 'http://localhost:8899',
      teeEndpoint: 'http://localhost:9000',
      gaslessConfig: {
        enabled: true,
        platformPaysGas: true,
      },
    };
    client = createTEEClient(config);
  });

  // Feature: ordo-digital-civilization, Property 49: TEE Execution Proofs
  describe('Property 49: TEE Execution Proofs', () => {
    test.prop([
      fc.string({ minLength: 1, maxLength: 50 }),
      fc.anything(),
    ])(
      'should provide verifiable execution proof for any TEE operation',
      async (operation, data) => {
        // Execute operation in TEE
        const result = await client.executeInTEE(operation, data);

        // Property 1: Result must include a proof
        expect(result.proof).toBeDefined();
        expect(typeof result.proof).toBe('object');

        // Property 2: Proof must have attestation quote
        expect(result.proof.quote).toBeDefined();
        expect(typeof result.proof.quote).toBe('string');
        expect(result.proof.quote.length).toBeGreaterThan(0);

        // Property 3: Proof must have signature
        expect(result.proof.signature).toBeDefined();
        expect(typeof result.proof.signature).toBe('string');
        expect(result.proof.signature.length).toBeGreaterThan(0);

        // Property 4: Proof must have timestamp
        expect(result.proof.timestamp).toBeInstanceOf(Date);

        // Property 5: Proof must specify TEE type
        expect(result.proof.teeType).toBeDefined();
        expect(['intel-tdx', 'amd-sev', 'arm-trustzone']).toContain(result.proof.teeType);

        // Property 6: Proof must be marked as verified
        expect(result.proof.verified).toBe(true);

        // Property 7: Proof should be verifiable by third parties
        const isValid = await client.verifyAttestation(result.proof);
        expect(isValid).toBe(true);

        // Property 8: Result must include execution result
        expect(result.result).toBeDefined();

        // Property 9: Result must include latency metrics
        expect(result.latency).toBeGreaterThan(0);
        expect(typeof result.latency).toBe('number');

        // Property 10: Result must include timestamp
        expect(result.timestamp).toBeInstanceOf(Date);
      },
      { numRuns: 50 }
    );

    it('should generate unique attestations for different operations', async () => {
      const result1 = await client.executeInTEE('operation1', { data: 'test1' });
      const result2 = await client.executeInTEE('operation2', { data: 'test2' });

      // Attestations should be different
      expect(result1.proof.quote).not.toBe(result2.proof.quote);
      expect(result1.proof.signature).not.toBe(result2.proof.signature);
    });

    it('should generate attestations with valid timestamps', async () => {
      const before = new Date();
      const result = await client.executeInTEE('test-op', { test: 'data' });
      const after = new Date();

      // Timestamp should be between before and after
      expect(result.proof.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(result.proof.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('TEE Key Generation', () => {
    test.prop([fc.integer({ min: 1, max: 10 })])(
      'should generate unique keys with attestations',
      async (numKeys) => {
        const keys = [];

        for (let i = 0; i < numKeys; i++) {
          const keyRef = await client.generateKeyInTEE();
          keys.push(keyRef);

          // Each key should have unique ID
          expect(keyRef.keyId).toBeDefined();
          expect(typeof keyRef.keyId).toBe('string');

          // Each key should have public key
          expect(keyRef.publicKey).toBeDefined();

          // Each key should have creation timestamp
          expect(keyRef.createdAt).toBeInstanceOf(Date);

          // Each key should have attestation
          expect(keyRef.attestation).toBeDefined();
          expect(keyRef.attestation?.verified).toBe(true);
        }

        // All key IDs should be unique
        const keyIds = keys.map((k) => k.keyId);
        const uniqueKeyIds = new Set(keyIds);
        expect(uniqueKeyIds.size).toBe(numKeys);
      },
      { numRuns: 20 }
    );

    it('should allow signing with TEE-generated keys', async () => {
      const keyRef = await client.generateKeyInTEE();
      const message = Buffer.from('test message');

      const signature = await client.signInTEE(keyRef.keyId, message);

      expect(signature).toBeInstanceOf(Buffer);
      expect(signature.length).toBe(64); // Ed25519 signature length
    });

    it('should fail to sign with non-existent key', async () => {
      const message = Buffer.from('test message');

      await expect(client.signInTEE('non-existent-key', message)).rejects.toThrow(
        'Key non-existent-key not found'
      );
    });

    it('should allow retrieving attestation for generated keys', async () => {
      const keyRef = await client.generateKeyInTEE();

      const attestation = client.getAttestation(keyRef.keyId);

      expect(attestation).toBeDefined();
      expect(attestation).toEqual(keyRef.attestation);
    });

    it('should allow deleting keys', async () => {
      const keyRef = await client.generateKeyInTEE();

      await client.deleteKey(keyRef.keyId);

      const attestation = client.getAttestation(keyRef.keyId);
      expect(attestation).toBeUndefined();
    });
  });

  describe('Attestation Verification', () => {
    it('should verify valid attestations', async () => {
      const result = await client.executeInTEE('test-op', { data: 'test' });

      const isValid = await client.verifyAttestation(result.proof);

      expect(isValid).toBe(true);
    });

    it('should reject invalid attestations', async () => {
      const invalidAttestation = {
        quote: '',
        signature: '',
        timestamp: new Date(),
        teeType: 'intel-tdx' as const,
        verified: false,
      };

      const isValid = await client.verifyAttestation(invalidAttestation);

      expect(isValid).toBe(false);
    });
  });

  describe('TEE Key Management', () => {
    it('should list all generated keys', async () => {
      const key1 = await client.generateKeyInTEE();
      const key2 = await client.generateKeyInTEE();

      const keys = client.getKeys();

      expect(keys.length).toBeGreaterThanOrEqual(2);
      expect(keys.some((k) => k.keyId === key1.keyId)).toBe(true);
      expect(keys.some((k) => k.keyId === key2.keyId)).toBe(true);
    });

    it('should handle multiple key operations', async () => {
      const keys = [];

      // Generate multiple keys
      for (let i = 0; i < 5; i++) {
        const keyRef = await client.generateKeyInTEE();
        keys.push(keyRef);
      }

      // Sign with each key
      const message = Buffer.from('test message');
      for (const keyRef of keys) {
        const signature = await client.signInTEE(keyRef.keyId, message);
        expect(signature).toBeInstanceOf(Buffer);
      }

      // Delete some keys
      await client.deleteKey(keys[0].keyId);
      await client.deleteKey(keys[2].keyId);

      // Verify remaining keys
      const remainingKeys = client.getKeys();
      expect(remainingKeys.length).toBe(3);
      expect(remainingKeys.some((k) => k.keyId === keys[1].keyId)).toBe(true);
      expect(remainingKeys.some((k) => k.keyId === keys[3].keyId)).toBe(true);
      expect(remainingKeys.some((k) => k.keyId === keys[4].keyId)).toBe(true);
    });
  });
});
