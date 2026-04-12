import { connection as db } from '../../config/database.js'

/**
 * Fetches the full dashboard payload for a given wallet address.
 * All EUR values come directly from stored _eur columns — no conversion needed.
 * Token amounts come from amount + fee_token columns per transaction row.
 */

// ─── Hosted impact ────────────────────────────────────────────────────────────

async function getHostedOverview(walletAddress) {
  const [rows] = await db.query(
    `SELECT
      COUNT(*)                        AS rooms_launched,
      COALESCE(SUM(total_raised_eur), 0)    AS total_raised_eur,
      COALESCE(SUM(charity_amount_eur), 0)  AS charity_amount_eur,
      COALESCE(SUM(host_fee_amount_eur), 0) AS host_fee_amount_eur,
      COALESCE(SUM(extras_revenue * token_price_eur), 0) AS extras_revenue_eur,
      COALESCE(SUM(number_of_players), 0)   AS total_players,
      COALESCE(AVG(total_raised_eur), 0)    AS avg_raised_per_room,
      COALESCE(AVG(number_of_players), 0)   AS avg_players_per_room,
      COUNT(DISTINCT charity_name)          AS distinct_charities_count
    FROM fundraisely_impact_campaign_events
    WHERE host_wallet = ?`,
    [walletAddress]
  )

  const overview = rows[0]

  // Charity names list for secondary display
  const [charityRows] = await db.query(
    `SELECT DISTINCT charity_name, charity_wallet,
       SUM(charity_amount_eur) AS total_eur
     FROM fundraisely_impact_campaign_events
     WHERE host_wallet = ?
     GROUP BY charity_name, charity_wallet
     ORDER BY total_eur DESC`,
    [walletAddress]
  )

  // Unique supporter wallets across all hosted rooms
  const [hostedRoomIds] = await db.query(
    `SELECT room_id FROM fundraisely_impact_campaign_events WHERE host_wallet = ?`,
    [walletAddress]
  )

  let uniqueSupporterWallets = 0
  let totalPrizePayoutsSentEur = 0

  if (hostedRoomIds.length > 0) {
    const roomIds = hostedRoomIds.map(r => r.room_id)
    const placeholders = roomIds.map(() => '?').join(',')

    const [supporterRows] = await db.query(
      `SELECT COUNT(DISTINCT wallet_address) AS unique_wallets
       FROM fundraisely_web3_transactions
       WHERE room_id IN (${placeholders})
         AND transaction_type = 'join_payment'`,
      roomIds
    )
    uniqueSupporterWallets = supporterRows[0]?.unique_wallets ?? 0

    const [payoutRows] = await db.query(
      `SELECT COALESCE(SUM(amount_eur), 0) AS total_eur
       FROM fundraisely_web3_transactions
       WHERE room_id IN (${placeholders})
         AND transaction_type = 'prize_payout'`,
      roomIds
    )
    totalPrizePayoutsSentEur = payoutRows[0]?.total_eur ?? 0
  }

  return {
    rooms_launched: Number(overview.rooms_launched),
    total_raised_eur: Number(overview.total_raised_eur),
    charity_amount_eur: Number(overview.charity_amount_eur),
    host_fee_amount_eur: Number(overview.host_fee_amount_eur),
    extras_revenue_eur: Number(overview.extras_revenue_eur),
    total_players: Number(overview.total_players),
    avg_raised_per_room: Number(overview.avg_raised_per_room),
    avg_players_per_room: Number(overview.avg_players_per_room),
    distinct_charities_count: Number(overview.distinct_charities_count),
    charity_names: charityRows,
    unique_supporter_wallets: Number(uniqueSupporterWallets),
    total_prize_payouts_sent_eur: Number(totalPrizePayoutsSentEur),
    // Derived — host earnings split varies by game type, host_fee_amount_eur is already
    // the pre-calculated host share so we just avg it across rooms
    avg_host_fee_per_room:
      Number(overview.rooms_launched) > 0
        ? Number(overview.host_fee_amount_eur) / Number(overview.rooms_launched)
        : 0,
  }
}

// ─── Player/supporter impact ──────────────────────────────────────────────────

async function getPlayerOverview(walletAddress) {
  const [rows] = await db.query(
    `SELECT
      COUNT(DISTINCT room_id)                     AS rooms_joined,
      COALESCE(SUM(entry_fee_amount_eur), 0)      AS total_entry_fees_eur,
      COALESCE(SUM(donation_amount_eur), 0)       AS total_donation_eur,
      COALESCE(SUM(extras_amount_eur), 0)         AS total_extras_eur
    FROM fundraisely_web3_transactions
    WHERE wallet_address = ?
      AND transaction_type = 'join_payment'`,
    [walletAddress]
  )

  const [payoutRows] = await db.query(
    `SELECT COALESCE(SUM(amount_eur), 0) AS prize_payouts_received_eur
     FROM fundraisely_web3_transactions
     WHERE wallet_address = ?
       AND transaction_type = 'prize_payout'`,
    [walletAddress]
  )

  const [chainRows] = await db.query(
    `SELECT DISTINCT chain FROM fundraisely_web3_transactions
     WHERE wallet_address = ?`,
    [walletAddress]
  )

  const overview = rows[0]
  return {
    rooms_joined: Number(overview.rooms_joined),
    total_entry_fees_eur: Number(overview.total_entry_fees_eur),
    total_donation_eur: Number(overview.total_donation_eur),
    total_extras_eur: Number(overview.total_extras_eur),
    prize_payouts_received_eur: Number(payoutRows[0]?.prize_payouts_received_eur ?? 0),
    distinct_chains: chainRows.map(r => r.chain),
  }
}

// ─── Charts data ──────────────────────────────────────────────────────────────

async function getChartsData(walletAddress) {
  // Charity raised over time (hosted rooms, by week)
  const [raisedOverTime] = await db.query(
    `SELECT
       DATE_FORMAT(created_at, '%Y-%u') AS period,
       MIN(DATE(created_at))            AS period_start,
       SUM(charity_amount_eur)          AS charity_eur,
       SUM(total_raised_eur)            AS total_eur,
       COUNT(*)                         AS room_count
     FROM fundraisely_impact_campaign_events
     WHERE host_wallet = ?
     GROUP BY period
     ORDER BY period ASC`,
    [walletAddress]
  )

  // Revenue mix for hosted rooms
  const [revenueMixRows] = await db.query(
    `SELECT
       SUM(charity_amount_eur)  AS charity_eur,
       SUM(host_fee_amount_eur) AS host_fee_eur,
       SUM(extras_revenue * token_price_eur) AS extras_eur
     FROM fundraisely_impact_campaign_events
     WHERE host_wallet = ?`,
    [walletAddress]
  )
  const rm = revenueMixRows[0]
  const revenueMix = [
    { name: 'To charity', value: Number(rm.charity_eur) },
    { name: 'Host fee', value: Number(rm.host_fee_eur) },
    { name: 'Extras', value: Number(rm.extras_eur) },
  ]

  // Contribution mix for this wallet as a player
  const [contribRows] = await db.query(
    `SELECT
       SUM(entry_fee_amount_eur) AS entry_fee_eur,
       SUM(donation_amount_eur)  AS donation_eur,
       SUM(extras_amount_eur)    AS extras_eur
     FROM fundraisely_web3_transactions
     WHERE wallet_address = ? AND transaction_type = 'join_payment'`,
    [walletAddress]
  )
  const c = contribRows[0]
  const contributionMix = [
    { name: 'Entry fee', value: Number(c.entry_fee_eur) },
    { name: 'Donation', value: Number(c.donation_eur) },
    { name: 'Extras', value: Number(c.extras_eur) },
  ]

  // Chain usage (both roles)
  const [hostedChainRows] = await db.query(
    `SELECT chain, COUNT(*) AS hosted_rooms, SUM(total_raised_eur) AS raised_eur
     FROM fundraisely_impact_campaign_events
     WHERE host_wallet = ?
     GROUP BY chain`,
    [walletAddress]
  )
  const [playerChainRows] = await db.query(
    `SELECT chain, COUNT(DISTINCT room_id) AS rooms_joined
     FROM fundraisely_web3_transactions
     WHERE wallet_address = ?
     GROUP BY chain`,
    [walletAddress]
  )
  // Merge chain data
  const chainMap = {}
  for (const r of hostedChainRows) {
    chainMap[r.chain] = { chain: r.chain, hosted_rooms: Number(r.hosted_rooms), rooms_joined: 0, raised_eur: Number(r.raised_eur) }
  }
  for (const r of playerChainRows) {
    if (!chainMap[r.chain]) chainMap[r.chain] = { chain: r.chain, hosted_rooms: 0, rooms_joined: 0, raised_eur: 0 }
    chainMap[r.chain].rooms_joined = Number(r.rooms_joined)
  }
  const chainUsage = Object.values(chainMap)

  // Prize payouts sent over time (for hosted rooms)
  const [hostedRoomIds] = await db.query(
    `SELECT room_id FROM fundraisely_impact_campaign_events WHERE host_wallet = ?`,
    [walletAddress]
  )

  let payoutsOverTime = []
  if (hostedRoomIds.length > 0) {
    const roomIds = hostedRoomIds.map(r => r.room_id)
    const placeholders = roomIds.map(() => '?').join(',')
    const [payoutRows] = await db.query(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%u') AS period,
         MIN(DATE(created_at))            AS period_start,
         SUM(amount_eur)                  AS payout_eur,
         COUNT(*)                         AS payout_count
       FROM fundraisely_web3_transactions
       WHERE room_id IN (${placeholders})
         AND transaction_type = 'prize_payout'
       GROUP BY period
       ORDER BY period ASC`,
      roomIds
    )
    payoutsOverTime = payoutRows
  }

  // Charities breakdown
  const [charitiesBreakdown] = await db.query(
    `SELECT charity_name,
       SUM(charity_amount_eur) AS total_eur,
       COUNT(*) AS room_count
     FROM fundraisely_impact_campaign_events
     WHERE host_wallet = ?
     GROUP BY charity_name
     ORDER BY total_eur DESC`,
    [walletAddress]
  )

  return {
    raisedOverTime,
    revenueMix,
    contributionMix,
    chainUsage,
    payoutsOverTime,
    charitiesBreakdown,
  }
}

// ─── Recent activity feed ─────────────────────────────────────────────────────

async function getRecentActivity(walletAddress) {
  // Get hosted room IDs first
  const [hostedRoomIds] = await db.query(
    `SELECT room_id FROM fundraisely_impact_campaign_events WHERE host_wallet = ?`,
    [walletAddress]
  )
  const roomIds = hostedRoomIds.map(r => r.room_id)

  // Hosted room events
  const [hostedEvents] = await db.query(
    `SELECT
       'hosted_room' AS activity_type,
       room_id, charity_name, chain, network,
       total_raised_eur, charity_amount_eur, number_of_players,
       NULL AS tx_hash, NULL AS transaction_type, NULL AS fee_token,
       NULL AS amount, NULL AS amount_eur,
       created_at
     FROM fundraisely_impact_campaign_events
     WHERE host_wallet = ?
     ORDER BY created_at DESC
     LIMIT 10`,
    [walletAddress]
  )

  // Player transaction events
  let playerEvents = []
  if (roomIds.length > 0) {
    const placeholders = roomIds.map(() => '?').join(',')
    const [txRows] = await db.query(
      `SELECT
         'transaction' AS activity_type,
         room_id, NULL AS charity_name, chain, network,
         NULL AS total_raised_eur, NULL AS charity_amount_eur, NULL AS number_of_players,
         tx_hash, transaction_type, fee_token,
         amount, amount_eur,
         created_at
       FROM fundraisely_web3_transactions
       WHERE wallet_address = ?
          OR room_id IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT 10`,
      [walletAddress, ...roomIds]
    )
    playerEvents = txRows
  } else {
    const [txRows] = await db.query(
      `SELECT
         'transaction' AS activity_type,
         room_id, NULL AS charity_name, chain, network,
         NULL AS total_raised_eur, NULL AS charity_amount_eur, NULL AS number_of_players,
         tx_hash, transaction_type, fee_token,
         amount, amount_eur,
         created_at
       FROM fundraisely_web3_transactions
       WHERE wallet_address = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [walletAddress]
    )
    playerEvents = txRows
  }

  // Merge, sort, take 20
  const combined = [...hostedEvents, ...playerEvents]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 20)
    .map(item => ({
      ...item,
      label: buildActivityLabel(item),
    }))

  return combined
}

function buildActivityLabel(item) {
  if (item.activity_type === 'hosted_room') {
    return `Hosted a room · raised €${Number(item.charity_amount_eur).toFixed(2)} for ${item.charity_name}`
  }
  switch (item.transaction_type) {
    case 'join_payment': return `Joined a room · donated €${Number(item.amount_eur).toFixed(2)}`
    case 'prize_payout': return `Prize payout received · €${Number(item.amount_eur).toFixed(2)}`
    case 'extras':       return `Bought extras · €${Number(item.amount_eur).toFixed(2)}`
    default:             return `Transaction · €${Number(item.amount_eur ?? 0).toFixed(2)}`
  }
}

// ─── Hosted rooms table ───────────────────────────────────────────────────────

async function getHostedRooms(walletAddress, page = 1, limit = 20) {
  const offset = (page - 1) * limit
  const [rows] = await db.query(
    `SELECT
       room_id, charity_name, charity_wallet, chain, network,
       fee_token, total_raised_eur, charity_amount_eur,
       host_fee_amount_eur, number_of_players, created_at
     FROM fundraisely_impact_campaign_events
     WHERE host_wallet = ?
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [walletAddress, limit, offset]
  )

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM fundraisely_impact_campaign_events WHERE host_wallet = ?`,
    [walletAddress]
  )

  return { rows, total: Number(total), page, limit }
}

// ─── Transactions table ───────────────────────────────────────────────────────

async function getTransactions(walletAddress, page = 1, limit = 20) {
  const offset = (page - 1) * limit

  const [hostedRoomIds] = await db.query(
    `SELECT room_id FROM fundraisely_impact_campaign_events WHERE host_wallet = ?`,
    [walletAddress]
  )
  const roomIds = hostedRoomIds.map(r => r.room_id)

  let rows, total

  if (roomIds.length > 0) {
    const placeholders = roomIds.map(() => '?').join(',')
    ;[rows] = await db.query(
      `SELECT id, game_type, room_id, campaign_id, wallet_address,
         chain, network, tx_hash, transaction_type, direction, status,
         fee_token, amount, amount_eur, entry_fee_amount_eur,
         extras_amount_eur, donation_amount_eur, created_at, confirmed_at
       FROM fundraisely_web3_transactions
       WHERE wallet_address = ? OR room_id IN (${placeholders})
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [walletAddress, ...roomIds, limit, offset]
    )
    ;[[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM fundraisely_web3_transactions
       WHERE wallet_address = ? OR room_id IN (${placeholders})`,
      [walletAddress, ...roomIds]
    )
  } else {
    ;[rows] = await db.query(
      `SELECT id, game_type, room_id, campaign_id, wallet_address,
         chain, network, tx_hash, transaction_type, direction, status,
         fee_token, amount, amount_eur, entry_fee_amount_eur,
         extras_amount_eur, donation_amount_eur, created_at, confirmed_at
       FROM fundraisely_web3_transactions
       WHERE wallet_address = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [walletAddress, limit, offset]
    )
    ;[[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM fundraisely_web3_transactions WHERE wallet_address = ?`,
      [walletAddress]
    )
  }

  return { rows, total: Number(total), page, limit }
}

// ─── Main dashboard aggregator ────────────────────────────────────────────────

export async function getDashboardData(walletAddress) {
  const [
    hostedOverview,
    playerOverview,
    charts,
    recentActivity,
    hostedRooms,
    transactions,
  ] = await Promise.all([
    getHostedOverview(walletAddress),
    getPlayerOverview(walletAddress),
    getChartsData(walletAddress),
    getRecentActivity(walletAddress),
    getHostedRooms(walletAddress),
    getTransactions(walletAddress),
  ])

  // Headline: hosted charity + player donations
  const totalCharityImpactEur =
    hostedOverview.charity_amount_eur + playerOverview.total_donation_eur

  return {
    impactHeadline: {
      total_charity_impact_eur: totalCharityImpactEur,
      hosted_charity_eur: hostedOverview.charity_amount_eur,
      player_donation_eur: playerOverview.total_donation_eur,
    },
    hostedOverview,
    playerOverview,
    charts,
    recentActivity,
    hostedRooms,
    transactions,
  }
}