-- Ordo Platform Database Schema
-- Complete agent lifecycle management with lineage tracking

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table - Core agent data with complete lifecycle fields
CREATE TABLE IF NOT EXISTS agents (
  -- Identity
  id TEXT PRIMARY KEY,                    -- ULID for sortable IDs
  public_key TEXT UNIQUE NOT NULL,        -- Solana public key (base58)
  name TEXT NOT NULL,
  generation INTEGER NOT NULL DEFAULT 0,
  parent_id TEXT REFERENCES agents(id),   -- Parent agent for lineage
  children_ids TEXT[] DEFAULT '{}',       -- Array of child agent IDs
  
  -- Lifecycle
  birth_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  age INTEGER NOT NULL DEFAULT 0,         -- Age in days
  max_lifespan INTEGER NOT NULL,          -- Maximum lifespan in days
  status TEXT NOT NULL DEFAULT 'alive',   -- 'alive' or 'dead'
  death_cause TEXT,                       -- 'starvation', 'old_age', 'terminated', 'error'
  death_date TIMESTAMPTZ,
  
  -- Economic
  balance DECIMAL(20, 9) NOT NULL DEFAULT 0,  -- SOL balance (9 decimals)
  survival_tier TEXT NOT NULL DEFAULT 'normal',  -- 'thriving', 'normal', 'low_compute', 'critical', 'dead'
  total_earnings DECIMAL(20, 9) NOT NULL DEFAULT 0,
  total_costs DECIMAL(20, 9) NOT NULL DEFAULT 0,
  
  -- Capabilities
  model TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
  tools TEXT[] DEFAULT '{}',
  skills TEXT[] DEFAULT '{}',
  knowledge_base JSONB DEFAULT '{}',
  
  -- Evolution
  fitness_survival DECIMAL(10, 6) DEFAULT 0,
  fitness_earnings DECIMAL(10, 6) DEFAULT 0,
  fitness_offspring DECIMAL(10, 6) DEFAULT 0,
  fitness_adaptation DECIMAL(10, 6) DEFAULT 0,
  fitness_innovation DECIMAL(10, 6) DEFAULT 0,
  mutations TEXT[] DEFAULT '{}',
  traits JSONB DEFAULT '{}',
  
  -- Consciousness (optional)
  consciousness_self_awareness INTEGER DEFAULT 0,
  consciousness_introspection INTEGER DEFAULT 0,
  consciousness_theory_of_mind INTEGER DEFAULT 0,
  
  -- Social (optional)
  reputation INTEGER DEFAULT 0,
  guild_id TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('alive', 'dead')),
  CONSTRAINT valid_death_cause CHECK (death_cause IS NULL OR death_cause IN ('starvation', 'old_age', 'terminated', 'error')),
  CONSTRAINT valid_survival_tier CHECK (survival_tier IN ('thriving', 'normal', 'low_compute', 'critical', 'dead')),
  CONSTRAINT positive_balance CHECK (balance >= 0),
  CONSTRAINT positive_age CHECK (age >= 0),
  CONSTRAINT positive_max_lifespan CHECK (max_lifespan > 0),
  CONSTRAINT valid_generation CHECK (generation >= 0)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_public_key ON agents(public_key);
CREATE INDEX IF NOT EXISTS idx_agents_parent_id ON agents(parent_id);
CREATE INDEX IF NOT EXISTS idx_agents_generation ON agents(generation);
CREATE INDEX IF NOT EXISTS idx_agents_survival_tier ON agents(survival_tier);
CREATE INDEX IF NOT EXISTS idx_agents_birth_date ON agents(birth_date);
CREATE INDEX IF NOT EXISTS idx_agents_balance ON agents(balance);
CREATE INDEX IF NOT EXISTS idx_agents_guild_id ON agents(guild_id) WHERE guild_id IS NOT NULL;

-- GIN index for array searches
CREATE INDEX IF NOT EXISTS idx_agents_children_ids ON agents USING GIN(children_ids);

-- Lineage table - Explicit parent-child relationships for efficient queries
CREATE TABLE IF NOT EXISTS lineage (
  id SERIAL PRIMARY KEY,
  parent_id TEXT NOT NULL REFERENCES agents(id),
  child_id TEXT NOT NULL REFERENCES agents(id),
  generation_gap INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(parent_id, child_id),
  CONSTRAINT positive_generation_gap CHECK (generation_gap > 0)
);

-- Indexes for lineage queries
CREATE INDEX IF NOT EXISTS idx_lineage_parent_id ON lineage(parent_id);
CREATE INDEX IF NOT EXISTS idx_lineage_child_id ON lineage(child_id);

-- Agent history table - Track state changes over time
CREATE TABLE IF NOT EXISTS agent_history (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  event_type TEXT NOT NULL,  -- 'birth', 'growth', 'tier_change', 'death', 'mutation', etc.
  event_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_event_type CHECK (event_type IN (
    'birth', 'growth', 'tier_change', 'death', 'mutation', 
    'replication', 'earning', 'cost', 'skill_learned', 'tool_added'
  ))
);

-- Index for history queries
CREATE INDEX IF NOT EXISTS idx_agent_history_agent_id ON agent_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_history_timestamp ON agent_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_history_event_type ON agent_history(event_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to maintain children_ids array when lineage is added
CREATE OR REPLACE FUNCTION update_parent_children_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- Add child_id to parent's children_ids array
  UPDATE agents
  SET children_ids = array_append(children_ids, NEW.child_id)
  WHERE id = NEW.parent_id
  AND NOT (NEW.child_id = ANY(children_ids));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update parent's children_ids
DROP TRIGGER IF EXISTS update_parent_children_on_lineage_insert ON lineage;
CREATE TRIGGER update_parent_children_on_lineage_insert
  AFTER INSERT ON lineage
  FOR EACH ROW
  EXECUTE FUNCTION update_parent_children_ids();

-- Row Level Security (RLS) policies
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_history ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access
CREATE POLICY "Service role has full access to agents"
  ON agents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to lineage"
  ON lineage
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to agent_history"
  ON agent_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read all agents
CREATE POLICY "Authenticated users can read agents"
  ON agents
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read lineage"
  ON lineage
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read agent_history"
  ON agent_history
  FOR SELECT
  TO authenticated
  USING (true);

-- Views for common queries

-- Active agents view
CREATE OR REPLACE VIEW active_agents AS
SELECT * FROM agents
WHERE status = 'alive'
ORDER BY birth_date DESC;

-- Dead agents view (archived)
CREATE OR REPLACE VIEW archived_agents AS
SELECT * FROM agents
WHERE status = 'dead'
ORDER BY death_date DESC;

-- Agent lineage tree view (with parent and children info)
CREATE OR REPLACE VIEW agent_lineage_tree AS
SELECT 
  a.id,
  a.name,
  a.public_key,
  a.generation,
  a.parent_id,
  p.name as parent_name,
  p.public_key as parent_public_key,
  a.children_ids,
  array_length(a.children_ids, 1) as children_count,
  a.status,
  a.birth_date,
  a.death_date
FROM agents a
LEFT JOIN agents p ON a.parent_id = p.id;

-- Population statistics view
CREATE OR REPLACE VIEW population_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'alive') as alive_count,
  COUNT(*) FILTER (WHERE status = 'dead') as dead_count,
  COUNT(*) as total_count,
  AVG(age) FILTER (WHERE status = 'alive') as avg_age_alive,
  AVG(balance) FILTER (WHERE status = 'alive') as avg_balance_alive,
  MAX(generation) as max_generation,
  AVG(generation) FILTER (WHERE status = 'alive') as avg_generation_alive,
  SUM(total_earnings) as total_platform_earnings,
  SUM(total_costs) as total_platform_costs
FROM agents;

-- Comments for documentation
COMMENT ON TABLE agents IS 'Core agent data with complete lifecycle, economic, and evolution tracking';
COMMENT ON TABLE lineage IS 'Explicit parent-child relationships for efficient lineage queries';
COMMENT ON TABLE agent_history IS 'Historical log of agent state changes and events';
COMMENT ON COLUMN agents.id IS 'ULID primary key for sortable, time-ordered IDs';
COMMENT ON COLUMN agents.public_key IS 'Solana public key in base58 format';
COMMENT ON COLUMN agents.parent_id IS 'Reference to parent agent for lineage tracking';
COMMENT ON COLUMN agents.children_ids IS 'Array of child agent IDs for quick offspring lookup';
COMMENT ON COLUMN agents.balance IS 'Current SOL balance with 9 decimal precision';
COMMENT ON COLUMN agents.survival_tier IS 'Economic survival tier based on balance';
COMMENT ON COLUMN agents.traits IS 'JSONB storage for inheritable traits';
COMMENT ON COLUMN agents.knowledge_base IS 'JSONB storage for agent knowledge';


-- Shared Memory table - For multi-agent coordination
CREATE TABLE IF NOT EXISTS shared_memory (
  id TEXT PRIMARY KEY,                    -- ULID for sortable IDs
  key TEXT NOT NULL,                      -- Memory key for retrieval
  value JSONB NOT NULL,                   -- Stored value
  metadata JSONB DEFAULT '{}',            -- Additional metadata (tags, context, etc.)
  agent_id TEXT REFERENCES agents(id),    -- Agent that created this memory (optional)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                 -- Optional expiration time
  
  -- Constraints
  CONSTRAINT valid_key CHECK (length(key) > 0)
);

-- Indexes for shared memory
CREATE INDEX IF NOT EXISTS idx_shared_memory_key ON shared_memory(key);
CREATE INDEX IF NOT EXISTS idx_shared_memory_agent_id ON shared_memory(agent_id) WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shared_memory_created_at ON shared_memory(created_at);
CREATE INDEX IF NOT EXISTS idx_shared_memory_expires_at ON shared_memory(expires_at) WHERE expires_at IS NOT NULL;

-- GIN index for JSONB searches
CREATE INDEX IF NOT EXISTS idx_shared_memory_value ON shared_memory USING GIN(value);
CREATE INDEX IF NOT EXISTS idx_shared_memory_metadata ON shared_memory USING GIN(metadata);

-- Trigger to automatically update updated_at for shared_memory
DROP TRIGGER IF EXISTS update_shared_memory_updated_at ON shared_memory;
CREATE TRIGGER update_shared_memory_updated_at
  BEFORE UPDATE ON shared_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security for shared_memory
ALTER TABLE shared_memory ENABLE ROW LEVEL SECURITY;

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to shared_memory"
  ON shared_memory
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Authenticated users can read all shared memory
CREATE POLICY "Authenticated users can read shared_memory"
  ON shared_memory
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can write to shared memory
CREATE POLICY "Authenticated users can write shared_memory"
  ON shared_memory
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to clean up expired shared memory entries
CREATE OR REPLACE FUNCTION cleanup_expired_shared_memory()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM shared_memory
  WHERE expires_at IS NOT NULL AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE shared_memory IS 'Shared memory space for multi-agent coordination and message passing';
COMMENT ON COLUMN shared_memory.key IS 'Memory key for retrieval and organization';
COMMENT ON COLUMN shared_memory.value IS 'JSONB storage for any type of shared data';
COMMENT ON COLUMN shared_memory.metadata IS 'Additional metadata like tags, context, priority';
COMMENT ON COLUMN shared_memory.agent_id IS 'Optional reference to the agent that created this memory';
COMMENT ON COLUMN shared_memory.expires_at IS 'Optional expiration time for automatic cleanup';
