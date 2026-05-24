<p align="center">
  <img src="public/network-spy-logo.png" alt="Network Spy logo" width="132" />
</p>

<h1 align="center">Network Spy</h1>

<p align="center"><strong>Premium HTTP/HTTPS Traffic Debugger & Analyzer</strong></p>

<p align="center">
  Local-first high-performance proxy for desktop interception, SSL decryption, and specialized AI/GraphQL viewers.
</p>

<p align="center">
  🌐 <strong>Official Website</strong>: <a href="https://networkspy.app" style="text-decoration: none;">networkspy.app</a> — <strong>Get your PRO license here!</strong>
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: APACHE" src="https://img.shields.io/badge/license-Apache-blue.svg"></a>
  <a href="https://github.com/muizidn/NetworkSpy/actions"><img alt="CI" src="https://img.shields.io/github/actions/workflow/status/muizidn/NetworkSpy/release.yml?branch=main&label=CI&logo=github"></a>
  <img alt="Status: Beta" src="https://img.shields.io/badge/status-beta-blue.svg">
  <img alt="Rust" src="https://img.shields.io/badge/rust-1.75%2B-orange?logo=rust&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/typescript-5.x-blue?logo=typescript&logoColor=white">
  <img alt="Tauri" src="https://img.shields.io/badge/tauri-2.x-24C8D8?logo=tauri&logoColor=white">
  <img alt="Local first" src="https://img.shields.io/badge/local--first-yes-brightgreen.svg">
  <img alt="Platform" src="https://img.shields.io/badge/platform-Linux%20%C2%B7%20macOS%20%C2%B7%20Windows-6f42c1?logo=desktop&logoColor=white">
  <a href="https://github.com/muizidn/NetworkSpy/discussions"><img alt="Discussions" src="https://img.shields.io/github/discussions/muizidn/NetworkSpy?logo=github&label=discussions"></a>
  <a href="https://github.com/muizidn/NetworkSpy/issues"><img alt="Issues" src="https://img.shields.io/github/issues/muizidn/NetworkSpy?logo=github"></a>
  <a href="https://github.com/muizidn/NetworkSpy/pulls"><img alt="PRs" src="https://img.shields.io/github/issues-pr/muizidn/NetworkSpy?logo=github&label=PRs"></a>
</p>

<p align="center">
  <img src="./github/readme/banner.png" width="100%" alt="Network Spy Dashboard" />
</p>

---

⭐ **Star us on GitHub** — your support motivates us to build more "Superpowers" for your dev workflow! 🙏😊

---

## 📖 Table of Contents
- [🚀 About](#-about)
- [⚙️ How it Works](#%EF%B8%8F-how-it-works)
- [✨ Key Features](#-key-features)
- [⚡ Quick Install](#-quick-install)
- [🛡️ Trust & Security](#-trust--security)
- [🛠️ Development Setup](#-development-setup)

---

<p align center>
  <img src="./github/readme/traffic-summary.png" width="100%" alt="Traffic Summary Dashboard" />
</p>

## 🚀 About
**Network Spy** is a cross-platform Network Proxy and Traffic Analyzer built with **Tauri**, **Rust**, and **React**. It intercepts, decrypts, and analyzes your application's network traffic with a stunning, high-performance interface. 

Our goal is to move beyond simple "packet capturing" and provide a tool that truly understands the data being sent across the wire.

---

## ⚙️ How it Works

Network Spy operates as a **Man-in-the-Middle (MITM)** proxy. It sits between your application and the internet, intercepting traffic to provide deep visibility.

1. **Proxy Interception**: The app starts a high-performance Rust-based proxy server on your local machine.
2. **HTTPS Decryption**: By installing the optional **Network Spy Root CA**, the app can securely decrypt HTTPS traffic using industry-standard certificate pinning bypass techniques.
3. **Capture & Analyze**: Traffic is captured in real-time and passed through our specialized **Superpower Viewers** for automated decoding of GraphQL, LLM streams, Protobuf, and more.
4. **Local Forever**: All data is analyzed and stored locally in a high-speed SQLite database. No traffic ever leaves your machine.


![Architecture DataFlow](./public/github/architecture-data-flow-simple.png)

<p align center>
  <img src="./github/readme/how-it-works.png" width="100%" alt="How it Works Diagram" />
</p>

---

## ✨ Key Features
Network Spy is designed around a core philosophy: **Viewers are a Superpower.** 

- **🚀 High Performance**: Rust-powered proxy engine for zero-latency traffic interception.
- **🎨 Premium UI**: A modern, dark-themed interface built for modern developers.
- **🧬 GraphQL Inspector**: Deeply parses queries, variables, and extensions with batched operation support.
- **🧠 LLM Token Analyzer**: The first specialized tool for AI/ML developers to track token costs and stream latency.
- **🏷️ Intelligent Tagging**: Automatically categorize and search through thousands of requests.
- **📦 Custom Viewer Engine**: Build your own visualizers with a drag-and-drop block builder.
  
  
> **Deep Dive**: Learn how to maximize the Custom Viewer Engine for your workflow, including AI-powered generation (Pro Feature), in the [Custom Viewer Guide](./CUSTOM_VIEWER.md).

👉 [**Explore all features in detail here**](./FEATURES.md)

<p align center>
  <img src="./github/readme/llm-token-analyzer.png" width="100%" alt="LLM Token Analyzer" />
</p>

---

## ⚡ Quick Install

The fastest way to install or update Network Spy is via the terminal (Stable Releases):

###  macOS / 🐧 Linux
```bash
curl -fsSL https://raw.githubusercontent.com/muizidn/NetworkSpy/main/install.sh | sh
```

> [!NOTE]
> **Linux Packages**: To save CI build quota, official releases only include `.deb` packages for Linux. If you need `.rpm` or `AppImage`, you can clone this repository and run the **Release Build Linux** workflow manually in GitHub Actions.

### 🪟 Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/muizidn/NetworkSpy/main/install.ps1 | iex
```

### 🧪 Bleeding Edge (Develop Builds)
If you want the latest features from the `develop` branch before they are officially released:

#### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/muizidn/NetworkSpy/develop/install-dev.sh | sh
```

#### Windows (PowerShell)
```powershell
iwr -useb https://raw.githubusercontent.com/muizidn/NetworkSpy/develop/install-dev.ps1 | iex
```

---

## 🛡️ Trust & Security
- **One-Click CA Setup**: Automated root certificate installation for HTTPS interception.
- **Local Analysis**: All decryption happens on your machine. No traffic ever leaves your device.
- **High Performance**: Rust-powered proxy engine ensures zero-latency interception.

> **Deep Dive**: Learn more about our local-first security model, SSL decryption, and telemetry in the [Security Guide](./SECURITY.md).


---

## 🛠️ Development Setup

1. **Clone**: `git clone https://github.com/muizidn/NetworkSpy.git`
2. **Install**: `bun install`
3. **Run Dev**: `bun run tauri dev`
4. **Build**: `bun run tauri build`

---

[Back to top](#-network-spy)
