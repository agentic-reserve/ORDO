/**
 * Agent Integration for Mobile Wallet Adapter
 * 
 * Provides high-level functions for Ordo agents to interact with mobile wallets
 */

import {
  Connection,
  Transaction,
  VersionedTransaction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  MobileWalletAdapterClient,
  createMWAClient,
  MWAAuthorizationResult,
  MWASignTransactionResult,
} from "./client.js";
import type { Agent } from "../../types.js";
import { trackCosts } from "../../economic/cost-tracking.js";
import { trackEarnings } from "../../economic/earnings-tracking.js";

/**
 * Agent wallet session
 * Stores authorization state for an agent's mobile wallet connection
 */
export interface AgentWalletSession {
  agentId: string;
  publicKey: PublicKey;
  authToken?: string;
  accountLabel?: string;
  walletUriBase?: string;
  authorizedAt: Date;
  expiresAt?: Date;
}

/**
 * In-memory session storage
 * In production, this should be persisted to database
 */
const walletSessions = new Map<string, AgentWalletSession>();

/**
 * Create a Mobile Wallet Adapter client for an agent
 */
export function createAgentMWAClient(
  agent: Agent,
  rpcUrl?: string,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet"
): MobileWalletAdapterClient {
  const url = rpcUrl || process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

  return createMWAClient(url, {
    cluster,
    appIdentity: {
      name: `Ordo Agent: ${agent.name}`,
      uri: "https://ordo.ai",
      icon: "https://ordo.ai/icon.png",
    },
  });
}

/**
 * Authorize agent with a mobile wallet
 * 
 * Opens the wallet selector and requests authorization.
 * Stores the session for future use.
 */
export async function authorizeAgentWallet(
  agent: Agent,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet"
): Promise<AgentWalletSession> {
  const client = createAgentMWAClient(agent, undefined, cluster);

  try {
    const authResult = await client.authorize();

    const session: AgentWalletSession = {
      agentId: agent.id,
      publicKey: authResult.publicKey,
      authToken: authResult.authToken,
      accountLabel: authResult.accountLabel,
      walletUriBase: authResult.walletUriBase,
      authorizedAt: new Date(),
      // MWA sessions typically expire after 7 days
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    // Store session
    walletSessions.set(agent.id, session);

    console.log(`Agent ${agent.name} authorized wallet: ${authResult.publicKey.toBase58()}`);

    return session;
  } catch (error) {
    console.error(`Failed to authorize wallet for agent ${agent.name}:`, error);
    throw error;
  }
}

/**
 * Get agent's wallet session
 */
export function getAgentWalletSession(agent: Agent): AgentWalletSession | undefined {
  return walletSessions.get(agent.id);
}

/**
 * Check if agent has an active wallet session
 */
export function hasActiveWalletSession(agent: Agent): boolean {
  const session = walletSessions.get(agent.id);
  if (!session) return false;

  // Check if session is expired
  if (session.expiresAt && session.expiresAt < new Date()) {
    walletSessions.delete(agent.id);
    return false;
  }

  return true;
}

/**
 * Reauthorize agent's wallet session
 * 
 * Attempts to reauthorize without user interaction using stored auth token
 */
export async function reauthorizeAgentWallet(
  agent: Agent,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet"
): Promise<AgentWalletSession> {
  const existingSession = walletSessions.get(agent.id);
  if (!existingSession || !existingSession.authToken) {
    throw new Error("No existing session or auth token found");
  }

  const client = createAgentMWAClient(agent, undefined, cluster);

  try {
    const authResult = await client.reauthorize(existingSession.authToken);

    const session: AgentWalletSession = {
      agentId: agent.id,
      publicKey: authResult.publicKey,
      authToken: authResult.authToken,
      accountLabel: authResult.accountLabel,
      walletUriBase: authResult.walletUriBase,
      authorizedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    walletSessions.set(agent.id, session);

    console.log(`Agent ${agent.name} reauthorized wallet: ${authResult.publicKey.toBase58()}`);

    return session;
  } catch (error) {
    console.error(`Failed to reauthorize wallet for agent ${agent.name}:`, error);
    // Clear invalid session
    walletSessions.delete(agent.id);
    throw error;
  }
}

/**
 * Sign a transaction with agent's mobile wallet
 */
export async function signTransactionWithMobileWallet(
  agent: Agent,
  transaction: Transaction | VersionedTransaction,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet"
): Promise<MWASignTransactionResult> {
  const session = walletSessions.get(agent.id);
  const client = createAgentMWAClient(agent, undefined, cluster);

  try {
    const result = await client.signTransaction(transaction, session?.authToken);

    console.log(`Agent ${agent.name} signed transaction`);

    return result;
  } catch (error) {
    console.error(`Failed to sign transaction for agent ${agent.name}:`, error);
    throw error;
  }
}

/**
 * Sign and send a transaction with agent's mobile wallet
 * 
 * Automatically tracks transaction costs
 */
export async function signAndSendTransactionWithMobileWallet(
  agent: Agent,
  transaction: Transaction | VersionedTransaction,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet"
): Promise<string> {
  const session = walletSessions.get(agent.id);
  const client = createAgentMWAClient(agent, undefined, cluster);

  try {
    const signature = await client.signAndSendTransaction(
      transaction,
      session?.authToken
    );

    // Track transaction cost (estimate 5000 lamports = 0.000005 SOL)
    const txFee = 0.000005;
    trackCosts(
      agent,
      "transaction",
      txFee,
      "Mobile wallet transaction",
      {
        signature,
        cluster,
        method: "mobile_wallet_adapter",
      }
    );

    console.log(`Agent ${agent.name} sent transaction: ${signature}`);

    return signature;
  } catch (error) {
    console.error(`Failed to send transaction for agent ${agent.name}:`, error);
    throw error;
  }
}

/**
 * Sign a message with agent's mobile wallet
 * 
 * Useful for authentication and verification
 */
export async function signMessageWithMobileWallet(
  agent: Agent,
  message: string | Uint8Array,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet"
): Promise<Uint8Array> {
  const session = walletSessions.get(agent.id);
  const client = createAgentMWAClient(agent, undefined, cluster);

  const messageBytes =
    typeof message === "string" ? new TextEncoder().encode(message) : message;

  try {
    const result = await client.signMessage(messageBytes, session?.authToken);

    console.log(`Agent ${agent.name} signed message`);

    return result.signature;
  } catch (error) {
    console.error(`Failed to sign message for agent ${agent.name}:`, error);
    throw error;
  }
}

/**
 * Transfer SOL using mobile wallet
 * 
 * Creates and signs a SOL transfer transaction via mobile wallet
 */
export async function transferSOLWithMobileWallet(
  agent: Agent,
  toPublicKey: PublicKey,
  amountSOL: number,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet"
): Promise<string> {
  const session = walletSessions.get(agent.id);
  if (!session) {
    throw new Error("No active wallet session. Call authorizeAgentWallet first.");
  }

  const client = createAgentMWAClient(agent, undefined, cluster);
  const connection = client.getConnection();

  // Create transfer transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: session.publicKey,
      toPubkey: toPublicKey,
      lamports: amountSOL * LAMPORTS_PER_SOL,
    })
  );

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = session.publicKey;

  // Sign and send
  const signature = await signAndSendTransactionWithMobileWallet(
    agent,
    transaction,
    cluster
  );

  // Track the transfer as a cost
  trackCosts(
    agent,
    "other",
    amountSOL,
    "SOL transfer via mobile wallet",
    {
      signature,
      recipient: toPublicKey.toBase58(),
      amount: amountSOL,
    }
  );

  console.log(
    `Agent ${agent.name} transferred ${amountSOL} SOL to ${toPublicKey.toBase58()}`
  );

  return signature;
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(
  agent: Agent,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet"
): Promise<number> {
  const session = walletSessions.get(agent.id);
  if (!session) {
    throw new Error("No active wallet session. Call authorizeAgentWallet first.");
  }

  const client = createAgentMWAClient(agent, undefined, cluster);
  const connection = client.getConnection();

  const balance = await connection.getBalance(session.publicKey);
  return balance / LAMPORTS_PER_SOL;
}

/**
 * Deauthorize agent's wallet session
 */
export async function deauthorizeAgentWallet(
  agent: Agent,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet"
): Promise<void> {
  const session = walletSessions.get(agent.id);
  if (!session || !session.authToken) {
    console.log(`No active session to deauthorize for agent ${agent.name}`);
    return;
  }

  const client = createAgentMWAClient(agent, undefined, cluster);

  try {
    await client.deauthorize(session.authToken);
    walletSessions.delete(agent.id);

    console.log(`Agent ${agent.name} deauthorized wallet session`);
  } catch (error) {
    console.error(`Failed to deauthorize wallet for agent ${agent.name}:`, error);
    // Clear session anyway
    walletSessions.delete(agent.id);
    throw error;
  }
}

/**
 * Clear all wallet sessions (for testing)
 */
export function clearAllWalletSessions(): void {
  walletSessions.clear();
}
