# Ordo Mobile

React Native mobile app for managing AI agents on Solana Mobile devices.

## Features

### ✅ Implemented

- **Seeker Device Detection** - Automatic detection of Solana Seeker phones
- **Seeker Genesis Token Verification** - On-chain verification of Seeker ownership
- **Mobile Wallet Adapter Integration** - Connect to Phantom, Solflare, and other mobile wallets
- **Wallet Connection** - Secure wallet authorization and session management
- **Transaction Signing** - Sign transactions via mobile wallet
- **Message Signing** - Sign messages for authentication
- **Seeker Benefits Screen** - Exclusive benefits for Seeker owners
- **Home Screen** - Main dashboard with quick actions
- **Navigation** - Stack navigation between screens

### 🚧 Coming Soon

- Agent list and management
- Agent creation wizard
- Agent detail view with metrics
- Real-time agent monitoring
- DeFi operations interface
- Settings and preferences
- Push notifications
- Offline mode

## Platform Support

| Platform | Status | Notes |
|----------|--------|-------|
| Android | ✅ Full Support | Optimized for Seeker |
| iOS | ⚠️ Limited | No MWA support |
| Web | ⚠️ Limited | Via Expo web |

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development)

## Installation

```bash
cd mobile
npm install
```

## Development

### Start Development Server

```bash
npm start
```

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

### Run on Web

```bash
npm run web
```

## Building for Production

### Android APK (for testing)

```bash
npm run build:apk
```

### Android AAB (for Play Store/dApp Store)

```bash
npm run build:android
```

## Publishing to Solana dApp Store

1. Build signed APK/AAB
2. Create app listing on [Solana dApp Publisher Portal](https://publish.solanamobile.com)
3. Upload APK/AAB
4. Submit for review

See [Publishing Guide](../docs/mobile-publishing.md) for detailed instructions.

## Project Structure

```
mobile/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
└── src/
    ├── screens/           # Screen components
    │   ├── HomeScreen.tsx
    │   ├── AgentListScreen.tsx
    │   ├── AgentDetailScreen.tsx
    │   ├── CreateAgentScreen.tsx
    │   ├── WalletConnectScreen.tsx
    │   ├── SettingsScreen.tsx
    │   └── SeekerBenefitsScreen.tsx
    ├── utils/             # Utility functions
    │   ├── seekerDetection.ts
    │   └── mobileWallet.ts
    └── components/        # Reusable components (coming soon)
```

## Seeker Device Detection

### Method 1: Platform Constants (Quick Check)

```typescript
import { isSeeker, getSeekerDeviceDetails } from './utils/seekerDetection';

// Quick boolean check
if (isSeeker()) {
  console.log('Running on Seeker!');
}

// Get device details
const details = getSeekerDeviceDetails();
console.log(details.model); // "Seeker"
console.log(details.manufacturer); // "Solana Mobile Inc."
```

### Method 2: Genesis Token Verification (Secure)

```typescript
import { detectSeeker, verifySeekerGenesisToken } from './utils/seekerDetection';
import { Connection, PublicKey } from '@solana/web3.js';

// Comprehensive detection with optional on-chain verification
const connection = new Connection('https://api.mainnet-beta.solana.com');
const walletAddress = new PublicKey('...');

const deviceInfo = await detectSeeker(walletAddress, connection);

if (deviceInfo.verified) {
  console.log('Verified Seeker owner!');
}
```

### React Hook

```typescript
import { useSeekerDetection } from './utils/seekerDetection';

function MyComponent() {
  const { isSeeker, isVerified, verifyWithWallet } = useSeekerDetection();

  return (
    <View>
      {isSeeker && <Text>Seeker Device Detected!</Text>}
      {!isVerified && (
        <Button 
          title="Verify Ownership" 
          onPress={() => verifyWithWallet(wallet, connection)}
        />
      )}
    </View>
  );
}
```

## Mobile Wallet Adapter

### Connect Wallet

```typescript
import { connectWallet } from './utils/mobileWallet';

const session = await connectWallet({
  cluster: 'mainnet-beta',
  appIdentity: {
    name: 'Ordo Mobile',
    uri: 'https://ordo.ai',
    icon: 'https://ordo.ai/icon.png',
  },
});

console.log('Connected:', session.publicKey.toBase58());
```

### Sign Transaction

```typescript
import { signTransaction } from './utils/mobileWallet';
import { Transaction, SystemProgram } from '@solana/web3.js';

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: session.publicKey,
    toPubkey: recipientPublicKey,
    lamports: 1000000,
  })
);

const signedTx = await signTransaction(transaction, session.authToken);
```

### Sign and Send

```typescript
import { signAndSendTransaction } from './utils/mobileWallet';

const signature = await signAndSendTransaction(transaction, session.authToken);
console.log('Transaction sent:', signature);
```

## Seeker Benefits

Seeker device owners get exclusive benefits:

- ⚡ **Priority Access** - Early access to new features
- 💎 **Reduced Fees** - 50% reduced transaction fees
- 🎁 **Exclusive Rewards** - Bonus rewards for activities
- 🚀 **Enhanced Performance** - Optimized for Seeker hardware
- 👥 **Community Access** - Exclusive community and events

## Configuration

### Environment Variables

Create `.env` file:

```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_CLUSTER=mainnet-beta
```

### App Identity

Update in `src/utils/mobileWallet.ts`:

```typescript
const DEFAULT_CONFIG: MobileWalletConfig = {
  cluster: 'mainnet-beta',
  appIdentity: {
    name: 'Your App Name',
    uri: 'https://yourapp.com',
    icon: 'https://yourapp.com/icon.png',
  },
};
```

## Testing

### On Seeker Device

1. Install Phantom or Solflare mobile wallet
2. Run `npm run android`
3. App will detect Seeker automatically
4. Connect wallet to verify SGT ownership

### On Regular Android Device

1. App will work but won't show Seeker benefits
2. All wallet features work normally

### On iOS

1. Limited functionality (no MWA)
2. Use for UI testing only

## Troubleshooting

### "No wallet apps found"

- Install Phantom or Solflare mobile wallet
- Ensure wallet app is updated

### "Authorization failed"

- Check wallet app is running
- Try restarting wallet app
- Ensure app permissions are granted

### "Seeker not detected"

- Verify you're on a Seeker device
- Check Platform.constants.Model === 'Seeker'
- Try restarting the app

## Performance Optimization

### For Seeker Devices

- Hardware-accelerated rendering enabled
- Optimized transaction signing
- Reduced network calls
- Efficient state management

### General

- React Navigation for smooth transitions
- Zustand for lightweight state management
- Memoized components
- Lazy loading for screens

## Security

- Private keys never leave wallet app
- All transactions require user approval
- Secure session management
- No sensitive data in logs
- HTTPS only for API calls

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md)

## License

MIT

## Resources

- [Solana Mobile Docs](https://docs.solanamobile.com)
- [Mobile Wallet Adapter](https://docs.solanamobile.com/get-started/mobile-wallet-adapter)
- [Seeker Device](https://solanamobile.com/seeker)
- [dApp Store](https://dappstore.solanamobile.com)
- [Expo Documentation](https://docs.expo.dev)

## Support

- Discord: [Ordo Community](https://discord.gg/ordo)
- Twitter: [@OrdoAI](https://twitter.com/ordoai)
- Email: support@ordo.ai
