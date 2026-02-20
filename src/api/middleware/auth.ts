/**
 * Authentication Middleware
 * 
 * Verifies JWT tokens and attaches user info to context
 */

import { Context, Next } from 'hono';
import { verify } from 'hono/jwt';
import { config } from '../../config.js';

export async function verifyAuth(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }
    
    const token = authHeader.substring(7);
    
    // Verify JWT token
    const payload = await verify(token, config.api.jwtSecret);
    
    // Attach user info to context
    c.set('userId', payload.walletAddress);
    c.set('walletAddress', payload.walletAddress);
    
    await next();
  } catch (error) {
    console.error('Auth verification failed:', error);
    return c.json({ error: 'Unauthorized' }, 401);
  }
}
