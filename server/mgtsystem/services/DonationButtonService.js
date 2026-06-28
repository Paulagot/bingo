// server/donations/services/DonationButtonService.js
//
// Tier A (manual-link) donation button service — handles buttons backed
// by a static external payment link (SumUp, Revolut, Monzo, ZippyPay).
// Tier B (Stripe/crypto/sumup_api trackable checkout) lives in
// DonationCheckoutService.js — the two are kept independent by design,
// each owning its own small copies of shared-shape queries rather than
// importing across services (see that file's header comment).
//
// THIS REVISION adds club-level domain registration
// (fundraisely_club_allowed_domains): which website hostnames a club's
// donate.js embed is allowed to actually render its button on. This is
// a short-term measure ahead of a planned proper club onboarding flow
// (where domain registration will move into entity setup) — for now
// it's surfaced as a field on this same donation-button management
// modal, since that's the only place clubs currently interact with the
// embed at all.

import database from '../../config/database.js';

// Providers eligible to power the embeddable donation button.
// Must be: method_category = 'instant_payment', enabled, has a link.
// Cash/card_tap (in-person), bank_transfer (instructions-based, no
// single link), and stripe/crypto (require their own checkout/wallet
// flow) are intentionally excluded — see spec section 6.
const ELIGIBLE_DONATION_PROVIDERS = ['sumup', 'revolut', 'monzo', 'zippypay'];

const BUTTON_METHODS_TABLE = 'fundraisely_donation_button_methods';
const ALLOWED_DOMAINS_TABLE = 'fundraisely_club_allowed_domains';

/**
 * Validates a #rrggbb hex color string. Deliberately duplicated from
 * DonationCheckoutService.js's identical helper rather than shared —
 * see this file's _getLinkedMethodRow/_setLinkedMethod comments for
 * why the two tiers keep their own copies of small shared logic
 * instead of importing across services.
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

function isHttpsUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    if (process.env.NODE_ENV === 'production') {
      return url.protocol === 'https:';
    }
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalizes a club-submitted domain into a bare hostname: lowercase,
 * no protocol, no path, no port, no trailing slash, no surrounding
 * whitespace. Accepts either a bare hostname ("clubsite.com") or a
 * full URL ("https://clubsite.com/events") from the admin UI, since
 * copy-pasting a full URL from the browser bar is a likely real-world
 * input even though the field asks for a domain.
 *
 * Returns null if the input can't be reduced to a sane hostname (e.g.
 * empty, or unparseable) — callers treat null as "reject this entry,"
 * not as a different valid hostname.
 */
function normalizeHostname(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const candidate = trimmed.includes('://') ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    return url.hostname || null;
  } catch {
    return null;
  }
}

// Conservative hostname shape check, applied AFTER normalizeHostname.
// Allows 'localhost' explicitly (no dot) since that's a legitimate dev
// value; otherwise requires at least one dot and only hostname-legal
// characters.
const HOSTNAME_PATTERN = /^(localhost|[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+)$/;

function isValidHostname(hostname) {
  return typeof hostname === 'string' && HOSTNAME_PATTERN.test(hostname);
}

class DonationButtonService {
  async _assertClubExists(clubId) {
    const [rows] = await database.connection.execute(
      `SELECT id FROM fundraisely_clubs WHERE id = ? LIMIT 1`,
      [clubId]
    );
    if (!rows?.length) throw new Error('Club not found');
  }

  _isEligibleRow(row) {
    if (row.method_category !== 'instant_payment') return false;
    if (!ELIGIBLE_DONATION_PROVIDERS.includes(row.provider_name)) return false;
    const config = row.method_config || {};
    return typeof config.link === 'string' && config.link.trim().length > 0;
  }

  async _listEligiblePaymentMethods({ clubId }) {
    const [rows] = await database.connection.execute(
      `SELECT
        id,
        method_category,
        provider_name,
        method_label,
        method_config,
        is_enabled
      FROM fundraisely_club_payment_methods
      WHERE club_id = ?
      ORDER BY display_order ASC, method_label ASC`,
      [clubId]
    );

    return (rows || [])
      .filter((row) => this._isEligibleRow(row))
      .map((row) => ({
        id: String(row.id),
        providerName: row.provider_name,
        methodLabel: row.method_label,
        hasLink: true,
        isEnabled: row.is_enabled === 1,
      }));
  }

  async _getPaymentMethodRow({ clubId, methodId }) {
    const [rows] = await database.connection.execute(
      `SELECT
        id,
        method_category,
        provider_name,
        method_label,
        method_config,
        is_enabled
      FROM fundraisely_club_payment_methods
      WHERE club_id = ? AND id = ?
      LIMIT 1`,
      [clubId, methodId]
    );
    return rows?.[0] || null;
  }

  /**
   * PHASE 3b: Tier A now stores its single linked method through the
   * same fundraisely_donation_button_methods join table Tier B uses,
   * rather than the old club_payment_method_id column on
   * fundraisely_club_donation_buttons (now renamed
   * legacy_club_payment_method_id and no longer read or written by
   * this file). For Tier A this table will only ever hold ONE row per
   * button — manual-link buttons have no "supporter picks one of
   * several" concept — but using the same table as Tier B means both
   * tiers share one source of truth for "what's linked to this
   * button," rather than Tier A quietly relying on a deprecated column
   * forever.
   *
   * Deliberately duplicated here rather than imported from
   * DonationCheckoutService.js — the two tiers are kept independent by
   * design (see this file's original header comment and the Phase 3b
   * handoff doc), so each owns its own small copy of this query rather
   * than introducing a cross-service dependency for two SELECTs.
   */
  async _getLinkedMethodRow({ buttonId, clubId }) {
    const [rows] = await database.connection.execute(
      `SELECT pm.*
       FROM ${BUTTON_METHODS_TABLE} dbm
       JOIN fundraisely_club_payment_methods pm ON pm.id = dbm.club_payment_method_id
       WHERE dbm.club_donation_button_id = ?
       ORDER BY dbm.display_order ASC, pm.id ASC
       LIMIT 1`,
      [buttonId]
    );
    // clubId isn't used in the query above (club_donation_button_id
    // already scopes to one club's button), but accepted as a param
    // for symmetry with _getPaymentMethodRow and in case a future
    // caller wants to assert it defensively — currently unused.
    void clubId;
    return rows?.[0] || null;
  }

  /**
   * Replaces this button's single linked method row in the join
   * table. Delete-then-insert, same pattern as Tier B's
   * upsertTierBButton — Tier A only ever has one row so there's no
   * ordering/diffing concern, just "make the table reflect exactly
   * this one id."
   */
  async _setLinkedMethod({ buttonId, clubPaymentMethodId }) {
    await database.connection.execute(
      `DELETE FROM ${BUTTON_METHODS_TABLE} WHERE club_donation_button_id = ?`,
      [buttonId]
    );
    await database.connection.execute(
      `INSERT INTO ${BUTTON_METHODS_TABLE}
         (club_donation_button_id, club_payment_method_id, display_order)
       VALUES (?, ?, 0)`,
      [buttonId, clubPaymentMethodId]
    );
  }

  // ── Allowed domains ──────────────────────────────────────────────────

  /**
   * All hostnames this club has registered as legitimate places for
   * their donate.js widget to render. Used both by the admin
   * management response (so the modal can show/edit the list) and by
   * the public domain-check endpoint donate.js calls before rendering.
   */
  async listAllowedDomains({ clubId }) {
    const [rows] = await database.connection.execute(
      `SELECT hostname FROM ${ALLOWED_DOMAINS_TABLE}
       WHERE club_id = ?
       ORDER BY created_at ASC`,
      [clubId]
    );
    return (rows || []).map((r) => r.hostname);
  }

  /**
   * Replaces a club's full allowed-domain list in one call —
   * delete-then-reinsert, same pattern as _setLinkedMethod and
   * upsertTierBButton's method-list save. Used by the donation button
   * modal's "save" action, which submits the complete intended list
   * rather than diffing client-side.
   *
   * Invalid entries are DROPPED rather than failing the whole save —
   * same convention as upsertTierBButton's droppedMethodIds — since one
   * mistyped domain shouldn't block saving the rest of the button
   * config. Returns { domains, droppedDomains } so the modal can warn
   * about anything that didn't make it through.
   *
   * Deliberately allows an EMPTY list to be saved — a club with zero
   * registered domains just means donate.js will refuse to render
   * anywhere until they add one. This is a valid (if non-functional)
   * state, not an error, since a club might be mid-setup.
   */
  async replaceAllowedDomains({ clubId, rawHostnames }) {
    await this._assertClubExists(clubId);

    const inputArray = Array.isArray(rawHostnames) ? rawHostnames : [];
    const seen = new Set();
    const validHostnames = [];
    const droppedDomains = [];

    for (const raw of inputArray) {
      const hostname = normalizeHostname(raw);
      if (!hostname || !isValidHostname(hostname)) {
        droppedDomains.push({ input: String(raw), reason: 'invalid' });
        continue;
      }
      if (seen.has(hostname)) continue; // silent dedupe, not worth reporting
      seen.add(hostname);
      validHostnames.push(hostname);
    }

    await database.connection.execute(
      `DELETE FROM ${ALLOWED_DOMAINS_TABLE} WHERE club_id = ?`,
      [clubId]
    );

    for (const hostname of validHostnames) {
      await database.connection.execute(
        `INSERT INTO ${ALLOWED_DOMAINS_TABLE} (club_id, hostname) VALUES (?, ?)`,
        [clubId, hostname]
      );
    }

    return { domains: validHostnames, droppedDomains };
  }

  /**
   * Public, unauthenticated check: is `hostname` an allowed domain for
   * `clubId`? Used by GET /donations/:clubId/domain-check, which
   * donate.js calls before rendering the button. Returns a plain
   * boolean rather than throwing on "not found" — an unregistered
   * hostname is an expected, common outcome here (anyone can call this
   * with any club id + any hostname), not an error condition worth a
   * stack trace or a 4xx-mapped exception.
   */
  async isHostnameAllowed({ clubId, hostname }) {
    const normalized = String(hostname || '').trim().toLowerCase();
    if (!normalized) return false;

    const [rows] = await database.connection.execute(
      `SELECT 1 FROM ${ALLOWED_DOMAINS_TABLE}
       WHERE club_id = ? AND hostname = ?
       LIMIT 1`,
      [clubId, normalized]
    );
    return rows.length > 0;
  }

  // ── Row mapping ───────────────────────────────────────────────────────

  /**
   * PHASE 3b: returns the plural shape (clubPaymentMethodIds,
   * paymentMethods) per the updated donationButton.ts types, even
   * though Tier A only ever populates a single-element array/list.
   * Callers that know they're in the Tier A case may safely read
   * index 0; the type itself doesn't promise that for buttons
   * generally (a Tier B button can have more).
   */
  _mapDonationButtonRow(row, paymentMethodRow) {
    if (!row) return null;

    const config = paymentMethodRow?.method_config || {};

    return {
      id: String(row.id),
      clubId: row.club_id,
      isEnabled: row.is_enabled === 1,
      buttonLabel: row.button_label,
      buttonTitle: row.button_title,
      clubPaymentMethodIds: paymentMethodRow ? [String(paymentMethodRow.id)] : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paymentMethods: paymentMethodRow
        ? [
            {
              id: String(paymentMethodRow.id),
              providerName: paymentMethodRow.provider_name,
              methodLabel: paymentMethodRow.method_label,
              link: typeof config.link === 'string' ? config.link : '',
              isEnabled: paymentMethodRow.is_enabled === 1,
            },
          ]
        : [],
    };
  }

  // ── Management read ───────────────────────────────────────────────────

  async getForManagement({ clubId }) {
    await this._assertClubExists(clubId);

    const [buttonRows] = await database.connection.execute(
      `SELECT * FROM fundraisely_club_donation_buttons WHERE club_id = ? LIMIT 1`,
      [clubId]
    );

    const buttonRow = buttonRows?.[0] || null;
    let paymentMethodRow = null;

    if (buttonRow) {
      paymentMethodRow = await this._getLinkedMethodRow({ buttonId: buttonRow.id, clubId });
    }

    const eligiblePaymentMethods = await this._listEligiblePaymentMethods({ clubId });
    const allowedDomains = await this.listAllowedDomains({ clubId });

    return {
      ok: true,
      donationButton: this._mapDonationButtonRow(buttonRow, paymentMethodRow),
      // Branding lives on the raw button row's three new columns
      // (primary_color/background_color/text_on_primary_color), all
      // NOT NULL with defaults from the migration. Falls back to the
      // same defaults here too, for the (should-never-happen) case of
      // no button existing yet, so callers always get a complete
      // branding object rather than having to null-check it.
      branding: buttonRow
        ? {
            primaryColor: buttonRow.primary_color,
            backgroundColor: buttonRow.background_color,
            textOnPrimaryColor: buttonRow.text_on_primary_color,
          }
        : { primaryColor: '#157f85', backgroundColor: '#ffffff', textOnPrimaryColor: '#ffffff' },
      eligiblePaymentMethods,
      allowedDomains,
    };
  }

  // ── Save (Tier A upsert) ──────────────────────────────────────────────

  async upsert({ clubId, isEnabled, buttonLabel, buttonTitle, clubPaymentMethodId, userId, branding, allowedDomains }) {
    await this._assertClubExists(clubId);

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

    const methodIdNum = Number(clubPaymentMethodId);
    if (!Number.isFinite(methodIdNum)) {
      throw new Error('A payment method must be selected');
    }

    const paymentMethodRow = await this._getPaymentMethodRow({ clubId, methodId: methodIdNum });
    if (!paymentMethodRow) {
      throw new Error('Selected payment method does not belong to this club');
    }
    if (paymentMethodRow.is_enabled !== 1) {
      throw new Error('Selected payment method is disabled');
    }
    if (paymentMethodRow.method_category !== 'instant_payment') {
      throw new Error('Selected payment method is not eligible for the donation button');
    }
    if (!ELIGIBLE_DONATION_PROVIDERS.includes(paymentMethodRow.provider_name)) {
      throw new Error('Selected payment method is not eligible for the donation button');
    }
    const config = paymentMethodRow.method_config || {};
    if (typeof config.link !== 'string' || !config.link.trim()) {
      throw new Error('Selected payment method has no payment link');
    }
    if (!isHttpsUrl(config.link)) {
      throw new Error('Selected payment method link is not a valid secure URL');
    }

    const [existingRows] = await database.connection.execute(
      `SELECT id FROM fundraisely_club_donation_buttons WHERE club_id = ? LIMIT 1`,
      [clubId]
    );

    let buttonId;

    if (existingRows?.length) {
      buttonId = existingRows[0].id;
      await database.connection.execute(
        `UPDATE fundraisely_club_donation_buttons
         SET is_enabled = ?,
             button_label = ?,
             button_title = ?,
             primary_color = ?,
             background_color = ?,
             text_on_primary_color = ?,
             updated_at = UTC_TIMESTAMP()
         WHERE club_id = ?`,
        [
          isEnabled ? 1 : 0,
          trimmedLabel,
          trimmedTitle,
          validatedBranding.primaryColor,
          validatedBranding.backgroundColor,
          validatedBranding.textOnPrimaryColor,
          clubId,
        ]
      );
    } else {
      const [insertResult] = await database.connection.execute(
        `INSERT INTO fundraisely_club_donation_buttons
          (club_id, is_enabled, button_label, button_title,
           primary_color, background_color, text_on_primary_color)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          clubId,
          isEnabled ? 1 : 0,
          trimmedLabel,
          trimmedTitle,
          validatedBranding.primaryColor,
          validatedBranding.backgroundColor,
          validatedBranding.textOnPrimaryColor,
        ]
      );
      buttonId = insertResult.insertId;
    }

    await this._setLinkedMethod({ buttonId, clubPaymentMethodId: methodIdNum });

    // allowedDomains is OPTIONAL on the request — undefined means
    // "don't touch the saved domain list," not "clear it." Only call
    // replaceAllowedDomains when the caller actually sent something
    // (including an explicit empty array, which DOES mean "clear it").
    let droppedDomains = [];
    if (allowedDomains !== undefined) {
      const domainResult = await this.replaceAllowedDomains({ clubId, rawHostnames: allowedDomains });
      droppedDomains = domainResult.droppedDomains;
    }

    const managementData = await this.getForManagement({ clubId });
    return { ...managementData, droppedDomains };
  }

  // ── Embed code generation ─────────────────────────────────────────────

  async getEmbed({ clubId }) {
    await this._assertClubExists(clubId);

    const [buttonRows] = await database.connection.execute(
      `SELECT * FROM fundraisely_club_donation_buttons WHERE club_id = ? LIMIT 1`,
      [clubId]
    );
    const buttonRow = buttonRows?.[0] || null;

    if (!buttonRow) {
      throw new Error('Donation button not configured');
    }
    if (buttonRow.is_enabled !== 1) {
      throw new Error('Donation button is disabled');
    }

    const paymentMethodRow = await this._getLinkedMethodRow({ buttonId: buttonRow.id, clubId });

    if (!paymentMethodRow) {
      throw new Error('Linked payment method no longer exists');
    }
    if (paymentMethodRow.is_enabled !== 1) {
      throw new Error('Linked payment method is disabled');
    }

    const config = paymentMethodRow.method_config || {};
    const link = typeof config.link === 'string' ? config.link.trim() : '';

    if (!isHttpsUrl(link)) {
      throw new Error('Linked payment method has no valid payment link');
    }

    const safeLabel = escapeHtml(buttonRow.button_label);
    const safeHref = escapeHtml(link);

    // Use the button's own saved colors rather than the previous
    // hardcoded teal/white — escapeHtml is applied even though these
    // are validated hex strings (validateBranding/HEX_COLOR_PATTERN
    // already constrain them to #rrggbb at save time), as cheap
    // defense-in-depth against any value that reached the DB before
    // that validation existed or via a direct DB edit.
    const safePrimary = escapeHtml(buttonRow.primary_color);
    const safeTextOnPrimary = escapeHtml(buttonRow.text_on_primary_color);

    const embedHtml =
      `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" ` +
      `style="display:inline-block;padding:12px 18px;border-radius:8px;` +
      `background:${safePrimary};color:${safeTextOnPrimary};text-decoration:none;font-weight:700;` +
      `font-family:Arial,sans-serif;">${safeLabel}</a>`;

    return {
      ok: true,
      embedHtml,
      donationButton: this._mapDonationButtonRow(buttonRow, paymentMethodRow),
    };
  }
}

export default DonationButtonService;