#!/usr/bin/env tsx
/**
 * Upload program metadata (IDL and security.txt) to Solana using Program Metadata Program
 * 
 * Usage:
 *   tsx scripts/upload-metadata.ts --network devnet --type idl
 *   tsx scripts/upload-metadata.ts --network mainnet --type security
 *   tsx scripts/upload-metadata.ts --network devnet --type all
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

interface UploadOptions {
  network: 'localnet' | 'devnet' | 'mainnet';
  type: 'idl' | 'security' | 'all';
  keypair?: string;
  programId?: string;
  dryRun?: boolean;
}

const RPC_URLS = {
  localnet: 'http://localhost:8899',
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
};

const DEFAULT_PROGRAM_ID = 'AgentReg11111111111111111111111111111111111';

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2);
  const options: UploadOptions = {
    network: 'devnet',
    type: 'all',
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--network':
      case '-n':
        options.network = args[++i] as any;
        break;
      case '--type':
      case '-t':
        options.type = args[++i] as any;
        break;
      case '--keypair':
      case '-k':
        options.keypair = args[++i];
        break;
      case '--program-id':
      case '-p':
        options.programId = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Upload Program Metadata

Usage:
  tsx scripts/upload-metadata.ts [options]

Options:
  -n, --network <network>     Network to upload to (localnet|devnet|mainnet) [default: devnet]
  -t, --type <type>           Type of metadata (idl|security|all) [default: all]
  -k, --keypair <path>        Path to keypair file [default: ~/.config/solana/id.json]
  -p, --program-id <id>       Program ID [default: from Anchor.toml]
  --dry-run                   Print commands without executing
  -h, --help                  Show this help message

Examples:
  tsx scripts/upload-metadata.ts --network devnet --type idl
  tsx scripts/upload-metadata.ts --network mainnet --type security
  tsx scripts/upload-metadata.ts --network devnet --type all --dry-run
  `);
}

function getProgramId(network: string): string {
  const anchorTomlPath = resolve(process.cwd(), 'Anchor.toml');
  
  if (!existsSync(anchorTomlPath)) {
    console.warn('⚠️  Anchor.toml not found, using default program ID');
    return DEFAULT_PROGRAM_ID;
  }

  const anchorToml = readFileSync(anchorTomlPath, 'utf-8');
  const match = anchorToml.match(new RegExp(`\\[programs\\.${network}\\][\\s\\S]*?agent_registry\\s*=\\s*"([^"]+)"`));
  
  if (match && match[1]) {
    return match[1];
  }

  console.warn(`⚠️  Program ID not found in Anchor.toml for ${network}, using default`);
  return DEFAULT_PROGRAM_ID;
}

function executeCommand(command: string, dryRun: boolean = false): void {
  console.log(`\n📝 ${dryRun ? '[DRY RUN] ' : ''}Executing: ${command}\n`);
  
  if (dryRun) {
    return;
  }

  try {
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Command failed: ${error}`);
    throw error;
  }
}

function uploadIdl(options: UploadOptions, programId: string, rpcUrl: string): void {
  const idlPath = resolve(process.cwd(), 'target/idl/agent_registry.json');
  
  if (!existsSync(idlPath)) {
    console.error(`❌ IDL file not found at ${idlPath}`);
    console.log('💡 Run "anchor build" first to generate the IDL');
    process.exit(1);
  }

  console.log('📤 Uploading IDL...');
  
  const keypairArg = options.keypair ? `--keypair ${options.keypair}` : '';
  const command = `npx @solana-program/program-metadata@latest write idl ${programId} ${idlPath} ${keypairArg} --rpc ${rpcUrl}`;
  
  executeCommand(command, options.dryRun);
  
  if (!options.dryRun) {
    console.log('✅ IDL uploaded successfully');
  }
}

function uploadSecurity(options: UploadOptions, programId: string, rpcUrl: string): void {
  const securityPath = resolve(process.cwd(), 'security.json');
  
  if (!existsSync(securityPath)) {
    console.error(`❌ security.json file not found at ${securityPath}`);
    console.log('💡 Create a security.json file with your program information');
    process.exit(1);
  }

  console.log('📤 Uploading security.txt...');
  
  const keypairArg = options.keypair ? `--keypair ${options.keypair}` : '';
  const command = `npx @solana-program/program-metadata@latest write security ${programId} ${securityPath} ${keypairArg} --rpc ${rpcUrl}`;
  
  executeCommand(command, options.dryRun);
  
  if (!options.dryRun) {
    console.log('✅ security.txt uploaded successfully');
  }
}

function fetchMetadata(options: UploadOptions, programId: string, rpcUrl: string): void {
  console.log('\n📥 Fetching uploaded metadata...\n');
  
  if (options.type === 'idl' || options.type === 'all') {
    const command = `npx @solana-program/program-metadata@latest fetch idl ${programId} --rpc ${rpcUrl}`;
    try {
      executeCommand(command, options.dryRun);
    } catch (error) {
      console.log('ℹ️  IDL not found on-chain (this is normal if not uploaded yet)');
    }
  }
  
  if (options.type === 'security' || options.type === 'all') {
    const command = `npx @solana-program/program-metadata@latest fetch security ${programId} --rpc ${rpcUrl}`;
    try {
      executeCommand(command, options.dryRun);
    } catch (error) {
      console.log('ℹ️  security.txt not found on-chain (this is normal if not uploaded yet)');
    }
  }
}

async function main() {
  console.log('🚀 Program Metadata Upload Tool\n');
  
  const options = parseArgs();
  const programId = options.programId || getProgramId(options.network);
  const rpcUrl = RPC_URLS[options.network];
  
  console.log(`Network: ${options.network}`);
  console.log(`Program ID: ${programId}`);
  console.log(`RPC URL: ${rpcUrl}`);
  console.log(`Type: ${options.type}`);
  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made');
  }
  console.log('');
  
  try {
    if (options.type === 'idl' || options.type === 'all') {
      uploadIdl(options, programId, rpcUrl);
    }
    
    if (options.type === 'security' || options.type === 'all') {
      uploadSecurity(options, programId, rpcUrl);
    }
    
    if (!options.dryRun) {
      console.log('\n✨ All metadata uploaded successfully!\n');
      
      // Fetch and display the uploaded metadata
      fetchMetadata(options, programId, rpcUrl);
      
      console.log(`\n🔗 View in Solana Explorer:`);
      const explorerUrl = options.network === 'mainnet' 
        ? `https://explorer.solana.com/address/${programId}`
        : `https://explorer.solana.com/address/${programId}?cluster=${options.network}`;
      console.log(explorerUrl);
    }
  } catch (error) {
    console.error('\n❌ Upload failed:', error);
    process.exit(1);
  }
}

main();
