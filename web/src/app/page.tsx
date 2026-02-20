'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface AgentStats {
  totalAgents: number;
  activeAgents: number;
  totalEarnings: number;
  totalBalance: number;
}

export default function Home() {
  const { connected } = useWallet();
  const [stats, setStats] = useState<AgentStats>({
    totalAgents: 0,
    activeAgents: 0,
    totalEarnings: 0,
    totalBalance: 0,
  });

  useEffect(() => {
    if (connected) {
      // TODO: Fetch real stats from API
      setStats({
        totalAgents: 4,
        activeAgents: 3,
        totalEarnings: 48.4,
        totalBalance: 10.0,
      });
    }
  }, [connected]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🤖</div>
            <h1 className="text-2xl font-bold">Ordo</h1>
          </div>
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        {!connected ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🤖</div>
            <h2 className="text-4xl font-bold mb-4">Welcome to Ordo</h2>
            <p className="text-xl text-gray-400 mb-8">
              Manage autonomous AI agents on Solana
            </p>
            <WalletMultiButton />
          </div>
        ) : (
          <div>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <div className="bg-surface border border-border rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Total Agents</div>
                <div className="text-3xl font-bold">{stats.totalAgents}</div>
              </div>
              <div className="bg-surface border border-border rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Active Agents</div>
                <div className="text-3xl font-bold text-primary">
                  {stats.activeAgents}
                </div>
              </div>
              <div className="bg-surface border border-border rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Total Earnings</div>
                <div className="text-3xl font-bold text-primary">
                  {stats.totalEarnings.toFixed(2)} SOL
                </div>
              </div>
              <div className="bg-surface border border-border rounded-lg p-6">
                <div className="text-gray-400 text-sm mb-2">Total Balance</div>
                <div className="text-3xl font-bold">
                  {stats.totalBalance.toFixed(2)} SOL
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-6">Quick Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link
                  href="/agents"
                  className="bg-surface border border-border rounded-lg p-6 hover:border-primary transition-colors"
                >
                  <div className="text-4xl mb-4">📊</div>
                  <h4 className="text-xl font-bold mb-2">View Agents</h4>
                  <p className="text-gray-400">
                    Monitor and manage your AI agents
                  </p>
                </Link>
                <Link
                  href="/agents/create"
                  className="bg-surface border border-border rounded-lg p-6 hover:border-primary transition-colors"
                >
                  <div className="text-4xl mb-4">➕</div>
                  <h4 className="text-xl font-bold mb-2">Create Agent</h4>
                  <p className="text-gray-400">
                    Deploy a new autonomous AI agent
                  </p>
                </Link>
                <Link
                  href="/settings"
                  className="bg-surface border border-border rounded-lg p-6 hover:border-primary transition-colors"
                >
                  <div className="text-4xl mb-4">⚙️</div>
                  <h4 className="text-xl font-bold mb-2">Settings</h4>
                  <p className="text-gray-400">
                    Configure your preferences
                  </p>
                </Link>
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h3 className="text-2xl font-bold mb-6">Recent Activity</h3>
              <div className="bg-surface border border-border rounded-lg p-6">
                <div className="text-gray-400 text-center py-8">
                  No recent activity
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-20">
        <div className="container mx-auto px-6 py-8 text-center text-gray-400">
          <p>Made with ❤️ for the Solana ecosystem</p>
          <p className="mt-2">Powered by Ordo Agent Framework</p>
        </div>
      </footer>
    </div>
  );
}
