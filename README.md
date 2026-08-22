# 🚀 ChatCourier

> **Move your AI conversations anywhere without losing context.**  
> Extract, clean, and condense chats from ChatGPT, Claude, Gemini, Perplexity, and DeepSeek into structured context digests in one click.

---

## What is ChatCourier?

Ever spent an hour working through a complex coding problem or design architecture in ChatGPT or Claude, only to hit a rate limit, need a second opinion from Gemini or DeepSeek, or want to pull the working state into Cursor or your IDE?

Copy-pasting 30 turns of raw chat is messy. It includes UI buttons, copy links, filler greetings, and eats up massive context windows.

**ChatCourier fixes this.** It acts as an in-browser context shuttle:
1. **Scrapes & Normalizes:** Grabs the clean conversation transcript from your active chat tab, stripping out UI noise, timestamps, and buttons.
2. **Condenses via LLM:** Uses any OpenAI-compatible API (like Groq for ultra-fast Llama 3.3, OpenRouter, OpenAI, Together, or even local Ollama) to synthesize a structured 4-part **Context Handoff Digest**.
3. **Hands Off in Seconds:** Automatically copies the digest to your clipboard so you can paste it directly into another AI to pick up right where you left off.

---

## 📋 The 4-Section Context Digest

When ChatCourier condenses a session, it formats the output into a high-density, prompt-ready Markdown digest:

```markdown
# 🚀 Context Handoff Digest: [Topic / Project Name]
> Source: [Platform] | Date: [Timestamp] | Turns: [Count]

## 1. 🎯 Primary Goal & High-Level Context
- Core objective, requirements, and system architecture.

## 2. ⚡ Key Decisions Made & Architectural Constraints
- Agreed-upon libraries, conventions, rejected alternatives, and rules.

## 3. 📦 Active Code, Schemas & Working Data Artifacts
- Exact working code snippets, configs, types, and schema contracts.

## 4. 📋 Pending Tasks & Immediate Next Steps
- Concrete checklist of remaining work and immediate prompt instructions.
```

---

## ✨ Features

- **🌐 5 Supported Platforms (+ Generic Fallback):**
  - Google Gemini (`gemini.google.com`)
  - Anthropic Claude (`claude.ai`)
  - OpenAI ChatGPT (`chatgpt.com` / `chat.openai.com`)
  - Perplexity AI (`perplexity.ai`)
  - DeepSeek AI (`chat.deepseek.com` — includes R1 reasoning chains!)
  - Generic scraper for other web chat interfaces.

- **🔌 Any OpenAI-Compatible Endpoint:**
  - Works out of the box with **Groq** (`llama-3.3-70b-versatile`, `mixtral-8x7b-32768`, etc.).
  - Easily points to **OpenRouter**, **Together AI**, **OpenAI**, **Mistral**, or local instances like **Ollama** (`http://localhost:11434/v1`).

- **🎛️ Connection Profiles:**
  - Save multiple provider configurations (e.g., "Groq — Fast", "Local Ollama", "OpenRouter").
  - Switch active profiles in one click from Settings.

- **✨ Non-Intrusive Floating Companion (FAB):**
  - Sleek, draggable orb right inside your chat window.
  - Hover or click to open the quick action drawer, or trigger extraction via `Alt + Shift + C`.
  - Can be toggled on or off in Settings.

- **⚡ Fast & Offline-Ready Utilities:**
  - **Quick Extract & Copy Raw:** Grabs clean Markdown without calling an LLM API.
  - **Download Transcript:** Saves full conversations as `.md` files locally.
  - **Live Preview Accordion:** Review the synthesized digest directly inside the popup.

- **🔒 Private & Secure:**
  - Zero telemetry or external tracking.
  - API keys and profiles are stored strictly on your local machine (`chrome.storage.local`) and never synced or transmitted anywhere except to your configured API endpoint.

- **🎨 Unified Dark Interface:**
  - Minimalist glassmorphic aesthetic tailored for focus, built with zero heavy frameworks.

---

## 🚀 Getting Started

### Installation (Developer Mode)

Since ChatCourier is a Manifest V3 browser extension, installing it takes under a minute:

1. **Clone or Download this repository:**
   ```bash
   git clone https://github.com/jaybhayeom/Chat-Courier.git
   ```
2. Open Google Chrome (or any Chromium browser like Brave, Edge, or Arc).
3. Navigate to `chrome://extensions/`.
4. Turn on **Developer mode** in the top right corner.
5. Click **Load unpacked** in the top left.
6. Select the `Chat-Courier` folder.

---

## ⚙️ Configuration

1. Click the **ChatCourier** extension icon in your browser toolbar or click the ⚙ icon on the floating in-tab button.
2. In the **Connection Profiles** section:
   - Enter your **API Endpoint** (default: `https://api.groq.com/openai/v1`).
   - Enter your **Model ID** (default: `llama-3.3-70b-versatile`).
   - Enter your **API Key** (e.g. from [Groq Console](https://console.groq.com/keys)).
3. Click **Test Connection** to confirm connectivity, then hit **Save Profile**.
4. *(Optional)* Expand **Advanced Settings** to tweak temperature, customize the system prompt template, or adjust auto-copy preferences.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Where |
|---|---|---|
| `Alt + Shift + C` | Instant Summarize & Copy Digest | On any supported chat tab |
| `Esc` | Close floating action drawer / modal preview | In-tab |

---

## 📁 Project Structure

```text
Chat-Courier/
├── manifest.json            # Manifest V3 configuration & permissions
├── background.js           # Background service worker & completions API client
├── content.js              # In-tab draggable companion orb & drawer controller
├── content.css             # Unified dark theme styles for the in-tab companion
├── popup/                  # Action popup dashboard
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/                # Settings & Profile management portal
│   ├── options.html
│   ├── options.js
│   └── options.css
├── scrapers/               # Universal scraper & platform implementations
│   ├── BaseScraper.js      # Base class, normalization, cleaning, token metrics
│   ├── ChatGPTScraper.js   # OpenAI ChatGPT parser
│   ├── ClaudeScraper.js    # Anthropic Claude parser (supports artifacts)
│   ├── GeminiScraper.js    # Google Gemini parser
│   ├── PerplexityScraper.js# Perplexity search & citation parser
│   └── DeepSeekScraper.js  # DeepSeek parser (supports R1 think blocks)
└── icons/                  # High-resolution extension icons
```

---

## 🗺️ Roadmap & Future Updates

ChatCourier is built modularly so new capabilities can be added cleanly:

- [ ] **Direct One-Click Handoff:** Open a new tab in target LLM and auto-populate the prompt.
- [ ] **Prompt Chains & Custom Templates:** Custom digest templates for code review, bug triage, and summarization.
- [ ] **Local In-Browser Models:** Optional WebLLM / Wasm support for 100% on-device summarization without API keys.
- [ ] **Additional Scrapers:** Native support for Mistral Le Chat, HuggingChat, and Cursor/Copilot logs.
- [ ] **History & Search:** Local log of recently synthesized handoff digests.

---

## 🤝 Contributing

Contributions, bug reports, and selector updates for evolving LLM frontends are always welcome!

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/CoolNewFeature`).
3. Commit your Changes (`git commit -m 'Add some CoolNewFeature'`).
4. Push to the Branch (`git push origin feature/CoolNewFeature`).
5. Open a Pull Request.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
