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
    message === 'At least one payment method must be selected' ||
    message === 'None of the selected payment methods are currently valid' ||
    message === 'A maximum of 4 preset amounts is allowed' ||
    message === 'Preset amounts must all be positive numbers' ||
    message === 'Enable custom amounts or add at least one preset amount' ||
    message === 'clubPaymentMethodIds cannot mix manual-link and trackable payment methods' ||
    message === 'Primary color must be a valid hex color (e.g. #157f85)' ||
    message === 'Background color must be a valid hex color (e.g. #ffffff)' ||
    message === 'Text-on-primary color must be a valid hex color (e.g. #ffffff)'
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
 * Given the club's full list of submitted method ids, determine which
 * tier each one belongs to and assert they're not mixed. Returns
 * { isTierB: boolean } — false means Tier A (or the list is empty,
 * which the caller validates separately). Throws a single clear error
 * if the submitted ids span both tiers, per the Phase 3b handoff doc
 * section 3.3 ("reject mixed Tier A + Tier B ids in one button —
 * manual links have no checkout flow to choose between, so that
 * combination doesn't make sense").
 *
 * This is intentionally the ONE place that resolves tier-per-id and
 * checks for mixing — both the modal's own mutual-exclusivity UI logic
 * AND this backend check exist (defense in depth: the UI shouldn't be
 * able to construct a mixed payload, but a stale client, a direct API
 * call, or a race should still be rejected here rather than silently
 * accepted).
 */
async function resolveTierAndAssertNotMixed({ clubId, clubPaymentMethodIds }) {
  const tierFlags = await Promise.all(
    clubPaymentMethodIds.map((id) => tierBService.isTierBMethod({ clubId, clubPaymentMethodId: id }))
  );

  const hasTierB = tierFlags.some(Boolean);
  const hasTierA = tierFlags.some((flag) => !flag);

  if (hasTierB && hasTierA) {
    throw new Error('clubPaymentMethodIds cannot mix manual-link and trackable payment methods');
  }

  return { isTierB: hasTierB };
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
 * (getForManagement reads the shared button row regardless of which
 * tier its method(s) belong to) — Tier B doesn't need its own "get the
 * button" method since the row and its core fields
 * (isEnabled/buttonLabel/buttonTitle) are tier-agnostic; only the
 * amount-tier columns are Tier-B-specific, and those are read directly
 * here from the same row Tier A's query already fetched.
 *
 * PHASE 3b: linkedTrackableMethodIds is new — the subset of
 * eligibleTrackableMethods currently attached to this button, so the
 * modal can pre-check the right boxes in its multi-select without
 * having to guess from donationButton.clubPaymentMethodIds (which,
 * for a Tier A button, would contain a manual-link id that has nothing
 * to do with the Tier B checkbox list).
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
    let linkedTrackableMethodIds = [];

    if (tierAData.donationButton) {
      const publicConfig = await tierBService.getPublicConfig({ clubId }).catch(() => null);
      if (publicConfig) {
        amountConfig = publicConfig.amountConfig;
        linkedTrackableMethodIds = publicConfig.methods.map((m) => m.clubPaymentMethodId);
      } else {
        // getPublicConfig throws if the button is disabled, has no
        // methods, or every linked method is currently ineligible —
        // none of those mean "definitely Tier A," so fall back to
        // checking the button's own linked ids directly rather than
        // assuming an empty list. This covers the case of a Tier B
        // button that's temporarily disabled, where the modal should
        // still see which trackable methods are checked even though
        // the public embed would currently show nothing.
        const linkedIds = tierAData.donationButton.clubPaymentMethodIds || [];
        const eligibleIdSet = new Set(tierBMethods.map((m) => m.clubPaymentMethodId));
        linkedTrackableMethodIds = linkedIds.filter((id) => eligibleIdSet.has(id));
      }
    }

    res.json({
      ok: true,
      donationButton: tierAData.donationButton,
      amountConfig,
      // Branding is tier-agnostic and always lives on the same button
      // row Tier A's query already fetched — unlike amountConfig
      // above, no Tier-B-specific re-fetch/fallback dance is needed
      // here; tierAData.branding is already correct for a Tier B
      // button too, since DonationButtonService.getForManagement reads
      // the three color columns directly off the row regardless of
      // which tier currently owns it.
      branding: tierAData.branding,
      eligibleManualMethods: tierAData.eligiblePaymentMethods,
      eligibleTrackableMethods: tierBMethods,
      linkedTrackableMethodIds,
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
 * Body shape now varies by which method(s) the admin selected:
 *   Tier A (manual link): { isEnabled, buttonLabel, buttonTitle, clubPaymentMethodIds: [oneId] }
 *   Tier B (Stripe/crypto): same, but clubPaymentMethodIds can have
 *     more than one entry, plus { allowCustomAmount, presetAmounts }
 *
 * PHASE 3b: clubPaymentMethodIds is now an array (was
 * clubPaymentMethodId, singular) on this endpoint. The route resolves
 * which tier the SUBMITTED ids actually belong to from the real DB
 * rows — it does NOT trust a client-sent "tier" flag — and rejects the
 * request outright if the array mixes ids from both tiers (see
 * resolveTierAndAssertNotMixed above). Tier A additionally requires
 * exactly one id, since manual-link buttons have no checkout step for
 * a supporter to choose between several at.
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
      clubPaymentMethodIds,
      allowCustomAmount,
      presetAmounts,
      branding,
    } = req.body || {};

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({ error: 'isEnabled must be a boolean' });
    }

    // branding is required on every save (Phase 3c), regardless of
    // tier — both services independently validate hex format on their
    // own fields, but a missing branding object entirely is checked
    // here once, so both branches below can assume it's at least an
    // object before passing it through.
    if (!branding || typeof branding !== 'object') {
      return res.status(400).json({ error: 'branding is required' });
    }

    const idsArray = Array.isArray(clubPaymentMethodIds)
      ? clubPaymentMethodIds.filter((id) => id !== undefined && id !== null && id !== '')
      : [];

    if (idsArray.length === 0) {
      return res.status(400).json({ error: 'clubPaymentMethodIds must contain at least one payment method id' });
    }

    // Determine tier server-side from the actual DB rows, not from
    // anything the client claims. Throws if the submitted ids mix
    // Tier A and Tier B.
    const { isTierB } = await resolveTierAndAssertNotMixed({ clubId, clubPaymentMethodIds: idsArray });

    if (isTierB) {
      const data = await tierBService.upsertTierBButton({
        clubId,
        isEnabled,
        buttonLabel,
        buttonTitle,
        clubPaymentMethodIds: idsArray,
        allowCustomAmount: !!allowCustomAmount,
        presetAmounts: Array.isArray(presetAmounts) ? presetAmounts : [],
        branding,
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
        branding: data?.branding ?? tierAData.branding,
        eligibleManualMethods: tierAData.eligiblePaymentMethods,
        eligibleTrackableMethods: tierBMethods,
        linkedTrackableMethodIds: data?.savedMethodIds ?? [],
        droppedMethodIds: data?.droppedMethodIds ?? [],
      });
    }

    // Tier A: manual-link buttons take exactly one method — there's no
    // checkout step for a supporter to pick between several, so more
    // than one id here is a client bug, not something to silently
    // truncate.
    if (idsArray.length > 1) {
      return res.status(400).json({
        error: 'A manual-link donation button can only have one payment method',
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
      clubPaymentMethodId: idsArray[0],
      userId: req.user_id,
      branding,
    });
    const tierBMethods = await tierBService.listEligibleTierBMethods({ clubId });
    res.json({
      ok: true,
      donationButton: data.donationButton,
      amountConfig: { allowCustomAmount: true, presetAmounts: [] },
      branding: data.branding,
      eligibleManualMethods: data.eligiblePaymentMethods,
      eligibleTrackableMethods: tierBMethods,
      linkedTrackableMethodIds: [],
      droppedMethodIds: [],
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
 * tier the button's actual linked method(s) belong to, not by a
 * client-sent flag.
 *
 * PHASE 3b: button.clubPaymentMethodIds is now an array — uses index 0
 * for the tier check, since a button is always either entirely Tier A
 * (exactly one id) or entirely Tier B (one or more ids); checking the
 * first id is sufficient to determine which.
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

    const firstMethodId = button.clubPaymentMethodIds?.[0];
    if (!firstMethodId) {
      return res.status(404).json({ error: 'Linked payment method no longer exists' });
    }

    const isTierB = await tierBService.isTierBMethod({
      clubId,
      clubPaymentMethodId: firstMethodId,
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