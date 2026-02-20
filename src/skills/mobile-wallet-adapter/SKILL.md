---
name: mobile-wallet-adapter
description: Enable Ordo agents to interact with mobile wallet apps on Android devices using the Mobile Wallet Adapter (MWA) protocol for secure transaction and message signing
keywords: mobile, wallet, android, mwa, transaction, signing, phantom, solflare, saga
triggers:
  - mobile wallet
  - android wallet
  - wallet adapter
  - sign transaction mobile
  - mobile signing
  - saga phone
  - phantom mobile
  - solflare mobile
---

# Mobile Wallet Adapter Skill

## Overview

This skill enables Ordo agents to interact with mobile wallet apps on Android devices using the Mobile Wallet Adapter (MWA) protocol. Agents can request wallet authorization, sign transactions, sign messages, and manage wallet sessions - all with user approval through their mobile wallet app.

## When to Use This Skill

Use this skill when:

- Agent needs to sign transactions on Android device
- User wants to maintain control over agent operations
- Building mobile-first agent applications
- Agent needs to authenticate via message signing
- Working with Saga phone or Android devices
- User has Phantom, Solflare, or other MWA wallet installed

## Key Capabilities

### 1. Wallet Authorization

```typescript
import { authorizeAgentWallet } from "./skills/mobile-wallet-adapter/index.js";

// Opens wallet selector on Android device
const session = await authorizeAgentWallet(agent, "devnet");
console.log("Authorized:", session.publicKey.toBase58());
```

### 2. Transaction Signing

```typescript
import { signAndSendTransactionWithMobileWallet } from "./skills/mobile-wallet-adapter/index.js";

// Sign and send transaction via mobile wallet
const signature = await signAndSendTransactionWithMobileWallet(
  agent,
  transaction,
  "devnet"
);
```

### 3. Message Signing

```typescript
import { signMessageWithMobileWallet } from "./skills/mobile-wallet-adapter/index.js";

// Sign message for authentication
const signature = await signMessageWithMobileWallet(
  agent,
  "Authenticate agent",
  "devnet"
);
```

### 4. Session Management

```typescript
import {
  hasActiveWalletSession,
  reauthorizeAgentWallet,
} from "./skills/mobile-wallet-adapter/index.js";

// Check and refresh session
if (hasActiveWalletSession(agent)) {
  await reauthorizeAgentWallet(agent, "devnet");
}
```

## Platform Requirements

- ✅ Android device (Saga phone or any Android with MWA wallet)
- ✅ MWA-compatible wallet installed (Phantom, Solflare, etc.)
- ❌ iOS not supported (use Wallet Standard instead)
- ⚠️ Web has limited support

## Integration Points

### With x402 Payment Protocol

Combine MWA with x402 for mobile paid API access:

```typescript
// Authorize mobile wallet
const session = await authorizeAgentWallet(agent, "devnet");

// Use wallet for x402 payments
const keypair = await getKeypairFromSession(session);
await callPaidAPI(agent, keypair, url, options);
```

### With DeFi Operations

Execute DeFi operations with user approval:

```typescript
// Create swap transaction
const swapTx = await createJupiterSwapTransaction({...});

// Sign with mobile wallet
await signAndSendTransactionWithMobileWallet(agent, swapTx, "mainnet-beta");
```

### With Agent Coordination

Agents can pay each other via mobile wallets:

```typescript
// Agent A pays Agent B
await transferSOLWithMobileWallet(
  agentA,
  agentBSession.publicKey,
  0.1,
  "devnet"
);
```

## Security Model

1. **Private keys never leave wallet app**
2. **User approves every transaction**
3. **Sessions expire after 7 days**
4. **Auth tokens stored securely**
5. **All operations tracked for audit**

## Common Patterns

### Pattern 1: Agent Authentication

```typescript
// Agent proves identity via signature
const message = `Authenticate ${agent.id} at ${Date.now()}`;
const signature = await signMessageWithMobileWallet(agent, message);

// Verify server-side
await verifyAgentAuthentication(agent.id, message, signature);
```

### Pattern 2: User-Controlled Trading

```typescript
// User approves each trade via mobile wallet
const tradeTx = await createTradeTransaction({...});
const signature = await signAndSendTransactionWithMobileWallet(
  agent,
  tradeTx,
  "mainnet-beta"
);
```

### Pattern 3: Session Persistence

```typescript
// Check for existing session
if (hasActiveWalletSession(agent)) {
  // Reauthorize silently
  await reauthorizeAgentWallet(agent, "devnet");
} else {
  // Request new authorization
  await authorizeAgentWallet(agent, "devnet");
}
```

## Limitations

- Android only (no iOS support)
- Requires user approval for each transaction
- Sessions expire after 7 days
- Requires MWA-compatible wallet installed
- Cannot bypass user approval

## Best Practices

1. **Always check for active session before operations**
2. **Implement session refresh logic**
3. **Handle authorization errors gracefully**
4. **Store auth tokens securely**
5. **Validate network cluster matches expectations**
6. **Provide clear transaction details to users**

## Troubleshooting

### "No wallet apps found"
- Install Phantom, Solflare, or other MWA wallet
- Ensure wallet app is updated

### "Authorization failed"
- Verify running on Android device
- Check wallet app is properly installed
- Try restarting wallet app

### "Session expired"
- Call `reauthorizeAgentWallet()` to refresh
- If reauth fails, call `authorizeAgentWallet()` again

## Resources

- [Full Documentation](./README.md)
- [MWA Protocol Docs](https://docs.solanamobile.com/get-started/mobile-wallet-adapter)
- [Solana Mobile Stack](https://solanamobile.com)
- [Integration Summary](../../../MWA-INTEGRATION-SUMMARY.md)

## Examples

See `README.md` for comprehensive examples including:
- Agent authorization flow
- Transaction signing
- Message signing for auth
- Agent-to-agent payments
- DeFi operations
- Session management
