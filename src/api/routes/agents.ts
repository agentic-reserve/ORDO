/**
 * Agent API Routes
 * 
 * CRUD operations for AI agents
 */

import { Hono } from 'hono';
import { getDatabase } from '../../state/database.js';
import { verifyAuth } from '../middleware/auth.js';
import type { Agent } from '../../types/database.js';

const agents = new Hono();

// Middleware: require authentication for all agent routes
agents.use('*', verifyAuth);

/**
 * GET /api/agents
 * List all agents for the authenticated user
 */
agents.get('/', async (c) => {
  try {
    const userId = c.get('userId');
    const db = getDatabase();
    
    const allAgents = await db.listAgents();
    
    // Filter agents by user (in production, add userId to agent table)
    // For now, return all agents
    const userAgents = allAgents.map(agent => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      balance: agent.balance,
      earnings: agent.totalEarnings || 0,
      age: Math.floor((Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
      generation: agent.generation,
      specialization: agent.config?.specialization || 'General',
      riskTolerance: agent.config?.riskTolerance || 'medium',
      autoTrade: agent.config?.autoTrade || false,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    }));
    
    return c.json({
      agents: userAgents,
      total: userAgents.length,
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    return c.json({ error: 'Failed to list agents' }, 500);
  }
});

/**
 * GET /api/agents/:id
 * Get agent details by ID
 */
agents.get('/:id', async (c) => {
  try {
    const agentId = c.req.param('id');
    const db = getDatabase();
    
    const agent = await db.getAgent(agentId);
    
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    // Calculate additional metrics
    const age = Math.floor((Date.now() - new Date(agent.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    
    return c.json({
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        balance: agent.balance,
        earnings: agent.totalEarnings || 0,
        age,
        generation: agent.generation,
        specialization: agent.config?.specialization || 'General',
        riskTolerance: agent.config?.riskTolerance || 'medium',
        autoTrade: agent.config?.autoTrade || false,
        walletAddress: agent.walletAddress,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error getting agent:', error);
    return c.json({ error: 'Failed to get agent' }, 500);
  }
});

/**
 * POST /api/agents
 * Create a new agent
 */
agents.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { name, specialization, initialBalance, riskTolerance, autoTrade } = body;
    
    // Validation
    if (!name || !name.trim()) {
      return c.json({ error: 'Agent name is required' }, 400);
    }
    
    if (!initialBalance || parseFloat(initialBalance) < 0.1) {
      return c.json({ error: 'Minimum initial balance is 0.1 SOL' }, 400);
    }
    
    const db = getDatabase();
    
    // Create agent
    const agent = await db.createAgent({
      name: name.trim(),
      balance: parseFloat(initialBalance),
      generation: 1,
      status: 'idle',
      config: {
        specialization: specialization || 'general',
        riskTolerance: riskTolerance || 'medium',
        autoTrade: autoTrade || false,
      },
    });
    
    return c.json({
      agent: {
        id: agent.id,
        name: agent.name,
        status: agent.status,
        balance: agent.balance,
        specialization: agent.config?.specialization,
        riskTolerance: agent.config?.riskTolerance,
        autoTrade: agent.config?.autoTrade,
        createdAt: agent.createdAt,
      },
    }, 201);
  } catch (error) {
    console.error('Error creating agent:', error);
    return c.json({ error: 'Failed to create agent' }, 500);
  }
});

/**
 * PATCH /api/agents/:id
 * Update agent configuration
 */
agents.patch('/:id', async (c) => {
  try {
    const agentId = c.req.param('id');
    const body = await c.req.json();
    const db = getDatabase();
    
    const agent = await db.getAgent(agentId);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    // Update agent
    const updates: Partial<Agent> = {};
    
    if (body.name) updates.name = body.name;
    if (body.status) updates.status = body.status;
    if (body.config) {
      updates.config = {
        ...agent.config,
        ...body.config,
      };
    }
    
    await db.updateAgent(agentId, updates);
    
    const updatedAgent = await db.getAgent(agentId);
    
    return c.json({
      agent: {
        id: updatedAgent!.id,
        name: updatedAgent!.name,
        status: updatedAgent!.status,
        config: updatedAgent!.config,
        updatedAt: updatedAgent!.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error updating agent:', error);
    return c.json({ error: 'Failed to update agent' }, 500);
  }
});

/**
 * DELETE /api/agents/:id
 * Delete an agent
 */
agents.delete('/:id', async (c) => {
  try {
    const agentId = c.req.param('id');
    const db = getDatabase();
    
    const agent = await db.getAgent(agentId);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    await db.deleteAgent(agentId);
    
    return c.json({
      message: 'Agent deleted successfully',
      agentId,
    });
  } catch (error) {
    console.error('Error deleting agent:', error);
    return c.json({ error: 'Failed to delete agent' }, 500);
  }
});

/**
 * POST /api/agents/:id/pause
 * Pause an agent
 */
agents.post('/:id/pause', async (c) => {
  try {
    const agentId = c.req.param('id');
    const db = getDatabase();
    
    const agent = await db.getAgent(agentId);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    await db.updateAgent(agentId, { status: 'paused' });
    
    return c.json({
      message: 'Agent paused',
      agentId,
      status: 'paused',
    });
  } catch (error) {
    console.error('Error pausing agent:', error);
    return c.json({ error: 'Failed to pause agent' }, 500);
  }
});

/**
 * POST /api/agents/:id/resume
 * Resume an agent
 */
agents.post('/:id/resume', async (c) => {
  try {
    const agentId = c.req.param('id');
    const db = getDatabase();
    
    const agent = await db.getAgent(agentId);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    await db.updateAgent(agentId, { status: 'active' });
    
    return c.json({
      message: 'Agent resumed',
      agentId,
      status: 'active',
    });
  } catch (error) {
    console.error('Error resuming agent:', error);
    return c.json({ error: 'Failed to resume agent' }, 500);
  }
});

export { agents as agentRoutes };
