/**
 * Integration Example
 * 
 * This file demonstrates how channel-specific features integrate
 * with the existing bot implementations.
 * 
 * Requirements: 22.6
 */

import { Message, MessageResponse, MessageHandler } from './types.js';
import {
  createTelegramMessageWithKeyboard,
  createDiscordMessageWithEmbed,
  createSlackMessageWithBlocks,
  createSlackHeader,
  createSlackSection,
  createSlackDivider,
  createSlackActions,
  DiscordColors,
} from './channel-features.js';

/**
 * Example message handler that uses channel-specific features
 * 
 * This handler demonstrates how to create rich interactive messages
 * for each channel type while maintaining a unified interface.
 */
export const exampleHandler: MessageHandler = async (
  message: Message
): Promise<MessageResponse> => {
  const command = message.text.toLowerCase().trim();

  // Handle status command
  if (command === '/status' || command === '!status' || command === 'status') {
    return handleStatusCommand(message);
  }

  // Handle help command
  if (command === '/help' || command === '!help' || command === 'help') {
    return handleHelpCommand(message);
  }

  // Default response
  return {
    text: 'Hello! Type /help to see available commands.',
  };
};

/**
 * Handle status command with channel-specific formatting
 */
function handleStatusCommand(message: Message): MessageResponse {
  // Simulate fetching agent data
  const agentData = {
    name: 'Agent-' + message.userId.slice(0, 8),
    balance: 5.234,
    age: 45,
    status: 'alive',
  };

  switch (message.channelType) {
    case 'telegram':
      return createTelegramMessageWithKeyboard(
        `*📊 Agent Status*\n\n` +
          `Name: ${agentData.name}\n` +
          `Balance: ${agentData.balance} SOL\n` +
          `Age: ${agentData.age} days\n` +
          `Status: ${agentData.status}`,
        [
          [
            { text: '🔄 Refresh', callbackData: 'refresh_status' },
            { text: '📈 Details', callbackData: 'show_details' },
          ],
          [{ text: '🏠 Menu', callbackData: 'show_menu' }],
        ],
        'Markdown'
      );

    case 'discord':
      return createDiscordMessageWithEmbed('', {
        title: '📊 Agent Status',
        description: `Status for **${agentData.name}**`,
        color: DiscordColors.GREEN,
        fields: [
          { name: '💰 Balance', value: `${agentData.balance} SOL`, inline: true },
          { name: '📅 Age', value: `${agentData.age} days`, inline: true },
          { name: '📊 Status', value: agentData.status, inline: true },
        ],
      });

    case 'slack':
      return createSlackMessageWithBlocks('Agent Status', [
        createSlackHeader('📊 Agent Status'),
        createSlackSection(`Status for *${agentData.name}*`),
        createSlackDivider(),
        createSlackSection(
          `*💰 Balance:* ${agentData.balance} SOL\n` +
            `*📅 Age:* ${agentData.age} days\n` +
            `*📊 Status:* ${agentData.status}`
        ),
        createSlackDivider(),
        createSlackActions([
          { text: '🔄 Refresh', value: 'refresh_status', style: 'primary' },
          { text: '📈 Details', value: 'show_details' },
          { text: '🏠 Menu', value: 'show_menu' },
        ]),
      ]);

    default:
      return {
        text: `Agent Status\nName: ${agentData.name}\nBalance: ${agentData.balance} SOL\nAge: ${agentData.age} days\nStatus: ${agentData.status}`,
      };
  }
}

/**
 * Handle help command with channel-specific formatting
 */
function handleHelpCommand(message: Message): MessageResponse {
  const commands = [
    { command: '/status', description: 'View agent status' },
    { command: '/help', description: 'Show this help message' },
    { command: '/menu', description: 'Show main menu' },
  ];

  switch (message.channelType) {
    case 'telegram':
      return createTelegramMessageWithKeyboard(
        `*📚 Help*\n\n` +
          `Available commands:\n` +
          commands.map((c) => `${c.command} - ${c.description}`).join('\n'),
        [[{ text: '🏠 Menu', callbackData: 'show_menu' }]],
        'Markdown'
      );

    case 'discord':
      return createDiscordMessageWithEmbed('', {
        title: '📚 Help',
        description: 'Available commands:',
        color: DiscordColors.BLUE,
        fields: commands.map((c) => ({
          name: c.command,
          value: c.description,
          inline: false,
        })),
      });

    case 'slack':
      return createSlackMessageWithBlocks('Help', [
        createSlackHeader('📚 Help'),
        createSlackSection('Available commands:'),
        createSlackDivider(),
        ...commands.map((c) =>
          createSlackSection(`*${c.command}*\n${c.description}`)
        ),
        createSlackDivider(),
        createSlackActions([{ text: '🏠 Menu', value: 'show_menu' }]),
      ]);

    default:
      return {
        text:
          'Help\n\n' +
          commands.map((c) => `${c.command} - ${c.description}`).join('\n'),
      };
  }
}

/**
 * Example: Using the handler with bots
 * 
 * The bots automatically extract and handle channel-specific data:
 * 
 * ```typescript
 * // In telegram-bot.ts
 * const response = await messageHandler(message);
 * await this.sendMessage(channelId, response);
 * // sendMessage extracts response.channelSpecificData and formats for Telegram
 * 
 * // In discord-bot.ts
 * const response = await messageHandler(message);
 * await this.sendMessage(channelId, response);
 * // sendMessage extracts response.channelSpecificData and formats for Discord
 * 
 * // In slack-bot.ts
 * const response = await messageHandler(message);
 * await this.sendMessage(channelId, response);
 * // sendMessage extracts response.channelSpecificData and formats for Slack
 * ```
 * 
 * The beauty of this design is that:
 * 1. Message handlers return a unified MessageResponse
 * 2. Channel-specific data is optional and type-safe
 * 3. Each bot knows how to extract and format its own data
 * 4. The same handler works across all channels
 */
