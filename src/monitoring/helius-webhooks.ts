/**
 * Helius Webhooks Integration
 * 
 * Provides real-time transaction notifications for agent activities
 * Requirements: 13.1
 */

import { PublicKey } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import { getConfig } from '../config.js';

export interface HeliusWebhookPayload {
  type: 'TRANSACTION' | 'ACCOUNT_UPDATE';
  signature?: string;
  accountAddress?: string;
  slot: number;
  timestamp: number;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  tokenTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    mint: string;
    tokenAmount: number;
  }>;
  events?: Record<string, unknown>;
}

export interface WebhookConfig {
  webhookUrl: string;
  accountAddresses: string[];
  transactionTypes?: string[];
  webhookType: 'enhanced' | 'raw';
}

export class HeliusWebhookManager {
  private heliusApiKey: string;
  private heliusApiUrl: string;
  private supabase: ReturnType<typeof createClient>;
  private webhookId?: string;

  constructor() {
    const config = getConfig();
    this.heliusApiKey = config.solana.heliusApiKey || '';
    this.heliusApiUrl = 'https://api.helius.xyz/v0';
    
    if (!config.supabase.url || !config.supabase.serviceRoleKey) {
      throw new Error('Supabase configuration required for webhook manager');
    }
    
    this.supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  }

  /**
   * Create a webhook for monitoring agent transactions
   */
  async createWebhook(config: WebhookConfig): Promise<string> {
    const response = await fetch(`${this.heliusApiUrl}/webhooks?api-key=${this.heliusApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        webhookURL: config.webhookUrl,
        accountAddresses: config.accountAddresses,
        transactionTypes: config.transactionTypes || ['Any'],
        webhookType: config.webhookType || 'enhanced',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create webhook: ${error}`);
    }

    const data = await response.json();
    this.webhookId = data.webhookID;
    return data.webhookID;
  }

  /**
   * Update webhook configuration
   */
  async updateWebhook(webhookId: string, config: Partial<WebhookConfig>): Promise<void> {
    const response = await fetch(
      `${this.heliusApiUrl}/webhooks/${webhookId}?api-key=${this.heliusApiKey}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update webhook: ${error}`);
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    const response = await fetch(
      `${this.heliusApiUrl}/webhooks/${webhookId}?api-key=${this.heliusApiKey}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to delete webhook: ${error}`);
    }
  }

  /**
   * Handle incoming webhook payload
   */
  async handleWebhook(payload: HeliusWebhookPayload): Promise<void> {
    // Update agent state in real-time based on transaction
    if (payload.type === 'TRANSACTION' && payload.nativeTransfers) {
      for (const transfer of payload.nativeTransfers) {
        await this.updateAgentBalance(transfer.toUserAccount, transfer.amount);
        await this.updateAgentBalance(transfer.fromUserAccount, -transfer.amount);
      }
    }

    // Log the transaction
    await this.logTransaction(payload);
  }

  /**
   * Update agent balance in real-time
   */
  private async updateAgentBalance(address: string, amountChange: number): Promise<void> {
    try {
      // Convert lamports to SOL
      const solChange = amountChange / 1e9;

      // Update agent balance
      const { error } = await this.supabase.rpc('update_agent_balance', {
        agent_address: address,
        balance_change: solChange,
      });

      if (error) {
        console.error('Failed to update agent balance:', error);
      }
    } catch (error) {
      console.error('Error updating agent balance:', error);
    }
  }

  /**
   * Log transaction to database
   */
  private async logTransaction(payload: HeliusWebhookPayload): Promise<void> {
    try {
      const { error } = await this.supabase.from('agent_transactions').insert({
        signature: payload.signature,
        slot: payload.slot,
        timestamp: new Date(payload.timestamp * 1000).toISOString(),
        native_transfers: payload.nativeTransfers,
        token_transfers: payload.tokenTransfers,
        events: payload.events,
      });

      if (error) {
        console.error('Failed to log transaction:', error);
      }
    } catch (error) {
      console.error('Error logging transaction:', error);
    }
  }

  /**
   * Register agent for webhook monitoring
   */
  async registerAgent(agentPublicKey: PublicKey): Promise<void> {
    if (!this.webhookId) {
      throw new Error('No webhook configured. Call createWebhook first.');
    }

    // Get current webhook config
    const response = await fetch(
      `${this.heliusApiUrl}/webhooks/${this.webhookId}?api-key=${this.heliusApiKey}`
    );

    if (!response.ok) {
      throw new Error('Failed to get webhook config');
    }

    const currentConfig = await response.json();
    const addresses = currentConfig.accountAddresses || [];
    
    if (!addresses.includes(agentPublicKey.toBase58())) {
      addresses.push(agentPublicKey.toBase58());
      
      await this.updateWebhook(this.webhookId, {
        accountAddresses: addresses,
      });
    }
  }

  /**
   * Unregister agent from webhook monitoring
   */
  async unregisterAgent(agentPublicKey: PublicKey): Promise<void> {
    if (!this.webhookId) {
      return;
    }

    const response = await fetch(
      `${this.heliusApiUrl}/webhooks/${this.webhookId}?api-key=${this.heliusApiKey}`
    );

    if (!response.ok) {
      return;
    }

    const currentConfig = await response.json();
    const addresses = (currentConfig.accountAddresses || []).filter(
      (addr: string) => addr !== agentPublicKey.toBase58()
    );

    await this.updateWebhook(this.webhookId, {
      accountAddresses: addresses,
    });
  }
}
