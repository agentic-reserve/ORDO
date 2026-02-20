# Install Solana CLI on Windows
# Run this in PowerShell as Administrator

Write-Host "🚀 Installing Solana CLI v1.18.22 for Windows..." -ForegroundColor Cyan
Write-Host ""

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "⚠️  This script needs to run as Administrator!" -ForegroundColor Yellow
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Create temp directory
$tempDir = "C:\solana-install-tmp"
if (-not (Test-Path $tempDir)) {
    New-Item -ItemType Directory -Path $tempDir | Out-Null
}

# Download installer
Write-Host "📥 Downloading Solana installer..." -ForegroundColor Cyan
$installerUrl = "https://release.solana.com/v1.18.22/solana-install-init-x86_64-pc-windows-msvc.exe"
$installerPath = "$tempDir\solana-install-init.exe"

try {
    Invoke-WebRequest -Uri $installerUrl -OutFile $installerPath
    Write-Host "✅ Downloaded successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed: $_" -ForegroundColor Red
    exit 1
}

# Run installer
Write-Host ""
Write-Host "📦 Installing Solana CLI..." -ForegroundColor Cyan
try {
    Start-Process -FilePath $installerPath -ArgumentList "v1.18.22" -Wait -NoNewWindow
    Write-Host "✅ Solana CLI installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Installation failed: $_" -ForegroundColor Red
    exit 1
}

# Add to PATH
Write-Host ""
Write-Host "🔧 Adding Solana to PATH..." -ForegroundColor Cyan
$solanaPath = "$env:USERPROFILE\.local\share\solana\install\active_release\bin"

# Get current user PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")

# Check if already in PATH
if ($currentPath -notlike "*$solanaPath*") {
    $newPath = "$currentPath;$solanaPath"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "✅ Added to PATH" -ForegroundColor Green
} else {
    Write-Host "✅ Already in PATH" -ForegroundColor Green
}

# Update current session PATH
$env:PATH += ";$solanaPath"

# Verify installation
Write-Host ""
Write-Host "🔍 Verifying installation..." -ForegroundColor Cyan
try {
    $version = & "$solanaPath\solana.exe" --version 2>&1
    Write-Host "✅ $version" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Verification failed. You may need to restart your terminal." -ForegroundColor Yellow
}

# Clean up
Write-Host ""
Write-Host "🧹 Cleaning up..." -ForegroundColor Cyan
Remove-Item -Path $tempDir -Recurse -Force
Write-Host "✅ Done" -ForegroundColor Green

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✨ Solana CLI installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Close and reopen your terminal" -ForegroundColor White
Write-Host "2. Run: solana --version" -ForegroundColor White
Write-Host "3. Run: npm install" -ForegroundColor White
Write-Host "4. Run: anchor build" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
