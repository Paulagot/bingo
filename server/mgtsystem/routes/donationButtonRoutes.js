// server/mgtsystem/routes/donationButtonRoutes.js
//
// Combined Tier A (manual link) + Tier B (trackable: Stripe/crypto)
// management routes for the donation button. GET /manage and the save
// (PUT) route both merge data from DonationButtonService (Tier A +
// allowed domains) and DonationCheckoutService (Tier B) into one
// response shape, per GetDonationButtonManageResponse /
// SaveDonationButtonResponse in donationButton.ts.
//
// All routes here are authenticated — club admin only. The PUBLIC
// embed-facing routes (config fetch, checkout, domain-check) live in
// donationCheckoutRoutes.js instead.

import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import DonationButtonService from '../services/DonationButtonService.js';
import DonationCheckoutService from '../../donations/services/DonationCheckoutService.js';

const router = express.Router();
const buttonSvc = new DonationButtonService();
const checkoutSvc = new DonationCheckoutService();

function mapErrorToStatus(message) {
  if (!message) return 500;
  if (message === 'Club not found') return 404;
  if (
    message === 'Button label is required' ||
    message === 'Button title must be 160 characters or fewer' ||
    message === 'Button label must be 80 characters or fewer' ||
    message === 'A payment method must be selected' ||
    message === 'At least one payment method must be selected' ||
    message === 'Selected payment method does not belong to this club' ||
    message === 'Selected payment method is disabled' ||
    message === 'Selected payment method is not eligible for the donation button' ||
    message === 'Selected payment method has no payment link' ||
    message === 'Selected payment method link is not a valid secure URL' ||
    message === 'None of the selected payment methods are currently valid' ||
    message === 'A maximum of 4 preset amounts is allowed' ||
    message === 'Preset amounts must all be positive numbers' ||
    message === 'Enable custom amounts or add at least one preset amount' ||
    message?.startsWith('Primary color') ||
    message?.startsWith('Background color') ||
    message?.startsWith('Text-on-primary color')
  ) {
    return 400;
  }
  if (
    message === 'Donation button not configured' ||
    message === 'Linked payment method no longer exists'
  ) {
    return 404;
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
 * Decides which tier a save request is for, based on
 * clubPaymentMethodIds[0]'s eligibility — and rejects a request that
 * mixes a Tier A-only id with Tier B ones, since a button can only
 * ever be one tier at a time (see DonationCheckoutService.js's header
 * comment).
 *
 * This is the ONE place Tier A and Tier B logic meet, per
 * DonationCheckoutService.js's original comment anticipating this
 * exact function.
 */
async function resolveTierAndAssertNotMixed({ clubId, clubPaymentMethodIds }) {
  const ids = Array.isArray(clubPaymentMethodIds) ? clubPaymentMethodIds : [];
  if (ids.length === 0) {
    throw new Error('A payment method must be selected');
  }

  const tierBFlags = await Promise.all(
    ids.map((id) => checkoutSvc.isTierBMethod({ clubId, clubPaymentMethodId: id }))
  );

  const allTierB = tierBFlags.every(Boolean);
  const noneTierB = tierBFlags.every((flag) => !flag);

  if (!allTierB && !noneTierB) {
    throw new Error('Cannot mix manual-link and trackable payment methods on one button');
  }

  if (allTierB) return 'tierB';

  if (ids.length > 1) {
    throw new Error('Only one manual-link payment method can be selected');
  }
  return 'tierA';
}

/**
 * GET /donation-buttons/:clubId/manage
 * Authenticated — club admin only. Merges Tier A management data
 * (button row, eligible manual methods, allowed domains) with Tier B
 * data (eligible trackable methods, amount config, which trackable
 * ids are currently linked).
 */
router.get('/donation-buttons/:clubId/manage', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const tierAData = await buttonSvc.getForManagement({ clubId });

    // Tier B's eligible methods list (admin picker options) — always
    // correct regardless of what's linked, since listEligibleTierBMethods
    // queries every payment method row for the club directly.
    const eligibleTrackableMethods = await checkoutSvc.listEligibleTierBMethods({ clubId });

    // linkedTrackableMethodIds — which of the above are CURRENTLY
    // attached to this button. getPublicConfig is the correct source
    // of truth here: it reads ALL linked rows via _getButtonMethods
    // (no row limit), unlike tierAData.donationButton.paymentMethods,
    // which comes from Tier A's _getLinkedMethodRow and is scoped to
    // a SINGLE row (LIMIT 1) — correct for Tier A (always exactly one
    // linked method) but WRONG for Tier B, where a button can have
    // several linked methods. Using the single-row Tier A shape here
    // silently dropped every Tier B method past the first one.
    //
    // getPublicConfig throws if the button is disabled, has no linked
    // methods, or every linked method is currently ineligible — none
    // of those definitively mean "this is a Tier A button," so on
    // failure fall back to cross-checking the eligible list against
    // nothing rather than guessing; a button in that state legitimately
    // has zero currently-offerable trackable methods to pre-check.
    let linkedTrackableMethodIds = [];
    const publicConfig = await checkoutSvc.getPublicConfig({ clubId }).catch(() => null);
    if (publicConfig) {
      linkedTrackableMethodIds = publicConfig.methods.map((m) => m.clubPaymentMethodId);
    }

    // amountConfig — same publicConfig call above already has this,
    // parsed and defaulted consistently with the public embed path.
    // Falls back to allowing custom amounts with no presets if
    // publicConfig couldn't be built (disabled button, no methods,
    // etc.) — matches Tier A's own "no amount tiers" default, since a
    // button in that state has nothing meaningful to show here either way.
    const amountConfig = publicConfig?.amountConfig ?? { allowCustomAmount: true, presetAmounts: [] };

    return res.json({
      ok: true,
      donationButton: tierAData.donationButton,
      amountConfig,
      branding: tierAData.branding,
      eligibleManualMethods: tierAData.eligiblePaymentMethods,
      eligibleTrackableMethods,
      linkedTrackableMethodIds,
      allowedDomains: tierAData.allowedDomains,
    });
  } catch (err) {
    console.error('[donation-buttons] GET manage error:', err);
    const status = mapErrorToStatus(err?.message);
    return res.status(status).json({ error: err?.message || 'Failed to load donation button' });
  }
});

/**
 * PUT /donation-buttons/:clubId
 * Authenticated — club admin only. Body matches
 * UpsertClubDonationButtonRequest. Resolves which tier the submitted
 * clubPaymentMethodIds belong to and delegates to the matching
 * service's upsert — both services' upsert already calls
 * getForManagement/getPublicConfig internally and returns full
 * management data, so this handler's job is purely routing +
 * response-shape normalization, not business logic itself.
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
      allowedDomains,
    } = req.body || {};

    const tier = await resolveTierAndAssertNotMixed({ clubId, clubPaymentMethodIds });

    if (tier === 'tierA') {
      const result = await buttonSvc.upsert({
        clubId,
        isEnabled,
        buttonLabel,
        buttonTitle,
        clubPaymentMethodId: clubPaymentMethodIds[0],
        branding,
        allowedDomains,
      });

      return res.json({
        ok: true,
        donationButton: result.donationButton,
        amountConfig: { allowCustomAmount: true, presetAmounts: [] },
        branding: result.branding,
        eligibleManualMethods: result.eligiblePaymentMethods,
        eligibleTrackableMethods: await checkoutSvc.listEligibleTierBMethods({ clubId }),
        linkedTrackableMethodIds: [],
        allowedDomains: result.allowedDomains,
        droppedMethodIds: [],
        droppedDomains: result.droppedDomains || [],
      });
    }

    // Tier B branch. Domain handling is shared across both tiers (the
    // widget shell + branding it gates is identical regardless of
    // tier), so call buttonSvc.replaceAllowedDomains directly here too
    // rather than threading allowedDomains through
    // upsertTierBButton — that method's job is the Tier B
    // payment-method/amount-config save only.
    const tierBResult = await checkoutSvc.upsertTierBButton({
      clubId,
      isEnabled,
      buttonLabel,
      buttonTitle,
      clubPaymentMethodIds,
      allowCustomAmount,
      presetAmounts,
      branding,
    });

    let droppedDomains = [];
    let resolvedAllowedDomains = await buttonSvc.listAllowedDomains({ clubId });
    if (allowedDomains !== undefined) {
      const domainResult = await buttonSvc.replaceAllowedDomains({ clubId, rawHostnames: allowedDomains });
      resolvedAllowedDomains = domainResult.domains;
      droppedDomains = domainResult.droppedDomains;
    }

    const tierAManageData = await buttonSvc.getForManagement({ clubId });

    return res.json({
      ok: true,
      donationButton: tierAManageData.donationButton,
      amountConfig: tierBResult.amountConfig,
      branding: tierBResult.branding,
      eligibleManualMethods: tierAManageData.eligiblePaymentMethods,
      eligibleTrackableMethods: tierBResult.eligibleTrackableMethods,
      linkedTrackableMethodIds: tierBResult.savedMethodIds,
      allowedDomains: resolvedAllowedDomains,
      droppedMethodIds: tierBResult.droppedMethodIds,
      droppedDomains,
    });
  } catch (err) {
    console.error('[donation-buttons] PUT error:', err);
    const status = mapErrorToStatus(err?.message);
    return res.status(status).json({ error: err?.message || 'Failed to save donation button' });
  }
});

/**
 * GET /donation-buttons/:clubId/embed
 * Authenticated — club admin only. Tier A only (manual-link buttons
 * generate a static <a> embed here); Tier B's embed is built entirely
 * client-side in ManageDonationButtonModal.tsx's
 * buildTrackableModalEmbed, since it needs no server data beyond what
 * GET /manage already returned.
 */
router.get('/donation-buttons/:clubId/embed', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await buttonSvc.getEmbed({ clubId });
    return res.json(result);
  } catch (err) {
    console.error('[donation-buttons] GET embed error:', err);
    const status = mapErrorToStatus(err?.message);
    return res.status(status).json({ error: err?.message || 'Failed to generate embed code' });
  }
});

export default router;