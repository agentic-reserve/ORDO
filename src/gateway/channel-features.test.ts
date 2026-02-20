/**
 * Channel-Specific Features Tests
 * 
 * Tests for Telegram inline keyboards, Discord embeds, and Slack blocks.
 * 
 * Requirements: 22.6
 */

import { describe, it, expect } from 'vitest';
import {
  // Telegram helpers
  createTelegramKeyboard,
  createTelegramInlineButtons,
  createTelegramMessageWithKeyboard,
  // Discord helpers
  createDiscordEmbed,
  createDiscordEmbeds,
  createDiscordMessageWithEmbed,
  createDiscordMessageWithEmbeds,
  DiscordColors,
  // Slack helpers
  createSlackHeader,
  createSlackSection,
  createSlackSectionWithFields,
  createSlackDivider,
  createSlackActions,
  createSlackContext,
  createSlackBlocks,
  createSlackMessageWithBlocks,
  // Example function
  createAgentStatusMessage,
} from './channel-features.js';

describe('Telegram Inline Keyboard Features', () => {
  describe('createTelegramKeyboard', () => {
    it('should create inline keyboard with multiple rows', () => {
      const keyboard = createTelegramKeyboard([
        [
          { text: 'Button 1', callbackData: 'btn1' },
          { text: 'Button 2', callbackData: 'btn2' },
        ],
        [{ text: 'Button 3', callbackData: 'btn3' }],
      ]);

      expect(keyboard.inlineKeyboard).toBeDefined();
      expect(keyboard.inlineKeyboard).toHaveLength(2);
      expect(keyboard.inlineKeyboard![0]).toHaveLength(2);
      expect(keyboard.inlineKeyboard![1]).toHaveLength(1);
      expect(keyboard.inlineKeyboard![0][0]).toEqual({
        text: 'Button 1',
        callback_data: 'btn1',
      });
    });

    it('should create empty keyboard with no buttons', () => {
      const keyboard = createTelegramKeyboard([]);

      expect(keyboard.inlineKeyboard).toBeDefined();
      expect(keyboard.inlineKeyboard).toHaveLength(0);
    });
  });

  describe('createTelegramInlineButtons', () => {
    it('should create single row keyboard', () => {
      const keyboard = createTelegramInlineButtons([
        { text: 'Yes', callbackData: 'yes' },
        { text: 'No', callbackData: 'no' },
      ]);

      expect(keyboard.inlineKeyboard).toBeDefined();
      expect(keyboard.inlineKeyboard).toHaveLength(1);
      expect(keyboard.inlineKeyboard![0]).toHaveLength(2);
    });
  });

  describe('createTelegramMessageWithKeyboard', () => {
    it('should create message with keyboard and text', () => {
      const response = createTelegramMessageWithKeyboard(
        'Choose an option:',
        [[{ text: 'Option 1', callbackData: 'opt1' }]],
        'Markdown'
      );

      expect(response.text).toBe('Choose an option:');
      expect(response.channelSpecificData).toBeDefined();
      const telegramData = response.channelSpecificData as any;
      expect(telegramData.inlineKeyboard).toBeDefined();
      expect(telegramData.parseMode).toBe('Markdown');
    });

    it('should create message without parse mode', () => {
      const response = createTelegramMessageWithKeyboard(
        'Plain text',
        [[{ text: 'Button', callbackData: 'btn' }]]
      );

      expect(response.text).toBe('Plain text');
      const telegramData = response.channelSpecificData as any;
      expect(telegramData.parseMode).toBeUndefined();
    });
  });
});

describe('Discord Embed Features', () => {
  describe('createDiscordEmbed', () => {
    it('should create embed with all fields', () => {
      const embed = createDiscordEmbed({
        title: 'Test Title',
        description: 'Test Description',
        color: 0xff0000,
        fields: [
          { name: 'Field 1', value: 'Value 1', inline: true },
          { name: 'Field 2', value: 'Value 2', inline: false },
        ],
      });

      expect(embed.embeds).toBeDefined();
      expect(embed.embeds).toHaveLength(1);
      expect(embed.embeds![0].title).toBe('Test Title');
      expect(embed.embeds![0].description).toBe('Test Description');
      expect(embed.embeds![0].color).toBe(0xff0000);
      expect(embed.embeds![0].fields).toHaveLength(2);
    });

    it('should create embed with minimal fields', () => {
      const embed = createDiscordEmbed({
        title: 'Simple Title',
      });

      expect(embed.embeds).toBeDefined();
      expect(embed.embeds).toHaveLength(1);
      expect(embed.embeds![0].title).toBe('Simple Title');
      expect(embed.embeds![0].description).toBeUndefined();
      expect(embed.embeds![0].color).toBeUndefined();
    });
  });

  describe('createDiscordEmbeds', () => {
    it('should create multiple embeds', () => {
      const embeds = createDiscordEmbeds([
        { title: 'Embed 1', description: 'First' },
        { title: 'Embed 2', description: 'Second' },
      ]);

      expect(embeds.embeds).toBeDefined();
      expect(embeds.embeds).toHaveLength(2);
      expect(embeds.embeds![0].title).toBe('Embed 1');
      expect(embeds.embeds![1].title).toBe('Embed 2');
    });
  });

  describe('createDiscordMessageWithEmbed', () => {
    it('should create message with embed', () => {
      const response = createDiscordMessageWithEmbed('Message text', {
        title: 'Embed Title',
        color: DiscordColors.GREEN,
      });

      expect(response.text).toBe('Message text');
      expect(response.channelSpecificData).toBeDefined();
      const discordData = response.channelSpecificData as any;
      expect(discordData.embeds).toHaveLength(1);
      expect(discordData.embeds[0].title).toBe('Embed Title');
      expect(discordData.embeds[0].color).toBe(DiscordColors.GREEN);
    });
  });

  describe('createDiscordMessageWithEmbeds', () => {
    it('should create message with multiple embeds', () => {
      const response = createDiscordMessageWithEmbeds('Multiple embeds', [
        { title: 'First' },
        { title: 'Second' },
      ]);

      expect(response.text).toBe('Multiple embeds');
      const discordData = response.channelSpecificData as any;
      expect(discordData.embeds).toHaveLength(2);
    });
  });

  describe('DiscordColors', () => {
    it('should have predefined colors', () => {
      expect(DiscordColors.GREEN).toBe(0x57f287);
      expect(DiscordColors.RED).toBe(0xed4245);
      expect(DiscordColors.BLUE).toBe(0x3498db);
      expect(DiscordColors.BLURPLE).toBe(0x5865f2);
    });
  });
});

describe('Slack Block Features', () => {
  describe('createSlackHeader', () => {
    it('should create header block', () => {
      const header = createSlackHeader('Test Header');

      expect(header.type).toBe('header');
      expect(header.text).toBeDefined();
      expect(header.text!.type).toBe('plain_text');
      expect(header.text!.text).toBe('Test Header');
    });
  });

  describe('createSlackSection', () => {
    it('should create section with markdown', () => {
      const section = createSlackSection('*Bold* text', true);

      expect(section.type).toBe('section');
      expect(section.text).toBeDefined();
      expect(section.text!.type).toBe('mrkdwn');
      expect(section.text!.text).toBe('*Bold* text');
    });

    it('should create section with plain text', () => {
      const section = createSlackSection('Plain text', false);

      expect(section.type).toBe('section');
      expect(section.text!.type).toBe('plain_text');
    });

    it('should default to markdown', () => {
      const section = createSlackSection('Default text');

      expect(section.text!.type).toBe('mrkdwn');
    });
  });

  describe('createSlackSectionWithFields', () => {
    it('should create section with fields', () => {
      const section = createSlackSectionWithFields([
        { text: 'Field 1' },
        { text: 'Field 2' },
      ]);

      expect(section.type).toBe('section');
      expect(section.fields).toBeDefined();
      expect(section.fields).toHaveLength(2);
      expect(section.fields![0]).toEqual({
        type: 'mrkdwn',
        text: 'Field 1',
      });
    });
  });

  describe('createSlackDivider', () => {
    it('should create divider block', () => {
      const divider = createSlackDivider();

      expect(divider.type).toBe('divider');
    });
  });

  describe('createSlackActions', () => {
    it('should create actions block with buttons', () => {
      const actions = createSlackActions([
        { text: 'Approve', value: 'approve', style: 'primary' },
        { text: 'Reject', value: 'reject', style: 'danger' },
      ]);

      expect(actions.type).toBe('actions');
      expect(actions.elements).toBeDefined();
      expect(actions.elements).toHaveLength(2);
      expect(actions.elements![0]).toMatchObject({
        type: 'button',
        text: { type: 'plain_text', text: 'Approve' },
        value: 'approve',
        style: 'primary',
      });
    });

    it('should use value as action_id if not provided', () => {
      const actions = createSlackActions([
        { text: 'Click', value: 'click_value' },
      ]);

      expect(actions.elements![0]).toMatchObject({
        action_id: 'click_value',
      });
    });

    it('should use custom action_id if provided', () => {
      const actions = createSlackActions([
        { text: 'Click', value: 'click_value', actionId: 'custom_id' },
      ]);

      expect(actions.elements![0]).toMatchObject({
        action_id: 'custom_id',
      });
    });
  });

  describe('createSlackContext', () => {
    it('should create context block', () => {
      const context = createSlackContext(['Context 1', 'Context 2']);

      expect(context.type).toBe('context');
      expect(context.elements).toBeDefined();
      expect(context.elements).toHaveLength(2);
      expect(context.elements![0]).toEqual({
        type: 'mrkdwn',
        text: 'Context 1',
      });
    });
  });

  describe('createSlackBlocks', () => {
    it('should create slack data with blocks', () => {
      const blocks = createSlackBlocks([
        createSlackHeader('Header'),
        createSlackSection('Section'),
      ]);

      expect(blocks.blocks).toBeDefined();
      expect(blocks.blocks).toHaveLength(2);
    });
  });

  describe('createSlackMessageWithBlocks', () => {
    it('should create message with blocks', () => {
      const response = createSlackMessageWithBlocks('Fallback text', [
        createSlackHeader('Header'),
        createSlackSection('Section'),
      ]);

      expect(response.text).toBe('Fallback text');
      expect(response.channelSpecificData).toBeDefined();
      const slackData = response.channelSpecificData as any;
      expect(slackData.blocks).toHaveLength(2);
    });
  });
});

describe('createAgentStatusMessage', () => {
  const agentData = {
    name: 'TestAgent',
    balance: 5.2,
    age: 45,
    generation: 3,
    status: 'alive',
  };

  it('should create Telegram message with keyboard', () => {
    const response = createAgentStatusMessage(agentData, 'telegram');

    expect(response.text).toContain('TestAgent');
    expect(response.text).toContain('5.2 SOL');
    const telegramData = response.channelSpecificData as any;
    expect(telegramData.inlineKeyboard).toBeDefined();
    expect(telegramData.parseMode).toBe('Markdown');
  });

  it('should create Discord message with embed', () => {
    const response = createAgentStatusMessage(agentData, 'discord');

    expect(response.text).toBe('');
    const discordData = response.channelSpecificData as any;
    expect(discordData.embeds).toBeDefined();
    expect(discordData.embeds[0].title).toContain('Agent Status');
    expect(discordData.embeds[0].color).toBe(DiscordColors.GREEN);
    expect(discordData.embeds[0].fields).toHaveLength(4);
  });

  it('should create Slack message with blocks', () => {
    const response = createAgentStatusMessage(agentData, 'slack');

    expect(response.text).toBe('Agent Status');
    const slackData = response.channelSpecificData as any;
    expect(slackData.blocks).toBeDefined();
    expect(slackData.blocks.length).toBeGreaterThan(0);
    expect(slackData.blocks[0].type).toBe('header');
  });

  it('should use red color for dead agents in Discord', () => {
    const deadAgent = { ...agentData, status: 'dead' };
    const response = createAgentStatusMessage(deadAgent, 'discord');

    const discordData = response.channelSpecificData as any;
    expect(discordData.embeds[0].color).toBe(DiscordColors.RED);
  });
});

describe('Integration Tests', () => {
  it('should create consistent messages across all channels', () => {
    const agentData = {
      name: 'TestAgent',
      balance: 10.5,
      age: 30,
      generation: 2,
      status: 'alive',
    };

    const telegramMsg = createAgentStatusMessage(agentData, 'telegram');
    const discordMsg = createAgentStatusMessage(agentData, 'discord');
    const slackMsg = createAgentStatusMessage(agentData, 'slack');

    // All should contain agent name
    expect(telegramMsg.text).toContain('TestAgent');
    const discordData = discordMsg.channelSpecificData as any;
    expect(discordData.embeds[0].description).toContain('TestAgent');
    const slackData = slackMsg.channelSpecificData as any;
    const slackSection = slackData.blocks.find((b: any) => b.type === 'section');
    expect(slackSection.text.text).toContain('TestAgent');

    // All should have channel-specific data
    expect(telegramMsg.channelSpecificData).toBeDefined();
    expect(discordMsg.channelSpecificData).toBeDefined();
    expect(slackMsg.channelSpecificData).toBeDefined();
  });

  it('should handle complex Telegram keyboards', () => {
    const response = createTelegramMessageWithKeyboard(
      'Complex keyboard',
      [
        [
          { text: '1', callbackData: '1' },
          { text: '2', callbackData: '2' },
          { text: '3', callbackData: '3' },
        ],
        [
          { text: '4', callbackData: '4' },
          { text: '5', callbackData: '5' },
        ],
        [{ text: 'Cancel', callbackData: 'cancel' }],
      ]
    );

    const telegramData = response.channelSpecificData as any;
    expect(telegramData.inlineKeyboard).toHaveLength(3);
    expect(telegramData.inlineKeyboard[0]).toHaveLength(3);
    expect(telegramData.inlineKeyboard[1]).toHaveLength(2);
    expect(telegramData.inlineKeyboard[2]).toHaveLength(1);
  });

  it('should handle complex Discord embeds', () => {
    const response = createDiscordMessageWithEmbeds('Multiple embeds', [
      {
        title: 'Embed 1',
        description: 'First embed',
        color: DiscordColors.BLUE,
        fields: [{ name: 'Field 1', value: 'Value 1' }],
      },
      {
        title: 'Embed 2',
        description: 'Second embed',
        color: DiscordColors.GREEN,
        fields: [
          { name: 'Field 2', value: 'Value 2', inline: true },
          { name: 'Field 3', value: 'Value 3', inline: true },
        ],
      },
    ]);

    const discordData = response.channelSpecificData as any;
    expect(discordData.embeds).toHaveLength(2);
    expect(discordData.embeds[0].fields).toHaveLength(1);
    expect(discordData.embeds[1].fields).toHaveLength(2);
  });

  it('should handle complex Slack blocks', () => {
    const response = createSlackMessageWithBlocks('Complex blocks', [
      createSlackHeader('Main Header'),
      createSlackSection('Introduction text'),
      createSlackDivider(),
      createSlackSectionWithFields([
        { text: '*Field 1:*\nValue 1' },
        { text: '*Field 2:*\nValue 2' },
        { text: '*Field 3:*\nValue 3' },
        { text: '*Field 4:*\nValue 4' },
      ]),
      createSlackDivider(),
      createSlackActions([
        { text: 'Primary', value: 'primary', style: 'primary' },
        { text: 'Danger', value: 'danger', style: 'danger' },
        { text: 'Normal', value: 'normal' },
      ]),
      createSlackContext(['Footer context', 'Additional info']),
    ]);

    const slackData = response.channelSpecificData as any;
    expect(slackData.blocks).toHaveLength(7);
    expect(slackData.blocks[0].type).toBe('header');
    expect(slackData.blocks[2].type).toBe('divider');
    expect(slackData.blocks[3].type).toBe('section');
    expect(slackData.blocks[3].fields).toHaveLength(4);
    expect(slackData.blocks[5].type).toBe('actions');
    expect(slackData.blocks[5].elements).toHaveLength(3);
    expect(slackData.blocks[6].type).toBe('context');
  });
});
