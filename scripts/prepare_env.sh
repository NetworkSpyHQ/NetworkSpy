#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# prepare_env.sh — Encrypt/decrypt .env using age
# Usage:
#   bash scripts/prepare_env.sh       (interactive — asks encrypt or decrypt)
#   make prepare_env_local           (same, via Makefile)
# ---------------------------------------------------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}ℹ${NC}  $1"; }
ok()    { echo -e "${GREEN}✓${NC}  $1"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $1"; }
err()   { echo -e "${RED}✗${NC}  $1"; }

# ---------------------------------------------------------------------------
# OS detection
# ---------------------------------------------------------------------------
detect_os() {
    case "$(uname -s)" in
        Darwin*)  echo "macos" ;;
        Linux*)   echo "linux" ;;
        MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
        *)        echo "unknown" ;;
    esac
}

# ---------------------------------------------------------------------------
# Install age (https://github.com/FiloSottile/age)
# ---------------------------------------------------------------------------
install_age() {
    if command -v age &>/dev/null; then
        ok "age $(age --version 2>/dev/null || echo '')is already installed"
        return 0
    fi

    warn "age not found — installing..."
    local os
    os=$(detect_os)

    case "$os" in
        macos)
            if command -v brew &>/dev/null; then
                brew install age
            else
                err "Homebrew not found. Install it first: https://brew.sh"
                err "Then run: brew install age"
                exit 1
            fi
            ;;
        linux)
            if command -v apt-get &>/dev/null; then
                sudo apt-get update -qq && sudo apt-get install -y -qq age
            elif command -v dnf &>/dev/null; then
                sudo dnf install -y age
            elif command -v pacman &>/dev/null; then
                sudo pacman -S --noconfirm age
            elif command -v brew &>/dev/null; then
                brew install age
            elif command -v apk &>/dev/null; then
                sudo apk add age
            else
                err "Cannot auto-install age on this Linux distribution."
                err "Install manually: https://github.com/FiloSottile/age/releases"
                exit 1
            fi
            ;;
        windows)
            if command -v scoop &>/dev/null; then
                scoop bucket add main 2>/dev/null || true
                scoop install age
            elif command -v choco &>/dev/null; then
                choco install age.portable -y
            elif command -v winget &>/dev/null; then
                winget install "FiloSottile.age"
            else
                err "Please install age manually on Windows:"
                info "  scoop install age        (recommended: https://scoop.sh)"
                info "  choco install age.portable"
                info "  winget install age"
                info "  Or download from: https://github.com/FiloSottile/age/releases"
                exit 1
            fi
            ;;
        *)
            err "Unknown OS. Install age manually: https://github.com/FiloSottile/age"
            exit 1
            ;;
    esac
    ok "age installed successfully"
}

# ---------------------------------------------------------------------------
# Encrypt .env → .env.enc
# ---------------------------------------------------------------------------
do_encrypt() {
    if [ ! -f .env ]; then
        err ".env file not found in current directory"
        info "Create it first (copy .env.example and fill in your values):"
        info "  cp .env.example .env"
        exit 1
    fi

    echo ""
    echo "┌─────────────────────────────────────────────┐"
    echo "│  Encrypt .env → .env.enc                    │"
    echo "│  You will be prompted for a passphrase.     │"
    echo "│  Store it safely — you'll need it to decrypt.│"
    echo "└─────────────────────────────────────────────┘"
    echo ""

    age -p -o .env.enc .env
    ok ".env encrypted → .env.enc"
}

# ---------------------------------------------------------------------------
# Decrypt .env.enc → .env
# ---------------------------------------------------------------------------
do_decrypt() {
    if [ ! -f .env.enc ]; then
        err ".env.enc not found"
        echo ""
        info "You need an existing .env.enc file to decrypt."
        info "If you have the original .env file, run this script again"
        info "and choose [1] Encrypt to create .env.enc."
        echo ""
        info "If this is a fresh checkout, ask a teammate for the"
        info ".env.enc file or the passphrase."
        exit 1
    fi

    echo ""
    echo "┌─────────────────────────────────────────────┐"
    echo "│  Decrypt .env.enc → .env                    │"
    echo "│  Enter the passphrase to decrypt.           │"
    echo "└─────────────────────────────────────────────┘"
    echo ""

    if age -d -o .env .env.enc 2>/dev/null; then
        ok ".env.enc decrypted → .env"
    else
        err "Decryption failed — wrong passphrase?"
        # Clean up partial .env if created
        rm -f .env
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    echo ""
    echo "  ╔═══════════════════════════════════════╗"
    echo "  ║         .env Encryption Tool          ║"
    echo "  ╚═══════════════════════════════════════╝"
    echo ""

    install_age
    echo ""

    echo "What would you like to do?"
    echo "  [1] Encrypt  — .env → .env.enc  (for sharing/secrets)"
    echo "  [2] Decrypt  — .env.enc → .env  (for local development)"
    echo ""
    read -r -p "Enter choice (1 or 2): " choice

    case "$choice" in
        1) do_encrypt ;;
        2) do_decrypt ;;
        *)
            err "Invalid choice — please enter 1 or 2"
            exit 1
            ;;
    esac
}

main "$@"
