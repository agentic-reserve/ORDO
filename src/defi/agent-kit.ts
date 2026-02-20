/**
 * Solana Agent Kit Integration
 * 
 * Initializes and configures Solana Agent Kit with plugins for DeFi operations.
 */

import { SolanaAgentKit, KeypairWallet } from 'solana-agent-kit';
import { Keypair } from '@solana/web3.js';
import TokenPlugin from '@solana-agent-kit/plugin-token';
import NFTPlugin from '@solana-agent-kit/plugin-nft';
import DefiPlugin from '@solana-agent-kit/plugin-defi';
import MiscPlugin from '@solana-agent-kit/plugin-misc';
import type { DeFiAgentConfig } from './types.js';

/**
 * Create and initialize a Solana Agent Kit instance for an agent
 */
export function createDeFiAgent(config: DeFiAgentConfig): SolanaAgentKit {
  // Create keypair from private key
  const keypair = Keypair.fromSecretKey(config.privateKey);
  
  // Create wallet wrapper
  const wallet = new KeypairWallet(keypair);
  
  // Initialize agent with plugins
  const agent = new SolanaAgentKit(
    wallet,
    config.rpcUrl,
    {
      // Optional: Add API keys if available
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
      HELIUS_API_KEY: process.env.HELIUS_API_KEY,
    }
  )
    .use(TokenPlugin)
    .use(NFTPlugin)
    .use(DefiPlugin)
    .use(MiscPlugin);
  
  return agent;
}

/**
 * Get agent's wallet address
 */
export function getAgentWalletAddress(agent: SolanaAgentKit): string {
  return agent.wallet.publicKey.toBase58();
}

/**
 * Get agent's SOL balance
 */
export async function getAgentBalance(agent: SolanaAgentKit): Promise<number> {
  const balance = await agent.connection.getBalance(agent.wallet.publicKey);
  return balance / 1e9; // Convert lamports to SOL
}
