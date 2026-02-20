/**
 * Agent Registry client
 */

import type { Connection, Keypair } from "@solana/web3.js";
import type { Wallet } from "@coral-xyz/anchor";

/**
 * Agent Registry client interface
 */
export interface AgentRegistryClient {
  registerAgent(
    keypair: Keypair,
    name: string,
    description: string,
    agentUri: string,
    services: string[],
    x402Support: boolean,
    generation: number
  ): Promise<string>;
}

/**
 * Create an Agent Registry client
 * 
 * @param connection - Solana connection
 * @param wallet - Wallet for signing transactions
 * @returns Agent Registry client
 */
export function createAgentRegistryClient(
  connection: Connection,
  wallet: Wallet
): AgentRegistryClient {
  return {
    async registerAgent(
      keypair: Keypair,
      name: string,
      description: string,
      agentUri: string,
      services: string[],
      x402Support: boolean,
      generation: number
    ): Promise<string> {
      return `tx_${keypair.publicKey.toBase58()}`;
    },
  };
}
