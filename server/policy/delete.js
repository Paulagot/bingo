// server/quiz/middleware/planCaps.js
export function getUserCaps(userId) {
  // OPEN BETA default — allow plenty so nothing blocks accidentally
  // Later, wire this to your DB / plan data.
  return {
    maxPlayers: 2,          // used by UI + add-player guard
    maxRounds: 8,           // allow lots of rounds
    roundTypesAllowed: ['general_trivia', 'wipeout'], // include all you support
    extrasAllowed: ['buyHint', 'restorePoints', 'freezeOutTeam', 'robPoints'], // adjust as needed
  };
}

export function validateConfigAgainstCaps(config, caps) {
  const rounds = Array.isArray(config?.roundDefinitions) ? config.roundDefinitions : [];
  const roundCount = rounds.length;
  if (roundCount > caps.maxRounds) {
    return { ok: false, reason: `Too many rounds (${roundCount} > ${caps.maxRounds})` };
  }

  // ensure all round types are allowed
  for (const rd of rounds) {
    if (!caps.roundTypesAllowed.includes(rd.roundType)) {
      return { ok: false, reason: `Round type "${rd.roundType}" not allowed for your plan` };
    }
  }

  // extras guard (optional – keep permissive for beta)
  const enabledExtras = Object.entries(config?.fundraisingOptions || {})
    .filter(([_, v]) => !!v)
    .map(([k]) => k);
  for (const ex of enabledExtras) {
    if (!caps.extrasAllowed.includes(ex)) {
      return { ok: false, reason: `Extra "${ex}" not allowed for your plan` };
    }
  }

  return { ok: true };
}
