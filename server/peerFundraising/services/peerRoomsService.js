// peerRoomsService.js
// Extracted from peerCoreService.js by split_peer_core.mjs - behaviour unchanged.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import {
  F, P, PK, PI, O, OI, R, C, DROP_TIERS, DROP_ITEMS,
  id, parseJson, slugify, fail, assertFundraiser, uniqueSlug,
} from './peerCoreShared.js';

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
