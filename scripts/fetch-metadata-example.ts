#!/usr/bin/env tsx
/**
 * Example: Fetch program metadata (IDL and security.txt) programmatically
 * 
 * This demonstrates how to use the @solana-program/program-metadata SDK
 * to fetch metadata from your program.
 * 
 * Usage:
 *   tsx scripts/fetch-metadata-example.ts
 */

import { fetchAndParseMetadataContent } from '@solana-program/program-metadata';
import { createSolanaRpc } from '@solana/kit';

const PROGRAM_ID = 'AgentReg11111111111111111111111111111111111';
const RPC_URL = 'https://api.devnet.solana.com';

async function main() {
  console.log('🔍 Fetching Program Metadata\n');
  console.log(`Program ID: ${PROGRAM_ID}`);
  console.log(`RPC URL: ${RPC_URL}\n`);

  const rpc = createSolanaRpc(RPC_URL);

  try {
    // Fetch IDL
    console.log('📥 Fetching IDL...');
    const idl = await fetchAndParseMetadataContent(rpc, PROGRAM_ID, 'idl');
    
    if (idl) {
      console.log('✅ IDL found:');
      console.log(JSON.stringify(idl, null, 2));
      console.log('');
      
      // Display some useful info from the IDL
      if (typeof idl === 'object' && idl !== null) {
        const idlObj = idl as any;
        console.log('📊 IDL Summary:');
        console.log(`  Name: ${idlObj.name || idlObj.metadata?.name || 'N/A'}`);
        console.log(`  Version: ${idlObj.version || idlObj.metadata?.version || 'N/A'}`);
        console.log(`  Instructions: ${idlObj.instructions?.length || 0}`);
        console.log(`  Accounts: ${idlObj.accounts?.length || 0}`);
        console.log(`  Types: ${idlObj.types?.length || 0}`);
        console.log('');
      }
    } else {
      console.log('ℹ️  No IDL found on-chain');
      console.log('💡 Upload with: npm run metadata:upload:devnet\n');
    }
  } catch (error) {
    console.log('ℹ️  IDL not found on-chain');
    console.log('💡 Upload with: npm run metadata:upload:devnet\n');
  }

  try {
    // Fetch security.txt
    console.log('📥 Fetching security.txt...');
    const security = await fetchAndParseMetadataContent(rpc, PROGRAM_ID, 'security');
    
    if (security) {
      console.log('✅ security.txt found:');
      console.log(JSON.stringify(security, null, 2));
      console.log('');
      
      // Display some useful info from security.txt
      if (typeof security === 'object' && security !== null) {
        const secObj = security as any;
        console.log('🔒 Security Info:');
        console.log(`  Name: ${secObj.name || 'N/A'}`);
        console.log(`  Version: ${secObj.version || 'N/A'}`);
        console.log(`  Contacts: ${secObj.contacts?.join(', ') || 'N/A'}`);
        console.log(`  Source: ${secObj.source_code || 'N/A'}`);
        console.log('');
      }
    } else {
      console.log('ℹ️  No security.txt found on-chain');
      console.log('💡 Upload with: npm run metadata:upload:devnet\n');
    }
  } catch (error) {
    console.log('ℹ️  security.txt not found on-chain');
    console.log('💡 Upload with: npm run metadata:upload:devnet\n');
  }

  console.log('🔗 View in Solana Explorer:');
  console.log(`https://explorer.solana.com/address/${PROGRAM_ID}?cluster=devnet`);
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
