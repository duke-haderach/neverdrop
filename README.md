# NeverDrop MCP

> Multi-LLM desktop chat with provider failover, local SQLite history, OS-keychain key storage, and a full MCP (Model Context Protocol) host client.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-29-blue)](https://electronjs.org)
[![React](https://img.shields.io/badge/React-18-61dafb)](https://reactjs.org)

---

## Features

- **Provider-agnostic** — OpenAI, Anthropic, Gemini, Groq, DeepSeek, Mistral, Cohere, Cerebras, xAI, Ollama, LM Studio, any OpenAI-compatible endpoint
- **Never lose context** — one-click conversation porting across providers when quota runs out
- **MCP host** — connect any MCP server (stdio transport); ships with first-class support for `agent-history-mcp` for long-term memory across sessions
- **Local-first** — all conversations in SQLite (WAL mode), API keys in OS keychain
- **Streaming** — token-by-token streaming for all providers
- **Rolling summary** — pre-computed conversation summaries so context porting never blocks on a failing provider

---

## Quick start

```bash
git clone https://github.com/duke-haderach/neverdrop
cd neverdrop
npm install
npm run dev
```

## Build installers

```bash
npm run dist:win    # Windows NSIS installer + portable
npm run dist:mac    # macOS .dmg (x64 + arm64)
npm run dist:linux  # AppImage + .deb
```

---

## MCP Memory (agent-history-mcp)

Install once:

```bash
pip install git+https://github.com/monishkumarvr/agent-history-mcp.git
```

In the app: **MCP tab → Add → select "agent-history-mcp (pip)" preset → Connect → Activate**.

Every message you type is debounce-searched against your past Claude Code and Codex CLI sessions. Relevant context is injected silently into the system prompt before the LLM call. The context block is shown in the UI before you send so you can dismiss it per-message.

---

## Context porting

When your active provider's quota runs out, click **⇄ Port context** to continue on any other configured provider.

Strategies:
- **Summary + Recent 20** (recommended)
- **Summary only** — minimal tokens
- **Full verbatim** — entire history

---

## Architecture

| Layer | Tech |
|---|---|
| Desktop shell | Electron 29 |
| UI | React 18 + Vite 5 |
| Local storage | better-sqlite3 (WAL) |
| Key storage | keytar (OS keychain) |
| LLM adapters | openai SDK · @anthropic-ai/sdk · @google/generative-ai |
| MCP protocol | JSON-RPC 2.0 over stdio (spec 2024-11-05) |

---

## Project structure

```
neverdrop/
├── electron/
│   ├── main.js
│   ├── preload.js
│   ├── db/schema.js
│   ├── ipc/chat.js
│   ├── ipc/conversations.js
│   ├── ipc/mcp.js
│   ├── ipc/providers.js
│   ├── mcp/host.js
│   └── providers/index.js
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── styles/globals.css
    ├── lib/markdown.js
    ├── hooks/useChat.js
    ├── hooks/useConversations.js
    ├── hooks/useMcp.js
    └── components/
        ├── chat/ChatView.jsx
        ├── chat/ChatInput.jsx
        ├── chat/MessageBubble.jsx
        ├── mcp/McpPanel.jsx
        ├── settings/ProviderPanel.jsx
        └── sidebar/Sidebar.jsx
```

---

## License

MIT
