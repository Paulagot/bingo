import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Loader, RefreshCw, Wallet } from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';
import {
  SOLANA_TOKENS,
  SOLANA_TOKEN_LIST,
  type SolanaTokenCode,
} from '../../chains/solana/config/solanaTokenConfig';
import {
  useSolanaDirectDonation,
  type SolanaDirectDonationResult,
} from '../Quiz/joinroom/crypto/useSolanaDirectDonation';

interface Quote {
  fiatAmount: number;
  fiatCurrency: string;
  tokenCode: string;
  tokenAmount: number;
  rawAmount: string;
  pricePerToken: number;
  quotedAt: string;
  expiresAt: string;
}

interface Props {
  roomId: string;
  contributionId: string;
  recipientWallet: string;
  fiatAmount: number;
  fiatCurrency: string;
  onSuccess: () => void;
}

type Status = 'idle' | 'connecting' | 'paying' | 'confirming' | 'success';

export default function SponsoredCryptoPaymentStep({
  roomId,
  contributionId,
  recipientWallet,
  fiatAmount,
  fiatCurrency,
  onSuccess,
}: Props) {
  const { open } = useAppKit();
  const [selectedToken, setSelectedToken] = useState<SolanaTokenCode>('SOL');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const { sendDonation, isWalletConnected, publicKey } = useSolanaDirectDonation({
    cluster: 'mainnet',
  });

  const loadQuote = useCallback(async () => {
    setQuoteLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sponsored-activity-public/${roomId}/crypto/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: selectedToken, amount: fiatAmount }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Could not generate a crypto quote.');
      setQuote(data.quote);
    } catch (err) {
      setQuote(null);
      setError((err as Error).message);
    } finally {
      setQuoteLoading(false);
    }
  }, [fiatAmount, roomId, selectedToken]);

  useEffect(() => {
    if (status === 'idle') void loadQuote();
  }, [loadQuote, status]);

  useEffect(() => {
    if (!quote) {
      setSecondsLeft(0);
      return;
    }
    const update = () => {
      setSecondsLeft(Math.max(0, Math.floor((new Date(quote.expiresAt).getTime() - Date.now()) / 1000)));
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => window.clearInterval(id);
  }, [quote]);

  const handleConnect = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);
      await open({ view: 'Connect' });
      setStatus('idle');
    } catch (err) {
      setStatus('idle');
      setError((err as Error).message || 'Could not connect wallet.');
    }
  }, [open]);

  const handlePay = useCallback(async () => {
    try {
      setError(null);
      if (!quote || secondsLeft <= 0) throw new Error('The quote expired. Refresh it and try again.');
      if (!isWalletConnected || !publicKey) {
        await handleConnect();
        return;
      }
      setStatus('paying');
      const token = SOLANA_TOKENS[selectedToken];
      const displayAmount = quote.tokenAmount.toFixed(token.decimals);
      const result: SolanaDirectDonationResult = await sendDonation({
        recipientWalletAddress: recipientWallet,
        tokenCode: selectedToken,
        displayAmount,
      });
      if (!result.success) {
        setStatus('idle');
        setError(result.error);
        return;
      }
      setStatus('confirming');
      const res = await fetch(`/api/sponsored-activity-public/${roomId}/crypto/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contributionId,
          network: result.network,
          txHash: result.txHash,
          senderWallet: result.fromWallet,
          recipientWallet: result.toWallet,
          tokenCode: result.tokenCode,
          tokenMint: result.tokenMint,
          rawAmount: result.rawAmount,
          displayAmount: result.displayAmount,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Your payment was sent but could not yet be verified.');
      }
      setStatus('success');
      onSuccess();
    } catch (err) {
      setStatus('idle');
      setError((err as Error).message || 'Crypto payment failed.');
    }
  }, [contributionId, handleConnect, isWalletConnected, onSuccess, publicKey, quote, recipientWallet, roomId, secondsLeft, selectedToken, sendDonation]);

  const label = useMemo(() => {
    if (status === 'connecting') return 'Connecting wallet…';
    if (status === 'paying') return 'Confirm in wallet…';
    if (status === 'confirming') return 'Verifying payment…';
    if (status === 'success') return 'Payment confirmed';
    if (!isWalletConnected) return 'Connect wallet and pay';
    return quote ? `Pay ${quote.tokenAmount.toFixed(selectedToken === 'BONK' || selectedToken === 'MEW' ? 0 : 6)} ${selectedToken}` : `Pay with ${selectedToken}`;
  }, [isWalletConnected, quote, selectedToken, status]);

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-center">
        <CheckCircle className="mx-auto mb-2 h-9 w-9 text-green-600" />
        <h3 className="font-semibold text-green-900">Sponsorship confirmed</h3>
        <p className="mt-1 text-sm text-green-700">Thank you for supporting this activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#e3ded4] bg-[#f6f1e8] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#157f85]">Sponsorship total</p>
        <p className="mt-1 text-2xl font-bold text-[#071a44]">{fiatCurrency} {fiatAmount.toFixed(2)}</p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-gray-800">Choose a Solana token</label>
        <select
          value={selectedToken}
          disabled={status !== 'idle'}
          onChange={(e) => setSelectedToken(e.target.value as SolanaTokenCode)}
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3"
        >
          {SOLANA_TOKEN_LIST.filter(Boolean).map((code) => {
            const token = SOLANA_TOKENS[code];
            if (!token) return null;
            return <option key={code} value={code}>{token.name} ({code})</option>;
          })}
        </select>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        {quoteLoading ? (
          <div className="flex items-center gap-2 text-sm text-gray-600"><Loader className="h-4 w-4 animate-spin" /> Loading quote…</div>
        ) : quote ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Amount to send</span>
              <strong>{quote.tokenAmount.toFixed(selectedToken === 'BONK' || selectedToken === 'MEW' ? 0 : 6)} {selectedToken}</strong>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Quote expires</span>
              <span>{secondsLeft}s</span>
            </div>
          </div>
        ) : null}
      </div>

      {error && (
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void loadQuote()}
          disabled={quoteLoading || status !== 'idle'}
          className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </button>
        <button
          type="button"
          onClick={() => void handlePay()}
          disabled={status !== 'idle' || !quote || secondsLeft <= 0}
          className="flex flex-1 items-center justify-center rounded-xl bg-[#157f85] px-4 py-3 font-semibold text-white disabled:opacity-50"
        >
          {status !== 'idle' ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
          {label}
        </button>
      </div>
    </div>
  );
}
