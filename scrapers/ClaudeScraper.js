/**
 * ChatCourier - ClaudeScraper.js
 * Scraper implementation for Anthropic Claude (claude.ai)
 */

class ClaudeScraper extends BaseScraper {
  constructor() {
    super('claude');
  }

  /**
   * Scrapes the active Claude AI chat session
   * @param {boolean} fastMode If true, skips virtualized scroll sweep
   */
  async scrape(fastMode = false) {
    const title = this.extractTitle();
    const url = window.location.href;
    const extractedAt = new Date().toISOString();

    const chatTurns = await this.collectVirtualizedNodes(
      'main div[class*="overflow-y-auto"], div[class*="flex-1 overflow-y-auto"], div[data-testid="chat-message-list"]',
      'div[data-testid="user-message"], div[data-testid="assistant-message"], div[class*="font-claude-message"], div[class*="font-user-message"]',
      !fastMode
    );

    const messages = [];
    const elementsToProcess = chatTurns.length > 0 ? chatTurns : Array.from(document.querySelectorAll('[data-testid="user-message"], [data-testid="assistant-message"], .font-claude-message, .font-user-message'));

    elementsToProcess.forEach((el) => {
      let sender = 'assistant';
      const isUser = el.matches('[data-testid="user-message"], .font-user-message, [class*="font-user-message"]') ||
                     el.getAttribute('data-testid') === 'user-message';

      const isAssistant = el.matches('.font-claude-message, [data-testid="assistant-message"], [class*="font-claude-message"]') ||
                          el.getAttribute('data-testid') === 'assistant-message';

      if (isUser && !isAssistant) {
        sender = 'user';
      } else if (isAssistant) {
        sender = 'assistant';
      } else {
        const hasHumanIcon = el.querySelector('svg[class*="user"], [class*="Human"], [aria-label*="Human"]');
        sender = hasHumanIcon ? 'user' : 'assistant';
      }

      // Look for Claude Artifacts
      let artifactContent = '';
      const artifactBlocks = el.querySelectorAll('[data-testid="artifact-block"], div[class*="ArtifactBlock"], div[class*="artifact-container"]');
      artifactBlocks.forEach(art => {
        const artTitle = art.querySelector('[class*="title"], [class*="header"]')?.textContent || 'Claude Artifact';
        const artCode = art.querySelector('pre, code')?.textContent || '';
        if (artCode) {
          artifactContent += `\n\n[Artifact: ${this.cleanText(artTitle)}]\n\`\`\`\n${this.cleanText(artCode)}\n\`\`\`\n`;
        }
      });

      let contentContainer = el.querySelector('.prose, div[class*="grid-cols-1"], div[class*="whitespace-pre-wrap"]') || el;
      const clone = contentContainer.cloneNode(true);

      const uiControls = clone.querySelectorAll('button, svg, [role="button"], [class*="text-xs"], [data-testid*="feedback"], [data-testid*="copy"]');
      uiControls.forEach(c => c.remove());

      const rawText = clone.innerText || clone.textContent || '';
      let cleanContent = this.cleanText(rawText);

      if (artifactContent) {
        cleanContent += artifactContent;
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
      const genericParagraphs = document.querySelectorAll('.prose, div[class*="font-claude"], div[class*="font-user"]');
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
   * Locates Claude's active composer element
   */
  findComposerElement() {
    return document.querySelector('div[contenteditable="true"][translate="no"], div[contenteditable="true"], textarea');
  }

  /**
   * Extracts conversation title from Claude UI
   */
  extractTitle() {
    const titleButton = document.querySelector('button[data-testid="chat-title-button"], div[class*="active-chat-title"], [data-testid="conversation-title"]');
    if (titleButton && titleButton.textContent.trim()) {
      return this.cleanText(titleButton.textContent);
    }

    const docTitle = document.title || 'Claude Conversation';
    return this.cleanText(docTitle.replace(/ - Claude$/i, '').replace(/^Claude - /i, ''));
  }
}

if (typeof window !== 'undefined') {
  window.ClaudeScraper = ClaudeScraper;
}
