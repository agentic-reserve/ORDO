# Solana Mobile Development Skill

## Overview
This skill provides comprehensive guidance on building mobile dApps for Solana using Mobile Wallet Adapter (MWA), publishing to the Solana dApp Store, and developing for Solana Mobile devices like Saga and Seeker.

## When to Use This Skill
- Building React Native dApps for Solana Mobile
- Integrating Mobile Wallet Adapter into mobile apps
- Publishing apps to the Solana dApp Store
- Developing for Saga and Seeker devices
- Creating cross-platform Solana mobile experiences
- Implementing wallet connections in mobile apps

## Core Concepts

### Mobile Wallet Adapter (MWA)
MWA is a protocol that enables secure communication between mobile dApps and wallet apps for transaction and message signing.

**Key Features**:
- Secure wallet connections on mobile devices
- Transaction and message signing
- Authorization persistence across sessions
- Cross-platform support (Android, iOS via web)
- Works with any MWA-compliant wallet

### Solana dApp Store
A crypto-friendly app store for Solana Mobile devices that uses NFTs for app publishing and distribution.

## React Native Development

### Installation

```bash
npm install @wallet-ui/react-native-web3js
```

Or with Yarn:

```bash
yarn add @wallet-ui/react-native-web3js
```

### Quick Start with Template

Use `create-solana-dapp` to bootstrap a Solana Mobile project:

```bash
npx create-solana-dapp@latest my-solana-mobile-app
```

Select options:
- Framework: React Native
- Template: Mobile Wallet Adapter
- Network: Devnet (for development)

### Basic Setup

#### 1. Wrap App with MobileWalletProvider

```tsx
// App.tsx
import React from 'react';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import { clusterApiUrl } from '@solana/web3.js';
import MainApp from './MainApp';

export default function App() {
  return (
    <MobileWalletProvider
      cluster={clusterApiUrl('devnet')}
      appIdentity={{
        name: 'My Solana dApp',
        uri: 'https://myapp.com',
        icon: 'https://myapp.com/icon.png',
      }}
      authorizationResultCache={{
        // Optional: Persist wallet connections
        get: async () => {
          // Load from AsyncStorage
        },
        set: async (authResult) => {
          // Save to AsyncStorage
        },
      }}
    >
      <MainApp />
    </MobileWalletProvider>
  );
}
```

#### 2. Use the useMobileWallet Hook

```tsx
// MainApp.tsx
import React from 'react';
import { View, Button, Text } from 'react-native';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { PublicKey, Transaction, SystemProgram } from '@solana/web3.js';

export default function MainApp() {
  const {
    connect,
    disconnect,
    signTransaction,
    signAndSendTransaction,
    publicKey,
    connected,
  } = useMobileWallet();

  const handleConnect = async () => {
    try {
      await connect();
      console.log('Connected to wallet:', publicKey?.toBase58());
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      console.log('Disconnected from wallet');
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const handleSendTransaction = async () => {
    if (!publicKey) return;

    try {
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey('RECIPIENT_ADDRESS'),
          lamports: 1000000, // 0.001 SOL
        })
      );

      const signature = await signAndSendTransaction(transaction);
      console.log('Transaction signature:', signature);
    } catch (error) {
      console.error('Transaction failed:', error);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <Text>Status: {connected ? 'Connected' : 'Disconnected'}</Text>
      {publicKey && <Text>Wallet: {publicKey.toBase58()}</Text>}
      
      {!connected ? (
        <Button title="Connect Wallet" onPress={handleConnect} />
      ) : (
        <>
          <Button title="Send Transaction" onPress={handleSendTransaction} />
          <Button title="Disconnect" onPress={handleDisconnect} />
        </>
      )}
    </View>
  );
}
```

### Advanced Usage

#### Sign Messages

```tsx
import { useMobileWallet } from '@wallet-ui/react-native-web3js';

function SignMessageComponent() {
  const { signMessage, publicKey } = useMobileWallet();

  const handleSignMessage = async () => {
    try {
      const message = new TextEncoder().encode('Hello Solana Mobile!');
      const signature = await signMessage(message);
      console.log('Message signature:', signature);
    } catch (error) {
      console.error('Signing failed:', error);
    }
  };

  return (
    <Button title="Sign Message" onPress={handleSignMessage} />
  );
}
```

#### Multiple Transactions

```tsx
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { Transaction } from '@solana/web3.js';

function MultipleTransactionsComponent() {
  const { signAllTransactions } = useMobileWallet();

  const handleSignMultiple = async () => {
    try {
      const tx1 = new Transaction().add(/* instruction 1 */);
      const tx2 = new Transaction().add(/* instruction 2 */);
      
      const signedTransactions = await signAllTransactions([tx1, tx2]);
      console.log('Signed transactions:', signedTransactions);
    } catch (error) {
      console.error('Signing failed:', error);
    }
  };

  return (
    <Button title="Sign Multiple" onPress={handleSignMultiple} />
  );
}
```

#### Caching Authorization

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';

const STORAGE_KEY = 'mwa-auth-cache';

function App() {
  return (
    <MobileWalletProvider
      cluster="devnet"
      appIdentity={{
        name: 'My App',
        uri: 'https://myapp.com',
        icon: 'https://myapp.com/icon.png',
      }}
      authorizationResultCache={{
        get: async () => {
          const cached = await AsyncStorage.getItem(STORAGE_KEY);
          return cached ? JSON.parse(cached) : null;
        },
        set: async (authResult) => {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(authResult));
        },
        clear: async () => {
          await AsyncStorage.removeItem(STORAGE_KEY);
        },
      }}
    >
      <MainApp />
    </MobileWalletProvider>
  );
}
```

## Anchor Program Integration

### Setup

```bash
npm install @coral-xyz/anchor
```

### Using Anchor Programs

```tsx
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor';
import { Connection } from '@solana/web3.js';
import idl from './idl.json';

function AnchorComponent() {
  const { publicKey, signTransaction } = useMobileWallet();

  const getProgram = () => {
    const connection = new Connection('https://api.devnet.solana.com');
    
    // Create a custom wallet adapter
    const wallet = {
      publicKey,
      signTransaction,
      signAllTransactions: async (txs) => {
        return Promise.all(txs.map(tx => signTransaction(tx)));
      },
    };

    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });

    return new Program(idl, provider);
  };

  const callAnchorMethod = async () => {
    try {
      const program = getProgram();
      
      // Call your Anchor program method
      const tx = await program.methods
        .initialize()
        .accounts({
          user: publicKey,
          systemProgram: web3.SystemProgram.programId,
        })
        .rpc();

      console.log('Transaction signature:', tx);
    } catch (error) {
      console.error('Anchor call failed:', error);
    }
  };

  return (
    <Button title="Call Anchor Program" onPress={callAnchorMethod} />
  );
}
```

## Kotlin/Android Development

### Installation

Add to your `build.gradle`:

```gradle
dependencies {
    implementation 'com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.0.0'
}
```

### Setup

```kotlin
import com.solana.mobilewalletadapter.clientlib.MobileWalletAdapter
import com.solana.mobilewalletadapter.clientlib.ConnectionIdentity

class MainActivity : AppCompatActivity() {
    private lateinit var mobileWalletAdapter: MobileWalletAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        val identity = ConnectionIdentity(
            identityUri = Uri.parse("https://myapp.com"),
            iconUri = Uri.parse("https://myapp.com/icon.png"),
            identityName = "My Solana App"
        )

        mobileWalletAdapter = MobileWalletAdapter(
            connectionIdentity = identity
        )
    }
}
```

### Connect to Wallet

```kotlin
suspend fun connectWallet() {
    try {
        val result = mobileWalletAdapter.transact { session ->
            session.authorize(
                identityUri = Uri.parse("https://myapp.com"),
                iconUri = Uri.parse("https://myapp.com/icon.png"),
                identityName = "My App"
            )
        }
        
        val publicKey = result.publicKey
        val authToken = result.authToken
        
        Log.d("MWA", "Connected: $publicKey")
    } catch (e: Exception) {
        Log.e("MWA", "Connection failed", e)
    }
}
```

### Sign Transaction

```kotlin
suspend fun signTransaction(transaction: ByteArray) {
    try {
        val result = mobileWalletAdapter.transact { session ->
            session.signTransactions(arrayOf(transaction))
        }
        
        val signedTx = result.signedPayloads[0]
        Log.d("MWA", "Transaction signed")
    } catch (e: Exception) {
        Log.e("MWA", "Signing failed", e)
    }
}
```

## Publishing to Solana dApp Store

### Prerequisites

1. **Signed APK**: Build and sign your Android app
2. **Solana Wallet**: With SOL for minting NFTs
3. **Publisher CLI**: Install publishing tools

### Installation

```bash
npm install -g @solana-mobile/dapp-store-cli
```

### Step 1: Build and Sign APK

#### For React Native (Expo)

```bash
# Build APK
eas build --platform android --profile production

# Download the APK
eas build:download
```

#### For Native Android

```bash
# Generate signing key
keytool -genkey -v -keystore my-release-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Build signed APK
./gradlew assembleRelease
```

### Step 2: Mint App NFT

First-time publishers need to mint an App NFT:

```bash
dapp-store create-app \
  --name "My Solana App" \
  --keypair ~/.config/solana/id.json
```

This returns an App NFT address. Save it for future updates.

### Step 3: Submit Release

```bash
dapp-store create-release \
  --app-mint <APP_NFT_ADDRESS> \
  --apk-path ./my-app.apk \
  --keypair ~/.config/solana/id.json
```

### Step 4: Complete Publisher Portal

1. Go to https://publish.solanamobile.com
2. Connect your wallet
3. Find your app submission
4. Complete metadata:
   - App description
   - Screenshots
   - Category
   - Contact information
5. Submit for review

### Publishing Updates

```bash
dapp-store create-release \
  --app-mint <APP_NFT_ADDRESS> \
  --apk-path ./my-app-v2.apk \
  --keypair ~/.config/solana/id.json
```

## Publishing Web Apps as PWA

### Step 1: Create PWA Wrapper

```bash
npx @bubblewrap/cli init \
  --manifest https://myapp.com/manifest.json
```

### Step 2: Build APK

```bash
npx @bubblewrap/cli build
```

### Step 3: Publish to dApp Store

Follow the same publishing steps as native apps.

## Detecting Seeker Users

### Method 1: User Agent Detection

```tsx
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

async function isSeekerDevice() {
  if (Platform.OS !== 'android') return false;
  
  const model = await DeviceInfo.getModel();
  return model.toLowerCase().includes('seeker');
}
```

### Method 2: Feature Detection

```tsx
import { NativeModules } from 'react-native';

function hasSeekerFeatures() {
  // Check for Seeker-specific features
  return NativeModules.SeekerModule !== undefined;
}
```

## Best Practices

### 1. Handle Connection States

```tsx
function WalletConnection() {
  const { connected, connecting, publicKey } = useMobileWallet();

  if (connecting) {
    return <ActivityIndicator />;
  }

  if (!connected) {
    return <ConnectButton />;
  }

  return <WalletInfo publicKey={publicKey} />;
}
```

### 2. Error Handling

```tsx
async function handleTransaction() {
  try {
    const signature = await signAndSendTransaction(transaction);
    Alert.alert('Success', `Transaction: ${signature}`);
  } catch (error) {
    if (error.message.includes('User rejected')) {
      Alert.alert('Cancelled', 'Transaction was cancelled');
    } else {
      Alert.alert('Error', error.message);
    }
  }
}
```

### 3. Transaction Confirmation

```tsx
import { Connection } from '@solana/web3.js';

async function confirmTransaction(signature: string) {
  const connection = new Connection('https://api.devnet.solana.com');
  
  const confirmation = await connection.confirmTransaction(
    signature,
    'confirmed'
  );

  if (confirmation.value.err) {
    throw new Error('Transaction failed');
  }

  return confirmation;
}
```

### 4. Network Selection

```tsx
import { clusterApiUrl } from '@solana/web3.js';

const NETWORKS = {
  mainnet: clusterApiUrl('mainnet-beta'),
  devnet: clusterApiUrl('devnet'),
  testnet: clusterApiUrl('testnet'),
};

function App() {
  const [network, setNetwork] = useState('devnet');

  return (
    <MobileWalletProvider cluster={NETWORKS[network]}>
      <NetworkSelector onSelect={setNetwork} />
      <MainApp />
    </MobileWalletProvider>
  );
}
```

### 5. Deep Linking to dApp Store

```tsx
import { Linking } from 'react-native';

function openInDAppStore(appId: string) {
  const url = `https://dappstore.solanamobile.com/app/${appId}`;
  Linking.openURL(url);
}
```

## Testing

### Test on Any Android Device

1. Install a compatible wallet (Phantom, Solflare)
2. Enable developer mode
3. Run your app:

```bash
npx react-native run-android
```

### Test with Emulator

```bash
# Start Android emulator
emulator -avd Pixel_5_API_31

# Run app
npx react-native run-android
```

## Ordo Mobile Integration Example

```tsx
// OrdomobileApp.tsx
import React from 'react';
import { View, Button, Text, StyleSheet } from 'react-native';
import { MobileWalletProvider, useMobileWallet } from '@wallet-ui/react-native-web3js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';
import agentRegistryIdl from './idl/agent_registry.json';

const AGENT_REGISTRY_PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID');

function AgentRegistryApp() {
  const { publicKey, signTransaction, connected, connect } = useMobileWallet();
  const [agents, setAgents] = React.useState([]);

  const getProgram = () => {
    const connection = new Connection('https://api.devnet.solana.com');
    const wallet = { publicKey, signTransaction };
    const provider = new AnchorProvider(connection, wallet, {});
    return new Program(agentRegistryIdl, provider);
  };

  const registerAgent = async (name: string, capabilities: string[]) => {
    try {
      const program = getProgram();
      
      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('agent'), publicKey.toBuffer()],
        AGENT_REGISTRY_PROGRAM_ID
      );

      const tx = await program.methods
        .registerAgent(name, capabilities)
        .accounts({
          agent: agentPda,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log('Agent registered:', tx);
      await fetchAgents();
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const program = getProgram();
      const agentAccounts = await program.account.agent.all();
      setAgents(agentAccounts);
    } catch (error) {
      console.error('Fetch failed:', error);
    }
  };

  React.useEffect(() => {
    if (connected) {
      fetchAgents();
    }
  }, [connected]);

  if (!connected) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Ordo Agent Registry</Text>
        <Button title="Connect Wallet" onPress={connect} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ordo Agent Registry</Text>
      <Text>Wallet: {publicKey.toBase58().slice(0, 8)}...</Text>
      
      <Button
        title="Register New Agent"
        onPress={() => registerAgent('Mobile Agent', ['trading', 'analysis'])}
      />

      <Text style={styles.subtitle}>Your Agents:</Text>
      {agents.map((agent, idx) => (
        <View key={idx} style={styles.agentCard}>
          <Text>{agent.account.name}</Text>
          <Text>Capabilities: {agent.account.capabilities.join(', ')}</Text>
        </View>
      ))}
    </View>
  );
}

export default function App() {
  return (
    <MobileWalletProvider
      cluster="devnet"
      appIdentity={{
        name: 'Ordo Mobile',
        uri: 'https://ordo.example.com',
        icon: 'https://ordo.example.com/icon.png',
      }}
    >
      <AgentRegistryApp />
    </MobileWalletProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  agentCard: {
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginBottom: 10,
  },
});
```

## Resources

- [Solana Mobile Docs](https://docs.solanamobile.com)
- [Mobile Wallet Adapter Spec](https://github.com/solana-mobile/mobile-wallet-adapter)
- [dApp Store Publisher Portal](https://publish.solanamobile.com)
- [Sample Apps](https://github.com/solana-mobile/solana-mobile-stack-sdk)
- [Discord Community](https://discord.gg/solanamobile)

## Common Issues

### Issue: Wallet Not Found

**Solution**: Ensure a compatible wallet is installed:
```tsx
const { wallets } = useMobileWallet();
if (wallets.length === 0) {
  Alert.alert('No Wallet', 'Please install a Solana wallet app');
}
```

### Issue: Transaction Timeout

**Solution**: Increase timeout and add retry logic:
```tsx
const connection = new Connection(RPC_URL, {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});
```

### Issue: Authorization Expired

**Solution**: Re-authorize when needed:
```tsx
try {
  await signTransaction(tx);
} catch (error) {
  if (error.message.includes('authorization')) {
    await connect(); // Re-authorize
  }
}
```

## Conclusion

Solana Mobile provides a powerful platform for building mobile-first crypto experiences. Use Mobile Wallet Adapter for seamless wallet integration and publish to the dApp Store to reach Solana Mobile users.
