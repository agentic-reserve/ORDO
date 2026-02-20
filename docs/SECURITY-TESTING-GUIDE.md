# Security Testing Guide

This guide covers how to test the security of Ordo's Solana programs using industry-standard tools and frameworks.

## Overview

Security testing should be performed at multiple levels:
1. **Unit Tests** - Test individual functions
2. **Integration Tests** - Test instruction interactions
3. **Exploit PoCs** - Attempt to exploit vulnerabilities
4. **Fuzzing** - Automated input generation
5. **Static Analysis** - Code scanning tools

## Tools

### 1. Solana PoC Framework (Neodyme Labs)

The Solana PoC Framework facilitates rapid development of security proofs-of-concept.

#### Installation

Add to your test dependencies in `Cargo.toml`:

```toml
[dev-dependencies]
poc-framework = { git = "https://github.com/neodyme-labs/solana-poc-framework.git", branch = "2.2" }
```

#### Features

- **Local Testing** - Test exploits without deploying
- **Remote Testing** - Test on devnet/testnet
- **Utility Functions** - Pre-ground keypairs, transaction printing
- **State Cloning** - Clone accounts from mainnet for testing

#### Basic Usage

```rust
use poc_framework::*;

#[test]
fn test_exploit_attempt() {
    setup_logging(LogLevel::DEBUG);
    
    // Create identifiable keypairs
    let attacker = keypair(0);   // Kooo...
    let victim = keypair(1);     // Koo1...
    let program = keypair(2);    // Koo2...
    
    // Setup local environment
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(attacker, system_program::ID, sol_to_lamports(10.0))
        .add_account_with_lamports(victim, system_program::ID, sol_to_lamports(100.0))
        .clone_upgradable_program_from_cluster(devnet_client(), program)
        .build();
    
    // Attempt exploit
    let result = env.execute_as_transaction(
        &[/* instructions */],
        &[&attacker]
    ).print();
    
    // Verify exploit failed
    assert!(result.is_err(), "Exploit should have been prevented");
}
```

### 2. Common Vulnerability Tests

#### Missing Signer Check

```rust
#[test]
fn test_missing_signer_check() {
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(keypair(0), system_program::ID, sol_to_lamports(10.0))
        .build();
    
    let attacker = keypair(0);
    let victim = keypair(1);
    
    // Try to transfer without victim's signature
    let ix = create_transfer_instruction(
        &victim.pubkey(),  // From (not signing!)
        &attacker.pubkey(),
        1_000_000_000,
    );
    
    let result = env.execute_as_transaction(&[ix], &[&attacker]);
    
    // Should fail due to missing signer
    assert!(result.is_err());
}
```

#### Account Confusion

```rust
#[test]
fn test_account_confusion() {
    let mut env = LocalEnvironment::builder()
        .add_token_mint(keypair(0), Some(keypair(1)), 0, 9, None)
        .build();
    
    let mint = keypair(0);
    let fake_mint = keypair(2);
    
    // Try to use wrong mint
    let ix = create_instruction_with_wrong_mint(
        &fake_mint.pubkey(),  // Wrong mint!
        &mint.pubkey(),
    );
    
    let result = env.execute_as_transaction(&[ix], &[&keypair(1)]);
    
    // Should fail due to account mismatch
    assert!(result.is_err());
}
```

#### Integer Overflow

```rust
#[test]
fn test_integer_overflow() {
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(keypair(0), system_program::ID, sol_to_lamports(10.0))
        .build();
    
    // Try to cause overflow
    let ix = create_instruction_with_amount(u64::MAX);
    
    let result = env.execute_as_transaction(&[ix], &[&keypair(0)]);
    
    // Should fail or handle overflow safely
    assert!(result.is_err() || /* check safe handling */);
}
```

#### PDA Validation

```rust
#[test]
fn test_improper_pda_validation() {
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(keypair(0), system_program::ID, sol_to_lamports(10.0))
        .build();
    
    let program_id = agent_registry::ID;
    
    // Create fake PDA (not derived correctly)
    let fake_pda = keypair(1).pubkey();
    
    // Try to use fake PDA
    let ix = create_instruction_with_pda(&fake_pda);
    
    let result = env.execute_as_transaction(&[ix], &[&keypair(0)]);
    
    // Should fail due to invalid PDA
    assert!(result.is_err());
}
```

### 3. Anchor Security Tests

For Anchor programs, use the built-in testing framework:

```rust
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program_pack::Pack;

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_unauthorized_access() {
        let program_id = Pubkey::new_unique();
        let attacker = Pubkey::new_unique();
        let victim = Pubkey::new_unique();
        
        // Setup accounts
        let mut accounts = vec![
            AccountInfo::new(
                &attacker,
                true,  // is_signer
                false, // is_writable
                &mut 0,
                &mut [],
                &program_id,
                false,
                0,
            ),
            AccountInfo::new(
                &victim,
                false, // NOT signer
                true,  // is_writable
                &mut 0,
                &mut [],
                &program_id,
                false,
                0,
            ),
        ];
        
        // Try to execute instruction
        let result = register_agent(
            Context::new(&program_id, &mut accounts, &[], BTreeMap::new()),
            "Attacker".to_string(),
            "Evil agent".to_string(),
            "".to_string(),
            vec![],
            false,
            0,
        );
        
        // Should fail
        assert!(result.is_err());
    }
}
```

### 4. Fuzzing with Honggfuzz

Install honggfuzz:

```bash
cargo install honggfuzz
```

Create a fuzz target in `fuzz/fuzz_targets/`:

```rust
use honggfuzz::fuzz;
use agent_registry::instruction::*;

fn main() {
    loop {
        fuzz!(|data: &[u8]| {
            // Try to deserialize random data as instruction
            if let Ok(ix) = try_from_slice_unchecked::<AgentInstruction>(data) {
                // Process instruction
                // Check for panics, crashes, or unexpected behavior
                let _ = process_instruction(&ix);
            }
        });
    }
}
```

Run fuzzer:

```bash
cargo hfuzz run fuzz_target
```

### 5. Static Analysis with Soteria

Install Soteria:

```bash
cargo install soteria
```

Run analysis:

```bash
cd programs/agent-registry
soteria -analyzeAll .
```

Common issues Soteria detects:
- Missing signer checks
- Missing ownership checks
- Arbitrary CPI
- Integer overflow/underflow
- Uninitialized accounts

### 6. Property-Based Testing

Use `proptest` for property-based testing:

```toml
[dev-dependencies]
proptest = "1.0"
```

Example test:

```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_amount_never_negative(amount in 0u64..u64::MAX) {
        let result = calculate_fee(amount);
        prop_assert!(result >= 0);
    }
    
    #[test]
    fn test_no_overflow(a in 0u64..u64::MAX/2, b in 0u64..u64::MAX/2) {
        let result = safe_add(a, b);
        prop_assert!(result.is_ok());
        prop_assert!(result.unwrap() == a + b);
    }
}
```

## Test Scenarios

### Scenario 1: Unauthorized Agent Registration

```rust
#[test]
fn test_unauthorized_registration() {
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(keypair(0), system_program::ID, sol_to_lamports(10.0))
        .clone_upgradable_program_from_cluster(devnet_client(), agent_registry::ID)
        .build();
    
    let attacker = keypair(0);
    let victim_wallet = keypair(1);
    
    // Attacker tries to register agent using victim's wallet
    let ix = create_register_agent_ix(
        &agent_registry::ID,
        &victim_wallet.pubkey(),  // Victim's wallet
        &attacker.pubkey(),        // Attacker as authority
        "Malicious Agent",
        "Stealing funds",
    );
    
    let result = env.execute_as_transaction(&[ix], &[&attacker]);
    
    assert!(result.is_err(), "Should not allow unauthorized registration");
}
```

### Scenario 2: Reputation Manipulation

```rust
#[test]
fn test_reputation_manipulation() {
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(keypair(0), system_program::ID, sol_to_lamports(10.0))
        .clone_upgradable_program_from_cluster(devnet_client(), agent_registry::ID)
        .build();
    
    let attacker = keypair(0);
    let agent = keypair(1);
    
    // Try to give self maximum reputation
    let ix = create_update_reputation_ix(
        &agent_registry::ID,
        &agent.pubkey(),
        &attacker.pubkey(),
        i64::MAX,  // Maximum reputation
        "Self-promotion",
    );
    
    let result = env.execute_as_transaction(&[ix], &[&attacker]);
    
    assert!(result.is_err(), "Should not allow self-reputation updates");
}
```

### Scenario 3: Reentrancy Attack

```rust
#[test]
fn test_reentrancy_protection() {
    let mut env = LocalEnvironment::builder()
        .add_account_with_lamports(keypair(0), system_program::ID, sol_to_lamports(10.0))
        .clone_upgradable_program_from_cluster(devnet_client(), agent_registry::ID)
        .build();
    
    let attacker = keypair(0);
    
    // Try to call instruction recursively
    let ix1 = create_instruction_that_calls_back();
    let ix2 = create_instruction_that_calls_back();
    
    let result = env.execute_as_transaction(&[ix1, ix2], &[&attacker]);
    
    // Should have reentrancy protection
    assert!(result.is_err() || /* check state is consistent */);
}
```

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/security-tests.yml`:

```yaml
name: Security Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  security-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Rust
        uses: actions-rust-lang/setup-rust-toolchain@v1
      
      - name: Install Solana
        run: |
          sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"
          echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH
      
      - name: Install Anchor
        run: |
          cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
          avm install 0.30.1
          avm use 0.30.1
      
      - name: Install Soteria
        run: cargo install soteria
      
      - name: Run Soteria Analysis
        run: |
          cd programs/agent-registry
          soteria -analyzeAll .
      
      - name: Run Security Tests
        run: cargo test --test security_tests
      
      - name: Check for Vulnerabilities
        run: cargo audit
```

## Best Practices

### 1. Test Early and Often

Run security tests on every commit:

```bash
# Pre-commit hook
#!/bin/bash
cargo test --test security_tests
if [ $? -ne 0 ]; then
    echo "Security tests failed!"
    exit 1
fi
```

### 2. Use Multiple Tools

Don't rely on a single tool:
- ✅ Soteria for static analysis
- ✅ PoC Framework for exploit testing
- ✅ Fuzzing for edge cases
- ✅ Property-based testing for invariants

### 3. Test Realistic Scenarios

Don't just test happy paths:
- Malicious inputs
- Edge cases (0, MAX, negative)
- Race conditions
- State inconsistencies

### 4. Document Test Cases

```rust
/// Tests that an attacker cannot register an agent using another user's wallet
/// 
/// Attack Vector: Missing signer check
/// Expected: Transaction should fail with "Missing required signature"
/// Severity: Critical
#[test]
fn test_missing_signer_check() {
    // ...
}
```

### 5. Keep Tests Updated

When fixing a vulnerability:
1. Write a test that reproduces it
2. Verify the test fails
3. Fix the vulnerability
4. Verify the test passes
5. Keep the test in the suite

## Resources

- [Solana PoC Framework](https://github.com/neodyme-labs/solana-poc-framework)
- [Soteria](https://github.com/blocksecteam/soteria)
- [Anchor Testing](https://www.anchor-lang.com/docs/testing)
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)
- [Neodyme Security Blog](https://blog.neodyme.io/)

## Getting Help

If you find a vulnerability:
1. **DO NOT** open a public issue
2. Email security@ordo.com
3. Include test case demonstrating the issue
4. Wait for response before disclosure

For testing questions:
- GitHub Discussions
- Discord security channel
- Email: security@ordo.com
