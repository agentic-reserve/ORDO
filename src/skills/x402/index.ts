/**
 * x402 Payment Protocol Integration
 * 
 * Exports x402 client and utilities for agent use
 */

export { X402Client, atomicToUSD, usdToAtomic } from "./client.js";
export type {
  X402PaymentRequirement,
  X402Resource,
  X402PaymentOptions,
} from "./client.js";

// Re-export for convenience
export { X402Client as default } from "./client.js";
