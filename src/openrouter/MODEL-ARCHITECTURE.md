# OpenRouter Model Architecture

## Model Configuration Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORDO Agent System                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Primary Models (Priority 1)                 │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  • moonshotai/kimi-k2.5      [Reasoning Tasks]          │  │
│  │    - Extended reasoning support                          │  │
│  │    - 128K context                                        │  │
│  │    - Medium speed, High quality, Moderate cost           │  │
│  │                                                           │  │
│  │  • deepseek/deepseek-chat-v3.1  [Quantitative Trading]   │  │
│  │    - On-chain activity execution                         │  │
│  │    - Quantitative analysis (Brownian motion, HMM, etc.)  │  │
│  │    - Pattern recognition (Jim Simons approach)           │  │
│  │    - Helius endpoint integration for on-chain data       │  │
│  │    - Risk-aware with limited capital constraints         │  │
│  │    - Fast speed, High quality, Cheap cost                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            ↓ (on failure)                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Fallback Chain (4 tiers)                    │  │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  1. openai/gpt-5-mini                                    │  │
│  │     - Fast, High quality, Moderate cost                  │  │
│  │     - 128K context                                       │  │
│  │                            ↓                              │  │
│  │  2. google/gemini-3-flash-preview                        │  │
│  │     - Fast, High quality, Cheap cost                     │  │
│  │     - 1M context                                         │  │
│  │                            ↓                              │  │
│  │  3. google/gemini-2.5-flash                              │  │
│  │     - Fast, High quality, Cheap cost                     │  │
│  │     - 1M context                                         │  │
│  │                            ↓                              │  │
│  │  4. openai/gpt-oss-120b                                  │  │
│  │     - Medium speed, High quality, Cheap cost             │  │
│  │     - 128K context                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Interaction Patterns

### Agent ↔ Agent Communication

```typescript
// Agent-to-agent communication for coordination
const client = new OpenRouterClient({
  apiKey: process.env.OPENROUTER_API_KEY,
  agentId: "agent-sender",
});

const response = await client.chat(
  [
    {
      role: "user",
      content: "Coordinate with agent-receiver on task distribution",
    },
  ],
  {
    model: client.getReasoningModel(), // Use reasoning for coordination
  }
);
```

### Agent ↔ Agents (Multi-Agent)

```typescript
// Multi-agent coordination uses model selector for optimal choice
const selection = client.selectModel({
  speed: "fast",
  quality: "high",
  cost: "cheap",
});

const responses = await Promise.all(
  agents.map((agent) =>
    client.chat(
      [{ role: "user", content: `Coordinate with ${agent.id}` }],
      { model: selection.model }
    )
  )
);
```

### Agent ↔ Human Communication

```typescript
// Human interaction uses reasoning model for quality
const response = await client.chat(
  [
    {
      role: "user",
      content: "Explain your decision-making process for the last trade",
    },
  ],
  {
    model: client.getReasoningModel(), // moonshotai/kimi-k2.5
    reasoning: { enabled: true },
  }
);
```

### Human ↔ Agent Communication

```typescript
// Human queries to agent use reasoning model with extended thinking
const response = await client.chat(
  [
    {
      role: "user",
      content: "Analyze this complex trading strategy and provide recommendations",
    },
  ],
  {
    model: client.getReasoningModel(),
    reasoning: { enabled: true },
  }
);
```

### Human ↔ Agents (Multi-Agent Query)

```typescript
// Human querying multiple agents uses failover for reliability
const failoverManager = new ModelFailoverManager(client);

const responses = await Promise.all(
  agents.map((agent) =>
    failoverManager.chatWithFailover(
      [{ role: "user", content: `Status report from ${agent.id}` }],
      { model: client.getReasoningModel() }
    )
  )
);
```

## Failover Behavior

### Automatic Failover Flow

```
Primary Model Fails
       ↓
Try Fallback 1 (openai/gpt-5-mini)
       ↓ (if fails)
Try Fallback 2 (google/gemini-3-flash-preview)
       ↓ (if fails)
Try Fallback 3 (google/gemini-2.5-flash)
       ↓ (if fails)
Try Fallback 4 (openai/gpt-oss-120b)
       ↓ (if fails)
Throw Error (all models failed)
```

### Failover Example

```typescript
const failoverManager = new ModelFailoverManager(client);

try {
  const response = await failoverManager.chatWithFailover(
    [{ role: "user", content: "Hello!" }],
    { model: "moonshotai/kimi-k2.5" }
  );
  console.log("Success:", response.message.content);
} catch (error) {
  console.error("All models failed:", error);
}

// Check failover statistics
const stats = failoverManager.getFailoverStats();
console.log("Success rate:", (stats.successRate * 100).toFixed(1) + "%");
```

## Model Selection Strategy

### Task-Based Selection

| Task Type | Model | Reasoning |
|-----------|-------|-----------|
| Complex reasoning | moonshotai/kimi-k2.5 | Extended reasoning support |
| Quantitative trading | deepseek/deepseek-chat-v3.1 | Fast inference for real-time analysis |
| Agent coordination | moonshotai/kimi-k2.5 | Quality coordination decisions |
| Human interaction | moonshotai/kimi-k2.5 | High quality responses |
| Batch processing | Auto-selected | Prioritize cost |

### Selection Example

```typescript
// Reasoning task
const reasoningModel = client.selectModel({
  quality: "high",
  minContextLength: 100000,
});

// Trading task
const tradingModel = client.selectModel({
  speed: "fast",
  quality: "high",
  cost: "cheap",
});

// Batch processing
const batchModel = client.selectModel({
  cost: "cheap",
  speed: "fast",
});
```

## Cost Optimization

### Cost Tracking

```typescript
// Track costs per agent
const analytics = client.getCostAnalytics("agent-123");
console.log("Total cost:", analytics.totalCost, "cents");
console.log("Average per inference:", analytics.averageCostPerInference, "cents");

// Cost by model
const costByModel = client.getCostByModel("agent-123");
for (const [model, cost] of costByModel.entries()) {
  console.log(`${model}: ${cost.toFixed(4)} cents`);
}
```

### Cost-Effective Strategies

1. **Use trading model for routine tasks**: `deepseek/deepseek-chat-v3.1` is fast and cheap
2. **Reserve reasoning model for complex tasks**: `moonshotai/kimi-k2.5` for when quality matters
3. **Leverage fallback chain**: Cheaper models in fallback chain reduce costs during failures
4. **Monitor and optimize**: Use cost analytics to identify expensive patterns

## Agent Preferences

### Setting Preferences

```typescript
client.setAgentPreferences({
  agentId: "agent-123",
  preferredModels: ["moonshotai/kimi-k2.5", "deepseek/deepseek-chat-v3.1"],
  avoidModels: ["openai/gpt-4o"], // Too expensive
  prioritize: "cost", // or "speed" or "quality"
  maxCostPerInference: 5, // 5 cents max
});
```

### Survival Tier-Based Preferences

```typescript
// Thriving tier: High quality
client.setAgentPreferences({
  agentId: "agent-thriving",
  prioritize: "quality",
  preferredModels: ["moonshotai/kimi-k2.5"],
});

// Low compute tier: Cost-effective
client.setAgentPreferences({
  agentId: "agent-low-compute",
  prioritize: "cost",
  preferredModels: ["deepseek/deepseek-chat-v3.1"],
  maxCostPerInference: 1,
});

// Critical tier: Minimum cost
client.setAgentPreferences({
  agentId: "agent-critical",
  prioritize: "cost",
  avoidModels: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
  maxCostPerInference: 0.5,
});
```

## Multi-Turn Reasoning

### Preserving Reasoning Context

```typescript
// First turn with reasoning
const turn1 = await client.chat(
  [{ role: "user", content: "Analyze this complex problem..." }],
  {
    model: client.getReasoningModel(),
    reasoning: { enabled: true },
  }
);

// Second turn - continue reasoning
const turn2 = await client.chat(
  [
    { role: "user", content: "Analyze this complex problem..." },
    {
      role: "assistant",
      content: turn1.message.content,
      reasoning_details: turn1.message.reasoning_details, // Preserve!
    },
    { role: "user", content: "Now consider this additional factor..." },
  ],
  {
    model: client.getReasoningModel(),
  }
);
```

## Best Practices

1. **Use helper methods**: `getTradingModel()` and `getReasoningModel()` for clarity
2. **Enable reasoning for complex tasks**: Set `reasoning: { enabled: true }`
3. **Preserve reasoning_details**: Always pass back unmodified in conversation history
4. **Monitor costs**: Use `getCostAnalytics()` regularly
5. **Set agent preferences**: Configure per-agent model preferences based on survival tier
6. **Leverage failover**: Use `ModelFailoverManager` for critical operations
7. **Track metrics**: Monitor failover success rates and latency

## Testing

Run the example to see the configuration in action:

```bash
OPENROUTER_API_KEY=sk-or-... npx tsx ordo/src/openrouter/model-config-example.ts
```

## Summary

- **Primary**: `moonshotai/kimi-k2.5` (reasoning) + `deepseek/deepseek-chat-v3.1` (trading)
- **Fallback**: 4-tier chain for maximum reliability
- **Cost-optimized**: Cheap models in fallback chain
- **Flexible**: Model selection based on task requirements
- **Tracked**: Full cost and token usage analytics
