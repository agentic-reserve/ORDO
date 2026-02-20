'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface Settings {
  notifications: boolean;
  autoRefresh: boolean;
  darkMode: boolean;
  analytics: boolean;
  rpcEndpoint: 'mainnet' | 'devnet' | 'custom';
}

export default function SettingsPage() {
  const { connected } = useWallet();
  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    autoRefresh: true,
    darkMode: true,
    analytics: true,
    rpcEndpoint: 'mainnet',
  });

  useEffect(() => {
    // Load settings from localStorage
    const saved = localStorage.getItem('ordo-settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('ordo-settings', JSON.stringify(newSettings));
  };

  const handleClearCache = () => {
    if (confirm('This will clear all cached data. Continue?')) {
      localStorage.clear();
      alert('Cache cleared successfully');
    }
  };

  const handleResetSettings = () => {
    if (confirm('This will reset all settings to defaults. Continue?')) {
      const defaultSettings: Settings = {
        notifications: true,
        autoRefresh: true,
        darkMode: true,
        analytics: true,
        rpcEndpoint: 'mainnet',
      };
      setSettings(defaultSettings);
      localStorage.setItem('ordo-settings', JSON.stringify(defaultSettings));
      alert('Settings reset to defaults');
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
            Please connect your wallet to access settings
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
            href="/"
            className="text-primary hover:underline inline-flex items-center gap-2"
          >
            ← Back to Home
          </Link>
        </div>

        <h2 className="text-3xl font-bold mb-8">Settings</h2>

        {/* General Settings */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-primary mb-6">GENERAL</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold">Push Notifications</div>
                <div className="text-sm text-gray-400">
                  Receive alerts about agent activity
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) =>
                    updateSetting('notifications', e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold">Auto Refresh</div>
                <div className="text-sm text-gray-400">
                  Automatically refresh agent data
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoRefresh}
                  onChange={(e) => updateSetting('autoRefresh', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold">Dark Mode</div>
                <div className="text-sm text-gray-400">
                  Use dark theme (recommended)
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={(e) => updateSetting('darkMode', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Network Settings */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-primary mb-6">NETWORK</h3>
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold">RPC Endpoint</div>
              <div className="text-sm text-gray-400">
                Current: {settings.rpcEndpoint}
              </div>
            </div>
            <button
              onClick={() => alert('RPC endpoint selection coming soon')}
              className="px-4 py-2 bg-primary text-black rounded-lg font-bold hover:bg-primary/90 transition-colors"
            >
              Change
            </button>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-primary mb-6">PRIVACY</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-bold">Analytics</div>
                <div className="text-sm text-gray-400">
                  Help improve the app with usage data
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.analytics}
                  onChange={(e) => updateSetting('analytics', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <button
              onClick={() => window.open('https://ordo.example.com/privacy', '_blank')}
              className="w-full flex justify-between items-center py-3 hover:text-primary transition-colors"
            >
              <div>
                <div className="font-bold text-left">Privacy Policy</div>
                <div className="text-sm text-gray-400 text-left">
                  View our privacy policy
                </div>
              </div>
              <div className="text-2xl">›</div>
            </button>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-primary mb-6">DATA</h3>
          <div className="space-y-4">
            <button
              onClick={handleClearCache}
              className="w-full flex justify-between items-center py-3 hover:text-primary transition-colors"
            >
              <div>
                <div className="font-bold text-left">Clear Cache</div>
                <div className="text-sm text-gray-400 text-left">
                  Free up storage space
                </div>
              </div>
              <div className="text-2xl">›</div>
            </button>

            <button
              onClick={() => alert('Data export coming soon')}
              className="w-full flex justify-between items-center py-3 hover:text-primary transition-colors"
            >
              <div>
                <div className="font-bold text-left">Export Data</div>
                <div className="text-sm text-gray-400 text-left">
                  Download your agent data
                </div>
              </div>
              <div className="text-2xl">›</div>
            </button>
          </div>
        </div>

        {/* About */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-6">
          <h3 className="text-xl font-bold text-primary mb-6">ABOUT</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <div className="text-gray-400">Version</div>
              <div className="font-bold">1.0.0</div>
            </div>
            <div className="flex justify-between items-center py-2">
              <div className="text-gray-400">Build</div>
              <div className="font-bold">2024.02.20</div>
            </div>

            <button
              onClick={() => window.open('https://ordo.example.com/terms', '_blank')}
              className="w-full flex justify-between items-center py-3 hover:text-primary transition-colors"
            >
              <div>
                <div className="font-bold text-left">Terms of Service</div>
                <div className="text-sm text-gray-400 text-left">
                  View terms and conditions
                </div>
              </div>
              <div className="text-2xl">›</div>
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-surface border border-red-500/20 rounded-lg p-6">
          <h3 className="text-xl font-bold text-red-500 mb-6">DANGER ZONE</h3>
          <div className="space-y-4">
            <button
              onClick={handleResetSettings}
              className="w-full flex justify-between items-center py-3 text-red-500 hover:text-red-400 transition-colors"
            >
              <div>
                <div className="font-bold text-left">Reset Settings</div>
                <div className="text-sm text-gray-400 text-left">
                  Restore default settings
                </div>
              </div>
              <div className="text-2xl">›</div>
            </button>

            <button
              onClick={() => {
                if (
                  confirm(
                    'This action cannot be undone. All local data will be permanently deleted.'
                  )
                ) {
                  alert('This feature will be available soon');
                }
              }}
              className="w-full flex justify-between items-center py-3 text-red-500 hover:text-red-400 transition-colors"
            >
              <div>
                <div className="font-bold text-left">Delete All Data</div>
                <div className="text-sm text-gray-400 text-left">
                  Permanently delete all local data
                </div>
              </div>
              <div className="text-2xl">›</div>
            </button>
          </div>
        </div>

        <div className="text-center mt-12 text-gray-400">
          <p>Made with ❤️ for the Solana ecosystem</p>
          <p className="mt-2">Powered by Ordo Agent Framework</p>
        </div>
      </main>
    </div>
  );
}
