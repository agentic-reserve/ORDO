/**
 * Fibonacci Retry Strategy
 * 
 * Implements retry strategy using Fibonacci sequence for retry intervals.
 * The Fibonacci sequence (1, 1, 2, 3, 5, 8, 13) provides natural exponential backoff
 * that mirrors patterns found in nature and optimal growth.
 * 
 * Features:
 * - Fibonacci sequence intervals: 1s, 1s, 2s, 3s, 5s, 8s, 13s
 * - Maximum 7 retries
 * - Jitter to prevent thundering herd problem
 * 
 * Requirements: 21.4
 * Property 99: Fibonacci Retry Strategy
 */

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base interval in milliseconds (default: 1000ms = 1s) */
  baseIntervalMs: number;
  /** Jitter factor (0-1) to add randomness (default: 0.1 = 10%) */
  jitterFactor: number;
  /** Fibonacci sequence for retry intervals */
  fibonacciSequence: number[];
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalDelayMs: number;
}

export interface RetryAttempt {
  attemptNumber: number;
  delayMs: number;
  timestamp: Date;
}

/**
 * Fibonacci sequence for retry intervals (in seconds)
 * 1, 1, 2, 3, 5, 8, 13
 */
export const FIBONACCI_SEQUENCE = [1, 1, 2, 3, 5, 8, 13];

/**
 * Maximum retry attempts (length of Fibonacci sequence)
 */
export const MAX_RETRIES = 7;

/**
 * Base interval: 1 second
 */
export const BASE_INTERVAL_MS = 1000;

/**
 * Jitter factor: 10% randomness to prevent thundering herd
 */
export const JITTER_FACTOR = 0.1;

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: MAX_RETRIES,
  baseIntervalMs: BASE_INTERVAL_MS,
  jitterFactor: JITTER_FACTOR,
  fibonacciSequence: FIBONACCI_SEQUENCE,
};

/**
 * Fibonacci Retry Strategy
 */
export class FibonacciRetryStrategy {
  private config: RetryConfig;
  private attempts: RetryAttempt[];

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
    this.attempts = [];
  }

  /**
   * Calculate delay for a given retry attempt using Fibonacci sequence
   * 
   * @param attemptNumber - The retry attempt number (0-indexed)
   * @returns Delay in milliseconds
   */
  calculateDelay(attemptNumber: number): number {
    if (attemptNumber < 0 || attemptNumber >= this.config.fibonacciSequence.length) {
      throw new Error(
        `Attempt number ${attemptNumber} out of range [0, ${this.config.fibonacciSequence.length - 1}]`
      );
    }

    // Get Fibonacci number for this attempt
    const fibNumber = this.config.fibonacciSequence[attemptNumber];
    
    // Calculate base delay
    const baseDelay = fibNumber * this.config.baseIntervalMs;
    
    // Add jitter to prevent thundering herd
    const jitter = this.addJitter(baseDelay);
    
    return jitter;
  }

  /**
   * Add jitter to delay to prevent thundering herd problem
   * 
   * Jitter is a random value between [-jitterFactor * delay, +jitterFactor * delay]
   * This spreads out retry attempts across time.
   * 
   * @param delay - Base delay in milliseconds
   * @returns Delay with jitter applied
   */
  private addJitter(delay: number): number {
    const jitterRange = delay * this.config.jitterFactor;
    const jitter = (Math.random() * 2 - 1) * jitterRange; // Random between -jitterRange and +jitterRange
    return Math.max(0, delay + jitter); // Ensure non-negative
  }

  /**
   * Sleep for specified milliseconds
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute an operation with Fibonacci retry strategy
   * 
   * @param operation - Async operation to execute
   * @returns RetryResult with success status, result, and metadata
   */
  async execute<T>(operation: () => Promise<T>): Promise<RetryResult<T>> {
    this.attempts = [];
    let totalDelayMs = 0;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        // First attempt (attempt 0) has no delay
        if (attempt > 0) {
          const delay = this.calculateDelay(attempt - 1);
          totalDelayMs += delay;
          
          this.attempts.push({
            attemptNumber: attempt,
            delayMs: delay,
            timestamp: new Date(),
          });

          await this.sleep(delay);
        }

        // Execute operation
        const result = await operation();
        
        return {
          success: true,
          result,
          attempts: attempt + 1,
          totalDelayMs,
        };
      } catch (error) {
        // If this was the last attempt, return failure
        if (attempt === this.config.maxRetries) {
          return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
            attempts: attempt + 1,
            totalDelayMs,
          };
        }
        
        // Otherwise, continue to next retry
        continue;
      }
    }

    // Should never reach here, but TypeScript needs this
    return {
      success: false,
      error: new Error('Unexpected retry loop exit'),
      attempts: this.config.maxRetries + 1,
      totalDelayMs,
    };
  }

  /**
   * Get retry attempts history
   */
  getAttempts(): RetryAttempt[] {
    return [...this.attempts];
  }

  /**
   * Get configuration
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Calculate total maximum delay if all retries are exhausted
   * (without jitter, for estimation)
   */
  calculateMaxTotalDelay(): number {
    return this.config.fibonacciSequence.reduce(
      (sum, fib) => sum + fib * this.config.baseIntervalMs,
      0
    );
  }

  /**
   * Get the delay for a specific retry attempt (with jitter)
   */
  getDelayForAttempt(attemptNumber: number): number {
    return this.calculateDelay(attemptNumber);
  }
}

/**
 * Convenience function to execute an operation with default Fibonacci retry
 */
export async function withFibonacciRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<RetryResult<T>> {
  const strategy = new FibonacciRetryStrategy(config);
  return strategy.execute(operation);
}
