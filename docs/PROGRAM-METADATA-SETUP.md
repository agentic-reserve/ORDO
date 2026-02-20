# Program Metadata Setup Guide

This guide explains how to use the Program Metadata Program (PMP) to store IDLs and security.txt information for the agent-registry program.

## Why Program Metadata Program?

The Program Metadata Program is the modern approach for storing program metadata on Solana:

- **Space Efficient**: Uses zlib compression by default
- **Flexible**: Can store data on-chain, point to URLs, or reference other accounts
- **Versioning Support**: Can have multiple versions of metadata
- **Third-Party Support**: Anyone can add non-canonical metadata
- **Standard Format**: Works with Solana Explorer and other tools

## Quick Start

### 1. Install the CLI

```bash
npm install -g @solana-program/program-metadata
```

Or use directly with npx (no installation needed):

```bash
npx @solana-program/program-metadata@latest --help
```

### 2. Build Your Program

First, build your Anchor program to generate the IDL:

```bash
cd ordo
anchor build
```

This generates:
- `target/idl/agent_registry.json` - The IDL file
- `target/types/agent_registry.ts` - TypeScript types

### 3. Upload IDL to Devnet

Upload the IDL as canonical metadata (requires upgrade authority):

```bash
npx @solana-program/program-metadata@latest write idl AgentReg11111111111111111111111111111111111 ./target/idl/agent_registry.json --keypair ~/.config/solana/id.json --rpc https://api.devnet.solana.com
```

### 4. Create and Upload security.txt

Create a `security.json` file with your program information:

```json
{
    "name": "Agent Registry",
    "logo": "https://your-domain.com/logo.png",
    "description": "Solana program for agent registration, discovery, and reputation",
    "project_url": "https://github.com/ordo-platform/ordo",
    "contacts": ["email:security@ordo.com", "discord:Ordo#1234"],
    "policy": "https://ordo.com/security-policy",
    "preferred_languages": ["en"],
    "source_code": "https://github.com/ordo-platform/ordo",
    "source_release": "v0.1.0",
    "version": "0.1.0"
}
```

Upload it:

```bash
npx @solana-program/program-metadata@latest write security AgentReg11111111111111111111111111111111111 ./security.json --keypair ~/.config/solana/id.json --rpc https://api.devnet.solana.com
```

## Advanced Usage

### Fetch Metadata

Fetch the IDL:

```bash
npx @solana-program/program-metadata@latest fetch idl AgentReg11111111111111111111111111111111111 --output ./downloaded-idl.json --rpc https://api.devnet.solana.com
```

Fetch security.txt:

```bash
npx @solana-program/program-metadata@latest fetch security AgentReg11111111111111111111111111111111111 --output ./downloaded-security.json --rpc https://api.devnet.solana.com
```

### Using Buffers for Large Updates

For large metadata or when using a multisig, use buffers:

```bash
# 1. Create buffer
npx @solana-program/program-metadata@latest create-buffer ./target/idl/agent_registry.json --rpc https://api.devnet.solana.com

# 2. Update metadata with buffer
npx @solana-program/program-metadata@latest write idl AgentReg11111111111111111111111111111111111 --buffer <buffer-address> --rpc https://api.devnet.solana.com
```

### Using with Squads Multisig

If your program is managed by a Squads multisig:

```bash
# 1. Create buffer
npx @solana-program/program-metadata@latest create-buffer ./target/idl/agent_registry.json

# 2. Transfer buffer authority to multisig
npx @solana-program/program-metadata@latest set-buffer-authority <buffer-address> --new-authority <multisig-address>

# 3. Export transaction for multisig
npx @solana-program/program-metadata@latest write idl AgentReg11111111111111111111111111111111111 --buffer <buffer-address> --export <multisig-address> --export-encoding base58 --close-buffer <your-address>

# 4. Import the base58 transaction into Squads UI and sign
```

### Authority Management

Set a new authority:

```bash
npx @solana-program/program-metadata@latest set-authority idl AgentReg11111111111111111111111111111111111 --new-authority <new-pubkey>
```

Make metadata immutable:

```bash
npx @solana-program/program-metadata@latest set-immutable idl AgentReg11111111111111111111111111111111111
```

Close metadata account (reclaim rent):

```bash
npx @solana-program/program-metadata@latest close idl AgentReg11111111111111111111111111111111111
```

## Using the JavaScript SDK

Install the package:

```bash
npm install @solana-program/program-metadata @solana/kit
```

Fetch IDL programmatically:

```typescript
import { fetchAndParseMetadataContent } from '@solana-program/program-metadata';
import { createSolanaRpc } from '@solana/kit';

const rpc = createSolanaRpc('https://api.devnet.solana.com');
const programId = 'AgentReg11111111111111111111111111111111111';

// Fetch IDL
const idl = await fetchAndParseMetadataContent(rpc, programId, 'idl');
console.log(idl);

// Fetch security.txt
const security = await fetchAndParseMetadataContent(rpc, programId, 'security');
console.log(security);
```

## Metadata Storage Options

### On-Chain (Default)

Data is compressed with zlib and stored directly in the metadata account:

```bash
npx @solana-program/program-metadata@latest write idl <program-id> ./idl.json
```

### URL Reference

Point to a URL (saves on-chain space):

```bash
npx @solana-program/program-metadata@latest write idl <program-id> --url https://github.com/ordo-platform/ordo/raw/main/target/idl/agent_registry.json
```

### Account Reference

Point to another account:

```bash
npx @solana-program/program-metadata@latest write idl <program-id> --account <account-address> --account-offset 0 --account-length 1024
```

## Canonical vs Non-Canonical Metadata

### Canonical (Upgrade Authority)

Created by the program upgrade authority:
- PDA: `[program_id, seed]`
- Only one per (program, seed) pair
- Trusted by explorers and tools

```bash
npx @solana-program/program-metadata@latest write idl <program-id> ./idl.json --keypair <upgrade-authority>
```

### Non-Canonical (Third-Party)

Created by anyone:
- PDA: `[program_id, authority, seed]`
- Multiple can exist
- Useful for frozen programs or community contributions

```bash
npx @solana-program/program-metadata@latest write idl <program-id> ./idl.json --non-canonical <your-pubkey>
```

## Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
- name: Upload IDL to Devnet
  run: |
    npx @solana-program/program-metadata@latest write idl ${{ env.PROGRAM_ID }} ./target/idl/agent_registry.json --keypair ./deploy-keypair.json --rpc https://api.devnet.solana.com
```

## Compression and Encoding Options

### Compression

- `zlib` (default): Best compression
- `gzip`: Alternative compression
- `none`: No compression

```bash
npx @solana-program/program-metadata@latest write idl <program-id> ./idl.json --compression gzip
```

### Encoding

- `utf8` (default): Text encoding
- `base58`: Base58 encoding
- `base64`: Base64 encoding
- `none`: No encoding

```bash
npx @solana-program/program-metadata@latest write idl <program-id> ./idl.json --encoding base64
```

## Best Practices

1. **Upload IDL immediately after deployment** to prevent permissionless uploads
2. **Use buffers for multisig operations** to separate data upload from authority signing
3. **Keep security.txt updated** with current contact information
4. **Use canonical metadata** when you control the upgrade authority
5. **Make metadata immutable** only when the program is finalized
6. **Test on devnet first** before uploading to mainnet

## Troubleshooting

### "Metadata account already exists"

The metadata account was already created. Use the update command or close and recreate.

### "Unauthorized"

Ensure you're using the correct keypair (upgrade authority for canonical metadata).

### "Account not found"

The metadata hasn't been uploaded yet. Use the `write` command first.

## Resources

- [Program Metadata GitHub](https://github.com/solana-program/program-metadata)
- [Solana Explorer](https://explorer.solana.com)
- [Anchor Documentation](https://www.anchor-lang.com/docs/basics/idl)
