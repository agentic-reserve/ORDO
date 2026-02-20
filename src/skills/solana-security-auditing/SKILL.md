# Solana Security Auditing Skill

## Overview
This skill provides comprehensive guidance on auditing and securing Solana smart contracts based on industry best practices, known vulnerabilities, and real-world exploits. It covers common pitfalls, attack vectors, and defensive patterns specific to Solana programs.

## When to Use This Skill
- Conducting security audits of Solana programs
- Reviewing code for common vulnerabilities
- Preparing programs for production deployment
- Implementing security best practices
- Investigating potential exploits
- Setting up bug bounty programs

## Core Security Principles

### 1. Account Validation
Always validate accounts passed to your program:

```rust
// BAD: Using UncheckedAccount without validation
pub struct BadContext<'info> {
    pub account: UncheckedAccount<'info>,
}

// GOOD: Proper validation with Anchor
pub struct GoodContext<'info> {
    #[account(mut)]
    pub account: Account<'info, MyAccount>,
    pub authority: Signer<'info>,
}
```

### 2. Signer Checks
Verify that required accounts have signed the transaction:

```rust
// BAD: No signer check
pub fn vulnerable_transfer(ctx: Context<Transfer>) -> Result<()> {
    // Anyone can call this!
    Ok(())
}

// GOOD: Require signer
pub struct Transfer<'info> {
    #[account(mut)]
    pub from: Account<'info, TokenAccount>,
    pub authority: Signer<'info>, // Must sign
}
```

### 3. Owner Checks
Verify account ownership:

```rust
// BAD: No owner check
if account.data.is_empty() {
    return Err(ErrorCode::InvalidAccount.into());
}

// GOOD: Check owner
#[account(
    mut,
    constraint = account.owner == program_id @ ErrorCode::InvalidOwner
)]
pub account: Account<'info, MyAccount>,
```

### 4. Arithmetic Safety
Use checked arithmetic operations:

```rust
// BAD: Unchecked arithmetic
let result = a + b;
let product = x * y;

// GOOD: Checked arithmetic
let result = a.checked_add(b).ok_or(ErrorCode::Overflow)?;
let product = x.checked_mul(y).ok_or(ErrorCode::Overflow)?;

// ALTERNATIVE: Saturating arithmetic
let result = a.saturating_add(b);
let product = x.saturating_mul(y);
```

## Common Vulnerabilities

### 1. Missing Signer Check
**Risk**: Unauthorized users can execute privileged operations

**Example Exploit**:
```rust
// Vulnerable code
pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // No check if ctx.accounts.authority actually signed!
    transfer_tokens(amount)?;
    Ok(())
}
```

**Fix**:
```rust
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>, // Enforces signature
}
```

### 2. Missing Owner Check
**Risk**: Malicious accounts can be passed to bypass validation

**Example Exploit**:
```rust
// Vulnerable code
pub fn process(ctx: Context<Process>) -> Result<()> {
    let account = &ctx.accounts.account;
    // Attacker can pass account owned by malicious program
    Ok(())
}
```

**Fix**:
```rust
#[derive(Accounts)]
pub struct Process<'info> {
    #[account(
        constraint = account.owner == &crate::ID @ ErrorCode::InvalidOwner
    )]
    pub account: AccountInfo<'info>,
}
```

### 3. Integer Overflow/Underflow
**Risk**: Arithmetic operations can wrap around, causing unexpected behavior

**Real-World Example**: SPL Token-Lending vulnerability (Neodyme, $2.6B at risk)

**Vulnerable Code**:
```rust
// BAD: Can overflow
let total = balance + deposit;
let shares = (amount * total_shares) / total_assets;
```

**Fix**:
```rust
// GOOD: Checked arithmetic
let total = balance
    .checked_add(deposit)
    .ok_or(ErrorCode::Overflow)?;
    
let shares = amount
    .checked_mul(total_shares)
    .and_then(|v| v.checked_div(total_assets))
    .ok_or(ErrorCode::ArithmeticError)?;
```

### 4. Improper PDA Validation
**Risk**: Attackers can create fake PDAs to bypass checks

**Example Exploit**:
```rust
// Vulnerable code
pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
    // No verification that reward_account is the correct PDA
    let reward_account = &ctx.accounts.reward_account;
    Ok(())
}
```

**Fix**:
```rust
#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(
        seeds = [b"reward", user.key().as_ref()],
        bump,
    )]
    pub reward_account: Account<'info, Reward>,
    pub user: Signer<'info>,
}
```

### 5. Arbitrary CPI (Cross-Program Invocation)
**Risk**: Program can be tricked into calling malicious programs

**Real-World Example**: Wormhole hack ($325M)

**Vulnerable Code**:
```rust
// BAD: Unchecked program ID
pub fn delegate_call(ctx: Context<DelegateCall>) -> Result<()> {
    invoke(
        &instruction,
        &[ctx.accounts.target_program.clone()], // Attacker controls this!
    )?;
    Ok(())
}
```

**Fix**:
```rust
#[derive(Accounts)]
pub struct DelegateCall<'info> {
    #[account(
        constraint = target_program.key() == AUTHORIZED_PROGRAM_ID
    )]
    pub target_program: Program<'info, AuthorizedProgram>,
}
```

### 6. Account Confusion
**Risk**: Wrong account type is passed, leading to data misinterpretation

**Prevention**: Use Anchor's type system
```rust
// Anchor automatically adds 8-byte discriminator
#[account]
pub struct UserAccount {
    pub authority: Pubkey,
    pub balance: u64,
}

// This will fail if wrong account type is passed
#[account(mut)]
pub user: Account<'info, UserAccount>,
```

### 7. Rounding Errors
**Risk**: Small rounding errors can be exploited at scale

**Real-World Example**: Neodyme SPL-Lending ($2.6B at risk)

**Vulnerable Code**:
```rust
// BAD: Using round() can be exploited
let shares = (amount * total_shares / total_assets).round();
```

**Fix**:
```rust
// GOOD: Use floor for withdrawals, ceil for deposits
let shares = amount
    .checked_mul(total_shares)
    .and_then(|v| v.checked_div(total_assets))
    .ok_or(ErrorCode::ArithmeticError)?;
// No rounding - use integer division
```

### 8. Missing Account Initialization Check
**Risk**: Uninitialized accounts can be exploited

**Vulnerable Code**:
```rust
// BAD: No initialization check
pub fn update(ctx: Context<Update>, value: u64) -> Result<()> {
    ctx.accounts.account.value = value;
    Ok(())
}
```

**Fix**:
```rust
#[derive(Accounts)]
pub struct Update<'info> {
    #[account(
        mut,
        constraint = account.is_initialized @ ErrorCode::NotInitialized
    )]
    pub account: Account<'info, MyAccount>,
}

#[account]
pub struct MyAccount {
    pub is_initialized: bool,
    pub value: u64,
}
```

### 9. Sysvar Spoofing
**Risk**: Attacker provides fake sysvar accounts

**Vulnerable Code**:
```rust
// BAD: No validation of sysvar
pub fn check_time(ctx: Context<CheckTime>) -> Result<()> {
    let clock = Clock::from_account_info(&ctx.accounts.clock)?;
    Ok(())
}
```

**Fix**:
```rust
#[derive(Accounts)]
pub struct CheckTime<'info> {
    #[account(address = sysvar::clock::ID)]
    pub clock: Sysvar<'info, Clock>,
}
```

### 10. Reinitialization Attack
**Risk**: Account can be reinitialized, resetting state

**Vulnerable Code**:
```rust
// BAD: No check if already initialized
pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    ctx.accounts.account.authority = ctx.accounts.authority.key();
    Ok(())
}
```

**Fix**:
```rust
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32
    )]
    pub account: Account<'info, MyAccount>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

## Anchor Security Features

### 1. Account Constraints
```rust
#[account(
    mut,                                    // Account is mutable
    has_one = authority,                    // account.authority == authority.key()
    constraint = amount > 0,                // Custom constraint
    seeds = [b"vault", authority.key().as_ref()], // PDA validation
    bump,                                   // PDA bump seed
)]
pub vault: Account<'info, Vault>,
```

### 2. Account Types
```rust
// Enforces signature
pub authority: Signer<'info>,

// Enforces account type with discriminator
pub account: Account<'info, MyAccount>,

// Enforces program type
pub token_program: Program<'info, Token>,

// Enforces sysvar
pub clock: Sysvar<'info, Clock>,

// Unchecked - requires manual validation
/// CHECK: This account is validated manually
pub unchecked: UncheckedAccount<'info>,
```

### 3. Initialization Patterns
```rust
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,                    // Initialize new account
        payer = authority,       // Who pays for rent
        space = 8 + 32 + 8,     // Discriminator + data
        seeds = [b"account"],    // Optional: Make it a PDA
        bump,
    )]
    pub account: Account<'info, MyAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

## Auditing Methodology

### 1. Pre-Audit Checklist
- [ ] Review project documentation
- [ ] Understand business logic and invariants
- [ ] Identify trust boundaries
- [ ] Map account relationships
- [ ] List privileged operations
- [ ] Review previous audits (if any)

### 2. Code Review Process

#### Step 1: High-Level Analysis
- Understand program architecture
- Identify entry points (instructions)
- Map data flow between instructions
- Identify external dependencies (CPIs)

#### Step 2: Account Validation Review
For each instruction, verify:
- [ ] All accounts have proper type constraints
- [ ] Signers are required where needed
- [ ] Owners are validated
- [ ] PDAs are properly derived and validated
- [ ] Sysvars are validated by address

#### Step 3: Arithmetic Operations Review
- [ ] All arithmetic uses checked operations
- [ ] No potential for overflow/underflow
- [ ] Rounding is done correctly (floor vs ceil)
- [ ] Division by zero is prevented

#### Step 4: Access Control Review
- [ ] Authority checks are present
- [ ] Permissions are properly enforced
- [ ] No privilege escalation paths
- [ ] Admin functions are protected

#### Step 5: State Management Review
- [ ] Initialization is properly checked
- [ ] No reinitialization vulnerabilities
- [ ] State transitions are valid
- [ ] Invariants are maintained

#### Step 6: CPI Security Review
- [ ] Program IDs are validated
- [ ] CPI accounts are properly validated
- [ ] No arbitrary CPI vulnerabilities
- [ ] Return values are checked

### 3. Testing Strategy

#### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_overflow_protection() {
        let result = u64::MAX.checked_add(1);
        assert!(result.is_none());
    }
    
    #[test]
    fn test_unauthorized_access() {
        // Test that unauthorized users cannot access
    }
}
```

#### Integration Tests
```rust
#[tokio::test]
async fn test_full_flow() {
    let mut context = program_test().start_with_context().await;
    
    // Test complete user flow
    initialize(&mut context).await;
    deposit(&mut context, 1000).await;
    withdraw(&mut context, 500).await;
    
    // Verify final state
}
```

#### Fuzz Tests
Use Trident for property-based testing (see trident-fuzzing skill)

### 4. Common Attack Scenarios to Test

#### Scenario 1: Unauthorized Access
```rust
// Try to call privileged function without authority
let result = program
    .request()
    .accounts(accounts)
    .args(instruction_data)
    .signer(&unauthorized_user)
    .send();
    
assert!(result.is_err());
```

#### Scenario 2: Integer Overflow
```rust
// Try to overflow balance
let result = deposit(&mut context, u64::MAX).await;
assert!(result.is_err());
```

#### Scenario 3: Account Confusion
```rust
// Try to pass wrong account type
let wrong_account = create_wrong_account_type();
let result = process(&mut context, wrong_account).await;
assert!(result.is_err());
```

#### Scenario 4: Fake PDA
```rust
// Try to use non-PDA account as PDA
let fake_pda = Keypair::new();
let result = claim_reward(&mut context, fake_pda.pubkey()).await;
assert!(result.is_err());
```

## Real-World Exploit Analysis

### Wormhole Hack ($325M)
**Vulnerability**: Missing signature verification
**Root Cause**: Guardian signatures were not properly validated
**Lesson**: Always validate signature accounts, especially in delegation chains

### Cashio Hack ($52M)
**Vulnerability**: Missing account validation
**Root Cause**: Arrow account was not validated, allowing fake collateral
**Lesson**: Validate ALL input accounts, especially in DeFi protocols

### Solend Vulnerability ($2.6B at risk)
**Vulnerability**: Rounding error in interest calculation
**Root Cause**: Using `round()` instead of `floor()` for withdrawals
**Lesson**: Be extremely careful with rounding in financial calculations

### Jet Protocol
**Vulnerability**: Unintended break statement
**Root Cause**: Break statement in wrong location allowed free borrowing
**Lesson**: Carefully review control flow, especially loops and conditionals

## Security Tools

### Static Analysis
```bash
# Check for unsafe Rust
cargo geiger

# Check for vulnerable dependencies
cargo audit

# Anchor security checks (built-in)
anchor build
```

### Dynamic Analysis
```bash
# Fuzz testing with Trident
trident fuzz run fuzz_test

# Integration testing
anchor test
```

### Manual Review Tools
- [Kudelski Semgrep Rules](https://github.com/kudelskisecurity/solana-semgrep-rules)
- [Sec3 Auto Auditor](https://www.sec3.dev/)
- [Saber Vipers](https://github.com/saber-hq/vipers) (validation library)

## Ordo-Specific Security Considerations

### Agent Registry Security
```rust
// Ensure agent registration is properly authorized
#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Agent::SIZE,
        seeds = [b"agent", authority.key().as_ref()],
        bump,
    )]
    pub agent: Account<'info, Agent>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn register_agent(
    ctx: Context<RegisterAgent>,
    name: String,
    capabilities: Vec<String>,
) -> Result<()> {
    // Validate input
    require!(name.len() <= 32, ErrorCode::NameTooLong);
    require!(capabilities.len() <= 10, ErrorCode::TooManyCapabilities);
    
    let agent = &mut ctx.accounts.agent;
    agent.authority = ctx.accounts.authority.key();
    agent.name = name;
    agent.capabilities = capabilities;
    agent.is_active = true;
    
    Ok(())
}
```

### Multi-Agent Coordination Security
```rust
// Ensure collaboration is authorized by all parties
#[derive(Accounts)]
pub struct CreateCollaboration<'info> {
    #[account(
        init,
        payer = initiator,
        space = 8 + Collaboration::SIZE,
        seeds = [
            b"collaboration",
            initiator.key().as_ref(),
            partner.key().as_ref(),
        ],
        bump,
    )]
    pub collaboration: Account<'info, Collaboration>,
    
    #[account(mut)]
    pub initiator: Signer<'info>,
    
    // Partner must also sign to authorize
    pub partner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

### DeFi Integration Security
```rust
// Validate Jupiter swap parameters
pub fn execute_swap(
    ctx: Context<ExecuteSwap>,
    amount_in: u64,
    minimum_amount_out: u64,
) -> Result<()> {
    // Validate amounts
    require!(amount_in > 0, ErrorCode::InvalidAmount);
    require!(minimum_amount_out > 0, ErrorCode::InvalidAmount);
    
    // Check slippage protection
    let max_slippage = amount_in
        .checked_mul(MAX_SLIPPAGE_BPS)
        .and_then(|v| v.checked_div(10000))
        .ok_or(ErrorCode::ArithmeticError)?;
    
    require!(
        minimum_amount_out >= amount_in.saturating_sub(max_slippage),
        ErrorCode::SlippageTooHigh
    );
    
    // Execute swap with validated parameters
    Ok(())
}
```

## Security Best Practices Summary

### Do's ✅
- Use Anchor framework for automatic protections
- Validate ALL input accounts
- Use checked arithmetic operations
- Require signers for privileged operations
- Validate PDAs with seeds and bump
- Use `#[account]` types for automatic discriminator checks
- Document security assumptions with `/// CHECK:` comments
- Test edge cases and attack scenarios
- Get professional audits before mainnet
- Implement bug bounty programs

### Don'ts ❌
- Don't use `UncheckedAccount` without thorough validation
- Don't use unchecked arithmetic (`+`, `-`, `*`, `/`)
- Don't trust account data without validation
- Don't skip owner checks
- Don't allow arbitrary CPI calls
- Don't use `round()` in financial calculations
- Don't deploy to mainnet without audits
- Don't ignore compiler warnings
- Don't hardcode sensitive values
- Don't skip integration tests

## Resources

### Learning Resources
- [Sealevel Attacks](https://github.com/project-serum/sealevel-attacks)
- [Neodyme Common Pitfalls](https://blog.neodyme.io/posts/solana_common_pitfalls)
- [Sec3 Audit Series](https://www.sec3.dev/blog)
- [OtterSec Security Intro](https://osec.io/blog/tutorials/2022-03-14-solana-security-intro/)
- [Solana Security Workshop](https://workshop.neodyme.io/)

### Audit Reports
Study real audit reports to learn:
- [Mango Markets](https://docs.mango.markets/audit) (Neodyme)
- [Marinade Finance](https://docs.marinade.finance/marinade-protocol/security/audits)
- [Drift Protocol](https://github.com/Zellic/publications)
- [Orca Whirlpools](https://docs.orca.so/#has-orca-been-audited)

### Bug Bounty Programs
- [Solana Labs](https://github.com/solana-labs/solana/security/policy) (up to $2M)
- [Mango Markets](https://docs.mango.markets/mango/bug-bounty) (up to $1M)
- [Marinade](https://immunefi.com/bounty/marinade/) (up to $250K)
- [Drift](https://immunefi.com/bounty/driftprotocol/) (up to $500K)

## Conclusion

Security is not a one-time effort but an ongoing process. Regular audits, continuous testing, and staying updated with the latest vulnerabilities are essential for maintaining secure Solana programs.

Remember: The cost of prevention is always less than the cost of exploitation.
