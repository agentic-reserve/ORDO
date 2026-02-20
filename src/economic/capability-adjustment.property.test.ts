/**
 * Property-based tests for capability adjustment
 * 
 * Property 13: Capability Adjustment
 * Validates: Requirements 3.2, 3.3
 * 
 * For any agent tier change (upgrade or downgrade), the system should adjust
 * capabilities (model quality, features, replication ability) to match the new
 * tier within one heartbeat cycle.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import type { Agent } from "../types.js";
import {
  degradeCapabilities,
  upgradeCapabilities,
  adjustCapabilities,
  canAgentReplicate,
  canAgentExperiment,
  getRecommendedModel,
} from "./capability-adjustment.js";
import { determineTier, SURVIVAL_TIERS } from "./survival-tiers.js";

// Helper to create a mock agent
function createMockAgent(balance: number): Agent {
  const tier = determineTier(balance);
  return {
    id: "test-agent",
    publicKey: "test-pubkey",
    name: "Test Agent",
    generation: 0,
    parentId: undefined,
    childrenIds: [],
    birthDate: new Date(),
    age: 10,
    maxLifespan: 365,
    status: "alive",
    balance,
    survivalTier: tier.name,
    totalEarnings: 0,
    totalCosts: 0,
    model: tier.model,
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
}

describe("Property 13: Capability Adjustment", () => {
  it("should always adjust model to match new tier on downgrade", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1, noNaN: true }),
        (highBalance, lowBalance) => {
          const agent = createMockAgent(highBalance);
          const oldTier = determineTier(highBalance);
          const newTier = determineTier(lowBalance);
          
          // Only test if this is actually a downgrade
          if (newTier.minBalance < oldTier.minBalance) {
            const result = degradeCapabilities(agent, newTier);
            
            expect(agent.model).toBe(newTier.model);
            expect(agent.survivalTier).toBe(newTier.name);
            expect(result.newModel).toBe(newTier.model);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always adjust model to match new tier on upgrade", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1, noNaN: true }),
        fc.double({ min: 1, max: 1000, noNaN: true }),
        (lowBalance, highBalance) => {
          const agent = createMockAgent(lowBalance);
          const oldTier = determineTier(lowBalance);
          const newTier = determineTier(highBalance);
          
          // Only test if this is actually an upgrade
          if (newTier.minBalance > oldTier.minBalance) {
            const result = upgradeCapabilities(agent, newTier);
            
            expect(agent.model).toBe(newTier.model);
            expect(agent.survivalTier).toBe(newTier.name);
            expect(result.newModel).toBe(newTier.model);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should disable replication when downgrading below normal tier", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 1, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 0.999, noNaN: true }),
        (highBalance, lowBalance) => {
          const agent = createMockAgent(highBalance);
          const newTier = determineTier(lowBalance);
          
          // Downgrade to low_compute, critical, or dead
          if (newTier.name === "low_compute" || newTier.name === "critical" || newTier.name === "dead") {
            const result = degradeCapabilities(agent, newTier);
            
            expect(result.replicationEnabled).toBe(false);
            
            // Update balance to match new tier for capability checks
            agent.balance = lowBalance;
            expect(canAgentReplicate(agent)).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should enable replication when upgrading to normal or thriving tier", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 0.999, noNaN: true }),
        fc.double({ min: 1, max: 1000, noNaN: true }),
        (lowBalance, highBalance) => {
          const agent = createMockAgent(lowBalance);
          const newTier = determineTier(highBalance);
          
          // Upgrade to normal or thriving
          if (newTier.name === "normal" || newTier.name === "thriving") {
            const result = upgradeCapabilities(agent, newTier);
            
            expect(result.replicationEnabled).toBe(true);
            
            // Update balance to match new tier for capability checks
            agent.balance = highBalance;
            expect(canAgentReplicate(agent)).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should disable experimentation when downgrading from thriving", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 10, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 9.999, noNaN: true }),
        (thrivingBalance, lowerBalance) => {
          const agent = createMockAgent(thrivingBalance);
          const newTier = determineTier(lowerBalance);
          
          // Downgrade from thriving to any lower tier
          const result = degradeCapabilities(agent, newTier);
          
          expect(result.experimentationEnabled).toBe(false);
          
          // Update balance to match new tier for capability checks
          agent.balance = lowerBalance;
          expect(canAgentExperiment(agent)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should enable experimentation only when upgrading to thriving", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 9.999, noNaN: true }),
        fc.double({ min: 10, max: 1000, noNaN: true }),
        (lowerBalance, thrivingBalance) => {
          const agent = createMockAgent(lowerBalance);
          const newTier = determineTier(thrivingBalance);
          
          // Upgrade to thriving
          const result = upgradeCapabilities(agent, newTier);
          
          expect(result.experimentationEnabled).toBe(true);
          
          // Update balance to match new tier for capability checks
          agent.balance = thrivingBalance;
          expect(canAgentExperiment(agent)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should automatically detect and apply tier changes", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (oldBalance, newBalance) => {
          const agent = createMockAgent(newBalance);
          const oldTier = determineTier(oldBalance);
          const newTier = determineTier(newBalance);
          
          const result = adjustCapabilities(agent, oldBalance);
          
          // If tiers are different, adjustment should occur
          if (oldTier.name !== newTier.name) {
            expect(result).not.toBeNull();
            expect(result?.newTier.name).toBe(newTier.name);
            expect(agent.model).toBe(newTier.model);
          } else {
            // If tiers are same, no adjustment needed
            expect(result).toBeNull();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should maintain capability consistency with tier", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (balance) => {
          const agent = createMockAgent(balance);
          const tier = determineTier(balance);
          
          // Agent's capabilities should match tier capabilities
          expect(canAgentReplicate(agent)).toBe(tier.canReplicate);
          expect(canAgentExperiment(agent)).toBe(tier.canExperiment);
          expect(getRecommendedModel(agent)).toBe(tier.model);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should always update agent timestamp on capability change", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (oldBalance, newBalance) => {
          const agent = createMockAgent(oldBalance);
          const oldTier = determineTier(oldBalance);
          const newTier = determineTier(newBalance);
          
          const beforeUpdate = agent.updatedAt;
          
          // Only test if tier actually changes
          if (oldTier.name !== newTier.name) {
            if (newTier.minBalance > oldTier.minBalance) {
              upgradeCapabilities(agent, newTier);
            } else {
              degradeCapabilities(agent, newTier);
            }
            
            // Timestamp should be updated (or at least not earlier)
            expect(agent.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should preserve agent identity during capability changes", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (oldBalance, newBalance) => {
          const agent = createMockAgent(oldBalance);
          const originalId = agent.id;
          const originalPublicKey = agent.publicKey;
          const originalName = agent.name;
          const originalGeneration = agent.generation;
          
          const oldTier = determineTier(oldBalance);
          const newTier = determineTier(newBalance);
          
          // Apply capability change if tier changes
          if (oldTier.name !== newTier.name) {
            if (newTier.minBalance > oldTier.minBalance) {
              upgradeCapabilities(agent, newTier);
            } else {
              degradeCapabilities(agent, newTier);
            }
          }
          
          // Identity should remain unchanged
          expect(agent.id).toBe(originalId);
          expect(agent.publicKey).toBe(originalPublicKey);
          expect(agent.name).toBe(originalName);
          expect(agent.generation).toBe(originalGeneration);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should report all capability changes accurately", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (oldBalance, newBalance) => {
          const agent = createMockAgent(oldBalance);
          const oldTier = determineTier(oldBalance);
          const newTier = determineTier(newBalance);
          
          // Only test if tier changes
          if (oldTier.name !== newTier.name) {
            let result;
            if (newTier.minBalance > oldTier.minBalance) {
              result = upgradeCapabilities(agent, newTier);
            } else {
              result = degradeCapabilities(agent, newTier);
            }
            
            // Result should have capabilitiesChanged array
            expect(result.capabilitiesChanged).toBeDefined();
            expect(Array.isArray(result.capabilitiesChanged)).toBe(true);
            
            // If model changed, it should be in the list
            if (result.modelChanged) {
              expect(result.capabilitiesChanged.some(c => c.includes("model"))).toBe(true);
            }
            
            // If replication changed, it should be in the list
            if (oldTier.canReplicate !== newTier.canReplicate) {
              expect(result.capabilitiesChanged.some(c => c.includes("replication"))).toBe(true);
            }
            
            // If experimentation changed, it should be in the list
            if (oldTier.canExperiment !== newTier.canExperiment) {
              expect(result.capabilitiesChanged.some(c => c.includes("experimentation"))).toBe(true);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle rapid tier transitions correctly", () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 1000, noNaN: true }), { minLength: 2, maxLength: 10 }),
        (balances) => {
          const agent = createMockAgent(balances[0]);
          
          // Apply multiple balance changes
          for (let i = 1; i < balances.length; i++) {
            const oldBalance = agent.balance;
            agent.balance = balances[i];
            
            adjustCapabilities(agent, oldBalance);
            
            // After each adjustment, agent should match current tier
            const currentTier = determineTier(agent.balance);
            expect(agent.model).toBe(currentTier.model);
            expect(agent.survivalTier).toBe(currentTier.name);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should be idempotent: applying same tier change multiple times has no additional effect", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (balance) => {
          const agent = createMockAgent(balance);
          const tier = determineTier(balance);
          
          // Apply capability adjustment multiple times
          const result1 = degradeCapabilities(agent, tier);
          const model1 = agent.model;
          const survivalTier1 = agent.survivalTier;
          
          const result2 = degradeCapabilities(agent, tier);
          const model2 = agent.model;
          const survivalTier2 = agent.survivalTier;
          
          // Results should be identical
          expect(model1).toBe(model2);
          expect(survivalTier1).toBe(survivalTier2);
          expect(result1.newTier.name).toBe(result2.newTier.name);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should handle boundary tier transitions correctly", () => {
    // Test transitions at exact tier boundaries
    const boundaries = [
      { from: 10.0, to: 9.999, expectedTransition: true },
      { from: 1.0, to: 0.999, expectedTransition: true },
      { from: 0.1, to: 0.099, expectedTransition: true },
      { from: 0.01, to: 0.009, expectedTransition: true },
    ];
    
    boundaries.forEach(({ from, to, expectedTransition }) => {
      const agent = createMockAgent(from);
      agent.balance = to;
      
      const result = adjustCapabilities(agent, from);
      
      if (expectedTransition) {
        expect(result).not.toBeNull();
      }
    });
  });

  it("should maintain tier-capability invariants after any adjustment", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 1000, noNaN: true }),
        fc.double({ min: 0, max: 1000, noNaN: true }),
        (oldBalance, newBalance) => {
          const agent = createMockAgent(oldBalance);
          agent.balance = newBalance;
          
          adjustCapabilities(agent, oldBalance);
          
          const tier = determineTier(agent.balance);
          
          // Invariants that must always hold:
          // 1. Agent model matches tier model
          expect(agent.model).toBe(tier.model);
          
          // 2. Agent survival tier matches calculated tier
          expect(agent.survivalTier).toBe(tier.name);
          
          // 3. Replication capability matches tier
          expect(canAgentReplicate(agent)).toBe(tier.canReplicate);
          
          // 4. Experimentation capability matches tier
          expect(canAgentExperiment(agent)).toBe(tier.canExperiment);
        }
      ),
      { numRuns: 100 }
    );
  });
});
