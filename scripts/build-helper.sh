#!/bin/bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HELPER_SRC="$PROJECT_ROOT/src-tauri/proxy-helper/Sources/main.swift"
HELPER_DIR="$PROJECT_ROOT/src-tauri/proxy-helper/build"
HELPER_BIN="$HELPER_DIR/NetworkSpyProxyHelper"
ENTITLEMENTS="$PROJECT_ROOT/src-tauri/proxy-helper/entitlements.plist"

mkdir -p "$HELPER_DIR"

echo "Building NetworkSpyProxyHelper..."

xcrun swiftc \
    "$HELPER_SRC" \
    -o "$HELPER_BIN" \
    -framework SystemConfiguration \
    -framework Foundation \
    -Os \
    -target x86_64-apple-macos12.0

if [[ $(uname -m) == "arm64" ]]; then
    xcrun swiftc \
        "$HELPER_SRC" \
        -o "${HELPER_BIN}_arm64" \
        -framework SystemConfiguration \
        -framework Foundation \
        -Os \
        -target arm64-apple-macos12.0

    xcrun lipo -create \
        "$HELPER_BIN" \
        "${HELPER_BIN}_arm64" \
        -output "$HELPER_BIN"

    rm -f "${HELPER_BIN}_arm64"
fi

echo "Signing helper..."
codesign --force --options runtime \
    --entitlements "$ENTITLEMENTS" \
    --sign "Developer ID Application: Your Name (TEAMID)" \
    "$HELPER_BIN"

echo "Helper built at $HELPER_BIN"
