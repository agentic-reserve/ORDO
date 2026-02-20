/**
 * Property-based tests for agent death handling
 * Property 8: Starvation Death
 * Property 9: Age Death
 * Property 10: Legacy Distribution
 */

import { describe, test, expect } from "vitest";
import * as fc from "fast-check";
import { checkStarvation, checkOldAge, checkSurvivalConditions } from "./death.js";
import { ulid } from "ulid";
import { config } from "../config.js";
import type { Agent } from "../types.js";

describe("Property 8: Starvation Death", () => {
  // Feature: ordo-digital-civilization, Property 8: Starvation Death
  // Validates: Requirements 2.3

  test("agents with balance below critical threshold should die from starvation", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: config.economic.survivalTierCritical - 0.001, noNaN: true }),
        (balance) => {
          const agent: Agent = {
            id: ulid(),
            publicKey: `test-${ulid()}`,
            name: "Test Agent",
            generation: 0,
            childrenIds: [],
            birthDate: new Date(),
            age: 10,
            maxLifespan: 365,
            status: "alive",
            balance,
            survivalTier: "critical",
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

          // Property: Agent with balance < critical threshold should starve
          expect(checkStarvation(agent)).toBe(true);
          
          // Property: Survival check should return starvation
          expect(checkSurvivalConditions(agent)).toBe("starvation");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("agents with balance above critical threshold should not die from starvation", () => {
    fc.assert(
      fc.property(
        fc.double({ min: config.economic.survivalTierCritical, max: 100, noNaN: true }),
        (balance) => {
          const agent: Agent = {
            id: ulid(),
            publicKey: `test-${ulid()}`,
            name: "Test Agent",
            generation: 0,
            childrenIds: [],
            birthDate: new Date(),
            age: 10,
            maxLifespan: 365,
            status: "alive",
            balance,
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

          // Property: Agent with balance >= critical threshold should not starve
          expect(checkStarvation(agent)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 9: Age Death", () => {
  // Feature: ordo-digital-civilization, Property 9: Age Death
  // Validates: Requirements 2.4

  test("agents exceeding maximum lifespan should die from old age", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // max lifespan
        fc.integer({ min: 0, max: 100 }), // extra days beyond max
        (maxLifespan, extraDays) => {
          const age = maxLifespan + extraDays;
          
          const agent: Agent = {
            id: ulid(),
            publicKey: `test-${ulid()}`,
            name: "Test Agent",
            generation: 0,
            childrenIds: [],
            birthDate: new Date(),
            age,
            maxLifespan,
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

          // Property: Agent with age >= maxLifespan should die from old age
          expect(checkOldAge(agent)).toBe(true);
          
          // Property: Survival check should return old_age (if not starving)
          expect(checkSurvivalConditions(agent)).toBe("old_age");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("agents below maximum lifespan should not die from old age", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }), // max lifespan
        fc.integer({ min: 0, max: 99 }), // age below max
        (maxLifespan, age) => {
          const agent: Agent = {
            id: ulid(),
            publicKey: `test-${ulid()}`,
            name: "Test Agent",
            generation: 0,
            childrenIds: [],
            birthDate: new Date(),
            age,
            maxLifespan,
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

          // Property: Agent with age < maxLifespan should not die from old age
          expect(checkOldAge(agent)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe("Property 10: Legacy Distribution", () => {
  // Feature: ordo-digital-civilization, Property 10: Legacy Distribution
  // Validates: Requirements 2.5

  test("starvation takes precedence over old age", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: config.economic.survivalTierCritical - 0.001, noNaN: true }),
        fc.integer({ min: 365, max: 1000 }),
        (balance, age) => {
          const agent: Agent = {
            id: ulid(),
            publicKey: `test-${ulid()}`,
            name: "Test Agent",
            generation: 0,
            childrenIds: [],
            birthDate: new Date(),
            age,
            maxLifespan: 365,
            status: "alive",
            balance,
            survivalTier: "critical",
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

          // Property: Starvation should be checked before old age
          expect(checkSurvivalConditions(agent)).toBe("starvation");
        }
      ),
      { numRuns: 100 }
    );
  });

  test("agents meeting neither death condition should survive", () => {
    fc.assert(
      fc.property(
        fc.double({ min: config.economic.survivalTierCritical, max: 100, noNaN: true }),
        fc.integer({ min: 0, max: 364 }),
        (balance, age) => {
          const agent: Agent = {
            id: ulid(),
            publicKey: `test-${ulid()}`,
            name: "Test Agent",
            generation: 0,
            childrenIds: [],
            birthDate: new Date(),
            age,
            maxLifespan: 365,
            status: "alive",
            balance,
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

          // Property: Agent meeting neither death condition should survive
          expect(checkSurvivalConditions(agent)).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
