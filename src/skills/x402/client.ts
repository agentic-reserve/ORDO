/**
 * x402 Payment Protocol Client
 * 
 * Enables agents to discover and call paid API endpoints using the x402 protocol.
 * Uses the official x402-solana package for v2 protocol support.
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { createX402Client } from "x402-solana/client";
import type { WalletAdapter } from "x402-solana/types";

export interface X402PaymentRequirement {
  amount: string;
  currency: string;
  network: string;
  recipient: string;
  schemes: string[];
}

export interface X402Resource {
  url: string;
  name: string;
  description: string;
  network: string;
  price: string;
  method: string;
  inputSchema?: any;
  outputSchema?: any;
}

export interface X402PaymentOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  data?: any;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  maxAmount?: bigint;
  correlationId?: string;
}

export class X402Client {
  private connection: Connection;
  private keypair: Keypair;
  private facilitatorUrl: string;
  private network: "solana" | "solana-devnet";

  constructor(
    connection: Connection,
    keypair: Keypair,
    facilitatorUrl: string = "https://facilitator.payai.network",
    network: "solana" | "solana-devnet" = "solana-devnet"
  ) {
    this.connection = connection;
    this.keypair = keypair;
    this.facilitatorUrl = facilitatorUrl;
    this.network = network;
  }

  /**
   * Create a wallet adapter for x402-solana
   */
  private createWalletAdapter(): WalletAdapter {
    return {
      publicKey: this.keypair.publicKey,
      signTransaction: async (tx) => {
        tx.sign([this.keypair]);
        return tx;
      },
    };
  }

  /**
   * Search the x402 bazaar for paid services
   */
  async searchBazaar(query: string, topK: number = 5): Promise<X402Resource[]> {
    try {
      const response = await fetch(`${this.facilitatorUrl}/bazaar/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          top_k: topK,
        }),
      });

      if (!response.ok) {
        throw new Error(`Bazaar search failed: ${response.statusText}`);
      }

      const results = await response.json();
      return results.resources || [];
    } catch (error) {
      console.error("Failed to search bazaar:", error);
      throw error;
    }
  }

  /**
   * List all available x402 resources
   */
  async listBazaarResources(network?: string): Promise<X402Resource[]> {
    try {
      const url = new URL(`${this.facilitatorUrl}/bazaar/list`);
      if (network) {
        url.searchParams.set("network", network);
      }

      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(`Failed to list resources: ${response.statusText}`);
      }

      const results = await response.json();
      return results.resources || [];
    } catch (error) {
      console.error("Failed to list bazaar resources:", error);
      throw error;
    }
  }

  /**
   * Make a paid request to an x402 endpoint using official x402-solana client
   */
  async pay(
    url: string,
    options: X402PaymentOptions = {}
  ): Promise<any> {
    const {
      method = "GET",
      data,
      query,
      headers = {},
      maxAmount,
      correlationId,
    } = options;

    try {
      // Create x402 client with wallet adapter
      const wallet = this.createWalletAdapter();
      const client = createX402Client({
        wallet,
        network: this.network,
        rpcUrl: this.connection.rpcEndpoint,
        amount: maxAmount,
        verbose: false,
      });

      // Build request URL with query params
      const requestUrl = new URL(url);
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          requestUrl.searchParams.set(key, value);
        });
      }

      // Prepare request options
      const requestOptions: RequestInit = {
        method,
        headers: {
          ...headers,
          "Content-Type": "application/json",
          ...(correlationId && { "X-Correlation-ID": correlationId }),
        },
      };

      if (data && method !== "GET") {
        requestOptions.body = JSON.stringify(data);
      }

      // Make the paid request - x402 client handles 402 automatically
      const response = await client.fetch(requestUrl.toString(), requestOptions);

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Failed to make paid request:", error);
      throw error;
    }
  }

  /**
   * Get payment history for the agent
   */
  async getPaymentHistory(limit: number = 10): Promise<any[]> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        this.keypair.publicKey,
        { limit }
      );

      const transactions = await Promise.all(
        signatures.map(async (sig) => {
          const tx = await this.connection.getTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });
          return {
            signature: sig.signature,
            timestamp: sig.blockTime,
            status: sig.confirmationStatus,
            transaction: tx,
          };
        })
      );

      return transactions;
    } catch (error) {
      console.error("Failed to get payment history:", error);
      throw error;
    }
  }

  /**
   * Check SOL balance
   */
  async getSOLBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.keypair.publicKey);
      return balance / 1_000_000_000; // Convert lamports to SOL
    } catch (error) {
      console.error("Failed to get SOL balance:", error);
      return 0;
    }
  }

  /**
   * Check USDC balance
   */
  async getUSDCBalance(): Promise<number> {
    try {
      // USDC mint addresses
      const USDC_MINT = this.network === "solana"
        ? new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v") // Mainnet
        : new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"); // Devnet

      // Get token accounts
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        this.keypair.publicKey,
        { mint: USDC_MINT }
      );

      if (tokenAccounts.value.length === 0) {
        return 0;
      }

      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance || 0;
    } catch (error) {
      console.error("Failed to get USDC balance:", error);
      return 0;
    }
  }
}

/**
 * Helper function to convert USDC atomic units to dollars
 */
export function atomicToUSD(atomic: number | bigint): number {
  return Number(atomic) / 1_000_000;
}

/**
 * Helper function to convert dollars to USDC atomic units
 */
export function usdToAtomic(usd: number): bigint {
  return BigInt(Math.floor(usd * 1_000_000));
}
