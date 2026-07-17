# NetworkSpy — macOS Privileged Helper Implementation Plan

## Architecture

```
NetworkSpy.app
├── Frontend (React)         → invoke("turn_on_proxy") / invoke("turn_off_proxy")
├── Rust Backend (Tauri v2)  → proxy_toggle.rs orchestrates:
│   ├── 1. Try XPC helper (proxy_helper.rs → C bridge → libxpc)
│   └── 2. Fallback → networksetup CLI
└── Contents/Library/LaunchServices/
    └── NetworkSpyProxyHelper  (embedded, installed via SMJobBless)

System (post-install):
├── /Library/LaunchDaemons/com.muiz.idn.tauri.dev.proxy-helper.plist
├── /Library/PrivilegedHelperTools/NetworkSpyProxyHelper
└── XPC Mach Service: com.muiz.idn.tauri.dev.proxy-helper
    └── Helper runs as root, uses SystemConfiguration API
```

## New Files

| File | Description |
|------|-------------|
| `src-tauri/proxy-helper/Sources/main.swift` | XPC listener + SCPreferences proxy config |
| `src-tauri/proxy-helper/Info.plist` | Helper metadata + `SMAuthorizedClients` |
| `src-tauri/proxy-helper/entitlements.plist` | Helper hardened runtime entitlements |
| `src-tauri/proxy-helper/launchd.plist` | Template for SMJobBless |
| `src-tauri/XPCService/xpc_client.c` | C bridge to XPC Mach service |
| `src-tauri/XPCService/xpc_client.h` | C bridge header |
| `src-tauri/src/proxy_helper.rs` | Rust FFI wrapper + SMJobBless call |
| `src-tauri/entitlements.plist` | Main app hardened runtime entitlements |
| `scripts/build-helper.sh` | Build + sign the Swift helper |

## Modified Files

| File | Change |
|------|--------|
| `src-tauri/src/proxy_toggle.rs` | Try helper first, fallback to networksetup |
| `src-tauri/src/commands/proxy.rs` | Add `is_helper_installed`, `install_proxy_helper` commands |
| `src-tauri/src/commands/mod.rs` | Add `PROXY_HELPER` OnceCell |
| `src-tauri/src/handler.rs` | Register new Tauri commands |
| `src-tauri/build.rs` | Compile `xpc_client.c` via `cc` crate |
| `src-tauri/Cargo.toml` | Add `cc` to build-dependencies |

## Security

- XPC caller validated via `auditToken` + `SecCodeCheckValidity` (bundle ID + team cert)
- Only 3 commands accepted: `enable_proxy`, `disable_proxy`, `get_status`
- No arbitrary shell execution in helper
- Helper writes only to `/NetworkServices/*/Proxies` keys in SCPreferences
- `os_log` with format-string markers, no raw credential logging

## Build & Distribution

1. `scripts/build-helper.sh` — compiles Swift helper, signs with Developer ID
2. `cargo tauri build` — embeds helper at `Contents/Library/LaunchServices/`
3. Sign main app with hardened runtime + same Team ID
4. `xcrun notarytool submit` + `stapler staple` for notarization

Requires Apple Developer Program membership for Developer ID certificate.
