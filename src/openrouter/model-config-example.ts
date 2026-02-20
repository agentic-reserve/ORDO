/**
 * Model Configuration Examples
 *
 * Demonstrates the configured model setup:
 * - Primary: moonshotai/kimi-k2.5 (reasoning support)
 * - Trading: deepseek/deepseek-chat-v3.1 (fast, cost-effective)
 * - Fallback chain: openai/gpt-5-mini → google/gemini-3-flash-preview
 */

import { OpenRouterClient } from "./client.js";
import { ModelFailoverManager } from "./failover.js";

async function main() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable is required");
  }

  // Initialize client with default reasoning model
  const client = new OpenRouterClient({
    apiKey,
    agentId: "ordo-agent",
    defaultModel: "moonshotai/kimi-k2.5", // Primary model with reasoning
  });

  console.log("=== Model Configuration Examples ===\n");

  // Example 1: Using the default reasoning model
  console.log("1. Default Reasoning Model (Moonshot Kimi K2.5)");
  console.log("   Model:", client.getReasoningModel());
  
  const reasoningResponse = await client.chat(
    [
      {
        role: "user",
        content: "Explain the concept of recursive self-improvement in AI systems.",
      },
    ],
    {
      model: client.getReasoningModel(),
      reasoning: { enabled: true }, // Enable extended reasoning
    }
  );

  console.log("   Response:", reasoningResponse.message.content.slice(0, 200) + "...");
  console.log("   Has reasoning:", !!reasoningResponse.message.reasoning_details);
  console.log("   Tokens:", reasoningResponse.usage.totalTokens);
  console.log();

  // Example 2: Using the trading model
  console.log("2. Trading Model (DeepSeek Chat v3.1)");
  console.log("   Model:", client.getTradingModel());
  
  const tradingResponse = await client.chat(
    [
      {
        role: "user",
        content: "Analyze SOL/USDC market: Current price $150, 24h volume $2.5B, RSI 65. Quick assessment?",
      },
    ],
    {
      model: client.getTradingModel(), // Fast, cost-effective for trading
    }
  );

  console.log("   Response:", tradingResponse.message.content.slice(0, 200) + "...");
  console.log("   Tokens:", tradingResponse.usage.totalTokens);
  console.log();

  // Example 3: Automatic failover with configured chain
  console.log("3. Automatic Failover (4-tier chain)");
  
  const failoverManager = new ModelFailoverManager(client);
  
  // Get the configured fallback chain
  const fallbackChain = failoverManager.getFallbackChain("moonshotai/kimi-k2.5");
  console.log("   Fallback chain:");
  console.log("     1. openai/gpt-5-mini");
  console.log("     2. google/gemini-3-flash-preview");
  console.log("     3. google/gemini-2.5-flash");
  console.log("     4. openai/gpt-oss-120b");
  
  try {
    const failoverResponse = await failoverManager.chatWithFailover(
      [{ role: "user", content: "Hello!" }],
      { model: "moonshotai/kimi-k2.5" }
    );
    console.log("   Primary model succeeded");
  } catch (error) {
    console.log("   Failover triggered:", error);
  }
  console.log();

  // Example 4: Multi-turn reasoning conversation
  console.log("4. Multi-Turn Reasoning Conversation");
  
  // First turn with reasoning
  const turn1 = await client.chat(
    [
      {
        role: "user",
        content: "Design a meta-learning system for an AI agent. Think step by step.",
      },
    ],
    {
      model: client.getReasoningModel(),
      reasoning: { enabled: true },
    }
  );

  console.log("   Turn 1 response:", turn1.message.content.slice(0, 150) + "...");
  console.log("   Has reasoning details:", !!turn1.message.reasoning_details);

  // Second turn - continue reasoning
  const turn2 = await client.chat(
    [
      {
        role: "user",
        content: "Design a meta-learning system for an AI agent. Think step by step.",
      },
      {
        role: "assistant",
        content: turn1.message.content,
        reasoning_details: turn1.message.reasoning_details, // Preserve reasoning
      },
      {
        role: "user",
        content: "Now add a strategy evaluation component. How would you implement it?",
      },
    ],
    {
      model: client.getReasoningModel(),
    }
  );

  console.log("   Turn 2 response:", turn2.message.content.slice(0, 150) + "...");
  console.log();

  // Example 5: Model selection based on task requirements
  console.log("5. Intelligent Model Selection");
  
  // Fast trading decision
  const tradingSelection = client.selectModel({
    speed: "fast",
    quality: "high",
    cost: "cheap",
  });
  console.log("   Trading task selected:", tradingSelection.model);
  console.log("   Reasoning:", tradingSelection.reasoning);

  // Complex reasoning task
  const reasoningSelection = client.selectModel({
    quality: "high",
    minContextLength: 100000,
  });
  console.log("   Reasoning task selected:", reasoningSelection.model);
  console.log("   Reasoning:", reasoningSelection.reasoning);
  console.log();

  // Example 6: Cost tracking across models
  console.log("6. Cost Tracking");
  
  const analytics = client.getCostAnalytics();
  console.log("   Total cost:", analytics.totalCost.toFixed(4), "cents");
  console.log("   Total tokens:", analytics.totalTokens);
  console.log("   Average cost per inference:", analytics.averageCostPerInference.toFixed(4), "cents");
  
  const costByModel = client.getCostByModel();
  console.log("   Cost by model:");
  for (const [model, cost] of costByModel.entries()) {
    console.log(`     ${model}: ${cost.toFixed(4)} cents`);
  }
  console.log();

  // Example 7: Agent-specific preferences
  console.log("7. Agent-Specific Preferences");
  
  client.setAgentPreferences({
    agentId: "ordo-agent",
    preferredModels: ["moonshotai/kimi-k2.5", "deepseek/deepseek-chat-v3.1"],
    prioritize: "quality",
    maxCostPerInference: 10, // 10 cents max
  });

  const preferredSelection = client.selectModel(
    {
      quality: "high",
      speed: "medium",
    },
    "ordo-agent"
  );
  console.log("   Selected with preferences:", preferredSelection.model);
  console.log("   Reasoning:", preferredSelection.reasoning);
  console.log();

  // Example 8: Failover statistics
  console.log("8. Failover Statistics");
  
  const failoverStats = failoverManager.getFailoverStats();
  console.log("   Total failovers:", failoverStats.totalFailovers);
  console.log("   Success rate:", (failoverStats.successRate * 100).toFixed(1) + "%");
  console.log("   Average latency:", failoverStats.averageLatency.toFixed(0) + "ms");
  console.log();

  console.log("=== Configuration Summary ===");
  console.log("Primary Model:", client.getReasoningModel());
  console.log("Trading Model:", client.getTradingModel());
  console.log("Fallback Chain:");
  console.log("  1. openai/gpt-5-mini");
  console.log("  2. google/gemini-3-flash-preview");
  console.log("  3. google/gemini-2.5-flash");
  console.log("  4. openai/gpt-oss-120b");
  console.log("\nAll examples completed successfully!");
}

main().catch(console.error);
