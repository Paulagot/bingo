//src/components/mgtsystem/utils/QuizGameUtils.ts
export function formatDateTime(dt: string | null, timeZone?: string | null): string {
  if (!dt) return 'No scheduled time';
  try {
    const d = new Date(dt);
    return `${d.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}${
      timeZone ? ` (${timeZone})` : ''
    }`;
  } catch {
    return dt;
  }
}

export function minutesUntil(dt: string | null): number | null {
  if (!dt) return null;
  const t = new Date(dt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.now()) / 60000);
}

export function safeJsonParse<T>(input: unknown, fallback: T): T {
  if (!input) return fallback;
  if (typeof input === 'object') return input as T;
  if (typeof input !== 'string') return fallback;
  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

export function extractCreditsRemaining(ents: any): number {
  if (!ents) return 0;

  const candidates = [
    ents.game_credits_remaining,
    ents.creditsRemaining,
    ents.quizCreditsRemaining,
    ents.credits,
    ents.remainingCredits,
    ents.remaining_credits,
    ents.quiz_credits_remaining,
    ents.web2_quiz_credits_remaining,
    ents.web2CreditsRemaining,
    ents.web2_credits_remaining,
    ents?.entitlements?.creditsRemaining,
    ents?.entitlements?.quizCreditsRemaining,
    ents?.entitlements?.credits,
  ];

  const first = candidates.find((v) => v !== undefined && v !== null);
  const n = typeof first === 'string' ? Number(first) : typeof first === 'number' ? first : 0;
  return Number.isFinite(n) ? n : 0;
}
