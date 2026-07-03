#!/bin/bash

# Network Spy - Development Terminal Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/NetworkSpyHQ/NetworkSpy/develop/install-dev.sh | sh

set -e

GITHUB_REPO="NetworkSpyHQ/NetworkSpy"
SCRIPT_BRANCH="develop"

# Fetch latest commit ID for transparency (silently)
COMMIT_ID=$(curl -s -H "Cache-Control: no-cache" "https://api.github.com/repos/$GITHUB_REPO/commits/$SCRIPT_BRANCH" | grep '"sha":' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/' | cut -c1-7)
COMMIT_ID=${COMMIT_ID:-"unknown"}

REPO_URL="https://github.com/$GITHUB_REPO"
API_URL="https://api.github.com/repos/$GITHUB_REPO/releases"

# Configuration
VERSION=""
ALLOW_UNSIGNED=false

# 0. Argument Parsing
for arg in "$@"; do
    if [ "$arg" = "--allow-unsigned" ]; then
        ALLOW_UNSIGNED=true
    elif [ -z "$VERSION" ]; then
        VERSION=$arg
    fi
done

TEMP_DIR=$(mktemp -d)

echo "🚀 Starting Network Spy DEV Installation..."
echo "📂 Script Source: github.com/$GITHUB_REPO ($SCRIPT_BRANCH#$COMMIT_ID)"

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

# 2. Version Detection (Latest including pre-releases/dev builds)
if [ -z "$VERSION" ] || [ "$VERSION" = "latest" ]; then
    echo "🔍 Fetching latest development version info..."
    # We take the first release from the list, which includes pre-releases
    VERSION=$(curl -s $API_URL | grep '"tag_name":' | head -n 1 | sed -E 's/.*"([^"]+)".*/\1/')
fi

if [ -z "$VERSION" ]; then
    echo "❌ FATAL: Could not determine version to install."
    exit 1
fi

echo "📦 Target DEV Version: $VERSION"
echo "💻 Platform: $OS ($ARCH)"
if [ "$ALLOW_UNSIGNED" = true ]; then
    echo "🛡️  Bypass Mode: Enabled"
fi

# 3. Download and Install
cd "$TEMP_DIR"

if [ "$OS" = "darwin" ]; then
    echo "🔍 Discovering macOS assets..."
    
    # Fetch specific release data to get a cleaner asset list
    RELEASE_DATA=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/tags/$VERSION")
    
    # Discover the .dmg asset dynamically based on extension and architecture
    ASSET_DATA=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep ".dmg" | grep "$ARCH_NAME_MAC" | head -n 1) || true
    
    if [ -z "$ASSET_DATA" ]; then
        # Fallback for universal or differently named builds
        ASSET_DATA=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep ".dmg" | head -n 1)
    fi

    DOWNLOAD_URL=$(echo "$ASSET_DATA" | sed -E 's/.*"([^"]+)".*/\1/')
    FILENAME=$(basename "$DOWNLOAD_URL")

    if [ -z "$DOWNLOAD_URL" ]; then
        echo "❌ Could not find a suitable .dmg asset in release $VERSION."
        exit 1
    fi

    echo "⬇️ Downloading $FILENAME..."
    curl -L -O "$DOWNLOAD_URL"
    
    echo "💿 Mounting DMG..."
    MOUNT_POINT=$(hdiutil attach "$FILENAME" -nobrowse -plist | grep -A 1 "mount-point" | grep string | sed 's/.*<string>\(.*\)<\/string>.*/\1/')
    
    if [ -z "$MOUNT_POINT" ]; then
        echo "❌ Failed to mount $FILENAME"
        exit 1
    fi
    
    echo "📁 Installing to /Applications..."
    APP_SOURCE=$(ls -d "$MOUNT_POINT"/*.app | head -n 1)
    APP_NAME=$(basename "$APP_SOURCE")
    
    # Remove existing app to ensure clean update
    if [ -d "/Applications/$APP_NAME" ]; then
        echo "♻️  Replacing existing /Applications/$APP_NAME..."
        rm -rf "/Applications/$APP_NAME"
    fi
    
    cp -R "$APP_SOURCE" "/Applications/"
    
    if [ "$ALLOW_UNSIGNED" = true ]; then
        echo "🛡️ Removing quarantine..."
        xattr -rd com.apple.quarantine "/Applications/$APP_NAME" || true
    fi
    
    echo "🛡️ Cleaning up..."
    hdiutil detach "$MOUNT_POINT"
    rm "$FILENAME"
    
    echo "✅ Success! Network Spy DEV is ready."
    echo "💡 Open with: open -a '$APP_NAME'"

elif [ "$OS" = "linux" ]; then
    echo "🔍 Discovering Linux assets..."
    
    RELEASE_DATA=$(curl -s "https://api.github.com/repos/$GITHUB_REPO/releases/tags/$VERSION")
    ASSET_DATA=$(echo "$RELEASE_DATA" | grep "browser_download_url" | grep ".deb" | grep "$ARCH_NAME" | head -n 1) || true
    DOWNLOAD_URL=$(echo "$ASSET_DATA" | sed -E 's/.*"([^"]+)".*/\1/')
    FILENAME=$(basename "$DOWNLOAD_URL")

    if [ -z "$DOWNLOAD_URL" ]; then
        echo "❌ Could not find a suitable .deb asset."
        exit 1
    fi
    
    echo "⬇️ Downloading $FILENAME..."
    curl -L -O "$DOWNLOAD_URL"
    sudo dpkg -i "$FILENAME" || sudo apt-get install -f -y
    rm "$FILENAME"
    echo "✅ Success! Network Spy DEV is installed."
else
    echo "❌ Unsupported OS: $OS"
    exit 1
fi

rm -rf "$TEMP_DIR"
