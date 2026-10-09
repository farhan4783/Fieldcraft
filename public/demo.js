/**
 * Demo Mode helper for FIELDCRAFT.
 * Enables reviewers and judges to simulate arrivals without physical movement.
 */

const DemoManager = {
  isDemoActive: false,

  init(adventure) {
    this.isDemoActive = Boolean(adventure && adventure.mode === 'demo');
    const badge = document.getElementById('demo-mode-badge');
    const simControls = document.getElementById('demo-simulation-panel');

    if (this.isDemoActive) {
      if (badge) badge.classList.remove('hidden');
      if (simControls) simControls.classList.remove('hidden');
    } else {
      if (badge) badge.classList.add('hidden');
      if (simControls) simControls.classList.add('hidden');
    }
  },

  /**
   * Simulate a valid GPS arrival at the currently active checkpoint.
   */
  simulateArrival(activeCheckpoint, onConfirmed) {
    if (!this.isDemoActive || !activeCheckpoint) return;

    // Simulate 2 consecutive qualifying readings at the checkpoint
    const simulatedReading = {
      latitude: activeCheckpoint.latitude,
      longitude: activeCheckpoint.longitude,
      accuracy: 12, // Excellent accuracy
    };

    console.log('[Demo] Simulating arrival at checkpoint:', activeCheckpoint.name);

    if (onConfirmed) {
      onConfirmed(simulatedReading);
    }
  },
};

window.DemoManager = DemoManager;
