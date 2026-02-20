# Rust Security Tools Skill

## Overview
This skill provides guidance on using essential Rust security tools for auditing dependencies, detecting unsafe code, and preventing arithmetic vulnerabilities in Solana programs. These tools are critical for maintaining secure codebases and catching vulnerabilities before deployment.

## When to Use This Skill
- Auditing Rust dependencies for known vulnerabilities
- Detecting unsafe code usage in your codebase
- Preventing arithmetic overflow/underflow in Solana programs
- Preparing for security audits
- Setting up CI/CD security checks
- Maintaining secure development practices

## Core Tools

### 1. cargo-audit - Dependency Vulnerability Scanner
### 2. cargo-geiger - Unsafe Code Detector
### 3. checked-math - Arithmetic Safety Macro

## Tool 1: cargo-audit

### Overview
`cargo-audit` scans your `Cargo.lock` file for crates with known security vulnerabilities reported in the RustSec Advisory Database.

### Installation

```bash
cargo install cargo-audit --locked
```

### Basic Usage

```bash
# Audit current project
cargo audit

# Audit with JSON output
cargo audit --json

# Audit and deny warnings
cargo audit --deny warnings

# Audit specific Cargo.lock file
cargo audit --file /path/to/Cargo.lock
```

### Example Output

```
    Fetching advisory database from `https://github.com/RustSec/advisory-db.git`
      Loaded 500 security advisories (from rustsec-advisory-db)
    Scanning Cargo.lock for vulnerabilities (123 crate dependencies)

Crate:     time
Version:   0.1.43
Warning:   unmaintained
Title:     time 0.1 is unmaintained
Date:      2020-11-18
ID:        RUSTSEC-2020-0071
URL:       https://rustsec.org/advisories/RUSTSEC-2020-0071
Dependency tree:
time 0.1.43
└── chrono 0.4.19
    └── your-project 0.1.0

1 warning found!
```

### Configuration

Create `audit.toml` in your project root:

```toml
[advisories]
# Ignore specific advisories
ignore = [
    "RUSTSEC-2020-0071",  # time 0.1 unmaintained (if using through chrono)
]

# Severity threshold
severity-threshold = "medium"

[database]
# Use custom advisory database
url = "https://github.com/RustSec/advisory-db.git"
path = "~/.cargo/advisory-db"

[output]
# Output format: json, toml, or human
format = "human"
```

### CI/CD Integration

#### GitHub Actions

```yaml
name: Security Audit

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    # Run daily at 00:00 UTC
    - cron: '0 0 * * *'

jobs:
  security_audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install cargo-audit
        run: cargo install cargo-audit --locked
      
      - name: Run cargo audit
        run: cargo audit
      
      - name: Run cargo audit (deny warnings)
        run: cargo audit --deny warnings
```

#### GitLab CI

```yaml
security:audit:
  stage: test
  image: rust:latest
  script:
    - cargo install cargo-audit --locked
    - cargo audit --deny warnings
  only:
    - main
    - merge_requests
```

### Advanced Usage

#### Audit with SARIF Output (for GitHub Security)

```bash
cargo audit --json | jq > audit-results.json
```

#### Audit Multiple Projects

```bash
# Audit all Cargo.lock files in subdirectories
find . -name Cargo.lock -exec cargo audit --file {} \;
```

#### Continuous Monitoring

```bash
# Add to cron for daily checks
0 0 * * * cd /path/to/project && cargo audit --deny warnings
```

### Common Advisories in Solana Ecosystem

#### Example: Solana Version Vulnerabilities

```bash
# Check for Solana-related vulnerabilities
cargo audit | grep -i solana
```

Common issues:
- Outdated `solana-program` versions
- Vulnerable `borsh` serialization versions
- Deprecated `spl-token` versions

### Best Practices

1. **Run Regularly**: Audit at least weekly or on every PR
2. **Update Dependencies**: Keep dependencies up to date
3. **Review Advisories**: Don't blindly ignore warnings
4. **Document Exceptions**: If ignoring an advisory, document why
5. **Monitor Database**: RustSec database is updated frequently

## Tool 2: cargo-geiger

### Overview
`cargo-geiger` detects usage of `unsafe` code in your dependency tree, helping you understand the safety profile of your codebase.

### Installation

```bash
cargo install cargo-geiger
```

### Basic Usage

```bash
# Scan current project
cargo geiger

# Scan with detailed output
cargo geiger --all-features

# Output as JSON
cargo geiger --output-format Json

# Check specific package
cargo geiger --package your-package
```

### Example Output

```
Metric output format: x/y
    x = unsafe code used by the build
    y = total unsafe code found in the crate

Symbols: 
    🔒  = No `unsafe` usage found, declares #![forbid(unsafe_code)]
    ❓  = No `unsafe` usage found, missing #![forbid(unsafe_code)]
    ☢️  = `unsafe` usage found

Functions  Expressions  Impls  Traits  Methods  Dependency

0/0        0/0          0/0    0/0     0/0      🔒  your-project 0.1.0
0/0        0/0          0/0    0/0     0/0      🔒  ├── anchor-lang 0.30.1
2/2        15/15        0/0    0/0     0/0      ☢️  │   └── solana-program 1.18.22
0/0        0/0          0/0    0/0     0/0      ❓  └── borsh 1.5.0
5/5        25/25        0/0    0/0     0/0      ☢️      └── borsh-derive 1.5.0
```

### Understanding the Output

- **🔒 (Locked)**: No unsafe code, declares `#![forbid(unsafe_code)]`
- **❓ (Unknown)**: No unsafe code found, but doesn't forbid it
- **☢️ (Radioactive)**: Contains unsafe code

### Forbid Unsafe Code

Add to your `lib.rs` or `main.rs`:

```rust
#![forbid(unsafe_code)]
```

This makes your crate show as 🔒 and prevents any unsafe code from being added.

### CI/CD Integration

#### GitHub Actions

```yaml
name: Unsafe Code Check

on: [push, pull_request]

jobs:
  geiger:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install cargo-geiger
        run: cargo install cargo-geiger
      
      - name: Run cargo geiger
        run: cargo geiger --all-features
      
      - name: Check for unsafe code in main crate
        run: |
          if cargo geiger --package your-project | grep -q "☢️"; then
            echo "Unsafe code detected in main crate!"
            exit 1
          fi
```

### Solana-Specific Considerations

Solana programs often require unsafe code for:
- Zero-copy deserialization
- Direct memory access
- Performance optimizations

**Example: Acceptable Unsafe in Solana**

```rust
// Acceptable: Zero-copy account deserialization
use bytemuck::{Pod, Zeroable};

#[repr(C)]
#[derive(Copy, Clone, Pod, Zeroable)]
pub struct MyAccount {
    pub value: u64,
    pub authority: Pubkey,
}

impl MyAccount {
    pub fn from_bytes(data: &[u8]) -> Result<&Self, ProgramError> {
        // This uses unsafe internally but is well-tested
        bytemuck::try_from_bytes(data)
            .map_err(|_| ProgramError::InvalidAccountData)
    }
}
```

### Best Practices

1. **Minimize Unsafe**: Use only when necessary
2. **Isolate Unsafe**: Keep unsafe code in small, well-tested modules
3. **Document Unsafe**: Explain why unsafe is needed
4. **Review Carefully**: Unsafe code requires extra scrutiny
5. **Test Thoroughly**: Add extra tests for unsafe code paths

## Tool 3: checked-math

### Overview
`checked-math` is a macro that converts normal arithmetic expressions into checked operations, preventing overflow/underflow without sacrificing readability.

### Installation

Add to `Cargo.toml`:

```toml
[dependencies]
checked-math = "0.1"
```

### Basic Usage

#### Without checked-math (Dangerous)

```rust
// BAD: May overflow in release builds
let result = (x * y) + z;

// VERBOSE: Checked but hard to read
let result = x.checked_mul(y)
    .and_then(|v| v.checked_add(z))
    .ok_or(ErrorCode::Overflow)?;
```

#### With checked-math (Best of Both Worlds)

```rust
use checked_math::checked_math as cm;

// GOOD: Readable and safe
let result = cm!((x * y) + z)
    .ok_or(ErrorCode::Overflow)?;
```

### Comprehensive Examples

#### Example 1: Token Amount Calculation

```rust
use checked_math::checked_math as cm;
use anchor_lang::prelude::*;

pub fn calculate_shares(
    amount: u64,
    total_shares: u64,
    total_assets: u64,
) -> Result<u64> {
    // Convert: (amount * total_shares) / total_assets
    let shares = cm!((amount * total_shares) / total_assets)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    
    Ok(shares)
}
```

#### Example 2: Interest Calculation

```rust
use checked_math::checked_math as cm;

pub fn calculate_interest(
    principal: u64,
    rate_bps: u64,  // Basis points (1 bps = 0.01%)
    time_seconds: u64,
) -> Result<u64> {
    // Interest = (principal * rate * time) / (10000 * SECONDS_PER_YEAR)
    const SECONDS_PER_YEAR: u64 = 31_536_000;
    
    let interest = cm!(
        (principal * rate_bps * time_seconds) / (10000 * SECONDS_PER_YEAR)
    ).ok_or(ErrorCode::ArithmeticOverflow)?;
    
    Ok(interest)
}
```

#### Example 3: Fee Calculation

```rust
use checked_math::checked_math as cm;

pub fn calculate_fee(
    amount: u64,
    fee_bps: u64,  // Fee in basis points
) -> Result<(u64, u64)> {
    // Fee = (amount * fee_bps) / 10000
    let fee = cm!((amount * fee_bps) / 10000)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    
    // Amount after fee
    let amount_after_fee = cm!(amount - fee)
        .ok_or(ErrorCode::ArithmeticOverflow)?;
    
    Ok((amount_after_fee, fee))
}
```

#### Example 4: Complex DeFi Calculation

```rust
use checked_math::checked_math as cm;

pub fn calculate_liquidation_price(
    collateral_amount: u64,
    collateral_price: u64,
    debt_amount: u64,
    liquidation_threshold: u64,  // In basis points
) -> Result<u64> {
    // Liquidation price = (debt * 10000) / (collateral * threshold)
    let liquidation_price = cm!(
        (debt_amount * 10000) / (collateral_amount * liquidation_threshold)
    ).ok_or(ErrorCode::ArithmeticOverflow)?;
    
    Ok(liquidation_price)
}
```

### Custom Wrapper Macro

Create a project-specific wrapper:

```rust
// In your lib.rs or utils module
#[macro_export]
macro_rules! safe_math {
    ($x:expr) => {
        checked_math::checked_math!($x)
            .ok_or(crate::error::ErrorCode::ArithmeticOverflow)?
    };
}

// Usage
pub fn calculate(a: u64, b: u64, c: u64) -> Result<u64> {
    let result = safe_math!((a * b) + c);
    Ok(result)
}
```

### Supported Operations

```rust
use checked_math::checked_math as cm;

// Addition
let sum = cm!(a + b).unwrap();

// Subtraction
let diff = cm!(a - b).unwrap();

// Multiplication
let product = cm!(a * b).unwrap();

// Division
let quotient = cm!(a / b).unwrap();

// Modulo
let remainder = cm!(a % b).unwrap();

// Power
let power = cm!(a.pow(2)).unwrap();

// Complex expressions
let result = cm!(((a + b) * c) / d).unwrap();

// With parentheses
let result = cm!((a * (b + c)) - d).unwrap();
```

### Limitations

1. **Type Inference**: May need explicit types
```rust
// May need type annotation
let result: u64 = cm!(a + b).unwrap();
```

2. **Limited Syntax**: Only binary expressions and parentheses
```rust
// GOOD
cm!((a + b) * c)

// BAD: Function calls with expressions not transformed
cm!(foo(a + b))  // Inner a + b not checked!

// BAD: Control flow not supported
cm!(if a + b { c } else { d })  // Won't work
```

3. **Method Calls**: Only `pow` is converted
```rust
// GOOD
cm!(a.pow(2))  // Converted to checked_pow

// BAD: Other methods not converted
cm!(a.sqrt())  // Not converted
```

### Best Practices

1. **Use Everywhere**: Apply to all arithmetic in Solana programs
2. **Wrap in Macro**: Create project-specific wrapper
3. **Test Edge Cases**: Test with boundary values
4. **Document**: Comment why checked math is needed
5. **Combine with Tests**: Add overflow tests

## Integration Example: Complete Solana Program

```rust
// lib.rs
#![forbid(unsafe_code)]  // For cargo-geiger

use anchor_lang::prelude::*;
use checked_math::checked_math as cm;

declare_id!("YourProgramID");

// Custom wrapper for checked math
#[macro_export]
macro_rules! safe_math {
    ($x:expr) => {
        checked_math::checked_math!($x)
            .ok_or(ErrorCode::ArithmeticOverflow)?
    };
}

#[program]
pub mod secure_vault {
    use super::*;

    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        
        let vault = &mut ctx.accounts.vault;
        
        // Safe arithmetic with checked-math
        vault.total_deposits = safe_math!(vault.total_deposits + amount);
        
        // Calculate shares
        let shares = if vault.total_shares == 0 {
            amount
        } else {
            safe_math!((amount * vault.total_shares) / vault.total_assets)
        };
        
        vault.total_shares = safe_math!(vault.total_shares + shares);
        vault.total_assets = safe_math!(vault.total_assets + amount);
        
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
        require!(shares > 0, ErrorCode::InvalidAmount);
        
        let vault = &mut ctx.accounts.vault;
        require!(shares <= vault.total_shares, ErrorCode::InsufficientShares);
        
        // Calculate withdrawal amount
        let amount = safe_math!((shares * vault.total_assets) / vault.total_shares);
        
        // Update state
        vault.total_shares = safe_math!(vault.total_shares - shares);
        vault.total_assets = safe_math!(vault.total_assets - amount);
        vault.total_withdrawals = safe_math!(vault.total_withdrawals + amount);
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    pub user: Signer<'info>,
}

#[account]
pub struct Vault {
    pub total_deposits: u64,
    pub total_withdrawals: u64,
    pub total_shares: u64,
    pub total_assets: u64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Arithmetic overflow occurred")]
    ArithmeticOverflow,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Insufficient shares")]
    InsufficientShares,
}
```

## CI/CD Complete Security Pipeline

```yaml
name: Security Checks

on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          components: clippy
      
      # 1. Dependency Audit
      - name: Install cargo-audit
        run: cargo install cargo-audit --locked
      
      - name: Run cargo audit
        run: cargo audit --deny warnings
      
      # 2. Unsafe Code Detection
      - name: Install cargo-geiger
        run: cargo install cargo-geiger
      
      - name: Run cargo geiger
        run: cargo geiger --all-features
      
      - name: Check for unsafe in main crate
        run: |
          if cargo geiger --package your-project | grep -q "☢️"; then
            echo "⚠️ Unsafe code detected in main crate"
            echo "Review unsafe usage carefully"
          fi
      
      # 3. Clippy Security Lints
      - name: Run Clippy
        run: cargo clippy -- -D warnings
      
      # 4. Build and Test
      - name: Build
        run: cargo build --release
      
      - name: Test
        run: cargo test
      
      # 5. Generate Security Report
      - name: Generate Security Report
        run: |
          echo "# Security Report" > security-report.md
          echo "" >> security-report.md
          echo "## Dependency Audit" >> security-report.md
          cargo audit >> security-report.md || true
          echo "" >> security-report.md
          echo "## Unsafe Code Analysis" >> security-report.md
          cargo geiger >> security-report.md || true
      
      - name: Upload Security Report
        uses: actions/upload-artifact@v2
        with:
          name: security-report
          path: security-report.md
```

## Ordo-Specific Integration

### Agent Registry Security

```rust
// programs/agent-registry/src/lib.rs
#![forbid(unsafe_code)]

use anchor_lang::prelude::*;
use checked_math::checked_math as cm;

#[macro_export]
macro_rules! safe_math {
    ($x:expr) => {
        checked_math::checked_math!($x)
            .ok_or(ErrorCode::ArithmeticOverflow)?
    };
}

pub fn update_agent_reputation(
    ctx: Context<UpdateReputation>,
    score_delta: i64,
) -> Result<()> {
    let agent = &mut ctx.accounts.agent;
    
    // Safe reputation calculation
    let new_score = if score_delta >= 0 {
        safe_math!(agent.reputation_score + (score_delta as u64))
    } else {
        safe_math!(agent.reputation_score - ((-score_delta) as u64))
    };
    
    // Clamp to max reputation
    agent.reputation_score = new_score.min(MAX_REPUTATION);
    
    Ok(())
}
```

### Cargo.toml Configuration

```toml
[package]
name = "agent-registry"
version = "0.1.0"
edition = "2021"

[dependencies]
anchor-lang = "0.30.1"
checked-math = "0.1"

[dev-dependencies]
cargo-audit = "0.20"

[profile.release]
overflow-checks = true  # Keep overflow checks in release

[package.metadata.audit]
# Ignore specific advisories if needed
ignore = []
```

## Testing Arithmetic Safety

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_overflow_protection() {
        // Should return None on overflow
        let result = cm!(u64::MAX + 1);
        assert!(result.is_none());
    }

    #[test]
    fn test_underflow_protection() {
        // Should return None on underflow
        let result = cm!(0u64 - 1);
        assert!(result.is_none());
    }

    #[test]
    fn test_division_by_zero() {
        // Should return None on division by zero
        let result = cm!(100u64 / 0);
        assert!(result.is_none());
    }

    #[test]
    fn test_complex_expression() {
        let a = 100u64;
        let b = 200u64;
        let c = 300u64;
        
        let result = cm!(((a + b) * c) / 2).unwrap();
        assert_eq!(result, 45000);
    }
}
```

## Best Practices Summary

### Do's ✅
- Run `cargo audit` on every PR and daily
- Use `cargo geiger` to track unsafe code
- Apply `checked-math` to all arithmetic
- Add `#![forbid(unsafe_code)]` when possible
- Keep dependencies updated
- Document security exceptions
- Test arithmetic edge cases
- Integrate into CI/CD

### Don'ts ❌
- Don't ignore security warnings without review
- Don't use unchecked arithmetic in Solana programs
- Don't add unsafe code without documentation
- Don't skip dependency audits
- Don't deploy without security checks
- Don't trust outdated dependencies
- Don't use deprecated crates

## Resources

- [cargo-audit Documentation](https://docs.rs/cargo-audit/)
- [cargo-geiger GitHub](https://github.com/geiger-rs/cargo-geiger)
- [checked-math GitHub](https://github.com/blockworks-foundation/checked-math)
- [RustSec Advisory Database](https://rustsec.org/)
- [Rust Security Guidelines](https://anssi-fr.github.io/rust-guide/)

## Conclusion

These three tools form the foundation of Rust security tooling for Solana development:
- **cargo-audit**: Catches vulnerable dependencies
- **cargo-geiger**: Tracks unsafe code usage
- **checked-math**: Prevents arithmetic vulnerabilities

Use them together for comprehensive security coverage.
