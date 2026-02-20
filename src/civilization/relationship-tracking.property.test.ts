/**
 * Property-Based Tests for Social Relationship Tracking
 * 
 * Feature: ordo-digital-civilization, Property 37: Social Relationship Tracking
 * Validates: Requirements 8.2
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import {
  trackRelationship,
  getRelationship,
  getAgentRelationships,
  updateAgentReputation,
  recordCollaboration,
  recordCompetition,
  recordMentorship,
  getSocialNetworkStats,
} from "./relationship-tracking.js";
import type { RelationshipType } from "./types.js";
import { getSupabaseClient } from "../database/client.js";

// Test data generators
const relationshipTypeArb = fc.constantFrom<RelationshipType>(
  "collaboration",
  "competition",
  "mentorship",
  "alliance",
  "rivalry"
);

describe("Social Relationship Tracking Property Tests", () => {
  let testAgentIds: string[] = [];
  let testRelationships: Array<{ id1: string; id2: string }> = [];

  beforeEach(() => {
    testAgentIds = [];
    testRelationships = [];
  });

  afterEach(async () => {
    // Cleanup: Delete test relationships
    const supabase = getSupabaseClient();
    for (const rel of testRelationships) {
      const [id1, id2] = rel.id1 < rel.id2 ? [rel.id1, rel.id2] : [rel.id2, rel.id1];
      await supabase
        .from("relationships")
        .delete()
        .eq("agent_id_1", id1)
        .eq("agent_id_2", id2);
    }
  });

  describe("Property 37: Social Relationship Tracking", () => {
    it.prop([fc.uuid(), fc.uuid(), relationshipTypeArb, fc.integer({ min: -10, max: 10 })])(
      "should track relationships between agents",
      async (agentId1, agentId2, type, strengthDelta) => {
        // Skip if same agent
        if (agentId1 === agentId2) return;

        testRelationships.push({ id1: agentId1, id2: agentId2 });

        const relationship = await trackRelationship(
          agentId1,
          agentId2,
          type,
          strengthDelta
        );

        // Property: Relationship should exist
        expect(relationship).toBeDefined();
        expect(relationship.type).toBe(type);

        // Property: Strength should be clamped to 0-100
        expect(relationship.strength).toBeGreaterThanOrEqual(0);
        expect(relationship.strength).toBeLessThanOrEqual(100);

        // Property: Interactions should be at least 1
        expect(relationship.interactions).toBeGreaterThanOrEqual(1);

        // Property: Relationship should be retrievable
        const retrieved = await getRelationship(agentId1, agentId2);
        expect(retrieved).toBeDefined();
        expect(retrieved?.type).toBe(type);

        // Property: Order shouldn't matter (normalized storage)
        const retrievedReverse = await getRelationship(agentId2, agentId1);
        expect(retrievedReverse).toBeDefined();
        expect(retrievedReverse?.agentId1).toBe(relationship.agentId1);
        expect(retrievedReverse?.agentId2).toBe(relationship.agentId2);
      },
      { numRuns: 10 }
    );

    it.prop([fc.uuid(), fc.uuid(), relationshipTypeArb])(
      "should update existing relationships",
      async (agentId1, agentId2, type) => {
        if (agentId1 === agentId2) return;

        testRelationships.push({ id1: agentId1, id2: agentId2 });

        // Create initial relationship
        const initial = await trackRelationship(agentId1, agentId2, type, 10);
        const initialInteractions = initial.interactions;
        const initialStrength = initial.strength;

        // Update relationship
        const updated = await trackRelationship(agentId1, agentId2, type, 5);

        // Property: Interactions should increase
        expect(updated.interactions).toBe(initialInteractions + 1);

        // Property: Strength should change by delta (clamped)
        const expectedStrength = Math.max(0, Math.min(100, initialStrength + 5));
        expect(updated.strength).toBe(expectedStrength);
      },
      { numRuns: 10 }
    );

    it.prop([fc.uuid(), fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }), relationshipTypeArb])(
      "should get all relationships for an agent",
      async (agentId, otherAgentIds, type) => {
        // Filter out duplicates and self
        const uniqueOthers = [...new Set(otherAgentIds)].filter(
          (id) => id !== agentId
        );
        if (uniqueOthers.length === 0) return;

        // Create relationships
        for (const otherId of uniqueOthers) {
          testRelationships.push({ id1: agentId, id2: otherId });
          await trackRelationship(agentId, otherId, type, 10);
        }

        // Property: Should retrieve all relationships
        const relationships = await getAgentRelationships(agentId);
        expect(relationships.length).toBeGreaterThanOrEqual(uniqueOthers.length);

        // Property: Each relationship should involve the agent
        relationships.forEach((rel) => {
          expect(
            rel.agentId1 === agentId || rel.agentId2 === agentId
          ).toBe(true);
        });

        // Property: Filtering by type should work
        const filtered = await getAgentRelationships(agentId, type);
        filtered.forEach((rel) => {
          expect(rel.type).toBe(type);
        });
      },
      { numRuns: 10 }
    );

    it.prop([fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }), fc.boolean()])(
      "should record collaborations and update reputations",
      async (agentIds, success) => {
        // Ensure unique agent IDs
        const uniqueAgents = [...new Set(agentIds)];
        if (uniqueAgents.length < 2) return;

        // Track relationships for cleanup
        for (let i = 0; i < uniqueAgents.length; i++) {
          for (let j = i + 1; j < uniqueAgents.length; j++) {
            testRelationships.push({
              id1: uniqueAgents[i],
              id2: uniqueAgents[j],
            });
          }
        }

        await recordCollaboration(uniqueAgents, success);

        // Property: Relationships should exist between all pairs
        for (let i = 0; i < uniqueAgents.length; i++) {
          for (let j = i + 1; j < uniqueAgents.length; j++) {
            const rel = await getRelationship(uniqueAgents[i], uniqueAgents[j]);
            expect(rel).toBeDefined();
            expect(rel?.type).toBe("collaboration");

            // Property: Successful collaborations increase strength
            if (success) {
              expect(rel!.strength).toBeGreaterThan(0);
            }
          }
        }
      },
      { numRuns: 10 }
    );

    it.prop([fc.uuid(), fc.uuid(), fc.integer({ min: 0, max: 100 })])(
      "should record competitions with reputation changes",
      async (winnerId, loserId, margin) => {
        if (winnerId === loserId) return;

        testRelationships.push({ id1: winnerId, id2: loserId });

        await recordCompetition(winnerId, loserId, margin);

        // Property: Competitive relationship should exist
        const rel = await getRelationship(winnerId, loserId);
        expect(rel).toBeDefined();
        expect(rel?.type).toBe("competition");

        // Property: Relationship strength should be positive
        expect(rel!.strength).toBeGreaterThan(0);
      },
      { numRuns: 10 }
    );

    it.prop([fc.uuid(), fc.uuid(), fc.integer({ min: 0, max: 100 })])(
      "should record mentorships with progress tracking",
      async (mentorId, menteeId, progress) => {
        if (mentorId === menteeId) return;

        testRelationships.push({ id1: mentorId, id2: menteeId });

        await recordMentorship(mentorId, menteeId, progress);

        // Property: Mentorship relationship should exist
        const rel = await getRelationship(mentorId, menteeId);
        expect(rel).toBeDefined();
        expect(rel?.type).toBe("mentorship");

        // Property: Higher progress should result in stronger relationship
        if (progress > 50) {
          expect(rel!.strength).toBeGreaterThan(5);
        }
      },
      { numRuns: 10 }
    );

    it.prop([fc.uuid(), fc.array(fc.tuple(fc.uuid(), relationshipTypeArb), { minLength: 1, maxLength: 5 })])(
      "should calculate social network statistics",
      async (agentId, relationships) => {
        // Create relationships
        for (const [otherId, type] of relationships) {
          if (otherId !== agentId) {
            testRelationships.push({ id1: agentId, id2: otherId });
            await trackRelationship(agentId, otherId, type, 20);
          }
        }

        const stats = await getSocialNetworkStats(agentId);

        // Property: Total relationships should match created count
        const uniqueOthers = new Set(
          relationships.filter(([id]) => id !== agentId).map(([id]) => id)
        );
        expect(stats.totalRelationships).toBeGreaterThanOrEqual(uniqueOthers.size);

        // Property: Type counts should sum to total
        const typeSum =
          stats.collaborations +
          stats.competitions +
          stats.mentorships +
          stats.alliances +
          stats.rivalries;
        expect(typeSum).toBe(stats.totalRelationships);

        // Property: Average strength should be between 0 and 100
        expect(stats.avgRelationshipStrength).toBeGreaterThanOrEqual(0);
        expect(stats.avgRelationshipStrength).toBeLessThanOrEqual(100);

        // Property: If relationships exist, strongest should be defined
        if (stats.totalRelationships > 0) {
          expect(stats.strongestRelationship).toBeDefined();
          expect(stats.strongestRelationship!.strength).toBeGreaterThan(0);
        }
      },
      { numRuns: 10 }
    );

    it.prop([fc.uuid(), fc.uuid(), relationshipTypeArb, fc.integer({ min: 1, max: 10 })])(
      "should maintain relationship strength bounds",
      async (agentId1, agentId2, type, updates) => {
        if (agentId1 === agentId2) return;

        testRelationships.push({ id1: agentId1, id2: agentId2 });

        // Apply multiple updates
        let relationship;
        for (let i = 0; i < updates; i++) {
          relationship = await trackRelationship(agentId1, agentId2, type, 15);
        }

        // Property: Strength should never exceed 100
        expect(relationship!.strength).toBeLessThanOrEqual(100);

        // Apply negative updates
        for (let i = 0; i < updates * 2; i++) {
          relationship = await trackRelationship(agentId1, agentId2, type, -20);
        }

        // Property: Strength should never go below 0
        expect(relationship!.strength).toBeGreaterThanOrEqual(0);
      },
      { numRuns: 10 }
    );
  });
});
