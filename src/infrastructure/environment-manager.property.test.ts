/**
 * Property-Based Tests for Secure Environment Management
 * 
 * Tests Property 109: Secure Environment Management
 * Validates: Requirements 24.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { EnvironmentManager } from './environment-manager';

describe('Property 109: Secure Environment Management', () => {
  let envManager: EnvironmentManager;

  beforeEach(() => {
    envManager = new EnvironmentManager('test-master-key');
  });

  afterEach(() => {
    // Clean up
    envManager.clearAccessLog();
  });

  /**
   * **Validates: Requirements 24.5**
   * 
   * Property: For any environment variable, the system should store it encrypted,
   * never log it, and only expose it to authorized processes.
   */
  it('Property 109: stores sensitive variables encrypted', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.string({ minLength: 1, maxLength: 50 }).filter(k => 
            /key|secret|password|token|api|private|credential|auth/i.test(k)
          ),
          value: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        ({ key, value }) => {
          // Set sensitive variable
          envManager.set(key, value);

          // Verify variable is marked as sensitive
          const metadata = envManager.getMetadata(key);
          expect(metadata?.sensitive).toBe(true);

          // Verify variable is encrypted
          expect(metadata?.encrypted).toBe(true);

          // Verify we can retrieve the original value
          const retrieved = envManager.get(key);
          expect(retrieved).toBe(value);

          // Verify safe export masks sensitive values
          const safeObj = envManager.toSafeObject();
          expect(safeObj[key]).toBe('***REDACTED***');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 109: never logs sensitive values', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.constantFrom('API_KEY', 'SECRET_TOKEN', 'PASSWORD', 'PRIVATE_KEY'),
          value: fc.string({ minLength: 20, maxLength: 100 }),
        }),
        ({ key, value }) => {
          // Set sensitive variable
          envManager.set(key, value);

          // Get safe object representation
          const safeObj = envManager.toSafeObject();
          const safeString = JSON.stringify(safeObj);

          // Verify sensitive value is not in safe string
          expect(safeString).not.toContain(value);
          expect(safeString).toContain('***REDACTED***');

          // Verify metadata doesn't contain value
          const metadata = envManager.getMetadata(key);
          expect(JSON.stringify(metadata)).not.toContain(value);

          // Verify access log doesn't contain value
          const accessLog = envManager.getAccessLog();
          const logString = JSON.stringify(accessLog);
          expect(logString).not.toContain(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 109: only exposes to authorized processes', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.string({ minLength: 1, maxLength: 50 }),
          value: fc.string({ minLength: 1, maxLength: 100 }),
          authorizedPid: fc.integer({ min: 1000, max: 9999 }),
          unauthorizedPid: fc.integer({ min: 10000, max: 19999 }),
        }),
        ({ key, value, authorizedPid, unauthorizedPid }) => {
          // Authorize specific process
          envManager.authorizeProcess(authorizedPid);

          // Set variable from authorized process
          envManager.set(key, value, authorizedPid);

          // Verify authorized process can read
          const retrieved = envManager.get(key, authorizedPid);
          expect(retrieved).toBe(value);

          // Verify unauthorized process cannot read
          expect(() => {
            envManager.get(key, unauthorizedPid);
          }).toThrow(/Unauthorized access attempt/);

          // Verify unauthorized attempt is logged
          const unauthorizedAttempts = envManager.getUnauthorizedAttempts();
          expect(unauthorizedAttempts.length).toBeGreaterThan(0);
          expect(unauthorizedAttempts.some(a => 
            a.processId === unauthorizedPid && !a.authorized
          )).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 109: encrypts and decrypts correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.constantFrom('SECRET_KEY', 'API_TOKEN', 'PASSWORD'),
          value: fc.string({ minLength: 1, maxLength: 200 }),
        }),
        ({ key, value }) => {
          // Set sensitive variable
          envManager.set(key, value);

          // Retrieve and verify
          const retrieved = envManager.get(key);
          expect(retrieved).toBe(value);

          // Verify stored value is different (encrypted)
          const metadata = envManager.getMetadata(key);
          expect(metadata?.encrypted).toBe(true);

          // Multiple retrievals should return same value
          const retrieved2 = envManager.get(key);
          expect(retrieved2).toBe(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 109: prevents unauthorized write operations', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.string({ minLength: 1, maxLength: 50 }),
          value: fc.string({ minLength: 1, maxLength: 100 }),
          unauthorizedPid: fc.integer({ min: 10000, max: 19999 }),
        }),
        ({ key, value, unauthorizedPid }) => {
          // Attempt to set from unauthorized process
          expect(() => {
            envManager.set(key, value, unauthorizedPid);
          }).toThrow(/Unauthorized access attempt/);

          // Verify variable was not set
          expect(envManager.has(key)).toBe(false);

          // Verify unauthorized attempt is logged
          const unauthorizedAttempts = envManager.getUnauthorizedAttempts();
          expect(unauthorizedAttempts.some(a => 
            a.processId === unauthorizedPid && 
            !a.authorized && 
            a.action === 'write'
          )).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 109: prevents unauthorized delete operations', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.string({ minLength: 1, maxLength: 50 }),
          value: fc.string({ minLength: 1, maxLength: 100 }),
          unauthorizedPid: fc.integer({ min: 10000, max: 19999 }),
        }),
        ({ key, value, unauthorizedPid }) => {
          // Set variable from authorized process (current process)
          envManager.set(key, value);

          // Verify variable exists
          expect(envManager.has(key)).toBe(true);

          // Attempt to delete from unauthorized process
          expect(() => {
            envManager.delete(key, unauthorizedPid);
          }).toThrow(/Unauthorized access attempt/);

          // Verify variable still exists
          expect(envManager.has(key)).toBe(true);

          // Verify unauthorized attempt is logged
          const unauthorizedAttempts = envManager.getUnauthorizedAttempts();
          expect(unauthorizedAttempts.some(a => 
            a.processId === unauthorizedPid && 
            !a.authorized && 
            a.action === 'delete'
          )).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 109: tracks access attempts', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.string({ minLength: 1, maxLength: 50 }),
          value: fc.string({ minLength: 1, maxLength: 100 }),
          numReads: fc.integer({ min: 1, max: 10 }),
        }),
        ({ key, value, numReads }) => {
          // Set variable
          envManager.set(key, value);

          // Clear access log
          envManager.clearAccessLog();

          // Read multiple times
          for (let i = 0; i < numReads; i++) {
            envManager.get(key);
          }

          // Verify access count
          const metadata = envManager.getMetadata(key);
          expect(metadata?.accessCount).toBe(numReads);

          // Verify access log
          const accessLog = envManager.getAccessLog();
          const readAttempts = accessLog.filter(a => 
            a.key === key && a.action === 'read' && a.authorized
          );
          expect(readAttempts.length).toBe(numReads);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 109: validates no sensitive logging in output', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            key: fc.constantFrom('API_KEY', 'SECRET', 'PASSWORD', 'TOKEN'),
            value: fc.string({ minLength: 20, maxLength: 100 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (variables) => {
          // Set all variables
          variables.forEach(({ key, value }) => {
            envManager.set(key, value);
          });

          // Get safe representation
          const safeObj = envManager.toSafeObject();
          const safeString = JSON.stringify(safeObj);

          // Verify no sensitive values in output
          variables.forEach(({ value }) => {
            expect(safeString).not.toContain(value);
          });

          // Verify all keys are present but masked
          variables.forEach(({ key }) => {
            expect(safeString).toContain(key);
            expect(safeObj[key]).toBe('***REDACTED***');
          });

          // Validate using static method
          expect(EnvironmentManager.validateNoSensitiveLogging(safeString)).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 109: handles non-sensitive variables correctly', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.string({ minLength: 1, maxLength: 50 }).filter(k => 
            !/key|secret|password|token|api|private|credential|auth/i.test(k)
          ),
          value: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        ({ key, value }) => {
          // Set non-sensitive variable
          envManager.set(key, value);

          // Verify variable is not marked as sensitive
          const metadata = envManager.getMetadata(key);
          expect(metadata?.sensitive).toBe(false);

          // Verify variable is not encrypted
          expect(metadata?.encrypted).toBe(false);

          // Verify safe export shows actual value
          const safeObj = envManager.toSafeObject();
          expect(safeObj[key]).toBe(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 109: maintains encryption integrity across operations', () => {
    fc.assert(
      fc.property(
        fc.record({
          key: fc.constantFrom('SECRET_KEY', 'API_TOKEN'),
          value: fc.string({ minLength: 10, maxLength: 100 }),
          numOperations: fc.integer({ min: 5, max: 20 }),
        }),
        ({ key, value, numOperations }) => {
          // Set sensitive variable
          envManager.set(key, value);

          // Perform multiple read operations
          for (let i = 0; i < numOperations; i++) {
            const retrieved = envManager.get(key);
            expect(retrieved).toBe(value);
          }

          // Verify encryption is maintained
          const metadata = envManager.getMetadata(key);
          expect(metadata?.encrypted).toBe(true);
          expect(metadata?.sensitive).toBe(true);

          // Verify value is still correct
          const finalValue = envManager.get(key);
          expect(finalValue).toBe(value);
        }
      ),
      { numRuns: 50 }
    );
  });
});
