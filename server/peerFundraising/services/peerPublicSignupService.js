// peerPublicSignupService.js
// Public endpoints — no club auth required.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { F, P, C, fail, uniqueSlug, id } from './peerCoreShared.js';

// ─────────────────────────────────────────────────────────────────────────────
// GET public fundraiser info for the /join page branding
// Route: GET /api/public/fundraisers/:clubSlug/:fundraiserSlug
// No auth.
// ─────────────────────────────────────────────────────────────────────────────

export async function getPublicFundraiser(clubSlug, fundraiserSlug) {
  const [rows] = await connection.execute(
    `SELECT
       f.id,
       f.name,
       f.description,
       f.currency,
       f.end_date,
       f.status,
       c.name                   AS club_name,
       c.brand_logo_url         AS club_logo_url,
       c.brand_primary_color    AS primary_colour
     FROM ${F} f
     JOIN ${C} c ON c.id = f.club_id
     WHERE c.slug = ?
       AND f.public_slug = ?
     LIMIT 1`,
    [clubSlug, fundraiserSlug]
  );

  const fundraiser = rows[0];
  if (!fundraiser) fail('fundraiser_not_found', 404);

  return {
    fundraiser: {
      id:             fundraiser.id,
      name:           fundraiser.name,
      description:    fundraiser.description,
      currency:       fundraiser.currency,
      end_date:       fundraiser.end_date,
      status:         fundraiser.status,
      club_name:      fundraiser.club_name,
      club_logo_url:  fundraiser.club_logo_url  ?? null,
      primary_colour: fundraiser.primary_colour ?? null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST public self-signup
// Route: POST /api/public/fundraisers/:fundraiserId/signup
// No auth. Creates participant with is_active=0, status='pending'.
// ─────────────────────────────────────────────────────────────────────────────

export async function publicSignup(fundraiserId, b) {
  // 1. Validate required fields
  if (!b?.participantName?.trim()) fail('name_required');
  if (!b?.email?.trim())           fail('email_required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email)) fail('email_invalid');

  // 2. Load fundraiser — must exist and be published
  const [fRows] = await connection.execute(
    `SELECT id, club_id, status FROM ${F} WHERE id = ? LIMIT 1`,
    [fundraiserId]
  );
  const fundraiser = fRows[0];
  if (!fundraiser)                       fail('fundraiser_not_found', 404);
  if (fundraiser.status !== 'published') fail('fundraiser_not_open', 403);

  // 3. Duplicate email check — return 409 so the frontend shows a clear message
  const [dupRows] = await connection.execute(
    `SELECT id FROM ${P}
      WHERE peer_fundraiser_id = ? AND email = ? LIMIT 1`,
    [fundraiserId, b.email.toLowerCase().trim()]
  );
  if (dupRows[0]) {
    fail('already_applied', 409);
  }

  // 4. Insert with is_active=0, status='pending'
  const participantId   = id();
  const participantSlug = await uniqueSlug(
    P, 'peer_fundraiser_id', fundraiserId,
    'participant_slug', b.participantName
  );

  await connection.execute(
    `INSERT INTO ${P}
       (id, peer_fundraiser_id, club_id,
        participant_name, participant_slug,
        email, phone,
        personal_target, personal_message,
        profile_image_url, video_url,
        is_active, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
    [
      participantId,
      fundraiserId,
      fundraiser.club_id,
      b.participantName.trim(),
      participantSlug,
      b.email.toLowerCase().trim(),
      b.phone?.trim()           || null,
      b.personalTarget          ?? null,
      b.personalMessage?.trim() || null,
      b.profileImageUrl         || null,
      b.videoUrl?.trim()        || null,
    ]
  );

  return { participantId, duplicate: false };
}

