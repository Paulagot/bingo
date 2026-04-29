// server/stripe/stripeWalkinCheckout.js
// CHANGES from original:
//   1. Stripe checkout session now expires after 30 minutes (expires_after: { minutes: 30 })
//   Walk-in payments don't pre-create DB rows so no expires_at needed here —
//   the webhook creates ledger rows only on success. Abandoned sessions simply never
//   write anything to the DB, so cleanup is automatic.

import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { connection, TABLE_PREFIX } from '../config/database.js';
import { canJoinAsWalkIn } from '../mgtsystem/services/quizCapacityService.js';
import { getRoomConfig } from '../mgtsystem/services/quizTicketService.js';
import { getReadyStripeForClub } from './stripeTicketCheckoutService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Must match stripeTicketCheckoutService.js
const CHECKOUT_EXPIRY_MINUTES = 30;

const DEBUG = true;

function currencyFromSymbol(symbol) {
  if (symbol === '€') return 'EUR';
  if (symbol === '£') return 'GBP';
  if (symbol === '$') return 'USD';
  return 'EUR';
}

export async function createWalkinStripeSession({
  roomId,
  playerName,
  selectedExtras = [],
  donationAmount,
  appOrigin,
}) {
  // 1) Capacity check
  const capacityCheck = await canJoinAsWalkIn(roomId, 0);
  if (!capacityCheck.allowed) throw new Error(capacityCheck.reason);

  // 2) Room config
  const roomData = await getRoomConfig(roomId);
  if (!roomData) throw new Error('Room not found');

  const { clubId, config } = roomData;

  // 3) Stripe readiness
  const stripeConn = await getReadyStripeForClub(clubId);
  if (!stripeConn) throw new Error('stripe_not_ready_or_disabled');

  const isDonationRoom = config?.fundraisingMode === 'donation';
  const currency = currencyFromSymbol(config.currencySymbol || '€');

  let entryFee = 0;
  let extrasTotal = 0;
  let extrasWithPrices = [];
  let totalAmount = 0;

  if (isDonationRoom) {
    const parsedDonation = Number(donationAmount);

    if (!Number.isFinite(parsedDonation) || parsedDonation <= 0) {
      throw new Error('invalid_donation_amount_for_stripe');
    }

    totalAmount = parsedDonation;
    entryFee = 0;
    extrasTotal = 0;
    extrasWithPrices = [];

    if (DEBUG) {
      console.log('[WalkinCheckout] 💖 Donation room Stripe checkout', {
        roomId,
        playerName,
        donationAmount: parsedDonation,
        currency,
      });
    }
  } else {
    entryFee = parseFloat(config.entryFee || 0);

    for (const extraId of selectedExtras) {
      const price = Number(config.fundraisingPrices?.[extraId] || 0);
      if (price > 0) {
        extrasTotal += price;
        extrasWithPrices.push({ extraId, price });
      }
    }

    totalAmount = entryFee + extrasTotal;
  }

  const totalAmountCents = Math.round(totalAmount * 100);

  if (!Number.isFinite(totalAmountCents) || totalAmountCents <= 0) {
    throw new Error('invalid_checkout_amount');
  }

  // 4) Generate a stable playerId now so webhook can use it
  const playerId = nanoid();

  const origin = appOrigin || process.env.APP_URL || 'http://localhost:5173';

  // 5) Create Stripe session
  //    Walk-in payments write nothing to the DB until the webhook fires on success,
  //    so abandoned sessions are automatically harmless — no cleanup needed.
  //    We still set expires_after for a consistent UX (30-min timer shown to user).
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      expires_after: { minutes: CHECKOUT_EXPIRY_MINUTES }, // ✅ NEW
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: totalAmountCents,
            product_data: {
              name: isDonationRoom
                ? `Quiz Donation — ${config.hostName || roomId}`
                : `Quiz Entry — ${config.hostName || roomId}`,
            },
          },
        },
      ],
      success_url: `${origin}/quiz/${roomId}/join-success?playerId=${playerId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/quiz/join/${roomId}?cancelled=true`,
      metadata: {
        type: 'walkin_payment',
        roomId,
        clubId,
        playerId,
        playerName,
        selectedExtras: JSON.stringify(isDonationRoom ? [] : selectedExtras),
        extrasWithPrices: JSON.stringify(extrasWithPrices),
        entryFee: String(entryFee),
        extrasTotal: String(extrasTotal),
        totalAmount: String(totalAmount),
        donationAmount: isDonationRoom ? String(totalAmount) : '',
        fundraisingMode: isDonationRoom ? 'donation' : 'fixed_fee',
        currency,
        clubPaymentMethodId: String(stripeConn.clubPaymentMethodId),
      },
    },
    { stripeAccount: stripeConn.accountId }
  );

  if (DEBUG) {
    console.log('[WalkinCheckout] ✅ Stripe session created', {
      roomId,
      playerId,
      sessionId: session.id,
      totalAmount,
      currency,
      isDonationRoom,
    });
  }

  return { url: session.url, playerId };
}