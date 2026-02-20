/**
 * Property-Based Tests for Cultural Practices
 * 
 * Feature: ordo-digital-civilization, Property 38: Cultural Practice Persistence
 * Validates: Requirements 8.4
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import {
  establishTradition,
  adoptTradition,
  transmitTradition,
  getAgentTraditions,
  listTraditions,
} from "./cultural-practices.js";
import type { Tradition } from "./types.js";
import { getSupabaseClient } from "../database/client.js";

// Test data generators
const traditionTypeArb = fc.constantFrom<Tradition["type"]>(
  "ritual",
  "norm",
  "value",
  "practice"
);

describe("Cultural Practices Property Tests", () => {
  let createdTraditionIds: string[] = [];

  afterEach(async () => {
    // Cleanup: Delete test traditions
    const supabase = getSupabaseClient();
    if (createdTraditionIds.length > 0) {
      await supabase.from("traditions").delete().in("id", createdTraditionIds);
    }
    createdTraditionIds = [];
  });

  describe("Property 38: Cultural Practice Persistence", () => {
    it.prop([
      fc.string({ minLength: 3, maxLength: 50 }),
      fc.string({ minLength: 10, maxLength: 200 }),
      traditionTypeArb,
      fc.uuid(),
    ])(
      "should establish traditions that persist",
      async (name, description, type, establishedBy) => {
        const tradition = await establishTradition(
          name,
          description,
          type,
          establishedBy
        );
        createdTraditionIds.push(tradition.id);

        // Property: Tradition should exist
        expect(tradition).toBeDefined();
        expect(tradition.id).toBeTruthy();

        // Property: Tradition should have correct properties
        expect(tradition.name).toBe(name);
        expect(tradition.description).toBe(description);
        expect(tradition.type).toBe(type);
        expect(tradition.establishedBy).toBe(establishedBy);

        // Property: Establisher should be first follower
        expect(tradition.followers).toContain(establishedBy);
        expect(tradition.followers).toHaveLength(1);

        // Property: New traditions start at full strength
        expect(tradition.strength).toBe(100);

        // Property: Transmission count starts at 0
        expect(tradition.transmittedToGenerations).toBe(0);

        // Property: Tradition should be retrievable
        const traditions = await listTraditions();
        const found = traditions.find((t) => t.id === tradition.id);
        expect(found).toBeDefined();
      },
      { numRuns: 10 }
    );

    it.prop([
      fc.string({ minLength: 3, maxLength: 50 }),
      fc.string({ minLength: 10, maxLength: 200 }),
      traditionTypeArb,
      fc.uuid(),
      fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
    ])(
      "should allow agents to adopt traditions",
      async (name, description, type, establishedBy, adopters) => {
        const tradition = await establishTradition(
          name,
          description,
          type,
          establishedBy
        );
        createdTraditionIds.push(tradition.id);

        // Adopt tradition by multiple agents
        for (const agentId of adopters) {
          await adoptTradition(tradition.id, agentId);
        }

        // Property: All adopters should be followers
        const agentTraditions = await Promise.all(
          adopters.map((id) => getAgentTraditions(id))
        );

        for (let i = 0; i < adopters.length; i++) {
          const found = agentTraditions[i].find((t) => t.id === tradition.id);
          expect(found).toBeDefined();
        }
      },
      { numRuns: 10 }
    );

    it.prop([
      fc.string({ minLength: 3, maxLength: 50 }),
      fc.string({ minLength: 10, maxLength: 200 }),
      traditionTypeArb,
      fc.uuid(),
      fc.array(fc.uuid(), { minLength: 1, maxLength: 3 }),
    ])(
      "should transmit traditions across generations",
      async (name, description, type, establishedBy, offspring) => {
        const tradition = await establishTradition(
          name,
          description,
          type,
          establishedBy
        );
        createdTraditionIds.push(tradition.id);

        // Transmit to offspring
        for (const offspringId of offspring) {
          await transmitTradition(tradition.id, offspringId);
        }

        // Property: Transmission count should increase
        const traditions = await listTraditions();
        const updated = traditions.find((t) => t.id === tradition.id);
        expect(updated?.transmittedToGenerations).toBe(offspring.length);

        // Property: Offspring should be followers
        for (const offspringId of offspring) {
          const offspringTraditions = await getAgentTraditions(offspringId);
          const found = offspringTraditions.find((t) => t.id === tradition.id);
          expect(found).toBeDefined();
        }
      },
      { numRuns: 10 }
    );

    it.prop([traditionTypeArb])(
      "should filter traditions by type",
      async (type) => {
        // Create traditions of specific type
        const tradition1 = await establishTradition(
          "Test Tradition 1",
          "Description 1",
          type,
          crypto.randomUUID()
        );
        createdTraditionIds.push(tradition1.id);

        const tradition2 = await establishTradition(
          "Test Tradition 2",
          "Description 2",
          type,
          crypto.randomUUID()
        );
        createdTraditionIds.push(tradition2.id);

        // Property: Filtering by type should return only that type
        const filtered = await listTraditions(type);
        const ourTraditions = filtered.filter(
          (t) => t.id === tradition1.id || t.id === tradition2.id
        );

        expect(ourTraditions.length).toBe(2);
        ourTraditions.forEach((t) => {
          expect(t.type).toBe(type);
        });
      },
      { numRuns: 10 }
    );

    it.prop([
      fc.string({ minLength: 3, maxLength: 50 }),
      fc.string({ minLength: 10, maxLength: 200 }),
      traditionTypeArb,
      fc.uuid(),
    ])(
      "should not allow duplicate adoptions",
      async (name, description, type, agentId) => {
        const tradition = await establishTradition(
          name,
          description,
          type,
          agentId
        );
        createdTraditionIds.push(tradition.id);

        // Adopt twice
        await adoptTradition(tradition.id, agentId);
        await adoptTradition(tradition.id, agentId);

        // Property: Agent should only appear once in followers
        const traditions = await getAgentTraditions(agentId);
        const found = traditions.filter((t) => t.id === tradition.id);
        expect(found).toHaveLength(1);
      },
      { numRuns: 10 }
    );
  });
});
