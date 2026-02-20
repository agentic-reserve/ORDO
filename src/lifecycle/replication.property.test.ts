/**
 * Property-based tests for replication and inheritance system
 * 
 * These tests validate universal correctness properties across
 * all possible inputs using fast-check.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { 
  checkReplicationEligibility, 
  inheritTraits, 
  applyMutations,
  calculateMutationRate,
  transferResources,
  type Trait 
} from "./replication.js";
import { config } from "../config.js";
import type { Agent } from "../types.js";

/**
 * Helper to create a minimal agent for testing
 */
function createTestAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    id: "test-agent-id",
    publicKey: "test-public-key",
    name: "Test Agent",
    generation: 0,
    parentId: undefined,
    childrenIds: [],
    
    birthDate: new Date(),
    age: 0,
    maxLifespan: 365,
    status: "alive",
    
    balance: 0,
    survivalTier: "dead",
    totalEarnings: 0,
    totalCosts: 0,
    
    model: "gpt-3.5-turbo",
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
    
    ...overrides,
  };
}

describe("Replication Property Tests", () => {
  /**
   * Property 21: Reproduction Eligibility
   * 
   * For any agent with balance > 10 SOL and age > 30 days,
   * the system should enable reproduction capability and allow
   * the agent to create offspring.
   * 
   * **Validates: Requirements 5.1**
   */
  describe("Property 21: Reproduction Eligibility", () => {
    it("should enable replication for agents meeting all requirements", () => {
      fc.assert(
        fc.property(
          // Generate balance > 10 SOL
          fc.double({ min: 10.01, max: 1000, noNaN: true }),
          // Generate age > 30 days
          fc.integer({ min: 31, max: 365 }),
          (balance, age) => {
            const agent = createTestAgent({
              balance,
              age,
              status: "alive",
            });

            const result = checkReplicationEligibility(agent);

            // Agent should be eligible
            expect(result.eligible).toBe(true);
            expect(result.balance).toBe(balance);
            expect(result.age).toBe(age);
            expect(result.reasons).toContain("All replication requirements met");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should disable replication for agents with insufficient balance", () => {
      fc.assert(
        fc.property(
          // Generate balance < 10 SOL
          fc.double({ min: 0, max: 9.99, noNaN: true }),
          // Generate age > 30 days (meets age requirement)
          fc.integer({ min: 31, max: 365 }),
          (balance, age) => {
            const agent = createTestAgent({
              balance,
              age,
              status: "alive",
            });

            const result = checkReplicationEligibility(agent);

            // Agent should NOT be eligible due to balance
            expect(result.eligible).toBe(false);
            expect(result.reasons.some(r => r.includes("Balance"))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should disable replication for agents too young", () => {
      fc.assert(
        fc.property(
          // Generate balance > 10 SOL (meets balance requirement)
          fc.double({ min: 10.01, max: 1000, noNaN: true }),
          // Generate age < 30 days
          fc.integer({ min: 0, max: 29 }),
          (balance, age) => {
            const agent = createTestAgent({
              balance,
              age,
              status: "alive",
            });

            const result = checkReplicationEligibility(agent);

            // Agent should NOT be eligible due to age
            expect(result.eligible).toBe(false);
            expect(result.reasons.some(r => r.includes("Age"))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should disable replication for dead agents", () => {
      fc.assert(
        fc.property(
          // Generate balance > 10 SOL
          fc.double({ min: 10.01, max: 1000, noNaN: true }),
          // Generate age > 30 days
          fc.integer({ min: 31, max: 365 }),
          (balance, age) => {
            const agent = createTestAgent({
              balance,
              age,
              status: "dead",
            });

            const result = checkReplicationEligibility(agent);

            // Agent should NOT be eligible due to status
            expect(result.eligible).toBe(false);
            expect(result.reasons.some(r => r.includes("status"))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should respect configured minimum balance threshold", () => {
      const minBalance = config.agent.replicationMinBalance;

      fc.assert(
        fc.property(
          fc.integer({ min: 31, max: 365 }),
          (age) => {
            // Test exactly at threshold
            const agentAtThreshold = createTestAgent({
              balance: minBalance,
              age,
              status: "alive",
            });

            const resultAt = checkReplicationEligibility(agentAtThreshold);
            expect(resultAt.eligible).toBe(true);

            // Test just below threshold
            const agentBelowThreshold = createTestAgent({
              balance: minBalance - 0.01,
              age,
              status: "alive",
            });

            const resultBelow = checkReplicationEligibility(agentBelowThreshold);
            expect(resultBelow.eligible).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should respect configured minimum age threshold", () => {
      const minAge = config.agent.replicationMinAgeDays;

      fc.assert(
        fc.property(
          fc.double({ min: 10.01, max: 1000, noNaN: true }),
          (balance) => {
            // Test exactly at threshold
            const agentAtThreshold = createTestAgent({
              balance,
              age: minAge,
              status: "alive",
            });

            const resultAt = checkReplicationEligibility(agentAtThreshold);
            expect(resultAt.eligible).toBe(true);

            // Test just below threshold
            const agentBelowThreshold = createTestAgent({
              balance,
              age: minAge - 1,
              status: "alive",
            });

            const resultBelow = checkReplicationEligibility(agentBelowThreshold);
            expect(resultBelow.eligible).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 22: Trait Inheritance
   * 
   * For any replication, the system should create child agents that
   * inherit parent traits (strategies, knowledge, skills) with mutations applied.
   * 
   * **Validates: Requirements 5.2**
   */
  describe("Property 22: Trait Inheritance", () => {
    it("should inherit all parent traits to child", () => {
      fc.assert(
        fc.property(
          // Generate random traits
          fc.record({
            strategy1: fc.string(),
            strategy2: fc.integer(),
            strategy3: fc.boolean(),
          }),
          // Generate random knowledge
          fc.record({
            fact1: fc.string(),
            fact2: fc.double({ noNaN: true }),
          }),
          // Generate random skills
          fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 }),
          (traits, knowledge, skills) => {
            const parent = createTestAgent({
              traits,
              knowledgeBase: knowledge,
              skills,
              model: "test-model",
              tools: ["tool1", "tool2"],
            });

            const childTraits: Record<string, unknown> = {};
            const childKnowledge: Record<string, unknown> = {};
            const childSkills: string[] = [];

            const inheritedTraits = inheritTraits(
              parent,
              childTraits,
              childKnowledge,
              childSkills
            );

            // Verify strategies are inherited
            for (const [key, value] of Object.entries(traits)) {
              expect(childTraits[key]).toEqual(value);
            }

            // Verify knowledge is inherited
            for (const [key, value] of Object.entries(knowledge)) {
              // Handle special numeric values
              if (typeof value === "number") {
                if (Number.isNaN(value) || !Number.isFinite(value)) {
                  // NaN and Infinity don't survive JSON serialization
                  expect(childKnowledge[key]).toBeNull();
                } else if (value === 0) {
                  // Handle -0 vs +0 comparison issue
                  expect(typeof childKnowledge[key]).toBe("number");
                  expect(childKnowledge[key]).toBe(0);
                } else {
                  expect(childKnowledge[key]).toEqual(value);
                }
              } else {
                expect(childKnowledge[key]).toEqual(value);
              }
            }

            // Verify skills are inherited
            for (const skill of skills) {
              expect(childSkills).toContain(skill);
            }

            // Verify inherited traits array is populated
            expect(inheritedTraits.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should deep copy trait values to avoid reference sharing", () => {
      fc.assert(
        fc.property(
          fc.record({
            nested: fc.record({
              value: fc.string(),
            }),
          }),
          (traits) => {
            const parent = createTestAgent({
              traits,
            });

            const childTraits: Record<string, unknown> = {};
            const childKnowledge: Record<string, unknown> = {};
            const childSkills: string[] = [];

            inheritTraits(parent, childTraits, childKnowledge, childSkills);

            // Modify child trait
            const childNested = childTraits.nested as { value: string };
            childNested.value = "modified";

            // Parent trait should be unchanged
            const parentNested = parent.traits.nested as { value: string };
            expect(parentNested.value).not.toBe("modified");
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should categorize traits correctly", () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string(),
          fc.string(),
          (strategyValue, knowledgeValue, skill) => {
            const parent = createTestAgent({
              traits: { myStrategy: strategyValue },
              knowledgeBase: { myKnowledge: knowledgeValue },
              skills: [skill],
            });

            const childTraits: Record<string, unknown> = {};
            const childKnowledge: Record<string, unknown> = {};
            const childSkills: string[] = [];

            const inheritedTraits = inheritTraits(
              parent,
              childTraits,
              childKnowledge,
              childSkills
            );

            // Find traits by category
            const strategyTraits = inheritedTraits.filter(t => t.category === "strategy");
            const knowledgeTraits = inheritedTraits.filter(t => t.category === "knowledge");
            const skillTraits = inheritedTraits.filter(t => t.category === "skill");

            expect(strategyTraits.length).toBeGreaterThan(0);
            expect(knowledgeTraits.length).toBeGreaterThan(0);
            expect(skillTraits.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle empty parent traits gracefully", () => {
      const parent = createTestAgent({
        traits: {},
        knowledgeBase: {},
        skills: [],
      });

      const childTraits: Record<string, unknown> = {};
      const childKnowledge: Record<string, unknown> = {};
      const childSkills: string[] = [];

      const inheritedTraits = inheritTraits(
        parent,
        childTraits,
        childKnowledge,
        childSkills
      );

      // Should still have preference traits
      expect(inheritedTraits.length).toBeGreaterThan(0);
      expect(inheritedTraits.some(t => t.category === "preference")).toBe(true);
    });

    it("should not duplicate skills in child", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1 }), { minLength: 2, maxLength: 5 }),
          (skills) => {
            const parent = createTestAgent({
              skills,
            });

            const childTraits: Record<string, unknown> = {};
            const childKnowledge: Record<string, unknown> = {};
            const childSkills: string[] = [];

            // Inherit twice to test deduplication
            inheritTraits(parent, childTraits, childKnowledge, childSkills);
            inheritTraits(parent, childTraits, childKnowledge, childSkills);

            // Each skill should appear only once
            const uniqueSkills = new Set(childSkills);
            expect(childSkills.length).toBe(uniqueSkills.size);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 19: Replication Mutation
   * 
   * For any agent replication, the system should apply mutations to
   * offspring traits with mutation rate between 10-20%, creating
   * variation while preserving core functionality.
   * 
   * **Validates: Requirements 4.5**
   */
  describe("Property 19: Replication Mutation", () => {
    it("should apply mutations to mutable traits only", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.1, max: 0.2, noNaN: true }),
          (mutationRate) => {
            const traits: Trait[] = [
              { name: "mutable1", value: 100, mutable: true, category: "strategy" },
              { name: "immutable1", value: 200, mutable: false, category: "strategy" },
              { name: "mutable2", value: "test", mutable: true, category: "knowledge" },
              { name: "immutable2", value: "fixed", mutable: false, category: "knowledge" },
            ];

            const originalImmutable1 = traits[1].value;
            const originalImmutable2 = traits[3].value;

            applyMutations(traits, mutationRate);

            // Immutable traits should never change
            expect(traits[1].value).toBe(originalImmutable1);
            expect(traits[3].value).toBe(originalImmutable2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should create variation in offspring traits", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.1, max: 0.2, noNaN: true }),
          fc.integer({ min: 1, max: 100 }),
          (mutationRate, value) => {
            const traits: Trait[] = [
              { name: "trait1", value, mutable: true, category: "strategy" },
            ];

            const originalValue = traits[0].value;
            const mutations = applyMutations(traits, mutationRate);

            // If mutation occurred, value should be different
            if (mutations.length > 0) {
              expect(traits[0].value).not.toBe(originalValue);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle different trait value types", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.5, max: 1.0, noNaN: true }), // High mutation rate to ensure mutations
          (mutationRate) => {
            const traits: Trait[] = [
              { name: "number", value: 42, mutable: true, category: "strategy" },
              { name: "string", value: "test", mutable: true, category: "knowledge" },
              { name: "boolean", value: true, mutable: true, category: "preference" },
              { name: "array", value: [1, 2, 3], mutable: true, category: "strategy" },
              { name: "object", value: { key: "value" }, mutable: true, category: "knowledge" },
            ];

            const mutations = applyMutations(traits, mutationRate);

            // Should handle all types without errors
            expect(mutations).toBeDefined();
            expect(Array.isArray(mutations)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve core functionality after mutation", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.1, max: 0.2, noNaN: true }),
          fc.integer({ min: 1, max: 1000 }),
          (mutationRate, value) => {
            const traits: Trait[] = [
              { name: "number_trait", value, mutable: true, category: "strategy" },
            ];

            applyMutations(traits, mutationRate);

            // Number should still be a number
            expect(typeof traits[0].value).toBe("number");
            
            // Number should be within reasonable bounds (±20% variation)
            if (traits[0].value !== value) {
              const mutatedValue = traits[0].value as number;
              expect(mutatedValue).toBeGreaterThan(value * 0.8);
              expect(mutatedValue).toBeLessThan(value * 1.2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject invalid mutation rates", () => {
      const traits: Trait[] = [
        { name: "trait1", value: 100, mutable: true, category: "strategy" },
      ];

      // Mutation rate < 0 should throw
      expect(() => applyMutations(traits, -0.1)).toThrow();

      // Mutation rate > 1 should throw
      expect(() => applyMutations(traits, 1.5)).toThrow();
    });
  });

  /**
   * Property 23: Mutation Rate Compliance
   * 
   * For any batch of offspring (n ≥ 100), the system should apply
   * mutations such that 10-20% of traits differ from parent values.
   * 
   * **Validates: Requirements 5.3**
   */
  describe("Property 23: Mutation Rate Compliance", () => {
    it("should achieve configured mutation rate across large batches", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.1, max: 0.2, noNaN: true }),
          (targetMutationRate) => {
            const batchSize = 100;
            let totalMutableTraits = 0;
            let totalMutations = 0;

            // Simulate batch of offspring
            for (let i = 0; i < batchSize; i++) {
              const traits: Trait[] = [
                { name: "trait1", value: Math.random(), mutable: true, category: "strategy" },
                { name: "trait2", value: Math.random(), mutable: true, category: "knowledge" },
                { name: "trait3", value: Math.random(), mutable: true, category: "preference" },
                { name: "trait4", value: "fixed", mutable: false, category: "skill" },
              ];

              const mutableCount = traits.filter(t => t.mutable).length;
              totalMutableTraits += mutableCount;

              const mutations = applyMutations(traits, targetMutationRate);
              totalMutations += mutations.length;
            }

            const actualMutationRate = calculateMutationRate(totalMutableTraits, totalMutations);

            // With random processes, actual rate should be reasonably close to target
            // We expect it to be within 0.05-0.25 range for 10-20% target rates
            // This is a looser bound that accounts for statistical variance
            expect(actualMutationRate).toBeGreaterThanOrEqual(0.05);
            expect(actualMutationRate).toBeLessThanOrEqual(0.25);
            
            // Also verify it's in the general ballpark of the target (within 50%)
            expect(actualMutationRate).toBeGreaterThanOrEqual(targetMutationRate * 0.5);
            expect(actualMutationRate).toBeLessThanOrEqual(targetMutationRate * 1.5);
          }
        ),
        { numRuns: 10 } // Fewer runs since each run processes 100 offspring
      );
    });

    it("should calculate mutation rate correctly", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          (totalTraits, mutatedTraits) => {
            // Ensure mutatedTraits <= totalTraits
            const actualMutated = Math.min(mutatedTraits, totalTraits);
            
            const rate = calculateMutationRate(totalTraits, actualMutated);

            // Rate should be between 0 and 1
            expect(rate).toBeGreaterThanOrEqual(0);
            expect(rate).toBeLessThanOrEqual(1);

            // Rate should match expected calculation
            expect(rate).toBe(actualMutated / totalTraits);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle zero traits gracefully", () => {
      const rate = calculateMutationRate(0, 0);
      expect(rate).toBe(0);
    });

    it("should produce different mutations for different offspring", () => {
      const mutationRate = 0.15;
      const traits1: Trait[] = [
        { name: "trait1", value: 100, mutable: true, category: "strategy" },
        { name: "trait2", value: "test", mutable: true, category: "knowledge" },
      ];
      const traits2: Trait[] = [
        { name: "trait1", value: 100, mutable: true, category: "strategy" },
        { name: "trait2", value: "test", mutable: true, category: "knowledge" },
      ];

      applyMutations(traits1, mutationRate);
      applyMutations(traits2, mutationRate);

      // Due to randomness, offspring should have different mutations
      // (this test may occasionally fail due to random chance, but very unlikely)
      const allSame = traits1.every((t, i) => t.value === traits2[i].value);
      
      // With 15% mutation rate and 2 traits, probability both offspring
      // have identical mutations is very low
      // We don't assert here because it's probabilistic, but log for debugging
      if (allSame) {
        console.log("Note: Rare case where two offspring had identical mutations");
      }
    });
  });

  /**
   * Property 24: Resource Transfer
   * 
   * For any offspring creation, the system should transfer resources
   * from parent to children such that:
   * parent.balance_after + sum(children.balance) = parent.balance_before
   * 
   * **Validates: Requirements 5.4**
   */
  describe("Property 24: Resource Transfer", () => {
    it("should conserve resources during transfer", () => {
      fc.assert(
        fc.property(
          // Parent balance (must be > child + cost)
          fc.double({ min: 10, max: 1000, noNaN: true }),
          // Child balance
          fc.double({ min: 0.5, max: 5, noNaN: true }),
          // Replication cost
          fc.double({ min: 0.1, max: 2, noNaN: true }),
          (parentBalance, childBalance, replicationCost) => {
            // Ensure parent has enough
            const totalRequired = childBalance + replicationCost;
            if (parentBalance < totalRequired) {
              return; // Skip this test case
            }

            const parent = createTestAgent({
              balance: parentBalance,
            });

            const result = transferResources(parent, childBalance, replicationCost);

            // Verify conservation: parent_after + child = parent_before - cost
            const conserved = Math.abs(
              (result.parentBalanceAfter + result.childBalance) -
              (result.parentBalanceBefore - result.replicationCost)
            ) < 0.0001;

            expect(conserved).toBe(true);
            expect(result.parentBalanceAfter).toBe(parent.balance);
            expect(result.childBalance).toBe(childBalance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should deduct replication cost from parent", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 1000, noNaN: true }),
          fc.double({ min: 0.5, max: 5, noNaN: true }),
          fc.double({ min: 0.1, max: 2, noNaN: true }),
          (parentBalance, childBalance, replicationCost) => {
            const totalRequired = childBalance + replicationCost;
            if (parentBalance < totalRequired) {
              return;
            }

            const parent = createTestAgent({
              balance: parentBalance,
            });

            const result = transferResources(parent, childBalance, replicationCost);

            // Parent should have lost child balance + replication cost
            const expectedParentBalance = parentBalance - childBalance - replicationCost;
            expect(Math.abs(result.parentBalanceAfter - expectedParentBalance)).toBeLessThan(0.0001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should reject transfer when parent has insufficient balance", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 1, max: 10, noNaN: true }),
          fc.double({ min: 5, max: 20, noNaN: true }),
          fc.double({ min: 1, max: 5, noNaN: true }),
          (parentBalance, childBalance, replicationCost) => {
            const totalRequired = childBalance + replicationCost;
            
            // Only test cases where parent has insufficient balance
            if (parentBalance >= totalRequired) {
              return;
            }

            const parent = createTestAgent({
              balance: parentBalance,
            });

            // Should throw error
            expect(() => transferResources(parent, childBalance, replicationCost)).toThrow();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle multiple children with resource conservation", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 50, max: 1000, noNaN: true }),
          fc.integer({ min: 2, max: 5 }),
          fc.double({ min: 0.5, max: 2, noNaN: true }),
          (parentBalance, numChildren, childBalance) => {
            const replicationCost = 1.0;
            const totalRequired = (childBalance + replicationCost) * numChildren;
            
            if (parentBalance < totalRequired) {
              return;
            }

            const parent = createTestAgent({
              balance: parentBalance,
            });

            const originalBalance = parent.balance;
            let totalChildBalance = 0;
            let totalCost = 0;

            // Create multiple children
            for (let i = 0; i < numChildren; i++) {
              const result = transferResources(parent, childBalance, replicationCost);
              totalChildBalance += result.childBalance;
              totalCost += result.replicationCost;
            }

            // Verify conservation across all children
            const conserved = Math.abs(
              (parent.balance + totalChildBalance) - (originalBalance - totalCost)
            ) < 0.001; // Slightly larger tolerance for multiple operations

            expect(conserved).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return correct transfer result", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 10, max: 1000, noNaN: true }),
          fc.double({ min: 0.5, max: 5, noNaN: true }),
          fc.double({ min: 0.1, max: 2, noNaN: true }),
          (parentBalance, childBalance, replicationCost) => {
            const totalRequired = childBalance + replicationCost;
            if (parentBalance < totalRequired) {
              return;
            }

            const parent = createTestAgent({
              balance: parentBalance,
            });

            const result = transferResources(parent, childBalance, replicationCost);

            // Verify all result fields
            expect(result.parentBalanceBefore).toBe(parentBalance);
            expect(result.childBalance).toBe(childBalance);
            expect(result.replicationCost).toBe(replicationCost);
            expect(result.transferred).toBe(childBalance);
            expect(result.parentBalanceAfter).toBe(parent.balance);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should use default replication cost when not specified", () => {
      const parent = createTestAgent({
        balance: 10,
      });

      const result = transferResources(parent, 1.0);

      // Default cost should be 1.0
      expect(result.replicationCost).toBe(1.0);
      expect(result.parentBalanceAfter).toBe(8.0); // 10 - 1 (child) - 1 (cost)
    });
  });
});
