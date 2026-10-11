/**
 * FIELDCRAFT Application Orchestrator
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentAdventure = null;
  let activeCheckpoint = null;
  let selectedDuration = 20;
  let selectedTone = 'mystery';
  let isDemoSession = false;
  let locationMode = 'gps'; // 'gps' | 'search'
  let acquiredGpsCoords = null;
  let selectedSearchCoords = null;

  // DOM Elements - Views
  const views = {
    landing: document.getElementById('view-landing'),
    generating: document.getElementById('view-generating'),
    briefing: document.getElementById('view-briefing'),
    walk: document.getElementById('view-walk'),
    arrival: document.getElementById('view-arrival'),
    finale: document.getElementById('view-finale'),
    journal: document.getElementById('view-journal'),
  };

  // Switch View Helper
  function showView(viewName) {
    Object.keys(views).forEach(key => {
      if (views[key]) {
        views[key].classList.toggle('active', key === viewName);
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Setup options selection
  document.querySelectorAll('.duration-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.duration-pill').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedDuration = parseInt(btn.dataset.duration, 10);
    });
  });

  document.querySelectorAll('.tone-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.tone-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedTone = card.dataset.tone;
    });
  });

  // Health check on boot
  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      const statusBadge = document.getElementById('system-status-indicator');
      const modalBadge = document.getElementById('modal-current-ai-badge');

      if (statusBadge) {
        if (data.aiAvailable) {
          statusBadge.innerHTML = `<span class="status-dot green"></span> ${escapeHtml(data.aiLabel || 'AI Ready')}`;
          statusBadge.title = `AI Engine: ${data.aiProvider} (${data.aiModel})`;
        } else {
          statusBadge.innerHTML = `<span class="status-dot amber"></span> Deterministic Engine (Offline)`;
          statusBadge.title = 'No cloud AI key or local Ollama detected. Using built-in deterministic story generator.';
        }
      }

      if (modalBadge) {
        modalBadge.innerHTML = data.aiAvailable
          ? `🟢 Active Engine: <strong>${escapeHtml(data.aiLabel)}</strong>`
          : `🟡 Active Engine: <strong>Deterministic Template Generator</strong> (No key or Ollama detected)`;
      }
    } catch (e) {
      console.warn('Health check failed:', e);
    }
  }
  checkHealth();

  // Location Tab Switcher
  const tabGps = document.getElementById('tab-loc-gps');
  const tabSearch = document.getElementById('tab-loc-search');
  const panelGps = document.getElementById('loc-panel-gps');
  const panelSearch = document.getElementById('loc-panel-search');

  if (tabGps && tabSearch) {
    tabGps.addEventListener('click', () => {
      locationMode = 'gps';
      tabGps.classList.add('selected');
      tabSearch.classList.remove('selected');
      panelGps.classList.add('active');
      panelGps.classList.remove('hidden');
      panelSearch.classList.remove('active');
      panelSearch.classList.add('hidden');
    });

    tabSearch.addEventListener('click', () => {
      locationMode = 'search';
      tabSearch.classList.add('selected');
      tabGps.classList.remove('selected');
      panelSearch.classList.add('active');
      panelSearch.classList.remove('hidden');
      panelGps.classList.remove('active');
      panelGps.classList.add('hidden');
    });
  }

  // Robust GPS Detection with Fallback
  function detectGps(onSuccess, onError) {
    const badge = document.getElementById('gps-preview-badge');
    if (badge) {
      badge.className = 'gps-status-pill searching';
      badge.textContent = 'Acquiring GPS location...';
    }

    if (!navigator.geolocation) {
      if (badge) {
        badge.className = 'gps-status-pill error';
        badge.textContent = 'Geolocation not supported';
      }
      if (onError) onError(new Error('Geolocation not supported by browser.'));
      return;
    }

    // Attempt 1: High accuracy with 6s timeout
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        acquiredGpsCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0),
        };
        if (badge) {
          badge.className = 'gps-status-pill ready';
          badge.textContent = `📍 Ready: ${acquiredGpsCoords.latitude.toFixed(4)}, ${acquiredGpsCoords.longitude.toFixed(4)} (±${acquiredGpsCoords.accuracy}m)`;
        }
        if (onSuccess) onSuccess(acquiredGpsCoords);
      },
      (err) => {
        console.warn('High-accuracy GPS timed out or failed, falling back to standard accuracy...', err);
        // Attempt 2: Standard accuracy with 10s timeout
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            acquiredGpsCoords = {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              accuracy: Math.round(pos.coords.accuracy || 0),
            };
            if (badge) {
              badge.className = 'gps-status-pill ready';
              badge.textContent = `📍 Ready: ${acquiredGpsCoords.latitude.toFixed(4)}, ${acquiredGpsCoords.longitude.toFixed(4)} (±${acquiredGpsCoords.accuracy}m)`;
            }
            if (onSuccess) onSuccess(acquiredGpsCoords);
          },
          (fallbackErr) => {
            console.warn('Geolocation fallback also failed:', fallbackErr);
            if (badge) {
              badge.className = 'gps-status-pill error';
              badge.textContent = fallbackErr.code === 1
                ? '⚠️ Location permission denied. Use Search tab!'
                : '⚠️ Location unavailable. Use Search tab!';
            }
            if (onError) onError(fallbackErr);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }

  const btnDetectGps = document.getElementById('btn-detect-gps');
  if (btnDetectGps) {
    btnDetectGps.addEventListener('click', () => detectGps());
  }

  // Quick Preset Chips
  document.querySelectorAll('.preset-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.preset-chip').forEach(c => c.classList.remove('selected'));
      chip.classList.add('selected');

      const lat = parseFloat(chip.dataset.lat);
      const lon = parseFloat(chip.dataset.lon);
      const name = chip.dataset.name;

      selectedSearchCoords = { latitude: lat, longitude: lon, name };

      const badge = document.getElementById('selected-location-badge');
      const nameEl = document.getElementById('selected-loc-name');
      const coordsEl = document.getElementById('selected-loc-coords');
      if (badge && nameEl && coordsEl) {
        nameEl.textContent = `📍 ${name}`;
        coordsEl.textContent = `(${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        badge.classList.remove('hidden');
      }
    });
  });

  // Search City / Landmark Geocoding
  async function searchLocation(query) {
    const list = document.getElementById('search-results-list');
    if (!list) return;

    if (!query || query.trim().length < 2) {
      alert('Please enter at least 2 characters to search.');
      return;
    }

    list.innerHTML = '<div class="search-loading">Searching OpenStreetMap...</div>';
    list.classList.remove('hidden');

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.results || data.results.length === 0) {
        list.innerHTML = '<div class="search-empty">No matching places found. Try another city or landmark name.</div>';
        return;
      }

      list.innerHTML = data.results.map(item => `
        <div class="search-result-item" data-lat="${item.latitude}" data-lon="${item.longitude}" data-name="${escapeHtml(item.shortName)}">
          <strong>${escapeHtml(item.shortName)}</strong>
          <span>${escapeHtml(item.name)}</span>
        </div>
      `).join('');

      list.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
          const lat = parseFloat(item.dataset.lat);
          const lon = parseFloat(item.dataset.lon);
          const name = item.dataset.name;

          selectedSearchCoords = { latitude: lat, longitude: lon, name };

          const badge = document.getElementById('selected-location-badge');
          const nameEl = document.getElementById('selected-loc-name');
          const coordsEl = document.getElementById('selected-loc-coords');
          if (badge && nameEl && coordsEl) {
            nameEl.textContent = `📍 ${name}`;
            coordsEl.textContent = `(${lat.toFixed(4)}, ${lon.toFixed(4)})`;
            badge.classList.remove('hidden');
          }
          list.classList.add('hidden');
        });
      });
    } catch (err) {
      list.innerHTML = `<div class="search-empty">Search error: ${escapeHtml(err.message)}</div>`;
    }
  }

  const btnSearch = document.getElementById('btn-do-search-location');
  const inputSearch = document.getElementById('input-search-location');

  if (btnSearch && inputSearch) {
    btnSearch.addEventListener('click', () => searchLocation(inputSearch.value));
    inputSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        searchLocation(inputSearch.value);
      }
    });
  }

  // AI Modal Controls
  const aiModal = document.getElementById('ai-settings-modal');
  const btnOpenAiModal = document.getElementById('btn-open-ai-modal');
  const btnCloseAiModal = document.getElementById('btn-close-ai-modal');
  const btnSaveAiKeys = document.getElementById('btn-save-ai-keys');
  const btnClearAiKeys = document.getElementById('btn-clear-ai-keys');
  const inputGroqKey = document.getElementById('input-groq-key');

  // Load existing key from session
  if (inputGroqKey) inputGroqKey.value = sessionStorage.getItem('fieldcraft_groq_key') || '';

  function openAiModal() {
    if (aiModal) aiModal.classList.remove('hidden');
    checkHealth();
  }

  function closeAiModal() {
    if (aiModal) aiModal.classList.add('hidden');
  }

  if (btnOpenAiModal) btnOpenAiModal.addEventListener('click', openAiModal);
  if (btnCloseAiModal) btnCloseAiModal.addEventListener('click', closeAiModal);
  const statusBadge = document.getElementById('system-status-indicator');
  if (statusBadge) statusBadge.addEventListener('click', openAiModal);

  if (btnSaveAiKeys) {
    btnSaveAiKeys.addEventListener('click', () => {
      const groqVal = (inputGroqKey?.value || '').trim();

      if (groqVal) sessionStorage.setItem('fieldcraft_groq_key', groqVal);
      else sessionStorage.removeItem('fieldcraft_groq_key');

      alert('Gemma AI key saved for this session!');
      closeAiModal();
      checkHealth();
    });
  }

  if (btnClearAiKeys) {
    btnClearAiKeys.addEventListener('click', () => {
      sessionStorage.removeItem('fieldcraft_groq_key');
      if (inputGroqKey) inputGroqKey.value = '';
      alert('Session key cleared.');
      checkHealth();
    });
  }

  // Create adventure API call
  async function createAdventure(coords, isDemo = false) {
    showView('generating');
    const loadingSubtext = document.getElementById('generating-subtext');
    if (loadingSubtext) {
      loadingSubtext.textContent = isDemo
        ? 'Assembling fixture landmarks and crafting narrative...'
        : 'Querying OpenStreetMap for public landmarks & composing mystery...';
    }

    try {
      const body = {
        durationMinutes: selectedDuration,
        tone: selectedTone,
        demoMode: isDemo,
      };

      if (!isDemo && coords) {
        body.latitude = coords.latitude;
        body.longitude = coords.longitude;
      }

      const headers = { 'Content-Type': 'application/json' };
      const sessionGroq = sessionStorage.getItem('fieldcraft_groq_key');
      if (sessionGroq) headers['x-groq-key'] = sessionGroq;

      const res = await fetch('/api/adventures', {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate adventure');
      }

      currentAdventure = data.adventure;
      isDemoSession = isDemo;
      renderBriefing(currentAdventure);
      showView('briefing');
    } catch (err) {
      const switchDemo = confirm(`Adventure Notice: ${err.message}\n\nWould you like to try Demo Mode instead?`);
      if (switchDemo) {
        createAdventure(null, true);
      } else {
        showView('landing');
      }
    }
  }

  // Handle "Create My Mystery" (Live)
  document.getElementById('btn-create-live').addEventListener('click', () => {
    if (locationMode === 'search') {
      if (!selectedSearchCoords) {
        alert('Please search for a city/park or pick one of the quick presets (e.g. Central Park, Lodhi Garden) first.');
        return;
      }
      createAdventure(selectedSearchCoords, false);
      return;
    }

    // GPS Mode
    if (acquiredGpsCoords) {
      createAdventure(acquiredGpsCoords, false);
      return;
    }

    detectGps(
      (coords) => {
        createAdventure(coords, false);
      },
      (err) => {
        console.warn('GPS detection failed:', err);
        const switchSearch = confirm(
          'Could not acquire precise GPS coordinates.\n\nWould you like to switch to "Search City / Landmark" to choose your starting area?'
        );
        if (switchSearch && tabSearch) {
          tabSearch.click();
        } else {
          showView('landing');
        }
      }
    );
  });

  // Handle "Try a Demo"
  document.getElementById('btn-create-demo').addEventListener('click', () => {
    createAdventure(null, true);
  });

  // Render Briefing View
  function renderBriefing(adv) {
    document.getElementById('briefing-title').textContent = adv.title;
    document.getElementById('briefing-premise').textContent = adv.premise;
    document.getElementById('briefing-duration').textContent = `${adv.durationMinutes} min walk`;
    document.getElementById('briefing-tone').textContent = `${adv.tone.toUpperCase()}`;

    const sourceEl = document.getElementById('briefing-source');
    if (sourceEl) {
      if (adv.storyModel) {
        sourceEl.textContent = `${adv.storyModel} AI`;
      } else if (adv.storySource === 'gemma') {
        sourceEl.textContent = 'Gemma AI';
      } else {
        sourceEl.textContent = 'Deterministic Engine';
      }
    }

    const cpList = document.getElementById('briefing-checkpoints-list');
    cpList.innerHTML = '';
    adv.checkpoints.forEach((cp, idx) => {
      const li = document.createElement('li');
      li.className = 'briefing-checkpoint-item';
      li.innerHTML = `
        <span class="cp-num">${idx + 1}</span>
        <div class="cp-info">
          <strong>${escapeHtml(cp.name)}</strong>
          <span class="cp-category">${escapeHtml(cp.displayCategory)}</span>
        </div>
      `;
      cpList.appendChild(li);
    });

    // Update demo indicator
    window.DemoManager.init(adv);
  }

  // Begin Walk
  document.getElementById('btn-begin-walk').addEventListener('click', () => {
    if (!currentAdventure) return;

    showView('walk');
    window.WalkEngine.start(currentAdventure, {
      onCheckpointChanged: handleCheckpointChanged,
      onCheckpointArrival: handleCheckpointArrival,
      onGpsUpdate: handleGpsUpdate,
      onGpsError: handleGpsError,
      onTimeTick: handleTimeTick,
      onWalkFinished: handleWalkFinished,
      onWalkEndedEarly: handleWalkEndedEarly,
    });

    // Narrate opening text then first clue
    if (currentAdventure.openingNarration) {
      window.AudioManager.speak(currentAdventure.openingNarration, () => {
        if (activeCheckpoint) {
          window.AudioManager.speak(activeCheckpoint.clue);
        }
      });
    }
  });

  function handleCheckpointChanged({ index, total, checkpoint }) {
    activeCheckpoint = checkpoint;
    document.getElementById('walk-progress-label').textContent = `Checkpoint ${index + 1} of ${total}`;
    document.getElementById('walk-clue-text').textContent = checkpoint.clue;
    document.getElementById('walk-hint-box').classList.add('hidden');
    document.getElementById('walk-hint-text').textContent = checkpoint.hint;
    document.getElementById('btn-show-hint').textContent = 'Need a hint?';

    // Update demo simulation button label
    const simBtn = document.getElementById('btn-demo-simulate');
    if (simBtn) {
      simBtn.textContent = `⚡ Simulate Arrival at "${checkpoint.name}"`;
    }
  }

  function handleCheckpointArrival(checkpoint, isLast, proceedNext) {
    document.getElementById('arrival-line-text').textContent = checkpoint.arrivalLine;
    document.getElementById('arrival-title').textContent = isLast
      ? 'Final Checkpoint Reached!'
      : 'Checkpoint Decoded!';
    showView('arrival');

    // Narrate arrival line
    window.AudioManager.speak(checkpoint.arrivalLine);

    const continueBtn = document.getElementById('btn-arrival-continue');
    continueBtn.innerHTML = isLast
      ? 'See Case Resolution &rarr;'
      : 'Next Clue &rarr;';

    continueBtn.onclick = () => {
      proceedNext();
      if (!isLast) {
        showView('walk');
        if (activeCheckpoint) {
          window.AudioManager.speak(activeCheckpoint.clue);
        }
      }
    };
  }

  function handleGpsUpdate({ distance, accuracy, status }) {
    const meterEl = document.getElementById('walk-gps-status');
    if (!meterEl) return;

    if (isDemoSession) {
      meterEl.innerHTML = `<span class="gps-badge simulated">Demo Mode — Simulated GPS</span>`;
      return;
    }

    if (status === 'imprecise') {
      meterEl.innerHTML = `<span class="gps-badge warning">GPS Imprecise (±${accuracy}m) — Waiting for clearer signal</span>`;
    } else {
      meterEl.innerHTML = `<span class="gps-badge active">Distance: ~${distance}m (Signal: ±${accuracy}m)</span>`;
    }
  }

  function handleGpsError(err) {
    const meterEl = document.getElementById('walk-gps-status');
    if (meterEl && !isDemoSession) {
      meterEl.innerHTML = `<span class="gps-badge error">GPS signal unavailable. Please ensure location is enabled.</span>`;
    }
  }

  function handleTimeTick(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    const timerEl = document.getElementById('walk-timer');
    if (timerEl) timerEl.textContent = formatted;
  }

  function handleWalkFinished(stats) {
    showView('finale');
    document.getElementById('finale-case-title').textContent = currentAdventure.title;
    document.getElementById('finale-story-text').textContent = currentAdventure.finale;

    const mins = Math.max(1, Math.round(stats.elapsedSeconds / 60));
    document.getElementById('finale-stat-time').textContent = `${mins} min`;
    document.getElementById('finale-stat-checkpoints').textContent = `${stats.completedCount} / ${stats.completedCount}`;
    document.getElementById('finale-stat-mode').textContent = currentAdventure.mode.toUpperCase();

    // Narrate finale resolution
    window.AudioManager.speak(currentAdventure.finale);
  }

  function handleWalkEndedEarly(stats) {
    const confirmExit = confirm('Are you sure you want to end this adventure early?');
    if (confirmExit) {
      window.AudioManager.stop();
      window.WalkEngine.forceEnd();
      showView('landing');
    }
  }

  // Audio controls in Walk View
  document.getElementById('btn-replay-clue').addEventListener('click', () => {
    if (activeCheckpoint) {
      window.AudioManager.speak(activeCheckpoint.clue);
    }
  });

  // Hint toggle
  document.getElementById('btn-show-hint').addEventListener('click', () => {
    const hintBox = document.getElementById('walk-hint-box');
    const isHidden = hintBox.classList.contains('hidden');
    hintBox.classList.toggle('hidden');
    document.getElementById('btn-show-hint').textContent = isHidden ? 'Hide hint' : 'Need a hint?';
  });

  // Pause / Resume walk
  document.getElementById('btn-pause-walk').addEventListener('click', (e) => {
    const isPaused = window.WalkEngine.togglePause();
    e.target.textContent = isPaused ? 'Resume Walk' : 'Pause Walk';
    e.target.classList.toggle('btn-secondary', !isPaused);
    e.target.classList.toggle('btn-primary', isPaused);
  });

  // End Walk Early
  document.getElementById('btn-end-walk').addEventListener('click', () => {
    window.WalkEngine.endEarly();
  });

  // Demo simulate arrival button
  document.getElementById('btn-demo-simulate').addEventListener('click', () => {
    window.WalkEngine.simulateArrival();
  });

  // Audio state observer (waveform pulse)
  window.AudioManager.onStateChange = (speaking) => {
    const waveform = document.getElementById('audio-waveform');
    if (waveform) {
      waveform.classList.toggle('active', speaking);
    }
  };

  // Save to Journal
  document.getElementById('btn-save-journal').addEventListener('click', () => {
    const noteText = document.getElementById('finale-reflection-input').value;
    const saved = window.StorageManager.saveAdventure(currentAdventure, noteText, {
      elapsedSeconds: window.WalkEngine.elapsedSeconds,
    });
    if (saved) {
      alert('Field note saved to your local journal!');
      renderJournalList();
      showView('journal');
    } else {
      alert('Unable to save journal note on this browser.');
    }
  });

  // New adventure from finale
  document.getElementById('btn-finale-new-adv').addEventListener('click', () => {
    window.AudioManager.stop();
    window.WalkEngine.forceEnd();
    const refl = document.getElementById('finale-reflection-input');
    if (refl) refl.value = '';
    showView('landing');
  });

  // Open Journal View
  document.getElementById('btn-open-journal').addEventListener('click', () => {
    if (views.walk && views.walk.classList.contains('active')) {
      alert('A walk is currently in progress. Please pause or finish your adventure before opening the journal.');
      return;
    }
    renderJournalList();
    showView('journal');
  });

  // Journal Back to Landing
  document.getElementById('btn-journal-back').addEventListener('click', () => {
    showView('landing');
  });

  // Clear Journal
  document.getElementById('btn-clear-journal').addEventListener('click', () => {
    if (confirm('Clear all saved field notes from this device?')) {
      window.StorageManager.clearJournal();
      renderJournalList();
    }
  });

  function renderJournalList() {
    const listEl = document.getElementById('journal-entries-container');
    const past = window.StorageManager.getPastAdventures();

    if (past.length === 0) {
      listEl.innerHTML = `<div class="empty-state">No recorded field notes yet. Complete a mystery walk to record your first field note!</div>`;
      return;
    }

    listEl.innerHTML = past.map(entry => {
      const dateStr = new Date(entry.completedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      return `
        <div class="journal-card">
          <div class="journal-card-header">
            <h4>${escapeHtml(entry.title)}</h4>
            <span class="journal-date">${dateStr}</span>
          </div>
          <p class="journal-premise">${escapeHtml(entry.premise)}</p>
          ${entry.reflection ? `<blockquote class="journal-reflection">“${escapeHtml(entry.reflection)}”</blockquote>` : ''}
          <div class="journal-meta">
            <span>Tone: ${escapeHtml(entry.tone)}</span>
            <span>Checkpoints: ${entry.checkpointsCount}</span>
            <span>Mode: ${escapeHtml(entry.mode)}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
