# NeverDrop

> Multi-LLM desktop chat — your conversations never drop when a provider's quota runs out.

[![Latest Release](https://img.shields.io/github/v/release/YOUR_USERNAME/neverdrop)](https://github.com/YOUR_USERNAME/neverdrop/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Download

**No Node.js or npm required — just download and run.**

| Platform | Download |
|----------|----------|
| Windows | [NeverDrop-Setup-x64.exe](https://github.com/YOUR_USERNAME/neverdrop/releases/latest) |
| macOS | [NeverDrop.dmg](https://github.com/YOUR_USERNAME/neverdrop/releases/latest) |
| Linux | [NeverDrop.AppImage](https://github.com/YOUR_USERNAME/neverdrop/releases/latest) |

---

## What it does

Configure multiple LLM providers (OpenAI, Gemini, Groq, Mistral, DeepSeek, Cohere, Ollama…). When one hits its quota limit, NeverDrop seamlessly ports your full conversation context to the next provider — the new model picks up exactly where the last one left off.

- 🔑 **API keys never leave your machine** — stored in your OS keychain (Windows Credential Manager / macOS Keychain)
- ⇄ **Smart context porting** — AI-generated summary, full history, or both
- 🆓 **Works with free tiers** — Groq, Mistral, Cohere, Cerebras all have free API tiers
- 💳 **Paid providers as primary** — use ChatGPT or Gemini when you have credits, fall back to free when quota hits
- 🖥 **Local models** — Ollama and LM Studio supported out of the box

---

## Free providers to get started

| Provider | Sign up | Model |
|----------|---------|-------|
| Groq | [console.groq.com](https://console.groq.com) | `llama-3.3-70b-versatile` |
| Mistral | [console.mistral.ai](https://console.mistral.ai) | `mistral-small-latest` |
| Cohere | [dashboard.cohere.com](https://dashboard.cohere.com) | `command-r-plus-08-2024` |
| Cerebras | [cloud.cerebras.ai](https://cloud.cerebras.ai) | `llama-3.3-70b` |
| DeepSeek | [platform.deepseek.com](https://platform.deepseek.com) | `deepseek-chat` |

---

## Build from source

```bash
# Requires Node.js 20 LTS
git clone https://github.com/YOUR_USERNAME/neverdrop
cd neverdrop
npm install
npx electron-rebuild -f -w better-sqlite3
npm start
```

To build an installer:
```bash
npm run dist:win    # Windows NSIS installer + portable exe
npm run dist:mac    # macOS DMG
npm run dist:linux  # AppImage + deb
```

---

## Releasing a new version

```bash
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions will automatically build installers for Windows, macOS and Linux and attach them to the release.

---

## Architecture

- **Electron** — desktop shell
- **React + Vite** — renderer UI
- **better-sqlite3** — local conversation history
- **keytar** — OS keychain integration
- **Universal LLM adapter** — OpenAI-compatible, Anthropic SDK, Gemini SDK

---

## License

MIT
