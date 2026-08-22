/**
 * ChatCourier - DeepSeekScraper.js
 * Scraper implementation for DeepSeek AI (chat.deepseek.com)
 */

class DeepSeekScraper extends BaseScraper {
  constructor() {
    super('deepseek');
  }

  /**
   * Scrapes the active DeepSeek AI chat session
   * @param {boolean} fastMode If true, skips virtualized scroll sweep
   */
  async scrape(fastMode = false) {
    const title = this.extractTitle();
    const url = window.location.href;
    const extractedAt = new Date().toISOString();

    const chatNodes = await this.collectVirtualizedNodes(
      'main, div[class*="chat-container"], div[class*="chat-session"], div[class*="virtualized-list"]',
      'div[class*="chat-message"], div[class*="message-item"], div[class*="chat-turn"], div[class*="ds-message"]',
      !fastMode
    );

    const messages = [];
    const elementsToProcess = chatNodes.length > 0 ? chatNodes : Array.from(document.querySelectorAll('div[class*="chat-message"], div[class*="message-item"], div[class*="chat-turn"], div[class*="ds-message"]'));

    elementsToProcess.forEach((el) => {
      let sender = 'assistant';
      const isUser = el.className.includes('user') ||
                     el.getAttribute('data-role') === 'user' ||
                     el.querySelector('div[class*="user"], [class*="avatar-user"], [data-testid="user-avatar"]') ||
                     el.querySelector('[class*="user-bubble"], [class*="user-query"]');

      const isAssistant = el.className.includes('assistant') ||
                          el.className.includes('bot') ||
                          el.getAttribute('data-role') === 'assistant' ||
                          el.querySelector('div[class*="assistant"], [class*="avatar-bot"], [class*="ds-markdown"]');

      if (isUser && !isAssistant) {
        sender = 'user';
      } else {
        sender = 'assistant';
      }

      // Look for reasoning / thinking chains in DeepSeek R1 / V3
      let thoughtChain = '';
      const thoughtBlock = el.querySelector('div[class*="ds-think"], div[class*="thinking"], div[class*="reasoning"], div[class*="thought-process"]');
      if (thoughtBlock) {
        const rawThought = thoughtBlock.innerText || thoughtBlock.textContent || '';
        if (rawThought.trim().length > 0) {
          thoughtChain = `\n> **DeepSeek Reasoning Process:**\n> ${this.cleanText(rawThought).replace(/\n/g, '\n> ')}\n\n`;
        }
      }

      const contentEl = el.querySelector('div[class*="ds-markdown"], div[class*="markdown"], div[class*="content"], div[class*="message-content"]') || el;
      const clone = contentEl.cloneNode(true);

      const buttons = clone.querySelectorAll('button, svg, [role="button"], [class*="action-bar"], [class*="feedback"], [class*="ds-icon-button"], div[class*="ds-think"]');
      buttons.forEach(b => b.remove());

      const rawText = clone.innerText || clone.textContent || '';
      let cleanContent = this.cleanText(rawText);

      if (thoughtChain) {
        cleanContent = thoughtChain + cleanContent;
      }

      if (cleanContent.length > 0) {
        const codeBlocks = this.extractCodeBlocks(el);
        messages.push({
          sender,
          content: cleanContent,
          timestamp: '',
          codeBlocks: codeBlocks.length > 0 ? codeBlocks : undefined
        });
      }
    });

    if (messages.length === 0) {
      const genericParagraphs = document.querySelectorAll('div[class*="ds-markdown"], div[class*="markdown-body"]');
      genericParagraphs.forEach((p, i) => {
        const text = this.cleanText(p.innerText || '');
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
   * Locates DeepSeek's active composer element
   */
  findComposerElement() {
    return document.querySelector('textarea#chat-input, textarea[placeholder*="DeepSeek"], textarea');
  }

  /**
   * Extracts conversation title from DeepSeek UI
   */
  extractTitle() {
    const activeNavTitle = document.querySelector('div[class*="session-item"][class*="active"], div[class*="history-item"][class*="selected"], header div[class*="title"]')?.textContent;
    if (activeNavTitle && activeNavTitle.trim().length > 0) {
      return this.cleanText(activeNavTitle);
    }

    const docTitle = document.title || 'DeepSeek Conversation';
    return this.cleanText(docTitle.replace(/ - DeepSeek$/i, '').replace(/^DeepSeek - /i, ''));
  }
}

if (typeof window !== 'undefined') {
  window.DeepSeekScraper = DeepSeekScraper;
}
