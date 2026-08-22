# ChatCourier

> **Move your AI conversations anywhere without losing context.**  
> Extract, clean, and condense chats from ChatGPT, Claude, Gemini, Perplexity, and DeepSeek into structured context digests, rewrite prompts, and manage custom personas in one click.

---

## What is ChatCourier?

Ever spent an hour working through a complex problem in ChatGPT or Claude, only to hit a rate limit, need a second opinion from Gemini or DeepSeek, or want to pull your working state into your IDE?

Copy-pasting 30 turns of raw chat is messy. It carries UI buttons, copy links, and filler greetings that waste your context window.

**ChatCourier is your in-browser context shuttle:**
1. **Scrapes & Normalizes:** Extracts clean conversation turns from your active chat tab, stripping out UI noise, timestamps, and feedback buttons. Complete DOM sweeps ensure off-screen virtualized turns are never lost.
2. **Condenses via Unified Template Engine:** Uses any OpenAI-compatible endpoint (Groq, OpenRouter, Together AI, OpenAI, or local Ollama) to synthesize a structured 4-part **Context Handoff Digest**.
3. **Hands Off with Fresh-Activation Copy:** Copies the digest to your clipboard with reliable single-click activation so you can paste it directly into another AI to pick up right where you left off.

---

## The 4-Section Context Digest

```markdown
# Context Handoff Digest: [Topic / Project Name]
> Source: [Platform] | Date: [Timestamp] | Turns: [Count]

## 1. Primary Goal & High-Level Context
- Core objective, requirements, and system architecture.

## 2. Key Decisions Made & Architectural Constraints
- Technical choices agreed upon, conventions, rejected alternatives, and rules.

## 3. Active Code, Schemas & Working Data Artifacts
- Exact working code snippets, configs, types, and schema contracts.

## 4. Pending Tasks & Immediate Next Steps
- Concrete checklist of remaining work and immediate prompt instructions.
```

---

## Features

- **5 Supported Platforms (+ Generic Fallback):**
  - Google Gemini (`gemini.google.com`)
  - Anthropic Claude (`claude.ai` — includes Claude Artifacts!)
  - OpenAI ChatGPT (`chatgpt.com` / `chat.openai.com`)
  - Perplexity AI (`perplexity.ai` — includes source citations!)
  - DeepSeek AI (`chat.deepseek.com` — includes R1 reasoning chains!)
  - Generic scraper for other web chat interfaces.

- **Capsule Icon Toolbar:**
  - Fast, restrained 7-button toolbar with zero clutter and zero emojis:
    1. **Summarize for Handoff** (`Alt + Shift + C`)
    2. **Prompt Rewriter** (Dedicated rewrite composer)
    3. **Download Transcript** (Clean `.md` export)
    4. **Preview Context** (Instant modal / pane inspector)
    5. **Clipboard History** (Local 30-item log of ChatCourier copies)
    6. **Thinking Mode** (Toggle with Quick, Standard, and Deep Review depth presets)
    7. **Auto-Suggest** (Optional 3 speculative next steps)

- **Dedicated Prompt Rewriter:**
  - Refines draft prompts into clear, structured, high-yield instructions.
  - Automatically pre-fills from the active chat composer.
  - One-click **Retry**, **Copy**, and **Download as .md**.

- **Custom Persona Creator (Settings-Only CRUD):**
  - Define custom personas with dedicated instruction blocks and preferred platforms.
  - Switch active personas instantly from the popup chip.
  - Export and import personas via JSON (`chatcourier_personas.json`) with non-destructive merge.
  - Insert persona instructions directly into any supported web chat composer.

- **Thinking Mode & Depth Presets:**
  - Prepend reasoning and verification directives to any template run.
  - Three customizable presets: **Quick Check**, **Standard Review**, and **Deep Multi-Pass Audit**.

- **Local Clipboard History:**
  - Rolling log of the last 30 items written by ChatCourier.
  - Click any entry to re-copy with fresh activation.
  - Zero broad clipboard monitoring permissions (`clipboardRead` is not required or requested).

- **Complete Context Extraction:**
  - Automated DOM scroll sweeps capture long, virtualized conversation histories.
  - **Fast Mode** toggle available in Settings when viewport-only capture is desired.
  - Completeness sanity checks alert you if a thread appears partially mounted.

- **Any OpenAI-Compatible API:**
  - Works out of the box with Groq (`llama-3.3-70b-versatile`, `mixtral-8x7b-32768`).
  - Connects easily to OpenRouter, Together AI, OpenAI, Mistral, or local Ollama instances (`http://localhost:11434/v1`).

---

## Getting Started

### Installation (Developer Mode)

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

## Configuration

1. Click the **ChatCourier** extension icon in your browser toolbar or click the ⚙ icon on the floating in-tab button.
2. In the **Connection Profiles** section:
   - Enter your **API Endpoint** (default: `https://api.groq.com/openai/v1`).
   - Enter your **Model ID** (default: `llama-3.3-70b-versatile`).
   - Enter your **API Key** (e.g. from [Groq Console](https://console.groq.com/keys)).
3. Click **Test Connection** to confirm connectivity, then hit **Save Profile**.
4. *(Optional)* Customize system prompt templates, adjust temperature, or create custom Personas.

---

## Keyboard Shortcuts

| Shortcut | Action | Where |
|---|---|---|
| `Alt + Shift + C` | Instant Summarize for Handoff | On any supported chat tab |
| `Esc` | Close floating drawer / modal preview | In-tab |

---

## Project Structure

```text
Chat-Courier/
├── manifest.json            # Manifest V3 configuration & permissions
├── background.js           # Service worker & unified template execution engine
├── content.js              # In-tab draggable companion & platform scraping dispatcher
├── content.css             # Unified dark theme styles for the in-tab companion
├── popup/                  # Action popup dashboard
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── options/                # Settings, Profile manager & Persona CRUD portal
│   ├── options.html
│   ├── options.js
│   └── options.css
├── scrapers/               # Universal scraper & platform implementations
│   ├── BaseScraper.js      # Base class, normalization, cleaning, token metrics
│   ├── ChatGPTScraper.js   # OpenAI ChatGPT parser & composer locator
│   ├── ClaudeScraper.js    # Anthropic Claude parser (supports artifacts)
│   ├── GeminiScraper.js    # Google Gemini parser & composer locator
│   ├── PerplexityScraper.js# Perplexity search & citation parser
│   └── DeepSeekScraper.js  # DeepSeek parser (supports R1 think blocks)
└── icons/                  # High-resolution extension icons
```

---

## Roadmap & Future Updates

- [ ] **Direct One-Click Handoff:** Open a new tab in target LLM and auto-populate the prompt.
- [ ] **Local In-Browser Models:** Optional WebLLM / Wasm support for 100% on-device summarization without API keys.
- [ ] **Additional Scrapers:** Native support for Mistral Le Chat, HuggingChat, and Cursor/Copilot logs.
- [ ] **Prompt Chains:** Multi-step pipeline execution for code review and test generation.

---

## Contributing

Contributions, bug reports, and selector updates for evolving LLM frontends are always welcome!

1. Fork the Project.
2. Create your Feature Branch (`git checkout -b feature/CoolNewFeature`).
3. Commit your Changes (`git commit -m 'Add some CoolNewFeature'`).
4. Push to the Branch (`git push origin feature/CoolNewFeature`).
5. Open a Pull Request.

---

## License

Distributed under the **MIT License**. See `LICENSE` for more information.
