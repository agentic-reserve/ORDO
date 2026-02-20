# Fix Anchor build issues with version mismatches (PowerShell version for Windows)

Write-Host "🔧 Fixing Anchor build issues..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "Anchor.toml")) {
    Write-Host "❌ Error: Anchor.toml not found. Run this script from the ordo directory." -ForegroundColor Red
    exit 1
}

# Update Rust and Cargo to latest stable
Write-Host "📦 Updating Rust and Cargo..." -ForegroundColor Yellow
rustup update stable
rustup default stable

# Update Cargo.lock with compatible versions
Write-Host "📦 Updating Cargo dependencies..." -ForegroundColor Yellow
Push-Location programs/agent-registry

# Apply the compatibility fixes for Anchor 0.30.1
cargo update base64ct --precise 1.6.0
cargo update constant_time_eq --precise 0.4.1
cargo update blake3 --precise 1.5.5

Pop-Location

Write-Host ""
Write-Host "✅ Build fixes applied!" -ForegroundColor Green
Write-Host ""
Write-Host "Now try building again:" -ForegroundColor Cyan
Write-Host "  anchor build" -ForegroundColor White
