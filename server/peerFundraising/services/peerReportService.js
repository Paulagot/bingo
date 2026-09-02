// peerReportService.js
// Extracted from peerCoreService.js by split_peer_core.mjs - behaviour unchanged.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import {
  F, P, PK, PI, O, OI, R, C, DROP_TIERS, DROP_ITEMS,
  id, parseJson, slugify, fail, assertFundraiser, uniqueSlug,
} from './peerCoreShared.js';

export async function getPeerPaymentReport(fid,clubId) {
  const fundraiser=await assertFundraiser(fid,clubId);

  if(fundraiser.format_type==='sponsored'){
    const [[totals]]=await connection.execute(
      `SELECT
         SUM(status='confirmed') AS confirmed_count,
         COALESCE(SUM(
           CASE WHEN status='confirmed' THEN amount ELSE 0 END
         ),0) AS confirmed_total,
         SUM(status='claimed') AS claimed_count,
         COALESCE(SUM(
           CASE WHEN status='claimed' THEN amount ELSE 0 END
         ),0) AS claimed_total,
         SUM(
           status='confirmed' AND is_anonymous=1
         ) AS anonymous_confirmed_count,
         SUM(
           status='confirmed' AND is_anonymous=0
         ) AS named_confirmed_count
       FROM ${TABLE_PREFIX}sponsored_contributions
       WHERE club_id=?
         AND peer_fundraiser_id=?`,
      [clubId,fid]
    );

    const [participants]=await connection.execute(
      `SELECT
         c.participant_id,
         COALESCE(p.participant_name,'General fundraiser')
           AS participant_name,
         SUM(c.status='confirmed') AS confirmed_count,
         COALESCE(SUM(
           CASE WHEN c.status='confirmed' THEN c.amount ELSE 0 END
         ),0) AS confirmed_total,
         SUM(c.status='claimed') AS claimed_count,
         COALESCE(SUM(
           CASE WHEN c.status='claimed' THEN c.amount ELSE 0 END
         ),0) AS claimed_total
       FROM ${TABLE_PREFIX}sponsored_contributions c
       LEFT JOIN ${P} p
         ON p.id=c.participant_id
        AND p.peer_fundraiser_id=c.peer_fundraiser_id
       WHERE c.club_id=?
         AND c.peer_fundraiser_id=?
         AND c.status IN ('confirmed','claimed')
       GROUP BY c.participant_id,p.participant_name
       ORDER BY confirmed_total DESC`,
      [clubId,fid]
    );

    const [methods]=await connection.execute(
      `SELECT
         payment_method_label_snapshot AS method_label,
         payment_method_category_snapshot AS method_category,
         SUM(status='confirmed') AS confirmed_count,
         COALESCE(SUM(
           CASE WHEN status='confirmed' THEN amount ELSE 0 END
         ),0) AS confirmed_total,
         SUM(status='claimed') AS claimed_count,
         COALESCE(SUM(
           CASE WHEN status='claimed' THEN amount ELSE 0 END
         ),0) AS claimed_total
       FROM ${TABLE_PREFIX}sponsored_contributions
       WHERE club_id=?
         AND peer_fundraiser_id=?
         AND status IN ('confirmed','claimed')
       GROUP BY
         payment_method_label_snapshot,
         payment_method_category_snapshot
       ORDER BY confirmed_total DESC`,
      [clubId,fid]
    );

    return {
      type:'sponsored',
      currency:fundraiser.currency||'EUR',
      totals:{
        confirmedCount:Number(totals?.confirmed_count||0),
        confirmedTotal:Number(totals?.confirmed_total||0),
        claimedCount:Number(totals?.claimed_count||0),
        claimedTotal:Number(totals?.claimed_total||0),
        anonymousConfirmedCount:Number(
          totals?.anonymous_confirmed_count||0
        ),
        namedConfirmedCount:Number(
          totals?.named_confirmed_count||0
        ),
      },
      participants:participants.map(row=>({
        participantId:row.participant_id,
        participantName:row.participant_name,
        confirmedCount:Number(row.confirmed_count||0),
        confirmedTotal:Number(row.confirmed_total||0),
        claimedCount:Number(row.claimed_count||0),
        claimedTotal:Number(row.claimed_total||0),
      })),
      methods:methods.map(row=>({
        methodLabel:row.method_label||row.method_category||'Payment',
        methodCategory:row.method_category,
        confirmedCount:Number(row.confirmed_count||0),
        confirmedTotal:Number(row.confirmed_total||0),
        claimedCount:Number(row.claimed_count||0),
        claimedTotal:Number(row.claimed_total||0),
      })),
    };
  }

  const [[totals]]=await connection.execute(
    `SELECT
       SUM(payment_status='confirmed') AS confirmed_count,
       COALESCE(SUM(
         CASE WHEN payment_status='confirmed'
           THEN total_amount ELSE 0 END
       ),0) AS confirmed_total,
       SUM(payment_status='claimed') AS claimed_count,
       COALESCE(SUM(
         CASE WHEN payment_status='claimed'
           THEN total_amount ELSE 0 END
       ),0) AS claimed_total
     FROM ${O}
     WHERE club_id=?
       AND peer_fundraiser_id=?`,
    [clubId,fid]
  );

  const [participants]=await connection.execute(
    `SELECT
       o.participant_id,
       COALESCE(o.participant_name,'General fundraiser')
         AS participant_name,
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
     FROM ${O} o
     WHERE o.club_id=?
       AND o.peer_fundraiser_id=?
       AND o.payment_status IN ('confirmed','claimed')
     GROUP BY o.participant_id,o.participant_name
     ORDER BY confirmed_total DESC`,
    [clubId,fid]
  );

  const [methods]=await connection.execute(
    `SELECT
       COALESCE(payment_provider,payment_method_category,'Payment')
         AS method_label,
       payment_method_category AS method_category,
       SUM(payment_status='confirmed') AS confirmed_count,
       COALESCE(SUM(
         CASE WHEN payment_status='confirmed'
           THEN total_amount ELSE 0 END
       ),0) AS confirmed_total,
       SUM(payment_status='claimed') AS claimed_count,
       COALESCE(SUM(
         CASE WHEN payment_status='claimed'
           THEN total_amount ELSE 0 END
       ),0) AS claimed_total
     FROM ${O}
     WHERE club_id=?
       AND peer_fundraiser_id=?
       AND payment_status IN ('confirmed','claimed')
     GROUP BY payment_provider,payment_method_category
     ORDER BY confirmed_total DESC`,
    [clubId,fid]
  );

  const [[donationTotals]]=await connection.execute(
    `SELECT
       SUM(status='confirmed') AS confirmed_count,
       COALESCE(SUM(
         CASE WHEN status='confirmed' THEN amount ELSE 0 END
       ),0) AS confirmed_total,
       SUM(status='claimed') AS claimed_count,
       COALESCE(SUM(
         CASE WHEN status='claimed' THEN amount ELSE 0 END
       ),0) AS claimed_total
     FROM ${TABLE_PREFIX}donations
     WHERE club_id=?
       AND peer_fundraiser_id=?`,
    [clubId,fid]
  );

  return {
    type:'sell_activities',
    currency:fundraiser.currency||'EUR',
    totals:{
      confirmedCount:Number(totals?.confirmed_count||0),
      confirmedTotal:Number(totals?.confirmed_total||0),
      claimedCount:Number(totals?.claimed_count||0),
      claimedTotal:Number(totals?.claimed_total||0),
      donationConfirmedCount:Number(donationTotals?.confirmed_count||0),
      donationConfirmedTotal:Number(donationTotals?.confirmed_total||0),
      donationClaimedCount:Number(donationTotals?.claimed_count||0),
      donationClaimedTotal:Number(donationTotals?.claimed_total||0),
      combinedConfirmedTotal:Number(totals?.confirmed_total||0)+Number(donationTotals?.confirmed_total||0),
      combinedClaimedTotal:Number(totals?.claimed_total||0)+Number(donationTotals?.claimed_total||0),
    },
    participants:participants.map(row=>({
      participantId:row.participant_id,
      participantName:row.participant_name,
      confirmedCount:Number(row.confirmed_count||0),
      confirmedTotal:Number(row.confirmed_total||0),
      claimedCount:Number(row.claimed_count||0),
      claimedTotal:Number(row.claimed_total||0),
    })),
    methods:methods.map(row=>({
      methodLabel:row.method_label,
      methodCategory:row.method_category,
      confirmedCount:Number(row.confirmed_count||0),
      confirmedTotal:Number(row.confirmed_total||0),
      claimedCount:Number(row.claimed_count||0),
      claimedTotal:Number(row.claimed_total||0),
    })),
  };
}
