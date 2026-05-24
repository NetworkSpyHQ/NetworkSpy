# Native Menu Architecture

## Overview

NetworkSpy has a **dual menu system** that adapts to the platform:

| Platform  | Menu Rendering              | Implementation                        |
|-----------|-----------------------------|---------------------------------------|
| macOS     | Native system menu bar      | Rust (`menu.rs` + `app.set_menu()`)   |
| Linux     | Custom in-window dropdowns  | React (`TitleBarMenu.tsx`)            |
| Windows   | Custom in-window dropdowns  | React (`TitleBarMenu.tsx`)            |

On **Linux and Windows**, native window menus are intentionally **not set** — the app uses a custom React-based title bar with inline dropdown menus instead.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Custom Title Bar (React) — Linux/Windows only      │
│  ┌──────────────────────────────────────────────┐   │
│  │  TitleBarCustomMenuTool.tsx                   │   │
│  │    └─> WinAppMenu (TitleBarMenu.tsx)          │   │
│  │         ├─ File  → invoke('trigger_menu_action') │
│  │         ├─ Edit  → invoke('trigger_menu_action') │
│  │         ├─ View  → invoke('trigger_menu_action') │
│  │         ├─ Traffic → invoke('trigger_menu_action')│
│  │         ├─ Tools → invoke('trigger_menu_action') │
│  │         └─ Help  → invoke('trigger_menu_action') │
│  │  TitleBarPlatformControls.tsx                  │   │
│  │    ├─ Minimize, Maximize, Close               │   │
│  └──────────────────────────────────────────────┘   │
│                      │                               │
│              invoke('trigger_menu_action')            │
│                      ▼                               │
│  commands.rs::trigger_menu_action()                  │
│    ├─ open_new_window_internal() for sub-windows     │
│    ├─ emit() events for toggle_capture, etc.         │
│    └─ Direct action handling                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Native Menu Bar (Rust) — macOS only                │
│  ┌──────────────────────────────────────────────┐   │
│  │  menu.rs                                      │   │
│  │    ├─ create_file_submenu()                   │   │
│  │    ├─ create_edit_submenu()                   │   │
│  │    ├─ create_view_submenu()                   │   │
│  │    ├─ create_traffic_submenu()                │   │
│  │    ├─ create_tools_submenu()                  │   │
│  │    └─ create_help_submenu()                   │   │
│  │                                                │   │
│  │  main.rs (setup, macOS-only)                  │   │
│  │    └─ app.set_menu(global_mac_menu)           │   │
│  └──────────────────────────────────────────────┘   │
│                      │                               │
│              on_menu_event handler                    │
│                      ▼                               │
│  Same action dispatch as trigger_menu_action         │
└─────────────────────────────────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src-tauri/src/menu.rs` | Defines all submenu builders (shared between macOS native menu and tray) |
| `src-tauri/src/main.rs:157-176` | macOS-only: sets global native menu via `app.set_menu()` |
| `src-tauri/src/main.rs:383-481` | Global `on_menu_event` handler — works for both macOS native menu and tray menu |
| `src-tauri/src/commands.rs:339-394` | `trigger_menu_action()` — called from React custom menu via IPC |
| `src/packages/ui/TitleBarMenu.tsx` | React custom dropdown menus (File, Edit, View, Traffic, Tools, Help) |
| `src/packages/ui/TitleBarCustomMenuTool.tsx` | Hamburger menu that toggles the custom menu bar |
| `src/packages/ui/TitleBarPlatformControls.tsx` | Minimize/Maximize/Close buttons for non-macOS |
| `src/packages/main-content/TrafficList.tsx` | Native context menus (right-click) via `@tauri-apps/api/menu` |

---

## Dual Dispatch

Actions can be triggered through two paths:

1. **macOS native menu** → `on_menu_event` in `main.rs`
2. **React custom menu** (Linux/Windows) → `invoke('trigger_menu_action')` → `commands.rs`

Both paths ultimately execute the same underlying logic (open windows, emit events, toggle proxy, etc.).

The `on_menu_event` handler in `main.rs` also handles **tray menu** events on all platforms.

---

## Why No Native Menu on Linux/Windows?

- The custom title bar (hidden decorations via `set_decorations(false)`) provides a unified look across platforms
- The React-based menu integrates with the custom title bar design
- Native window menus on Linux render inconsistently across desktop environments (GNOME, KDE, etc.)
- On macOS, the native menu bar is expected by users and integrates with the system
