// server/quiz/api/impact-campaign-leaderboard.js
import express from 'express';
import { connection, TABLE_PREFIX } from '../../config/database.js';

const router = express.Router();

/**
 * Calculate points based on total_raised and fee_token
 * - Normal tokens: total_raised * 2
 * - USDGLO: total_raised * 2.5
 */
function calculatePoints(totalRaised, feeToken) {
  const multiplier = feeToken === 'USDGLO' ? 2.5 : 2.0;
  return totalRaised * multiplier;
}

/**
 * Get date range for filtering
 */
function getDateRange(period) {
  const ranges = {
    feb2026: {
      start: '2026-02-01 00:00:00',
      end: '2026-02-28 23:59:59',
    },
    mar2026: {
      start: '2026-03-01 00:00:00',
      end: '2026-03-31 23:59:59',
    },
    apr2026: {
      start: '2026-04-01 00:00:00',
      end: '2026-04-30 23:59:59',
    },
    all: null, // No filtering
  };

  return ranges[period] || null;
}

/**
 * GET /api/impact-campaign/leaderboard/hosts
 * Returns leaderboard grouped by host_wallet with points
 */
router.get('/hosts', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const dateRange = getDateRange(period);

    console.log('[Leaderboard] 📊 Fetching host leaderboard:', { period, dateRange });

    const table = `${TABLE_PREFIX}impact_campaign_events`;

    // Build WHERE clause for date filtering
    let whereClause = '';
    let params = [];

    if (dateRange) {
      whereClause = 'WHERE created_at >= ? AND created_at <= ?';
      params = [dateRange.start, dateRange.end];
    }

    // Query to get all events with date filtering
    const query = `
      SELECT 
        host_wallet,
        host_name,
        fee_token,
        total_raised,
        created_at
      FROM ${table}
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const [rows] = await connection.execute(query, params);

    // Group by host_wallet and calculate points
    const walletMap = new Map();

    for (const row of rows) {
      const wallet = row.host_wallet;
      
      if (!wallet) continue; // Skip if no wallet

      const points = calculatePoints(
        parseFloat(row.total_raised || 0),
        row.fee_token
      );

      if (!walletMap.has(wallet)) {
        walletMap.set(wallet, {
          hostWallet: wallet,
          hostName: row.host_name, // Most recent (since ordered by created_at DESC)
          points: 0,
          events: 0,
        });
      }

      const entry = walletMap.get(wallet);
      entry.points += points;
      entry.events += 1;
    }

    // Convert to array and sort by points
    const leaderboard = Array.from(walletMap.values())
      .sort((a, b) => b.points - a.points)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
        points: parseFloat(entry.points.toFixed(2)), // Round to 2 decimals
      }));

    console.log('[Leaderboard] ✅ Host leaderboard generated:', {
      period,
      totalHosts: leaderboard.length,
      topHost: leaderboard[0]?.hostName || 'none',
      topPoints: leaderboard[0]?.points || 0,
    });

    res.json({
      period,
      leaderboard,
      totalHosts: leaderboard.length,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Leaderboard] ❌ Error fetching host leaderboard:', error);
    res.status(500).json({
      error: 'Failed to fetch leaderboard',
      message: error.message,
    });
  }
});

/**
 * GET /api/impact-campaign/leaderboard/networks
 * Returns leaderboard grouped by network with points
 */
router.get('/networks', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const dateRange = getDateRange(period);

    console.log('[Leaderboard] 📊 Fetching network leaderboard:', { period, dateRange });

    const table = `${TABLE_PREFIX}impact_campaign_events`;

    // Build WHERE clause for date filtering
    let whereClause = '';
    let params = [];

    if (dateRange) {
      whereClause = 'WHERE created_at >= ? AND created_at <= ?';
      params = [dateRange.start, dateRange.end];
    }

    // Query to get all events with date filtering
    const query = `
      SELECT 
        network,
        chain,
        fee_token,
        total_raised
      FROM ${table}
      ${whereClause}
    `;

    const [rows] = await connection.execute(query, params);

    // Group by network and calculate points
    const networkMap = new Map();

    for (const row of rows) {
      const network = row.network;
      
      if (!network) continue; // Skip if no network

      const points = calculatePoints(
        parseFloat(row.total_raised || 0),
        row.fee_token
      );

      if (!networkMap.has(network)) {
        networkMap.set(network, {
          network,
          chain: row.chain,
          points: 0,
          events: 0,
        });
      }

      const entry = networkMap.get(network);
      entry.points += points;
      entry.events += 1;
    }

    // Convert to array and sort by points
    const leaderboard = Array.from(networkMap.values())
      .sort((a, b) => b.points - a.points)
      .map((entry, index) => ({
        rank: index + 1,
        ...entry,
        points: parseFloat(entry.points.toFixed(2)), // Round to 2 decimals
      }));

    console.log('[Leaderboard] ✅ Network leaderboard generated:', {
      period,
      totalNetworks: leaderboard.length,
      topNetwork: leaderboard[0]?.network || 'none',
      topPoints: leaderboard[0]?.points || 0,
    });

    res.json({
      period,
      leaderboard,
      totalNetworks: leaderboard.length,
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Leaderboard] ❌ Error fetching network leaderboard:', error);
    res.status(500).json({
      error: 'Failed to fetch leaderboard',
      message: error.message,
    });
  }
});

/**
 * GET /api/impact-campaign/leaderboard/stats
 * Returns overall statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const { period = 'all' } = req.query;
    const dateRange = getDateRange(period);

    console.log('[Leaderboard] 📊 Fetching stats:', { period, dateRange });

    const table = `${TABLE_PREFIX}impact_campaign_events`;

    let whereClause = '';
    let params = [];

    if (dateRange) {
      whereClause = 'WHERE created_at >= ? AND created_at <= ?';
      params = [dateRange.start, dateRange.end];
    }

    const query = `
      SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT host_wallet) as unique_hosts,
        COUNT(DISTINCT network) as unique_networks,
        SUM(total_raised) as total_raised,
        SUM(charity_amount) as total_charity,
        SUM(number_of_players) as total_players
      FROM ${table}
      ${whereClause}
    `;

    const [rows] = await connection.execute(query, params);
    const stats = rows[0];

    res.json({
      period,
      stats: {
        totalEvents: parseInt(stats.total_events || 0),
        uniqueHosts: parseInt(stats.unique_hosts || 0),
        uniqueNetworks: parseInt(stats.unique_networks || 0),
        totalRaised: parseFloat(stats.total_raised || 0).toFixed(4),
        totalCharity: parseFloat(stats.total_charity || 0).toFixed(4),
        totalPlayers: parseInt(stats.total_players || 0),
      },
      generatedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[Leaderboard] ❌ Error fetching stats:', error);
    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error.message,
    });
  }
});

export default router;