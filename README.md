# ChatCourier

> **Move your AI conversations across models without losing context.**  
> Extract, clean, and condense chats from ChatGPT, Claude, Gemini, Perplexity, and DeepSeek into structured context digests, rewrite prompts, and manage custom personas in one click.

---

## Why ChatCourier?

If you work with multiple AI tools, you've probably hit this wall:

You spend 45 minutes designing an architecture or debugging code in **ChatGPT** or **Claude**, and then:
- You hit a rate limit.
- You want a second opinion from **DeepSeek R1** or **Gemini**.
- You want to bring your active project state into **Cursor**, **VS Code**, or your terminal.

Copy-pasting 30 turns of raw conversation is messy. It includes UI buttons, copy links, timestamps, and conversational filler that quickly consumes your context window.

**ChatCourier acts as your context shuttle:**
1. **Clean DOM Capture:** Sweeps the conversation thread, capturing off-screen virtualized messages and stripping away UI noise.
2. **Context Synthesis:** Uses any OpenAI-compatible API (Groq, OpenRouter, Together, OpenAI, or local Ollama) to compress the session into a structured 4-section **Context Handoff Digest**.
3. **Fresh Clipboard Copy:** Copies the digest cleanly to your clipboard so you can paste it into another model and pick up right where you left off.

---

## The 4-Section Context Handoff Digest

When ChatCourier condenses a session, it formats the result into a clean, prompt-ready Markdown block:

```markdown
# Context Handoff Digest: [Topic / Project Name]
> Source: [Platform] | Date: [Timestamp] | Turns: [Count]

## 1. Primary Goal & High-Level Context
- Core objective, project requirements, and high-level architecture.

## 2. Key Decisions Made & Architectural Constraints
- Agreed-upon technical choices, conventions, rejected alternatives, and rules.

## 3. Active Code, Schemas & Working Data Artifacts
- Exact working code snippets, config blocks, data models, and schema contracts.

## 4. Pending Tasks & Immediate Next Steps
- Concrete checklist of remaining work and immediate prompt instructions.
```

---

## What's in v2.0

### 1. Capsule Toolbar (Zero Clutter, Zero Emojis)
Both the action popup and the in-tab companion feature a restrained 7-button toolbar with 44×44px touch targets and instant keyboard tooltips:

1. **Summarize for Handoff** (`Alt + Shift + C`) — Generates the 4-part context digest.
2. **Prompt Rewriter** — Refines rough drafts into structured, high-yield prompts.
3. **Download Transcript** — Exports full conversation turns as clean Markdown (`.md`).
4. **Preview Context** — Inspects raw transcripts or digests directly in a viewer modal.
5. **Clipboard History** — Accesses a local rolling log of your recent ChatCourier copies.
6. **Thinking Mode** — Appends deep-reasoning instructions with 3 depth presets.
7. **Auto-Suggest** — Appends 3 AI-suggested next steps to your digest.

---

### 2. Multi-Platform Scrapers
ChatCourier includes dedicated parsers for each major AI chat platform:

- **Google Gemini** (`gemini.google.com`) — Normalizes user queries, model responses, and formatted tables.
- **Anthropic Claude** (`claude.ai`) — Automatically extracts **Claude Artifacts** into fenced code blocks.
- **OpenAI ChatGPT** (`chatgpt.com` / `chat.openai.com`) — Handles multi-turn threads, code snippets, and canvas sessions.
- **Perplexity AI** (`perplexity.ai`) — Captures answers along with linked **sources & search citations**.
- **DeepSeek AI** (`chat.deepseek.com`) — Preserves **DeepSeek R1 reasoning chains** in blockquotes.
- **Generic Fallback** — Extracts clean text from other web chat interfaces.

---

### 3. Complete Thread Capture & Fast Mode
- **DOM Scroll Sweeps:** Most chat interfaces unmount off-screen messages to save memory. ChatCourier automatically sweeps the scroll container to ensure no historical turns are missed.
- **Completeness Sanity Checks:** Warns you if an extraction seems incomplete so you can reload or scroll first.
- **Fast Mode Toggle:** Available in Settings when you only need currently visible messages on extra-long threads.

---

### 4. Dedicated Prompt Rewriter
Turn quick notes and rough thoughts into effective prompts:
- Opens a dedicated input panel in the popup.
- Automatically pre-fills with text currently typed in your active chat composer.
- One-click **Retry**, **Copy**, and **Download as .md**.

---

### 5. Persona Creator (Settings-Only CRUD)
Create custom assistant personas with tailored instructions:
- Define persona names, descriptions, platform preferences, and custom instruction blocks.
- Switch active personas instantly from the popup chip.
- **Insert into Chat:** Inject persona prompt instructions directly into the active tab's composer (`ChatGPT`, `Claude`, `Gemini`, etc.).
- **Backup & Share:** Export and import personas via JSON (`chatcourier_personas.json`) with automatic deduplication.

---

### 6. Thinking Mode & Depth Presets
Prepend structured thinking directives to your digest or template executions:
- **Quick Check** — Fast consistency and assumption check.
- **Standard** — Balanced step-by-step reasoning and verification.
- **Deep Review** — Multi-pass audit examining edge cases, trade-offs, and failure modes.

---

### 7. Local Clipboard History
- Maintains a rolling log of the last 30 items copied through ChatCourier.
- Click any entry to re-copy with fresh user activation.
- **Privacy First:** ChatCourier only stores text generated within the extension itself and never requests broad system clipboard access (`clipboardRead`).

---

### 8. Customizable Template Registry
Every system prompt powering ChatCourier is fully editable:
- Context Handoff Digest
- Prompt Rewriter
- Thinking Mode (Quick, Standard, Deep)
- Auto-Suggested Next Steps
- One-click **Reset to Default** per template to restore verified prompts at any time.

---

### 9. In-Page Companion & Motion System
- Sleek, draggable orb and capsule drawer right inside supported chat tabs.
- Purposeful motion: mount settles, hover lifts, linear spinners, and checkmark draw-ons.
- Supports `prefers-reduced-motion` for accessibility.
- **Context Resilient:** Automatically handles extension reloads and host DOM re-renders without throwing console errors.

---

## Connection Profiles & API Setup

ChatCourier works with any OpenAI-compatible completions endpoint. You can configure multiple profiles in Settings and switch between them at any time:

| Provider | Endpoint | Recommended Model |
|---|---|---|
| **Groq** *(Fastest)* | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| **OpenRouter** | `https://openrouter.ai/api/v1` | `anthropic/claude-3.5-sonnet`, `meta-llama/llama-3.3-70b-instruct` |
| **Together AI** | `https://api.together.xyz/v1` | `meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| **OpenAI** | `https://api.openai.com/v1` | `gpt-4o-mini`, `gpt-4o` |
| **Ollama** *(Local)* | `http://localhost:11434/v1` | `llama3.2`, `qwen2.5-coder` |

---

## Installation

### Developer Mode (Chrome / Brave / Edge / Arc)

1. **Clone or Download this repository:**
   ```bash
   git clone https://github.com/jaybhayeom/Chat-Courier.git
   ```
2. Open your browser and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** in the top left.
5. Select the `Chat-Courier` folder.

---

## Quick Start

1. Click the **ChatCourier** extension icon in your browser toolbar (or open Settings ⚙).
2. Enter your **API Endpoint**, **Model ID**, and **API Key** (e.g., from [Groq Console](https://console.groq.com/keys)).
3. Click **Test Connection** to verify your setup, then click **Save Profile**.
4. Open any chat on ChatGPT, Claude, Gemini, Perplexity, or DeepSeek.
5. Click **Summarize for Handoff** in the popup (or press `Alt + Shift + C`) to generate and copy your handoff digest.

---

## Keyboard Shortcuts

| Shortcut | Action | Context |
|---|---|---|
| `Alt + Shift + C` | Summarize & Copy Digest | On any supported chat tab |
| `Esc` | Close in-tab drawer / preview modal | In-tab |

---

## Project Structure

```text
Chat-Courier/
├── manifest.json            # Manifest V3 configuration & permissions
├── background.js           # Service worker & template execution engine
├── content.js              # In-tab companion orb & platform scraping dispatcher
├── content.css             # Dark theme styles & motion system for in-tab companion
├── popup/                  # Main action popup
│   ├── popup.html          # Capsule toolbar, rewriter view & history view
│   ├── popup.js            # View controller & fresh-activation copy helper
│   └── popup.css           # Clean dark token layout (zero gradients)
├── options/                # Settings & Persona management portal
│   ├── options.html        # Profiles, Persona CRUD & Template customizer
│   ├── options.js          # Profile switching, JSON import/export, template reset
│   └── options.css         # Options styling
├── scrapers/               # Platform-specific scrapers
│   ├── BaseScraper.js      # Base class, text cleaning, scroll sweeps & metrics
│   ├── ChatGPTScraper.js   # OpenAI ChatGPT parser & composer locator
│   ├── ClaudeScraper.js    # Anthropic Claude parser (supports artifacts)
│   ├── GeminiScraper.js    # Google Gemini parser & composer locator
│   ├── PerplexityScraper.js# Perplexity search & citation parser
│   └── DeepSeekScraper.js  # DeepSeek parser (supports R1 reasoning)
└── icons/                  # Extension icons (16px, 32px, 48px, 128px)
```

---

## Privacy & Security

- **Zero Telemetry:** ChatCourier contains no analytics, tracking scripts, or third-party trackers.
- **Local Storage Only:** API keys and connection profiles are stored on your local device (`chrome.storage.local`).
- **Direct Requests:** Network calls travel directly from your browser to your configured API endpoint.
- **No Broad Permissions:** Clipboard history captures only what ChatCourier itself generates; `clipboardRead` is never requested.

---

## Future Roadmap

- [ ] **Direct One-Click Handoff:** Open a new tab in target LLM and auto-populate the prompt.
- [ ] **Local In-Browser Models:** Optional WebLLM / Wasm support for 100% on-device summarization without API keys.
- [ ] **Additional Scrapers:** Native support for Mistral Le Chat, HuggingChat, and local web interfaces (Open WebUI, LibreChat).
- [ ] **Multi-Step Workflows:** Chained actions for automated code review and test generation.

---

## Contributing

Feedback, bug reports, and selector updates for evolving LLM frontends are always welcome:

1. Fork the repository.
2. Create a feature branch (`git checkout -b feature/NewFeature`).
3. Commit your changes (`git commit -m 'Add NewFeature'`).
4. Push to the branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

---

## License

Distributed under the **MIT License**. See `LICENSE` for details.
