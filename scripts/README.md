# Scripts Directory

This directory contains utility scripts for managing the Ordo platform.

## Program Metadata Scripts

### upload-metadata.ts

Upload IDL and security.txt to Solana using the Program Metadata Program.

**Usage:**

```bash
# Upload all metadata to devnet
npm run metadata:upload:devnet

# Upload all metadata to mainnet
npm run metadata:upload:mainnet

# Upload only IDL
tsx scripts/upload-metadata.ts --network devnet --type idl

# Upload only security.txt
tsx scripts/upload-metadata.ts --network devnet --type security

# Dry run (preview commands without executing)
tsx scripts/upload-metadata.ts --network devnet --type all --dry-run

# Use custom keypair
tsx scripts/upload-metadata.ts --network devnet --keypair ./my-keypair.json

# Use custom program ID
tsx scripts/upload-metadata.ts --network devnet --program-id YourProgramID
```

**Options:**

- `-n, --network <network>`: Network to upload to (localnet|devnet|mainnet) [default: devnet]
- `-t, --type <type>`: Type of metadata (idl|security|all) [default: all]
- `-k, --keypair <path>`: Path to keypair file [default: ~/.config/solana/id.json]
- `-p, --program-id <id>`: Program ID [default: from Anchor.toml]
- `--dry-run`: Print commands without executing
- `-h, --help`: Show help message

### fetch-metadata-example.ts

Example script demonstrating how to fetch program metadata programmatically using the JavaScript SDK.

**Usage:**

```bash
tsx scripts/fetch-metadata-example.ts
```

This script shows how to:
- Fetch IDL from on-chain metadata
- Fetch security.txt from on-chain metadata
- Parse and display the metadata content

## Database Scripts

### setup-database.ts

Initialize the Supabase database with all required tables and schemas.

**Usage:**

```bash
tsx scripts/setup-database.ts
```

### create-*.sql

SQL scripts for creating specific database tables:
- `create-collaborations-table.sql`: Agent collaboration tracking
- `create-defi-tables.sql`: DeFi integration tables
- `create-monitoring-tables.sql`: System monitoring tables
- `create-shared-memory-table.sql`: Shared memory for multi-agent coordination

## Validation Scripts

### run-final-validation.ts

Run comprehensive validation tests to ensure all systems are working correctly.

**Usage:**

```bash
npm run validate-cost
```

## Quick Reference

### Common Commands

```bash
# Build the program and generate IDL
anchor build

# Upload metadata to devnet
npm run metadata:upload:devnet

# Fetch metadata from devnet
npm run metadata:fetch:devnet

# Fetch metadata programmatically
tsx scripts/fetch-metadata-example.ts

# Setup database
tsx scripts/setup-database.ts

# Run validation
npm run validate-cost
```

### Program Metadata CLI Commands

```bash
# Install globally (optional)
npm install -g @solana-program/program-metadata

# Or use with npx (no installation needed)
npx @solana-program/program-metadata@latest --help

# Upload IDL
npx @solana-program/program-metadata@latest write idl <program-id> ./target/idl/agent_registry.json

# Upload security.txt
npx @solana-program/program-metadata@latest write security <program-id> ./security.json

# Fetch IDL
npx @solana-program/program-metadata@latest fetch idl <program-id> --output ./idl.json

# Fetch security.txt
npx @solana-program/program-metadata@latest fetch security <program-id> --output ./security.json

# List all buffers
npx @solana-program/program-metadata@latest list-buffers

# Close metadata account (reclaim rent)
npx @solana-program/program-metadata@latest close idl <program-id>
```

## Environment Variables

Some scripts may require environment variables. Check `.env.example` for required variables:

```bash
# Copy example env file
cp .env.example .env

# Edit with your values
nano .env
```

## Troubleshooting

### "Command not found: tsx"

Install tsx globally or use npx:

```bash
npm install -g tsx
# or
npx tsx scripts/upload-metadata.ts
```

### "IDL file not found"

Build the program first:

```bash
anchor build
```

### "Unauthorized" when uploading metadata

Ensure you're using the correct keypair (program upgrade authority):

```bash
tsx scripts/upload-metadata.ts --keypair ~/.config/solana/id.json
```

### "Metadata account already exists"

The metadata was already uploaded. The script will update it automatically.

## Contributing

When adding new scripts:

1. Add a shebang: `#!/usr/bin/env tsx`
2. Add usage documentation in the file header
3. Update this README with the new script
4. Add npm scripts to package.json if appropriate
5. Make the script executable: `chmod +x scripts/your-script.ts`
