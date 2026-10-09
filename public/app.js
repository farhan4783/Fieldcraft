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
      if (statusBadge) {
        if (data.ollamaAvailable) {
          statusBadge.innerHTML = `<span class="status-dot green"></span> Local Gemma (${data.modelConfigured}) Ready`;
          statusBadge.title = `Connected to local Ollama v${data.ollamaVersion}`;
        } else {
          statusBadge.innerHTML = `<span class="status-dot amber"></span> Deterministic Narrative Engine`;
          statusBadge.title = 'Local Ollama not detected. Using built-in deterministic story generator.';
        }
      }
    } catch (e) {
      console.warn('Health check failed:', e);
    }
  }
  checkHealth();

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

      const res = await fetch('/api/adventures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const switchDemo = confirm(`Adventure Creation Notice: ${err.message}\n\nWould you like to try Demo Mode instead?`);
      if (switchDemo) {
        createAdventure(null, true);
      } else {
        showView('landing');
      }
    }
  }

  // Handle "Create My Mystery" (Live)
  document.getElementById('btn-create-live').addEventListener('click', () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser. Please try Demo Mode.');
      return;
    }

    const consent = confirm(
      'FIELDCRAFT will request your GPS location to find safe public landmarks (parks, squares, libraries) nearby.\n\nYour coordinates are never logged or stored on our servers.\n\nAllow location access?'
    );

    if (!consent) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        createAdventure(pos.coords, false);
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err);
        const fallback = confirm(
          'Location access was unavailable. Would you like to run the adventure in Demo Mode instead?'
        );
        if (fallback) {
          createAdventure(null, true);
        } else {
          showView('landing');
        }
      },
      { enableHighAccuracy: true, timeout: 12000 }
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
    document.getElementById('briefing-source').textContent =
      adv.storySource === 'gemma' ? 'Gemma 3 AI' : 'Deterministic Engine';

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
