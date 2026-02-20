/**
 * Mobile Wallet Adapter Integration
 * 
 * Provides wallet connection and transaction signing for Ordo Mobile
 */

import { transact, Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { Connection, Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';

export interface WalletSession {
  publicKey: PublicKey;
  authToken?: string;
  accountLabel?: string;
  walletUriBase?: string;
}

export interface MobileWalletConfig {
  cluster: 'mainnet-beta' | 'devnet' | 'testnet';
  appIdentity: {
    name: string;
    uri: string;
    icon: string;
  };
}

const DEFAULT_CONFIG: MobileWalletConfig = {
  cluster: 'devnet',
  appIdentity: {
    name: 'Ordo Mobile',
    uri: 'https://ordo.ai',
    icon: 'https://ordo.ai/icon.png',
  },
};

/**
 * Connect to mobile wallet
 */
export async function connectWallet(
  config: MobileWalletConfig = DEFAULT_CONFIG
): Promise<WalletSession> {
  return await transact(async (wallet: Web3MobileWallet) => {
    const authResult = await wallet.authorize({
      cluster: config.cluster,
      identity: config.appIdentity,
    });

    return {
      publicKey: authResult.accounts[0].publicKey,
      authToken: authResult.auth_token,
      accountLabel: authResult.accounts[0].label,
      walletUriBase: authResult.wallet_uri_base,
    };
  });
}

/**
 * Reauthorize with stored auth token
 */
export async function reauthorizeWallet(
  authToken: string,
  config: MobileWalletConfig = DEFAULT_CONFIG
): Promise<WalletSession> {
  return await transact(async (wallet: Web3MobileWallet) => {
    const authResult = await wallet.reauthorize({
      cluster: config.cluster,
      identity: config.appIdentity,
      auth_token: authToken,
    });

    return {
      publicKey: authResult.accounts[0].publicKey,
      authToken: authResult.auth_token,
      accountLabel: authResult.accounts[0].label,
      walletUriBase: authResult.wallet_uri_base,
    };
  });
}

/**
 * Sign transaction with mobile wallet
 */
export async function signTransaction(
  transaction: Transaction | VersionedTransaction,
  authToken?: string,
  config: MobileWalletConfig = DEFAULT_CONFIG
): Promise<Transaction | VersionedTransaction> {
  return await transact(async (wallet: Web3MobileWallet) => {
    if (authToken) {
      await wallet.reauthorize({
        cluster: config.cluster,
        identity: config.appIdentity,
        auth_token: authToken,
      });
    } else {
      await wallet.authorize({
        cluster: config.cluster,
        identity: config.appIdentity,
      });
    }

    const signedTransactions = await wallet.signTransactions({
      transactions: [transaction],
    });

    return signedTransactions[0];
  });
}

/**
 * Sign and send transaction
 */
export async function signAndSendTransaction(
  transaction: Transaction | VersionedTransaction,
  authToken?: string,
  config: MobileWalletConfig = DEFAULT_CONFIG
): Promise<string> {
  return await transact(async (wallet: Web3MobileWallet) => {
    if (authToken) {
      await wallet.reauthorize({
        cluster: config.cluster,
        identity: config.appIdentity,
        auth_token: authToken,
      });
    } else {
      await wallet.authorize({
        cluster: config.cluster,
        identity: config.appIdentity,
      });
    }

    const signatures = await wallet.signAndSendTransactions({
      transactions: [transaction],
    });

    return signatures[0];
  });
}

/**
 * Sign message with mobile wallet
 */
export async function signMessage(
  message: Uint8Array,
  authToken?: string,
  config: MobileWalletConfig = DEFAULT_CONFIG
): Promise<Uint8Array> {
  return await transact(async (wallet: Web3MobileWallet) => {
    if (authToken) {
      await wallet.reauthorize({
        cluster: config.cluster,
        identity: config.appIdentity,
        auth_token: authToken,
      });
    } else {
      await wallet.authorize({
        cluster: config.cluster,
        identity: config.appIdentity,
      });
    }

    const signatures = await wallet.signMessages({
      payloads: [message],
    });

    return signatures[0];
  });
}

/**
 * Deauthorize wallet session
 */
export async function disconnectWallet(authToken: string): Promise<void> {
  await transact(async (wallet: Web3MobileWallet) => {
    await wallet.deauthorize({
      auth_token: authToken,
    });
  });
}

/**
 * Get wallet balance
 */
export async function getWalletBalance(
  publicKey: PublicKey,
  connection: Connection
): Promise<number> {
  const balance = await connection.getBalance(publicKey);
  return balance / 1_000_000_000; // Convert lamports to SOL
}
