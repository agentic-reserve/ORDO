# Anchor Build Troubleshooting Guide

This guide helps resolve common build issues with the agent-registry Anchor program.

## Quick Fix

If you're seeing version mismatch errors, run the fix script:

**Windows (PowerShell):**
```powershell
cd ordo
.\fix-anchor-build.ps1
```

**Linux/Mac:**
```bash
cd ordo
chmod +x fix-anchor-build.sh
./fix-anchor-build.sh
```

Then try building again:
```bash
anchor build
```

## Common Issues

### 1. Anchor CLI and anchor-lang Version Mismatch

**Error:**
```
WARNING: `anchor-lang` version(0.30.1) and the current CLI version(0.32.1) don't match.
```

**Solution:**

Option A: Pin Anchor CLI version in `Anchor.toml` (recommended):
```toml
[toolchain]
anchor_version = "0.30.1"
solana_version = "2.1.0"
```

Option B: Update anchor-lang to match CLI:
```toml
[dependencies]
anchor-lang = "0.32.1"
```

### 2. Blake3 Edition2024 Error

**Error:**
```
feature `edition2024` is required
The package requires the Cargo feature called `edition2024`
```

**Root Cause:** Your Cargo version (1.75.0) is too old for the dependencies that Anchor 0.32+ requires.

**Solution:**

Update Rust and Cargo to the latest stable version:
```bash
rustup update stable
rustup default stable
```

Verify the update:
```bash
cargo --version  # Should be 1.80.0 or newer
rustc --version  # Should be 1.80.0 or newer
```

### 3. Cargo Dependency Conflicts

**Error:**
```
error: failed to download `blake3 v1.8.3`
```

**Solution:**

Apply compatibility fixes by downgrading specific dependencies:

```bash
cd programs/agent-registry
cargo update base64ct --precise 1.6.0
cargo update constant_time_eq --precise 0.4.1
cargo update blake3 --precise 1.5.5
cd ../..
```

### 4. Solana Program Version Conflicts

**Error:**
```
warning: multiple versions of solana-program
```

**Solution:**

Add explicit `solana-program` version to your program's `Cargo.toml`:

```toml
[dependencies]
anchor-lang = "0.30.1"
solana-program = "2.1.0"
```

## Recommended Setup

### 1. Install Latest Rust

```bash
# Install rustup if you haven't
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Update to latest stable
rustup update stable
rustup default stable

# Verify versions
cargo --version
rustc --version
```

### 2. Install Anchor CLI with AVM

Use Anchor Version Manager (AVM) for better version control:

```bash
# Install AVM
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install specific Anchor version
avm install 0.30.1
avm use 0.30.1

# Verify
anchor --version  # Should show 0.30.1
```

### 3. Install Solana CLI

```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/v2.1.0/install)"

# Verify
solana --version  # Should show 2.1.0 or compatible
```

### 4. Configure Anchor.toml

Ensure your `Anchor.toml` has the toolchain section:

```toml
[toolchain]
anchor_version = "0.30.1"
solana_version = "2.1.0"
```

## Build Process

### Clean Build

If you're still having issues, try a clean build:

```bash
# Clean all build artifacts
anchor clean

# Remove Cargo.lock
rm -f Cargo.lock
rm -f programs/agent-registry/Cargo.lock

# Rebuild
anchor build
```

### Verbose Build

For more detailed error information:

```bash
anchor build --verbose
```

### Build Individual Program

```bash
cd programs/agent-registry
cargo build-sbf
cd ../..
```

## Version Compatibility Matrix

| Anchor CLI | anchor-lang | Solana CLI | Rust | Cargo |
|------------|-------------|------------|------|-------|
| 0.30.1     | 0.30.1      | 2.0.x-2.1.x | 1.75+ | 1.75+ |
| 0.31.0     | 0.31.0      | 2.0.x-2.1.x | 1.77+ | 1.77+ |
| 0.32.0+    | 0.32.0+     | 2.1.x      | 1.80+ | 1.80+ |

## Checking Your Versions

Run these commands to check your current setup:

```bash
# Anchor
anchor --version

# Solana
solana --version

# Rust
rustc --version

# Cargo
cargo --version

# Check anchor-lang in Cargo.toml
grep "anchor-lang" programs/agent-registry/Cargo.toml
```

## Environment-Specific Issues

### Windows

If you're on Windows and using Git Bash or MINGW64:

1. Make sure you have the latest Rust installed via rustup-init.exe
2. Use PowerShell for running Anchor commands if Git Bash has issues
3. Ensure your PATH includes Cargo bin directory: `%USERPROFILE%\.cargo\bin`

### WSL (Windows Subsystem for Linux)

If using WSL:

1. Install Rust inside WSL, not Windows
2. Install Solana CLI inside WSL
3. Don't mix Windows and WSL file systems for builds

### macOS

If you're on macOS with Apple Silicon (M1/M2):

1. Make sure you're using native ARM Rust, not x86_64
2. Check with: `rustc --version --verbose` (should show `host: aarch64-apple-darwin`)

## CI/CD Considerations

For GitHub Actions or other CI:

```yaml
- name: Install Rust
  uses: actions-rs/toolchain@v1
  with:
    toolchain: stable
    override: true

- name: Install Solana
  run: |
    sh -c "$(curl -sSfL https://release.solana.com/v2.1.0/install)"
    echo "$HOME/.local/share/solana/install/active_release/bin" >> $GITHUB_PATH

- name: Install Anchor
  run: |
    cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    avm install 0.30.1
    avm use 0.30.1

- name: Build Program
  run: anchor build
```

## Still Having Issues?

If none of these solutions work:

1. Check the [Anchor Discord](https://discord.gg/anchor) for community support
2. Review [Anchor GitHub Issues](https://github.com/coral-xyz/anchor/issues)
3. Ensure your system meets all prerequisites
4. Try building a fresh Anchor project to isolate the issue:
   ```bash
   anchor init test-project
   cd test-project
   anchor build
   ```

## Additional Resources

- [Anchor Documentation](https://www.anchor-lang.com/)
- [Solana Documentation](https://docs.solana.com/)
- [Rust Installation Guide](https://www.rust-lang.org/tools/install)
- [AVM GitHub](https://github.com/coral-xyz/anchor/tree/master/avm)
