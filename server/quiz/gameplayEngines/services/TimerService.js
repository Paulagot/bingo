// server/quiz/gameplayEngines/services/TimerService.js
// Centralized timer management service with countdown effects
// Extracts identical timer logic from generalTriviaEngine.js and wipeoutEngine.js
// Handles question timers, countdown effects, and timer cleanup

const debug = false;

export class TimerService {
  /**
   * Create a new TimerService instance
   * Each game engine should have its own instance to avoid timer conflicts
   * 
   * @param {Object} namespace - Socket.io namespace for emitting events
   */
  constructor(namespace) {
    this.namespace = namespace;
    this.timers = new Map(); // roomId -> timer reference
    
    if (debug) {
      console.log(`[TimerService] 🕐 Timer service initialized for namespace`);
    }
  }

  /**
   * Start a question timer with countdown effects
   * Extracted from both engines - identical implementation
   * Emits countdown effects at 3, 2, 1 seconds remaining
   * 
   * @param {string} roomId - The room ID
   * @param {number} timeLimit - Time limit in seconds
   * @param {Function} callback - Function to call when timer expires
   */
  startQuestionTimer(roomId, timeLimit, callback) {
    if (debug) {
      console.log(`[TimerService] ⏰ Starting timer for room ${roomId}: ${timeLimit}s`);
    }

    // Clear any existing timer for this room
    this.clearTimer(roomId);

    // Set the main timer
    const timer = setTimeout(() => {
      if (debug) {
        console.log(`[TimerService] ⏰ Timer expired for room ${roomId} after ${timeLimit}s`);
      }
      
      // Remove from our tracking
      this.timers.delete(roomId);
      
      // Execute the callback
      if (typeof callback === 'function') {
        callback();
      } else {
        console.error(`[TimerService] ❌ Invalid callback provided for room ${roomId}`);
      }
    }, timeLimit * 1000);

    // Store the timer reference for cleanup
    this.timers.set(roomId, timer);

    // Set up countdown effects (3, 2, 1 seconds remaining)
    this.scheduleCountdownEffects(roomId, timeLimit);

    if (debug) {
      console.log(`[TimerService] ✅ Timer started for room ${roomId}, expires in ${timeLimit}s`);
    }
  }

  /**
   * Schedule countdown effects for the last 3 seconds
   * Extracted from both engines - identical countdown logic
   * Only schedules effects if timeLimit is >= 3 seconds
   * 
   * @param {string} roomId - The room ID
   * @param {number} timeLimit - Total time limit in seconds
   */
  scheduleCountdownEffects(roomId, timeLimit) {
    if (timeLimit < 3) {
      if (debug) {
        console.log(`[TimerService] ⚠️ Skipping countdown effects for room ${roomId} - timeLimit ${timeLimit}s too short`);
      }
      return;
    }

    if (debug) {
      console.log(`[TimerService] 🎬 Scheduling countdown effects for room ${roomId}`);
    }

    // 3 seconds remaining - green
    setTimeout(() => {
      if (debug) {
        console.log(`[TimerService] 🟢 Emitting 3-second countdown for room ${roomId}`);
      }
      this.namespace.to(roomId).emit('countdown_effect', {
        secondsLeft: 3,
        color: 'green',
        message: '3...'
      });
    }, (timeLimit - 3) * 1000);

    // 2 seconds remaining - orange
    setTimeout(() => {
      if (debug) {
        console.log(`[TimerService] 🟠 Emitting 2-second countdown for room ${roomId}`);
      }
      this.namespace.to(roomId).emit('countdown_effect', {
        secondsLeft: 2,
        color: 'orange',
        message: '2...'
      });
    }, (timeLimit - 2) * 1000);

    // 1 second remaining - red
    setTimeout(() => {
      if (debug) {
        console.log(`[TimerService] 🔴 Emitting 1-second countdown for room ${roomId}`);
      }
      this.namespace.to(roomId).emit('countdown_effect', {
        secondsLeft: 1,
        color: 'red',
        message: '1...',
        triggerAutoSubmit: true
      });
    }, (timeLimit - 1) * 1000);
  }

  /**
   * Clear the timer for a specific room
   * Prevents memory leaks and unwanted timer callbacks
   * Safe to call even if no timer exists for the room
   * 
   * @param {string} roomId - The room ID
   */
  clearTimer(roomId) {
    const timer = this.timers.get(roomId);
    
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomId);
      
      if (debug) {
        console.log(`[TimerService] 🧹 Cleared timer for room ${roomId}`);
      }
    } else {
      if (debug) {
        console.log(`[TimerService] 🔍 No timer to clear for room ${roomId}`);
      }
    }
  }

  /**
   * Clear all timers managed by this service
   * Useful for cleanup when shutting down or resetting the service
   */
  clearAllTimers() {
    if (debug) {
      console.log(`[TimerService] 🧹 Clearing all timers (${this.timers.size} active)`);
    }

    for (const [roomId, timer] of this.timers.entries()) {
      clearTimeout(timer);
      if (debug) {
        console.log(`[TimerService] 🧹 Cleared timer for room ${roomId}`);
      }
    }
    
    this.timers.clear();
    
    if (debug) {
      console.log(`[TimerService] ✅ All timers cleared`);
    }
  }

  /**
   * Get the number of active timers
   * Useful for monitoring and debugging
   * 
   * @returns {number} Number of active timers
   */
  getActiveTimerCount() {
    return this.timers.size;
  }

  /**
   * Check if a timer exists for a specific room
   * 
   * @param {string} roomId - The room ID
   * @returns {boolean} True if timer exists
   */
  hasTimer(roomId) {
    return this.timers.has(roomId);
  }
}