// Summer Quest — Shared Error Response Helper
// Phase 8 polish: every route in this module was hand-rolling
// res.status(...).json({ error: ... }) slightly differently. This is
// the one place that shape lives now, so the frontend can rely on
// every error response looking the same: { error: string }.
//
// Not a breaking change to wire in — existing routes already send
// { error: '...' } bodies, this just gives new/edited routes a single
// function to call instead of repeating the pattern.

export function sendSummerQuestError(res, status, message) {
  res.status(status).json({ error: message });
}

// Common shortcuts for the status codes used throughout this module.
export const sqErrors = {
  badRequest: (res, message) => sendSummerQuestError(res, 400, message),
  unauthorized: (res, message) => sendSummerQuestError(res, 401, message),
  forbidden: (res, message) => sendSummerQuestError(res, 403, message),
  notFound: (res, message) => sendSummerQuestError(res, 404, message),
  conflict: (res, message) => sendSummerQuestError(res, 409, message),
  tooManyRequests: (res, message) => sendSummerQuestError(res, 429, message),
  serverError: (res, message = 'Something went wrong.') => sendSummerQuestError(res, 500, message),
};
