#!/bin/bash
# Quick fix for Solana version mismatch on Windows

echo "🔧 Fixing Solana version mismatch..."
echo ""

# Check current Solana version
CURRENT_VERSION=$(solana --version 2>/dev/null | grep -oP 'solana-cli \K[0-9.]+' || echo "not installed")
echo "Current Solana version: $CURRENT_VERSION"

# Check what Anchor.toml requires
REQUIRED_VERSION=$(grep 'solana_version' Anchor.toml | grep -oP '"\K[0-9.]+' || echo "not specified")
echo "Required Solana version: $REQUIRED_VERSION"
echo ""

if [ "$CURRENT_VERSION" = "not installed" ]; then
    echo "❌ Solana is not installed!"
    echo "Install with: sh -c \"\$(curl -sSfL https://release.solana.com/v2.1.0/install)\""
    exit 1
fi

if [ "$CURRENT_VERSION" != "$REQUIRED_VERSION" ]; then
    echo "⚠️  Version mismatch detected!"
    echo ""
    echo "Choose a fix:"
    echo "1. Update Cargo.toml to use Solana $CURRENT_VERSION (Quick fix)"
    echo "2. Install Solana $REQUIRED_VERSION (Requires admin on Windows)"
    echo "3. Remove version requirement from Anchor.toml"
    echo ""
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            echo "Updating programs/agent-registry/Cargo.toml..."
            sed -i "s/solana-program = \"[0-9.]*\"/solana-program = \"$CURRENT_VERSION\"/" programs/agent-registry/Cargo.toml
            echo "✅ Updated to use Solana $CURRENT_VERSION"
            ;;
        2)
            echo "Installing Solana $REQUIRED_VERSION..."
            echo "Note: On Windows, run your terminal as Administrator!"
            solana-install init $REQUIRED_VERSION
            ;;
        3)
            echo "Removing version requirement from Anchor.toml..."
            sed -i '/solana_version/d' Anchor.toml
            echo "✅ Removed version requirement"
            ;;
        *)
            echo "Invalid choice"
            exit 1
            ;;
    esac
else
    echo "✅ Versions match! No fix needed."
fi

echo ""
echo "Now try: anchor build"
