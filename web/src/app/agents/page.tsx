'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'paused';
  balance: number;
  earnings: number;
  age: number;
  generation: number;
  specialization: string;
}

export default function AgentsPage() {
  const { connected } = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (connected) {
      // TODO: Replace with actual API call
      const mockAgents: Agent[] = [
        {
          id: '1',
          name: 'TraderBot Alpha',
          status: 'active',
          balance: 2.5,
          earnings: 15.3,
          age: 45,
          generation: 1,
          specialization: 'DeFi Trading',
        },
        {
          id: '2',
          name: 'NFT Hunter',
          status: 'active',
          balance: 1.8,
          earnings: 8.7,
          age: 30,
          generation: 1,
          specialization: 'NFT Trading',
        },
        {
          id: '3',
          name: 'Yield Farmer',
          status: 'idle',
          balance: 5.2,
          earnings: 22.1,
          age: 60,
          generation: 2,
          specialization: 'Yield Farming',
        },
        {
          id: '4',
          name: 'Scout Agent',
          status: 'paused',
          balance: 0.5,
          earnings: 2.3,
          age: 15,
          generation: 1,
          specialization: 'Market Research',
        },
      ];
      setAgents(mockAgents);
      setLoading(false);
    }
  }, [connected]);

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return 'text-primary';
      case 'idle':
        return 'text-yellow-500';
      case 'paused':
        return 'text-gray-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return '🟢';
      case 'idle':
        return '🟡';
      case 'paused':
        return '⏸️';
      default:
        return '⚪';
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen">
        <header className="border-b border-border">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <Link href="/" className="flex items-center gap-3">
              <div className="text-2xl">🤖</div>
              <h1 className="text-2xl font-bold">Ordo</h1>
            </Link>
            <WalletMultiButton />
          </div>
        </header>
        <div className="container mx-auto px-6 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-8">
            Please connect your wallet to view your agents
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className="text-2xl">🤖</div>
            <h1 className="text-2xl font-bold">Ordo</h1>
          </Link>
          <WalletMultiButton />
        </div>
      </header>

      <main className="container mx-auto px-6 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">My Agents</h2>
            <p className="text-gray-400">
              {agents.length} {agents.length === 1 ? 'agent' : 'agents'} active
            </p>
          </div>
          <Link
            href="/agents/create"
            className="bg-primary text-black px-6 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors"
          >
            + Create Agent
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-gray-400">Loading agents...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-6">🤖</div>
            <h3 className="text-2xl font-bold mb-4">No Agents Yet</h3>
            <p className="text-gray-400 mb-8">
              Create your first AI agent to get started
            </p>
            <Link
              href="/agents/create"
              className="inline-block bg-primary text-black px-8 py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors"
            >
              Create Agent
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agents/${agent.id}`}
                className="bg-surface border border-border rounded-lg p-6 hover:border-primary transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{agent.name}</h3>
                    <p className="text-sm text-gray-400">
                      {agent.specialization}
                    </p>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-sm font-bold ${getStatusColor(
                      agent.status
                    )}`}
                  >
                    {getStatusIcon(agent.status)} {agent.status.toUpperCase()}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Balance</div>
                    <div className="font-bold">{agent.balance.toFixed(2)} SOL</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Earnings</div>
                    <div className="font-bold text-primary">
                      +{agent.earnings.toFixed(2)} SOL
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Age</div>
                    <div className="font-bold">{agent.age} days</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Generation</div>
                    <div className="font-bold">{agent.generation}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
