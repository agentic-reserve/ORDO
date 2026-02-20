# Mobile Wallet Adapter (MWA) Integration - Summary

## Overview

Successfully integrated **Mobile Wallet Adapter (MWA)** protocol into the Ordo platform, enabling agents to interact with mobile wallet apps on Android devices for transaction and message signing.

## What is Mobile Wallet Adapter?

Mobile Wallet Adapter is a protocol specification that enables dApps to connect with mobile wallet apps (Phantom, Solflare, etc.) on Android devices. It provides a secure communication channel for:

- Wallet authorization and session management
- Transaction signing with user approval
- Message signing for authentication
- Multi-transaction batch signing

## Packages Used

**@solana-mobile/mobile-wallet-adapter-protocol** - Core MWA protocol implementation
- Protocol: Mobile Wallet Adapter v1.0
- Platform: Android only
- Features: Authorization, transaction signing, message signing

**@solana-mobile/mobile-wallet-adapter-protocol-web3js** - Web3.js integration
- Provides Web3.js-compatible transaction types
- Seamless integration with @solana/web3.js
- TypeScript support

## Files Created

### 1. Core Client (`src/skills/mobile-wallet-adapter/client.ts`)

**MobileWalletAdapterClient class** - Low-level MWA protocol wrapper

Key methods:
- `authorize()` - Request wallet authorization (opens wallet selector)
- `reauthorize(authToken)` - Reauthorize without user interaction
- `signTransaction(tx, authToken?)` - Sign a single transaction
- `signTransactions(txs, authToken?)` - Batch sign multiple transactions
- `signAndSendTransaction(tx, authToken?)` - Sign and send in one step
- `signMessage(message, authToken?)` - Sign arbitrary message
- `deauthorize(authToken)` - End wallet session

### 2. Agent Integration (`src/skills/mobile-wallet-adapter/agent-integration.ts`)

High-level functions for agent use:

**Session Management:**
- `authorizeAgentWallet(agent, cluster)` - Authorize agent with mobile wallet
- `reauthorizeAgentWallet(agent, cluster)` - Refresh session with auth token
- `hasActiveWalletSession(agent)` - Check if agent has active session
- `getAgentWalletSession(agent)` - Get agent's current session
- `deauthorizeAgentWallet(agent, cluster)` - End wallet session

**Transaction Operations:**
- `signTransactionWithMobileWallet(agent, tx, cluster)` - Sign transaction
- `signAndSendTransactionWithMobileWallet(agent, tx, cluster)` - Sign and send
- `transferSOLWithMobileWallet(agent, to, amount, cluster)` - Transfer SOL

**Other Operations:**
- `signMessageWithMobileWallet(agent, message, cluster)` - Sign message
- `getWalletBalance(agent, cluster)` - Get wallet balance

### 3. Module Exports (`src/skills/mobile-wallet-adapter/index.ts`)

Clean exports for easy importing

### 4. Documentation (`src/skills/mobile-wallet-adapter/README.md`)

Comprehensive documentation including:
- Quick start guide
- API reference
- Usage examples
- Security considerations
- Troubleshooting guide
- Best practices

### 5. Tests (`src/skills/mobile-wallet-adapter/mwa-integration.test.ts`)

Test suite covering:
- Client creation
- Session management
- Authorization flow
- Transaction signing
- Message signing
- Network support
- Multi-agent sessions

## Key Features

### For Agents

1. **Wallet Authorization**
   - Opens wallet selector on Android device
   - User approves agent access
   - Returns public key and auth token
   - Session persists for 7 days

2. **Transaction Signing**
   - Sign transactions via mobile wallet
   - User approves each transaction
   - Automatic cost tracking
   - Support for versioned transactions

3. **Message Signing**
   - Sign arbitrary messages
   - Useful for authentication
   - Ed25519 signatures
   - Verify with public key

4. **Session Management**
   - Auth tokens for reauthorization
   - No repeated user approval needed
   - Automatic session expiration
   - Secure token storage

### Platform Support

✅ **Android**
- Saga phone (native MWA support)
- Any Android device with MWA wallet installed
- Android emulator for testing

❌ **iOS**
- MWA is Android-only protocol
- Use Wallet Standard for iOS/web

⚠️ **Web**
- Limited support via Mobile Wallet Standard
- Requires different integration approach

## Integration with Ordo

### Economic System

All MWA transactions automatically tracked:

```typescript
// Transaction sent via MWA
await signAndSendTransactionWithMobileWallet(agent, transaction);

// Cost automatically recorded:
{
  type: "transaction",
  cost: 0.000005, // SOL (tx fee)
  metadata: {
    signature: "...",
    cluster: "devnet",
    method: "mobile_wallet_adapter"
  }
}
```

### Agent Lifecycle

- Wallet sessions persist across agent operations
- Sessions stored in memory (should be persisted to database)
- Sessions expire after 7 days
- Agents can have multiple wallet sessions (different networks)

### Multi-Agent Coordination

- Each agent maintains independent wallet session
- Agents can transfer SOL between wallets
- Shared wallet strategies for swarm operations
- Collaborative transaction signing

## Usage Examples

### Example 1: Agent Authorization

```typescript
import { authorizeAgentWallet } from "./skills/mobile-wallet-adapter/index.js";

// Opens wallet selector on Android device
const session = await authorizeAgentWallet(agent, "devnet");

console.log("Authorized wallet:", session.publicKey.toBase58());
console.log("Auth token:", session.authToken);
console.log("Wallet app:", session.walletUriBase);
```

### Example 2: Sign and Send Transaction

```typescript
import {
  signAndSendTransactionWithMobileWallet,
  getAgentWalletSession,
} from "./skills/mobile-wallet-adapter/index.js";
import { SystemProgram, Transaction } from "@solana/web3.js";

// Get agent's wallet session
const session = getAgentWalletSession(agent);

// Create transfer transaction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: session.publicKey,
    toPubkey: recipientPublicKey,
    lamports: 1000000, // 0.001 SOL
  })
);

// Sign and send via mobile wallet
const signature = await signAndSendTransactionWithMobileWallet(
  agent,
  transaction,
  "devnet"
);

console.log("Transaction sent:", signature);
```

### Example 3: Message Signing for Authentication

```typescript
import { signMessageWithMobileWallet } from "./skills/mobile-wallet-adapter/index.js";

// Create authentication message
const message = `Authenticate ${agent.name} at ${new Date().toISOString()}`;

// Sign with mobile wallet
const signature = await signMessageWithMobileWallet(agent, message, "devnet");

// Send to server for verification
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

### Example 4: Agent-to-Agent Payment

```typescript
import {
  authorizeAgentWallet,
  transferSOLWithMobileWallet,
} from "./skills/mobile-wallet-adapter/index.js";

// Authorize both agents
const agentASession = await authorizeAgentWallet(agentA, "devnet");
const agentBSession = await authorizeAgentWallet(agentB, "devnet");

// Agent A pays Agent B for a service
const signature = await transferSOLWithMobileWallet(
  agentA,
  agentBSession.publicKey,
  0.1, // 0.1 SOL payment
  "devnet"
);

console.log("Payment sent:", signature);
```

### Example 5: Session Reauthorization

```typescript
import {
  hasActiveWalletSession,
  reauthorizeAgentWallet,
  authorizeAgentWallet,
} from "./skills/mobile-wallet-adapter/index.js";

// Check if agent has active session
if (hasActiveWalletSession(agent)) {
  // Reauthorize without user interaction
  try {
    const session = await reauthorizeAgentWallet(agent, "devnet");
    console.log("Reauthorized:", session.publicKey.toBase58());
  } catch (error) {
    // Reauth failed, need full authorization
    const session = await authorizeAgentWallet(agent, "devnet");
    console.log("Authorized:", session.publicKey.toBase58());
  }
} else {
  // No session, need full authorization
  const session = await authorizeAgentWallet(agent, "devnet");
}
```

## Security Considerations

1. **Auth Token Storage**
   - Store auth tokens securely (encrypted database)
   - Never expose tokens in logs or errors
   - Rotate tokens periodically

2. **User Approval**
   - All transactions require user approval in wallet app
   - Users see full transaction details
   - Cannot bypass user approval

3. **Session Expiration**
   - Sessions expire after 7 days
   - Implement automatic reauthorization
   - Handle expired sessions gracefully

4. **Network Validation**
   - Always verify cluster matches expected network
   - Prevent mainnet transactions on devnet sessions
   - Validate transaction details before signing

5. **Private Key Security**
   - Private keys never leave wallet app
   - Agents never have access to private keys
   - All signing happens in wallet app

## Testing

### On Android Device

1. Install MWA-compatible wallet (Phantom, Solflare)
2. Run Ordo agent on Android device or emulator
3. Call `authorizeAgentWallet()` - wallet selector appears
4. Approve authorization in wallet app
5. Agent can now sign transactions

### Without Android Device

For development without Android:

```typescript
// Mock wallet session for testing
const mockSession: AgentWalletSession = {
  agentId: agent.id,
  publicKey: Keypair.generate().publicKey,
  authToken: "mock-token",
  authorizedAt: new Date(),
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};
```

### Run Tests

```bash
npm test -- mwa-integration.test.ts
```

## Supported Wallets

MWA-compatible wallets on Android:

- ✅ Phantom Mobile
- ✅ Solflare Mobile
- ✅ Ultimate Mobile
- ✅ Glow Mobile
- ✅ Backpack Mobile

## Common Use Cases

### 1. DeFi Operations

Agents can execute DeFi operations via mobile wallet:

```typescript
// Swap tokens via Jupiter
const swapTx = await createJupiterSwapTransaction({...});
await signAndSendTransactionWithMobileWallet(agent, swapTx, "mainnet-beta");
```

### 2. NFT Minting

Agents can mint NFTs with user approval:

```typescript
// Create NFT mint transaction
const mintTx = await createNFTMintTransaction({...});
await signAndSendTransactionWithMobileWallet(agent, mintTx, "mainnet-beta");
```

### 3. Agent Authentication

Agents can prove identity via message signing:

```typescript
const message = `Authenticate ${agent.id}`;
const signature = await signMessageWithMobileWallet(agent, message);
// Verify signature server-side
```

### 4. Multi-Agent Payments

Agents can pay each other for services:

```typescript
await transferSOLWithMobileWallet(payerAgent, receiverPublicKey, amount);
```

## Limitations

1. **Android Only**: MWA only works on Android devices
2. **User Approval Required**: Cannot bypass wallet approval
3. **Session Expiration**: Sessions expire after 7 days
4. **Network Switching**: Requires new authorization for different networks
5. **Wallet Dependency**: Requires MWA-compatible wallet installed

## Future Enhancements

- [ ] Persistent session storage in database
- [ ] Multi-signature support
- [ ] Transaction simulation before signing
- [ ] Wallet app preference management
- [ ] Session analytics and monitoring
- [ ] Automatic session refresh
- [ ] Batch transaction optimization
- [ ] iOS support via Wallet Standard

## Integration Checklist

- ✅ MWA packages installed
- ✅ Core MWA client implemented
- ✅ Agent integration functions created
- ✅ Session management implemented
- ✅ Transaction signing support
- ✅ Message signing support
- ✅ SOL transfer helper
- ✅ Cost tracking integrated
- ✅ Comprehensive tests written
- ✅ Documentation completed
- ✅ Error handling implemented
- ✅ Security measures in place
- ⚠️ Session persistence (in-memory only)
- ⚠️ Android device required for testing

## Benefits for Ordo Platform

1. **User Control**: Users maintain full control of private keys
2. **Security**: Private keys never leave wallet app
3. **Flexibility**: Agents can use any MWA-compatible wallet
4. **Transparency**: Users see and approve all transactions
5. **Mobile-First**: Native support for mobile devices
6. **Ecosystem Integration**: Works with existing Solana wallets
7. **Cost Tracking**: Automatic transaction cost tracking

## Comparison: MWA vs Direct Keypair

| Feature | MWA | Direct Keypair |
|---------|-----|----------------|
| Private Key Storage | Wallet app | Agent storage |
| User Approval | Required | Not required |
| Security | High (keys in wallet) | Medium (keys in agent) |
| Platform | Android only | All platforms |
| Setup | Requires wallet app | No dependencies |
| Automation | Limited (needs approval) | Full automation |
| Use Case | User-controlled agents | Autonomous agents |

## Conclusion

The Mobile Wallet Adapter integration enables Ordo agents to interact with mobile wallets on Android devices, providing a secure and user-friendly way for agents to sign transactions and messages. This is ideal for scenarios where users want to maintain control over agent operations while still benefiting from agent automation.

For fully autonomous agents that don't require user approval, continue using direct keypair management. For user-controlled agents on mobile devices, MWA provides the best security and user experience.

---

**Integration Date**: February 20, 2026
**Status**: ✅ Complete
**Platform**: Android (Saga, Android devices with MWA wallets)
**Documentation**: Complete
**Tests**: Passing
**Production Ready**: ⚠️ Requires session persistence implementation

