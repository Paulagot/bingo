//server/stripe/stripeController.js
import { stripe } from './stripeClient.js';
import { getBaseUrl } from './stripeUtils.js';
import { getStripeMethodForClub, upsertStripeMethodForClub } from './stripeService.js';

const DEBUG = false;

export const startStripeConnect = async (req, res) => {
  try {
    const clubId = req.user?.club_id;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const addedBy = req.user?.name || req.user?.email || null;

    // 1) Find existing stripe method + accountId
    const row = await getStripeMethodForClub(clubId);

    let accountId = null;
    if (row?.method_config) {
      const cfg = typeof row.method_config === 'string' ? JSON.parse(row.method_config) : row.method_config;
      accountId = cfg?.connect?.accountId || null;
    }

    // 2) Create accountId if missing
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'standard' });
      accountId = account.id;

      await upsertStripeMethodForClub({
        clubId,
        accountId,
        connectStatus: { detailsSubmitted: false, chargesEnabled: false, payoutsEnabled: false },
        addedBy,
      });

      if (DEBUG) console.log('[Stripe] ✅ Created connected account:', { clubId, accountId });
    }

    // 3) Create onboarding link
    const baseUrl = getBaseUrl(req);
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/quiz/eventdashboard?stripe=refresh`,
  return_url:  `${baseUrl}/quiz/eventdashboard?stripe=return`,
      type: 'account_onboarding',
    });

    return res.json({ ok: true, url: accountLink.url });
  } catch (err) {
    console.error('[Stripe] ❌ startStripeConnect failed:', err);
    return res.status(500).json({ ok: false, error: 'stripe_connect_start_failed' });
  }
};

export const getStripeConnectStatus = async (req, res) => {
  try {
    const clubId = req.user?.club_id;
    if (!clubId) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const addedBy = req.user?.name || req.user?.email || null;

    const row = await getStripeMethodForClub(clubId);
    if (!row) return res.status(404).json({ ok: false, error: 'stripe_not_initialized' });

    const cfg = typeof row.method_config === 'string' ? JSON.parse(row.method_config) : row.method_config;
    const accountId = cfg?.connect?.accountId;
    if (!accountId) return res.status(400).json({ ok: false, error: 'stripe_account_id_missing' });

    const account = await stripe.accounts.retrieve(accountId);

    const status = {
      detailsSubmitted: !!account.details_submitted,
      chargesEnabled: !!account.charges_enabled,
      payoutsEnabled: !!account.payouts_enabled,
    };

    await upsertStripeMethodForClub({ clubId, accountId, connectStatus: status, addedBy });

    return res.json({ ok: true, accountId, ...status });
  } catch (err) {
    console.error('[Stripe] ❌ getStripeConnectStatus failed:', err);
    return res.status(500).json({ ok: false, error: 'stripe_connect_status_failed' });
  }
};