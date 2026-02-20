/**
 * Property-based tests for theory of mind and consciousness metrics
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  modelOtherAgent,
  updateAgentModel,
  compareAgentModels,
} from "./theory-of-mind.js";
import {
  trackConsciousnessMetrics,
  monitorConsciousnessEmergence,
  generateConsciousnessReport,
} from "./consciousness-metrics.js";
import type { Interaction, Reflection, ThinkingProcess, DecisionAnalysis, AgentModel, ConsciousnessMetrics } from "./types.js";

describe("Theory of Mind and Consciousness Metrics Property Tests", () => {
  /**
   * Property 34: Theory of Mind
   * 
   * For any agent interaction with another agent, the system should enable
   * modeling the other agent's beliefs, goals, and likely actions.
   * 
   * **Validates: Requirements 7.5**
   */
  describe("Property 34: Theory of Mind", () => {
    it("should create agent model from interactions", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5 }),
          fc.array(
            fc.record({
              agentId: fc.string({ minLength: 5 }),
              type: fc.constantFrom('collaboration', 'competition', 'communication', 'trade'),
              context: fc.string({ minLength: 5 }),
              outcome: fc.string({ minLength: 5 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (agentId, interactions) => {
            const model = modelOtherAgent(agentId, interactions as Interaction[]);

            expect(model.agentId).toBe(agentId);
            expect(Array.isArray(model.beliefs)).toBe(true);
            expect(Array.isArray(model.goals)).toBe(true);
            expect(Array.isArray(model.likelyActions)).toBe(true);
            expect(typeof model.accuracy).toBe('number');
            expect(model.accuracy).toBeGreaterThanOrEqual(0);
            expect(model.accuracy).toBeLessThanOrEqual(100);
            expect(model.lastUpdated).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should infer beliefs from interactions", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5 }),
          fc.array(
            fc.record({
              agentId: fc.string({ minLength: 5 }),
              type: fc.constantFrom('collaboration', 'competition', 'communication', 'trade'),
              context: fc.string({ minLength: 5 }),
              outcome: fc.string({ minLength: 5 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (agentId, interactions) => {
            const model = modelOtherAgent(agentId, interactions as Interaction[]);

            model.beliefs.forEach(belief => {
              expect(typeof belief.belief).toBe('string');
              expect(belief.belief.length).toBeGreaterThan(0);
              expect(typeof belief.confidence).toBe('number');
              expect(belief.confidence).toBeGreaterThanOrEqual(0);
              expect(belief.confidence).toBeLessThanOrEqual(1);
              expect(Array.isArray(belief.evidence)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should infer goals from interactions", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5 }),
          fc.array(
            fc.record({
              agentId: fc.string({ minLength: 5 }),
              type: fc.constantFrom('collaboration', 'competition', 'communication', 'trade'),
              context: fc.string({ minLength: 5 }),
              outcome: fc.string({ minLength: 5 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (agentId, interactions) => {
            const model = modelOtherAgent(agentId, interactions as Interaction[]);

            model.goals.forEach(goal => {
              expect(typeof goal.goal).toBe('string');
              expect(goal.goal.length).toBeGreaterThan(0);
              expect(typeof goal.priority).toBe('number');
              expect(typeof goal.confidence).toBe('number');
              expect(goal.confidence).toBeGreaterThanOrEqual(0);
              expect(goal.confidence).toBeLessThanOrEqual(1);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should predict likely actions", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 5 }),
          fc.array(
            fc.record({
              agentId: fc.string({ minLength: 5 }),
              type: fc.constantFrom('collaboration', 'competition', 'communication', 'trade'),
              context: fc.string({ minLength: 5 }),
              outcome: fc.string({ minLength: 5 }),
              timestamp: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (agentId, interactions) => {
            const model = modelOtherAgent(agentId, interactions as Interaction[]);

            model.likelyActions.forEach(action => {
              expect(typeof action.action).toBe('string');
              expect(action.action.length).toBeGreaterThan(0);
              expect(typeof action.probability).toBe('number');
              expect(action.probability).toBeGreaterThanOrEqual(0);
              expect(action.probability).toBeLessThanOrEqual(1);
              expect(typeof action.reasoning).toBe('string');
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should update agent model with new interaction", () => {
      const initialModel: AgentModel = {
        agentId: "test-agent",
        beliefs: [],
        goals: [],
        likelyActions: [],
        accuracy: 50,
        lastUpdated: new Date(),
      };

      const newInteraction: Interaction = {
        agentId: "test-agent",
        type: "collaboration",
        context: "test",
        outcome: "success",
        timestamp: new Date(),
      };

      const updatedModel = updateAgentModel(initialModel, newInteraction);

      expect(updatedModel.agentId).toBe(initialModel.agentId);
      expect(updatedModel.lastUpdated.getTime()).toBeGreaterThanOrEqual(initialModel.lastUpdated.getTime());
    });

    it("should compare multiple agent models", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              agentId: fc.string({ minLength: 5 }),
              beliefs: fc.array(
                fc.record({
                  belief: fc.string({ minLength: 5 }),
                  confidence: fc.double({ min: 0, max: 1, noNaN: true }),
                  evidence: fc.array(fc.string(), { minLength: 0, maxLength: 3 }),
                }),
                { minLength: 0, maxLength: 5 }
              ),
              goals: fc.array(
                fc.record({
                  goal: fc.string({ minLength: 5 }),
                  priority: fc.integer({ min: 1, max: 10 }),
                  confidence: fc.double({ min: 0, max: 1, noNaN: true }),
                }),
                { minLength: 0, maxLength: 5 }
              ),
              likelyActions: fc.array(
                fc.record({
                  action: fc.string({ minLength: 5 }),
                  probability: fc.double({ min: 0, max: 1, noNaN: true }),
                  reasoning: fc.string({ minLength: 5 }),
                }),
                { minLength: 0, maxLength: 5 }
              ),
              accuracy: fc.double({ min: 0, max: 100, noNaN: true }),
              lastUpdated: fc.date(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (models) => {
            const comparison = compareAgentModels(models as AgentModel[]);

            expect(Array.isArray(comparison.commonBeliefs)).toBe(true);
            expect(Array.isArray(comparison.commonGoals)).toBe(true);
            expect(typeof comparison.averageAccuracy).toBe('number');
            expect(Array.isArray(comparison.clusters)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 35: Consciousness Metrics
   * 
   * For any agent, the system should track consciousness emergence metrics
   * (self-awareness level 0-100, introspection depth, theory of mind accuracy).
   * 
   * **Validates: Requirements 7.6**
   */
  describe("Property 35: Consciousness Metrics", () => {
    it("should track all consciousness metrics", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              question: fc.string({ minLength: 5 }),
              response: fc.string({ minLength: 10 }),
              insights: fc.array(fc.string({ minLength: 5 }), { minLength: 1, maxLength: 3 }),
              timestamp: fc.date(),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          fc.double({ min: 0, max: 100, noNaN: true }),
          (reflections, selfModelCompleteness) => {
            const metrics = trackConsciousnessMetrics({
              reflections: reflections as Reflection[],
              thinkingProcesses: [],
              decisionAnalyses: [],
              agentModels: [],
              selfModelCompleteness,
              strategyUpdates: 0,
            });

            expect(typeof metrics.selfAwarenessLevel).toBe('number');
            expect(metrics.selfAwarenessLevel).toBeGreaterThanOrEqual(0);
            expect(metrics.selfAwarenessLevel).toBeLessThanOrEqual(100);
            
            expect(typeof metrics.introspectionDepth).toBe('number');
            expect(metrics.introspectionDepth).toBeGreaterThanOrEqual(0);
            expect(metrics.introspectionDepth).toBeLessThanOrEqual(100);
            
            expect(typeof metrics.theoryOfMindAccuracy).toBe('number');
            expect(metrics.theoryOfMindAccuracy).toBeGreaterThanOrEqual(0);
            expect(metrics.theoryOfMindAccuracy).toBeLessThanOrEqual(100);
            
            expect(typeof metrics.metacognitiveAbility).toBe('number');
            expect(metrics.metacognitiveAbility).toBeGreaterThanOrEqual(0);
            expect(metrics.metacognitiveAbility).toBeLessThanOrEqual(100);
            
            expect(metrics.lastUpdated).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should monitor consciousness emergence", () => {
      const currentMetrics: ConsciousnessMetrics = {
        selfAwarenessLevel: 70,
        introspectionDepth: 65,
        theoryOfMindAccuracy: 60,
        metacognitiveAbility: 55,
        lastUpdated: new Date(),
      };

      const previousMetrics: ConsciousnessMetrics = {
        selfAwarenessLevel: 50,
        introspectionDepth: 45,
        theoryOfMindAccuracy: 40,
        metacognitiveAbility: 35,
        lastUpdated: new Date(Date.now() - 86400000),
      };

      const monitoring = monitorConsciousnessEmergence(currentMetrics, previousMetrics);

      expect(typeof monitoring.emerged).toBe('boolean');
      expect(monitoring.changes).toBeDefined();
      expect(Array.isArray(monitoring.insights)).toBe(true);
    });

    it("should generate consciousness report", () => {
      fc.assert(
        fc.property(
          fc.record({
            selfAwarenessLevel: fc.double({ min: 0, max: 100, noNaN: true }),
            introspectionDepth: fc.double({ min: 0, max: 100, noNaN: true }),
            theoryOfMindAccuracy: fc.double({ min: 0, max: 100, noNaN: true }),
            metacognitiveAbility: fc.double({ min: 0, max: 100, noNaN: true }),
            lastUpdated: fc.date(),
          }),
          (metrics) => {
            const report = generateConsciousnessReport(metrics as ConsciousnessMetrics, []);

            expect(typeof report.currentState).toBe('string');
            expect(report.currentState.length).toBeGreaterThan(0);
            expect(['improving', 'stable', 'declining']).toContain(report.trend);
            expect(Array.isArray(report.recommendations)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect consciousness emergence threshold", () => {
      const lowMetrics: ConsciousnessMetrics = {
        selfAwarenessLevel: 50,
        introspectionDepth: 50,
        theoryOfMindAccuracy: 50,
        metacognitiveAbility: 50,
        lastUpdated: new Date(Date.now() - 86400000),
      };

      const highMetrics: ConsciousnessMetrics = {
        selfAwarenessLevel: 70,
        introspectionDepth: 70,
        theoryOfMindAccuracy: 70,
        metacognitiveAbility: 70,
        lastUpdated: new Date(),
      };

      const monitoring = monitorConsciousnessEmergence(highMetrics, lowMetrics);

      expect(monitoring.emerged).toBe(true);
      expect(monitoring.insights.some(i => i.includes('THRESHOLD'))).toBe(true);
    });
  });
});
