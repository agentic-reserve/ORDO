# PowerShell script to fix Solana version mismatch on Windows

Write-Host "🔧 Fixing Solana version mismatch..." -ForegroundColor Cyan
Write-Host ""

# Check current Solana version
try {
    $currentVersion = (solana --version 2>$null) -replace 'solana-cli ', ''
    $currentVersion = $currentVersion.Split(' ')[0]
    Write-Host "Current Solana version: $currentVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Solana is not installed!" -ForegroundColor Red
    Write-Host "Install from: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
}

# Check what Anchor.toml requires
$anchorToml = Get-Content "Anchor.toml" -Raw
if ($anchorToml -match 'solana_version\s*=\s*"([0-9\.]+)"') {
    $requiredVersion = $matches[1]
    Write-Host "Required Solana version: $requiredVersion" -ForegroundColor Yellow
} else {
    $requiredVersion = "not specified"
    Write-Host "Required Solana version: not specified" -ForegroundColor Gray
}
Write-Host ""

if ($currentVersion -ne $requiredVersion -and $requiredVersion -ne "not specified") {
    Write-Host "⚠️  Version mismatch detected!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Choose a fix:"
    Write-Host "1. Update Cargo.toml to use Solana $currentVersion (Quick fix - Recommended)"
    Write-Host "2. Remove version requirement from Anchor.toml"
    Write-Host "3. Install Solana $requiredVersion (Requires admin privileges)"
    Write-Host ""
    $choice = Read-Host "Enter choice (1-3)"
    
    switch ($choice) {
        "1" {
            Write-Host "Updating programs/agent-registry/Cargo.toml..." -ForegroundColor Cyan
            $cargoToml = Get-Content "programs/agent-registry/Cargo.toml" -Raw
            $cargoToml = $cargoToml -replace 'solana-program = "[0-9\.]+"', "solana-program = `"$currentVersion`""
            Set-Content "programs/agent-registry/Cargo.toml" $cargoToml
            Write-Host "✅ Updated to use Solana $currentVersion" -ForegroundColor Green
        }
        "2" {
            Write-Host "Removing version requirement from Anchor.toml..." -ForegroundColor Cyan
            $anchorToml = Get-Content "Anchor.toml" | Where-Object { $_ -notmatch 'solana_version' }
            Set-Content "Anchor.toml" $anchorToml
            Write-Host "✅ Removed version requirement" -ForegroundColor Green
        }
        "3" {
            Write-Host "Installing Solana $requiredVersion..." -ForegroundColor Cyan
            Write-Host "⚠️  This requires Administrator privileges!" -ForegroundColor Yellow
            Write-Host "If this fails, run PowerShell as Administrator and try again." -ForegroundColor Yellow
            Write-Host ""
            Start-Process powershell -Verb RunAs -ArgumentList "-Command", "solana-install init $requiredVersion" -Wait
        }
        default {
            Write-Host "Invalid choice" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "✅ Versions match! No fix needed." -ForegroundColor Green
}

Write-Host ""
Write-Host "Now try: anchor build" -ForegroundColor Cyan
