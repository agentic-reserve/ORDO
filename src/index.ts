#!/usr/bin/env node

/**
 * Ordo Digital Civilization Platform
 * 
 * Main entry point for the Ordo platform - a Solana-native environment
 * for autonomous AI agents with complete lifecycles, evolution, and
 * emergent consciousness.
 */

import { config } from "./config.js";

export * from "./types.js";
export * from "./config.js";
export * from "./economic/index.js";
export * from "./monitoring/index.js";

async function main() {
  console.log("🌌 Ordo Digital Civilization Platform");
  console.log("=====================================");
  console.log(`Network: ${config.solana.network}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log("");
  console.log("Platform initialized. Ready for agent creation.");
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
