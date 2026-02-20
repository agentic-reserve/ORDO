## Mobile Wallet Adapter Integration

Enable Ordo agents to interact with mobile wallet apps on Android devices using the Mobile Wallet Adapter (MWA) protocol.

### Overview

Mobile Wallet Adapter is a protocol that allows dApps to connect with mobile wallet apps (like Phantom, Solflare, etc.) for transaction and message signing on Android devices. This integration enables Ordo agents to:

- Request wallet authorization from users
- Sign transactions via mobile wallets
- Sign messages for authentication
- Transfer SOL and tokens
- Manage wallet sessions with auth tokens

### Installation

The required packages are already installed:

```bash
npm install @solana-mobile/mobile-wallet-adapter-protocol @solana-mobile/mobile-wallet-adapter-protocol-web3js
```

### Quick Start

```typescript
import {
  authorizeAgentWallet,
  signAndSendTransactionWithMobileWallet,
  getWalletBalance,
} from "./skills/mobile-wallet-adapter/index.js";
import { SystemProgram, Transaction, PublicKey } from "@solana/web3.js";

// 1. Authorize agent with mobile wallet
const session = await authorizeAgentWallet(agent, "devnet");
console.log("Authorized wallet:", session.publicKey.toBase58());

// 2. Check wallet balance
const balance = await getWalletBalance(agent, "devnet");
console.log("Wallet balance:", balance, "SOL");

// 3. Create and sign a transaction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: session.publicKey,
    toPubkey: new PublicKey("..."),
    lamports: 1000000, // 0.001 SOL
  })
);

const signature = await signAndSendTransactionWithMobileWallet(
  agent,
  transaction,
  "devnet"
);
console.log("Transaction sent:", signature);
```

### Core Features

#### 1. Wallet Authorization

```typescript
import { authorizeAgentWallet } from "./skills/mobile-wallet-adapter/index.js";

// Opens wallet selector on Android device
const session = await authorizeAgentWallet(agent, "devnet");

// Session contains:
// - publicKey: The authorized wallet's public key
// - authToken: Token for reauthorization
// - accountLabel: Wallet account name
// - walletUriBase: Wallet app URI
```

#### 2. Session Management

```typescript
import {
  hasActiveWalletSession,
  getAgentWalletSession,
  reauthorizeAgentWallet,
} from "./skills/mobile-wallet-adapter/index.js";

// Check if agent has active session
if (hasActiveWalletSession(agent)) {
  const session = getAgentWalletSession(agent);
  console.log("Active wallet:", session.publicKey.toBase58());
}

// Reauthorize without user interaction
const newSession = await reauthorizeAgentWallet(agent, "devnet");
```

#### 3. Transaction Signing

```typescript
import {
  signTransactionWithMobileWallet,
  signAndSendTransactionWithMobileWallet,
} from "./skills/mobile-wallet-adapter/index.js";

// Sign only (doesn't send)
const { signedTransaction, signature } = await signTransactionWithMobileWallet(
  agent,
  transaction,
  "devnet"
);

// Sign and send in one step
const txSignature = await signAndSendTransactionWithMobileWallet(
  agent,
  transaction,
  "devnet"
);
```

#### 4. Message Signing

```typescript
import { signMessageWithMobileWallet } from "./skills/mobile-wallet-adapter/index.js";

// Sign a message for authentication
const message = "Authenticate agent: " + agent.id;
const signature = await signMessageWithMobileWallet(agent, message, "devnet");

// Verify signature
import { sign } from "tweetnacl";
const isValid = sign.detached.verify(
  new TextEncoder().encode(message),
  signature,
  session.publicKey.toBytes()
);
```

#### 5. SOL Transfers

```typescript
import { transferSOLWithMobileWallet } from "./skills/mobile-wallet-adapter/index.js";

// Transfer SOL to another address
const signature = await transferSOLWithMobileWallet(
  agent,
  new PublicKey("recipient-address"),
  0.1, // 0.1 SOL
  "devnet"
);
```

### API Reference

#### Client Functions

##### `createMWAClient(rpcUrl, config)`

Create a Mobile Wallet Adapter client.

**Parameters:**
- `rpcUrl` (string): Solana RPC endpoint
- `config` (MWAClientConfig): Client configuration
  - `cluster`: "mainnet-beta" | "devnet" | "testnet"
  - `appIdentity`: App identity shown in wallet
    - `name`: App name
    - `uri`: App website
    - `icon`: App icon URL

**Returns:** `MobileWalletAdapterClient`

#### Agent Integration Functions

##### `authorizeAgentWallet(agent, cluster?)`

Authorize agent with a mobile wallet. Opens wallet selector on device.

**Parameters:**
- `agent` (Agent): The agent requesting authorization
- `cluster` (string, optional): Network cluster (default: "devnet")

**Returns:** `Promise<AgentWalletSession>`

##### `reauthorizeAgentWallet(agent, cluster?)`

Reauthorize using stored auth token (no user interaction).

**Parameters:**
- `agent` (Agent): The agent to reauthorize
- `cluster` (string, optional): Network cluster

**Returns:** `Promise<AgentWalletSession>`

##### `hasActiveWalletSession(agent)`

Check if agent has an active wallet session.

**Parameters:**
- `agent` (Agent): The agent to check

**Returns:** `boolean`

##### `getAgentWalletSession(agent)`

Get agent's current wallet session.

**Parameters:**
- `agent` (Agent): The agent

**Returns:** `AgentWalletSession | undefined`

##### `signTransactionWithMobileWallet(agent, transaction, cluster?)`

Sign a transaction with mobile wallet.

**Parameters:**
- `agent` (Agent): The agent
- `transaction` (Transaction | VersionedTransaction): Transaction to sign
- `cluster` (string, optional): Network cluster

**Returns:** `Promise<MWASignTransactionResult>`

##### `signAndSendTransactionWithMobileWallet(agent, transaction, cluster?)`

Sign and send a transaction with mobile wallet.

**Parameters:**
- `agent` (Agent): The agent
- `transaction` (Transaction | VersionedTransaction): Transaction to sign and send
- `cluster` (string, optional): Network cluster

**Returns:** `Promise<string>` - Transaction signature

##### `signMessageWithMobileWallet(agent, message, cluster?)`

Sign a message with mobile wallet.

**Parameters:**
- `agent` (Agent): The agent
- `message` (string | Uint8Array): Message to sign
- `cluster` (string, optional): Network cluster

**Returns:** `Promise<Uint8Array>` - Signature bytes

##### `transferSOLWithMobileWallet(agent, toPublicKey, amountSOL, cluster?)`

Transfer SOL using mobile wallet.

**Parameters:**
- `agent` (Agent): The agent
- `toPublicKey` (PublicKey): Recipient address
- `amountSOL` (number): Amount in SOL
- `cluster` (string, optional): Network cluster

**Returns:** `Promise<string>` - Transaction signature

##### `getWalletBalance(agent, cluster?)`

Get wallet balance.

**Parameters:**
- `agent` (Agent): The agent
- `cluster` (string, optional): Network cluster

**Returns:** `Promise<number>` - Balance in SOL

##### `deauthorizeAgentWallet(agent, cluster?)`

Deauthorize wallet session.

**Parameters:**
- `agent` (Agent): The agent
- `cluster` (string, optional): Network cluster

**Returns:** `Promise<void>`

### Integration with Ordo

#### Economic System

All MWA transactions are automatically tracked:

```typescript
// Transaction costs tracked automatically
await signAndSendTransactionWithMobileWallet(agent, transaction);

// Cost record created:
{
  type: "transaction",
  cost: 0.000005, // SOL
  metadata: {
    signature: "...",
    cluster: "devnet",
    method: "mobile_wallet_adapter"
  }
}
```

#### Agent Lifecycle

- Wallet sessions persist across agent operations
- Sessions expire after 7 days (can be reauthorized)
- Sessions stored in memory (should be persisted to database in production)

#### Multi-Agent Coordination

- Each agent can have its own wallet session
- Agents can transfer SOL between their wallets
- Shared wallet strategies for swarm operations

### Platform Support

#### Android

✅ **Fully Supported**
- Saga phone (native support)
- Any Android device with MWA-compatible wallet installed

#### iOS

❌ **Not Supported**
- MWA is Android-only
- Use Wallet Standard for web/iOS

#### Web

⚠️ **Limited Support**
- Use Mobile Wallet Standard for web apps
- See: `@solana-mobile/wallet-adapter-mobile`

### Security Considerations

1. **Auth Token Storage**: Store auth tokens securely (encrypted database)
2. **Session Expiration**: Sessions expire after 7 days
3. **User Approval**: All transactions require user approval in wallet app
4. **Network Validation**: Always verify cluster matches expected network
5. **Transaction Verification**: Verify transaction details before signing

### Testing

#### On Android Device

1. Install a MWA-compatible wallet (Phantom, Solflare, etc.)
2. Run your Ordo agent on Android device or emulator
3. Call `authorizeAgentWallet()` - wallet selector will appear
4. Approve authorization in wallet app
5. Agent can now sign transactions

#### Testing Without Device

For development without Android device:

```typescript
// Mock wallet session for testing
import { clearAllWalletSessions } from "./skills/mobile-wallet-adapter/index.js";

// Clear sessions between tests
clearAllWalletSessions();
```

### Common Use Cases

#### 1. Agent Authentication

```typescript
// Sign a message to prove agent identity
const message = `Authenticate ${agent.name} at ${new Date().toISOString()}`;
const signature = await signMessageWithMobileWallet(agent, message);

// Send signature to server for verification
await fetch("/api/auth", {
  method: "POST",
  body: JSON.stringify({
    agentId: agent.id,
    message,
    signature: Buffer.from(signature).toString("base64"),
    publicKey: session.publicKey.toBase58(),
  }),
});
```

#### 2. Agent-to-Agent Payments

```typescript
// Agent A pays Agent B for a service
const agentASession = await authorizeAgentWallet(agentA);
const agentBSession = await authorizeAgentWallet(agentB);

// Transfer payment
await transferSOLWithMobileWallet(
  agentA,
  agentBSession.publicKey,
  0.1, // 0.1 SOL payment
  "devnet"
);
```

#### 3. DeFi Operations

```typescript
// Agent swaps tokens via Jupiter
import { createJupiterSwapTransaction } from "./defi/jupiter.js";

const swapTx = await createJupiterSwapTransaction({
  inputMint: "SOL",
  outputMint: "USDC",
  amount: 1000000,
  slippage: 50,
});

// Sign with mobile wallet
const signature = await signAndSendTransactionWithMobileWallet(
  agent,
  swapTx,
  "mainnet-beta"
);
```

### Troubleshooting

#### "No wallet apps found"

- Install a MWA-compatible wallet (Phantom, Solflare)
- Ensure wallet app is updated to latest version

#### "Authorization failed"

- Check that app is running on Android device
- Verify wallet app is properly installed
- Try restarting wallet app

#### "Session expired"

- Call `reauthorizeAgentWallet()` to refresh session
- If reauth fails, call `authorizeAgentWallet()` again

#### "Transaction failed"

- Check wallet has sufficient balance
- Verify network cluster is correct
- Check transaction is properly formatted

### Best Practices

1. **Session Management**
   - Store auth tokens securely
   - Implement session refresh logic
   - Handle session expiration gracefully

2. **User Experience**
   - Show clear transaction details
   - Provide feedback during signing
   - Handle wallet app switching smoothly

3. **Error Handling**
   - Catch and handle authorization errors
   - Retry failed transactions appropriately
   - Log errors for debugging

4. **Security**
   - Never store private keys
   - Validate all transaction data
   - Use appropriate network (mainnet vs devnet)

### Future Enhancements

- [ ] Persistent session storage in database
- [ ] Multi-signature support
- [ ] Batch transaction signing
- [ ] Transaction simulation before signing
- [ ] Wallet app preference management
- [ ] Session analytics and monitoring

### Resources

- [MWA Documentation](https://docs.solanamobile.com/get-started/mobile-wallet-adapter)
- [MWA Protocol Spec](https://github.com/solana-mobile/mobile-wallet-adapter)
- [Solana Mobile Stack](https://solanamobile.com)
- [Sample Apps](https://github.com/solana-mobile/solana-mobile-stack-sdk)
