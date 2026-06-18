import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import DonationButtonService from '../services/DonationButtonService.js';
import DonationCheckoutService from '../../donations/services/DonationCheckoutService.js';

const router = express.Router();
const tierAService = new DonationButtonService();
const tierBService = new DonationCheckoutService();

function mapErrorToStatus(message) {
  if (!message) return 500;
  if (message === 'Club not found') return 404;
  if (message === 'Donation button not configured') return 404;
  if (message === 'Linked payment method no longer exists') return 404;
  if (
    message === 'Selected payment method does not belong to this club' ||
    message === 'Selected payment method is disabled' ||
    message === 'Selected payment method is not eligible for the donation button' ||
    message === 'Selected payment method is not eligible for trackable donations' ||
    message === 'Selected payment method has no payment link' ||
    message === 'Selected payment method link is not a valid secure URL' ||
    message === 'Button label is required' ||
    message === 'Button label must be 80 characters or fewer' ||
    message === 'Button title must be 160 characters or fewer' ||
    message === 'A payment method must be selected' ||
    message === 'A maximum of 4 preset amounts is allowed' ||
    message === 'Preset amounts must all be positive numbers' ||
    message === 'Enable custom amounts or add at least one preset amount'
  ) {
    return 400;
  }
  if (
    message === 'Donation button is disabled' ||
    message === 'Linked payment method is disabled' ||
    message === 'Linked payment method has no valid payment link'
  ) {
    return 409;
  }
  return 500;
}

/**
 * GET /donation-buttons/:clubId/manage
 *
 * Combines Tier A (manual link) and Tier B (Stripe/crypto) eligible
 * methods into one response for the admin modal — this is the one
 * place the two systems meet, per the design discussion: each tier's
 * service stays independent and untouched by the other, with this
 * route doing the merging rather than either service knowing about
 * the other's existence.
 *
 * donationButton itself still comes from Tier A's service
 * (getForManagement reads the single shared button row regardless of
 * which tier its method belongs to) — Tier B doesn't need its own
 * "get the button" method since the row and its core fields
 * (isEnabled/buttonLabel/buttonTitle/clubPaymentMethodId) are tier-
 * agnostic; only the amount-tier columns are Tier-B-specific, and
 * those are read directly here from the same row Tier A's query
 * already fetched.
 */
router.get('/donation-buttons/:clubId/manage', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tierAData = await tierAService.getForManagement({ clubId });
    const tierBMethods = await tierBService.listEligibleTierBMethods({ clubId });

    // Tier A's mapped donationButton doesn't include the amount-tier
    // columns (they don't exist in Tier A's world) — re-fetch the raw
    // row just for those two fields rather than duplicating Tier A's
    // whole row-fetch/mapping logic here.
    let amountConfig = { allowCustomAmount: true, presetAmounts: [] };
    if (tierAData.donationButton) {
      const publicConfig = await tierBService.getPublicConfig({ clubId }).catch(() => null);
      if (publicConfig) {
        amountConfig = publicConfig.amountConfig;
      }
    }

    res.json({
      ok: true,
      donationButton: tierAData.donationButton,
      amountConfig,
      eligibleManualMethods: tierAData.eligiblePaymentMethods,
      eligibleTrackableMethods: tierBMethods,
    });
  } catch (err) {
    console.error('[donation-buttons] GET manage error:', err);
    const status = mapErrorToStatus(err?.message);
    res.status(status).json({ error: err?.message || 'Failed to fetch donation button' });
  }
});

/**
 * PUT /donation-buttons/:clubId
 *
 * Body shape now varies by which method the admin selected:
 *   Tier A (manual link): { isEnabled, buttonLabel, buttonTitle, clubPaymentMethodId }
 *   Tier B (Stripe/crypto): same, plus { allowCustomAmount, presetAmounts }
 *
 * The route looks up which tier clubPaymentMethodId actually belongs
 * to and dispatches to the matching service's upsert — it does NOT
 * trust a client-sent "tier" flag, since that would let a request
 * claim Tier A while pointing at a Stripe method (or vice versa) and
 * skip the tier-appropriate validation.
 */
router.put('/donation-buttons/:clubId', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const {
      isEnabled,
      buttonLabel,
      buttonTitle,
      clubPaymentMethodId,
      allowCustomAmount,
      presetAmounts,
    } = req.body || {};

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({ error: 'isEnabled must be a boolean' });
    }
    if (clubPaymentMethodId === undefined || clubPaymentMethodId === null || clubPaymentMethodId === '') {
      return res.status(400).json({ error: 'clubPaymentMethodId is required' });
    }

    // Determine tier server-side from the actual DB row, not from
    // anything the client claims.
    const isTierB = await tierBService.isTierBMethod({ clubId, clubPaymentMethodId });

    if (isTierB) {
      const data = await tierBService.upsertTierBButton({
        clubId,
        isEnabled,
        buttonLabel,
        buttonTitle,
        clubPaymentMethodId,
        allowCustomAmount: !!allowCustomAmount,
        presetAmounts: Array.isArray(presetAmounts) ? presetAmounts : [],
      });
      // Re-fetch the combined shape (same as GET /manage) so the
      // frontend gets one consistent response shape regardless of
      // which tier was just saved.
      const tierAData = await tierAService.getForManagement({ clubId });
      const tierBMethods = await tierBService.listEligibleTierBMethods({ clubId });
      return res.json({
        ok: true,
        donationButton: tierAData.donationButton,
        amountConfig: data?.amountConfig ?? { allowCustomAmount: !!allowCustomAmount, presetAmounts: presetAmounts || [] },
        eligibleManualMethods: tierAData.eligiblePaymentMethods,
        eligibleTrackableMethods: tierBMethods,
      });
    }

    // Falls through to Tier A's own upsert — unchanged from Phase 1,
    // including its own validation (eligible provider list, https
    // link check, etc).
    const data = await tierAService.upsert({
      clubId,
      isEnabled,
      buttonLabel,
      buttonTitle,
      clubPaymentMethodId,
      userId: req.user_id,
    });
    const tierBMethods = await tierBService.listEligibleTierBMethods({ clubId });
    res.json({
      ok: true,
      donationButton: data.donationButton,
      amountConfig: { allowCustomAmount: true, presetAmounts: [] },
      eligibleManualMethods: data.eligiblePaymentMethods,
      eligibleTrackableMethods: tierBMethods,
    });
  } catch (err) {
    console.error('[donation-buttons] PUT error:', err);
    const status = mapErrorToStatus(err?.message);
    res.status(status).json({ error: err?.message || 'Failed to save donation button' });
  }
});

/**
 * GET /donation-buttons/:clubId/embed
 *
 * Tier A → unchanged, returns the <a> snippet via DonationButtonService.
 * Tier B → returns an <iframe> snippet pointing at the public embed
 * page instead. Decided the same way PUT decides — by looking up which
 * tier the button's actual clubPaymentMethodId belongs to, not by a
 * client-sent flag.
 */
router.get('/donation-buttons/:clubId/embed', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tierAData = await tierAService.getForManagement({ clubId });
    const button = tierAData.donationButton;
    if (!button) {
      return res.status(404).json({ error: 'Donation button not configured' });
    }

    const isTierB = await tierBService.isTierBMethod({
      clubId,
      clubPaymentMethodId: button.clubPaymentMethodId,
    });

    if (isTierB) {
      if (!button.isEnabled) {
        return res.status(409).json({ error: 'Donation button is disabled' });
      }
      // appOrigin here is OUR origin (wherever the dashboard itself is
      // running), used only to build the iframe src shown to the admin
      // to copy — NOT the validated checkout-time appOrigin, which is
      // resolved fresh by the embed page itself at donation time.
      const proto = req.headers['x-forwarded-proto'] || req.protocol;
      const dashboardOrigin = `${proto}://${req.get('host')}`;
      const embedSrc = `${dashboardOrigin}/embed/donate/${clubId}`;
      const safeLabel = String(button.buttonTitle || 'Donate').replace(/[<>"]/g, '');

      const embedHtml =
        `<iframe src="${embedSrc}" title="${safeLabel}" ` +
        `style="width:100%;max-width:380px;height:520px;border:none;border-radius:12px;" ` +
        `loading="lazy"></iframe>`;

      return res.json({ ok: true, embedHtml, donationButton: button });
    }

    const data = await tierAService.getEmbed({ clubId });
    res.json(data);
  } catch (err) {
    console.error('[donation-buttons] GET embed error:', err);
    const status = mapErrorToStatus(err?.message);
    res.status(status).json({ error: err?.message || 'Failed to generate embed' });
  }
});

export default router;