/**
 * ChatCourier - MetaAIScraper.js
 * Scraper implementation for Meta AI (www.meta.ai & meta.ai)
 */

class MetaAIScraper extends BaseScraper {
  constructor() {
    super('meta');
  }

  /**
   * Scrapes the active Meta AI chat session
   * @param {boolean} fastMode If true, skips virtualized scroll sweep
   */
  async scrape(fastMode = false) {
    const title = this.extractTitle();
    const url = window.location.href;
    const extractedAt = new Date().toISOString();

    const turns = await this.collectVirtualizedNodes(
      'main, div[role="main"], div[class*="overflow-y-auto"], div[class*="scrollable"], div[data-testid*="conversation"], div[class*="chat-container"]',
      'div[data-testid*="chat-message"], div[data-testid*="message-bubble"], div[data-testid*="message-container"], div[class*="message-item"], div[class*="chat-turn"], div[role="region"], div[dir="auto"], div[class*="bubble"]',
      !fastMode
    );

    const messages = [];
    const elementsToProcess = turns.length > 0
      ? turns
      : Array.from(document.querySelectorAll(
          'div[data-testid*="chat-message"], div[data-testid*="message-bubble"], div[data-testid*="message-container"], div[class*="message-item"], div[class*="chat-turn"], div[role="region"]'
        ));

    elementsToProcess.forEach((el) => {
      let sender = 'assistant';

      const isUser = el.matches('[data-testid*="user"], [class*="user"], [class*="outgoing"], [class*="sent"]') ||
                     el.getAttribute('data-testid')?.includes('user') ||
                     el.getAttribute('data-testid')?.includes('outgoing') ||
                     el.getAttribute('data-role') === 'user' ||
                     el.getAttribute('data-message-author-role') === 'user' ||
                     el.querySelector('[data-testid*="user"], [class*="user-bubble"], [class*="user-message"], [class*="outgoing"], [aria-label*="You" i], [aria-label*="User" i]');

      const isAssistant = el.matches('[data-testid*="assistant"], [data-testid*="meta-ai"], [class*="assistant"], [class*="incoming"], [class*="bot"]') ||
                          el.getAttribute('data-testid')?.includes('assistant') ||
                          el.getAttribute('data-testid')?.includes('meta-ai') ||
                          el.getAttribute('data-testid')?.includes('incoming') ||
                          el.getAttribute('data-role') === 'assistant' ||
                          el.getAttribute('data-message-author-role') === 'assistant' ||
                          el.querySelector('svg[aria-label*="Meta AI" i], [data-testid*="meta-ai-avatar"], img[alt*="Meta AI" i], [class*="meta-ai"], [aria-label*="Meta AI" i]');

      if (isUser && !isAssistant) {
        sender = 'user';
      } else if (isAssistant) {
        sender = 'assistant';
      } else {
        const hasMarkdownProse = el.querySelector('.markdown, .prose, div[class*="markdown"], div[class*="prose"]');
        const hasUserIndicator = el.querySelector('img[alt*="profile" i], img[alt*="avatar" i], [class*="user"]');
        sender = (hasUserIndicator && !hasMarkdownProse) ? 'user' : 'assistant';
      }

      // Check for reasoning / thinking chains (Meta AI / Llama reasoning models)
      let thoughtChain = '';
      const thoughtBlock = el.querySelector('div[class*="thinking"], div[class*="reasoning"], div[class*="thought-process"], [data-testid*="thought"]');
      if (thoughtBlock) {
        const rawThought = thoughtBlock.innerText || thoughtBlock.textContent || '';
        if (rawThought.trim().length > 0) {
          thoughtChain = `\n> **Meta AI Reasoning Process:**\n> ${this.cleanText(rawThought).replace(/\n/g, '\n> ')}\n\n`;
        }
      }

      // Check for search citations & web sources
      let citationText = '';
      if (sender === 'assistant') {
        const citationLinks = el.querySelectorAll('a[class*="citation"], [data-testid*="source"], a[class*="source"], [class*="source-card"] a, [data-testid*="citation"] a');
        const sources = [];
        citationLinks.forEach((c) => {
          const href = c.getAttribute('href');
          const citeTitle = c.textContent?.trim() || '';
          if (href && href.startsWith('http') && !href.includes('meta.ai') && !sources.some(s => s.href === href)) {
            sources.push({ title: citeTitle, href });
          }
        });

        if (sources.length > 0) {
          citationText = `\n\n**Sources & Citations:**\n` + sources.map((s, idx) => `[${idx + 1}] [${s.title || s.href}](${s.href})`).join('\n');
        }
      }

      // Check for Imagine / Generated Media
      let mediaText = '';
      if (sender === 'assistant') {
        const generatedImages = el.querySelectorAll('img[alt*="Imagine" i], img[src*="scontent"], [data-testid*="generated-image"] img, [class*="generated-image"] img');
        generatedImages.forEach((img) => {
          const alt = img.getAttribute('alt') || 'Meta AI Generated Image';
          mediaText += `\n\n[Generated Image: ${this.cleanText(alt)}]\n`;
        });
      }

      const contentEl = el.querySelector('.markdown, .prose, div[class*="markdown"], div[class*="prose"], div[dir="auto"], div[class*="message-content"]') || el;
      const clone = contentEl.cloneNode(true);

      const buttonsAndTools = clone.querySelectorAll(
        'button, svg, [role="button"], [class*="action-bar"], [class*="feedback"], [data-testid*="copy"], [data-testid*="like"], [data-testid*="dislike"], [data-testid*="share"], .sr-only, div[class*="thinking"], div[class*="reasoning"]'
      );
      buttonsAndTools.forEach(b => b.remove());

      const rawText = clone.innerText || clone.textContent || '';
      let cleanContent = this.cleanText(rawText);

      if (thoughtChain) {
        cleanContent = thoughtChain + cleanContent;
      }
      if (mediaText) {
        cleanContent += mediaText;
      }
      if (citationText) {
        cleanContent += citationText;
      }

      if (cleanContent.length > 0) {
        const codeBlocks = this.extractCodeBlocks(el);
        const timeEl = el.querySelector('time, [class*="timestamp"]');
        const timestamp = timeEl ? timeEl.textContent.trim() : '';

        messages.push({
          sender,
          content: cleanContent,
          timestamp,
          codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined
        });
      }
    });

    // Fallback if no structured turns were found
    if (messages.length === 0) {
      const fallbackNodes = document.querySelectorAll('div[dir="auto"], div[class*="markdown"], .prose');
      fallbackNodes.forEach((node, i) => {
        const text = this.cleanText(node.innerText || '');
        if (text && text.length > 2) {
          messages.push({
            sender: i % 2 === 0 ? 'user' : 'assistant',
            content: text,
            timestamp: ''
          });
        }
      });
    }

    const stats = this.calculateStats(messages);
    const completeness = this.checkCompleteness(messages);
    const rawTranscript = this.formatAsMarkdown({
      platform: this.platformName,
      title,
      url,
      extractedAt,
      messages,
      stats
    });

    return {
      platform: this.platformName,
      title,
      url,
      extractedAt,
      messages,
      rawTranscript,
      stats,
      completeness
    };
  }

  /**
   * Locates Meta AI's active composer textarea / input
   */
  findComposerElement() {
    return document.querySelector(
      'textarea[placeholder*="Ask Meta AI"], textarea[placeholder*="Ask anything"], textarea[placeholder*="Message"], textarea[aria-label*="Ask Meta AI"], div[contenteditable="true"][data-testid*="composer"], div[contenteditable="true"][aria-label*="Ask Meta AI"], div[contenteditable="true"][role="textbox"], textarea'
    );
  }

  /**
   * Extracts conversation title from navigation header or document title
   */
  extractTitle() {
    const navTitle = document.querySelector('nav a[aria-current="page"], [data-testid*="chat-title"], header h1, div[class*="selected"] [class*="title"]')?.textContent;
    if (navTitle && navTitle.trim().length > 0 && !navTitle.toLowerCase().includes('meta ai')) {
      return this.cleanText(navTitle);
    }

    const docTitle = document.title || 'Meta AI Session';
    return this.cleanText(
      docTitle
        .replace(/ - Meta AI$/i, '')
        .replace(/^Meta AI - /i, '')
        .replace(/ \| Meta AI$/i, '')
        .replace(/ - Meta$/i, '')
    );
  }
}

if (typeof window !== 'undefined') {
  window.MetaAIScraper = MetaAIScraper;
}
