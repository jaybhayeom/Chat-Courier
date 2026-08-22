/**
 * ChatCourier - BaseScraper.js
 * Universal Base Scraper & DOM Normalization Engine for LLM Web Interfaces
 */

class BaseScraper {
  constructor(platformName = 'generic') {
    this.platformName = platformName;
  }

  /**
   * Cleans and normalizes text extracted from DOM nodes
   * - Strips invisible / zero-width characters
   * - Normalizes unicode line breaks and whitespace
   * - Preserves markdown code fences and tabbed indentation
   * - Decodes common HTML entities
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
      // Replace tabs outside code fences if needed or preserve
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

    // Normalize multiple excessive blank lines (> 2 consecutive newlines)
    text = text.replace(/\n{3,}/g, '\n\n');

    // Trim outer whitespace
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
   * Prioritizes fast direct DOM query without disturbing the user's viewport.
   * 
   * @param {string|Element} scrollContainerSelector
   * @param {string} itemSelector
   * @param {boolean} forceScrollSweep
   */
  async collectVirtualizedNodes(scrollContainerSelector, itemSelector, forceScrollSweep = false) {
    const directItems = Array.from(document.querySelectorAll(itemSelector));
    
    // Fast path: If items exist and no sweep forced, return immediately
    if (directItems.length > 0 && !forceScrollSweep) {
      return directItems;
    }

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

    // If still 0 items or explicitly forced sweep, do a fast, gentle scroll
    if (forceScrollSweep && scrollTarget.scrollHeight > scrollTarget.clientHeight) {
      const totalHeight = scrollTarget.scrollHeight;
      const clientHeight = scrollTarget.clientHeight || window.innerHeight;
      const step = Math.max(400, Math.floor(clientHeight * 0.8));
      let currentPos = 0;
      let passes = 0;
      const maxPasses = 10;

      while (currentPos < totalHeight && passes < maxPasses) {
        scrollTarget.scrollTop = currentPos;
        await this.sleep(60);
        collectVisible();
        currentPos += step;
        passes++;
      }

      // Restore scroll position
      scrollTarget.scrollTop = initialScrollTop;
    }

    return Array.from(collectedMap.values());
  }

  /**
   * Extracts raw code blocks embedded within a container element
   */
  extractCodeBlocks(element) {
    if (!element) return [];
    const codeElements = element.querySelectorAll('pre, pre code, div[class*="code-block"], div[class*="codeBlock"]');
    const blocks = [];

    codeElements.forEach((el) => {
      // Avoid duplicate captures of nested <pre><code>
      if (el.tagName.toLowerCase() === 'code' && el.parentElement && el.parentElement.tagName.toLowerCase() === 'pre') {
        return;
      }

      // Try to determine language from class or header
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

    // Approximate token count: ~4 chars / token or 0.75 words / token
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
      const senderLabel = msg.sender === 'user' ? '👤 **User**' : '🤖 **Assistant**';
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
   * Formats extracted session for Groq LLM context condensation
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
  async scrape() {
    throw new Error(`scrape() must be implemented by ${this.constructor.name}`);
  }
}

// Attach to window / global scope for Chrome extension content script injection
if (typeof window !== 'undefined') {
  window.BaseScraper = BaseScraper;
}
