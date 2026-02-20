# Channel-Specific Features

This document describes how to use channel-specific features for Telegram, Discord, and Slack in the Ordo platform.

## Overview

The Ordo platform supports rich interactive features for each messaging channel:

- **Telegram**: Inline keyboards with callback buttons
- **Discord**: Rich embeds with colors, fields, and formatting
- **Slack**: Block Kit with headers, sections, actions, and more

## Requirements

Implements **Requirement 22.6**: Support Telegram inline keyboards, Discord embeds, and Slack blocks.

## Quick Start

```typescript
import {
  createTelegramMessageWithKeyboard,
  createDiscordMessageWithEmbed,
  createSlackMessageWithBlocks,
  createAgentStatusMessage,
} from './channel-features.js';

// Unified helper that works for all channels
const response = createAgentStatusMessage(
  {
    name: 'MyAgent',
    balance: 5.2,
    age: 45,
    generation: 3,
    status: 'alive',
  },
  message.channelType // 'telegram' | 'discord' | 'slack'
);
```

## Telegram Features

### Inline Keyboards

Telegram inline keyboards allow users to interact with your bot through buttons that appear below messages.

#### Simple Buttons

```typescript
import { createTelegramInlineButtons } from './channel-features.js';

const keyboard = createTelegramInlineButtons([
  { text: 'Yes', callbackData: 'yes' },
  { text: 'No', callbackData: 'no' },
]);
```

#### Multi-Row Keyboards

```typescript
import { createTelegramKeyboard } from './channel-features.js';

const keyboard = createTelegramKeyboard([
  [
    { text: 'Option 1', callbackData: 'opt1' },
    { text: 'Option 2', callbackData: 'opt2' },
  ],
  [{ text: 'Cancel', callbackData: 'cancel' }],
]);
```

#### Complete Message with Keyboard

```typescript
import { createTelegramMessageWithKeyboard } from './channel-features.js';

const response = createTelegramMessageWithKeyboard(
  '*Choose an option:*',
  [
    [
      { text: '✅ Approve', callbackData: 'approve' },
      { text: '❌ Reject', callbackData: 'reject' },
    ],
  ],
  'Markdown' // Optional: 'Markdown' or 'HTML'
);
```

### Handling Callbacks

When a user clicks an inline button, Telegram sends a callback query. The `TelegramBot` class automatically handles these and converts them to regular messages with the `callbackData` as the text.

## Discord Features

### Embeds

Discord embeds are rich message cards with colors, titles, descriptions, and fields.

#### Simple Embed

```typescript
import { createDiscordEmbed, DiscordColors } from './channel-features.js';

const embed = createDiscordEmbed({
  title: 'Agent Status',
  description: 'Current agent information',
  color: DiscordColors.GREEN,
});
```

#### Embed with Fields

```typescript
const embed = createDiscordEmbed({
  title: 'Agent Status',
  description: 'Detailed information',
  color: DiscordColors.BLUE,
  fields: [
    { name: 'Balance', value: '5.2 SOL', inline: true },
    { name: 'Age', value: '45 days', inline: true },
    { name: 'Status', value: 'Alive', inline: true },
  ],
});
```

#### Complete Message with Embed

```typescript
import { createDiscordMessageWithEmbed } from './channel-features.js';

const response = createDiscordMessageWithEmbed('Here is your status:', {
  title: 'Agent Status',
  color: DiscordColors.GREEN,
  fields: [{ name: 'Balance', value: '5.2 SOL' }],
});
```

#### Multiple Embeds

```typescript
import { createDiscordMessageWithEmbeds } from './channel-features.js';

const response = createDiscordMessageWithEmbeds('Multiple sections:', [
  {
    title: 'Section 1',
    description: 'First section',
    color: DiscordColors.BLUE,
  },
  {
    title: 'Section 2',
    description: 'Second section',
    color: DiscordColors.GREEN,
  },
]);
```

### Discord Colors

Pre-defined colors are available in the `DiscordColors` object:

```typescript
import { DiscordColors } from './channel-features.js';

// Common colors
DiscordColors.GREEN; // Success
DiscordColors.RED; // Error
DiscordColors.YELLOW; // Warning
DiscordColors.BLUE; // Info
DiscordColors.BLURPLE; // Discord brand color

// And many more...
```

## Slack Features

### Block Kit

Slack uses Block Kit for rich interactive messages. Blocks are stacked vertically to create layouts.

#### Header Block

```typescript
import { createSlackHeader } from './channel-features.js';

const header = createSlackHeader('Agent Status');
```

#### Section Block

```typescript
import { createSlackSection } from './channel-features.js';

const section = createSlackSection('This is a *bold* text', true); // markdown
const plainSection = createSlackSection('Plain text', false);
```

#### Section with Fields

```typescript
import { createSlackSectionWithFields } from './channel-features.js';

const section = createSlackSectionWithFields([
  { text: '*Balance:*\n5.2 SOL' },
  { text: '*Age:*\n45 days' },
]);
```

#### Divider

```typescript
import { createSlackDivider } from './channel-features.js';

const divider = createSlackDivider();
```

#### Actions (Buttons)

```typescript
import { createSlackActions } from './channel-features.js';

const actions = createSlackActions([
  { text: 'Approve', value: 'approve', style: 'primary' },
  { text: 'Reject', value: 'reject', style: 'danger' },
  { text: 'Cancel', value: 'cancel' }, // No style = default
]);
```

#### Context (Footer)

```typescript
import { createSlackContext } from './channel-features.js';

const context = createSlackContext(['Last updated: 2 minutes ago']);
```

#### Complete Message with Blocks

```typescript
import {
  createSlackMessageWithBlocks,
  createSlackHeader,
  createSlackSection,
  createSlackDivider,
  createSlackActions,
} from './channel-features.js';

const response = createSlackMessageWithBlocks('Agent Status', [
  createSlackHeader('🤖 Agent Status'),
  createSlackSection('Current agent information'),
  createSlackDivider(),
  createSlackSectionWithFields([
    { text: '*Balance:*\n5.2 SOL' },
    { text: '*Age:*\n45 days' },
  ]),
  createSlackDivider(),
  createSlackActions([
    { text: 'Refresh', value: 'refresh', style: 'primary' },
    { text: 'Details', value: 'details' },
  ]),
]);
```

## Unified Helpers

### Agent Status Message

The `createAgentStatusMessage` function creates a rich status message formatted appropriately for each channel:

```typescript
import { createAgentStatusMessage } from './channel-features.js';

const response = createAgentStatusMessage(
  {
    name: 'MyAgent',
    balance: 5.2,
    age: 45,
    generation: 3,
    status: 'alive',
  },
  message.channelType
);
```

This automatically creates:
- Telegram: Message with inline keyboard (Refresh, Details, Close buttons)
- Discord: Embed with colored fields
- Slack: Block Kit with header, fields, and action buttons

## Examples

See `channel-features-examples.ts` for complete examples including:

1. **Confirmation Messages**: Yes/No dialogs
2. **Agent Menu**: Multi-option menus
3. **Status Reports**: Detailed information displays
4. **Error Messages**: Error handling with retry options
5. **Success Messages**: Success confirmations

## Best Practices

### Telegram

- Keep button text short (max 20 characters)
- Use emojis for visual appeal
- Limit to 8 buttons per keyboard
- Use Markdown for text formatting

### Discord

- Use colors to convey meaning (green = success, red = error)
- Keep embed titles under 256 characters
- Limit to 25 fields per embed
- Use inline fields for compact layouts
- Maximum 10 embeds per message

### Slack

- Use headers for main titles
- Use dividers to separate sections
- Keep action buttons to 5 or fewer per block
- Use context blocks for metadata/timestamps
- Maximum 50 blocks per message

## Integration with Bots

The bot implementations (`telegram-bot.ts`, `discord-bot.ts`, `slack-bot.ts`) automatically handle channel-specific data:

```typescript
// In your message handler
async function handleMessage(message: Message): Promise<MessageResponse> {
  // Create response with channel-specific features
  const response = createAgentStatusMessage(agentData, message.channelType);

  // The bot will automatically handle the channel-specific data
  return response;
}
```

The bots extract `channelSpecificData` from the response and format it correctly for each platform.

## Testing

All channel-specific features are thoroughly tested in `channel-features.test.ts`. Run tests with:

```bash
npm test -- channel-features.test.ts --run
```

## API Reference

### Telegram Types

```typescript
interface TelegramButton {
  text: string;
  callbackData: string;
}

interface TelegramSpecificData {
  inlineKeyboard?: Array<Array<{ text: string; callback_data: string }>>;
  parseMode?: 'Markdown' | 'HTML';
}
```

### Discord Types

```typescript
interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: DiscordEmbedField[];
}

interface DiscordSpecificData {
  embeds?: DiscordEmbed[];
}
```

### Slack Types

```typescript
interface SlackBlock {
  type: string;
  text?: { type: string; text: string };
  elements?: any[];
  fields?: any[];
  accessory?: any;
}

interface SlackSpecificData {
  blocks?: SlackBlock[];
}
```

## Further Reading

- [Telegram Bot API - Inline Keyboards](https://core.telegram.org/bots/api#inlinekeyboardmarkup)
- [Discord - Embeds](https://discord.com/developers/docs/resources/channel#embed-object)
- [Slack Block Kit](https://api.slack.com/block-kit)
