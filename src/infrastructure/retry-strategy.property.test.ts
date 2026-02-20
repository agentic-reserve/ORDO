/**
 * Property-Based Tests for Fibonacci Retry Strategy
 * 
 * Feature: ordo-digital-civilization
 * Property 99: Fibonacci Retry Strategy
 * 
 * **Validates: Requirements 21.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  FibonacciRetryStrategy,
  withFibonacciRetry,
  FIBONACCI_SEQUENCE,
  MAX_RETRIES,
  BASE_INTERVAL_MS,
  JITTER_FACTOR,
} from './retry-strategy';

describe('Property 99: Fibonacci Retry Strategy', () => {
  it('should use Fibonacci sequence for retry intervals', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_RETRIES - 1 }),
        (attemptNumber) => {
          const strategy = new FibonacciRetryStrategy();
          const delay = strategy.calculateDelay(attemptNumber);

          // Get expected Fibonacci number
          const expectedFib = FIBONACCI_SEQUENCE[attemptNumber];
          const expectedBaseDelay = expectedFib * BASE_INTERVAL_MS;

          // Delay should be within jitter range of expected
          const jitterRange = expectedBaseDelay * JITTER_FACTOR;
          const minDelay = expectedBaseDelay - jitterRange;
          const maxDelay = expectedBaseDelay + jitterRange;

          expect(delay).toBeGreaterThanOrEqual(minDelay);
          expect(delay).toBeLessThanOrEqual(maxDelay);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should respect maximum 7 retries', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.constant(null),
        async () => {
          const strategy = new FibonacciRetryStrategy();
          let attemptCount = 0;

          // Operation that always fails
          const failingOperation = async () => {
            attemptCount++;
            throw new Error('Always fails');
          };

          const result = await strategy.execute(failingOperation);

          // Should attempt initial try + 7 retries = 8 total attempts
          expect(result.success).toBe(false);
          expect(result.attempts).toBe(MAX_RETRIES + 1);
          expect(attemptCount).toBe(MAX_RETRIES + 1);
        }
      ),
      { numRuns: 10 } // Fewer runs for async tests
    );
  });

  it('should add jitter to prevent thundering herd', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_RETRIES - 1 }),
        (attemptNumber) => {
          const strategy = new FibonacciRetryStrategy();
          
          // Calculate multiple delays for same attempt
          const delays = Array.from({ length: 10 }, () =>
            strategy.calculateDelay(attemptNumber)
          );

          // With jitter, delays should vary
          const uniqueDelays = new Set(delays);
          
          // At least some variation should exist (not all identical)
          // Note: There's a small chance all could be identical, but very unlikely
          expect(uniqueDelays.size).toBeGreaterThan(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should succeed on first attempt if operation succeeds', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string(),
        async (expectedResult) => {
          const strategy = new FibonacciRetryStrategy();
          let attemptCount = 0;

          const successfulOperation = async () => {
            attemptCount++;
            return expectedResult;
          };

          const result = await strategy.execute(successfulOperation);

          expect(result.success).toBe(true);
          expect(result.result).toBe(expectedResult);
          expect(result.attempts).toBe(1);
          expect(result.totalDelayMs).toBe(0); // No delay on first attempt
          expect(attemptCount).toBe(1);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should retry until success within max retries', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: MAX_RETRIES }),
        fc.string(),
        async (failuresBeforeSuccess, expectedResult) => {
          const strategy = new FibonacciRetryStrategy();
          let attemptCount = 0;

          const eventuallySuccessfulOperation = async () => {
            attemptCount++;
            if (attemptCount < failuresBeforeSuccess) {
              throw new Error(`Attempt ${attemptCount} failed`);
            }
            return expectedResult;
          };

          const result = await strategy.execute(eventuallySuccessfulOperation);

          expect(result.success).toBe(true);
          expect(result.result).toBe(expectedResult);
          expect(result.attempts).toBe(failuresBeforeSuccess);
          expect(attemptCount).toBe(failuresBeforeSuccess);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should accumulate total delay across retries', async () => {
    const strategy = new FibonacciRetryStrategy();
    let attemptCount = 0;

    // Operation that fails twice then succeeds
    const operation = async () => {
      attemptCount++;
      if (attemptCount <= 2) {
        throw new Error('Fail');
      }
      return 'success';
    };

    const result = await strategy.execute(operation);

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    
    // Total delay should be sum of first two Fibonacci intervals (with jitter)
    // Fib[0] = 1s, Fib[1] = 1s, so base total = 2000ms
    // With 10% jitter, should be roughly 1800-2200ms
    expect(result.totalDelayMs).toBeGreaterThan(1600);
    expect(result.totalDelayMs).toBeLessThan(2400);
  });

  it('should return error on final failure', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.string(),
        async (errorMessage) => {
          const strategy = new FibonacciRetryStrategy();

          const failingOperation = async () => {
            throw new Error(errorMessage);
          };

          const result = await strategy.execute(failingOperation);

          expect(result.success).toBe(false);
          expect(result.error).toBeInstanceOf(Error);
          expect(result.error?.message).toBe(errorMessage);
          expect(result.attempts).toBe(MAX_RETRIES + 1);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should track retry attempts with timestamps', async () => {
    const strategy = new FibonacciRetryStrategy();
    let attemptCount = 0;

    // Operation that fails 3 times then succeeds
    const operation = async () => {
      attemptCount++;
      if (attemptCount <= 3) {
        throw new Error('Fail');
      }
      return 'success';
    };

    await strategy.execute(operation);

    const attempts = strategy.getAttempts();

    // Should have 3 retry attempts (not counting initial attempt)
    expect(attempts).toHaveLength(3);

    // Each attempt should have proper structure
    attempts.forEach((attempt, index) => {
      expect(attempt.attemptNumber).toBe(index + 1);
      expect(attempt.delayMs).toBeGreaterThan(0);
      expect(attempt.timestamp).toBeInstanceOf(Date);
    });

    // Timestamps should be in order
    for (let i = 1; i < attempts.length; i++) {
      expect(attempts[i].timestamp.getTime()).toBeGreaterThanOrEqual(
        attempts[i - 1].timestamp.getTime()
      );
    }
  });

  it('should use correct Fibonacci sequence values', () => {
    const strategy = new FibonacciRetryStrategy();
    const config = strategy.getConfig();

    // Verify Fibonacci sequence is correct
    expect(config.fibonacciSequence).toEqual([1, 1, 2, 3, 5, 8, 13]);
    expect(config.fibonacciSequence).toHaveLength(7);
    expect(config.maxRetries).toBe(7);
  });

  it('should calculate delays following Fibonacci pattern', () => {
    const strategy = new FibonacciRetryStrategy({ jitterFactor: 0 }); // No jitter for exact testing

    // Test each Fibonacci interval
    const expectedDelays = [1000, 1000, 2000, 3000, 5000, 8000, 13000];

    expectedDelays.forEach((expectedDelay, index) => {
      const delay = strategy.calculateDelay(index);
      expect(delay).toBe(expectedDelay);
    });
  });

  it('should allow custom configuration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 100, max: 5000 }),
        fc.double({ min: 0, max: 0.5, noNaN: true }),
        (maxRetries, baseIntervalMs, jitterFactor) => {
          const customSequence = FIBONACCI_SEQUENCE.slice(0, maxRetries);
          const strategy = new FibonacciRetryStrategy({
            maxRetries,
            baseIntervalMs,
            jitterFactor,
            fibonacciSequence: customSequence,
          });

          const config = strategy.getConfig();

          expect(config.maxRetries).toBe(maxRetries);
          expect(config.baseIntervalMs).toBe(baseIntervalMs);
          expect(config.jitterFactor).toBe(jitterFactor);
          expect(config.fibonacciSequence).toEqual(customSequence);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should work with convenience function withFibonacciRetry', async () => {
    fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 3 }),
        fc.string(),
        async (failuresBeforeSuccess, expectedResult) => {
          let attemptCount = 0;

          const operation = async () => {
            attemptCount++;
            if (attemptCount <= failuresBeforeSuccess) {
              throw new Error('Fail');
            }
            return expectedResult;
          };

          const result = await withFibonacciRetry(operation);

          expect(result.success).toBe(true);
          expect(result.result).toBe(expectedResult);
          expect(result.attempts).toBe(failuresBeforeSuccess + 1);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('should calculate maximum total delay correctly', () => {
    const strategy = new FibonacciRetryStrategy();
    const maxDelay = strategy.calculateMaxTotalDelay();

    // Sum of Fibonacci sequence: 1 + 1 + 2 + 3 + 5 + 8 + 13 = 33 seconds
    const expectedMaxDelay = 33 * 1000; // 33000ms

    expect(maxDelay).toBe(expectedMaxDelay);
  });

  it('should throw error for invalid attempt number', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -100, max: -1 }),
          fc.integer({ min: MAX_RETRIES, max: 100 })
        ),
        (invalidAttempt) => {
          const strategy = new FibonacciRetryStrategy();

          expect(() => strategy.calculateDelay(invalidAttempt)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should ensure jitter keeps delay non-negative', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: MAX_RETRIES - 1 }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (attemptNumber, jitterFactor) => {
          const strategy = new FibonacciRetryStrategy({ jitterFactor });
          
          // Calculate delay multiple times
          for (let i = 0; i < 10; i++) {
            const delay = strategy.calculateDelay(attemptNumber);
            expect(delay).toBeGreaterThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle operations that throw non-Error objects', async () => {
    // Use fewer retries to avoid timeout
    const strategy = new FibonacciRetryStrategy({
      maxRetries: 2,
      fibonacciSequence: [1, 1, 2],
    });

    const operation = async () => {
      throw 'string error'; // Non-Error throw
    };

    const result = await strategy.execute(operation);

    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toBe('string error');
  });

  it('should maintain Fibonacci property: F(n) = F(n-1) + F(n-2)', () => {
    const sequence = FIBONACCI_SEQUENCE;

    // Verify Fibonacci property for all elements after the first two
    for (let i = 2; i < sequence.length; i++) {
      expect(sequence[i]).toBe(sequence[i - 1] + sequence[i - 2]);
    }
  });
});
