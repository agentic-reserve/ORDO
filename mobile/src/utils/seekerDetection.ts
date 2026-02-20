/**
 * Seeker Device Detection
 * 
 * Detects if the user is on a Solana Seeker device using two methods:
 * 1. Platform Constants Check (lightweight, spoofable)
 * 2. Seeker Genesis Token Verification (secure, on-chain)
 */

import { Platform } from 'react-native';
import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Seeker device information
 */
export interface SeekerDeviceInfo {
  isSeeker: boolean;
  method: 'platform' | 'genesis-token' | 'none';
  deviceModel?: string;
  manufacturer?: string;
  verified: boolean;
}

/**
 * Seeker Genesis Token (SGT) information
 */
export interface SeekerGenesisToken {
  mint: string;
  name: string;
  symbol: string;
}

// Seeker Genesis Token mint address (mainnet)
const SEEKER_GENESIS_TOKEN_MINT = 'SEEKERogxQcLLVKNApY5Y8SgaXuJPMXcP3W3JRPdp3K';

/**
 * Method 1: Platform Constants Check
 * 
 * Quick, lightweight check using React Native's Platform API.
 * This is suitable for UI treatments and non-critical features.
 * 
 * ⚠️ WARNING: This method is spoofable on rooted devices
 */
export function detectSeekerByPlatform(): SeekerDeviceInfo {
  // Check if running on Android
  if (Platform.OS !== 'android') {
    return {
      isSeeker: false,
      method: 'none',
      verified: false,
    };
  }

  // Get platform constants
  const constants = Platform.constants as any;

  // Check if device model is "Seeker"
  const isSeeker = constants.Model === 'Seeker';
  const manufacturer = constants.Manufacturer;
  const brand = constants.Brand;

  // Additional checks for Solana Mobile branding
  const isSolanaMobile = 
    manufacturer === 'Solana Mobile Inc.' ||
    brand === 'solanamobile';

  return {
    isSeeker: isSeeker && isSolanaMobile,
    method: 'platform',
    deviceModel: constants.Model,
    manufacturer: constants.Manufacturer,
    verified: false, // Platform check is not verified
  };
}

/**
 * Method 2: Seeker Genesis Token Verification
 * 
 * Secure, on-chain verification by checking if the wallet contains
 * a Seeker Genesis Token (SGT).
 * 
 * The SGT is a unique NFT minted once per Seeker device.
 * Owning an SGT represents verified ownership of a Seeker device.
 * 
 * @param walletAddress - The user's wallet public key
 * @param connection - Solana RPC connection
 * @returns Promise<boolean> - True if wallet owns SGT
 */
export async function verifySeekerGenesisToken(
  walletAddress: PublicKey,
  connection: Connection
): Promise<boolean> {
  try {
    // Get all token accounts owned by the wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
      }
    );

    // Check if any token account contains the Seeker Genesis Token
    for (const { account } of tokenAccounts.value) {
      const mintAddress = account.data.parsed.info.mint;
      const amount = account.data.parsed.info.tokenAmount.uiAmount;

      // Check if this is the SGT and balance > 0
      if (mintAddress === SEEKER_GENESIS_TOKEN_MINT && amount > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error verifying Seeker Genesis Token:', error);
    return false;
  }
}

/**
 * Comprehensive Seeker Detection
 * 
 * Combines platform check with optional on-chain verification
 * 
 * @param walletAddress - Optional wallet address for on-chain verification
 * @param connection - Optional Solana connection for on-chain verification
 * @returns Promise<SeekerDeviceInfo>
 */
export async function detectSeeker(
  walletAddress?: PublicKey,
  connection?: Connection
): Promise<SeekerDeviceInfo> {
  // First, do platform check
  const platformInfo = detectSeekerByPlatform();

  // If not on Seeker device according to platform, return early
  if (!platformInfo.isSeeker) {
    return platformInfo;
  }

  // If wallet and connection provided, verify with SGT
  if (walletAddress && connection) {
    try {
      const hasGenesisToken = await verifySeekerGenesisToken(
        walletAddress,
        connection
      );

      return {
        ...platformInfo,
        method: hasGenesisToken ? 'genesis-token' : 'platform',
        verified: hasGenesisToken,
      };
    } catch (error) {
      console.error('SGT verification failed:', error);
      return platformInfo;
    }
  }

  // Return platform-only detection
  return platformInfo;
}

/**
 * Get Seeker device details
 * 
 * Returns detailed information about the device
 */
export function getSeekerDeviceDetails(): {
  model: string;
  manufacturer: string;
  brand: string;
  release: string;
  fingerprint: string;
} | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  const constants = Platform.constants as any;

  return {
    model: constants.Model || 'Unknown',
    manufacturer: constants.Manufacturer || 'Unknown',
    brand: constants.Brand || 'Unknown',
    release: constants.Release || 'Unknown',
    fingerprint: constants.Fingerprint || 'Unknown',
  };
}

/**
 * Check if running on Seeker (quick check)
 * 
 * Use this for simple boolean checks in UI
 */
export function isSeeker(): boolean {
  return detectSeekerByPlatform().isSeeker;
}

/**
 * Hook for React components
 */
export function useSeekerDetection() {
  const [deviceInfo, setDeviceInfo] = React.useState<SeekerDeviceInfo>({
    isSeeker: false,
    method: 'none',
    verified: false,
  });

  React.useEffect(() => {
    const info = detectSeekerByPlatform();
    setDeviceInfo(info);
  }, []);

  const verifyWithWallet = async (
    walletAddress: PublicKey,
    connection: Connection
  ) => {
    const info = await detectSeeker(walletAddress, connection);
    setDeviceInfo(info);
  };

  return {
    deviceInfo,
    isSeeker: deviceInfo.isSeeker,
    isVerified: deviceInfo.verified,
    verifyWithWallet,
  };
}

// Re-export React for the hook
import * as React from 'react';
