# Solana PoC Framework Skill

## Overview
This skill provides guidance on using the Solana PoC Framework by Neodyme for security testing and vulnerability research on Solana smart contracts. The framework facilitates rapid development of Proof-of-Concepts for bugs in Solana programs.

## When to Use This Skill
- Developing security PoCs for Solana smart contracts
- Testing vulnerabilities in local or remote environments
- Creating exploit demonstrations for bug bounty submissions
- Auditing Solana programs for security issues
- Validating security fixes

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
poc-framework = { git = "https://github.com/neodyme-labs/solana-poc-framework.git", branch = "2.2" }
```

Supported Solana versions: 1.11, 1.13, 1.14, 1.16, 2.2

## Core Concepts

### 1. Environment Trait
The framework provides two environment types:
- **RemoteEnvironment**: Execute transactions on devnet/testnet/localhost
- **LocalEnvironment**: Execute transactions locally on arbitrary chain state

### 2. Utility Functions

#### Setup Logging
```rust
use poc_framework::*;

setup_logging(LogLevel::DEBUG);
```

#### Identifiable Keypairs
```rust
let authority = keypair(0);   // KoooVyhdpoRPA6gpn7xr3cmjqAvtpHcjcBX6JBKu1nf
let target    = keypair(1);   // Koo1BQTQYawwKVBg71J2sru7W51EJgfbyyHsTFCssRW
let mint      = keypair(2);   // Koo2SZ393psmp7ags3hMz59ciV3XWLj1GkPousNgTH1
let victim    = keypair(137); // K137jwH7CncXBTadHbLDsHNWUhuLDN4ddegJL2hmn6u

// Or use random keypairs
let random = random_keypair();
```

#### Transaction Printing
```rust
env.execute_as_transaction(&[...], &[...]).print();
```

## Remote Environment Usage

### Basic Setup
```rust
use poc_framework::*;

fn main() -> Result<()> {
    setup_logging(LogLevel::DEBUG);
    
    let payer = read_keypair_file("wallet.json")?;
    let client = devnet_client();
    let mut env = RemoteEnvironment::new(client, payer);
    
    // Your exploit code here
    
    Ok(())
}
```

### With Airdrop
```rust
let mut env = RemoteEnvironment::new_with_airdrop(
    devnet_client(),
    sol_to_lamports(10.0)
);
```

### Client Helpers
```rust
let client = devnet_client();
let client = testnet_client();
let client = localhost_client();
```

## Local Environment Usage

### Building Local State
```rust
use poc_framework::*;

fn main() -> Result<()> {
    setup_logging(LogLevel::DEBUG);
    
    let authority = keypair(0);
    let mint = keypair(2);
    let client = devnet_client();
    
    let mut env = LocalEnvironment::builder()
        // Add account with lamports
        .add_account_with_lamports(
            authority,
            system_program::ID,
            sol_to_lamports(10.0)
        )
        // Create token mint
        .add_token_mint(mint, Some(authority), 0, 1, None)
        // Create associated token account
        .add_associated_token_account(authority, mint, 1337)
        // Clone program from cluster
        .clone_upgradable_program_from_cluster(client, my_program::ID)
        .build();
    
    // Your exploit code here
    
    Ok(())
}
```

### Local Environment Methods
```rust
// Deploy program from file
.add_program_from_file(program_id, "path/to/program.so")

// Add arbitrary account
.add_account_with_data(pubkey, owner, lamports, data)

// Clone account from cluster
.clone_account_from_cluster(client, pubkey)

// Clone upgradable program
.clone_upgradable_program_from_cluster(client, program_id)
```

## Common Patterns

### 1. Testing Access Control Vulnerabilities
```rust
use poc_framework::*;

fn test_missing_signer_check() -> Result<()> {
    setup_logging(LogLevel::DEBUG);
    
    let attacker = keypair(0);
    let victim = keypair(1);
    let program_id = keypair(2);
    
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(attacker, system_program::ID, sol_to_lamports(1.0))
        .add_account_with_lamports(victim, system_program::ID, sol_to_lamports(10.0))
        .add_program_from_file(program_id, "target/deploy/vulnerable.so")
        .build();
    
    // Attempt unauthorized action
    let ix = create_malicious_instruction(program_id, attacker, victim);
    env.execute_as_transaction(&[ix], &[&attacker]).print();
    
    Ok(())
}
```

### 2. Testing Arithmetic Vulnerabilities
```rust
fn test_overflow() -> Result<()> {
    setup_logging(LogLevel::DEBUG);
    
    let user = keypair(0);
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(user, system_program::ID, sol_to_lamports(1.0))
        .clone_upgradable_program_from_cluster(devnet_client(), program_id)
        .build();
    
    // Trigger overflow with large values
    let ix = create_overflow_instruction(program_id, user, u64::MAX);
    env.execute_as_transaction(&[ix], &[&user]).print();
    
    Ok(())
}
```

### 3. Testing PDA Validation
```rust
fn test_pda_validation() -> Result<()> {
    setup_logging(LogLevel::DEBUG);
    
    let attacker = keypair(0);
    let fake_pda = keypair(1); // Not a real PDA
    
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(attacker, system_program::ID, sol_to_lamports(1.0))
        .add_account_with_lamports(fake_pda, program_id, sol_to_lamports(0.1))
        .clone_upgradable_program_from_cluster(devnet_client(), program_id)
        .build();
    
    // Try to use fake PDA
    let ix = create_instruction_with_pda(program_id, fake_pda);
    env.execute_as_transaction(&[ix], &[&attacker]).print();
    
    Ok(())
}
```

### 4. Testing Reentrancy
```rust
fn test_reentrancy() -> Result<()> {
    setup_logging(LogLevel::DEBUG);
    
    let attacker = keypair(0);
    let malicious_program = keypair(1);
    
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(attacker, system_program::ID, sol_to_lamports(1.0))
        .add_program_from_file(malicious_program, "malicious.so")
        .clone_upgradable_program_from_cluster(devnet_client(), target_program)
        .build();
    
    // Trigger reentrancy via CPI
    let ix = create_reentrant_instruction(target_program, malicious_program);
    env.execute_as_transaction(&[ix], &[&attacker]).print();
    
    Ok(())
}
```

## Environment Trait Methods

### Transaction Execution
```rust
// Execute single instruction
env.execute_as_transaction(&[instruction], &[signer1, signer2])?;

// Execute multiple instructions
env.execute_as_transaction(&[ix1, ix2, ix3], &[signer])?;
```

### Token Operations
```rust
// Create token mint
env.create_token_mint(mint, authority, decimals)?;

// Create token account
env.create_token_account(account, mint, owner)?;

// Create associated token account
env.create_associated_token_account(owner, mint)?;

// Mint tokens
env.mint_tokens(mint, destination, authority, amount)?;
```

### Account Operations
```rust
// Create account
env.create_account(account, owner, space, lamports)?;

// Transfer SOL
env.transfer_sol(from, to, lamports)?;
```

## Best Practices

### 1. Always Use Logging
```rust
setup_logging(LogLevel::DEBUG);
```
This is essential for understanding why transactions fail.

### 2. Use Identifiable Keypairs
```rust
let authority = keypair(0);  // Easy to identify in logs
let attacker = keypair(99);  // Clear role identification
```

### 3. Start Local, Then Test Remote
```rust
// 1. Develop exploit locally
let mut local_env = LocalEnvironment::builder()...;
test_exploit(&mut local_env)?;

// 2. Verify on devnet
let mut remote_env = RemoteEnvironment::new(devnet_client(), payer);
test_exploit(&mut remote_env)?;
```

### 4. Avoid Illegal State in Local Env
Use transactions to set up state rather than directly creating accounts with arbitrary data:
```rust
// BAD: Creates potentially illegal state
.add_account_with_data(account, owner, lamports, arbitrary_data)

// GOOD: Use transactions to create legal state
let ix = initialize_account(program_id, account);
env.execute_as_transaction(&[ix], &[authority])?;
```

### 5. Print Transactions for Debugging
```rust
env.execute_as_transaction(&[ix], &[signer])
    .print();  // Shows detailed transaction info
```

## Security Testing Workflow

### 1. Identify Vulnerability
- Review program code for common vulnerabilities
- Check OWASP Top 10 for smart contracts
- Look for missing checks, arithmetic issues, access control problems

### 2. Create PoC Structure
```rust
use poc_framework::*;

fn main() -> Result<()> {
    setup_logging(LogLevel::DEBUG);
    
    // Setup environment
    let env = setup_environment()?;
    
    // Execute exploit
    let result = execute_exploit(&env)?;
    
    // Verify success
    verify_exploit_success(&env, result)?;
    
    Ok(())
}
```

### 3. Test Locally First
```rust
fn setup_environment() -> Result<LocalEnvironment> {
    LocalEnvironment::builder()
        .add_account_with_lamports(attacker, system_program::ID, sol_to_lamports(1.0))
        .clone_upgradable_program_from_cluster(devnet_client(), target_program)
        .build()
}
```

### 4. Verify on Devnet
```rust
fn verify_on_devnet() -> Result<()> {
    let payer = read_keypair_file("wallet.json")?;
    let mut env = RemoteEnvironment::new(devnet_client(), payer);
    
    execute_exploit(&env)?;
    
    Ok(())
}
```

### 5. Document and Report
- Capture transaction logs
- Document exploit steps
- Calculate impact
- Submit to bug bounty program

## Common Vulnerabilities to Test

### 1. Missing Signer Checks
```rust
// Test if instruction can be called without proper signer
let ix = vulnerable_instruction(program_id, victim_account);
env.execute_as_transaction(&[ix], &[attacker]).print();
```

### 2. Missing Owner Checks
```rust
// Test if account owner is validated
let fake_account = create_fake_account(wrong_owner);
let ix = instruction_with_account(program_id, fake_account);
env.execute_as_transaction(&[ix], &[attacker]).print();
```

### 3. Integer Overflow/Underflow
```rust
// Test with boundary values
let ix = arithmetic_instruction(program_id, u64::MAX);
env.execute_as_transaction(&[ix], &[user]).print();
```

### 4. Improper PDA Validation
```rust
// Test with non-PDA account
let fake_pda = keypair(10);
let ix = pda_instruction(program_id, fake_pda);
env.execute_as_transaction(&[ix], &[attacker]).print();
```

### 5. Arbitrary CPI
```rust
// Test if program allows arbitrary CPI calls
let malicious_program = keypair(20);
let ix = cpi_instruction(program_id, malicious_program);
env.execute_as_transaction(&[ix], &[attacker]).print();
```

## Integration with Ordo

### Testing Agent Registry Program
```rust
use poc_framework::*;

fn test_agent_registry_security() -> Result<()> {
    setup_logging(LogLevel::DEBUG);
    
    let authority = keypair(0);
    let attacker = keypair(1);
    let agent_registry = /* your program ID */;
    
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(authority, system_program::ID, sol_to_lamports(10.0))
        .add_account_with_lamports(attacker, system_program::ID, sol_to_lamports(1.0))
        .add_program_from_file(agent_registry, "target/deploy/agent_registry.so")
        .build();
    
    // Test 1: Unauthorized agent registration
    test_unauthorized_registration(&mut env, attacker, agent_registry)?;
    
    // Test 2: Agent data manipulation
    test_data_manipulation(&mut env, attacker, agent_registry)?;
    
    // Test 3: PDA validation
    test_pda_validation(&mut env, attacker, agent_registry)?;
    
    Ok(())
}
```

## Troubleshooting

### Transaction Fails Silently
- Enable DEBUG logging: `setup_logging(LogLevel::DEBUG)`
- Check for missing signers
- Verify account ownership

### Program Not Found
- Ensure program is deployed or cloned correctly
- Check program ID matches
- Verify cluster connection

### Account Data Mismatch
- Avoid creating illegal state in LocalEnvironment
- Use transactions to initialize accounts
- Clone from cluster when possible

## Resources

- [PoC Framework GitHub](https://github.com/neodyme-labs/solana-poc-framework)
- [PoC Framework Docs](https://docs.rs/poc-framework/)
- [Neodyme Security Blog](https://neodyme.io/blog/)
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)

## Ethical Guidelines

- Only test on devnet/testnet/localhost
- Never exploit vulnerabilities on mainnet
- Report vulnerabilities responsibly through bug bounty programs
- Respect disclosure timelines
- Don't share exploit details publicly before fixes are deployed

## Disclaimer

This framework is for security research and responsible disclosure only. Illegal usage is heavily discouraged. Most Solana projects offer generous bug bounties for responsible disclosure.
