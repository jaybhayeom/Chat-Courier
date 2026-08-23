/**
 * ChatCourier - content.js
 * In-Page Companion: Draggable Orb, Capsule Drawer Toolbar & Platform Scraper
 * Strict Motion System & Resilient Error Contract
 */

(function () {
  'use strict';

  if (window.__chatCourierLoaded) return;
  window.__chatCourierLoaded = true;

  // Platform & Scraper State
  let currentPlatform = 'generic';
  let activeScraper = null;
  let cachedSession = null;
  let cachedDigest = null;
  let userConfig = null;
  let isContextInvalidated = false;

  // Action In-Flight Locks (prevent duplicate runs without freezing other buttons)
  const actionLocks = {
    summarize: false,
    rewriter: false,
    download: false,
    preview: false,
    history: false
  };

  // Rewriter Glow State Machine
  let rewriterGlowState = 'default';
  let rewriterSafetyTimer = null;
  let passivePasteListener = null;

  // Floating Position & Drag State
  const ORB_SIZE = 44;
  let currentPosX = window.innerWidth - (ORB_SIZE + 20);
  let currentPosY = window.innerHeight - (ORB_SIZE + 20);
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialBtnX = 0;
  let initialBtnY = 0;
  let hasMoved = false;

  // Monoline SVG Icons (Clean Strokes, Zero Gradients)
  const SVG_ICONS = {
    courier: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M4 8C4 5.79 5.79 4 8 4H14C17.31 4 20 6.69 20 10C20 12.21 18.21 14 16 14H10C6.69 14 4 11.31 4 8Z"/>
      <path d="M20 16C20 18.21 18.21 20 16 20H10C6.69 20 4 17.31 4 14C4 11.79 5.79 10 8 10H14C17.31 10 20 12.69 20 16Z"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>`,
    summarize: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>`,
    rewriter: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>`,
    download: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>`,
    preview: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>`,
    history: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>`,
    thinking: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.04z"/>
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.04z"/>
    </svg>`,
    autosuggest: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/>
      <line x1="8" y1="12" x2="21" y2="12"/>
      <line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/>
      <line x1="3" y1="12" x2="3.01" y2="12"/>
      <line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>`,
    settings: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`,
    spinner: `<svg class="cc-spinner-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
    </svg>`,
    checkmark: `<svg class="cc-checkmark-svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="20 6 9 17 4 12" class="cc-check-path"/>
    </svg>`
  };

  // ─── 4.1 Resilient Background Messaging Wrapper ───
  function safeSendMessage(message) {
    return new Promise((resolve, reject) => {
      if (isContextInvalidated) {
        resolve({ success: false, error: 'Context invalidated' });
        return;
      }

      try {
        if (!chrome.runtime || !chrome.runtime.sendMessage) {
          handleContextInvalidated();
          resolve({ success: false, error: 'Context invalidated' });
          return;
        }

        chrome.runtime.sendMessage(message, (response) => {
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            const errText = lastError.message || '';
            if (errText.includes('Extension context invalidated') || errText.includes('context invalidated')) {
              handleContextInvalidated();
            }
            resolve({ success: false, error: errText });
          } else {
            resolve(response || { success: false, error: 'Empty response' });
          }
        });
      } catch (err) {
        if (err.message && err.message.includes('Extension context invalidated')) {
          handleContextInvalidated();
        }
        resolve({ success: false, error: err.message });
      }
    });
  }

  function handleContextInvalidated() {
    isContextInvalidated = true;
    const fab = document.getElementById('chatcourier-fab');
    if (fab) {
      fab.classList.add('context-invalidated');
      fab.title = 'Reload this page to reconnect ChatCourier';
      fab.setAttribute('aria-label', 'Reload this page to reconnect ChatCourier');
    }
  }

  // ─── 1. Rewriter Glow State Machine ───
  function setRewriterGlowState(state, targetText = '') {
    rewriterGlowState = state;
    if (rewriterSafetyTimer) {
      clearTimeout(rewriterSafetyTimer);
      rewriterSafetyTimer = null;
    }

    const btnRewriter = document.getElementById('chatcourier-btn-rewriter');
    const fab = document.getElementById('chatcourier-fab');

    if (state === 'generating') {
      if (btnRewriter) {
        btnRewriter.classList.remove('is-ready', 'is-used');
        btnRewriter.classList.add('is-generating');
      }
      if (fab) {
        fab.classList.remove('is-ready', 'is-used');
        fab.classList.add('is-generating');
      }
    } else if (state === 'ready') {
      if (btnRewriter) {
        btnRewriter.classList.remove('is-generating', 'is-used');
        btnRewriter.classList.add('is-ready');
      }
      if (fab) {
        fab.classList.remove('is-generating', 'is-used');
        fab.classList.add('is-ready');
      }
      attachPassiveComposerListener(targetText);

      // 10-minute safety timeout to auto-revert to Default
      rewriterSafetyTimer = setTimeout(() => {
        setRewriterGlowState('default');
      }, 10 * 60 * 1000);
    } else if (state === 'used') {
      detachPassiveComposerListener();
      if (btnRewriter) {
        btnRewriter.classList.remove('is-generating', 'is-ready');
        btnRewriter.classList.add('is-used');
      }
      if (fab) {
        fab.classList.remove('is-generating', 'is-ready');
        fab.classList.add('is-used');
      }
      setTimeout(() => {
        setRewriterGlowState('default');
      }, 250);
    } else { // default
      detachPassiveComposerListener();
      if (btnRewriter) {
        btnRewriter.classList.remove('is-generating', 'is-ready', 'is-used');
      }
      if (fab) {
        fab.classList.remove('is-generating', 'is-ready', 'is-used');
      }
    }
  }

  function attachPassiveComposerListener(targetText) {
    if (!targetText || !activeScraper) return;
    const comp = activeScraper.findComposerElement();
    if (!comp) return;

    detachPassiveComposerListener();

    const normalizedChunk = targetText.trim().slice(0, 30).toLowerCase().replace(/\s+/g, ' ');
    if (!normalizedChunk) return;

    passivePasteListener = () => {
      try {
        const currentVal = (activeScraper.getComposerText() || '').toLowerCase().replace(/\s+/g, ' ');
        if (currentVal.includes(normalizedChunk)) {
          setRewriterGlowState('used');
        }
      } catch (_) {}
    };

    comp.addEventListener('input', passivePasteListener, { passive: true });
    comp.addEventListener('paste', passivePasteListener, { passive: true });
  }

  function detachPassiveComposerListener() {
    if (passivePasteListener && activeScraper) {
      try {
        const comp = activeScraper.findComposerElement();
        if (comp) {
          comp.removeEventListener('input', passivePasteListener);
          comp.removeEventListener('paste', passivePasteListener);
        }
      } catch (_) {}
      passivePasteListener = null;
    }
  }

  // ─── Scraper Initialization ───
  function initScraper() {
    try {
      if (typeof BaseScraper !== 'undefined' && typeof BaseScraper.detectCurrentPlatform === 'function') {
        currentPlatform = BaseScraper.detectCurrentPlatform();
      } else {
        currentPlatform = 'generic';
      }

      switch (currentPlatform) {
        case 'chatgpt':
          activeScraper = typeof ChatGPTScraper !== 'undefined' ? new ChatGPTScraper() : new BaseScraper('chatgpt');
          break;
        case 'claude':
          activeScraper = typeof ClaudeScraper !== 'undefined' ? new ClaudeScraper() : new BaseScraper('claude');
          break;
        case 'gemini':
          activeScraper = typeof GeminiScraper !== 'undefined' ? new GeminiScraper() : new BaseScraper('gemini');
          break;
        case 'perplexity':
          activeScraper = typeof PerplexityScraper !== 'undefined' ? new PerplexityScraper() : new BaseScraper('perplexity');
          break;
        case 'deepseek':
          activeScraper = typeof DeepSeekScraper !== 'undefined' ? new DeepSeekScraper() : new BaseScraper('deepseek');
          break;
        default:
          activeScraper = new BaseScraper('generic');
          break;
      }
    } catch (e) {
      console.warn('[ChatCourier] Scraper initialization error:', e);
      activeScraper = new BaseScraper('generic');
    }
  }

  function getPlatformLabel() {
    const labels = {
      chatgpt: 'ChatGPT',
      claude: 'Claude',
      gemini: 'Gemini',
      perplexity: 'Perplexity',
      deepseek: 'DeepSeek',
      generic: 'Web Chat'
    };
    return labels[currentPlatform] || 'Web Chat';
  }

  // ─── 4.7 Drag & Position Clamping ───
  function setButtonPosition(x, y, save = false) {
    const fab = document.getElementById('chatcourier-fab');
    if (!fab) return;

    const minX = 10;
    const minY = 10;
    const maxX = Math.max(minX, window.innerWidth - ORB_SIZE - 10);
    const maxY = Math.max(minY, window.innerHeight - ORB_SIZE - 10);

    currentPosX = Math.max(minX, Math.min(maxX, x));
    currentPosY = Math.max(minY, Math.min(maxY, y));

    fab.style.transform = `translate3d(${Math.round(currentPosX)}px, ${Math.round(currentPosY)}px, 0)`;
    positionDrawer();

    if (save && !isContextInvalidated) {
      try {
        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ chatcourier_pos: { x: currentPosX, y: currentPosY } });
        }
      } catch (_) {}
    }
  }

  function positionDrawer() {
    const drawer = document.getElementById('chatcourier-drawer');
    if (!drawer) return;

    const drawerWidth = 340;
    const drawerHeight = 110;

    let drawerX = currentPosX - drawerWidth + ORB_SIZE;
    if (drawerX < 12) drawerX = Math.max(12, currentPosX);
    if (drawerX + drawerWidth > window.innerWidth - 12) drawerX = window.innerWidth - drawerWidth - 12;

    let drawerY = currentPosY - drawerHeight - 12;
    if (drawerY < 12 || currentPosY < window.innerHeight / 2) {
      drawerY = currentPosY + ORB_SIZE + 12;
    }
    if (drawerY + drawerHeight > window.innerHeight - 12) {
      drawerY = window.innerHeight - drawerHeight - 12;
    }

    drawer.style.left = `${Math.round(drawerX)}px`;
    drawer.style.top = `${Math.round(drawerY)}px`;
  }

  function updateUIVisibility() {
    const root = document.getElementById('chatcourier-root');
    if (!root) return;
    const fabEnabled = userConfig?.settings?.fabEnabled !== false;
    root.style.display = fabEnabled ? '' : 'none';
  }

  // ─── 4.3 Clipboard Fallback Chain ───
  async function copyTextWithFallback(text, sourceBtn = null) {
    if (!text) return false;

    let copied = false;

    // 1. Direct Clipboard API
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch (e) {
      console.warn('[ChatCourier] Clipboard API write rejected:', e);
    }

    // 2. Offscreen textarea + execCommand('copy')
    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (execErr) {
        console.warn('[ChatCourier] execCommand fallback failed:', execErr);
      }
    }

    // 3. Modal manual copy fallback
    if (!copied) {
      openModalWithSelection(text, 'Could not access system clipboard. Press Ctrl+C or Cmd+C to copy.');
      return false;
    }

    // Log to local history if copied
    safeSendMessage({
      action: 'ADD_CLIPBOARD_ITEM',
      payload: { kind: 'digest', fullText: text, sourcePlatform: currentPlatform }
    });

    if (sourceBtn) triggerSuccessState(sourceBtn);
    showToast('Copied to clipboard', 'success');
    return true;
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Motion & State Helpers ───
  function triggerLoadingState(buttonEl) {
    if (!buttonEl) return;
    buttonEl.classList.add('is-running');
    buttonEl.innerHTML = SVG_ICONS.spinner;
  }

  function triggerSuccessState(buttonEl, originalIconSvg = null) {
    if (!buttonEl) return;
    buttonEl.classList.remove('is-running');
    buttonEl.classList.add('is-success');
    buttonEl.innerHTML = SVG_ICONS.checkmark;

    setTimeout(() => {
      buttonEl.classList.remove('is-success');
      if (originalIconSvg) {
        buttonEl.innerHTML = originalIconSvg;
      }
    }, 1360);
  }

  function triggerErrorState(buttonEl, originalIconSvg = null) {
    if (!buttonEl) return;
    buttonEl.classList.remove('is-running');
    buttonEl.classList.add('is-error');

    setTimeout(() => {
      buttonEl.classList.remove('is-error');
      if (originalIconSvg) {
        buttonEl.innerHTML = originalIconSvg;
      }
    }, 360);
  }

  function showToast(message, type = 'info') {
    const toast = document.getElementById('chatcourier-toast');
    const msg = document.getElementById('chatcourier-toast-msg');
    if (!toast || !msg) return;

    msg.textContent = message;
    toast.className = `chatcourier-toast visible toast-${type}`;

    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3500);
  }

  function openModalWithSelection(content, note = '') {
    const modal = document.getElementById('chatcourier-modal');
    const modalContent = document.getElementById('chatcourier-modal-content');
    const modalNote = document.getElementById('chatcourier-modal-note');
    if (!modal || !modalContent) return;

    modalContent.value = content;
    if (modalNote) modalNote.textContent = note;
    modal.classList.add('open');
    modalContent.focus();
    modalContent.select();
  }

  // ─── Extraction & Summarization ───
  async function performExtraction(fastMode = false) {
    if (!activeScraper) initScraper();
    try {
      cachedSession = await activeScraper.scrape(fastMode);
      const statsText = document.getElementById('drawer-stats-text');
      if (statsText && cachedSession.stats) {
        statsText.textContent = `${cachedSession.stats.messageCount} turns • ~${cachedSession.stats.approxTokenCount || 0} tokens`;
      }
      return cachedSession;
    } catch (err) {
      console.warn('[ChatCourier] Extraction error:', err);
      throw err;
    }
  }

  async function performSummarization(btnEl) {
    if (actionLocks.summarize || isContextInvalidated) return;
    actionLocks.summarize = true;
    triggerLoadingState(btnEl);
    showToast('Synthesizing context digest...', 'info');

    try {
      const fastMode = Boolean(userConfig?.settings?.fastMode);
      const session = await performExtraction(fastMode);
      if (!session || !session.messages || session.messages.length === 0) {
        triggerErrorState(btnEl, SVG_ICONS.summarize);
        showToast('No chat messages detected on screen.', 'error');
        return;
      }

      const res = await safeSendMessage({
        action: 'RUN_TEMPLATE',
        payload: {
          templateId: 'digest',
          userContent: session.rawTranscript
        }
      });

      if (res && res.success && res.summary) {
        cachedDigest = res.summary;
        triggerSuccessState(btnEl, SVG_ICONS.summarize);
        copyTextWithFallback(cachedDigest, null);
      } else {
        const errMsg = res?.error || 'Summarization failed';
        triggerErrorState(btnEl, SVG_ICONS.summarize);
        showToast(errMsg, 'error');
      }
    } catch (err) {
      triggerErrorState(btnEl, SVG_ICONS.summarize);
      showToast(err.message || 'Request failed', 'error');
    } finally {
      actionLocks.summarize = false;
    }
  }

  // ─── 4.2 UI Injection & MutationObserver ───
  function injectUI() {
    if (document.getElementById('chatcourier-root')) return;
    if (!document.body) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectUI, { once: true });
      } else {
        setTimeout(injectUI, 100);
      }
      return;
    }

    const platformLabel = getPlatformLabel();
    const root = document.createElement('div');
    root.id = 'chatcourier-root';

    root.innerHTML = `
      <!-- Draggable Floating Action Orb -->
      <div class="chatcourier-dock-btn" id="chatcourier-fab" role="button" tabindex="0" title="ChatCourier (${platformLabel})" aria-label="ChatCourier (${platformLabel})">
        <div class="chatcourier-icon-container" id="chatcourier-fab-icon-wrap">
          ${SVG_ICONS.courier}
        </div>
      </div>

      <!-- Action Drawer: 7 Icon Capsule Toolbar -->
      <div class="chatcourier-drawer" id="chatcourier-drawer">
        <div class="chatcourier-drawer-header">
          <div class="chatcourier-brand">
            <span class="brand-name">ChatCourier</span>
            <span class="chatcourier-platform-badge">${platformLabel}</span>
          </div>
          <button class="options-link-btn" id="btn-drawer-settings" title="Settings" aria-label="Open Settings">
            ${SVG_ICONS.settings}
          </button>
        </div>

        <div class="chatcourier-drawer-body">
          <!-- 1. Summarize for Handoff -->
          <button class="drawer-icon-btn primary" id="btn-drawer-summarize" title="Summarize for Handoff (Alt+Shift+C)" aria-label="Summarize for Handoff (Alt+Shift+C)">
            ${SVG_ICONS.summarize}
          </button>

          <!-- 2. Prompt Rewriter -->
          <button class="drawer-icon-btn" id="btn-drawer-rewriter" title="Prompt Rewriter" aria-label="Prompt Rewriter">
            ${SVG_ICONS.rewriter}
          </button>

          <!-- 3. Download Transcript -->
          <button class="drawer-icon-btn" id="btn-drawer-download" title="Download Transcript (.md)" aria-label="Download Transcript (.md)">
            ${SVG_ICONS.download}
          </button>

          <!-- 4. Preview Context -->
          <button class="drawer-icon-btn" id="btn-drawer-preview" title="Preview Context Digest" aria-label="Preview Context Digest">
            ${SVG_ICONS.preview}
          </button>

          <!-- 5. Clipboard History -->
          <button class="drawer-icon-btn" id="btn-drawer-history" title="Clipboard History" aria-label="Clipboard History">
            ${SVG_ICONS.history}
          </button>

          <!-- 6. Thinking Mode Toggle -->
          <button class="drawer-icon-btn toggle-btn" id="btn-drawer-thinking" title="Thinking Mode" aria-label="Toggle Thinking Mode">
            ${SVG_ICONS.thinking}
            <span class="toggle-active-dot"></span>
          </button>

          <!-- 7. Auto-Suggest Toggle -->
          <button class="drawer-icon-btn toggle-btn" id="btn-drawer-autosuggest" title="Auto-Suggest Next Steps" aria-label="Toggle Auto-Suggest Next Steps">
            ${SVG_ICONS.autosuggest}
            <span class="toggle-active-dot"></span>
          </button>
        </div>

        <div class="chatcourier-drawer-footer">
          <span id="drawer-stats-text" class="drawer-stats">Ready</span>
        </div>
      </div>

      <!-- Toast Feedback (Zero Emoji, Plain Tone) -->
      <div class="chatcourier-toast" id="chatcourier-toast">
        <span id="chatcourier-toast-msg">Ready</span>
      </div>

      <!-- Modal Preview / Fallback Selection -->
      <div class="chatcourier-modal-backdrop" id="chatcourier-modal">
        <div class="chatcourier-modal">
          <div class="chatcourier-modal-header">
            <div class="chatcourier-modal-title">Context Digest Preview</div>
            <button class="chatcourier-modal-close" id="chatcourier-modal-close" aria-label="Close Preview">✕</button>
          </div>
          <div id="chatcourier-modal-note" class="chatcourier-modal-note"></div>
          <textarea class="chatcourier-modal-textarea" id="chatcourier-modal-content" readonly></textarea>
          <div class="chatcourier-modal-footer">
            <button class="chatcourier-btn chatcourier-btn-secondary" id="chatcourier-modal-copy">Copy to Clipboard</button>
            <button class="chatcourier-btn chatcourier-btn-primary" id="chatcourier-modal-download">Download .md</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Position restore from storage with viewport clamping
    if (!isContextInvalidated && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['chatcourier_pos'], (res) => {
        if (res && res.chatcourier_pos && typeof res.chatcourier_pos.x === 'number') {
          setButtonPosition(res.chatcourier_pos.x, res.chatcourier_pos.y, false);
        } else {
          setButtonPosition(window.innerWidth - (ORB_SIZE + 20), window.innerHeight - (ORB_SIZE + 20), false);
        }
      });
    } else {
      setButtonPosition(window.innerWidth - (ORB_SIZE + 20), window.innerHeight - (ORB_SIZE + 20), false);
    }

    setupEvents(root);
  }

  // ─── Setup Event Handlers ───
  function setupEvents(root) {
    const fab = root.querySelector('#chatcourier-fab');
    const drawer = root.querySelector('#chatcourier-drawer');
    const modal = root.querySelector('#chatcourier-modal');
    const modalClose = root.querySelector('#chatcourier-modal-close');
    const modalContent = root.querySelector('#chatcourier-modal-content');
    const modalCopy = root.querySelector('#chatcourier-modal-copy');
    const modalDownload = root.querySelector('#chatcourier-modal-download');
    const btnSettings = root.querySelector('#btn-drawer-settings');

    const btnSummarize = root.querySelector('#btn-drawer-summarize');
    const btnRewriter = root.querySelector('#btn-drawer-rewriter');
    const btnDownload = root.querySelector('#btn-drawer-download');
    const btnPreview = root.querySelector('#btn-drawer-preview');
    const btnHistory = root.querySelector('#btn-drawer-history');
    const btnThinking = root.querySelector('#btn-drawer-thinking');
    const btnAutosuggest = root.querySelector('#btn-drawer-autosuggest');

    // Sync toggle button states from config
    function syncToggleUI() {
      const s = userConfig?.settings || {};
      btnThinking.classList.toggle('active', Boolean(s.thinkingModeEnabled));
      btnAutosuggest.classList.toggle('active', Boolean(s.autoSuggestEnabled));
    }
    syncToggleUI();

    // ── Drag & Click Gestures ──
    function onPointerDown(e) {
      if (e.button !== 0 || isContextInvalidated) return;
      isDragging = true;
      hasMoved = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      initialBtnX = currentPosX;
      initialBtnY = currentPosY;

      fab.classList.add('dragging');
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp, { once: true });
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;

      if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
        hasMoved = true;
        e.preventDefault();
        setButtonPosition(initialBtnX + deltaX, initialBtnY + deltaY, false);
      }
    }

    function onPointerUp() {
      if (!isDragging) return;
      isDragging = false;
      fab.classList.remove('dragging');
      window.removeEventListener('pointermove', onPointerMove);

      if (hasMoved) {
        setButtonPosition(currentPosX, currentPosY, true);
      } else {
        drawer.classList.toggle('open');
        if (drawer.classList.contains('open')) {
          positionDrawer();
          performExtraction().catch(() => {});
        }
      }
    }

    fab.addEventListener('pointerdown', onPointerDown);

    document.addEventListener('pointerdown', (e) => {
      if (!fab.contains(e.target) && !drawer.contains(e.target)) {
        drawer.classList.remove('open');
      }
    });

    // ── 1. Summarize ──
    btnSummarize.addEventListener('click', async () => {
      drawer.classList.remove('open');
      await performSummarization(btnSummarize);
    });

    // ── 2. Rewriter ──
    btnRewriter.addEventListener('click', async () => {
      drawer.classList.remove('open');
      if (actionLocks.rewriter || isContextInvalidated) return;

      const composerText = activeScraper ? activeScraper.getComposerText() : '';
      if (!composerText) {
        showToast('No text in chat composer to rewrite.', 'info');
        return;
      }

      actionLocks.rewriter = true;
      triggerLoadingState(btnRewriter);
      setRewriterGlowState('generating');
      showToast('Rewriting prompt...', 'info');

      try {
        const res = await safeSendMessage({
          action: 'RUN_TEMPLATE',
          payload: {
            templateId: 'rewriter',
            userContent: composerText
          }
        });

        if (res && res.success && res.summary) {
          triggerSuccessState(btnRewriter, SVG_ICONS.rewriter);
          setRewriterGlowState('ready', res.summary);
          copyTextWithFallback(res.summary, null);
          showToast('Prompt rewritten and copied! Paste or insert into chat.', 'success');
        } else {
          triggerErrorState(btnRewriter, SVG_ICONS.rewriter);
          setRewriterGlowState('default');
          showToast(res?.error || 'Rewrite failed', 'error');
        }
      } catch (err) {
        triggerErrorState(btnRewriter, SVG_ICONS.rewriter);
        setRewriterGlowState('default');
        showToast(err.message, 'error');
      } finally {
        actionLocks.rewriter = false;
      }
    });

    // ── 3. Download Transcript ──
    btnDownload.addEventListener('click', async () => {
      drawer.classList.remove('open');
      if (actionLocks.download) return;
      actionLocks.download = true;
      triggerLoadingState(btnDownload);

      try {
        const session = await performExtraction();
        const safeTitle = (session?.title || 'chat_transcript').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        downloadText(`${safeTitle}_chatcourier.md`, session?.rawTranscript || '');
        triggerSuccessState(btnDownload, SVG_ICONS.download);
        showToast('Transcript downloaded', 'success');
      } catch (err) {
        triggerErrorState(btnDownload, SVG_ICONS.download);
        showToast(`Download failed: ${err.message}`, 'error');
      } finally {
        actionLocks.download = false;
      }
    });

    // ── 4. Preview Context ──
    btnPreview.addEventListener('click', async () => {
      drawer.classList.remove('open');
      openModalWithSelection('Extracting session content...', '');

      try {
        const session = await performExtraction();
        modalContent.value = cachedDigest || session.rawTranscript || '';
      } catch (err) {
        modalContent.value = `Error: ${err.message}`;
      }
    });

    // ── 5. Clipboard History ──
    btnHistory.addEventListener('click', async () => {
      drawer.classList.remove('open');
      const res = await safeSendMessage({ action: 'GET_CONFIG' });
      const history = res?.config?.clipboardHistory || [];

      if (history.length === 0) {
        showToast('Clipboard history is empty.', 'info');
        return;
      }

      const formatted = history.map((item, idx) => {
        const time = new Date(item.copiedAt).toLocaleTimeString();
        return `[${idx + 1}] (${item.kind.toUpperCase()} - ${time})\n${item.fullText}\n`;
      }).join('\n---\n\n');

      openModalWithSelection(formatted, 'Recent ChatCourier copies:');
    });

    // ── 6. Thinking Mode Toggle ──
    btnThinking.addEventListener('click', async () => {
      const isNowActive = !btnThinking.classList.contains('active');
      btnThinking.classList.toggle('active', isNowActive);
      await safeSendMessage({
        action: 'SAVE_SETTINGS',
        payload: { thinkingModeEnabled: isNowActive }
      });
      showToast(isNowActive ? 'Thinking Mode enabled' : 'Thinking Mode disabled');
    });

    // ── 7. Auto-Suggest Toggle ──
    btnAutosuggest.addEventListener('click', async () => {
      const isNowActive = !btnAutosuggest.classList.contains('active');
      btnAutosuggest.classList.toggle('active', isNowActive);
      await safeSendMessage({
        action: 'SAVE_SETTINGS',
        payload: { autoSuggestEnabled: isNowActive }
      });
      showToast(isNowActive ? 'Auto-Suggest enabled' : 'Auto-Suggest disabled');
    });

    // ── Settings ──
    if (btnSettings) {
      btnSettings.addEventListener('click', () => {
        drawer.classList.remove('open');
        safeSendMessage({ action: 'OPEN_OPTIONS' });
      });
    }

    // ── Modal Actions ──
    modalClose.addEventListener('click', () => {
      modal.classList.remove('open');
    });

    modalCopy.addEventListener('click', () => {
      copyTextWithFallback(modalContent.value, modalCopy);
    });

    modalDownload.addEventListener('click', () => {
      const text = modalContent.value;
      const safeTitle = (cachedSession?.title || 'context_digest').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      downloadText(`${safeTitle}_digest.md`, text);
      showToast('Downloaded file', 'success');
    });

    // ── Keyboard Shortcuts ──
    window.addEventListener('keydown', async (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyC') {
        e.preventDefault();
        await performSummarization(btnSummarize);
      } else if (e.key === 'Escape') {
        if (drawer.classList.contains('open')) drawer.classList.remove('open');
        if (modal.classList.contains('open')) modal.classList.remove('open');
      }
    });

    window.addEventListener('resize', () => {
      setButtonPosition(currentPosX, currentPosY, false);
    }, { passive: true });
  }

  // ─── 4.2 Lightweight MutationObserver for Host DOM Stability ───
  function observeDOMReattachment() {
    const observer = new MutationObserver(() => {
      if (!document.getElementById('chatcourier-root')) {
        injectUI();
      }
    });

    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: false });
    }
  }

  // ─── Listen for Tab Messages from Extension ───
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { action, payload } = message || {};

    if (action === 'EXTRACT_SESSION_REQUEST') {
      const fastMode = Boolean(payload?.fastMode);
      performExtraction(fastMode).then((session) => {
        sendResponse({ success: true, session, platform: currentPlatform });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    if (action === 'GET_COMPOSER_TEXT') {
      if (!activeScraper) initScraper();
      const text = activeScraper ? activeScraper.getComposerText() : '';
      sendResponse({ success: true, text });
      return false;
    }

    if (action === 'APPLY_PERSONA_TO_TAB') {
      if (!activeScraper) initScraper();
      const instruction = payload?.instructionBlock || '';
      const ok = activeScraper ? activeScraper.setComposerText(instruction) : false;
      if (ok) {
        showToast('Persona instruction inserted into composer', 'success');
      } else {
        showToast('Could not find composer. Paste manually.', 'info');
      }
      sendResponse({ success: ok });
      return false;
    }

    if (action === 'INSERT_INTO_COMPOSER') {
      if (!activeScraper) initScraper();
      const text = payload?.text || '';
      const ok = activeScraper ? activeScraper.setComposerText(text) : false;
      if (ok) {
        setRewriterGlowState('used');
        showToast('Inserted into chat composer', 'success');
      } else {
        showToast('Could not find composer. Paste manually.', 'info');
      }
      sendResponse({ success: ok });
      return false;
    }
  });

  // Boot
  initScraper();
  safeSendMessage({ action: 'GET_CONFIG' }).then((res) => {
    if (res && res.config) userConfig = res.config;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        injectUI();
        observeDOMReattachment();
      }, { once: true });
    } else {
      injectUI();
      observeDOMReattachment();
    }
  });
})();
