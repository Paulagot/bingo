import express from 'express';
import authenticateToken from '../../middleware/auth.js';
import DonationButtonService from '../services/DonationButtonService.js';

const router = express.Router();
const svc = new DonationButtonService();

function mapErrorToStatus(message) {
  if (!message) return 500;
  if (message === 'Club not found') return 404;
  if (message === 'Donation button not configured') return 404;
  if (message === 'Linked payment method no longer exists') return 404;
  if (
    message === 'Selected payment method does not belong to this club' ||
    message === 'Selected payment method is disabled' ||
    message === 'Selected payment method is not eligible for the donation button' ||
    message === 'Selected payment method has no payment link' ||
    message === 'Selected payment method link is not a valid secure URL' ||
    message === 'Button label is required' ||
    message === 'Button label must be 80 characters or fewer' ||
    message === 'Button title must be 160 characters or fewer' ||
    message === 'A payment method must be selected'
  ) {
    return 400;
  }
  if (
    message === 'Donation button is disabled' ||
    message === 'Linked payment method is disabled' ||
    message === 'Linked payment method has no valid payment link'
  ) {
    return 409; // conflict: exists, but currently inactive
  }
  return 500;
}

/**
 * GET /donation-buttons/:clubId/manage
 * Returns the club's current donation button config (or null if not
 * yet created) plus the list of eligible payment methods, including
 * disabled-but-otherwise-qualifying ones so the admin can see why a
 * previous selection may no longer be active.
 */
router.get('/donation-buttons/:clubId/manage', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    console.log('[donation-buttons] GET manage — clubId param:', clubId, '| req.club_id:', req.club_id);

    if (clubId !== req.club_id) {
      console.warn('[donation-buttons] clubId mismatch — returning 403');
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = await svc.getForManagement({ clubId });
    console.log('[donation-buttons] getForManagement result:', JSON.stringify(data));
    res.json(data);
  } catch (err) {
    console.error('[donation-buttons] GET manage error:', err);
    const status = mapErrorToStatus(err?.message);
    res.status(status).json({ error: err?.message || 'Failed to fetch donation button' });
  }
});

/**
 * PUT /donation-buttons/:clubId
 * Create or update the club's single donation button.
 * Body: { isEnabled, buttonLabel, buttonTitle?, clubPaymentMethodId }
 */
router.put('/donation-buttons/:clubId', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { isEnabled, buttonLabel, buttonTitle, clubPaymentMethodId } = req.body || {};

    if (typeof isEnabled !== 'boolean') {
      return res.status(400).json({ error: 'isEnabled must be a boolean' });
    }
    if (clubPaymentMethodId === undefined || clubPaymentMethodId === null || clubPaymentMethodId === '') {
      return res.status(400).json({ error: 'clubPaymentMethodId is required' });
    }

    const data = await svc.upsert({
      clubId,
      isEnabled,
      buttonLabel,
      buttonTitle,
      clubPaymentMethodId,
      userId: req.user_id,
    });

    res.json(data);
  } catch (err) {
    const status = mapErrorToStatus(err?.message);
    res.status(status).json({ error: err?.message || 'Failed to save donation button' });
  }
});

/**
 * GET /donation-buttons/:clubId/embed
 * Returns the server-generated embed HTML for the club's donation
 * button. Fails with 404/409 if not configured, disabled, or the
 * linked payment method is no longer usable — per spec section 14.4,
 * an inactive button never produces embed HTML.
 */
router.get('/donation-buttons/:clubId/embed', authenticateToken, async (req, res) => {
  try {
    const { clubId } = req.params;
    if (clubId !== req.club_id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = await svc.getEmbed({ clubId });
    res.json(data);
  } catch (err) {
    const status = mapErrorToStatus(err?.message);
    res.status(status).json({ error: err?.message || 'Failed to generate embed' });
  }
});

export default router;