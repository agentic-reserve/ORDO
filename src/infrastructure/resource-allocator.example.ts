/**
 * Example usage of Golden Ratio Resource Allocator
 * 
 * This example demonstrates how to use the resource allocator
 * to set optimal resource limits based on the Golden Ratio (φ = 1.618).
 */

import {
  ResourceAllocator,
  GOLDEN_RATIO,
  allocateResources,
  calculateGoldenRatioLimit,
  type ResourceRequest,
} from './resource-allocator';

console.log('=== Golden Ratio Resource Allocator Example ===\n');

// Example 1: Simple memory allocation
console.log('Example 1: Simple Memory Allocation');
console.log('-----------------------------------');
const memoryRequest: ResourceRequest = { memory: 1000 }; // 1000 MB
const memoryAllocation = allocateResources(memoryRequest);
console.log(`Request: ${memoryAllocation.memory!.request} MB`);
console.log(`Limit: ${memoryAllocation.memory!.limit.toFixed(2)} MB`);
console.log(`Headroom: ${((memoryAllocation.memory!.limit - memoryAllocation.memory!.request) / memoryAllocation.memory!.request * 100).toFixed(1)}%`);
console.log(`Golden Ratio (φ): ${GOLDEN_RATIO.toFixed(6)}\n`);

// Example 2: Multi-resource allocation for an agent
console.log('Example 2: Multi-Resource Agent Allocation');
console.log('------------------------------------------');
const agentRequest: ResourceRequest = {
  memory: 2048, // 2 GB RAM
  cpu: 2, // 2 CPU cores
  storage: 50, // 50 GB storage
  network: 1000, // 1 Gbps network
};

const agentAllocation = allocateResources(agentRequest);

console.log('Memory:');
console.log(`  Request: ${agentAllocation.memory!.request} MB`);
console.log(`  Limit: ${agentAllocation.memory!.limit.toFixed(2)} MB`);

console.log('CPU:');
console.log(`  Request: ${agentAllocation.cpu!.request} cores`);
console.log(`  Limit: ${agentAllocation.cpu!.limit.toFixed(2)} cores`);

console.log('Storage:');
console.log(`  Request: ${agentAllocation.storage!.request} GB`);
console.log(`  Limit: ${agentAllocation.storage!.limit.toFixed(2)} GB`);

console.log('Network:');
console.log(`  Request: ${agentAllocation.network!.request} Mbps`);
console.log(`  Limit: ${agentAllocation.network!.limit.toFixed(2)} Mbps\n`);

// Example 3: Using the allocator class directly
console.log('Example 3: Custom Configuration');
console.log('-------------------------------');
const customAllocator = new ResourceAllocator({
  limitRatio: 2.0, // Custom ratio instead of Golden Ratio
});

const customRequest: ResourceRequest = { memory: 1000 };
const customAllocation = customAllocator.allocate(customRequest);

console.log(`Custom Ratio: 2.0`);
console.log(`Request: ${customAllocation.memory!.request} MB`);
console.log(`Limit: ${customAllocation.memory!.limit} MB`);
console.log(`Headroom: ${customAllocator.calculateHeadroom(customAllocation.memory!.request, customAllocation.memory!.limit).toFixed(1)}%\n`);

// Example 4: Verification
console.log('Example 4: Golden Ratio Verification');
console.log('------------------------------------');
const allocator = new ResourceAllocator();
const testRequest: ResourceRequest = { memory: 1000 };
const testAllocation = allocator.allocate(testRequest);

const isGoldenRatio = allocator.isGoldenRatioAllocation(
  testAllocation.memory!.request,
  testAllocation.memory!.limit
);

console.log(`Is Golden Ratio allocation? ${isGoldenRatio}`);
console.log(`Ratio: ${(testAllocation.memory!.limit / testAllocation.memory!.request).toFixed(6)}`);
console.log(`Golden Ratio (φ): ${GOLDEN_RATIO.toFixed(6)}`);
console.log(`Match: ${Math.abs((testAllocation.memory!.limit / testAllocation.memory!.request) - GOLDEN_RATIO) < 0.000001}\n`);

// Example 5: Convenience function
console.log('Example 5: Convenience Function');
console.log('-------------------------------');
const quickLimit = calculateGoldenRatioLimit(1000);
console.log(`Request: 1000 MB`);
console.log(`Golden Ratio Limit: ${quickLimit.toFixed(2)} MB`);
console.log(`Formula: request × φ = 1000 × ${GOLDEN_RATIO.toFixed(6)} = ${quickLimit.toFixed(2)}\n`);

// Example 6: Real-world scenario - Small agent
console.log('Example 6: Real-World Scenario - Small Agent');
console.log('--------------------------------------------');
const smallAgentRequest: ResourceRequest = {
  memory: 512, // 512 MB
  cpu: 0.5, // 0.5 cores
  storage: 10, // 10 GB
};

const smallAgentAllocation = allocateResources(smallAgentRequest);

console.log('Small Agent Resources:');
console.log(`  Memory: ${smallAgentAllocation.memory!.request} MB → ${smallAgentAllocation.memory!.limit.toFixed(2)} MB`);
console.log(`  CPU: ${smallAgentAllocation.cpu!.request} cores → ${smallAgentAllocation.cpu!.limit.toFixed(2)} cores`);
console.log(`  Storage: ${smallAgentAllocation.storage!.request} GB → ${smallAgentAllocation.storage!.limit.toFixed(2)} GB\n`);

// Example 7: Real-world scenario - Large agent
console.log('Example 7: Real-World Scenario - Large Agent');
console.log('--------------------------------------------');
const largeAgentRequest: ResourceRequest = {
  memory: 8192, // 8 GB
  cpu: 4, // 4 cores
  storage: 500, // 500 GB
  network: 10000, // 10 Gbps
};

const largeAgentAllocation = allocateResources(largeAgentRequest);

console.log('Large Agent Resources:');
console.log(`  Memory: ${largeAgentAllocation.memory!.request} MB → ${largeAgentAllocation.memory!.limit.toFixed(2)} MB`);
console.log(`  CPU: ${largeAgentAllocation.cpu!.request} cores → ${largeAgentAllocation.cpu!.limit.toFixed(2)} cores`);
console.log(`  Storage: ${largeAgentAllocation.storage!.request} GB → ${largeAgentAllocation.storage!.limit.toFixed(2)} GB`);
console.log(`  Network: ${largeAgentAllocation.network!.request} Mbps → ${largeAgentAllocation.network!.limit.toFixed(2)} Mbps\n`);

console.log('=== Why Golden Ratio? ===');
console.log('The Golden Ratio (φ ≈ 1.618) appears throughout nature as the optimal');
console.log('proportion for growth and efficiency. By setting resource limits to');
console.log('request × φ, we provide ~61.8% headroom - the ideal balance between');
console.log('resource availability and efficiency. This prevents resource starvation');
console.log('while avoiding excessive over-allocation.\n');
