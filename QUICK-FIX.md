# Quick Fix for Anchor Build Error on Windows

## Current Status

✅ **Fixed:** Solana version mismatch (using 1.18.22)  
✅ **Fixed:** Anchor version mismatch (downgraded to 0.30.1)  
❌ **Need to fix:** Missing `cargo-build-sbf` command

## The Remaining Problem

```
error: no such command: `build-sbf`
```

This means Solana CLI tools aren't installed or not in your PATH.

## Quick Fix

### Option 1: Install Solana CLI (Windows)

**Run PowerShell as Administrator**, then:

```powershell
# Download installer
cmd /c "curl https://release.solana.com/v1.18.22/solana-install-init-x86_64-pc-windows-msvc.exe --output C:\solana-install-tmp\solana-install-init.exe --create-dirs"

# Run installer
C:\solana-install-tmp\solana-install-init.exe v1.18.22

# Add to PATH
[Environment]::SetEnvironmentVariable("Path", $env:Path + ";C:\Users\$env:USERNAME\.local\share\solana\install\active_release\bin", "User")
```

**Restart your terminal**, then:

```bash
# Update dependencies
npm install

# Build
anchor build
```

### Option 2: Use WSL2 (Recommended)

WSL2 avoids all Windows issues:

```powershell
# Install WSL2
wsl --install
```

After restart, in WSL2:

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install Solana
sh -c "$(curl -sSfL https://release.solana.com/v1.18.22/install)"
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Install Anchor
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install 0.30.1
avm use 0.30.1

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo and build
cd ~
git clone <your-repo-url>
cd ordo
npm install
anchor build
```

### Option 3: Use Docker (No Installation Needed)

```bash
# Build using Docker
docker run --rm -v "$(pwd)":/workspace -w /workspace projectserum/build:v0.30.1 anchor build
```

## Verify Installation

After installing Solana CLI, verify:

```bash
# Check Solana
solana --version
# Should show: solana-cli 1.18.22

# Check cargo-build-sbf
cargo build-sbf --version

# Check Anchor
anchor --version
# Should show: anchor-cli 0.30.1

# Update dependencies
npm install

# Build
anchor build
```

## Next Steps

Once the build succeeds, you can upload metadata:

```bash
# Upload IDL and security.txt to devnet
npm run metadata:upload:devnet

# Fetch and verify
npm run metadata:fetch:devnet
```

## Need More Help?

See detailed documentation:
- `docs/ANCHOR-BUILD-FIX-WINDOWS.md` - Complete troubleshooting guide
- `docs/PROGRAM-METADATA-SETUP.md` - Metadata upload guide
