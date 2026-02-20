/**
 * Property-Based Tests for Secure Environment Management
 * Feature: ordo-digital-civilization, Property 109: Secure Environment Management
 * 
 * Validates: Requirements 24.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { 
  EnvironmentManager, 
  getEnvironmentManager, 
  resetEnvironmentManager 
} from './environment-manager';

describe('Secure Environment Management', () => {
  let envManager: EnvironmentManager;

  beforeEach(() => {
    envManager = new EnvironmentManager('test-master-key');
  });

  afterEach(() => {
    resetEnvironmentManager();
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
    it('should encrypt sensitive environment variables', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('API_KEY', 'SECRET_TOKEN', 'PASSWORD', 'PRIVATE_KEY', 'AUTH_TOKEN'),
          fc.string({ minLength: 10, maxLength: 100 }),
          async (key, value) => {
            // Set sensitive variable
            envManager.set(key, value);

            // Variable should exist
            expect(envManager.has(key)).toBe(true);

            // Metadata should indicate encryption
            const metadata = envManager.getMetadata(key);
            expect(metadata).toBeDefined();
            expect(metadata!.encrypted).toBe(true);
            expect(metadata!.sensitive).toBe(true);

            // Retrieved value should match original (decrypted automatically)
            const retrieved = envManager.get(key);
            expect(retrieved).toBe(value);

            // Safe export should mask sensitive values
            const safeObj = envManager.toSafeObject();
            expect(safeObj[key]).toBe('***REDACTED***');
            expect(safeObj[key]).not.toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not encrypt non-sensitive environment variables', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('NODE_ENV', 'PORT', 'LOG_LEVEL', 'DEBUG', 'REGION'),
          fc.string({ minLength: 1, maxLength: 50 }),
          async (key, value) => {
            // Set non-sensitive variable
            envManager.set(key, value);

            // Variable should exist
            expect(envManager.has(key)).toBe(true);

            // Metadata should indicate no encryption
            const metadata = envManager.getMetadata(key);
            expect(metadata).toBeDefined();
            expect(metadata!.encrypted).toBe(false);
            expect(metadata!.sensitive).toBe(false);

            // Retrieved value should match original
            const retrieved = envManager.get(key);
            expect(retrieved).toBe(value);

            // Safe export should show actual value
            const safeObj = envManager.toSafeObject();
            expect(safeObj[key]).toBe(value);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should never log sensitive values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('API_KEY', 'SECRET', 'PASSWORD', 'TOKEN'),
          fc.string({ minLength: 20, maxLength: 100 }),
          async (key, value) => {
            // Set sensitive variable
            envManager.set(key, value);

            // Get safe representation
            const safeObj = envManager.toSafeObject();
            const safeString = JSON.stringify(safeObj);

            // Sensitive value should not appear in safe string
            expect(safeString).not.toContain(value);
            expect(safeString).toContain('***REDACTED***');

            // Validate no sensitive logging
            const isValid = EnvironmentManager.validateNoSensitiveLogging(safeString);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only expose variables to authorized processes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1000, max: 9999 }),
          async (key, value, unauthorizedPid) => {
            // Set variable with current process
            envManager.set(key, value);

            // Current process should be able to read
            const retrieved = envManager.get(key);
            expect(retrieved).toBe(value);

            // Unauthorized process should not be able to read
            expect(() => {
              envManager.get(key, unauthorizedPid);
            }).toThrow(/Unauthorized access/);

            // Unauthorized process should not be able to write
            expect(() => {
              envManager.set('NEW_KEY', 'new_value', unauthorizedPid);
            }).toThrow(/Unauthorized access/);

            // Unauthorized process should not be able to delete
            expect(() => {
              envManager.delete(key, unauthorizedPid);
            }).toThrow(/Unauthorized access/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log all access attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (key, value) => {
            // Clear previous logs
            envManager.clearAccessLog();

            // Set variable
            envManager.set(key, value);

            // Get variable
            envManager.get(key);

            // Delete variable
            envManager.delete(key);

            // Check access log
            const log = envManager.getAccessLog();
            expect(log.length).toBe(3);

            // Verify write log
            const writeLog = log.find(e => e.action === 'write');
            expect(writeLog).toBeDefined();
            expect(writeLog!.key).toBe(key);
            expect(writeLog!.authorized).toBe(true);

            // Verify read log
            const readLog = log.find(e => e.action === 'read');
            expect(readLog).toBeDefined();
            expect(readLog!.key).toBe(key);
            expect(readLog!.authorized).toBe(true);

            // Verify delete log
            const deleteLog = log.find(e => e.action === 'delete');
            expect(deleteLog).toBeDefined();
            expect(deleteLog!.key).toBe(key);
            expect(deleteLog!.authorized).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should log unauthorized access attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1000, max: 9999 }),
          async (key, value, unauthorizedPid) => {
            // Clear previous logs
            envManager.clearAccessLog();

            // Set variable
            envManager.set(key, value);

            // Attempt unauthorized read
            try {
              envManager.get(key, unauthorizedPid);
            } catch (error) {
              // Expected
            }

            // Check unauthorized attempts
            const unauthorized = envManager.getUnauthorizedAttempts();
            expect(unauthorized.length).toBeGreaterThan(0);

            const attempt = unauthorized[0];
            expect(attempt.key).toBe(key);
            expect(attempt.processId).toBe(unauthorizedPid);
            expect(attempt.authorized).toBe(false);
            expect(attempt.action).toBe('read');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track access metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 10 }),
          async (key, value, accessCount) => {
            // Set variable
            envManager.set(key, value);

            // Access multiple times
            for (let i = 0; i < accessCount; i++) {
              envManager.get(key);
            }

            // Check metadata
            const metadata = envManager.getMetadata(key);
            expect(metadata).toBeDefined();
            expect(metadata!.accessCount).toBe(accessCount);
            expect(metadata!.lastAccessed).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should support process authorization', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1000, max: 9999 }),
          async (key, value, newPid) => {
            // Set variable
            envManager.set(key, value);

            // New process should not be authorized initially
            expect(envManager.isAuthorized(newPid)).toBe(false);

            // Authorize new process
            envManager.authorizeProcess(newPid);
            expect(envManager.isAuthorized(newPid)).toBe(true);

            // New process should be able to access
            const retrieved = envManager.get(key, newPid);
            expect(retrieved).toBe(value);

            // Revoke authorization
            envManager.revokeProcess(newPid);
            expect(envManager.isAuthorized(newPid)).toBe(false);

            // New process should not be able to access anymore
            expect(() => {
              envManager.get(key, newPid);
            }).toThrow(/Unauthorized access/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should encrypt and decrypt correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('API_KEY', 'SECRET', 'PASSWORD'),
          fc.string({ minLength: 1, maxLength: 1000 }),
          async (key, value) => {
            // Set sensitive variable
            envManager.set(key, value);

            // Get value (should be decrypted)
            const retrieved = envManager.get(key);
            expect(retrieved).toBe(value);

            // Value should be encrypted in storage
            const metadata = envManager.getMetadata(key);
            expect(metadata!.encrypted).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle special characters in values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('API_KEY', 'SECRET'),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (key, value) => {
            // Set variable with special characters
            envManager.set(key, value);

            // Retrieved value should match exactly
            const retrieved = envManager.get(key);
            expect(retrieved).toBe(value);
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
    it('should handle empty values', () => {
      envManager.set('EMPTY_KEY', '');
      const retrieved = envManager.get('EMPTY_KEY');
      expect(retrieved).toBe('');
    });

    it('should handle undefined keys', () => {
      const retrieved = envManager.get('NON_EXISTENT_KEY');
      expect(retrieved).toBeUndefined();
    });

    it('should handle deletion of non-existent keys', () => {
      const deleted = envManager.delete('NON_EXISTENT_KEY');
      expect(deleted).toBe(false);
    });

    it('should list all keys', () => {
      envManager.set('KEY1', 'value1');
      envManager.set('KEY2', 'value2');
      envManager.set('KEY3', 'value3');

      const keys = envManager.keys();
      expect(keys).toContain('KEY1');
      expect(keys).toContain('KEY2');
      expect(keys).toContain('KEY3');
      expect(keys.length).toBe(3);
    });

    it('should get all metadata', () => {
      envManager.set('NODE_ENV', 'production');
      envManager.set('API_KEY', 'secret');

      const allMetadata = envManager.getAllMetadata();
      expect(allMetadata.length).toBe(2);

      const nodeEnvMeta = allMetadata.find(m => m.key === 'NODE_ENV');
      expect(nodeEnvMeta).toBeDefined();
      expect(nodeEnvMeta!.sensitive).toBe(false);

      const apiKeyMeta = allMetadata.find(m => m.key === 'API_KEY');
      expect(apiKeyMeta).toBeDefined();
      expect(apiKeyMeta!.sensitive).toBe(true);
    });

    it('should clear access log', () => {
      envManager.set('KEY', 'value');
      envManager.get('KEY');

      let log = envManager.getAccessLog();
      expect(log.length).toBeGreaterThan(0);

      envManager.clearAccessLog();
      log = envManager.getAccessLog();
      expect(log.length).toBe(0);
    });

    it('should validate no sensitive logging', () => {
      const safeLog = 'NODE_ENV=production PORT=3000';
      expect(EnvironmentManager.validateNoSensitiveLogging(safeLog)).toBe(true);

      const unsafeLog = 'API_KEY=sk-1234567890abcdef1234567890abcdef';
      expect(EnvironmentManager.validateNoSensitiveLogging(unsafeLog)).toBe(false);
    });

    it('should handle global instance', () => {
      const instance1 = getEnvironmentManager('master-key');
      const instance2 = getEnvironmentManager();

      // Should return same instance
      expect(instance1).toBe(instance2);

      // Reset and get new instance
      resetEnvironmentManager();
      const instance3 = getEnvironmentManager();
      expect(instance3).not.toBe(instance1);
    });

    it('should load from process.env', () => {
      // Set some process.env variables
      process.env.TEST_VAR_1 = 'value1';
      process.env.TEST_VAR_2 = 'value2';

      // Create new manager and load
      const manager = new EnvironmentManager('test-key');
      manager.loadFromProcessEnv();

      // Should have loaded variables
      expect(manager.has('TEST_VAR_1')).toBe(true);
      expect(manager.has('TEST_VAR_2')).toBe(true);

      // Clean up
      delete process.env.TEST_VAR_1;
      delete process.env.TEST_VAR_2;
    });

    it('should detect sensitive patterns', () => {
      const sensitiveKeys = [
        'API_KEY',
        'SECRET_TOKEN',
        'PASSWORD',
        'PRIVATE_KEY',
        'AUTH_TOKEN',
        'CREDENTIAL',
        'api_key',
        'secret',
        'password',
      ];

      for (const key of sensitiveKeys) {
        envManager.set(key, 'test-value');
        const metadata = envManager.getMetadata(key);
        expect(metadata!.sensitive).toBe(true);
      }
    });

    it('should not detect non-sensitive patterns', () => {
      const nonSensitiveKeys = [
        'NODE_ENV',
        'PORT',
        'LOG_LEVEL',
        'DEBUG',
        'REGION',
        'DATABASE_URL',
      ];

      for (const key of nonSensitiveKeys) {
        envManager.set(key, 'test-value');
        const metadata = envManager.getMetadata(key);
        expect(metadata!.sensitive).toBe(false);
      }
    });

    it('should handle concurrent access', async () => {
      envManager.set('CONCURRENT_KEY', 'initial-value');

      // Simulate concurrent reads
      const reads = Array.from({ length: 10 }, () => 
        envManager.get('CONCURRENT_KEY')
      );

      // All reads should succeed
      expect(reads.every(v => v === 'initial-value')).toBe(true);

      // Access count should be correct
      const metadata = envManager.getMetadata('CONCURRENT_KEY');
      expect(metadata!.accessCount).toBe(10);
    });

    it('should handle encryption with different master keys', () => {
      const manager1 = new EnvironmentManager('key1');
      const manager2 = new EnvironmentManager('key2');

      manager1.set('API_KEY', 'secret-value');
      manager2.set('API_KEY', 'secret-value');

      // Both should store encrypted
      const meta1 = manager1.getMetadata('API_KEY');
      const meta2 = manager2.getMetadata('API_KEY');

      expect(meta1!.encrypted).toBe(true);
      expect(meta2!.encrypted).toBe(true);

      // Both should decrypt correctly
      expect(manager1.get('API_KEY')).toBe('secret-value');
      expect(manager2.get('API_KEY')).toBe('secret-value');
    });
  });

  /**
   * Integration Tests
   */
  describe('Integration', () => {
    it('should perform complete secure environment workflow', () => {
      // Create manager
      const manager = new EnvironmentManager('production-key');

      // Set various variables
      manager.set('NODE_ENV', 'production');
      manager.set('PORT', '3000');
      manager.set('API_KEY', 'sk-1234567890abcdef');
      manager.set('SECRET_TOKEN', 'secret-token-value');

      // Verify storage
      expect(manager.has('NODE_ENV')).toBe(true);
      expect(manager.has('API_KEY')).toBe(true);

      // Verify encryption
      const apiKeyMeta = manager.getMetadata('API_KEY');
      expect(apiKeyMeta!.encrypted).toBe(true);

      const nodeEnvMeta = manager.getMetadata('NODE_ENV');
      expect(nodeEnvMeta!.encrypted).toBe(false);

      // Verify retrieval
      expect(manager.get('NODE_ENV')).toBe('production');
      expect(manager.get('API_KEY')).toBe('sk-1234567890abcdef');

      // Verify safe export
      const safeObj = manager.toSafeObject();
      expect(safeObj.NODE_ENV).toBe('production');
      expect(safeObj.API_KEY).toBe('***REDACTED***');
      expect(safeObj.SECRET_TOKEN).toBe('***REDACTED***');

      // Verify access log
      const log = manager.getAccessLog();
      expect(log.length).toBeGreaterThan(0);

      // All accesses should be authorized
      const unauthorized = manager.getUnauthorizedAttempts();
      expect(unauthorized.length).toBe(0);
    });

    it('should handle authorization workflow', () => {
      const manager = new EnvironmentManager('test-key');
      const newProcessId = 12345;

      // Set variable
      manager.set('TEST_KEY', 'test-value');

      // New process should not be authorized
      expect(() => {
        manager.get('TEST_KEY', newProcessId);
      }).toThrow(/Unauthorized/);

      // Authorize process
      manager.authorizeProcess(newProcessId);

      // Now should work
      const value = manager.get('TEST_KEY', newProcessId);
      expect(value).toBe('test-value');

      // Revoke authorization
      manager.revokeProcess(newProcessId);

      // Should fail again
      expect(() => {
        manager.get('TEST_KEY', newProcessId);
      }).toThrow(/Unauthorized/);
    });

    it('should handle encryption/decryption workflow', () => {
      const manager = new EnvironmentManager('encryption-key');

      // Set sensitive variable
      manager.set('API_KEY', 'my-secret-api-key-12345');

      // Should be encrypted
      const metadata = manager.getMetadata('API_KEY');
      expect(metadata!.encrypted).toBe(true);

      // Should decrypt correctly
      const decrypted = manager.get('API_KEY');
      expect(decrypted).toBe('my-secret-api-key-12345');

      // Should not appear in safe export
      const safeObj = manager.toSafeObject();
      expect(safeObj.API_KEY).not.toContain('my-secret-api-key-12345');
      expect(safeObj.API_KEY).toBe('***REDACTED***');
    });
  });
});
