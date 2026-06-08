// server/stripe/stripeController.js
import { stripe } from './stripeClient.js';
import { getBaseUrl } from './stripeUtils.js';
import {
  getStripeMethodForClub,
  getMostRecentStripeRowForClub,
  upsertStripeMethodForClub,
} from './stripeService.js';
import { connection, TABLE_PREFIX } from '../config/database.js';

const DEBUG = false;

const METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;

/**
 * Start Stripe Connect onboarding.
 * Reuses existing accountId if an active (non-disconnected) row exists.
 * Creates a brand new account if no active row is found.
 */
export const startStripeConnect = async (req, res) => {
  try {
    const clubId  = req.user?.club_id;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const addedBy = req.user?.name || req.user?.email || null;

    const row = await getStripeMethodForClub(clubId);

    let accountId = null;
    if (row?.method_config) {
      const cfg = typeof row.method_config === 'string'
        ? JSON.parse(row.method_config)
        : row.method_config;
      const wasDisconnected = !!cfg?.connect?.disconnectedAt;
      accountId = wasDisconnected ? null : (cfg?.connect?.accountId || null);
    }

    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'standard' });
      accountId = account.id;
      await upsertStripeMethodForClub({
        clubId, accountId,
        connectStatus: { detailsSubmitted: false, chargesEnabled: false, payoutsEnabled: false },
        addedBy,
      });
      if (DEBUG) console.log('[Stripe] ✅ Created connected account:', { clubId, accountId });
    }

    const baseUrl   = getBaseUrl(req);
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
 * Fetch latest status from Stripe and sync to DB row.
 * Sets is_enabled based on all three flags.
 */
export const getStripeConnectStatus = async (req, res) => {
  try {
    const clubId  = req.user?.club_id;
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
 * Does NOT delete the row — stamps disconnectedAt into method_config and sets
 * is_enabled = FALSE. The row stays for historical ledger joins.
 *
 * After this getStripeMethodForClub returns null so all payment flows stop
 * offering Stripe immediately.
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

    // Best-effort deauthorize — only works for OAuth accounts, safe to ignore for API-created ones
    if (accountId) {
      try {
        await stripe.oauth.deauthorize({
          client_id:      process.env.STRIPE_CLIENT_ID,
          stripe_user_id: accountId,
        });
        if (DEBUG) console.log('[Stripe] ✅ OAuth deauthorized:', accountId);
      } catch (oauthErr) {
        console.warn('[Stripe] ⚠️ OAuth deauthorize skipped (API-created account):', oauthErr.message);
      }
    }

    const updatedConfig = {
      ...cfg,
      connect: {
        ...cfg.connect,
        disconnectedAt: new Date().toISOString(),
        disconnectedBy: req.user?.name || req.user?.email || null,
      },
    };

    await connection.execute(
      `UPDATE ${METHODS_TABLE}
       SET is_enabled    = FALSE,
           method_config = ?,
           updated_at    = UTC_TIMESTAMP()
       WHERE id = ? AND club_id = ?`,
      [JSON.stringify(updatedConfig), row.id, clubId]
    );

    console.log('[Stripe] ✅ Disconnected (row preserved):', { clubId, accountId, rowId: row.id });
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Stripe] ❌ disconnectStripeConnect failed:', err);
    return res.status(500).json({ ok: false, error: 'stripe_disconnect_failed' });
  }
};

/**
 * Reconnect the most recently disconnected Stripe account.
 *
 * Clears disconnectedAt on the existing row (reactivates it) and returns a
 * fresh Stripe onboarding link. The row id is preserved so all historical
 * ledger joins remain intact.
 *
 * After the admin completes onboarding, GET /connect/status will update
 * is_enabled to true once all three flags pass.
 */
export const reconnectStripeConnect = async (req, res) => {
  try {
    const clubId = req.user?.club_id;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const row = await getMostRecentStripeRowForClub(clubId);
    if (!row) return res.status(404).json({ ok: false, error: 'stripe_not_found' });

    const cfg = typeof row.method_config === 'string'
      ? JSON.parse(row.method_config)
      : row.method_config;

    const accountId = cfg?.connect?.accountId;
    if (!accountId) return res.status(400).json({ ok: false, error: 'stripe_account_id_missing' });

    // Fetch current status from Stripe — account may still be fully ready
    let stripeAccount;
    try {
      stripeAccount = await stripe.accounts.retrieve(accountId);
    } catch (stripeErr) {
      return res.status(400).json({ ok: false, error: 'stripe_account_not_found_on_stripe' });
    }

    const chargesEnabled   = !!stripeAccount.charges_enabled;
    const payoutsEnabled   = !!stripeAccount.payouts_enabled;
    const detailsSubmitted = !!stripeAccount.details_submitted;
    const isReady = chargesEnabled && payoutsEnabled && detailsSubmitted;

    // Clear disconnectedAt and restore the row — no onboarding needed if still ready
    const updatedConfig = {
      ...cfg,
      connect: {
        ...cfg.connect,
        chargesEnabled,
        payoutsEnabled,
        detailsSubmitted,
        disconnectedAt: null,
        disconnectedBy: null,
        reconnectedAt:  new Date().toISOString(),
        reconnectedBy:  req.user?.name || req.user?.email || null,
        updatedAt:      new Date().toISOString(),
      },
    };

    await connection.execute(
      `UPDATE ${METHODS_TABLE}
       SET is_enabled    = ?,
           method_config = ?,
           updated_at    = UTC_TIMESTAMP()
       WHERE id = ? AND club_id = ?`,
      [isReady, JSON.stringify(updatedConfig), row.id, clubId]
    );

    console.log('[Stripe] ✅ Reconnected:', { clubId, accountId, isReady });

    // If still ready — just tell the frontend, no redirect needed
    // If somehow not ready — send them through onboarding
    if (isReady) {
      return res.json({ ok: true, ready: true, accountId, chargesEnabled, payoutsEnabled, detailsSubmitted });
    }

    const baseUrl     = getBaseUrl(req);
    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${baseUrl}/quiz/eventdashboard?stripe=refresh`,
      return_url:  `${baseUrl}/quiz/eventdashboard?stripe=return`,
      type:        'account_onboarding',
    });

    return res.json({ ok: true, ready: false, url: accountLink.url });
  } catch (err) {
    console.error('[Stripe] ❌ reconnectStripeConnect failed:', err);
    return res.status(500).json({ ok: false, error: 'stripe_reconnect_failed' });
  }
};

/**
 * Return the most recent Stripe row for UI display — including disconnected ones.
 * Used to show the "previously connected" history panel after a disconnect.
 */
export const getStripeHistory = async (req, res) => {
  try {
    const clubId = req.user?.club_id;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const row = await getMostRecentStripeRowForClub(clubId);
    if (!row) return res.json({ ok: true, hasHistory: false, accountId: null, disconnectedAt: null, disconnectedBy: null });

    const cfg = typeof row.method_config === 'string'
      ? JSON.parse(row.method_config)
      : row.method_config;

    return res.json({
      ok:             true,
      hasHistory:     true,
      accountId:      cfg?.connect?.accountId      || null,
      disconnectedAt: cfg?.connect?.disconnectedAt || null,
      disconnectedBy: cfg?.connect?.disconnectedBy || null,
    });
  } catch (err) {
    console.error('[Stripe] ❌ getStripeHistory failed:', err);
    return res.status(500).json({ ok: false, error: 'stripe_history_failed' });
  }
};