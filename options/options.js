/**
 * ChatCourier - options.js
 * Settings Controller: Profiles CRUD, Personas Manager & Template Registry Customizer
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements: Profiles
  const profileList = document.getElementById('profile-list');
  const btnAddProfile = document.getElementById('btn-add-profile');
  const profileEditor = document.getElementById('profile-editor');
  const profileEditorTitle = document.getElementById('profile-editor-title');
  const editorProfileId = document.getElementById('editor-profile-id');
  const editorProfileName = document.getElementById('editor-profile-name');
  const editorProfileEndpoint = document.getElementById('editor-profile-endpoint');
  const editorProfileModel = document.getElementById('editor-profile-model');
  const editorProfileApiKey = document.getElementById('editor-profile-apikey');
  const btnToggleKey = document.getElementById('btn-toggle-key');
  const btnTestConnection = document.getElementById('btn-test-connection');
  const testStatus = document.getElementById('test-status');
  const btnCancelProfile = document.getElementById('btn-cancel-profile');
  const btnSaveProfile = document.getElementById('btn-save-profile');

  // Elements: Personas
  const personaList = document.getElementById('persona-list');
  const btnAddPersona = document.getElementById('btn-add-persona');
  const personaEditor = document.getElementById('persona-editor');
  const personaEditorTitle = document.getElementById('persona-editor-title');
  const editorPersonaId = document.getElementById('editor-persona-id');
  const editorPersonaName = document.getElementById('editor-persona-name');
  const editorPersonaDesc = document.getElementById('editor-persona-desc');
  const editorPersonaInstruction = document.getElementById('editor-persona-instruction');
  const editorPersonaPlatform = document.getElementById('editor-persona-platform');
  const btnCancelPersona = document.getElementById('btn-cancel-persona');
  const btnSavePersona = document.getElementById('btn-save-persona');
  const btnExportPersonas = document.getElementById('btn-export-personas');
  const btnImportPersonas = document.getElementById('btn-import-personas');
  const fileImportPersonas = document.getElementById('file-import-personas');

  // Elements: Templates & Settings
  const templatesContainer = document.getElementById('templates-container');
  const temperatureSlider = document.getElementById('temperature');
  const tempValDisplay = document.getElementById('temp-val');
  const maxClipboardEntries = document.getElementById('max-clipboard-entries');
  const toggleFastmode = document.getElementById('toggle-fastmode');
  const toggleNotifications = document.getElementById('toggle-notifications');
  const toggleFab = document.getElementById('toggle-fab');
  const btnSaveAll = document.getElementById('btn-save-all');
  const saveStatus = document.getElementById('save-status');

  let currentConfig = null;

  function generateId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  }

  function showSavedFeedback(msg, isError = false) {
    saveStatus.textContent = msg;
    saveStatus.className = isError ? 'save-status error' : 'save-status saved';
    setTimeout(() => {
      saveStatus.textContent = 'All changes saved automatically';
      saveStatus.className = 'save-status';
    }, 3500);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function downloadJSON(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ─── Profile Management ───
  function renderProfileList(config) {
    profileList.innerHTML = '';
    const profiles = config.profiles || [];
    const activeId = config.activeProfileId || 'default';

    profiles.forEach((profile) => {
      const isActive = profile.id === activeId;
      const card = document.createElement('div');
      card.className = `card-item ${isActive ? 'active' : ''}`;
      card.dataset.profileId = profile.id;

      const hasKey = profile.apiKey && profile.apiKey.trim().length > 5;
      const statusDot = hasKey ? '<span class="dot dot-ok"></span>' : '<span class="dot dot-warn"></span>';
      const keyLabel = hasKey ? 'Key configured' : 'No key';

      card.innerHTML = `
        <div class="card-main">
          <div class="card-info">
            <div class="card-name-row">
              ${statusDot}
              <span class="card-name">${escapeHtml(profile.name || profile.id)}</span>
              ${isActive ? '<span class="active-badge">ACTIVE</span>' : ''}
            </div>
            <div class="card-meta">${escapeHtml(profile.modelId || '—')} • ${keyLabel}</div>
          </div>
          <div class="card-actions">
            ${!isActive ? `<button class="btn btn-secondary btn-xs" data-action="activate-profile" data-id="${profile.id}">Use</button>` : ''}
            <button class="btn btn-secondary btn-xs" data-action="edit-profile" data-id="${profile.id}">Edit</button>
            ${profiles.length > 1 ? `<button class="btn btn-secondary btn-xs danger" data-action="delete-profile" data-id="${profile.id}">✕</button>` : ''}
          </div>
        </div>
      `;

      profileList.appendChild(card);
    });

    profileList.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'activate-profile') activateProfile(id);
        else if (action === 'edit-profile') openProfileEditor(id);
        else if (action === 'delete-profile') deleteProfile(id);
      });
    });
  }

  function openProfileEditor(profileId = null) {
    profileEditor.classList.remove('hidden');
    testStatus.textContent = '';
    testStatus.className = 'test-status';

    if (profileId) {
      const profile = (currentConfig.profiles || []).find(p => p.id === profileId);
      if (!profile) return;
      profileEditorTitle.textContent = 'Edit Profile';
      editorProfileId.value = profile.id;
      editorProfileName.value = profile.name || '';
      editorProfileEndpoint.value = profile.endpoint || '';
      editorProfileModel.value = profile.modelId || '';
      editorProfileApiKey.value = profile.apiKey || '';
    } else {
      profileEditorTitle.textContent = 'Add New Profile';
      editorProfileId.value = generateId('prof');
      editorProfileName.value = '';
      editorProfileEndpoint.value = 'https://api.groq.com/openai/v1';
      editorProfileModel.value = 'llama-3.3-70b-versatile';
      editorProfileApiKey.value = '';
    }

    editorProfileName.focus();
  }

  function closeProfileEditor() {
    profileEditor.classList.add('hidden');
  }

  btnAddProfile.addEventListener('click', () => openProfileEditor(null));
  btnCancelProfile.addEventListener('click', closeProfileEditor);

  btnToggleKey.addEventListener('click', () => {
    const isPassword = editorProfileApiKey.type === 'password';
    editorProfileApiKey.type = isPassword ? 'text' : 'password';
    btnToggleKey.textContent = isPassword ? 'Hide' : 'View';
  });

  btnTestConnection.addEventListener('click', () => {
    const endpoint = editorProfileEndpoint.value.trim();
    const apiKey = editorProfileApiKey.value.trim();

    if (!endpoint || !apiKey) {
      testStatus.textContent = 'Endpoint and API Key are required.';
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
        testStatus.textContent = 'Connected successfully!';
        testStatus.className = 'test-status success';
      } else {
        testStatus.textContent = result?.message || 'Connection failed';
        testStatus.className = 'test-status error';
      }
    });
  });

  btnSaveProfile.addEventListener('click', () => {
    const profile = {
      id: editorProfileId.value,
      name: editorProfileName.value.trim() || 'Unnamed Profile',
      endpoint: editorProfileEndpoint.value.trim(),
      modelId: editorProfileModel.value.trim(),
      apiKey: editorProfileApiKey.value.trim()
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
        showSavedFeedback(`Profile "${profile.name}" saved`);
        closeProfileEditor();
        loadConfig();
      }
    });
  });

  function activateProfile(profileId) {
    chrome.runtime.sendMessage({
      action: 'SET_ACTIVE_PROFILE',
      payload: { profileId }
    }, () => {
      showSavedFeedback('Active profile changed');
      loadConfig();
    });
  }

  function deleteProfile(profileId) {
    if (!confirm('Delete this profile?')) return;
    chrome.runtime.sendMessage({
      action: 'DELETE_PROFILE',
      payload: { profileId }
    }, () => {
      showSavedFeedback('Profile deleted');
      loadConfig();
    });
  }

  // ─── Persona Management (§4 Settings-Only CRUD) ───
  function renderPersonaList(config) {
    personaList.innerHTML = '';
    const personas = config.personas || [];
    const activeId = config.activePersonaId;

    if (personas.length === 0) {
      personaList.innerHTML = '<div class="empty-hint">No personas created yet. Click "+ Add Persona" to create one.</div>';
      return;
    }

    personas.forEach((persona) => {
      const isActive = persona.id === activeId;
      const card = document.createElement('div');
      card.className = `card-item ${isActive ? 'active' : ''}`;
      card.dataset.personaId = persona.id;

      card.innerHTML = `
        <div class="card-main">
          <div class="card-info">
            <div class="card-name-row">
              <span class="card-name">${escapeHtml(persona.name)}</span>
              ${isActive ? '<span class="active-badge">ACTIVE</span>' : ''}
            </div>
            <div class="card-meta">${escapeHtml(persona.description || 'No description')} • Platform: ${escapeHtml(persona.preferredPlatform || 'any')}</div>
          </div>
          <div class="card-actions">
            ${!isActive ? `<button class="btn btn-secondary btn-xs" data-action="activate-persona" data-id="${persona.id}">Set Active</button>` : `<button class="btn btn-secondary btn-xs" data-action="deactivate-persona" data-id="${persona.id}">Clear</button>`}
            <button class="btn btn-secondary btn-xs" data-action="edit-persona" data-id="${persona.id}">Edit</button>
            <button class="btn btn-secondary btn-xs danger" data-action="delete-persona" data-id="${persona.id}">✕</button>
          </div>
        </div>
      `;

      personaList.appendChild(card);
    });

    personaList.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.action;
        const id = btn.dataset.id;
        if (action === 'activate-persona') activatePersona(id);
        else if (action === 'deactivate-persona') activatePersona(null);
        else if (action === 'edit-persona') openPersonaEditor(id);
        else if (action === 'delete-persona') deletePersona(id);
      });
    });
  }

  function openPersonaEditor(personaId = null) {
    personaEditor.classList.remove('hidden');

    if (personaId) {
      const persona = (currentConfig.personas || []).find(p => p.id === personaId);
      if (!persona) return;
      personaEditorTitle.textContent = 'Edit Persona';
      editorPersonaId.value = persona.id;
      editorPersonaName.value = persona.name || '';
      editorPersonaDesc.value = persona.description || '';
      editorPersonaInstruction.value = persona.instructionBlock || '';
      editorPersonaPlatform.value = persona.preferredPlatform || 'any';
    } else {
      personaEditorTitle.textContent = 'Add New Persona';
      editorPersonaId.value = generateId('persona');
      editorPersonaName.value = '';
      editorPersonaDesc.value = '';
      editorPersonaInstruction.value = '';
      editorPersonaPlatform.value = 'any';
    }

    editorPersonaName.focus();
  }

  function closePersonaEditor() {
    personaEditor.classList.add('hidden');
  }

  btnAddPersona.addEventListener('click', () => openPersonaEditor(null));
  btnCancelPersona.addEventListener('click', closePersonaEditor);

  btnSavePersona.addEventListener('click', () => {
    const persona = {
      id: editorPersonaId.value,
      name: editorPersonaName.value.trim() || 'Custom Persona',
      description: editorPersonaDesc.value.trim(),
      instructionBlock: editorPersonaInstruction.value.trim(),
      preferredPlatform: editorPersonaPlatform.value || 'any'
    };

    if (!persona.instructionBlock) {
      showSavedFeedback('Instruction block cannot be empty', true);
      return;
    }

    chrome.runtime.sendMessage({
      action: 'SAVE_PERSONA',
      payload: { persona }
    }, (res) => {
      if (res && res.success) {
        showSavedFeedback(`Persona "${persona.name}" saved`);
        closePersonaEditor();
        loadConfig();
      }
    });
  });

  function activatePersona(personaId) {
    chrome.runtime.sendMessage({
      action: 'SET_ACTIVE_PERSONA',
      payload: { personaId }
    }, () => {
      showSavedFeedback(personaId ? 'Active persona updated' : 'Standard mode restored');
      loadConfig();
    });
  }

  function deletePersona(personaId) {
    if (!confirm('Delete this persona?')) return;
    chrome.runtime.sendMessage({
      action: 'DELETE_PERSONA',
      payload: { personaId }
    }, () => {
      showSavedFeedback('Persona deleted');
      loadConfig();
    });
  }

  // Persona JSON Export / Import
  btnExportPersonas.addEventListener('click', () => {
    const personas = currentConfig?.personas || [];
    downloadJSON('chatcourier_personas.json', personas);
    showSavedFeedback('Exported personas to JSON');
  });

  btnImportPersonas.addEventListener('click', () => {
    fileImportPersonas.click();
  });

  fileImportPersonas.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!Array.isArray(imported)) throw new Error('File does not contain an array of personas');

        chrome.runtime.sendMessage({
          action: 'IMPORT_PERSONAS',
          payload: { personas: imported }
        }, (res) => {
          if (res && res.success) {
            showSavedFeedback(`Imported ${res.count} personas successfully`);
            loadConfig();
          } else {
            showSavedFeedback(`Import failed: ${res?.error}`, true);
          }
        });
      } catch (parseErr) {
        showSavedFeedback(`JSON parse error: ${parseErr.message}`, true);
      }
    };
    reader.readAsText(file);
    fileImportPersonas.value = '';
  });

  // ─── Template Registry Customizer (§9) ───
  function renderTemplates(config) {
    templatesContainer.innerHTML = '';
    const templates = config.templates || [];

    templates.forEach((tpl) => {
      const card = document.createElement('div');
      card.className = 'template-item';
      card.dataset.templateId = tpl.id;

      const currentValue = tpl.userOverride || tpl.defaultPrompt;
      const isOverridden = Boolean(tpl.userOverride);

      card.innerHTML = `
        <div class="template-header">
          <div class="template-title-wrap">
            <span class="template-title">${escapeHtml(tpl.label || tpl.id)}</span>
            ${isOverridden ? '<span class="custom-badge">CUSTOMIZED</span>' : ''}
          </div>
          <button class="btn btn-secondary btn-xs btn-reset-tpl" data-id="${tpl.id}" title="Reset to verified default">Reset to Default</button>
        </div>
        <textarea class="textarea-input tpl-textarea" rows="${tpl.id === 'digest' ? 8 : 4}" data-id="${tpl.id}">${escapeHtml(currentValue)}</textarea>
      `;

      templatesContainer.appendChild(card);
    });

    // Wire live auto-save and reset on templates
    templatesContainer.querySelectorAll('.tpl-textarea').forEach(textarea => {
      textarea.addEventListener('change', () => {
        const templateId = textarea.dataset.id;
        const userOverride = textarea.value;
        chrome.runtime.sendMessage({
          action: 'SAVE_TEMPLATE',
          payload: { templateId, userOverride }
        }, () => {
          showSavedFeedback('Template updated');
          loadConfig();
        });
      });
    });

    templatesContainer.querySelectorAll('.btn-reset-tpl').forEach(btn => {
      btn.addEventListener('click', () => {
        const templateId = btn.dataset.id;
        if (confirm('Reset this template to the default prompt?')) {
          chrome.runtime.sendMessage({
            action: 'RESET_TEMPLATE',
            payload: { templateId }
          }, () => {
            showSavedFeedback('Template reset to default');
            loadConfig();
          });
        }
      });
    });
  }

  // ─── General Settings ───
  temperatureSlider.addEventListener('input', () => {
    tempValDisplay.textContent = temperatureSlider.value;
  });

  function saveGeneralSettings() {
    const payload = {
      temperature: parseFloat(temperatureSlider.value),
      maxClipboardEntries: parseInt(maxClipboardEntries.value, 10) || 30,
      fastMode: toggleFastmode.checked,
      showNotifications: toggleNotifications.checked,
      fabEnabled: toggleFab.checked
    };

    chrome.runtime.sendMessage({
      action: 'SAVE_SETTINGS',
      payload
    }, (res) => {
      if (res && res.success) {
        showSavedFeedback('Settings saved');
      }
    });
  }

  btnSaveAll.addEventListener('click', saveGeneralSettings);
  toggleFastmode.addEventListener('change', saveGeneralSettings);
  toggleNotifications.addEventListener('change', saveGeneralSettings);
  toggleFab.addEventListener('change', saveGeneralSettings);
  temperatureSlider.addEventListener('change', saveGeneralSettings);
  maxClipboardEntries.addEventListener('change', saveGeneralSettings);

  // ─── Config Loader & Boot ───
  function loadConfig() {
    chrome.runtime.sendMessage({ action: 'GET_CONFIG' }, (response) => {
      if (response && response.success && response.config) {
        currentConfig = response.config;

        renderProfileList(currentConfig);
        renderPersonaList(currentConfig);
        renderTemplates(currentConfig);

        const settings = currentConfig.settings || {};
        temperatureSlider.value = settings.temperature !== undefined ? settings.temperature : 0.2;
        tempValDisplay.textContent = temperatureSlider.value;
        maxClipboardEntries.value = settings.maxClipboardEntries || 30;
        toggleFastmode.checked = Boolean(settings.fastMode);
        toggleNotifications.checked = settings.showNotifications !== false;
        toggleFab.checked = settings.fabEnabled !== false;

        // Route to hash if present (e.g. #personas)
        if (window.location.hash === '#personas') {
          const personasSection = document.getElementById('personas');
          if (personasSection) personasSection.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }

  loadConfig();
});
