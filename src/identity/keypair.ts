/**
 * Keypair generation module
 */

import { Keypair } from "@solana/web3.js";

/**
 * Generate a unique Ed25519 Solana keypair for an agent
 * 
 * @returns A new Solana keypair
 */
export function generateAgentKeypair(): Keypair {
  return Keypair.generate();
}
