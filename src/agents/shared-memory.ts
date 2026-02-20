/**
 * Shared memory system for multi-agent coordination
 * 
 * Provides a Supabase-backed shared memory space where agents can:
 * - Store and retrieve shared state
 * - Pass messages between agents
 * - Subscribe to real-time updates
 * - Query by context and tags
 */

import { ulid } from "ulid";
import { db } from "../database/client.js";
import type {
  SharedMemoryEntry,
  SharedMemoryMetadata,
  SharedMemoryQueryOptions,
  SharedMemorySubscriptionCallback,
  SharedMemorySubscription,
} from "./coordination-types.js";

/**
 * Database row type for shared_memory table
 */
interface SharedMemoryRow {
  id: string;
  key: string;
  value: unknown;
  metadata: SharedMemoryMetadata;
  agent_id: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

/**
 * Shared memory space for agent coordination
 */
export class SharedMemorySpace {
  /**
   * Store a value in shared memory
   * 
   * @param key - Memory key for retrieval
   * @param value - Value to store (any JSON-serializable data)
   * @param metadata - Optional metadata (tags, context, priority, etc.)
   * @param agentId - Optional agent ID that created this memory
   * @param expiresAt - Optional expiration time
   * @returns The created shared memory entry
   */
  async store(
    key: string,
    value: unknown,
    metadata: SharedMemoryMetadata = {},
    agentId?: string,
    expiresAt?: Date
  ): Promise<SharedMemoryEntry> {
    const client = db.getClient();
    const id = ulid();

    const row: Partial<SharedMemoryRow> = {
      id,
      key,
      value,
      metadata,
      agent_id: agentId ?? null,
      expires_at: expiresAt?.toISOString() ?? null,
    };

    const { data, error } = await client
      .from("shared_memory")
      .insert(row)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to store in shared memory: ${error.message}`);
    }

    return this.rowToEntry(data as SharedMemoryRow);
  }

  /**
   * Query shared memory by context and filters
   * 
   * @param options - Query options (context, tags, agentId, limit, ordering)
   * @returns Array of matching shared memory entries
   */
  async query(options: SharedMemoryQueryOptions = {}): Promise<SharedMemoryEntry[]> {
    const client = db.getClient();
    let query = client.from("shared_memory").select("*");

    // Filter by context (searches in metadata.context)
    if (options.context) {
      query = query.contains("metadata", { context: options.context });
    }

    // Filter by tags (searches in metadata.tags array)
    if (options.tags && options.tags.length > 0) {
      for (const tag of options.tags) {
        query = query.contains("metadata", { tags: [tag] });
      }
    }

    // Filter by agent ID
    if (options.agentId) {
      query = query.eq("agent_id", options.agentId);
    }

    // Order by
    const orderBy = options.orderBy ?? "created_at";
    const orderDirection = options.orderDirection ?? "desc";
    query = query.order(orderBy, { ascending: orderDirection === "asc" });

    // Limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query shared memory: ${error.message}`);
    }

    return (data as SharedMemoryRow[]).map(row => this.rowToEntry(row));
  }

  /**
   * Get a specific entry by key
   * 
   * @param key - Memory key
   * @returns The shared memory entry or null if not found
   */
  async get(key: string): Promise<SharedMemoryEntry | null> {
    const client = db.getClient();

    const { data, error } = await client
      .from("shared_memory")
      .select("*")
      .eq("key", key)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found
        return null;
      }
      throw new Error(`Failed to get from shared memory: ${error.message}`);
    }

    return this.rowToEntry(data as SharedMemoryRow);
  }

  /**
   * Get all entries with a specific key (including historical versions)
   * 
   * @param key - Memory key
   * @returns Array of shared memory entries with this key
   */
  async getAll(key: string): Promise<SharedMemoryEntry[]> {
    const client = db.getClient();

    const { data, error } = await client
      .from("shared_memory")
      .select("*")
      .eq("key", key)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to get all from shared memory: ${error.message}`);
    }

    return (data as SharedMemoryRow[]).map(row => this.rowToEntry(row));
  }

  /**
   * Update an existing entry
   * 
   * @param id - Entry ID
   * @param value - New value
   * @param metadata - New metadata (optional)
   * @returns The updated shared memory entry
   */
  async update(
    id: string,
    value: unknown,
    metadata?: SharedMemoryMetadata
  ): Promise<SharedMemoryEntry> {
    const client = db.getClient();

    const updates: Partial<SharedMemoryRow> = {
      value,
    };

    if (metadata) {
      updates.metadata = metadata;
    }

    const { data, error } = await client
      .from("shared_memory")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update shared memory: ${error.message}`);
    }

    return this.rowToEntry(data as SharedMemoryRow);
  }

  /**
   * Delete an entry
   * 
   * @param id - Entry ID
   */
  async delete(id: string): Promise<void> {
    const client = db.getClient();

    const { error } = await client
      .from("shared_memory")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(`Failed to delete from shared memory: ${error.message}`);
    }
  }

  /**
   * Delete all entries with a specific key
   * 
   * @param key - Memory key
   */
  async deleteByKey(key: string): Promise<void> {
    const client = db.getClient();

    const { error } = await client
      .from("shared_memory")
      .delete()
      .eq("key", key);

    if (error) {
      throw new Error(`Failed to delete from shared memory: ${error.message}`);
    }
  }

  /**
   * Subscribe to real-time updates for shared memory
   * 
   * @param callback - Function to call when updates occur
   * @param filter - Optional filter (key, agentId, etc.)
   * @returns Subscription handle with unsubscribe method
   */
  subscribe(
    callback: SharedMemorySubscriptionCallback,
    filter?: { key?: string; agentId?: string }
  ): SharedMemorySubscription {
    const client = db.getClient();

    let channel = client
      .channel("shared_memory_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "shared_memory",
          filter: filter?.key ? `key=eq.${filter.key}` : undefined,
        },
        (payload) => {
          if (payload.new) {
            const entry = this.rowToEntry(payload.new as SharedMemoryRow);
            
            // Apply additional filters
            if (filter?.agentId && entry.agentId !== filter.agentId) {
              return;
            }
            
            callback(entry);
          }
        }
      );

    channel.subscribe();

    return {
      unsubscribe: () => {
        channel.unsubscribe();
      },
    };
  }

  /**
   * Clean up expired entries
   * 
   * @returns Number of entries deleted
   */
  async cleanupExpired(): Promise<number> {
    const client = db.getClient();

    const { data, error } = await client.rpc("cleanup_expired_shared_memory");

    if (error) {
      throw new Error(`Failed to cleanup expired shared memory: ${error.message}`);
    }

    return data as number;
  }

  /**
   * Convert database row to SharedMemoryEntry
   */
  private rowToEntry(row: SharedMemoryRow): SharedMemoryEntry {
    return {
      id: row.id,
      key: row.key,
      value: row.value,
      metadata: row.metadata,
      agentId: row.agent_id ?? undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    };
  }
}

// Export singleton instance
export const sharedMemory = new SharedMemorySpace();
