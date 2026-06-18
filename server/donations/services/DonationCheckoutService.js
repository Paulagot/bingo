// server/donations/services/DonationCheckoutService.js
//
// Handles Tier B (trackable) donation methods — stripe, crypto, and
// (later) sumup_api. Phase 1's manual-link Tier A flow is untouched —
// that stays entirely inside DonationButtonService.js.
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
   * List Tier B eligible methods for a club (used by the admin
   * management UI's payment-method picker dropdown — section 3.1's
   * "payment method picker now offers any enabled, eligible method").
   * This IS a real list, because the admin is choosing which ONE
   * method to assign to the button — distinct from getPublicConfig
   * below, which resolves the single method a button is already
   * wired to.
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
   * feeds PublicDonationButtonConfig). Resolves the button's single
   * configured payment method — there is exactly one per button, not
   * a list the supporter chooses from at click time (see discussion:
   * the admin already chose the provider when setting up the button).
   *
   * Returns enough for the embed to render the amount picker and know
   * which provider to dispatch to, but deliberately nothing about
   * method_config internals (Stripe account id, wallet config) — those
   * stay server-side and are only used when checkout actually starts.
   *
   * Throws 'Donation button not configured' / 'is disabled' /
   * 'payment method no longer eligible' rather than silently returning
   * something the embed can't act on, so the embed page can show a
   * clear "this donation button isn't currently active" state instead
   * of a confusing blank picker.
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

    const paymentMethod = await this._getPaymentMethod({
      clubId,
      methodId: button.club_payment_method_id,
    });

    if (!paymentMethod || paymentMethod.is_enabled !== 1 || !isTierBEligibleRow(paymentMethod)) {
      // Covers: method deleted, method disabled since the button was
      // configured, or (shouldn't happen, but defensively) a Tier A
      // manual-link method somehow ending up referenced by a button
      // that the admin UI intended to be Tier B.
      throw new Error('This donation button\'s payment method is no longer available');
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
      method: {
        clubPaymentMethodId: String(paymentMethod.id),
        methodCategory: paymentMethod.method_category,
        providerName: paymentMethod.provider_name,
      },
    };
  }

  /**
   * Admin save path for a Tier B-configured button (PUT
   * /donation-buttons/:clubId, called when the admin selected a
   * Stripe/crypto method rather than a manual-link one). Writes the
   * SAME fundraisely_club_donation_buttons row Phase 1 uses — one
   * button per club, one row, regardless of which tier its method
   * belongs to — but also sets allow_custom_amount/preset_amounts_json,
   * which Tier A's own upsert (DonationButtonService.upsert) never
   * touches. donationButtonRoutes.js decides which of the two upsert
   * methods to call based on which tier the selected
   * clubPaymentMethodId resolves to — see the route's combined PUT
   * handler.
   */
  async upsertTierBButton({
    clubId,
    isEnabled,
    buttonLabel,
    buttonTitle,
    clubPaymentMethodId,
    allowCustomAmount,
    presetAmounts,
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

    const methodIdNum = Number(clubPaymentMethodId);
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

    if (existingRows?.length) {
      await connection.execute(
        `UPDATE ${BUTTONS_TABLE}
         SET is_enabled = ?,
             button_label = ?,
             button_title = ?,
             club_payment_method_id = ?,
             allow_custom_amount = ?,
             preset_amounts_json = ?,
             updated_at = UTC_TIMESTAMP()
         WHERE club_id = ?`,
        [
          isEnabled ? 1 : 0,
          trimmedLabel,
          trimmedTitle,
          methodIdNum,
          allowCustomAmount ? 1 : 0,
          JSON.stringify(presets),
          clubId,
        ]
      );
    } else {
      await connection.execute(
        `INSERT INTO ${BUTTONS_TABLE}
           (club_id, is_enabled, button_label, button_title, club_payment_method_id,
            allow_custom_amount, preset_amounts_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          clubId,
          isEnabled ? 1 : 0,
          trimmedLabel,
          trimmedTitle,
          methodIdNum,
          allowCustomAmount ? 1 : 0,
          JSON.stringify(presets),
        ]
      );
    }

    return this.getPublicConfig({ clubId }).catch(() => null);
    // Swallow errors here deliberately — e.g. if is_enabled was just set
    // to false, getPublicConfig will throw 'Donation button is disabled',
    // but that's not a failure of the SAVE itself. The route's combined
    // handler re-fetches full management data afterward regardless; this
    // return value is only used for an optional quick-confirm, not as
    // the source of truth for what the admin UI displays next.
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
   * Entry point for POST /api/donations/:clubId/checkout.
   * Validates eligibility + amount, creates the pending ledger row,
   * then dispatches to the provider-specific handler.
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
  async startCheckout({ clubId, clubPaymentMethodId, amount, donorName, donorEmail, appOrigin }) {
    const club = await this._getClub(clubId);
    const button = await this._getDonationButton(clubId);
    if (!button || button.is_enabled !== 1) {
      throw new Error('Donation button is not enabled');
    }

    const methodIdNum = Number(clubPaymentMethodId);
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
    });
  }

  async _dispatchToProvider({ paymentMethod, donationId, amount, currency, clubId, appOrigin }) {
    switch (paymentMethod.method_category) {
      case 'stripe':
        return this._startStripeCheckout({ paymentMethod, donationId, amount, currency, clubId, appOrigin });

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
  async _startStripeCheckout({ paymentMethod, donationId, amount, currency, clubId, appOrigin }) {
    const cfg = typeof paymentMethod.method_config === 'string'
      ? JSON.parse(paymentMethod.method_config)
      : paymentMethod.method_config;

    const accountId = cfg?.connect?.accountId;
    if (!accountId || !cfg?.connect?.chargesEnabled) {
      throw new Error('Stripe is not ready to accept payments for this club');
    }

    const validatedOrigin = this._validateAppOrigin(appOrigin);

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
        success_url: `${validatedOrigin}/embed/donate/${clubId}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${validatedOrigin}/embed/donate/${clubId}?cancelled=1`,
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