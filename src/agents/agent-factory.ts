import { SolanaAgentKit } from 'solana-agent-kit';
import { createAgentKit, getAgentKitConfig, validateAgentKitConfig } from '../config/agent-kit.config';
import { Agent } from '../types/agent';

/**
 * Factory for creating and managing Solana Agent Kit instances
 */
export class AgentFactory {
  private static agentKitCache: Map<string, SolanaAgentKit> = new Map();

  /**
   * Create or retrieve a Solana Agent Kit instance for an agent
   * 
   * @param agent - The agent to create a kit for
   * @returns Solana Agent Kit instance
   */
  static getAgentKit(agent: Agent): SolanaAgentKit {
    const cacheKey = agent.publicKey.toString();

    // Return cached instance if available
    if (this.agentKitCache.has(cacheKey)) {
      return this.agentKitCache.get(cacheKey)!;
    }

    // Create new instance
    const config = getAgentKitConfig();
    
    // Validate configuration before creating
    validateAgentKitConfig(config);
    
    const agentKit = createAgentKit(config);

    // Cache for reuse
    this.agentKitCache.set(cacheKey, agentKit);

    return agentKit;
  }

  /**
   * Create a new Solana Agent Kit instance without caching
   * Useful for one-off operations or testing
   * 
   * @param agent - The agent to create a kit for
   * @returns Solana Agent Kit instance
   */
  static createFreshAgentKit(agent: Agent): SolanaAgentKit {
    const config = getAgentKitConfig();
    validateAgentKitConfig(config);
    return createAgentKit(config);
  }

  /**
   * Clear cached agent kit instance for a specific agent
   * 
   * @param agentPublicKey - Public key of the agent
   */
  static clearCache(agentPublicKey: string): void {
    this.agentKitCache.delete(agentPublicKey);
  }

  /**
   * Clear all cached agent kit instances
   * Useful for cleanup or when configuration changes
   */
  static clearAllCaches(): void {
    this.agentKitCache.clear();
  }

  /**
   * Get the number of cached agent kit instances
   * 
   * @returns Number of cached instances
   */
  static getCacheSize(): number {
    return this.agentKitCache.size;
  }

  /**
   * Check if an agent has a cached kit instance
   * 
   * @param agentPublicKey - Public key of the agent
   * @returns True if cached, false otherwise
   */
  static hasCachedKit(agentPublicKey: string): boolean {
    return this.agentKitCache.has(agentPublicKey);
  }
}
