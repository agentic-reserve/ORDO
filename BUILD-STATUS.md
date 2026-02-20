# Anchor Build Status & Next Steps

## Current Status

| Issue | Status | Solution |
|-------|--------|----------|
| Solana version mismatch | ✅ FIXED | Updated to use 1.18.22 |
| Anchor version mismatch | ✅ FIXED | Downgraded to 0.30.1 |
| Missing cargo-build-sbf | ❌ TODO | Need to install Solana CLI |

## What's Been Fixed

1. ✅ **Cargo.toml** - Updated to use Solana 1.18.22
2. ✅ **Anchor.toml** - Commented out version requirement
3. ✅ **package.json** - Downgraded Anchor to 0.30.1

## What You Need to Do

### Install Solana CLI

**Option 1: Automated Install (Easiest)**

Run PowerShell as Administrator:

```powershell
cd C:\Users\raden\Music\ordo\ordo
.\install-solana-windows.ps1
```

This will:
- Download Solana CLI v1.18.22
- Install it
- Add to PATH
- Verify installation

**Option 2: Manual Install**

1. Download: https://release.solana.com/v1.18.22/solana-install-init-x86_64-pc-windows-msvc.exe
2. Run the installer
3. Add to PATH: `C:\Users\raden\.local\share\solana\install\active_release\bin`
4. Restart terminal

**Option 3: Use WSL2 (Best for Development)**

```powershell
wsl --install
```

Then in WSL2, follow: `setup-anchor-build.md`

### After Installing Solana

```bash
# Verify installation
solana --version
# Should show: solana-cli 1.18.22

# Update dependencies
npm install

# Build the program
anchor build

# Verify IDL was generated
ls target/idl/agent_registry.json
```

## Quick Reference

### Files Created for You

- `QUICK-FIX.md` - Quick solutions
- `setup-anchor-build.md` - Complete setup guide
- `install-solana-windows.ps1` - Automated installer
- `docs/ANCHOR-BUILD-FIX-WINDOWS.md` - Detailed troubleshooting

### Commands

```bash
# Install Solana (PowerShell as Admin)
.\install-solana-windows.ps1

# Update dependencies
npm install

# Build program
anchor build

# Upload metadata after successful build
npm run metadata:upload:devnet
```

## Troubleshooting

### "solana: command not found" after install

Restart your terminal. If still not working, manually add to PATH:

```powershell
$env:PATH += ";C:\Users\raden\.local\share\solana\install\active_release\bin"
```

### Still getting errors?

See detailed guides:
- `QUICK-FIX.md` - Fast solutions
- `setup-anchor-build.md` - Complete setup
- `docs/ANCHOR-BUILD-FIX-WINDOWS.md` - All troubleshooting steps

### Want to avoid Windows issues?

Use WSL2 - it's the best way to develop Solana on Windows:
```powershell
wsl --install
```

## Next Steps After Successful Build

1. ✅ Build succeeds: `anchor build`
2. 📤 Upload metadata: `npm run metadata:upload:devnet`
3. 🔍 Verify in explorer: `npm run metadata:fetch:devnet`
4. 🚀 Deploy to devnet: `anchor deploy --provider.cluster devnet`

## Need Help?

All documentation is in the `docs/` folder:
- `QUICK-FIX.md` - Start here
- `setup-anchor-build.md` - Complete setup
- `PROGRAM-METADATA-SETUP.md` - Metadata guide
- `ANCHOR-BUILD-FIX-WINDOWS.md` - Troubleshooting
