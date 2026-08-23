/**
 * ChatCourier - popup.js
 * Action Popup Controller: Capsule Toolbar, Template Execution & Shared Clipboard Utility
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements: Header & Status
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const btnOpenOptions = document.getElementById('btn-open-options');
  const detectedPlatformBadge = document.getElementById('detected-platform-badge');
  const activeProfileTag = document.getElementById('active-profile-tag');
  const personaSelect = document.getElementById('persona-select');
  const linkManagePersonas = document.getElementById('link-manage-personas');

  // Metrics & Warnings
  const statMessages = document.getElementById('stat-messages');
  const statWords = document.getElementById('stat-words');
  const statTokens = document.getElementById('stat-tokens');
  const completenessWarning = document.getElementById('completeness-warning');
  const completenessWarningText = document.getElementById('completeness-warning-text');

  // Toolbar Actions
  const btnSummarize = document.getElementById('btn-summarize');
  const btnRewriter = document.getElementById('btn-rewriter');
  const btnDownload = document.getElementById('btn-download');
  const btnPreview = document.getElementById('btn-preview');
  const btnHistory = document.getElementById('btn-history');
  const btnThinking = document.getElementById('btn-thinking');
  const btnThinkingCaret = document.getElementById('btn-thinking-caret');
  const btnAutosuggest = document.getElementById('btn-autosuggest');
  const thinkingDepthPopover = document.getElementById('thinking-depth-popover');
  const depthOptions = document.querySelectorAll('.depth-opt');

  // Views
  const viewMain = document.getElementById('view-main');
  const viewRewriter = document.getElementById('view-rewriter');
  const viewHistory = document.getElementById('view-history');
  const skeletonLoader = document.getElementById('skeleton-loader');
  const outputCard = document.getElementById('output-card');
  const outputCardTitle = document.getElementById('output-card-title');
  const outputContent = document.getElementById('output-content');
  const btnCopyDigest = document.getElementById('btn-copy-digest');
  const btnDownloadDigest = document.getElementById('btn-download-digest');

  // Rewriter View Elements
  const btnBackRewriter = document.getElementById('btn-back-rewriter');
  const rewriterInput = document.getElementById('rewriter-input');
  const btnSubmitRewriter = document.getElementById('btn-submit-rewriter');
  const rewriterSkeleton = document.getElementById('rewriter-skeleton');
  const rewriterOutputCard = document.getElementById('rewriter-output-card');
  const rewriterOutputContent = document.getElementById('rewriter-output-content');
  const btnInsertRewrite = document.getElementById('btn-insert-rewrite');
  const btnRetryRewrite = document.getElementById('btn-retry-rewrite');
  const btnCopyRewrite = document.getElementById('btn-copy-rewrite');
  const btnDownloadRewrite = document.getElementById('btn-download-rewrite');

  // History View Elements
  const btnBackHistory = document.getElementById('btn-back-history');
  const btnClearHistory = document.getElementById('btn-clear-history');
  const historyFilterPills = document.getElementById('history-filter-pills');
  const historyList = document.getElementById('history-list');

  // Feedback Footer
  const feedbackBar = document.getElementById('feedback-bar');
  const feedbackText = document.getElementById('feedback-text');

  // App State
  let config = null;
  let activeTabId = null;
  let activeTabUrl = '';
  let activePlatform = 'generic';
  let activeSessionData = null;
  let activeDigest = null;
  let lastRewrittenPrompt = null;
  let hasValidApiKey = false;
  let currentHistoryFilter = 'all';

  // Rewriter Glow State
  let popupRewriterGlowState = 'default';
  let popupRewriterSafetyTimer = null;

  function setPopupRewriterGlow(state) {
    popupRewriterGlowState = state;
    if (popupRewriterSafetyTimer) {
      clearTimeout(popupRewriterSafetyTimer);
      popupRewriterSafetyTimer = null;
    }

    if (!btnRewriter) return;

    if (state === 'generating') {
      btnRewriter.classList.remove('is-ready', 'is-used');
      btnRewriter.classList.add('is-generating');
    } else if (state === 'ready') {
      btnRewriter.classList.remove('is-generating', 'is-used');
      btnRewriter.classList.add('is-ready');

      popupRewriterSafetyTimer = setTimeout(() => {
        setPopupRewriterGlow('default');
      }, 10 * 60 * 1000);
    } else if (state === 'used') {
      btnRewriter.classList.remove('is-generating', 'is-ready');
      btnRewriter.classList.add('is-used');
      setTimeout(() => {
        setPopupRewriterGlow('default');
      }, 250);
    } else {
      btnRewriter.classList.remove('is-generating', 'is-ready', 'is-used');
    }
  }

  // ─── Shared Fresh-Activation Clipboard Utility ───
  async function copyResultToClipboard(text, sourceBtn, kind = 'digest', recordHistory = true) {
    if (!text || text.trim().length === 0) return false;

    let copied = false;

    // 1. Direct Clipboard API (immediate user click activation)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (clipErr) {
      console.warn('[ChatCourier] Clipboard API write failed, attempting execCommand fallback:', clipErr);
    }

    // 2. Fallback via off-screen textarea
    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (execErr) {
        console.error('[ChatCourier] execCommand fallback copy error:', execErr);
      }
    }

    if (copied) {
      if (recordHistory) {
        // Log to ChatCourier local clipboard history
        chrome.runtime.sendMessage({
          action: 'ADD_CLIPBOARD_ITEM',
          payload: {
            kind,
            fullText: text,
            sourcePlatform: activePlatform
          }
        });
      }

      // Visual button feedback
      if (sourceBtn) {
        const originalHtml = sourceBtn.innerHTML;
        sourceBtn.classList.add('copied');
        sourceBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Copied!</span>
        `;
        setTimeout(() => {
          sourceBtn.classList.remove('copied');
          sourceBtn.innerHTML = originalHtml;
        }, 2000);
      }

      showFeedback('Copied to clipboard', 'success');
      return true;
    } else {
      showFeedback('Unable to copy text', 'error');
      return false;
    }
  }

  // ─── Feedback & Download Helpers ───
  function showFeedback(text, type = 'info', durationMs = 3500) {
    feedbackText.textContent = text;
    feedbackBar.className = `feedback-bar ${type}`;
    if (durationMs > 0) {
      setTimeout(() => {
        feedbackText.textContent = 'Ready';
        feedbackBar.className = 'feedback-bar';
      }, durationMs);
    }
  }

  function downloadText(filename, content, type = 'text/markdown') {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showFeedback('Downloaded file', 'success');
  }

  // ─── View Routing ───
  function switchView(viewName) {
    viewMain.classList.add('hidden');
    viewRewriter.classList.add('hidden');
    viewHistory.classList.add('hidden');
    thinkingDepthPopover.classList.add('hidden');

    if (viewName === 'rewriter') {
      viewRewriter.classList.remove('hidden');
      prefillRewriterInput();
    } else if (viewName === 'history') {
      viewHistory.classList.remove('hidden');
      renderHistoryView();
    } else {
      viewMain.classList.remove('hidden');
    }
  }

  // ─── Configuration Loader ───
  async function loadConfig() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'GET_CONFIG' }, (response) => {
        if (response && response.success && response.config) {
          config = response.config;
          hasValidApiKey = response.hasKey;

          if (hasValidApiKey) {
            statusIndicator.classList.add('ready');
            statusText.textContent = 'API Ready';
          } else {
            statusIndicator.classList.remove('ready');
            statusText.textContent = 'API Key Needed';
          }

          if (response.activeProfile) {
            activeProfileTag.textContent = response.activeProfile.name || response.activeProfile.modelId || 'Default';
          }

          // Populate personas dropdown
          renderPersonasDropdown(config.personas || [], config.activePersonaId);

          // Update toggle button states
          const settings = config.settings || {};
          btnThinking.classList.toggle('active', Boolean(settings.thinkingModeEnabled));
          btnAutosuggest.classList.toggle('active', Boolean(settings.autoSuggestEnabled));

          // Set active depth preset
          const depth = settings.thinkingModeDepth || 'standard';
          depthOptions.forEach(opt => {
            opt.classList.toggle('active', opt.dataset.depth === depth);
          });
        }
        resolve();
      });
    });
  }

  function renderPersonasDropdown(personas, activeId) {
    personaSelect.innerHTML = '<option value="">Standard Mode</option>';
    personas.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.name;
      if (p.id === activeId) opt.selected = true;
      personaSelect.appendChild(opt);
    });
  }

  personaSelect.addEventListener('change', () => {
    const selectedId = personaSelect.value || null;
    chrome.runtime.sendMessage({
      action: 'SET_ACTIVE_PERSONA',
      payload: { personaId: selectedId }
    }, () => {
      showFeedback(selectedId ? 'Persona updated' : 'Standard mode selected');
      loadConfig();
    });
  });

  linkManagePersonas.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS', payload: { hash: 'personas' } });
  });

  btnOpenOptions.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
  });

  statusIndicator.addEventListener('click', () => {
    if (!hasValidApiKey) chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
  });

  // ─── Script Injection Fallback ───
  function isInjectableUrl(url) {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('http://') || url.startsWith('https://');
  }

  async function ensureContentScriptInjected(tabId, url) {
    if (!isInjectableUrl(url)) return false;
    try {
      if (chrome.scripting && chrome.scripting.executeScript) {
        await chrome.scripting.insertCSS({ target: { tabId }, files: ['content.css'] }).catch(() => {});
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [
            'scrapers/BaseScraper.js',
            'scrapers/ChatGPTScraper.js',
            'scrapers/ClaudeScraper.js',
            'scrapers/GeminiScraper.js',
            'scrapers/PerplexityScraper.js',
            'scrapers/DeepSeekScraper.js',
            'content.js'
          ]
        }).catch(() => {});
        return true;
      }
    } catch (e) {
      // Intentionally calm — expected for restricted frames
    }
    return false;
  }

  function querySessionFromTab(tabId, url) {
    if (!isInjectableUrl(url)) return Promise.resolve(null);
    const fastMode = Boolean(config?.settings?.fastMode);
    return new Promise((resolve) => {
      try {
        chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_SESSION_REQUEST', payload: { fastMode } }, async (response) => {
          const err = chrome.runtime.lastError;
          if (err || !response || !response.success) {
            const injected = await ensureContentScriptInjected(tabId, url);
            if (injected) {
              setTimeout(() => {
                try {
                  chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_SESSION_REQUEST', payload: { fastMode } }, (retryRes) => {
                    const retryErr = chrome.runtime.lastError;
                    resolve(retryRes?.success ? retryRes : null);
                  });
                } catch (_) {
                  resolve(null);
                }
              }, 250);
            } else {
              resolve(null);
            }
          } else {
            resolve(response);
          }
        });
      } catch (_) {
        resolve(null);
      }
    });
  }

  // ─── Active Tab Inspection ───
  async function inspectActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      detectedPlatformBadge.textContent = 'No Tab';
      return;
    }
    activeTabId = tab.id;
    activeTabUrl = tab.url || '';

    const url = activeTabUrl;
    if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
      activePlatform = 'chatgpt';
      detectedPlatformBadge.textContent = 'ChatGPT';
    } else if (url.includes('claude.ai')) {
      activePlatform = 'claude';
      detectedPlatformBadge.textContent = 'Claude';
    } else if (url.includes('gemini.google.com')) {
      activePlatform = 'gemini';
      detectedPlatformBadge.textContent = 'Gemini';
    } else if (url.includes('perplexity.ai')) {
      activePlatform = 'perplexity';
      detectedPlatformBadge.textContent = 'Perplexity';
    } else if (url.includes('deepseek.com')) {
      activePlatform = 'deepseek';
      detectedPlatformBadge.textContent = 'DeepSeek';
    } else {
      activePlatform = 'generic';
      detectedPlatformBadge.textContent = 'Web Chat';
    }

    try {
      const response = await querySessionFromTab(activeTabId, activeTabUrl);
      if (response && response.success) {
        activeSessionData = response.session;
        updateStatsDisplay(activeSessionData.stats);

        // Check completeness warning
        if (activeSessionData.completeness && !activeSessionData.completeness.isComplete) {
          completenessWarningText.textContent = activeSessionData.completeness.warning;
          completenessWarning.classList.remove('hidden');
        } else {
          completenessWarning.classList.add('hidden');
        }
      }
    } catch (e) {
      console.warn('[ChatCourier] Tab query error:', e);
    }
  }

  function updateStatsDisplay(stats) {
    if (!stats) return;
    statMessages.textContent = stats.messageCount || 0;
    statWords.textContent = stats.approxWordCount ? stats.approxWordCount.toLocaleString() : 0;
    statTokens.textContent = stats.approxTokenCount ? stats.approxTokenCount.toLocaleString() : 0;
  }

  // ─── 1. Summarize for Handoff ───
  btnSummarize.addEventListener('click', async () => {
    if (!hasValidApiKey) {
      showFeedback('API Key required! Opening settings...', 'error');
      setTimeout(() => chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' }), 1000);
      return;
    }

    switchView('main');
    skeletonLoader.classList.remove('hidden');
    outputCard.classList.add('hidden');
    btnSummarize.classList.add('loading');
    showFeedback('Synthesizing Context Digest...', 'info', 0);

    try {
      let transcriptText = activeSessionData ? activeSessionData.rawTranscript : '';
      if (!transcriptText && activeTabId) {
        const extractRes = await querySessionFromTab(activeTabId, activeTabUrl);
        if (extractRes && extractRes.success) {
          activeSessionData = extractRes.session;
          transcriptText = activeSessionData.rawTranscript;
          updateStatsDisplay(activeSessionData.stats);
        }
      }

      if (!transcriptText) {
        throw new Error('Unable to extract chat transcript from active tab.');
      }

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'RUN_TEMPLATE',
          payload: {
            templateId: 'digest',
            userContent: transcriptText,
            extra: {
              personaId: personaSelect.value || null
            }
          }
        }, resolve);
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Summarization failed');
      }

      activeDigest = response.summary;
      outputCardTitle.textContent = 'Context Handoff Digest';
      outputContent.textContent = activeDigest;
      outputCard.classList.remove('hidden');
      skeletonLoader.classList.add('hidden');

      showFeedback('Digest synthesized. Click Copy to save to clipboard.', 'success');
    } catch (err) {
      console.error('[ChatCourier] Summarize error:', err);
      skeletonLoader.classList.add('hidden');
      showFeedback(`Error: ${err.message}`, 'error', 5000);
    } finally {
      btnSummarize.classList.remove('loading');
    }
  });

  btnCopyDigest.addEventListener('click', () => {
    copyResultToClipboard(outputContent.textContent, btnCopyDigest, 'digest');
  });

  btnDownloadDigest.addEventListener('click', () => {
    const text = outputContent.textContent;
    if (text) {
      const safeTitle = (activeSessionData?.title || 'context_digest').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      downloadText(`${safeTitle}_handoff_digest.md`, text);
    }
  });

  // ─── 2. Prompt Rewriter View ───
  btnRewriter.addEventListener('click', () => {
    switchView('rewriter');
  });

  btnBackRewriter.addEventListener('click', () => {
    switchView('main');
  });

  async function prefillRewriterInput() {
    if (activeTabId && isInjectableUrl(activeTabUrl) && !rewriterInput.value) {
      try {
        chrome.tabs.sendMessage(activeTabId, { action: 'GET_COMPOSER_TEXT' }, (res) => {
          const err = chrome.runtime.lastError;
          if (!err && res && res.text && res.text.trim().length > 0) {
            rewriterInput.value = res.text.trim();
          }
        });
      } catch (_) {}
    }
  }

  async function executePromptRewrite() {
    const rawPrompt = rewriterInput.value.trim();
    if (!rawPrompt) {
      showFeedback('Please enter a draft prompt to rewrite.', 'error');
      return;
    }

    if (!hasValidApiKey) {
      showFeedback('API Key required! Opening settings...', 'error');
      setTimeout(() => chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' }), 1000);
      return;
    }

    rewriterSkeleton.classList.remove('hidden');
    rewriterOutputCard.classList.add('hidden');
    btnSubmitRewriter.classList.add('loading');
    setPopupRewriterGlow('generating');
    showFeedback('Enhancing prompt...', 'info', 0);

    try {
      let conversationContext = activeSessionData ? activeSessionData.rawTranscript : '';
      if (!conversationContext && activeTabId && isInjectableUrl(activeTabUrl)) {
        try {
          const extractRes = await querySessionFromTab(activeTabId, activeTabUrl);
          if (extractRes && extractRes.success && extractRes.session) {
            activeSessionData = extractRes.session;
            conversationContext = activeSessionData.rawTranscript;
          }
        } catch (_) {}
      }

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'RUN_TEMPLATE',
          payload: {
            templateId: 'rewriter',
            userContent: rawPrompt,
            conversationContext: conversationContext || null,
            extra: {
              personaId: personaSelect.value || null,
              conversationContext: conversationContext || null
            }
          }
        }, resolve);
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Rewrite failed');
      }

      lastRewrittenPrompt = response.summary;
      rewriterOutputContent.textContent = lastRewrittenPrompt;
      rewriterOutputCard.classList.remove('hidden');
      rewriterSkeleton.classList.add('hidden');
      setPopupRewriterGlow('ready');
      showFeedback('Prompt enhanced! Insert into chat or copy.', 'success');
    } catch (err) {
      rewriterSkeleton.classList.add('hidden');
      setPopupRewriterGlow('default');
      showFeedback(`Rewrite error: ${err.message}`, 'error', 5000);
    } finally {
      btnSubmitRewriter.classList.remove('loading');
    }
  }

  btnSubmitRewriter.addEventListener('click', executePromptRewrite);
  btnRetryRewrite.addEventListener('click', executePromptRewrite);

  if (btnInsertRewrite) {
    btnInsertRewrite.addEventListener('click', async () => {
      const text = rewriterOutputContent.textContent;
      if (!text) return;

      if (activeTabId && isInjectableUrl(activeTabUrl)) {
        try {
          chrome.tabs.sendMessage(activeTabId, { action: 'INSERT_INTO_COMPOSER', payload: { text } }, (res) => {
            const err = chrome.runtime.lastError;
            if (!err && res && res.success) {
              setPopupRewriterGlow('used');
              showFeedback('Inserted into chat composer', 'success');
            } else {
              copyResultToClipboard(text, btnInsertRewrite, 'rewrite');
              showFeedback('Could not insert directly. Copied to clipboard.', 'info');
            }
          });
        } catch (_) {
          copyResultToClipboard(text, btnInsertRewrite, 'rewrite');
        }
      } else {
        copyResultToClipboard(text, btnInsertRewrite, 'rewrite');
      }
    });
  }

  btnCopyRewrite.addEventListener('click', () => {
    copyResultToClipboard(rewriterOutputContent.textContent, btnCopyRewrite, 'rewrite');
  });

  btnDownloadRewrite.addEventListener('click', () => {
    const text = rewriterOutputContent.textContent;
    if (text) {
      downloadText('enhanced_prompt.md', text);
    }
  });

  // ─── 3. Download Transcript ───
  btnDownload.addEventListener('click', async () => {
    try {
      if (!activeSessionData && activeTabId) {
        const res = await querySessionFromTab(activeTabId, activeTabUrl);
        if (res && res.success) activeSessionData = res.session;
      }
      const text = activeDigest || activeSessionData?.rawTranscript;
      if (!text) {
        showFeedback('No transcript or digest available to download.', 'error');
        return;
      }
      const safeTitle = (activeSessionData?.title || 'chat_transcript').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      downloadText(`${safeTitle}.md`, text);
    } catch (e) {
      showFeedback(e.message, 'error');
    }
  });

  // ─── 4. Preview Context ───
  btnPreview.addEventListener('click', async () => {
    switchView('main');
    if (!activeSessionData && activeTabId) {
      const res = await querySessionFromTab(activeTabId, activeTabUrl);
      if (res && res.success) activeSessionData = res.session;
    }
    const text = activeDigest || activeSessionData?.rawTranscript;
    if (!text) {
      showFeedback('No context extracted from active tab.', 'error');
      return;
    }
    outputCardTitle.textContent = activeDigest ? 'Context Handoff Digest (Preview)' : 'Raw Transcript (Preview)';
    outputContent.textContent = text;
    outputCard.classList.remove('hidden');
    skeletonLoader.classList.add('hidden');
  });

  // ─── 5. Clipboard History View ───
  btnHistory.addEventListener('click', () => {
    switchView('history');
  });

  btnBackHistory.addEventListener('click', () => {
    switchView('main');
  });

  function formatRelativeTime(ts) {
    if (!ts) return '';
    const diffSec = Math.floor((Date.now() - ts) / 1000);
    if (diffSec < 45) return 'just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    const diffDays = Math.floor(diffHour / 24);
    return `${diffDays}d ago`;
  }

  function renderHistoryView() {
    chrome.runtime.sendMessage({ action: 'GET_CONFIG' }, (res) => {
      const history = res?.config?.clipboardHistory || [];
      historyList.innerHTML = '';
      if (historyFilterPills) historyFilterPills.innerHTML = '';

      if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No items copied yet.</div>';
        return;
      }

      const platformLabels = {
        'chatgpt': 'ChatGPT',
        'claude': 'Claude',
        'gemini': 'Gemini',
        'perplexity': 'Perplexity',
        'deepseek': 'DeepSeek',
        'rewriter': 'Rewrite',
        'thinking': 'Thinking',
        'generic': 'Web Chat'
      };

      // 1. Gather all unique sources present
      const presentSources = new Set();
      history.forEach(item => {
        const src = item.sourcePlatform || (item.kind === 'rewrite' ? 'rewriter' : 'generic');
        presentSources.add(src);
      });

      // 2. Render filter pills (All + only tools with entries)
      if (historyFilterPills) {
        const allPill = document.createElement('button');
        allPill.className = `history-pill ${currentHistoryFilter === 'all' ? 'active' : ''}`;
        allPill.textContent = 'All';
        allPill.addEventListener('click', (e) => {
          e.stopPropagation();
          currentHistoryFilter = 'all';
          renderHistoryView();
        });
        historyFilterPills.appendChild(allPill);

        presentSources.forEach(src => {
          const pill = document.createElement('button');
          pill.className = `history-pill ${currentHistoryFilter === src ? 'active' : ''}`;
          pill.textContent = platformLabels[src] || (src.charAt(0).toUpperCase() + src.slice(1));
          pill.addEventListener('click', (e) => {
            e.stopPropagation();
            currentHistoryFilter = src;
            renderHistoryView();
          });
          historyFilterPills.appendChild(pill);
        });
      }

      // 3. Filter items
      const filtered = currentHistoryFilter === 'all'
        ? history
        : history.filter(item => {
            const src = item.sourcePlatform || (item.kind === 'rewrite' ? 'rewriter' : 'generic');
            return src === currentHistoryFilter;
          });

      if (filtered.length === 0) {
        historyList.innerHTML = '<div class="empty-state">No entries in this filter.</div>';
        return;
      }

      // 4. Render rows with in-place copy
      filtered.forEach(item => {
        const row = document.createElement('div');
        row.className = 'history-row';
        row.dataset.id = item.id;

        const src = item.sourcePlatform || (item.kind === 'rewrite' ? 'rewriter' : 'generic');
        const label = platformLabels[src] || (item.kind || 'digest').toUpperCase();
        const timeStr = formatRelativeTime(item.copiedAt);
        const cleanFirstLine = (item.preview || '').replace(/^[#>\s*-]+/, '').trim().slice(0, 65);

        row.innerHTML = `
          <div class="history-meta">
            <div class="history-source-wrap">
              <span class="history-source-dot ${escapeHtml(src)}"></span>
              <span class="history-source-label">${escapeHtml(label)}</span>
            </div>
            <span class="history-time">${escapeHtml(timeStr)}</span>
          </div>
          <div class="history-preview">${escapeHtml(cleanFirstLine || item.preview || '')}</div>
        `;

        row.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          copyResultToClipboard(item.fullText, null, item.kind, false);

          const oldBadge = row.querySelector('.history-row-copied-badge');
          if (oldBadge) oldBadge.remove();
          const badge = document.createElement('span');
          badge.className = 'history-row-copied-badge';
          badge.textContent = 'Copied!';
          row.appendChild(badge);
          row.classList.add('copied');
          setTimeout(() => {
            badge.remove();
            row.classList.remove('copied');
          }, 1500);
        });

        historyList.appendChild(row);
      });
    });
  }

  btnClearHistory.addEventListener('click', () => {
    if (confirm('Clear all ChatCourier clipboard history?')) {
      chrome.runtime.sendMessage({ action: 'CLEAR_CLIPBOARD_HISTORY' }, () => {
        renderHistoryView();
        showFeedback('History cleared');
      });
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── 6. Thinking Mode Toggle & Depth Popover ───
  btnThinking.addEventListener('click', () => {
    const isNowActive = !btnThinking.classList.contains('active');
    btnThinking.classList.toggle('active', isNowActive);
    chrome.runtime.sendMessage({
      action: 'SAVE_SETTINGS',
      payload: { thinkingModeEnabled: isNowActive }
    }, () => {
      showFeedback(isNowActive ? 'Thinking Mode enabled' : 'Thinking Mode disabled');
    });
  });

  btnThinkingCaret.addEventListener('click', (e) => {
    e.stopPropagation();
    thinkingDepthPopover.classList.toggle('hidden');
  });

  depthOptions.forEach(opt => {
    opt.addEventListener('click', () => {
      const depth = opt.dataset.depth;
      depthOptions.forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      thinkingDepthPopover.classList.add('hidden');

      // Enable thinking mode if selecting depth
      btnThinking.classList.add('active');

      chrome.runtime.sendMessage({
        action: 'SAVE_SETTINGS',
        payload: {
          thinkingModeEnabled: true,
          thinkingModeDepth: depth
        }
      }, () => {
        showFeedback(`Thinking depth set to: ${opt.textContent}`);
      });
    });
  });

  document.addEventListener('click', (e) => {
    if (!thinkingDepthPopover.contains(e.target) && e.target !== btnThinkingCaret) {
      thinkingDepthPopover.classList.add('hidden');
    }
  });

  // ─── 7. Auto-Suggest Next Steps Toggle ───
  btnAutosuggest.addEventListener('click', () => {
    const isNowActive = !btnAutosuggest.classList.contains('active');
    btnAutosuggest.classList.toggle('active', isNowActive);
    chrome.runtime.sendMessage({
      action: 'SAVE_SETTINGS',
      payload: { autoSuggestEnabled: isNowActive }
    }, () => {
      showFeedback(isNowActive ? 'Auto-Suggested Next Steps enabled' : 'Auto-Suggested Next Steps disabled');
    });
  });

  // Initial Boot
  await loadConfig();
  await inspectActiveTab();
});
