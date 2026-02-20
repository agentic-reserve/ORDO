/**
 * Property Tests for Cross-Channel Session Manager
 * 
 * Property 103: Cross-Channel Context
 * For any session spanning multiple channels, the system should maintain
 * context such that switching channels preserves conversation history.
 * 
 * Validates: Requirements 22.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { SessionManager, SessionContext } from './session-manager.js';
import { Message, ChannelType } from './types.js';

// Arbitraries for property-based testing
const arbitraryChannelType = fc.constantFrom<ChannelType>('telegram', 'discord', 'slack');

const arbitraryMessage = fc.record({
  id: fc.uuid(),
  channelType: arbitraryChannelType,
  channelId: fc.string({ minLength: 1, maxLength: 20 }),
  userId: fc.string({ minLength: 1, maxLength: 20 }),
  username: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
  text: fc.string({ minLength: 1, maxLength: 100 }),
  timestamp: fc.date(),
  metadata: fc.option(fc.dictionary(fc.string(), fc.anything())),
}) as fc.Arbitrary<Message>;

const arbitraryUserId = fc.string({ minLength: 5, maxLength: 20 });
const arbitraryAgentId = fc.string({ minLength: 5, maxLength: 20 });

describe('SessionManager - Property Tests', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager();
  });

  // Feature: ordo-digital-civilization, Property 103: Cross-Channel Context
  describe('Property 103: Cross-Channel Context', () => {
    it('should preserve conversation history when switching channels', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryUserId,
          arbitraryAgentId,
          fc.array(arbitraryMessage, { minLength: 3, maxLength: 10 }),
          fc.array(arbitraryChannelType, { minLength: 2, maxLength: 3 }),
          async (userId, agentId, messages, channelTypes) => {
            // Setup: Create messages from different channels with same userId
            const channelMessages = messages.map((msg, index) => ({
              ...msg,
              userId,
              channelType: channelTypes[index % channelTypes.length],
              channelId: `channel_${channelTypes[index % channelTypes.length]}`,
            }));

            // Execute: Send messages from different channels
            let session: SessionContext | undefined;
            for (const message of channelMessages) {
              session = sessionManager.getOrCreateSession(userId, agentId, message);
              sessionManager.addMessageToSession(session.sessionId, message);
            }

            // Verify: Session exists and has all messages
            expect(session).toBeDefined();
            expect(session!.history.length).toBe(channelMessages.length);

            // Verify: All channels are registered in session
            const uniqueChannels = new Set(channelMessages.map((m) => m.channelType));
            expect(session!.channels.size).toBe(uniqueChannels.size);

            // Verify: History is preserved across channel switches
            for (let i = 0; i < channelMessages.length; i++) {
              expect(session!.history[i].text).toBe(channelMessages[i].text);
              expect(session!.history[i].channelType).toBe(channelMessages[i].channelType);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain same session ID across different channels for same user', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryUserId,
          arbitraryAgentId,
          fc.array(arbitraryChannelType, { minLength: 2, maxLength: 3 }),
          async (userId, agentId, channelTypes) => {
            const sessionIds = new Set<string>();

            // Execute: Create sessions from different channels
            for (const channelType of channelTypes) {
              const message: Message = {
                id: `msg_${channelType}`,
                channelType,
                channelId: `channel_${channelType}`,
                userId,
                text: `Message from ${channelType}`,
                timestamp: new Date(),
              };

              const session = sessionManager.getOrCreateSession(userId, agentId, message);
              sessionIds.add(session.sessionId);
            }

            // Verify: Only one session ID for all channels
            expect(sessionIds.size).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve message order across channel switches', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryUserId,
          arbitraryAgentId,
          fc.array(arbitraryMessage, { minLength: 5, maxLength: 15 }),
          async (userId, agentId, messages) => {
            // Setup: Alternate between channels
            const channelTypes: ChannelType[] = ['telegram', 'discord', 'slack'];
            const orderedMessages = messages.map((msg, index) => ({
              ...msg,
              userId,
              channelType: channelTypes[index % channelTypes.length],
              channelId: `channel_${index % channelTypes.length}`,
            }));

            // Execute: Send messages in order
            let session: SessionContext | undefined;
            for (const message of orderedMessages) {
              session = sessionManager.getOrCreateSession(userId, agentId, message);
              sessionManager.addMessageToSession(session.sessionId, message);
            }

            // Verify: Messages are in correct order
            expect(session).toBeDefined();
            expect(session!.history.length).toBe(orderedMessages.length);

            for (let i = 0; i < orderedMessages.length; i++) {
              expect(session!.history[i].id).toBe(orderedMessages[i].id);
              expect(session!.history[i].text).toBe(orderedMessages[i].text);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should track all channels used in a session', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryUserId,
          arbitraryAgentId,
          fc.uniqueArray(arbitraryChannelType, { minLength: 1, maxLength: 3 }),
          async (userId, agentId, channelTypes) => {
            // Execute: Send messages from different channels
            let session: SessionContext | undefined;
            for (const channelType of channelTypes) {
              const message: Message = {
                id: `msg_${channelType}`,
                channelType,
                channelId: `channel_${channelType}`,
                userId,
                text: `Message from ${channelType}`,
                timestamp: new Date(),
              };

              session = sessionManager.getOrCreateSession(userId, agentId, message);
              sessionManager.addMessageToSession(session.sessionId, message);
            }

            // Verify: All channels are tracked
            expect(session).toBeDefined();
            expect(session!.channels.size).toBe(channelTypes.length);

            // Verify: Each channel is present
            for (const channelType of channelTypes) {
              expect(session!.channels.has(channelType)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests - Session Management', () => {
    it('should create new session for new user', () => {
      const message: Message = {
        id: 'msg1',
        channelType: 'telegram',
        channelId: 'channel1',
        userId: 'user1',
        text: 'Hello',
        timestamp: new Date(),
      };

      const session = sessionManager.getOrCreateSession('user1', 'agent1', message);

      expect(session).toBeDefined();
      expect(session.userId).toBe('user1');
      expect(session.agentId).toBe('agent1');
      expect(session.channels.size).toBe(1);
    });

    it('should reuse existing session for same user', () => {
      const message1: Message = {
        id: 'msg1',
        channelType: 'telegram',
        channelId: 'channel1',
        userId: 'user1',
        text: 'Hello',
        timestamp: new Date(),
      };

      const message2: Message = {
        id: 'msg2',
        channelType: 'discord',
        channelId: 'channel2',
        userId: 'user1',
        text: 'World',
        timestamp: new Date(),
      };

      const session1 = sessionManager.getOrCreateSession('user1', 'agent1', message1);
      const session2 = sessionManager.getOrCreateSession('user1', 'agent1', message2);

      expect(session1.sessionId).toBe(session2.sessionId);
      expect(session2.channels.size).toBe(2);
    });

    it('should add messages to session history', () => {
      const message: Message = {
        id: 'msg1',
        channelType: 'telegram',
        channelId: 'channel1',
        userId: 'user1',
        text: 'Hello',
        timestamp: new Date(),
      };

      const session = sessionManager.getOrCreateSession('user1', 'agent1', message);
      sessionManager.addMessageToSession(session.sessionId, message);

      const history = sessionManager.getSessionHistory(session.sessionId);
      expect(history.length).toBe(1);
      expect(history[0].text).toBe('Hello');
    });

    it('should clear session history', () => {
      const message: Message = {
        id: 'msg1',
        channelType: 'telegram',
        channelId: 'channel1',
        userId: 'user1',
        text: 'Hello',
        timestamp: new Date(),
      };

      const session = sessionManager.getOrCreateSession('user1', 'agent1', message);
      sessionManager.addMessageToSession(session.sessionId, message);
      sessionManager.clearSessionHistory(session.sessionId);

      const history = sessionManager.getSessionHistory(session.sessionId);
      expect(history.length).toBe(0);
    });

    it('should end session', () => {
      const message: Message = {
        id: 'msg1',
        channelType: 'telegram',
        channelId: 'channel1',
        userId: 'user1',
        text: 'Hello',
        timestamp: new Date(),
      };

      const session = sessionManager.getOrCreateSession('user1', 'agent1', message);
      sessionManager.endSession(session.sessionId);

      expect(sessionManager.hasActiveSession('user1')).toBe(false);
      expect(sessionManager.getSession(session.sessionId)).toBeUndefined();
    });

    it('should get session by user ID', () => {
      const message: Message = {
        id: 'msg1',
        channelType: 'telegram',
        channelId: 'channel1',
        userId: 'user1',
        text: 'Hello',
        timestamp: new Date(),
      };

      const session = sessionManager.getOrCreateSession('user1', 'agent1', message);
      const retrievedSession = sessionManager.getSessionByUserId('user1');

      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.sessionId).toBe(session.sessionId);
    });

    it('should export and import session', () => {
      const message: Message = {
        id: 'msg1',
        channelType: 'telegram',
        channelId: 'channel1',
        userId: 'user1',
        text: 'Hello',
        timestamp: new Date(),
      };

      const session = sessionManager.getOrCreateSession('user1', 'agent1', message);
      sessionManager.addMessageToSession(session.sessionId, message);

      const exported = sessionManager.exportSession(session.sessionId);
      expect(exported).toBeDefined();

      // Create new session manager and import
      const newSessionManager = new SessionManager();
      newSessionManager.importSession(exported!);

      const imported = newSessionManager.getSession(session.sessionId);
      expect(imported).toBeDefined();
      expect(imported!.history.length).toBe(1);
    });

    it('should cleanup inactive sessions', () => {
      const message: Message = {
        id: 'msg1',
        channelType: 'telegram',
        channelId: 'channel1',
        userId: 'user1',
        text: 'Hello',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
      };

      const session = sessionManager.getOrCreateSession('user1', 'agent1', message);
      // Manually set old timestamp
      session.lastActivityAt = new Date(Date.now() - 25 * 60 * 60 * 1000);

      const cleaned = sessionManager.cleanupInactiveSessions(24 * 60 * 60 * 1000);
      expect(cleaned).toBe(1);
      expect(sessionManager.hasActiveSession('user1')).toBe(false);
    });

    it('should get session statistics', () => {
      const message1: Message = {
        id: 'msg1',
        channelType: 'telegram',
        channelId: 'channel1',
        userId: 'user1',
        text: 'Hello',
        timestamp: new Date(),
      };

      const message2: Message = {
        id: 'msg2',
        channelType: 'discord',
        channelId: 'channel2',
        userId: 'user2',
        text: 'World',
        timestamp: new Date(),
      };

      const session1 = sessionManager.getOrCreateSession('user1', 'agent1', message1);
      const session2 = sessionManager.getOrCreateSession('user2', 'agent1', message2);

      sessionManager.addMessageToSession(session1.sessionId, message1);
      sessionManager.addMessageToSession(session2.sessionId, message2);

      const stats = sessionManager.getStats();
      expect(stats.totalSessions).toBe(2);
      expect(stats.totalMessages).toBe(2);
    });
  });
});
