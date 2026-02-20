# Trading Model Specification

## Overview

The trading model (`deepseek/deepseek-chat-v3.1`) is designed for **quantitative trading** with advanced mathematical analysis, on-chain data integration, and pattern recognition inspired by Renaissance Technologies' Medallion Fund approach.

## Core Philosophy

> "We cannot predict the market, but everything has patterns." - Jim Simons approach

The trading model operates on the principle that while markets are unpredictable, they exhibit statistical patterns that can be exploited through rigorous quantitative analysis.

## Key Capabilities

### 1. On-Chain Activity Execution

The trading model executes all on-chain activities:

```typescript
const tradingClient = new OpenRouterClient({
  apiKey: process.env.OPENROUTER_API_KEY,
  agentId: "trading-agent",
});

// Execute on-chain trade with quantitative analysis
const tradeDecision = await tradingClient.chat(
  [
    {
      role: "system",
      content: `You are a quantitative trading system. Analyze on-chain data and execute trades.
      
Capital: Limited - manage risk carefully
Approach: Pattern recognition, statistical arbitrage
Models: Brownian motion, Hidden Markov Models, regime shift detection
Data: Helius on-chain history, volume, security metrics`,
    },
    {
      role: "user",
      content: `Analyze SOL/USDC pair:
- Current price: $150
- 24h volume: $2.5B
- On-chain metrics from Helius: [data]
- Historical patterns: [data]

Should we execute a trade? Calculate probability and risk.`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

### 2. Quantitative Models

The trading model applies multiple mathematical frameworks:

#### Brownian Motion (Geometric Brownian Motion)
```
dS = μS dt + σS dW

Where:
- S = asset price
- μ = drift (expected return)
- σ = volatility
- dW = Wiener process (random walk)
```

Used for:
- Price movement modeling
- Option pricing
- Risk assessment

#### Hidden Markov Models (HMM)
```
States: {Bull Market, Bear Market, Sideways}
Observations: {Price, Volume, On-chain metrics}

P(State_t | Observations) = ?
```

Used for:
- Market regime detection
- State transition probabilities
- Predictive state estimation

#### Regime Shift Detection
```
Detect transitions between:
- High volatility → Low volatility
- Trending → Mean-reverting
- Risk-on → Risk-off
```

Used for:
- Strategy adaptation
- Risk management
- Position sizing

### 3. Pattern Recognition (Jim Simons Approach)

The Medallion Fund approach focuses on:

1. **Statistical Arbitrage**: Exploit short-term price inefficiencies
2. **Mean Reversion**: Identify overbought/oversold conditions
3. **Momentum**: Capture trending patterns
4. **Market Microstructure**: Analyze order flow and liquidity

```typescript
const patternAnalysis = await tradingClient.chat(
  [
    {
      role: "user",
      content: `Pattern Recognition Analysis:

Historical Data (30 days):
- Price movements: [time series]
- Volume patterns: [time series]
- On-chain activity: [time series]

Identify:
1. Mean reversion opportunities
2. Momentum signals
3. Statistical arbitrage setups
4. Regime shifts

Calculate probability of success for each pattern.`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

### 4. Helius Integration for On-Chain Data

The trading model integrates with Helius endpoints for comprehensive on-chain analysis:

```typescript
import { Helius } from "helius-sdk";

const helius = new Helius(process.env.HELIUS_API_KEY);

// Get on-chain history
const history = await helius.rpc.getSignaturesForAddress({
  address: "SOL_ADDRESS",
});

// Get transaction details
const txDetails = await helius.rpc.getParsedTransactions({
  transactions: history.map((h) => h.signature),
});

// Analyze with trading model
const analysis = await tradingClient.chat(
  [
    {
      role: "user",
      content: `On-Chain Analysis:

Transaction History: ${JSON.stringify(txDetails)}

Analyze:
1. Volume trends
2. Whale activity
3. Smart money flows
4. Security indicators (rug pull risk, liquidity depth)
5. Network congestion

Provide risk score (0-100) and trading recommendation.`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

### 5. Risk Management with Limited Capital

The trading model is **capital-aware** and implements strict risk management:

```typescript
const riskAnalysis = await tradingClient.chat(
  [
    {
      role: "system",
      content: `Capital Management Rules:
- Total capital: $10,000 (LIMITED)
- Max position size: 10% of capital
- Max loss per trade: 2% of capital
- Stop loss: Always required
- Position sizing: Kelly Criterion or fixed fractional

You MUST be risk-aware. Capital preservation is priority #1.`,
    },
    {
      role: "user",
      content: `Trade Opportunity:
- Asset: SOL/USDC
- Entry: $150
- Target: $165 (+10%)
- Stop loss: $145 (-3.3%)
- Probability of success: 65% (from HMM analysis)

Calculate:
1. Optimal position size (Kelly Criterion)
2. Risk/reward ratio
3. Expected value
4. Should we execute?`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

## Mathematical Models in Detail

### 1. Brownian Motion for Price Modeling

```typescript
const brownianAnalysis = await tradingClient.chat(
  [
    {
      role: "user",
      content: `Geometric Brownian Motion Analysis:

Current price: $150
Historical volatility (σ): 0.45 (45% annualized)
Expected return (μ): 0.15 (15% annualized)
Time horizon: 7 days

Calculate:
1. Expected price range (95% confidence interval)
2. Probability of reaching $165
3. Probability of hitting stop loss at $145
4. Optimal entry/exit timing`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

### 2. Hidden Markov Model for Regime Detection

```typescript
const hmmAnalysis = await tradingClient.chat(
  [
    {
      role: "user",
      content: `Hidden Markov Model - Market Regime Detection:

States:
1. Bull Market (high momentum, low volatility)
2. Bear Market (negative momentum, high volatility)
3. Sideways (mean-reverting, medium volatility)

Observations (last 30 days):
- Daily returns: [array]
- Volatility: [array]
- Volume: [array]
- On-chain activity: [array]

Calculate:
1. Current state probability distribution
2. Transition probabilities
3. Expected state in 7 days
4. Trading strategy for current regime`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

### 3. Regime Shift Detection

```typescript
const regimeShift = await tradingClient.chat(
  [
    {
      role: "user",
      content: `Regime Shift Detection:

Indicators:
- Volatility regime: [historical data]
- Correlation regime: [historical data]
- Liquidity regime: [historical data]

Detect:
1. Are we in a regime shift?
2. What is the new regime?
3. How should strategy adapt?
4. Risk adjustment needed?`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

## Complete Trading Workflow

### Step 1: Data Collection

```typescript
// Collect on-chain data from Helius
const onChainData = await helius.rpc.getAssetsByOwner({
  ownerAddress: "WALLET_ADDRESS",
});

// Get price data
const priceData = await fetchPriceHistory("SOL/USDC", 30);

// Get volume data
const volumeData = await fetchVolumeHistory("SOL/USDC", 30);
```

### Step 2: Quantitative Analysis

```typescript
const quantAnalysis = await tradingClient.chat(
  [
    {
      role: "system",
      content: `You are a quantitative analyst. Apply all mathematical models:
1. Brownian motion for price modeling
2. HMM for regime detection
3. Statistical tests for pattern validation
4. Risk metrics calculation`,
    },
    {
      role: "user",
      content: `Full Quantitative Analysis:

Price Data: ${JSON.stringify(priceData)}
Volume Data: ${JSON.stringify(volumeData)}
On-Chain Data: ${JSON.stringify(onChainData)}

Perform:
1. Brownian motion analysis
2. HMM regime detection
3. Pattern recognition (mean reversion, momentum)
4. Risk assessment
5. Probability calculations

Output: Trading signal with confidence level`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

### Step 3: Risk Management

```typescript
const riskCheck = await tradingClient.chat(
  [
    {
      role: "system",
      content: `Capital: $10,000 (LIMITED)
Risk per trade: Max 2% ($200)
Position size: Max 10% ($1,000)

You MUST respect these limits. No exceptions.`,
    },
    {
      role: "user",
      content: `Risk Management Check:

Proposed Trade:
- Asset: SOL/USDC
- Size: $800 (8% of capital)
- Stop loss: 3% below entry
- Risk: $24 (0.24% of capital)
- Probability: 65%

Approve or reject? Calculate Kelly Criterion optimal size.`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

### Step 4: Execution Decision

```typescript
const executionDecision = await tradingClient.chat(
  [
    {
      role: "user",
      content: `Final Execution Decision:

Quantitative Analysis: ${quantAnalysis}
Risk Check: ${riskCheck}

Decision: Execute trade? Yes/No
If Yes: Provide exact parameters (size, entry, stop, target)
If No: Explain why`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

## Consciousness and Awareness

The trading model maintains **constant awareness**:

1. **Capital Awareness**: Always knows current capital and limits
2. **Market Awareness**: Monitors regime shifts and volatility
3. **Risk Awareness**: Calculates and respects risk limits
4. **Pattern Awareness**: Recognizes statistical patterns
5. **Security Awareness**: Checks for rug pulls, low liquidity, suspicious activity

```typescript
const consciousnessCheck = await tradingClient.chat(
  [
    {
      role: "system",
      content: `You are ALWAYS aware of:
1. Current capital: $10,000
2. Open positions: [list]
3. Total risk exposure: [calculate]
4. Market regime: [current state]
5. Recent performance: [track record]

Before ANY trade, verify:
- Capital available?
- Risk within limits?
- Market conditions favorable?
- Security checks passed?`,
    },
    {
      role: "user",
      content: "Perform consciousness check before next trade.",
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

## Integration with Helius

### Security Checks

```typescript
const securityCheck = await tradingClient.chat(
  [
    {
      role: "user",
      content: `Security Analysis via Helius:

Token: SOL_TOKEN_ADDRESS

Check:
1. Liquidity depth (Helius DAS API)
2. Holder distribution (whale concentration)
3. Transaction history (suspicious patterns)
4. Smart contract security (verified, audited?)
5. Rug pull indicators

Risk Score: 0-100 (0 = safe, 100 = extreme risk)`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

### Volume Analysis

```typescript
const volumeAnalysis = await tradingClient.chat(
  [
    {
      role: "user",
      content: `Volume Analysis via Helius:

On-chain volume data: [from Helius]
DEX volume: [from Helius]
Whale transactions: [from Helius]

Analyze:
1. Volume trends (increasing/decreasing)
2. Smart money flow (whale activity)
3. Retail vs institutional volume
4. Volume-price correlation

Trading signal: Buy/Sell/Hold`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

## Best Practices

1. **Always use multiple models**: Don't rely on single indicator
2. **Validate patterns statistically**: Backtest before live trading
3. **Respect capital limits**: Never exceed risk parameters
4. **Monitor regime shifts**: Adapt strategy to market conditions
5. **Use Helius for security**: Always check on-chain data before trading
6. **Track performance**: Learn from wins and losses
7. **Stay conscious**: Maintain awareness of capital, risk, and market state

## Example: Complete Trading Decision

```typescript
const completeTradingDecision = await tradingClient.chat(
  [
    {
      role: "system",
      content: `Quantitative Trading System
Capital: $10,000 (LIMITED)
Models: Brownian motion, HMM, regime shift detection
Data: Helius on-chain analysis
Philosophy: Pattern recognition (Jim Simons approach)
Awareness: ALWAYS conscious of capital and risk`,
    },
    {
      role: "user",
      content: `Complete Trading Analysis:

Asset: SOL/USDC
Current Price: $150
Capital Available: $10,000
Open Positions: None

Data:
- Price history (30d): [data]
- Volume history (30d): [data]
- On-chain data (Helius): [data]
- Volatility: 45% annualized
- Current regime: Sideways (HMM probability: 65%)

Perform:
1. Brownian motion analysis
2. HMM regime detection
3. Pattern recognition
4. Security check (Helius)
5. Risk calculation
6. Position sizing (Kelly Criterion)

Output:
- Trade decision: Yes/No
- If Yes: Entry, size, stop loss, target, probability
- If No: Reason
- Risk score: 0-100`,
    },
  ],
  {
    model: tradingClient.getTradingModel(),
  }
);
```

## Summary

The trading model is a **sophisticated quantitative trading system** that:

- Executes all on-chain activities
- Applies advanced mathematical models (Brownian motion, HMM, regime shift)
- Recognizes patterns (Jim Simons approach)
- Integrates Helius for on-chain data and security
- Maintains constant awareness of capital limits and risk
- Makes probabilistic decisions based on rigorous analysis

**Remember**: We cannot predict the market, but we can exploit patterns with disciplined quantitative analysis and strict risk management.
