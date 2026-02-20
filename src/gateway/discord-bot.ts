/**
 * Discord Bot Integration
 * 
 * Implements Discord bot using discord.js library.
 * Handles incoming messages and commands, routes to agent instances.
 * 
 * Requirements: 22.2
 */

import { Client, GatewayIntentBits, Message as DiscordMessage, EmbedBuilder } from 'discord.js';
import {
  ChannelBot,
  Message,
  MessageHandler,
  MessageResponse,
  DiscordSpecificData,
} from './types.js';

export class DiscordBot implements ChannelBot {
  private client: Client;
  private messageHandler: MessageHandler;
  private isRunning: boolean = false;
  private token: string;

  constructor(token: string, messageHandler: MessageHandler) {
    this.token = token;
    this.messageHandler = messageHandler;
    
    // Initialize Discord client with required intents
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
    });

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // Ready event
    this.client.once('ready', () => {
      console.log(`Discord bot logged in as ${this.client.user?.tag}`);
    });

    // Message handler
    this.client.on('messageCreate', async (discordMsg: DiscordMessage) => {
      try {
        // Ignore messages from bots
        if (discordMsg.author.bot) {
          return;
        }

        // Handle commands
        if (discordMsg.content.startsWith('!')) {
          await this.handleCommand(discordMsg);
          return;
        }

        // Convert Discord message to unified Message format
        const message: Message = {
          id: discordMsg.id,
          channelType: 'discord',
          channelId: discordMsg.channelId,
          userId: discordMsg.author.id,
          username: discordMsg.author.username,
          text: discordMsg.content,
          timestamp: discordMsg.createdAt,
          metadata: {
            guildId: discordMsg.guildId,
            guildName: discordMsg.guild?.name,
            channelName: discordMsg.channel.isDMBased() ? 'DM' : 'name' in discordMsg.channel ? discordMsg.channel.name : undefined,
            discriminator: discordMsg.author.discriminator,
            avatarUrl: discordMsg.author.displayAvatarURL(),
          },
        };

        // Route to agent instance
        const response = await this.messageHandler(message);

        // Send response
        await this.sendMessage(discordMsg.channelId, response);
      } catch (error) {
        console.error('Error handling Discord message:', error);
        await discordMsg.reply('Sorry, an error occurred while processing your message.');
      }
    });

    // Error handling
    this.client.on('error', (error) => {
      console.error('Discord client error:', error);
    });
  }

  private async handleCommand(discordMsg: DiscordMessage): Promise<void> {
    const command = discordMsg.content.toLowerCase();

    if (command === '!start' || command === '!hello') {
      await discordMsg.reply(
        'Welcome to Ordo! I am an autonomous AI agent. Send me a message to interact.'
      );
    } else if (command === '!help') {
      const embed = new EmbedBuilder()
        .setColor(0x0099ff)
        .setTitle('Ordo Bot Help')
        .setDescription('Available commands:')
        .addFields(
          { name: '!start / !hello', value: 'Start the bot', inline: false },
          { name: '!help', value: 'Show this help message', inline: false },
          { name: '!status', value: 'Check agent status', inline: false }
        )
        .setFooter({ text: 'Just send me any message to interact!' });

      await discordMsg.reply({ embeds: [embed] });
    } else if (command === '!status') {
      const message: Message = {
        id: discordMsg.id,
        channelType: 'discord',
        channelId: discordMsg.channelId,
        userId: discordMsg.author.id,
        username: discordMsg.author.username,
        text: '!status',
        timestamp: discordMsg.createdAt,
      };

      const response = await this.messageHandler(message);
      await this.sendMessage(discordMsg.channelId, response);
    } else {
      await discordMsg.reply('Unknown command. Type !help for available commands.');
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Discord bot is already running');
      return;
    }

    try {
      await this.client.login(this.token);
      this.isRunning = true;
      console.log('Discord bot started successfully');
    } catch (error) {
      console.error('Failed to start Discord bot:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.client.destroy();
      this.isRunning = false;
      console.log('Discord bot stopped successfully');
    } catch (error) {
      console.error('Error stopping Discord bot:', error);
      throw error;
    }
  }

  async sendMessage(channelId: string, response: MessageResponse): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      
      if (!channel || !channel.isTextBased()) {
        throw new Error('Invalid channel or channel is not text-based');
      }

      const discordData = response.channelSpecificData as DiscordSpecificData | undefined;

      // Build message options
      const messageOptions: any = {
        content: response.text,
      };

      // Add embeds if provided
      if (discordData?.embeds && discordData.embeds.length > 0) {
        messageOptions.embeds = discordData.embeds.map((embedData) => {
          const embed = new EmbedBuilder();
          
          if (embedData.title) embed.setTitle(embedData.title);
          if (embedData.description) embed.setDescription(embedData.description);
          if (embedData.color) embed.setColor(embedData.color);
          if (embedData.fields) {
            embedData.fields.forEach((field) => {
              embed.addFields({
                name: field.name,
                value: field.value,
                inline: field.inline ?? false,
              });
            });
          }

          return embed;
        });
      }

      await channel.send(messageOptions);
    } catch (error) {
      console.error('Error sending Discord message:', error);
      throw error;
    }
  }
}
