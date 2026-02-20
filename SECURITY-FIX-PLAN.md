# Security Vulnerability Fix Plan

**Date**: February 21, 2026  
**Status**: In Progress

## Critical Vulnerability: RUSTSEC-2023-0033

### Issue Details
- **Crate**: borsh 0.9.3
- **Severity**: Unsound
- **Description**: Parsing borsh messages with Zero-Sized Types (ZST) that are not Copy/Clone is unsound
- **CVE**: RUSTSEC-2023-0033
- **Fixed In**: borsh >= 0.10.0

### Root Cause
The vulnerability exists in `borsh 0.9.3` which is a transitive dependency from:
```
borsh 0.9.3
└── solana-program 1.18.26
    └── anchor-lang 0.30.1
        └── agent-registry 0.1.0
```

### Why We Can't Fix Immediately
1. **Locked by Anchor**: anchor-lang 0.30.1 depends on solana-program 1.18.x
2. **Locked by Solana**: solana-program 1.18.x depends on borsh 0.9.3
3. **Breaking Changes**: Upgrading requires coordinated Anchor/Solana updates

## Mitigation Strategy

### Phase 1: Immediate Actions (Completed)

✅ **1. Audit Current Code**
Review all borsh usage in agent-registry for ZST patterns:

```bash
# Search for potential ZST usage
rg "struct.*\{\s*\}" programs/agent-registry/src/
```

✅ **2. Add Cargo Patch (Attempted)**
Tried to override borsh version in Cargo.toml, but blocked by Anchor dependencies.

✅ **3. Document Risk**
Created this fix plan and updated SECURITY-AUDIT-REPORT.md

### Phase 2: Code Review (In Progress)

#### Check for Vulnerable Patterns

**Vulnerable Pattern**:
```rust
// BAD: Non-Copy/Clone ZST
#[derive(BorshSerialize, BorshDeserialize)]
struct VulnerableZST;  // No Copy or Clone

// Using it
let data = VulnerableZST;
let serialized = data.try_to_vec()?;
```

**Safe Pattern**:
```rust
// GOOD: Copy/Clone ZST
#[derive(BorshSerialize, BorshDeserialize, Copy, Clone)]
struct SafeZST;

// Or avoid ZST entirely
#[derive(BorshSerialize, BorshDeserialize)]
struct SafeStruct {
    data: u64,  // Has actual data
}
```

#### Action Items

1. **Review Agent Registry Structs**
   ```bash
   cd programs/agent-registry
   grep -r "BorshSerialize" src/
   ```

2. **Ensure All Serialized Types Are Safe**
   - Add `Copy` or `Clone` to all ZST types
   - Avoid empty structs in borsh serialization
   - Use unit type `()` instead of custom ZST

3. **Add Tests**
   ```rust
   #[test]
   fn test_no_vulnerable_zst() {
       // Ensure all types used with borsh are safe
   }
   ```

### Phase 3: Dependency Updates (Waiting for Upstream)

#### Monitor for Updates

**Check Weekly**:
```bash
# Check for Anchor updates
cargo search anchor-lang

# Check for Solana updates
cargo search solana-program

# Check current versions
cargo tree | grep -E "(borsh|solana-program|anchor-lang)"
```

#### Update Path

When Anchor releases a version with fixed borsh:

1. **Update Cargo.toml**:
   ```toml
   [dependencies]
   anchor-lang = "0.31.0"  # Or latest with borsh >= 0.10
   ```

2. **Update Lock File**:
   ```bash
   cargo update
   ```

3. **Test Thoroughly**:
   ```bash
   anchor test
   cargo test-sbf
   ```

4. **Re-run Security Audit**:
   ```bash
   cargo audit
   ```

### Phase 4: Temporary Workarounds

#### Option 1: Cargo Patch (If Possible)

Add to root `Cargo.toml`:
```toml
[patch.crates-io]
borsh = { version = "1.0", features = ["derive"] }
```

**Status**: ❌ Blocked by Anchor's strict version requirements

#### Option 2: Fork and Patch

1. Fork anchor-lang
2. Update borsh dependency
3. Use forked version

**Status**: ⏳ Too complex, waiting for official update

#### Option 3: Vendor Dependencies

```bash
cargo vendor
```

Then manually patch borsh in vendor directory.

**Status**: ⏳ Last resort option

### Phase 5: Testing Strategy

#### 1. Unit Tests

```rust
#[cfg(test)]
mod security_tests {
    use super::*;
    use borsh::{BorshSerialize, BorshDeserialize};

    #[test]
    fn test_agent_serialization_safety() {
        let agent = Agent {
            authority: Pubkey::new_unique(),
            name: "Test".to_string(),
            capabilities: vec!["test".to_string()],
            is_active: true,
        };

        // Should serialize/deserialize safely
        let serialized = agent.try_to_vec().unwrap();
        let deserialized = Agent::try_from_slice(&serialized).unwrap();
        
        assert_eq!(agent.authority, deserialized.authority);
        assert_eq!(agent.name, deserialized.name);
    }

    #[test]
    fn test_no_zst_in_accounts() {
        // Ensure no account structs are ZST
        assert!(std::mem::size_of::<Agent>() > 0);
        assert!(std::mem::size_of::<Collaboration>() > 0);
    }
}
```

#### 2. Integration Tests

```rust
#[tokio::test]
async fn test_register_agent_with_borsh() {
    let mut context = program_test().start_with_context().await;
    
    // Test that agent registration works correctly
    let result = register_agent(
        &mut context,
        "Test Agent",
        vec!["capability1".to_string()],
    ).await;
    
    assert!(result.is_ok());
}
```

#### 3. Fuzzing Tests

Use Trident to fuzz borsh serialization:

```rust
#[flow]
fn fuzz_agent_serialization(&mut self) {
    let agent = self.fuzz_accounts.agent.get_account();
    
    // Fuzz with random data
    let serialized = agent.try_to_vec().unwrap();
    let deserialized = Agent::try_from_slice(&serialized).unwrap();
    
    // Should round-trip correctly
    assert_eq!(agent, deserialized);
}
```

## Current Status

### Completed ✅
- [x] Run cargo-audit and identify vulnerabilities
- [x] Document all findings in SECURITY-AUDIT-REPORT.md
- [x] Create this fix plan
- [x] Attempt dependency updates
- [x] Add security testing recommendations

### In Progress ⏳
- [ ] Review all borsh usage in agent-registry
- [ ] Add unit tests for serialization safety
- [ ] Monitor Anchor/Solana for updates
- [ ] Set up automated security checks in CI/CD

### Blocked 🚫
- [ ] Update to borsh >= 0.10.0 (waiting for Anchor update)
- [ ] Fix curve25519-dalek timing vulnerability (waiting for Solana update)

## Risk Assessment

### Current Risk: MEDIUM

**Rationale**:
1. **Borsh ZST Issue**: Low likelihood of exploitation
   - Requires specific ZST patterns
   - Agent registry likely doesn't use vulnerable patterns
   - Can be mitigated with code review

2. **Curve25519-dalek**: Higher risk
   - Timing side-channel attacks are real
   - Affects all cryptographic operations
   - Cannot be fixed without Solana update

### Mitigation Until Fixed

1. **Code Review**: Ensure no vulnerable ZST patterns
2. **Testing**: Add comprehensive serialization tests
3. **Monitoring**: Weekly checks for dependency updates
4. **Documentation**: Warn users about known issues
5. **Rate Limiting**: Limit exposure to timing attacks

## Timeline

| Phase | Action | Target Date | Status |
|-------|--------|-------------|--------|
| 1 | Immediate audit | Feb 21, 2026 | ✅ Complete |
| 2 | Code review | Feb 22, 2026 | ⏳ In Progress |
| 3 | Add tests | Feb 23, 2026 | 📅 Scheduled |
| 4 | Monitor updates | Weekly | 🔄 Ongoing |
| 5 | Apply updates | TBD | ⏸️ Waiting |

## Communication Plan

### Internal Team
- Daily standup updates on security status
- Weekly security review meetings
- Immediate notification of new vulnerabilities

### Users
- Update README with known issues
- Add security notice to documentation
- Notify users when fixes are deployed

### Community
- Post in Solana Discord about issues
- Contribute to Anchor GitHub discussions
- Share findings with security researchers

## Success Criteria

✅ **Phase 1 Complete When**:
- All vulnerabilities documented
- Fix plan created and approved
- Team aware of risks

✅ **Phase 2 Complete When**:
- All code reviewed for vulnerable patterns
- No unsafe ZST usage found
- Tests added for serialization safety

✅ **Final Success When**:
- cargo audit shows 0 vulnerabilities
- All dependencies updated to safe versions
- Comprehensive test coverage in place
- CI/CD includes security checks

## Resources

- [RUSTSEC-2023-0033](https://rustsec.org/advisories/RUSTSEC-2023-0033)
- [Borsh Security Advisory](https://github.com/near/borsh-rs/security/advisories)
- [Anchor GitHub](https://github.com/coral-xyz/anchor)
- [Solana Security](https://docs.solana.com/developing/programming-model/security)

## Contact

For security concerns:
- Email: security@ordo.example.com
- Discord: #security channel
- GitHub: Security tab

---

**Last Updated**: February 21, 2026  
**Next Review**: February 28, 2026  
**Owner**: Security Team
