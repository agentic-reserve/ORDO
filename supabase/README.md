# Ordo Database Schema

This directory contains the Supabase database schema for the Ordo platform.

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and service role key
3. Add them to your `.env` file:

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. Run Schema Migration

Execute the schema SQL in your Supabase project:

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy the contents of `schema.sql`
4. Paste and run the SQL

Alternatively, use the Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Run migration
supabase db push
```

## Schema Overview

### Tables

#### `agents`
Core agent data with complete lifecycle, economic, and evolution tracking.

**Key fields:**
- `id`: ULID primary key for sortable IDs
- `public_key`: Solana public key (base58)
- `parent_id`: Reference to parent agent for lineage
- `children_ids`: Array of child agent IDs
- `balance`: Current SOL balance
- `survival_tier`: Economic survival tier
- `fitness_*`: Multi-dimensional fitness metrics
- `traits`: JSONB storage for inheritable traits

#### `lineage`
Explicit parent-child relationships for efficient lineage queries.

**Key fields:**
- `parent_id`: Parent agent ID
- `child_id`: Child agent ID
- `generation_gap`: Number of generations between parent and child

#### `agent_history`
Historical log of agent state changes and events.

**Key fields:**
- `agent_id`: Agent ID
- `event_type`: Type of event (birth, growth, death, etc.)
- `event_data`: JSONB event details
- `timestamp`: When the event occurred

### Views

#### `active_agents`
All living agents ordered by birth date.

#### `archived_agents`
All dead agents ordered by death date.

#### `agent_lineage_tree`
Agent lineage with parent and children information.

#### `population_stats`
Aggregated population statistics.

### Indexes

The schema includes optimized indexes for:
- Status queries
- Public key lookups
- Lineage traversal
- Generation queries
- Balance-based queries
- Array searches (children_ids)

### Row Level Security (RLS)

RLS is enabled with policies for:
- Service role: Full access to all tables
- Authenticated users: Read-only access to all tables

### Triggers

- `update_agents_updated_at`: Automatically updates `updated_at` timestamp
- `update_parent_children_on_lineage_insert`: Maintains `children_ids` array

## Usage Examples

### Create an agent

```typescript
import { createAgent } from "./src/database/operations.js";
import { ulid } from "ulid";

const agent = await createAgent({
  id: ulid(),
  publicKey: "AgentPublicKey...",
  name: "Agent Alpha",
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
  model: "gpt-4",
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
});
```

### Query agents

```typescript
import { getActiveAgents, getAgentById } from "./src/database/operations.js";

// Get all active agents
const activeAgents = await getActiveAgents();

// Get specific agent
const agent = await getAgentById("agent-id");
```

### Track lineage

```typescript
import { recordLineage, getAncestors, getDescendants } from "./src/database/operations.js";

// Record parent-child relationship
await recordLineage(parentId, childId);

// Get all ancestors
const ancestors = await getAncestors(agentId);

// Get all descendants
const descendants = await getDescendants(agentId);
```

### Log events

```typescript
import { logAgentEvent } from "./src/database/operations.js";

await logAgentEvent(agentId, "birth", {
  initialBalance: 1.0,
  generation: 0,
});

await logAgentEvent(agentId, "tier_change", {
  oldTier: "normal",
  newTier: "thriving",
  balance: 15.0,
});
```

## Maintenance

### Backup

Supabase automatically backs up your database. You can also create manual backups:

```bash
supabase db dump -f backup.sql
```

### Restore

```bash
supabase db reset
psql -h your-db-host -U postgres -d postgres -f backup.sql
```

### Monitoring

Monitor database performance in the Supabase dashboard:
- Database → Performance
- Database → Query Performance
- Database → Logs

## Performance Considerations

1. **Indexes**: All critical query paths are indexed
2. **JSONB**: Use JSONB for flexible schema (traits, knowledge_base)
3. **Arrays**: Use PostgreSQL arrays for children_ids (with GIN index)
4. **Views**: Use materialized views for expensive aggregations (if needed)
5. **Partitioning**: Consider partitioning `agent_history` by timestamp for large datasets

## Security

1. **RLS**: Row Level Security is enabled on all tables
2. **Service Role**: Use service role key for backend operations
3. **Anon Key**: Use anon key for frontend read-only operations
4. **Encryption**: Private keys are stored encrypted in separate table (see identity module)
