/**
 * Multi-Channel Gateway Types
 * 
 * Defines types for multi-channel gateway integration supporting
 * Telegram, Discord, and Slack channels.
 */

export type ChannelType = 'telegram' | 'discord' | 'slack';

export interface Message {
  id: string;
  channelType: ChannelType;
  channelId: string;
  userId: string;
  username?: string;
  text: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface MessageResponse {
  text: string;
  channelSpecificData?: TelegramSpecificData | DiscordSpecificData | SlackSpecificData;
}

export interface TelegramSpecificData {
  inlineKeyboard?: Array<Array<{ text: string; callback_data: string }>>;
  parseMode?: 'Markdown' | 'HTML';
}

export interface DiscordSpecificData {
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
}

export interface SlackSpecificData {
  blocks?: Array<{
    type: string;
    text?: { type: string; text: string };
    elements?: any[];
  }>;
}

export interface ChannelConfig {
  enabled: boolean;
  token: string;
  webhookUrl?: string;
}

export interface GatewayConfig {
  telegram?: ChannelConfig;
  discord?: ChannelConfig;
  slack?: ChannelConfig;
}

export interface MessageHandler {
  (message: Message): Promise<MessageResponse>;
}

export interface ChannelBot {
  start(): Promise<void>;
  stop(): Promise<void>;
  sendMessage(channelId: string, response: MessageResponse): Promise<void>;
}
