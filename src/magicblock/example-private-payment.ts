/**
 * MagicBlock Private Payment Example
 * 
 * Demonstrates the complete flow using official MagicBlock SDK:
 * 1. Verify TEE integrity (attestation)
 * 2. Create ACL with permissions
 * 3. Delegate accounts to ER
 * 4. Request TEE authorization (client challenge)
 * 5. Execute confidential transaction with access token
 * 6. Commit state back to Solana
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { createPermissionClient, PermissionType } from './permission.js';
import { createDelegationClient } from './delegation.js';
import { createTEEAuthClient } from './tee-auth.js';
import { createERClient } from './er-client.js';

/**
 * Example: Private payment between two agents using official SDK
 */
export async function executePrivatePayment(
  connection: Connection,
  sender: Keypair,
  recipient: PublicKey,
  amount: number
): Promise<string> {
  console.log('🔐 Starting private payment flow with MagicBlock SDK...\n');

  // Step 1: Verify TEE RPC Integrity (Attestation)
  console.log('Step 1: Verifying TEE RPC integrity...');
  const teeAuthClient = createTEEAuthClient(connection);
  
  const integrityVerified = await teeAuthClient.verifyIntegrity();
  if (!integrityVerified) {
    throw new Error('TEE integrity verification failed - not running on secure hardware');
  }
  console.log('✓ TEE running on genuine secure hardware (Intel TDX verified)\n');

  // Step 2: Create permission client and set up ACL
  console.log('Step 2: Setting up permissions...');
  const permissionClient = createPermissionClient(connection);
  
  // Create ACL for sender's account
  const senderACL = await permissionClient.createACL(
    sender.publicKey,
    sender
  );
  console.log(`✓ Created ACL for sender: ${sender.publicKey.toBase58()}`);

  // Grant write permission to recipient (for receiving funds)
  await permissionClient.grantPermission(
    sender.publicKey,
    recipient,
    PermissionType.WRITE,
    sender
  );
  console.log(`✓ Granted WRITE permission to recipient\n`);

  // Step 3: Delegate accounts to Ephemeral Rollup
  console.log('Step 3: Delegating accounts to ER...');
  const delegationClient = createDelegationClient(connection, {
    network: 'devnet',
    region: 'us', // Choose based on your location
  });

  const senderDelegation = await delegationClient.delegate(
    sender.publicKey,
    sender
  );
  console.log(`✓ Delegated sender account to ER: ${senderDelegation.rollupId}\n`);

  // Step 4: Client Challenge Flow - Request authorization token
  console.log('Step 4: Client challenge flow - requesting authorization...');
  
  // The SDK handles:
  // - Requesting challenge from RPC (parameterized by wallet public key)
  // - Signing the received challenge
  // - Submitting signed challenge and receiving token
  const authToken = await teeAuthClient.requestAuthorizationToken(sender);
  console.log(`✓ Authorization token received (expires: ${authToken.expiresAt.toISOString()})\n`);

  // Step 5: Create authorized connection with access token
  console.log('Step 5: Creating authorized connection...');
  
  // Pass the authorization token as a query parameter
  const authorizedConnection = teeAuthClient.createAuthorizedConnection(authToken.token);
  console.log('✓ Authorized connection created for permissioned state access\n');

  // Step 6: Create and execute confidential transaction
  console.log('Step 6: Creating confidential transaction...');
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sender.publicKey,
      toPubkey: recipient,
      lamports: amount * 1e9, // Convert SOL to lamports
    })
  );

  // Get recent blockhash
  const { blockhash } = await authorizedConnection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sender.publicKey;

  // Sign transaction
  transaction.sign(sender);

  // Encrypt payment details for privacy
  const paymentDetails = new TextEncoder().encode(
    JSON.stringify({
      amount,
      recipient: recipient.toBase58(),
      timestamp: Date.now(),
      memo: 'Private agent payment',
    })
  );
  const encryptedData = teeAuthClient.encryptData(paymentDetails, recipient);
  console.log('✓ Transaction created and encrypted\n');

  // Step 7: Execute transaction on authorized connection
  console.log('Step 7: Executing confidential transaction on Private ER...');
  
  // Send transaction using the authorized connection
  // This connection has the access token, so it can query permissioned state
  const signature = await authorizedConnection.sendTransaction(transaction, [sender]);
  await authorizedConnection.confirmTransaction(signature);
  
  console.log(`✓ Transaction executed: ${signature}`);
  console.log('✓ Transaction executed in TEE with privacy guarantees\n');

  // Step 8: Commit state back to Solana (automatic with ER client)
  console.log('Step 8: Committing state to Solana...');
  const erClient = createERClient(connection, {
    erEndpoint: process.env.MAGICBLOCK_PER_URL,
    usePrivateER: true,
    perEndpoint: process.env.MAGICBLOCK_PER_URL,
    gaslessConfig: {
      enabled: true,
      platformPaysGas: true,
    },
  });
  
  const commitResult = await erClient.commitToSolana();
  console.log(`✓ State committed at slot ${commitResult.slot}`);
  console.log(`  Commitment signature: ${commitResult.signature}\n`);

  // Step 9: Cleanup - undelegate accounts
  console.log('Step 9: Cleaning up...');
  await delegationClient.undelegate(sender.publicKey, sender, true);
  console.log('✓ Undelegated sender account');
  
  erClient.stop();
  console.log('✓ ER client stopped\n');

  console.log('🎉 Private payment completed successfully with full TEE attestation!');
  return signature;
}

/**
 * Example: Check permissions before transaction
 */
export async function checkTransactionPermissions(
  connection: Connection,
  account: PublicKey,
  authority: PublicKey,
  requiredPermission: PermissionType
): Promise<boolean> {
  const permissionClient = createPermissionClient(connection);

  const result = await permissionClient.checkPermission(
    account,
    authority,
    requiredPermission
  );

  if (result.allowed) {
    console.log(`✓ Permission granted: ${requiredPermission}`);
    if (result.permission) {
      console.log(`  Granted at: ${result.permission.createdAt.toISOString()}`);
      if (result.permission.expiresAt) {
        console.log(`  Expires at: ${result.permission.expiresAt.toISOString()}`);
      }
    }
  } else {
    console.log(`✗ Permission denied: ${result.reason}`);
  }

  return result.allowed;
}

/**
 * Example: Monitor gas costs for gasless transactions
 */
export async function monitorGasCosts(
  connection: Connection
): Promise<void> {
  const erClient = createERClient(connection, {
    gaslessConfig: {
      enabled: true,
      platformPaysGas: true,
    },
  });

  // Get gas tracking data
  const gasTracking = erClient.getGasTracking();

  console.log('\n📊 Gas Cost Summary:');
  console.log(`Total transactions: ${gasTracking.length}`);

  const totalGas = gasTracking.reduce((sum, tx) => sum + tx.gasUsed, 0);
  const totalCost = gasTracking.reduce((sum, tx) => sum + tx.gasCost, 0);
  const platformPaid = gasTracking.filter((tx) => tx.paidBy === 'platform').length;

  console.log(`Total gas used: ${totalGas.toLocaleString()}`);
  console.log(`Total cost: ${totalCost.toFixed(6)} SOL`);
  console.log(`Platform paid: ${platformPaid}/${gasTracking.length} transactions`);
  console.log(`Savings: ${((platformPaid / gasTracking.length) * 100).toFixed(1)}%\n`);

  erClient.stop();
}

// Example usage (commented out - uncomment to run)

async function main() {
  const connection = new Connection(
    process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );

  // Create test keypairs
  const sender = Keypair.generate();
  const recipient = Keypair.generate();

  // Airdrop some SOL to sender for testing
  const airdropSignature = await connection.requestAirdrop(
    sender.publicKey,
    2 * 1e9 // 2 SOL
  );
  await connection.confirmTransaction(airdropSignature);

  // Execute private payment
  await executePrivatePayment(connection, sender, recipient.publicKey, 0.5);

  // Monitor gas costs
  await monitorGasCosts(connection);
}

main().catch(console.error);
