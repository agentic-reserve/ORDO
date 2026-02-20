/**
 * Unified Wallet Adapter Client
 * 
 * Provides a single interface for wallet operations across all platforms:
 * - Mobile Wallet Adapter (Android)
 * - Standard Wallet Adapter (Web/Desktop)
 * - Direct Keypair (Server/Autonomous agents)
 */

import {
  Connection,
  Transaction,
  VersionedTransaction,
  PublicKey,
  Keypair,
  TransactionSignature,
} from "@solana/web3.js";
import type { Wallet, WalletAdapter } from "@solana/wallet-adapter-base";

// Platform detection
export type Platform = "android" | "web" | "desktop" | "server";

export interface UnifiedWalletConfig {
  platform: Platform;
  cluster: "mainnet-beta" | "devnet" | "testnet";
  appIdentity?: {
    name: string;
    uri: string;
    icon: string;
  };
}

export interface UnifiedWalletSession {
  publicKey: PublicKey;
  platform: Platform;
  connected: boolean;
  authToken?: string; // For MWA
  wallet?: WalletAdapter; // For web/desktop
  keypair?: Keypair; // For server/autonomous
}

/**
 * Unified Wallet Adapter Client
 * 
 * Abstracts wallet operations across all platforms
 */
export class UnifiedWalletClient {
  private connection: Connection;
  private config: UnifiedWalletConfig;
  private session?: UnifiedWalletSession;

  constructor(connection: Connection, config: UnifiedWalletConfig) {
    this.connection = connection;
    this.config = config;
  }

  /**
   * Detect current platform
   */
  static detectPlatform(): Platform {
    // Check if running in Node.js
    if (typeof window === "undefined") {
      return "server";
    }

    // Check for React Native
    if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
      // Check for Android
      if (typeof (global as any).Platform !== "undefined") {
        const Platform = (global as any).Platform;
        if (Platform.OS === "android") {
          return "android";
        }
      }
      return "android"; // Assume Android for React Native
    }

    // Check for Electron (desktop)
    if (
      typeof navigator !== "undefined" &&
      navigator.userAgent.toLowerCase().includes("electron")
    ) {
      return "desktop";
    }

    // Default to web
    return "web";
  }

  /**
   * Connect to wallet based on platform
   */
  async connect(options?: {
    wallet?: WalletAdapter; // For web/desktop
    keypair?: Keypair; // For server
  }): Promise<UnifiedWalletSession> {
    const platform = this.config.platform;

    switch (platform) {
      case "android":
        return await this.connectMobileWallet();

      case "web":
      case "desktop":
        if (!options?.wallet) {
          throw new Error("Wallet adapter required for web/desktop platform");
        }
        return await this.connectStandardWallet(options.wallet);

      case "server":
        if (!options?.keypair) {
          throw new Error("Keypair required for server platform");
        }
        return this.connectKeypair(options.keypair);

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Connect via Mobile Wallet Adapter (Android)
   */
  private async connectMobileWallet(): Promise<UnifiedWalletSession> {
    // Import MWA dynamically to avoid issues on non-Android platforms
    const { transact } = await import(
      "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
    );

    const result = await transact(async (wallet) => {
      const authResult = await wallet.authorize({
        cluster: this.config.cluster,
        identity: this.config.appIdentity || {
          name: "Ordo Agent",
          uri: "https://ordo.ai",
          icon: "https://ordo.ai/icon.png",
        },
      });

      return {
        publicKey: authResult.accounts[0].publicKey,
        authToken: authResult.auth_token,
      };
    });

    this.session = {
      publicKey: result.publicKey,
      platform: "android",
      connected: true,
      authToken: result.authToken,
    };

    return this.session;
  }

  /**
   * Connect via Standard Wallet Adapter (Web/Desktop)
   */
  private async connectStandardWallet(
    wallet: WalletAdapter
  ): Promise<UnifiedWalletSession> {
    if (!wallet.connected) {
      await wallet.connect();
    }

    if (!wallet.publicKey) {
      throw new Error("Wallet connection failed - no public key");
    }

    this.session = {
      publicKey: wallet.publicKey,
      platform: this.config.platform,
      connected: true,
      wallet,
    };

    return this.session;
  }

  /**
   * Connect via Keypair (Server/Autonomous)
   */
  private connectKeypair(keypair: Keypair): UnifiedWalletSession {
    this.session = {
      publicKey: keypair.publicKey,
      platform: "server",
      connected: true,
      keypair,
    };

    return this.session;
  }

  /**
   * Sign transaction (works across all platforms)
   */
  async signTransaction(
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> {
    if (!this.session || !this.session.connected) {
      throw new Error("No active wallet session");
    }

    const platform = this.session.platform;

    switch (platform) {
      case "android":
        return await this.signTransactionMobile(transaction);

      case "web":
      case "desktop":
        return await this.signTransactionStandard(transaction);

      case "server":
        return this.signTransactionKeypair(transaction);

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Sign transaction via MWA
   */
  private async signTransactionMobile(
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> {
    const { transact } = await import(
      "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
    );

    const signedTx = await transact(async (wallet) => {
      if (this.session?.authToken) {
        await wallet.reauthorize({
          cluster: this.config.cluster,
          identity: this.config.appIdentity!,
          auth_token: this.session.authToken,
        });
      }

      const signedTransactions = await wallet.signTransactions({
        transactions: [transaction],
      });

      return signedTransactions[0];
    });

    return signedTx;
  }

  /**
   * Sign transaction via standard wallet adapter
   */
  private async signTransactionStandard(
    transaction: Transaction | VersionedTransaction
  ): Promise<Transaction | VersionedTransaction> {
    if (!this.session?.wallet) {
      throw new Error("No wallet adapter available");
    }

    if (transaction instanceof VersionedTransaction) {
      return await this.session.wallet.signTransaction(transaction);
    } else {
      return await this.session.wallet.signTransaction(transaction);
    }
  }

  /**
   * Sign transaction via keypair
   */
  private signTransactionKeypair(
    transaction: Transaction | VersionedTransaction
  ): Transaction | VersionedTransaction {
    if (!this.session?.keypair) {
      throw new Error("No keypair available");
    }

    if (transaction instanceof VersionedTransaction) {
      transaction.sign([this.session.keypair]);
    } else {
      transaction.sign(this.session.keypair);
    }

    return transaction;
  }

  /**
   * Sign and send transaction
   */
  async signAndSendTransaction(
    transaction: Transaction | VersionedTransaction
  ): Promise<TransactionSignature> {
    const signedTx = await this.signTransaction(transaction);

    // Send transaction
    let signature: TransactionSignature;

    if (signedTx instanceof VersionedTransaction) {
      signature = await this.connection.sendTransaction(signedTx);
    } else {
      signature = await this.connection.sendTransaction(signedTx, []);
    }

    // Wait for confirmation
    await this.connection.confirmTransaction(signature, "confirmed");

    return signature;
  }

  /**
   * Sign message
   */
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.session || !this.session.connected) {
      throw new Error("No active wallet session");
    }

    const platform = this.session.platform;

    switch (platform) {
      case "android":
        return await this.signMessageMobile(message);

      case "web":
      case "desktop":
        return await this.signMessageStandard(message);

      case "server":
        return this.signMessageKeypair(message);

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Sign message via MWA
   */
  private async signMessageMobile(message: Uint8Array): Promise<Uint8Array> {
    const { transact } = await import(
      "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
    );

    const signature = await transact(async (wallet) => {
      if (this.session?.authToken) {
        await wallet.reauthorize({
          cluster: this.config.cluster,
          identity: this.config.appIdentity!,
          auth_token: this.session.authToken,
        });
      }

      const signatures = await wallet.signMessages({
        payloads: [message],
      });

      return signatures[0];
    });

    return signature;
  }

  /**
   * Sign message via standard wallet adapter
   */
  private async signMessageStandard(message: Uint8Array): Promise<Uint8Array> {
    if (!this.session?.wallet || !this.session.wallet.signMessage) {
      throw new Error("Wallet does not support message signing");
    }

    return await this.session.wallet.signMessage(message);
  }

  /**
   * Sign message via keypair
   */
  private signMessageKeypair(message: Uint8Array): Uint8Array {
    if (!this.session?.keypair) {
      throw new Error("No keypair available");
    }

    const { sign } = require("tweetnacl");
    return sign.detached(message, this.session.keypair.secretKey);
  }

  /**
   * Disconnect wallet
   */
  async disconnect(): Promise<void> {
    if (!this.session) {
      return;
    }

    const platform = this.session.platform;

    switch (platform) {
      case "android":
        await this.disconnectMobile();
        break;

      case "web":
      case "desktop":
        await this.disconnectStandard();
        break;

      case "server":
        // No disconnection needed for keypair
        break;
    }

    this.session = undefined;
  }

  /**
   * Disconnect MWA
   */
  private async disconnectMobile(): Promise<void> {
    if (!this.session?.authToken) {
      return;
    }

    const { transact } = await import(
      "@solana-mobile/mobile-wallet-adapter-protocol-web3js"
    );

    await transact(async (wallet) => {
      await wallet.deauthorize({
        auth_token: this.session!.authToken!,
      });
    });
  }

  /**
   * Disconnect standard wallet
   */
  private async disconnectStandard(): Promise<void> {
    if (this.session?.wallet) {
      await this.session.wallet.disconnect();
    }
  }

  /**
   * Get current session
   */
  getSession(): UnifiedWalletSession | undefined {
    return this.session;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.session?.connected || false;
  }

  /**
   * Get public key
   */
  getPublicKey(): PublicKey | undefined {
    return this.session?.publicKey;
  }

  /**
   * Get connection
   */
  getConnection(): Connection {
    return this.connection;
  }
}

/**
 * Create a unified wallet client with automatic platform detection
 */
export function createUnifiedWalletClient(
  rpcUrl: string,
  cluster: "mainnet-beta" | "devnet" | "testnet" = "devnet",
  appIdentity?: {
    name: string;
    uri: string;
    icon: string;
  }
): UnifiedWalletClient {
  const connection = new Connection(rpcUrl, "confirmed");
  const platform = UnifiedWalletClient.detectPlatform();

  return new UnifiedWalletClient(connection, {
    platform,
    cluster,
    appIdentity,
  });
}
