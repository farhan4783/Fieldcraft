/**
 * Local storage manager for FIELDCRAFT field notes and past adventures.
 */

const STORAGE_KEY = 'fieldcraft_journal_v1';

const StorageManager = {
  /**
   * Retrieve list of past saved adventures.
   * @returns {Array<object>}
   */
  getPastAdventures() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('Storage unavailable or blocked:', e);
      return [];
    }
  },

  /**
   * Save a newly completed adventure to the local journal.
   * @param {object} adventure
   * @param {string} reflectionText
   * @param {object} stats
   */
  saveAdventure(adventure, reflectionText = '', stats = {}) {
    try {
      const current = this.getPastAdventures();
      const entry = {
        id: adventure.id,
        title: adventure.title,
        premise: adventure.premise,
        finale: adventure.finale,
        tone: adventure.tone,
        mode: adventure.mode,
        storySource: adventure.storySource,
        durationMinutes: adventure.durationMinutes,
        checkpointsCount: adventure.checkpoints ? adventure.checkpoints.length : 0,
        elapsedSeconds: stats.elapsedSeconds || 0,
        reflection: reflectionText.trim(),
        completedAt: new Date().toISOString(),
      };

      current.unshift(entry);
      // Keep up to 20 past entries
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current.slice(0, 20)));
      return true;
    } catch (e) {
      console.warn('Failed to save adventure to localStorage:', e);
      return false;
    }
  },

  /**
   * Clear all saved journal entries.
   */
  clearJournal() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  },
};

window.StorageManager = StorageManager;
