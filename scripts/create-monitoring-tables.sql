-- Monitoring and Observability Database Schema
-- Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6

-- Agent Metrics Table
CREATE TABLE IF NOT EXISTS agent_metrics (
  agent_id TEXT PRIMARY KEY,
  balance DOUBLE PRECISION NOT NULL DEFAULT 0,
  turns INTEGER NOT NULL DEFAULT 0,
  total_costs DOUBLE PRECISION NOT NULL DEFAULT 0,
  success_rate DOUBLE PRECISION NOT NULL DEFAULT 100,
  avg_latency DOUBLE PRECISION NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Agent Metrics History Table (for trends)
CREATE TABLE IF NOT EXISTS agent_metrics_history (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  balance DOUBLE PRECISION NOT NULL,
  turns INTEGER NOT NULL,
  total_costs DOUBLE PRECISION NOT NULL,
  success_rate DOUBLE PRECISION NOT NULL,
  avg_latency DOUBLE PRECISION NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agent_metrics(agent_id) ON DELETE CASCADE
);

-- Agent Transactions Table (from Helius webhooks)
CREATE TABLE IF NOT EXISTS agent_transactions (
  id SERIAL PRIMARY KEY,
  signature TEXT UNIQUE,
  slot BIGINT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  native_transfers JSONB,
  token_transfers JSONB,
  events JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Agent Alerts Table
CREATE TABLE IF NOT EXISTS agent_alerts (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'warning', 'info')),
  type TEXT NOT NULL CHECK (type IN ('balance', 'error_rate', 'latency', 'other')),
  message TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Agent Action Logs Table
CREATE TABLE IF NOT EXISTS agent_action_logs (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  action_type TEXT NOT NULL,
  inputs JSONB NOT NULL,
  outputs JSONB NOT NULL,
  cost DOUBLE PRECISION NOT NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'partial')),
  error_message TEXT,
  duration INTEGER,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Population Snapshots Table (for trend tracking)
CREATE TABLE IF NOT EXISTS population_snapshots (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  population INTEGER NOT NULL,
  alive_count INTEGER NOT NULL,
  dead_count INTEGER NOT NULL,
  avg_balance DOUBLE PRECISION NOT NULL,
  avg_fitness DOUBLE PRECISION NOT NULL,
  avg_generation DOUBLE PRECISION NOT NULL,
  survival_rate DOUBLE PRECISION NOT NULL,
  birth_rate DOUBLE PRECISION NOT NULL,
  death_rate DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_metrics_history_agent_id ON agent_metrics_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_metrics_history_timestamp ON agent_metrics_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_signature ON agent_transactions(signature);
CREATE INDEX IF NOT EXISTS idx_agent_transactions_timestamp ON agent_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_agent_id ON agent_alerts(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_timestamp ON agent_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_severity ON agent_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_agent_id ON agent_action_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_timestamp ON agent_action_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_action_type ON agent_action_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_agent_action_logs_outcome ON agent_action_logs(outcome);
CREATE INDEX IF NOT EXISTS idx_population_snapshots_timestamp ON population_snapshots(timestamp);

-- Function to update agent balance (called by Helius webhooks)
CREATE OR REPLACE FUNCTION update_agent_balance(
  agent_address TEXT,
  balance_change DOUBLE PRECISION
)
RETURNS VOID AS $$
BEGIN
  UPDATE agent_metrics
  SET 
    balance = balance + balance_change,
    last_updated = NOW()
  WHERE agent_id = agent_address;
  
  -- If agent doesn't exist, create metrics entry
  IF NOT FOUND THEN
    INSERT INTO agent_metrics (agent_id, balance, last_updated)
    VALUES (agent_address, balance_change, NOW());
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Row-level security policies
ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_metrics_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE population_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to agent_metrics"
  ON agent_metrics FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to agent_metrics_history"
  ON agent_metrics_history FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to agent_transactions"
  ON agent_transactions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to agent_alerts"
  ON agent_alerts FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to agent_action_logs"
  ON agent_action_logs FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role has full access to population_snapshots"
  ON population_snapshots FOR ALL
  USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own agent data
CREATE POLICY "Users can read their own agent metrics"
  ON agent_metrics FOR SELECT
  USING (agent_id = auth.uid()::TEXT);

CREATE POLICY "Users can read their own agent metrics history"
  ON agent_metrics_history FOR SELECT
  USING (agent_id = auth.uid()::TEXT);

CREATE POLICY "Users can read their own agent alerts"
  ON agent_alerts FOR SELECT
  USING (agent_id = auth.uid()::TEXT);

CREATE POLICY "Users can read their own agent action logs"
  ON agent_action_logs FOR SELECT
  USING (agent_id = auth.uid()::TEXT);

-- Allow public read access to population snapshots
CREATE POLICY "Anyone can read population snapshots"
  ON population_snapshots FOR SELECT
  USING (true);
