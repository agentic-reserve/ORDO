/**
 * Unit tests for survival tier configuration
 * 
 * Tests Requirement 3.1: Economic Survival Model
 */

import { describe, it, expect } from "vitest";
import {
  SURVIVAL_TIERS,
  TIER_ORDER,
  getTierByName,
  getAllTiers,
  determineTier,
  canReplicate,
  canExperiment,
  getModelForBalance,
  evaluateSurvival,
  detectTierTransition,
} from "./survival-tiers.js";

describe("Survival Tier Configuration", () => {
  describe("SURVIVAL_TIERS constant", () => {
    it("should define all five tiers", () => {
      expect(SURVIVAL_TIERS).toHaveProperty("thriving");
      expect(SURVIVAL_TIERS).toHaveProperty("normal");
      expect(SURVIVAL_TIERS).toHaveProperty("low_compute");
      expect(SURVIVAL_TIERS).toHaveProperty("critical");
      expect(SURVIVAL_TIERS).toHaveProperty("dead");
    });

    it("should have correct balance thresholds per Requirement 3.1", () => {
      expect(SURVIVAL_TIERS.thriving.minBalance).toBe(10.0);
      expect(SURVIVAL_TIERS.normal.minBalance).toBe(1.0);
      expect(SURVIVAL_TIERS.low_compute.minBalance).toBe(0.1);
      expect(SURVIVAL_TIERS.critical.minBalance).toBe(0.01);
      expect(SURVIVAL_TIERS.dead.minBalance).toBe(0.0);
    });

    it("should have correct replication capabilities", () => {
      expect(SURVIVAL_TIERS.thriving.canReplicate).toBe(true);
      expect(SURVIVAL_TIERS.normal.canReplicate).toBe(true);
      expect(SURVIVAL_TIERS.low_compute.canReplicate).toBe(false);
      expect(SURVIVAL_TIERS.critical.canReplicate).toBe(false);
      expect(SURVIVAL_TIERS.dead.canReplicate).toBe(false);
    });

    it("should have correct experimentation capabilities", () => {
      expect(SURVIVAL_TIERS.thriving.canExperiment).toBe(true);
      expect(SURVIVAL_TIERS.normal.canExperiment).toBe(false);
      expect(SURVIVAL_TIERS.low_compute.canExperiment).toBe(false);
      expect(SURVIVAL_TIERS.critical.canExperiment).toBe(false);
      expect(SURVIVAL_TIERS.dead.canExperiment).toBe(false);
    });

    it("should assign appropriate models to each tier", () => {
      expect(SURVIVAL_TIERS.thriving.model).toBe("anthropic/claude-3.5-sonnet");
      expect(SURVIVAL_TIERS.normal.model).toBe("anthropic/claude-3-haiku");
      expect(SURVIVAL_TIERS.low_compute.model).toBe("openai/gpt-4o-mini");
      expect(SURVIVAL_TIERS.critical.model).toBe("openai/gpt-3.5-turbo");
      expect(SURVIVAL_TIERS.dead.model).toBe("none");
    });

    it("should have non-empty capabilities descriptions", () => {
      Object.values(SURVIVAL_TIERS).forEach((tier) => {
        expect(tier.capabilities).toBeTruthy();
        expect(tier.capabilities.length).toBeGreaterThan(0);
      });
    });
  });

  describe("TIER_ORDER constant", () => {
    it("should contain all five tiers", () => {
      expect(TIER_ORDER).toHaveLength(5);
    });

    it("should be ordered from highest to lowest balance", () => {
      for (let i = 0; i < TIER_ORDER.length - 1; i++) {
        expect(TIER_ORDER[i].minBalance).toBeGreaterThan(TIER_ORDER[i + 1].minBalance);
      }
    });
  });

  describe("getTierByName", () => {
    it("should return tier configuration for valid names", () => {
      const tier = getTierByName("thriving");
      expect(tier).toBeDefined();
      expect(tier?.name).toBe("thriving");
    });

    it("should return undefined for invalid names", () => {
      const tier = getTierByName("invalid_tier");
      expect(tier).toBeUndefined();
    });
  });

  describe("getAllTiers", () => {
    it("should return all tier configurations", () => {
      const tiers = getAllTiers();
      expect(tiers).toHaveLength(5);
      expect(tiers).toEqual(TIER_ORDER);
    });
  });

  describe("determineTier", () => {
    it("should classify thriving tier (> 10 SOL)", () => {
      expect(determineTier(10.0).name).toBe("thriving");
      expect(determineTier(15.5).name).toBe("thriving");
      expect(determineTier(100.0).name).toBe("thriving");
    });

    it("should classify normal tier (1-10 SOL)", () => {
      expect(determineTier(1.0).name).toBe("normal");
      expect(determineTier(5.5).name).toBe("normal");
      expect(determineTier(9.99).name).toBe("normal");
    });

    it("should classify low_compute tier (0.1-1 SOL)", () => {
      expect(determineTier(0.1).name).toBe("low_compute");
      expect(determineTier(0.5).name).toBe("low_compute");
      expect(determineTier(0.99).name).toBe("low_compute");
    });

    it("should classify critical tier (0.01-0.1 SOL)", () => {
      expect(determineTier(0.01).name).toBe("critical");
      expect(determineTier(0.05).name).toBe("critical");
      expect(determineTier(0.099).name).toBe("critical");
    });

    it("should classify dead tier (< 0.01 SOL)", () => {
      expect(determineTier(0.009).name).toBe("dead");
      expect(determineTier(0.001).name).toBe("dead");
      expect(determineTier(0.0).name).toBe("dead");
    });

    it("should handle edge cases at tier boundaries", () => {
      // Exact boundary values should be in the higher tier
      expect(determineTier(10.0).name).toBe("thriving");
      expect(determineTier(1.0).name).toBe("normal");
      expect(determineTier(0.1).name).toBe("low_compute");
      expect(determineTier(0.01).name).toBe("critical");
      
      // Just below boundary should be in lower tier
      expect(determineTier(9.999999).name).toBe("normal");
      expect(determineTier(0.999999).name).toBe("low_compute");
      expect(determineTier(0.099999).name).toBe("critical");
      expect(determineTier(0.009999).name).toBe("dead");
    });
  });

  describe("canReplicate", () => {
    it("should return true for thriving tier", () => {
      expect(canReplicate(10.0)).toBe(true);
      expect(canReplicate(50.0)).toBe(true);
    });

    it("should return true for normal tier", () => {
      expect(canReplicate(1.0)).toBe(true);
      expect(canReplicate(5.0)).toBe(true);
    });

    it("should return false for low_compute tier", () => {
      expect(canReplicate(0.1)).toBe(false);
      expect(canReplicate(0.5)).toBe(false);
    });

    it("should return false for critical tier", () => {
      expect(canReplicate(0.01)).toBe(false);
      expect(canReplicate(0.05)).toBe(false);
    });

    it("should return false for dead tier", () => {
      expect(canReplicate(0.0)).toBe(false);
      expect(canReplicate(0.001)).toBe(false);
    });
  });

  describe("canExperiment", () => {
    it("should return true only for thriving tier", () => {
      expect(canExperiment(10.0)).toBe(true);
      expect(canExperiment(50.0)).toBe(true);
    });

    it("should return false for all other tiers", () => {
      expect(canExperiment(5.0)).toBe(false);   // normal
      expect(canExperiment(0.5)).toBe(false);   // low_compute
      expect(canExperiment(0.05)).toBe(false);  // critical
      expect(canExperiment(0.0)).toBe(false);   // dead
    });
  });

  describe("getModelForBalance", () => {
    it("should return appropriate model for each tier", () => {
      expect(getModelForBalance(10.0)).toBe("anthropic/claude-3.5-sonnet");
      expect(getModelForBalance(5.0)).toBe("anthropic/claude-3-haiku");
      expect(getModelForBalance(0.5)).toBe("openai/gpt-4o-mini");
      expect(getModelForBalance(0.05)).toBe("openai/gpt-3.5-turbo");
      expect(getModelForBalance(0.0)).toBe("none");
    });
  });

  describe("Requirement 3.1 validation", () => {
    it("should implement survival tiers based on SOL balance as specified", () => {
      // Requirement 3.1: thriving > 10, normal 1-10, low 0.1-1, critical 0.01-0.1, dead < 0.01
      
      // Test thriving (> 10)
      const thrivingTier = determineTier(10.1);
      expect(thrivingTier.name).toBe("thriving");
      expect(thrivingTier.minBalance).toBe(10.0);
      
      // Test normal (1-10)
      const normalTier = determineTier(5.0);
      expect(normalTier.name).toBe("normal");
      expect(normalTier.minBalance).toBe(1.0);
      
      // Test low_compute (0.1-1)
      const lowTier = determineTier(0.5);
      expect(lowTier.name).toBe("low_compute");
      expect(lowTier.minBalance).toBe(0.1);
      
      // Test critical (0.01-0.1)
      const criticalTier = determineTier(0.05);
      expect(criticalTier.name).toBe("critical");
      expect(criticalTier.minBalance).toBe(0.01);
      
      // Test dead (< 0.01)
      const deadTier = determineTier(0.005);
      expect(deadTier.name).toBe("dead");
      expect(deadTier.minBalance).toBe(0.0);
    });

    it("should degrade capabilities as balance decreases", () => {
      const tiers = [
        determineTier(15.0),   // thriving
        determineTier(5.0),    // normal
        determineTier(0.5),    // low_compute
        determineTier(0.05),   // critical
        determineTier(0.0),    // dead
      ];
      
      // Verify degradation of replication capability
      expect(tiers[0].canReplicate).toBe(true);
      expect(tiers[1].canReplicate).toBe(true);
      expect(tiers[2].canReplicate).toBe(false);
      expect(tiers[3].canReplicate).toBe(false);
      expect(tiers[4].canReplicate).toBe(false);
      
      // Verify degradation of experimentation capability
      expect(tiers[0].canExperiment).toBe(true);
      expect(tiers[1].canExperiment).toBe(false);
      expect(tiers[2].canExperiment).toBe(false);
      expect(tiers[3].canExperiment).toBe(false);
      expect(tiers[4].canExperiment).toBe(false);
      
      // Verify model quality degrades
      expect(tiers[0].model).toContain("claude-3.5-sonnet");
      expect(tiers[1].model).toContain("claude-3-haiku");
      expect(tiers[2].model).toContain("gpt-4o-mini");
      expect(tiers[3].model).toContain("gpt-3.5-turbo");
      expect(tiers[4].model).toBe("none");
    });
  });

  describe("evaluateSurvival", () => {
    it("should evaluate agent survival tier based on balance", () => {
      const thrivingAgent = { balance: 15.0 };
      const normalAgent = { balance: 5.0 };
      const lowAgent = { balance: 0.5 };
      const criticalAgent = { balance: 0.05 };
      const deadAgent = { balance: 0.005 };

      expect(evaluateSurvival(thrivingAgent).name).toBe("thriving");
      expect(evaluateSurvival(normalAgent).name).toBe("normal");
      expect(evaluateSurvival(lowAgent).name).toBe("low_compute");
      expect(evaluateSurvival(criticalAgent).name).toBe("critical");
      expect(evaluateSurvival(deadAgent).name).toBe("dead");
    });

    it("should return full tier configuration", () => {
      const agent = { balance: 10.0 };
      const tier = evaluateSurvival(agent);

      expect(tier).toHaveProperty("name");
      expect(tier).toHaveProperty("minBalance");
      expect(tier).toHaveProperty("capabilities");
      expect(tier).toHaveProperty("model");
      expect(tier).toHaveProperty("canReplicate");
      expect(tier).toHaveProperty("canExperiment");
    });

    it("should handle edge cases at tier boundaries", () => {
      expect(evaluateSurvival({ balance: 10.0 }).name).toBe("thriving");
      expect(evaluateSurvival({ balance: 9.999 }).name).toBe("normal");
      expect(evaluateSurvival({ balance: 1.0 }).name).toBe("normal");
      expect(evaluateSurvival({ balance: 0.999 }).name).toBe("low_compute");
      expect(evaluateSurvival({ balance: 0.1 }).name).toBe("low_compute");
      expect(evaluateSurvival({ balance: 0.099 }).name).toBe("critical");
      expect(evaluateSurvival({ balance: 0.01 }).name).toBe("critical");
      expect(evaluateSurvival({ balance: 0.009 }).name).toBe("dead");
    });
  });

  describe("detectTierTransition", () => {
    it("should detect no transition when tier remains the same", () => {
      const transition = detectTierTransition(5.0, 6.0);
      
      expect(transition.direction).toBe("none");
      expect(transition.from.name).toBe("normal");
      expect(transition.to.name).toBe("normal");
      expect(transition.balanceChange).toBe(1.0);
    });

    it("should detect upgrade transitions", () => {
      // Critical to low_compute
      const upgrade1 = detectTierTransition(0.05, 0.15);
      expect(upgrade1.direction).toBe("upgrade");
      expect(upgrade1.from.name).toBe("critical");
      expect(upgrade1.to.name).toBe("low_compute");
      expect(upgrade1.balanceChange).toBeCloseTo(0.1, 10);

      // Normal to thriving
      const upgrade2 = detectTierTransition(5.0, 12.0);
      expect(upgrade2.direction).toBe("upgrade");
      expect(upgrade2.from.name).toBe("normal");
      expect(upgrade2.to.name).toBe("thriving");
      expect(upgrade2.balanceChange).toBe(7.0);

      // Dead to critical
      const upgrade3 = detectTierTransition(0.005, 0.02);
      expect(upgrade3.direction).toBe("upgrade");
      expect(upgrade3.from.name).toBe("dead");
      expect(upgrade3.to.name).toBe("critical");
    });

    it("should detect downgrade transitions", () => {
      // Thriving to normal
      const downgrade1 = detectTierTransition(12.0, 5.0);
      expect(downgrade1.direction).toBe("downgrade");
      expect(downgrade1.from.name).toBe("thriving");
      expect(downgrade1.to.name).toBe("normal");
      expect(downgrade1.balanceChange).toBe(-7.0);

      // Normal to low_compute
      const downgrade2 = detectTierTransition(5.0, 0.5);
      expect(downgrade2.direction).toBe("downgrade");
      expect(downgrade2.from.name).toBe("normal");
      expect(downgrade2.to.name).toBe("low_compute");

      // Low_compute to critical
      const downgrade3 = detectTierTransition(0.5, 0.05);
      expect(downgrade3.direction).toBe("downgrade");
      expect(downgrade3.from.name).toBe("low_compute");
      expect(downgrade3.to.name).toBe("critical");

      // Critical to dead
      const downgrade4 = detectTierTransition(0.05, 0.005);
      expect(downgrade4.direction).toBe("downgrade");
      expect(downgrade4.from.name).toBe("critical");
      expect(downgrade4.to.name).toBe("dead");
    });

    it("should detect multi-tier transitions", () => {
      // Thriving to critical (skip normal and low_compute)
      const bigDowngrade = detectTierTransition(15.0, 0.05);
      expect(bigDowngrade.direction).toBe("downgrade");
      expect(bigDowngrade.from.name).toBe("thriving");
      expect(bigDowngrade.to.name).toBe("critical");
      expect(bigDowngrade.balanceChange).toBe(-14.95);

      // Dead to normal (skip critical and low_compute)
      const bigUpgrade = detectTierTransition(0.005, 5.0);
      expect(bigUpgrade.direction).toBe("upgrade");
      expect(bigUpgrade.from.name).toBe("dead");
      expect(bigUpgrade.to.name).toBe("normal");
      expect(bigUpgrade.balanceChange).toBeCloseTo(4.995, 3);
    });

    it("should handle transitions at tier boundaries", () => {
      // Crossing from normal to thriving at exactly 10.0
      const boundary1 = detectTierTransition(9.99, 10.0);
      expect(boundary1.direction).toBe("upgrade");
      expect(boundary1.from.name).toBe("normal");
      expect(boundary1.to.name).toBe("thriving");

      // Crossing from thriving to normal just below 10.0
      const boundary2 = detectTierTransition(10.0, 9.99);
      expect(boundary2.direction).toBe("downgrade");
      expect(boundary2.from.name).toBe("thriving");
      expect(boundary2.to.name).toBe("normal");
    });

    it("should calculate correct balance change", () => {
      const transition1 = detectTierTransition(5.0, 7.5);
      expect(transition1.balanceChange).toBe(2.5);

      const transition2 = detectTierTransition(10.0, 8.0);
      expect(transition2.balanceChange).toBe(-2.0);

      const transition3 = detectTierTransition(0.1, 0.1);
      expect(transition3.balanceChange).toBe(0.0);
    });

    it("should provide complete transition information", () => {
      const transition = detectTierTransition(5.0, 12.0);

      expect(transition).toHaveProperty("from");
      expect(transition).toHaveProperty("to");
      expect(transition).toHaveProperty("direction");
      expect(transition).toHaveProperty("balanceChange");

      expect(transition.from).toHaveProperty("name");
      expect(transition.from).toHaveProperty("minBalance");
      expect(transition.from).toHaveProperty("capabilities");
      expect(transition.from).toHaveProperty("model");

      expect(transition.to).toHaveProperty("name");
      expect(transition.to).toHaveProperty("minBalance");
      expect(transition.to).toHaveProperty("capabilities");
      expect(transition.to).toHaveProperty("model");
    });
  });
});
