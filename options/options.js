/**
 * ChatCourier - options.js
 * Single-Page Options Controller with Profile CRUD & Advanced Settings
 */

const DEFAULT_SYSTEM_PROMPT = `You are ChatCourier, an elite LLM Context Handoff Engine.
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

Maintain high technical density. Do not include conversational filler.`;

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const profileList = document.getElementById('profile-list');
  const btnAddProfile = document.getElementById('btn-add-profile');
  const profileEditor = document.getElementById('profile-editor');
  const editorTitle = document.getElementById('editor-title');
  const editorProfileId = document.getElementById('editor-profile-id');
  const editorName = document.getElementById('editor-name');
  const editorEndpoint = document.getElementById('editor-endpoint');
  const editorModel = document.getElementById('editor-model');
  const editorApiKey = document.getElementById('editor-apikey');
  const btnToggleKey = document.getElementById('btn-toggle-key');
  const btnTestConnection = document.getElementById('btn-test-connection');
  const testStatus = document.getElementById('test-status');
  const btnCancelEdit = document.getElementById('btn-cancel-edit');
  const btnSaveProfile = document.getElementById('btn-save-profile');
  const temperatureSlider = document.getElementById('temperature');
  const tempValDisplay = document.getElementById('temp-val');
  const customSystemPromptArea = document.getElementById('custom-system-prompt');
  const btnResetPrompt = document.getElementById('btn-reset-prompt');
  const toggleAutocopy = document.getElementById('toggle-autocopy');
  const toggleNotifications = document.getElementById('toggle-notifications');
  const toggleFab = document.getElementById('toggle-fab');
  const btnSaveAll = document.getElementById('btn-save-all');
  const saveStatus = document.getElementById('save-status');

  let currentConfig = null;

  // ─── Helpers ───

  function generateId() {
    return 'prof_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function showSavedFeedback(msg, isError = false) {
    saveStatus.textContent = msg;
    saveStatus.className = isError ? 'save-status error' : 'save-status saved';
    setTimeout(() => {
      saveStatus.textContent = 'All changes saved automatically';
      saveStatus.className = 'save-status';
    }, 3500);
  }

  // ─── Profile List Rendering ───

  function renderProfileList(config) {
    profileList.innerHTML = '';
    const profiles = config.profiles || [];
    const activeId = config.activeProfileId || 'default';

    profiles.forEach((profile) => {
      const isActive = profile.id === activeId;
      const card = document.createElement('div');
      card.className = `profile-card ${isActive ? 'active' : ''}`;
      card.dataset.profileId = profile.id;

      const hasKey = profile.apiKey && profile.apiKey.trim().length > 5;
      const statusDot = hasKey ? '<span class="dot dot-ok"></span>' : '<span class="dot dot-warn"></span>';
      const keyLabel = hasKey ? 'Key configured' : 'No key';

      card.innerHTML = `
        <div class="profile-main">
          <div class="profile-info">
            <div class="profile-name-row">
              ${statusDot}
              <span class="profile-name">${escapeHtml(profile.name || profile.id)}</span>
              ${isActive ? '<span class="active-badge">ACTIVE</span>' : ''}
            </div>
            <div class="profile-meta">${escapeHtml(profile.modelId || '—')} • ${keyLabel}</div>
          </div>
          <div class="profile-actions">
            ${!isActive ? `<button class="btn btn-secondary btn-xs profile-action-btn" data-action="activate" data-id="${profile.id}" title="Set as Active">Use</button>` : ''}
            <button class="btn btn-secondary btn-xs profile-action-btn" data-action="edit" data-id="${profile.id}" title="Edit">Edit</button>
            ${profiles.length > 1 ? `<button class="btn btn-secondary btn-xs profile-action-btn danger" data-action="delete" data-id="${profile.id}" title="Delete">✕</button>` : ''}
          </div>
        </div>
      `;

      profileList.appendChild(card);
    });

    // Bind profile action buttons
    profileList.querySelectorAll('.profile-action-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'activate') activateProfile(id);
        else if (action === 'edit') openEditor(id);
        else if (action === 'delete') deleteProfile(id);
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ─── Profile Editor ───

  function openEditor(profileId = null) {
    profileEditor.classList.remove('hidden');
    testStatus.textContent = '';
    testStatus.className = 'test-status';

    if (profileId) {
      const profile = (currentConfig.profiles || []).find(p => p.id === profileId);
      if (!profile) return;
      editorTitle.textContent = 'Edit Profile';
      editorProfileId.value = profile.id;
      editorName.value = profile.name || '';
      editorEndpoint.value = profile.endpoint || '';
      editorModel.value = profile.modelId || '';
      editorApiKey.value = profile.apiKey || '';
    } else {
      editorTitle.textContent = 'Add New Profile';
      editorProfileId.value = generateId();
      editorName.value = '';
      editorEndpoint.value = 'https://api.groq.com/openai/v1';
      editorModel.value = '';
      editorApiKey.value = '';
    }

    editorName.focus();
  }

  function closeEditor() {
    profileEditor.classList.add('hidden');
  }

  btnAddProfile.addEventListener('click', () => openEditor(null));
  btnCancelEdit.addEventListener('click', closeEditor);

  // Toggle API key visibility
  btnToggleKey.addEventListener('click', () => {
    if (editorApiKey.type === 'password') {
      editorApiKey.type = 'text';
      btnToggleKey.textContent = '🔒';
    } else {
      editorApiKey.type = 'password';
      btnToggleKey.textContent = '👁';
    }
  });

  // Test Connection
  btnTestConnection.addEventListener('click', () => {
    const endpoint = editorEndpoint.value.trim();
    const apiKey = editorApiKey.value.trim();

    if (!endpoint) {
      testStatus.textContent = 'Please enter an endpoint.';
      testStatus.className = 'test-status error';
      return;
    }
    if (!apiKey) {
      testStatus.textContent = 'Please enter an API key.';
      testStatus.className = 'test-status error';
      return;
    }

    testStatus.textContent = 'Testing connection...';
    testStatus.className = 'test-status';

    chrome.runtime.sendMessage({
      action: 'TEST_CONNECTION',
      payload: { endpoint, apiKey }
    }, (result) => {
      if (result && result.valid) {
        const modelCount = result.models ? result.models.length : 0;
        testStatus.textContent = `✓ Connected! ${modelCount > 0 ? `${modelCount} models available` : 'Endpoint reachable'}`;
        testStatus.className = 'test-status success';
      } else {
        testStatus.textContent = `✕ ${result?.message || 'Connection failed'}`;
        testStatus.className = 'test-status error';
      }
    });
  });

  // Save Profile
  btnSaveProfile.addEventListener('click', () => {
    const profile = {
      id: editorProfileId.value,
      name: editorName.value.trim() || 'Unnamed Profile',
      endpoint: editorEndpoint.value.trim(),
      modelId: editorModel.value.trim(),
      apiKey: editorApiKey.value.trim()
    };

    if (!profile.endpoint) {
      showSavedFeedback('Endpoint is required', true);
      return;
    }

    chrome.runtime.sendMessage({
      action: 'SAVE_PROFILE',
      payload: { profile }
    }, (res) => {
      if (res && res.success) {
        showSavedFeedback(`✓ Profile "${profile.name}" saved`);
        closeEditor();
        loadConfig();
      } else {
        showSavedFeedback(`Error: ${res?.error || 'Save failed'}`, true);
      }
    });
  });

  // Activate Profile
  function activateProfile(profileId) {
    chrome.runtime.sendMessage({
      action: 'SET_ACTIVE_PROFILE',
      payload: { profileId }
    }, (res) => {
      if (res && res.success) {
        showSavedFeedback('✓ Active profile changed');
        loadConfig();
      }
    });
  }

  // Delete Profile
  function deleteProfile(profileId) {
    if (!confirm('Delete this profile? This cannot be undone.')) return;

    chrome.runtime.sendMessage({
      action: 'DELETE_PROFILE',
      payload: { profileId }
    }, (res) => {
      if (res && res.success) {
        showSavedFeedback('Profile deleted');
        loadConfig();
      } else {
        showSavedFeedback(`Error: ${res?.error || 'Delete failed'}`, true);
      }
    });
  }

  // ─── Advanced Settings ───

  temperatureSlider.addEventListener('input', () => {
    tempValDisplay.textContent = temperatureSlider.value;
  });

  btnResetPrompt.addEventListener('click', () => {
    if (confirm('Reset to the default system prompt?')) {
      customSystemPromptArea.value = DEFAULT_SYSTEM_PROMPT;
      showSavedFeedback('Prompt reset to default');
      saveAdvancedSettings();
    }
  });

  function saveAdvancedSettings() {
    const payload = {
      customSystemPrompt: customSystemPromptArea.value,
      autoCopyOnSummarize: toggleAutocopy.checked,
      showNotifications: toggleNotifications.checked,
      fabEnabled: toggleFab.checked,
      temperature: parseFloat(temperatureSlider.value)
    };

    chrome.runtime.sendMessage({
      action: 'SAVE_SETTINGS',
      payload
    }, (res) => {
      if (res && res.success) {
        showSavedFeedback('✓ Settings saved');
      } else {
        showSavedFeedback('Error saving settings', true);
      }
    });
  }

  btnSaveAll.addEventListener('click', saveAdvancedSettings);

  // ─── Load Config ───

  function loadConfig() {
    chrome.runtime.sendMessage({ action: 'GET_CONFIG' }, (response) => {
      if (response && response.success && response.config) {
        currentConfig = response.config;

        // Render profiles
        renderProfileList(currentConfig);

        // Populate advanced settings
        temperatureSlider.value = currentConfig.temperature !== undefined ? currentConfig.temperature : 0.2;
        tempValDisplay.textContent = temperatureSlider.value;
        customSystemPromptArea.value = currentConfig.customSystemPrompt || DEFAULT_SYSTEM_PROMPT;
        toggleAutocopy.checked = currentConfig.autoCopyOnSummarize !== false;
        toggleNotifications.checked = currentConfig.showNotifications !== false;
        toggleFab.checked = currentConfig.fabEnabled !== false;
      }
    });
  }

  loadConfig();
});
