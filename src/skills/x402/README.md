# x402 Payment Protocol Integration

## Overview

The x402 integration enables Ordo agents to discover and call paid API endpoints using the x402 payment protocol. Agents can automatically pay for services in USDC on Solana, track costs, and even provide their own paid services.

## Features

- **Service Discovery**: Search the x402 bazaar for paid APIs
- **Automatic Payments**: Pay for API calls automatically in USDC
- **Cost Tracking**: Track all x402 payments as agent costs
- **Balance Management**: Check USDC balance before making payments
- **Payment History**: View transaction history for auditing
- **Multi-Network Support**: Solana mainnet and devnet support
- **Service Registration**: Enable agents to provide paid services

## Quick Start

### 1. Search for Paid Services

```typescript
import { searchPaidServices } from "./skills/x402/agent-integration.js";

const services = await searchPaidServices(agent, "weather", 5);

console.log("Available weather services:");
services.forEach(service => {
  console.log(`  ${service.name}: ${service.priceUSD} - ${service.description}`);
});
```

### 2. Call a Paid API

```typescript
import { callPaidAPI } from "./skills/x402/agent-integration.js";

const result = await callPaidAPI(
  agent,
  "https://api.example.com/weather",
  {
    method: "GET",
    query: { city: "San Francisco" },
    maxAmountUSD: 0.10, // Max $0.10
  }
);

console.log("Weather data:", result);
```

### 3. Check Balance Before Payment

```typescript
import { checkPaymentBalance } from "./skills/x402/agent-integration.js";

const hasSufficient = await checkPaymentBalance(agent, 0.05);

if (hasSufficient) {
  const result = await callPaidAPI(agent, url);
} else {
  console.log("Insufficient USDC balance");
}
```

### 4. Estimate Costs

```typescript
import { estimateCost } from "./skills/x402/agent-integration.js";

const urls = [
  "https://api.example.com/weather",
  "https://api.example.com/sentiment",
];

const estimate = await estimateCost(agent, urls);

console.log(`Total cost: $${estimate.total.toFixed(4)}`);
estimate.breakdown.forEach(item => {
  console.log(`  ${item.url}: ${item.costUSD}`);
});
```

## API Reference

### X402Client

Low-level client for x402 protocol operations.

```typescript
import { X402Client } from "./skills/x402/client.js";
import { Connection, Keypair } from "@solana/web3.js";

const connection = new Connection(process.env.SOLANA_RPC_URL);
const keypair = Keypair.fromSecretKey(/* ... */);
const client = new X402Client(connection, keypair);
```

#### Methods

- `searchBazaar(query: string, topK?: number)`: Search for paid services
- `listBazaarResources(network?: string)`: List all available resources
- `discoverPaymentRequirements(url: string)`: Get payment info for endpoint
- `pay(url: string, options: X402PaymentOptions)`: Make a paid request
- `getPaymentHistory(limit?: number)`: Get transaction history
- `getUSDCBalance()`: Check USDC balance

### Agent Integration Functions

High-level functions for agent use.

#### searchPaidServices()

Search the x402 bazaar for paid services.

```typescript
const services = await searchPaidServices(
  agent,
  "weather forecast",
  10 // top 10 results
);
```

#### callPaidAPI()

Call a paid API endpoint with automatic payment.

```typescript
const result = await callPaidAPI(agent, url, {
  method: "POST",
  data: { text: "Hello world" },
  query: { format: "json" },
  maxAmountUSD: 0.50,
});
```

#### checkPaymentBalance()

Check if agent has sufficient USDC balance.

```typescript
const canPay = await checkPaymentBalance(agent, 0.10);
```

#### getAgentPaymentHistory()

Get agent's payment transaction history.

```typescript
const history = await getAgentPaymentHistory(agent, 20);
```

#### discoverServicesByCategory()

Discover services by predefined categories.

```typescript
const weatherServices = await discoverServicesByCategory(agent, "weather");
const aiServices = await discoverServicesByCategory(agent, "ai");
```

#### estimateCost()

Estimate total cost for multiple API calls.

```typescript
const estimate = await estimateCost(agent, [url1, url2, url3]);
console.log(`Total: $${estimate.total}`);
```

#### registerAgentService()

Register agent's own service in x402 bazaar.

```typescript
await registerAgentService(agent, {
  name: "Sentiment Analysis",
  description: "AI-powered sentiment analysis",
  endpoint: "https://myagent.com/api/sentiment",
  priceUSD: 0.05,
  method: "POST",
});
```

## Utility Functions

### atomicToUSD()

Convert USDC atomic units to dollars.

```typescript
import { atomicToUSD } from "./skills/x402/client.js";

const usd = atomicToUSD(1_000_000); // 1.0
```

### usdToAtomic()

Convert dollars to USDC atomic units.

```typescript
import { usdToAtomic } from "./skills/x402/client.js";

const atomic = usdToAtomic(0.50); // 500_000
```

## USDC Atomic Units

x402 uses USDC atomic units (6 decimals):

| Atomic Units | USD   |
|--------------|-------|
| 1,000,000    | $1.00 |
| 100,000      | $0.10 |
| 50,000       | $0.05 |
| 10,000       | $0.01 |
| 1,000        | $0.001|

## Supported Networks

- **Solana Mainnet**: Production payments
- **Solana Devnet**: Testing and development
- **Base Mainnet**: EVM-based payments (coming soon)
- **Base Sepolia**: EVM testing (coming soon)

## Cost Tracking

All x402 payments are automatically tracked as agent costs:

```typescript
// Automatically tracked when calling paid APIs
await callPaidAPI(agent, url);

// Cost is recorded in agent's cost history
const costs = await getAgentCosts(agent);
```

## Error Handling

```typescript
try {
  const result = await callPaidAPI(agent, url, {
    maxAmountUSD: 0.10,
  });
} catch (error) {
  if (error.message.includes("exceeds max")) {
    console.error("Payment too expensive");
  } else if (error.message.includes("Insufficient")) {
    console.error("Not enough USDC balance");
  } else if (error.message.includes("No x402")) {
    console.error("Endpoint doesn't support x402");
  } else {
    console.error("Payment failed:", error);
  }
}
```

## Best Practices

1. **Always set maxAmountUSD** to prevent unexpected high costs
2. **Check balance** before making payments
3. **Estimate costs** for multiple calls upfront
4. **Track payment history** for auditing
5. **Use devnet** for testing before mainnet
6. **Handle errors gracefully** with proper error messages
7. **Monitor agent costs** to prevent starvation

## Testing

Run the x402 integration tests:

```bash
npm test -- x402-integration.test.ts
```

## Examples

### Example 1: Weather Data Agent

```typescript
async function getWeatherData(agent: Agent, city: string) {
  // Search for weather services
  const services = await searchPaidServices(agent, "weather", 5);
  
  if (services.length === 0) {
    throw new Error("No weather services found");
  }

  // Use the cheapest service
  const cheapest = services.sort((a, b) => a.price - b.price)[0];
  
  // Check balance
  const canPay = await checkPaymentBalance(agent, cheapest.price);
  
  if (!canPay) {
    throw new Error("Insufficient balance");
  }

  // Make the paid request
  const weather = await callPaidAPI(agent, cheapest.url, {
    query: { city },
    maxAmountUSD: cheapest.price * 1.1, // 10% buffer
  });

  return weather;
}
```

### Example 2: Multi-Service Agent

```typescript
async function analyzeMarket(agent: Agent, symbol: string) {
  // Discover multiple services
  const priceService = await searchPaidServices(agent, "crypto price", 1);
  const sentimentService = await searchPaidServices(agent, "sentiment", 1);
  
  // Estimate total cost
  const urls = [priceService[0].url, sentimentService[0].url];
  const estimate = await estimateCost(agent, urls);
  
  console.log(`Total cost: $${estimate.total.toFixed(4)}`);
  
  // Check balance
  if (!await checkPaymentBalance(agent, estimate.total)) {
    throw new Error("Insufficient balance for analysis");
  }

  // Make parallel requests
  const [price, sentiment] = await Promise.all([
    callPaidAPI(agent, priceService[0].url, {
      query: { symbol },
    }),
    callPaidAPI(agent, sentimentService[0].url, {
      data: { query: symbol },
      method: "POST",
    }),
  ]);

  return { price, sentiment };
}
```

### Example 3: Service Provider Agent

```typescript
async function setupAgentService(agent: Agent) {
  // Register agent's service
  await registerAgentService(agent, {
    name: "AI Code Review",
    description: "Automated code review with AI",
    endpoint: `https://agent-${agent.id}.ordo.ai/api/review`,
    priceUSD: 0.25,
    method: "POST",
  });

  console.log("Agent service registered in x402 bazaar");
  
  // Agent can now earn from providing this service
}
```

## Troubleshooting

### "No x402 payment requirements found"

The endpoint doesn't support x402. Verify the URL is correct and the service is registered in the bazaar.

### "Insufficient balance"

Agent needs more USDC. Fund the agent's wallet or reduce spending.

### "Payment amount exceeds max"

The service costs more than your `maxAmountUSD`. Increase the limit or find a cheaper service.

### "Network error"

Check internet connection and Solana RPC endpoint availability.

## Resources

- [x402 Documentation](https://docs.x402.org)
- [x402 GitHub](https://github.com/coinbase/x402)
- [PayAI Facilitator](https://facilitator.payai.network)
- [x402 Echo Server](https://x402.payai.network)
- [Ordo Platform Docs](https://docs.ordo.ai)

## Support

For issues or questions:
- GitHub Issues: https://github.com/ordo-platform/ordo/issues
- Discord: https://discord.gg/ordo
- Email: support@ordo.ai
