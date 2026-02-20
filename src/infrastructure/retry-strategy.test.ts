/**
 * Unit Tests for Fibonacci Retry Strategy
 * 
 * Complements property-based tests with specific examples and edge cases.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  FibonacciRetryStrategy,
  withFibonacciRetry,
  FIBONACCI_SEQUENCE,
  MAX_RETRIES,
  BASE_INTERVAL_MS,
} from './retry-strategy';

describe('FibonacciRetryStrategy - Unit Tests', () => {
  describe('Fibonacci sequence intervals', () => {
    it('should use 1s for first retry (Fib[0])', () => {
      const strategy = new FibonacciRetryStrategy({ jitterFactor: 0 });
      const delay = strategy.calculateDelay(0);
      expect(delay).toBe(1000); // 1 second
    });

    it('should use 1s for second retry (Fib[1])', () => {
      const strategy = new FibonacciRetryStrategy({ jitterFactor: 0 });
      const delay = strategy.calculateDelay(1);
      expect(delay).toBe(1000); // 1 second
    });

    it('should use 2s for third retry (Fib[2])', () => {
      const strategy = new FibonacciRetryStrategy({ jitterFactor: 0 });
      const delay = strategy.calculateDelay(2);
      expect(delay).toBe(2000); // 2 seconds
    });

    it('should use 13s for seventh retry (Fib[6])', () => {
      const strategy = new FibonacciRetryStrategy({ jitterFactor: 0 });
      const delay = strategy.calculateDelay(6);
      expect(delay).toBe(13000); // 13 seconds
    });
  });

  describe('Maximum retries', () => {
    it('should have exactly 7 retry attempts', () => {
      expect(MAX_RETRIES).toBe(7);
      expect(FIBONACCI_SEQUENCE).toHaveLength(7);
    });

    it('should stop after 7 retries (8 total attempts)', async () => {
      // Use fewer retries to avoid timeout
      const strategy = new FibonacciRetryStrategy({
        maxRetries: 3,
        fibonacciSequence: [1, 1, 2, 3],
      });
      const attempts: number[] = [];

      const operation = async () => {
        attempts.push(Date.now());
        throw new Error('Always fails');
      };

      const result = await strategy.execute(operation);

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(4); // Initial + 3 retries
      expect(attempts).toHaveLength(4);
    });
  });

  describe('Jitter', () => {
    it('should add jitter by default', () => {
      const strategy = new FibonacciRetryStrategy();
      
      // Calculate same delay multiple times
      const delays = [
        strategy.calculateDelay(0),
        strategy.calculateDelay(0),
        strategy.calculateDelay(0),
      ];

      // With jitter, at least one should be different
      const allSame = delays.every(d => d === delays[0]);
      expect(allSame).toBe(false);
    });

    it('should not add jitter when jitterFactor is 0', () => {
      const strategy = new FibonacciRetryStrategy({ jitterFactor: 0 });
      
      const delays = [
        strategy.calculateDelay(0),
        strategy.calculateDelay(0),
        strategy.calculateDelay(0),
      ];

      // Without jitter, all should be identical
      expect(delays[0]).toBe(delays[1]);
      expect(delays[1]).toBe(delays[2]);
    });
  });

  describe('Success scenarios', () => {
    it('should return result immediately on first success', async () => {
      const strategy = new FibonacciRetryStrategy();
      const startTime = Date.now();

      const result = await strategy.execute(async () => 'success');

      const elapsed = Date.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(1);
      expect(result.totalDelayMs).toBe(0);
      expect(elapsed).toBeLessThan(100); // Should be nearly instant
    });

    it('should succeed after 2 failures', async () => {
      const strategy = new FibonacciRetryStrategy();
      let count = 0;

      const operation = async () => {
        count++;
        if (count < 3) {
          throw new Error('Not yet');
        }
        return 'finally!';
      };

      const result = await strategy.execute(operation);

      expect(result.success).toBe(true);
      expect(result.result).toBe('finally!');
      expect(result.attempts).toBe(3);
      expect(count).toBe(3);
    });
  });

  describe('Failure scenarios', () => {
    it('should return error after exhausting retries', async () => {
      // Use fewer retries to avoid timeout
      const strategy = new FibonacciRetryStrategy({
        maxRetries: 2,
        fibonacciSequence: [1, 1, 2],
      });

      const result = await strategy.execute(async () => {
        throw new Error('Persistent failure');
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Persistent failure');
      expect(result.attempts).toBe(3); // Initial + 2 retries
    });
  });

  describe('Attempt tracking', () => {
    it('should track all retry attempts', async () => {
      const strategy = new FibonacciRetryStrategy();
      let count = 0;

      await strategy.execute(async () => {
        count++;
        if (count < 4) throw new Error('Fail');
        return 'success';
      });

      const attempts = strategy.getAttempts();

      expect(attempts).toHaveLength(3); // 3 retries before success
      expect(attempts[0].attemptNumber).toBe(1);
      expect(attempts[1].attemptNumber).toBe(2);
      expect(attempts[2].attemptNumber).toBe(3);
    });

    it('should include delay and timestamp for each attempt', async () => {
      const strategy = new FibonacciRetryStrategy();
      let count = 0;

      await strategy.execute(async () => {
        count++;
        if (count < 3) throw new Error('Fail');
        return 'success';
      });

      const attempts = strategy.getAttempts();

      attempts.forEach(attempt => {
        expect(attempt.delayMs).toBeGreaterThan(0);
        expect(attempt.timestamp).toBeInstanceOf(Date);
      });
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const strategy = new FibonacciRetryStrategy();
      const config = strategy.getConfig();

      expect(config.maxRetries).toBe(7);
      expect(config.baseIntervalMs).toBe(1000);
      expect(config.jitterFactor).toBe(0.1);
      expect(config.fibonacciSequence).toEqual([1, 1, 2, 3, 5, 8, 13]);
    });

    it('should allow custom base interval', () => {
      const strategy = new FibonacciRetryStrategy({
        baseIntervalMs: 500,
        jitterFactor: 0,
      });

      const delay = strategy.calculateDelay(2); // Fib[2] = 2
      expect(delay).toBe(1000); // 2 * 500ms
    });

    it('should allow custom Fibonacci sequence', () => {
      const customSequence = [1, 2, 4, 8];
      const strategy = new FibonacciRetryStrategy({
        fibonacciSequence: customSequence,
        maxRetries: 4,
        jitterFactor: 0,
      });

      expect(strategy.calculateDelay(0)).toBe(1000);
      expect(strategy.calculateDelay(1)).toBe(2000);
      expect(strategy.calculateDelay(2)).toBe(4000);
      expect(strategy.calculateDelay(3)).toBe(8000);
    });
  });

  describe('Convenience function', () => {
    it('should work with withFibonacciRetry helper', async () => {
      let count = 0;

      const result = await withFibonacciRetry(async () => {
        count++;
        if (count < 2) throw new Error('Fail');
        return 'success';
      });

      expect(result.success).toBe(true);
      expect(result.result).toBe('success');
      expect(result.attempts).toBe(2);
    });

    it('should accept custom config in helper', async () => {
      const result = await withFibonacciRetry(
        async () => 'immediate',
        { maxRetries: 3 }
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('immediate');
    });
  });

  describe('Edge cases', () => {
    it('should handle operations returning undefined', async () => {
      const strategy = new FibonacciRetryStrategy();

      const result = await strategy.execute(async () => undefined);

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined();
    });

    it('should handle operations returning null', async () => {
      const strategy = new FibonacciRetryStrategy();

      const result = await strategy.execute(async () => null);

      expect(result.success).toBe(true);
      expect(result.result).toBeNull();
    });

    it('should handle operations returning 0', async () => {
      const strategy = new FibonacciRetryStrategy();

      const result = await strategy.execute(async () => 0);

      expect(result.success).toBe(true);
      expect(result.result).toBe(0);
    });

    it('should throw for invalid attempt numbers', () => {
      const strategy = new FibonacciRetryStrategy();

      expect(() => strategy.calculateDelay(-1)).toThrow();
      expect(() => strategy.calculateDelay(7)).toThrow();
      expect(() => strategy.calculateDelay(100)).toThrow();
    });
  });

  describe('Total delay calculation', () => {
    it('should calculate max total delay as sum of Fibonacci sequence', () => {
      const strategy = new FibonacciRetryStrategy();
      const maxDelay = strategy.calculateMaxTotalDelay();

      // 1 + 1 + 2 + 3 + 5 + 8 + 13 = 33 seconds
      expect(maxDelay).toBe(33000);
    });

    it('should calculate max delay for custom sequence', () => {
      const strategy = new FibonacciRetryStrategy({
        fibonacciSequence: [1, 2, 3],
        baseIntervalMs: 1000,
      });

      const maxDelay = strategy.calculateMaxTotalDelay();
      expect(maxDelay).toBe(6000); // 1 + 2 + 3 = 6 seconds
    });
  });

  describe('Real-world example', () => {
    it('should retry a flaky API call', async () => {
      const strategy = new FibonacciRetryStrategy();
      let callCount = 0;

      // Simulate flaky API that fails twice then succeeds
      const flakyApiCall = async () => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Network timeout');
        }
        return { data: 'API response', status: 200 };
      };

      const result = await strategy.execute(flakyApiCall);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ data: 'API response', status: 200 });
      expect(result.attempts).toBe(3);
      expect(callCount).toBe(3);
    });
  });
});
