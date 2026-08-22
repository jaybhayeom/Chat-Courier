/**
 * ChatCourier - ChatGPTScraper.js
 * Scraper implementation for OpenAI ChatGPT (chatgpt.com & chat.openai.com)
 */

class ChatGPTScraper extends BaseScraper {
  constructor() {
    super('chatgpt');
  }

  /**
   * Scrapes the active ChatGPT chat session
   * @param {boolean} fastMode If true, skips virtualized scroll sweep
   */
  async scrape(fastMode = false) {
    const title = this.extractTitle();
    const url = window.location.href;
    const extractedAt = new Date().toISOString();

    const articles = await this.collectVirtualizedNodes(
      'main div[class*="react-scroll-to-bottom"], main div[class*="overflow-y-auto"], div[role="presentation"]',
      'article, div[data-testid^="conversation-turn-"], div[class*="agent-turn"], div[class*="user-turn"]',
      !fastMode
    );

    const messages = [];
    const targetElements = articles.length > 0 ? articles : Array.from(document.querySelectorAll('article, div[data-testid^="conversation-turn-"]'));

    targetElements.forEach((turnEl) => {
      let sender = 'assistant';
      const roleAttr = turnEl.querySelector('[data-message-author-role]')?.getAttribute('data-message-author-role') ||
                       turnEl.getAttribute('data-message-author-role');

      if (roleAttr === 'user') {
        sender = 'user';
      } else if (roleAttr === 'assistant') {
        sender = 'assistant';
      } else {
        const isUserTurn = turnEl.querySelector('[data-testid="user-avatar"], [class*="user-message"], div[class*="bg-token-main-surface-secondary"]') ||
                           turnEl.getAttribute('data-testid')?.includes('user');
        const hasMarkdownProse = turnEl.querySelector('.markdown, .prose, div[class*="agent-turn"]');

        if (isUserTurn && !hasMarkdownProse) {
          sender = 'user';
        } else {
          sender = 'assistant';
        }
      }

      let contentEl = turnEl.querySelector('.markdown, .prose, div[class*="text-message"], div[class*="whitespace-pre-wrap"]') || turnEl;

      const clone = contentEl.cloneNode(true);
      const buttonsAndTools = clone.querySelectorAll('button, svg, [role="button"], [class*="gizmo-bot-avatar"], [class*="text-xs"], .sr-only, [data-testid*="copy"]');
      buttonsAndTools.forEach(b => b.remove());

      const rawText = clone.innerText || clone.textContent || '';
      const cleanContent = this.cleanText(rawText);

      if (cleanContent.length > 0) {
        const codeBlocks = this.extractCodeBlocks(turnEl);
        const timeEl = turnEl.querySelector('time, [class*="timestamp"]');
        const timestamp = timeEl ? timeEl.textContent.trim() : '';

        messages.push({
          sender,
          content: cleanContent,
          timestamp,
          codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined
        });
      }
    });

    // Fallback if no structured articles were found
    if (messages.length === 0) {
      const fallbackNodes = document.querySelectorAll('.whitespace-pre-wrap, .markdown');
      fallbackNodes.forEach((node, i) => {
        const text = this.cleanText(node.innerText || '');
        if (text) {
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
    const rawTranscript = this.formatAsMarkdown({ platform: this.platformName, title, url, extractedAt, messages, stats });

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
   * Locates the active ChatGPT composer textarea
   */
  findComposerElement() {
    return document.querySelector('#prompt-textarea, textarea[data-id="root"], div[contenteditable="true"][id="prompt-textarea"], textarea');
  }

  /**
   * Extracts conversation title from header or document title
   */
  extractTitle() {
    const headerTitle = document.querySelector('header h1, nav [class*="active"] [class*="title"], nav a[class*="bg-token-sidebar-surface-secondary"] div')?.textContent;
    if (headerTitle && headerTitle.trim().length > 0 && !headerTitle.toLowerCase().includes('chatgpt')) {
      return this.cleanText(headerTitle);
    }

    const docTitle = document.title || 'ChatGPT Session';
    return this.cleanText(docTitle.replace(/ - ChatGPT$/i, '').replace(/^ChatGPT - /i, ''));
  }
}

if (typeof window !== 'undefined') {
  window.ChatGPTScraper = ChatGPTScraper;
}
