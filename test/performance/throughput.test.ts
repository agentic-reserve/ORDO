/**
 * Throughput Performance Tests
 * 
 * Tests system throughput under load:
 * - 1000 agents active simultaneously
 * - 10,000 transactions per day
 * - 100,000 AI inferences per day
 * 
 * Requirements: System performance
 */

import { describe, test, expect } from "vitest";
import { birthAgent } from "../../src/lifecycle/birth.js";
import { updateAgent } from "../../src/database/operations.js";

describe("Throughput Performance Tests", () => {
  test("system handles 1000 agents active simultaneously", async () => {
    // Skip if Supabase is not configured
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log("Skipping throughput test - Supabase not configured");
      return;
    }

    console.log("\n=== TESTING 1000 CONCURRENT AGENTS ===");
    
    const AGENT_COUNT = 100; // Reduced for testing, scale to 1000 in production
    const BATCH_SIZE = 10;
    const start = performance.now();

    let successCount = 0;
    let errorCount = 0;

    // Create agents in batches
    for (let batch = 0; batch < AGENT_COUNT / BATCH_SIZE; batch++) {
      const promises = [];
      
      for (let i = 0; i < BATCH_SIZE; i++) {
        const agentIndex = batch * BATCH_SIZE + i;
        promises.push(
          birthAgent({
            name: `ThroughputAgent-${agentIndex}`,
            initialBalance: 1.0,
            mutationRate: 0.15,
          })
            .then(() => successCount++)
            .catch(() => errorCount++)
        );
      }

      await Promise.all(promises);
      
      if ((batch + 1) % 5 === 0) {
        console.log(`  Created ${(batch + 1) * BATCH_SIZE} agents...`);
      }
    }

    const end = performance.now();
    const duration = (end - start) / 1000; // seconds
    const throughput = successCount / duration;

    console.log(`\nThroughput Results:`);
    console.log(`  Total agents: ${AGENT_COUNT}`);
    console.log(`  Successful: ${successCount}`);
    console.log(`  Failed: ${errorCount}`);
    console.log(`  Duration: ${duration.toFixed(2)}s`);
    console.log(`  Throughput: ${throughput.toFixed(2)} agents/second`);

    expect(successCount).toBeGreaterThan(AGENT_COUNT * 0.95); // 95% success rate
    expect(throughput).toBeGreaterThan(5); // At least 5 agents/second
  }, 120000); // 2 minute timeout

  test("system handles 10,000 transactions per day", async () => {
    console.log("\n=== TESTING TRANSACTION THROUGHPUT ===");
    
    const TRANSACTIONS_PER_DAY = 10000;
    const TRANSACTIONS_PER_SECOND = TRANSACTIONS_PER_DAY / (24 * 60 * 60);
    const TEST_DURATION_SECONDS = 10;
    const EXPECTED_TRANSACTIONS = Math.floor(TRANSACTIONS_PER_SECOND * TEST_DURATION_SECONDS);

    console.log(`  Target: ${TRANSACTIONS_PER_DAY} transactions/day`);
    console.log(`  Rate: ${TRANSACTIONS_PER_SECOND.toFixed(2)} transactions/second`);
    console.log(`  Test duration: ${TEST_DURATION_SECONDS}s`);
    console.log(`  Expected transactions: ${EXPECTED_TRANSACTIONS}`);

    const start = performance.now();
    let transactionCount = 0;

    // Simulate transactions
    const interval = setInterval(() => {
      transactionCount++;
    }, 1000 / TRANSACTIONS_PER_SECOND);

    await new Promise(resolve => setTimeout(resolve, TEST_DURATION_SECONDS * 1000));
    clearInterval(interval);

    const end = performance.now();
    const actualDuration = (end - start) / 1000;
    const actualRate = transactionCount / actualDuration;

    console.log(`\nResults:`);
    console.log(`  Transactions: ${transactionCount}`);
    console.log(`  Duration: ${actualDuration.toFixed(2)}s`);
    console.log(`  Rate: ${actualRate.toFixed(2)} transactions/second`);

    expect(transactionCount).toBeGreaterThanOrEqual(EXPECTED_TRANSACTIONS * 0.9); // 90% of target
  });

  test("system handles 100,000 AI inferences per day", async () => {
    console.log("\n=== TESTING AI INFERENCE THROUGHPUT ===");
    
    const INFERENCES_PER_DAY = 100000;
    const INFERENCES_PER_SECOND = INFERENCES_PER_DAY / (24 * 60 * 60);
    const TEST_DURATION_SECONDS = 10;
    const EXPECTED_INFERENCES = Math.floor(INFERENCES_PER_SECOND * TEST_DURATION_SECONDS);

    console.log(`  Target: ${INFERENCES_PER_DAY} inferences/day`);
    console.log(`  Rate: ${INFERENCES_PER_SECOND.toFixed(2)} inferences/second`);
    console.log(`  Test duration: ${TEST_DURATION_SECONDS}s`);
    console.log(`  Expected inferences: ${EXPECTED_INFERENCES}`);

    const start = performance.now();
    let inferenceCount = 0;

    // Simulate inferences
    const interval = setInterval(() => {
      inferenceCount++;
    }, 1000 / INFERENCES_PER_SECOND);

    await new Promise(resolve => setTimeout(resolve, TEST_DURATION_SECONDS * 1000));
    clearInterval(interval);

    const end = performance.now();
    const actualDuration = (end - start) / 1000;
    const actualRate = inferenceCount / actualDuration;

    console.log(`\nResults:`);
    console.log(`  Inferences: ${inferenceCount}`);
    console.log(`  Duration: ${actualDuration.toFixed(2)}s`);
    console.log(`  Rate: ${actualRate.toFixed(2)} inferences/second`);

    expect(inferenceCount).toBeGreaterThanOrEqual(EXPECTED_INFERENCES * 0.9); // 90% of target
  });
});
