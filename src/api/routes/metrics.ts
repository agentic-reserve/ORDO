/**
 * Metrics API Routes
 * 
 * Provides performance metrics and analytics for agents
 */

import { Hono } from 'hono';
import { getDatabase } from '../../state/database.js';
import { verifyAuth } from '../middleware/auth.js';

const metrics = new Hono();

// Middleware: require authentication
metrics.use('*', verifyAuth);

/**
 * GET /api/metrics/overview
 * Get overview metrics for all agents
 */
metrics.get('/overview', async (c) => {
  try {
    const db = getDatabase();
    const agents = await db.listAgents();
    
    const totalAgents = agents.length;
    const activeAgents = agents.filter(a => a.status === 'active').length;
    const totalBalance = agents.reduce((sum, a) => sum + a.balance, 0);
    const totalEarnings = agents.reduce((sum, a) => sum + (a.totalEarnings || 0), 0);
    
    return c.json({
      totalAgents,
      activeAgents,
      idleAgents: agents.filter(a => a.status === 'idle').length,
      pausedAgents: agents.filter(a => a.status === 'paused').length,
      totalBalance,
      totalEarnings,
      averageBalance: totalAgents > 0 ? totalBalance / totalAgents : 0,
      averageEarnings: totalAgents > 0 ? totalEarnings / totalAgents : 0,
    });
  } catch (error) {
    console.error('Error getting overview metrics:', error);
    return c.json({ error: 'Failed to get overview metrics' }, 500);
  }
});

/**
 * GET /api/metrics/agents/:agentId/performance
 * Get performance metrics for a specific agent
 */
metrics.get('/agents/:agentId/performance', async (c) => {
  try {
    const agentId = c.req.param('agentId');
    const days = parseInt(c.req.query('days') || '7');
    
    const db = getDatabase();
    
    // Verify agent exists
    const agent = await db.getAgent(agentId);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    // Get action log for the agent
    const actions = await db.getActionLog(agentId, 1000);
    
    // Generate daily performance data
    const performanceData = generatePerformanceData(actions, days);
    
    return c.json({
      agentId,
      period: `${days} days`,
      data: performanceData,
      summary: {
        totalActions: actions.length,
        totalEarnings: agent.totalEarnings || 0,
        averageDailyEarnings: (agent.totalEarnings || 0) / days,
      },
    });
  } catch (error) {
    console.error('Error getting agent performance:', error);
    return c.json({ error: 'Failed to get agent performance' }, 500);
  }
});

/**
 * GET /api/metrics/agents/:agentId/stats
 * Get detailed statistics for an agent
 */
metrics.get('/agents/:agentId/stats', async (c) => {
  try {
    const agentId = c.req.param('agentId');
    const db = getDatabase();
    
    const agent = await db.getAgent(agentId);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    const actions = await db.getActionLog(agentId, 1000);
    const age = Math.floor((Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    return c.json({
      agentId,
      stats: {
        age,
        totalActions: actions.length,
        actionsPerDay: age > 0 ? actions.length / age : 0,
        balance: agent.balance,
        totalEarnings: agent.totalEarnings || 0,
        generation: agent.generation,
        status: agent.status,
        uptime: calculateUptime(actions),
      },
    });
  } catch (error) {
    console.error('Error getting agent stats:', error);
    return c.json({ error: 'Failed to get agent stats' }, 500);
  }
});

// Helper: Generate performance data for the last N days
function generatePerformanceData(actions: any[], days: number) {
  const data = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (let i = days - 1; i >= 0; i--) {
    const dayStart = now - (i * dayMs);
    const dayEnd = dayStart + dayMs;
    
    const dayActions = actions.filter(a => {
      const timestamp = new Date(a.timestamp).getTime();
      return timestamp >= dayStart && timestamp < dayEnd;
    });
    
    const date = new Date(dayStart);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    
    data.push({
      day: dayName,
      date: date.toISOString().split('T')[0],
      actions: dayActions.length,
      earnings: Math.random() * 5, // Mock earnings - replace with real calculation
    });
  }
  
  return data;
}

// Helper: Calculate uptime percentage
function calculateUptime(actions: any[]): number {
  if (actions.length === 0) return 0;
  
  // Simple uptime calculation based on action frequency
  // In production, track actual uptime/downtime
  return Math.min(100, (actions.length / 100) * 100);
}

export { metrics as metricsRoutes };
