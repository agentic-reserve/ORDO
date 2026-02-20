# Fixing Anchor Build on Windows

## Problem

You're seeing this error:
```
Error: "Unable to symlink ... A required privilege is not held by the client. (os error 1314)"
Failed to override `solana` version to 2.1.0, using 1.18.22 instead
Error: program not found
```

This happens because:
1. Windows requires admin privileges to create symlinks
2. Anchor can't switch Solana versions without symlink permissions
3. Version mismatch causes build failures

## Solutions (Choose One)

### Solution 1: Enable Developer Mode (Recommended)

This allows symlinks without admin rights:

1. Open **Settings** → **Update & Security** → **For developers**
2. Enable **Developer Mode**
3. Restart your terminal
4. Try `anchor build` again

### Solution 2: Run Terminal as Administrator

1. Close your current terminal
2. Right-click **Git Bash** or **PowerShell**
3. Select **Run as administrator**
4. Navigate to your project: `cd ~/Music/ordo/ordo`
5. Run `anchor build`

### Solution 3: Use WSL2 (Best for Development)

Windows Subsystem for Linux avoids Windows permission issues:

1. Install WSL2:
   ```powershell
   wsl --install
   ```

2. Install Ubuntu from Microsoft Store

3. Inside WSL2, install Solana and Anchor:
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Install Solana
   sh -c "$(curl -sSfL https://release.solana.com/v2.1.0/install)"
   
   # Install Anchor
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install 0.30.1
   avm use 0.30.1
   ```

4. Clone your repo in WSL2 and build there

### Solution 4: Fix Solana Version Manually

If you can't enable Developer Mode or use admin:

1. Remove the Solana version requirement from `Anchor.toml`:
   ```toml
   [toolchain]
   anchor_version = "0.30.1"
   # Remove or comment out: solana_version = "2.1.0"
   ```

2. Update `programs/agent-registry/Cargo.toml` to match your installed Solana version:
   ```toml
   [dependencies]
   anchor-lang = "0.30.1"
   solana-program = "1.18.22"  # Match your installed version
   ```

3. Check your Solana version:
   ```bash
   solana --version
   ```

4. Build:
   ```bash
   anchor build
   ```

### Solution 5: Use Docker (Cross-Platform)

Build in a Docker container to avoid Windows issues:

1. Make sure Docker Desktop is installed and running

2. Build using the provided Docker setup:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

Or build manually:
   ```bash
   docker run --rm -v "$(pwd)":/workspace -w /workspace projectserum/build:v0.30.1 anchor build
   ```

## Verification

After applying a solution, verify the build works:

```bash
# Clean previous build artifacts
rm -rf target/

# Build the program
anchor build

# Check that IDL was generated
ls -la target/idl/agent_registry.json
ls -la target/types/agent_registry.ts
```

## Recommended Approach for Windows

For the best development experience on Windows:

1. **Short term**: Enable Developer Mode (Solution 1)
2. **Long term**: Use WSL2 (Solution 3) for all Solana development

WSL2 provides:
- Native Linux environment
- No symlink permission issues
- Better performance for builds
- Compatibility with all Solana tools

## Troubleshooting

### "program not found" after fixing symlink

This usually means Cargo workspace isn't configured correctly. Verify:

```bash
# Check workspace members
cat Cargo.toml

# Should show:
# [workspace]
# members = ["programs/agent-registry"]
```

### Build succeeds but no IDL generated

Check that your program has the `#[program]` macro:

```rust
#[program]
pub mod agent_registry {
    // ...
}
```

### Version conflicts

If you see version conflicts, ensure consistency:

```bash
# Check versions
anchor --version  # Should be 0.30.1
solana --version  # Should match Anchor.toml

# Update if needed
avm use 0.30.1
solana-install init 2.1.0
```

## Additional Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Installation Guide](https://docs.solana.com/cli/install-solana-cli-tools)
- [WSL2 Installation](https://learn.microsoft.com/en-us/windows/wsl/install)
- [Windows Developer Mode](https://learn.microsoft.com/en-us/windows/apps/get-started/enable-your-device-for-development)
