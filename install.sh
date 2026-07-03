#!/bin/bash

# Network Spy - Terminal Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/muizidn/NetworkSpy/develop/install.sh | sh
# Or to install specific version: curl -fsSL https://raw.githubusercontent.com/muizidn/NetworkSpy/develop/install.sh | sh -s v1.0.0
# Or to bypass quarantine (macOS/CI): curl -fsSL https://raw.githubusercontent.com/muizidn/NetworkSpy/develop/install.sh | sh -s -- --allow-unsigned

set -e

GITHUB_REPO="muizidn/NetworkSpy"
SCRIPT_BRANCH="main"

REPO_URL="https://github.com/$GITHUB_REPO"

# Configuration
VERSION=""
ALLOW_UNSIGNED=false

# 0. Argument Parsing
for arg in "$@"; do
    if [ "$arg" = "--allow-unsigned" ]; then
        ALLOW_UNSIGNED=true
    elif [ -z "$VERSION" ]; then
        # The first non-flag argument is the version
        VERSION=$arg
    fi
done

TEMP_DIR=$(mktemp -d)

echo "🚀 Starting Network Spy Installation..."
echo "📂 Script Source: github.com/$GITHUB_REPO"

# 1. Platform Detection
OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
    ARCH_NAME="amd64"
    ARCH_NAME_MAC="x64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    ARCH_NAME="arm64"
    ARCH_NAME_MAC="aarch64"
else
    echo "❌ Unsupported architecture: $ARCH"
    exit 1
fi

# 2. Version Detection
if [ -z "$VERSION" ] || [ "$VERSION" = "latest" ]; then
    echo "🔍 Fetching latest version info..."
    if command -v jq &>/dev/null; then
        VERSION=$(curl -s "https://networkspy.app/latest" | jq -r '.version // empty' 2>/dev/null || true)
    elif command -v python3 &>/dev/null; then
        VERSION=$(curl -s "https://networkspy.app/latest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('version') or '')" 2>/dev/null || true)
    else
        VERSION=$(curl -s "https://networkspy.app/latest" | sed -E 's/.*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
    fi
fi

if [ -z "$VERSION" ]; then
    echo "⚠️ networkspy.app returned no version. Falling back to GitHub API..."
    if command -v jq &>/dev/null; then
        VERSION=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | jq -r '.tag_name // empty' 2>/dev/null || true)
    elif command -v python3 &>/dev/null; then
        VERSION=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tag_name') or '')" 2>/dev/null || true)
    else
        VERSION=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/latest" | sed -E 's/.*"tag_name"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
    fi
fi

if [ -z "$VERSION" ]; then
    echo "❌ FATAL: Could not determine version to install. Please specify a version manually or ensure the repository has releases."
    exit 1
fi

echo "✅ Version resolved: $VERSION"
echo "💻 Platform: $OS ($ARCH)"
if [ "$ALLOW_UNSIGNED" = true ]; then
    echo "🛡️  Bypass Mode: Enabled (Quarantine will be removed)"
fi

# 3. Download and Install
cd "$TEMP_DIR"

if [ "$OS" = "darwin" ]; then
    # macOS Installation (.dmg)
    VERSION_NUM=${VERSION#v}
    FILENAME="Network.Spy_${VERSION_NUM}_${ARCH_NAME_MAC}.dmg"
    DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/${VERSION}/${FILENAME}"
    
    echo "🔍 Using asset: $FILENAME"
    
    echo "⬇️ Downloading $FILENAME..."
    if ! curl -L -O "$DOWNLOAD_URL"; then
        echo "❌ Download failed. URL: $DOWNLOAD_URL"
        exit 1
    fi
    
    echo "💿 Mounting DMG..."
    # Robustly get the mount point using plist output
    MOUNT_POINT=$(hdiutil attach "$FILENAME" -nobrowse -plist | grep -A 1 "mount-point" | grep string | sed 's/.*<string>\(.*\)<\/string>.*/\1/')
    
    if [ -z "$MOUNT_POINT" ]; then
        echo "❌ Failed to find mount point for $FILENAME"
        exit 1
    fi
    
    echo "📁 Installing to /Applications..."
    # Find the .app folder inside the DMG
    APP_SOURCE=$(ls -d "$MOUNT_POINT"/*.app | head -n 1)
    APP_NAME=$(basename "$APP_SOURCE")
    cp -R "$APP_SOURCE" "/Applications/"
    
    if [ "$ALLOW_UNSIGNED" = true ]; then
        echo "🛡️ Removing macOS quarantine from $APP_NAME..."
        xattr -rd com.apple.quarantine "/Applications/$APP_NAME" || echo "⚠️ Failed to remove quarantine (requires xattr/permissions)"
    fi
    
    echo "🛡️ Cleaning up..."
    hdiutil detach "$MOUNT_POINT"
    rm "$FILENAME"
    
    echo "✅ Success! Network Spy is now in your Applications folder."
    echo "💡 You can open it using: open -a '$APP_NAME'"

elif [ "$OS" = "linux" ]; then
    # Linux Installation (.deb)
    VERSION_NUM=${VERSION#v}
    FILENAME="Network.Spy_${VERSION_NUM}_${ARCH_NAME}.deb"
    DOWNLOAD_URL="https://github.com/$GITHUB_REPO/releases/download/${VERSION}/${FILENAME}"
    
    echo "🔍 Using asset: $FILENAME"
    
    echo "⬇️ Downloading $FILENAME..."
    if ! curl -L -O "$DOWNLOAD_URL"; then
        echo "❌ Download failed. URL: $DOWNLOAD_URL"
        exit 1
    fi
    
    echo "🔐 Installing via dpkg (requires sudo)..."
    sudo dpkg -i "$FILENAME" || sudo apt-get install -f -y
    
    echo "🛡️ Cleaning up..."
    rm "$FILENAME"
    
    echo "✅ Success! Network Spy is installed."
    echo "💡 You can launch it by searching for 'Network Spy' in your applications menu."
else
    echo "❌ This installer currently supports macOS and Linux (.deb) only."
    exit 1
fi

rm -rf "$TEMP_DIR"
