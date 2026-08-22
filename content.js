/**
 * ChatCourier - content.js
 * In-Tab LLM Companion, Draggable Non-Intrusive Floating Orb & Universal Platform Scraper
 */

(function () {
  'use strict';

  // Prevent multiple injections
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

  // Single unified ChatCourier icon SVG
  const COURIER_ICON_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cc-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#a5b4fc"/>
        <stop offset="50%" stop-color="#818cf8"/>
        <stop offset="100%" stop-color="#c084fc"/>
      </linearGradient>
    </defs>
    <path d="M4 8C4 5.79 5.79 4 8 4H14C17.31 4 20 6.69 20 10C20 12.21 18.21 14 16 14H10C6.69 14 4 11.31 4 8Z" stroke="url(#cc-grad)" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M20 16C20 18.21 18.21 20 16 20H10C6.69 20 4 17.31 4 14C4 11.79 5.79 10 8 10H14C17.31 10 20 12.69 20 16Z" stroke="url(#cc-grad)" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="2.5" fill="#FFFFFF"/>
    <circle cx="12" cy="12" r="1.5" fill="#818CF8"/>
  </svg>`;

  // Initialize scraper based on current platform
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

  // Get display name for detected platform
  function getPlatformLabel() {
    const labels = {
      chatgpt: 'ChatGPT',
      claude: 'Claude',
      gemini: 'Gemini',
      perplexity: 'Perplexity',
      deepseek: 'DeepSeek',
      generic: 'Chat'
    };
    return labels[currentPlatform] || 'Chat';
  }

  // Apply position to button and drawer
  function setButtonPosition(x, y, save = false) {
    const fab = document.getElementById('chatcourier-fab');
    if (!fab) return;

    const btnSize = 44;
    const maxX = Math.max(10, window.innerWidth - btnSize - 10);
    const maxY = Math.max(10, window.innerHeight - btnSize - 10);

    currentPosX = Math.max(10, Math.min(maxX, x));
    currentPosY = Math.max(10, Math.min(maxY, y));

    fab.style.transform = `translate3d(${Math.round(currentPosX)}px, ${Math.round(currentPosY)}px, 0)`;

    // Position drawer relative to button
    positionDrawer();

    if (save && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({
        chatcourier_pos: { x: currentPosX, y: currentPosY }
      });
    }
  }

  // Align drawer based on button position
  function positionDrawer() {
    const drawer = document.getElementById('chatcourier-drawer');
    if (!drawer) return;

    const drawerWidth = 290;
    const drawerHeight = 310;
    const btnSize = 44;

    // Horizontal placement: align left or right of screen
    let drawerX = currentPosX - drawerWidth + btnSize;
    if (drawerX < 12) {
      drawerX = Math.max(12, currentPosX);
    }
    if (drawerX + drawerWidth > window.innerWidth - 12) {
      drawerX = window.innerWidth - drawerWidth - 12;
    }

    // Vertical placement: open above if near bottom, open below if near top
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

  // Update visibility based on config
  function updateUIVisibility() {
    const root = document.getElementById('chatcourier-root');
    if (!root) return;

    if (userConfig && userConfig.fabEnabled === false) {
      root.style.display = 'none';
    } else {
      root.style.display = '';
    }
  }

  // Inject UI Components
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
      <div class="chatcourier-dock-btn" id="chatcourier-fab" role="button" tabindex="0" title="ChatCourier • ${platformLabel} (Alt+Shift+C)">
        <div class="chatcourier-icon-container" id="chatcourier-fab-icon-wrap">
          ${COURIER_ICON_SVG}
        </div>
        <div class="chatcourier-spark-badge"></div>
        <div class="chatcourier-tooltip">
          <span class="tooltip-title">ChatCourier • ${platformLabel}</span>
          <span class="tooltip-sub">Click to open • Drag to move</span>
        </div>
      </div>

      <!-- Action Drawer -->
      <div class="chatcourier-drawer" id="chatcourier-drawer">
        <div class="chatcourier-drawer-header">
          <div class="chatcourier-brand">
            <div class="chatcourier-brand-icon">
              ${COURIER_ICON_SVG}
            </div>
            <div class="chatcourier-brand-text">
              <span class="brand-name">ChatCourier</span>
              <span class="brand-sub">Context Handoff Engine</span>
            </div>
          </div>
          <div class="chatcourier-platform-badge">
            ${platformLabel}
          </div>
        </div>

        <div class="chatcourier-drawer-body">
          <button class="chatcourier-menu-btn primary" id="btn-quick-handoff" title="Condense session via LLM">
            <div class="btn-icon">
              <svg viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div class="btn-text-wrap">
              <span class="btn-main-text">Summarize for Handoff</span>
              <span class="btn-sub-text">LLM • 4-Part Digest</span>
            </div>
            <span class="btn-shortcut-badge">Alt+Shift+C</span>
          </button>

          <button class="chatcourier-menu-btn" id="btn-copy-raw">
            <div class="btn-icon">
              <svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            </div>
            <div class="btn-text-wrap">
              <span class="btn-main-text">Quick Extract & Copy Raw</span>
              <span class="btn-sub-text">Clean markdown without UI noise</span>
            </div>
          </button>

          <button class="chatcourier-menu-btn" id="btn-download-md">
            <div class="btn-icon">
              <svg viewBox="0 0 24 24"><path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/></svg>
            </div>
            <div class="btn-text-wrap">
              <span class="btn-main-text">Download Transcript (.md)</span>
              <span class="btn-sub-text">Save full session locally</span>
            </div>
          </button>

          <button class="chatcourier-menu-btn" id="btn-view-digest">
            <div class="btn-icon">
              <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
            </div>
            <div class="btn-text-wrap">
              <span class="btn-main-text">Preview Context Digest</span>
              <span class="btn-sub-text">Inspect synthesized output</span>
            </div>
          </button>
        </div>

        <div class="chatcourier-drawer-footer">
          <div class="token-meter" id="drawer-stats">
            <span class="dot live-pulse"></span>
            <span id="drawer-stats-text">Ready to extract</span>
          </div>
          <button class="options-link-btn" id="btn-open-settings" title="ChatCourier Settings">
            ⚙
          </button>
        </div>
      </div>

      <!-- Toast Feedback -->
      <div class="chatcourier-toast" id="chatcourier-toast">
        <span class="toast-icon" id="chatcourier-toast-icon">✨</span>
        <span id="chatcourier-toast-msg">Copied context to clipboard!</span>
      </div>

      <!-- Full Modal Preview -->
      <div class="chatcourier-modal-backdrop" id="chatcourier-modal">
        <div class="chatcourier-modal">
          <div class="chatcourier-modal-header">
            <div class="chatcourier-modal-title">
              <div class="modal-icon">${COURIER_ICON_SVG}</div>
              ChatCourier Context Digest Preview
            </div>
            <button class="chatcourier-btn chatcourier-btn-secondary" id="chatcourier-modal-close" style="padding: 4px 10px;">✕</button>
          </div>
          <div class="chatcourier-modal-body" id="chatcourier-modal-content">
            Generating digest...
          </div>
          <div class="chatcourier-modal-footer">
            <button class="chatcourier-btn chatcourier-btn-secondary" id="chatcourier-modal-copy">Copy to Clipboard</button>
            <button class="chatcourier-btn chatcourier-btn-primary" id="chatcourier-modal-download">Download .md</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    // Restore saved position or default to bottom-right
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

  // Toast Helper
  function showToast(message, type = 'success') {
    const toast = document.getElementById('chatcourier-toast');
    const msg = document.getElementById('chatcourier-toast-msg');
    const icon = document.getElementById('chatcourier-toast-icon');
    if (!toast || !msg) return;

    msg.textContent = message;
    if (icon) {
      icon.textContent = type === 'success' ? '🚀' : type === 'error' ? '⚠️' : '✨';
    }
    toast.className = `chatcourier-toast visible toast-${type}`;

    setTimeout(() => {
      toast.classList.remove('visible');
    }, 3500);
  }

  // FAB Animation States
  function setFabState(state) {
    const fab = document.getElementById('chatcourier-fab');
    const iconWrap = document.getElementById('chatcourier-fab-icon-wrap');
    if (!fab || !iconWrap) return;

    fab.classList.remove('loading', 'success', 'error');

    if (state === 'loading') {
      fab.classList.add('loading');
      iconWrap.innerHTML = `
        <svg class="chatcourier-spinner-svg" viewBox="0 0 24 24" width="22" height="22">
          <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" fill="none" stroke-dasharray="38" stroke-dashoffset="12"/>
        </svg>`;
    } else if (state === 'success') {
      fab.classList.add('success');
      iconWrap.innerHTML = `
        <svg class="chatcourier-check-svg" viewBox="0 0 24 24" width="22" height="22">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
        </svg>`;
      setTimeout(() => setFabState('default'), 2400);
    } else {
      iconWrap.innerHTML = COURIER_ICON_SVG;
    }
  }

  // File Download Helper
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

  // Core Scrape Flow
  async function performExtraction() {
    if (!activeScraper) initScraper();
    try {
      cachedSession = await activeScraper.scrape();
      
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

  // Core Summarization Flow
  async function performSummarization() {
    if (isProcessing) return;
    isProcessing = true;
    setFabState('loading');

    try {
      const session = await performExtraction();
      if (!session || !session.messages || session.messages.length === 0) {
        showToast('No chat messages detected on screen to summarize.', 'error');
        setFabState('default');
        return;
      }

      showToast('Synthesizing LLM Context Digest...', 'info');

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'SUMMARIZE',
          payload: {
            transcript: session.rawTranscript
          }
        }, resolve);
      });

      if (response && response.success) {
        cachedDigest = response.summary;

        // Bug 1 fix: respect autoCopyOnSummarize setting
        const shouldCopy = userConfig?.autoCopyOnSummarize !== false;
        if (shouldCopy) {
          await navigator.clipboard.writeText(cachedDigest);
          setFabState('success');
          showToast('🚀 Handoff Digest synthesized & copied to clipboard!', 'success');
        } else {
          setFabState('success');
          showToast('🚀 Handoff Digest synthesized! Use Preview to view.', 'success');
        }
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

  // Setup Event Listeners
  function setupEvents(root) {
    const fab = root.querySelector('#chatcourier-fab');
    const drawer = root.querySelector('#chatcourier-drawer');
    const modal = root.querySelector('#chatcourier-modal');
    const modalClose = root.querySelector('#chatcourier-modal-close');
    const modalContent = root.querySelector('#chatcourier-modal-content');
    const modalCopy = root.querySelector('#chatcourier-modal-copy');
    const modalDownload = root.querySelector('#chatcourier-modal-download');
    const btnOpenSettings = root.querySelector('#btn-open-settings');

    // Drag-and-Drop Handler on FAB
    function onPointerDown(e) {
      if (e.button !== 0) return; // Left click only
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
        // Simple Click: Toggle Drawer
        drawer.classList.toggle('open');
        if (drawer.classList.contains('open')) {
          positionDrawer();
          performExtraction().catch(() => {});
        }
      }
    }

    fab.addEventListener('pointerdown', onPointerDown);

    // Close drawer on click outside
    document.addEventListener('pointerdown', (e) => {
      if (!fab.contains(e.target) && !drawer.contains(e.target)) {
        drawer.classList.remove('open');
      }
    });

    // Action: Summarize for Handoff
    root.querySelector('#btn-quick-handoff').addEventListener('click', async () => {
      drawer.classList.remove('open');
      await performSummarization();
    });

    // Action: Quick Extract & Copy Raw
    root.querySelector('#btn-copy-raw').addEventListener('click', async () => {
      drawer.classList.remove('open');
      setFabState('loading');
      try {
        const session = await performExtraction();
        await navigator.clipboard.writeText(session.rawTranscript);
        setFabState('success');
        showToast(`Copied ${session.stats.messageCount} messages to clipboard!`, 'success');
      } catch (err) {
        setFabState('default');
        showToast(`Copy failed: ${err.message}`, 'error');
      }
    });

    // Action: Download Markdown
    root.querySelector('#btn-download-md').addEventListener('click', async () => {
      drawer.classList.remove('open');
      setFabState('loading');
      try {
        const session = await performExtraction();
        const safeTitle = (session.title || 'chat-transcript').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
        downloadText(`${safeTitle}_chatcourier.md`, session.rawTranscript);
        setFabState('success');
        showToast('Transcript downloaded!', 'success');
      } catch (err) {
        setFabState('default');
        showToast(`Download failed: ${err.message}`, 'error');
      }
    });

    // Action: Preview Context Digest Modal
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

    // Open options page cleanly via background
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
      await navigator.clipboard.writeText(text);
      showToast('Digest copied to clipboard!', 'success');
    });

    modalDownload.addEventListener('click', () => {
      const text = modalContent.textContent;
      const safeTitle = (cachedSession?.title || 'context-digest').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      downloadText(`${safeTitle}_handoff_digest.md`, text);
      showToast('Digest downloaded!', 'success');
    });

    // Global Keyboard Shortcuts
    window.addEventListener('keydown', async (e) => {
      if (e.altKey && e.shiftKey && e.code === 'KeyC') {
        e.preventDefault();
        await performSummarization();
      } else if (e.key === 'Escape') {
        if (drawer.classList.contains('open')) {
          drawer.classList.remove('open');
        }
        if (modal.classList.contains('open')) {
          modal.classList.remove('open');
        }
      }
    });

    // Reposition on window resize
    window.addEventListener('resize', () => {
      setButtonPosition(currentPosX, currentPosY, false);
    }, { passive: true });
  }

  // Listen for messages from Popup & Background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'EXTRACT_SESSION_REQUEST') {
      performExtraction().then((session) => {
        sendResponse({ success: true, session, platform: currentPlatform });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true; // Async response
    }
  });

  // Listen for real-time config changes from Options / Storage
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

  // Initialize
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
