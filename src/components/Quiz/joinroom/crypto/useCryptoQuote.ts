// src/components/Quiz/joinroom/crypto/useCryptoQuote.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SolanaTokenCode } from '../../../../chains/solana/config/solanaTokenConfig';

export interface CryptoQuote {
  fiatAmount:    number;
  fiatCurrency:  string;
  tokenCode:     SolanaTokenCode;
  tokenAmount:   number;
  rawAmount:     string;
  pricePerToken: number;
  quotedAt:      string;
  expiresAt:     string;
}

export type QuoteStatus = 'idle' | 'loading' | 'ready' | 'expired' | 'error';

interface UseCryptoQuoteParams {
  roomId:      string;
  fiatAmount:  number;
  tokenCode:   SolanaTokenCode | null;
  enabled:     boolean;
}

interface UseCryptoQuoteResult {
  quote:       CryptoQuote | null;
  status:      QuoteStatus;
  error:       string | null;
  secondsLeft: number;
  refresh:     () => void;
  isExpired:   boolean;
}

export function useCryptoQuote({
  roomId,
  fiatAmount,
  tokenCode,
  enabled,
}: UseCryptoQuoteParams): UseCryptoQuoteResult {
  const [quote, setQuote]         = useState<CryptoQuote | null>(null);
  const [status, setStatus]       = useState<QuoteStatus>('idle');
  const [error, setError]         = useState<string | null>(null);
  const [secondsLeft, setSeconds] = useState(0);

  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const fetchingRef  = useRef(false);
  // Track last fetched inputs to avoid re-fetching on every render
  const lastFetchRef = useRef<{ roomId: string; fiatAmount: number; tokenCode: string | null }>({
    roomId: '', fiatAmount: 0, tokenCode: null,
  });

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const fetchQuote = useCallback(async () => {
    if (fetchingRef.current) return;
    if (!roomId || !tokenCode || fiatAmount <= 0) return;

    fetchingRef.current = true;
    setStatus('loading');
    setError(null);
    setSeconds(0);
    clearTimer();

    try {
      const url =
        `/api/quiz/crypto-quote` +
        `?roomId=${encodeURIComponent(roomId)}` +
        `&token=${encodeURIComponent(tokenCode)}` +
        `&amount=${encodeURIComponent(fiatAmount)}`;

      const res  = await fetch(url);
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to get price quote');
      }

      setQuote(data.quote);
      setStatus('ready');

      // Start the expiry countdown
      const expiresAt = new Date(data.quote.expiresAt).getTime();

      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
        setSeconds(remaining);

        if (remaining === 0) {
          clearTimer();
          setStatus('expired');
          // Do NOT auto-fetch here — that causes the loop.
          // The Refresh button lets the user get a new quote when ready.
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
  }, [roomId, tokenCode, fiatAmount]);

  // Fetch when enabled and inputs are present.
  // Only re-fetch when inputs actually change — not on every render or timer tick.
  useEffect(() => {
    if (!enabled || !tokenCode || fiatAmount <= 0) {
      clearTimer();
      setQuote(null);
      setStatus('idle');
      setSeconds(0);
      lastFetchRef.current = { roomId: '', fiatAmount: 0, tokenCode: null };
      return;
    }

    const last = lastFetchRef.current;
    const inputsChanged =
      last.roomId !== roomId ||
      last.fiatAmount !== fiatAmount ||
      last.tokenCode !== tokenCode;

    // Only fetch if inputs changed or we haven't fetched yet (status idle)
    if (!inputsChanged && status !== 'idle') return;

    lastFetchRef.current = { roomId, fiatAmount, tokenCode };
    fetchQuote();

    return () => clearTimer();
  // We intentionally exclude fetchQuote and status from deps to avoid loops.
  // fetchQuote is stable via useCallback; status would cause infinite re-runs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, tokenCode, fiatAmount, roomId]);

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), []);

  const refresh = useCallback(() => {
    // Reset lastFetchRef so the effect treats this as a fresh fetch
    lastFetchRef.current = { roomId: '', fiatAmount: 0, tokenCode: null };
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