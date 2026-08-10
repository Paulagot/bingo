// peerSponsorshipService.js
// Extracted from peerCoreService.js by split_peer_core.mjs — behaviour unchanged.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import {
  listSponsoredContributions,
  confirmSponsoredContribution,
  disputeSponsoredContribution,
} from '../../mgtsystem/services/sponsoredActivityContributionService.js';
import {
  F, P, PK, PI, O, OI, R, C, DROP_TIERS, DROP_ITEMS,
  id, parseJson, slugify, fail, assertFundraiser, uniqueSlug,
} from './peerCoreShared.js';

export async function getPeerSponsorshipSummary(fid,clubId) {
  const fundraiser=await assertFundraiser(fid,clubId);

  if(fundraiser.format_type!=='sponsored'){
    fail('fundraiser_is_not_sponsored',400);
  }

  const settings=parseJson(fundraiser.settings_json,{});
  const roomId=String(settings.sponsoredRoomId||'').trim()||null;

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
       ) AS confirmed_anonymous_count,
       SUM(
         status='confirmed' AND participant_id IS NULL
       ) AS confirmed_general_count,
       COALESCE(SUM(
         CASE
           WHEN status='confirmed' AND participant_id IS NULL
           THEN amount ELSE 0
         END
       ),0) AS confirmed_general_total
     FROM ${TABLE_PREFIX}sponsored_contributions
     WHERE club_id=?
       AND peer_fundraiser_id=?`,
    [clubId,fid]
  );

  const [participants]=await connection.execute(
    `SELECT
       p.id,
       p.participant_name,
       p.participant_slug,
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
     GROUP BY
       p.id,
       p.participant_name,
       p.participant_slug
     ORDER BY confirmed_total DESC,p.participant_name`,
    [fid,clubId]
  );

  return {
    roomId,
    summary:{
      confirmedCount:Number(totals?.confirmed_count||0),
      confirmedTotal:Number(totals?.confirmed_total||0),
      claimedCount:Number(totals?.claimed_count||0),
      claimedTotal:Number(totals?.claimed_total||0),
      confirmedAnonymousCount:Number(
        totals?.confirmed_anonymous_count||0
      ),
      confirmedGeneralCount:Number(
        totals?.confirmed_general_count||0
      ),
      confirmedGeneralTotal:Number(
        totals?.confirmed_general_total||0
      ),
    },
    participants:participants.map(row=>({
      id:row.id,
      name:row.participant_name,
      publicSlug:row.participant_slug,
      confirmedCount:Number(row.confirmed_count||0),
      confirmedTotal:Number(row.confirmed_total||0),
      claimedCount:Number(row.claimed_count||0),
      claimedTotal:Number(row.claimed_total||0),
    })),
  };
}

export async function listPeerSponsorships(fid,clubId) {
  const fundraiser=await assertFundraiser(fid,clubId);
  if(fundraiser.format_type!=='sponsored'){
    fail('fundraiser_is_not_sponsored',400);
  }

  const settings=parseJson(fundraiser.settings_json,{});
  const roomId=String(settings.sponsoredRoomId||'').trim();

  // A newly-created sponsored peer fundraiser has no linked room yet.
  // This is a valid setup state, not an API conflict. Returning an empty
  // contribution list allows the management drawer to render the room
  // selector so the organiser can complete the linkage.
  if(!roomId){
    return {
      roomId:null,
      linked:false,
      contributions:[],
    };
  }

  const result=await listSponsoredContributions({
    roomId,
    clubId,
    status:'all',
    search:'',
  });

  // Automatic payment attempts are deliberately hidden. Peer management
  // surfaces confirmed income and claimed manual payments needing action.
  const visible=result.contributions.filter(contribution =>
    ['confirmed','claimed','disputed'].includes(contribution.status)
  );

  const participantIds=[
    ...new Set(
      visible
        .map(item=>item.participantId)
        .filter(Boolean)
    ),
  ];

  let participantNames={};
  if(participantIds.length){
    const placeholders=participantIds.map(()=>'?').join(',');
    const [rows]=await connection.execute(
      `SELECT id,participant_name
       FROM ${P}
       WHERE id IN (${placeholders})
         AND peer_fundraiser_id=?
         AND club_id=?`,
      [...participantIds,fid,clubId]
    );
    participantNames=Object.fromEntries(
      rows.map(row=>[row.id,row.participant_name])
    );
  }

  return {
    roomId,
    linked:true,
    contributions:visible.map(item=>({
      ...item,
      participantName:item.participantId
        ? participantNames[item.participantId]||null
        : null,
    })),
  };
}

async function peerSponsoredContext(fid,clubId) {
  const fundraiser=await assertFundraiser(fid,clubId);
  if(fundraiser.format_type!=='sponsored'){
    fail('fundraiser_is_not_sponsored',400);
  }
  const settings=parseJson(fundraiser.settings_json,{});
  const roomId=String(settings.sponsoredRoomId||'').trim();
  if(!roomId) fail('sponsored_room_not_linked',409);
  return {fundraiser,roomId};
}

export async function confirmPeerSponsorship(
  fid,
  clubId,
  contributionId,
  confirmer
) {
  const {roomId}=await peerSponsoredContext(fid,clubId);
  return confirmSponsoredContribution({
    roomId,
    clubId,
    contributionId,
    confirmer,
  });
}

export async function disputePeerSponsorship(
  fid,
  clubId,
  contributionId,
  reason,
  disputedBy
) {
  const {roomId}=await peerSponsoredContext(fid,clubId);
  return disputeSponsoredContribution({
    roomId,
    clubId,
    contributionId,
    disputeReason:reason,
    disputedBy,
  });
}
