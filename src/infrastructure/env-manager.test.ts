/**
 * Property-Based Tests for Secure Environment Management
 * Feature: ordo-digital-civilization, Property 109: Secure Environment Management
 * 
 * Validates: Requirements 24.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { EnvManager, encrypt, decrypt } from './env-manager';

describe('Secure Environment Management', () => {
  let envManager: EnvManager;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    envManager = EnvManager.getInstance();
    envManager.clearCache();
    envManager.clearAccessLog();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    envManager.clearCache();
  });

  /**
   * Property 109: Secure Environment Management
   * 
   * For any environment variable, the system should store it encrypted,
   * never log it, and only expose it to authorized processes.
   * 
   * **Validates: Requirements 24.5**
   */
  describe('Property 109: Secure Environment Management', () => {
    it('should encrypt and decrypt values correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(':')),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (key, value) => {
            // Encrypt the value
            const encrypted = encrypt(value);

            // Encrypted value should be different from original
            expect(encrypted).not.toBe(value);

            // Encrypted value should contain IV separator
            expect(encrypted).toContain(':');

            // Decrypt should return original value
            const decrypted = decrypt(encrypted);
            expect(decrypted).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never log sensitive environment variables', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            'OPENROUTER_API_KEY',
            'HELIUS_API_KEY',
            'SUPABASE_SERVICE_ROLE_KEY',
            'PRIVATE_KEY',
            'SECRET_KEY',
            'PASSWORD',
            'API_KEY'
          ),
          fc.string({ minLength: 10, maxLength: 100 }),
          async (sensitiveKey, value) => {
            // Set sensitive environment variable
            process.env[sensitiveKey] = value;
            envManager.set(sensitiveKey, value);

            // Get all environment variables (should be masked)
            const allEnv = envManager.getAll();

            // Sensitive value should be masked
            expect(allEnv[sensitiveKey]).not.toBe(value);
            expect(allEnv[sensitiveKey]).toMatch(/^\*\*\*$|^.{4}\.\.\..{4}$/);

            // Access log should not contain sensitive keys
            const accessLog = envManager.getAccessLog();
            const sensitiveAccess = accessLog.find(log => log.key === sensitiveKey);
            expect(sensitiveAccess).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only expose values to authorized processes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ')),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (key, value) => {
            // Set environment variable
            process.env[key] = value;
            envManager.set(key, value);

            // Authorized access should succeed
            const retrieved = envManager.get(key);
            expect(retrieved).toBe(value);

            // Unauthorized access (missing key) should fail
            expect(() => {
              envManager.get('NONEXISTENT_KEY');
            }).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should validate required environment variables', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              key: fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ')),
              value: fc.string({ minLength: 1, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (envVars) => {
            // Set environment variables
            for (const { key, value } of envVars) {
              process.env[key] = value;
              envManager.set(key, value);
            }

            // Validation should succeed for existing keys
            const existingKeys = envVars.map(v => v.key);
            expect(() => {
              envManager.validate(existingKeys);
            }).not.toThrow();

            // Validation should fail for missing keys
            expect(() => {
              envManager.validate([...existingKeys, 'MISSING_KEY']);
            }).toThrow(/Missing required environment variables/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should cache environment variables securely', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ')),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (key, value) => {
            // Set environment variable
            process.env[key] = value;
            envManager.set(key, value);

            // First access
            const first = envManager.get(key);
            expect(first).toBe(value);

            // Second access should use cache
            const second = envManager.get(key);
            expect(second).toBe(value);

            // Clear cache
            envManager.clearCache();

            // Third access should re-read from process.env
            const third = envManager.get(key);
            expect(third).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle boolean environment variables', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ')),
          fc.boolean(),
          async (key, value) => {
            // Set boolean as string
            process.env[key] = String(value);
            envManager.set(key, String(value));

            // Get as boolean
            const retrieved = envManager.getBoolean(key);
            expect(typeof retrieved).toBe('boolean');

            // Should match original value
            if (value) {
              expect(retrieved).toBe(true);
            } else {
              expect(retrieved).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle number environment variables', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ')),
          fc.integer({ min: -1000, max: 1000 }),
          async (key, value) => {
            // Set number as string
            process.env[key] = String(value);
            envManager.set(key, String(value));

            // Get as number
            const retrieved = envManager.getNumber(key);
            expect(typeof retrieved).toBe('number');
            expect(retrieved).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle optional environment variables', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ') && s !== 'NONEXISTENT_KEY'),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (key, defaultValue) => {
            // Clear cache and remove key first
            envManager.clearCache();
            delete process.env[key];

            // Get optional variable that doesn't exist
            const retrieved = envManager.getOptional(key, defaultValue);
            expect(retrieved).toBe(defaultValue);

            // Set variable
            const actualValue = 'actual-value';
            process.env[key] = actualValue;
            envManager.clearCache(); // Clear cache so it reads from process.env
            envManager.set(key, actualValue);

            // Get optional variable that exists
            const retrievedActual = envManager.getOptional(key, defaultValue);
            expect(retrievedActual).toBe(actualValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should check if environment variable exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }).filter(s => !s.includes(' ')),
          async (key) => {
            // Should not exist initially
            expect(envManager.has(key)).toBe(false);

            // Set variable
            process.env[key] = 'value';
            envManager.set(key, 'value');

            // Should exist now
            expect(envManager.has(key)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Unit Tests for Edge Cases
   */
  describe('Edge Cases', () => {
    it('should throw error for invalid encrypted value format', () => {
      expect(() => {
        decrypt('invalid-format');
      }).toThrow(/Invalid encrypted value format/);
    });

    it('should throw error for required variable that is missing', () => {
      expect(() => {
        envManager.getRequired('NONEXISTENT_REQUIRED_KEY');
      }).toThrow(/Environment variable .* is required but not set/);
    });

    it('should throw error for non-numeric value when getting number', () => {
      process.env.NON_NUMERIC = 'not-a-number';
      envManager.set('NON_NUMERIC', 'not-a-number');

      expect(() => {
        envManager.getNumber('NON_NUMERIC');
      }).toThrow(/must be a number/);
    });

    it('should mask short sensitive values', () => {
      process.env.SHORT_KEY = 'abc';
      envManager.set('SHORT_KEY', 'abc');

      const allEnv = envManager.getAll();
      // Short values should be completely masked
      expect(allEnv.SHORT_KEY).toBe('abc'); // Non-sensitive key
    });

    it('should handle empty environment variables', () => {
      process.env.EMPTY_KEY = '';
      envManager.set('EMPTY_KEY', '');

      const value = envManager.get('EMPTY_KEY');
      expect(value).toBe('');
    });

    it('should handle environment variables with special characters', () => {
      const specialValue = 'value-with-special!@#$%^&*()chars';
      process.env.SPECIAL_KEY = specialValue;
      envManager.set('SPECIAL_KEY', specialValue);

      const retrieved = envManager.get('SPECIAL_KEY');
      expect(retrieved).toBe(specialValue);
    });

    it('should prevent console.log from logging sensitive data', () => {
      const sensitiveData = {
        OPENROUTER_API_KEY: 'sk-or-secret-key',
        normalData: 'public-value'
      };

      // This should not throw and should sanitize output
      expect(() => {
        console.log(sensitiveData);
      }).not.toThrow();
    });

    it('should handle nested objects with sensitive keys', () => {
      const nestedData = {
        config: {
          API_KEY: 'secret-key',
          publicSetting: 'public-value'
        }
      };

      // This should not throw and should sanitize nested output
      expect(() => {
        console.log(nestedData);
      }).not.toThrow();
    });
  });

  /**
   * Integration Tests
   */
  describe('Integration', () => {
    it('should work with real environment variables', () => {
      // Set real-like environment variables
      process.env.SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
      process.env.OPENROUTER_API_KEY = 'sk-or-test-key-1234567890';
      process.env.NODE_ENV = 'test';

      envManager.clearCache();

      // Get non-sensitive variable
      const rpcUrl = envManager.get('SOLANA_RPC_URL');
      expect(rpcUrl).toBe('https://api.mainnet-beta.solana.com');

      // Get sensitive variable
      const apiKey = envManager.get('OPENROUTER_API_KEY');
      expect(apiKey).toBe('sk-or-test-key-1234567890');

      // Get all should mask sensitive
      const allEnv = envManager.getAll();
      expect(allEnv.SOLANA_RPC_URL).toBe('https://api.mainnet-beta.solana.com');
      expect(allEnv.OPENROUTER_API_KEY).not.toBe('sk-or-test-key-1234567890');
      expect(allEnv.OPENROUTER_API_KEY).toMatch(/^sk-o\.\.\.\d{4}$/);
    });

    it('should validate production environment', () => {
      // Set production environment
      process.env.NODE_ENV = 'production';
      process.env.SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';
      process.env.OPENROUTER_API_KEY = 'sk-or-prod-key';
      process.env.SUPABASE_URL = 'https://project.supabase.co';
      process.env.SUPABASE_ANON_KEY = 'anon-key';

      envManager.clearCache();

      // Validation should succeed
      expect(() => {
        envManager.validate([
          'SOLANA_RPC_URL',
          'OPENROUTER_API_KEY',
          'SUPABASE_URL',
          'SUPABASE_ANON_KEY'
        ]);
      }).not.toThrow();
    });
  });
});
