#!/usr/bin/env bash

set -e

echo "🚀 Network Spy - Development Environment Setup"
echo "================================================"

OS=$(uname -s | tr '[:upper:]' '[:lower:]')
ARCH=$(uname -m)

add_cargo_to_shell() {
    local shell_name="$1"
    local cargo_bin="$HOME/.cargo/bin"
    
    case "$shell_name" in
        bash)
            local shellrc="$HOME/.bashrc"
            ;;
        zsh)
            local shellrc="$HOME/.zshrc"
            ;;
        fish)
            local shellrc="$HOME/.config/fish/config.fish"
            ;;
        *)
            return 1
            ;;
    esac
    
    if [ -f "$shellrc" ]; then
        if ! grep -q "$cargo_bin" "$shellrc" 2>/dev/null; then
            echo "" >> "$shellrc"
            echo "# Added by NetworkSpy setup-dev.sh" >> "$shellrc"
            echo "export PATH=\"$cargo_bin:\$PATH\"" >> "$shellrc"
            echo "✅ Added cargo to PATH in $shellrc"
        else
            echo "✅ Cargo already in PATH ($shellrc)"
        fi
    else
        echo "⚠️ $shellrc not found, skipping PATH setup for $shell_name"
    fi
}

detect_shell() {
    if [ -n "$ZSH_VERSION" ]; then
        echo "zsh"
    elif [ -n "$BASH_VERSION" ]; then
        echo "bash"
    elif [ -n "$FISH_VERSION" ]; then
        echo "fish"
    else
        echo "bash"
    fi
}

if [ "$OS" = "darwin" ]; then
    echo "🍎 Detected: macOS ($ARCH)"
    echo ""

    if ! command -v xcode-select &> /dev/null; then
        echo "❌ Xcode Command Line Tools not found."
        echo "💡 Run: xcode-select --install"
        exit 1
    fi

    if ! xcode-select -p &> /dev/null; then
        echo "⚠️ Xcode license not accepted. Accepting now..."
        sudo xcodebuild -license accept
    fi

    echo "📦 Installing Homebrew dependencies..."
    if command -v brew &> /dev/null; then
        brew install pkg-config openssl glib
    else
        echo "⚠️ Homebrew not found. Install from: https://brew.sh"
        echo "   Then run: brew install pkg-config openssl glib"
    fi

    echo "📦 Installing Bun..."
    if command -v bun &> /dev/null; then
        echo "✅ Bun already installed: $(bun --version)"
    else
        curl -fsSL https://bun.sh/install | bash
    fi

    echo "📦 Installing Rust..."
    if command -v rustc &> /dev/null; then
        echo "✅ Rust already installed: $(rustc --version)"
    else
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        SHELL_NAME=$(detect_shell)
        add_cargo_to_shell "$SHELL_NAME"
        export PATH="$HOME/.cargo/bin:$PATH"
    fi

    echo "📦 Installing Tauri CLI..."
    bun add -D @tauri-apps/cli

elif [ "$OS" = "linux" ]; then
    echo "🐧 Detected: Linux ($ARCH)"
    echo ""

    if command -v apt-get &> /dev/null; then
        echo "📦 Installing dependencies (Debian/Ubuntu)..."
        sudo apt-get update
        sudo apt-get install -y pkg-config libssl-dev libglib2.0-dev libgtk-3-dev libsoup-3.0-dev libwebkit2gtk-4.1-dev libayatana-appindicator3-dev
    elif command -v dnf &> /dev/null; then
        echo "📦 Installing dependencies (Fedora/RHEL)..."
        sudo dnf install -y pkgconf-pkg-config openssl-devel glib2-devel gtk3-devel libsoup3-devel javascriptcoregtk4.1-devel
    elif command -v pacman &> /dev/null; then
        echo "📦 Installing dependencies (Arch/Manjaro)..."
        sudo pacman -S --noconfirm pkgconf openssl glib2 gtk3 libsoup javascriptcoregtk-4.1
    elif command -v apk &> /dev/null; then
        echo "📦 Installing dependencies (Alpine)..."
        sudo apk add --no-cache pkgconfig openssl-dev glib-dev gtk3-dev libsoup3-dev webkit2gtk-4.1-dev
    else
        echo "❌ Unsupported package manager. Please install manually:"
        echo "   - pkg-config"
        echo "   - OpenSSL dev libraries"
        echo "   - GLib dev libraries"
        echo "   - GTK 3 dev libraries"
        echo "   - libsoup dev libraries"
        echo "   - JavaScriptCoreGTK dev libraries"
        exit 1
    fi

    echo "📦 Installing Bun..."
    if command -v bun &> /dev/null; then
        echo "✅ Bun already installed: $(bun --version)"
    else
        curl -fsSL https://bun.sh/install | bash
    fi

    echo "📦 Installing Rust..."
    if command -v rustc &> /dev/null; then
        echo "✅ Rust already installed: $(rustc --version)"
    else
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        SHELL_NAME=$(detect_shell)
        add_cargo_to_shell "$SHELL_NAME"
        export PATH="$HOME/.cargo/bin:$PATH"
    fi

    echo "📦 Installing Tauri CLI..."
    bun add -D @tauri-apps/cli

else
    echo "❌ Unsupported OS: $OS"
    echo "💡 For Windows, use setup-dev.ps1"
    exit 1
fi

echo ""
echo "================================================"
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Clone the repo:"
echo "       git clone https://github.com/NetworkSpyHQ/NetworkSpy.git"
echo "       cd NetworkSpy"
echo "  2. Install project dependencies:"
echo "       bun install"
echo "  3. Run in development mode:"
echo "       bun run tauri dev"
echo ""
