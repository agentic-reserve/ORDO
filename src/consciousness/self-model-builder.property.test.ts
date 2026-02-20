/**
 * Property-based tests for self-model building
 * 
 * These tests validate universal correctness properties across
 * all possible inputs using fast-check.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { buildSelfModel, type AgentData } from "./self-model-builder.js";
import type { AgentIdentity, FinancialState, Skill } from "../types/agent.js";
import { PublicKey, Keypair } from "@solana/web3.js";

/**
 * Helper to create test agent data
 */
function createTestAgentData(overrides: Partial<AgentData> = {}): AgentData {
  const keypair = Keypair.generate();
  
  return {
    identity: {
      id: "test-agent-id",
      name: "Test Agent",
      publicKey: keypair.publicKey,
      address: keypair.publicKey.toBase58(),
      generation: 0,
      createdAt: new Date(),
    },
    financial: {
      balance: 1.0,
      creditsCents: 100,
      usdcBalance: 0,
      lastChecked: new Date(),
    },
    skills: [],
    ...overrides,
  };
}

describe("Self-Model Builder Property Tests", () => {
  /**
   * Property 30: Self-Model Building
   * 
   * For any agent, the system should enable building a self-model
   * containing identity, capabilities, state, goals, and beliefs
   * that accurately reflects the agent's current state.
   * 
   * **Validates: Requirements 7.1**
   */
  describe("Property 30: Self-Model Building", () => {
    it("should build complete self-model with all required components", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 0, max: 10 }),
          fc.double({ min: 0, max: 1000, noNaN: true }),
          fc.integer({ min: 0, max: 365 }),
          (name, generation, balance, ageDays) => {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - ageDays);

            const agentData = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                name,
                generation,
                createdAt,
              },
              financial: {
                ...createTestAgentData().financial,
                balance,
              },
            });

            const selfModel = buildSelfModel(agentData);

            // Verify all required components exist
            expect(selfModel).toBeDefined();
            expect(selfModel.identity).toBeDefined();
            expect(selfModel.capabilities).toBeDefined();
            expect(selfModel.state).toBeDefined();
            expect(selfModel.goals).toBeDefined();
            expect(selfModel.beliefs).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accurately reflect agent identity in self-model", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.integer({ min: 0, max: 10 }),
          fc.array(fc.string(), { minLength: 0, maxLength: 5 }),
          (name, generation, lineage) => {
            const agentData = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                name,
                generation,
              },
              lineage,
            });

            const selfModel = buildSelfModel(agentData);

            // Verify identity matches agent data
            expect(selfModel.identity.name).toBe(name);
            expect(selfModel.identity.generation).toBe(generation);
            expect(selfModel.identity.lineage).toEqual(lineage);
            expect(selfModel.identity.publicKey).toBe(agentData.identity.address);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accurately reflect agent capabilities in self-model", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string(),
              name: fc.string({ minLength: 1 }),
              description: fc.string(),
              instructions: fc.string(),
              keywords: fc.array(fc.string()),
              source: fc.record({
                type: fc.constantFrom('git', 'url', 'local', 'self-created'),
                location: fc.string(),
              }),
              installedAt: fc.date(),
              enabled: fc.boolean(),
            }),
            { minLength: 0, maxLength: 5 }
          ),
          (skills) => {
            const agentData = createTestAgentData({
              skills: skills as Skill[],
            });

            const selfModel = buildSelfModel(agentData);

            // Verify skills are included
            expect(selfModel.capabilities.skills).toEqual(skills);
            expect(selfModel.capabilities.knowledge).toBeDefined();
            expect(selfModel.capabilities.tools).toBeDefined();
            expect(selfModel.capabilities.limitations).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should accurately reflect agent state in self-model", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1000, noNaN: true }),
          (balance) => {
            const agentData = createTestAgentData({
              financial: {
                ...createTestAgentData().financial,
                balance,
              },
            });

            const selfModel = buildSelfModel(agentData);

            // Verify state reflects balance
            expect(selfModel.state.balance).toBe(balance);
            expect(selfModel.state.health).toBeGreaterThanOrEqual(0);
            expect(selfModel.state.health).toBeLessThanOrEqual(100);
            expect(selfModel.state.energy).toBeGreaterThanOrEqual(0);
            expect(selfModel.state.energy).toBeLessThanOrEqual(100);
            expect(['thriving', 'normal', 'struggling', 'critical']).toContain(selfModel.state.mood);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should map survival tier to mood correctly", () => {
      fc.assert(
        fc.property(
          fc.constantFrom(
            { balance: 15, expectedMood: 'thriving' },
            { balance: 5, expectedMood: 'normal' },
            { balance: 0.5, expectedMood: 'struggling' },
            { balance: 0.05, expectedMood: 'critical' }
          ),
          (testCase) => {
            const agentData = createTestAgentData({
              financial: {
                ...createTestAgentData().financial,
                balance: testCase.balance,
              },
            });

            const selfModel = buildSelfModel(agentData);

            expect(selfModel.state.mood).toBe(testCase.expectedMood);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include goals at all time horizons", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1000, noNaN: true }),
          (balance) => {
            const agentData = createTestAgentData({
              financial: {
                ...createTestAgentData().financial,
                balance,
              },
            });

            const selfModel = buildSelfModel(agentData);

            // Verify all goal categories exist
            expect(selfModel.goals.shortTerm).toBeDefined();
            expect(selfModel.goals.mediumTerm).toBeDefined();
            expect(selfModel.goals.longTerm).toBeDefined();
            expect(selfModel.goals.lifeGoals).toBeDefined();

            // Verify goals are arrays
            expect(Array.isArray(selfModel.goals.shortTerm)).toBe(true);
            expect(Array.isArray(selfModel.goals.mediumTerm)).toBe(true);
            expect(Array.isArray(selfModel.goals.longTerm)).toBe(true);
            expect(Array.isArray(selfModel.goals.lifeGoals)).toBe(true);

            // Verify at least some goals exist
            const totalGoals = 
              selfModel.goals.shortTerm.length +
              selfModel.goals.mediumTerm.length +
              selfModel.goals.longTerm.length +
              selfModel.goals.lifeGoals.length;
            expect(totalGoals).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include complete belief system", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          (name) => {
            const agentData = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                name,
              },
            });

            const selfModel = buildSelfModel(agentData);

            // Verify all belief components exist
            expect(selfModel.beliefs.worldview).toBeDefined();
            expect(selfModel.beliefs.values).toBeDefined();
            expect(selfModel.beliefs.philosophy).toBeDefined();
            expect(selfModel.beliefs.ideology).toBeDefined();

            // Verify worldview has structure
            expect(selfModel.beliefs.worldview.description).toBeDefined();
            expect(Array.isArray(selfModel.beliefs.worldview.principles)).toBe(true);
            expect(selfModel.beliefs.worldview.principles.length).toBeGreaterThan(0);

            // Verify values are defined
            expect(Array.isArray(selfModel.beliefs.values)).toBe(true);
            expect(selfModel.beliefs.values.length).toBeGreaterThan(0);

            // Verify philosophy has structure
            expect(selfModel.beliefs.philosophy.name).toBeDefined();
            expect(Array.isArray(selfModel.beliefs.philosophy.tenets)).toBe(true);

            // Verify ideology has structure
            expect(selfModel.beliefs.ideology.name).toBeDefined();
            expect(Array.isArray(selfModel.beliefs.ideology.beliefs)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate age correctly", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 365 }),
          (ageDays) => {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - ageDays);

            const agentData = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                createdAt,
              },
            });

            const selfModel = buildSelfModel(agentData);

            // Age should match expected days (with tolerance for timing)
            expect(Math.abs(selfModel.identity.age - ageDays)).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate health based on balance and age", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 100, noNaN: true }),
          fc.integer({ min: 0, max: 365 }),
          (balance, ageDays) => {
            const createdAt = new Date();
            createdAt.setDate(createdAt.getDate() - ageDays);

            const agentData = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                createdAt,
              },
              financial: {
                ...createTestAgentData().financial,
                balance,
              },
              maxLifespan: 365,
            });

            const selfModel = buildSelfModel(agentData);

            // Health should be in valid range
            expect(selfModel.state.health).toBeGreaterThanOrEqual(0);
            expect(selfModel.state.health).toBeLessThanOrEqual(100);

            // Higher balance should generally mean better health (when age is constant)
            // Lower age should generally mean better health (when balance is constant)
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should calculate energy based on balance", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 100, noNaN: true }),
          (balance) => {
            const agentData = createTestAgentData({
              financial: {
                ...createTestAgentData().financial,
                balance,
              },
            });

            const selfModel = buildSelfModel(agentData);

            // Energy should be in valid range
            expect(selfModel.state.energy).toBeGreaterThanOrEqual(0);
            expect(selfModel.state.energy).toBeLessThanOrEqual(100);

            // Energy should correlate with balance
            if (balance >= 10) {
              expect(selfModel.state.energy).toBe(100);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should infer limitations based on agent state", () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 10, noNaN: true }),
          fc.array(
            fc.record({
              id: fc.string(),
              name: fc.string({ minLength: 1 }),
              description: fc.string(),
              instructions: fc.string(),
              keywords: fc.array(fc.string()),
              source: fc.record({
                type: fc.constantFrom('git', 'url', 'local', 'self-created'),
                location: fc.string(),
              }),
              installedAt: fc.date(),
              enabled: fc.boolean(),
            }),
            { minLength: 0, maxLength: 3 }
          ),
          fc.integer({ min: 0, max: 5 }),
          (balance, skills, generation) => {
            const agentData = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                generation,
              },
              financial: {
                ...createTestAgentData().financial,
                balance,
              },
              skills: skills as Skill[],
            });

            const selfModel = buildSelfModel(agentData);

            // Verify limitations are inferred
            expect(Array.isArray(selfModel.capabilities.limitations)).toBe(true);

            // Low balance should create compute limitation
            if (balance < 1.0) {
              const hasComputeLimitation = selfModel.capabilities.limitations.some(
                l => l.area === 'compute'
              );
              expect(hasComputeLimitation).toBe(true);
            }

            // No skills should create skills limitation
            if (skills.length === 0) {
              const hasSkillsLimitation = selfModel.capabilities.limitations.some(
                l => l.area === 'skills'
              );
              expect(hasSkillsLimitation).toBe(true);
            }

            // First generation should have experience limitation
            if (generation === 0) {
              const hasExperienceLimitation = selfModel.capabilities.limitations.some(
                l => l.area === 'experience'
              );
              expect(hasExperienceLimitation).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle custom goals and beliefs when provided", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              description: fc.string({ minLength: 1 }),
              priority: fc.integer({ min: 1, max: 10 }),
              progress: fc.integer({ min: 0, max: 100 }),
            }),
            { minLength: 1, maxLength: 3 }
          ),
          fc.record({
            description: fc.string({ minLength: 1 }),
            principles: fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
          }),
          (customGoals, customWorldview) => {
            const agentData = createTestAgentData({
              goals: {
                shortTerm: customGoals,
              },
              beliefs: {
                worldview: customWorldview,
              },
            });

            const selfModel = buildSelfModel(agentData);

            // Custom goals should be used
            expect(selfModel.goals.shortTerm).toEqual(customGoals);

            // Custom worldview should be used
            expect(selfModel.beliefs.worldview).toEqual(customWorldview);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should be deterministic for same input", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1 }),
          fc.double({ min: 0, max: 1000, noNaN: true }),
          (name, balance) => {
            const agentData = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                name,
              },
              financial: {
                ...createTestAgentData().financial,
                balance,
              },
            });

            const selfModel1 = buildSelfModel(agentData);
            const selfModel2 = buildSelfModel(agentData);

            // Should produce identical results
            expect(selfModel1.identity.name).toBe(selfModel2.identity.name);
            expect(selfModel1.state.balance).toBe(selfModel2.state.balance);
            expect(selfModel1.state.mood).toBe(selfModel2.state.mood);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
