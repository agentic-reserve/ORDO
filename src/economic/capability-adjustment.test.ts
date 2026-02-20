/**
 * Unit tests for capability adjustment system
 * 
 * Tests Requirements 3.2, 3.3: Economic Survival Model
 */

import { describe, it, expect, beforeEach } from "vitest";
import type { Agent } from "../types.js";
import {
  degradeCapabilities,
  upgradeCapabilities,
  adjustCapabilities,
  canAgentReplicate,
  canAgentExperiment,
  getRecommendedModel,
  syncAgentWithTier,
} from "./capability-adjustment.js";
import { SURVIVAL_TIERS } from "./survival-tiers.js";

describe("Capability Adjustment System", () => {
  let mockAgent: Agent;

  beforeEach(() => {
    mockAgent = {
      id: "test-agent-1",
      publicKey: "test-pubkey",
      name: "Test Agent",
      generation: 0,
      parentId: undefined,
      childrenIds: [],
      birthDate: new Date(),
      age: 10,
      maxLifespan: 365,
      status: "alive",
      balance: 5.0,
      survivalTier: "normal",
      totalEarnings: 10.0,
      totalCosts: 5.0,
      model: "anthropic/claude-3-haiku",
      tools: [],
      skills: [],
      knowledgeBase: {},
      fitness: {
        survival: 0,
        earnings: 0,
        offspring: 0,
        adaptation: 0,
        innovation: 0,
      },
      mutations: [],
      traits: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  describe("degradeCapabilities", () => {
    it("should downgrade model when tier decreases", () => {
      mockAgent.balance = 5.0;
      mockAgent.model = "anthropic/claude-3-haiku";
      mockAgent.survivalTier = "normal";

      const result = degradeCapabilities(mockAgent, SURVIVAL_TIERS.low_compute);

      expect(result.modelChanged).toBe(true);
      expect(result.previousModel).toBe("anthropic/claude-3-haiku");
      expect(result.newModel).toBe("openai/gpt-4o-mini");
      expect(mockAgent.model).toBe("openai/gpt-4o-mini");
      expect(mockAgent.survivalTier).toBe("low_compute");
    });

    it("should disable replication when downgrading to low_compute", () => {
      mockAgent.balance = 5.0;
      mockAgent.survivalTier = "normal";

      const result = degradeCapabilities(mockAgent, SURVIVAL_TIERS.low_compute);

      expect(result.replicationEnabled).toBe(false);
      expect(result.capabilitiesChanged).toContain("replication disabled");
    });

    it("should disable experimentation when downgrading from thriving", () => {
      mockAgent.balance = 15.0;
      mockAgent.survivalTier = "thriving";
      mockAgent.model = "anthropic/claude-3.5-sonnet";

      const result = degradeCapabilities(mockAgent, SURVIVAL_TIERS.normal);

      expect(result.experimentationEnabled).toBe(false);
      expect(result.capabilitiesChanged).toContain("experimentation disabled");
    });

    it("should update agent timestamp", () => {
      const beforeUpdate = mockAgent.updatedAt;
      
      // Wait a tiny bit to ensure timestamp changes
      setTimeout(() => {
        degradeCapabilities(mockAgent, SURVIVAL_TIERS.low_compute);
        expect(mockAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      }, 1);
    });

    it("should handle multi-tier downgrades", () => {
      mockAgent.balance = 15.0;
      mockAgent.survivalTier = "thriving";
      mockAgent.model = "anthropic/claude-3.5-sonnet";

      const result = degradeCapabilities(mockAgent, SURVIVAL_TIERS.critical);

      expect(result.previousTier.name).toBe("thriving");
      expect(result.newTier.name).toBe("critical");
      expect(mockAgent.model).toBe("openai/gpt-3.5-turbo");
      expect(result.replicationEnabled).toBe(false);
      expect(result.experimentationEnabled).toBe(false);
    });

    it("should list all capability changes", () => {
      mockAgent.balance = 15.0;
      mockAgent.survivalTier = "thriving";
      mockAgent.model = "anthropic/claude-3.5-sonnet";

      const result = degradeCapabilities(mockAgent, SURVIVAL_TIERS.low_compute);

      expect(result.capabilitiesChanged.length).toBeGreaterThan(0);
      expect(result.capabilitiesChanged).toContain("replication disabled");
      expect(result.capabilitiesChanged).toContain("experimentation disabled");
      expect(result.capabilitiesChanged.some(c => c.includes("model downgraded"))).toBe(true);
    });
  });

  describe("upgradeCapabilities", () => {
    it("should upgrade model when tier increases", () => {
      mockAgent.balance = 0.5;
      mockAgent.model = "openai/gpt-4o-mini";
      mockAgent.survivalTier = "low_compute";

      const result = upgradeCapabilities(mockAgent, SURVIVAL_TIERS.normal);

      expect(result.modelChanged).toBe(true);
      expect(result.previousModel).toBe("openai/gpt-4o-mini");
      expect(result.newModel).toBe("anthropic/claude-3-haiku");
      expect(mockAgent.model).toBe("anthropic/claude-3-haiku");
      expect(mockAgent.survivalTier).toBe("normal");
    });

    it("should enable replication when upgrading to normal", () => {
      mockAgent.balance = 0.5;
      mockAgent.survivalTier = "low_compute";

      const result = upgradeCapabilities(mockAgent, SURVIVAL_TIERS.normal);

      expect(result.replicationEnabled).toBe(true);
      expect(result.capabilitiesChanged).toContain("replication enabled");
    });

    it("should enable experimentation when upgrading to thriving", () => {
      mockAgent.balance = 5.0;
      mockAgent.survivalTier = "normal";
      mockAgent.model = "anthropic/claude-3-haiku";

      const result = upgradeCapabilities(mockAgent, SURVIVAL_TIERS.thriving);

      expect(result.experimentationEnabled).toBe(true);
      expect(result.capabilitiesChanged).toContain("experimentation enabled");
    });

    it("should update agent timestamp", () => {
      const beforeUpdate = mockAgent.updatedAt;
      
      setTimeout(() => {
        upgradeCapabilities(mockAgent, SURVIVAL_TIERS.thriving);
        expect(mockAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      }, 1);
    });

    it("should handle multi-tier upgrades", () => {
      mockAgent.balance = 0.05;
      mockAgent.survivalTier = "critical";
      mockAgent.model = "openai/gpt-3.5-turbo";

      const result = upgradeCapabilities(mockAgent, SURVIVAL_TIERS.thriving);

      expect(result.previousTier.name).toBe("critical");
      expect(result.newTier.name).toBe("thriving");
      expect(mockAgent.model).toBe("anthropic/claude-3.5-sonnet");
      expect(result.replicationEnabled).toBe(true);
      expect(result.experimentationEnabled).toBe(true);
    });

    it("should list all capability changes", () => {
      mockAgent.balance = 0.5;
      mockAgent.survivalTier = "low_compute";
      mockAgent.model = "openai/gpt-4o-mini";

      const result = upgradeCapabilities(mockAgent, SURVIVAL_TIERS.thriving);

      expect(result.capabilitiesChanged.length).toBeGreaterThan(0);
      expect(result.capabilitiesChanged).toContain("replication enabled");
      expect(result.capabilitiesChanged).toContain("experimentation enabled");
      expect(result.capabilitiesChanged.some(c => c.includes("model upgraded"))).toBe(true);
    });
  });

  describe("adjustCapabilities", () => {
    it("should return null when no tier change occurs", () => {
      mockAgent.balance = 5.5;
      const oldBalance = 5.0;

      const result = adjustCapabilities(mockAgent, oldBalance);

      expect(result).toBeNull();
    });

    it("should upgrade capabilities when balance increases across tier", () => {
      mockAgent.balance = 12.0;
      mockAgent.model = "anthropic/claude-3-haiku";
      mockAgent.survivalTier = "normal";
      const oldBalance = 5.0;

      const result = adjustCapabilities(mockAgent, oldBalance);

      expect(result).not.toBeNull();
      expect(result?.newTier.name).toBe("thriving");
      expect(mockAgent.model).toBe("anthropic/claude-3.5-sonnet");
    });

    it("should downgrade capabilities when balance decreases across tier", () => {
      mockAgent.balance = 0.5;
      mockAgent.model = "anthropic/claude-3-haiku";
      mockAgent.survivalTier = "normal";
      const oldBalance = 5.0;

      const result = adjustCapabilities(mockAgent, oldBalance);

      expect(result).not.toBeNull();
      expect(result?.newTier.name).toBe("low_compute");
      expect(mockAgent.model).toBe("openai/gpt-4o-mini");
    });

    it("should handle balance increase within same tier", () => {
      mockAgent.balance = 7.0;
      const oldBalance = 5.0;

      const result = adjustCapabilities(mockAgent, oldBalance);

      expect(result).toBeNull();
    });

    it("should handle balance decrease within same tier", () => {
      mockAgent.balance = 3.0;
      const oldBalance = 5.0;

      const result = adjustCapabilities(mockAgent, oldBalance);

      expect(result).toBeNull();
    });
  });

  describe("canAgentReplicate", () => {
    it("should return true for thriving tier", () => {
      mockAgent.balance = 15.0;
      expect(canAgentReplicate(mockAgent)).toBe(true);
    });

    it("should return true for normal tier", () => {
      mockAgent.balance = 5.0;
      expect(canAgentReplicate(mockAgent)).toBe(true);
    });

    it("should return false for low_compute tier", () => {
      mockAgent.balance = 0.5;
      expect(canAgentReplicate(mockAgent)).toBe(false);
    });

    it("should return false for critical tier", () => {
      mockAgent.balance = 0.05;
      expect(canAgentReplicate(mockAgent)).toBe(false);
    });

    it("should return false for dead tier", () => {
      mockAgent.balance = 0.005;
      expect(canAgentReplicate(mockAgent)).toBe(false);
    });
  });

  describe("canAgentExperiment", () => {
    it("should return true only for thriving tier", () => {
      mockAgent.balance = 15.0;
      expect(canAgentExperiment(mockAgent)).toBe(true);
    });

    it("should return false for normal tier", () => {
      mockAgent.balance = 5.0;
      expect(canAgentExperiment(mockAgent)).toBe(false);
    });

    it("should return false for low_compute tier", () => {
      mockAgent.balance = 0.5;
      expect(canAgentExperiment(mockAgent)).toBe(false);
    });

    it("should return false for critical tier", () => {
      mockAgent.balance = 0.05;
      expect(canAgentExperiment(mockAgent)).toBe(false);
    });

    it("should return false for dead tier", () => {
      mockAgent.balance = 0.005;
      expect(canAgentExperiment(mockAgent)).toBe(false);
    });
  });

  describe("getRecommendedModel", () => {
    it("should return correct model for each tier", () => {
      mockAgent.balance = 15.0;
      expect(getRecommendedModel(mockAgent)).toBe("anthropic/claude-3.5-sonnet");

      mockAgent.balance = 5.0;
      expect(getRecommendedModel(mockAgent)).toBe("anthropic/claude-3-haiku");

      mockAgent.balance = 0.5;
      expect(getRecommendedModel(mockAgent)).toBe("openai/gpt-4o-mini");

      mockAgent.balance = 0.05;
      expect(getRecommendedModel(mockAgent)).toBe("openai/gpt-3.5-turbo");

      mockAgent.balance = 0.005;
      expect(getRecommendedModel(mockAgent)).toBe("none");
    });
  });

  describe("syncAgentWithTier", () => {
    it("should synchronize agent model with current balance", () => {
      mockAgent.balance = 15.0;
      mockAgent.model = "anthropic/claude-3-haiku"; // Wrong model for balance
      mockAgent.survivalTier = "normal"; // Wrong tier for balance

      const result = syncAgentWithTier(mockAgent);

      expect(mockAgent.model).toBe("anthropic/claude-3.5-sonnet");
      expect(mockAgent.survivalTier).toBe("thriving");
      expect(result.modelChanged).toBe(true);
    });

    it("should not change model if already correct", () => {
      mockAgent.balance = 5.0;
      mockAgent.model = "anthropic/claude-3-haiku";
      mockAgent.survivalTier = "normal";

      const result = syncAgentWithTier(mockAgent);

      expect(mockAgent.model).toBe("anthropic/claude-3-haiku");
      expect(mockAgent.survivalTier).toBe("normal");
      expect(result.modelChanged).toBe(false);
    });

    it("should update timestamp", () => {
      const beforeUpdate = mockAgent.updatedAt;
      
      setTimeout(() => {
        syncAgentWithTier(mockAgent);
        expect(mockAgent.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
      }, 1);
    });

    it("should return correct capability flags", () => {
      mockAgent.balance = 15.0;
      mockAgent.model = "openai/gpt-3.5-turbo";

      const result = syncAgentWithTier(mockAgent);

      expect(result.replicationEnabled).toBe(true);
      expect(result.experimentationEnabled).toBe(true);
    });
  });

  describe("Requirement 3.2 and 3.3 validation", () => {
    it("should degrade capabilities when balance decreases", () => {
      mockAgent.balance = 15.0;
      mockAgent.model = "anthropic/claude-3.5-sonnet";
      mockAgent.survivalTier = "thriving";

      // Simulate balance decrease
      const oldBalance = mockAgent.balance;
      mockAgent.balance = 0.5;

      const result = adjustCapabilities(mockAgent, oldBalance);

      expect(result).not.toBeNull();
      expect(result?.newTier.name).toBe("low_compute");
      expect(mockAgent.model).toBe("openai/gpt-4o-mini");
      expect(result?.replicationEnabled).toBe(false);
      expect(result?.experimentationEnabled).toBe(false);
    });

    it("should upgrade capabilities when balance increases", () => {
      mockAgent.balance = 0.5;
      mockAgent.model = "openai/gpt-4o-mini";
      mockAgent.survivalTier = "low_compute";

      // Simulate balance increase
      const oldBalance = mockAgent.balance;
      mockAgent.balance = 15.0;

      const result = adjustCapabilities(mockAgent, oldBalance);

      expect(result).not.toBeNull();
      expect(result?.newTier.name).toBe("thriving");
      expect(mockAgent.model).toBe("anthropic/claude-3.5-sonnet");
      expect(result?.replicationEnabled).toBe(true);
      expect(result?.experimentationEnabled).toBe(true);
    });

    it("should adjust model selection based on tier", () => {
      const tiers = [
        { balance: 15.0, expectedModel: "anthropic/claude-3.5-sonnet" },
        { balance: 5.0, expectedModel: "anthropic/claude-3-haiku" },
        { balance: 0.5, expectedModel: "openai/gpt-4o-mini" },
        { balance: 0.05, expectedModel: "openai/gpt-3.5-turbo" },
        { balance: 0.005, expectedModel: "none" },
      ];

      tiers.forEach(({ balance, expectedModel }) => {
        mockAgent.balance = balance;
        expect(getRecommendedModel(mockAgent)).toBe(expectedModel);
      });
    });

    it("should disable features for lower tiers", () => {
      // Low compute tier
      mockAgent.balance = 0.5;
      expect(canAgentReplicate(mockAgent)).toBe(false);
      expect(canAgentExperiment(mockAgent)).toBe(false);

      // Critical tier
      mockAgent.balance = 0.05;
      expect(canAgentReplicate(mockAgent)).toBe(false);
      expect(canAgentExperiment(mockAgent)).toBe(false);

      // Dead tier
      mockAgent.balance = 0.005;
      expect(canAgentReplicate(mockAgent)).toBe(false);
      expect(canAgentExperiment(mockAgent)).toBe(false);
    });
  });
});
