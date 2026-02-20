/**
 * Cross-Channel Session Manager
 * 
 * Maintains session context across channels, enabling channel switching
 * without losing conversation history.
 * 
 * Requirements: 22.5
 */

import { Message, ChannelType } from './types.js';

export interface SessionContext {
  sessionId: string;
  agentId: string;
  userId: string;
  channels: Map<ChannelType, string>; // channelType -> channelId
  history: Message[];
  metadata: Record<string, any>;
  createdAt: Date;
  lastActivityAt: Date;
}

export class SessionManager {
  private sessions: Map<string, SessionContext> = new Map();
  private userSessions: Map<string, string> = new Map(); // userId -> sessionId

  /**
   * Get or create a session for a user
   */
  getOrCreateSession(userId: string, agentId: string, message: Message): SessionContext {
    // Check if user already has a session
    let sessionId = this.userSessions.get(userId);
    let session = sessionId ? this.sessions.get(sessionId) : undefined;

    if (!session) {
      // Create new session
      sessionId = this.generateSessionId(userId, agentId);
      session = {
        sessionId,
        agentId,
        userId,
        channels: new Map(),
        history: [],
        metadata: {},
        createdAt: new Date(),
        lastActivityAt: new Date(),
      };

      this.sessions.set(sessionId, session);
      this.userSessions.set(userId, sessionId);
      console.log(`Created new session ${sessionId} for user ${userId}`);
    }

    // Add channel to session if not already present
    if (!session.channels.has(message.channelType)) {
      session.channels.set(message.channelType, message.channelId);
      console.log(
        `Added channel ${message.channelType}:${message.channelId} to session ${sessionId}`
      );
    }

    // Update last activity
    session.lastActivityAt = new Date();

    return session;
  }

  /**
   * Add a message to session history
   */
  addMessageToSession(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      console.error(`Session ${sessionId} not found`);
      return;
    }

    session.history.push(message);
    session.lastActivityAt = new Date();
  }

  /**
   * Get session history
   */
  getSessionHistory(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    return session ? session.history : [];
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): SessionContext | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get session by user ID
   */
  getSessionByUserId(userId: string): SessionContext | undefined {
    const sessionId = this.userSessions.get(userId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /**
   * Check if user has active session
   */
  hasActiveSession(userId: string): boolean {
    return this.userSessions.has(userId);
  }

  /**
   * Clear session history
   */
  clearSessionHistory(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.history = [];
      console.log(`Cleared history for session ${sessionId}`);
    }
  }

  /**
   * End a session
   */
  endSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.userSessions.delete(session.userId);
      this.sessions.delete(sessionId);
      console.log(`Ended session ${sessionId}`);
    }
  }

  /**
   * Get all channels for a session
   */
  getSessionChannels(sessionId: string): Map<ChannelType, string> | undefined {
    const session = this.sessions.get(sessionId);
    return session?.channels;
  }

  /**
   * Check if session has channel
   */
  sessionHasChannel(sessionId: string, channelType: ChannelType): boolean {
    const session = this.sessions.get(sessionId);
    return session ? session.channels.has(channelType) : false;
  }

  /**
   * Get session statistics
   */
  getStats(): {
    totalSessions: number;
    activeSessions: number;
    totalMessages: number;
  } {
    let totalMessages = 0;
    for (const session of this.sessions.values()) {
      totalMessages += session.history.length;
    }

    return {
      totalSessions: this.sessions.size,
      activeSessions: this.sessions.size,
      totalMessages,
    };
  }

  /**
   * Clean up inactive sessions (older than maxAge)
   */
  cleanupInactiveSessions(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const age = now - session.lastActivityAt.getTime();
      if (age > maxAgeMs) {
        this.endSession(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} inactive sessions`);
    }

    return cleaned;
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(userId: string, agentId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${agentId}:${userId}:${timestamp}:${random}`;
  }

  /**
   * Export session for persistence
   */
  exportSession(sessionId: string): SessionContext | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    return {
      ...session,
      channels: new Map(session.channels),
      history: [...session.history],
      metadata: { ...session.metadata },
    };
  }

  /**
   * Import session from persistence
   */
  importSession(sessionData: SessionContext): void {
    this.sessions.set(sessionData.sessionId, sessionData);
    this.userSessions.set(sessionData.userId, sessionData.sessionId);
    console.log(`Imported session ${sessionData.sessionId}`);
  }
}
