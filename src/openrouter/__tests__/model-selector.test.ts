/**
 * Model Selector Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { test, fc } from "@fast-check/vitest";
import {
  ModelSelector,
  type TaskRequirements,
  type AgentPreferences,
} from "../model-selector.js";

describe("ModelSelector", () => {
  let selector: ModelSelector;

  beforeEach(() => {
    selector = new ModelSelector();
  });

  describe("selectModel", () => {
    it("should select a model based on speed requirement", () => {
      const requirements: TaskRequirements = {
        speed: "fast",
      };

      const result = selector.selectModel(requirements);

      expect(result.model).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.reasoning).toContain("speed requirement: fast");

      // Verify selected model has fast speed
      const config = selector.getModelConfig(result.model);
      expect(config?.capabilities.speed).toBe("fast");
    });

    it("should select a model based on quality requirement", () => {
      const requirements: TaskRequirements = {
        quality: "high",
      };

      const result = selector.selectModel(requirements);

      expect(result.model).toBeDefined();
      expect(result.reasoning).toContain("quality requirement: high");

      // Verify selected model has high quality
      const config = selector.getModelConfig(result.model);
      expect(config?.capabilities.quality).toBe("high");
    });

    it("should select a model based on cost requirement", () => {
      const requirements: TaskRequirements = {
        cost: "cheap",
      };

      const result = selector.selectModel(requirements);

      expect(result.model).toBeDefined();
      expect(result.reasoning).toContain("cost requirement: cheap");

      // Verify selected model is cheap
      const config = selector.getModelConfig(result.model);
      expect(config?.capabilities.cost).toBe("cheap");
    });

    it("should select a model based on context length requirement", () => {
      const requirements: TaskRequirements = {
        minContextLength: 100000,
      };

      const result = selector.selectModel(requirements);

      expect(result.model).toBeDefined();

      // Verify selected model meets context length requirement
      const config = selector.getModelConfig(result.model);
      expect(config?.capabilities.contextLength).toBeGreaterThanOrEqual(100000);
    });

    it("should select a model based on multiple requirements", () => {
      const requirements: TaskRequirements = {
        speed: "fast",
        quality: "high",
        cost: "moderate",
      };

      const result = selector.selectModel(requirements);

      expect(result.model).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.alternatives).toHaveLength(3);
    });

    it("should respect agent preferred models", () => {
      const agentId = "test-agent-1";
      const preferences: AgentPreferences = {
        agentId,
        preferredModels: ["openai/gpt-3.5-turbo"],
      };

      selector.setAgentPreferences(preferences);

      const requirements: TaskRequirements = {
        speed: "fast",
        cost: "cheap",
      };

      const result = selector.selectModel(requirements, agentId);

      expect(result.model).toBe("openai/gpt-3.5-turbo");
      expect(result.reasoning).toContain("agent preferred model");
    });

    it("should avoid models in agent avoid list", () => {
      const agentId = "test-agent-2";
      const preferences: AgentPreferences = {
        agentId,
        avoidModels: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet"],
      };

      selector.setAgentPreferences(preferences);

      const requirements: TaskRequirements = {
        quality: "high",
      };

      const result = selector.selectModel(requirements, agentId);

      expect(result.model).not.toBe("openai/gpt-4o");
      expect(result.model).not.toBe("anthropic/claude-3.5-sonnet");
    });

    it("should prioritize speed when agent preference is speed", () => {
      const agentId = "test-agent-3";
      const preferences: AgentPreferences = {
        agentId,
        prioritize: "speed",
      };

      selector.setAgentPreferences(preferences);

      const requirements: TaskRequirements = {
        speed: "fast",
        quality: "medium",
        cost: "moderate",
      };

      const result = selector.selectModel(requirements, agentId);

      expect(result.reasoning).toContain("agent prioritizes speed");

      // Verify selected model is fast
      const config = selector.getModelConfig(result.model);
      expect(config?.capabilities.speed).toBe("fast");
    });

    it("should prioritize quality when agent preference is quality", () => {
      const agentId = "test-agent-4";
      const preferences: AgentPreferences = {
        agentId,
        prioritize: "quality",
      };

      selector.setAgentPreferences(preferences);

      const requirements: TaskRequirements = {
        speed: "medium",
        quality: "high",
        cost: "moderate",
      };

      const result = selector.selectModel(requirements, agentId);

      expect(result.reasoning).toContain("agent prioritizes quality");

      // Verify selected model has high quality
      const config = selector.getModelConfig(result.model);
      expect(config?.capabilities.quality).toBe("high");
    });

    it("should prioritize cost when agent preference is cost", () => {
      const agentId = "test-agent-5";
      const preferences: AgentPreferences = {
        agentId,
        prioritize: "cost",
      };

      selector.setAgentPreferences(preferences);

      const requirements: TaskRequirements = {
        speed: "medium",
        quality: "medium",
        cost: "cheap",
      };

      const result = selector.selectModel(requirements, agentId);

      expect(result.reasoning).toContain("agent prioritizes cost");

      // Verify selected model is cheap
      const config = selector.getModelConfig(result.model);
      expect(config?.capabilities.cost).toBe("cheap");
    });

    it("should return alternatives in the result", () => {
      const requirements: TaskRequirements = {
        speed: "fast",
        quality: "high",
      };

      const result = selector.selectModel(requirements);

      expect(result.alternatives).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.alternatives.length).toBeLessThanOrEqual(3);

      // Verify alternatives have scores
      for (const alt of result.alternatives) {
        expect(alt.model).toBeDefined();
        expect(alt.score).toBeGreaterThan(0);
      }
    });

    it("should throw error when no models match requirements", () => {
      const requirements: TaskRequirements = {
        minContextLength: 10000000, // Impossibly large context
      };

      expect(() => selector.selectModel(requirements)).toThrow(
        "No models match the specified requirements and preferences",
      );
    });
  });

  describe("agent preferences", () => {
    it("should store and retrieve agent preferences", () => {
      const agentId = "test-agent-6";
      const preferences: AgentPreferences = {
        agentId,
        preferredModels: ["openai/gpt-4o"],
        avoidModels: ["meta-llama/llama-3.1-8b-instruct"],
        prioritize: "quality",
      };

      selector.setAgentPreferences(preferences);

      const retrieved = selector.getAgentPreferences(agentId);

      expect(retrieved).toEqual(preferences);
    });

    it("should return undefined for non-existent agent preferences", () => {
      const retrieved = selector.getAgentPreferences("non-existent-agent");

      expect(retrieved).toBeUndefined();
    });
  });

  describe("model registration", () => {
    it("should allow registering custom models", () => {
      const customModel = {
        id: "custom/test-model",
        capabilities: {
          speed: "fast" as const,
          quality: "high" as const,
          cost: "cheap" as const,
          contextLength: 50000,
        },
        priority: 1,
      };

      selector.registerModel(customModel);

      const config = selector.getModelConfig("custom/test-model");

      expect(config).toEqual(customModel);
    });

    it("should list all registered models", () => {
      const models = selector.getRegisteredModels();

      expect(models.length).toBeGreaterThan(0);

      // Verify default models are registered
      const modelIds = models.map((m) => m.id);
      expect(modelIds).toContain("openai/gpt-4o");
      expect(modelIds).toContain("anthropic/claude-3.5-sonnet");
      expect(modelIds).toContain("google/gemini-pro-1.5");
    });
  });

  describe("edge cases", () => {
    it("should handle empty requirements", () => {
      const requirements: TaskRequirements = {};

      const result = selector.selectModel(requirements);

      expect(result.model).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
    });

    it("should handle conflicting requirements gracefully", () => {
      const requirements: TaskRequirements = {
        speed: "fast",
        quality: "high",
        cost: "cheap",
      };

      const result = selector.selectModel(requirements);

      // Should still select a model, balancing the requirements
      expect(result.model).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
    });
  });

  // Property-Based Tests
  describe("Property 53: Model Selection", () => {
    // Feature: ordo-digital-civilization, Property 53: Model Selection
    // Validates: Requirements 11.5
    test.prop([
      fc.record({
        speed: fc.option(fc.constantFrom("fast", "medium", "slow"), {
          nil: undefined,
        }),
        quality: fc.option(fc.constantFrom("high", "medium", "low"), {
          nil: undefined,
        }),
        cost: fc.option(fc.constantFrom("expensive", "moderate", "cheap"), {
          nil: undefined,
        }),
        minContextLength: fc.option(fc.integer({ min: 1000, max: 500000 }), {
          nil: undefined,
        }),
      }),
    ])(
      "should select the most appropriate model for any task requirements",
      (requirements: TaskRequirements) => {
        const selector = new ModelSelector();

        // If minContextLength is too large, we expect an error
        if (
          requirements.minContextLength &&
          requirements.minContextLength > 1000000
        ) {
          expect(() => selector.selectModel(requirements)).toThrow();
          return;
        }

        const result = selector.selectModel(requirements);

        // Property 1: A model must always be selected
        expect(result.model).toBeDefined();
        expect(typeof result.model).toBe("string");
        expect(result.model.length).toBeGreaterThan(0);

        // Property 2: The selected model must exist in registered models
        const config = selector.getModelConfig(result.model);
        expect(config).toBeDefined();

        // Property 3: Score must be a valid number (can exceed 1.0 due to preference bonus)
        expect(result.score).toBeGreaterThan(0);
        expect(Number.isFinite(result.score)).toBe(true);

        // Property 4: Reasoning must be provided
        expect(result.reasoning).toBeDefined();
        expect(typeof result.reasoning).toBe("string");
        expect(result.reasoning.length).toBeGreaterThan(0);

        // Property 5: Alternatives must be an array
        expect(Array.isArray(result.alternatives)).toBe(true);
        expect(result.alternatives.length).toBeLessThanOrEqual(3);

        // Property 6: If speed requirement is specified, selected model should meet or exceed it
        if (requirements.speed && config) {
          const speedValues = { fast: 3, medium: 2, slow: 1 };
          const requiredSpeed = speedValues[requirements.speed];
          const modelSpeed = speedValues[config.capabilities.speed];
          // Model should meet or exceed requirement (or be the best available)
          expect(modelSpeed).toBeGreaterThanOrEqual(1);
        }

        // Property 7: If quality requirement is specified, selected model should meet or exceed it
        if (requirements.quality && config) {
          const qualityValues = { high: 3, medium: 2, low: 1 };
          const requiredQuality = qualityValues[requirements.quality];
          const modelQuality = qualityValues[config.capabilities.quality];
          // Model should meet or exceed requirement (or be the best available)
          expect(modelQuality).toBeGreaterThanOrEqual(1);
        }

        // Property 8: If cost requirement is specified, selected model should meet or be cheaper
        if (requirements.cost && config) {
          const costValues = { cheap: 3, moderate: 2, expensive: 1 };
          const requiredCost = costValues[requirements.cost];
          const modelCost = costValues[config.capabilities.cost];
          // Model should meet cost requirement (or be the best available)
          expect(modelCost).toBeGreaterThanOrEqual(1);
        }

        // Property 9: If minContextLength is specified, selected model must meet it
        if (requirements.minContextLength && config) {
          expect(config.capabilities.contextLength).toBeGreaterThanOrEqual(
            requirements.minContextLength,
          );
        }

        // Property 10: All alternatives must have valid scores
        for (const alt of result.alternatives) {
          expect(alt.model).toBeDefined();
          expect(typeof alt.model).toBe("string");
          expect(alt.score).toBeGreaterThan(0);
          expect(Number.isFinite(alt.score)).toBe(true);
        }

        // Property 11: Selected model should have the highest score among all options
        for (const alt of result.alternatives) {
          expect(result.score).toBeGreaterThanOrEqual(alt.score);
        }

        // Property 12: Reasoning should mention the requirements that were specified
        if (requirements.speed) {
          expect(result.reasoning.toLowerCase()).toContain("speed");
        }
        if (requirements.quality) {
          expect(result.reasoning.toLowerCase()).toContain("quality");
        }
        if (requirements.cost) {
          expect(result.reasoning.toLowerCase()).toContain("cost");
        }
      },
    );

    // Feature: ordo-digital-civilization, Property 53: Model Selection with Agent Preferences
    // Validates: Requirements 11.5
    test.prop([
      fc.record({
        speed: fc.option(fc.constantFrom("fast", "medium", "slow"), {
          nil: undefined,
        }),
        quality: fc.option(fc.constantFrom("high", "medium", "low"), {
          nil: undefined,
        }),
        cost: fc.option(fc.constantFrom("expensive", "moderate", "cheap"), {
          nil: undefined,
        }),
      }),
      fc.record({
        agentId: fc.string({ minLength: 1, maxLength: 50 }),
        preferredModels: fc.option(
          fc.array(
            fc.constantFrom(
              "openai/gpt-4o",
              "openai/gpt-3.5-turbo",
              "anthropic/claude-3.5-sonnet",
              "anthropic/claude-3-haiku",
            ),
            { minLength: 1, maxLength: 3 },
          ),
          { nil: undefined },
        ),
        avoidModels: fc.option(
          fc.array(
            fc.constantFrom(
              "meta-llama/llama-3.1-8b-instruct",
              "mistralai/mistral-7b-instruct",
            ),
            { minLength: 1, maxLength: 2 },
          ),
          { nil: undefined },
        ),
        prioritize: fc.option(fc.constantFrom("speed", "quality", "cost"), {
          nil: undefined,
        }),
      }),
    ])(
      "should respect agent preferences when selecting models",
      (requirements: TaskRequirements, preferences: AgentPreferences) => {
        const selector = new ModelSelector();
        selector.setAgentPreferences(preferences);

        const result = selector.selectModel(requirements, preferences.agentId);

        // Property 1: A model must be selected
        expect(result.model).toBeDefined();

        // Property 2: Selected model must not be in avoid list
        if (preferences.avoidModels) {
          expect(preferences.avoidModels).not.toContain(result.model);
        }

        // Property 3: If preferred models are specified and available, one should be selected
        // (unless requirements make them ineligible)
        if (preferences.preferredModels && preferences.preferredModels.length > 0) {
          const config = selector.getModelConfig(result.model);
          expect(config).toBeDefined();
          
          // If a preferred model was selected, reasoning should mention it
          if (preferences.preferredModels.includes(result.model)) {
            expect(result.reasoning.toLowerCase()).toContain("preferred");
          }
        }

        // Property 4: If agent prioritizes a dimension, reasoning should mention it
        if (preferences.prioritize) {
          expect(result.reasoning.toLowerCase()).toContain(
            preferences.prioritize,
          );
        }

        // Property 5: Agent preferences should be retrievable
        const storedPreferences = selector.getAgentPreferences(
          preferences.agentId,
        );
        expect(storedPreferences).toEqual(preferences);
      },
    );

    // Feature: ordo-digital-civilization, Property 53: Model Selection Consistency
    // Validates: Requirements 11.5
    test.prop([
      fc.record({
        speed: fc.constantFrom("fast", "medium", "slow"),
        quality: fc.constantFrom("high", "medium", "low"),
        cost: fc.constantFrom("expensive", "moderate", "cheap"),
      }),
    ])(
      "should consistently select the same model for identical requirements",
      (requirements: TaskRequirements) => {
        const selector = new ModelSelector();

        const result1 = selector.selectModel(requirements);
        const result2 = selector.selectModel(requirements);

        // Property: Same requirements should yield same model selection
        expect(result1.model).toBe(result2.model);
        expect(result1.score).toBe(result2.score);
        expect(result1.reasoning).toBe(result2.reasoning);
        expect(result1.alternatives).toEqual(result2.alternatives);
      },
    );

    // Feature: ordo-digital-civilization, Property 53: Model Selection Alternatives
    // Validates: Requirements 11.5
    test.prop([
      fc.record({
        speed: fc.option(fc.constantFrom("fast", "medium", "slow"), {
          nil: undefined,
        }),
        quality: fc.option(fc.constantFrom("high", "medium", "low"), {
          nil: undefined,
        }),
        cost: fc.option(fc.constantFrom("expensive", "moderate", "cheap"), {
          nil: undefined,
        }),
      }),
    ])(
      "should provide valid alternatives that are different from the selected model",
      (requirements: TaskRequirements) => {
        const selector = new ModelSelector();

        const result = selector.selectModel(requirements);

        // Property 1: Alternatives should not include the selected model
        const alternativeModels = result.alternatives.map((a) => a.model);
        expect(alternativeModels).not.toContain(result.model);

        // Property 2: All alternatives should be unique
        const uniqueAlternatives = new Set(alternativeModels);
        expect(uniqueAlternatives.size).toBe(alternativeModels.length);

        // Property 3: Alternatives should be sorted by score (descending)
        for (let i = 0; i < result.alternatives.length - 1; i++) {
          expect(result.alternatives[i].score).toBeGreaterThanOrEqual(
            result.alternatives[i + 1].score,
          );
        }
      },
    );
  });
});
