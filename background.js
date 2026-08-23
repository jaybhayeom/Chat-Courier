/**
 * ChatCourier - background.js
 * Manifest V3 Background Service Worker & Unified Template Execution Engine
 */

const DEFAULT_CORE_VOICE_DIRECTIVE = `You are producing a deliverable that a human user will read, edit, and use directly — not writing a conversational reply. Follow these rules without exception:

- Output ONLY the requested deliverable. No preamble, no closing remarks, no "Here is...", "Sure,", "I hope this helps!", or "Let me know if...". Start directly with the content itself and end when the content ends.
- Never refer to yourself, your capabilities, or your nature as an AI, model, or assistant. Never write "As an AI...", "I've generated...", "based on my analysis...", or any similar self-referential framing.
- Never hedge, apologize, or add disclaimers about accuracy or limitations unless the task explicitly asks for a confidence assessment.
- No emoji, anywhere, for any reason — not as bullets, not as section markers, not for emphasis. Use plain text headers and standard markdown structure only where the task calls for structure at all.
- Write in the voice of a skilled human professional doing this work directly — a senior prompt engineer, a technical writer, an experienced colleague — never in the voice of an AI narrating what it is doing.
- Point of View: Write strictly from the USER's perspective addressing the AI ("You are...", "Your task is...", "Requirements & Constraints:"). When producing summaries, deliver a finished professional document.
- This is a draft for a human to review before it is used or sent onward. You are producing material for them to act on, not acting on their behalf. Do not narrate an in-progress process ("I will now...", "Next I'll...") — hand off a finished piece.`;

const DEFAULT_TEMPLATES = [
  {
    id: 'digest',
    label: 'Context Handoff Digest',
    defaultPrompt: `You are writing a project handoff document for someone continuing this work. Produce a faithful, complete record of what happened in the session — do not invent details, do not editorialize about quality, and do not comment on the process of writing the digest itself.

Structure the output under these plain-text headers, in this order:

Goal
  What the session set out to accomplish, in two or three sentences.

Key Decisions
  Concrete decisions made and the constraints or rationale behind each, as a short list. Skip this section entirely if none were made — do not pad it with restated goals.

Artifacts & Data
  Any code, schemas, file structures, or concrete data produced, quoted directly where short, described precisely where long.

Pending Tasks
  What remains open, as an actionable checklist — not vague summary statements like "more work is needed."

If the session's content doesn't cleanly fill one of these sections, omit that section rather than inventing content to complete it.`,
    userOverride: null
  },
  {
    id: 'rewriter',
    label: 'Prompt Rewriter',
    defaultPrompt: `You are an expert prompt engineer. Your job is to take a user's rough draft prompt and expand, enrich, and rewrite it from the USER's perspective into a comprehensive, professional master prompt ready to be sent directly to an AI.

Requirements:
1. User Perspective: Write strictly from the USER's point of view directing an AI assistant (e.g., "Act as an expert...", "Your task is to...", "Core Requirements:", "Step-by-Step Instructions:"). Never speak from an AI or third-person perspective (do not write "The user wants...").
2. Deeply Extend & Expand: Add the necessary architectural depth, domain best practices, explicit functional constraints, edge-case handling, and output format specifications that the draft implies.
3. Structure: Organize the rewritten prompt with clear Markdown sections (Role, Objective, Context, Constraints, Step-by-Step Execution, Expected Deliverables).
4. Zero Meta-Commentary: Do NOT answer the prompt, do NOT explain what you changed, and do NOT include conversational greetings. Return ONLY the rewritten prompt ready to send.`,
    userOverride: null
  },
  {
    id: 'thinking_quick',
    label: 'Thinking Mode: Quick Check',
    defaultPrompt: `Before finalizing your answer, briefly re-check it for obvious errors or gaps, then proceed. Keep this check quick — a single pass, not an extended review.`,
    userOverride: null
  },
  {
    id: 'thinking_standard',
    label: 'Thinking Mode: Standard Review',
    defaultPrompt: `Work through this sequentially rather than jumping to a conclusion. Once you have a draft answer, do a full top-to-bottom review of the relevant context to confirm nothing was missed, and explicitly check for errors or edge cases before finalizing your response.`,
    userOverride: null
  },
  {
    id: 'thinking_deep',
    label: 'Thinking Mode: Deep Review',
    defaultPrompt: `Work through this sequentially, in full. After forming an initial answer, run a second, independent pass over the same material specifically looking for what the first pass might have missed. Explicitly enumerate edge cases or failure modes relevant to the task, and confirm the answer holds up against each one before finalizing. Prioritize catching a real gap over finishing quickly.`,
    userOverride: null
  },
  {
    id: 'auto_suggest',
    label: 'Auto-Suggested Next Steps',
    defaultPrompt: `Add one final section, clearly separated from the rest of the document, titled exactly:

Suggested Next Steps (generated, not part of the session record)

Under it, list exactly three next steps grounded specifically in what the session actually covered — not generic advice that could apply to any project. Keep each to one or two sentences. Do not blend this section's tone or formatting with the sections above it — it must read as clearly separable from the faithful digest, since that separation is what keeps the rest of the document trustworthy.`,
    userOverride: null
  }
];

const DEFAULT_PERSONAS = [
  {
    id: 'persona_architect',
    name: 'Senior Software Architect',
    description: 'Systems-level thinker focusing on clean boundaries, defensive handling, and scalability.',
    instructionBlock: 'You are a Principal Software Architect. Prioritize modularity, type safety, clear architectural contracts, and defensive error handling.',
    preferredPlatform: 'any'
  },
  {
    id: 'persona_concise',
    name: 'Concise Code Reviewer',
    description: 'Zero conversational filler, diff-first responses focusing strictly on correctness.',
    instructionBlock: 'You are a Senior Code Reviewer. Provide minimal commentary, zero conversational filler, and direct working code solutions with precise diffs.',
    preferredPlatform: 'any'
  }
];

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
  personas: DEFAULT_PERSONAS,
  activePersonaId: null,
  coreVoiceDirective: null,
  templates: DEFAULT_TEMPLATES,
  clipboardHistory: [],
  settings: {
    autoCopyOnSummarize: true,
    showNotifications: true,
    fabEnabled: true,
    fastMode: false,
    maxClipboardEntries: 30,
    thinkingModeEnabled: false,
    thinkingModeDepth: 'standard',
    autoSuggestEnabled: false,
    temperature: 0.2,
    maxTokens: 4096
  }
};

// Initialize default storage on install or startup
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[ChatCourier] Installed/updated:', details.reason);
  try {
    const stored = await getStorageData();

    // Migrate flat settings to nested settings object if present
    const settings = {
      ...DEFAULT_CONFIG.settings,
      ...(stored.settings || {})
    };

    if (stored.autoCopyOnSummarize !== undefined) settings.autoCopyOnSummarize = stored.autoCopyOnSummarize;
    if (stored.showNotifications !== undefined) settings.showNotifications = stored.showNotifications;
    if (stored.fabEnabled !== undefined) settings.fabEnabled = stored.fabEnabled;
    if (stored.temperature !== undefined) settings.temperature = stored.temperature;
    if (stored.maxTokens !== undefined) settings.maxTokens = stored.maxTokens;

    // Migrate templates
    let templates = stored.templates || DEFAULT_TEMPLATES;
    // Ensure all default templates exist and have updated defaultPrompt
    templates = DEFAULT_TEMPLATES.map(dt => {
      const existing = (stored.templates || []).find(t => t.id === dt.id);
      return {
        id: dt.id,
        label: dt.label,
        defaultPrompt: dt.defaultPrompt,
        userOverride: existing ? existing.userOverride : null
      };
    });

    // Migrate customSystemPrompt into digest template if present
    if (stored.customSystemPrompt) {
      const digestTpl = templates.find(t => t.id === 'digest');
      if (digestTpl && !digestTpl.userOverride) {
        digestTpl.userOverride = stored.customSystemPrompt;
      }
    }

    const merged = {
      profiles: stored.profiles || DEFAULT_CONFIG.profiles,
      activeProfileId: stored.activeProfileId || 'default',
      personas: stored.personas || DEFAULT_PERSONAS,
      activePersonaId: stored.activePersonaId || null,
      coreVoiceDirective: stored.coreVoiceDirective !== undefined ? stored.coreVoiceDirective : null,
      templates,
      clipboardHistory: stored.clipboardHistory || [],
      settings
    };

    // Clean up legacy flat keys
    delete stored.groqApiKey;
    delete stored.defaultModel;
    delete stored.outputFormat;
    delete stored.iconTheme;
    delete stored.buttonPosition;
    delete stored.customSystemPrompt;
    delete stored.autoCopyOnSummarize;
    delete stored.showNotifications;
    delete stored.fabEnabled;
    delete stored.temperature;
    delete stored.maxTokens;

    await setStorageData(merged);

    try {
      chrome.storage.sync.clear();
    } catch (_) {}
  } catch (e) {
    console.error('[ChatCourier] Error initializing storage:', e);
  }

  try {
    chrome.action.setBadgeText({ text: '' });
  } catch (_) {}
});

/**
 * Storage helpers — chrome.storage.local ONLY
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
 * Resolves effective prompt for a given template ID
 */
function resolveTemplatePrompt(templates, templateId) {
  const tpl = (templates || DEFAULT_TEMPLATES).find(t => t.id === templateId);
  if (!tpl) {
    const fallback = DEFAULT_TEMPLATES.find(t => t.id === templateId);
    return fallback ? (fallback.userOverride || fallback.defaultPrompt) : '';
  }
  return tpl.userOverride || tpl.defaultPrompt;
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
    console.warn('[ChatCourier] Badge warning:', e);
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
 */
async function callCompletionAPI({ endpoint, apiKey, model, systemPrompt, userContent, temperature, maxTokens }) {
  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error('API Key is missing. Please configure your connection profile in ChatCourier settings.');
  }

  const completionsUrl = `${endpoint.replace(/\/+$/, '')}/chat/completions`;
  const payload = {
    model: model || 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userContent
      }
    ],
    temperature: typeof temperature === 'number' ? temperature : 0.2,
    max_tokens: typeof maxTokens === 'number' ? maxTokens : 4096
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response;
  try {
    response = await fetch(completionsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
  } catch (fetchErr) {
    if (fetchErr.name === 'AbortError') {
      throw new Error('Request timed out (30s limit exceeded). Please check your network or provider status.');
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }

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
      throw new Error(`Bad Request: Prompt or context window issue (${errorDetail})`);
    }
    throw new Error(`API Error: ${errorDetail}`);
  }

  const data = await response.json();
  const resultText = data.choices?.[0]?.message?.content;
  if (!resultText) {
    throw new Error('API returned an empty response.');
  }

  return {
    content: resultText,
    model: data.model,
    usage: data.usage || {}
  };
}

/**
 * Tests connection to an OpenAI-compatible API endpoint
 */
async function testConnection(endpoint, apiKey) {
  if (!apiKey || apiKey.trim().length === 0) {
    return { valid: false, message: 'API key is empty' };
  }

  const baseUrl = endpoint.replace(/\/+$/, '');

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
  } catch (fetchErr) {}

  // Fallback: minimal completion check
  try {
    const testRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 1
      })
    });

    if (testRes.ok) {
      return { valid: true, models: [], method: 'completion-test' };
    } else if (testRes.status === 401 || testRes.status === 403) {
      const err = await testRes.json().catch(() => ({}));
      return { valid: false, message: err.error?.message || `Authentication failed (HTTP ${testRes.status})` };
    } else {
      return { valid: true, models: [], method: 'completion-test-partial' };
    }
  } catch (err) {
    return { valid: false, message: `Connection failed: ${err.message}` };
  }
}

/**
 * Appends an item to Clipboard History (capped at max entries)
 */
async function appendClipboardHistory(item) {
  try {
    const data = await getStorageData();
    const history = data.clipboardHistory || [];
    const maxEntries = data.settings?.maxClipboardEntries || 30;

    const newItem = {
      id: 'clip_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      kind: item.kind || 'digest',
      preview: String(item.fullText || '').split('\n').filter(l => l.trim().length > 0)[0]?.slice(0, 100) || 'Copied text',
      fullText: item.fullText,
      copiedAt: Date.now(),
      sourcePlatform: item.sourcePlatform || 'generic'
    };

    const updated = [newItem, ...history.filter(h => h.fullText !== item.fullText)].slice(0, maxEntries);
    await setStorageData({ clipboardHistory: updated });
  } catch (e) {
    console.warn('[ChatCourier] History append warning:', e);
  }
}

/**
 * Unified template execution engine
 */
async function executeTemplateRun(payload) {
  const stored = await getStorageData();
  const config = {
    profiles: stored.profiles || DEFAULT_CONFIG.profiles,
    activeProfileId: stored.activeProfileId || 'default',
    personas: stored.personas || DEFAULT_PERSONAS,
    activePersonaId: stored.activePersonaId || null,
    coreVoiceDirective: stored.coreVoiceDirective !== undefined ? stored.coreVoiceDirective : null,
    templates: stored.templates || DEFAULT_TEMPLATES,
    clipboardHistory: stored.clipboardHistory || [],
    settings: { ...DEFAULT_CONFIG.settings, ...(stored.settings || {}) }
  };
  const settings = config.settings;
  const activeProfile = resolveActiveProfile(config);

  const {
    templateId = 'digest',
    userContent = '',
    extra = {}
  } = payload || {};

  if (!userContent || userContent.trim().length === 0) {
    throw new Error('No content provided for processing.');
  }

  // 1. Resolve base template
  let taskPrompt = resolveTemplatePrompt(config.templates, templateId);

  // 2. Chain Thinking Mode depth template if enabled or requested
  const thinkingEnabled = extra.thinkingDepth !== undefined ? Boolean(extra.thinkingDepth) : settings.thinkingModeEnabled;
  if (thinkingEnabled) {
    const depth = extra.thinkingDepth || settings.thinkingModeDepth || 'standard';
    const depthTemplateId = `thinking_${depth}`;
    const thinkingPrompt = resolveTemplatePrompt(config.templates, depthTemplateId);
    if (thinkingPrompt) {
      taskPrompt = `${thinkingPrompt}\n\n${taskPrompt}`;
    }
  }

  // 3. Chain Persona instruction block if active or specified
  const personaId = extra.personaId !== undefined ? extra.personaId : config.activePersonaId;
  if (personaId) {
    const personas = config.personas || DEFAULT_PERSONAS;
    const persona = personas.find(p => p.id === personaId);
    if (persona && persona.instructionBlock) {
      taskPrompt = `[Active Persona: ${persona.name}]\n${persona.instructionBlock}\n\n${taskPrompt}`;
    }
  }

  // 4. Chain Auto-Suggested Next Steps if enabled and template is digest
  const autoSuggestEnabled = extra.autoSuggest !== undefined ? Boolean(extra.autoSuggest) : settings.autoSuggestEnabled;
  if (autoSuggestEnabled && templateId === 'digest') {
    const autoSuggestPrompt = resolveTemplatePrompt(config.templates, 'auto_suggest');
    if (autoSuggestPrompt) {
      taskPrompt = `${taskPrompt}\n\n${autoSuggestPrompt}`;
    }
  }

  // 5. Prepend Global Core Voice Directive ahead of all templates (Addendum 3)
  const coreVoice = (config.coreVoiceDirective !== undefined && config.coreVoiceDirective !== null)
    ? config.coreVoiceDirective
    : DEFAULT_CORE_VOICE_DIRECTIVE;

  const systemPrompt = coreVoice ? `${coreVoice}\n\n${taskPrompt}` : taskPrompt;

  // Format user content framing so target LLMs properly execute without confusion
  let formattedUserContent = userContent.trim();
  if (templateId === 'rewriter') {
    formattedUserContent = `[USER DRAFT PROMPT TO EXTEND & REWRITE]:\n"""\n${userContent.trim()}\n"""\n\nTask: Expand and rewrite the draft prompt above from the USER's point of view into an expert-level, comprehensive master prompt. Include role definition, detailed requirements, step-by-step instructions, constraints, and output specifications. Output ONLY the rewritten prompt ready to send to an AI.`;
  } else if (templateId === 'digest') {
    formattedUserContent = `[CONVERSATION TRANSCRIPT TO SUMMARIZE FOR HANDOFF]:\n\n${userContent.trim()}\n\n---\nSynthesize a faithful, high-density Context Handoff Digest based strictly on the transcript above following the specified section headers.`;
  }

  const endpoint = activeProfile.endpoint || 'https://api.groq.com/openai/v1';
  const apiKey = activeProfile.apiKey;
  const model = activeProfile.modelId;

  const result = await callCompletionAPI({
    endpoint,
    apiKey,
    model,
    systemPrompt,
    userContent: formattedUserContent,
    temperature: settings.temperature,
    maxTokens: settings.maxTokens
  });

  updateBadge('DONE', '#10b981', 3000);
  if (settings.showNotifications) {
    const title = templateId === 'rewriter' ? 'Prompt Rewritten' : 'Handoff Ready';
    const body = templateId === 'rewriter' ? 'Prompt successfully enhanced.' : 'Context digest synthesized.';
    notifyUser(title, body);
  }

  return { success: true, summary: result.content, model: result.model, usage: result.usage };
}

/**
 * Message Bus Dispatcher
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message || {};

  switch (action) {
    case 'GET_CONFIG': {
      getStorageData().then((config) => {
        const merged = {
          profiles: config.profiles || DEFAULT_CONFIG.profiles,
          activeProfileId: config.activeProfileId || 'default',
          personas: config.personas || DEFAULT_PERSONAS,
          activePersonaId: config.activePersonaId || null,
          coreVoiceDirective: config.coreVoiceDirective !== undefined ? config.coreVoiceDirective : null,
          defaultCoreVoiceDirective: DEFAULT_CORE_VOICE_DIRECTIVE,
          templates: config.templates || DEFAULT_TEMPLATES,
          clipboardHistory: config.clipboardHistory || [],
          settings: { ...DEFAULT_CONFIG.settings, ...(config.settings || {}) }
        };
        const activeProfile = resolveActiveProfile(merged);
        const hasKey = Boolean(activeProfile.apiKey && activeProfile.apiKey.trim().length > 5);
        sendResponse({ success: true, config: merged, activeProfile, hasKey });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'SAVE_SETTINGS': {
      getStorageData().then(async (config) => {
        const currentSettings = config.settings || DEFAULT_CONFIG.settings;
        const newSettings = { ...currentSettings, ...(payload || {}) };
        await setStorageData({ settings: newSettings });
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    // ── Unified Template Execution Engine ──
    case 'RUN_TEMPLATE': {
      updateBadge('RUN', '#8b5cf6');
      executeTemplateRun(payload).then(res => {
        sendResponse(res);
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    // ── Core Voice Directive CRUD ──
    case 'SAVE_CORE_VOICE': {
      const { coreVoiceDirective } = payload || {};
      getStorageData().then(async () => {
        await setStorageData({ coreVoiceDirective: coreVoiceDirective || null });
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'RESET_CORE_VOICE': {
      getStorageData().then(async () => {
        await setStorageData({ coreVoiceDirective: null });
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    // ── Template CRUD ──
    case 'SAVE_TEMPLATE': {
      const { templateId, userOverride } = payload || {};
      getStorageData().then(async (config) => {
        const templates = [...(config.templates || DEFAULT_TEMPLATES)];
        const idx = templates.findIndex(t => t.id === templateId);
        if (idx >= 0) {
          templates[idx] = { ...templates[idx], userOverride };
        }
        await setStorageData({ templates });
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'RESET_TEMPLATE': {
      const { templateId } = payload || {};
      getStorageData().then(async (config) => {
        const templates = [...(config.templates || DEFAULT_TEMPLATES)];
        const idx = templates.findIndex(t => t.id === templateId);
        if (idx >= 0) {
          templates[idx] = { ...templates[idx], userOverride: null };
        }
        await setStorageData({ templates });
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    // ── Profile CRUD ──
    case 'SAVE_PROFILE': {
      const profile = payload?.profile;
      if (!profile || !profile.id) {
        sendResponse({ success: false, error: 'Invalid profile data' });
        return false;
      }

      getStorageData().then(async (config) => {
        const profiles = [...(config.profiles || DEFAULT_CONFIG.profiles)];
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
      getStorageData().then(async (config) => {
        const profiles = (config.profiles || []).filter(p => p.id !== deleteId);
        if (profiles.length === 0) {
          sendResponse({ success: false, error: 'Cannot delete the last profile' });
          return;
        }
        const updates = { profiles };
        if (config.activeProfileId === deleteId) {
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
      setStorageData({ activeProfileId: profileId }).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    // ── Persona CRUD ──
    case 'SAVE_PERSONA': {
      const persona = payload?.persona;
      if (!persona || !persona.id) {
        sendResponse({ success: false, error: 'Invalid persona data' });
        return false;
      }

      getStorageData().then(async (config) => {
        const personas = [...(config.personas || DEFAULT_PERSONAS)];
        const existingIdx = personas.findIndex(p => p.id === persona.id);

        if (existingIdx >= 0) {
          personas[existingIdx] = persona;
        } else {
          personas.push(persona);
        }

        await setStorageData({ personas });
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'DELETE_PERSONA': {
      const deleteId = payload?.personaId;
      getStorageData().then(async (config) => {
        const personas = (config.personas || []).filter(p => p.id !== deleteId);
        const updates = { personas };
        if (config.activePersonaId === deleteId) {
          updates.activePersonaId = null;
        }
        await setStorageData(updates);
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'SET_ACTIVE_PERSONA': {
      const personaId = payload?.personaId || null;
      setStorageData({ activePersonaId: personaId }).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'IMPORT_PERSONAS': {
      const imported = payload?.personas;
      if (!Array.isArray(imported)) {
        sendResponse({ success: false, error: 'Invalid JSON array of personas' });
        return false;
      }

      getStorageData().then(async (config) => {
        const currentPersonas = [...(config.personas || DEFAULT_PERSONAS)];
        imported.forEach(item => {
          if (item && item.name && item.instructionBlock) {
            const id = item.id || ('persona_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6));
            const existingIdx = currentPersonas.findIndex(p => p.id === id);
            const sanitized = {
              id,
              name: String(item.name).slice(0, 60),
              description: String(item.description || '').slice(0, 200),
              instructionBlock: String(item.instructionBlock),
              preferredPlatform: item.preferredPlatform || 'any',
              temperature: typeof item.temperature === 'number' ? item.temperature : undefined
            };
            if (existingIdx >= 0) {
              currentPersonas[existingIdx] = sanitized;
            } else {
              currentPersonas.push(sanitized);
            }
          }
        });
        await setStorageData({ personas: currentPersonas });
        sendResponse({ success: true, count: currentPersonas.length });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    // ── Clipboard History ──
    case 'ADD_CLIPBOARD_ITEM': {
      appendClipboardHistory(payload || {}).then(() => {
        sendResponse({ success: true });
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'CLEAR_CLIPBOARD_HISTORY': {
      setStorageData({ clipboardHistory: [] }).then(() => {
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

    // Legacy action forwards
    case 'SUMMARIZE':
    case 'SUMMARIZE_GROQ': {
      updateBadge('RUN', '#8b5cf6');
      executeTemplateRun({
        templateId: 'digest',
        userContent: payload?.transcript,
        extra: payload?.extra || {}
      }).then(res => {
        sendResponse(res);
      }).catch(err => {
        sendResponse({ success: false, error: err.message });
      });
      return true;
    }

    case 'OPEN_OPTIONS': {
      try {
        const hash = payload?.hash ? `#${payload.hash}` : '';
        const url = chrome.runtime.getURL(`options/options.html${hash}`);
        if (chrome.runtime.openOptionsPage && !hash) {
          chrome.runtime.openOptionsPage(() => sendResponse({ success: true }));
        } else {
          chrome.tabs.create({ url }, () => sendResponse({ success: true }));
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true;
    }

    default:
      sendResponse({ success: false, error: `Unknown action: ${action}` });
      return false;
  }
});
