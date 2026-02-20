/**
 * Cross-Channel Message Router
 * 
 * Routes messages from all channels (Telegram, Discord, Slack) to the same
 * agent instance based on agent ID. Provides unified message handling across
 * all communication channels.
 * 
 * Requirements: 22.4
 */

import { Message, MessageResponse, ChannelType } from './types.js';

export interface AgentInstance {
  id: string;
  publicKey: string;
  handleMessage(message: Message): Promise<MessageResponse>;
}

export interface RoutingRule {
  channelType?: ChannelType;
  channelId?: string;
  userId?: string;
  agentId: string;
}

export class MessageRouter {
  private agents: Map<string, AgentInstance> = new Map();
  private routingRules: RoutingRule[] = [];
  private defaultAgentId?: string;

  /**
   * Register an agent instance for message routing
   */
  registerAgent(agent: AgentInstance): void {
    this.agents.set(agent.id, agent);
    console.log(`Registered agent: ${agent.id}`);
  }

  /**
   * Unregister an agent instance
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);
    console.log(`Unregistered agent: ${agentId}`);
  }

  /**
   * Set the default agent for unmatched messages
   */
  setDefaultAgent(agentId: string): void {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent ${agentId} not registered`);
    }
    this.defaultAgentId = agentId;
    console.log(`Set default agent: ${agentId}`);
  }

  /**
   * Add a routing rule to map messages to specific agents
   */
  addRoutingRule(rule: RoutingRule): void {
    if (!this.agents.has(rule.agentId)) {
      throw new Error(`Agent ${rule.agentId} not registered`);
    }
    this.routingRules.push(rule);
    console.log(`Added routing rule for agent: ${rule.agentId}`);
  }

  /**
   * Remove routing rules for a specific agent
   */
  removeRoutingRules(agentId: string): void {
    this.routingRules = this.routingRules.filter((rule) => rule.agentId !== agentId);
    console.log(`Removed routing rules for agent: ${agentId}`);
  }

  /**
   * Route a message to the appropriate agent instance
   */
  async routeMessage(message: Message): Promise<MessageResponse> {
    try {
      // Find matching agent based on routing rules
      const agentId = this.findMatchingAgent(message);

      if (!agentId) {
        return {
          text: 'No agent available to handle your message. Please contact the administrator.',
        };
      }

      const agent = this.agents.get(agentId);

      if (!agent) {
        console.error(`Agent ${agentId} not found in registry`);
        return {
          text: 'Agent not available. Please try again later.',
        };
      }

      // Route message to agent
      console.log(
        `Routing message from ${message.channelType}:${message.channelId} to agent ${agentId}`
      );

      const response = await agent.handleMessage(message);

      return response;
    } catch (error) {
      console.error('Error routing message:', error);
      return {
        text: 'An error occurred while processing your message. Please try again.',
      };
    }
  }

  /**
   * Find the matching agent for a message based on routing rules
   */
  private findMatchingAgent(message: Message): string | undefined {
    // Check routing rules in order (most specific first)
    for (const rule of this.routingRules) {
      // Match by channel type, channel ID, and user ID
      if (
        (!rule.channelType || rule.channelType === message.channelType) &&
        (!rule.channelId || rule.channelId === message.channelId) &&
        (!rule.userId || rule.userId === message.userId)
      ) {
        return rule.agentId;
      }
    }

    // Fall back to default agent
    return this.defaultAgentId;
  }

  /**
   * Get statistics about routing
   */
  getStats(): {
    agentCount: number;
    ruleCount: number;
    agents: string[];
  } {
    return {
      agentCount: this.agents.size,
      ruleCount: this.routingRules.length,
      agents: Array.from(this.agents.keys()),
    };
  }

  /**
   * Extract agent ID from message text (e.g., "@agent:abc123")
   */
  static extractAgentIdFromText(text: string): string | undefined {
    const match = text.match(/@agent:([a-zA-Z0-9_-]+)/);
    return match ? match[1] : undefined;
  }

  /**
   * Create a routing rule from a user-channel pair
   */
  static createUserChannelRule(
    channelType: ChannelType,
    channelId: string,
    userId: string,
    agentId: string
  ): RoutingRule {
    return {
      channelType,
      channelId,
      userId,
      agentId,
    };
  }

  /**
   * Create a routing rule for an entire channel
   */
  static createChannelRule(
    channelType: ChannelType,
    channelId: string,
    agentId: string
  ): RoutingRule {
    return {
      channelType,
      channelId,
      agentId,
    };
  }

  /**
   * Create a routing rule for all messages from a channel type
   */
  static createChannelTypeRule(channelType: ChannelType, agentId: string): RoutingRule {
    return {
      channelType,
      agentId,
    };
  }
}
