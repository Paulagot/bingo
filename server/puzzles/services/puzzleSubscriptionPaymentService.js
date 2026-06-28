/**
 * Puzzle Subscription Payment Service
 * server/puzzles/services/puzzleSubscriptionPaymentService.js
 *
 * Stripe-only subscription checkout for weekly-paid Puzzle Challenges.
 * Mirrors the shape of stripeTicketCheckoutService.js — reuses
 * getReadyStripeForClub for the same Stripe-Connect readiness check used
 * by every other paid activity type.
 *
 * This file owns all direct Stripe calls for subscriptions. The webhook
 * dispatch itself lives in stripeWebhooks.js (new `puzzle_subscription`
 * branches), which calls the confirm/markX helpers below — kept here,
 * not duplicated in the webhook file, so there is exactly one place that
 * writes to fundraisely_puzzle_subscriptions.
 */

import Stripe from 'stripe';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import database from '../../config/database.js';
import { getReadyStripeForClub } from '../../stripe/stripeTicketCheckoutService.js';
import { findOrCreateSupporter } from '../../supporters/services/supporterAuthService.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

// Same secret/TTL as supporterAuthService.js's magic-link tokens, so a
// token issued here is accepted by authenticateSupporter without any
// middleware change — it's structurally identical, just issued via a
// different trigger (a confirmed Stripe session instead of a clicked
// email link).
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret';
const JWT_TTL = '90d';

const DEBUG = false;

// ─────────────────────────────────────────────────────────────────────────────
// Activation-time: create the Stripe Product + recurring Price
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create (or reuse) the Stripe Product + weekly recurring Price for a
 * challenge, and persist both ids on the challenge row.
 *
 * Called from challengeService.updateChallengeStatus right before the
 * status flip to 'active', for paid challenges only. Idempotent — if the
 * challenge already has a stripe_price_id, returns it unchanged rather
 * than creating a duplicate Product/Price on Stripe.
 *
 * Throws on failure — the caller (updateChallengeStatus) must let that
 * failure abort the status flip. A club must not be able to "activate" a
 * paid challenge with no working checkout behind it.
 */
export async function ensureStripeProductAndPrice({ challengeId, clubId }) {
  const [[challenge]] = await database.connection.execute(
    `SELECT id, club_id, title, weekly_price, currency, is_free,
            stripe_price_id, stripe_product_id
     FROM fundraisely_puzzle_challenges
     WHERE id = ? AND club_id = ?
     LIMIT 1`,
    [challengeId, clubId]
  );

  if (!challenge) {
    throw new Error('Challenge not found.');
  }

  if (challenge.is_free) {
    // Nothing to provision for a free challenge — caller should not have
    // called this for a free challenge, but guard anyway.
    return { stripePriceId: null, stripeProductId: null };
  }

  // Already provisioned — reuse rather than recreate on Stripe.
  if (challenge.stripe_price_id && challenge.stripe_product_id) {
    return {
      stripePriceId: challenge.stripe_price_id,
      stripeProductId: challenge.stripe_product_id,
    };
  }

  const stripeConn = await getReadyStripeForClub(clubId);
  if (!stripeConn) {
    throw new Error('stripe_not_connected');
  }

  if (!challenge.weekly_price || Number(challenge.weekly_price) <= 0) {
    throw new Error('invalid_weekly_price');
  }

  // weekly_price is stored as the smallest currency unit already
  // (see challengeService.createChallenge — no *100 happens there),
  // so it is used directly as Stripe's unit_amount.
  const unitAmount = Math.round(Number(challenge.weekly_price));
  const currency = (challenge.currency || 'eur').toLowerCase();

  const product = await stripe.products.create(
    {
      name: `Puzzle Challenge — ${challenge.title}`,
      metadata: { challengeId, clubId },
    },
    { stripeAccount: stripeConn.accountId }
  );

  const price = await stripe.prices.create(
    {
      product: product.id,
      currency,
      unit_amount: unitAmount,
      recurring: { interval: 'week' },
      metadata: { challengeId, clubId },
    },
    { stripeAccount: stripeConn.accountId }
  );

  await database.connection.execute(
    `UPDATE fundraisely_puzzle_challenges
     SET stripe_price_id = ?, stripe_product_id = ?
     WHERE id = ? AND club_id = ?`,
    [price.id, product.id, challengeId, clubId]
  );

  if (DEBUG) {
    console.log('[puzzleSubscriptionPayment] ✅ Stripe Product/Price created:', {
      challengeId, productId: product.id, priceId: price.id, unitAmount, currency,
    });
  }

  return { stripePriceId: price.id, stripeProductId: product.id };
}

// ─────────────────────────────────────────────────────────────────────────────
// Checkout
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout Session (subscription mode) for a supporter
 * joining a paid challenge.
 *
 * Creates/reuses a Stripe Customer, creates a 'pending' row in
 * fundraisely_puzzle_subscriptions up front (so a stripe_subscription_id
 * has somewhere to land once checkout.session.completed fires), then
 * returns the Checkout Session URL.
 */
export async function createCheckoutSession({ challengeId, supporterEmail, supporterName, clubId }) {
  const [[challenge]] = await database.connection.execute(
    `SELECT id, club_id, title, weekly_price, currency, is_free, status, stripe_price_id
     FROM fundraisely_puzzle_challenges
     WHERE id = ? AND club_id = ?
     LIMIT 1`,
    [challengeId, clubId]
  );

  if (!challenge) {
    throw new Error('Challenge not found.');
  }
  if (challenge.is_free) {
    throw new Error('This challenge is free — use the join-free flow instead.');
  }
  if (challenge.status === 'cancelled') {
    throw new Error('This challenge has been cancelled.');
  }
  if (!challenge.stripe_price_id) {
    // Activation should have created this — if it's missing, the challenge
    // was never properly activated (or activation predates this build).
    throw new Error('stripe_not_connected');
  }

  const stripeConn = await getReadyStripeForClub(clubId);
  if (!stripeConn) {
    throw new Error('stripe_not_connected');
  }

  // Find-or-create the supporter record so we have a stable player_id to
  // attach the subscription row to. Reuses the exact same helper the
  // magic-link signup flow uses (supporterAuthService.js) — this is the
  // single source of truth for supporter creation, so a subscription
  // checkout produces a fully-formed supporter row (gdpr_consent,
  // lifecycle_stage, contact_source, etc.), not a partial one. It also
  // throws if the email has previously opted out (do_not_contact) — that
  // error is allowed to propagate, since the checkout route should refuse
  // to enroll someone who has opted out of communications.
  const supporter = await findOrCreateSupporter({
    email: supporterEmail,
    name: supporterName,
    clubId,
    challengeId,
  });
  const supporterId = supporter.id;

  // Find-or-create the Stripe Customer on the connected account.
  const stripeCustomerId = await findOrCreateStripeCustomer({
    accountId: stripeConn.accountId,
    email: supporterEmail,
    name: supporterName,
  });

  // Pending subscription row — UNIQUE KEY (challenge_id, player_id) means
  // a second checkout attempt by the same supporter reuses this row rather
  // than erroring; we upsert defensively.
  const subscriptionId = await upsertPendingSubscription({
    challengeId,
    playerId: supporterId,
    clubId,
    stripeCustomerId,
  });

  const origin = process.env.APP_URL || 'http://localhost:5173';

  const session = await stripe.checkout.sessions.create(
    {
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: challenge.stripe_price_id, quantity: 1 }],
      // Lands the player on the real, existing challenge-play route once
      // payment succeeds — Stripe Checkout already shows its own
      // payment-confirmed screen before this redirect fires, so there's no
      // need for a separate branded interstitial (mirrors how
      // PuzzleAuthPage.tsx also redirects straight into /play after
      // magic-link verification, rather than via a middle success page).
      success_url: `${origin}/challenges/${challengeId}/play?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/join/puzzle/challenge/${challengeId}?cancelled=true`,
      subscription_data: {
        // Copied by Stripe onto the created Subscription object, and from
        // there onto every Invoice it generates — this is how
        // invoice.payment_succeeded / payment_failed / subscription.deleted
        // (which carry a Subscription, not a Checkout Session) get back to
        // our subscriptionId without needing session.metadata.
        metadata: {
          type: 'puzzle_subscription',
          subscriptionId,
          challengeId,
          clubId,
          playerId: supporterId,
        },
      },
      metadata: {
        type: 'puzzle_subscription',
        subscriptionId,
        challengeId,
        clubId,
        playerId: supporterId,
      },
    },
    { stripeAccount: stripeConn.accountId }
  );

  if (DEBUG) {
    console.log('[puzzleSubscriptionPayment] ✅ Checkout session created:', {
      challengeId, supporterId, sessionId: session.id,
    });
  }

  return { url: session.url };
}

// ─────────────────────────────────────────────────────────────────────────────
// Post-checkout authentication
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Exchange a completed Stripe Checkout Session id for a supporter JWT.
 *
 * Called once, right after the player lands back on /challenges/:id/play
 * from Stripe. createCheckoutSession never issues a token itself — the
 * player has no supporter session until this runs, since unlike the
 * magic-link flow there's no "click a link to prove you own this email"
 * step in the Stripe redirect itself. This exists to close that gap
 * without putting a long-lived JWT directly in a redirect URL (where it
 * would sit in browser history and server access logs) — only Stripe's
 * own short opaque session id appears in the URL; the token itself is
 * only ever returned in a JSON response body.
 *
 * Deliberately checks Stripe directly (session.payment_status /
 * session.status) rather than our own fundraisely_puzzle_subscriptions
 * row, because Stripe can redirect the browser back to success_url
 * before our webhook has necessarily been processed — checking our own
 * DB here would be a race against that webhook. Stripe's own session
 * object is authoritative regardless of webhook timing.
 *
 * Throws on any mismatch — wrong challenge, session not actually paid,
 * session not found, etc. — so a stranger can't mint themselves a token
 * by guessing or reusing an unrelated session id.
 */
export async function exchangeSessionForSupporterToken({ sessionId, challengeId }) {
  if (!sessionId) throw new Error('session_id is required');
  if (!challengeId) throw new Error('challengeId is required');

  const [[challenge]] = await database.connection.execute(
    `SELECT id, club_id FROM fundraisely_puzzle_challenges WHERE id = ? LIMIT 1`,
    [challengeId]
  );
  if (!challenge) throw new Error('Challenge not found.');

  const stripeConn = await getReadyStripeForClub(challenge.club_id);
  if (!stripeConn) throw new Error('stripe_not_connected');

  // The Checkout Session was created on the connected account
  // (createCheckoutSession passes { stripeAccount: ... } at creation
  // time too) — it must be retrieved the same way, or Stripe won't find
  // it from the platform context.
  const session = await stripe.checkout.sessions.retrieve(
    sessionId,
    { stripeAccount: stripeConn.accountId }
  );

  if (!session) throw new Error('Checkout session not found.');

  const meta = session.metadata || {};
  if (meta.type !== 'puzzle_subscription' || meta.challengeId !== challengeId) {
    // Either a session for something else entirely, or one for a
    // different challenge — never trust it for this challenge's access.
    throw new Error('Checkout session does not match this challenge.');
  }

  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    throw new Error('Checkout session is not yet completed.');
  }

  const playerId = meta.playerId;
  if (!playerId) throw new Error('Checkout session is missing player metadata.');

  const [[supporter]] = await database.connection.execute(
    `SELECT id, name, email, club_id FROM fundraisely_supporters WHERE id = ? LIMIT 1`,
    [playerId]
  );
  if (!supporter) throw new Error('Supporter record not found.');

  const accessToken = jwt.sign(
    { supporterId: supporter.id, clubId: supporter.club_id, role: 'supporter' },
    JWT_SECRET,
    { expiresIn: JWT_TTL }
  );

  return {
    accessToken,
    supporter: {
      id: supporter.id,
      name: supporter.name,
      email: supporter.email,
      clubId: supporter.club_id,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook-driven state transitions
// Called from stripeWebhooks.js — one function per event type, each scoped
// to exactly the columns that event is authoritative for.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * checkout.session.completed → activate the subscription row and enroll
 * the player in the challenge.
 */
export async function confirmSubscriptionCheckout({ subscriptionId, challengeId, playerId, clubId, stripeSubscriptionId, stripeCustomerId }) {
  await database.connection.execute(
    `UPDATE fundraisely_puzzle_subscriptions
     SET status = 'active',
         stripe_subscription_id = ?,
         stripe_customer_id = COALESCE(stripe_customer_id, ?)
     WHERE id = ?`,
    [stripeSubscriptionId, stripeCustomerId, subscriptionId]
  );

  await database.connection.execute(
    `INSERT IGNORE INTO fundraisely_puzzle_challenge_players
       (challenge_id, player_id, club_id, enrolled_at, status)
     VALUES (?, ?, ?, UTC_TIMESTAMP(), 'active')`,
    [challengeId, playerId, clubId]
  );

  if (DEBUG) {
    console.log('[puzzleSubscriptionPayment] ✅ Subscription activated:', { subscriptionId, stripeSubscriptionId });
  }
}

/**
 * invoice.payment_succeeded → bump current_period_end.
 * Looked up by stripe_subscription_id since the invoice object itself
 * carries no challengeId/playerId metadata directly.
 */
export async function updateSubscriptionPeriodEnd({ stripeSubscriptionId, currentPeriodEnd }) {
  const periodEndMysql = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toISOString().slice(0, 19).replace('T', ' ')
    : null;

  const [result] = await database.connection.execute(
    `UPDATE fundraisely_puzzle_subscriptions
     SET current_period_end = ?,
         status = IF(status = 'past_due', 'active', status)
     WHERE stripe_subscription_id = ?`,
    [periodEndMysql, stripeSubscriptionId]
  );

  return result.affectedRows > 0;
}

/** invoice.payment_failed → mark past_due. */
export async function markSubscriptionPastDue({ stripeSubscriptionId }) {
  const [result] = await database.connection.execute(
    `UPDATE fundraisely_puzzle_subscriptions
     SET status = 'past_due'
     WHERE stripe_subscription_id = ?`,
    [stripeSubscriptionId]
  );
  return result.affectedRows > 0;
}

/** customer.subscription.deleted → mark cancelled. */
export async function markSubscriptionCancelled({ stripeSubscriptionId }) {
  const [result] = await database.connection.execute(
    `UPDATE fundraisely_puzzle_subscriptions
     SET status = 'cancelled'
     WHERE stripe_subscription_id = ?`,
    [stripeSubscriptionId]
  );
  return result.affectedRows > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

async function upsertPendingSubscription({ challengeId, playerId, clubId, stripeCustomerId }) {
  const [[existing]] = await database.connection.execute(
    `SELECT id FROM fundraisely_puzzle_subscriptions
     WHERE challenge_id = ? AND player_id = ?
     LIMIT 1`,
    [challengeId, playerId]
  );

  if (existing) {
    await database.connection.execute(
      `UPDATE fundraisely_puzzle_subscriptions
       SET stripe_customer_id = ?, status = 'pending'
       WHERE id = ?`,
      [stripeCustomerId, existing.id]
    );
    return existing.id;
  }

  const id = uuidv4();
  await database.connection.execute(
    `INSERT INTO fundraisely_puzzle_subscriptions
       (id, challenge_id, player_id, club_id, stripe_customer_id, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
    [id, challengeId, playerId, clubId, stripeCustomerId]
  );
  return id;
}

async function findOrCreateStripeCustomer({ accountId, email, name }) {
  const existing = await stripe.customers.list(
    { email, limit: 1 },
    { stripeAccount: accountId }
  );

  if (existing.data.length > 0) {
    return existing.data[0].id;
  }

  const customer = await stripe.customers.create(
    { email, name },
    { stripeAccount: accountId }
  );

  return customer.id;
}