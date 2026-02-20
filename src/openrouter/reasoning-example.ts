/**
 * Reasoning Feature Example
 *
 * Demonstrates how to use the reasoning feature with models that support it
 * (e.g., moonshotai/kimi-k2.5)
 */

import { OpenRouterClient } from "./client.js";
import type { ChatMessage } from "../types/agent.js";

/**
 * Example: Use reasoning with Kimi K2.5 model
 */
export async function reasoningExample() {
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultModel: "moonshotai/kimi-k2.5",
  });

  // First API call with reasoning enabled
  const messages: ChatMessage[] = [
    {
      role: "user",
      content: "How many r's are in the word 'strawberry'?",
    },
  ];

  console.log("First call with reasoning enabled...");
  const response1 = await client.chat(messages, {
    model: "moonshotai/kimi-k2.5",
    reasoning: {
      enabled: true,
    },
  });

  console.log("Response:", response1.message.content);
  console.log("Has reasoning details:", !!response1.message.reasoning_details);

  // Preserve the assistant message with reasoning_details
  const conversationMessages: ChatMessage[] = [
    {
      role: "user",
      content: "How many r's are in the word 'strawberry'?",
    },
    {
      role: "assistant",
      content: response1.message.content,
      reasoning_details: response1.message.reasoning_details, // Pass back unmodified
    },
    {
      role: "user",
      content: "Are you sure? Think carefully.",
    },
  ];

  // Second API call - model continues reasoning from where it left off
  console.log("\nSecond call continuing reasoning...");
  const response2 = await client.chat(conversationMessages, {
    model: "moonshotai/kimi-k2.5",
  });

  console.log("Response:", response2.message.content);
  console.log("Has reasoning details:", !!response2.message.reasoning_details);

  return {
    firstResponse: response1,
    secondResponse: response2,
  };
}

/**
 * Example: Multi-turn reasoning conversation
 */
export async function multiTurnReasoningExample() {
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultModel: "moonshotai/kimi-k2.5",
  });

  const messages: ChatMessage[] = [];

  // Helper to add user message and get response
  async function chat(userMessage: string) {
    messages.push({
      role: "user",
      content: userMessage,
    });

    const response = await client.chat(messages, {
      model: "moonshotai/kimi-k2.5",
      reasoning: {
        enabled: true,
      },
    });

    // Add assistant response to conversation history
    messages.push({
      role: "assistant",
      content: response.message.content,
      reasoning_details: response.message.reasoning_details,
    });

    return response;
  }

  // Turn 1
  console.log("Turn 1: Initial question");
  const response1 = await chat("What is 15 * 23?");
  console.log("Assistant:", response1.message.content);

  // Turn 2
  console.log("\nTurn 2: Follow-up question");
  const response2 = await chat("Now add 100 to that result");
  console.log("Assistant:", response2.message.content);

  // Turn 3
  console.log("\nTurn 3: Verification");
  const response3 = await chat("Can you verify your calculation step by step?");
  console.log("Assistant:", response3.message.content);

  return messages;
}

/**
 * Example: Reasoning for complex problem solving
 */
export async function complexReasoningExample() {
  const client = new OpenRouterClient({
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultModel: "moonshotai/kimi-k2.5",
  });

  const messages: ChatMessage[] = [
    {
      role: "user",
      content: `You are helping an agent optimize its trading strategy. 
      
Given the following data:
- Current portfolio: 10 SOL, 1000 USDC
- Market conditions: SOL price is $150, trending upward
- Risk tolerance: Medium
- Goal: Maximize returns over 7 days

What trading strategy would you recommend? Think through this step by step.`,
    },
  ];

  console.log("Analyzing trading strategy with reasoning...");
  const response = await client.chat(messages, {
    model: "moonshotai/kimi-k2.5",
    reasoning: {
      enabled: true,
    },
  });

  console.log("Strategy recommendation:");
  console.log(response.message.content);
  console.log("\nReasoning was used:", !!response.message.reasoning_details);

  return response;
}

// Run examples if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("=== Reasoning Feature Examples ===\n");

  reasoningExample()
    .then(() => {
      console.log("\n=== Multi-turn Reasoning Example ===\n");
      return multiTurnReasoningExample();
    })
    .then(() => {
      console.log("\n=== Complex Reasoning Example ===\n");
      return complexReasoningExample();
    })
    .then(() => {
      console.log("\n=== All examples completed ===");
    })
    .catch((error) => {
      console.error("Error:", error);
      process.exit(1);
    });
}
