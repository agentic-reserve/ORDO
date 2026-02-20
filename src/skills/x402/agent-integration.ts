/**
 * Agent Integration for x402 Payment Protocol
 * 
 * Provides high-level functions for agents to use x402 services
 */

import { Connection, Keypair } from "@solana/web3.js";
import { X402Client, atomicToUSD, usdToAtomic } from "./client.js";
import type { Agent } from "../../types.js";
import { trackCosts } from "../../economic/cost-tracking.js";
import { trackEarnings } from "../../economic/earnings-tracking.js";

/**
 * Create an x402 client for an agent
 * Note: In production, the keypair should be securely managed via a wallet service
 */
export function createX402Client(
  agent: Agent,
  keypair: Keypair,
  connection: Connection,
  network: "solana" | "solana-devnet" = "solana-devnet"
): X402Client {
  return new X402Client(
    connection,
    keypair,
    "https://facilitator.payai.network",
    network
  );
}

/**
 * Search for paid services in the x402 bazaar
 */
export async function searchPaidServices(
  agent: Agent,
  keypair: Keypair,
  query: string,
  topK: number = 5
): Promise<any[]> {
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
  );

  const network = process.env.SOLANA_NETWORK === "mainnet-beta" ? "solana" : "solana-devnet";
  const client = createX402Client(agent, keypair, connection, network);
  const results = await client.searchBazaar(query, topK);

  console.log(`Found ${results.length} paid services for query: "${query}"`);
  
  return results.map(resource => ({
    url: resource.url,
    name: resource.name,
    description: resource.description,
    network: resource.network,
    price: atomicToUSD(BigInt(resource.price)),
    priceUSD: `${atomicToUSD(BigInt(resource.price)).toFixed(2)}`,
    method: resource.method,
  }));
}

/**
 * Call a paid API endpoint with automatic payment
 */
export async function callPaidAPI(
  agent: Agent,
  keypair: Keypair,
  url: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    data?: any;
    query?: Record<string, string>;
    maxAmountUSD?: number;
  } = {}
): Promise<any> {
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
  );

  const network = process.env.SOLANA_NETWORK === "mainnet-beta" ? "solana" : "solana-devnet";
  const client = createX402Client(agent, keypair, connection, network);

  // Convert max amount from USD to atomic units (bigint)
  const maxAmount = options.maxAmountUSD
    ? usdToAtomic(options.maxAmountUSD)
    : undefined;

  try {
    // Make the paid request
    const result = await client.pay(url, {
      ...options,
      maxAmount,
    });

    // Track the cost (estimate based on maxAmount or typical cost)
    const costUSD = options.maxAmountUSD || 0.01; // Default to $0.01 if not specified
    
    trackCosts(
      agent,
      "other",
      costUSD,
      "x402 payment",
      {
        url,
        method: options.method || "GET",
        network,
      }
    );

    console.log(`Agent ${agent.name} paid ~${costUSD.toFixed(4)} for ${url}`);

    return result;
  } catch (error) {
    console.error(`Failed to call paid API ${url}:`, error);
    throw error;
  }
}

/**
 * Check if agent has sufficient balance for a payment
 */
export async function checkPaymentBalance(
  agent: Agent,
  keypair: Keypair,
  requiredAmountUSD: number
): Promise<boolean> {
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
  );

  const network = process.env.SOLANA_NETWORK === "mainnet-beta" ? "solana" : "solana-devnet";
  const client = createX402Client(agent, keypair, connection, network);
  
  const usdcBalance = await client.getUSDCBalance();
  const solBalance = await client.getSOLBalance();

  console.log(`Agent ${agent.name} balances:`);
  console.log(`  USDC: ${usdcBalance.toFixed(2)}`);
  console.log(`  SOL: ${solBalance.toFixed(4)} SOL`);
  console.log(`  Required: ${requiredAmountUSD.toFixed(2)}`);

  return usdcBalance >= requiredAmountUSD;
}

/**
 * Get agent's payment history
 */
export async function getAgentPaymentHistory(
  agent: Agent,
  keypair: Keypair,
  limit: number = 10
): Promise<any[]> {
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"
  );

  const network = process.env.SOLANA_NETWORK === "mainnet-beta" ? "solana" : "solana-devnet";
  const client = createX402Client(agent, keypair, connection, network);
  return await client.getPaymentHistory(limit);
}

/**
 * Discover available paid services by category
 */
export async function discoverServicesByCategory(
  agent: Agent,
  keypair: Keypair,
  category: string
): Promise<any[]> {
  const categoryQueries: Record<string, string> = {
    weather: "weather forecast climate",
    sentiment: "sentiment analysis nlp",
    data: "data analytics insights",
    ai: "artificial intelligence ml model",
    blockchain: "blockchain crypto web3",
    finance: "financial market trading",
  };

  const query = categoryQueries[category.toLowerCase()] || category;
  return await searchPaidServices(agent, keypair, query, 10);
}

/**
 * Estimate cost for multiple API calls
 */
export async function estimateCost(
  agent: Agent,
  urls: string[]
): Promise<{ total: number; breakdown: any[] }> {
  const breakdown: any[] = [];
  let total = 0;

  for (const url of urls) {
    // For estimation, we'll use a default cost since we can't discover without making a request
    const estimatedCost = 0.01; // $0.01 default
    total += estimatedCost;
    
    breakdown.push({
      url,
      cost: estimatedCost,
      costUSD: `${estimatedCost.toFixed(4)}`,
      note: "Estimated cost - actual may vary",
    });
  }

  return {
    total,
    breakdown,
  };
}

/**
 * Enable agent to earn from providing x402 services
 */
export async function registerAgentService(
  agent: Agent,
  serviceConfig: {
    name: string;
    description: string;
    endpoint: string;
    priceUSD: number;
    method: string;
  }
): Promise<void> {
  // This would register the agent's service in the x402 bazaar
  // For now, we'll just log the configuration
  
  console.log(`Registering x402 service for agent ${agent.name}:`);
  console.log(`  Name: ${serviceConfig.name}`);
  console.log(`  Description: ${serviceConfig.description}`);
  console.log(`  Endpoint: ${serviceConfig.endpoint}`);
  console.log(`  Price: ${serviceConfig.priceUSD.toFixed(2)}`);
  console.log(`  Method: ${serviceConfig.method}`);

  // Track this as a potential earning opportunity
  trackEarnings(
    agent,
    "other",
    0,
    "x402 service registration",
    {
      service: serviceConfig.name,
      endpoint: serviceConfig.endpoint,
    }
  );
}
