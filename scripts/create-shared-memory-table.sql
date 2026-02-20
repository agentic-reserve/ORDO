-- Shared Memory table - For multi-agent coordination
CREATE TABLE IF NOT EXISTS shared_memory (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  agent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  
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

-- Function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at for shared_memory
DROP TRIGGER IF EXISTS update_shared_memory_updated_at ON shared_memory;
CREATE TRIGGER update_shared_memory_updated_at
  BEFORE UPDATE ON shared_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security for shared_memory
ALTER TABLE shared_memory ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role has full access to shared_memory" ON shared_memory;
DROP POLICY IF EXISTS "Authenticated users can read shared_memory" ON shared_memory;
DROP POLICY IF EXISTS "Authenticated users can write shared_memory" ON shared_memory;

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
