'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'paused';
  balance: number;
  earnings: number;
  age: number;
  generation: number;
  specialization: string;
  riskTolerance: string;
  autoTrade: boolean;
}

interface Transaction {
  id: string;
  type: 'trade' | 'transfer' | 'fee';
  amount: number;
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
}

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { connected } = useWallet();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [performanceData] = useState([
    { day: 'Mon', earnings: 2.1 },
    { day: 'Tue', earnings: 3.5 },
    { day: 'Wed', earnings: 2.8 },
    { day: 'Thu', earnings: 4.2 },
    { day: 'Fri', earnings: 3.1 },
    { day: 'Sat', earnings: 5.3 },
    { day: 'Sun', earnings: 4.3 },
  ]);

  useEffect(() => {
    if (connected && params.id) {
      // TODO: Fetch real agent data
      setAgent({
        id: params.id as string,
        name: 'TraderBot Alpha',
        status: 'active',
        balance: 2.5,
        earnings: 15.3,
        age: 45,
        generation: 1,
        specialization: 'DeFi Trading',
        riskTolerance: 'Medium',
        autoTrade: true,
      });

      setTransactions([
        {
          id: '1',
          type: 'trade',
          amount: 0.5,
          timestamp: '2024-02-20 14:30',
          status: 'success',
        },
        {
          id: '2',
          type: 'trade',
          amount: -0.2,
          timestamp: '2024-02-20 12:15',
          status: 'success',
        },
        {
          id: '3',
          type: 'fee',
          amount: -0.001,
          timestamp: '2024-02-20 12:15',
          status: 'success',
        },
      ]);
    }
  }, [connected, params.id]);

  const handlePause = () => {
    alert('Agent paused');
  };

  const handleResume = () => {
    alert('Agent resumed');
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this agent?')) {
      router.push('/agents');
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
            Please connect your wallet to view agent details
          </p>
          <WalletMultiButton />
        </div>
      </div>
    );
  }

  if (!agent) {
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
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-400">Loading agent...</p>
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
        <div className="mb-6">
          <Link
            href="/agents"
            className="text-primary hover:underline inline-flex items-center gap-2"
          >
            ← Back to Agents
          </Link>
        </div>

        {/* Agent Header */}
        <div className="bg-surface border border-border rounded-lg p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">{agent.name}</h2>
              <p className="text-gray-400">{agent.specialization}</p>
            </div>
            <div className="flex gap-3">
              {agent.status === 'active' ? (
                <button
                  onClick={handlePause}
                  className="px-4 py-2 border border-border rounded-lg hover:border-primary transition-colors"
                >
                  ⏸️ Pause
                </button>
              ) : (
                <button
                  onClick={handleResume}
                  className="px-4 py-2 bg-primary text-black rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                  ▶️ Resume
                </button>
              )}
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
              >
                🗑️ Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">Status</div>
              <div className="text-xl font-bold text-primary">
                {agent.status.toUpperCase()}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Balance</div>
              <div className="text-xl font-bold">{agent.balance.toFixed(2)} SOL</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Total Earnings</div>
              <div className="text-xl font-bold text-primary">
                +{agent.earnings.toFixed(2)} SOL
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Age</div>
              <div className="text-xl font-bold">{agent.age} days</div>
            </div>
          </div>
        </div>

        {/* Performance Chart */}
        <div className="bg-surface border border-border rounded-lg p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6">Performance (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="day" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                }}
              />
              <Line
                type="monotone"
                dataKey="earnings"
                stroke="#14F195"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Configuration */}
        <div className="bg-surface border border-border rounded-lg p-8 mb-8">
          <h3 className="text-2xl font-bold mb-6">Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-400 mb-1">Risk Tolerance</div>
              <div className="font-bold">{agent.riskTolerance}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Auto-Trading</div>
              <div className="font-bold">
                {agent.autoTrade ? 'Enabled' : 'Disabled'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400 mb-1">Generation</div>
              <div className="font-bold">{agent.generation}</div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-surface border border-border rounded-lg p-8">
          <h3 className="text-2xl font-bold mb-6">Transaction History</h3>
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex justify-between items-center border-b border-border pb-4"
              >
                <div>
                  <div className="font-bold capitalize">{tx.type}</div>
                  <div className="text-sm text-gray-400">{tx.timestamp}</div>
                </div>
                <div className="text-right">
                  <div
                    className={`font-bold ${
                      tx.amount > 0 ? 'text-primary' : 'text-gray-400'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount.toFixed(3)} SOL
                  </div>
                  <div className="text-sm text-gray-400 capitalize">
                    {tx.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
