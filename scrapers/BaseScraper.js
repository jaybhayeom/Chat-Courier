/**
 * ChatCourier - BaseScraper.js
 * Universal Base Scraper, Virtualized DOM Sweeper & Text Normalization Engine
 */

class BaseScraper {
  constructor(platformName = 'generic') {
    this.platformName = platformName;
  }

  /**
   * Cleans and normalizes text extracted from DOM nodes
   */
  cleanText(rawText) {
    if (!rawText || typeof rawText !== 'string') return '';

    let text = rawText
      // Remove zero-width characters and directional marks
      .replace(/[\u200B-\u200D\uFEFF\u202A-\u202E]/g, '')
      // Standardize Windows / Mac newlines
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Normalize non-breaking spaces
      .replace(/\u00A0/g, ' ')
      // Replace tabs outside code fences if needed
      .replace(/\t/g, '    ');

    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Clean trailing whitespace on each line
    text = text.replace(/[ \t]+\n/g, '\n');

    // Normalize multiple excessive blank lines
    text = text.replace(/\n{3,}/g, '\n\n');

    return text.trim();
  }

  /**
   * Generates a stable content hash for deduplication during virtualized scrolling
   */
  hashContent(str) {
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193);
    }
    return ('0000000' + (hash >>> 0).toString(16)).slice(-8);
  }

  /**
   * Helper to sleep asynchronously
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Collects elements from DOM and virtualized containers.
   * Defaults to forceScrollSweep = true to guarantee complete context extraction on virtualized threads.
   * 
   * @param {string|Element} scrollContainerSelector
   * @param {string} itemSelector
   * @param {boolean} forceScrollSweep (default: true)
   */
  async collectVirtualizedNodes(scrollContainerSelector, itemSelector, forceScrollSweep = true) {
    let container = null;
    if (typeof scrollContainerSelector === 'string') {
      container = document.querySelector(scrollContainerSelector);
    } else if (scrollContainerSelector instanceof Element) {
      container = scrollContainerSelector;
    }

    const scrollTarget = container || document.scrollingElement || document.documentElement;
    const initialScrollTop = scrollTarget.scrollTop;
    const collectedMap = new Map();

    const collectVisible = () => {
      const items = document.querySelectorAll(itemSelector);
      items.forEach((el) => {
        const text = this.cleanText(el.innerText || el.textContent || '');
        if (text.length > 0) {
          const key = `${this.hashContent(text.slice(0, 120))}_${text.length}`;
          if (!collectedMap.has(key)) {
            collectedMap.set(key, el);
          }
        }
      });
    };

    collectVisible();

    // Perform scroll sweep if enabled and container is scrollable
    if (forceScrollSweep && scrollTarget.scrollHeight > scrollTarget.clientHeight) {
      const totalHeight = scrollTarget.scrollHeight;
      const clientHeight = scrollTarget.clientHeight || window.innerHeight;
      const step = Math.max(350, Math.floor(clientHeight * 0.75));
      let currentPos = 0;
      let passes = 0;
      const maxPasses = 25; // Supports very long chat transcripts

      while (currentPos < totalHeight && passes < maxPasses) {
        scrollTarget.scrollTop = currentPos;
        await this.sleep(60);
        collectVisible();
        currentPos += step;
        passes++;
      }

      // Final pass at bottom
      scrollTarget.scrollTop = totalHeight;
      await this.sleep(60);
      collectVisible();

      // Restore scroll position
      scrollTarget.scrollTop = initialScrollTop;
    }

    return Array.from(collectedMap.values());
  }

  /**
   * Completeness sanity check: checks if extracted turns seem low relative to page height
   */
  checkCompleteness(messages, scrollTarget) {
    const target = scrollTarget || document.scrollingElement || document.documentElement;
    const scrollHeight = target ? target.scrollHeight : 0;
    const viewportHeight = window.innerHeight || 800;

    // If page is significantly scrollable (> 4 viewports) but extracted fewer than 3 turns
    if (scrollHeight > viewportHeight * 4 && messages.length < 3) {
      return {
        isComplete: false,
        warning: `Detected a long conversation (${Math.round(scrollHeight / viewportHeight)} screens tall), but only ${messages.length} messages were mounted in the DOM. Try scrolling through the chat once if older messages are missing.`
      };
    }

    return { isComplete: true, warning: null };
  }

  /**
   * Extracts raw code blocks embedded within a container element
   */
  extractCodeBlocks(element) {
    if (!element) return [];
    const codeElements = element.querySelectorAll('pre, pre code, div[class*="code-block"], div[class*="codeBlock"]');
    const blocks = [];

    codeElements.forEach((el) => {
      if (el.tagName.toLowerCase() === 'code' && el.parentElement && el.parentElement.tagName.toLowerCase() === 'pre') {
        return;
      }

      let lang = 'plaintext';
      const classAttr = el.getAttribute('class') || (el.querySelector('code') ? el.querySelector('code').getAttribute('class') : '') || '';
      const match = classAttr.match(/language-([a-zA-Z0-9_-]+)/i) || classAttr.match(/lang-([a-zA-Z0-9_-]+)/i);
      if (match) {
        lang = match[1].toLowerCase();
      } else {
        const headerEl = el.closest('div')?.querySelector('[class*="lang"], [class*="header"], span');
        if (headerEl && headerEl.textContent && headerEl.textContent.length < 20) {
          const possibleLang = headerEl.textContent.trim().toLowerCase();
          if (['python', 'javascript', 'typescript', 'json', 'bash', 'sh', 'html', 'css', 'rust', 'go', 'cpp', 'c', 'sql', 'yaml', 'xml', 'markdown'].includes(possibleLang)) {
            lang = possibleLang;
          }
        }
      }

      const rawCode = el.innerText || el.textContent || '';
      const cleanCode = this.cleanText(rawCode);
      if (cleanCode.length > 0) {
        blocks.push({ lang, code: cleanCode });
      }
    });

    return blocks;
  }

  /**
   * Calculates transcript statistics and token approximations
   */
  calculateStats(messages) {
    let userTurns = 0;
    let assistantTurns = 0;
    let totalWords = 0;
    let totalChars = 0;

    messages.forEach(msg => {
      if (msg.sender === 'user') userTurns++;
      else if (msg.sender === 'assistant' || msg.sender === 'model') assistantTurns++;

      const words = msg.content ? msg.content.trim().split(/\s+/).filter(Boolean).length : 0;
      totalWords += words;
      totalChars += (msg.content ? msg.content.length : 0);
    });

    const approxTokenCount = Math.round((totalChars / 4) * 0.6 + (totalWords / 0.75) * 0.4);

    return {
      messageCount: messages.length,
      userTurns,
      assistantTurns,
      approxWordCount: totalWords,
      approxCharCount: totalChars,
      approxTokenCount: Math.max(0, approxTokenCount)
    };
  }

  /**
   * Formats extracted session into clean Markdown
   */
  formatAsMarkdown(session) {
    const { platform, title, url, extractedAt, messages, stats } = session;
    let md = `# ${title || 'AI Chat Session Transcript'}\n\n`;
    md += `> **Platform**: ${(platform || 'AI').toUpperCase()}  \n`;
    md += `> **Source URL**: [${url}](${url})  \n`;
    md += `> **Captured**: ${extractedAt}  \n`;
    if (stats) {
      md += `> **Metrics**: ${stats.messageCount} messages (${stats.userTurns} user, ${stats.assistantTurns} assistant) | ~${stats.approxWordCount} words | ~${stats.approxTokenCount} tokens\n\n`;
    }
    md += `---\n\n`;

    messages.forEach((msg, idx) => {
      const senderLabel = msg.sender === 'user' ? '**User**' : '**Assistant**';
      const timestamp = msg.timestamp ? ` *(${msg.timestamp})*` : '';
      md += `### ${senderLabel}${timestamp}\n\n`;
      md += `${msg.content}\n\n`;
      if (idx < messages.length - 1) {
        md += `---\n\n`;
      }
    });

    return md;
  }

  /**
   * Formats extracted session into formatted JSON string
   */
  formatAsJSON(session) {
    return JSON.stringify(session, null, 2);
  }

  /**
   * Formats extracted session for LLM context condensation
   */
  formatForGroqDigest(session) {
    const header = `[TRANSCRIPT METADATA]\nPlatform: ${session.platform}\nTitle: ${session.title}\nMessage Count: ${session.stats?.messageCount || session.messages?.length || 0}\n\n[CONVERSATION TURNS]\n`;
    const turns = (session.messages || []).map((m, i) => {
      const role = (m.sender || 'assistant').toUpperCase();
      return `--- TURN ${i + 1} (${role}) ---\n${m.content}\n`;
    }).join('\n');
    return header + turns;
  }

  /**
   * Locates the active platform's prompt input element (textarea or contenteditable div)
   * Subclasses should override with platform-specific selectors.
   * @returns {HTMLElement|null}
   */
  findComposerElement() {
    return document.querySelector('textarea, div[contenteditable="true"]');
  }

  /**
   * Retrieves text currently sitting in the active composer
   */
  getComposerText() {
    const composer = this.findComposerElement();
    if (!composer) return '';
    if (composer.tagName.toLowerCase() === 'textarea' || composer.tagName.toLowerCase() === 'input') {
      return composer.value || '';
    }
    return composer.innerText || composer.textContent || '';
  }

  /**
   * Inserts text into the active composer and fires input events
   */
  setComposerText(text) {
    const composer = this.findComposerElement();
    if (!composer) return false;

    composer.focus();

    if (composer.tagName.toLowerCase() === 'textarea' || composer.tagName.toLowerCase() === 'input') {
      composer.value = text;
      composer.dispatchEvent(new Event('input', { bubbles: true }));
      composer.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // Contenteditable div
      composer.textContent = text;
      composer.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }

  /**
   * Detects the current platform based on hostname
   */
  static detectCurrentPlatform() {
    if (typeof window === 'undefined' || !window.location) return 'generic';
    const host = window.location.hostname || '';
    if (host.includes('chatgpt.com') || host.includes('chat.openai.com')) return 'chatgpt';
    if (host.includes('claude.ai')) return 'claude';
    if (host.includes('gemini.google.com')) return 'gemini';
    if (host.includes('perplexity.ai')) return 'perplexity';
    if (host.includes('deepseek.com')) return 'deepseek';
    return 'generic';
  }

  /**
   * Abstract scrape method - must be implemented by subclasses
   */
  async scrape(fastMode = false) {
    throw new Error(`scrape() must be implemented by ${this.constructor.name}`);
  }
}

if (typeof window !== 'undefined') {
  window.BaseScraper = BaseScraper;
}
