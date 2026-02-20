-- DeFi Transaction Tracking Tables
-- 
-- This script creates the necessary tables for tracking DeFi transactions
-- and enabling agents to learn from transaction history.

-- Create defi_transactions table
CREATE TABLE IF NOT EXISTS defi_transactions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  cost DECIMAL NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  parameters JSONB NOT NULL,
  result JSONB,
  error TEXT,
  
  -- Indexes for efficient querying
  CONSTRAINT fk_agent FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_defi_transactions_agent_id ON defi_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_defi_transactions_operation ON defi_transactions(operation);
CREATE INDEX IF NOT EXISTS idx_defi_transactions_success ON defi_transactions(success);
CREATE INDEX IF NOT EXISTS idx_defi_transactions_timestamp ON defi_transactions(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_defi_transactions_agent_operation ON defi_transactions(agent_id, operation);

-- Enable Row Level Security
ALTER TABLE defi_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow agents to read their own transactions
CREATE POLICY "Agents can read own transactions"
  ON defi_transactions
  FOR SELECT
  USING (agent_id = current_setting('app.current_agent_id', true));

-- Allow agents to insert their own transactions
CREATE POLICY "Agents can insert own transactions"
  ON defi_transactions
  FOR INSERT
  WITH CHECK (agent_id = current_setting('app.current_agent_id', true));

-- Allow platform admins to read all transactions
CREATE POLICY "Admins can read all transactions"
  ON defi_transactions
  FOR SELECT
  USING (current_setting('app.role', true) = 'admin');

-- Create a view for transaction statistics
CREATE OR REPLACE VIEW defi_transaction_stats AS
SELECT
  agent_id,
  COUNT(*) as total_transactions,
  SUM(CASE WHEN success THEN 1 ELSE 0 END) as successful_transactions,
  SUM(CASE WHEN NOT success THEN 1 ELSE 0 END) as failed_transactions,
  ROUND(AVG(CASE WHEN success THEN 100.0 ELSE 0.0 END), 2) as success_rate,
  SUM(cost) as total_cost,
  AVG(cost) as average_cost,
  MIN(timestamp) as first_transaction,
  MAX(timestamp) as last_transaction
FROM defi_transactions
GROUP BY agent_id;

-- Grant access to the view
GRANT SELECT ON defi_transaction_stats TO authenticated;

-- Create a function to get operation-specific stats
CREATE OR REPLACE FUNCTION get_operation_stats(p_agent_id TEXT, p_operation TEXT)
RETURNS TABLE (
  operation TEXT,
  total_count BIGINT,
  success_count BIGINT,
  success_rate NUMERIC,
  avg_cost NUMERIC,
  total_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_operation as operation,
    COUNT(*) as total_count,
    SUM(CASE WHEN success THEN 1 ELSE 0 END) as success_count,
    ROUND(AVG(CASE WHEN success THEN 100.0 ELSE 0.0 END), 2) as success_rate,
    AVG(cost) as avg_cost,
    SUM(cost) as total_cost
  FROM defi_transactions
  WHERE agent_id = p_agent_id AND operation = p_operation;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get daily transaction trends
CREATE OR REPLACE FUNCTION get_daily_trends(p_agent_id TEXT, p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  date DATE,
  transaction_count BIGINT,
  success_rate NUMERIC,
  total_cost NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(timestamp) as date,
    COUNT(*) as transaction_count,
    ROUND(AVG(CASE WHEN success THEN 100.0 ELSE 0.0 END), 2) as success_rate,
    SUM(cost) as total_cost
  FROM defi_transactions
  WHERE agent_id = p_agent_id
    AND timestamp >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY DATE(timestamp)
  ORDER BY DATE(timestamp) DESC;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE defi_transactions IS 'Tracks all DeFi transactions executed by agents for learning and analytics';
COMMENT ON COLUMN defi_transactions.id IS 'Unique transaction ID (ULID)';
COMMENT ON COLUMN defi_transactions.agent_id IS 'Public key of the agent that executed the transaction';
COMMENT ON COLUMN defi_transactions.operation IS 'Type of operation (swap, stake, lend, etc.)';
COMMENT ON COLUMN defi_transactions.success IS 'Whether the transaction succeeded';
COMMENT ON COLUMN defi_transactions.cost IS 'Transaction cost in SOL';
COMMENT ON COLUMN defi_transactions.parameters IS 'Input parameters for the transaction';
COMMENT ON COLUMN defi_transactions.result IS 'Transaction result (signature, etc.)';
COMMENT ON COLUMN defi_transactions.error IS 'Error message if transaction failed';
