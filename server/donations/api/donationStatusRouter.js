// server/donations/api/donationStatusRouter.js
//
// NEW, isolated file — not a modification of anything else. Adds a
// single read-only endpoint the donation modal polls while a Stripe or
// crypto checkout tab is open, so the modal can close itself on
// confirmation WITHOUT any postMessage/relay chain.
//
// Deliberately separate from donationCheckoutRoutes.js rather than
// added into it — this is a different concern (status polling vs.
// starting checkout) and keeping it in its own small router means
// nothing about the existing checkout routes needs to be touched or
// re-reviewed to add this.
//
// Uses DonationLedgerService.getDonationById, which already exists and
// is already used by the crypto confirm flow — no new DB logic, no new
// query, just a thin HTTP wrapper around something already proven.
//
// Public/unauthenticated, same as the rest of the donation checkout
// flow (the supporter is never logged in) — but only ever returns
// status + amount + currency, nothing sensitive (no donor name/email,
// no method config, no provider internals).

import express from 'express';
import { getDonationById } from '../services/DonationLedgerService.js';

const router = express.Router();

router.get('/donations/:clubId/:donationId/status', async (req, res) => {
  try {
    const { clubId, donationId } = req.params;

    const donation = await getDonationById(donationId);

    if (!donation || String(donation.club_id) !== String(clubId)) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Slim response — status is all the polling modal needs to decide
    // whether to keep waiting or show "thank you". amount/currency are
    // included only so the modal can echo back what was donated without
    // needing to remember it client-side across the redirect.
    return res.json({
      ok: true,
      status: donation.status, // 'pending' | 'confirmed' | 'failed' | 'expired'
      amount: donation.amount,
      currency: donation.currency,
    });
  } catch (err) {
    console.error('[donationStatusRouter] error:', err?.message || err);
    return res.status(500).json({ error: 'Could not check donation status' });
  }
});

export default router;