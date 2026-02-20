/**
 * Channel-Specific Features Examples
 * 
 * This file demonstrates how to use channel-specific features
 * in your message handlers for Telegram, Discord, and Slack.
 * 
 * Requirements: 22.6
 */

import {
  MessageResponse,
  Message,
} from './types.js';
import {
  // Telegram
  createTelegramMessageWithKeyboard,
  createTelegramInlineButtons,
  // Discord
  createDiscordMessageWithEmbed,
  createDiscordMessageWithEmbeds,
  DiscordColors,
  // Slack
  createSlackMessageWithBlocks,
  createSlackHeader,
  createSlackSection,
  createSlackSectionWithFields,
  createSlackDivider,
  createSlackActions,
  createSlackContext,
  // Unified
  createAgentStatusMessage,
} from './channel-features.js';

/**
 * Example 1: Simple Yes/No Confirmation
 * 
 * Shows how to create a simple confirmation message with buttons
 * for each channel type.
 */
export function createConfirmationMessage(
  question: string,
  channelType: 'telegram' | 'discord' | 'slack'
): MessageResponse {
  switch (channelType) {
    case 'telegram':
      return createTelegramMessageWithKeyboard(
        question,
        [
          [
            { text: '✅ Yes', callbackData: 'confirm_yes' },
            { text: '❌ No', callbackData: 'confirm_no' },
          ],
        ],
        'Markdown'
      );

    case 'discord':
      return createDiscordMessageWithEmbed(question, {
        title: '⚠️ Confirmation Required',
        description: question,
        color: DiscordColors.YELLOW,
        fields: [
          { name: 'Options', value: 'React with ✅ for Yes or ❌ for No' },
        ],
      });

    case 'slack':
      return createSlackMessageWithBlocks(question, [
        createSlackHeader('⚠️ Confirmation Required'),
        createSlackSection(question),
        createSlackDivider(),
        createSlackActions([
          { text: '✅ Yes', value: 'confirm_yes', style: 'primary' },
          { text: '❌ No', value: 'confirm_no', style: 'danger' },
        ]),
      ]);

    default:
      return { text: question };
  }
}

/**
 * Example 2: Agent Menu
 * 
 * Shows how to create a menu with multiple options for agent actions.
 */
export function createAgentMenu(
  channelType: 'telegram' | 'discord' | 'slack'
): MessageResponse {
  switch (channelType) {
    case 'telegram':
      return createTelegramMessageWithKeyboard(
        '*Agent Menu*\n\nChoose an action:',
        [
          [
            { text: '📊 Status', callbackData: 'menu_status' },
            { text: '💰 Balance', callbackData: 'menu_balance' },
          ],
          [
            { text: '🔄 Replicate', callbackData: 'menu_replicate' },
            { text: '🧬 Evolution', callbackData: 'menu_evolution' },
          ],
          [
            { text: '⚙️ Settings', callbackData: 'menu_settings' },
            { text: '❓ Help', callbackData: 'menu_help' },
          ],
        ],
        'Markdown'
      );

    case 'discord':
      return createDiscordMessageWithEmbed('', {
        title: '🤖 Agent Menu',
        description: 'Choose an action from the options below:',
        color: DiscordColors.BLURPLE,
        fields: [
          { name: '📊 Status', value: 'View agent status', inline: true },
          { name: '💰 Balance', value: 'Check balance', inline: true },
          { name: '🔄 Replicate', value: 'Create offspring', inline: true },
          { name: '🧬 Evolution', value: 'View evolution', inline: true },
          { name: '⚙️ Settings', value: 'Configure agent', inline: true },
          { name: '❓ Help', value: 'Get help', inline: true },
        ],
      });

    case 'slack':
      return createSlackMessageWithBlocks('Agent Menu', [
        createSlackHeader('🤖 Agent Menu'),
        createSlackSection('Choose an action:'),
        createSlackDivider(),
        createSlackActions([
          { text: '📊 Status', value: 'menu_status' },
          { text: '💰 Balance', value: 'menu_balance' },
          { text: '🔄 Replicate', value: 'menu_replicate' },
        ]),
        createSlackActions([
          { text: '🧬 Evolution', value: 'menu_evolution' },
          { text: '⚙️ Settings', value: 'menu_settings' },
          { text: '❓ Help', value: 'menu_help' },
        ]),
      ]);

    default:
      return { text: 'Agent Menu' };
  }
}

/**
 * Example 3: Rich Status Report
 * 
 * Shows how to create a detailed status report with multiple sections.
 */
export function createStatusReport(
  agentData: {
    name: string;
    balance: number;
    age: number;
    generation: number;
    status: string;
    fitness: number;
    offspring: number;
    earnings: number;
    costs: number;
  },
  channelType: 'telegram' | 'discord' | 'slack'
): MessageResponse {
  switch (channelType) {
    case 'telegram':
      return createTelegramMessageWithKeyboard(
        `*📊 Agent Status Report*\n\n` +
          `*Name:* ${agentData.name}\n` +
          `*Balance:* ${agentData.balance.toFixed(4)} SOL\n` +
          `*Age:* ${agentData.age} days\n` +
          `*Generation:* ${agentData.generation}\n` +
          `*Status:* ${agentData.status}\n` +
          `*Fitness:* ${agentData.fitness.toFixed(2)}\n` +
          `*Offspring:* ${agentData.offspring}\n\n` +
          `*Economics:*\n` +
          `• Earnings: ${agentData.earnings.toFixed(4)} SOL\n` +
          `• Costs: ${agentData.costs.toFixed(4)} SOL\n` +
          `• Net: ${(agentData.earnings - agentData.costs).toFixed(4)} SOL`,
        [
          [
            { text: '🔄 Refresh', callbackData: 'refresh_status' },
            { text: '📈 Details', callbackData: 'show_details' },
          ],
          [{ text: '🏠 Menu', callbackData: 'back_to_menu' }],
        ],
        'Markdown'
      );

    case 'discord':
      return createDiscordMessageWithEmbeds('', [
        {
          title: '📊 Agent Status Report',
          description: `Detailed information for **${agentData.name}**`,
          color:
            agentData.status === 'alive'
              ? DiscordColors.GREEN
              : DiscordColors.RED,
          fields: [
            { name: '💰 Balance', value: `${agentData.balance.toFixed(4)} SOL`, inline: true },
            { name: '📅 Age', value: `${agentData.age} days`, inline: true },
            { name: '🧬 Generation', value: `${agentData.generation}`, inline: true },
            { name: '📊 Status', value: agentData.status, inline: true },
            { name: '🎯 Fitness', value: `${agentData.fitness.toFixed(2)}`, inline: true },
            { name: '👶 Offspring', value: `${agentData.offspring}`, inline: true },
          ],
        },
        {
          title: '💼 Economics',
          color: DiscordColors.GOLD,
          fields: [
            { name: '📈 Earnings', value: `${agentData.earnings.toFixed(4)} SOL`, inline: true },
            { name: '📉 Costs', value: `${agentData.costs.toFixed(4)} SOL`, inline: true },
            {
              name: '💵 Net',
              value: `${(agentData.earnings - agentData.costs).toFixed(4)} SOL`,
              inline: true,
            },
          ],
        },
      ]);

    case 'slack':
      return createSlackMessageWithBlocks('Agent Status Report', [
        createSlackHeader('📊 Agent Status Report'),
        createSlackSection(`Detailed information for *${agentData.name}*`),
        createSlackDivider(),
        createSlackSectionWithFields([
          { text: `*💰 Balance:*\n${agentData.balance.toFixed(4)} SOL` },
          { text: `*📅 Age:*\n${agentData.age} days` },
          { text: `*🧬 Generation:*\n${agentData.generation}` },
          { text: `*📊 Status:*\n${agentData.status}` },
          { text: `*🎯 Fitness:*\n${agentData.fitness.toFixed(2)}` },
          { text: `*👶 Offspring:*\n${agentData.offspring}` },
        ]),
        createSlackDivider(),
        createSlackSection('*💼 Economics*'),
        createSlackSectionWithFields([
          { text: `*📈 Earnings:*\n${agentData.earnings.toFixed(4)} SOL` },
          { text: `*📉 Costs:*\n${agentData.costs.toFixed(4)} SOL` },
          {
            text: `*💵 Net:*\n${(agentData.earnings - agentData.costs).toFixed(4)} SOL`,
          },
        ]),
        createSlackDivider(),
        createSlackActions([
          { text: '🔄 Refresh', value: 'refresh_status', style: 'primary' },
          { text: '📈 Details', value: 'show_details' },
          { text: '🏠 Menu', value: 'back_to_menu' },
        ]),
        createSlackContext([`Last updated: ${new Date().toLocaleString()}`]),
      ]);

    default:
      return { text: 'Agent Status Report' };
  }
}

/**
 * Example 4: Error Message
 * 
 * Shows how to create error messages with appropriate styling.
 */
export function createErrorMessage(
  error: string,
  details: string,
  channelType: 'telegram' | 'discord' | 'slack'
): MessageResponse {
  switch (channelType) {
    case 'telegram':
      return createTelegramMessageWithKeyboard(
        `❌ *Error*\n\n${error}\n\n_${details}_`,
        [[{ text: '🔄 Retry', callbackData: 'retry' }]],
        'Markdown'
      );

    case 'discord':
      return createDiscordMessageWithEmbed('', {
        title: '❌ Error',
        description: error,
        color: DiscordColors.RED,
        fields: [{ name: 'Details', value: details }],
      });

    case 'slack':
      return createSlackMessageWithBlocks('Error', [
        createSlackHeader('❌ Error'),
        createSlackSection(`*${error}*`),
        createSlackSection(`_${details}_`),
        createSlackDivider(),
        createSlackActions([{ text: '🔄 Retry', value: 'retry', style: 'primary' }]),
      ]);

    default:
      return { text: `Error: ${error}` };
  }
}

/**
 * Example 5: Success Message
 * 
 * Shows how to create success messages with appropriate styling.
 */
export function createSuccessMessage(
  message: string,
  details: string,
  channelType: 'telegram' | 'discord' | 'slack'
): MessageResponse {
  switch (channelType) {
    case 'telegram':
      return createTelegramMessageWithKeyboard(
        `✅ *Success*\n\n${message}\n\n_${details}_`,
        [[{ text: '🏠 Menu', callbackData: 'back_to_menu' }]],
        'Markdown'
      );

    case 'discord':
      return createDiscordMessageWithEmbed('', {
        title: '✅ Success',
        description: message,
        color: DiscordColors.GREEN,
        fields: [{ name: 'Details', value: details }],
      });

    case 'slack':
      return createSlackMessageWithBlocks('Success', [
        createSlackHeader('✅ Success'),
        createSlackSection(`*${message}*`),
        createSlackSection(`_${details}_`),
        createSlackDivider(),
        createSlackActions([{ text: '🏠 Menu', value: 'back_to_menu' }]),
      ]);

    default:
      return { text: `Success: ${message}` };
  }
}

/**
 * Example Message Handler
 * 
 * Shows how to use channel-specific features in a message handler.
 */
export async function exampleMessageHandler(message: Message): Promise<MessageResponse> {
  const text = message.text.toLowerCase();

  // Handle different commands
  if (text === '/status' || text === '!status' || text === 'status') {
    // Use the unified helper that works for all channels
    return createAgentStatusMessage(
      {
        name: 'ExampleAgent',
        balance: 5.2,
        age: 45,
        generation: 3,
        status: 'alive',
      },
      message.channelType
    );
  }

  if (text === '/menu' || text === '!menu' || text === 'menu') {
    return createAgentMenu(message.channelType);
  }

  if (text.startsWith('/confirm') || text.startsWith('!confirm')) {
    return createConfirmationMessage(
      'Are you sure you want to proceed?',
      message.channelType
    );
  }

  // Default response
  return {
    text: 'Hello! I am an Ordo agent. Type /menu to see available commands.',
  };
}
