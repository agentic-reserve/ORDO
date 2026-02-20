/**
 * Property Tests for Transaction Tracking
 * 
 * Property 55: Transaction Success Tracking
 * For any DeFi transaction (swap, stake, lend, etc.), the system should track
 * success rate, cost, and outcome, enabling agents to learn from transaction history.
 * 
 * **Validates: Requirements 12.6**
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { ulid } from 'ulid';
import {
  TransactionTracker,
  createTransactionTracker,
} from './transaction-tracking.js';
import type { TransactionResult } from './types.js';

// Mock Supabase client for testing
class MockSupabaseClient {
  private data: Map<string, any[]> = new Map();
  
  from(table: string) {
    return {
      insert: async (record: any) => {
        if (!this.data.has(table)) {
          this.data.set(table, []);
        }
        this.data.get(table)!.push(record);
        return { error: null };
      },
      select: (columns: string) => {
        const self = this;
        return {
          eq: (column: string, value: any) => {
            return {
              order: (orderColumn: string, options: any) => {
                return {
                  limit: (limit: number) => {
                    return {
                      then: async (resolve: any) => {
                        const records = self.data.get(table) || [];
                        const filtered = records.filter((r: any) => r[column] === value);
                        const sorted = [...filtered].sort((a: any, b: any) => {
                          const aTime = new Date(a.timestamp).getTime();
                          const bTime = new Date(b.timestamp).getTime();
                          return options.ascending ? aTime - bTime : bTime - aTime;
                        });
                        const limited = sorted.slice(0, limit);
                        resolve({ data: limited, error: null });
                      },
                    };
                  },
                };
              },
              eq: (column2: string, value2: any) => {
                return {
                  order: (orderColumn: string, options: any) => {
                    return {
                      limit: (limit: number) => {
                        return {
                          then: async (resolve: any) => {
                            const records = self.data.get(table) || [];
                            const filtered = records.filter((r: any) => 
                              r[column] === value && r[column2] === value2
                            );
                            const sorted = [...filtered].sort((a: any, b: any) => {
                              const aTime = new Date(a.timestamp).getTime();
                              const bTime = new Date(b.timestamp).getTime();
                              return options.ascending ? aTime - bTime : bTime - aTime;
                            });
                            const limited = sorted.slice(0, limit);
                            resolve({ data: limited, error: null });
                          },
                        };
                      },
                    };
                  },
                  eq: (column3: string, value3: any) => {
                    return {
                      order: (orderColumn: string, options: any) => {
                        return {
                          limit: (limit: number) => {
                            return {
                              then: async (resolve: any) => {
                                const records = self.data.get(table) || [];
                                const filtered = records.filter((r: any) => 
                                  r[column] === value && r[column2] === value2 && r[column3] === value3
                                );
                                const sorted = [...filtered].sort((a: any, b: any) => {
                                  const aTime = new Date(a.timestamp).getTime();
                                  const bTime = new Date(b.timestamp).getTime();
                                  return options.ascending ? aTime - bTime : bTime - aTime;
                                });
                                const limited = sorted.slice(0, limit);
                                resolve({ data: limited, error: null });
                              },
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
              gte: (column: string, value: any) => {
                return {
                  order: (orderColumn: string, options: any) => {
                    return {
                      then: async (resolve: any) => {
                        const records = self.data.get(table) || [];
                        const filtered = records.filter((r: any) => 
                          r.agentId === value && new Date(r.timestamp) >= new Date(value)
                        );
                        const sorted = [...filtered].sort((a: any, b: any) => {
                          const aTime = new Date(a.timestamp).getTime();
                          const bTime = new Date(b.timestamp).getTime();
                          return options.ascending ? aTime - bTime : bTime - aTime;
                        });
                        resolve({ data: sorted, error: null });
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    };
  }
  
  clear() {
    this.data.clear();
  }
}

// Create a mock tracker for testing
function createMockTracker(): { tracker: TransactionTracker; mockClient: MockSupabaseClient } {
  const mockClient = new MockSupabaseClient();
  // Use a valid URL to avoid validation error
  const tracker = new TransactionTracker('https://mock.supabase.co', 'mock-key');
  // Replace the supabase client with our mock
  (tracker as any).supabase = mockClient;
  return { tracker, mockClient };
}

describe('Property 55: Transaction Success Tracking', () => {
  let tracker: TransactionTracker;
  let mockClient: MockSupabaseClient;
  
  beforeEach(() => {
    const mock = createMockTracker();
    tracker = mock.tracker;
    mockClient = mock.mockClient;
  });
  
  afterEach(() => {
    // Clear mock data
    mockClient.clear();
  });
  
  it('should track all transaction details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10 }), // agentId
        fc.constantFrom('swap', 'stake', 'lend', 'transfer', 'mintNFT'), // operation
        fc.boolean(), // success
        fc.double({ min: 0, max: 1 }), // cost
        fc.record({
          amount: fc.double({ min: 0, max: 1000 }),
          token: fc.string(),
        }), // parameters
        async (agentId, operation, success, cost, parameters) => {
          // Create a transaction result
          const result: TransactionResult = {
            success,
            signature: success ? ulid() : undefined,
            error: success ? undefined : 'Transaction failed',
            cost,
            timestamp: new Date(),
            operation,
          };
          
          // Record the transaction
          await tracker.recordTransaction(agentId, operation, result, parameters);
          
          // Retrieve transaction history
          const history = await tracker.getTransactionHistory(agentId);
          
          // Verify transaction was recorded
          expect(history.length).toBeGreaterThan(0);
          
          const recorded = history[0];
          expect(recorded.agentId).toBe(agentId);
          expect(recorded.operation).toBe(operation);
          expect(recorded.success).toBe(success);
          expect(recorded.cost).toBe(cost);
          expect(recorded.parameters).toEqual(parameters);
          
          if (success) {
            expect(recorded.result).toBeDefined();
            expect(recorded.error).toBeUndefined();
          } else {
            expect(recorded.error).toBeDefined();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should calculate accurate success rates', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10 }), // agentId
        fc.array(
          fc.record({
            operation: fc.constantFrom('swap', 'stake', 'lend'),
            success: fc.boolean(),
            cost: fc.double({ min: 0, max: 0.1, noNaN: true }),
          }),
          { minLength: 10, maxLength: 50 }
        ),
        async (agentId, transactions) => {
          // Create a fresh tracker for this iteration
          const { tracker: freshTracker, mockClient: freshMockClient } = createMockTracker();
          
          // Record all transactions
          for (const tx of transactions) {
            const result: TransactionResult = {
              success: tx.success,
              signature: tx.success ? ulid() : undefined,
              error: tx.success ? undefined : 'Failed',
              cost: tx.cost,
              timestamp: new Date(),
              operation: tx.operation,
            };
            
            await freshTracker.recordTransaction(agentId, tx.operation, result, {});
          }
          
          // Get statistics
          const stats = await freshTracker.getTransactionStats(agentId);
          
          // Calculate expected values
          const expectedTotal = transactions.length;
          const expectedSuccessful = transactions.filter(t => t.success).length;
          const expectedFailed = expectedTotal - expectedSuccessful;
          const expectedSuccessRate = (expectedSuccessful / expectedTotal) * 100;
          const expectedTotalCost = transactions.reduce((sum, t) => sum + t.cost, 0);
          const expectedAvgCost = expectedTotalCost / expectedTotal;
          
          // Verify statistics
          expect(stats.totalTransactions).toBe(expectedTotal);
          expect(stats.successfulTransactions).toBe(expectedSuccessful);
          expect(stats.failedTransactions).toBe(expectedFailed);
          expect(stats.successRate).toBeCloseTo(expectedSuccessRate, 1);
          expect(stats.totalCost).toBeCloseTo(expectedTotalCost, 5);
          expect(stats.averageCost).toBeCloseTo(expectedAvgCost, 5);
          
          // Clean up
          freshMockClient.clear();
        }
      ),
      { numRuns: 50 }
    );
  });
  
  it('should track per-operation statistics', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10 }), // agentId
        fc.constantFrom('swap', 'stake', 'lend'), // operation
        fc.array(
          fc.record({
            success: fc.boolean(),
            cost: fc.double({ min: 0, max: 0.1, noNaN: true }),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        async (agentId, operation, transactions) => {
          // Create a fresh tracker for this iteration
          const { tracker: freshTracker, mockClient: freshMockClient } = createMockTracker();
          
          // Record all transactions for this operation
          for (const tx of transactions) {
            const result: TransactionResult = {
              success: tx.success,
              signature: tx.success ? ulid() : undefined,
              error: tx.success ? undefined : 'Failed',
              cost: tx.cost,
              timestamp: new Date(),
              operation,
            };
            
            await freshTracker.recordTransaction(agentId, operation, result, {});
          }
          
          // Get statistics
          const stats = await freshTracker.getTransactionStats(agentId);
          
          // Verify operation-specific statistics
          expect(stats.operationStats[operation]).toBeDefined();
          
          const opStats = stats.operationStats[operation];
          const expectedCount = transactions.length;
          const expectedSuccessful = transactions.filter(t => t.success).length;
          const expectedSuccessRate = (expectedSuccessful / expectedCount) * 100;
          const expectedTotalCost = transactions.reduce((sum, t) => sum + t.cost, 0);
          const expectedAvgCost = expectedTotalCost / expectedCount;
          
          expect(opStats.count).toBe(expectedCount);
          expect(opStats.successRate).toBeCloseTo(expectedSuccessRate, 1);
          expect(opStats.averageCost).toBeCloseTo(expectedAvgCost, 5);
          
          // Clean up
          freshMockClient.clear();
        }
      ),
      { numRuns: 50 }
    );
  });
  
  it('should enable learning from successful patterns', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10 }), // agentId
        fc.constantFrom('swap', 'stake', 'lend'), // operation
        fc.array(
          fc.record({
            success: fc.boolean(),
            cost: fc.double({ min: 0, max: 0.1 }),
            slippage: fc.integer({ min: 10, max: 100 }),
          }),
          { minLength: 10, maxLength: 30 }
        ),
        async (agentId, operation, transactions) => {
          // Record all transactions
          for (const tx of transactions) {
            const result: TransactionResult = {
              success: tx.success,
              signature: tx.success ? ulid() : undefined,
              error: tx.success ? undefined : 'Failed',
              cost: tx.cost,
              timestamp: new Date(),
              operation,
            };
            
            await tracker.recordTransaction(agentId, operation, result, {
              slippage: tx.slippage,
            });
          }
          
          // Get successful patterns
          const successfulPatterns = await tracker.getSuccessfulPatterns(agentId, operation);
          
          // Verify all returned patterns are successful
          expect(successfulPatterns.every(p => p.success)).toBe(true);
          
          // Verify count matches expected
          const expectedSuccessful = transactions.filter(t => t.success).length;
          expect(successfulPatterns.length).toBe(Math.min(expectedSuccessful, 50));
          
          // Get failed patterns
          const failedPatterns = await tracker.getFailedPatterns(agentId, operation);
          
          // Verify all returned patterns are failed
          expect(failedPatterns.every(p => !p.success)).toBe(true);
          
          // Verify count matches expected
          const expectedFailed = transactions.filter(t => !t.success).length;
          expect(failedPatterns.length).toBe(Math.min(expectedFailed, 50));
        }
      ),
      { numRuns: 50 }
    );
  });
  
  it('should track transaction costs accurately', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10 }), // agentId
        fc.array(
          fc.record({
            operation: fc.constantFrom('swap', 'stake', 'transfer'),
            cost: fc.double({ min: 0.0001, max: 0.1, noNaN: true }),
          }),
          { minLength: 5, maxLength: 20 }
        ),
        async (agentId, transactions) => {
          // Create a fresh tracker for this iteration
          const { tracker: freshTracker, mockClient: freshMockClient } = createMockTracker();
          
          // Record all transactions
          for (const tx of transactions) {
            const result: TransactionResult = {
              success: true,
              signature: ulid(),
              cost: tx.cost,
              timestamp: new Date(),
              operation: tx.operation,
            };
            
            await freshTracker.recordTransaction(agentId, tx.operation, result, {});
          }
          
          // Get statistics
          const stats = await freshTracker.getTransactionStats(agentId);
          
          // Calculate expected total cost
          const expectedTotalCost = transactions.reduce((sum, t) => sum + t.cost, 0);
          
          // Verify total cost is tracked accurately
          expect(stats.totalCost).toBeCloseTo(expectedTotalCost, 5);
          
          // Verify average cost
          const expectedAvgCost = expectedTotalCost / transactions.length;
          expect(stats.averageCost).toBeCloseTo(expectedAvgCost, 5);
          
          // Clean up
          freshMockClient.clear();
        }
      ),
      { numRuns: 50 }
    );
  });
  
  it('should maintain transaction history ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10 }), // agentId
        fc.array(
          fc.record({
            operation: fc.constantFrom('swap', 'stake'),
            success: fc.boolean(),
          }),
          { minLength: 5, maxLength: 15 }
        ),
        async (agentId, transactions) => {
          // Record transactions with delays to ensure different timestamps
          for (let i = 0; i < transactions.length; i++) {
            const tx = transactions[i];
            const result: TransactionResult = {
              success: tx.success,
              signature: tx.success ? ulid() : undefined,
              cost: 0.001,
              timestamp: new Date(Date.now() + i * 1000), // 1 second apart
              operation: tx.operation,
            };
            
            await tracker.recordTransaction(agentId, tx.operation, result, {});
          }
          
          // Get transaction history
          const history = await tracker.getTransactionHistory(agentId);
          
          // Verify history is ordered by timestamp (most recent first)
          for (let i = 0; i < history.length - 1; i++) {
            const current = new Date(history[i].timestamp).getTime();
            const next = new Date(history[i + 1].timestamp).getTime();
            expect(current).toBeGreaterThanOrEqual(next);
          }
        }
      ),
      { numRuns: 30 }
    );
  });
});
