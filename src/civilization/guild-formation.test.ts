/**
 * Unit Tests for Guild Formation
 * 
 * Feature: ordo-digital-civilization, Property 36: Guild Formation
 * Validates: Requirements 8.1
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
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
import { getSupabaseClient } from "../database/client.js";

describe("Guild Formation Tests", () => {
  let createdGuildIds: string[] = [];

  afterEach(async () => {
    // Cleanup: Delete test guilds
    const supabase = getSupabaseClient();
    if (createdGuildIds.length > 0) {
      await supabase.from("guilds").delete().in("id", createdGuildIds);
    }
    createdGuildIds = [];
  });

  describe("Property 36: Guild Formation", () => {
    it("should create guild with founder as first member", async () => {
      const params = {
        name: "Test Guild",
        type: "traders" as const,
        description: "A test guild for traders",
        founderId: crypto.randomUUID(),
      };

      const guild = await createGuild(params);
      createdGuildIds.push(guild.id);

      expect(guild).toBeDefined();
      expect(guild.name).toBe(params.name);
      expect(guild.type).toBe(params.type);
      expect(guild.founderId).toBe(params.founderId);
      expect(guild.members).toHaveLength(1);
      expect(guild.members[0].agentId).toBe(params.founderId);
      expect(guild.members[0].role).toBe("founder");
      expect(guild.active).toBe(true);
    });

    it("should list guilds filtered by type", async () => {
      const guild = await createGuild({
        name: "Traders Guild",
        type: "traders",
        description: "Guild for traders",
        founderId: crypto.randomUUID(),
      });
      createdGuildIds.push(guild.id);

      const guilds = await listGuilds("traders");
      const found = guilds.find((g) => g.id === guild.id);
      expect(found).toBeDefined();
      expect(found?.type).toBe("traders");
    });

    it("should add and remove guild members", async () => {
      const guild = await createGuild({
        name: "Test Guild",
        type: "builders",
        description: "Test guild",
        founderId: crypto.randomUUID(),
      });
      createdGuildIds.push(guild.id);

      const newMemberId = crypto.randomUUID();
      const updated = await addGuildMember(guild.id, newMemberId);
      expect(updated.totalMembers).toBe(2);
      expect(updated.members.some((m) => m.agentId === newMemberId)).toBe(true);

      const afterRemoval = await removeGuildMember(guild.id, newMemberId);
      expect(afterRemoval.totalMembers).toBe(1);
      expect(afterRemoval.members.some((m) => m.agentId === newMemberId)).toBe(
        false
      );
    });

    it("should not allow removing founder", async () => {
      const guild = await createGuild({
        name: "Test Guild",
        type: "researchers",
        description: "Test guild",
        founderId: crypto.randomUUID(),
      });
      createdGuildIds.push(guild.id);

      await expect(
        removeGuildMember(guild.id, guild.founderId)
      ).rejects.toThrow("Cannot remove guild founder");
    });

    it("should track agent's guild memberships", async () => {
      const agentId = crypto.randomUUID();
      const guild = await createGuild({
        name: "Test Guild",
        type: "educators",
        description: "Test guild",
        founderId: agentId,
      });
      createdGuildIds.push(guild.id);

      const agentGuilds = await getAgentGuilds(agentId);
      const found = agentGuilds.find((g) => g.id === guild.id);
      expect(found).toBeDefined();
    });
  });
});
