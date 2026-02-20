# Security.txt Integration Guide

This guide explains how we've integrated security.txt into the Ordo agent-registry program and how to verify it.

## What is security.txt?

Security.txt is a standard for Solana programs to provide contact information for security researchers. It's embedded directly in the program binary and visible in Solana Explorer.

## Why Two Approaches?

We use BOTH security.txt (in the program) AND Program Metadata (on-chain):

### Security.txt (Traditional)
- **Embedded in program binary**
- Visible in Solana Explorer's Security tab
- Requires program upgrade to change
- Standard since 2021
- Used by most Solana programs

### Program Metadata (Modern)
- **Stored in separate on-chain account**
- Can be updated without program upgrade
- Supports versioning
- More flexible and space-efficient
- Newer standard (2024+)

**Recommendation**: Use BOTH for maximum compatibility.

## Implementation

### 1. Added Dependency

In `programs/agent-registry/Cargo.toml`:

```toml
[dependencies]
solana-security-txt = "1.1.2"
```

### 2. Added Macro to Program

In `programs/agent-registry/src/lib.rs`:

```rust
#[cfg(not(feature = "no-entrypoint"))]
use solana_security_txt::security_txt;

#[cfg(not(feature = "no-entrypoint"))]
security_txt! {
    name: "Ordo Agent Registry",
    project_url: "https://github.com/agentic-reserve/ORDO",
    contacts: "email:security@ordo.com,link:https://github.com/agentic-reserve/ORDO/security",
    policy: "https://github.com/agentic-reserve/ORDO/blob/main/SECURITY.md",
    preferred_languages: "en",
    source_code: "https://github.com/agentic-reserve/ORDO",
    source_release: env!("CARGO_PKG_VERSION"),
}
```

### 3. Important: `no-entrypoint` Feature

The `#[cfg(not(feature = "no-entrypoint"))]` is CRITICAL:
- Prevents conflicts when used as a library
- Only includes security.txt in the final program
- Required for all library authors

## Verification

### Before Deployment (Local Binary)

Install the query tool:

```bash
cargo install query-security-txt
```

Query your local binary:

```bash
# Build the program
anchor build

# Query the binary
query-security-txt target/deploy/agent_registry.so
```

Expected output:

```
=======BEGIN SECURITY.TXT V1=======
name: Ordo Agent Registry
project_url: https://github.com/agentic-reserve/ORDO
contacts: email:security@ordo.com,link:https://github.com/agentic-reserve/ORDO/security
policy: https://github.com/agentic-reserve/ORDO/blob/main/SECURITY.md
preferred_languages: en
source_code: https://github.com/agentic-reserve/ORDO
source_release: 0.1.0
=======END SECURITY.TXT V1=======
```

### After Deployment (On-Chain)

Query the deployed program:

```bash
query-security-txt <PROGRAM_ID>
```

Or view in Solana Explorer:
```
https://explorer.solana.com/address/<PROGRAM_ID>/security?cluster=devnet
```

## Fields Explained

### Required Fields

**name**
- The name of your project
- Example: `"Ordo Agent Registry"`

**project_url**
- URL to your project's homepage
- Example: `"https://github.com/agentic-reserve/ORDO"`

**contacts**
- Comma-separated list of contact methods
- Format: `<type>:<value>`
- Types: `email`, `link`, `discord`, `telegram`, `twitter`
- Example: `"email:security@ordo.com,discord:Ordo#1234"`

**policy**
- Link to your security policy
- Should describe bug bounty terms
- Example: `"https://github.com/agentic-reserve/ORDO/blob/main/SECURITY.md"`

### Optional Fields

**preferred_languages**
- ISO 639-1 language codes
- Example: `"en,de"`

**source_code**
- Link to source code repository
- Example: `"https://github.com/agentic-reserve/ORDO"`

**source_release**
- Release tag or version
- Use `env!("CARGO_PKG_VERSION")` for automatic versioning
- Example: `"v0.1.0"`

**source_revision**
- Git commit hash
- Use `env!("GITHUB_SHA")` in CI/CD
- Example: `"abc123def456"`

**encryption**
- PGP public key for encrypted communication
- Can be inline or a link

**auditors**
- List of auditors or link to audit reports
- Example: `"Neodyme, OtterSec"`

**acknowledgements**
- Thank security researchers
- Can be inline text or a link

**expiry**
- When this security.txt expires
- Format: `YYYY-MM-DD`
- Example: `"2026-12-31"`

## Best Practices

### 1. Keep Contacts Stable

Prefer contact methods that won't change:
- ✅ `email:security@example.com` (domain email)
- ✅ `link:https://example.com/security` (your website)
- ⚠️ `discord:user#1234` (usernames can change)
- ⚠️ `telegram:@username` (handles can change)

### 2. Use Environment Variables

For dynamic values like commit hash:

```rust
security_txt! {
    source_revision: env!("GITHUB_SHA"),
    source_release: env!("GITHUB_REF_NAME"),
}
```

### 3. Link to External Policy

Don't put your entire policy in the program:

```rust
// ❌ BAD: Entire policy in program
policy: "We pay bounties up to $10,000..."

// ✅ GOOD: Link to external policy
policy: "https://github.com/example/SECURITY.md"
```

This allows you to update the policy without upgrading the program.

### 4. Multiple Contact Methods

Provide several ways to reach you:

```rust
contacts: "email:security@ordo.com,link:https://ordo.com/security,discord:Ordo#1234,telegram:@OrdoSecurity"
```

### 5. Set Expiry Date

If you plan to deprecate the program:

```rust
expiry: "2026-12-31"
```

## Updating Security.txt

### Without Program Upgrade

If you linked to external resources, you can update:
- Security policy (SECURITY.md)
- Contact information (on your website)
- Audit reports

### With Program Upgrade

To change embedded information:

1. Update the `security_txt!` macro
2. Rebuild: `anchor build`
3. Verify: `query-security-txt target/deploy/agent_registry.so`
4. Deploy: `anchor upgrade`

## Comparison with Program Metadata

| Feature | security.txt | Program Metadata |
|---------|-------------|------------------|
| Location | In program binary | Separate account |
| Updates | Requires upgrade | Can update anytime |
| Visibility | Solana Explorer | Solana Explorer |
| Standard | Since 2021 | Since 2024 |
| Adoption | High | Growing |
| Space | ~1KB | Unlimited |
| Cost | None (in program) | Rent for account |

**Recommendation**: Use both for maximum compatibility.

## Troubleshooting

### Error: "multiple definition of security_txt"

One of your dependencies also uses security.txt. Ensure they have:

```rust
#[cfg(not(feature = "no-entrypoint"))]
security_txt! { ... }
```

### Security.txt Not Showing in Explorer

1. Verify it's in the binary: `query-security-txt target/deploy/agent_registry.so`
2. Check you deployed the correct binary
3. Wait a few minutes for Explorer to index
4. Try a different Explorer (Solscan, SolanaFM)

### Invalid Format Error

Run the query tool locally first:

```bash
query-security-txt target/deploy/agent_registry.so
```

This validates the format before deployment.

## Example Policies

### Minimal Policy

```markdown
# Security Policy

Report vulnerabilities to security@example.com

We do not pay bug bounties but appreciate responsible disclosure.
```

### Comprehensive Policy

See our [SECURITY.md](../SECURITY.md) for a full example including:
- Reporting process
- Response timeline
- Severity levels
- Bug bounty program
- Disclosure policy

## Resources

- [security.txt GitHub](https://github.com/neodyme-labs/solana-security-txt)
- [security.txt Docs](https://docs.rs/solana-security-txt/)
- [Solana Security Best Practices](https://docs.solana.com/developing/programming-model/security)
- [Example Programs](https://github.com/neodyme-labs/solana-security-txt/tree/master/example-contract)

## Next Steps

1. ✅ security.txt added to program
2. ✅ SECURITY.md created
3. ⏳ Build and verify locally
4. ⏳ Deploy to devnet
5. ⏳ Verify in Solana Explorer
6. ⏳ Upload Program Metadata (security.json)
7. ⏳ Apply for Claude Code Security audit
