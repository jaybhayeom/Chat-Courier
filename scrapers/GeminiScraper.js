/**
 * ChatCourier - GeminiScraper.js
 * Scraper implementation for Google Gemini (gemini.google.com)
 */

class GeminiScraper extends BaseScraper {
  constructor() {
    super('gemini');
  }

  /**
   * Scrapes the active Google Gemini chat session
   * @param {boolean} fastMode If true, skips virtualized scroll sweep
   */
  async scrape(fastMode = false) {
    const title = this.extractTitle();
    const url = window.location.href;
    const extractedAt = new Date().toISOString();

    const elements = await this.collectVirtualizedNodes(
      'main, infinite-scroller, div[class*="conversation-container"], div[class*="chat-history"]',
      'user-query, model-response, div[class*="user-query-container"], div[class*="model-response-container"], chat-turn, conversation-turn',
      !fastMode
    );

    const messages = [];
    const elementsToProcess = elements.length > 0 ? elements : Array.from(document.querySelectorAll('user-query, model-response, div[class*="user-query-container"], div[class*="model-response-container"], message-content'));

    elementsToProcess.forEach((el) => {
      const tagName = el.tagName.toLowerCase();
      let sender = 'assistant';

      if (tagName === 'user-query' || el.matches('[class*="user-query"], [class*="user_query"], [class*="userQuery"]') || el.querySelector('user-query')) {
        sender = 'user';
      } else if (tagName === 'model-response' || el.matches('[class*="model-response"], [class*="model_response"], [class*="modelResponse"]') || el.querySelector('model-response')) {
        sender = 'assistant';
      } else {
        const hasUserQuery = el.querySelector('user-query, .query-text, [class*="user"]');
        const hasModelResponse = el.querySelector('model-response, .markdown, [class*="response"]');
        if (hasUserQuery && !hasModelResponse) {
          sender = 'user';
        } else {
          sender = 'assistant';
        }
      }

      let contentContainer = el.querySelector('message-content, expandable-text, .markdown, .response-text, .query-text') || el;
      const clone = contentContainer.cloneNode(true);
      const uiButtons = clone.querySelectorAll('button, mat-icon, [role="button"], [class*="action-buttons"], [class*="citation-item"]');
      uiButtons.forEach(b => b.remove());

      const rawText = clone.innerText || clone.textContent || '';
      const cleanContent = this.cleanText(rawText);

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
      const fallbackContainers = document.querySelectorAll('.markdown, div[class*="query-content"], div[class*="response-content"]');
      fallbackContainers.forEach((el, i) => {
        const text = this.cleanText(el.innerText || '');
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
   * Locates Gemini's active composer element
   */
  findComposerElement() {
    return document.querySelector('.rich-textarea div[contenteditable="true"], div[contenteditable="true"][aria-label*="prompt"], textarea');
  }

  /**
   * Extracts conversation title from Gemini UI
   */
  extractTitle() {
    const navTitle = document.querySelector('[class*="conversation-title"], [aria-selected="true"] [class*="title-text"], header h1')?.textContent;
    if (navTitle && navTitle.trim().length > 0) {
      return this.cleanText(navTitle);
    }

    const docTitle = document.title || 'Gemini Conversation';
    return this.cleanText(docTitle.replace(/ - Gemini$/i, '').replace(/^Gemini - /i, ''));
  }
}

if (typeof window !== 'undefined') {
  window.GeminiScraper = GeminiScraper;
}
