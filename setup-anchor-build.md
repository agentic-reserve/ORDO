# Complete Anchor Build Setup for Windows

## Current Issues

1. ✅ **Solana version mismatch** - FIXED (using 1.18.22)
2. ✅ **Anchor version mismatch** - FIXED (downgraded to 0.30.1)
3. ❌ **Missing cargo-build-sbf** - Solana CLI tools not installed properly

## Quick Fix

### Step 1: Install Solana CLI Tools

The `cargo-build-sbf` command comes with Solana CLI. Install it:

**Option A: Using PowerShell (Recommended for Windows)**

```powershell
# Run PowerShell as Administrator
# Then run:
cmd /c "curl https://release.solana.com/v1.18.22/solana-install-init-x86_64-pc-windows-msvc.exe --output C:\solana-install-tmp\solana-install-init.exe --create-dirs"

# Run the installer
C:\solana-install-tmp\solana-install-init.exe v1.18.22

# Add to PATH (restart terminal after)
$env:PATH += ";C:\Users\$env:USERNAME\.local\share\solana\install\active_release\bin"
```

**Option B: Using WSL2 (Better for development)**

```bash
# In WSL2 Ubuntu
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

### Step 2: Update Dependencies

```bash
# Update to matching Anchor version
npm install

# Or if using yarn
yarn install
```

### Step 3: Verify Installation

```bash
# Check Solana is installed
solana --version
# Should show: solana-cli 1.18.22

# Check cargo-build-sbf is available
cargo build-sbf --version

# Check Anchor version
anchor --version
# Should show: anchor-cli 0.30.1
```

### Step 4: Build

```bash
# Clean previous build
rm -rf target/

# Build the program
anchor build
```

## If You Still Get Errors

### Error: "solana: command not found"

The Solana CLI is not in your PATH. Add it:

**Windows (PowerShell):**
```powershell
# Add to current session
$env:PATH += ";C:\Users\$env:USERNAME\.local\share\solana\install\active_release\bin"

# Add permanently (run as admin)
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\$env:USERNAME\.local\share\solana\install\active_release\bin", "User")
```

**Git Bash:**
```bash
# Add to ~/.bashrc
echo 'export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### Error: "cargo-build-sbf: command not found"

This means Solana CLI tools aren't fully installed. Try:

```bash
# Reinstall Solana
solana-install init 1.18.22

# Or install cargo-build-sbf separately
cargo install --git https://github.com/solana-labs/cargo-build-sbf --tag v1.18.22
```

### Error: "Anchor version mismatch"

```bash
# Update package.json (already done)
npm install

# Or force reinstall
rm -rf node_modules package-lock.json
npm install
```

## Alternative: Use Docker

If you keep having issues, use Docker to build:

```bash
# Build using Docker
docker run --rm -v "$(pwd)":/workspace -w /workspace projectserum/build:v0.30.1 anchor build

# Or use docker-compose
docker-compose -f docker-compose.dev.yml up --build
```

## Recommended Setup for Windows

For the best Solana development experience on Windows:

1. **Install WSL2**
   ```powershell
   wsl --install
   ```

2. **Inside WSL2, install everything:**
   ```bash
   # Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Solana
   sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"
   
   # Anchor
   cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
   avm install 0.30.1
   avm use 0.30.1
   
   # Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Clone your repo in WSL2 and work there**

This avoids all Windows-specific issues with symlinks, paths, and permissions.

## Quick Commands Reference

```bash
# Check versions
solana --version
anchor --version
cargo --version

# Clean build
rm -rf target/ && anchor build

# Build with verbose output
anchor build --verbose

# Test the program
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

## Next Steps After Successful Build

Once `anchor build` succeeds:

```bash
# Verify IDL was generated
ls -la target/idl/agent_registry.json
ls -la target/types/agent_registry.ts

# Upload metadata to devnet
npm run metadata:upload:devnet

# Verify in explorer
npm run metadata:fetch:devnet
```
