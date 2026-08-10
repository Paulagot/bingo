// peerParticipantService.js
// Extracted from peerCoreService.js by split_peer_core.mjs — behaviour unchanged.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import {
  F, P, PK, PI, O, OI, R, C, DROP_TIERS, DROP_ITEMS,
  id, parseJson, slugify, fail, assertFundraiser, uniqueSlug,
} from './peerCoreShared.js';

export async function listParticipants(fid,clubId) {
  const fundraiser=await assertFundraiser(fid,clubId);

  if(fundraiser.format_type==='sponsored'){
    const [rows]=await connection.execute(
      `SELECT
         p.*,
         SUM(c.status='confirmed') AS confirmed_count,
         COALESCE(SUM(
           CASE WHEN c.status='confirmed' THEN c.amount ELSE 0 END
         ),0) AS confirmed_total,
         SUM(c.status='claimed') AS claimed_count,
         COALESCE(SUM(
           CASE WHEN c.status='claimed' THEN c.amount ELSE 0 END
         ),0) AS claimed_total
       FROM ${P} p
       LEFT JOIN ${TABLE_PREFIX}sponsored_contributions c
         ON c.participant_id=p.id
        AND c.peer_fundraiser_id=p.peer_fundraiser_id
       WHERE p.peer_fundraiser_id=?
         AND p.club_id=?
       GROUP BY p.id
       ORDER BY confirmed_total DESC,p.participant_name`,
      [fid,clubId]
    );
    return {participants:rows};
  }

  const [rows]=await connection.execute(
    `SELECT
       p.*,
       SUM(o.payment_status='confirmed') AS confirmed_count,
       COALESCE(SUM(
         CASE WHEN o.payment_status='confirmed'
           THEN o.total_amount ELSE 0 END
       ),0) AS confirmed_total,
       SUM(o.payment_status='claimed') AS claimed_count,
       COALESCE(SUM(
         CASE WHEN o.payment_status='claimed'
           THEN o.total_amount ELSE 0 END
       ),0) AS claimed_total
     FROM ${P} p
     LEFT JOIN ${O} o
       ON o.participant_id=p.id
      AND o.peer_fundraiser_id=p.peer_fundraiser_id
     WHERE p.peer_fundraiser_id=?
       AND p.club_id=?
     GROUP BY p.id
     ORDER BY confirmed_total DESC,p.participant_name`,
    [fid,clubId]
  );
  return {participants:rows};
}

export async function createParticipant(fid,clubId,b) {
  await assertFundraiser(fid,clubId);
  if (!b?.participantName?.trim()) fail('participant_name_required');
  const participantId=id();
  const participantSlug=await uniqueSlug(P,'peer_fundraiser_id',fid,'participant_slug',b.participantSlug||b.participantName);
  await connection.execute(
    `INSERT INTO ${P}
      (id,peer_fundraiser_id,club_id,participant_name,participant_slug,email,phone,personal_target,
       personal_message,profile_image_url,video_url,notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [participantId,fid,clubId,b.participantName.trim(),participantSlug,b.email?.trim().toLowerCase()||null,
     b.phone?.trim()||null,b.personalTarget??null,b.personalMessage?.trim()||null,
     b.profileImageUrl||null,b.videoUrl?.trim()||null,b.notes?.trim()||null]);
  return { participantId, participantSlug };
}

// Previously missing entirely — PeerService.ts (frontend) already had an
// updateParticipant() method calling PATCH .../participants/:participantId,
// but no route or service function existed to handle it, so it 404'd.
export async function updateParticipant(fid,clubId,participantId,b) {
  await assertFundraiser(fid,clubId);
  const [rows]=await connection.execute(
    `SELECT * FROM ${P} WHERE id=? AND peer_fundraiser_id=? AND club_id=? LIMIT 1`,
    [participantId,fid,clubId]
  );
  const current=rows[0];
  if (!current) fail('participant_not_found',404);

  if (b.participantName!==undefined && !b.participantName?.trim()) fail('participant_name_required');

  const participantSlug=b.participantSlug!==undefined
    ? await uniqueSlug(P,'peer_fundraiser_id',fid,'participant_slug',b.participantSlug||b.participantName||current.participant_name,participantId)
    : current.participant_slug;

  await connection.execute(
    `UPDATE ${P} SET participant_name=?,participant_slug=?,email=?,phone=?,personal_target=?,
       personal_message=?,profile_image_url=?,video_url=?,is_active=?,notes=?
     WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
    [
      b.participantName!==undefined?b.participantName.trim():current.participant_name,
      participantSlug,
      b.email!==undefined?(b.email?.trim().toLowerCase()||null):current.email,
      b.phone!==undefined?(b.phone?.trim()||null):current.phone,
      b.personalTarget!==undefined?b.personalTarget:current.personal_target,
      b.personalMessage!==undefined?(b.personalMessage?.trim()||null):current.personal_message,
      b.profileImageUrl!==undefined?(b.profileImageUrl||null):current.profile_image_url,
      b.videoUrl!==undefined?(b.videoUrl?.trim()||null):current.video_url,
      b.isActive!==undefined?(b.isActive?1:0):current.is_active,
      b.notes!==undefined?(b.notes?.trim()||null):current.notes,
      participantId,fid,clubId,
    ]
  );

  const [updated]=await connection.execute(`SELECT * FROM ${P} WHERE id=? LIMIT 1`,[participantId]);
  return { participant: updated[0] };
}

// Mirrors campaign's deleteSeller: soft-delete (deactivate) if the
// participant has any non-cancelled orders, hard-delete otherwise.
export async function deleteParticipant(fid,clubId,participantId) {
  await assertFundraiser(fid,clubId);
  const [orderRows]=await connection.execute(
    `SELECT COUNT(*) cnt FROM ${O} WHERE participant_id=? AND payment_status NOT IN ('cancelled','refunded')`,
    [participantId]
  );
  const hasOrders=(orderRows[0]?.cnt||0)>0;

  if (hasOrders) {
    const [result]=await connection.execute(
      `UPDATE ${P} SET is_active=0 WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
      [participantId,fid,clubId]
    );
    if (!result.affectedRows) fail('participant_not_found',404);
    return { deleted:false, deactivated:true };
  }

  const [result]=await connection.execute(
    `DELETE FROM ${P} WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
    [participantId,fid,clubId]
  );
  if (!result.affectedRows) fail('participant_not_found',404);
  return { deleted:true, deactivated:false };
}
