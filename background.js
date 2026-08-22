/**
 * ChatCourier - background.js
 * Manifest V3 Background Service Worker & OpenAI-Compatible API Orchestration Engine
 */

const DEFAULT_CONFIG = {
  profiles: [
    {
      id: 'default',
      name: 'Groq — Fast',
      endpoint: 'https://api.groq.com/openai/v1',
      modelId: 'llama-3.3-70b-versatile',
      apiKey: ''
    }
  ],
  activeProfileId: 'default',
  autoCopyOnSummarize: true,
  showNotifications: true,
  fabEnabled: true,
  temperature: 0.2,
  maxTokens: 4096,
  customSystemPrompt: `You are ChatCourier, an elite LLM Context Handoff Engine.
Your mission is to ingest a conversation transcript from another AI platform (ChatGPT, Claude, Gemini, Perplexity, DeepSeek) and synthesize a high-density, structured Context Handoff Digest. This digest will be passed directly to another frontier LLM as prompt context to seamlessly continue work without loss of fidelity.

You must format your response with the following 4 structured sections in clean GitHub-flavored Markdown:

# 🚀 Context Handoff Digest: [Topic / Project Name]
> **Source Platform**: [Platform Name] | **Session Date**: [Date] | **Turns Analyzed**: [Turn Count]

## 1. 🎯 Primary Goal & High-Level Context
- Concise explanation of the core problem, objective, user intent, and high-level architecture.

## 2. ⚡ Key Decisions Made & Architectural Constraints
- Technical choices agreed upon (libraries, algorithms, conventions, design patterns).
- Hard constraints, non-negotiable requirements, or rejected alternatives with reasons.

## 3. 📦 Active Code, Schemas & Working Data Artifacts
- Output all working code snippets, schemas, API contracts, configs, or data structures established in the session.
- Preserve exact syntax, language tags, and symbol names.

## 4. 📋 Pending Tasks & Immediate Next Steps
- Concrete checklist of remaining tasks, unfinished logic, edge cases to handle, and direct prompts for the receiving LLM to execute next.

Maintain high technical density. Do not include conversational filler.`
};

// Initialize default storage on install or startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ChatCourier] Extension installed/updated:', details.reason);
  try {
    const stored = await getStorageData();

    // Migrate legacy fields if present
    if (stored.groqApiKey && !stored.profiles) {
      const migratedProfile = {
        id: 'default',
        name: 'Groq — Fast',
        endpoint: 'https://api.groq.com/openai/v1',
        modelId: stored.defaultModel || 'llama-3.3-70b-versatile',
        apiKey: stored.groqApiKey
      };
      stored.profiles = [migratedProfile];
      stored.activeProfileId = 'default';
      // Clean up legacy keys
      delete stored.groqApiKey;
      delete stored.defaultModel;
      delete stored.outputFormat;
      delete stored.iconTheme;
      delete stored.buttonPosition;
    }

    const initial = { ...DEFAULT_CONFIG, ...stored };
    await setStorageData(initial);

    // Clear any data from chrome.storage.sync (migration from old version)
    try {
      chrome.storage.sync.clear();
    } catch (_) {}
  } catch (e) {
    console.error('[ChatCourier] Error initializing storage:', e);
  }

  // Set default badge state
  try {
    chrome.action.setBadgeText({ text: '' });
  } catch (_) {}
});

/**
 * Storage helpers — chrome.storage.local ONLY (never sync credentials)
 */
async function getStorageData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (data) => {
      resolve(data || {});
    });
  });
}

async function setStorageData(items) {
  return new Promise((resolve) => {
    chrome.storage.local.set(items, () => {
      resolve();
    });
  });
}

/**
 * Resolves the currently active profile from config
 */
function resolveActiveProfile(config) {
  const profiles = config.profiles || DEFAULT_CONFIG.profiles;
  const activeId = config.activeProfileId || 'default';
  return profiles.find(p => p.id === activeId) || profiles[0] || DEFAULT_CONFIG.profiles[0];
}

/**
 * Badge state manager
 */
function updateBadge(text, color = '#6366f1', clearAfterMs = 0) {
  try {
    chrome.action.setBadgeText({ text });
    if (color) {
      chrome.action.setBadgeBackgroundColor({ color });
    }
    if (clearAfterMs > 0) {
      setTimeout(() => {
        try {
          chrome.action.setBadgeText({ text: '' });
        } catch (_) {}
      }, clearAfterMs);
    }
  } catch (e) {
    console.warn('[ChatCourier] Badge update warning:', e);
  }
}

/**
 * Desktop notification helper
 */
function notifyUser(title, message, isError = false) {
  try {
    if (chrome.notifications && chrome.notifications.create) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: `ChatCourier - ${title}`,
        message: String(message || ''),
        priority: isError ? 2 : 1
      });
    }
  } catch (e) {
    console.warn('[ChatCourier] Notification warning:', e);
  }
}

/**
 * OpenAI-Compatible Chat Completions API Client
 * Works with Groq, OpenAI, OpenRouter, Together, Ollama, etc.
 */
async function callCompletionAPI({ endpoint, apiKey, model, systemPrompt, userContent, temperature, maxTokens }) {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API Key is missing. Please configure your API key in ChatCourier settings.');
  }

  const completionsUrl = `${endpoint.replace(/\/+$/, '')}/chat/completions`;
  const payload = {
    model: model || 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: systemPrompt || DEFAULT_CONFIG.customSystemPrompt
      },
      {
        role: 'user',
        content: userContent
      }
    ],
    temperature: typeof temperature === 'number' ? temperature : 0.2,
    max_tokens: typeof maxTokens === 'number' ? maxTokens : 4096
  };

  const response = await fetch(completionsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error && errorJson.error.message) {
        errorDetail = errorJson.error.message;
      }
    } catch (_) {}

    if (response.status === 401) {
      throw new Error(`Authentication Failed: Invalid API Key (${errorDetail})`);
    } else if (response.status === 429) {
      throw new Error(`Rate Limit Exceeded: API rate limit reached (${errorDetail})`);
    } else if (response.status === 400) {
      throw new Error(`Bad Request: Conversation may exceed model context window (${errorDetail})`);
    }
    throw new Error(`API Error: ${errorDetail}`);
  }

  const data = await response.json();
  const summary = data.choices?.[0]?.message?.content;
  if (!summary) {
    throw new Error('API returned an empty response.');
  }

  return {
    summary,
    model: data.model,
    usage: data.usage || {}
  };
}

/**
 * Tests connection to an OpenAI-compatible API endpoint.
 * Tries GET /models first; falls back to a minimal chat completion test.
 */
async function testConnection(endpoint, apiKey) {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, message: 'API key is empty' };
  }

  const baseUrl = endpoint.replace(/\/+$/, '');

  // Attempt 1: GET /models (standard OpenAI/Groq endpoint)
  try {
    const modelsRes = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });

    if (modelsRes.ok) {
      const data = await modelsRes.json();
      return { valid: true, models: data.data || [], method: 'models' };
    } else if (modelsRes.status === 401 || modelsRes.status === 403) {
      const err = await modelsRes.json().catch(() => ({}));
      return { valid: false, message: err.error?.message || `Authentication failed (HTTP ${modelsRes.status})` };
    }
    // If /models returns 404 or other non-auth error, try the completion fallback
  } catch (fetchErr) {
    // Network error on /models — try completion fallback
  }

  // Attempt 2: Minimal completion test (for providers without /models)
  try {
    const testRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Common fallback model name
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 1
      })
    });

    if (testRes.ok) {
      return { valid: true, models: [], method: 'completion-test' };
    } else if (testRes.status === 401 || testRes.status === 403) {
      const err = await testRes.json().catch(() => ({}));
      return { valid: false, message: err.error?.message || `Authentication failed (HTTP ${testRes.status})` };
    } else {
      // Non-auth error (e.g., model not found) but auth worked
      return { valid: true, models: [], method: 'completion-test-partial' };
    }
  } catch (err) {
    return { valid: false, message: `Connection failed: ${err.message}` };
  }
}

/**
 * Message Bus Dispatcher
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message || {};

  switch (action) {
    case 'GET_CONFIG': {
      getStorageData().then((config) => {
        const merged = { ...DEFAULT_CONFIG, ...config };
        const activeProfile = resolveActiveProfile(merged);
        const hasKey = Boolean(activeProfile.apiKey && activeProfile.apiKey.trim().length > 5);
        sendResponse({ success: true, config: merged, activeProfile, hasKey });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true; // Async response
    }

    case 'SAVE_SETTINGS': {
      const {
        customSystemPrompt,
        autoCopyOnSummarize,
        showNotifications,
        fabEnabled,
        temperature,
        maxTokens
      } = payload || {};

      const updates = {};
      if (customSystemPrompt !== undefined) updates.customSystemPrompt = customSystemPrompt;
      if (autoCopyOnSummarize !== undefined) updates.autoCopyOnSummarize = autoCopyOnSummarize;
      if (showNotifications !== undefined) updates.showNotifications = showNotifications;
      if (fabEnabled !== undefined) updates.fabEnabled = fabEnabled;
      if (temperature !== undefined) updates.temperature = temperature;
      if (maxTokens !== undefined) updates.maxTokens = maxTokens;

      setStorageData(updates).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'SAVE_PROFILE': {
      const profile = payload?.profile;
      if (!profile || !profile.id) {
        sendResponse({ success: false, error: 'Invalid profile data' });
        return false;
      }

      getStorageData().then(async (config) => {
        const merged = { ...DEFAULT_CONFIG, ...config };
        const profiles = [...(merged.profiles || [])];
        const existingIdx = profiles.findIndex(p => p.id === profile.id);

        if (existingIdx >= 0) {
          profiles[existingIdx] = profile;
        } else {
          profiles.push(profile);
        }

        await setStorageData({ profiles });
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'DELETE_PROFILE': {
      const deleteId = payload?.profileId;
      if (!deleteId) {
        sendResponse({ success: false, error: 'No profile ID provided' });
        return false;
      }

      getStorageData().then(async (config) => {
        const merged = { ...DEFAULT_CONFIG, ...config };
        const profiles = (merged.profiles || []).filter(p => p.id !== deleteId);

        if (profiles.length === 0) {
          sendResponse({ success: false, error: 'Cannot delete the last profile' });
          return;
        }

        const updates = { profiles };
        // If we deleted the active profile, switch to the first remaining one
        if (merged.activeProfileId === deleteId) {
          updates.activeProfileId = profiles[0].id;
        }

        await setStorageData(updates);
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'SET_ACTIVE_PROFILE': {
      const profileId = payload?.profileId;
      if (!profileId) {
        sendResponse({ success: false, error: 'No profile ID provided' });
        return false;
      }

      setStorageData({ activeProfileId: profileId }).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'TEST_CONNECTION': {
      const { endpoint, apiKey } = payload || {};
      testConnection(endpoint, apiKey).then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({ valid: false, message: err.message });
      });
      return true;
    }

    // Legacy support — keep old action name working during migration
    case 'TEST_API_KEY': {
      const apiKey = payload?.apiKey;
      getStorageData().then(async (config) => {
        const merged = { ...DEFAULT_CONFIG, ...config };
        const activeProfile = resolveActiveProfile(merged);
        const endpoint = activeProfile.endpoint || 'https://api.groq.com/openai/v1';
        const result = await testConnection(endpoint, apiKey);
        sendResponse(result);
      }).catch(err => {
        sendResponse({ valid: false, message: err.message });
      });
      return true;
    }

    case 'SUMMARIZE': {
      updateBadge('SUM', '#8b5cf6');
      (async () => {
        let showNotif = true;
        try {
          const config = await getStorageData();
          const effectiveConfig = { ...DEFAULT_CONFIG, ...config };
          showNotif = effectiveConfig.showNotifications !== false;
          const activeProfile = resolveActiveProfile(effectiveConfig);

          const endpoint = activeProfile.endpoint || 'https://api.groq.com/openai/v1';
          const apiKey = payload?.apiKey || activeProfile.apiKey;
          const model = payload?.model || activeProfile.modelId;
          const transcript = payload?.transcript;
          const systemPrompt = payload?.systemPrompt || effectiveConfig.customSystemPrompt;

          if (!transcript) {
            throw new Error('No transcript data provided for summarization.');
          }

          const result = await callCompletionAPI({
            endpoint,
            apiKey,
            model,
            systemPrompt,
            userContent: transcript,
            temperature: effectiveConfig.temperature,
            maxTokens: effectiveConfig.maxTokens
          });

          updateBadge('DONE', '#10b981', 3000);
          if (showNotif) {
            notifyUser('Handoff Ready', 'LLM Context Digest successfully synthesized!');
          }

          sendResponse({ success: true, ...result });
        } catch (err) {
          updateBadge('ERR', '#ef4444', 4000);
          if (showNotif) {
            notifyUser('Summarization Failed', err.message, true);
          }
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    // Legacy action name support
    case 'SUMMARIZE_GROQ': {
      // Forward to the new SUMMARIZE handler
      updateBadge('SUM', '#8b5cf6');
      (async () => {
        let showNotif = true;
        try {
          const config = await getStorageData();
          const effectiveConfig = { ...DEFAULT_CONFIG, ...config };
          showNotif = effectiveConfig.showNotifications !== false;
          const activeProfile = resolveActiveProfile(effectiveConfig);

          const endpoint = activeProfile.endpoint || 'https://api.groq.com/openai/v1';
          const apiKey = payload?.apiKey || activeProfile.apiKey;
          const model = payload?.model || activeProfile.modelId;
          const transcript = payload?.transcript;
          const systemPrompt = payload?.systemPrompt || effectiveConfig.customSystemPrompt;

          if (!transcript) {
            throw new Error('No transcript data provided for summarization.');
          }

          const result = await callCompletionAPI({
            endpoint,
            apiKey,
            model,
            systemPrompt,
            userContent: transcript,
            temperature: effectiveConfig.temperature,
            maxTokens: effectiveConfig.maxTokens
          });

          updateBadge('DONE', '#10b981', 3000);
          if (showNotif) {
            notifyUser('Handoff Ready', 'LLM Context Digest successfully synthesized!');
          }

          sendResponse({ success: true, ...result });
        } catch (err) {
          updateBadge('ERR', '#ef4444', 4000);
          if (showNotif) {
            notifyUser('Summarization Failed', err.message, true);
          }
          sendResponse({ success: false, error: err.message });
        }
      })();
      return true;
    }

    // Legacy support for old SAVE_API_KEY action
    case 'SAVE_API_KEY': {
      const {
        apiKey,
        defaultModel,
        customSystemPrompt,
        autoCopyOnSummarize,
        showNotifications,
        fabEnabled,
        temperature,
        maxTokens
      } = payload || {};

      getStorageData().then(async (config) => {
        const merged = { ...DEFAULT_CONFIG, ...config };
        const updates = {};

        // Update general settings
        if (customSystemPrompt !== undefined) updates.customSystemPrompt = customSystemPrompt;
        if (autoCopyOnSummarize !== undefined) updates.autoCopyOnSummarize = autoCopyOnSummarize;
        if (showNotifications !== undefined) updates.showNotifications = showNotifications;
        if (fabEnabled !== undefined) updates.fabEnabled = fabEnabled;
        if (temperature !== undefined) updates.temperature = temperature;
        if (maxTokens !== undefined) updates.maxTokens = maxTokens;

        // Update active profile if apiKey or model provided
        if (apiKey !== undefined || defaultModel !== undefined) {
          const profiles = [...(merged.profiles || DEFAULT_CONFIG.profiles)];
          const activeProfile = profiles.find(p => p.id === merged.activeProfileId) || profiles[0];
          if (apiKey !== undefined) activeProfile.apiKey = apiKey;
          if (defaultModel !== undefined) activeProfile.modelId = defaultModel;
          updates.profiles = profiles;
        }

        await setStorageData(updates);
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'OPEN_OPTIONS': {
      try {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage(() => {
            sendResponse({ success: true });
          });
        } else {
          chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') }, () => {
            sendResponse({ success: true });
          });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    case 'SET_BADGE': {
      const { text, color, clearAfterMs } = payload || {};
      updateBadge(text, color, clearAfterMs);
      sendResponse({ success: true });
      return false;
    }

    case 'SHOW_NOTIFICATION': {
      const { title, message, isError } = payload || {};
      notifyUser(title, message, isError);
      sendResponse({ success: true });
      return false;
    }

    default:
      sendResponse({ success: false, error: `Unknown action: ${action}` });
      return false;
  }
});
