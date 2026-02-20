/**
 * Transaction API Routes
 * 
 * Handles agent transaction history and monitoring
 */

import { Hono } from 'hono';
import { getDatabase } from '../../state/database.js';
import { verifyAuth } from '../middleware/auth.js';

const transactions = new Hono();

// Middleware: require authentication
transactions.use('*', verifyAuth);

/**
 * GET /api/transactions
 * List all transactions (with optional agent filter)
 */
transactions.get('/', async (c) => {
  try {
    const agentId = c.req.query('agentId');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const db = getDatabase();
    
    // Get transactions from action log
    const actions = await db.getActionLog(agentId, limit, offset);
    
    // Transform to transaction format
    const txs = actions.map(action => ({
      id: action.id,
      agentId: action.agentId,
      type: action.actionType,
      amount: extractAmount(action.details),
      timestamp: action.timestamp,
      status: 'success', // Assume success if logged
      details: action.details,
    }));
    
    return c.json({
      transactions: txs,
      total: txs.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error listing transactions:', error);
    return c.json({ error: 'Failed to list transactions' }, 500);
  }
});

/**
 * GET /api/transactions/:id
 * Get transaction details
 */
transactions.get('/:id', async (c) => {
  try {
    const txId = c.req.param('id');
    const db = getDatabase();
    
    // Get from action log
    const actions = await db.getActionLog(undefined, 1000);
    const action = actions.find(a => a.id === txId);
    
    if (!action) {
      return c.json({ error: 'Transaction not found' }, 404);
    }
    
    return c.json({
      transaction: {
        id: action.id,
        agentId: action.agentId,
        type: action.actionType,
        amount: extractAmount(action.details),
        timestamp: action.timestamp,
        status: 'success',
        details: action.details,
      },
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    return c.json({ error: 'Failed to get transaction' }, 500);
  }
});

/**
 * GET /api/agents/:agentId/transactions
 * Get transactions for a specific agent
 */
transactions.get('/agents/:agentId', async (c) => {
  try {
    const agentId = c.req.param('agentId');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');
    
    const db = getDatabase();
    
    // Verify agent exists
    const agent = await db.getAgent(agentId);
    if (!agent) {
      return c.json({ error: 'Agent not found' }, 404);
    }
    
    // Get transactions
    const actions = await db.getActionLog(agentId, limit, offset);
    
    const txs = actions.map(action => ({
      id: action.id,
      type: action.actionType,
      amount: extractAmount(action.details),
      timestamp: action.timestamp,
      status: 'success',
      details: action.details,
    }));
    
    return c.json({
      agentId,
      transactions: txs,
      total: txs.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error getting agent transactions:', error);
    return c.json({ error: 'Failed to get agent transactions' }, 500);
  }
});

// Helper function to extract amount from action details
function extractAmount(details: string): number {
  try {
    const match = details.match(/(\d+\.?\d*)\s*(SOL|USDC)/i);
    return match ? parseFloat(match[1]) : 0;
  } catch {
    return 0;
  }
}

export { transactions as transactionRoutes };
