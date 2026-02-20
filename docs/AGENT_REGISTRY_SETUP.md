# Agent Registry Solana Program Setup

This document explains how to build, test, and deploy the Agent Registry Solana program.

## Prerequisites

1. Install Rust and Cargo:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. Install Solana CLI:
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

3. Install Anchor CLI:
```bash
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

## Building the Program

1. Navigate to the ordo directory:
```bash
cd ordo
```

2. Build the Anchor program:
```bash
anchor build
```

This will compile the Rust program and generate:
- `target/deploy/agent_registry.so` - The compiled program
- `target/idl/agent_registry.json` - The Interface Definition Language file
- `target/types/agent_registry.ts` - TypeScript types

## Testing Locally

1. Start a local Solana validator:
```bash
solana-test-validator
```

2. In a new terminal, run the Anchor tests:
```bash
anchor test --skip-local-validator
```

3. Run the TypeScript property tests:
```bash
npm test
```

## Deploying to Devnet

1. Configure Solana CLI for devnet:
```bash
solana config set --url https://api.devnet.solana.com
```

2. Create a new keypair (if you don't have one):
```bash
solana-keygen new --outfile ~/.config/solana/id.json
```

3. Airdrop SOL for deployment fees:
```bash
solana airdrop 2
```

4. Deploy the program:
```bash
anchor deploy --provider.cluster devnet
```

5. Note the program ID from the deployment output and update:
   - `Anchor.toml` - Update the program ID in `[programs.devnet]`
   - `ordo/programs/agent-registry/src/lib.rs` - Update the `declare_id!` macro
   - `ordo/src/registry/client.ts` - Update the default program ID

## Deploying to Mainnet

1. Configure Solana CLI for mainnet:
```bash
solana config set --url https://api.mainnet-beta.solana.com
```

2. Ensure you have sufficient SOL for deployment (approximately 5-10 SOL):
```bash
solana balance
```

3. Deploy the program:
```bash
anchor deploy --provider.cluster mainnet
```

4. Update the program ID in all relevant files (same as devnet step 5)

## Using the TypeScript Client SDK

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { createAgentRegistryClient } from './src/registry';

// Create connection
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// Create wallet
const keypair = Keypair.generate();
const wallet = new Wallet(keypair);

// Create client
const client = createAgentRegistryClient(connection, wallet);

// Register an agent
const tx = await client.registerAgent(
  keypair,
  'My Agent',
  'An autonomous AI agent',
  'https://example.com/agent-metadata.json',
  ['trading', 'research'],
  true,
  0
);

console.log('Agent registered:', tx);

// Query agent
const agent = await client.queryAgent(keypair.publicKey);
console.log('Agent data:', agent);

// Update reputation
const raterKeypair = Keypair.generate();
const repTx = await client.updateReputation(
  raterKeypair,
  keypair.publicKey,
  85,
  'Great agent, very helpful!'
);

console.log('Reputation updated:', repTx);
```

## Program Structure

```
ordo/
├── programs/
│   └── agent-registry/
│       ├── src/
│       │   ├── lib.rs              # Main program entry point
│       │   ├── state.rs            # Account structures
│       │   ├── errors.rs           # Error definitions
│       │   └── instructions/
│       │       ├── mod.rs
│       │       ├── register_agent.rs
│       │       └── update_reputation.rs
│       ├── Cargo.toml
│       └── Xargo.toml
├── src/
│   ├── registry/
│   │   ├── client.ts               # TypeScript client SDK
│   │   ├── index.ts
│   │   └── on-chain-registration.test.ts
│   └── types/
│       └── agent_registry.ts       # TypeScript types
├── Anchor.toml                     # Anchor configuration
└── Cargo.toml                      # Rust workspace configuration
```

## Account Structures

### AgentAccount
- **PDA Seeds**: `["agent", authority_pubkey]`
- **Fields**:
  - `authority`: Owner of the agent
  - `name`: Agent name (max 50 chars)
  - `description`: Agent description (max 200 chars)
  - `agent_uri`: Metadata URI (max 200 chars)
  - `services`: Array of services (max 10, 50 chars each)
  - `x402_support`: Boolean for x402 protocol support
  - `active`: Boolean for agent status
  - `parent_agent`: Optional parent agent pubkey
  - `registered_at`: Unix timestamp
  - `reputation_score`: Cumulative reputation
  - `generation`: Generation number
  - `bump`: PDA bump seed

### ReputationRecord
- **PDA Seeds**: `["reputation", agent_pda, rater_pubkey]`
- **Fields**:
  - `agent`: Agent being rated
  - `rater`: Who gave the rating
  - `score`: Score (-100 to +100)
  - `comment`: Optional comment (max 500 chars)
  - `timestamp`: Unix timestamp
  - `bump`: PDA bump seed

## Events

### AgentRegisteredEvent
Emitted when a new agent is registered.

### ReputationUpdatedEvent
Emitted when an agent's reputation is updated.

## Error Codes

- `6000`: NameTooLong
- `6001`: DescriptionTooLong
- `6002`: UriTooLong
- `6003`: TooManyServices
- `6004`: ServiceNameTooLong
- `6005`: CommentTooLong
- `6006`: InvalidReputationScore
- `6007`: CannotRateSelf

## Next Steps

After deploying the Agent Registry program:

1. Integrate with the agent lifecycle system (Task 4)
2. Implement agent identity management (Task 2)
3. Set up monitoring with Helius webhooks
4. Create a web dashboard for agent discovery

## Troubleshooting

### Build Errors

If you encounter build errors:
```bash
# Clean and rebuild
anchor clean
anchor build
```

### Deployment Errors

If deployment fails due to insufficient funds:
```bash
# Check balance
solana balance

# Airdrop more SOL (devnet only)
solana airdrop 2
```

### Test Failures

If tests fail:
```bash
# Ensure local validator is running
solana-test-validator

# Run tests with verbose output
anchor test --skip-local-validator -- --nocapture
```

## Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [Solana Cookbook](https://solanacookbook.com/)
