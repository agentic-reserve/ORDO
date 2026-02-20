/**
 * Slack Bot Integration
 * 
 * Implements Slack bot using @slack/bolt library.
 * Handles incoming messages and commands, routes to agent instances.
 * 
 * Requirements: 22.3
 */

import { App, LogLevel } from '@slack/bolt';
import {
  ChannelBot,
  Message,
  MessageHandler,
  MessageResponse,
  SlackSpecificData,
} from './types.js';

export class SlackBot implements ChannelBot {
  private app: App;
  private messageHandler: MessageHandler;
  private isRunning: boolean = false;

  constructor(token: string, signingSecret: string, messageHandler: MessageHandler) {
    this.messageHandler = messageHandler;
    
    // Initialize Slack app
    this.app = new App({
      token,
      signingSecret,
      logLevel: LogLevel.INFO,
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle app mentions (@bot)
    this.app.event('app_mention', async ({ event, say }) => {
      try {
        // Remove bot mention from text
        const text = event.text.replace(/<@[A-Z0-9]+>/g, '').trim();

        const message: Message = {
          id: event.ts,
          channelType: 'slack',
          channelId: event.channel,
          userId: event.user,
          text,
          timestamp: new Date(parseFloat(event.ts) * 1000),
          metadata: {
            team: event.team,
            threadTs: event.thread_ts,
          },
        };

        const response = await this.messageHandler(message);
        await this.sendMessage(event.channel, response);
      } catch (error) {
        console.error('Error handling Slack app mention:', error);
        await say('Sorry, an error occurred while processing your message.');
      }
    });

    // Handle direct messages
    this.app.message(async ({ message, say }) => {
      try {
        // Ignore bot messages
        if ('bot_id' in message) {
          return;
        }

        // Only handle text messages
        if (message.type !== 'message' || !('text' in message)) {
          return;
        }

        const msg: Message = {
          id: message.ts,
          channelType: 'slack',
          channelId: message.channel,
          userId: message.user!,
          text: message.text,
          timestamp: new Date(parseFloat(message.ts) * 1000),
          metadata: {
            team: 'team' in message ? message.team : undefined,
            threadTs: 'thread_ts' in message ? message.thread_ts : undefined,
          },
        };

        const response = await this.messageHandler(msg);
        await this.sendMessage(message.channel, response);
      } catch (error) {
        console.error('Error handling Slack message:', error);
        await say('Sorry, an error occurred while processing your message.');
      }
    });

    // Handle slash commands
    this.app.command('/ordo-help', async ({ command, ack, respond }) => {
      await ack();

      await respond({
        text: 'Ordo Bot Help',
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: 'Ordo Bot Help',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Available commands:*\n' +
                '• `/ordo-help` - Show this help message\n' +
                '• `/ordo-status` - Check agent status\n' +
                '• Mention @ordo or send a DM to interact',
            },
          },
        ],
      });
    });

    this.app.command('/ordo-status', async ({ command, ack, respond }) => {
      await ack();

      const message: Message = {
        id: Date.now().toString(),
        channelType: 'slack',
        channelId: command.channel_id,
        userId: command.user_id,
        text: '/ordo-status',
        timestamp: new Date(),
      };

      const response = await this.messageHandler(message);
      await respond({
        text: response.text,
        blocks: (response.channelSpecificData as SlackSpecificData)?.blocks,
      });
    });

    // Handle interactive components (buttons, select menus, etc.)
    this.app.action(/.*/, async ({ action, ack, respond }) => {
      await ack();

      try {
        const message: Message = {
          id: Date.now().toString(),
          channelType: 'slack',
          channelId: 'channel' in action ? (action as any).channel?.id : '',
          userId: 'user' in action ? (action as any).user?.id : '',
          text: 'action_id' in action ? action.action_id : '',
          timestamp: new Date(),
          metadata: {
            isAction: true,
            actionType: action.type,
          },
        };

        const response = await this.messageHandler(message);
        await respond({
          text: response.text,
          blocks: (response.channelSpecificData as SlackSpecificData)?.blocks,
        });
      } catch (error) {
        console.error('Error handling Slack action:', error);
        await respond('Error processing your request');
      }
    });

    // Error handling
    this.app.error(async (error) => {
      console.error('Slack app error:', error);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Slack bot is already running');
      return;
    }

    try {
      await this.app.start(process.env.SLACK_PORT ? parseInt(process.env.SLACK_PORT) : 3000);
      this.isRunning = true;
      console.log('Slack bot started successfully');
    } catch (error) {
      console.error('Failed to start Slack bot:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.app.stop();
      this.isRunning = false;
      console.log('Slack bot stopped successfully');
    } catch (error) {
      console.error('Error stopping Slack bot:', error);
      throw error;
    }
  }

  async sendMessage(channelId: string, response: MessageResponse): Promise<void> {
    try {
      const slackData = response.channelSpecificData as SlackSpecificData | undefined;

      const messageOptions: any = {
        channel: channelId,
        text: response.text,
      };

      // Add blocks if provided
      if (slackData?.blocks) {
        messageOptions.blocks = slackData.blocks;
      }

      await this.app.client.chat.postMessage(messageOptions);
    } catch (error) {
      console.error('Error sending Slack message:', error);
      throw error;
    }
  }
}
