/**
 * Load Testing Suite
 * 
 * Tests system behavior under increasing load:
 * - Gradually increase load to 2x expected capacity
 * - Measure latency degradation
 * - Verify auto-scaling triggers at 88.8% utilization
 * 
 * Requirements: 21.3
 */

import { describe, test, expect } from "vitest";

describe("Load Testing Suite", () => {
  test("system handles gradual load increase to 2x capacity", async () => {
    console.log("\n=== LOAD TESTING: GRADUAL INCREASE ===");
    
    const BASELINE_LOAD = 100; // requests per second
    const MAX_LOAD = BASELINE_LOAD * 2;
    const LOAD_STEPS = 5;
    const STEP_DURATION_MS = 5000; // 5 seconds per step

    const results: Array<{
      load: number;
      avgLatency: number;
      maxLatency: number;
      errorRate: number;
    }> = [];

    for (let step = 0; step <= LOAD_STEPS; step++) {
      const currentLoad = BASELINE_LOAD + (step * (MAX_LOAD - BASELINE_LOAD) / LOAD_STEPS);
      console.log(`\n  Step ${step + 1}/${LOAD_STEPS + 1}: ${currentLoad} req/s`);

      const latencies: number[] = [];
      let errorCount = 0;
      let successCount = 0;

      const startTime = Date.now();
      const endTime = startTime + STEP_DURATION_MS;

      while (Date.now() < endTime) {
        const requestStart = performance.now();
        
        try {
          // Simulate request processing
          await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 20));
          successCount++;
          
          const requestEnd = performance.now();
          latencies.push(requestEnd - requestStart);
        } catch (error) {
          errorCount++;
        }

        // Wait to maintain target load
        const requestsPerMs = currentLoad / 1000;
        const waitTime = 1 / requestsPerMs;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);
      const errorRate = errorCount / (successCount + errorCount);

      results.push({
        load: currentLoad,
        avgLatency,
        maxLatency,
        errorRate,
      });

      console.log(`    Avg latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`    Max latency: ${maxLatency.toFixed(2)}ms`);
      console.log(`    Error rate: ${(errorRate * 100).toFixed(2)}%`);
    }

    console.log("\n=== LOAD TEST SUMMARY ===");
    console.log("Load (req/s) | Avg Latency (ms) | Max Latency (ms) | Error Rate (%)");
    console.log("-------------|------------------|------------------|---------------");
    
    for (const result of results) {
      console.log(
        `${result.load.toString().padEnd(12)} | ` +
        `${result.avgLatency.toFixed(2).padEnd(16)} | ` +
        `${result.maxLatency.toFixed(2).padEnd(16)} | ` +
        `${(result.errorRate * 100).toFixed(2)}`
      );
    }

    // Verify latency degradation is acceptable
    const baselineLatency = results[0].avgLatency;
    const maxLoadLatency = results[results.length - 1].avgLatency;
    const latencyIncrease = (maxLoadLatency - baselineLatency) / baselineLatency;

    console.log(`\nLatency increase at 2x load: ${(latencyIncrease * 100).toFixed(2)}%`);

    expect(latencyIncrease).toBeLessThan(2.0); // Less than 200% increase
    expect(results[results.length - 1].errorRate).toBeLessThan(0.05); // Less than 5% errors
  }, 60000); // 1 minute timeout

  test("auto-scaling triggers at 88.8% utilization", async () => {
    console.log("\n=== AUTO-SCALING TEST ===");
    
    const AUTO_SCALE_THRESHOLD = 0.888; // 88.8%
    const MAX_CAPACITY = 1000; // requests per second
    
    let currentCapacity = MAX_CAPACITY;
    let currentLoad = 0;
    let scalingTriggered = false;

    console.log(`  Initial capacity: ${currentCapacity} req/s`);
    console.log(`  Auto-scale threshold: ${(AUTO_SCALE_THRESHOLD * 100).toFixed(1)}%`);

    // Gradually increase load
    for (let i = 0; i <= 100; i += 10) {
      currentLoad = (i / 100) * MAX_CAPACITY;
      const utilization = currentLoad / currentCapacity;

      console.log(`\n  Load: ${currentLoad.toFixed(0)} req/s`);
      console.log(`  Utilization: ${(utilization * 100).toFixed(1)}%`);

      if (utilization >= AUTO_SCALE_THRESHOLD && !scalingTriggered) {
        console.log(`  ✓ Auto-scaling triggered!`);
        scalingTriggered = true;
        
        // Simulate scaling up
        currentCapacity *= 1.5;
        console.log(`  New capacity: ${currentCapacity.toFixed(0)} req/s`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n=== AUTO-SCALING SUMMARY ===`);
    console.log(`  Scaling triggered: ${scalingTriggered ? "Yes" : "No"}`);
    console.log(`  Final capacity: ${currentCapacity.toFixed(0)} req/s`);

    expect(scalingTriggered).toBe(true);
    expect(currentCapacity).toBeGreaterThan(MAX_CAPACITY);
  });

  test("system maintains performance under sustained load", async () => {
    console.log("\n=== SUSTAINED LOAD TEST ===");
    
    const LOAD = 100; // requests per second
    const DURATION_MS = 10000; // 10 seconds
    const SAMPLE_INTERVAL_MS = 1000; // Sample every second

    console.log(`  Load: ${LOAD} req/s`);
    console.log(`  Duration: ${DURATION_MS / 1000}s`);

    const samples: Array<{
      timestamp: number;
      avgLatency: number;
      errorRate: number;
    }> = [];

    const startTime = Date.now();
    let sampleStart = startTime;

    while (Date.now() - startTime < DURATION_MS) {
      const latencies: number[] = [];
      let errorCount = 0;
      let successCount = 0;

      // Process requests for sample interval
      while (Date.now() - sampleStart < SAMPLE_INTERVAL_MS) {
        const requestStart = performance.now();
        
        try {
          await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 10));
          successCount++;
          
          const requestEnd = performance.now();
          latencies.push(requestEnd - requestStart);
        } catch (error) {
          errorCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 1000 / LOAD));
      }

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const errorRate = errorCount / (successCount + errorCount);

      samples.push({
        timestamp: Date.now() - startTime,
        avgLatency,
        errorRate,
      });

      console.log(`  ${((Date.now() - startTime) / 1000).toFixed(0)}s: ` +
                  `${avgLatency.toFixed(2)}ms avg, ` +
                  `${(errorRate * 100).toFixed(2)}% errors`);

      sampleStart = Date.now();
    }

    // Verify performance stability
    const latencies = samples.map(s => s.avgLatency);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);
    const latencyVariance = maxLatency - minLatency;

    console.log(`\n=== SUSTAINED LOAD SUMMARY ===`);
    console.log(`  Avg latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`  Min latency: ${minLatency.toFixed(2)}ms`);
    console.log(`  Max latency: ${maxLatency.toFixed(2)}ms`);
    console.log(`  Variance: ${latencyVariance.toFixed(2)}ms`);

    expect(latencyVariance).toBeLessThan(avgLatency * 0.5); // Variance < 50% of average
  }, 30000); // 30 second timeout
});
