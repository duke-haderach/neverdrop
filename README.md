# NeverDrop

> Multi-LLM desktop chat — your conversations never drop when a provider's quota runs out.

[![Latest Release](https://img.shields.io/github/v/release/duke-haderach/neverdrop)](https://github.com/duke-haderach/neverdrop/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Windows](https://img.shields.io/badge/Windows-0078D6?logo=windows&logoColor=white)](https://github.com/duke-haderach/neverdrop/releases/latest)
[![macOS](https://img.shields.io/badge/macOS-000000?logo=apple&logoColor=white)](https://github.com/duke-haderach/neverdrop/releases/latest)
[![Linux](https://img.shields.io/badge/Linux-FCC624?logo=linux&logoColor=black)](https://github.com/duke-haderach/neverdrop/releases/latest)

---

## ⬇️ Download

**No Node.js or npm required — just download and run.**

| Platform | Download |
|----------|----------|
| 🪟 Windows | [NeverDrop-Setup-x64.exe](https://github.com/duke-haderach/neverdrop/releases/latest) |
| 🍎 macOS | [NeverDrop.dmg](https://github.com/duke-haderach/neverdrop/releases/latest) |
| 🐧 Linux | [NeverDrop.AppImage](https://github.com/duke-haderach/neverdrop/releases/latest) |

---

## What is NeverDrop?

Configure multiple LLM providers once. Chat normally. When one hits its quota or runs out of credits, NeverDrop detects it instantly and lets you **port your entire conversation** to another provider — the new model picks up exactly where the last one left off, with full context.

No more losing a conversation mid-way because your free tier ran out.

---

## ✨ Features

- **⇄ Seamless context porting** — switch providers mid-conversation without losing context. Choose from AI-generated summary, full history verbatim, or both
- **🔑 Keys stay on your machine** — API keys are stored in your OS keychain (Windows Credential Manager / macOS Keychain / libsecret on Linux), never in plain text
- **🆓 Free tier friendly** — works with providers that have genuinely free APIs (no credit card required)
- **💳 Paid + free hybrid** — use ChatGPT or Gemini as your primary, automatically fall back to free providers when quota hits
- **🖥️ Local models** — Ollama and LM Studio work out of the box, fully offline
- **📋 Conversation history** — all chats stored locally in SQLite, nothing sent to any server except your chosen LLM
- **🌐 Universal adapter** — supports any OpenAI-compatible API endpoint, plus native Anthropic and Gemini SDKs

---

## 🆓 Free providers to get started

These require no credit card — just sign up and get an API key:

| Provider | Sign up | Recommended model | Quality |
|----------|---------|-------------------|---------|
| **Groq** | [console.groq.com](https://console.groq.com) | `llama-3.3-70b-versatile` | ⭐⭐⭐⭐⭐ |
| **Mistral** | [console.mistral.ai](https://console.mistral.ai) | `mistral-small-latest` | ⭐⭐⭐⭐ |
| **Cohere** | [dashboard.cohere.com](https://dashboard.cohere.com) | `command-r-plus-08-2024` | ⭐⭐⭐⭐ |
| **Cerebras** | [cloud.cerebras.ai](https://cloud.cerebras.ai) | `llama-3.3-70b` | ⭐⭐⭐⭐ |
| **DeepSeek** | [platform.deepseek.com](https://platform.deepseek.com) | `deepseek-chat` | ⭐⭐⭐⭐ |

Groq's Llama 3.3 70B is comparable to GPT-4o-mini for most tasks and has a generous free tier.

---

## 💳 Paid providers

| Provider | Sign up | Notes |
|----------|---------|-------|
| OpenAI (ChatGPT) | [platform.openai.com](https://platform.openai.com) | Requires billing credits |
| Google Gemini | [aistudio.google.com](https://aistudio.google.com) | Free tier region-restricted |
| Anthropic (Claude) | [console.anthropic.com](https://console.anthropic.com) | Requires billing credits |
| xAI (Grok) | [console.x.ai](https://console.x.ai) | Requires billing credits |

---

## 🖥️ Local models (no API key, no internet)

| App | Download | Notes |
|-----|----------|-------|
| Ollama | [ollama.com](https://ollama.com) | Base URL: `http://localhost:11434/v1` |
| LM Studio | [lmstudio.ai](https://lmstudio.ai) | Base URL: `http://localhost:1234/v1` |

---

## How context porting works

When a provider's quota is exhausted (or you manually switch), NeverDrop offers three strategies:

| Strategy | How it works | Best for |
|----------|-------------|----------|
| **Summary + Recent** *(recommended)* | AI generates a concise summary of the conversation, plus the last 20 messages verbatim | Most conversations |
| **Summary only** | Compact AI-generated summary injected as context | Long conversations |
| **Full history** | Every message injected verbatim | Short, precise technical conversations |

The new provider receives this context silently as a system prompt and continues naturally — it won't announce that a switch happened unless you ask.

---

## Build from source

Requires [Node.js 20 LTS](https://nodejs.org/en/download).

```bash
git clone https://github.com/duke-haderach/neverdrop
cd neverdrop
npm install
npx electron-rebuild -f -w better-sqlite3
npm start
```

To build installers locally:

```bash
npm run dist:win    # Windows — NSIS installer + portable .exe
npm run dist:mac    # macOS — .dmg
npm run dist:linux  # Linux — .AppImage + .deb
```

---

## Architecture

| Layer | Technology |
|-------|------------|
| Desktop shell | Electron 29 |
| UI | React 18 + Vite |
| Local storage | better-sqlite3 (WAL mode) |
| Key storage | keytar (OS keychain) |
| LLM adapters | OpenAI SDK, Anthropic SDK, Google Generative AI SDK |

---

## License

MIT — free to use, modify and distribute.
