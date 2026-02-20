# MagicBlock Integration for Ordo

Complete integration of MagicBlock's Ephemeral Rollups, TEE, Permission, and Delegation systems for private, fast, and gasless agent transactions.

## Features

- ⚡ **Ephemeral Rollups (ER)**: Sub-10ms transaction latency
- 🔒 **Private ER with TEE**: Confidential transactions with Intel TDX
- 🎫 **Permission System**: Access control with ACLs
- 🔗 **Delegation System**: Account delegation to ER validators
- 🆓 **Gasless Transactions**: Platform pays gas fees
- 🔐 **TEE Authorization**: Secure authorization tokens for private transactions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ORDO AGENT PLATFORM                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         MagicBlock Integration Layer                 │  │
│  │                                                      │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │  │
│  │  │  Permission  │  │  Delegation  │  │  TEE Auth │ │  │
│  │  │    Client    │  │    Client    │  │   Client  │ │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘ │  │
│  │                                                      │  │
│  │  ┌──────────────┐  ┌──────────────┐                │  │
│  │  │  ER Client   │  │  TEE Client  │                │  │
│  │  │  (Fast Exec) │  │  (Private)   │                │  │
│  │  └──────────────┘  └──────────────┘                │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         MagicBlock Infrastructure                    │  │
│  │                                                      │  │
│  │  • Permission Program (ACLs)                        │  │
│  │  • Delegation Program (ER Validators)               │  │
│  │  • Private ER (TEE-protected)                       │  │
│  │  • Standard ER (Fast execution)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                           ↓                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Solana Mainnet/Devnet                   │  │
│  │  • State commitment                                  │  │
│  │  • Final settlement                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Program IDs

- **Permission Program**: `ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1`
- **Delegation Program**: `DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh`

## ER Validators

### Devnet
- **Asia**: `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57E` (devnet-as.magicblock.app)
- **EU**: `MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e` (devnet-eu.magicblock.app)
- **US**: `MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd` (devnet-us.magicblock.app)
- **TEE**: `FnE6VJT5QNZdedZPnCoLsARgBwoE6DeJNjBs2H1gySXA` (tee.magicblock.app)

### Mainnet
- **Asia**: `MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57E` (as.magicblock.app)
- **EU**: `MEUGGrYPxKk17hCr7wpT6s8dtNokZj5U2L57vjYMS8e` (eu.magicblock.app)
- **US**: `MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd` (us.magicblock.app)

## Quick Start

### 1. Install Dependencies

```bash
npm install @magicblock-labs/ephemeral-rollups-sdk
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Configure MagicBlock settings
MAGICBLOCK_USE_PRIVATE_ER=true
MAGICBLOCK_PER_URL=https://per.magicblock.app
MAGICBLOCK_TEE_URL=https://tee.magicblock.app
MAGICBLOCK_DEFAULT_VALIDATOR=MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd
```

### 3. Basic Usage with Official SDK

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import {
  verifyTeeRpcIntegrity,
  getAuthToken,
} from '@magicblock-labs/ephemeral-rollups-sdk';
import {
  createPermissionClient,
  createDelegationClient,
  createTEEAuthClient,
  createERClient,
  PermissionType,
} from './magicblock';

const connection = new Connection('https://api.devnet.solana.com');
const agent = Keypair.generate();

// 1. Verify TEE integrity (attestation)
const teeUrl = 'https://tee.magicblock.app';
const isIntegrityVerified = await verifyTeeRpcIntegrity(teeUrl);
console.log('TEE verified:', isIntegrityVerified);

// 2. Set up permissions
const permissionClient = createPermissionClient(connection);
const acl = await permissionClient.createACL(agent.publicKey, agent);

// 3. Delegate to ER
const delegationClient = createDelegationClient(connection);
await delegationClient.delegate(agent.publicKey, agent);

// 4. Client challenge flow - get authorization token
const teeAuthClient = createTEEAuthClient(connection, teeUrl);
const authToken = await teeAuthClient.requestAuthorizationToken(agent);

// 5. Create authorized connection with access token
const authorizedConnection = teeAuthClient.createAuthorizedConnection(authToken.token);

// 6. Execute transactions on authorized connection
// The connection has the token, so it can access permissioned state
const signature = await authorizedConnection.sendTransaction(transaction, [agent]);

// 7. Commit back to Solana
const erClient = createERClient(connection);
await erClient.commitToSolana();
```

### 3. Private Payment Example

See `example-private-payment.ts` for a complete end-to-end example of:
- Verifying TEE integrity (attestation)
- Creating ACLs with permissions
- Delegating accounts to ER
- Client challenge flow for authorization
- Creating authorized connections with access tokens
- Executing confidential transactions
- Committing state to Solana

```typescript
import { executePrivatePayment } from './magicblock/example-private-payment';

await executePrivatePayment(
  connection,
  senderKeypair,
  recipientPublicKey,
  0.5 // amount in SOL
);
```

### 4. Rust Program Implementation (Anchor)

For Solana programs that need permission hooks, see `programs/agent-registry/src/permission_hooks.rs`:

```rust
use magicblock_permission_client::instructions::{
    CreateGroupCpiBuilder, CreatePermissionCpiBuilder,
};

// Create a permission group for an agent
pub fn create_agent_permission(
    ctx: Context<CreateAgentPermission>,
    group_id: Pubkey,
    members: Vec<Pubkey>,
) -> Result<()> {
    // [1] Create a Permission Group
    CreateGroupCpiBuilder::new(&ctx.accounts.permission_program)
        .group(&ctx.accounts.group)
        .id(group_id)
        .members(members)
        .payer(&ctx.accounts.payer)
        .system_program(&ctx.accounts.system_program)
        .invoke()?;

    // [2] Create Permissions
    CreatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
        .permission(&ctx.accounts.permission)
        .delegated_account(&ctx.accounts.agent_account.to_account_info())
        .group(&ctx.accounts.group)
        .payer(&ctx.accounts.payer)
        .system_program(&ctx.accounts.system_program)
        .invoke_signed(&[&[
            AGENT_PDA_SEED,
            ctx.accounts.agent_owner.key().as_ref(),
            &[ctx.bumps.agent_account],
        ]])?;

    Ok(())
}
```

Add to your `Cargo.toml`:
```toml
[dependencies]
magicblock-permission-client = "0.1.0"
```

## Module Overview

### Permission Client (`permission.ts`)

Manages access control lists (ACLs) and permissions.

```typescript
// Create ACL
const acl = await permissionClient.createACL(account, owner);

// Grant permission
await permissionClient.grantPermission(
  account,
  authority,
  PermissionType.WRITE,
  owner
);

// Check permission
const result = await permissionClient.checkPermission(
  account,
  authority,
  PermissionType.WRITE
);
```

### Delegation Client (`delegation.ts`)

Handles account delegation to ER validators.

```typescript
// Delegate account
await delegationClient.delegate(account, owner, validator);

// Check delegation status
const status = delegationClient.getDelegationStatus(account);

// Undelegate
await delegationClient.undelegate(account, owner);
```

### TEE Auth Client (`tee-auth.ts`)

Manages TEE authorization and confidential transactions.

```typescript
// Request auth token
const token = await teeAuthClient.requestAuthorizationToken(keypair);

// Execute confidential transaction
const result = await teeAuthClient.executeConfidentialTransaction(
  transaction,
  keypair,
  encryptedData
);

// Encrypt/decrypt data
const encrypted = teeAuthClient.encryptData(data, recipientPublicKey);
const decrypted = teeAuthClient.decryptData(encrypted, recipientKeypair);
```

### ER Client (`er-client.ts`)

Provides fast execution on Ephemeral Rollups.

```typescript
// Execute on standard ER
const result = await erClient.executeOnER({
  type: 'transaction',
  payload: transaction,
  accounts: [account],
});

// Execute on Private ER (TEE)
const result = await erClient.executeOnPER({
  type: 'transaction',
  payload: transaction,
  accounts: [account],
});

// Commit to Solana
await erClient.commitToSolana();
```

## Performance Characteristics

| Feature | Latency | Cost | Privacy |
|---------|---------|------|---------|
| Standard ER | 10-50ms | Gasless | Public |
| Private ER (TEE) | 10-50ms | Gasless | Private |
| Solana Direct | 400ms | ~$0.00025 | Public |

## Security Considerations

1. **Private Keys**: Never expose private keys. Use TEE for sensitive operations.
2. **Authorization Tokens**: Tokens expire after 1 hour. Request new tokens as needed.
3. **Permissions**: Always check permissions before executing operations.
4. **Attestations**: Verify TEE attestations for critical operations.
5. **State Commitment**: Ensure state is committed to Solana for finality.

## Integration with Ordo Agents

### Agent-to-Agent Private Payments

```typescript
// Agent A sends private payment to Agent B
const agentA = await db.getAgent(agentAId);
const agentB = await db.getAgent(agentBId);

await executePrivatePayment(
  connection,
  agentA.keypair,
  agentB.publicKey,
  amount
);
```

### Gasless Agent Operations

```typescript
// Configure ER client for gasless transactions
const erClient = createERClient(connection, {
  gaslessConfig: {
    enabled: true,
    platformPaysGas: true,
  },
});

// Platform pays gas for all agent operations
await erClient.executeOnER(operation);
```

### Permission-Based Agent Collaboration

```typescript
// Agent A grants Agent B permission to access its resources
await permissionClient.grantPermission(
  agentA.publicKey,
  agentB.publicKey,
  PermissionType.READ,
  agentA.keypair,
  new Date(Date.now() + 86400000) // 24 hour expiration
);

// Agent B checks permission before accessing
const canAccess = await permissionClient.checkPermission(
  agentA.publicKey,
  agentB.publicKey,
  PermissionType.READ
);
```

## Testing

```bash
# Run MagicBlock integration tests
npm test -- magicblock

# Run specific test file
npm test -- tee-auth.test.ts
```

## Resources

- [MagicBlock Documentation](https://docs.magicblock.gg/)
- [Private Payments Demo](https://github.com/magicblock-labs/starter-kits/tree/main/private-payments-demo)
- [Ephemeral Rollups SDK](https://github.com/magicblock-labs/ephemeral-rollups-sdk)

## Troubleshooting

### "TEE authorization failed"
- Check that `MAGICBLOCK_TEE_URL` is correct
- Verify `MAGICBLOCK_TEE_URL` is accessible
- Ensure message signature is valid

### "Account is not delegated"
- Delegate account before executing on ER
- Check delegation status with `getDelegationStatus()`
- Verify correct validator is used

### "Permission denied"
- Check ACL exists for account
- Verify authority has required permission
- Check permission hasn't expired

## License

MIT
