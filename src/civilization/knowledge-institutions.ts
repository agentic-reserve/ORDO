/**
 * Knowledge Institutions System
 * 
 * Manages libraries, universities, research labs, and archives for knowledge sharing.
 * Implements Requirement 8.5: Knowledge institutions for teaching and learning.
 */

import type { Institution } from "./types.js";
import { getSupabaseClient } from "../database/client.js";

/**
 * Create a knowledge institution
 * 
 * @param name - Institution name
 * @param type - Institution type
 * @param founderId - Founder agent ID
 * @param guildId - Optional guild ID
 * @param isPublic - Whether institution is public (default: false)
 * @returns Created institution
 */
export async function createInstitution(
  name: string,
  type: Institution["type"],
  founderId: string,
  guildId?: string,
  isPublic: boolean = false
): Promise<Institution> {
  const supabase = getSupabaseClient();

  const institution: Institution = {
    id: crypto.randomUUID(),
    name,
    type,
    foundedAt: new Date(),
    founderId,
    guildId,
    knowledge: [],
    members: [founderId],
    public: isPublic,
  };

  const { error } = await supabase.from("institutions").insert({
    id: institution.id,
    name: institution.name,
    type: institution.type,
    founded_at: institution.foundedAt.toISOString(),
    founder_id: institution.founderId,
    guild_id: institution.guildId,
    knowledge: institution.knowledge,
    members: institution.members,
    public: institution.public,
  });

  if (error) {
    throw new Error(`Failed to create institution: ${error.message}`);
  }

  return institution;
}

/**
 * Add knowledge to an institution
 * 
 * @param institutionId - Institution ID
 * @param title - Knowledge title
 * @param content - Knowledge content
 * @param domain - Knowledge domain
 * @param authorId - Author agent ID
 * @returns Knowledge ID
 */
export async function addKnowledge(
  institutionId: string,
  title: string,
  content: string,
  domain: string,
  authorId: string
): Promise<string> {
  const supabase = getSupabaseClient();

  const { data: institution } = await supabase
    .from("institutions")
    .select("knowledge")
    .eq("id", institutionId)
    .single();

  if (!institution) {
    throw new Error(`Institution ${institutionId} not found`);
  }

  const knowledgeItem = {
    id: crypto.randomUUID(),
    title,
    content,
    domain,
    author: authorId,
    createdAt: new Date(),
    accessCount: 0,
  };

  const updatedKnowledge = [...institution.knowledge, knowledgeItem];

  const { error } = await supabase
    .from("institutions")
    .update({ knowledge: updatedKnowledge })
    .eq("id", institutionId);

  if (error) {
    throw new Error(`Failed to add knowledge: ${error.message}`);
  }

  return knowledgeItem.id;
}

/**
 * Access knowledge from an institution
 * 
 * @param institutionId - Institution ID
 * @param knowledgeId - Knowledge ID
 * @param accessorId - Agent ID accessing the knowledge
 * @returns Knowledge item
 */
export async function accessKnowledge(
  institutionId: string,
  knowledgeId: string,
  accessorId: string
): Promise<Institution["knowledge"][0]> {
  const supabase = getSupabaseClient();

  const { data: institution } = await supabase
    .from("institutions")
    .select("*")
    .eq("id", institutionId)
    .single();

  if (!institution) {
    throw new Error(`Institution ${institutionId} not found`);
  }

  // Check access permissions
  if (!institution.public && !institution.members.includes(accessorId)) {
    throw new Error(`Agent ${accessorId} does not have access to this institution`);
  }

  const knowledgeItem = institution.knowledge.find(
    (k: any) => k.id === knowledgeId
  );

  if (!knowledgeItem) {
    throw new Error(`Knowledge ${knowledgeId} not found`);
  }

  // Increment access count
  knowledgeItem.accessCount++;
  const { error } = await supabase
    .from("institutions")
    .update({ knowledge: institution.knowledge })
    .eq("id", institutionId);

  if (error) {
    throw new Error(`Failed to update access count: ${error.message}`);
  }

  return knowledgeItem;
}

/**
 * Add member to institution
 * 
 * @param institutionId - Institution ID
 * @param agentId - Agent ID
 */
export async function addInstitutionMember(
  institutionId: string,
  agentId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: institution } = await supabase
    .from("institutions")
    .select("members")
    .eq("id", institutionId)
    .single();

  if (!institution) {
    throw new Error(`Institution ${institutionId} not found`);
  }

  if (institution.members.includes(agentId)) {
    return; // Already a member
  }

  const updatedMembers = [...institution.members, agentId];

  const { error } = await supabase
    .from("institutions")
    .update({ members: updatedMembers })
    .eq("id", institutionId);

  if (error) {
    throw new Error(`Failed to add member: ${error.message}`);
  }
}

/**
 * Search knowledge across institutions
 * 
 * @param query - Search query
 * @param domain - Optional domain filter
 * @param agentId - Agent ID for access control
 * @returns Array of knowledge items with institution info
 */
export async function searchKnowledge(
  query: string,
  domain?: string,
  agentId?: string
): Promise<
  Array<{
    knowledge: Institution["knowledge"][0];
    institutionId: string;
    institutionName: string;
  }>
> {
  const supabase = getSupabaseClient();

  let queryBuilder = supabase.from("institutions").select("*");

  // Filter by public or member access
  if (agentId) {
    queryBuilder = queryBuilder.or(
      `public.eq.true,members.cs.{${agentId}}`
    );
  } else {
    queryBuilder = queryBuilder.eq("public", true);
  }

  const { data: institutions, error } = await queryBuilder;

  if (error || !institutions) {
    return [];
  }

  const results: Array<{
    knowledge: Institution["knowledge"][0];
    institutionId: string;
    institutionName: string;
  }> = [];

  for (const inst of institutions) {
    for (const k of inst.knowledge) {
      const matchesQuery =
        k.title.toLowerCase().includes(query.toLowerCase()) ||
        k.content.toLowerCase().includes(query.toLowerCase());
      const matchesDomain = !domain || k.domain === domain;

      if (matchesQuery && matchesDomain) {
        results.push({
          knowledge: k,
          institutionId: inst.id,
          institutionName: inst.name,
        });
      }
    }
  }

  return results;
}

/**
 * Get institution statistics
 * 
 * @param institutionId - Institution ID
 * @returns Institution statistics
 */
export async function getInstitutionStats(institutionId: string): Promise<{
  totalKnowledge: number;
  totalMembers: number;
  totalAccesses: number;
  domains: string[];
  mostAccessedKnowledge: Institution["knowledge"][0] | null;
}> {
  const supabase = getSupabaseClient();

  const { data: institution } = await supabase
    .from("institutions")
    .select("*")
    .eq("id", institutionId)
    .single();

  if (!institution) {
    throw new Error(`Institution ${institutionId} not found`);
  }

  const domains = [...new Set(institution.knowledge.map((k: any) => k.domain))];
  const totalAccesses = institution.knowledge.reduce(
    (sum: number, k: any) => sum + k.accessCount,
    0
  );
  const mostAccessed =
    institution.knowledge.length > 0
      ? institution.knowledge.reduce((max: any, k: any) =>
          k.accessCount > max.accessCount ? k : max
        )
      : null;

  return {
    totalKnowledge: institution.knowledge.length,
    totalMembers: institution.members.length,
    totalAccesses,
    domains,
    mostAccessedKnowledge: mostAccessed,
  };
}
