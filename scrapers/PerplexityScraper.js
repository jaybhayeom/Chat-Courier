/**
 * ChatCourier - PerplexityScraper.js
 * Scraper implementation for Perplexity AI (www.perplexity.ai)
 */

class PerplexityScraper extends BaseScraper {
  constructor() {
    super('perplexity');
  }

  /**
   * Scrapes the active Perplexity AI search / thread session
   * @param {boolean} fastMode If true, skips virtualized scroll sweep
   */
  async scrape(fastMode = false) {
    const title = this.extractTitle();
    const url = window.location.href;
    const extractedAt = new Date().toISOString();

    const threadItems = await this.collectVirtualizedNodes(
      'main, div[class*="scroll-container"], div[class*="thread-container"]',
      'div[class*="group/query"], div[class*="prose"], div[data-testid="query-block"], div[data-testid="answer-block"], div[class*="thread-item"]',
      !fastMode
    );

    const messages = [];
    const elementsToProcess = threadItems.length > 0 ? threadItems : Array.from(document.querySelectorAll('div[class*="group/query"], div[class*="prose"], div[data-testid*="query"], div[data-testid*="answer"]'));

    elementsToProcess.forEach((el) => {
      let sender = 'assistant';
      const isQuery = el.className.includes('group/query') ||
                      el.getAttribute('data-testid')?.includes('query') ||
                      el.className.includes('query-container') ||
                      el.querySelector('h1, h2, [class*="font-display"]');

      const isAnswer = el.className.includes('prose') ||
                       el.getAttribute('data-testid')?.includes('answer') ||
                       el.querySelector('.prose, div[class*="answer"]');

      if (isQuery && !isAnswer) {
        sender = 'user';
      } else {
        sender = 'assistant';
      }

      let citationText = '';
      if (sender === 'assistant') {
        const citationLinks = el.querySelectorAll('a[class*="citation"], [data-testid="citation"], [class*="source"]');
        const sources = [];
        citationLinks.forEach(c => {
          const href = c.getAttribute('href');
          const citeTitle = c.textContent?.trim() || '';
          if (href && !sources.some(s => s.href === href)) {
            sources.push({ title: citeTitle, href });
          }
        });

        if (sources.length > 0) {
          citationText = `\n\n**Sources & Citations:**\n` + sources.map((s, idx) => `[${idx + 1}] [${s.title || s.href}](${s.href})`).join('\n');
        }
      }

      const clone = el.cloneNode(true);
      const uiControls = clone.querySelectorAll('button, svg, [role="button"], [class*="action-bar"], [class*="citation"]');
      uiControls.forEach(c => c.remove());

      const rawText = clone.innerText || clone.textContent || '';
      let cleanContent = this.cleanText(rawText);

      if (citationText) {
        cleanContent += citationText;
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
      const allProse = document.querySelectorAll('.prose, [class*="font-display"]');
      allProse.forEach((p, i) => {
        const text = this.cleanText(p.innerText || '');
        if (text) {
          messages.push({
            sender: i === 0 ? 'user' : 'assistant',
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
   * Locates Perplexity's active composer element
   */
  findComposerElement() {
    return document.querySelector('textarea[placeholder*="Ask"], textarea[placeholder*="Follow-up"], textarea');
  }

  /**
   * Extracts thread title from Perplexity UI
   */
  extractTitle() {
    const threadTitle = document.querySelector('h1, [data-testid="thread-title"], [class*="thread-title"]')?.textContent;
    if (threadTitle && threadTitle.trim().length > 0) {
      return this.cleanText(threadTitle);
    }

    const docTitle = document.title || 'Perplexity Thread';
    return this.cleanText(docTitle.replace(/ - Perplexity$/i, '').replace(/^Perplexity - /i, ''));
  }
}

if (typeof window !== 'undefined') {
  window.PerplexityScraper = PerplexityScraper;
}
