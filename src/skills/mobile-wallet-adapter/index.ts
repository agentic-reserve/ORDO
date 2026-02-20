/**
 * Mobile Wallet Adapter Integration
 * 
 * Export all MWA functionality for Ordo agents
 */

// Core client
export {
  MobileWalletAdapterClient,
  createMWAClient,
  type MWAAuthorizationResult,
  type MWASignTransactionResult,
  type MWASignMessageResult,
  type MWAClientConfig,
} from "./client.js";

// Agent integration
export {
  createAgentMWAClient,
  authorizeAgentWallet,
  reauthorizeAgentWallet,
  getAgentWalletSession,
  hasActiveWalletSession,
  signTransactionWithMobileWallet,
  signAndSendTransactionWithMobileWallet,
  signMessageWithMobileWallet,
  transferSOLWithMobileWallet,
  getWalletBalance,
  deauthorizeAgentWallet,
  clearAllWalletSessions,
  type AgentWalletSession,
} from "./agent-integration.js";
