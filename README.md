# ⚡ MCP Control Panel

> **A modern, interactive Web Dashboard and Manager for Model Context Protocol (MCP) servers.**
> Toggle, inspect, and 1-click update MCP servers across **Claude Desktop**, **Cursor**, **Antigravity IDE**, and **Gemini**.

![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![MCP Compatible](https://img.shields.io/badge/MCP-Standard-blue.svg)

---

## ✨ Features

- 🔄 **1-Click MCP Server Toggle:** Instantly enable or disable any MCP server without manually editing JSON configs.
- ⚡ **Smart SemVer Updates:** Automatically checks PyPI and NPM registries. The **"Update"** button appears **only when an actual update is available**.
- 🌐 **Instant Package Info & Links:** Direct links to GitHub repositories, npm packages, or PyPI pages for every tool.
- 🔍 **Live Search & Filter:** Instantly filter servers by name, command, or tags.
- 📂 **Multi-Client Support:** Automatically detects configs for:
  - **Antigravity IDE / Gemini** (`~/.gemini/antigravity-ide/mcp_config.json`)
  - **Claude Desktop** (`claude_desktop_config.json`)
  - **Cursor** (`~/.cursor/mcp.json`)
  - **VS Code / Roo-Cline** (`~/.vscode/mcp.json`)
- 🎨 **Sleek Dark UI:** Glassmorphism dashboard with real-time reactive state.

---

## 🚀 Quick Start

Run instantly without installation:

```bash
npx mcp-control-panel
```

Or install globally:

```bash
npm install -g mcp-control-panel
mcp-panel
```

This will launch the dashboard and automatically open your default browser at `http://localhost:7890`.

---

## 🛠️ CLI Options

```bash
mcp-panel [options]

Options:
  -p, --port <number>  Port to run the dashboard on (default: 7890)
  --no-open            Do not automatically open browser on start
  -h, --help           Display help information
```

---

## 📋 How Update Detection Works

1. **PyPI Packages (Python / uv):** Inspects local installed version (`importlib.metadata` / `pip show`) and compares with the latest release from `pypi.org`.
2. **NPM Packages:** Identifies pinned semver or `@latest`. If pinned to an older version, prompts for 1-click upgrade.
3. **No False Positives:** If your tool is up to date, the interface stays clean with zero clutter.

---

## 📄 License

MIT License © 2026 [cartmanlayneckurfxjo-creator](https://github.com/cartmanlayneckurfxjo-creator)
