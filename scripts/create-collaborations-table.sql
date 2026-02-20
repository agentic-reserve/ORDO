-- Create collaborations table for tracking multi-agent collaboration
CREATE TABLE IF NOT EXISTS collaborations (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  participant_ids TEXT[] NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  outcome JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_collaborations_task_id ON collaborations(task_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_participant_ids ON collaborations USING GIN(participant_ids);
CREATE INDEX IF NOT EXISTS idx_collaborations_started_at ON collaborations(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_collaborations_success ON collaborations(success);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_collaborations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER collaborations_updated_at
BEFORE UPDATE ON collaborations
FOR EACH ROW
EXECUTE FUNCTION update_collaborations_updated_at();

-- Enable Row Level Security
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your security requirements)
CREATE POLICY collaborations_all ON collaborations
FOR ALL
USING (true)
WITH CHECK (true);

COMMENT ON TABLE collaborations IS 'Tracks multi-agent collaboration sessions and outcomes';
COMMENT ON COLUMN collaborations.id IS 'Unique collaboration identifier (ULID)';
COMMENT ON COLUMN collaborations.task_id IS 'ID of the task being collaborated on';
COMMENT ON COLUMN collaborations.participant_ids IS 'Array of agent IDs participating in the collaboration';
COMMENT ON COLUMN collaborations.started_at IS 'When the collaboration started';
COMMENT ON COLUMN collaborations.completed_at IS 'When the collaboration completed (null if ongoing)';
COMMENT ON COLUMN collaborations.success IS 'Whether the collaboration was successful';
COMMENT ON COLUMN collaborations.outcome IS 'JSON result/outcome of the collaboration';
