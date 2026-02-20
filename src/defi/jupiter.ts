/**
 * Jupiter DEX Aggregator Integration
 * 
 * Provides token swap functionality using Jupiter's API v6
 */

import { Connection, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import axios from 'axios';

const JUPITER_API_URL = process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6';
const JUPITER_PRICE_API = 'https://price.jup.ag/v4';
const JUPITER_TOKEN_LIST = 'https://token.jup.ag/all';

export interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  swapMode?: 'ExactIn' | 'ExactOut';
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
  maxAccounts?: number;
}

export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: {
    amount: string;
    feeBps: number;
  };
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot?: number;
  timeTaken?: number;
}

export interface JupiterSwapParams {
  quoteResponse: JupiterQuote;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
  feeAccount?: string;
  prioritizationFeeLamports?: number;
}

export interface TokenPrice {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
}

/**
 * Get a quote for swapping tokens
 */
export async function getJupiterQuote(params: JupiterQuoteParams): Promise<JupiterQuote> {
  const {
    inputMint,
    outputMint,
    amount,
    slippageBps = 50,
    swapMode = 'ExactIn',
    onlyDirectRoutes = false,
    asLegacyTransaction = false,
    maxAccounts,
  } = params;

  const queryParams = new URLSearchParams({
    inputMint,
    outputMint,
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
    swapMode,
    onlyDirectRoutes: onlyDirectRoutes.toString(),
    asLegacyTransaction: asLegacyTransaction.toString(),
  });

  if (maxAccounts) {
    queryParams.append('maxAccounts', maxAccounts.toString());
  }

  const response = await axios.get(`${JUPITER_API_URL}/quote?${queryParams}`);
  return response.data;
}

/**
 * Get swap transaction from quote
 */
export async function getJupiterSwapTransaction(
  params: JupiterSwapParams
): Promise<{ swapTransaction: string }> {
  const response = await axios.post(`${JUPITER_API_URL}/swap`, params);
  return response.data;
}

/**
 * Execute a token swap
 */
export async function executeJupiterSwap(
  connection: Connection,
  wallet: any,
  quote: JupiterQuote,
  priorityFee?: number
): Promise<string> {
  // Get swap transaction
  const { swapTransaction } = await getJupiterSwapTransaction({
    quoteResponse: quote,
    userPublicKey: wallet.publicKey.toString(),
    wrapAndUnwrapSol: true,
    prioritizationFeeLamports: priorityFee,
  });

  // Deserialize transaction
  const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
  const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

  // Sign transaction
  transaction.sign([wallet]);

  // Send transaction
  const signature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    maxRetries: 3,
  });

  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');

  return signature;
}

/**
 * Get token price in USD
 */
export async function getTokenPrice(mintAddress: string): Promise<TokenPrice> {
  const response = await axios.get(`${JUPITER_PRICE_API}/price`, {
    params: {
      ids: mintAddress,
      vsToken: 'USDC',
    },
  });

  const priceData = response.data.data[mintAddress];
  if (!priceData) {
    throw new Error(`Price not found for token: ${mintAddress}`);
  }

  return priceData;
}

/**
 * Get prices for multiple tokens
 */
export async function getTokenPrices(mintAddresses: string[]): Promise<Record<string, TokenPrice>> {
  const response = await axios.get(`${JUPITER_PRICE_API}/price`, {
    params: {
      ids: mintAddresses.join(','),
      vsToken: 'USDC',
    },
  });

  return response.data.data;
}

/**
 * Get all available tokens
 */
export async function getTokenList(): Promise<any[]> {
  const response = await axios.get(JUPITER_TOKEN_LIST);
  return response.data;
}

/**
 * Common token mint addresses
 */
export const COMMON_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  MNGO: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac',
  SRM: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
  STEP: 'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT',
} as const;

/**
 * Helper to format token amount
 */
export function formatTokenAmount(amount: string | number, decimals: number): number {
  return Number(amount) / Math.pow(10, decimals);
}

/**
 * Helper to parse token amount
 */
export function parseTokenAmount(amount: number, decimals: number): number {
  return Math.floor(amount * Math.pow(10, decimals));
}
