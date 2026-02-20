/**
 * Jupiter Integration Examples
 * 
 * Demonstrates how to use Jupiter for token swaps
 */

import { Connection, Keypair } from '@solana/web3.js';
import {
  getJupiterQuote,
  executeJupiterSwap,
  getTokenPrice,
  getTokenPrices,
  COMMON_TOKENS,
  formatTokenAmount,
  parseTokenAmount,
} from './jupiter';

// Initialize connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
);

/**
 * Example 1: Get a quote for swapping SOL to USDC
 */
export async function exampleGetQuote() {
  console.log('Example 1: Getting quote for 1 SOL -> USDC');

  const quote = await getJupiterQuote({
    inputMint: COMMON_TOKENS.SOL,
    outputMint: COMMON_TOKENS.USDC,
    amount: parseTokenAmount(1, 9), // 1 SOL (9 decimals)
    slippageBps: 50, // 0.5% slippage
  });

  console.log('Quote received:');
  console.log(`  Input: ${formatTokenAmount(quote.inAmount, 9)} SOL`);
  console.log(`  Output: ${formatTokenAmount(quote.outAmount, 6)} USDC`);
  console.log(`  Price Impact: ${quote.priceImpactPct}%`);
  console.log(`  Route: ${quote.routePlan.map(r => r.swapInfo.label).join(' -> ')}`);

  return quote;
}

/**
 * Example 2: Execute a swap
 */
export async function exampleExecuteSwap(wallet: Keypair) {
  console.log('Example 2: Executing swap');

  // Get quote
  const quote = await getJupiterQuote({
    inputMint: COMMON_TOKENS.SOL,
    outputMint: COMMON_TOKENS.USDC,
    amount: parseTokenAmount(0.1, 9), // 0.1 SOL
    slippageBps: 50,
  });

  // Execute swap
  const signature = await executeJupiterSwap(
    connection,
    wallet,
    quote,
    50000 // Priority fee
  });

  console.log(`Swap successful!`);
  console.log(`  Signature: ${signature}`);
  console.log(`  Explorer: https://solscan.io/tx/${signature}`);

  return signature;
}

/**
 * Example 3: Get token prices
 */
export async function exampleGetPrices() {
  console.log('Example 3: Getting token prices');

  // Get single token price
  const solPrice = await getTokenPrice(COMMON_TOKENS.SOL);
  console.log(`SOL Price: $${solPrice.price}`);

  // Get multiple token prices
  const prices = await getTokenPrices([
    COMMON_TOKENS.SOL,
    COMMON_TOKENS.USDC,
    COMMON_TOKENS.BONK,
    COMMON_TOKENS.JUP,
  ]);

  console.log('\nToken Prices:');
  Object.entries(prices).forEach(([mint, data]) => {
    console.log(`  ${data.mintSymbol}: $${data.price}`);
  });

  return prices;
}

/**
 * Example 4: Compare routes
 */
export async function exampleCompareRoutes() {
  console.log('Example 4: Comparing direct vs multi-hop routes');

  // Direct routes only
  const directQuote = await getJupiterQuote({
    inputMint: COMMON_TOKENS.SOL,
    outputMint: COMMON_TOKENS.BONK,
    amount: parseTokenAmount(1, 9),
    onlyDirectRoutes: true,
  });

  // Allow multi-hop routes
  const multiHopQuote = await getJupiterQuote({
    inputMint: COMMON_TOKENS.SOL,
    outputMint: COMMON_TOKENS.BONK,
    amount: parseTokenAmount(1, 9),
    onlyDirectRoutes: false,
  });

  console.log('Direct Route:');
  console.log(`  Output: ${formatTokenAmount(directQuote.outAmount, 5)} BONK`);
  console.log(`  Hops: ${directQuote.routePlan.length}`);

  console.log('\nMulti-Hop Route:');
  console.log(`  Output: ${formatTokenAmount(multiHopQuote.outAmount, 5)} BONK`);
  console.log(`  Hops: ${multiHopQuote.routePlan.length}`);
  console.log(`  Route: ${multiHopQuote.routePlan.map(r => r.swapInfo.label).join(' -> ')}`);

  const improvement = (
    (Number(multiHopQuote.outAmount) - Number(directQuote.outAmount)) /
    Number(directQuote.outAmount) *
    100
  ).toFixed(2);

  console.log(`\nImprovement: ${improvement}%`);
}

/**
 * Example 5: Handle slippage
 */
export async function exampleSlippageHandling() {
  console.log('Example 5: Testing different slippage tolerances');

  const slippages = [10, 50, 100, 200]; // 0.1%, 0.5%, 1%, 2%

  for (const slippage of slippages) {
    try {
      const quote = await getJupiterQuote({
        inputMint: COMMON_TOKENS.SOL,
        outputMint: COMMON_TOKENS.USDC,
        amount: parseTokenAmount(10, 9), // 10 SOL (large trade)
        slippageBps: slippage,
      });

      console.log(`\nSlippage ${slippage / 100}%:`);
      console.log(`  Output: ${formatTokenAmount(quote.outAmount, 6)} USDC`);
      console.log(`  Price Impact: ${quote.priceImpactPct}%`);
    } catch (error) {
      console.log(`\nSlippage ${slippage / 100}%: Failed - ${error.message}`);
    }
  }
}

/**
 * Example 6: Agent trading strategy
 */
export async function exampleTradingStrategy(wallet: Keypair) {
  console.log('Example 6: Simple trading strategy');

  // Get current SOL price
  const solPrice = await getTokenPrice(COMMON_TOKENS.SOL);
  console.log(`Current SOL price: $${solPrice.price}`);

  // Simple strategy: Buy SOL if price < $100, sell if > $150
  if (solPrice.price < 100) {
    console.log('Price is low, buying SOL...');

    const quote = await getJupiterQuote({
      inputMint: COMMON_TOKENS.USDC,
      outputMint: COMMON_TOKENS.SOL,
      amount: parseTokenAmount(100, 6), // 100 USDC
      slippageBps: 50,
    });

    console.log(`Will receive: ${formatTokenAmount(quote.outAmount, 9)} SOL`);

    // Uncomment to execute:
    // const signature = await executeJupiterSwap(connection, wallet, quote);
    // console.log(`Buy executed: ${signature}`);

  } else if (solPrice.price > 150) {
    console.log('Price is high, selling SOL...');

    const quote = await getJupiterQuote({
      inputMint: COMMON_TOKENS.SOL,
      outputMint: COMMON_TOKENS.USDC,
      amount: parseTokenAmount(1, 9), // 1 SOL
      slippageBps: 50,
    });

    console.log(`Will receive: ${formatTokenAmount(quote.outAmount, 6)} USDC`);

    // Uncomment to execute:
    // const signature = await executeJupiterSwap(connection, wallet, quote);
    // console.log(`Sell executed: ${signature}`);

  } else {
    console.log('Price is in range, holding...');
  }
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  try {
    await exampleGetQuote();
    console.log('\n' + '='.repeat(60) + '\n');

    await exampleGetPrices();
    console.log('\n' + '='.repeat(60) + '\n');

    await exampleCompareRoutes();
    console.log('\n' + '='.repeat(60) + '\n');

    await exampleSlippageHandling();
    console.log('\n' + '='.repeat(60) + '\n');

    // Note: These require a wallet with funds
    // await exampleExecuteSwap(wallet);
    // await exampleTradingStrategy(wallet);

  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
