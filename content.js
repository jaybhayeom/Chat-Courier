/**
 * ChatCourier - content.js
 * In-Tab Companion: Floating Draggable Orb, Capsule Drawer Toolbar & Platform Scraper
 */

(function () {
  'use strict';

  if (window.__chatCourierLoaded) return;
  window.__chatCourierLoaded = true;

  let currentPlatform = 'generic';
  let activeScraper = null;
  let isProcessing = false;
  let cachedSession = null;
  let cachedDigest = null;
  let userConfig = null;

  // Floating Position & Drag State
  let currentPosX = window.innerWidth - 64;
  let currentPosY = window.innerHeight - 64;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let initialBtnX = 0;
  let initialBtnY = 0;
  let hasMoved = false;

  // Monoline SVG icon for ChatCourier (zero gradient, clean strokes)
  const COURIER_ICON_SVG = `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 8C4 5.79 5.79 4 8 4H14C17.31 4 20 6.69 20 10C20 12.21 18.21 14 16 14H10C6.69 14 4 11.31 4 8Z"/>
    <path d="M20 16C20 18.21 18.21 20 16 20H10C6.69 20 4 17.31 4 14C4 11.79 5.79 10 8 10H14C17.31 10 20 12.69 20 16Z"/>
    <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
  </svg>`;

  function initScraper() {
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

  function setButtonPosition(x, y, save = false) {
    const fab = document.getElementById('chatcourier-fab');
    if (!fab) return;

    const btnSize = 44;
    const maxX = Math.max(10, window.innerWidth - btnSize - 10);
    const maxY = Math.max(10, window.innerHeight - btnSize - 10);

    currentPosX = Math.max(10, Math.min(maxX, x));
    currentPosY = Math.max(10, Math.min(maxY, y));

    fab.style.transform = `translate3d(${Math.round(currentPosX)}px, ${Math.round(currentPosY)}px, 0)`;
    positionDrawer();

    if (save && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        chatcourier_pos: { x: currentPosX, y: currentPosY }
      });
    }
  }

  function positionDrawer() {
    const drawer = document.getElementById('chatcourier-drawer');
    if (!drawer) return;

    const drawerWidth = 260;
    const drawerHeight = 120;
    const btnSize = 44;

    let drawerX = currentPosX - drawerWidth + btnSize;
    if (drawerX < 12) drawerX = Math.max(12, currentPosX);
    if (drawerX + drawerWidth > window.innerWidth - 12) drawerX = window.innerWidth - drawerWidth - 12;

    let drawerY = currentPosY - drawerHeight - 12;
    if (drawerY < 12 || currentPosY < window.innerHeight / 2) {
      drawerY = currentPosY + btnSize + 12;
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
      <div class="chatcourier-dock-btn" id="chatcourier-fab" role="button" tabindex="0" title="ChatCourier (${platformLabel}) - Alt+Shift+C" aria-label="ChatCourier Context Engine">
        <div class="chatcourier-icon-container" id="chatcourier-fab-icon-wrap">
          ${COURIER_ICON_SVG}
        </div>
      </div>

      <!-- Action Drawer: Restrained Capsule Toolbar -->
      <div class="chatcourier-drawer" id="chatcourier-drawer">
        <div class="chatcourier-drawer-header">
          <div class="chatcourier-brand">
            <span class="brand-name">ChatCourier</span>
            <span class="chatcourier-platform-badge">${platformLabel}</span>
          </div>
          <button class="options-link-btn" id="btn-open-settings" title="Settings" aria-label="Open Settings">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          </button>
        </div>

        <div class="chatcourier-drawer-body">
          <!-- Summarize for Handoff -->
          <button class="drawer-icon-btn primary" id="btn-quick-handoff" title="Summarize for Handoff (Alt+Shift+C)" aria-label="Summarize for Handoff">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </button>

          <!-- Download Transcript -->
          <button class="drawer-icon-btn" id="btn-download-md" title="Download Transcript (.md)" aria-label="Download Transcript">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>

          <!-- Preview Context Digest -->
          <button class="drawer-icon-btn" id="btn-view-digest" title="Preview Digest" aria-label="Preview Digest">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>

        <div class="chatcourier-drawer-footer">
          <span id="drawer-stats-text" class="drawer-stats">Ready to extract</span>
        </div>
      </div>

      <!-- Toast Feedback (Zero Emoji) -->
      <div class="chatcourier-toast" id="chatcourier-toast">
        <span class="toast-icon-wrap" id="chatcourier-toast-icon">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 14 14"/></svg>
        </span>
        <span id="chatcourier-toast-msg">Ready</span>
      </div>

      <!-- Modal Preview -->
      <div class="chatcourier-modal-backdrop" id="chatcourier-modal">
        <div class="chatcourier-modal">
          <div class="chatcourier-modal-header">
            <div class="chatcourier-modal-title">Context Digest Preview</div>
            <button class="chatcourier-btn chatcourier-btn-secondary" id="chatcourier-modal-close" style="padding: 4px 10px;">✕</button>
          </div>
          <div class="chatcourier-modal-body" id="chatcourier-modal-content">
            Extracting session content...
          </div>
          <div class="chatcourier-modal-footer">
            <button class="chatcourier-btn chatcourier-btn-secondary" id="chatcourier-modal-copy">Copy to Clipboard</button>
            <button class="chatcourier-btn chatcourier-btn-primary" id="chatcourier-modal-download">Download .md</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['chatcourier_pos'], (res) => {
        if (res && res.chatcourier_pos && typeof res.chatcourier_pos.x === 'number') {
          setButtonPosition(res.chatcourier_pos.x, res.chatcourier_pos.y, false);
        } else {
          setButtonPosition(window.innerWidth - 64, window.innerHeight - 64, false);
        }
      });
    } else {
      setButtonPosition(window.innerWidth - 64, window.innerHeight - 64, false);
    }

    setupEvents(root);
  }

  function showToast(message, type = 'info') {
    const toast = document.getElementById('chatcourier-toast');
    const msg = document.getElementById('chatcourier-toast-msg');
    const iconWrap = document.getElementById('chatcourier-toast-icon');
    if (!toast || !msg) return;

    msg.textContent = message;
    if (iconWrap) {
      if (type === 'success') {
        iconWrap.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
      } else if (type === 'error') {
        iconWrap.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
      } else {
        iconWrap.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
      }
    }
    toast.className = `chatcourier-toast visible toast-${type}`;

    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3500);
  }

  function setFabState(state) {
    const fab = document.getElementById('chatcourier-fab');
    const iconWrap = document.getElementById('chatcourier-fab-icon-wrap');
    if (!fab || !iconWrap) return;

    fab.classList.remove('loading', 'success', 'error');

    if (state === 'loading') {
      fab.classList.add('loading');
      iconWrap.innerHTML = `
        <svg class="chatcourier-spinner-svg" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="9" stroke-dasharray="38" stroke-dashoffset="12"/>
        </svg>`;
    } else if (state === 'success') {
      fab.classList.add('success');
      iconWrap.innerHTML = `
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/>
        </svg>`;
      setTimeout(() => setFabState('default'), 2000);
    } else {
      iconWrap.innerHTML = COURIER_ICON_SVG;
    }
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
      console.error('[ChatCourier] Scraping error:', err);
      showToast(`Scraping failed: ${err.message}`, 'error');
      throw err;
    }
  }

  async function performSummarization() {
    if (isProcessing) return;
    isProcessing = true;
    setFabState('loading');
    showToast('Synthesizing Context Digest...', 'info');

    try {
      const fastMode = Boolean(userConfig?.settings?.fastMode);
      const session = await performExtraction(fastMode);
      if (!session || !session.messages || session.messages.length === 0) {
        showToast('No chat messages detected on screen.', 'error');
        setFabState('default');
        return;
      }

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'RUN_TEMPLATE',
          payload: {
            templateId: 'digest',
            userContent: session.rawTranscript
          }
        }, resolve);
      });

      if (response && response.success) {
        cachedDigest = response.summary;
        setFabState('success');
        showToast('Handoff digest ready! Open Preview to view and copy.', 'success');
      } else {
        throw new Error(response?.error || 'Summarization failed');
      }
    } catch (err) {
      console.error('[ChatCourier] Summarize error:', err);
      showToast(err.message, 'error');
      setFabState('default');
    } finally {
      isProcessing = false;
    }
  }

  function setupEvents(root) {
    const fab = root.querySelector('#chatcourier-fab');
    const drawer = root.querySelector('#chatcourier-drawer');
    const modal = root.querySelector('#chatcourier-modal');
    const modalClose = root.querySelector('#chatcourier-modal-close');
    const modalContent = root.querySelector('#chatcourier-modal-content');
    const modalCopy = root.querySelector('#chatcourier-modal-copy');
    const modalDownload = root.querySelector('#chatcourier-modal-download');
    const btnOpenSettings = root.querySelector('#btn-open-settings');

    function onPointerDown(e) {
      if (e.button !== 0) return;
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

    function onPointerUp(e) {
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

    root.querySelector('#btn-quick-handoff').addEventListener('click', async () => {
      drawer.classList.remove('open');
      await performSummarization();
    });

    root.querySelector('#btn-download-md').addEventListener('click', async () => {
      drawer.classList.remove('open');
      setFabState('loading');
      try {
        const session = await performExtraction();
        const safeTitle = (session.title || 'chat-transcript').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        downloadText(`${safeTitle}_chatcourier.md`, session.rawTranscript);
        setFabState('success');
        showToast('Transcript downloaded', 'success');
      } catch (err) {
        setFabState('default');
        showToast(`Download failed: ${err.message}`, 'error');
      }
    });

    root.querySelector('#btn-view-digest').addEventListener('click', async () => {
      drawer.classList.remove('open');
      modal.classList.add('open');
      modalContent.textContent = 'Extracting session content...';

      try {
        const session = await performExtraction();
        modalContent.textContent = cachedDigest || session.rawTranscript;
      } catch (err) {
        modalContent.textContent = `Error: ${err.message}`;
      }
    });

    if (btnOpenSettings) {
      btnOpenSettings.addEventListener('click', () => {
        chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
      });
    }

    modalClose.addEventListener('click', () => {
      modal.classList.remove('open');
    });

    modalCopy.addEventListener('click', async () => {
      const text = modalContent.textContent;
      try {
        await navigator.clipboard.writeText(text);
        chrome.runtime.sendMessage({
          action: 'ADD_CLIPBOARD_ITEM',
          payload: { kind: 'digest', fullText: text, sourcePlatform: currentPlatform }
        });
        showToast('Digest copied to clipboard', 'success');
      } catch (err) {
        showToast('Copy failed', 'error');
      }
    });

    modalDownload.addEventListener('click', () => {
      const text = modalContent.textContent;
      const safeTitle = (cachedSession?.title || 'context-digest').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      downloadText(`${safeTitle}_handoff_digest.md`, text);
      showToast('Digest downloaded', 'success');
    });

    window.addEventListener('keydown', async (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyC') {
        e.preventDefault();
        await performSummarization();
      } else if (e.key === 'Escape') {
        if (drawer.classList.contains('open')) drawer.classList.remove('open');
        if (modal.classList.contains('open')) modal.classList.remove('open');
      }
    });

    window.addEventListener('resize', () => {
      setButtonPosition(currentPosX, currentPosY, false);
    }, { passive: true });
  }

  // Listen for Tab Messages from Popup / Background
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
      const text = activeScraper.getComposerText();
      sendResponse({ success: true, text });
      return false;
    }

    if (action === 'APPLY_PERSONA_TO_TAB') {
      if (!activeScraper) initScraper();
      const instruction = payload?.instructionBlock || '';
      const ok = activeScraper.setComposerText(instruction);
      if (ok) showToast('Persona instruction inserted into composer', 'success');
      sendResponse({ success: ok });
      return false;
    }
  });

  // Config Sync
  if (chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener(() => {
      chrome.runtime.sendMessage({ action: 'GET_CONFIG' }, (res) => {
        if (res && res.config) {
          userConfig = res.config;
          updateUIVisibility();
        }
      });
    });
  }

  initScraper();
  chrome.runtime.sendMessage({ action: 'GET_CONFIG' }, (res) => {
    if (res && res.config) {
      userConfig = res.config;
    }
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectUI, { once: true });
    } else {
      injectUI();
    }
  });
})();
