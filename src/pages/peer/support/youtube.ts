// youtube.ts
// Pure helpers for turning a user-entered YouTube URL (or bare ID) into the
// pieces the embed needs. No React, no side effects — trivially testable.

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Extract an 11-character YouTube video id from any common URL shape, or from a
 * bare id. Returns null when nothing usable is found (caller renders nothing).
 * Handles: youtu.be/ID, watch?v=ID, /embed/ID, /shorts/ID, /live/ID, and
 * ignores any trailing query/params.
 */
export function parseYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;

  // Already a bare id.
  if (ID_RE.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    return id && ID_RE.test(id) ? id : null;
  }

  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
    // watch?v=<id>
    const v = url.searchParams.get('v');
    if (v && ID_RE.test(v)) return v;
    // /embed/<id>, /shorts/<id>, /live/<id>, /v/<id>
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex(p => ['embed', 'shorts', 'live', 'v'].includes(p));
    const next = idx >= 0 ? parts[idx + 1] : undefined;
    if (next && ID_RE.test(next)) return next;
  }

  return null;
}

/** Poster image for a given id. `maxres` is nicer but not always present; hq always exists. */
export function youTubeThumb(id: string, quality: 'hq' | 'maxres' = 'hq'): string {
  const name = quality === 'maxres' ? 'maxresdefault' : 'hqdefault';
  return `https://i.ytimg.com/vi/${id}/${name}.jpg`;
}

/** Privacy-friendly embed URL (youtube-nocookie). */
export function youTubeEmbedUrl(id: string, autoplay = true): string {
  const params = new URLSearchParams({ rel: '0', modestbranding: '1' });
  if (autoplay) params.set('autoplay', '1');
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}