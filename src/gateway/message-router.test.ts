/**
 * Property Tests for Cross-Channel Message Router
 * 
 * Property 102: Cross-Channel Routing
 * For any message from any channel (Telegram, Discord, Slack), the system
 * should route it to the same agent instance based on agent ID.
 * 
 * Validates: Requirements 22.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { MessageRouter, AgentInstance } from './message-router.js';
import { Message, MessageResponse, ChannelType } from './types.js';

// Mock agent instance for testing
class MockAgentInstance implements AgentInstance {
  id: string;
  publicKey: string;
  messageCount: number = 0;
  lastMessage?: Message;

  constructor(id: string, publicKey: string) {
    this.id = id;
    this.publicKey = publicKey;
  }

  async handleMessage(message: Message): Promise<MessageResponse> {
    this.messageCount++;
    this.lastMessage = message;
    return {
      text: `Agent ${this.id} received: ${message.text}`,
    };
  }
}

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

const arbitraryAgentId = fc.string({ minLength: 5, maxLength: 20 });

describe('MessageRouter - Property Tests', () => {
  let router: MessageRouter;

  beforeEach(() => {
    router = new MessageRouter();
  });

  // Feature: ordo-digital-civilization, Property 102: Cross-Channel Routing
  describe('Property 102: Cross-Channel Routing', () => {
    it('should route messages from any channel to the same agent instance', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryAgentId,
          fc.array(arbitraryMessage, { minLength: 1, maxLength: 10 }),
          async (agentId, messages) => {
            // Setup: Create and register agent
            const agent = new MockAgentInstance(agentId, `pubkey_${agentId}`);
            router.registerAgent(agent);
            router.setDefaultAgent(agentId);

            // Execute: Route all messages
            const responses = await Promise.all(
              messages.map((msg) => router.routeMessage(msg))
            );

            // Verify: All messages routed to same agent
            expect(agent.messageCount).toBe(messages.length);
            expect(responses.length).toBe(messages.length);

            // Verify: Each response came from the correct agent
            responses.forEach((response) => {
              expect(response.text).toContain(`Agent ${agentId}`);
            });

            // Cleanup
            router.unregisterAgent(agentId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should route messages from different channels to the same agent based on routing rules', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryAgentId,
          fc.string({ minLength: 1, maxLength: 20 }), // channelId
          fc.string({ minLength: 1, maxLength: 20 }), // userId
          fc.array(arbitraryChannelType, { minLength: 2, maxLength: 3 }),
          async (agentId, channelId, userId, channelTypes) => {
            // Setup: Create and register agent
            const agent = new MockAgentInstance(agentId, `pubkey_${agentId}`);
            router.registerAgent(agent);

            // Add routing rule for specific user
            router.addRoutingRule({
              userId,
              agentId,
            });

            // Execute: Send messages from different channels with same userId
            const messages: Message[] = channelTypes.map((channelType, index) => ({
              id: `msg_${index}`,
              channelType,
              channelId: `${channelId}_${channelType}`,
              userId,
              text: `Message from ${channelType}`,
              timestamp: new Date(),
            }));

            const responses = await Promise.all(
              messages.map((msg) => router.routeMessage(msg))
            );

            // Verify: All messages routed to same agent despite different channels
            expect(agent.messageCount).toBe(messages.length);
            expect(responses.length).toBe(messages.length);

            // Verify: Each response came from the correct agent
            responses.forEach((response) => {
              expect(response.text).toContain(`Agent ${agentId}`);
            });

            // Cleanup
            router.removeRoutingRules(agentId);
            router.unregisterAgent(agentId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain agent instance identity across multiple messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbitraryAgentId,
          fc.array(arbitraryMessage, { minLength: 5, maxLength: 20 }),
          async (agentId, messages) => {
            // Setup: Create and register agent
            const agent = new MockAgentInstance(agentId, `pubkey_${agentId}`);
            router.registerAgent(agent);
            router.setDefaultAgent(agentId);

            // Execute: Route messages sequentially
            for (const message of messages) {
              await router.routeMessage(message);
            }

            // Verify: Same agent instance handled all messages
            expect(agent.messageCount).toBe(messages.length);
            expect(agent.lastMessage).toBeDefined();
            expect(agent.lastMessage?.text).toBe(messages[messages.length - 1].text);

            // Cleanup
            router.unregisterAgent(agentId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should route to correct agent based on channel-specific rules', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.tuple(arbitraryAgentId, arbitraryAgentId).filter(([a, b]) => a !== b),
          arbitraryChannelType,
          fc.string({ minLength: 1, maxLength: 20 }),
          async ([agentId1, agentId2], channelType, channelId) => {
            // Setup: Create and register two agents
            const agent1 = new MockAgentInstance(agentId1, `pubkey_${agentId1}`);
            const agent2 = new MockAgentInstance(agentId2, `pubkey_${agentId2}`);
            router.registerAgent(agent1);
            router.registerAgent(agent2);

            // Add channel-specific routing rule
            router.addRoutingRule({
              channelType,
              channelId,
              agentId: agentId1,
            });

            // Set default agent
            router.setDefaultAgent(agentId2);

            // Execute: Send message matching the rule
            const matchingMessage: Message = {
              id: 'msg_1',
              channelType,
              channelId,
              userId: 'user_1',
              text: 'Matching message',
              timestamp: new Date(),
            };

            const response1 = await router.routeMessage(matchingMessage);

            // Execute: Send message not matching the rule
            const nonMatchingMessage: Message = {
              id: 'msg_2',
              channelType,
              channelId: 'different_channel',
              userId: 'user_2',
              text: 'Non-matching message',
              timestamp: new Date(),
            };

            const response2 = await router.routeMessage(nonMatchingMessage);

            // Verify: Matching message went to agent1
            expect(agent1.messageCount).toBe(1);
            expect(response1.text).toContain(`Agent ${agentId1}`);

            // Verify: Non-matching message went to agent2 (default)
            expect(agent2.messageCount).toBe(1);
            expect(response2.text).toContain(`Agent ${agentId2}`);

            // Cleanup
            router.removeRoutingRules(agentId1);
            router.unregisterAgent(agentId1);
            router.unregisterAgent(agentId2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Unit Tests - Routing Rules', () => {
    it('should register and unregister agents', () => {
      const agent = new MockAgentInstance('agent1', 'pubkey1');
      router.registerAgent(agent);

      const stats = router.getStats();
      expect(stats.agentCount).toBe(1);
      expect(stats.agents).toContain('agent1');

      router.unregisterAgent('agent1');
      const statsAfter = router.getStats();
      expect(statsAfter.agentCount).toBe(0);
    });

    it('should set default agent', () => {
      const agent = new MockAgentInstance('agent1', 'pubkey1');
      router.registerAgent(agent);
      router.setDefaultAgent('agent1');

      // Should not throw
      expect(() => router.setDefaultAgent('agent1')).not.toThrow();
    });

    it('should throw error when setting non-existent agent as default', () => {
      expect(() => router.setDefaultAgent('nonexistent')).toThrow();
    });

    it('should add and remove routing rules', () => {
      const agent = new MockAgentInstance('agent1', 'pubkey1');
      router.registerAgent(agent);

      router.addRoutingRule({
        channelType: 'telegram',
        agentId: 'agent1',
      });

      let stats = router.getStats();
      expect(stats.ruleCount).toBe(1);

      router.removeRoutingRules('agent1');
      stats = router.getStats();
      expect(stats.ruleCount).toBe(0);

      router.unregisterAgent('agent1');
    });

    it('should extract agent ID from text', () => {
      const text1 = 'Hello @agent:abc123 how are you?';
      expect(MessageRouter.extractAgentIdFromText(text1)).toBe('abc123');

      const text2 = 'No agent mention here';
      expect(MessageRouter.extractAgentIdFromText(text2)).toBeUndefined();
    });

    it('should create routing rules with helper methods', () => {
      const userChannelRule = MessageRouter.createUserChannelRule(
        'telegram',
        'channel1',
        'user1',
        'agent1'
      );
      expect(userChannelRule.channelType).toBe('telegram');
      expect(userChannelRule.channelId).toBe('channel1');
      expect(userChannelRule.userId).toBe('user1');
      expect(userChannelRule.agentId).toBe('agent1');

      const channelRule = MessageRouter.createChannelRule('discord', 'channel2', 'agent2');
      expect(channelRule.channelType).toBe('discord');
      expect(channelRule.channelId).toBe('channel2');
      expect(channelRule.agentId).toBe('agent2');

      const channelTypeRule = MessageRouter.createChannelTypeRule('slack', 'agent3');
      expect(channelTypeRule.channelType).toBe('slack');
      expect(channelTypeRule.agentId).toBe('agent3');
    });
  });
});
