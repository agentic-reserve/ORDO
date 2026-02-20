# Jupiter Integration Guide

Jupiter is Solana's leading DEX aggregator, providing the best token swap rates by routing through multiple liquidity sources.

## Overview

Jupiter API v6 provides:
- **Best Price Routing** - Aggregates liquidity from all Solana DEXs
- **Token Swaps** - Swap any SPL token with optimal rates
- **Limit Orders** - Set price-based orders
- **DCA (Dollar Cost Averaging)** - Automated recurring buys
- **Price API** - Real-time token prices
- **Token List** - Comprehensive token metadata

## Configuration

### Environment Variables

```bash
# Jupiter API Configuration
JUPITER_API_URL=https://quote-api.jup.ag/v6
JUPITER_REFERRAL_ACCOUNT=your_referral_account  # Optional
JUPITER_FEE_BPS=50  # Optional: 0.5% fee (50 basis points)
```

### API Endpoints

- **Quote API**: `https://quote-api.jup.ag/v6`
- **Price API**: `https://price.jup.ag/v4`
- **Token List**: `https://token.jup.ag/all`

## Quick Start

### 1. Get a Quote

```typescript
import { getJupiterQuote } from './lib/jupiter';

const quote = await getJupiterQuote({
  inputMint: 'So11111111111111111111111111111111111111112', // SOL
  outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  amount: 1000000000, // 1 SOL (in lamports)
  slippageBps: 50, // 0.5% slippage
});

console.log(`Best route: ${quote.routePlan.length} hops`);
console.log(`Output: ${quote.outAmount} USDC`);
```

### 2. Execute a Swap

```typescript
import { executeJupiterSwap } from './lib/jupiter';

const signature = await executeJupiterSwap({
  wallet: agentWallet,
  quote: quote,
  priorityFee: 50000, // Optional priority fee
});

console.log(`Swap successful: ${signature}`);
```

### 3. Get Token Price

```typescript
import { getTokenPrice } from './lib/jupiter';

const price = await getTokenPrice('So11111111111111111111111111111111111111112');
console.log(`SOL price: $${price.price}`);
```

## API Reference

### Get Quote

```typescript
GET https://quote-api.jup.ag/v6/quote

Parameters:
- inputMint: string (required) - Input token mint address
- outputMint: string (required) - Output token mint address
- amount: number (required) - Input amount in token's smallest unit
- slippageBps: number (optional) - Slippage tolerance in basis points (default: 50)
- swapMode: 'ExactIn' | 'ExactOut' (optional) - Default: 'ExactIn'
- onlyDirectRoutes: boolean (optional) - Only direct routes
- asLegacyTransaction: boolean (optional) - Use legacy transaction format
- maxAccounts: number (optional) - Max accounts in transaction
```

### Get Swap Transaction

```typescript
POST https://quote-api.jup.ag/v6/swap

Body:
{
  quoteResponse: QuoteResponse,
  userPublicKey: string,
  wrapAndUnwrapSol: boolean (optional),
  feeAccount: string (optional),
  prioritizationFeeLamports: number (optional)
}
```

### Get Token Price

```typescript
GET https://price.jup.ag/v4/price

Parameters:
- ids: string - Comma-separated token mint addresses
- vsToken: string (optional) - Quote token (default: USDC)
```

### Get Token List

```typescript
GET https://token.jup.ag/all

Returns: Array of token metadata
```

## Advanced Features

### Limit Orders

```typescript
import { createLimitOrder } from './lib/jupiter';

const order = await createLimitOrder({
  wallet: agentWallet,
  inputMint: 'SOL',
  outputMint: 'USDC',
  inAmount: 1000000000, // 1 SOL
  outAmount: 100000000, // 100 USDC
  expiry: Date.now() + 86400000, // 24 hours
});
```

### DCA (Dollar Cost Averaging)

```typescript
import { createDCA } from './lib/jupiter';

const dca = await createDCA({
  wallet: agentWallet,
  inputMint: 'USDC',
  outputMint: 'SOL',
  inAmount: 100000000, // 100 USDC per cycle
  cycleFrequency: 3600, // Every hour
  numCycles: 24, // 24 cycles
});
```

### Route Optimization

```typescript
const quote = await getJupiterQuote({
  inputMint: 'SOL',
  outputMint: 'USDC',
  amount: 1000000000,
  slippageBps: 50,
  onlyDirectRoutes: false, // Allow multi-hop routes
  maxAccounts: 64, // Limit transaction size
});

// Analyze route
console.log(`Route: ${quote.routePlan.map(r => r.swapInfo.label).join(' -> ')}`);
console.log(`Price impact: ${quote.priceImpactPct}%`);
console.log(`Fee: ${quote.platformFee?.amount || 0} lamports`);
```

## Integration with Solana Agent Kit

Jupiter is already integrated in Solana Agent Kit:

```typescript
import { SolanaAgentKit } from 'solana-agent-kit';

const agent = new SolanaAgentKit(
  privateKey,
  rpcUrl,
  openAiKey
);

// Swap tokens
const result = await agent.trade({
  outputMint: 'USDC',
  inputAmount: 1, // 1 SOL
  inputMint: 'SOL',
  slippageBps: 50,
});
```

## Best Practices

### 1. Slippage Management

```typescript
// Conservative (0.1%)
slippageBps: 10

// Normal (0.5%)
slippageBps: 50

// Aggressive (1%)
slippageBps: 100

// High volatility (2%)
slippageBps: 200
```

### 2. Priority Fees

```typescript
// Low priority (cheap, slower)
priorityFee: 10000 // 0.00001 SOL

// Normal priority
priorityFee: 50000 // 0.00005 SOL

// High priority (expensive, faster)
priorityFee: 100000 // 0.0001 SOL
```

### 3. Error Handling

```typescript
try {
  const quote = await getJupiterQuote(params);
  const signature = await executeJupiterSwap({ wallet, quote });
  
  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');
  
} catch (error) {
  if (error.message.includes('slippage')) {
    // Increase slippage and retry
  } else if (error.message.includes('insufficient')) {
    // Insufficient balance
  } else {
    // Other error
  }
}
```

### 4. Rate Limiting

Jupiter API has rate limits:
- **Quote API**: 600 requests/minute
- **Price API**: 600 requests/minute
- **Token List**: No limit (cached)

Implement caching and batching:

```typescript
// Cache token prices
const priceCache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getCachedPrice(mint: string) {
  const cached = priceCache.get(mint);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.price;
  }
  
  const price = await getTokenPrice(mint);
  priceCache.set(mint, { price, timestamp: Date.now() });
  return price;
}
```

## Common Token Mints

```typescript
const TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
};
```

## Monitoring & Analytics

### Track Swap Performance

```typescript
const swapMetrics = {
  timestamp: Date.now(),
  inputToken: 'SOL',
  outputToken: 'USDC',
  inputAmount: 1000000000,
  outputAmount: quote.outAmount,
  route: quote.routePlan.map(r => r.swapInfo.label),
  priceImpact: quote.priceImpactPct,
  fee: quote.platformFee?.amount || 0,
  signature: signature,
};

// Store in database
await supabase.from('swap_history').insert(swapMetrics);
```

### Monitor Referral Earnings

If you set a referral account, track earnings:

```typescript
const referralAccount = new PublicKey(process.env.JUPITER_REFERRAL_ACCOUNT);
const balance = await connection.getBalance(referralAccount);
console.log(`Referral earnings: ${balance / 1e9} SOL`);
```

## Troubleshooting

### "No routes found"

- Check token mints are correct
- Verify tokens have liquidity
- Try increasing slippage
- Use `onlyDirectRoutes: false`

### "Slippage tolerance exceeded"

- Increase `slippageBps`
- Split large trades into smaller ones
- Check market volatility

### "Transaction too large"

- Set `maxAccounts: 32` or lower
- Use `onlyDirectRoutes: true`
- Reduce route complexity

### "Insufficient balance"

- Check wallet balance
- Account for transaction fees
- Verify token account exists

## Resources

- [Jupiter API Docs](https://station.jup.ag/docs/apis/swap-api)
- [Jupiter SDK](https://github.com/jup-ag/jupiter-quote-api-node)
- [Token List](https://token.jup.ag/all)
- [Jupiter Terminal](https://jup.ag)
- [Discord Support](https://discord.gg/jup)

## Example: Agent Trading Strategy

```typescript
import { SolanaAgentKit } from 'solana-agent-kit';
import { getTokenPrice } from './lib/jupiter';

async function tradingStrategy(agent: SolanaAgentKit) {
  // Get current SOL price
  const solPrice = await getTokenPrice('SOL');
  
  // Simple strategy: Buy SOL if price < $100, sell if > $150
  if (solPrice.price < 100) {
    await agent.trade({
      inputMint: 'USDC',
      outputMint: 'SOL',
      inputAmount: 100, // 100 USDC
      slippageBps: 50,
    });
  } else if (solPrice.price > 150) {
    await agent.trade({
      inputMint: 'SOL',
      outputMint: 'USDC',
      inputAmount: 1, // 1 SOL
      slippageBps: 50,
    });
  }
}
```
