/**
 * Property-Based Tests for Model Failover System
 *
 * Feature: ordo-digital-civilization, Property 50: Model Failover
 * Validates: Requirements 11.2
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { test } from "@fast-check/vitest";
import * as fc from "fast-check";
import { ModelFailoverManager } from "../failover.js";
import { OpenRouterClient } from "../client.js";
import type { ChatMessage, InferenceResponse } from "../../types.js";

// Mock OpenRouterClient
class MockOpenRouterClient {
  private failureMap: Map<string, boolean> = new Map();
  private callCount: Map<string, number> = new Map();

  setModelFailure(model: string, shouldFail: boolean): void {
    this.failureMap.set(model, shouldFail);
  }

  async chat(
    messages: ChatMessage[],
    options?: any,
  ): Promise<InferenceResponse> {
    const model = options?.model || "openai/gpt-4o";
    const count = this.callCount.get(model) || 0;
    this.callCount.set(model, count + 1);

    if (this.failureMap.get(model)) {
      throw new Error(`Model ${model} is unavailable`);
    }

    return {
      id: "test-id",
      model,
      message: {
        role: "assistant",
        content: "Test response",
      },
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      finishReason: "stop",
    };
  }

  getCallCount(model: string): number {
    return this.callCount.get(model) || 0;
  }

  resetCallCounts(): void {
    this.callCount.clear();
  }
}

describe("Model Failover System", () => {
  let mockClient: MockOpenRouterClient;
  let failoverManager: ModelFailoverManager;

  beforeEach(() => {
    mockClient = new MockOpenRouterClient();
    failoverManager = new ModelFailoverManager(
      mockClient as unknown as OpenRouterClient,
    );
  });

  // Property 50: Model Failover
  // For any model unavailability or error, the system should automatically
  // failover to an alternative model with similar capabilities within 1 second.
  test.prop([
    fc.constantFrom(
      "openai/gpt-4o",
      "openai/gpt-4-turbo",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-pro-1.5",
    ),
    fc.array(
      fc.record({
        role: fc.constantFrom("user", "assistant", "system"),
        content: fc.string({ minLength: 1, maxLength: 100 }),
      }),
      { minLength: 1, maxLength: 5 },
    ),
  ])(
    "should failover to alternative model within 1 second when primary fails",
    async (primaryModel, messages) => {
      // Arrange: Make primary model fail
      mockClient.setModelFailure(primaryModel, true);

      const startTime = Date.now();

      // Act: Attempt chat with failover
      const response = await failoverManager.chatWithFailover(
        messages as ChatMessage[],
        { model: primaryModel },
      );

      const latency = Date.now() - startTime;

      // Assert: Failover completed within 1 second
      expect(latency).toBeLessThan(1000);

      // Assert: Response received from a different model
      expect(response.model).not.toBe(primaryModel);

      // Assert: Response is valid
      expect(response.message.content).toBeTruthy();
      expect(response.usage.totalTokens).toBeGreaterThan(0);

      // Assert: Failover event was recorded
      const stats = failoverManager.getFailoverStats();
      expect(stats.totalFailovers).toBeGreaterThan(0);
      expect(stats.successfulFailovers).toBeGreaterThan(0);
    },
  );

  test.prop([
    fc.array(
      fc.record({
        role: fc.constantFrom("user", "assistant", "system"),
        content: fc.string({ minLength: 1, maxLength: 100 }),
      }),
      { minLength: 1, maxLength: 5 },
    ),
  ])(
    "should use primary model when available without failover",
    async (messages) => {
      // Arrange: All models available
      const primaryModel = "openai/gpt-4o";

      // Act
      const response = await failoverManager.chatWithFailover(
        messages as ChatMessage[],
        { model: primaryModel },
      );

      // Assert: Primary model was used
      expect(response.model).toBe(primaryModel);

      // Assert: No failover events recorded
      const stats = failoverManager.getFailoverStats();
      expect(stats.totalFailovers).toBe(0);
    },
  );

  test.prop([
    fc.constantFrom(
      "openai/gpt-4o",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-pro-1.5",
    ),
    fc.array(
      fc.record({
        role: fc.constantFrom("user", "assistant"),
        content: fc.string({ minLength: 1, maxLength: 50 }),
      }),
      { minLength: 1, maxLength: 3 },
    ),
  ])(
    "should track failover success rate accurately",
    async (primaryModel, messages) => {
      // Arrange: Make primary model fail
      mockClient.setModelFailure(primaryModel, true);

      // Act: Perform multiple failovers
      const attempts = 3;
      for (let i = 0; i < attempts; i++) {
        try {
          await failoverManager.chatWithFailover(messages as ChatMessage[], {
            model: primaryModel,
          });
        } catch (error) {
          // Some failovers might fail if all alternatives are down
        }
      }

      // Assert: Stats are tracked
      const stats = failoverManager.getFailoverStats();
      expect(stats.totalFailovers).toBeGreaterThan(0);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.successRate).toBeLessThanOrEqual(1);
      expect(stats.averageLatency).toBeGreaterThanOrEqual(0);
    },
  );

  test.prop([
    fc.constantFrom(
      "openai/gpt-4o",
      "openai/gpt-4-turbo",
      "anthropic/claude-3.5-sonnet",
    ),
  ])("should mark unavailable models and retry later", async (primaryModel) => {
    // Arrange: Make model fail
    mockClient.setModelFailure(primaryModel, true);

    // Act: Trigger failover
    try {
      await failoverManager.chatWithFailover(
        [{ role: "user", content: "test" }],
        { model: primaryModel },
      );
    } catch (error) {
      // Expected if all models fail
    }

    // Assert: Model is marked as unavailable
    expect(failoverManager.isModelAvailable(primaryModel)).toBe(false);

    // Note: In production, model availability resets after 5 minutes
    // This is tested separately with time mocking
  });

  test.prop([
    fc.array(
      fc.record({
        role: fc.constantFrom("user", "assistant"),
        content: fc.string({ minLength: 1, maxLength: 100 }),
      }),
      { minLength: 1, maxLength: 5 },
    ),
  ])(
    "should select fallback models with similar capabilities",
    async (messages) => {
      // Arrange: Make high-quality model fail
      const primaryModel = "openai/gpt-4o"; // High quality, expensive
      mockClient.setModelFailure(primaryModel, true);

      // Act
      const response = await failoverManager.chatWithFailover(
        messages as ChatMessage[],
        { model: primaryModel },
      );

      // Assert: Fallback model should also be high quality
      // (claude-3.5-sonnet or gpt-4-turbo, not gpt-3.5-turbo)
      expect(response.model).toMatch(
        /(claude-3\.5-sonnet|gpt-4-turbo|gemini-pro)/,
      );
    },
  );

  it("should record failover events with correct metadata", async () => {
    // Arrange
    const primaryModel = "openai/gpt-4o";
    mockClient.setModelFailure(primaryModel, true);

    // Act
    await failoverManager.chatWithFailover(
      [{ role: "user", content: "test" }],
      { model: primaryModel },
    );

    // Assert
    const events = failoverManager.getFailoverEvents(1);
    expect(events).toHaveLength(1);

    const event = events[0];
    expect(event.primaryModel).toBe(primaryModel);
    expect(event.fallbackModel).toBeTruthy();
    expect(event.fallbackModel).not.toBe(primaryModel);
    expect(event.success).toBe(true);
    expect(event.latency).toBeGreaterThanOrEqual(0); // Latency can be 0ms for fast mocks
    expect(event.reason).toContain("unavailable");
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it("should throw error when all models fail", async () => {
    // Arrange: Make all models fail
    mockClient.setModelFailure("openai/gpt-4o", true);
    mockClient.setModelFailure("openai/gpt-4-turbo", true);
    mockClient.setModelFailure("anthropic/claude-3.5-sonnet", true);
    mockClient.setModelFailure("google/gemini-pro-1.5", true);
    mockClient.setModelFailure("openai/gpt-3.5-turbo", true);
    mockClient.setModelFailure("anthropic/claude-3-haiku", true);
    mockClient.setModelFailure("meta-llama/llama-3.1-70b-instruct", true);

    // Act & Assert
    await expect(
      failoverManager.chatWithFailover([{ role: "user", content: "test" }], {
        model: "openai/gpt-4o",
      }),
    ).rejects.toThrow(/All models failed/);

    // Assert: Failed failover is recorded
    const stats = failoverManager.getFailoverStats();
    expect(stats.failedFailovers).toBeGreaterThan(0);
  });

  it("should clear failover history", async () => {
    // Arrange: Create some failover events
    mockClient.setModelFailure("openai/gpt-4o", true);
    await failoverManager.chatWithFailover(
      [{ role: "user", content: "test" }],
      { model: "openai/gpt-4o" },
    );

    // Act
    failoverManager.clearFailoverHistory();

    // Assert
    const stats = failoverManager.getFailoverStats();
    expect(stats.totalFailovers).toBe(0);
    expect(stats.successfulFailovers).toBe(0);
    expect(stats.failedFailovers).toBe(0);
  });

  it("should reset model availability", () => {
    // Arrange: Mark some models as unavailable
    mockClient.setModelFailure("openai/gpt-4o", true);
    failoverManager.chatWithFailover(
      [{ role: "user", content: "test" }],
      { model: "openai/gpt-4o" },
    );

    // Act
    failoverManager.resetModelAvailability();

    // Assert: All models should be available again
    expect(failoverManager.isModelAvailable("openai/gpt-4o")).toBe(true);
    expect(failoverManager.isModelAvailable("anthropic/claude-3.5-sonnet")).toBe(
      true,
    );
  });
});
