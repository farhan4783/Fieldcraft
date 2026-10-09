/**
 * Active walk engine and geofence tracking for FIELDCRAFT.
 */

class WalkEngine {
  constructor() {
    this.adventure = null;
    this.currentCheckpointIndex = 0;
    this.isPaused = false;
    this.watchId = null;
    this.consecutiveHits = 0;
    this.elapsedSeconds = 0;
    this.timerInterval = null;
    this.lastReading = null;
    this.hintTimer = null;
    this.callbacks = {};
  }

  /**
   * Initialize a new walk session.
   */
  start(adventure, callbacks = {}) {
    this.adventure = adventure;
    this.callbacks = callbacks;
    this.currentCheckpointIndex = 0;
    this.isPaused = false;
    this.consecutiveHits = 0;
    this.elapsedSeconds = 0;
    this.lastReading = null;

    // Start elapsed timer
    this.startTimer();

    // Begin GPS tracking if live mode
    if (this.adventure.mode !== 'demo' && navigator.geolocation) {
      this.startLocationWatch();
    }

    this.renderCurrentState();
  }

  startTimer() {
    this.clearIntervals();
    this.timerInterval = setInterval(() => {
      if (!this.isPaused) {
        this.elapsedSeconds++;
        if (this.callbacks.onTimeTick) {
          this.callbacks.onTimeTick(this.elapsedSeconds);
        }
      }
    }, 1000);
  }

  startLocationWatch() {
    if (!navigator.geolocation) return;

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handleLocationUpdate(pos.coords),
      (err) => {
        console.warn('Geolocation watch error:', err);
        if (this.callbacks.onGpsError) {
          this.callbacks.onGpsError(err);
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }

  /**
   * Haversine formula on client
   */
  calcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  }

  /**
   * Process a GPS reading against active checkpoint.
   */
  handleLocationUpdate(coords) {
    if (this.isPaused || !this.adventure) return;

    const activeCp = this.getActiveCheckpoint();
    if (!activeCp) return;

    const reading = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy || 999,
    };
    this.lastReading = reading;

    const distance = this.calcDistance(
      reading.latitude,
      reading.longitude,
      activeCp.latitude,
      activeCp.longitude
    );

    const accuracyThreshold = 60;
    const arrivalRadius = activeCp.arrivalRadiusMeters || 90;

    let status = 'searching';
    if (reading.accuracy > accuracyThreshold) {
      status = 'imprecise';
      this.consecutiveHits = 0;
    } else if (distance <= arrivalRadius) {
      this.consecutiveHits++;
      if (this.consecutiveHits >= 2) {
        status = 'arrived';
        this.triggerArrival(activeCp);
        return;
      } else {
        status = 'confirming';
      }
    } else {
      this.consecutiveHits = 0;
      status = 'in_transit';
    }

    if (this.callbacks.onGpsUpdate) {
      this.callbacks.onGpsUpdate({
        distance,
        accuracy: Math.round(reading.accuracy),
        status,
        consecutiveHits: this.consecutiveHits,
      });
    }
  }

  getActiveCheckpoint() {
    if (!this.adventure || !this.adventure.checkpoints) return null;
    return this.adventure.checkpoints[this.currentCheckpointIndex] || null;
  }

  /**
   * Trigger checkpoint arrival
   */
  triggerArrival(checkpoint) {
    this.consecutiveHits = 0;
    window.AudioManager.playArrivalChime();

    const isLast = this.currentCheckpointIndex >= this.adventure.checkpoints.length - 1;

    if (this.callbacks.onCheckpointArrival) {
      this.callbacks.onCheckpointArrival(checkpoint, isLast, () => {
        if (isLast) {
          this.finish();
        } else {
          this.currentCheckpointIndex++;
          this.renderCurrentState();
        }
      });
    }
  }

  /**
   * Advance to next checkpoint directly (used in demo simulation)
   */
  simulateArrival() {
    const activeCp = this.getActiveCheckpoint();
    if (!activeCp) return;
    this.triggerArrival(activeCp);
  }

  renderCurrentState() {
    const cp = this.getActiveCheckpoint();
    if (!cp) return;

    if (this.callbacks.onCheckpointChanged) {
      this.callbacks.onCheckpointChanged({
        index: this.currentCheckpointIndex,
        total: this.adventure.checkpoints.length,
        checkpoint: cp,
      });
    }
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      window.AudioManager.pause();
    } else {
      window.AudioManager.resume();
    }
    return this.isPaused;
  }

  finish() {
    this.clearIntervals();
    if (this.callbacks.onWalkFinished) {
      this.callbacks.onWalkFinished({
        elapsedSeconds: this.elapsedSeconds,
        completedCount: this.adventure.checkpoints.length,
      });
    }
  }

  endEarly() {
    this.clearIntervals();
    if (this.callbacks.onWalkEndedEarly) {
      this.callbacks.onWalkEndedEarly({
        elapsedSeconds: this.elapsedSeconds,
        completedCount: this.currentCheckpointIndex,
      });
    }
  }

  clearIntervals() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}

window.WalkEngine = new WalkEngine();
