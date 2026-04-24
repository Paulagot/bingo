import Stripe from 'stripe';
import { nanoid } from 'nanoid';
import { connection, TABLE_PREFIX } from '../config/database.js';
import { canJoinAsWalkIn } from '../mgtsystem/services/quizCapacityService.js';
import { getRoomConfig } from '../mgtsystem/services/quizTicketService.js';
import { getReadyStripeForClub } from './stripeTicketCheckoutService.js'; // reuse existing helper

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
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
  donationAmount, // ✅ NEW
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

    // Donation rooms: no priced extras
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
    // Existing fixed-fee behavior
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

  // 5) Generate a stable playerId now so webhook can use it
  const playerId = nanoid();

  const origin = appOrigin || process.env.APP_URL || 'http://localhost:5173';

  // 6) Create Stripe session on connected account
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
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
      cancel_url: `${origin}/quiz/join/${roomId}?cancelled=true`,
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
        donationAmount: isDonationRoom ? String(totalAmount) : '', // ✅ NEW
        fundraisingMode: isDonationRoom ? 'donation' : 'fixed_fee', // ✅ NEW
        currency,
        clubPaymentMethodId: String(stripeConn.clubPaymentMethodId),
      },
    },
    {
      stripeAccount: stripeConn.accountId,
    }
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

  return {
    url: session.url,
    playerId,
  };
}