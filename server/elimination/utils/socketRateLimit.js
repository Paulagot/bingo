/**
 * Per-socket rate limiting for elimination socket events.
 * Tracks event counts per socket ID in a sliding window.
 */

const socketCounts = new Map(); // socketId -> { count, windowStart }

const LIMITS = {
  join_elimination_room:       { max: 5,   windowMs: 10000 },  // 5 joins per 10s
  submit_round_answer:         { max: 3,   windowMs: 5000  },  // 3 submits per 5s (1 is normal)
  start_elimination_game:      { max: 3,   windowMs: 10000 },  // 3 starts per 10s
  reconnect_elimination_player:{ max: 10,  windowMs: 10000 },  // 10 reconnects per 10s
  host_join_elimination_room:  { max: 5,   windowMs: 10000 },  // 5 host joins per 10s
  default:                     { max: 20,  windowMs: 5000  },
};

export const checkSocketRate = (socketId, event) => {
  const limit = LIMITS[event] ?? LIMITS.default;
  const now = Date.now();
  const key = `${socketId}:${event}`;

  if (!socketCounts.has(key)) {
    socketCounts.set(key, { count: 1, windowStart: now });
    return true;
  }

  const entry = socketCounts.get(key);
  if (now - entry.windowStart > limit.windowMs) {
    // Reset window
    socketCounts.set(key, { count: 1, windowStart: now });
    return true;
  }

  entry.count++;
  if (entry.count > limit.max) {
    console.warn(`[RateLimit] Socket ${socketId} exceeded limit for ${event}: ${entry.count}/${limit.max}`);
    return false;
  }
  return true;
};

export const cleanupSocket = (socketId) => {
  for (const key of socketCounts.keys()) {
    if (key.startsWith(socketId + ':')) socketCounts.delete(key);
  }
};

// Periodic cleanup of stale entries (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of socketCounts.entries()) {
    if (now - entry.windowStart > 60000) socketCounts.delete(key);
  }
}, 5 * 60 * 1000);