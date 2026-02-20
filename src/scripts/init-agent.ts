import { AgentFactory } from '../agents/agent-factory';
import { birthAgent } from '../lifecycle/birth';
import { PublicKey } from '@solana/web3.js';

/**
 * Initialize an Ordo agent with Solana Agent Kit capabilities
 * 
 * This script:
 * 1. Creates a new agent identity
 * 2. Initializes Solana Agent Kit with all plugins
 * 3. Verifies wallet balance
 * 4. Tests basic operations (price feeds, trending tokens)
 */
async function initializeAgent() {
  console.log('🚀 Initializing Ordo Agent with Solana Agent Kit...\n');

  try {
    // Step 1: Create agent identity
    console.log('1. Creating agent identity...');
    const agent = await birthAgent({
      name: 'Genesis Agent',
      initialBalance: 0.1, // 0.1 SOL
      mutationRate: 0.15,
    });
    console.log(`✅ Agent created: ${agent.publicKey.toString()}\n`);

    // Step 2: Initialize Solana Agent Kit
    console.log('2. Initializing Solana Agent Kit...');
    const agentKit = AgentFactory.getAgentKit(agent);
    console.log('✅ Solana Agent Kit initialized\n');

    // Step 3: Verify wallet balance
    console.log('3. Checking wallet balance...');
    const balance = await agentKit.connection.getBalance(
      new PublicKey(agent.publicKey)
    );
    console.log(`✅ Balance: ${balance / 1e9} SOL\n`);

    // Step 4: Test basic operations
    console.log('4. Testing basic operations...');
    
    // Get SOL price from Pyth
    try {
      const solPriceFeedId = await agentKit.methods.fetchPythPriceFeedID('SOL');
      const solPrice = await agentKit.methods.fetchPythPrice(solPriceFeedId);
      console.log(`✅ SOL Price: $${solPrice}\n`);
    } catch (error) {
      console.log(`⚠️  Could not fetch SOL price: ${error.message}\n`);
    }

    // Get trending tokens from CoinGecko (if configured)
    if (process.env.COINGECKO_API_KEY) {
      try {
        const trending = await agentKit.methods.getTrendingTokens();
        console.log(`✅ Trending tokens: ${trending.length} found\n`);
      } catch (error) {
        console.log(`⚠️  Could not fetch trending tokens: ${error.message}\n`);
      }
    } else {
      console.log('ℹ️  CoinGecko API key not configured (optional)\n');
    }

    // Step 5: Display agent details
    console.log('🎉 Agent initialization complete!\n');
    console.log('Agent Details:');
    console.log(`  Name: ${agent.name}`);
    console.log(`  Public Key: ${agent.publicKey.toString()}`);
    console.log(`  Balance: ${balance / 1e9} SOL`);
    console.log(`  Generation: ${agent.generation}`);
    console.log(`  Status: ${agent.status}`);
    console.log(`  Mutation Rate: ${agent.mutationRate}`);
    console.log(`  Birth Date: ${agent.birthDate.toISOString()}`);
    console.log('\nNext Steps:');
    console.log('  1. Fund the agent wallet with SOL for transactions');
    console.log('  2. Run test scripts to verify functionality:');
    console.log('     - npx tsx src/scripts/test-token-ops.ts');
    console.log('     - npx tsx src/scripts/test-defi-ops.ts');
    console.log('     - npx tsx src/scripts/test-nft-ops.ts');
    console.log('  3. Start the agent lifecycle daemon');
    console.log('  4. Monitor agent activity in Supabase dashboard\n');

  } catch (error) {
    console.error('❌ Initialization failed:', error);
    
    // Provide helpful error messages
    if (error.message.includes('SOLANA_RPC_URL')) {
      console.error('\nℹ️  Make sure SOLANA_RPC_URL is set in your .env file');
    }
    if (error.message.includes('SOLANA_PRIVATE_KEY')) {
      console.error('\nℹ️  Make sure SOLANA_PRIVATE_KEY is set in your .env file');
    }
    if (error.message.includes('OPENAI_API_KEY')) {
      console.error('\nℹ️  Make sure OPENAI_API_KEY is set in your .env file');
    }
    
    process.exit(1);
  }
}

// Run initialization
initializeAgent();
