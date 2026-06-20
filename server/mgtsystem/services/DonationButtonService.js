import database from '../../config/database.js';

// Providers eligible to power the embeddable donation button.
// Must be: method_category = 'instant_payment', enabled, has a link.
// Cash/card_tap (in-person), bank_transfer (instructions-based, no
// single link), and stripe/crypto (require their own checkout/wallet
// flow) are intentionally excluded — see spec section 6.
const ELIGIBLE_DONATION_PROVIDERS = ['sumup', 'revolut', 'monzo', 'zippypay'];

const BUTTON_METHODS_TABLE = 'fundraisely_donation_button_methods';

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
    };
  }

  async upsert({ clubId, isEnabled, buttonLabel, buttonTitle, clubPaymentMethodId, userId, branding }) {
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

    return this.getForManagement({ clubId });
  }

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