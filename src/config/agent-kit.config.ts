import { SolanaAgentKit, KeypairWallet } from 'solana-agent-kit';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Import plugins
import TokenPlugin from '@solana-agent-kit/plugin-token';
import NFTPlugin from '@solana-agent-kit/plugin-nft';
import DefiPlugin from '@solana-agent-kit/plugin-defi';
import MiscPlugin from '@solana-agent-kit/plugin-misc';
import BlinksPlugin from '@solana-agent-kit/plugin-blinks';

export interface AgentKitConfig {
  rpcUrl: string;
  privateKey: string;
  openAiApiKey: string;
  enabledPlugins: string[];
}

/**
 * Create a Solana Agent Kit instance with configured plugins
 */
export function createAgentKit(config: AgentKitConfig): SolanaAgentKit {
  // Validate configuration
  if (!config.rpcUrl) {
    throw new Error('SOLANA_RPC_URL is required');
  }
  if (!config.privateKey) {
    throw new Error('SOLANA_PRIVATE_KEY is required');
  }
  if (!config.openAiApiKey) {
    throw new Error('OPENAI_API_KEY is required');
  }

  // Create keypair from private key
  const keypair = Keypair.fromSecretKey(bs58.decode(config.privateKey));
  const wallet = new KeypairWallet(keypair);

  // Initialize agent with wallet and RPC
  const agent = new SolanaAgentKit(
    wallet,
    config.rpcUrl,
    {
      OPENAI_API_KEY: config.openAiApiKey,
    }
  );

  // Add plugins based on configuration
  if (config.enabledPlugins.includes('token')) {
    agent.use(TokenPlugin);
  }
  
  if (config.enabledPlugins.includes('nft')) {
    agent.use(NFTPlugin);
  }
  
  if (config.enabledPlugins.includes('defi')) {
    agent.use(DefiPlugin);
  }
  
  if (config.enabledPlugins.includes('misc')) {
    agent.use(MiscPlugin);
  }
  
  if (config.enabledPlugins.includes('blinks')) {
    agent.use(BlinksPlugin);
  }

  return agent;
}

/**
 * Get agent kit configuration from environment variables
 */
export function getAgentKitConfig(): AgentKitConfig {
  return {
    rpcUrl: process.env.SOLANA_RPC_URL || '',
    privateKey: process.env.SOLANA_PRIVATE_KEY || '',
    openAiApiKey: process.env.OPENAI_API_KEY || '',
    enabledPlugins: getEnabledPlugins(),
  };
}

/**
 * Determine which plugins should be enabled based on feature flags
 */
function getEnabledPlugins(): string[] {
  const plugins: string[] = [];

  // Token plugin (always enabled for core functionality)
  plugins.push('token');

  // NFT plugin (controlled by feature flag)
  if (process.env.ENABLE_NFT_OPERATIONS === 'true') {
    plugins.push('nft');
  }

  // DeFi plugin (controlled by feature flag)
  if (process.env.ENABLE_DEFI_OPERATIONS === 'true') {
    plugins.push('defi');
  }

  // Misc plugin (always enabled for price feeds, etc.)
  plugins.push('misc');

  // Blinks plugin (optional)
  plugins.push('blinks');

  return plugins;
}

/**
 * Validate agent kit configuration
 */
export function validateAgentKitConfig(config: AgentKitConfig): void {
  const errors: string[] = [];

  if (!config.rpcUrl) {
    errors.push('SOLANA_RPC_URL is required');
  }

  if (!config.privateKey) {
    errors.push('SOLANA_PRIVATE_KEY is required');
  }

  if (!config.openAiApiKey) {
    errors.push('OPENAI_API_KEY is required');
  }

  if (config.enabledPlugins.length === 0) {
    errors.push('At least one plugin must be enabled');
  }

  if (errors.length > 0) {
    throw new Error(`Agent Kit configuration errors:\n${errors.join('\n')}`);
  }
}
