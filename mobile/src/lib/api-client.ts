/**
 * Ordo API Client for Mobile
 * 
 * Provides typed API client for interacting with Ordo backend
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'paused';
  balance: number;
  earnings: number;
  age: number;
  generation: number;
  specialization: string;
  riskTolerance?: string;
  autoTrade?: boolean;
  walletAddress?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  agentId?: string;
  type: string;
  amount: number;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  details?: string;
}

export interface Metrics {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  pausedAgents: number;
  totalBalance: number;
  totalEarnings: number;
  averageBalance: number;
  averageEarnings: number;
}

export interface PerformanceData {
  day: string;
  date: string;
  actions: number;
  earnings: number;
}

class OrdoAPIClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private async loadToken() {
    try {
      this.token = await AsyncStorage.getItem('ordo_token');
    } catch (error) {
      console.error('Error loading token:', error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth methods
  async getNonce(walletAddress: string): Promise<{ nonce: string; message: string }> {
    return this.request('/api/auth/nonce', {
      method: 'POST',
      body: JSON.stringify({ walletAddress }),
    });
  }

  async verifySignature(
    walletAddress: string,
    signature: string,
    message: string
  ): Promise<{ token: string; walletAddress: string; expiresIn: number }> {
    const result = await this.request<{ token: string; walletAddress: string; expiresIn: number }>(
      '/api/auth/verify',
      {
        method: 'POST',
        body: JSON.stringify({ walletAddress, signature, message }),
      }
    );

    // Store token
    this.token = result.token;
    await AsyncStorage.setItem('ordo_token', result.token);

    return result;
  }

  async refreshToken(): Promise<{ token: string }> {
    const result = await this.request<{ token: string }>('/api/auth/refresh', {
      method: 'POST',
    });

    this.token = result.token;
    await AsyncStorage.setItem('ordo_token', result.token);

    return result;
  }

  async getMe(): Promise<{ walletAddress: string; authenticated: boolean }> {
    return this.request('/api/auth/me');
  }

  async logout() {
    this.token = null;
    await AsyncStorage.removeItem('ordo_token');
  }

  // Agent methods
  async listAgents(): Promise<{ agents: Agent[]; total: number }> {
    return this.request('/api/agents');
  }

  async getAgent(agentId: string): Promise<{ agent: Agent }> {
    return this.request(`/api/agents/${agentId}`);
  }

  async createAgent(data: {
    name: string;
    specialization: string;
    initialBalance: string;
    riskTolerance: string;
    autoTrade: boolean;
  }): Promise<{ agent: Agent }> {
    return this.request('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAgent(
    agentId: string,
    updates: Partial<Agent>
  ): Promise<{ agent: Agent }> {
    return this.request(`/api/agents/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteAgent(agentId: string): Promise<{ message: string; agentId: string }> {
    return this.request(`/api/agents/${agentId}`, {
      method: 'DELETE',
    });
  }

  async pauseAgent(agentId: string): Promise<{ message: string; agentId: string; status: string }> {
    return this.request(`/api/agents/${agentId}/pause`, {
      method: 'POST',
    });
  }

  async resumeAgent(agentId: string): Promise<{ message: string; agentId: string; status: string }> {
    return this.request(`/api/agents/${agentId}/resume`, {
      method: 'POST',
    });
  }

  // Transaction methods
  async listTransactions(params?: {
    agentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ transactions: Transaction[]; total: number; limit: number; offset: number }> {
    const query = new URLSearchParams();
    if (params?.agentId) query.append('agentId', params.agentId);
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    return this.request(`/api/transactions?${query.toString()}`);
  }

  async getTransaction(txId: string): Promise<{ transaction: Transaction }> {
    return this.request(`/api/transactions/${txId}`);
  }

  async getAgentTransactions(
    agentId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{ agentId: string; transactions: Transaction[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());

    return this.request(`/api/transactions/agents/${agentId}?${query.toString()}`);
  }

  // Metrics methods
  async getOverviewMetrics(): Promise<Metrics> {
    return this.request('/api/metrics/overview');
  }

  async getAgentPerformance(
    agentId: string,
    days: number = 7
  ): Promise<{
    agentId: string;
    period: string;
    data: PerformanceData[];
    summary: {
      totalActions: number;
      totalEarnings: number;
      averageDailyEarnings: number;
    };
  }> {
    return this.request(`/api/metrics/agents/${agentId}/performance?days=${days}`);
  }

  async getAgentStats(agentId: string): Promise<{
    agentId: string;
    stats: {
      age: number;
      totalActions: number;
      actionsPerDay: number;
      balance: number;
      totalEarnings: number;
      generation: number;
      status: string;
      uptime: number;
    };
  }> {
    return this.request(`/api/metrics/agents/${agentId}/stats`);
  }
}

// Export singleton instance
export const apiClient = new OrdoAPIClient();
