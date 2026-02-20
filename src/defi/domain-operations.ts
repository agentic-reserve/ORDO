/**
 * Domain Operations
 * 
 * Implements .sol domain registration and management using Solana Agent Kit.
 */

import type { SolanaAgentKit } from 'solana-agent-kit';
import type { RegisterDomainParams, TransactionResult } from './types.js';

/**
 * Register a .sol domain
 */
export async function registerDomain(
  agent: SolanaAgentKit,
  params: RegisterDomainParams
): Promise<TransactionResult> {
  try {
    const result = await agent.methods.registerDomain({
      name: params.domain,
      spaceKB: params.spaceKB || 1, // 1KB default
    });
    
    // Estimate cost (domain registration typically costs ~0.02-0.05 SOL)
    const cost = 0.03;
    
    return {
      success: true,
      signature: result.signature,
      cost,
      timestamp: new Date(),
      operation: 'registerDomain',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      cost: 0,
      timestamp: new Date(),
      operation: 'registerDomain',
    };
  }
}

/**
 * Resolve a .sol domain to an address
 */
export async function resolveDomain(
  agent: SolanaAgentKit,
  domain: string
): Promise<string | null> {
  try {
    const result = await agent.methods.resolveDomain({
      domain,
    });
    
    return result.address;
  } catch (error) {
    console.error('Failed to resolve domain:', error);
    return null;
  }
}

/**
 * Get domain info
 */
export async function getDomainInfo(
  agent: SolanaAgentKit,
  domain: string
): Promise<{
  owner: string | null;
  address: string | null;
  registered: boolean;
}> {
  try {
    const address = await resolveDomain(agent, domain);
    
    if (address) {
      return {
        owner: address,
        address,
        registered: true,
      };
    }
    
    return {
      owner: null,
      address: null,
      registered: false,
    };
  } catch (error) {
    console.error('Failed to get domain info:', error);
    return {
      owner: null,
      address: null,
      registered: false,
    };
  }
}
