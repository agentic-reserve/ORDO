/**
 * Mobile Wallet Adapter Client
 * 
 * Enables Ordo agents to interact with mobile wallet apps on Android devices
 * using the Mobile Wallet Adapter (MWA) protocol.
 * 
 * MWA allows agents to:
 * - Request wallet authorization
 * - Sign transactions via mobile wallets
 * - Sign messages for authentication
 * - Deauthorize wallet sessions
 */

import {
  transact,
  Web3MobileWallet,
} from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import {
  Connection,
  Transaction,
  VersionedTransaction,
  PublicKey,
  TransactionSignature,
} from "@solana/web3.js";

export interface MWAAuthorizationResult {
  publicKey: PublicKey;
  accountLabel?: string;
  walletUriBase?: string;
  authToken?: string;
}

export interface MWASignTransactionResult {
  signedTransaction: Transaction | VersionedTransaction;
  signature: TransactionSignature;
}

export interface MWASignMessageResult {
  signedMessage: Uint8Array;
  signature: Uint8Array;
}

export interface MWAClientConfig {
  cluster: "mainnet-beta" | "devnet" | "testnet";
  appIdentity: {
    name: string;
    uri: string;
    icon: string;
  };
}

/**
 * Mobile Wallet Adapter Client
 * 
 * Provides a high-level interface for agents to interact with mobile wallets
 */
export class MobileWalletAdapterClient {
  private connection: Connection;
  private config: MWAClientConfig;

  constructor(connection: Connection, config: MWAClientConfig) {
    this.connection = connection;
    this.config = config;
  }

  /**
   * Authorize with a mobile wallet
   * 
   * Opens the wallet selector and requests authorization from the user.
   * Returns the authorized public key and optional auth token.
   */
  async authorize(): Promise<MWAAuthorizationResult> {
    return await transact(async (wallet: Web3MobileWallet) => {
      const authResult = await wallet.authorize({
        cluster: this.config.cluster,
        identity: this.config.appIdentity,
      });

      return {
        publicKey: authResult.accounts[0].publicKey,
        accountLabel: authResult.accounts[0].label,
        walletUriBase: authResult.wallet_uri_base,
        authToken: authResult.auth_token,
      };
    });
  }

  /**
   * Reauthorize with a mobile wallet using a stored auth token
   * 
   * Attempts to reauthorize without user interaction using a previously
   * obtained auth token.
   */
  async reauthorize(authToken: string): Promise<MWAAuthorizationResult> {
    return await transact(async (wallet: Web3MobileWallet) => {
      const authResult = await wallet.reauthorize({
        cluster: this.config.cluster,
        identity: this.config.appIdentity,
        auth_token: authToken,
      });

      return {
        publicKey: authResult.accounts[0].publicKey,
        accountLabel: authResult.accounts[0].label,
        walletUriBase: authResult.wallet_uri_base,
        authToken: authResult.auth_token,
      };
    });
  }

  /**
   * Sign a transaction with a mobile wallet
   * 
   * Sends a transaction to the mobile wallet for signing.
   * The wallet app will prompt the user to approve the transaction.
   */
  async signTransaction(
    transaction: Transaction | VersionedTransaction,
    authToken?: string
  ): Promise<MWASignTransactionResult> {
    return await transact(async (wallet: Web3MobileWallet) => {
      // Authorize if no auth token provided
      if (!authToken) {
        await wallet.authorize({
          cluster: this.config.cluster,
          identity: this.config.appIdentity,
        });
      } else {
        await wallet.reauthorize({
          cluster: this.config.cluster,
          identity: this.config.appIdentity,
          auth_token: authToken,
        });
      }

      // Sign the transaction
      const signedTransactions = await wallet.signTransactions({
        transactions: [transaction],
      });

      const signedTransaction = signedTransactions[0];

      // Extract signature
      let signature: TransactionSignature;
      if (signedTransaction instanceof VersionedTransaction) {
        signature = Buffer.from(signedTransaction.signatures[0]).toString("base64");
      } else {
        signature = signedTransaction.signatures[0].toString();
      }

      return {
        signedTransaction,
        signature,
      };
    });
  }

  /**
   * Sign multiple transactions with a mobile wallet
   * 
   * Batch signs multiple transactions in a single wallet interaction.
   */
  async signTransactions(
    transactions: (Transaction | VersionedTransaction)[],
    authToken?: string
  ): Promise<MWASignTransactionResult[]> {
    return await transact(async (wallet: Web3MobileWallet) => {
      // Authorize if no auth token provided
      if (!authToken) {
        await wallet.authorize({
          cluster: this.config.cluster,
          identity: this.config.appIdentity,
        });
      } else {
        await wallet.reauthorize({
          cluster: this.config.cluster,
          identity: this.config.appIdentity,
          auth_token: authToken,
        });
      }

      // Sign all transactions
      const signedTransactions = await wallet.signTransactions({
        transactions,
      });

      return signedTransactions.map((signedTransaction) => {
        let signature: TransactionSignature;
        if (signedTransaction instanceof VersionedTransaction) {
          signature = Buffer.from(signedTransaction.signatures[0]).toString("base64");
        } else {
          signature = signedTransaction.signatures[0].toString();
        }

        return {
          signedTransaction,
          signature,
        };
      });
    });
  }

  /**
   * Sign and send a transaction with a mobile wallet
   * 
   * Signs the transaction with the mobile wallet and immediately sends it
   * to the Solana network.
   */
  async signAndSendTransaction(
    transaction: Transaction | VersionedTransaction,
    authToken?: string
  ): Promise<TransactionSignature> {
    return await transact(async (wallet: Web3MobileWallet) => {
      // Authorize if no auth token provided
      if (!authToken) {
        await wallet.authorize({
          cluster: this.config.cluster,
          identity: this.config.appIdentity,
        });
      } else {
        await wallet.reauthorize({
          cluster: this.config.cluster,
          identity: this.config.appIdentity,
          auth_token: authToken,
        });
      }

      // Sign and send the transaction
      const signatures = await wallet.signAndSendTransactions({
        transactions: [transaction],
      });

      return signatures[0];
    });
  }

  /**
   * Sign a message with a mobile wallet
   * 
   * Signs an arbitrary message for authentication or verification purposes.
   */
  async signMessage(
    message: Uint8Array,
    authToken?: string
  ): Promise<MWASignMessageResult> {
    return await transact(async (wallet: Web3MobileWallet) => {
      // Authorize if no auth token provided
      if (!authToken) {
        await wallet.authorize({
          cluster: this.config.cluster,
          identity: this.config.appIdentity,
        });
      } else {
        await wallet.reauthorize({
          cluster: this.config.cluster,
          identity: this.config.appIdentity,
          auth_token: authToken,
        });
      }

      // Sign the message
      const signedMessages = await wallet.signMessages({
        payloads: [message],
      });

      return {
        signedMessage: message,
        signature: signedMessages[0],
      };
    });
  }

  /**
   * Deauthorize a wallet session
   * 
   * Revokes the authorization token and ends the wallet session.
   */
  async deauthorize(authToken: string): Promise<void> {
    await transact(async (wallet: Web3MobileWallet) => {
      await wallet.deauthorize({
        auth_token: authToken,
      });
    });
  }

  /**
   * Get the current connection
   */
  getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get the current cluster
   */
  getCluster(): string {
    return this.config.cluster;
  }
}

/**
 * Create a Mobile Wallet Adapter client
 */
export function createMWAClient(
  rpcUrl: string,
  config: MWAClientConfig
): MobileWalletAdapterClient {
  const connection = new Connection(rpcUrl, "confirmed");
  return new MobileWalletAdapterClient(connection, config);
}
