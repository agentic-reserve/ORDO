#!/bin/bash
# Fix Anchor build issues with version mismatches

echo "🔧 Fixing Anchor build issues..."
echo ""

# Check if we're in the right directory
if [ ! -f "Anchor.toml" ]; then
    echo "❌ Error: Anchor.toml not found. Run this script from the ordo directory."
    exit 1
fi

# Update Rust and Cargo to latest stable
echo "📦 Updating Rust and Cargo..."
rustup update stable
rustup default stable

# Update Cargo.lock with compatible versions
echo "📦 Updating Cargo dependencies..."
cd programs/agent-registry

# Apply the compatibility fixes for Anchor 0.30.1
cargo update base64ct --precise 1.6.0
cargo update constant_time_eq --precise 0.4.1
cargo update blake3 --precise 1.5.5

cd ../..

echo ""
echo "✅ Build fixes applied!"
echo ""
echo "Now try building again:"
echo "  anchor build"
