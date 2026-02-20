/**
 * Property-Based Tests for Channel-Specific Features
 * 
 * Property 104: Channel-Specific Features
 * Validates: Requirements 22.6
 * 
 * Tests that channel-specific features (Telegram inline keyboards, Discord embeds, 
 * Slack blocks) are correctly supported across all channels.
 */

import { describe, it, expect } from 'vitest';
import { test } from '@fast-check/vitest';
import * as fc from 'fast-check';
import {
  // Telegram helpers
  createTelegramKeyboard,
  createTelegramInlineButtons,
  createTelegramMessageWithKeyboard,
  TelegramButton,
  // Discord helpers
  createDiscordEmbed,
  createDiscordEmbeds,
  createDiscordMessageWithEmbed,
  createDiscordMessageWithEmbeds,
  DiscordEmbed,
  DiscordEmbedField,
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
  SlackBlock,
  // Example function
  createAgentStatusMessage,
} from './channel-features.js';
import {
  TelegramSpecificData,
  DiscordSpecificData,
  SlackSpecificData,
  MessageResponse,
} from './types.js';

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

/**
 * Generate arbitrary Telegram button
 */
const arbitraryTelegramButton = (): fc.Arbitrary<TelegramButton> =>
  fc.record({
    text: fc.string({ minLength: 1, maxLength: 50 }),
    callbackData: fc.string({ minLength: 1, maxLength: 64 }),
  });

/**
 * Generate arbitrary Telegram button rows
 */
const arbitraryTelegramButtonRows = (): fc.Arbitrary<TelegramButton[][]> =>
  fc.array(
    fc.array(arbitraryTelegramButton(), { minLength: 1, maxLength: 8 }),
    { minLength: 0, maxLength: 10 }
  );

/**
 * Generate arbitrary Discord embed field
 */
const arbitraryDiscordEmbedField = (): fc.Arbitrary<DiscordEmbedField> =>
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 256 }),
    value: fc.string({ minLength: 1, maxLength: 1024 }),
    inline: fc.option(fc.boolean(), { nil: undefined }),
  });

/**
 * Generate arbitrary Discord embed
 */
const arbitraryDiscordEmbed = (): fc.Arbitrary<DiscordEmbed> =>
  fc.record({
    title: fc.option(fc.string({ minLength: 1, maxLength: 256 }), { nil: undefined }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 4096 }), { nil: undefined }),
    color: fc.option(fc.integer({ min: 0, max: 0xffffff }), { nil: undefined }),
    fields: fc.option(
      fc.array(arbitraryDiscordEmbedField(), { minLength: 0, maxLength: 25 }),
      { nil: undefined }
    ),
  });

/**
 * Generate arbitrary Slack block
 */
const arbitrarySlackBlock = (): fc.Arbitrary<SlackBlock> =>
  fc.oneof(
    // Header block
    fc.record({
      type: fc.constant('header'),
      text: fc.record({
        type: fc.constant('plain_text'),
        text: fc.string({ minLength: 1, maxLength: 150 }),
      }),
    }),
    // Section block
    fc.record({
      type: fc.constant('section'),
      text: fc.record({
        type: fc.constantFrom('mrkdwn', 'plain_text'),
        text: fc.string({ minLength: 1, maxLength: 3000 }),
      }),
    }),
    // Divider block
    fc.record({
      type: fc.constant('divider'),
    })
  );

/**
 * Generate arbitrary agent data
 */
const arbitraryAgentData = () =>
  fc.record({
    name: fc.string({ minLength: 1, maxLength: 50 }),
    balance: fc.double({ min: 0, max: 1000, noNaN: true }),
    age: fc.integer({ min: 0, max: 365 }),
    generation: fc.integer({ min: 0, max: 100 }),
    status: fc.constantFrom('alive', 'dead'),
  });

/**
 * Generate arbitrary channel type
 */
const arbitraryChannelType = () =>
  fc.constantFrom('telegram' as const, 'discord' as const, 'slack' as const);

// ============================================================================
// Property Tests
// ============================================================================

describe('Property 104: Channel-Specific Features', () => {
  describe('Telegram Inline Keyboard Properties', () => {
    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([arbitraryTelegramButtonRows()])(
      'createTelegramKeyboard preserves button structure',
      (buttonRows) => {
        const keyboard = createTelegramKeyboard(buttonRows);

        // Property: Output should have inlineKeyboard field
        expect(keyboard.inlineKeyboard).toBeDefined();

        // Property: Number of rows should match input
        expect(keyboard.inlineKeyboard!.length).toBe(buttonRows.length);

        // Property: Each row should have correct number of buttons
        buttonRows.forEach((row, rowIndex) => {
          expect(keyboard.inlineKeyboard![rowIndex].length).toBe(row.length);
        });

        // Property: Button data should be correctly transformed
        buttonRows.forEach((row, rowIndex) => {
          row.forEach((button, buttonIndex) => {
            const outputButton = keyboard.inlineKeyboard![rowIndex][buttonIndex];
            expect(outputButton.text).toBe(button.text);
            expect(outputButton.callback_data).toBe(button.callbackData);
          });
        });
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.array(arbitraryTelegramButton(), { minLength: 1, maxLength: 10 }),
    ])(
      'createTelegramInlineButtons creates single row',
      (buttons) => {
        const keyboard = createTelegramInlineButtons(buttons);

        // Property: Should have exactly one row
        expect(keyboard.inlineKeyboard).toBeDefined();
        expect(keyboard.inlineKeyboard!.length).toBe(1);

        // Property: Row should contain all buttons
        expect(keyboard.inlineKeyboard![0].length).toBe(buttons.length);

        // Property: Buttons should match input
        buttons.forEach((button, index) => {
          expect(keyboard.inlineKeyboard![0][index].text).toBe(button.text);
          expect(keyboard.inlineKeyboard![0][index].callback_data).toBe(button.callbackData);
        });
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.string({ minLength: 1, maxLength: 4096 }),
      arbitraryTelegramButtonRows(),
      fc.option(fc.constantFrom('Markdown' as const, 'HTML' as const), { nil: undefined }),
    ])(
      'createTelegramMessageWithKeyboard creates valid message response',
      (text, buttonRows, parseMode) => {
        const response = createTelegramMessageWithKeyboard(text, buttonRows, parseMode);

        // Property: Response should have text
        expect(response.text).toBe(text);

        // Property: Response should have channel-specific data
        expect(response.channelSpecificData).toBeDefined();

        const telegramData = response.channelSpecificData as TelegramSpecificData;

        // Property: Should have inline keyboard
        expect(telegramData.inlineKeyboard).toBeDefined();
        expect(telegramData.inlineKeyboard!.length).toBe(buttonRows.length);

        // Property: Parse mode should match if provided
        if (parseMode !== undefined) {
          expect(telegramData.parseMode).toBe(parseMode);
        }
      }
    );
  });

  describe('Discord Embed Properties', () => {
    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([arbitraryDiscordEmbed()])(
      'createDiscordEmbed preserves embed structure',
      (embedOptions) => {
        const embed = createDiscordEmbed(embedOptions);

        // Property: Output should have embeds array
        expect(embed.embeds).toBeDefined();
        expect(embed.embeds!.length).toBe(1);

        const outputEmbed = embed.embeds![0];

        // Property: All provided fields should be preserved
        if (embedOptions.title !== undefined) {
          expect(outputEmbed.title).toBe(embedOptions.title);
        }
        if (embedOptions.description !== undefined) {
          expect(outputEmbed.description).toBe(embedOptions.description);
        }
        if (embedOptions.color !== undefined) {
          expect(outputEmbed.color).toBe(embedOptions.color);
        }
        if (embedOptions.fields !== undefined) {
          expect(outputEmbed.fields).toEqual(embedOptions.fields);
        }
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.array(arbitraryDiscordEmbed(), { minLength: 1, maxLength: 10 }),
    ])(
      'createDiscordEmbeds preserves all embeds',
      (embedsArray) => {
        const embeds = createDiscordEmbeds(embedsArray);

        // Property: Output should have embeds array
        expect(embeds.embeds).toBeDefined();

        // Property: Number of embeds should match input
        expect(embeds.embeds!.length).toBe(embedsArray.length);

        // Property: Each embed should match input
        embedsArray.forEach((embedOptions, index) => {
          const outputEmbed = embeds.embeds![index];
          if (embedOptions.title !== undefined) {
            expect(outputEmbed.title).toBe(embedOptions.title);
          }
          if (embedOptions.description !== undefined) {
            expect(outputEmbed.description).toBe(embedOptions.description);
          }
        });
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.string({ minLength: 1, maxLength: 2000 }),
      arbitraryDiscordEmbed(),
    ])(
      'createDiscordMessageWithEmbed creates valid message response',
      (text, embedOptions) => {
        const response = createDiscordMessageWithEmbed(text, embedOptions);

        // Property: Response should have text
        expect(response.text).toBe(text);

        // Property: Response should have channel-specific data
        expect(response.channelSpecificData).toBeDefined();

        const discordData = response.channelSpecificData as DiscordSpecificData;

        // Property: Should have embeds array with one embed
        expect(discordData.embeds).toBeDefined();
        expect(discordData.embeds!.length).toBe(1);
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.string({ minLength: 1, maxLength: 2000 }),
      fc.array(arbitraryDiscordEmbed(), { minLength: 1, maxLength: 10 }),
    ])(
      'createDiscordMessageWithEmbeds creates valid message response',
      (text, embedsArray) => {
        const response = createDiscordMessageWithEmbeds(text, embedsArray);

        // Property: Response should have text
        expect(response.text).toBe(text);

        // Property: Response should have channel-specific data
        expect(response.channelSpecificData).toBeDefined();

        const discordData = response.channelSpecificData as DiscordSpecificData;

        // Property: Should have embeds array with correct count
        expect(discordData.embeds).toBeDefined();
        expect(discordData.embeds!.length).toBe(embedsArray.length);
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([fc.integer({ min: 0, max: 0xffffff })])(
      'Discord colors are valid hex values',
      (color) => {
        const embed = createDiscordEmbed({ color });

        // Property: Color should be within valid range
        expect(embed.embeds![0].color).toBeGreaterThanOrEqual(0);
        expect(embed.embeds![0].color).toBeLessThanOrEqual(0xffffff);
      }
    );
  });

  describe('Slack Block Properties', () => {
    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([fc.string({ minLength: 1, maxLength: 150 })])(
      'createSlackHeader creates valid header block',
      (text) => {
        const header = createSlackHeader(text);

        // Property: Should have correct type
        expect(header.type).toBe('header');

        // Property: Should have text field
        expect(header.text).toBeDefined();
        expect(header.text!.type).toBe('plain_text');
        expect(header.text!.text).toBe(text);
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.string({ minLength: 1, maxLength: 3000 }),
      fc.boolean(),
    ])(
      'createSlackSection creates valid section block',
      (text, markdown) => {
        const section = createSlackSection(text, markdown);

        // Property: Should have correct type
        expect(section.type).toBe('section');

        // Property: Should have text field
        expect(section.text).toBeDefined();
        expect(section.text!.type).toBe(markdown ? 'mrkdwn' : 'plain_text');
        expect(section.text!.text).toBe(text);
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.array(
        fc.record({ text: fc.string({ minLength: 1, maxLength: 2000 }) }),
        { minLength: 1, maxLength: 10 }
      ),
    ])(
      'createSlackSectionWithFields creates valid section with fields',
      (fields) => {
        const section = createSlackSectionWithFields(fields);

        // Property: Should have correct type
        expect(section.type).toBe('section');

        // Property: Should have fields array
        expect(section.fields).toBeDefined();
        expect(section.fields!.length).toBe(fields.length);

        // Property: Each field should match input
        fields.forEach((field, index) => {
          expect(section.fields![index].text).toBe(field.text);
        });
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    it('createSlackDivider creates valid divider block', () => {
      const divider = createSlackDivider();

      // Property: Should have correct type
      expect(divider.type).toBe('divider');

      // Property: Should not have other fields
      expect(divider.text).toBeUndefined();
      expect(divider.elements).toBeUndefined();
    });

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.array(
        fc.record({
          text: fc.string({ minLength: 1, maxLength: 75 }),
          value: fc.string({ minLength: 1, maxLength: 2000 }),
          style: fc.option(fc.constantFrom('primary' as const, 'danger' as const), { nil: undefined }),
          actionId: fc.option(fc.string({ minLength: 1, maxLength: 255 }), { nil: undefined }),
        }),
        { minLength: 1, maxLength: 5 }
      ),
    ])(
      'createSlackActions creates valid actions block',
      (buttons) => {
        const actions = createSlackActions(buttons);

        // Property: Should have correct type
        expect(actions.type).toBe('actions');

        // Property: Should have elements array
        expect(actions.elements).toBeDefined();
        expect(actions.elements!.length).toBe(buttons.length);

        // Property: Each button should be correctly formatted
        buttons.forEach((button, index) => {
          const element = actions.elements![index];
          expect(element.type).toBe('button');
          expect(element.text.text).toBe(button.text);
          expect(element.value).toBe(button.value);
          
          // Property: action_id should be custom or default to value
          if (button.actionId !== undefined) {
            expect(element.action_id).toBe(button.actionId);
          } else {
            expect(element.action_id).toBe(button.value);
          }
        });
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.array(fc.string({ minLength: 1, maxLength: 2000 }), { minLength: 1, maxLength: 10 }),
    ])(
      'createSlackContext creates valid context block',
      (elements) => {
        const context = createSlackContext(elements);

        // Property: Should have correct type
        expect(context.type).toBe('context');

        // Property: Should have elements array
        expect(context.elements).toBeDefined();
        expect(context.elements!.length).toBe(elements.length);

        // Property: Each element should match input
        elements.forEach((text, index) => {
          expect(context.elements![index].text).toBe(text);
        });
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.array(arbitrarySlackBlock(), { minLength: 1, maxLength: 50 }),
    ])(
      'createSlackBlocks preserves all blocks',
      (blocks) => {
        const slackData = createSlackBlocks(blocks);

        // Property: Should have blocks array
        expect(slackData.blocks).toBeDefined();

        // Property: Number of blocks should match input
        expect(slackData.blocks!.length).toBe(blocks.length);

        // Property: Each block should match input
        blocks.forEach((block, index) => {
          expect(slackData.blocks![index].type).toBe(block.type);
        });
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.string({ minLength: 1, maxLength: 2000 }),
      fc.array(arbitrarySlackBlock(), { minLength: 1, maxLength: 50 }),
    ])(
      'createSlackMessageWithBlocks creates valid message response',
      (text, blocks) => {
        const response = createSlackMessageWithBlocks(text, blocks);

        // Property: Response should have text
        expect(response.text).toBe(text);

        // Property: Response should have channel-specific data
        expect(response.channelSpecificData).toBeDefined();

        const slackData = response.channelSpecificData as SlackSpecificData;

        // Property: Should have blocks array
        expect(slackData.blocks).toBeDefined();
        expect(slackData.blocks!.length).toBe(blocks.length);
      }
    );
  });

  describe('Cross-Channel Consistency Properties', () => {
    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([arbitraryAgentData(), arbitraryChannelType()])(
      'createAgentStatusMessage creates valid response for all channels',
      (agentData, channelType) => {
        const response = createAgentStatusMessage(agentData, channelType);

        // Property: Response should always have text
        expect(response.text).toBeDefined();
        expect(typeof response.text).toBe('string');

        // Property: Response should have channel-specific data
        expect(response.channelSpecificData).toBeDefined();

        // Property: Channel-specific data should match channel type
        switch (channelType) {
          case 'telegram': {
            const telegramData = response.channelSpecificData as TelegramSpecificData;
            expect(telegramData.inlineKeyboard).toBeDefined();
            expect(response.text).toContain(agentData.name);
            break;
          }
          case 'discord': {
            const discordData = response.channelSpecificData as DiscordSpecificData;
            expect(discordData.embeds).toBeDefined();
            expect(discordData.embeds!.length).toBeGreaterThan(0);
            break;
          }
          case 'slack': {
            const slackData = response.channelSpecificData as SlackSpecificData;
            expect(slackData.blocks).toBeDefined();
            expect(slackData.blocks!.length).toBeGreaterThan(0);
            break;
          }
        }
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([arbitraryAgentData()])(
      'createAgentStatusMessage produces consistent data across channels',
      (agentData) => {
        const telegramResponse = createAgentStatusMessage(agentData, 'telegram');
        const discordResponse = createAgentStatusMessage(agentData, 'discord');
        const slackResponse = createAgentStatusMessage(agentData, 'slack');

        // Property: All responses should contain agent name
        expect(telegramResponse.text).toContain(agentData.name);
        
        const discordData = discordResponse.channelSpecificData as DiscordSpecificData;
        const discordText = discordData.embeds![0].description || '';
        expect(discordText).toContain(agentData.name);

        // Property: All responses should have channel-specific data
        expect(telegramResponse.channelSpecificData).toBeDefined();
        expect(discordResponse.channelSpecificData).toBeDefined();
        expect(slackResponse.channelSpecificData).toBeDefined();

        // Property: Discord color should reflect agent status
        if (agentData.status === 'alive') {
          expect(discordData.embeds![0].color).toBe(DiscordColors.GREEN);
        } else {
          expect(discordData.embeds![0].color).toBe(DiscordColors.RED);
        }
      }
    );
  });

  describe('Data Integrity Properties', () => {
    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([arbitraryTelegramButtonRows()])(
      'Telegram keyboard data is never lost or corrupted',
      (buttonRows) => {
        const keyboard = createTelegramKeyboard(buttonRows);

        // Property: Total button count should be preserved
        const inputButtonCount = buttonRows.reduce((sum, row) => sum + row.length, 0);
        const outputButtonCount = keyboard.inlineKeyboard!.reduce(
          (sum, row) => sum + row.length,
          0
        );
        expect(outputButtonCount).toBe(inputButtonCount);

        // Property: No button text should be empty
        keyboard.inlineKeyboard!.forEach((row) => {
          row.forEach((button) => {
            expect(button.text.length).toBeGreaterThan(0);
            expect(button.callback_data.length).toBeGreaterThan(0);
          });
        });
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.array(arbitraryDiscordEmbed(), { minLength: 1, maxLength: 10 }),
    ])(
      'Discord embed data is never lost or corrupted',
      (embedsArray) => {
        const embeds = createDiscordEmbeds(embedsArray);

        // Property: Embed count should be preserved
        expect(embeds.embeds!.length).toBe(embedsArray.length);

        // Property: Field counts should be preserved
        embedsArray.forEach((embedOptions, index) => {
          if (embedOptions.fields !== undefined) {
            expect(embeds.embeds![index].fields?.length).toBe(embedOptions.fields.length);
          }
        });
      }
    );

    // Feature: ordo-digital-civilization, Property 104: Channel-Specific Features
    test.prop([
      fc.array(arbitrarySlackBlock(), { minLength: 1, maxLength: 50 }),
    ])(
      'Slack block data is never lost or corrupted',
      (blocks) => {
        const slackData = createSlackBlocks(blocks);

        // Property: Block count should be preserved
        expect(slackData.blocks!.length).toBe(blocks.length);

        // Property: Block types should be preserved
        blocks.forEach((block, index) => {
          expect(slackData.blocks![index].type).toBe(block.type);
        });
      }
    );
  });
});

