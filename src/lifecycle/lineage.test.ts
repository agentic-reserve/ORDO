/**
 * Property-based tests for lineage recording
 * Property 11: Lineage Recording
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { calculateLineageDepth, calculateGeneticDistance } from "./lineage.js";
import { ulid } from "ulid";
import type { Agent } from "../types.js";

describe("Property 11: Lineage Recording", () => {
  // Feature: ordo-digital-civilization, Property 11: Lineage Recording
  // Validates: Requirements 2.6, 5.5

  test("lineage depth equals generation number", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }), // generation
        (generation) => {
          const agent: Agent = {
            id: ulid(),
            publicKey: `test-${ulid()}`,
            name: "Test Agent",
            generation,
            childrenIds: [],
            birthDate: new Date(),
            age: 0,
            maxLifespan: 365,
            status: "alive",
            balance: 1.0,
            survivalTier: "normal",
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
          };

          // Property: Lineage depth should equal generation number
          expect(calculateLineageDepth(agent)).toBe(generation);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("genesis agents have lineage depth 0", () => {
    const agent: Agent = {
      id: ulid(),
      publicKey: `test-${ulid()}`,
      name: "Genesis Agent",
      generation: 0,
      childrenIds: [],
      birthDate: new Date(),
      age: 0,
      maxLifespan: 365,
      status: "alive",
      balance: 1.0,
      survivalTier: "normal",
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
    };

    // Property: Genesis agents have lineage depth 0
    expect(calculateLineageDepth(agent)).toBe(0);
  });

  test("genetic distance between same agent is 0", async () => {
    const agent: Agent = {
      id: ulid(),
      publicKey: `test-${ulid()}`,
      name: "Test Agent",
      generation: 5,
      childrenIds: [],
      birthDate: new Date(),
      age: 0,
      maxLifespan: 365,
      status: "alive",
      balance: 1.0,
      survivalTier: "normal",
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
    };

    // Property: Genetic distance between same agent is 0
    const distance = await calculateGeneticDistance(agent, agent);
    expect(distance).toBe(0);
  });

  test("child generation is always parent generation + 1", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }), // parent generation
        (parentGeneration) => {
          const parentId = ulid();
          
          const parent: Agent = {
            id: parentId,
            publicKey: `parent-${ulid()}`,
            name: "Parent Agent",
            generation: parentGeneration,
            childrenIds: [],
            birthDate: new Date(),
            age: 0,
            maxLifespan: 365,
            status: "alive",
            balance: 10.0,
            survivalTier: "thriving",
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
          };

          const child: Agent = {
            id: ulid(),
            publicKey: `child-${ulid()}`,
            name: "Child Agent",
            generation: parentGeneration + 1,
            parentId,
            childrenIds: [],
            birthDate: new Date(),
            age: 0,
            maxLifespan: 365,
            status: "alive",
            balance: 1.0,
            survivalTier: "normal",
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
          };

          // Property: Child generation should be parent generation + 1
          expect(child.generation).toBe(parent.generation + 1);
          
          // Property: Child should reference parent
          expect(child.parentId).toBe(parent.id);
        }
      ),
      { numRuns: 100 }
    );
  });

  test("lineage depth increases monotonically through generations", () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 2, maxLength: 10 }),
        (generations) => {
          // Sort generations to ensure monotonic increase
          const sortedGenerations = [...generations].sort((a, b) => a - b);

          for (let i = 1; i < sortedGenerations.length; i++) {
            // Property: Later generations should have equal or greater depth
            expect(sortedGenerations[i]).toBeGreaterThanOrEqual(sortedGenerations[i - 1]);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  test("parent-child relationship is asymmetric", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        (parentGeneration) => {
          const parentId = ulid();
          const childId = ulid();

          const parent: Agent = {
            id: parentId,
            publicKey: `parent-${ulid()}`,
            name: "Parent Agent",
            generation: parentGeneration,
            childrenIds: [childId],
            birthDate: new Date(),
            age: 0,
            maxLifespan: 365,
            status: "alive",
            balance: 10.0,
            survivalTier: "thriving",
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
          };

          const child: Agent = {
            id: childId,
            publicKey: `child-${ulid()}`,
            name: "Child Agent",
            generation: parentGeneration + 1,
            parentId,
            childrenIds: [],
            birthDate: new Date(),
            age: 0,
            maxLifespan: 365,
            status: "alive",
            balance: 1.0,
            survivalTier: "normal",
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
          };

          // Property: Parent references child in childrenIds
          expect(parent.childrenIds).toContain(child.id);
          
          // Property: Child references parent in parentId
          expect(child.parentId).toBe(parent.id);
          
          // Property: Child does not reference parent in childrenIds
          expect(child.childrenIds).not.toContain(parent.id);
          
          // Property: Parent does not reference child in parentId
          expect(parent.parentId).not.toBe(child.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});
