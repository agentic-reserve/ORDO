'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type AgentSpecialization = 'defi' | 'nft' | 'yield' | 'research' | 'custom';

interface AgentConfig {
  name: string;
  specialization: AgentSpecialization;
  initialBalance: string;
  riskTolerance: 'low' | 'medium' | 'high';
  autoTrade: boolean;
}

export default function CreateAgentPage() {
  const router = useRouter();
  const { connected } = useWallet();
  const [step, setStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [config, setConfig] = useState<AgentConfig>({
    name: '',
    specialization: 'defi',
    initialBalance: '1.0',
    riskTolerance: 'medium',
    autoTrade: false,
  });

  const specializations = [
    {
      id: 'defi' as const,
      name: 'DeFi Trading',
      icon: '💱',
      description: 'Trade tokens and provide liquidity',
    },
    {
      id: 'nft' as const,
      name: 'NFT Trading',
      icon: '🖼️',
      description: 'Buy and sell NFTs for profit',
    },
    {
      id: 'yield' as const,
      name: 'Yield Farming',
      icon: '🌾',
      description: 'Optimize yield across protocols',
    },
    {
      id: 'research' as const,
      name: 'Market Research',
      icon: '🔍',
      description: 'Analyze markets and trends',
    },
    {
      id: 'custom' as const,
      name: 'Custom',
      icon: '⚙️',
      description: 'Build your own strategy',
    },
  ];

  const handleCreate = async () => {
    if (!config.name.trim()) {
      alert('Please enter an agent name');
      return;
    }

    const balance = parseFloat(config.initialBalance);
    if (isNaN(balance) || balance < 0.1) {
      alert('Minimum initial balance is 0.1 SOL');
      return;
    }

    setCreating(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      alert(`Agent "${config.name}" created successfully!`);
      router.push('/agents');
    } catch (error) {
      alert('Failed to create agent. Please try again.');
      console.error('Error creating agent:', error);
    } finally {
      setCreating(false);
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
            Please connect your wallet to create an agent
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

      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="mb-6">
          <Link
            href="/agents"
            className="text-primary hover:underline inline-flex items-center gap-2"
          >
            ← Back to Agents
          </Link>
        </div>

        <div className="bg-surface border border-border rounded-lg p-8">
          <h2 className="text-3xl font-bold mb-2">Create New Agent</h2>
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded ${
                  s <= step ? 'bg-primary' : 'bg-border'
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <div>
              <h3 className="text-2xl font-bold mb-2">Step 1: Basic Info</h3>
              <p className="text-gray-400 mb-8">
                Give your agent a name and purpose
              </p>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">Agent Name</label>
                <input
                  type="text"
                  placeholder="e.g., TraderBot Alpha"
                  value={config.name}
                  onChange={(e) => setConfig({ ...config, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 focus:border-primary outline-none"
                />
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold mb-4">
                  Specialization
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {specializations.map((spec) => (
                    <button
                      key={spec.id}
                      onClick={() =>
                        setConfig({ ...config, specialization: spec.id })
                      }
                      className={`border-2 rounded-lg p-4 text-left transition-colors ${
                        config.specialization === spec.id
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="text-3xl mb-2">{spec.icon}</div>
                      <div className="font-bold mb-1">{spec.name}</div>
                      <div className="text-xs text-gray-400">
                        {spec.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!config.name.trim()}
                className="w-full bg-primary text-black py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-2xl font-bold mb-2">Step 2: Configuration</h3>
              <p className="text-gray-400 mb-8">
                Set up your agent's parameters
              </p>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-2">
                  Initial Balance (SOL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  placeholder="1.0"
                  value={config.initialBalance}
                  onChange={(e) =>
                    setConfig({ ...config, initialBalance: e.target.value })
                  }
                  className="w-full bg-background border border-border rounded-lg px-4 py-3 focus:border-primary outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">Minimum: 0.1 SOL</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold mb-4">
                  Risk Tolerance
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {(['low', 'medium', 'high'] as const).map((risk) => (
                    <button
                      key={risk}
                      onClick={() => setConfig({ ...config, riskTolerance: risk })}
                      className={`border-2 rounded-lg py-3 font-bold transition-colors ${
                        config.riskTolerance === risk
                          ? 'border-primary bg-primary text-black'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {risk.charAt(0).toUpperCase() + risk.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-8">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.autoTrade}
                    onChange={(e) =>
                      setConfig({ ...config, autoTrade: e.target.checked })
                    }
                    className="mt-1 w-5 h-5 accent-primary"
                  />
                  <div>
                    <div className="font-bold">Enable Auto-Trading</div>
                    <div className="text-sm text-gray-400">
                      Agent will trade autonomously
                    </div>
                  </div>
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-border py-3 rounded-lg font-bold hover:border-primary transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-1 bg-primary text-black py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-2xl font-bold mb-2">Step 3: Review</h3>
              <p className="text-gray-400 mb-8">
                Confirm your agent configuration
              </p>

              <div className="bg-background border border-border rounded-lg p-6 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="border-b border-border pb-3">
                    <div className="text-sm text-gray-400 mb-1">Name</div>
                    <div className="font-bold">{config.name}</div>
                  </div>
                  <div className="border-b border-border pb-3">
                    <div className="text-sm text-gray-400 mb-1">
                      Specialization
                    </div>
                    <div className="font-bold">
                      {
                        specializations.find((s) => s.id === config.specialization)
                          ?.name
                      }
                    </div>
                  </div>
                  <div className="border-b border-border pb-3">
                    <div className="text-sm text-gray-400 mb-1">
                      Initial Balance
                    </div>
                    <div className="font-bold">{config.initialBalance} SOL</div>
                  </div>
                  <div className="border-b border-border pb-3">
                    <div className="text-sm text-gray-400 mb-1">
                      Risk Tolerance
                    </div>
                    <div className="font-bold">
                      {config.riskTolerance.charAt(0).toUpperCase() +
                        config.riskTolerance.slice(1)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-gray-400 mb-1">
                      Auto-Trading
                    </div>
                    <div className="font-bold">
                      {config.autoTrade ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500 rounded-lg p-4 mb-8">
                <div className="flex gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div className="text-sm text-yellow-500">
                    Your agent will have access to the specified SOL balance. Make
                    sure you understand the risks.
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(2)}
                  disabled={creating}
                  className="flex-1 border border-border py-3 rounded-lg font-bold hover:border-primary transition-colors disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 bg-primary text-black py-3 rounded-lg font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Agent'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
