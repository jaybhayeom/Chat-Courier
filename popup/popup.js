/**
 * ChatCourier - popup.js
 * Action Popup Controller & Interactive Handoff Dashboard
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const statusIndicator = document.getElementById('status-indicator');
  const statusText = document.getElementById('status-text');
  const btnOpenOptions = document.getElementById('btn-open-options');
  const detectedPlatformBadge = document.getElementById('detected-platform-badge');
  const activeProfileName = document.getElementById('active-profile-name');
  const statMessages = document.getElementById('stat-messages');
  const statWords = document.getElementById('stat-words');
  const statTokens = document.getElementById('stat-tokens');
  const btnSummarize = document.getElementById('btn-summarize');
  const btnSummarizeIcon = document.getElementById('btn-summarize-icon');
  const btnSummarizeLabel = document.getElementById('btn-summarize-label');
  const btnExtractRaw = document.getElementById('btn-extract-raw');
  const btnDownload = document.getElementById('btn-download');
  const skeletonLoader = document.getElementById('skeleton-loader');
  const previewAccordion = document.getElementById('preview-accordion');
  const previewToggle = document.getElementById('preview-toggle');
  const previewChevron = document.getElementById('preview-chevron');
  const previewContent = document.getElementById('preview-content');
  const feedbackBar = document.getElementById('feedback-bar');
  const feedbackText = document.getElementById('feedback-text');

  let activeSessionData = null;
  let activeDigest = null;
  let hasValidApiKey = false;
  let activeTabId = null;
  let autoCopyOnSummarize = true;

  // Initialize Config & Connectivity Status
  async function initConfig() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'GET_CONFIG' }, (response) => {
        if (response && response.success) {
          hasValidApiKey = response.hasKey;
          autoCopyOnSummarize = response.config?.autoCopyOnSummarize !== false;

          if (hasValidApiKey) {
            statusIndicator.classList.add('ready');
            statusText.textContent = 'API Ready';
          } else {
            statusIndicator.classList.remove('ready');
            statusText.textContent = 'API Key Required';
          }

          // Display active profile info
          if (response.activeProfile) {
            const profile = response.activeProfile;
            activeProfileName.textContent = profile.name || profile.modelId || 'Default';
          }
        } else {
          statusIndicator.classList.remove('ready');
          statusText.textContent = 'Config Error';
        }
        resolve();
      });
    });
  }

  // Open Options Page
  function openOptions() {
    chrome.runtime.sendMessage({ action: 'OPEN_OPTIONS' });
  }

  btnOpenOptions.addEventListener('click', openOptions);
  statusIndicator.addEventListener('click', () => {
    if (!hasValidApiKey) openOptions();
  });

  // UI Feedback Helper
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

  // Download Text Helper
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
  }

  // Helper to ensure scripts are injected if tab was open prior to install/reload
  async function ensureContentScriptInjected(tabId) {
    try {
      if (chrome.scripting && chrome.scripting.executeScript) {
        await chrome.scripting.insertCSS({
          target: { tabId },
          files: ['content.css']
        }).catch(() => {});

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
      console.warn('[ChatCourier] Scripting injection error:', e);
    }
    return false;
  }

  // Query tab for session data with injection fallback
  function querySessionFromTab(tabId) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_SESSION_REQUEST' }, async (response) => {
        if (chrome.runtime.lastError || !response || !response.success) {
          const injected = await ensureContentScriptInjected(tabId);
          if (injected) {
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, { action: 'EXTRACT_SESSION_REQUEST' }, (retryRes) => {
                if (retryRes && retryRes.success) {
                  resolve(retryRes);
                } else {
                  resolve(null);
                }
              });
            }, 200);
          } else {
            resolve(null);
          }
        } else {
          resolve(response);
        }
      });
    });
  }

  // Detect Active Tab & Query Content Script
  async function inspectActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      detectedPlatformBadge.textContent = 'No Active Tab';
      return;
    }
    activeTabId = tab.id;

    const url = tab.url || '';
    let platform = 'Unknown';

    if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) {
      platform = 'ChatGPT';
    } else if (url.includes('claude.ai')) {
      platform = 'Claude';
    } else if (url.includes('gemini.google.com')) {
      platform = 'Gemini';
    } else if (url.includes('perplexity.ai')) {
      platform = 'Perplexity';
    } else if (url.includes('deepseek.com')) {
      platform = 'DeepSeek';
    } else {
      detectedPlatformBadge.textContent = 'Non-Chat Page';
      showFeedback('Navigate to Gemini, Claude, ChatGPT, Perplexity, or DeepSeek.', 'info', 5000);
      return;
    }

    detectedPlatformBadge.textContent = platform;

    // Send extraction request to active tab content script
    try {
      const response = await querySessionFromTab(activeTabId);
      if (response && response.success) {
        activeSessionData = response.session;
        updateStatsDisplay(activeSessionData.stats);
      } else {
        showFeedback('Ready to extract from page', 'info');
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

  // Summarize Action Handler
  btnSummarize.addEventListener('click', async () => {
    if (!hasValidApiKey) {
      showFeedback('API Key required! Opening settings...', 'error');
      setTimeout(openOptions, 1200);
      return;
    }

    // Set Loading State
    btnSummarize.classList.add('loading');
    btnSummarizeIcon.innerHTML = `<svg viewBox="0 0 24 24" class="spin-icon"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" fill="none" stroke-dasharray="38" stroke-dashoffset="12"/></svg>`;
    btnSummarizeLabel.textContent = 'Synthesizing Digest...';
    skeletonLoader.classList.remove('hidden');
    previewAccordion.classList.add('hidden');

    try {
      // Step 1: Ensure active session data is extracted
      let transcriptText = activeSessionData ? activeSessionData.rawTranscript : '';
      if (!transcriptText && activeTabId) {
        const extractRes = await querySessionFromTab(activeTabId);
        if (extractRes && extractRes.success) {
          activeSessionData = extractRes.session;
          transcriptText = activeSessionData.rawTranscript;
          updateStatsDisplay(activeSessionData.stats);
        }
      }

      if (!transcriptText) {
        throw new Error('Unable to extract chat transcript from this page.');
      }

      // Step 2: Request summarization (background reads active profile)
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action: 'SUMMARIZE',
          payload: {
            transcript: transcriptText
          }
        }, resolve);
      });

      if (!response || !response.success) {
        throw new Error(response?.error || 'Summarization failed');
      }

      activeDigest = response.summary;

      // Bug 1 fix: respect autoCopyOnSummarize setting
      if (autoCopyOnSummarize) {
        await navigator.clipboard.writeText(activeDigest);
      }

      // Set Success State
      btnSummarize.classList.remove('loading');
      btnSummarize.classList.add('success');
      btnSummarizeIcon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
      btnSummarizeLabel.textContent = autoCopyOnSummarize ? 'Copied to Clipboard!' : 'Digest Ready!';

      // Populate preview accordion
      previewContent.textContent = activeDigest;
      previewAccordion.classList.remove('hidden');
      skeletonLoader.classList.add('hidden');
      showFeedback(autoCopyOnSummarize ? '🚀 Context Handoff Digest Copied!' : '🚀 Digest synthesized — use Preview to view', 'success');

      setTimeout(() => {
        btnSummarize.classList.remove('success');
        btnSummarizeIcon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`;
        btnSummarizeLabel.textContent = 'Summarize for Handoff';
      }, 3500);

    } catch (err) {
      console.error('[ChatCourier] Summarize error:', err);
      btnSummarize.classList.remove('loading');
      btnSummarizeIcon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`;
      btnSummarizeLabel.textContent = 'Summarize for Handoff';
      skeletonLoader.classList.add('hidden');
      showFeedback(`Error: ${err.message}`, 'error', 5000);
    }
  });

  // Copy Raw Handler
  btnExtractRaw.addEventListener('click', async () => {
    try {
      if (!activeSessionData && activeTabId) {
        const res = await querySessionFromTab(activeTabId);
        if (res && res.success) {
          activeSessionData = res.session;
          updateStatsDisplay(activeSessionData.stats);
        }
      }

      if (!activeSessionData) {
        throw new Error('No session transcript available.');
      }

      await navigator.clipboard.writeText(activeSessionData.rawTranscript);
      showFeedback('Raw transcript copied to clipboard!', 'success');
      previewContent.textContent = activeSessionData.rawTranscript;
      previewAccordion.classList.remove('hidden');
    } catch (err) {
      showFeedback(err.message, 'error');
    }
  });

  // Download Handler
  btnDownload.addEventListener('click', async () => {
    try {
      if (!activeSessionData && activeTabId) {
        const res = await querySessionFromTab(activeTabId);
        if (res && res.success) {
          activeSessionData = res.session;
          updateStatsDisplay(activeSessionData.stats);
        }
      }

      const content = activeDigest || (activeSessionData ? activeSessionData.rawTranscript : null);
      if (!content) {
        throw new Error('Please summarize or extract content first.');
      }

      const safeTitle = (activeSessionData?.title || 'chatcourier_handoff').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
      downloadText(`${safeTitle}.md`, content, 'text/markdown');
      showFeedback('Downloaded as .md!', 'success');
    } catch (err) {
      showFeedback(err.message, 'error');
    }
  });

  // Toggle Preview Accordion
  previewToggle.addEventListener('click', () => {
    const isClosed = previewContent.parentElement.style.display === 'none';
    previewContent.parentElement.style.display = isClosed ? 'block' : 'none';
    previewChevron.textContent = isClosed ? '▼' : '▲';
  });

  // Init sequence
  await initConfig();
  await inspectActiveTab();
});
