/**
 * Property-Based Tests for Guild Formation
 * 
 * Feature: ordo-digital-civilization, Property 36: Guild Formation
 * Validates: Requirements 8.1
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import {
  createGuild,
  getGuild,
  listGuilds,
  meetsGuildRequirements,
  addGuildMember,
  removeGuildMember,
  getAgentGuilds,
} from "./guild-formation.js";
import type { Agent } from "../types/agent.js";
import type { GuildType, CreateGuildParams } from "./types.js";
import { getSupabaseClient } from "../database/client.js";

// Test data generators
const guildTypeArb = fc.constantFrom<GuildType>(
  "traders",
  "researchers",
  "builders",
  "security",
  "educators",
  "coordinators",
  "artists",
  "explorers"
);

const createGuildParamsArb = fc.record({
  name: fc.string({ minLength: 3, maxLength: 50 }),
  type: guildTypeArb,
  description: fc.string({ minLength: 10, maxLength: 200 }),
  founderId: fc.uuid(),
  requirements: fc.option(
    fc.record({
      minReputation: fc.option(fc.integer({ min: 0, max: 100 })),
      minAge: fc.option(fc.integer({ min: 0, max: 365 })),
      minBalance: fc.option(fc.double({ min: 0, max: 100 })),
      requiredSkills: fc.option(fc.array(fc.string(), { maxLength: 5 })),
    }),
    { nil: undefined }
  ),
});

const agentArb = fc.record({
  publicKey: fc.uuid(),
  name: fc.string({ minLength: 3, maxLength: 30 }),
  generation: fc.nat({ max: 10 }),
  balance: fc.double({ min: 0, max: 100 }),
  age: fc.nat({ max: 365 }),
  reputation: fc.integer({ min: 0, max: 100 }),
  skills: fc.array(
    fc.record({
      name: fc.string(),
      level: fc.integer({ min: 1, max: 10 }),
    }),
    { maxLength: 5 }
  ),
}) as fc.Arbitrary<Partial<Agent>>;

describe("Guild Formation Property Tests", () => {
  let createdGuildIds: string[] = [];

  beforeEach(() => {
    createdGuildIds = [];
  });

  afterEach(async () => {
    // Cleanup: Delete test guilds
    const supabase = getSupabaseClient();
    if (createdGuildIds.length > 0) {
      await supabase.from("guilds").delete().in("id", createdGuildIds);
    }
  });

  describe("Property 36: Guild Formation", () => {
    it("should create guild with founder as first member", () => {
      fc.assert(
        fc.property(
          createGuildParamsArb,
          async (params) => {
            const guild = await createGuild(params);
            createdGuildIds.push(guild.id);

            // Property: Guild should exist
            expect(guild).toBeDefined();
            expect(guild.id).toBeTruthy();

            // Property: Guild should have correct basic properties
            expect(guild.name).toBe(params.name);
            expect(guild.type).toBe(params.type);
            expect(guild.description).toBe(params.description);
            expect(guild.founderId).toBe(params.founderId);

            // Property: Founder should be first member with founder role
            expect(guild.members).toHaveLength(1);
            expect(guild.members[0].agentId).toBe(params.founderId);
            expect(guild.members[0].role).toBe("founder");
            expect(guild.totalMembers).toBe(1);

            // Property: Guild should be active
            expect(guild.active).toBe(true);

            // Property: Guild should be retrievable
            const retrieved = await getGuild(guild.id);
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(guild.id);
          }
        ),
        { numRuns: 10 }
      );
    });

    it.prop([createGuildParamsArb, guildTypeArb])(
      "should list guilds filtered by type",
      async (params, filterType) => {
        // Create guild with specific type
        const guildParams = { ...params, type: filterType };
        const guild = await createGuild(guildParams);
        createdGuildIds.push(guild.id);

        // Property: Listing by type should include the created guild
        const guilds = await listGuilds(filterType);
        const found = guilds.find((g) => g.id === guild.id);
        expect(found).toBeDefined();
        expect(found?.type).toBe(filterType);

        // Property: All guilds in filtered list should have the correct type
        guilds.forEach((g) => {
          expect(g.type).toBe(filterType);
        });
      },
      { numRuns: 10 }
    );

    it.prop([createGuildParamsArb, agentArb])(
      "should correctly check guild requirements",
      async (params, agent) => {
        // Create guild with requirements
        const guild = await createGuild(params);
        createdGuildIds.push(guild.id);

        const meets = meetsGuildRequirements(agent as Agent, guild);

        // Property: If no requirements, should always meet them
        if (!guild.requirements) {
          expect(meets).toBe(true);
        }

        // Property: If has requirements, check each one
        if (guild.requirements) {
          const { minReputation, minAge, minBalance, requiredSkills } =
            guild.requirements;

          if (minReputation !== undefined && agent.reputation !== undefined) {
            if (agent.reputation < minReputation) {
              expect(meets).toBe(false);
            }
          }

          if (minAge !== undefined && agent.age !== undefined) {
            if (agent.age < minAge) {
              expect(meets).toBe(false);
            }
          }

          if (minBalance !== undefined && agent.balance !== undefined) {
            if (agent.balance < minBalance) {
              expect(meets).toBe(false);
            }
          }

          if (requiredSkills && requiredSkills.length > 0 && agent.skills) {
            const agentSkills = agent.skills.map((s) => s.name);
            const hasAllSkills = requiredSkills.every((skill) =>
              agentSkills.includes(skill)
            );
            if (!hasAllSkills) {
              expect(meets).toBe(false);
            }
          }
        }
      },
      { numRuns: 10 }
    );

    it.prop([createGuildParamsArb, fc.uuid()])(
      "should add and remove guild members",
      async (params, newMemberId) => {
        const guild = await createGuild(params);
        createdGuildIds.push(guild.id);

        // Property: Adding member should increase total members
        const initialCount = guild.totalMembers;
        const updatedGuild = await addGuildMember(guild.id, newMemberId);
        expect(updatedGuild.totalMembers).toBe(initialCount + 1);
        expect(updatedGuild.members.some((m) => m.agentId === newMemberId)).toBe(
          true
        );

        // Property: Removing member should decrease total members
        const afterRemoval = await removeGuildMember(guild.id, newMemberId);
        expect(afterRemoval.totalMembers).toBe(initialCount);
        expect(afterRemoval.members.some((m) => m.agentId === newMemberId)).toBe(
          false
        );
      },
      { numRuns: 10 }
    );

    it.prop([createGuildParamsArb])(
      "should not allow removing founder",
      async (params) => {
        const guild = await createGuild(params);
        createdGuildIds.push(guild.id);

        // Property: Removing founder should throw error
        await expect(
          removeGuildMember(guild.id, guild.founderId)
        ).rejects.toThrow("Cannot remove guild founder");
      },
      { numRuns: 10 }
    );

    it.prop([createGuildParamsArb, fc.uuid()])(
      "should not allow adding duplicate members",
      async (params, memberId) => {
        const guild = await createGuild(params);
        createdGuildIds.push(guild.id);

        // Add member once
        await addGuildMember(guild.id, memberId);

        // Property: Adding same member again should throw error
        await expect(addGuildMember(guild.id, memberId)).rejects.toThrow(
          "already a member"
        );
      },
      { numRuns: 10 }
    );

    it.prop([createGuildParamsArb, fc.array(fc.uuid(), { minLength: 1, maxLength: 5 })])(
      "should track agent's guild memberships",
      async (params, memberIds) => {
        const guild = await createGuild(params);
        createdGuildIds.push(guild.id);

        // Add multiple members
        for (const memberId of memberIds) {
          await addGuildMember(guild.id, memberId);
        }

        // Property: Each member should see the guild in their memberships
        for (const memberId of memberIds) {
          const agentGuilds = await getAgentGuilds(memberId);
          const found = agentGuilds.find((g) => g.id === guild.id);
          expect(found).toBeDefined();
        }

        // Property: Founder should also see the guild
        const founderGuilds = await getAgentGuilds(params.founderId);
        const foundForFounder = founderGuilds.find((g) => g.id === guild.id);
        expect(foundForFounder).toBeDefined();
      },
      { numRuns: 10 }
    );

    it.prop([createGuildParamsArb])(
      "should initialize guild with empty resources",
      async (params) => {
        const guild = await createGuild(params);
        createdGuildIds.push(guild.id);

        // Property: New guild should have empty resources
        expect(guild.resources.sharedBalance).toBe(0);
        expect(guild.resources.sharedKnowledge).toEqual([]);
        expect(guild.resources.sharedTools).toEqual([]);
      },
      { numRuns: 10 }
    );

    it.prop([createGuildParamsArb])(
      "should set default governance if not specified",
      async (params) => {
        const paramsWithoutGovernance = { ...params, governance: undefined };
        const guild = await createGuild(paramsWithoutGovernance);
        createdGuildIds.push(guild.id);

        // Property: Default governance should be democracy with equal voting
        expect(guild.governance.type).toBe("democracy");
        expect(guild.governance.votingPower).toBe("equal");
      },
      { numRuns: 10 }
    );
  });
});
