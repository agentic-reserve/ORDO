# Trident Fuzzing Framework Skill

## Overview
Trident is the first and only manually-guided fuzzing framework for Solana programs, capable of processing up to 12,000 transactions per second. Built by Ackee Blockchain and granted by the Solana Foundation, Trident enables stateful, property-based fuzzing with flow control for comprehensive security testing.

## When to Use This Skill
- Fuzzing Solana programs for edge cases and vulnerabilities
- Property-based testing of program invariants
- Stateful testing with complex transaction sequences
- Regression testing between program versions
- Stress testing programs at Solana speed
- Preparing programs for security audits

## Why Trident?

### Key Benefits
- **High throughput**: 12,000+ transactions per second
- **Stateful fuzzing**: Inputs generated based on account state changes
- **Manually-guided**: Define custom strategies for tricky code paths
- **Anchor-like syntax**: Familiar macros and patterns
- **Flow-based sequences**: Combine instructions into realistic patterns
- **Property testing**: Verify invariants before/after execution
- **Regression testing**: Compare results between versions

### Trusted By
- Kamino Finance
- Solana Foundation
- Ackee Blockchain Security (auditors of Lido, Safe, Axelar)

## Installation

```bash
cargo install trident-cli
```

Latest version: **0.11.1**

## Quick Start

### 1. Initialize Trident in Your Project

```bash
cd your-anchor-project
trident init
```

This creates:
- `trident-tests/` directory
- `fuzz_tests/` subdirectory for fuzz test templates

### 2. Generate Fuzz Test Template

```bash
trident fuzz add <fuzz_test_name>
```

This generates:
- `fuzz_tests/fuzz_<name>/fuzz_instructions.rs` - Instruction builders
- `fuzz_tests/fuzz_<name>/test_fuzz.rs` - Main fuzz test logic
- `fuzz_tests/fuzz_<name>/accounts_snapshots.rs` - Account state snapshots

### 3. Write Your First Fuzz Test

```rust
use trident_client::fuzzing::*;

#[derive(Arbitrary, DisplayTest, FuzzTestExecutor, FuzzDeserialize)]
pub enum FuzzInstruction {
    Initialize(Initialize),
    Deposit(Deposit),
    Withdraw(Withdraw),
}

#[derive(Arbitrary, Debug)]
pub struct FuzzData {
    pub instructions: Vec<FuzzInstruction>,
}

struct MyFuzzTest {
    trident: TridentSVM,
    fuzz_accounts: FuzzAccounts,
}

impl FuzzTestExecutor<FuzzData> for MyFuzzTest {
    #[init]
    fn start(&mut self) {
        // Initialize program state
        let mut tx = InitializeTransaction::build(
            &mut self.trident,
            &mut self.fuzz_accounts
        );
        
        self.trident.execute_transaction(&mut tx, Some("Initialize"));
    }

    #[flow]
    fn deposit_flow(&mut self) {
        let mut tx = DepositTransaction::build(
            &mut self.trident,
            &mut self.fuzz_accounts
        );
        
        self.trident.execute_transaction(&mut tx, Some("Deposit"));
    }

    #[flow]
    fn withdraw_flow(&mut self) {
        let mut tx = WithdrawTransaction::build(
            &mut self.trident,
            &mut self.fuzz_accounts
        );
        
        self.trident.execute_transaction(&mut tx, Some("Withdraw"));
    }

    #[invariant]
    fn check_balance_invariant(&mut self) {
        // Verify invariants hold
        let vault = self.fuzz_accounts.vault.get_account();
        let total_deposits = self.fuzz_accounts.total_deposits;
        
        assert!(vault.balance >= total_deposits, "Balance invariant violated");
    }
}
```

### 4. Run Fuzz Test

```bash
# Run with default settings
trident fuzz run <fuzz_test_name>

# Run with custom iterations
trident fuzz run <fuzz_test_name> --iterations 10000

# Run with multiple threads
trident fuzz run <fuzz_test_name> --threads 8
```

## Core Concepts

### 1. Macros

#### `#[init]` - Initialization
Runs once at the start of each fuzz iteration:

```rust
#[init]
fn start(&mut self) {
    // Setup initial program state
    let mut tx = InitializeTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
    self.trident.execute_transaction(&mut tx, Some("Initialize"));
}
```

#### `#[flow]` - Transaction Flows
Define sequences of instructions that can be executed:

```rust
#[flow]
fn deposit_flow(&mut self) {
    let mut tx = DepositTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
    self.trident.execute_transaction(&mut tx, Some("Deposit"));
}

#[flow]
fn withdraw_flow(&mut self) {
    let mut tx = WithdrawTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
    self.trident.execute_transaction(&mut tx, Some("Withdraw"));
}
```

#### `#[invariant]` - Property Checks
Verify invariants after each transaction:

```rust
#[invariant]
fn check_total_supply(&mut self) {
    let total_supply = self.fuzz_accounts.calculate_total_supply();
    assert!(total_supply <= MAX_SUPPLY, "Total supply exceeded");
}

#[invariant]
fn check_balance_consistency(&mut self) {
    let vault_balance = self.fuzz_accounts.vault.balance;
    let user_balances: u64 = self.fuzz_accounts.users.iter().map(|u| u.balance).sum();
    assert_eq!(vault_balance, user_balances, "Balance mismatch");
}
```

### 2. Account Management

#### FuzzAccounts Structure
```rust
pub struct FuzzAccounts {
    pub authority: Keypair,
    pub vault: PdaStore<Vault>,
    pub users: Vec<AccountStore<User>>,
    // Add your accounts here
}

impl FuzzAccounts {
    pub fn new() -> Self {
        Self {
            authority: Keypair::new(),
            vault: PdaStore::new(),
            users: vec![],
        }
    }
}
```

#### Account Stores
```rust
// Regular account
pub struct AccountStore<T> {
    pubkey: Pubkey,
    account: Option<T>,
}

// PDA account
pub struct PdaStore<T> {
    pubkey: Pubkey,
    bump: u8,
    account: Option<T>,
}
```

### 3. Transaction Building

```rust
pub struct DepositTransaction;

impl DepositTransaction {
    pub fn build(
        trident: &mut TridentSVM,
        accounts: &mut FuzzAccounts,
    ) -> Transaction {
        // Generate random amount
        let amount = trident.get_random_u64(1, 1000);
        
        // Select random user
        let user_idx = trident.get_random_usize(0, accounts.users.len());
        let user = &accounts.users[user_idx];
        
        // Build instruction
        let ix = your_program::instruction::Deposit {
            amount,
        };
        
        let accounts = your_program::accounts::Deposit {
            vault: accounts.vault.pubkey,
            user: user.pubkey,
            authority: accounts.authority.pubkey(),
            system_program: system_program::ID,
        };
        
        Transaction::new_with_payer(
            &[ix.data()],
            Some(&accounts.authority.pubkey()),
        )
    }
}
```

## Advanced Features

### 1. Stateful Fuzzing

Track state changes across transactions:

```rust
pub struct FuzzAccounts {
    pub vault: PdaStore<Vault>,
    pub total_deposits: u64,  // Track cumulative deposits
    pub total_withdrawals: u64,  // Track cumulative withdrawals
}

#[flow]
fn deposit_flow(&mut self) {
    let amount = self.trident.get_random_u64(1, 1000);
    
    // Update state tracking
    self.fuzz_accounts.total_deposits += amount;
    
    let mut tx = DepositTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
    self.trident.execute_transaction(&mut tx, Some("Deposit"));
}

#[invariant]
fn check_balance_matches_state(&mut self) {
    let expected = self.fuzz_accounts.total_deposits - self.fuzz_accounts.total_withdrawals;
    let actual = self.fuzz_accounts.vault.get_account().balance;
    assert_eq!(expected, actual, "Balance mismatch");
}
```

### 2. Flow Sequences

Combine multiple flows into realistic patterns:

```rust
#[flow]
fn deposit_withdraw_sequence(&mut self) {
    // Deposit
    let mut deposit_tx = DepositTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
    self.trident.execute_transaction(&mut deposit_tx, Some("Deposit"));
    
    // Immediately try to withdraw
    let mut withdraw_tx = WithdrawTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
    self.trident.execute_transaction(&mut withdraw_tx, Some("Withdraw"));
}

#[flow]
fn multi_user_interaction(&mut self) {
    // User 1 deposits
    let mut tx1 = DepositTransaction::build_for_user(&mut self.trident, &mut self.fuzz_accounts, 0);
    self.trident.execute_transaction(&mut tx1, Some("User1 Deposit"));
    
    // User 2 deposits
    let mut tx2 = DepositTransaction::build_for_user(&mut self.trident, &mut self.fuzz_accounts, 1);
    self.trident.execute_transaction(&mut tx2, Some("User2 Deposit"));
    
    // User 1 withdraws
    let mut tx3 = WithdrawTransaction::build_for_user(&mut self.trident, &mut self.fuzz_accounts, 0);
    self.trident.execute_transaction(&mut tx3, Some("User1 Withdraw"));
}
```

### 3. Property-Based Testing

Define and verify complex properties:

```rust
#[invariant]
fn check_no_negative_balances(&mut self) {
    for user in &self.fuzz_accounts.users {
        if let Some(account) = user.get_account() {
            assert!(account.balance >= 0, "Negative balance detected");
        }
    }
}

#[invariant]
fn check_total_supply_constant(&mut self) {
    let total = self.fuzz_accounts.calculate_total_supply();
    assert_eq!(total, INITIAL_SUPPLY, "Total supply changed");
}

#[invariant]
fn check_authority_unchanged(&mut self) {
    let vault = self.fuzz_accounts.vault.get_account();
    assert_eq!(
        vault.authority,
        self.fuzz_accounts.authority.pubkey(),
        "Authority was changed"
    );
}
```

### 4. Account Snapshots

Compare account states before and after:

```rust
#[flow]
fn test_with_snapshot(&mut self) {
    // Take snapshot before
    let snapshot_before = self.fuzz_accounts.vault.snapshot();
    
    // Execute transaction
    let mut tx = DepositTransaction::build(&mut self.trident, &mut self.fuzz_accounts);
    self.trident.execute_transaction(&mut tx, Some("Deposit"));
    
    // Take snapshot after
    let snapshot_after = self.fuzz_accounts.vault.snapshot();
    
    // Compare
    assert!(
        snapshot_after.balance > snapshot_before.balance,
        "Balance should increase after deposit"
    );
}
```

### 5. Custom Strategies

Guide fuzzer to interesting inputs:

```rust
impl DepositTransaction {
    pub fn build(trident: &mut TridentSVM, accounts: &mut FuzzAccounts) -> Transaction {
        // Custom strategy: test edge cases more often
        let amount = if trident.get_random_bool(0.1) {
            // 10% chance: test boundary values
            match trident.get_random_u8(0, 3) {
                0 => 0,           // Zero
                1 => 1,           // Minimum
                2 => u64::MAX,    // Maximum
                _ => u64::MAX - 1, // Near maximum
            }
        } else {
            // 90% chance: normal values
            trident.get_random_u64(1, 10000)
        };
        
        // Build transaction with strategic amount
        // ...
    }
}
```

## Testing Patterns

### 1. Access Control Testing

```rust
#[flow]
fn test_unauthorized_access(&mut self) {
    // Create unauthorized user
    let unauthorized = Keypair::new();
    
    // Try to perform privileged operation
    let mut tx = AdminTransaction::build_with_authority(
        &mut self.trident,
        &mut self.fuzz_accounts,
        &unauthorized,
    );
    
    // Should fail
    let result = self.trident.execute_transaction(&mut tx, Some("Unauthorized"));
    assert!(result.is_err(), "Unauthorized access should fail");
}
```

### 2. Arithmetic Overflow Testing

```rust
#[flow]
fn test_overflow_protection(&mut self) {
    // Try to deposit maximum value
    let mut tx1 = DepositTransaction::build_with_amount(
        &mut self.trident,
        &mut self.fuzz_accounts,
        u64::MAX,
    );
    self.trident.execute_transaction(&mut tx1, Some("Max Deposit"));
    
    // Try to deposit more (should fail or saturate)
    let mut tx2 = DepositTransaction::build_with_amount(
        &mut self.trident,
        &mut self.fuzz_accounts,
        1,
    );
    self.trident.execute_transaction(&mut tx2, Some("Overflow Attempt"));
}

#[invariant]
fn check_no_overflow(&mut self) {
    let vault = self.fuzz_accounts.vault.get_account();
    assert!(vault.balance <= u64::MAX, "Overflow detected");
}
```

### 3. Reentrancy Testing

```rust
#[flow]
fn test_reentrancy(&mut self) {
    // Setup malicious program that attempts reentrancy
    let malicious_program = self.setup_malicious_program();
    
    // Try to trigger reentrancy via CPI
    let mut tx = CpiTransaction::build_with_target(
        &mut self.trident,
        &mut self.fuzz_accounts,
        malicious_program,
    );
    
    self.trident.execute_transaction(&mut tx, Some("Reentrancy Test"));
}
```

### 4. PDA Validation Testing

```rust
#[flow]
fn test_fake_pda(&mut self) {
    // Create fake PDA (not derived correctly)
    let fake_pda = Keypair::new();
    
    // Try to use fake PDA
    let mut tx = ClaimTransaction::build_with_pda(
        &mut self.trident,
        &mut self.fuzz_accounts,
        fake_pda.pubkey(),
    );
    
    // Should fail
    let result = self.trident.execute_transaction(&mut tx, Some("Fake PDA"));
    assert!(result.is_err(), "Fake PDA should be rejected");
}
```

## Ordo-Specific Fuzzing Examples

### Agent Registry Fuzzing

```rust
#[derive(Arbitrary, DisplayTest, FuzzTestExecutor, FuzzDeserialize)]
pub enum AgentFuzzInstruction {
    RegisterAgent(RegisterAgent),
    UpdateAgent(UpdateAgent),
    DeactivateAgent(DeactivateAgent),
    CreateCollaboration(CreateCollaboration),
}

struct AgentRegistryFuzzTest {
    trident: TridentSVM,
    fuzz_accounts: AgentFuzzAccounts,
}

impl FuzzTestExecutor<FuzzData> for AgentRegistryFuzzTest {
    #[init]
    fn start(&mut self) {
        // Initialize registry
        let mut tx = InitializeRegistryTransaction::build(
            &mut self.trident,
            &mut self.fuzz_accounts
        );
        self.trident.execute_transaction(&mut tx, Some("Initialize"));
    }

    #[flow]
    fn register_agent_flow(&mut self) {
        let mut tx = RegisterAgentTransaction::build(
            &mut self.trident,
            &mut self.fuzz_accounts
        );
        self.trident.execute_transaction(&mut tx, Some("RegisterAgent"));
    }

    #[flow]
    fn collaboration_flow(&mut self) {
        // Register two agents
        let mut tx1 = RegisterAgentTransaction::build(
            &mut self.trident,
            &mut self.fuzz_accounts
        );
        self.trident.execute_transaction(&mut tx1, Some("RegisterAgent1"));
        
        let mut tx2 = RegisterAgentTransaction::build(
            &mut self.trident,
            &mut self.fuzz_accounts
        );
        self.trident.execute_transaction(&mut tx2, Some("RegisterAgent2"));
        
        // Create collaboration
        let mut tx3 = CreateCollaborationTransaction::build(
            &mut self.trident,
            &mut self.fuzz_accounts
        );
        self.trident.execute_transaction(&mut tx3, Some("CreateCollaboration"));
    }

    #[invariant]
    fn check_agent_count(&mut self) {
        let registry = self.fuzz_accounts.registry.get_account();
        assert!(
            registry.agent_count <= MAX_AGENTS,
            "Too many agents registered"
        );
    }

    #[invariant]
    fn check_active_agents(&mut self) {
        for agent in &self.fuzz_accounts.agents {
            if let Some(account) = agent.get_account() {
                if account.is_active {
                    assert!(
                        !account.name.is_empty(),
                        "Active agent must have name"
                    );
                }
            }
        }
    }
}
```

### DeFi Integration Fuzzing

```rust
#[flow]
fn swap_flow(&mut self) {
    // Random swap amount
    let amount = self.trident.get_random_u64(1, 10000);
    
    // Random slippage (0.1% to 5%)
    let slippage_bps = self.trident.get_random_u64(10, 500);
    
    let mut tx = SwapTransaction::build_with_params(
        &mut self.trident,
        &mut self.fuzz_accounts,
        amount,
        slippage_bps,
    );
    
    self.trident.execute_transaction(&mut tx, Some("Swap"));
}

#[invariant]
fn check_slippage_protection(&mut self) {
    let swap_state = self.fuzz_accounts.swap_state.get_account();
    
    if let Some(last_swap) = swap_state.last_swap {
        let actual_slippage = calculate_slippage(
            last_swap.amount_in,
            last_swap.amount_out,
        );
        
        assert!(
            actual_slippage <= last_swap.max_slippage,
            "Slippage exceeded maximum"
        );
    }
}
```

## Configuration

### Cargo.toml

```toml
[dependencies]
trident-client = "0.11.1"
arbitrary = "1.3"

[[bin]]
name = "fuzz_0"
path = "fuzz_tests/fuzz_0/test_fuzz.rs"
```

### Fuzz Configuration

```rust
// In test_fuzz.rs
const ITERATIONS: u32 = 10000;
const THREADS: u8 = 8;

fn main() {
    loop {
        fuzz_trident!(fuzz_ix: FuzzInstruction, |fuzz_data: FuzzData| {
            let mut test = MyFuzzTest::new();
            test.run(fuzz_data);
        });
    }
}
```

## Best Practices

### 1. Start Simple
```rust
// Begin with basic flows
#[init]
fn start(&mut self) {
    // Minimal initialization
}

#[flow]
fn simple_flow(&mut self) {
    // Single instruction
}

// Add complexity gradually
```

### 2. Use Meaningful Names
```rust
// GOOD
#[flow]
fn deposit_then_withdraw_flow(&mut self) { }

// BAD
#[flow]
fn flow1(&mut self) { }
```

### 3. Test Edge Cases
```rust
#[flow]
fn test_boundary_values(&mut self) {
    // Test 0, 1, MAX, MAX-1
    let amounts = vec![0, 1, u64::MAX, u64::MAX - 1];
    for amount in amounts {
        // Test each boundary
    }
}
```

### 4. Verify Invariants
```rust
#[invariant]
fn check_all_invariants(&mut self) {
    self.check_balance_invariant();
    self.check_authority_invariant();
    self.check_state_consistency();
}
```

### 5. Use Account Snapshots
```rust
#[flow]
fn compare_before_after(&mut self) {
    let before = self.fuzz_accounts.snapshot();
    // Execute transaction
    let after = self.fuzz_accounts.snapshot();
    // Compare and verify
}
```

## Troubleshooting

### Fuzz Test Fails Immediately
- Check account initialization in `#[init]`
- Verify account relationships
- Ensure PDAs are derived correctly

### No Interesting Failures Found
- Increase iterations: `--iterations 100000`
- Add more flows with edge cases
- Use custom strategies for boundary values

### Performance Issues
- Reduce number of invariant checks
- Optimize account lookups
- Use fewer threads if memory-constrained

## Integration with CI/CD

```yaml
# .github/workflows/fuzz.yml
name: Fuzz Tests

on: [push, pull_request]

jobs:
  fuzz:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
      
      - name: Install Trident
        run: cargo install trident-cli
      
      - name: Run Fuzz Tests
        run: |
          cd trident-tests
          trident fuzz run fuzz_0 --iterations 10000
```

## Resources

- [Trident Documentation](https://ackee.xyz/trident/docs/latest/)
- [Trident GitHub](https://github.com/Ackee-Blockchain/trident)
- [Trident Examples](https://ackee.xyz/trident/docs/latest/trident-examples/trident-examples/)
- [Discord Community](https://discord.gg/JhTVXUvaEr)
- [Ackee Blockchain](https://ackee.xyz/)

## Conclusion

Trident is an essential tool for securing Solana programs. By combining stateful fuzzing, property-based testing, and flow control, it helps discover vulnerabilities that traditional testing misses. Use it early and often in your development process to build more secure programs.
