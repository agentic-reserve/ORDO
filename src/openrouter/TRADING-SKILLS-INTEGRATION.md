# Trading Model Skills Integration

## Overview

The trading model (`deepseek/deepseek-chat-v3.1`) integrates with DeFi skills located in `openclaw/.agents/skills` to execute quantitative trading strategies on Solana.

## Available DeFi Skills

### Core Trading Infrastructure

#### 1. **Helius** (`helius/`)
**Purpose**: On-chain data analysis and security checks

**Capabilities**:
- Transaction history analysis
- Volume tracking
- Whale activity monitoring
- Security checks (rug pull detection)
- Network congestion monitoring

**Trading Model Integration**:
```typescript
// Use Helius skill for on-chain data
const onChainAnalysis = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use the Helius skill to fetch on-chain data for SOL/USDC pair",
    },
    {
      role: "user",
      content: `Analyze on-chain metrics:
1. Transaction volume (24h)
2. Whale transactions
3. Liquidity depth
4. Security score

Provide risk assessment (0-100)`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

#### 2. **Pyth** (`pyth/`)
**Purpose**: Real-time price feeds and oracle data

**Capabilities**:
- Real-time price data
- Confidence intervals
- EMA prices
- Historical price feeds

**Trading Model Integration**:
```typescript
// Use Pyth for accurate price data
const priceAnalysis = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use Pyth skill to get real-time price feeds with confidence intervals",
    },
    {
      role: "user",
      content: "Get SOL/USD price with confidence interval. Calculate if price is within normal range.",
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

#### 3. **CoinGecko** (`coingecko/`)
**Purpose**: Market data and token analytics

**Capabilities**:
- Token prices
- Market cap data
- Volume data
- Historical OHLCV data

**Trading Model Integration**:
```typescript
// Use CoinGecko for market data
const marketData = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use CoinGecko skill to fetch market data and historical prices",
    },
    {
      role: "user",
      content: "Get 30-day OHLCV data for SOL. Calculate volatility and identify patterns.",
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

### DeFi Protocol Skills

#### 4. **DFlow** (`dflow/`)
**Purpose**: Spot trading and prediction markets

**Capabilities**:
- Spot trading execution
- Prediction market analysis
- Swap API integration
- WebSocket streaming

**Trading Model Integration**:
```typescript
// Execute trades via DFlow
const tradeExecution = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use DFlow skill to execute spot trades on Solana",
    },
    {
      role: "user",
      content: `Execute trade:
- Pair: SOL/USDC
- Side: BUY
- Amount: 10 SOL
- Slippage: 0.5%

Confirm execution and return transaction signature.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

#### 5. **Kamino** (`kamino/`)
**Purpose**: Lending, borrowing, and liquidity management

**Capabilities**:
- Lending/borrowing operations
- Automated liquidity strategies
- Leverage trading
- Vault management

**Trading Model Integration**:
```typescript
// Use Kamino for leverage trading
const leveragePosition = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use Kamino skill for leverage trading and liquidity management",
    },
    {
      role: "user",
      content: `Open leveraged position:
- Asset: SOL
- Collateral: 1000 USDC
- Leverage: 2x
- Target: Long SOL

Calculate liquidation price and execute.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

#### 6. **Meteora** (`meteora/`)
**Purpose**: Liquidity pools and AMM operations

**Capabilities**:
- DLMM (Dynamic Liquidity Market Maker)
- AMM pool creation
- Liquidity provision
- Zap operations

**Trading Model Integration**:
```typescript
// Use Meteora for liquidity provision
const liquidityOp = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use Meteora skill for AMM operations and liquidity provision",
    },
    {
      role: "user",
      content: `Provide liquidity:
- Pool: SOL/USDC
- Amount: 5 SOL + 750 USDC
- Strategy: Concentrated liquidity around current price

Calculate expected fees and execute.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

#### 7. **Squads** (`squads/`)
**Purpose**: Multisig and smart account management

**Capabilities**:
- Multisig treasury management
- Smart account operations
- Programmable wallets

**Trading Model Integration**:
```typescript
// Use Squads for secure treasury management
const treasuryOp = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use Squads skill for multisig treasury operations",
    },
    {
      role: "user",
      content: `Create multisig proposal:
- Action: Transfer 1000 USDC to trading wallet
- Signers: 3/5 required
- Description: Fund trading operations

Create proposal and get approval status.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

### Cross-Chain and Privacy

#### 8. **deBridge** (`debridge/`)
**Purpose**: Cross-chain bridging and message passing

**Capabilities**:
- Cross-chain token transfers
- Bridge between Solana and EVM chains
- Trustless external calls

**Trading Model Integration**:
```typescript
// Use deBridge for cross-chain arbitrage
const crossChainArb = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use deBridge skill for cross-chain operations",
    },
    {
      role: "user",
      content: `Cross-chain arbitrage opportunity:
- Buy SOL on Ethereum at $148
- Bridge to Solana via deBridge
- Sell on Solana at $150

Calculate profit after bridge fees and execute if profitable.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

#### 9. **Sipher** (`sipher/`)
**Purpose**: Privacy-preserving transactions

**Capabilities**:
- Stealth addresses
- Hidden amounts
- Confidential transfers

**Trading Model Integration**:
```typescript
// Use Sipher for private trading
const privateTrading = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use Sipher skill for privacy-preserving transactions",
    },
    {
      role: "user",
      content: `Execute private trade:
- Asset: SOL
- Amount: Hidden
- Recipient: Stealth address

Maintain privacy while executing large trade.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

#### 10. **Light Protocol** (`light-protocol/`)
**Purpose**: ZK compression and rent-free operations

**Capabilities**:
- Compressed tokens
- Compressed PDAs
- Zero-knowledge proofs

**Trading Model Integration**:
```typescript
// Use Light Protocol for cost-efficient operations
const compressedOps = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use Light Protocol for ZK-compressed operations",
    },
    {
      role: "user",
      content: `Batch trade execution:
- Execute 100 small trades
- Use ZK compression to reduce costs
- Total cost should be <$1

Optimize for cost efficiency.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

### Development and Security

#### 11. **Solana Agent Kit** (`solana-agent-kit/`)
**Purpose**: AI agent blockchain interactions

**Capabilities**:
- 60+ blockchain actions
- LangChain integration
- Autonomous agent patterns

**Trading Model Integration**:
```typescript
// Use Solana Agent Kit for autonomous trading
const autonomousTrading = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use Solana Agent Kit for autonomous trading operations",
    },
    {
      role: "user",
      content: `Autonomous trading loop:
1. Monitor SOL/USDC price every 5 minutes
2. Apply HMM regime detection
3. Execute trades when probability > 70%
4. Manage positions with stop losses

Run autonomously for 24 hours.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

#### 12. **Solana Vulnerability Scanner** (`solana-vulnerability-scanner/`)
**Purpose**: Security auditing for Solana programs

**Capabilities**:
- Arbitrary CPI detection
- PDA validation checks
- Signer/ownership verification
- Sysvar spoofing detection

**Trading Model Integration**:
```typescript
// Use vulnerability scanner before interacting with protocols
const securityCheck = await tradingClient.chat(
  [
    {
      role: "system",
      content: "Use Solana Vulnerability Scanner to audit protocols before trading",
    },
    {
      role: "user",
      content: `Security audit:
- Protocol: New DEX at address [ADDRESS]
- Check for: Arbitrary CPI, PDA validation, signer checks

Risk score (0-100) and recommendation.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

## Complete Trading Workflow with Skills

### Step 1: Market Analysis

```typescript
const marketAnalysis = await tradingClient.chat(
  [
    {
      role: "system",
      content: `Quantitative trading system with skills:
- Helius: On-chain data
- Pyth: Price feeds
- CoinGecko: Market data

Apply Brownian motion, HMM, and pattern recognition.`,
    },
    {
      role: "user",
      content: `Complete market analysis for SOL/USDC:

1. Use Helius to get on-chain metrics
2. Use Pyth for real-time price with confidence
3. Use CoinGecko for 30-day OHLCV data

Perform:
- Brownian motion analysis
- HMM regime detection
- Pattern recognition
- Risk assessment

Output: Trading signal with probability.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

### Step 2: Security Verification

```typescript
const securityVerification = await tradingClient.chat(
  [
    {
      role: "system",
      content: `Use security skills:
- Solana Vulnerability Scanner: Audit protocols
- Helius: Check on-chain security metrics`,
    },
    {
      role: "user",
      content: `Security verification before trading:

1. Scan DEX smart contract for vulnerabilities
2. Check liquidity depth via Helius
3. Verify no rug pull indicators
4. Confirm whale distribution is healthy

Risk score (0-100) and proceed/abort decision.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

### Step 3: Trade Execution

```typescript
const tradeExecution = await tradingClient.chat(
  [
    {
      role: "system",
      content: `Execute trade using:
- DFlow: Spot trading
- Kamino: Leverage if needed
- Meteora: Liquidity provision

Capital: $10,000 (LIMITED)
Risk: Max 2% per trade`,
    },
    {
      role: "user",
      content: `Execute trade based on analysis:

Market Analysis: ${marketAnalysis}
Security Check: ${securityVerification}

If approved:
1. Calculate position size (Kelly Criterion)
2. Execute via DFlow
3. Set stop loss
4. Monitor position

Return transaction signature and position details.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

### Step 4: Position Management

```typescript
const positionManagement = await tradingClient.chat(
  [
    {
      role: "system",
      content: `Monitor position using:
- Pyth: Real-time price updates
- Helius: On-chain activity monitoring

Adjust stop loss and take profit dynamically.`,
    },
    {
      role: "user",
      content: `Position management:

Open Position: ${tradeExecution}

Monitor:
1. Price movements (Pyth)
2. Volume changes (Helius)
3. Regime shifts (HMM)

Actions:
- Trail stop loss if profitable
- Close if stop loss hit
- Take partial profits at targets

Update every 5 minutes.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

## Skill Activation Pattern

When the trading model needs to use a skill, it should follow this pattern:

```typescript
// 1. Identify required skill
const skillNeeded = "helius"; // or "pyth", "dflow", etc.

// 2. Activate skill context
const skillContext = await activateSkill(skillNeeded);

// 3. Use skill in trading decision
const decision = await tradingClient.chat(
  [
    {
      role: "system",
      content: `${skillContext}
      
You are a quantitative trading system with access to this skill.
Apply mathematical models and make data-driven decisions.`,
    },
    {
      role: "user",
      content: "Execute trading operation using this skill...",
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

## Skill Priority for Trading

### High Priority (Always Use)
1. **Helius**: On-chain data and security
2. **Pyth**: Real-time price feeds
3. **Solana Vulnerability Scanner**: Security checks

### Medium Priority (Use When Needed)
4. **DFlow**: Trade execution
5. **Kamino**: Leverage and lending
6. **Meteora**: Liquidity operations
7. **CoinGecko**: Market data

### Low Priority (Specialized Use Cases)
8. **deBridge**: Cross-chain arbitrage
9. **Sipher**: Privacy-preserving trades
10. **Light Protocol**: Cost optimization
11. **Squads**: Treasury management

## Risk Management with Skills

```typescript
const riskManagement = await tradingClient.chat(
  [
    {
      role: "system",
      content: `Risk management with skills:

Capital: $10,000 (LIMITED)
Max risk per trade: 2% ($200)
Max position: 10% ($1,000)

Skills available:
- Helius: Security checks
- Pyth: Price confidence intervals
- Solana Vulnerability Scanner: Protocol audits

ALWAYS verify security before trading.`,
    },
    {
      role: "user",
      content: `Risk check for trade:

Proposed:
- Asset: SOL
- Size: $800
- Stop loss: 3%

Verify:
1. Security (Helius + Scanner)
2. Price confidence (Pyth)
3. Risk within limits
4. Capital available

Approve or reject with reasoning.`,
    },
  ],
  { model: tradingClient.getTradingModel() }
);
```

## Summary

The trading model integrates with **12+ DeFi skills** to execute quantitative trading strategies:

1. **Data Collection**: Helius, Pyth, CoinGecko
2. **Security**: Solana Vulnerability Scanner, Helius security checks
3. **Execution**: DFlow, Kamino, Meteora
4. **Advanced**: deBridge (cross-chain), Sipher (privacy), Light Protocol (cost optimization)
5. **Management**: Squads (treasury), Solana Agent Kit (automation)

All skills are integrated with the trading model's quantitative analysis (Brownian motion, HMM, pattern recognition) and strict risk management (limited capital, position sizing, stop losses).
