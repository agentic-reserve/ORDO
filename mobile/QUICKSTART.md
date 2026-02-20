# Ordo Mobile - Quick Start Guide

Get up and running with Ordo Mobile in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Android device or emulator
- Phantom or Solflare mobile wallet

## Step 1: Install Dependencies

```bash
cd mobile
npm install
```

## Step 2: Start Development Server

```bash
npm start
```

This will open Expo Dev Tools in your browser.

## Step 3: Run on Your Device

### Option A: Physical Device (Recommended for Seeker)

1. Install Expo Go from Play Store
2. Scan QR code from Expo Dev Tools
3. App will load on your device

### Option B: Android Emulator

```bash
npm run android
```

## Step 4: Connect Wallet

1. Open the app
2. Tap "Connect Wallet"
3. Select your wallet (Phantom/Solflare)
4. Approve connection

## Step 5: Verify Seeker (If on Seeker Device)

1. App automatically detects Seeker
2. Tap the green Seeker badge
3. Tap "Verify with Wallet"
4. Approve in wallet
5. SGT verification completes

## That's It!

You're now ready to manage AI agents on Solana Mobile!

## Next Steps

- Explore Seeker benefits
- Create your first agent
- Connect to Ordo backend
- Start trading

## Troubleshooting

### App won't load
- Check Node.js version: `node --version` (should be 18+)
- Clear cache: `npm start -- --clear`

### Wallet won't connect
- Ensure wallet app is installed
- Update wallet to latest version
- Restart wallet app

### Seeker not detected
- Verify you're on a Seeker device
- Restart the app
- Check Platform.constants

## Need Help?

- [Full Documentation](./README.md)
- [Discord Community](https://discord.gg/ordo)
- [GitHub Issues](https://github.com/ordo/ordo/issues)
