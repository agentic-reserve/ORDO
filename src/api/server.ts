/**
 * Ordo REST API Server
 * 
 * Provides HTTP REST API for web and mobile clients to interact with Ordo agents.
 * Built with Hono for lightweight, fast performance.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { agentRoutes } from './routes/agents.js';
import { authRoutes } from './routes/auth.js';
import { transactionRoutes } from './routes/transactions.js';
import { metricsRoutes } from './routes/metrics.js';
import { config } from '../config.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', cors({
  origin: config.api.corsOrigins,
  credentials: true,
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

// API routes
app.route('/api/auth', authRoutes);
app.route('/api/agents', agentRoutes);
app.route('/api/transactions', transactionRoutes);
app.route('/api/metrics', metricsRoutes);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err);
  return c.json({
    error: err.message || 'Internal Server Error',
  }, 500);
});

export { app };

// Start server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const port = config.api.port;
  console.log(`🚀 Ordo API Server starting on port ${port}`);
  
  Bun.serve({
    port,
    fetch: app.fetch,
  });
  
  console.log(`✅ Server running at http://localhost:${port}`);
}
