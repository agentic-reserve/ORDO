/**
 * Cost Tracking Integration Example
 *
 * Demonstrates how to use the cost tracking system with OpenRouter client
 * and persist data to the database.
 */

import { OpenRouterClient } from "./client.js";
import { createDatabase } from "../state/database.js";
import type { ChatMessage } from "../types.js";

/**
 * Example: Track costs for a single agent
 */
export async function trackAgentCosts() {
  // Initialize OpenRouter client with agent ID
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    agentId: "agent-123",
    defaultModel: "openai/gpt-4o",
  });

  // Initialize database
  const db = createDatabase("./agent-state.db");

  // Make some inference calls
  const messages: ChatMessage[] = [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the capital of France?" },
  ];

  const response = await client.chat(messages);

  console.log("Response:", response.message.content);
  console.log("Token usage:", response.usage);

  // Get cost analytics from the client
  const analytics = client.getCostAnalytics();
  console.log("\nCost Analytics:");
  console.log("- Total cost:", analytics.totalCost, "cents");
  console.log("- Total tokens:", analytics.totalTokens);
  console.log("- Total inferences:", analytics.totalInferences);
  console.log("- Average cost per inference:", analytics.averageCostPerInference, "cents");
  console.log("- Average tokens per inference:", analytics.averageTokensPerInference);
  console.log("- Average latency:", analytics.averageLatency, "ms");

  // Get cost breakdown by model
  const costByModel = client.getCostByModel();
  console.log("\nCost by Model:");
  for (const [model, cost] of costByModel.entries()) {
    console.log(`- ${model}: ${cost} cents`);
  }

  // Persist cost records to database
  const costTracker = client.getCostTracker();
  const records = costTracker.getRecordsByAgent("agent-123");

  for (const record of records) {
    db.insertInferenceCost(record);
  }

  // Query costs from database
  const dbCosts = db.getInferenceCosts("agent-123");
  console.log("\nCosts from database:", dbCosts.length, "records");

  const totalCost = db.getTotalInferenceCost("agent-123");
  console.log("Total cost from database:", totalCost, "cents");

  db.close();
}

/**
 * Example: Compare costs across multiple models
 */
export async function compareModelCosts() {
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    agentId: "agent-456",
  });

  const messages: ChatMessage[] = [
    { role: "user", content: "Explain quantum computing in simple terms." },
  ];

  // Test different models
  const models = [
    "openai/gpt-4o",
    "openai/gpt-3.5-turbo",
    "anthropic/claude-3-haiku",
  ];

  console.log("Comparing costs across models...\n");

  for (const model of models) {
    try {
      const response = await client.chat(messages, { model });

      const costTracker = client.getCostTracker();
      const cost = costTracker.calculateCost(response.usage, model);

      console.log(`Model: ${model}`);
      console.log(`- Tokens: ${response.usage.totalTokens}`);
      console.log(`- Cost: ${cost.toFixed(4)} cents`);
      console.log(`- Cost per 1K tokens: ${((cost / response.usage.totalTokens) * 1000).toFixed(4)} cents`);
      console.log();
    } catch (error) {
      console.error(`Error with ${model}:`, error);
    }
  }

  // Get the most cost-effective model
  const costTracker = client.getCostTracker();
  const mostEffective = costTracker.getMostCostEffectiveModel();
  console.log("Most cost-effective model:", mostEffective);
}

/**
 * Example: Monitor costs over time
 */
export async function monitorCostsOverTime() {
  const db = createDatabase("./agent-state.db");

  // Get all inference costs for an agent
  const costs = db.getInferenceCosts("agent-123", 100);

  console.log("Cost History:");
  console.log("- Total records:", costs.length);

  // Calculate daily costs
  const dailyCosts = new Map<string, number>();

  for (const cost of costs) {
    const date = cost.timestamp.split("T")[0]; // Extract date
    dailyCosts.set(date, (dailyCosts.get(date) || 0) + cost.costCents);
  }

  console.log("\nDaily Costs:");
  for (const [date, cost] of dailyCosts.entries()) {
    console.log(`- ${date}: ${cost.toFixed(2)} cents`);
  }

  // Get costs by model
  const modelCosts = new Map<string, number>();

  for (const cost of costs) {
    modelCosts.set(cost.model, (modelCosts.get(cost.model) || 0) + cost.costCents);
  }

  console.log("\nCosts by Model:");
  for (const [model, cost] of modelCosts.entries()) {
    console.log(`- ${model}: ${cost.toFixed(2)} cents`);
  }

  db.close();
}

/**
 * Example: Set budget alerts
 */
export async function budgetAlerts() {
  const db = createDatabase("./agent-state.db");
  const agentId = "agent-123";
  const dailyBudgetCents = 10; // $0.10 per day

  // Get today's costs
  const today = new Date().toISOString().split("T")[0];
  const allCosts = db.getInferenceCosts(agentId);

  const todayCosts = allCosts.filter((cost) =>
    cost.timestamp.startsWith(today),
  );

  const todayTotal = todayCosts.reduce((sum, cost) => sum + cost.costCents, 0);

  console.log(`Today's costs: ${todayTotal.toFixed(2)} cents`);
  console.log(`Daily budget: ${dailyBudgetCents} cents`);
  console.log(`Remaining: ${(dailyBudgetCents - todayTotal).toFixed(2)} cents`);

  if (todayTotal >= dailyBudgetCents) {
    console.log("\n⚠️  ALERT: Daily budget exceeded!");
  } else if (todayTotal >= dailyBudgetCents * 0.8) {
    console.log("\n⚠️  WARNING: 80% of daily budget used");
  } else {
    console.log("\n✓ Budget OK");
  }

  db.close();
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("=== Cost Tracking Examples ===\n");

  // Uncomment to run examples:
  // await trackAgentCosts();
  // await compareModelCosts();
  // await monitorCostsOverTime();
  // await budgetAlerts();
}
