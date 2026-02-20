/**
 * Telegram Bot Integration
 * 
 * Implements Telegram bot using telegraf library.
 * Handles incoming messages and commands, routes to agent instances.
 * 
 * Requirements: 22.1
 */

import { Telegraf, Context } from 'telegraf';
import { Message as TelegramMessage } from 'telegraf/types';
import {
  ChannelBot,
  Message,
  MessageHandler,
  MessageResponse,
  TelegramSpecificData,
} from './types.js';

export class TelegramBot implements ChannelBot {
  private bot: Telegraf;
  private messageHandler: MessageHandler;
  private isRunning: boolean = false;

  constructor(token: string, messageHandler: MessageHandler) {
    this.bot = new Telegraf(token);
    this.messageHandler = messageHandler;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Handle text messages
    this.bot.on('text', async (ctx: Context) => {
      try {
        const telegramMsg = ctx.message as TelegramMessage.TextMessage;
        
        // Convert Telegram message to unified Message format
        const message: Message = {
          id: telegramMsg.message_id.toString(),
          channelType: 'telegram',
          channelId: ctx.chat!.id.toString(),
          userId: ctx.from!.id.toString(),
          username: ctx.from!.username,
          text: telegramMsg.text,
          timestamp: new Date(telegramMsg.date * 1000),
          metadata: {
            chatType: ctx.chat!.type,
            firstName: ctx.from!.first_name,
            lastName: ctx.from!.last_name,
          },
        };

        // Route to agent instance
        const response = await this.messageHandler(message);

        // Send response
        await this.sendMessage(ctx.chat!.id.toString(), response);
      } catch (error) {
        console.error('Error handling Telegram message:', error);
        await ctx.reply('Sorry, an error occurred while processing your message.');
      }
    });

    // Handle commands
    this.bot.command('start', async (ctx: Context) => {
      await ctx.reply(
        'Welcome to Ordo! I am an autonomous AI agent. Send me a message to interact.'
      );
    });

    this.bot.command('help', async (ctx: Context) => {
      await ctx.reply(
        'Available commands:\n' +
        '/start - Start the bot\n' +
        '/help - Show this help message\n' +
        '/status - Check agent status\n\n' +
        'Just send me any message to interact!'
      );
    });

    this.bot.command('status', async (ctx: Context) => {
      const message: Message = {
        id: Date.now().toString(),
        channelType: 'telegram',
        channelId: ctx.chat!.id.toString(),
        userId: ctx.from!.id.toString(),
        username: ctx.from!.username,
        text: '/status',
        timestamp: new Date(),
      };

      const response = await this.messageHandler(message);
      await this.sendMessage(ctx.chat!.id.toString(), response);
    });

    // Handle callback queries (inline keyboard buttons)
    this.bot.on('callback_query', async (ctx: Context) => {
      try {
        if ('data' in ctx.callbackQuery!) {
          const message: Message = {
            id: ctx.callbackQuery!.id,
            channelType: 'telegram',
            channelId: ctx.chat!.id.toString(),
            userId: ctx.from!.id.toString(),
            username: ctx.from!.username,
            text: ctx.callbackQuery!.data,
            timestamp: new Date(),
            metadata: {
              isCallback: true,
            },
          };

          const response = await this.messageHandler(message);
          await ctx.answerCbQuery();
          await this.sendMessage(ctx.chat!.id.toString(), response);
        }
      } catch (error) {
        console.error('Error handling callback query:', error);
        await ctx.answerCbQuery('Error processing your request');
      }
    });

    // Error handling
    this.bot.catch((err: any, ctx: Context) => {
      console.error('Telegram bot error:', err);
      ctx.reply('An unexpected error occurred. Please try again later.');
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Telegram bot is already running');
      return;
    }

    try {
      await this.bot.launch();
      this.isRunning = true;
      console.log('Telegram bot started successfully');

      // Enable graceful stop
      process.once('SIGINT', () => this.stop());
      process.once('SIGTERM', () => this.stop());
    } catch (error) {
      console.error('Failed to start Telegram bot:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.bot.stop();
      this.isRunning = false;
      console.log('Telegram bot stopped successfully');
    } catch (error) {
      console.error('Error stopping Telegram bot:', error);
      throw error;
    }
  }

  async sendMessage(channelId: string, response: MessageResponse): Promise<void> {
    try {
      const telegramData = response.channelSpecificData as TelegramSpecificData | undefined;

      const options: any = {};

      if (telegramData?.parseMode) {
        options.parse_mode = telegramData.parseMode;
      }

      if (telegramData?.inlineKeyboard) {
        options.reply_markup = {
          inline_keyboard: telegramData.inlineKeyboard,
        };
      }

      await this.bot.telegram.sendMessage(channelId, response.text, options);
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      throw error;
    }
  }
}
