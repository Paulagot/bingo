// server/donations/services/DonationCheckoutService.js
//
// Handles Tier B (trackable) donation methods — stripe, crypto, and
// (later) sumup_api. Tier A's manual-link flow lives entirely inside
// DonationButtonService.js, with its own copy of the small
// read/replace-linked-methods queries against the same join table (see
// that file's _getLinkedMethodRow/_setLinkedMethod) — deliberately
// duplicated rather than shared, so the two tiers stay independent
// modules per the original design, even though they now both write
// into fundraisely_donation_button_methods. Since a club's one
// donation button is always EITHER Tier A (exactly one linked row) OR
// Tier B (one or more linked rows), never both at once — the two
// upsert paths fully replace the button's join rows on save, so
// there's no collision between them, just two different writers of the
// same table at different times for the same row.
//
// Eligibility here is intentionally separate from
// DonationButtonService._isEligibleRow, which only ever recognizes Tier A
// manual-link providers. Merging the two would mean every future Tier B
// addition (e.g. sumup_api) requires touching Phase 1's untouched,
// working code — instead Tier A and Tier B eligibility live side by side,
// each owning its own provider list, and the management endpoint
// (donationButtonRoutes.js) will need a small update to call both and
// merge the results for display. That update is the only place the two
// systems meet.
//
// PHASE 3b — MULTI-METHOD (this revision):
// A donation button can now link to MULTIPLE Tier B payment methods via
// fundraisely_donation_button_methods (club_donation_button_id,
// club_payment_method_id, display_order). The old single FK column on
// fundraisely_club_donation_buttons has been renamed to
// legacy_club_payment_method_id and is no longer read or written by
// anything in this file — see the Phase 3b migration. A donation button
// still has exactly one EVENTUAL method per donation (the supporter picks
// one at checkout) — what's plural now is which methods are *offered*,
// not which one is *used*.

import { connection, TABLE_PREFIX } from '../../config/database.js';
import Stripe from 'stripe';
import {
  createPendingDonation,
  attachExternalCheckoutId,
} from './DonationLedgerService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const METHODS_TABLE = `${TABLE_PREFIX}club_payment_methods`;
const CLUBS_TABLE = `${TABLE_PREFIX}clubs`;
const BUTTONS_TABLE = `${TABLE_PREFIX}club_donation_buttons`;
const BUTTON_METHODS_TABLE = `${TABLE_PREFIX}donation_button_methods`;

/**
 * Recognized FundRaisely frontend origins — the real, already-maintained
 * list from stripeUtils.js (which getStripeConnectStatus/startStripeConnect
 * already use for the same purpose). Duplicated here as a small const array
 * rather than importing getBaseUrl directly, because getBaseUrl's fallback
 * behavior (deriving an origin from req.headers.host when the candidate
 * isn't recognized) solves a different problem than this route has.
 *
 * getBaseUrl exists for routes hit directly by an admin's own browser —
 * there, falling back to req.headers.host is reasonable, since that *is*
 * the frontend's real host. This donation checkout route is different: the
 * only caller that will ever exist is FundRaisely's own embed/event page,
 * making a fetch() to this API from inside an <iframe> the club pasted on
 * their (otherwise irrelevant) site. In that case req.headers.host is the
 * API server's own hostname, not the frontend domain — so falling back to
 * it would silently produce a wrong redirect target instead of catching a
 * real bug in our own embed page's JS. Since there's no legitimate caller
 * other than our own frontend, an unrecognized appOrigin here always means
 * something is wrong with that frontend code, and should fail loudly
 * rather than guess.
 *
 * If this list and stripeUtils.js's ever drift apart, that's a bug —
 * consider exporting ALLOWED_APP_ORIGINS from stripeUtils.js instead of
 * keeping it private there, so both places import the same array.
 */
const ALLOWED_APP_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://fundraisely.ie',
  'https://www.fundraisely.ie',
  'https://fundraisely.co.uk',
  'https://www.fundraisely.co.uk',
  'https://fundraisely-staging.up.railway.app',
  'http://fundraisely-staging.up.railway.app',
];

/**
 * Providers eligible to power a *trackable* donation flow. 'sumup_api'
 * is deliberately listed here even though dispatchCheckout has no case
 * for it yet — see dispatchCheckout's default branch. Keeping it in the
 * eligibility list now (rather than adding it only once built) means
 * the admin UI can already show "SumUp (API) — coming soon" instead of
 * the option not existing at all, per the "design knowing other
 * payment methods exist" requirement.
 */
const TIER_B_RULES = [
  { methodCategory: 'stripe', providerName: null }, // provider_name is 'stripe' but category alone is sufficient/authoritative here
  { methodCategory: 'crypto', providerName: 'solana_wallet' },
  { methodCategory: 'instant_payment', providerName: 'sumup_api' },
];

function isTierBEligibleRow(row) {
  return TIER_B_RULES.some(
    (rule) =>
      rule.methodCategory === row.method_category &&
      (rule.providerName === null || rule.providerName === row.provider_name)
  );
}

/**
 * Validates a #rrggbb hex color string. Deliberately format-only — no
 * contrast/readability check, per product decision (a club's brand
 * colors are their own choice; FundRaisely doesn't second-guess taste,
 * only rejects values that wouldn't render as a color at all).
 */
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function isValidHexColor(value) {
  return typeof value === 'string' && HEX_COLOR_PATTERN.test(value.trim());
}

function validateBranding(branding) {
  const primaryColor = branding?.primaryColor;
  const backgroundColor = branding?.backgroundColor;
  const textOnPrimaryColor = branding?.textOnPrimaryColor;

  if (!isValidHexColor(primaryColor)) {
    throw new Error('Primary color must be a valid hex color (e.g. #157f85)');
  }
  if (!isValidHexColor(backgroundColor)) {
    throw new Error('Background color must be a valid hex color (e.g. #ffffff)');
  }
  if (!isValidHexColor(textOnPrimaryColor)) {
    throw new Error('Text-on-primary color must be a valid hex color (e.g. #ffffff)');
  }

  return {
    primaryColor: primaryColor.trim().toLowerCase(),
    backgroundColor: backgroundColor.trim().toLowerCase(),
    textOnPrimaryColor: textOnPrimaryColor.trim().toLowerCase(),
  };
}

class DonationCheckoutService {
  async _getClub(clubId) {
    const [rows] = await connection.execute(
      `SELECT id, reporting_currency FROM ${CLUBS_TABLE} WHERE id = ? LIMIT 1`,
      [clubId]
    );
    if (!rows.length) throw new Error('Club not found');
    return rows[0];
  }

  async _getDonationButton(clubId) {
    const [rows] = await connection.execute(
      `SELECT * FROM ${BUTTONS_TABLE} WHERE club_id = ? LIMIT 1`,
      [clubId]
    );
    return rows[0] || null;
  }

  async _getPaymentMethod({ clubId, methodId }) {
    const [rows] = await connection.execute(
      `SELECT * FROM ${METHODS_TABLE} WHERE club_id = ? AND id = ? LIMIT 1`,
      [clubId, methodId]
    );
    return rows[0] || null;
  }

  /**
   * All payment-method rows currently linked to a button, joined to
   * fundraisely_club_payment_methods, ordered by display_order. Returns
   * the full payment_methods row shape (not yet filtered to
   * enabled/eligible) — callers decide what filtering they need, since
   * getPublicConfig (drop ineligible silently) and the admin "manage"
   * view (show ineligible too, so the admin can see what's stale) want
   * different things from the same join.
   */
  async _getButtonMethods(buttonId) {
    const [rows] = await connection.execute(
      `SELECT pm.*, dbm.display_order AS link_display_order
       FROM ${BUTTON_METHODS_TABLE} dbm
       JOIN ${METHODS_TABLE} pm ON pm.id = dbm.club_payment_method_id
       WHERE dbm.club_donation_button_id = ?
       ORDER BY dbm.display_order ASC, pm.id ASC`,
      [buttonId]
    );
    return rows || [];
  }

  /**
   * Public wrapper for the route layer's "which tier does this method
   * belong to" check (donationButtonRoutes.js's combined PUT/embed
   * handlers). Avoids reaching into the underscore-prefixed
   * _getPaymentMethod from outside the class — that prefix exists to
   * signal "internal," and the route layer genuinely needs this one
   * specific piece of information (is this clubPaymentMethodId Tier B
   * eligible), not the rest of DonationCheckoutService's internals.
   */
  async isTierBMethod({ clubId, clubPaymentMethodId }) {
    const row = await this._getPaymentMethod({ clubId, methodId: Number(clubPaymentMethodId) });
    return !!row && isTierBEligibleRow(row);
  }

  /**
   * Is clubPaymentMethodId actually one of the methods linked to this
   * button? Distinct from isTierBMethod (which only asks "is this id
   * Tier B eligible at all", with no notion of which button it's
   * attached to). Used by startCheckout — a supporter picking a method
   * must be picking one the admin actually attached to THIS button,
   * not just any Tier B method that happens to exist for the club.
   */
  async isMethodLinkedToButton({ buttonId, clubPaymentMethodId }) {
    const [rows] = await connection.execute(
      `SELECT 1 FROM ${BUTTON_METHODS_TABLE}
       WHERE club_donation_button_id = ? AND club_payment_method_id = ?
       LIMIT 1`,
      [buttonId, Number(clubPaymentMethodId)]
    );
    return rows.length > 0;
  }

  /**
   * List Tier B eligible methods for a club (used by the admin
   * management UI's payment-method picker — section 3.1's "payment
   * method picker now offers any enabled, eligible method"). This IS a
   * real list, because the admin is choosing which methods to attach
   * to the button — distinct from getPublicConfig below, which
   * resolves the methods a button is already wired to (and filters out
   * anything no longer eligible/enabled).
   */
  async listEligibleTierBMethods({ clubId }) {
    const [rows] = await connection.execute(
      `SELECT id, method_category, provider_name, method_label, is_enabled
       FROM ${METHODS_TABLE}
       WHERE club_id = ?
       ORDER BY display_order ASC, method_label ASC`,
      [clubId]
    );

    return (rows || [])
      .filter((row) => isTierBEligibleRow(row) && row.is_enabled === 1)
      .map((row) => ({
        clubPaymentMethodId: String(row.id),
        methodCategory: row.method_category,
        providerName: row.provider_name,
        methodLabel: row.method_label,
        isEnabled: row.is_enabled === 1,
      }));
  }

  /**
   * What the public embed page fetches on load (spec section 8,
   * feeds PublicDonationButtonConfig). Resolves the button's linked
   * payment methods — PHASE 3b: now a LIST, not a single method. The
   * supporter chooses one of these at click time (DonateEmbedPage's new
   * provider-choice step) if there's more than one; if there's exactly
   * one, the embed should skip the choice step and behave as before.
   *
   * Each linked method is checked independently for eligibility — a
   * button with one disabled method and one enabled method returns only
   * the enabled one, rather than throwing for the whole button. The
   * button itself only throws if NO methods survive that filter (i.e.
   * the supporter would otherwise see an empty picker with nothing to
   * select), which mirrors the old single-method behavior's "payment
   * method no longer eligible" throw for the case where there really is
   * nothing left to offer.
   *
   * Returns enough for the embed to render the amount picker and know
   * which provider(s) to offer, but deliberately nothing about
   * method_config internals (Stripe account id, wallet config) — those
   * stay server-side and are only used when checkout actually starts.
   *
   * Throws 'Donation button not configured' / 'is disabled' /
   * 'This donation button has no available payment methods' rather than
   * silently returning something the embed can't act on, so the embed
   * page can show a clear "this donation button isn't currently active"
   * state instead of a confusing blank picker.
   */
  async getPublicConfig({ clubId }) {
    const club = await this._getClub(clubId);
    const button = await this._getDonationButton(clubId);

    if (!button) {
      throw new Error('Donation button not configured');
    }
    if (button.is_enabled !== 1) {
      throw new Error('Donation button is disabled');
    }

    const linkedMethods = await this._getButtonMethods(button.id);

    const eligibleMethods = linkedMethods.filter(
      (row) => row.is_enabled === 1 && isTierBEligibleRow(row)
    );

    if (eligibleMethods.length === 0) {
      // Covers: every linked method deleted, disabled since the button
      // was configured, or (shouldn't happen, but defensively) a Tier A
      // manual-link method somehow ending up linked to a button the
      // admin UI intended to be Tier B.
      throw new Error('This donation button has no available payment methods');
    }

    const presets = button.preset_amounts_json
      ? (typeof button.preset_amounts_json === 'string'
          ? JSON.parse(button.preset_amounts_json)
          : button.preset_amounts_json)
      : [];

    return {
      clubId,
      buttonLabel: button.button_label,
      buttonTitle: button.button_title || null,
      currency: club.reporting_currency,
      amountConfig: {
        allowCustomAmount: button.allow_custom_amount === 1,
        presetAmounts: presets,
      },
      // Phase 3c — branding: read directly off the button row's three
      // new columns (primary_color/background_color/text_on_primary_color),
      // all NOT NULL with sensible defaults from the migration, so no
      // null-handling is needed here unlike preset_amounts_json above.
      branding: {
        primaryColor: button.primary_color,
        backgroundColor: button.background_color,
        textOnPrimaryColor: button.text_on_primary_color,
      },
      methods: eligibleMethods.map((row) => ({
        clubPaymentMethodId: String(row.id),
        methodCategory: row.method_category,
        providerName: row.provider_name,
      })),
    };
  }

  /**
   * Admin save path for a Tier B-configured button (PUT
   * /donation-buttons/:clubId, called when the admin selected one or
   * more Stripe/crypto methods rather than a manual-link one). Writes
   * the SAME fundraisely_club_donation_buttons row Phase 1 uses — one
   * button per club, one row, regardless of which tier its method(s)
   * belong to — plus the join rows in fundraisely_donation_button_methods.
   *
   * PHASE 3b: clubPaymentMethodIds is now an array. Each id is validated
   * independently (belongs to club, enabled, Tier-B-eligible). Per
   * product decision: invalid ids are DROPPED rather than failing the
   * whole save — the admin gets back which ids were actually saved and
   * which were skipped, via the `droppedMethodIds` field on the
   * returned object, rather than having a single bad id (e.g. a method
   * disabled in another tab moments ago) block saving the rest.
   *
   * Throws only for things that make the WHOLE button invalid
   * regardless of which methods survive (bad label, bad presets, or
   * literally zero valid methods submitted) — per-method problems are
   * reported via droppedMethodIds, not exceptions.
   */
  async upsertTierBButton({
    clubId,
    isEnabled,
    buttonLabel,
    buttonTitle,
    clubPaymentMethodIds,
    allowCustomAmount,
    presetAmounts,
    branding,
  }) {
    const trimmedLabel = String(buttonLabel || '').trim();
    if (!trimmedLabel) {
      throw new Error('Button label is required');
    }
    if (trimmedLabel.length > 80) {
      throw new Error('Button label must be 80 characters or fewer');
    }
    const trimmedTitle = buttonTitle != null ? String(buttonTitle).trim() : null;
    if (trimmedTitle && trimmedTitle.length > 160) {
      throw new Error('Button title must be 160 characters or fewer');
    }

    const validatedBranding = validateBranding(branding);

    const idsArray = Array.isArray(clubPaymentMethodIds) ? clubPaymentMethodIds : [];
    if (idsArray.length === 0) {
      throw new Error('At least one payment method must be selected');
    }

    // Validate each id independently. Valid ones survive into
    // validMethodRows (in submitted order, deduped); invalid ones are
    // collected into droppedMethodIds with a reason, for the response —
    // not thrown.
    const seen = new Set();
    const validMethodRows = [];
    const droppedMethodIds = [];

    for (const rawId of idsArray) {
      const methodIdNum = Number(rawId);
      if (!Number.isFinite(methodIdNum) || seen.has(methodIdNum)) {
        continue; // silently dedupe; not a reportable "drop" worth surfacing
      }
      seen.add(methodIdNum);

      const paymentMethod = await this._getPaymentMethod({ clubId, methodId: methodIdNum });

      if (!paymentMethod) {
        droppedMethodIds.push({ clubPaymentMethodId: String(rawId), reason: 'not_found' });
        continue;
      }
      if (paymentMethod.is_enabled !== 1) {
        droppedMethodIds.push({ clubPaymentMethodId: String(rawId), reason: 'disabled' });
        continue;
      }
      if (!isTierBEligibleRow(paymentMethod)) {
        droppedMethodIds.push({ clubPaymentMethodId: String(rawId), reason: 'not_eligible' });
        continue;
      }

      validMethodRows.push(paymentMethod);
    }

    if (validMethodRows.length === 0) {
      throw new Error('None of the selected payment methods are currently valid');
    }

    const presets = Array.isArray(presetAmounts) ? presetAmounts.map(Number) : [];
    if (presets.length > 4) {
      throw new Error('A maximum of 4 preset amounts is allowed');
    }
    if (presets.some((p) => !Number.isFinite(p) || p <= 0)) {
      throw new Error('Preset amounts must all be positive numbers');
    }
    if (!allowCustomAmount && presets.length === 0) {
      throw new Error('Enable custom amounts or add at least one preset amount');
    }

    const [existingRows] = await connection.execute(
      `SELECT id FROM ${BUTTONS_TABLE} WHERE club_id = ? LIMIT 1`,
      [clubId]
    );

    let buttonId;

    if (existingRows?.length) {
      buttonId = existingRows[0].id;
      await connection.execute(
        `UPDATE ${BUTTONS_TABLE}
         SET is_enabled = ?,
             button_label = ?,
             button_title = ?,
             allow_custom_amount = ?,
             preset_amounts_json = ?,
             primary_color = ?,
             background_color = ?,
             text_on_primary_color = ?,
             updated_at = UTC_TIMESTAMP()
         WHERE club_id = ?`,
        [
          isEnabled ? 1 : 0,
          trimmedLabel,
          trimmedTitle,
          allowCustomAmount ? 1 : 0,
          JSON.stringify(presets),
          validatedBranding.primaryColor,
          validatedBranding.backgroundColor,
          validatedBranding.textOnPrimaryColor,
          clubId,
        ]
      );
    } else {
      const [insertResult] = await connection.execute(
        `INSERT INTO ${BUTTONS_TABLE}
           (club_id, is_enabled, button_label, button_title,
            allow_custom_amount, preset_amounts_json,
            primary_color, background_color, text_on_primary_color)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          clubId,
          isEnabled ? 1 : 0,
          trimmedLabel,
          trimmedTitle,
          allowCustomAmount ? 1 : 0,
          JSON.stringify(presets),
          validatedBranding.primaryColor,
          validatedBranding.backgroundColor,
          validatedBranding.textOnPrimaryColor,
        ]
      );
      buttonId = insertResult.insertId;
    }

    // Replace the full set of linked methods. Delete-then-reinsert
    // rather than diffing — this button's method list is small (max a
    // handful of payment methods per club) and always submitted in
    // full from the modal, so there's no partial-update case to
    // optimize for, and delete+reinsert can't leave stale display_order
    // values behind from a previous save.
    await connection.execute(
      `DELETE FROM ${BUTTON_METHODS_TABLE} WHERE club_donation_button_id = ?`,
      [buttonId]
    );

    for (let i = 0; i < validMethodRows.length; i++) {
      await connection.execute(
        `INSERT INTO ${BUTTON_METHODS_TABLE}
           (club_donation_button_id, club_payment_method_id, display_order)
         VALUES (?, ?, ?)`,
        [buttonId, validMethodRows[i].id, i]
      );
    }

    const publicConfig = await this.getPublicConfig({ clubId }).catch(() => null);
    // Swallow errors here deliberately — e.g. if is_enabled was just set
    // to false, getPublicConfig will throw 'Donation button is disabled',
    // but that's not a failure of the SAVE itself. The route's combined
    // handler re-fetches full management data afterward regardless; this
    // return value is only used for an optional quick-confirm, not as
    // the source of truth for what the admin UI displays next.

    return {
      amountConfig: publicConfig?.amountConfig ?? { allowCustomAmount: !!allowCustomAmount, presetAmounts: presets },
      branding: publicConfig?.branding ?? validatedBranding,
      savedMethodIds: validMethodRows.map((r) => String(r.id)),
      droppedMethodIds,
    };
  }

  /**
   * Validate the requested amount against the button's configured
   * amount tiers (spec section 7). Allows any positive amount up to a
   * sane ceiling when allow_custom_amount is true; otherwise requires
   * an exact match to one of the preset tiers, since a button that
   * disabled custom amounts shouldn't quietly accept arbitrary ones.
   */
  _validateAmount({ amount, button }) {
    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) {
      throw new Error('Donation amount must be a positive number');
    }
    // Sanity ceiling per spec section 7 — avoid fat-finger five-figure
    // donations slipping through to a real checkout session.
    const MAX_DONATION = 10000;
    if (numAmount > MAX_DONATION) {
      throw new Error(`Donation amount exceeds the maximum of ${MAX_DONATION}`);
    }

    const allowCustom = button.allow_custom_amount === 1;
    const presets = button.preset_amounts_json
      ? (typeof button.preset_amounts_json === 'string'
          ? JSON.parse(button.preset_amounts_json)
          : button.preset_amounts_json)
      : [];

    if (!allowCustom && presets.length > 0) {
      const matchesPreset = presets.some((p) => Number(p) === numAmount);
      if (!matchesPreset) {
        throw new Error('This donation button only accepts preset amounts');
      }
    }

    return numAmount;
  }

  /**
   * Validates a client-claimed appOrigin against ALLOWED_APP_ORIGINS.
   * Throws rather than silently falling back to a default — a request
   * with an unrecognized origin should fail loudly, not redirect
   * somewhere the caller didn't ask for and didn't expect.
   */
  _validateAppOrigin(appOrigin) {
    const normalized = String(appOrigin || '').trim().replace(/\/+$/, '');
    if (!ALLOWED_APP_ORIGINS.includes(normalized)) {
      throw new Error('appOrigin is missing or not a recognized FundRaisely domain');
    }
    return normalized;
  }

  /**
   * Validates an OPTIONAL client-supplied return path override for
   * Stripe's success_url/cancel_url base. Falls back to
   * defaultBasePath (the existing hardcoded /embed/donate/:clubId
   * shape) when returnPath is absent — so any caller that doesn't
   * pass this param gets identical behavior to before this method
   * existed.
   *
   * Deliberately strict: only a same-origin relative path is accepted
   * (single leading slash, no "//" anywhere, no "://" anywhere). This
   * keeps the redirect confined to validatedOrigin — already checked
   * against ALLOWED_APP_ORIGINS — so a caller can pick which page on
   * our own domain Stripe returns to, but never point Stripe at a
   * different host through this param.
   */
  _validateReturnPath(returnPath, defaultBasePath) {
    if (returnPath === undefined || returnPath === null || returnPath === '') {
      return defaultBasePath;
    }

    const trimmed = String(returnPath).trim();

    const isSingleLeadingSlash = trimmed.startsWith('/') && !trimmed.startsWith('//');
    const hasNoProtocol = !trimmed.includes('://');

    if (!isSingleLeadingSlash || !hasNoProtocol) {
      throw new Error('returnPath must be a relative same-origin path');
    }

    // Strip any trailing slash so `${basePath}/success` doesn't end up
    // with a double slash.
    return trimmed.replace(/\/+$/, '');
  }

  /**
   * Entry point for POST /api/donations/:clubId/checkout.
   * Validates eligibility + amount, creates the pending ledger row,
   * then dispatches to the provider-specific handler.
   *
   * PHASE 3b: clubPaymentMethodId must be one of the methods LINKED to
   * this button (checked via isMethodLinkedToButton), not just any
   * Tier-B-eligible method that happens to exist for the club. After
   * confirming the link, the method is re-validated for eligibility
   * (enabled + isTierBEligibleRow) at checkout time regardless of
   * anything the UI already filtered — a method can be disabled by the
   * club admin in the time between the embed page loading config and
   * the supporter actually clicking donate, and that race should fail
   * the checkout call cleanly rather than create a pending donation
   * against a method that's no longer usable.
   *
   * appOrigin is required from the frontend — it identifies which of
   * FundRaisely's own domains (.ie / .co.uk) the embed or event page is
   * currently being served from, NOT the club's own website domain.
   * Validated against ALLOWED_APP_ORIGINS before use — see
   * _validateAppOrigin and the comment on _startStripeCheckout.
   *
   * Returns a StartDonationCheckoutResponse shape (see
   * donationCheckout.ts) on success. Throws on any failure — including
   * "provider not yet supported" — so the route's error mapping is the
   * single place that turns errors into HTTP statuses, same convention
   * as DonationButtonService/donationButtonRoutes.
   */
async startCheckout({ clubId, clubPaymentMethodId, amount, donorName, donorEmail, appOrigin, returnPath }) {
    const club = await this._getClub(clubId);
    const button = await this._getDonationButton(clubId);
    if (!button || button.is_enabled !== 1) {
      throw new Error('Donation button is not enabled');
    }

    const methodIdNum = Number(clubPaymentMethodId);

    const isLinked = await this.isMethodLinkedToButton({
      buttonId: button.id,
      clubPaymentMethodId: methodIdNum,
    });
    if (!isLinked) {
      throw new Error('Selected payment method is not available on this donation button');
    }

    const paymentMethod = await this._getPaymentMethod({ clubId, methodId: methodIdNum });
    if (!paymentMethod) {
      throw new Error('Selected payment method does not belong to this club');
    }
    if (paymentMethod.is_enabled !== 1) {
      throw new Error('Selected payment method is disabled');
    }
    if (!isTierBEligibleRow(paymentMethod)) {
      throw new Error('Selected payment method is not eligible for trackable donations');
    }

    const validatedAmount = this._validateAmount({ amount, button });
    const currency = club.reporting_currency;

    const donationId = await createPendingDonation({
      clubId,
      clubDonationButtonId: button.id,
      clubPaymentMethodId: methodIdNum,
      paymentMethodCategorySnapshot: paymentMethod.method_category,
      paymentProviderSnapshot: paymentMethod.provider_name,
      paymentMethodLabelSnapshot: paymentMethod.method_label,
      amount: validatedAmount,
      currency,
      donorName: donorName || null,
      donorEmail: donorEmail || null,
    });
return this._dispatchToProvider({
      paymentMethod,
      donationId,
      amount: validatedAmount,
      currency,
      clubId,
      appOrigin,
      returnPath,
    });
  }

 async _dispatchToProvider({ paymentMethod, donationId, amount, currency, clubId, appOrigin, returnPath }) {
    switch (paymentMethod.method_category) {
      case 'stripe':
        return this._startStripeCheckout({ paymentMethod, donationId, amount, currency, clubId, appOrigin, returnPath });

      case 'crypto':
        // Crypto has no redirect concept, so appOrigin is irrelevant —
        // deliberately not passed through.
        return this._startCryptoCheckout({ paymentMethod, donationId });

      default:
        // Covers instant_payment + sumup_api (Tier B-listed, not yet built)
        // and any other category that somehow passed isTierBEligibleRow.
        // Thrown, not returned, per the no-ok:false-shape convention —
        // see donationCheckout.ts note above StartDonationCheckoutResponse.
        throw new Error('This payment method is not yet supported for donations');
    }
  }

  /**
   * Mirrors the existing createWalkinStripeSession pattern (same
   * "create session on connected account, return url, redirect"
   * shape) but scoped to a club-level donation row instead of a quiz
   * room/player. metadata.type = 'club_donation' is new — distinct
   * from 'walkin_payment' etc. so stripeWebhookHandler.js can route it
   * to confirmDonation() instead of confirmWalkinLedger().
   *
   * appOrigin handling — revised after clarifying the actual setup:
   * FundRaisely itself is served from two domains (.ie and .co.uk).
   * The donation embed is an <iframe> a club pastes onto THEIR OWN site
   * (which can be anywhere, untrusted) — but the iframe's contents are
   * always FundRaisely's own page, loaded from one of the two known
   * FundRaisely domains. Stripe's redirect happens within that iframe,
   * navigating between FundRaisely pages — the club's own site domain
   * never enters into it. Same story for the upcoming FundRaisely-hosted
   * event pages.
   *
   * So appOrigin IS accepted from the frontend (same as
   * /stripe/walkin-checkout already does) — but unlike that route, it's
   * validated against a fixed allowlist of FundRaisely's own domains
   * before use, rather than trusted outright. This keeps the
   * flexibility you need (.ie vs .co.uk) without reopening the
   * open-redirect risk: a request claiming an origin outside the
   * allowlist is rejected, so nobody can point a real Stripe session at
   * an arbitrary URL through this public endpoint.
   */
async _startStripeCheckout({ paymentMethod, donationId, amount, currency, clubId, appOrigin, returnPath }) {
    const cfg = typeof paymentMethod.method_config === 'string'
      ? JSON.parse(paymentMethod.method_config)
      : paymentMethod.method_config;

    const accountId = cfg?.connect?.accountId;
    if (!accountId || !cfg?.connect?.chargesEnabled) {
      throw new Error('Stripe is not ready to accept payments for this club');
    }

const validatedOrigin = this._validateAppOrigin(appOrigin);

    // returnPath is OPTIONAL. When absent, behavior is byte-for-byte
    // identical to before this change — the iframe/modal flow
    // (DonateEmbedPage.tsx) never sends it, so it keeps landing on
    // /embed/donate/:clubId/success exactly as today.
    //
    // When present, it lets a different FundRaisely page (e.g. a
    // standalone same-tab donation page) ask Stripe to come back to
    // ITS OWN route instead. Validated as a same-origin RELATIVE path
    // only — must start with exactly one leading slash, no protocol,
    // no "//" (which browsers/URLs can treat as protocol-relative to
    // another host), and no "://" anywhere in it. This is deliberately
    // narrow: returnPath can only ever redirect within the already-
    // validated validatedOrigin, never to an arbitrary external host,
    // so this introduces no new open-redirect surface beyond what
    // _validateAppOrigin already gates.
    const basePath = this._validateReturnPath(returnPath, `/embed/donate/${clubId}`);

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: currency.toLowerCase(),
              product_data: { name: 'Donation' },
              unit_amount: Math.round(amount * 100),
            },
            quantity: 1,
          },
        ],
        success_url: `${validatedOrigin}${basePath}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${validatedOrigin}${basePath}?cancelled=1`,
        metadata: {
          type: 'club_donation',
          donationId: String(donationId),
          clubId,
        },
      },
      { stripeAccount: accountId }
    );

    await attachExternalCheckoutId({ donationId, externalCheckoutId: session.id });

    return {
      ok: true,
      provider: 'stripe',
      donationId: String(donationId),
      redirectUrl: session.url,
    };
  }

  /**
   * Crypto has no redirect/session concept — the in-page flow gets the
   * recipient wallet address now, then separately calls a quote
   * endpoint and finally a confirm endpoint (mirroring
   * quizCryptoDonationRouter.js's /confirm shape), scoped to this
   * donationId instead of a roomId/playerId pair.
   */
  async _startCryptoCheckout({ paymentMethod, donationId }) {
    const cfg = typeof paymentMethod.method_config === 'string'
      ? JSON.parse(paymentMethod.method_config)
      : paymentMethod.method_config;

    const walletAddress = cfg?.walletAddress;
    if (!walletAddress) {
      throw new Error('Crypto payment method has no configured wallet address');
    }

    return {
      ok: true,
      provider: 'crypto',
      donationId: String(donationId),
      walletAddress,
    };
  }
}

export default DonationCheckoutService;
export { isTierBEligibleRow };