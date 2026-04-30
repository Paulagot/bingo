// server/pledges/services/pledgeService.js
// Business logic and DB queries for club league pledges
// Pattern mirrors quizTicketService.js

import { connection, TABLE_PREFIX } from '../../config/database.js';
import { nanoid } from 'nanoid';

const PLEDGES_TABLE = `${TABLE_PREFIX}quiz_club_league_pledges`;

const DEBUG = false;

const VALID_ROLES = [
  'Manager',
  'Coach',
  'Committee member',
  'Parent',
  'Volunteer',
  'Other',
];

/* -------------------------------------------------------------------------- */
/*                              CREATE PLEDGE                                 */
/* -------------------------------------------------------------------------- */

/**
 * Insert a new pledge row.
 * Throws if the email already exists for this campaign (duplicate).
 */
export async function createPledge({
  clubName,
  email,
  role,
  roleOther = null,
  campaign,
}) {
  // Validate role
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  if (role === 'Other' && (!roleOther || roleOther.length < 2)) {
    throw new Error('Please describe your role');
  }

  const pledgeId = nanoid(12);

  const sql = `
    INSERT INTO ${PLEDGES_TABLE}
      (pledge_id, club_name, email, role, role_other, campaign)
    VALUES
      (?, ?, ?, ?, ?, ?)
  `;

  try {
    await connection.execute(sql, [
      pledgeId,
      clubName,
      email,
      role,
      roleOther,
      campaign,
    ]);
  } catch (err) {
    // MySQL duplicate entry error code
    if (err.code === 'ER_DUP_ENTRY') {
      const dupErr = new Error('This email has already pledged for this campaign.');
      dupErr.code = '23505'; // normalise to Postgres-style so router handler works
      throw dupErr;
    }
    throw err;
  }

  if (DEBUG) {
    console.log('[PledgeService] ✅ Pledge created:', {
      pledgeId,
      clubName,
      email,
      campaign,
    });
  }

  return {
    pledgeId,
    clubName,
    email,
    role,
    roleOther,
    campaign,
  };
}

/* -------------------------------------------------------------------------- */
/*                              READ PLEDGES                                  */
/* -------------------------------------------------------------------------- */

/**
 * Count pledges for a campaign (used for public counter).
 */
export async function getPledgeCount(campaign) {
  const sql = `
    SELECT COUNT(*) AS total
    FROM ${PLEDGES_TABLE}
    WHERE campaign = ?
  `;

  const [rows] = await connection.execute(sql, [campaign]);
  return parseInt(rows?.[0]?.total ?? 0, 10);
}

/**
 * Get all pledges for a campaign.
 * clubId param is included so you can scope this per-club later if needed.
 */
export async function getPledgesByClub(campaign, clubId) {
  // If your pledges table has no club_id column yet, just filter by campaign.
  // Add AND club_id = ? once you add that column.
  const sql = `
    SELECT
      pledge_id,
      club_name,
      email,
      role,
      role_other,
      campaign,
      created_at
    FROM ${PLEDGES_TABLE}
    WHERE campaign = ?
    ORDER BY created_at DESC
  `;

  const [rows] = await connection.execute(sql, [campaign]);

  return rows.map((r) => ({
    pledgeId: r.pledge_id,
    clubName: r.club_name,
    email: r.email,
    role: r.role,
    roleOther: r.role_other,
    campaign: r.campaign,
    createdAt: r.created_at,
  }));
}