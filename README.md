# ChatCourier

> **Move your AI conversations between models without losing the important context.**

If you use more than one AI tool, you’ve probably run into this situation:

You spend 45 minutes designing an architecture, debugging code, researching an idea, or building a project with **ChatGPT** or **Claude**.

Then suddenly:

* You hit a rate limit.
* You want a second opinion from **DeepSeek R1** or **Gemini**.
* You want to move your current project into **Cursor**, **VS Code**, or your terminal.
* You simply want to continue the same work with another model.

Now you have to copy and paste 30+ messages manually.

That gets frustrating quickly.

AI conversations also contain a lot of unnecessary content, such as UI buttons, timestamps, copy links, greetings, and filler text. All of that makes it harder to move the useful context to another model.

**ChatCourier helps you move the important parts of your conversation wherever you want to continue working.**

Think of it as a **context shuttle for AI conversations** 🚀

---

## Why ChatCourier?

The idea is simple:

**Your work shouldn’t be locked to the AI platform where you started it.**

ChatCourier takes your active conversation, cleans it up, identifies the important details, and turns everything into a structured handoff that you can use with another model.

The workflow is simple:

### 1. Capture & Clean

ChatCourier scans the conversation currently open in your browser.

It removes unnecessary interface content and performs DOM scroll sweeps to capture off-screen and virtualized messages. This helps prevent long conversations from losing older or hidden messages.

### 2. Synthesize

The cleaned conversation is sent to your configured **OpenAI-compatible API**.

You can use providers such as:

* Groq
* OpenRouter
* Together AI
* OpenAI
* Ollama
* Other compatible endpoints

ChatCourier then turns the conversation into a structured **4-section Context Handoff Digest**.

### 3. Copy & Continue

The finished digest is copied to your clipboard.

Open another AI, paste the digest, and continue working.

**No starting over. No rebuilding the context manually.**

---

# The 4-Section Context Handoff Digest

Instead of sending an entire conversation to another model, ChatCourier organizes the useful information into four focused sections:

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

The goal isn’t just to make the conversation **shorter**.

The goal is to make it **easy to move and continue**.

---

# What’s Included in v2.0?

ChatCourier v2.0 combines the core handoff workflow with a complete set of tools for working across different AI platforms.

## 1. Capsule Toolbar

ChatCourier keeps the interface compact and focused.

The action popup and in-page companion use a simple 7-button toolbar with **44×44px touch targets** and quick keyboard tooltips.

### Available actions

1. **Summarize for Handoff** — `Alt + Shift + C`

   * Generates the 4-section Context Handoff Digest.

2. **Prompt Rewriter**

   * Turns rough drafts into clearer and more useful prompts.

3. **Download Transcript**

   * Exports the complete conversation as clean Markdown (`.md`).

4. **Preview Context**

   * Lets you review the extracted transcript and generated digest.

5. **Clipboard History**

   * Access your recent ChatCourier-generated copies.

6. **Thinking Mode**

   * Adds deeper reasoning and verification instructions using three presets.

7. **Auto-Suggest**

   * Optionally adds three AI-generated next steps to your handoff digest.

---

## 2. Multi-Platform Scrapers

ChatCourier includes dedicated scrapers for several popular AI platforms.

### Google Gemini

`gemini.google.com`

Captures and normalizes user messages, model responses, and formatted tables.

### Anthropic Claude

`claude.ai`

Supports **Claude Artifacts** and extracts them into fenced code blocks.

### OpenAI ChatGPT

`chatgpt.com` / `chat.openai.com`

Handles multi-turn conversations, code snippets, and canvas sessions.

### Perplexity AI

`perplexity.ai`

Captures responses along with linked **sources and search citations**.

### DeepSeek AI

`chat.deepseek.com`

Preserves **DeepSeek R1 reasoning chains** in blockquotes.

### Generic Fallback

Using another web-based AI chat?

ChatCourier also includes a generic scraper that attempts to extract clean text from other chat interfaces.

---

# 3. Complete Thread Capture & Fast Mode

Long AI conversations can be difficult to extract because many modern chat interfaces use virtualized rendering.

This means older messages may be removed from the page when they are outside the visible area.

ChatCourier handles this with:

### DOM Scroll Sweeps

ChatCourier automatically moves through the conversation to capture historical messages that are not currently visible.

### Completeness Checks

ChatCourier checks the extracted content and warns you if the conversation appears incomplete.

This gives you a chance to reload the page or scroll before generating the handoff.

### Fast Mode

Need a quicker extraction?

Enable **Fast Mode** from Settings to capture only the messages currently visible on the page.

---

# 4. Dedicated Prompt Rewriter

Sometimes you don’t need to move an entire conversation.

You just need to improve a rough prompt.

The built-in Prompt Rewriter helps you turn a simple draft into a clearer and more structured instruction.

It can:

* Open a dedicated input panel inside the popup.
* Automatically fill in text from your active chat composer.
* Let you retry the rewrite.
* Copy the final prompt with one click.
* Download the result as `.md`.

The workflow is simple:

**Write naturally → refine with ChatCourier → send a better prompt.**

---

# 5. Custom Persona Creator

Different projects often need different AI behavior.

With ChatCourier Personas, you can create reusable assistant configurations with:

* Persona names
* Descriptions
* Preferred platforms
* Custom instruction blocks

Once a persona is created, you can switch to it directly from the popup.

### Insert Into Chat

ChatCourier can insert persona instructions directly into the active composer on supported platforms, including:

* ChatGPT
* Claude
* Gemini
* Other supported interfaces

### Backup & Share

Personas can be exported and imported as JSON:

```text
chatcourier_personas.json
```

Imports use automatic deduplication, making it easier to manage and share your persona collection.

---

# 6. Thinking Mode

Sometimes you need a quick answer.

Other times, you want the model to slow down, verify assumptions, check edge cases, and review its own reasoning.

Thinking Mode lets you add structured reasoning instructions to your digest or template executions.

It includes three presets:

### Quick Check

Fast consistency and assumption checking.

### Standard

Balanced reasoning and verification.

### Deep Review

A more detailed review focused on:

* Edge cases
* Trade-offs
* Failure modes
* Potential inconsistencies

---

# 7. Local Clipboard History

ChatCourier keeps a rolling history of the last **30 items** copied through the extension.

Need something you copied earlier?

Open Clipboard History, select the entry, and copy it again.

### Privacy First

ChatCourier only stores text generated through the extension.

It does **not** request broad system clipboard access.

`clipboardRead` is never requested.

---

# 8. Customizable Template Registry

The prompts used by ChatCourier are not locked away.

You can customize the main templates used by the extension, including:

* Context Handoff Digest
* Prompt Rewriter
* Thinking Mode
* Auto-Suggested Next Steps

Want to return to the original version?

Use:

**Reset to Default**

Each template can be restored independently.

---

# 9. In-Page Companion & Motion System

You don’t need to keep opening the extension popup.

ChatCourier includes a draggable in-page companion that appears directly inside supported AI chat tabs.

The interface includes subtle animations for:

* Mount transitions
* Hover interactions
* Loading spinners
* Completion checkmarks

It also supports:

`prefers-reduced-motion`

The companion is designed to handle extension reloads and host-page DOM changes without creating unnecessary console errors.

---

# Connection Profiles & API Setup

ChatCourier works with **OpenAI-compatible completion endpoints**.

You can create multiple connection profiles and switch between them whenever you need.

| Provider             | Endpoint                         | Recommended Model                                                  |
| -------------------- | -------------------------------- | ------------------------------------------------------------------ |
| **Groq** *(Fast)*    | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile`                                          |
| **OpenRouter**       | `https://openrouter.ai/api/v1`   | `anthropic/claude-3.5-sonnet`, `meta-llama/llama-3.3-70b-instruct` |
| **Together AI**      | `https://api.together.xyz/v1`    | `meta-llama/Llama-3.3-70B-Instruct-Turbo`                          |
| **OpenAI**           | `https://api.openai.com/v1`      | `gpt-4o-mini`, `gpt-4o`                                            |
| **Ollama** *(Local)* | `http://localhost:11434/v1`      | `llama3.2`, `qwen2.5-coder`                                        |

You are not locked into one provider.

Choose the model that fits your task.

---

# Installation

ChatCourier currently runs as an unpacked extension in Chromium-based browsers.

Supported browsers include:

* Chrome
* Brave
* Edge
* Arc

## Step 1 — Clone the repository

```bash
git clone https://github.com/jaybhayeom/Chat-Courier.git
```

## Step 2 — Open your browser

Open Chrome or another Chromium-based browser.

## Step 3 — Open Extensions

Navigate to:

```text
chrome://extensions/
```

## Step 4 — Enable Developer Mode

Turn on **Developer mode** in the top-right corner.

## Step 5 — Load ChatCourier

Click:

**Load unpacked**

## Step 6 — Select the project

Select the cloned:

```text
Chat-Courier
```

folder.

That’s it.

ChatCourier should now appear in your browser extensions.

---

# Quick Start

Once the extension is installed:

### 1. Open ChatCourier

Click the **ChatCourier** icon in your browser toolbar.

You can also open Settings using the ⚙ button.

### 2. Add a Connection Profile

Enter:

* **API Endpoint**
* **Model ID**
* **API Key**

For example, you can use a Groq API key.

### 3. Test the connection

Click:

**Test Connection**

If everything works, click:

**Save Profile**

### 4. Open an AI conversation

Go to a supported chat on:

* ChatGPT
* Claude
* Gemini
* Perplexity
* DeepSeek

### 5. Generate your handoff

Click:

**Summarize for Handoff**

Or press:

`Alt + Shift + C`

ChatCourier will extract the conversation, generate the digest, and copy it for you.

Now switch models and continue your work.

---

# Keyboard Shortcuts

| Shortcut          | Action                              | Context                |
| ----------------- | ----------------------------------- | ---------------------- |
| `Alt + Shift + C` | Summarize & Copy Digest             | Any supported chat tab |
| `Esc`             | Close in-tab drawer / preview modal | In-tab                 |

---

# Project Structure

```text
Chat-Courier/

├── manifest.json            # Manifest V3 configuration & permissions
├── background.js             # Service worker & template execution engine
├── content.js                # In-tab companion orb & platform scraping dispatcher
├── content.css               # Dark theme styles & motion system for in-tab companion
├── popup/                    # Main action popup
│   ├── popup.html             # Capsule toolbar, rewriter view & history view
│   ├── popup.js               # View controller & fresh-activation copy helper
│   └── popup.css              # Clean dark token layout (zero gradients)
├── options/                  # Settings & Persona management portal
│   ├── options.html           # Profiles, Persona CRUD & Template customizer
│   ├── options.js             # Profile switching, JSON import/export, template reset
│   └── options.css            # Options styling
├── scrapers/                 # Platform-specific scrapers
│   ├── BaseScraper.js         # Base class, text cleaning, scroll sweeps & metrics
│   ├── ChatGPTScraper.js      # OpenAI ChatGPT parser & composer locator
│   ├── ClaudeScraper.js       # Anthropic Claude parser (supports artifacts)
│   ├── GeminiScraper.js       # Google Gemini parser & composer locator
│   ├── PerplexityScraper.js   # Perplexity search & citation parser
│   └── DeepSeekScraper.js     # DeepSeek parser (supports R1 reasoning)
└── icons/                    # Extension icons (16px, 32px, 48px, 128px)
```

---

# Privacy & Security

Privacy is an important part of ChatCourier.

### Zero Telemetry

ChatCourier includes:

* No analytics
* No tracking scripts
* No third-party trackers

### Local Storage

API keys and connection profiles are stored locally using:

`chrome.storage.local`

### Direct Requests

Network requests go directly from your browser to the API endpoint you configure.

### No Broad Clipboard Permissions

Clipboard history only stores content generated through ChatCourier.

The extension never requests:

`clipboardRead`

---

# Future Roadmap

ChatCourier already supports moving context across multiple AI platforms, but there is more planned:

* [ ] **Direct One-Click Handoff** — Open a new tab on the target LLM and automatically populate the prompt.
* [ ] **Local In-Browser Models** — Add optional WebLLM / Wasm support for fully on-device summarization without API keys.
* [ ] **Additional Scrapers** — Add native support for Mistral Le Chat, HuggingChat, Open WebUI, LibreChat, and other local web interfaces.
* [ ] **Multi-Step Workflows** — Build chained workflows for tasks such as automated code review and test generation.

---

# Contributing

AI interfaces change quickly.

Selectors change.

DOM structures change.

New platforms appear.

That’s why contributions are always welcome.

Found a broken selector?

Have an idea for a better scraper?

Want to add support for another AI platform?

We’d love your help.

### Getting Started

1. Fork the repository.

2. Create a feature branch:

```bash
git checkout -b feature/NewFeature
```

3. Make your changes.

4. Commit them:

```bash
git commit -m "Add NewFeature"
```

5. Push your branch:

```bash
git push origin feature/NewFeature
```

6. Open a Pull Request.

---

# License

ChatCourier is distributed under the **MIT License**.

See the `LICENSE` file for details.

---

# The Idea Behind ChatCourier

AI tools are becoming a big part of how we build, research, debug, learn, and create.

Having multiple models is useful.

But switching between them shouldn’t mean starting the conversation all over again.

Your conversation contains:

* Decisions
* Requirements
* Code
* Architecture
* Research
* Context
* Next steps

**That context belongs to your workflow, not to one specific AI platform.**

That’s the idea behind ChatCourier.

> **Extract it. Clean it. Carry it. Continue.**

**ChatGPT → Claude → Gemini → DeepSeek → Perplexity → Cursor → wherever you want to keep working.**

Welcome to **ChatCourier** 👋
