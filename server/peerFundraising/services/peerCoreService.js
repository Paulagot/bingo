import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';
import { updateMethods as updatePeerPaymentMethods } from './peerPaymentMethodsService.js';
import {
  listSponsoredContributions,
  confirmSponsoredContribution,
  disputeSponsoredContribution,
} from '../../mgtsystem/services/sponsoredActivityContributionService.js';
import { createPeerDonationForOrder } from './peerDonationService.js';

const F = `${TABLE_PREFIX}peer_fundraisers`;
const P = `${TABLE_PREFIX}peer_participants`;
const PK = `${TABLE_PREFIX}peer_packs`;
const PI = `${TABLE_PREFIX}peer_pack_items`;
const O = `${TABLE_PREFIX}peer_orders`;
const OI = `${TABLE_PREFIX}peer_order_items`;
const R = `${TABLE_PREFIX}web2_quiz_rooms`;
const C = `${TABLE_PREFIX}clubs`;
const DROP_TIERS = `${TABLE_PREFIX}puzzle_drop_pricing_tiers`;
const DROP_ITEMS = `${TABLE_PREFIX}puzzle_drop_items`;

const id = () => nanoid(21);
const parseJson = (v, f={}) => {
  if (!v) return f;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return f; }
};
const slugify = v => String(v || '').toLowerCase().trim()
  .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-')
  .replace(/^-|-$/g,'').slice(0,120);
const fail = (message, status=400) => { throw Object.assign(new Error(message), { status }); };

// Currently the public support page hardcodes 'cash_to_participant', so a
// bare passthrough of b.paymentMethodCategory has been harmless so far —
// but the moment real payment method choice is added to the public page,
// unvalidated client input goes straight into an ENUM column. Mirrors
// campaign's normalisePaymentCategory.
function normalisePaymentCategory(category, providerName) {
  const cat = String(category || '').toLowerCase().trim();
  const provider = String(providerName || '').toLowerCase().trim();
  const valid = new Set([
    'card','stripe','instant_payment','cash_to_participant','cash',
    'card_tap','pay_admin','crypto','bank_transfer','other',
  ]);
  if (valid.has(cat)) return cat;
  if (provider === 'cash' || provider === 'cash_to_participant') return 'cash_to_participant';
  if (provider === 'card_tap') return 'card_tap';
  if (provider === 'stripe') return 'stripe';
  if (provider === 'crypto' || provider === 'solana') return 'crypto';
  return 'other';
}

async function assertFundraiser(fid, clubId) {
  const [rows] = await connection.execute(`SELECT * FROM ${F} WHERE id=? AND club_id=? LIMIT 1`, [fid, clubId]);
  if (!rows[0]) fail('peer_fundraiser_not_found',404);
  return rows[0];
}
async function uniqueSlug(table, parentCol, parentId, slugCol, raw, excludeId=null) {
  const base = slugify(raw) || `item-${Date.now()}`;
  for (let n=1;n<100;n++) {
    const candidate = n===1 ? base : `${base}-${n}`;
    const sql = `SELECT id FROM ${table} WHERE ${parentCol}=? AND ${slugCol}=? ${excludeId?'AND id<>?':''} LIMIT 1`;
    const [rows] = await connection.execute(sql, excludeId?[parentId,candidate,excludeId]:[parentId,candidate]);
    if (!rows[0]) return candidate;
  }
  return `${base}-${Date.now()}`;
}
export async function listFundraisers(clubId) {
  const [rows] = await connection.execute(
    `SELECT f.*,
      COUNT(DISTINCT p.id) participant_count,
      COUNT(DISTINCT pk.id) pack_count,
      COALESCE(SUM(CASE WHEN o.payment_status='confirmed' THEN o.total_amount ELSE 0 END),0) confirmed_total
     FROM ${F} f
     LEFT JOIN ${P} p ON p.peer_fundraiser_id=f.id
     LEFT JOIN ${PK} pk ON pk.peer_fundraiser_id=f.id
     LEFT JOIN ${O} o ON o.peer_fundraiser_id=f.id
     WHERE f.club_id=? GROUP BY f.id ORDER BY f.created_at DESC`, [clubId]);
  return { fundraisers: rows };
}
export async function createFundraiser(clubId,b,clubReportingCurrency=null) {
  if (!b?.name?.trim()) fail('name_required');
  const fundraiserId=id();
  const publicSlug=await uniqueSlug(F,'club_id',clubId,'public_slug',b.publicSlug||b.name);
  await connection.execute(
    `INSERT INTO ${F}
      (id,club_id,name,description,format_type,target_amount,currency,start_date,end_date,status,public_slug,settings_json)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [fundraiserId,clubId,b.name.trim(),b.description?.trim()||null,b.formatType||'door_to_door',
     Number(b.targetAmount||0),b.currency||clubReportingCurrency||'EUR',b.startDate||null,b.endDate||null,b.status||'draft',
     publicSlug,JSON.stringify(b.settings||{})]);

  // Payment methods can now be picked at creation time, consistent with
  // how event setup works — previously this was only ever possible
  // afterward, via a separate Payments tab, with nothing at creation time
  // warning the club they hadn't set any up. Reuses updateMethods' existing
  // ownership + validation logic rather than duplicating it here.
  if (Array.isArray(b.paymentMethodIds) && b.paymentMethodIds.length) {
    await updatePeerPaymentMethods(fundraiserId, clubId, b.paymentMethodIds, b.updatedBy ?? null);
  }

  return getFundraiser(fundraiserId,clubId);
}
export async function getFundraiser(fid,clubId) {
  const fundraiser = await assertFundraiser(fid,clubId);
  // Previously the mgmt page had no way to know the club's real slug at all
  // and fell back to a literal "your-club" string in the URL. Join it here
  // so every screen that loads a single fundraiser gets the real value.
  const [clubRows] = await connection.execute(`SELECT slug, name FROM ${C} WHERE id=? LIMIT 1`, [clubId]);
  return { fundraiser: { ...fundraiser, club_slug: clubRows[0]?.slug ?? null, club_name: clubRows[0]?.name ?? null } };
}
export async function updateFundraiser(fid,clubId,b) {
  const cur=await assertFundraiser(fid,clubId);
  const publicSlug=b.publicSlug!==undefined
    ? await uniqueSlug(F,'club_id',clubId,'public_slug',b.publicSlug||b.name||cur.name,fid)
    : cur.public_slug;
  await connection.execute(
    `UPDATE ${F} SET name=?,description=?,format_type=?,target_amount=?,currency=?,
      start_date=?,end_date=?,status=?,public_slug=?,settings_json=? WHERE id=? AND club_id=?`,
    [b.name?.trim()||cur.name,b.description!==undefined?(b.description?.trim()||null):cur.description,
     b.formatType||cur.format_type,b.targetAmount!==undefined?Number(b.targetAmount):cur.target_amount,
     b.currency||cur.currency,b.startDate!==undefined?(b.startDate||null):cur.start_date,
     b.endDate!==undefined?(b.endDate||null):cur.end_date,b.status||cur.status,publicSlug,
     JSON.stringify(b.settings??parseJson(cur.settings_json,{})),fid,clubId]);
  return getFundraiser(fid,clubId);
}
export async function availableRooms(fid,clubId) {
  await assertFundraiser(fid,clubId);

  const [rows]=await connection.execute(
    `SELECT r.room_id,r.game_type,r.status,r.scheduled_at,r.time_zone,r.config_json,
            r.prize_description,r.prize_value,
            e.title AS event_title,e.summary AS event_summary,e.description AS event_description
     FROM ${R} r
     LEFT JOIN ${TABLE_PREFIX}event_integrations ei
       ON ei.external_ref=r.room_id
      AND ei.club_id=r.club_id
      AND ei.integration_type IN ('quiz_web2','elimination','ticketed_event','puzzle_drop')
     LEFT JOIN ${TABLE_PREFIX}events e
       ON e.id=ei.event_id
      AND e.club_id=r.club_id
     WHERE r.club_id=?
       AND r.game_type IN ('quiz','elimination','ticketed_event','puzzle_drop')
       AND r.status NOT IN ('completed','cancelled')
     ORDER BY CASE r.status WHEN 'scheduled' THEN 1 WHEN 'open' THEN 2 WHEN 'live' THEN 3 ELSE 4 END,
              r.scheduled_at ASC,r.created_at DESC`,
    [clubId]
  );

  const seen=new Set();
  const deduped=rows.filter(row=>{
    if(seen.has(row.room_id)) return false;
    seen.add(row.room_id);
    return true;
  });

  const dropRoomIds=deduped
    .filter(row=>row.game_type==='puzzle_drop')
    .map(row=>row.room_id);

  const tiersByRoom={};
  const itemsByRoom={};

  if(dropRoomIds.length){
    const placeholders=dropRoomIds.map(()=>'?').join(',');

    const [tiers]=await connection.execute(
      `SELECT id,drop_room_id,quantity,price,label,display_order
       FROM ${DROP_TIERS}
       WHERE drop_room_id IN (${placeholders})
       ORDER BY drop_room_id,display_order,id`,
      dropRoomIds
    );

    const [dropItems]=await connection.execute(
      `SELECT id,drop_room_id,item_number,puzzle_type,difficulty,display_order
       FROM ${DROP_ITEMS}
       WHERE drop_room_id IN (${placeholders})
       ORDER BY drop_room_id,display_order,item_number`,
      dropRoomIds
    );

    for(const tier of tiers){
      (tiersByRoom[tier.drop_room_id] ||= []).push(tier);
    }
    for(const item of dropItems){
      (itemsByRoom[item.drop_room_id] ||= []).push(item);
    }
  }

  const now=Date.now();

  return {
    rooms:deduped.map(row=>{
      const config=parseJson(row.config_json,{});
      const fallbackName=
        config.eventName||
        config.eventTitle||
        config.quizName||
        config.dropTitle||
        config.roomName||
        row.room_id;

      const name=row.event_title||fallbackName;
      const currency=config.currency||'EUR';
      const sellableOptions=[];

      if(row.game_type==='quiz'){
        const entryFee=Number(config.entryFee||0);
        const extras=Object.entries(config.fundraisingOptions||{})
          .filter(([,enabled])=>enabled===true)
          .map(([extraId])=>({
            extraId,
            label:{
              buyHint:'Hint',
              restorePoints:'Restore Points',
              robPoints:'Rob Points',
              freezeOutTeam:'Freeze Out Team',
            }[extraId]||extraId,
            price:Number(config.fundraisingPrices?.[extraId]||0),
          }))
          .filter(extra=>Number.isFinite(extra.price)&&extra.price>0);

        const extrasTotal=extras.reduce((sum,extra)=>sum+extra.price,0);
        const trueConfiguredValue=entryFee+extrasTotal;

        if(Number.isFinite(trueConfiguredValue) && trueConfiguredValue>0){
          sellableOptions.push({
            optionId:`quiz_entry:${row.room_id}`,
            roomId:row.room_id,
            gameType:'quiz',
            itemType:'quiz_entry',
            label:`${name} entry + all extras`,
            description:extras.length
              ? `Includes entry and all ${extras.length} available fundraising extras.`
              : row.event_description||row.event_summary||null,
            configuredPrice:trueConfiguredValue,
            currency,
            quantity:1,
            metadata:{
              optionKind:'room_entry',
              entryFee,
              includedExtras:extras,
              extrasTotal,
              referencePrice:trueConfiguredValue,
            },
          });
        }
      }

      if(row.game_type==='elimination'){
        const price=Number(config.entryFee||0);
        if(Number.isFinite(price) && price>0){
          sellableOptions.push({
            optionId:`elimination_entry:${row.room_id}`,
            roomId:row.room_id,
            gameType:'elimination',
            itemType:'elimination_entry',
            label:`${name} entry`,
            description:row.event_description||row.event_summary||null,
            configuredPrice:price,
            currency,
            quantity:1,
            metadata:{
              optionKind:'room_entry',
              referencePrice:price,
            },
          });
        }
      }

      if(row.game_type==='ticketed_event'){
        const configuredTypes=Array.isArray(config.ticketTypes) && config.ticketTypes.length
          ? config.ticketTypes
          : config.entryFee
            ? [{
                id:'general',
                name:'General Admission',
                price:String(config.entryFee),
                isEnabled:true,
                quantity:null,
                saleEndsAt:null,
              }]
            : [];

        for(const ticketType of configuredTypes){
          const price=Number(ticketType.price||0);
          if(ticketType.isEnabled===false || !Number.isFinite(price) || price<=0) continue;

          const saleEndsAt=ticketType.saleEndsAt||null;
          if(saleEndsAt){
            const endMs=new Date(saleEndsAt).getTime();
            if(Number.isFinite(endMs) && endMs<now) continue;
          }

          const ticketTypeId=String(ticketType.id||'').trim();
          if(!ticketTypeId) continue;

          sellableOptions.push({
            optionId:`ticket_type:${row.room_id}:${ticketTypeId}`,
            roomId:row.room_id,
            gameType:'ticketed_event',
            itemType:'event_ticket',
            label:String(ticketType.name||'Event ticket'),
            description:name,
            configuredPrice:price,
            currency,
            quantity:1,
            metadata:{
              optionKind:'ticket_type',
              ticketTypeId,
              ticketTypeName:String(ticketType.name||'Event ticket'),
              ticketTypeQuantity:ticketType.quantity??null,
              ticketTypeSaleEndsAt:saleEndsAt,
              referencePrice:price,
            },
          });
        }
      }

      if(row.game_type==='puzzle_drop'){
        const puzzleItems=(itemsByRoom[row.room_id]||[]).map(item=>({
          id:item.id,
          itemNumber:Number(item.item_number),
          puzzleType:item.puzzle_type,
          difficulty:item.difficulty,
        }));
        const puzzleItemIds=puzzleItems.map(item=>item.id);

        for(const tier of tiersByRoom[row.room_id]||[]){
          const price=Number(tier.price||0);
          const quantity=Number(tier.quantity||0);
          if(!Number.isFinite(price) || price<=0 || !Number.isInteger(quantity) || quantity<1) continue;
          if(quantity>puzzleItems.length) continue;

          const tierLabel=tier.label||`${quantity} Puzzle${quantity===1?'':'s'}`;

          sellableOptions.push({
            optionId:`puzzle_tier:${row.room_id}:${tier.id}`,
            roomId:row.room_id,
            gameType:'puzzle_drop',
            itemType:'puzzle_entry',
            label:tierLabel,
            description:`Choose exactly ${quantity} puzzle${quantity===1?'':'s'} from ${name}.`,
            configuredPrice:price,
            currency,
            quantity:1,
            metadata:{
              optionKind:'puzzle_tier',
              pricingTierId:tier.id,
              pricingTierLabel:tier.label||null,
              puzzleQuantity:quantity,
              puzzleItemIds,
              puzzleItems,
              referencePrice:price,
            },
          });
        }
      }

      return {
        room_id:row.room_id,
        game_type:row.game_type,
        status:row.status,
        scheduled_at:row.scheduled_at,
        time_zone:row.time_zone,
        prize_description:row.prize_description,
        prize_value:row.prize_value,
        config,
        name,
        description:row.event_description||row.event_summary||null,
        sellable_options:sellableOptions,
      };
    }).filter(room=>room.sellable_options.length>0),
  };
}

export async function availableSponsoredRooms(fid,clubId) {
  const fundraiser=await assertFundraiser(fid,clubId);
  if(fundraiser.format_type!=='sponsored'){
    fail('fundraiser_is_not_sponsored',400);
  }

  const [rows]=await connection.execute(
    `SELECT r.room_id,r.status,r.scheduled_at,r.time_zone,r.config_json,
            e.title AS event_title,e.summary AS event_summary,e.description AS event_description
     FROM ${R} r
     LEFT JOIN ${TABLE_PREFIX}event_integrations ei
       ON ei.external_ref=r.room_id
      AND ei.club_id=r.club_id
      AND ei.integration_type='sponsored_activity'
     LEFT JOIN ${TABLE_PREFIX}events e
       ON e.id=ei.event_id AND e.club_id=r.club_id
     WHERE r.club_id=?
       AND r.game_type='sponsored_activity'
       AND r.status NOT IN ('completed','cancelled')
     ORDER BY r.created_at DESC`,
    [clubId]
  );

  const seen=new Set();
  return {
    rooms:rows.filter(row=>{
      if(seen.has(row.room_id)) return false;
      seen.add(row.room_id);
      return true;
    }).map(row=>{
      const config=parseJson(row.config_json,{});
      return {
        room_id:row.room_id,
        game_type:'sponsored_activity',
        status:row.status,
        scheduled_at:row.scheduled_at,
        time_zone:row.time_zone,
        name:row.event_title||config.eventTitle||config.eventName||
             config.customActivityLabel||config.activityKind||'Sponsored Activity',
        description:row.event_description||row.event_summary||null,
        activity_kind:config.activityKind||'other',
        suggested_amounts:Array.isArray(config.suggestedAmounts)
          ? config.suggestedAmounts.map(Number).filter(Number.isFinite)
          : [],
        currency:config.currency||fundraiser.currency||'EUR',
      };
    }),
  };
}


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
  if(!roomId) fail('sponsored_room_not_linked',409);

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
       personal_message,profile_image_url,notes)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [participantId,fid,clubId,b.participantName.trim(),participantSlug,b.email?.trim().toLowerCase()||null,
     b.phone?.trim()||null,b.personalTarget??null,b.personalMessage?.trim()||null,
     b.profileImageUrl||null,b.notes?.trim()||null]);
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
       personal_message=?,profile_image_url=?,is_active=?,notes=?
     WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
    [
      b.participantName!==undefined?b.participantName.trim():current.participant_name,
      participantSlug,
      b.email!==undefined?(b.email?.trim().toLowerCase()||null):current.email,
      b.phone!==undefined?(b.phone?.trim()||null):current.phone,
      b.personalTarget!==undefined?b.personalTarget:current.personal_target,
      b.personalMessage!==undefined?(b.personalMessage?.trim()||null):current.personal_message,
      b.profileImageUrl!==undefined?(b.profileImageUrl||null):current.profile_image_url,
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
async function assertRoom(roomId,clubId,allowHistorical=false) {
  const [rows]=await connection.execute(`SELECT room_id,status FROM ${R} WHERE room_id=? AND club_id=? LIMIT 1`,[roomId,clubId]);
  if (!rows[0]) fail('invalid_pack_room');
  if (!allowHistorical && ['completed','cancelled'].includes(rows[0].status)) fail('room_not_available_for_pack');
}

// Must match the DB ENUMs exactly (see peer_packs.pack_type / peer_pack_items.item_type).
const VALID_PACK_TYPES = new Set(['single_entry','bundle','ticket','sponsor','custom']);
const VALID_ITEM_TYPES = new Set([
  'quiz_entry',
  'game_entry',
  'puzzle_entry',
  'elimination_entry',
  'event_ticket',
  'custom',
]);

// Mirrors the same room-type mapping used in peerEntryExpansionService.js
// (correctEntryType) and PeerPackEditor.tsx (validItemTypesForGameType) —
// kept as three independent copies rather than a shared import on purpose,
// since this one runs server-side at save time (before a pack can even be
// created), the entry-expansion one runs at purchase time (self-healing
// existing bad data), and the editor one is UI-only (prevention via the
// dropdown). Three independent layers catching the same class of mistake.
function validItemTypesForRoomGameType(gameType) {
  if (gameType === 'quiz') {
    return new Set(['quiz_entry', 'game_entry']);
  }
  if (gameType === 'elimination') {
    return new Set(['elimination_entry']);
  }
  if (gameType === 'ticketed_event') {
    return new Set(['event_ticket']);
  }
  if (gameType === 'puzzle_drop') {
    return new Set(['puzzle_entry']);
  }
  return null;
}

// Previously savePack only checked name and items.length — price, quantity
// and itemType went straight into the INSERT unvalidated. Number(bad||0)
// silently became €0, and a bogus itemType would only fail later, deep
// inside entry expansion, with a confusing error far from the cause. Now
// also async, so it can cross-check each item's itemType against its
// target room's actual game_type — this is what would have caught the
// elimination-room-saved-as-quiz_individual_ticket mismatch found in
// testing, at save time, with a clear error, instead of silently
// persisting bad data that only surfaced as a wrong join link days later.
async function validatePackPayload(b, clubId) {
  if(!b?.name?.trim()) fail('invalid_pack_name');

  const price=Number(b.price);
  if(!Number.isFinite(price) || price<0) fail('invalid_price');
  if(b.packType && !VALID_PACK_TYPES.has(b.packType)) fail('invalid_pack_type');
  if(!Array.isArray(b.items) || !b.items.length) fail('invalid_pack');

  const roomIds=[...new Set(b.items.map(item=>item.targetRoomId).filter(Boolean))];
  if(roomIds.length!==new Set(b.items.map(item=>item.targetRoomId)).size) fail('invalid_pack_item_room');

  const placeholders=roomIds.map(()=>'?').join(',');
  const [rooms]=await connection.execute(
    `SELECT room_id,game_type,config_json,status
     FROM ${R}
     WHERE room_id IN (${placeholders}) AND club_id=?`,
    [...roomIds,clubId]
  );

  const roomById=Object.fromEntries(rooms.map(room=>[room.room_id,room]));
  if(rooms.length!==roomIds.length) fail('invalid_pack_room');

  const dropRoomIds=rooms.filter(room=>room.game_type==='puzzle_drop').map(room=>room.room_id);
  const tierById={};

  if(dropRoomIds.length){
    const dropPlaceholders=dropRoomIds.map(()=>'?').join(',');
    const [tiers]=await connection.execute(
      `SELECT id,drop_room_id,quantity,price,label
       FROM ${DROP_TIERS}
       WHERE drop_room_id IN (${dropPlaceholders})`,
      dropRoomIds
    );
    for(const tier of tiers) tierById[tier.id]=tier;
  }

  for(const item of b.items){
    if(!item.targetRoomId) fail('invalid_pack_item_room');
    if(!item.itemType || !VALID_ITEM_TYPES.has(item.itemType)) fail('invalid_item_type');

    const quantity=Number(item.quantity);
    if(!Number.isFinite(quantity) || quantity<1) fail('invalid_quantity');

    const room=roomById[item.targetRoomId];
    if(!room) fail('invalid_pack_room');
    if(['completed','cancelled'].includes(room.status)) fail('room_not_available_for_pack');

    const validTypes=validItemTypesForRoomGameType(room.game_type);
    if(validTypes && !validTypes.has(item.itemType)){
      fail(`item_type_mismatch: ${item.itemType} is not valid for a ${room.game_type} room`);
    }

    const metadata=item.metadata||{};
    const configuredPrice=Number(metadata.configuredPrice);
    const referencePrice=Number(metadata.referencePrice);
    if(!Number.isFinite(configuredPrice) || configuredPrice<0) fail('configured_price_required');
    if(!Number.isFinite(referencePrice) || referencePrice<0) fail('reference_price_required');

    const config=parseJson(room.config_json,{});

    if(room.game_type==='quiz'){
      const liveEntryFee=Number(config.entryFee||0);

      const liveExtrasTotal=Object.entries(config.fundraisingOptions||{})
        .filter(([,enabled])=>enabled===true)
        .reduce(
          (sum,[extraId]) =>
            sum + Number(config.fundraisingPrices?.[extraId]||0),
          0
        );

      const liveConfiguredValue=liveEntryFee+liveExtrasTotal;

      if(Math.abs(liveConfiguredValue-referencePrice)>0.001){
        fail('activity_price_changed');
      }
    }

    if(room.game_type==='elimination'){
      const livePrice=Number(config.entryFee||0);

      if(Math.abs(livePrice-referencePrice)>0.001){
        fail('activity_price_changed');
      }
    }

    if(room.game_type==='ticketed_event'){
      const ticketTypeId=String(metadata.ticketTypeId||'').trim();
      if(!ticketTypeId) fail('ticket_type_required');

      const allTypes=Array.isArray(config.ticketTypes) && config.ticketTypes.length
        ? config.ticketTypes
        : config.entryFee
          ? [{id:'general',name:'General Admission',price:String(config.entryFee),isEnabled:true}]
          : [];

      const ticketType=allTypes.find(type=>String(type.id)===ticketTypeId);
      if(!ticketType || ticketType.isEnabled===false) fail('ticket_type_unavailable');

      if(ticketType.saleEndsAt){
        const endMs=new Date(ticketType.saleEndsAt).getTime();
        if(Number.isFinite(endMs) && endMs<Date.now()) fail('ticket_type_unavailable');
      }

      const livePrice=Number(ticketType.price||0);
      if(Math.abs(livePrice-referencePrice)>0.001) fail('ticket_type_price_changed');
    }

    if(room.game_type==='puzzle_drop'){
      const tierId=String(metadata.pricingTierId||'').trim();
      const tier=tierById[tierId];
      if(!tier || tier.drop_room_id!==room.room_id) fail('puzzle_tier_unavailable');

      const livePrice=Number(tier.price||0);
      const liveQuantity=Number(tier.quantity||0);
      if(Math.abs(livePrice-referencePrice)>0.001) fail('puzzle_tier_price_changed');
      if(Number(metadata.puzzleQuantity)!==liveQuantity) fail('puzzle_tier_quantity_changed');
    }
  }
}
export async function listPacks(fid,clubId) {
  await assertFundraiser(fid,clubId);
  const [packs]=await connection.execute(`SELECT * FROM ${PK} WHERE peer_fundraiser_id=? AND club_id=? ORDER BY display_order,created_at`,[fid,clubId]);
  if (!packs.length) return { packs:[] };
  const ids=packs.map(x=>x.id), ph=ids.map(()=>'?').join(',');
  const [items]=await connection.execute(`SELECT * FROM ${PI} WHERE pack_id IN (${ph}) ORDER BY created_at`,ids);
  return { packs:packs.map(p=>({...p,items:items.filter(i=>i.pack_id===p.id)})) };
}
export async function savePack(fid,clubId,packId,b) {
  await assertFundraiser(fid,clubId);
  await validatePackPayload(b, clubId);
  const existing = packId ? await listPacks(fid,clubId) : {packs:[]};
  const old = existing.packs.find(p=>p.id===packId);
  const oldRooms=new Set(old?.items?.map(i=>i.target_room_id)||[]);
  for (const item of b.items) await assertRoom(item.targetRoomId,clubId,oldRooms.has(item.targetRoomId));
  const conn=await connection.getConnection();
  try {
    await conn.beginTransaction();
    const pid=packId||id();
    if (packId) {
      await conn.execute(
        `UPDATE ${PK} SET name=?,description=?,pack_type=?,price=?,currency=?,is_featured=?,badge_label=?,
         display_order=?,max_sales=?,sales_start_at=?,sales_end_at=?,metadata_json=?
         WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
        [b.name.trim(),b.description?.trim()||null,b.packType||'bundle',Number(b.price||0),b.currency||'EUR',
         b.isFeatured?1:0,b.badgeLabel?.trim()||null,Number(b.displayOrder||0),b.maxSales||null,
         b.salesStartAt||null,b.salesEndAt||null,b.metadata?JSON.stringify(b.metadata):null,pid,fid,clubId]);
      await conn.execute(`DELETE FROM ${PI} WHERE pack_id=?`,[pid]);
    } else {
      await conn.execute(
        `INSERT INTO ${PK}
         (id,peer_fundraiser_id,club_id,name,description,pack_type,price,currency,is_featured,badge_label,
          display_order,max_sales,sales_start_at,sales_end_at,is_active,metadata_json)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?)`,
        [pid,fid,clubId,b.name.trim(),b.description?.trim()||null,b.packType||'bundle',Number(b.price||0),
         b.currency||'EUR',b.isFeatured?1:0,b.badgeLabel?.trim()||null,Number(b.displayOrder||0),
         b.maxSales||null,b.salesStartAt||null,b.salesEndAt||null,b.metadata?JSON.stringify(b.metadata):null]);
    }
    for (const item of b.items) {
      await conn.execute(
        `INSERT INTO ${PI}
         (id,pack_id,peer_fundraiser_id,club_id,target_room_id,item_type,quantity,metadata_json)
         VALUES (?,?,?,?,?,?,?,?)`,
        [id(),pid,fid,clubId,item.targetRoomId,item.itemType==='quiz_entry'?'game_entry':item.itemType,Number(item.quantity||1),
         item.metadata?JSON.stringify(item.metadata):null]);
    }
    await conn.commit();
    return { packId:pid };
  } catch(e) { await conn.rollback(); throw e; } finally { conn.release(); }
}

// ─── Hide / duplicate ──────────────────────────────────────────────────────
// Neither existed for peer packs — a pack could be created but never
// retired or cloned, unlike campaign products (hideProduct/duplicateProduct).

export async function hidePack(fid, clubId, packId) {
  await assertFundraiser(fid, clubId);
  const [result] = await connection.execute(
    `UPDATE ${PK} SET is_active=0 WHERE id=? AND peer_fundraiser_id=? AND club_id=?`,
    [packId, fid, clubId]
  );
  if (!result.affectedRows) fail('pack_not_found', 404);
  return { ok: true };
}

export async function duplicatePack(fid, clubId, packId) {
  await assertFundraiser(fid, clubId);
  const { packs } = await listPacks(fid, clubId);
  const source = packs.find(p => p.id === packId);
  if (!source) fail('pack_not_found', 404);

  return savePack(fid, clubId, null, {
    name: `${source.name} (copy)`,
    description: source.description,
    packType: source.pack_type,
    price: source.price,
    currency: source.currency,
    isFeatured: false,
    badgeLabel: source.badge_label,
    displayOrder: source.display_order,
    maxSales: source.max_sales,
    salesStartAt: source.sales_start_at,
    salesEndAt: source.sales_end_at,
    metadata: parseJson(source.metadata_json, null),
    items: source.items.map(i => ({
      targetRoomId: i.target_room_id,
      itemType: i.item_type,
      quantity: i.quantity,
      metadata: parseJson(i.metadata_json, null),
    })),
  });
}

// ─── Templates ─────────────────────────────────────────────────────────────
// Campaign had this (TEMPLATES + applyTemplate in campaignProductService.js);
// peer never had any version of it — building a bundle meant starting from
// a blank pack every time. Ported and extended: campaign's 'puzzle_campaign'
// key existed in the UI prompt but was never actually implemented in
// TEMPLATES — it's implemented here for real.

function findRoomByGameType(rooms, gameType) {
  return rooms.find(r => r.game_type === gameType);
}
function findPuzzleRoom(rooms) {
  return rooms.find(r => String(r.game_type || '').startsWith('puzzle'));
}

export async function publicPayload(clubSlug,fundraiserSlug,participantSlug=null) {
  // NOTE: clubs.logo_url doesn't exist in this schema — the original query
  // selected it and crashed every public page load with "Unknown column
  // 'logo_url' in 'field list'". Dropped from the query for now; club.logo_url
  // is returned as null so the frontend's existing `d.club.logo_url && <img.../>`
  // check degrades gracefully (no broken image, just no logo shown). If clubs
  // actually have logos stored somewhere (a different column name, or a
  // separate table), point me at it and I'll wire it in properly.
  const [clubs]=await connection.execute(`SELECT id,name,slug FROM ${C} WHERE slug=? OR LOWER(REPLACE(name,' ','-'))=? LIMIT 1`,[clubSlug,clubSlug]);
  const club=clubs[0]; if(!club) fail('club_not_found',404);
  club.logo_url = null;
  const [funds]=await connection.execute(`SELECT * FROM ${F} WHERE club_id=? AND public_slug=? AND status='published' LIMIT 1`,[club.id,fundraiserSlug]);
  const fundraiser=funds[0]; if(!fundraiser) fail('peer_fundraiser_not_found',404);
  let participant=null;
  if(participantSlug){
    const [rows]=await connection.execute(`SELECT * FROM ${P} WHERE peer_fundraiser_id=? AND participant_slug=? AND is_active=1 LIMIT 1`,[fundraiser.id,participantSlug]);
    participant=rows[0]; if(!participant) fail('participant_not_found',404);
  }
  const [packs]=await connection.execute(
    `SELECT * FROM ${PK} WHERE peer_fundraiser_id=? AND is_active=1
     AND (sales_start_at IS NULL OR sales_start_at<=UTC_TIMESTAMP())
     AND (sales_end_at IS NULL OR sales_end_at>=UTC_TIMESTAMP())
     ORDER BY display_order,is_featured DESC,created_at`,[fundraiser.id]);
  let items=[];
  if(packs.length){
    const ids=packs.map(p=>p.id),ph=ids.map(()=>'?').join(',');
    [items]=await connection.execute(
      `SELECT i.*,r.game_type,r.status room_status,r.scheduled_at,r.time_zone,r.config_json,
              e.title AS event_title, e.summary AS event_summary, e.description AS event_description
       FROM ${PI} i
       LEFT JOIN ${R} r ON r.room_id=i.target_room_id AND r.club_id=i.club_id
       LEFT JOIN ${TABLE_PREFIX}event_integrations ei
         ON ei.external_ref = i.target_room_id
         AND ei.club_id = i.club_id
         AND ei.integration_type IN ('quiz_web2','elimination','ticketed_event','puzzle_sub','puzzle_drop')
       LEFT JOIN ${TABLE_PREFIX}events e
         ON e.id = ei.event_id
         AND e.club_id = i.club_id
       WHERE i.pack_id IN (${ph})`,ids);

    // Same one-room-linked-to-multiple-events dedupe as availableRooms.
    const seenItems = new Set();
    items = items.filter(i => {
      if (seenItems.has(i.id)) return false;
      seenItems.add(i.id);
      return true;
    });
  }
  const fundraiserSettings=parseJson(fundraiser.settings_json,{});
  const sponsoredRoomId=fundraiser.format_type==='sponsored'
    ? String(fundraiserSettings.sponsoredRoomId||'').trim()||null
    : null;
  let sponsoredRoom=null;

  if(sponsoredRoomId){
    const [sRows]=await connection.execute(
      `SELECT room_id,status,config_json
       FROM ${R}
       WHERE room_id=? AND club_id=? AND game_type='sponsored_activity'
       LIMIT 1`,
      [sponsoredRoomId,club.id]
    );
    if(sRows[0]){
      const config=parseJson(sRows[0].config_json,{});
      sponsoredRoom={
        roomId:sRows[0].room_id,
        status:sRows[0].status,
        activityKind:config.activityKind||'other',
        customActivityLabel:config.customActivityLabel||null,
        suggestedAmounts:config.suggestedAmounts||[],
        currency:config.currency||fundraiser.currency||'EUR',
      };
    }
  }

  let sponsorshipSummary={
    confirmedTotal:0,
    confirmedCount:0,
  };

  if(fundraiser.format_type==='sponsored'){
    const [[summaryRow]]=await connection.execute(
      `SELECT
         COALESCE(SUM(
           CASE WHEN status='confirmed' THEN amount ELSE 0 END
         ),0) AS confirmed_total,
         SUM(status='confirmed') AS confirmed_count
       FROM ${TABLE_PREFIX}sponsored_contributions
       WHERE club_id=?
         AND peer_fundraiser_id=?
         AND (? IS NULL OR participant_id=?)`,
      [
        club.id,
        fundraiser.id,
        participant?.id||null,
        participant?.id||null,
      ]
    );

    sponsorshipSummary={
      confirmedTotal:Number(summaryRow?.confirmed_total||0),
      confirmedCount:Number(summaryRow?.confirmed_count||0),
    };
  }

  return {
    club,
    fundraiser:{
      ...fundraiser,
      settings:fundraiserSettings,
      sponsorship_total:sponsorshipSummary.confirmedTotal,
      sponsor_count:sponsorshipSummary.confirmedCount,
    },
    participant:participant
      ? {
          ...participant,
          sponsorship_total:sponsorshipSummary.confirmedTotal,
          sponsor_count:sponsorshipSummary.confirmedCount,
        }
      : null,
    sponsoredRoom,
    supporterExperience:fundraiser.format_type==='sponsored'
      ? 'sponsorship'
      : 'sell_activities',
    packs:packs.map(p=>({...p,items:items.filter(i=>i.pack_id===p.id).map(i=>{
    const config = parseJson(i.config_json,{});
    const fallbackName = config.eventName||config.eventTitle||config.quizName||i.target_room_id;
    return {
      ...i,
      room:{
        roomId:i.target_room_id,
        gameType:i.game_type,
        status:i.room_status,
        scheduledAt:i.scheduled_at,
        name: i.event_title || fallbackName,
        description: i.event_description || i.event_summary || null,
      }
    };
  })}))};
}
export async function createOrder(fid,b) {
  if(!b?.supporterName?.trim()||!b?.supporterEmail?.trim()||!Array.isArray(b.items)||!b.items.length) fail('invalid_order');
  const [funds]=await connection.execute(`SELECT * FROM ${F} WHERE id=? AND status='published' LIMIT 1`,[fid]);
  const fund=funds[0]; if(!fund) fail('peer_fundraiser_not_available',404);
  let participant=null;
  if(b.participantId){
    const [rows]=await connection.execute(`SELECT * FROM ${P} WHERE id=? AND peer_fundraiser_id=? AND is_active=1 LIMIT 1`,[b.participantId,fid]);
    participant=rows[0]; if(!participant) fail('participant_not_found',404);
  }
  const ids=[...new Set(b.items.map(i=>i.packId))],ph=ids.map(()=>'?').join(',');
  const [packs]=await connection.execute(`SELECT * FROM ${PK} WHERE id IN (${ph}) AND peer_fundraiser_id=? AND club_id=? AND is_active=1`,[...ids,fid,fund.club_id]);
  const map=Object.fromEntries(packs.map(p=>[p.id,p])); let total=0;
  const lines=b.items.map(i=>{const p=map[i.packId];if(!p)fail('pack_not_found',404);const q=Math.max(1,Number(i.quantity||1));const t=Number(p.price)*q;total+=t;return{p,q,t};});
  const donationAmount=Math.max(0,Number(b.donationAmount||0));
  if(!Number.isFinite(donationAmount) || donationAmount>10000) fail('invalid_donation_amount');
  const orderId=id(),conn=await connection.getConnection();
  try{
    await conn.beginTransaction();

    // Re-validate sales window and stock inside the transaction. Previously
    // publicPayload only filtered what was *displayed* — nothing re-checked
    // these at the moment of purchase, so a stale page or a direct API call
    // could buy a sold-out or expired pack. The FOR UPDATE lock on the pack
    // row also serializes concurrent purchases of the same pack, so two
    // supporters racing for the last available spot can't both succeed.
    for (const line of lines) {
      const [windowRows] = await conn.execute(
        `SELECT id FROM ${PK} WHERE id=? AND is_active=1
         AND (sales_start_at IS NULL OR sales_start_at<=UTC_TIMESTAMP())
         AND (sales_end_at IS NULL OR sales_end_at>=UTC_TIMESTAMP())
         LIMIT 1 FOR UPDATE`,
        [line.p.id]
      );
      if (!windowRows[0]) fail('pack_not_available', 400);

      if (line.p.max_sales != null) {
        const [soldRows] = await conn.execute(
          `SELECT COALESCE(SUM(oi.quantity),0) sold
           FROM ${OI} oi JOIN ${O} o ON o.id=oi.order_id
           WHERE oi.pack_id=? AND o.payment_status NOT IN ('cancelled','refunded')`,
          [line.p.id]
        );
        const alreadySold = Number(soldRows[0]?.sold || 0);
        if (alreadySold + line.q > Number(line.p.max_sales)) {
          fail('pack_sold_out', 400);
        }
      }
    }

    await conn.execute(
      `INSERT INTO ${O}
       (id,peer_fundraiser_id,club_id,participant_id,participant_name,supporter_name,supporter_email,
        supporter_phone,club_payment_method_id,payment_method_category,payment_provider,payment_reference,
        payment_status,subtotal_amount,total_amount,donation_amount,currency,source)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderId,fid,fund.club_id,participant?.id||null,participant?.participant_name||null,b.supporterName.trim(),
       b.supporterEmail.trim().toLowerCase(),b.supporterPhone?.trim()||null,b.clubPaymentMethodId||null,
       normalisePaymentCategory(b.paymentMethodCategory,b.paymentProvider),b.paymentProvider||null,b.paymentReference||null,'pending',
       total,total,donationAmount,fund.currency||'EUR',participant?'participant_link':'fundraiser_page']);
    for(const l of lines) await conn.execute(
      `INSERT INTO ${OI}
       (id,order_id,peer_fundraiser_id,club_id,pack_id,pack_name_snapshot,pack_description_snapshot,unit_price,quantity,line_total)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id(),orderId,fid,fund.club_id,l.p.id,l.p.name,l.p.description||null,Number(l.p.price),l.q,l.t]);
    await conn.commit(); return { orderId,totalAmount:total,donationAmount,payableAmount:total+donationAmount,currency:fund.currency||'EUR' };
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
}
export async function claimOrder(orderId,b={}) {
  const conn=await connection.getConnection();
  try{
    await conn.beginTransaction();
    const [r]=await conn.execute(
      `UPDATE ${O}
       SET payment_status='claimed',
           payment_reference=COALESCE(?,payment_reference),
           club_payment_method_id=COALESCE(?,club_payment_method_id)
       WHERE id=? AND payment_status='pending'`,
      [b.paymentReference||null,b.clubPaymentMethodId||null,orderId]
    );
    if(!r.affectedRows) fail('order_not_claimable');

    await createPeerDonationForOrder({
      orderId,
      status:'claimed',
      conn,
    });

    await conn.commit();
  }catch(e){
    await conn.rollback();
    throw e;
  }finally{
    conn.release();
  }

  try {
    const { sendPeerOrderConfirmationEmail } = await import('./peerOrderEmailService.js');
    await sendPeerOrderConfirmationEmail(orderId);
  } catch (emailErr) {
    console.error('[PeerCore] ⚠️ Order confirmation email failed (non-fatal):', emailErr.message);
  }

  return { orderId };
}

// Public order-summary lookup — peer had no equivalent to campaign's
// GET /campaign-support/orders/:orderId/summary at all. Needed for the
// supporter-facing thank-you screen and for polling after Stripe checkout.
// Strips internal fields (club_id, participant_id, metadata) the same way
// campaign's safeOrder mapping does.
export async function getPublicOrderSummary(orderId) {
  const [orderRows]=await connection.execute(`SELECT * FROM ${O} WHERE id=? LIMIT 1`,[orderId]);
  const order=orderRows[0]; if(!order) fail('order_not_found',404);

  const [itemRows]=await connection.execute(
    `SELECT pack_name_snapshot,quantity,line_total FROM ${OI} WHERE order_id=? ORDER BY created_at`,
    [orderId]
  );

  const E=`${TABLE_PREFIX}peer_entries`;
  const [entryRows]=await connection.execute(
    `SELECT
       e.id,
       e.entry_type,
       e.status,
       e.entry_code,
       e.join_url,
       e.room_id,
       e.linked_ticket_id,
       e.metadata_json,
       t.ticket_type_id,
       t.ticket_type_name
     FROM ${E} e
     LEFT JOIN ${TABLE_PREFIX}quiz_tickets t
       ON t.ticket_id=e.linked_ticket_id
     WHERE e.order_id=?
     ORDER BY e.created_at`,
    [orderId]
  );

  return {
    order: {
      id: order.id,
      participantName: order.participant_name,
      supporterName: order.supporter_name,
      supporterEmail: order.supporter_email,
      paymentStatus: order.payment_status,
      paymentMethodCategory: order.payment_method_category,
      paymentReference: order.payment_reference,
      totalAmount: Number(order.total_amount),
      donationAmount: Number(order.donation_amount||0),
      payableAmount: Number(order.total_amount)+Number(order.donation_amount||0),
      currency: order.currency,
      fulfilmentStatus:
        parseJson(order.metadata_json,{}).fulfilmentStatus ||
        (order.payment_status==='confirmed' ? 'pending' : 'not_started'),
      fulfilmentError:
        parseJson(order.metadata_json,{}).fulfilmentError || null,
      allocationStatus:
        parseJson(order.metadata_json,{}).allocationStatus || 'pending',
      allocationCheck:
        parseJson(order.metadata_json,{}).allocationCheck || null,
      items: itemRows.map(i=>({
        packName: i.pack_name_snapshot,
        quantity: Number(i.quantity),
        lineTotal: Number(i.line_total),
      })),
    },
    entries: entryRows.map(entry=>{
      const metadata=parseJson(entry.metadata_json,{});
      const label=
        entry.ticket_type_name ||
        metadata.ticketTypeName ||
        (entry.entry_type==='game_entry'
          ? 'Quiz Entry + All Extras'
          : entry.entry_type==='elimination_entry'
            ? 'Elimination Entry'
            : entry.entry_type==='event_ticket'
              ? 'Event Ticket'
              : entry.entry_type==='puzzle_entry'
                ? 'Puzzle Drop'
                : 'Entry');

      return {
        ...entry,
        displayLabel:label,
        expansionError:metadata.expansionError||null,
      };
    }),
  };
}
export async function listOrders(fid,clubId) {
  await assertFundraiser(fid,clubId);

  const [rows]=await connection.execute(
    `SELECT
       o.*,
       COUNT(e.id) AS entry_count,
       SUM(e.status='confirmed') AS confirmed_entry_count,
       SUM(e.status='pending_payment') AS pending_entry_count,
       SUM(
         JSON_EXTRACT(
           e.metadata_json,'$.expansionError'
         ) IS NOT NULL
       ) AS failed_entry_count
     FROM ${O} o
     LEFT JOIN ${TABLE_PREFIX}peer_entries e
       ON e.order_id=o.id
     WHERE o.peer_fundraiser_id=?
       AND o.club_id=?
       AND o.payment_status IN ('confirmed','claimed')
     GROUP BY o.id
     ORDER BY o.created_at DESC`,
    [fid,clubId],
  );

  return {
    orders:rows.map(order=>{
      const metadata=parseJson(order.metadata_json,{});
      return {
        ...order,
        fulfilment_status:
          metadata.fulfilmentStatus ||
          (order.payment_status==='confirmed'
            ? 'pending'
            : 'not_started'),
        fulfilment_error:
          metadata.fulfilmentError || null,
        allocation_status:
          metadata.allocationStatus || 'pending',
        allocation_check:
          metadata.allocationCheck || null,
      };
    }),
  };
}
// NOTE: confirmOrder used to live here as a bare status-flip that never
// called expandPeerOrder — confirming a cash order through the mgmt UI
// marked it paid but never created tickets or join links. Order confirm
// and reject now live in peerOrderCompletionService.js (confirmPeerOrderForClub /
// rejectPeerOrder), which run the full expansion and are ownership-checked.