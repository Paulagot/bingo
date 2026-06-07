// server/stripe/stripeController.js
import { stripe } from './stripeClient.js';
import { getBaseUrl } from './stripeUtils.js';
import { getStripeMethodForClub, upsertStripeMethodForClub } from './stripeService.js';
import { connection, TABLE_PREFIX } from '../config/database.js';

const DEBUG = false;

/**
 * Start Stripe Connect onboarding.
 *
 * - If no active (non-disconnected) row exists, creates a new Stripe account
 *   and inserts a fresh row.
 * - If an active row exists with an accountId, reuses it so the club can
 *   continue incomplete onboarding without creating duplicate accounts.
 * - Disconnected rows are invisible to getStripeMethodForClub so a previously
 *   disconnected club always gets a brand new account and row here.
 */
export const startStripeConnect = async (req, res) => {
  try {
    const clubId = req.user?.club_id;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const addedBy = req.user?.name || req.user?.email || null;

    // 1) Find active (non-disconnected) stripe row
    const row = await getStripeMethodForClub(clubId);

    let accountId = null;
    if (row?.method_config) {
      const cfg = typeof row.method_config === 'string'
        ? JSON.parse(row.method_config)
        : row.method_config;

      // Only reuse accountId if this row has never been disconnected.
      // getStripeMethodForClub already filters out disconnected rows, so
      // disconnectedAt should never be set here — but we guard anyway.
      const wasDisconnected = !!cfg?.connect?.disconnectedAt;
      accountId = wasDisconnected ? null : (cfg?.connect?.accountId || null);
    }

    // 2) Create a new Stripe account if we don't have a live one
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'standard' });
      accountId = account.id;

      await upsertStripeMethodForClub({
        clubId,
        accountId,
        connectStatus: {
          detailsSubmitted: false,
          chargesEnabled:   false,
          payoutsEnabled:   false,
        },
        addedBy,
      });

      if (DEBUG) console.log('[Stripe] ✅ Created connected account:', { clubId, accountId });
    }

    // 3) Create onboarding link
    const baseUrl = getBaseUrl(req);
    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${baseUrl}/quiz/eventdashboard?stripe=refresh`,
      return_url:  `${baseUrl}/quiz/eventdashboard?stripe=return`,
      type:        'account_onboarding',
    });

    return res.json({ ok: true, url: accountLink.url });
  } catch (err) {
    console.error('[Stripe] ❌ startStripeConnect failed:', err);
    return res.status(500).json({ ok: false, error: 'stripe_connect_start_failed' });
  }
};

/**
 * Fetch the latest account status from Stripe and sync it to the DB row.
 * Updates chargesEnabled, payoutsEnabled, detailsSubmitted — and therefore
 * is_enabled — based on what Stripe currently reports.
 */
export const getStripeConnectStatus = async (req, res) => {
  try {
    const clubId = req.user?.club_id;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const addedBy = req.user?.name || req.user?.email || null;

    const row = await getStripeMethodForClub(clubId);
    if (!row) return res.status(404).json({ ok: false, error: 'stripe_not_initialized' });

    const cfg = typeof row.method_config === 'string'
      ? JSON.parse(row.method_config)
      : row.method_config;

    const accountId = cfg?.connect?.accountId;
    if (!accountId) return res.status(400).json({ ok: false, error: 'stripe_account_id_missing' });

    const account = await stripe.accounts.retrieve(accountId);

    const status = {
      detailsSubmitted: !!account.details_submitted,
      chargesEnabled:   !!account.charges_enabled,
      payoutsEnabled:   !!account.payouts_enabled,
    };

    await upsertStripeMethodForClub({ clubId, accountId, connectStatus: status, addedBy });

    return res.json({ ok: true, accountId, ...status });
  } catch (err) {
    console.error('[Stripe] ❌ getStripeConnectStatus failed:', err);
    return res.status(500).json({ ok: false, error: 'stripe_connect_status_failed' });
  }
};

/**
 * Disconnect the club's Stripe account.
 *
 * Does NOT delete the row. Instead it:
 *   1. Best-effort deauthorizes the account with Stripe (OAuth only — fails
 *      silently for Standard accounts created via API).
 *   2. Sets is_enabled: false on the row.
 *   3. Stamps connect.disconnectedAt and connect.disconnectedBy into
 *      method_config so there is an audit trail.
 *
 * The row and its accountId are preserved so any historical ledger or report
 * rows that reference club_payment_method_id continue to resolve correctly.
 *
 * After disconnect, getStripeMethodForClub returns null for this club, so all
 * active payment flows (ticket checkout, walk-in, etc.) immediately stop
 * offering Stripe as an option. The club can then call /connect/start to link
 * a new account — a fresh row will be inserted alongside the archived one.
 */
export const disconnectStripeConnect = async (req, res) => {
  try {
    const clubId = req.user?.club_id;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const row = await getStripeMethodForClub(clubId);
    if (!row) return res.status(404).json({ ok: false, error: 'stripe_not_found' });

    const cfg = typeof row.method_config === 'string'
      ? JSON.parse(row.method_config)
      : row.method_config;

    const accountId = cfg?.connect?.accountId;

    // 1) Best-effort Stripe deauthorize (only works for OAuth-connected accounts)
    if (accountId) {
      try {
        await stripe.oauth.deauthorize({
          client_id:      process.env.STRIPE_CLIENT_ID,
          stripe_user_id: accountId,
        });
        if (DEBUG) console.log('[Stripe] ✅ OAuth deauthorized:', accountId);
      } catch (oauthErr) {
        // Standard accounts created via stripe.accounts.create (not OAuth) will
        // throw here — that is expected and safe to ignore.
        console.warn('[Stripe] ⚠️ OAuth deauthorize skipped (likely API-created account):', oauthErr.message);
      }
    }

    // 2) Stamp disconnectedAt onto method_config — preserves accountId for
    //    historical joins but makes the row invisible to getStripeMethodForClub
    const updatedConfig = {
      ...cfg,
      connect: {
        ...cfg.connect,
        disconnectedAt: new Date().toISOString(),
        disconnectedBy: req.user?.name || req.user?.email || null,
      },
    };

    // 3) Disable the row and save the updated config
    await connection.execute(
      `UPDATE ${TABLE_PREFIX}club_payment_methods
       SET is_enabled    = FALSE,
           method_config = ?,
           updated_at    = UTC_TIMESTAMP()
       WHERE id = ? AND club_id = ?`,
      [JSON.stringify(updatedConfig), row.id, clubId]
    );

    console.log('[Stripe] ✅ Disconnected (row preserved for history):', {
      clubId,
      accountId,
      rowId: row.id,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error('[Stripe] ❌ disconnectStripeConnect failed:', err);
    return res.status(500).json({ ok: false, error: 'stripe_disconnect_failed' });
  }
};