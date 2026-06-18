import database from '../../config/database.js';

// Providers eligible to power the embeddable donation button.
// Must be: method_category = 'instant_payment', enabled, has a link.
// Cash/card_tap (in-person), bank_transfer (instructions-based, no
// single link), and stripe/crypto (require their own checkout/wallet
// flow) are intentionally excluded — see spec section 6.
const ELIGIBLE_DONATION_PROVIDERS = ['sumup', 'revolut', 'monzo', 'zippypay'];

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

    console.log('[DonationButtonService] raw payment method rows:', JSON.stringify(rows));
    console.log(
      '[DonationButtonService] per-row eligibility:',
      (rows || []).map((r) => ({
        id: r.id,
        method_category: r.method_category,
        provider_name: r.provider_name,
        is_enabled: r.is_enabled,
        method_config_type: typeof r.method_config,
        method_config: r.method_config,
        isEligible: this._isEligibleRow(r),
      }))
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

  _mapDonationButtonRow(row, paymentMethodRow) {
    if (!row) return null;

    const config = paymentMethodRow?.method_config || {};

    return {
      id: String(row.id),
      clubId: row.club_id,
      isEnabled: row.is_enabled === 1,
      buttonLabel: row.button_label,
      buttonTitle: row.button_title,
      clubPaymentMethodId: String(row.club_payment_method_id),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paymentMethod: paymentMethodRow
        ? {
            id: String(paymentMethodRow.id),
            providerName: paymentMethodRow.provider_name,
            methodLabel: paymentMethodRow.method_label,
            link: typeof config.link === 'string' ? config.link : '',
            isEnabled: paymentMethodRow.is_enabled === 1,
          }
        : null,
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
      paymentMethodRow = await this._getPaymentMethodRow({
        clubId,
        methodId: buttonRow.club_payment_method_id,
      });
    }

    const eligiblePaymentMethods = await this._listEligiblePaymentMethods({ clubId });

    return {
      ok: true,
      donationButton: this._mapDonationButtonRow(buttonRow, paymentMethodRow),
      eligiblePaymentMethods,
    };
  }

  async upsert({ clubId, isEnabled, buttonLabel, buttonTitle, clubPaymentMethodId, userId }) {
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

    if (existingRows?.length) {
      await database.connection.execute(
        `UPDATE fundraisely_club_donation_buttons
         SET is_enabled = ?,
             button_label = ?,
             button_title = ?,
             club_payment_method_id = ?,
             updated_at = UTC_TIMESTAMP()
         WHERE club_id = ?`,
        [isEnabled ? 1 : 0, trimmedLabel, trimmedTitle, methodIdNum, clubId]
      );
    } else {
      await database.connection.execute(
        `INSERT INTO fundraisely_club_donation_buttons
          (club_id, is_enabled, button_label, button_title, club_payment_method_id)
         VALUES (?, ?, ?, ?, ?)`,
        [clubId, isEnabled ? 1 : 0, trimmedLabel, trimmedTitle, methodIdNum]
      );
    }

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

    const paymentMethodRow = await this._getPaymentMethodRow({
      clubId,
      methodId: buttonRow.club_payment_method_id,
    });

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

    const embedHtml =
      `<a href="${safeHref}" target="_blank" rel="noopener noreferrer" ` +
      `style="display:inline-block;padding:12px 18px;border-radius:8px;` +
      `background:#157f85;color:#ffffff;text-decoration:none;font-weight:700;` +
      `font-family:Arial,sans-serif;">${safeLabel}</a>`;

    return {
      ok: true,
      embedHtml,
      donationButton: this._mapDonationButtonRow(buttonRow, paymentMethodRow),
    };
  }
}

export default DonationButtonService;