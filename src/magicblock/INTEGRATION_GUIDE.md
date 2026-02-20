# MagicBlock Integration Guide for Ordo

Complete step-by-step guide for integrating MagicBlock's Private ER with TEE into your Ordo agents.

## Overview

This guide follows the official MagicBlock documentation and implements:

1. **Attestation**: Verify TEE RPC integrity using Intel TDX
2. **Client Challenge**: Authenticate and get authorization tokens
3. **Access**: Use tokens to query permissioned state
4. **Permission Groups**: Manage access control in Rust programs
5. **Delegation**: Delegate accounts to ER validators

## Prerequisites

- Node.js 20+
- Rust 1.70+ (for Anchor programs)
- Anchor CLI 0.30+
- Solana CLI 1.18+
- MagicBlock API key (get from [magicblock.gg](https://magicblock.gg))

## Part 1: Client-Side Integration (TypeScript)

### Step 1: Install Dependencies

```bash
npm install @magicblock-labs/ephemeral-rollups-sdk
npm install tweetnacl bs58
```

### Step 2: Configure Environment

```bash
# .env
MAGICBLOCK_USE_PRIVATE_ER=true
MAGICBLOCK_PER_URL=https://per.magicblock.app
MAGICBLOCK_TEE_URL=https://tee.magicblock.app

# Program IDs
MAGICBLOCK_PERMISSION_PROGRAM_ID=ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1
MAGICBLOCK_DELEGATION_PROGRAM_ID=DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh

# Validators (choose based on region)
MAGICBLOCK_DEFAULT_VALIDATOR=MUS3hc9TCw4cGC12vHNoYcCGzJG1txjgQLZWVoeNHNd
```

### Step 3: Attestation - Verify TEE Integrity

```typescript
import { verifyTeeRpcIntegrity } from '@magicblock-labs/ephemeral-rollups-sdk';

// Verify the RPC is running on genuine secure hardware
const teeUrl = process.env.MAGICBLOCK_TEE_URL;
const isIntegrityVerified = await verifyTeeRpcIntegrity(teeUrl);

if (!isIntegrityVerified) {
  throw new Error('TEE integrity verification failed');
}

console.log('✓ TEE running on genuine Intel TDX hardware');
```

**What this does:**
- Generates a random 32-byte challenge
- Sends it to the TEE RPC server
- Receives a TDX quote (attestation proof)
- Fetches collateral (certificates) via PCCS
- Verifies the quote using DCAP QVL WASM module

### Step 4: Client Challenge - Get Authorization Token

```typescript
import { getAuthToken } from '@magicblock-labs/ephemeral-rollups-sdk';
import { useWallet } from '@solana/wallet-adapter-react'; // or use Keypair

// For wallet adapters
const { publicKey, signMessage } = useWallet();
const token = await getAuthToken(teeUrl, publicKey, signMessage);

// For Keypairs
import nacl from 'tweetnacl';

const keypair = Keypair.generate();
const signMessage = async (messageBytes: Uint8Array) => {
  return nacl.sign.detached(messageBytes, keypair.secretKey);
};
const token = await getAuthToken(teeUrl, keypair.publicKey, signMessage);

console.log('✓ Authorization token received');
```

**What this does:**
1. Requests a challenge from the RPC (parameterized by your public key)
2. Signs the received challenge using your keypair
3. Submits the signed challenge
4. Receives an authorization token on success

### Step 5: Access - Create Authorized Connection

```typescript
import { Connection } from '@solana/web3.js';

// Create connection with access token as query parameter
const authorizedConnection = new Connection(
  `${teeUrl}?token=${token}`,
  'confirmed'
);

// Now you can query permissioned state
const accountInfo = await authorizedConnection.getAccountInfo(permissionedAccount);
```

**What this does:**
- Passes the authorization token as a query parameter
- Allows querying permissioned state on the Private ER
- Only works if you have permission to access the account

### Step 6: Execute Private Transactions

```typescript
// Create transaction
const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: sender.publicKey,
    toPubkey: recipient,
    lamports: amount,
  })
);

// Get blockhash from authorized connection
const { blockhash } = await authorizedConnection.getLatestBlockhash();
transaction.recentBlockhash = blockhash;
transaction.feePayer = sender.publicKey;

// Sign and send
transaction.sign(sender);
const signature = await authorizedConnection.sendTransaction(transaction, [sender]);
await authorizedConnection.confirmTransaction(signature);

console.log('✓ Private transaction executed:', signature);
```

## Part 2: Program-Side Integration (Rust/Anchor)

### Step 1: Add Dependencies

```toml
# Cargo.toml
[dependencies]
anchor-lang = "0.30.1"
magicblock-permission-client = "0.1.0"
```

### Step 2: Create Permission Group

```rust
use anchor_lang::prelude::*;
use magicblock_permission_client::instructions::{
    CreateGroupCpiBuilder, CreatePermissionCpiBuilder,
};

pub fn create_permission_group(
    ctx: Context<CreatePermission>,
    group_id: Pubkey,
    members: Vec<Pubkey>,
) -> Result<()> {
    // Create a permission group with members
    CreateGroupCpiBuilder::new(&ctx.accounts.permission_program)
        .group(&ctx.accounts.group)
        .id(group_id)
        .members(members)
        .payer(&ctx.accounts.payer)
        .system_program(&ctx.accounts.system_program)
        .invoke()?;

    msg!("Created permission group: {}", group_id);
    Ok(())
}
```

### Step 3: Create Permissions for Account

```rust
pub fn create_account_permission(
    ctx: Context<CreatePermission>,
) -> Result<()> {
    // Link the account to the permission group
    CreatePermissionCpiBuilder::new(&ctx.accounts.permission_program)
        .permission(&ctx.accounts.permission)
        .delegated_account(&ctx.accounts.protected_account.to_account_info())
        .group(&ctx.accounts.group)
        .payer(&ctx.accounts.payer)
        .system_program(&ctx.accounts.system_program)
        .invoke_signed(&[&[
            ACCOUNT_SEED,
            ctx.accounts.owner.key().as_ref(),
            &[ctx.bumps.protected_account],
        ]])?;

    msg!("Created permission for account");
    Ok(())
}
```

### Step 4: Define Account Structures

```rust
#[derive(Accounts)]
pub struct CreatePermission<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub owner: Signer<'info>,
    
    #[account(
        seeds = [ACCOUNT_SEED, owner.key().as_ref()],
        bump
    )]
    pub protected_account: Account<'info, ProtectedAccount>,
    
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub permission: UncheckedAccount<'info>,
    
    /// CHECK: Checked by the permission program
    #[account(mut)]
    pub group: UncheckedAccount<'info>,
    
    /// CHECK: MagicBlock Permission Program
    pub permission_program: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

#[account]
pub struct ProtectedAccount {
    pub owner: Pubkey,
    pub data: Vec<u8>,
    pub permission_group: Option<Pubkey>,
}
```

### Step 5: Deploy Program

```bash
# Build program
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Get program ID
solana address -k target/deploy/your_program-keypair.json
```

## Part 3: Complete Integration Example

### Agent with Private Balance

```typescript
// 1. Create agent with private balance
const agent = Keypair.generate();

// 2. Verify TEE integrity
const teeAuthClient = createTEEAuthClient(connection);
await teeAuthClient.verifyIntegrity();

// 3. Create permission group (on-chain)
const groupId = Keypair.generate().publicKey;
const members = [agent.publicKey, trustedParty.publicKey];

await program.methods
  .createAgentPermission(groupId, members)
  .accounts({
    payer: payer.publicKey,
    agentOwner: agent.publicKey,
    agentAccount: agentPDA,
    permission: permissionPDA,
    group: groupPDA,
    permissionProgram: PERMISSION_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([payer, agent])
  .rpc();

// 4. Delegate agent account to ER
const delegationClient = createDelegationClient(connection);
await delegationClient.delegate(agentPDA, agent);

// 5. Get authorization token
const authToken = await teeAuthClient.requestAuthorizationToken(agent);

// 6. Create authorized connection
const authorizedConnection = teeAuthClient.createAuthorizedConnection(authToken.token);

// 7. Query private balance (only works if you're in the permission group)
const agentAccount = await authorizedConnection.getAccountInfo(agentPDA);
console.log('Private balance:', agentAccount.data);

// 8. Execute private transaction
const transaction = new Transaction().add(
  // Your program instruction
);
const signature = await authorizedConnection.sendTransaction(transaction, [agent]);

// 9. Commit to Solana
const erClient = createERClient(connection);
await erClient.commitToSolana();
```

## Part 4: Testing

### Test TEE Integration

```typescript
import { describe, it, expect } from 'vitest';

describe('MagicBlock TEE Integration', () => {
  it('should verify TEE integrity', async () => {
    const isVerified = await verifyTeeRpcIntegrity(teeUrl);
    expect(isVerified).toBe(true);
  });

  it('should get authorization token', async () => {
    const token = await getAuthToken(teeUrl, publicKey, signMessage);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
  });

  it('should access permissioned state', async () => {
    const authorizedConnection = new Connection(`${teeUrl}?token=${token}`);
    const accountInfo = await authorizedConnection.getAccountInfo(account);
    expect(accountInfo).toBeDefined();
  });
});
```

### Test Permission Groups

```bash
# Run Anchor tests
anchor test

# Run specific test
anchor test -- --test test_permission_groups
```

## Part 5: Production Checklist

- [ ] TEE integrity verification passes
- [ ] Authorization tokens are cached and refreshed
- [ ] Permission groups are properly configured
- [ ] Accounts are delegated to correct ER validator
- [ ] State commits are happening regularly
- [ ] Error handling for TEE failures
- [ ] Monitoring for attestation failures
- [ ] Backup plan if TEE is unavailable
- [ ] Rate limiting for authorization requests
- [ ] Secure storage of API keys

## Troubleshooting

### "TEE integrity verification failed"
- Check that `MAGICBLOCK_TEE_URL` is correct
- Verify the TEE endpoint is accessible
- Ensure you're using the latest SDK version
- Check network connectivity

### "Authorization token expired"
- Tokens expire after 1 hour
- Implement token refresh logic
- Cache tokens and check expiration before use

### "Permission denied"
- Verify you're in the permission group
- Check that permissions were created on-chain
- Ensure you're using the correct authorization token
- Verify the account is delegated to ER

### "Account not delegated"
- Delegate the account before accessing on ER
- Check delegation status
- Verify correct validator is used

## Resources

- [MagicBlock Documentation](https://docs.magicblock.gg/)
- [TEE Program Implementation](https://docs.magicblock.gg/pages/tools/tee/program-implementation)
- [TEE Client Implementation](https://docs.magicblock.gg/pages/tools/tee/client-implementation)
- [Ephemeral Rollups SDK](https://github.com/magicblock-labs/ephemeral-rollups-sdk)
- [Private Payments Demo](https://github.com/magicblock-labs/starter-kits/tree/main/private-payments-demo)

## Support

- Discord: [MagicBlock Discord](https://discord.gg/magicblock)
- GitHub Issues: [ephemeral-rollups-sdk](https://github.com/magicblock-labs/ephemeral-rollups-sdk/issues)
- Email: support@magicblock.gg
