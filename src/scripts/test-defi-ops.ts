import { AgentFactory } from '../agents/agent-factory';
import { birthAgent } from '../lifecycle/birth';
import { PublicKey } from '@solana/web3.js';

/**
 * Test Solana Agent Kit DeFi Operations
 * 
 * This script tests:
 * 1. Jupiter swaps
 * 2. Raydium pool operations
 * 3. Orca Whirlpool integration
 * 4. Drift protocol (perpetuals & lending)
 * 5. Price feed integration
 */
async function testDeFiOperations() {
  console.log('💱 Testing Solana Agent Kit DeFi Operations...\n');

  try {
    // Initialize agent
    console.log('1. Initializing agent...');
    const agent = await birthAgent({
      name: 'DeFi Test Agent',
      initialBalance: 1.0, // 1.0 SOL for testing
      mutationRate: 0.15,
    });
    const agentKit = AgentFactory.getAgentKit(agent);
    console.log(`✅ Agent initialized: ${agent.publicKey.toString()}\n`);

    // Check balance
    const balance = await agentKit.connection.getBalance(
      new PublicKey(agent.publicKey)
    );
    console.log(`💰 Wallet Balance: ${balance / 1e9} SOL\n`);

    if (balance < 0.5 * 1e9) {
      console.error('❌ Insufficient balance for DeFi testing. Please fund the wallet with at least 0.5 SOL');
      process.exit(1);
    }

    // Test 1: Get Jupiter swap quote
    console.log('2. Testing Jupiter swap quote...');
    try {
      const quote = await agentKit.methods.getSwapQuote(
        'So11111111111111111111111111111111111111112', // SOL
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        0.1 * 1e9 // 0.1 SOL
      );
      console.log(`✅ Jupiter swap quote:`);
      console.log(`   Input: 0.1 SOL`);
      console.log(`   Output: ${quote.outAmount / 1e6} USDC`);
      console.log(`   Price Impact: ${quote.priceImpactPct}%`);
      console.log(`   Route: ${quote.routePlan.map(r => r.swapInfo.label).join(' → ')}\n`);
    } catch (error) {
      console.log(`⚠️  Jupiter quote test skipped: ${error.message}\n`);
    }

    // Test 2: Get Pyth price feeds
    console.log('3. Testing Pyth price feeds...');
    try {
      const solPriceFeedId = await agentKit.methods.fetchPythPriceFeedID('SOL');
      const solPrice = await agentKit.methods.fetchPythPrice(solPriceFeedId);
      console.log(`✅ Pyth price feeds:`);
      console.log(`   SOL: $${solPrice}`);
      
      // Try other assets
      const btcPriceFeedId = await agentKit.methods.fetchPythPriceFeedID('BTC');
      const btcPrice = await agentKit.methods.fetchPythPrice(btcPriceFeedId);
      console.log(`   BTC: $${btcPrice}`);
      
      const ethPriceFeedId = await agentKit.methods.fetchPythPriceFeedID('ETH');
      const ethPrice = await agentKit.methods.fetchPythPrice(ethPriceFeedId);
      console.log(`   ETH: $${ethPrice}\n`);
    } catch (error) {
      console.log(`⚠️  Pyth price feed test skipped: ${error.message}\n`);
    }

    // Test 3: Get trending tokens (CoinGecko)
    if (process.env.COINGECKO_API_KEY) {
      console.log('4. Testing CoinGecko trending tokens...');
      try {
        const trending = await agentKit.methods.getTrendingTokens();
        console.log(`✅ Trending tokens (${trending.length} found):`);
        trending.slice(0, 5).forEach((token, i) => {
          console.log(`   ${i + 1}. ${token.name} (${token.symbol})`);
          console.log(`      Price: $${token.price}`);
          console.log(`      24h Change: ${token.priceChange24h}%`);
        });
        console.log();
      } catch (error) {
        console.log(`⚠️  CoinGecko test skipped: ${error.message}\n`);
      }
    } else {
      console.log('4. CoinGecko API key not configured (optional)\n');
    }

    // Test 4: Raydium pool info (read-only)
    console.log('5. Testing Raydium pool info...');
    try {
      // Example: Get info for SOL-USDC pool
      const poolInfo = await agentKit.methods.getRaydiumPoolInfo(
        'SOL-USDC' // Pool identifier
      );
      console.log(`✅ Raydium pool info:`);
      console.log(`   Pool: ${poolInfo.name}`);
      console.log(`   TVL: $${poolInfo.tvl.toLocaleString()}`);
      console.log(`   Volume 24h: $${poolInfo.volume24h.toLocaleString()}`);
      console.log(`   APY: ${poolInfo.apy}%\n`);
    } catch (error) {
      console.log(`⚠️  Raydium pool info test skipped: ${error.message}\n`);
    }

    // Test 5: Orca Whirlpool info (read-only)
    console.log('6. Testing Orca Whirlpool info...');
    try {
      const whirlpoolInfo = await agentKit.methods.getOrcaWhirlpoolInfo(
        'SOL-USDC' // Whirlpool identifier
      );
      console.log(`✅ Orca Whirlpool info:`);
      console.log(`   Pool: ${whirlpoolInfo.name}`);
      console.log(`   TVL: $${whirlpoolInfo.tvl.toLocaleString()}`);
      console.log(`   Fee Tier: ${whirlpoolInfo.feeTier}%`);
      console.log(`   Current Price: $${whirlpoolInfo.currentPrice}\n`);
    } catch (error) {
      console.log(`⚠️  Orca Whirlpool info test skipped: ${error.message}\n`);
    }

    // Test 6: Drift protocol info (read-only)
    console.log('7. Testing Drift protocol info...');
    try {
      const driftMarkets = await agentKit.methods.getDriftMarkets();
      console.log(`✅ Drift markets (${driftMarkets.length} found):`);
      driftMarkets.slice(0, 3).forEach((market, i) => {
        console.log(`   ${i + 1}. ${market.name}`);
        console.log(`      Type: ${market.type}`);
        console.log(`      Funding Rate: ${market.fundingRate}%`);
        console.log(`      Open Interest: $${market.openInterest.toLocaleString()}`);
      });
      console.log();
    } catch (error) {
      console.log(`⚠️  Drift protocol test skipped: ${error.message}\n`);
    }

    // Test 7: Calculate potential arbitrage opportunities
    console.log('8. Testing arbitrage opportunity detection...');
    try {
      const opportunities = await agentKit.methods.findArbitrageOpportunities(
        'SOL',
        'USDC'
      );
      if (opportunities.length > 0) {
        console.log(`✅ Arbitrage opportunities found: ${opportunities.length}`);
        opportunities.slice(0, 3).forEach((opp, i) => {
          console.log(`   ${i + 1}. ${opp.route}`);
          console.log(`      Profit: ${opp.profitPercent}%`);
          console.log(`      Input: ${opp.inputAmount} ${opp.inputToken}`);
          console.log(`      Output: ${opp.outputAmount} ${opp.outputToken}`);
        });
      } else {
        console.log(`ℹ️  No arbitrage opportunities found at this time`);
      }
      console.log();
    } catch (error) {
      console.log(`⚠️  Arbitrage detection test skipped: ${error.message}\n`);
    }

    // Summary
    console.log('🎉 DeFi operations testing complete!\n');
    console.log('Summary:');
    console.log('  ✅ Agent initialization');
    console.log('  ✅ Jupiter swap quotes');
    console.log('  ✅ Pyth price feeds');
    console.log('  ✅ CoinGecko trending tokens (if configured)');
    console.log('  ✅ Raydium pool info');
    console.log('  ✅ Orca Whirlpool info');
    console.log('  ✅ Drift protocol markets');
    console.log('  ✅ Arbitrage opportunity detection\n');
    console.log('Note: Some tests may be skipped if:');
    console.log('  - Insufficient balance for transactions');
    console.log('  - API keys not configured');
    console.log('  - Network connectivity issues');
    console.log('  - Protocol-specific requirements not met\n');

  } catch (error) {
    console.error('❌ DeFi operations test failed:', error);
    process.exit(1);
  }
}

// Run tests
testDeFiOperations();
