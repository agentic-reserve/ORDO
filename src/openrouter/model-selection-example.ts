/**
 * Model Selection System - Usage Examples
 *
 * Demonstrates how to use the model selection system to choose
 * the most appropriate AI model based on task requirements and
 * agent preferences.
 */

import { OpenRouterClient } from "./client.js";
import type { TaskRequirements, AgentPreferences } from "./model-selector.js";

/**
 * Example 1: Basic model selection based on task requirements
 */
export async function exampleBasicSelection() {
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    agentId: "agent-001",
  });

  // Select a fast model for quick responses
  const fastModelResult = client.selectModel({
    speed: "fast",
    quality: "medium",
  });

  console.log("Fast model selection:");
  console.log(`  Model: ${fastModelResult.model}`);
  console.log(`  Score: ${fastModelResult.score.toFixed(2)}`);
  console.log(`  Reasoning: ${fastModelResult.reasoning}`);
  console.log(`  Alternatives: ${fastModelResult.alternatives.map((a) => a.model).join(", ")}`);

  // Select a high-quality model for complex tasks
  const qualityModelResult = client.selectModel({
    quality: "high",
    minContextLength: 100000,
  });

  console.log("\nHigh-quality model selection:");
  console.log(`  Model: ${qualityModelResult.model}`);
  console.log(`  Score: ${qualityModelResult.score.toFixed(2)}`);
  console.log(`  Reasoning: ${qualityModelResult.reasoning}`);

  // Select a cost-effective model for budget-conscious tasks
  const cheapModelResult = client.selectModel({
    cost: "cheap",
    speed: "fast",
  });

  console.log("\nCost-effective model selection:");
  console.log(`  Model: ${cheapModelResult.model}`);
  console.log(`  Score: ${cheapModelResult.score.toFixed(2)}`);
  console.log(`  Reasoning: ${cheapModelResult.reasoning}`);
}

/**
 * Example 2: Agent-specific preferences
 */
export async function exampleAgentPreferences() {
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    agentId: "agent-002",
  });

  // Set agent preferences
  const preferences: AgentPreferences = {
    agentId: "agent-002",
    preferredModels: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o"],
    avoidModels: ["meta-llama/llama-3.1-8b-instruct"],
    prioritize: "quality",
    maxCostPerInference: 5, // 5 cents max
  };

  client.setAgentPreferences(preferences);

  // Select model with agent preferences applied
  const result = client.selectModel(
    {
      speed: "medium",
      quality: "high",
    },
    "agent-002",
  );

  console.log("Model selection with agent preferences:");
  console.log(`  Model: ${result.model}`);
  console.log(`  Score: ${result.score.toFixed(2)}`);
  console.log(`  Reasoning: ${result.reasoning}`);

  // Retrieve and display preferences
  const storedPreferences = client.getAgentPreferences("agent-002");
  console.log("\nStored preferences:");
  console.log(`  Preferred models: ${storedPreferences?.preferredModels?.join(", ")}`);
  console.log(`  Avoid models: ${storedPreferences?.avoidModels?.join(", ")}`);
  console.log(`  Prioritize: ${storedPreferences?.prioritize}`);
}

/**
 * Example 3: Different task types with appropriate model selection
 */
export async function exampleTaskBasedSelection() {
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    agentId: "agent-003",
  });

  // Task 1: Quick classification (speed priority)
  const classificationTask: TaskRequirements = {
    speed: "fast",
    quality: "medium",
    cost: "cheap",
  };

  const classificationModel = client.selectModel(classificationTask);
  console.log("Classification task model:");
  console.log(`  ${classificationModel.model} - ${classificationModel.reasoning}`);

  // Task 2: Complex reasoning (quality priority)
  const reasoningTask: TaskRequirements = {
    speed: "medium",
    quality: "high",
    minContextLength: 100000,
  };

  const reasoningModel = client.selectModel(reasoningTask);
  console.log("\nReasoning task model:");
  console.log(`  ${reasoningModel.model} - ${reasoningModel.reasoning}`);

  // Task 3: Long document analysis (context length priority)
  const documentTask: TaskRequirements = {
    minContextLength: 200000,
    quality: "high",
  };

  const documentModel = client.selectModel(documentTask);
  console.log("\nDocument analysis model:");
  console.log(`  ${documentModel.model} - ${documentModel.reasoning}`);

  // Task 4: Batch processing (cost priority)
  const batchTask: TaskRequirements = {
    cost: "cheap",
    speed: "fast",
    quality: "medium",
  };

  const batchModel = client.selectModel(batchTask);
  console.log("\nBatch processing model:");
  console.log(`  ${batchModel.model} - ${batchModel.reasoning}`);
}

/**
 * Example 4: Survival tier-based model selection
 */
export async function exampleSurvivalTierSelection() {
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    agentId: "agent-004",
  });

  // Thriving tier: Can afford high-quality models
  const thrivingPreferences: AgentPreferences = {
    agentId: "agent-004-thriving",
    prioritize: "quality",
  };

  client.setAgentPreferences(thrivingPreferences);

  const thrivingModel = client.selectModel(
    { quality: "high", speed: "fast" },
    "agent-004-thriving",
  );

  console.log("Thriving tier model:");
  console.log(`  ${thrivingModel.model} - ${thrivingModel.reasoning}`);

  // Low compute tier: Must prioritize cost
  const lowComputePreferences: AgentPreferences = {
    agentId: "agent-004-low-compute",
    prioritize: "cost",
    maxCostPerInference: 1, // 1 cent max
  };

  client.setAgentPreferences(lowComputePreferences);

  const lowComputeModel = client.selectModel(
    { cost: "cheap", speed: "fast" },
    "agent-004-low-compute",
  );

  console.log("\nLow compute tier model:");
  console.log(`  ${lowComputeModel.model} - ${lowComputeModel.reasoning}`);

  // Critical tier: Absolute minimum cost
  const criticalPreferences: AgentPreferences = {
    agentId: "agent-004-critical",
    prioritize: "cost",
    avoidModels: [
      "openai/gpt-4o",
      "openai/gpt-4-turbo",
      "anthropic/claude-3.5-sonnet",
    ],
  };

  client.setAgentPreferences(criticalPreferences);

  const criticalModel = client.selectModel(
    { cost: "cheap" },
    "agent-004-critical",
  );

  console.log("\nCritical tier model:");
  console.log(`  ${criticalModel.model} - ${criticalModel.reasoning}`);
}

/**
 * Example 5: Using model selection with actual inference
 */
export async function exampleSelectionWithInference() {
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    agentId: "agent-005",
  });

  // Select model based on task requirements
  const taskRequirements: TaskRequirements = {
    speed: "fast",
    quality: "medium",
    cost: "cheap",
  };

  const selection = client.selectModel(taskRequirements);

  console.log(`Selected model: ${selection.model}`);
  console.log(`Reasoning: ${selection.reasoning}`);

  // Use the selected model for inference
  try {
    const response = await client.chat(
      [
        {
          role: "user",
          content: "What is the capital of France?",
        },
      ],
      {
        model: selection.model,
        maxTokens: 100,
      },
    );

    console.log(`\nResponse from ${response.model}:`);
    console.log(response.message.content);
    console.log(`\nTokens used: ${response.usage.totalTokens}`);
    console.log(`Cost: ${client.getCostTracker().calculateCost(response.usage, response.model).toFixed(4)} cents`);
  } catch (error) {
    console.error("Inference error:", error);
  }
}

/**
 * Example 6: Comparing model selection results
 */
export function exampleCompareSelections() {
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    agentId: "agent-006",
  });

  const scenarios = [
    { name: "Speed-focused", requirements: { speed: "fast" as const } },
    { name: "Quality-focused", requirements: { quality: "high" as const } },
    { name: "Cost-focused", requirements: { cost: "cheap" as const } },
    {
      name: "Balanced",
      requirements: {
        speed: "medium" as const,
        quality: "medium" as const,
        cost: "moderate" as const,
      },
    },
  ];

  console.log("Model selection comparison:\n");

  for (const scenario of scenarios) {
    const result = client.selectModel(scenario.requirements);
    console.log(`${scenario.name}:`);
    console.log(`  Model: ${result.model}`);
    console.log(`  Score: ${result.score.toFixed(2)}`);
    console.log(`  Alternatives: ${result.alternatives.map((a) => `${a.model} (${a.score.toFixed(2)})`).join(", ")}`);
    console.log();
  }
}

// Run examples if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("=== Model Selection Examples ===\n");

  console.log("Example 1: Basic Selection");
  console.log("─".repeat(50));
  await exampleBasicSelection();

  console.log("\n\nExample 2: Agent Preferences");
  console.log("─".repeat(50));
  await exampleAgentPreferences();

  console.log("\n\nExample 3: Task-Based Selection");
  console.log("─".repeat(50));
  await exampleTaskBasedSelection();

  console.log("\n\nExample 4: Survival Tier Selection");
  console.log("─".repeat(50));
  await exampleSurvivalTierSelection();

  console.log("\n\nExample 6: Compare Selections");
  console.log("─".repeat(50));
  exampleCompareSelections();

  // Uncomment to run inference example (requires valid API key)
  // console.log("\n\nExample 5: Selection with Inference");
  // console.log("─".repeat(50));
  // await exampleSelectionWithInference();
}
