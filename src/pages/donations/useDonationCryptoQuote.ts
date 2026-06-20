// src/pages/donations/useDonationCryptoQuote.ts
//
// Donation-flavored sibling of useCryptoQuote.ts
// (src/components/Quiz/joinroom/crypto/useCryptoQuote.ts).
//
// Reuses that hook's logic almost line-for-line — same countdown timer,
// same in-flight dedup guard, same "don't auto-refetch on expiry"
// behavior — because none of that is room-specific, it's just quote
// lifecycle management. The only real differences:
//   - clubId instead of roomId
//   - POST /api/donations/:clubId/crypto/quote (body) instead of
//     GET /api/quiz/crypto-quote (query string)
//
// Kept as a separate file rather than parameterizing the original,
// since donation buttons and quiz rooms could reasonably diverge on
// quote behavior over time (same reasoning as donationCryptoQuoteRouter.js
// keeping its own SUPPORTED_TOKENS list rather than importing the quiz
// one) — and editing the working, tested quiz hook to add a donation
// branch risks regressing something that already works.

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SolanaTokenCode } from '../../chains/solana/config/solanaTokenConfig';

export interface DonationCryptoQuote {
  fiatAmount: number;
  fiatCurrency: string;
  tokenCode: SolanaTokenCode;
  tokenAmount: number;
  rawAmount: string;
  pricePerToken: number;
  quotedAt: string;
  expiresAt: string;
}

export type DonationQuoteStatus = 'idle' | 'loading' | 'ready' | 'expired' | 'error';

interface UseDonationCryptoQuoteParams {
  clubId: string;
  fiatAmount: number;
  tokenCode: SolanaTokenCode | null;
  enabled: boolean;
}

interface UseDonationCryptoQuoteResult {
  quote: DonationCryptoQuote | null;
  status: DonationQuoteStatus;
  error: string | null;
  secondsLeft: number;
  refresh: () => void;
  isExpired: boolean;
}

export function useDonationCryptoQuote({
  clubId,
  fiatAmount,
  tokenCode,
  enabled,
}: UseDonationCryptoQuoteParams): UseDonationCryptoQuoteResult {
  const [quote, setQuote] = useState<DonationCryptoQuote | null>(null);
  const [status, setStatus] = useState<DonationQuoteStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSeconds] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchingRef = useRef(false);
  const lastFetchRef = useRef<{ clubId: string; fiatAmount: number; tokenCode: string | null }>({
    clubId: '', fiatAmount: 0, tokenCode: null,
  });

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const fetchQuote = useCallback(async () => {
    if (fetchingRef.current) return;
    if (!clubId || !tokenCode || fiatAmount <= 0) return;

    fetchingRef.current = true;
    setStatus('loading');
    setError(null);
    setSeconds(0);
    clearTimer();

    try {
      const res = await fetch(`/api/donations/${encodeURIComponent(clubId)}/crypto/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenCode, amount: fiatAmount }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to get price quote');
      }

      setQuote(data.quote);
      setStatus('ready');

      const expiresAt = new Date(data.quote.expiresAt).getTime();

      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setSeconds(remaining);

        if (remaining === 0) {
          clearTimer();
          setStatus('expired');
          // Do NOT auto-fetch here — same reasoning as useCryptoQuote:
          // auto-refetching on expiry risks a loop. The Refresh button
          // lets the supporter get a new quote when ready.
        }
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Could not fetch price quote');
      setStatus('error');
      setQuote(null);
      setSeconds(0);
    } finally {
      fetchingRef.current = false;
    }
  }, [clubId, tokenCode, fiatAmount]);

  useEffect(() => {
    if (!enabled || !tokenCode || fiatAmount <= 0) {
      clearTimer();
      setQuote(null);
      setStatus('idle');
      setSeconds(0);
      lastFetchRef.current = { clubId: '', fiatAmount: 0, tokenCode: null };
      return;
    }

    const last = lastFetchRef.current;
    const inputsChanged =
      last.clubId !== clubId ||
      last.fiatAmount !== fiatAmount ||
      last.tokenCode !== tokenCode;

    if (!inputsChanged && status !== 'idle') return;

    lastFetchRef.current = { clubId, fiatAmount, tokenCode };
    fetchQuote();

    return () => clearTimer();
    // Same deliberate omission as useCryptoQuote: fetchQuote/status
    // excluded from deps to avoid loops. fetchQuote is stable via
    // useCallback; status would cause infinite re-runs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tokenCode, fiatAmount, clubId]);

  useEffect(() => () => clearTimer(), []);

  const refresh = useCallback(() => {
    lastFetchRef.current = { clubId: '', fiatAmount: 0, tokenCode: null };
    setStatus('idle');
    setQuote(null);
    setSeconds(0);
    clearTimer();
    fetchQuote();
  }, [fetchQuote]);

  return {
    quote,
    status,
    error,
    secondsLeft,
    refresh,
    isExpired: status === 'expired',
  };
}