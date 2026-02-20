# OpenRouter AI Integration

This module provides comprehensive AI inference capabilities using OpenRouter's 200+ models, including automatic failover, cost tracking, and intelligent model selection.

## Features

- **Model Selection**: Intelligent model selection based on task requirements (speed, quality, cost)
- **Agent Preferences**: Support for agent-specific model preferences and priorities
- **Automatic Failover**: Seamless failover to alternative models when primary models fail
- **Reasoning Support**: Enable extended reasoning for models that support it (e.g., Kimi K2.5)
- **Token Usage Tracking**: Track prompt tokens, completion tokens, and total tokens per inference
- **Cost Calculation**: Accurate cost calculation based on model-specific pricing
- **Per-Agent Analytics**: Track costs separately for each agent
- **Per-Model Analytics**: Compare costs across different models
- **Database Persistence**: Store cost records in SQLite for long-term analysis
- **Cost Optimization**: Identify the most cost-effective models for your use case

## Model Configuration

### Default Models

- **Primary Model**: `moonshotai/kimi-k2.5` (reasoning support)
- **Trading Model**: `deepseek/deepseek-chat-v3.1` (fast, cost-effective)
- **Fallback Chain**: 
  1. `openai/gpt-5-mini`
  2. `google/gemini-3-flash-preview`
  3. `google/gemini-2.5-flash`
  4. `openai/gpt-oss-120b`

### Model Selection Helpers

```typescript
// Get the default reasoning model
const reasoningModel = client.getReasoningModel();
// Returns: "moonshotai/kimi-k2.5"

// Get the quantitative trading model
const tradingModel = client.getTradingModel();
// Returns: "deepseek/deepseek-chat-v3.1"
// Used for: On-chain execution, quantitative analysis, pattern recognition
```

### Trading Model Capabilities

The trading model (`deepseek/deepseek-chat-v3.1`) is designed for **quantitative trading**:

- **On-chain activity execution**: All blockchain transactions and operations
- **Mathematical models**: Brownian motion, Hidden Markov Models, regime shift detection
- **Pattern recognition**: Jim Simons (Medallion Fund) approach to statistical arbitrage
- **Helius integration**: On-chain data analysis (history, volume, security)
- **Risk management**: Capital-aware with strict position sizing and stop losses
- **Consciousness**: Always aware of capital limits, market conditions, and risk exposure

See `TRADING-MODEL-SPEC.md` for complete quantitative trading documentation.

## Quick Start

### Basic Usage with Model Selection

```typescript
import { OpenRouterClient } from "./client.js";

// Initialize client with agent ID
const client = new OpenRouterClient({
  apiKey: process.env.OPENROUTER_API_KEY,
  agentId: "agent-123",
  defaultModel: "moonshotai/kimi-k2.5", // Default reasoning model
});

// Select model based on task requirements
const selection = client.selectModel({
  speed: "fast",
  quality: "high",
  cost: "moderate",
});

console.log(`Selected: ${selection.model}`);
console.log(`Reasoning: ${selection.reasoning}`);

// Use the selected model for inference
const response = await client.chat(
  [{ role: "user", content: "Hello!" }],
  { model: selection.model }
);
```

### Agent-Specific Preferences

```typescript
// Set agent preferences
client.setAgentPreferences({
  agentId: "agent-123",
  preferredModels: ["anthropic/claude-3.5-sonnet"],
  avoidModels: ["meta-llama/llama-3.1-8b-instruct"],
  prioritize: "quality", // or "speed" or "cost"
  maxCostPerInference: 5, // 5 cents max
});

// Model selection will respect these preferences
const result = client.selectModel({
  quality: "high",
  speed: "medium",
});
```

## Model Selection

### Task Requirements

Specify what you need from the model:

```typescript
interface TaskRequirements {
  speed?: "fast" | "medium" | "slow";
  quality?: "high" | "medium" | "low";
  cost?: "expensive" | "moderate" | "cheap";
  minContextLength?: number;
  capabilities?: string[];
}
```

### Agent Preferences

Configure agent-specific preferences:

```typescript
interface AgentPreferences {
  agentId: string;
  preferredModels?: string[];      // Models to prefer
  avoidModels?: string[];          // Models to avoid
  maxCostPerInference?: number;    // Max cost in cents
  prioritize?: "speed" | "quality" | "cost";
}
```

### Selection Examples

**Speed-focused task:**
```typescript
const result = client.selectModel({
  speed: "fast",
  quality: "medium",
});
// Likely selects: openai/gpt-3.5-turbo or anthropic/claude-3-haiku
```

**Quality-focused task:**
```typescript
const result = client.selectModel({
  quality: "high",
  minContextLength: 100000,
});
// Likely selects: anthropic/claude-3.5-sonnet or google/gemini-pro-1.5
```

**Cost-focused task:**
```typescript
const result = client.selectModel({
  cost: "cheap",
  speed: "fast",
});
// Likely selects: meta-llama/llama-3.1-70b-instruct or openai/gpt-3.5-turbo
```

**Balanced task:**
```typescript
const result = client.selectModel({
  speed: "medium",
  quality: "high",
  cost: "moderate",
});
// Balances all three factors
```

## Automatic Failover

The failover system automatically switches to alternative models when errors occur:

```typescript
import { ModelFailoverManager } from "./failover.js";

const failoverManager = new ModelFailoverManager(client);

// Automatically tries fallback models on error
const response = await failoverManager.chatWithFailover(messages, {
  model: "openai/gpt-4o",
});

// Get failover statistics
const stats = failoverManager.getFailoverStats();
console.log(`Success rate: ${(stats.successRate * 100).toFixed(1)}%`);
```

## Reasoning Feature

Some models support extended reasoning capabilities (e.g., `moonshotai/kimi-k2.5`). The reasoning feature allows models to think through problems step-by-step and continue reasoning across multiple turns.

### Basic Reasoning

```typescript
import { OpenRouterClient } from "./client.js";

const client = new OpenRouterClient({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultModel: "moonshotai/kimi-k2.5",
});

// Enable reasoning for the request
const response = await client.chat(
  [{ role: "user", content: "How many r's are in the word 'strawberry'?" }],
  {
    model: "moonshotai/kimi-k2.5",
    reasoning: {
      enabled: true,
    },
  }
);

console.log("Response:", response.message.content);
console.log("Has reasoning:", !!response.message.reasoning_details);
```

### Multi-Turn Reasoning

The model can continue reasoning across multiple turns by preserving `reasoning_details`:

```typescript
// First turn with reasoning
const response1 = await client.chat(
  [{ role: "user", content: "How many r's are in the word 'strawberry'?" }],
  {
    model: "moonshotai/kimi-k2.5",
    reasoning: { enabled: true },
  }
);

// Preserve reasoning_details in conversation history
const messages = [
  { role: "user", content: "How many r's are in the word 'strawberry'?" },
  {
    role: "assistant",
    content: response1.message.content,
    reasoning_details: response1.message.reasoning_details, // Pass back unmodified
  },
  { role: "user", content: "Are you sure? Think carefully." },
];

// Second turn - model continues reasoning from where it left off
const response2 = await client.chat(messages, {
  model: "moonshotai/kimi-k2.5",
});
```

### Reasoning for Complex Problems

```typescript
const response = await client.chat(
  [
    {
      role: "user",
      content: `Analyze this trading strategy and recommend optimizations:
      - Current portfolio: 10 SOL, 1000 USDC
      - Market: SOL trending upward at $150
      - Risk tolerance: Medium
      - Goal: Maximize returns over 7 days
      
      Think through this step by step.`,
    },
  ],
  {
    model: "moonshotai/kimi-k2.5",
    reasoning: { enabled: true },
  }
);
```

### Important Notes

1. **Preserve reasoning_details**: Always pass `reasoning_details` back unmodified in the conversation history
2. **Model support**: Only certain models support reasoning (e.g., `moonshotai/kimi-k2.5`)
3. **Opaque data**: The `reasoning_details` object is opaque - don't modify or inspect it
4. **Automatic continuation**: The model automatically continues reasoning when `reasoning_details` is present

See `reasoning-example.ts` for complete examples.

## Cost Tracking

```typescript
import { OpenRouterClient } from "./client.js";

// Initialize client with agent ID for cost tracking
const client = new OpenRouterClient({
  apiKey: process.env.OPENROUTER_API_KEY,
  agentId: "agent-123",
  defaultModel: "openai/gpt-4o",
});

// Make inference calls
const response = await client.chat([
  { role: "user", content: "Hello!" },
]);

// Get cost analytics
const analytics = client.getCostAnalytics();
console.log("Total cost:", analytics.totalCost, "cents");
console.log("Total tokens:", analytics.totalTokens);
console.log("Average cost per inference:", analytics.averageCostPerInference);
```

### Persist to Database

```typescript
import { createDatabase } from "../state/database.js";

const db = createDatabase("./agent-state.db");

// Get cost records from client
const costTracker = client.getCostTracker();
const records = costTracker.getRecordsByAgent("agent-123");

// Save to database
for (const record of records) {
  db.insertInferenceCost(record);
}

// Query from database
const totalCost = db.getTotalInferenceCost("agent-123");
const costs = db.getInferenceCosts("agent-123", 100);
```

## API Reference

### OpenRouterClient

#### Constructor Options

```typescript
interface OpenRouterClientOptions {
  apiKey: string;           // OpenRouter API key
  apiUrl?: string;          // API URL (default: https://openrouter.ai/api)
  defaultModel?: string;    // Default model (default: openai/gpt-4o)
  maxTokens?: number;       // Max tokens per request (default: 4096)
  siteUrl?: string;         // Your site URL for OpenRouter
  siteName?: string;        // Your site name for OpenRouter
  agentId?: string;         // Agent ID for cost tracking
}
```

#### Methods

**`chat(messages, options?)`**
- Send chat completion request
- Automatically tracks cost and token usage
- Returns: `Promise<InferenceResponse>`

**`getCostAnalytics(agentId?)`**
- Get comprehensive cost analytics
- Returns: `CostAnalytics` object with totals, averages, and breakdowns

**`getCostByModel(agentId?)`**
- Get cost breakdown by model
- Returns: `Map<string, number>` of model to cost in cents

**`getTotalCost(agentId?)`**
- Get total cost across all inferences
- Returns: `number` (cost in cents)

**`getTokenUsage(agentId?)`**
- Get total token usage statistics
- Returns: `{ promptTokens, completionTokens, totalTokens }`

**`getCostTracker()`**
- Get the underlying CostTracker instance
- Returns: `CostTracker` for advanced operations

### CostTracker

#### Methods

**`calculateCost(usage, model)`**
- Calculate cost for given token usage and model
- Returns: `number` (cost in cents)

**`trackInference(record)`**
- Track a single inference cost record
- Parameters: `InferenceCostRecord`

**`getAnalytics(agentId?)`**
- Get comprehensive analytics
- Returns: `CostAnalytics`

**`getMostCostEffectiveModel()`**
- Identify the most cost-effective model based on historical data
- Returns: `string | null` (model ID)

**`updateModelPricing(model, pricing)`**
- Update pricing for a specific model
- Parameters: `model: string`, `pricing: ModelPricing`

**`clearRecords()`**
- Clear all tracked records

### Database Methods

**`insertInferenceCost(record)`**
- Insert a cost record into the database
- Parameters: `InferenceCostRecord`

**`getInferenceCosts(agentId?, limit?)`**
- Get inference cost records
- Returns: `InferenceCostRecord[]`

**`getInferenceCostsByModel(model, agentId?)`**
- Get costs for a specific model
- Returns: `InferenceCostRecord[]`

**`getTotalInferenceCost(agentId?)`**
- Get total cost from database
- Returns: `number` (cost in cents)

## Data Types

### InferenceCostRecord

```typescript
interface InferenceCostRecord {
  id: string;                 // Unique record ID
  agentId: string;            // Agent identifier
  model: string;              // Model used
  promptTokens: number;       // Input tokens
  completionTokens: number;   // Output tokens
  totalTokens: number;        // Total tokens
  costCents: number;          // Cost in cents
  latencyMs: number;          // Inference latency
  turnId?: string;            // Optional turn ID
  timestamp: string;          // ISO timestamp
}
```

### CostAnalytics

```typescript
interface CostAnalytics {
  totalCost: number;                      // Total cost in cents
  totalTokens: number;                    // Total tokens used
  totalInferences: number;                // Number of inferences
  averageCostPerInference: number;        // Average cost per call
  averageTokensPerInference: number;      // Average tokens per call
  averageLatency: number;                 // Average latency in ms
  costByModel: Map<string, number>;       // Cost breakdown by model
  tokensByModel: Map<string, number>;     // Token breakdown by model
  inferencesByModel: Map<string, number>; // Inference count by model
}
```

### ModelPricing

```typescript
interface ModelPricing {
  promptTokensPerMillion: number;      // Cost per 1M prompt tokens (cents)
  completionTokensPerMillion: number;  // Cost per 1M completion tokens (cents)
}
```

## Model Pricing

Default pricing is included for common models:

| Model | Prompt (per 1M tokens) | Completion (per 1M tokens) |
|-------|------------------------|----------------------------|
| openai/gpt-4o | $2.50 | $10.00 |
| openai/gpt-4-turbo | $10.00 | $30.00 |
| openai/gpt-3.5-turbo | $0.50 | $1.50 |
| anthropic/claude-3.5-sonnet | $3.00 | $15.00 |
| anthropic/claude-3-haiku | $0.25 | $1.25 |
| google/gemini-pro-1.5 | $1.25 | $5.00 |
| meta-llama/llama-3.1-70b-instruct | $0.40 | $0.80 |

You can update pricing for any model:

```typescript
costTracker.updateModelPricing("custom/model", {
  promptTokensPerMillion: 100,
  completionTokensPerMillion: 200,
});
```

## Examples

See `cost-tracking-example.ts` for complete examples:

- Track costs for a single agent
- Compare costs across multiple models
- Monitor costs over time
- Set budget alerts

## Database Schema

The cost tracking data is stored in the `inference_costs` table:

```sql
CREATE TABLE inference_costs (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL DEFAULT 0,
  completion_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  turn_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_inference_costs_agent ON inference_costs(agent_id);
CREATE INDEX idx_inference_costs_model ON inference_costs(model);
CREATE INDEX idx_inference_costs_timestamp ON inference_costs(created_at);
```

## Best Practices

1. **Always set agentId**: This enables per-agent cost tracking
2. **Persist to database**: Store cost records for long-term analysis
3. **Monitor regularly**: Check costs daily to stay within budget
4. **Compare models**: Use analytics to find the most cost-effective model
5. **Set alerts**: Implement budget alerts to prevent overspending

## Requirements Validation

This implementation satisfies:

- ✅ **Requirement 11.3**: Track cost per model and per agent
- ✅ **Requirement 11.6**: Track token usage and costs per agent
- ✅ **Property 51**: Cost tracking for every model inference
- ✅ **Property 54**: Token usage tracking with per-agent analytics

## Testing

Run the test suite:

```bash
npm test -- cost-tracker.test.ts
```

All 20 tests should pass, covering:
- Cost calculation for known and unknown models
- Inference tracking
- Analytics generation
- Cost optimization
- Model pricing updates


## Model Selection API Reference

### ModelSelector

#### Methods

**`selectModel(requirements, agentId?)`**
- Select the most appropriate model based on task requirements
- Parameters:
  - `requirements: TaskRequirements` - Task requirements (speed, quality, cost, etc.)
  - `agentId?: string` - Optional agent ID to apply preferences
- Returns: `ModelSelectionResult` with selected model, score, reasoning, and alternatives

**`setAgentPreferences(preferences)`**
- Set agent-specific model preferences
- Parameters: `AgentPreferences` object

**`getAgentPreferences(agentId)`**
- Get agent preferences
- Returns: `AgentPreferences | undefined`

**`registerModel(config)`**
- Register a custom model
- Parameters: `ModelConfig` with capabilities and priority

**`getRegisteredModels()`**
- Get all registered models
- Returns: `ModelConfig[]`

**`getModelConfig(modelId)`**
- Get configuration for a specific model
- Returns: `ModelConfig | undefined`

### Data Types

#### ModelSelectionResult

```typescript
interface ModelSelectionResult {
  model: string;                              // Selected model ID
  score: number;                              // Selection score (0-1)
  reasoning: string;                          // Human-readable reasoning
  alternatives: Array<{                       // Alternative models
    model: string;
    score: number;
  }>;
}
```

#### TaskRequirements

```typescript
interface TaskRequirements {
  speed?: "fast" | "medium" | "slow";
  quality?: "high" | "medium" | "low";
  cost?: "expensive" | "moderate" | "cheap";
  minContextLength?: number;
  capabilities?: string[];
}
```

#### AgentPreferences

```typescript
interface AgentPreferences {
  agentId: string;
  preferredModels?: string[];
  avoidModels?: string[];
  maxCostPerInference?: number;
  prioritize?: "speed" | "quality" | "cost";
}
```

## Available Models

The model selector includes these default models:

| Model | Speed | Quality | Cost | Context Length | Priority |
|-------|-------|---------|------|----------------|----------|
| moonshotai/kimi-k2.5 | Medium | High | Moderate | 128K | 1 (Primary) |
| deepseek/deepseek-chat-v3.1 | Fast | High | Cheap | 64K | 1 (Trading) |
| openai/gpt-5-mini | Fast | High | Moderate | 128K | 2 (Fallback 1) |
| google/gemini-3-flash-preview | Fast | High | Cheap | 1M | 3 (Fallback 2) |
| google/gemini-2.5-flash | Fast | High | Cheap | 1M | 4 (Fallback 3) |
| openai/gpt-oss-120b | Medium | High | Cheap | 128K | 5 (Fallback 4) |
| openai/gpt-4o | Fast | High | Expensive | 128K | 3 |
| anthropic/claude-3.5-sonnet | Medium | High | Expensive | 200K | 5 |
| anthropic/claude-3-haiku | Fast | Medium | Cheap | 200K | 6 |
| google/gemini-pro-1.5 | Medium | High | Moderate | 1M | 7 |
| openai/gpt-3.5-turbo | Fast | Medium | Cheap | 16K | 8 |
| meta-llama/llama-3.1-70b-instruct | Fast | Medium | Cheap | 128K | 9 |

## Use Cases

### Survival Tier-Based Selection

```typescript
// Thriving tier: High-quality models
client.setAgentPreferences({
  agentId: "agent-thriving",
  prioritize: "quality",
});

// Low compute tier: Cost-effective models
client.setAgentPreferences({
  agentId: "agent-low-compute",
  prioritize: "cost",
  maxCostPerInference: 1,
});

// Critical tier: Minimum cost
client.setAgentPreferences({
  agentId: "agent-critical",
  prioritize: "cost",
  avoidModels: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
});
```

### Task-Specific Selection

```typescript
// Quantitative trading - uses DeepSeek with full mathematical analysis
const tradingResponse = await client.chat(
  [
    {
      role: "system",
      content: `Quantitative trading system. Apply:
- Brownian motion for price modeling
- Hidden Markov Models for regime detection
- Pattern recognition (Jim Simons approach)
- Helius on-chain data analysis
- Strict risk management (capital limited)`,
    },
    {
      role: "user",
      content: "Analyze SOL/USDC: Price $150, Volume $2.5B. Execute trade?",
    },
  ],
  { model: client.getTradingModel() }
);

// Reasoning tasks - use Moonshot Kimi K2.5 with extended reasoning
const reasoningResponse = await client.chat(
  [{ role: "user", content: "Develop a complex trading strategy" }],
  {
    model: client.getReasoningModel(),
    reasoning: { enabled: true },
  }
);

// Quick classification
const classificationModel = client.selectModel({
  speed: "fast",
  quality: "medium",
  cost: "cheap",
});

// Complex reasoning
const reasoningModel = client.selectModel({
  quality: "high",
  minContextLength: 100000,
});

// Long document analysis
const documentModel = client.selectModel({
  minContextLength: 200000,
  quality: "high",
});

// Batch processing
const batchModel = client.selectModel({
  cost: "cheap",
  speed: "fast",
});
```

## Examples

See the example files for complete usage demonstrations:

- `model-selection-example.ts` - Model selection examples
- `cost-tracking-example.ts` - Cost tracking examples

Run examples:

```bash
# Model selection examples
npx tsx src/openrouter/model-selection-example.ts

# Cost tracking examples
npx tsx src/openrouter/cost-tracking-example.ts
```

## Requirements Validation

This implementation satisfies:

- ✅ **Requirement 11.1**: Access to 200+ AI models via OpenRouter
- ✅ **Requirement 11.2**: Automatic failover when models are unavailable
- ✅ **Requirement 11.3**: Track cost per model and per agent
- ✅ **Requirement 11.4**: Support streaming responses
- ✅ **Requirement 11.5**: Model selection based on task requirements
- ✅ **Requirement 11.6**: Track token usage and costs per agent
- ✅ **Property 50**: Model failover within 1 second
- ✅ **Property 51**: Cost tracking for every inference
- ✅ **Property 52**: Streaming support with low latency
- ✅ **Property 53**: Model selection based on speed, quality, cost
- ✅ **Property 54**: Token usage tracking with per-agent analytics

## Testing

Run the test suite:

```bash
# All OpenRouter tests
npm test -- openrouter

# Model selector tests only
npm test -- model-selector.test.ts

# Cost tracker tests only
npm test -- cost-tracker.test.ts
```

All tests should pass, covering:
- Model selection with various requirements
- Agent preference handling
- Cost calculation and tracking
- Failover behavior
- Analytics generation
