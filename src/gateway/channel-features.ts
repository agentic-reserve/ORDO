/**
 * Channel-Specific Features
 * 
 * Helper functions and utilities for creating channel-specific features:
 * - Telegram inline keyboards
 * - Discord embeds
 * - Slack blocks
 * 
 * Requirements: 22.6
 */

import {
  TelegramSpecificData,
  DiscordSpecificData,
  SlackSpecificData,
  MessageResponse,
} from './types.js';

/**
 * Telegram Inline Keyboard Helpers
 */

export interface TelegramButton {
  text: string;
  callbackData: string;
}

/**
 * Create a Telegram inline keyboard with buttons arranged in rows
 * 
 * @param rows - Array of button rows, each row is an array of buttons
 * @returns TelegramSpecificData with inline keyboard
 * 
 * @example
 * const keyboard = createTelegramKeyboard([
 *   [{ text: 'Option 1', callbackData: 'opt1' }, { text: 'Option 2', callbackData: 'opt2' }],
 *   [{ text: 'Cancel', callbackData: 'cancel' }]
 * ]);
 */
export function createTelegramKeyboard(
  rows: TelegramButton[][]
): TelegramSpecificData {
  return {
    inlineKeyboard: rows.map((row) =>
      row.map((button) => ({
        text: button.text,
        callback_data: button.callbackData,
      }))
    ),
  };
}

/**
 * Create a simple Telegram inline keyboard with buttons in a single row
 * 
 * @param buttons - Array of buttons
 * @returns TelegramSpecificData with inline keyboard
 * 
 * @example
 * const keyboard = createTelegramInlineButtons([
 *   { text: 'Yes', callbackData: 'yes' },
 *   { text: 'No', callbackData: 'no' }
 * ]);
 */
export function createTelegramInlineButtons(
  buttons: TelegramButton[]
): TelegramSpecificData {
  return createTelegramKeyboard([buttons]);
}

/**
 * Create a Telegram message response with inline keyboard
 * 
 * @param text - Message text
 * @param buttons - Array of button rows
 * @param parseMode - Optional parse mode (Markdown or HTML)
 * @returns MessageResponse with Telegram-specific data
 * 
 * @example
 * const response = createTelegramMessageWithKeyboard(
 *   'Choose an option:',
 *   [[{ text: 'Option 1', callbackData: 'opt1' }]],
 *   'Markdown'
 * );
 */
export function createTelegramMessageWithKeyboard(
  text: string,
  buttons: TelegramButton[][],
  parseMode?: 'Markdown' | 'HTML'
): MessageResponse {
  return {
    text,
    channelSpecificData: {
      inlineKeyboard: buttons.map((row) =>
        row.map((button) => ({
          text: button.text,
          callback_data: button.callbackData,
        }))
      ),
      parseMode,
    },
  };
}

/**
 * Discord Embed Helpers
 */

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
}

/**
 * Create a Discord embed
 * 
 * @param options - Embed options
 * @returns DiscordSpecificData with embed
 * 
 * @example
 * const embed = createDiscordEmbed({
 *   title: 'Agent Status',
 *   description: 'Current agent information',
 *   color: 0x00ff00,
 *   fields: [
 *     { name: 'Balance', value: '5.2 SOL', inline: true },
 *     { name: 'Age', value: '45 days', inline: true }
 *   ]
 * });
 */
export function createDiscordEmbed(options: DiscordEmbed): DiscordSpecificData {
  return {
    embeds: [options],
  };
}

/**
 * Create multiple Discord embeds
 * 
 * @param embeds - Array of embed options
 * @returns DiscordSpecificData with multiple embeds
 * 
 * @example
 * const embeds = createDiscordEmbeds([
 *   { title: 'Embed 1', description: 'First embed' },
 *   { title: 'Embed 2', description: 'Second embed' }
 * ]);
 */
export function createDiscordEmbeds(embeds: DiscordEmbed[]): DiscordSpecificData {
  return {
    embeds,
  };
}

/**
 * Create a Discord message response with embed
 * 
 * @param text - Message text
 * @param embed - Embed options
 * @returns MessageResponse with Discord-specific data
 * 
 * @example
 * const response = createDiscordMessageWithEmbed(
 *   'Here is your status:',
 *   {
 *     title: 'Agent Status',
 *     color: 0x00ff00,
 *     fields: [{ name: 'Balance', value: '5.2 SOL' }]
 *   }
 * );
 */
export function createDiscordMessageWithEmbed(
  text: string,
  embed: DiscordEmbed
): MessageResponse {
  return {
    text,
    channelSpecificData: createDiscordEmbed(embed),
  };
}

/**
 * Create a Discord message response with multiple embeds
 * 
 * @param text - Message text
 * @param embeds - Array of embed options
 * @returns MessageResponse with Discord-specific data
 */
export function createDiscordMessageWithEmbeds(
  text: string,
  embeds: DiscordEmbed[]
): MessageResponse {
  return {
    text,
    channelSpecificData: createDiscordEmbeds(embeds),
  };
}

/**
 * Common Discord colors
 */
export const DiscordColors = {
  DEFAULT: 0x000000,
  WHITE: 0xffffff,
  AQUA: 0x1abc9c,
  GREEN: 0x57f287,
  BLUE: 0x3498db,
  YELLOW: 0xfee75c,
  PURPLE: 0x9b59b6,
  LUMINOUS_VIVID_PINK: 0xe91e63,
  FUCHSIA: 0xeb459e,
  GOLD: 0xf1c40f,
  ORANGE: 0xe67e22,
  RED: 0xed4245,
  GREY: 0x95a5a6,
  NAVY: 0x34495e,
  DARK_AQUA: 0x11806a,
  DARK_GREEN: 0x1f8b4c,
  DARK_BLUE: 0x206694,
  DARK_PURPLE: 0x71368a,
  DARK_VIVID_PINK: 0xad1457,
  DARK_GOLD: 0xc27c0e,
  DARK_ORANGE: 0xa84300,
  DARK_RED: 0x992d22,
  DARK_GREY: 0x979c9f,
  DARKER_GREY: 0x7f8c8d,
  LIGHT_GREY: 0xbcc0c0,
  DARK_NAVY: 0x2c3e50,
  BLURPLE: 0x5865f2,
  GREYPLE: 0x99aab5,
  DARK_BUT_NOT_BLACK: 0x2c2f33,
  NOT_QUITE_BLACK: 0x23272a,
};

/**
 * Slack Block Helpers
 */

export interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: any[];
  fields?: any[];
  accessory?: any;
}

/**
 * Create a Slack header block
 * 
 * @param text - Header text
 * @returns Slack block
 * 
 * @example
 * const header = createSlackHeader('Agent Status');
 */
export function createSlackHeader(text: string): SlackBlock {
  return {
    type: 'header',
    text: {
      type: 'plain_text',
      text,
    },
  };
}

/**
 * Create a Slack section block with text
 * 
 * @param text - Section text
 * @param markdown - Whether to use markdown formatting (default: true)
 * @returns Slack block
 * 
 * @example
 * const section = createSlackSection('This is a *bold* text', true);
 */
export function createSlackSection(text: string, markdown: boolean = true): SlackBlock {
  return {
    type: 'section',
    text: {
      type: markdown ? 'mrkdwn' : 'plain_text',
      text,
    },
  };
}

/**
 * Create a Slack section block with fields
 * 
 * @param fields - Array of field objects with text
 * @param markdown - Whether to use markdown formatting (default: true)
 * @returns Slack block
 * 
 * @example
 * const section = createSlackSectionWithFields([
 *   { text: '*Balance:*\n5.2 SOL' },
 *   { text: '*Age:*\n45 days' }
 * ]);
 */
export function createSlackSectionWithFields(
  fields: Array<{ text: string }>,
  markdown: boolean = true
): SlackBlock {
  return {
    type: 'section',
    fields: fields.map((field) => ({
      type: markdown ? 'mrkdwn' : 'plain_text',
      text: field.text,
    })),
  };
}

/**
 * Create a Slack divider block
 * 
 * @returns Slack block
 * 
 * @example
 * const divider = createSlackDivider();
 */
export function createSlackDivider(): SlackBlock {
  return {
    type: 'divider',
  };
}

/**
 * Create a Slack actions block with buttons
 * 
 * @param buttons - Array of button objects
 * @returns Slack block
 * 
 * @example
 * const actions = createSlackActions([
 *   { text: 'Approve', value: 'approve', style: 'primary' },
 *   { text: 'Reject', value: 'reject', style: 'danger' }
 * ]);
 */
export function createSlackActions(
  buttons: Array<{
    text: string;
    value: string;
    style?: 'primary' | 'danger';
    actionId?: string;
  }>
): SlackBlock {
  return {
    type: 'actions',
    elements: buttons.map((button) => ({
      type: 'button',
      text: {
        type: 'plain_text',
        text: button.text,
      },
      value: button.value,
      action_id: button.actionId || button.value,
      style: button.style,
    })),
  };
}

/**
 * Create a Slack context block
 * 
 * @param elements - Array of text elements
 * @returns Slack block
 * 
 * @example
 * const context = createSlackContext(['Last updated: 2 minutes ago']);
 */
export function createSlackContext(elements: string[]): SlackBlock {
  return {
    type: 'context',
    elements: elements.map((text) => ({
      type: 'mrkdwn',
      text,
    })),
  };
}

/**
 * Create Slack blocks
 * 
 * @param blocks - Array of Slack blocks
 * @returns SlackSpecificData with blocks
 * 
 * @example
 * const slackData = createSlackBlocks([
 *   createSlackHeader('Agent Status'),
 *   createSlackSection('Current agent information'),
 *   createSlackDivider(),
 *   createSlackSectionWithFields([
 *     { text: '*Balance:*\n5.2 SOL' },
 *     { text: '*Age:*\n45 days' }
 *   ])
 * ]);
 */
export function createSlackBlocks(blocks: SlackBlock[]): SlackSpecificData {
  return {
    blocks,
  };
}

/**
 * Create a Slack message response with blocks
 * 
 * @param text - Fallback text (shown in notifications)
 * @param blocks - Array of Slack blocks
 * @returns MessageResponse with Slack-specific data
 * 
 * @example
 * const response = createSlackMessageWithBlocks(
 *   'Agent Status',
 *   [
 *     createSlackHeader('Agent Status'),
 *     createSlackSection('Balance: 5.2 SOL')
 *   ]
 * );
 */
export function createSlackMessageWithBlocks(
  text: string,
  blocks: SlackBlock[]
): MessageResponse {
  return {
    text,
    channelSpecificData: createSlackBlocks(blocks),
  };
}

/**
 * Example: Create a rich agent status message for all channels
 * 
 * @param agentData - Agent data to display
 * @param channelType - Channel type to format for
 * @returns MessageResponse formatted for the specific channel
 */
export function createAgentStatusMessage(
  agentData: {
    name: string;
    balance: number;
    age: number;
    generation: number;
    status: string;
  },
  channelType: 'telegram' | 'discord' | 'slack'
): MessageResponse {
  const baseText = `Agent: ${agentData.name}\nBalance: ${agentData.balance} SOL\nAge: ${agentData.age} days\nGeneration: ${agentData.generation}\nStatus: ${agentData.status}`;

  switch (channelType) {
    case 'telegram':
      return createTelegramMessageWithKeyboard(
        `*Agent Status*\n\n${baseText}`,
        [
          [
            { text: '🔄 Refresh', callbackData: 'refresh_status' },
            { text: '📊 Details', callbackData: 'show_details' },
          ],
          [{ text: '❌ Close', callbackData: 'close' }],
        ],
        'Markdown'
      );

    case 'discord':
      return createDiscordMessageWithEmbed('', {
        title: '🤖 Agent Status',
        description: `Information for agent **${agentData.name}**`,
        color: agentData.status === 'alive' ? DiscordColors.GREEN : DiscordColors.RED,
        fields: [
          { name: '💰 Balance', value: `${agentData.balance} SOL`, inline: true },
          { name: '📅 Age', value: `${agentData.age} days`, inline: true },
          { name: '🧬 Generation', value: `${agentData.generation}`, inline: true },
          { name: '📊 Status', value: agentData.status, inline: true },
        ],
      });

    case 'slack':
      return createSlackMessageWithBlocks('Agent Status', [
        createSlackHeader('🤖 Agent Status'),
        createSlackSection(`Information for agent *${agentData.name}*`),
        createSlackDivider(),
        createSlackSectionWithFields([
          { text: `*💰 Balance:*\n${agentData.balance} SOL` },
          { text: `*📅 Age:*\n${agentData.age} days` },
          { text: `*🧬 Generation:*\n${agentData.generation}` },
          { text: `*📊 Status:*\n${agentData.status}` },
        ]),
        createSlackDivider(),
        createSlackActions([
          { text: 'Refresh', value: 'refresh_status', style: 'primary' },
          { text: 'Details', value: 'show_details' },
        ]),
        createSlackContext([`Last updated: ${new Date().toLocaleString()}`]),
      ]);

    default:
      return { text: baseText };
  }
}
