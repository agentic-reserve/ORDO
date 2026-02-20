/**
 * Authentication API Routes
 * 
 * Handles wallet-based authentication using SIWE (Sign-In with Ethereum)
 */

import { Hono } from 'hono';
import { sign, verify } from 'hono/jwt';
import { SiweMessage } from 'siwe';
import { PublicKey } from '@solana/web3.js';
import { config } from '../../config.js';

const auth = new Hono();

/**
 * POST /api/auth/nonce
 * Generate a nonce for wallet authentication
 */
auth.post('/nonce', async (c) => {
  try {
    const { walletAddress } = await c.req.json();
    
    if (!walletAddress) {
      return c.json({ error: 'Wallet address is required' }, 400);
    }
    
    // Validate Solana address
    try {
      new PublicKey(walletAddress);
    } catch {
      return c.json({ error: 'Invalid Solana wallet address' }, 400);
    }
    
    // Generate nonce (random string)
    const nonce = Math.random().toString(36).substring(2, 15);
    
    // Store nonce temporarily (in production, use Redis)
    // For now, we'll include it in the message to sign
    
    return c.json({
      nonce,
      message: `Sign this message to authenticate with Ordo.\n\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`,
    });
  } catch (error) {
    console.error('Error generating nonce:', error);
    return c.json({ error: 'Failed to generate nonce' }, 500);
  }
});

/**
 * POST /api/auth/verify
 * Verify signed message and issue JWT token
 */
auth.post('/verify', async (c) => {
  try {
    const { walletAddress, signature, message } = await c.req.json();
    
    if (!walletAddress || !signature || !message) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    
    // In production, verify the signature using Solana's nacl
    // For now, we'll trust the client (NOT SECURE - implement proper verification)
    
    // Generate JWT token
    const payload = {
      walletAddress,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
    };
    
    const token = await sign(payload, config.api.jwtSecret);
    
    return c.json({
      token,
      walletAddress,
      expiresIn: 60 * 60 * 24 * 7, // 7 days in seconds
    });
  } catch (error) {
    console.error('Error verifying signature:', error);
    return c.json({ error: 'Failed to verify signature' }, 500);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token
 */
auth.post('/refresh', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }
    
    const token = authHeader.substring(7);
    
    // Verify existing token
    const payload = await verify(token, config.api.jwtSecret);
    
    // Generate new token
    const newPayload = {
      walletAddress: payload.walletAddress,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7), // 7 days
    };
    
    const newToken = await sign(newPayload, config.api.jwtSecret);
    
    return c.json({
      token: newToken,
      walletAddress: payload.walletAddress,
      expiresIn: 60 * 60 * 24 * 7,
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    return c.json({ error: 'Failed to refresh token' }, 401);
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
auth.get('/me', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid authorization header' }, 401);
    }
    
    const token = authHeader.substring(7);
    const payload = await verify(token, config.api.jwtSecret);
    
    return c.json({
      walletAddress: payload.walletAddress,
      authenticated: true,
    });
  } catch (error) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
});

export { auth as authRoutes };
