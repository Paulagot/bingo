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

  // 4) Pricing
  const entryFee = parseFloat(config.entryFee || 0);
  const currency = currencyFromSymbol(config.currencySymbol || '€');

  let extrasTotal = 0;
  const extrasWithPrices = [];

  for (const extraId of selectedExtras) {
    const price = Number(config.fundraisingPrices?.[extraId] || 0);
    if (price > 0) {
      extrasTotal += price;
      extrasWithPrices.push({ extraId, price });
    }
  }

  const totalAmount = entryFee + extrasTotal;
  const totalAmountCents = Math.round(totalAmount * 100);

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
            product_data: { name: `Quiz Entry — ${config.hostName || roomId}` },
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
        selectedExtras: JSON.stringify(selectedExtras),
        extrasWithPrices: JSON.stringify(extrasWithPrices),
        entryFee: String(entryFee),
        extrasTotal: String(extrasTotal),
        totalAmount: String(totalAmount),
        currency,
        clubPaymentMethodId: String(stripeConn.clubPaymentMethodId),
      },
    },
    { stripeAccount: stripeConn.accountId }
  );

  if (DEBUG) console.log('[WalkinStripe] ✅ Session created:', { roomId, playerId, sessionId: session.id });

  return { url: session.url, playerId };
}