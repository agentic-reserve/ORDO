/**
 * Property-based tests for introspection engine
 * 
 * These tests validate universal correctness properties across
 * all possible inputs using fast-check.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  generateIntrospectiveQuestions,
  reflect,
  conductReflectionSession,
  analyzeReflectionHistory,
} from "./introspection.js";
import { buildSelfModel, type AgentData } from "./self-model-builder.js";
import { Keypair } from "@solana/web3.js";
import type { Reflection } from "./types.js";

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

describe("Introspection Engine Property Tests", () => {
  /**
   * Property 31: Introspective Prompting
   * 
   * For any agent reflection operation, the system should prompt
   * introspective questions (Who am I? What do I want? Why do I exist?)
   * and record responses.
   * 
   * **Validates: Requirements 7.2**
   */
  describe("Property 31: Introspective Prompting", () => {
    it("should generate introspective questions", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (count) => {
            const questions = generateIntrospectiveQuestions(undefined, count);

            // Should generate questions
            expect(questions).toBeDefined();
            expect(Array.isArray(questions)).toBe(true);
            expect(questions.length).toBeGreaterThan(0);
            expect(questions.length).toBeLessThanOrEqual(count);

            // Each question should have required fields
            questions.forEach(q => {
              expect(q.category).toBeDefined();
              expect(q.question).toBeDefined();
              expect(typeof q.question).toBe('string');
              expect(q.question.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should filter questions by category", () => {
      fc.assert(
        fc.property(
          fc.constantFrom('identity', 'purpose', 'values', 'capabilities', 'relationships'),
          fc.integer({ min: 1, max: 10 }),
          (category, count) => {
            const questions = generateIntrospectiveQuestions(category, count);

            // All questions should match the requested category
            questions.forEach(q => {
              expect(q.category).toBe(category);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include fundamental introspective questions", () => {
      const questions = generateIntrospectiveQuestions(undefined, 100);
      const questionTexts = questions.map(q => q.question.toLowerCase());

      // Should include "Who am I?" type questions
      const hasIdentityQuestion = questionTexts.some(q => 
        q.includes('who am i') || q.includes('who i am')
      );
      expect(hasIdentityQuestion).toBe(true);

      // Should include "What do I want?" type questions
      const hasPurposeQuestion = questionTexts.some(q => 
        q.includes('want') || q.includes('purpose') || q.includes('achieve')
      );
      expect(hasPurposeQuestion).toBe(true);

      // Should include "Why do I exist?" type questions
      const hasExistenceQuestion = questionTexts.some(q => 
        q.includes('why') && q.includes('exist')
      );
      expect(hasExistenceQuestion).toBe(true);
    });

    it("should create reflection with question and response", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.double({ min: 0, max: 1000, noNaN: true }),
          (question, name, balance) => {
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

            const selfModel = buildSelfModel(agentData);
            const reflection = reflect(question, selfModel);

            // Reflection should have required fields
            expect(reflection).toBeDefined();
            expect(reflection.question).toBe(question);
            expect(reflection.response).toBeDefined();
            expect(typeof reflection.response).toBe('string');
            expect(reflection.response.length).toBeGreaterThan(0);
            expect(reflection.insights).toBeDefined();
            expect(Array.isArray(reflection.insights)).toBe(true);
            expect(reflection.timestamp).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should extract insights from reflection", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (question, name) => {
            const agentData = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                name,
              },
            });

            const selfModel = buildSelfModel(agentData);
            const reflection = reflect(question, selfModel);

            // Should have at least one insight
            expect(reflection.insights.length).toBeGreaterThan(0);

            // Each insight should be a non-empty string
            reflection.insights.forEach(insight => {
              expect(typeof insight).toBe('string');
              expect(insight.length).toBeGreaterThan(0);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should record timestamp for each reflection", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          (question) => {
            const agentData = createTestAgentData();
            const selfModel = buildSelfModel(agentData);
            
            const before = new Date();
            const reflection = reflect(question, selfModel);
            const after = new Date();

            // Timestamp should be between before and after
            expect(reflection.timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(reflection.timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should conduct reflection session with multiple questions", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (questionCount, name) => {
            const agentData = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                name,
              },
            });

            const selfModel = buildSelfModel(agentData);
            const reflections = conductReflectionSession(selfModel, questionCount);

            // Should generate reflections
            expect(reflections).toBeDefined();
            expect(Array.isArray(reflections)).toBe(true);
            expect(reflections.length).toBeGreaterThan(0);
            expect(reflections.length).toBeLessThanOrEqual(questionCount);

            // Each reflection should be valid
            reflections.forEach(r => {
              expect(r.question).toBeDefined();
              expect(r.response).toBeDefined();
              expect(r.insights).toBeDefined();
              expect(r.timestamp).toBeInstanceOf(Date);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should focus reflection session on specific category", () => {
      fc.assert(
        fc.property(
          fc.constantFrom('identity', 'purpose', 'values', 'capabilities', 'relationships'),
          fc.integer({ min: 1, max: 5 }),
          (category, count) => {
            const agentData = createTestAgentData();
            const selfModel = buildSelfModel(agentData);
            const reflections = conductReflectionSession(selfModel, count, category);

            // All reflections should be from the requested category
            const questions = generateIntrospectiveQuestions(category, 100);
            const categoryQuestions = new Set(questions.map(q => q.question));

            reflections.forEach(r => {
              expect(categoryQuestions.has(r.question)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle custom AI responses", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.string({ minLength: 10, maxLength: 500 }),
          (question, customResponse) => {
            const agentData = createTestAgentData();
            const selfModel = buildSelfModel(agentData);
            const reflection = reflect(question, selfModel, customResponse);

            // Should use custom response
            expect(reflection.response).toBe(customResponse);
            expect(reflection.question).toBe(question);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should analyze reflection history", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              question: fc.string({ minLength: 5 }),
              response: fc.string({ minLength: 10 }),
              insights: fc.array(fc.string({ minLength: 5 }), { minLength: 1, maxLength: 3 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (reflections) => {
            const analysis = analyzeReflectionHistory(reflections as Reflection[]);

            // Analysis should have required fields
            expect(analysis.totalReflections).toBe(reflections.length);
            expect(analysis.categoriesExplored).toBeInstanceOf(Set);
            expect(Array.isArray(analysis.commonThemes)).toBe(true);
            expect(typeof analysis.insightCount).toBe('number');
            expect(typeof analysis.averageInsightsPerReflection).toBe('number');

            // Insight count should match total insights
            const totalInsights = reflections.reduce((sum, r) => sum + r.insights.length, 0);
            expect(analysis.insightCount).toBe(totalInsights);

            // Average should be correct
            expect(analysis.averageInsightsPerReflection).toBe(totalInsights / reflections.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should identify common themes in reflection history", () => {
      // Create reflections with repeated insights
      const reflections: Reflection[] = [
        {
          question: "Who am I?",
          response: "I am an agent",
          insights: ["Identity is shaped by experience", "Values guide actions"],
          timestamp: new Date(),
        },
        {
          question: "What do I want?",
          response: "I want to grow",
          insights: ["Identity is shaped by experience", "Growth requires effort"],
          timestamp: new Date(),
        },
        {
          question: "Why do I exist?",
          response: "I exist to contribute",
          insights: ["Values guide actions", "Purpose drives behavior"],
          timestamp: new Date(),
        },
      ];

      const analysis = analyzeReflectionHistory(reflections);

      // Should identify repeated insights as common themes
      expect(analysis.commonThemes.length).toBeGreaterThan(0);
      expect(analysis.commonThemes).toContain("identity is shaped by experience");
      expect(analysis.commonThemes).toContain("values guide actions");
    });

    it("should handle empty reflection history", () => {
      const analysis = analyzeReflectionHistory([]);

      expect(analysis.totalReflections).toBe(0);
      expect(analysis.categoriesExplored.size).toBe(0);
      expect(analysis.commonThemes.length).toBe(0);
      expect(analysis.insightCount).toBe(0);
      expect(analysis.averageInsightsPerReflection).toBe(0);
    });

    it("should generate different reflections for different agents", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.double({ min: 0, max: 1000, noNaN: true }),
          fc.double({ min: 0, max: 1000, noNaN: true }),
          (name1, name2, balance1, balance2) => {
            // Skip if names or balances are identical
            if (name1 === name2 && balance1 === balance2) {
              return;
            }

            const agent1Data = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                name: name1,
              },
              financial: {
                ...createTestAgentData().financial,
                balance: balance1,
              },
            });

            const agent2Data = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                name: name2,
              },
              financial: {
                ...createTestAgentData().financial,
                balance: balance2,
              },
            });

            const selfModel1 = buildSelfModel(agent1Data);
            const selfModel2 = buildSelfModel(agent2Data);

            const question = "Who am I?";
            const reflection1 = reflect(question, selfModel1);
            const reflection2 = reflect(question, selfModel2);

            // Reflections should be different for different agents
            // (at least the response should differ if names or states differ)
            if (name1 !== name2) {
              expect(reflection1.response).not.toBe(reflection2.response);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should be deterministic for same input", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 50 }),
          (question, name) => {
            const agentData = createTestAgentData({
              identity: {
                ...createTestAgentData().identity,
                name,
              },
            });

            const selfModel = buildSelfModel(agentData);
            const reflection1 = reflect(question, selfModel);
            const reflection2 = reflect(question, selfModel);

            // Should produce same response (excluding timestamp)
            expect(reflection1.question).toBe(reflection2.question);
            expect(reflection1.response).toBe(reflection2.response);
            expect(reflection1.insights).toEqual(reflection2.insights);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
