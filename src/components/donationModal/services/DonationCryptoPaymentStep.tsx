// src/components/donationModal/DonationCryptoPaymentStep.tsx
//
// The wallet-connect + quote + pay + confirm logic, extracted from
// CryptoDonationCheckoutPage.tsx's CryptoCheckoutInner so it can be
// rendered TWO ways:
//
//   1. Inside CryptoDonationCheckoutPage.tsx (unchanged) - a real
//      top-level tab, used on mobile/uncertain devices, where the
//      wallet app-switch-and-return needs a real browsing context.
//
//   2. Inline inside DonationModal.tsx (new) - rendered directly in
//      the modal on desktop, no new tab at all, since desktop wallet
//      connection (extension, or QR scanned by a separate device)
//      never needs the app-switch-and-return that makes iframe
//      nesting risky in the first place.
//
// Deliberately does NOT touch window.opener, postMessage, or
// window.close() - that's the standalone page's own concern (it has a
// real second window to notify and close). This component just calls
// onSuccess(confirmData) and lets its caller decide what "success"
// means in its own context.
//
// Assumes it's already wrapped in AppKit/Wagmi/QueryClient providers by
// its caller - CryptoDonationCheckoutPage.tsx keeps its existing manual
// provider loading; DonationModal.tsx wraps this in <Web3Provider force>,
// reusing the same generic provider component TicketPurchaseFlow's
// crypto step already uses, rather than a third copy of that loading
// logic.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CheckCircle, Clock, ExternalLink, Loader, RefreshCw, Wallet,
} from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';

import {
  SOLANA_TOKENS,
  SOLANA_TOKEN_LIST,
  type SolanaTokenCode,
} from '../../../chains/solana/config/solanaTokenConfig';
import {
  useSolanaDirectDonation,
  type SolanaDirectDonationResult,
} from '../../Quiz/joinroom/crypto/useSolanaDirectDonation';
import { useDonationCryptoQuote } from '../../../pages/donations/useDonationCryptoQuote';

const ISO_TO_SYMBOL: Record<string, string> = {
  EUR: '€', GBP: '£', USD: '$', CAD: 'CA$', NGN: '₦',
};
function symbolFor(iso: string): string {
  return ISO_TO_SYMBOL[iso] ?? iso;
}

const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};
const countdownColor = (seconds: number) => {
  if (seconds > 60) return '#157f85';
  if (seconds > 30) return '#b54708';
  return '#dc2626';
};
const shortWallet = (address: string) =>
  address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-6)}`;

type PayStatus = 'idle' | 'connecting' | 'paying' | 'confirming' | 'success';

export interface DonationCryptoConfirmResponse {
  ok: boolean;
  error?: string;
  donationId?: string;
  txHash?: string;
  network?: string;
  donationAmount?: number;
  donationCurrency?: string;
  convertedDisplayFiat?: number | null;
}

interface DonationCryptoPaymentStepProps {
  clubId: string;
  donationId: string;
  recipientWallet: string;
  fiatAmount: number;
  fiatCurrency: string;
  onSuccess: (result: DonationCryptoConfirmResponse) => void;
}

export default function DonationCryptoPaymentStep({
  clubId,
  donationId,
  recipientWallet,
  fiatAmount,
  fiatCurrency,
  onSuccess,
}: DonationCryptoPaymentStepProps) {
  const { open } = useAppKit();

  const [selectedToken, setSelectedToken] = useState<SolanaTokenCode>('SOL');
  const [status, setStatus] = useState<PayStatus>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<SolanaDirectDonationResult | null>(null);
  const [confirmData, setConfirmData] = useState<DonationCryptoConfirmResponse | null>(null);

  const isBusy = status !== 'idle';
  const isSuccess = status === 'success';

  const { sendDonation, isWalletConnected, publicKey } = useSolanaDirectDonation({
    cluster: 'mainnet',
  });

  const { quote, status: quoteStatus, error: quoteError, secondsLeft, refresh, isExpired } =
    useDonationCryptoQuote({
      clubId,
      fiatAmount,
      tokenCode: selectedToken,
      enabled: !isBusy && fiatAmount > 0,
    });

  useEffect(() => {
    setActionError(null);
  }, [selectedToken]);

  const handleConnectWallet = useCallback(async () => {
    try {
      setActionError(null);
      setStatus('connecting');
      await open({ view: 'Connect' });
      setStatus('idle');
    } catch (err: any) {
      setStatus('idle');
      setActionError(err?.message || 'Failed to connect wallet.');
    }
  }, [open]);

  const confirmOnBackend = useCallback(async (
    result: Extract<SolanaDirectDonationResult, { success: true }>,
  ): Promise<DonationCryptoConfirmResponse> => {
    const res = await fetch(`/api/donations/${clubId}/crypto/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        donationId,
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

    let data: DonationCryptoConfirmResponse;
    try {
      data = await res.json();
    } catch {
      data = { ok: false, error: 'Server returned an invalid response while confirming the donation.' };
    }

    if (!res.ok || !data.ok) {
      throw new Error(
        data?.error ||
        'Your transaction was sent, but could not be verified yet. Please contact the club with your transaction signature.'
      );
    }
    return data;
  }, [clubId, donationId]);

  const handlePay = useCallback(async () => {
    try {
      setActionError(null);

      if (!recipientWallet) {
        setActionError('This club has not configured a Solana wallet address.');
        return;
      }
      if (!quote || isExpired) {
        setActionError('Price quote has expired. Please refresh and try again.');
        return;
      }
      if (!isWalletConnected || !publicKey) {
        await handleConnectWallet();
        return;
      }

      setStatus('paying');

      const token = SOLANA_TOKENS[selectedToken];
      const safeDisplayAmount = quote.tokenAmount.toFixed(token.decimals);

      const result = await sendDonation({
        recipientWalletAddress: recipientWallet,
        tokenCode: selectedToken,
        displayAmount: safeDisplayAmount,
      });

      setTxResult(result);

      if (!result.success) {
        setStatus('idle');
        setActionError(result.error);
        return;
      }

      setStatus('confirming');
      const confirmed = await confirmOnBackend(result);
      setConfirmData(confirmed);
      setStatus('success');
      // Caller decides what "success" means in its own context - a
      // real page closes its tab; a modal shows a thank-you and
      // auto-closes. No opener/postMessage logic here at all.
      onSuccess(confirmed);
    } catch (err: any) {
      console.error('[DonationCryptoPaymentStep] payment failed:', err);
      setStatus('idle');
      setActionError(err?.message || 'Crypto donation failed.');
    }
  }, [recipientWallet, quote, isExpired, isWalletConnected, publicKey, handleConnectWallet, sendDonation, selectedToken, confirmOnBackend, onSuccess]);

  const buttonLabel = useMemo(() => {
    if (status === 'connecting') return 'Connecting Wallet…';
    if (status === 'paying') return 'Confirm in Wallet…';
    if (status === 'confirming') return 'Verifying Payment…';
    if (status === 'success') return 'Payment Confirmed ✓';
    if (!isWalletConnected) return 'Connect Wallet & Pay';
    return quote
      ? `Pay ${quote.tokenAmount.toFixed(selectedToken === 'BONK' || selectedToken === 'MEW' ? 0 : 6)} ${selectedToken}`
      : `Pay with ${selectedToken}`;
  }, [status, isWalletConnected, quote, selectedToken]);

  const payDisabled = isBusy || !recipientWallet || !quote || isExpired || quoteStatus === 'loading';

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4" style={{ borderColor: '#dce1df', background: '#f6f1e8' }}>
        <div className="text-xs font-semibold" style={{ color: '#157f85' }}>Total to donate</div>
        <div className="mt-1 text-2xl font-bold" style={{ color: '#102532' }}>
          {symbolFor(fiatCurrency)}{fiatAmount.toFixed(2)} {fiatCurrency}
        </div>
      </div>

      <div className="rounded-xl border p-4" style={{ borderColor: '#dce1df' }}>
        <div className="mb-3 text-sm font-semibold" style={{ color: '#102532' }}>Pay with</div>
        <div className="grid grid-cols-3 gap-2">
          {SOLANA_TOKEN_LIST.filter(Boolean).map((code) => {
            const token = SOLANA_TOKENS[code];
            if (!token) return null;
            const active = selectedToken === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => !isBusy && setSelectedToken(code)}
                disabled={isBusy}
                className="rounded-lg border p-2 text-center disabled:opacity-50"
                style={active ? { borderColor: '#157f85', background: '#e6f4f3' } : { borderColor: '#dce1df' }}
              >
                <img src={token.logoUrl} alt={token.code} className="mx-auto h-6 w-6 rounded-full" />
                <div className="mt-1 text-xs font-semibold" style={{ color: '#102532' }}>{token.code}</div>
              </button>
            );
          })}
        </div>
      </div>

      {isWalletConnected && publicKey && (
        <div className="rounded-xl border p-3" style={{ borderColor: '#bfe3cf', background: '#eaf7ef' }}>
          <div className="text-xs font-medium" style={{ color: '#15803d' }}>Wallet connected</div>
          <div className="mt-0.5 break-all font-mono text-xs" style={{ color: '#166534' }}>
            {publicKey.toBase58()}
          </div>
        </div>
      )}

      <div className="rounded-xl border p-4" style={{ borderColor: '#dce1df', background: '#fafafa' }}>
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-semibold" style={{ color: '#102532' }}>Price quote</div>
          {quoteStatus === 'ready' && secondsLeft > 0 && (
            <div className="flex items-center gap-1 text-xs font-mono font-semibold" style={{ color: countdownColor(secondsLeft) }}>
              <Clock className="h-3 w-3" /> {formatCountdown(secondsLeft)}
            </div>
          )}
          {(isExpired || quoteStatus === 'error') && !isBusy && (
            <button type="button" onClick={refresh} className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold" style={{ background: '#e6f4f3', color: '#157f85' }}>
              <RefreshCw className="h-3 w-3" /> Refresh
            </button>
          )}
        </div>

        {quoteStatus === 'loading' && (
          <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: '#52636f' }}>
            <Loader className="h-4 w-4 animate-spin" /> Getting live price…
          </div>
        )}
        {quoteStatus === 'ready' && quote && !isExpired && (
          <div className="mt-3">
            <div className="text-2xl font-bold" style={{ color: '#102532' }}>
              {quote.tokenAmount.toFixed(selectedToken === 'BONK' || selectedToken === 'MEW' ? 0 : 6)}{' '}
              <span className="text-lg">{selectedToken}</span>
            </div>
            <div className="mt-1 text-xs" style={{ color: '#52636f' }}>
              1 {selectedToken} = {symbolFor(quote.fiatCurrency)}{quote.pricePerToken.toFixed(4)}
            </div>
          </div>
        )}
        {isExpired && (
          <div className="mt-3 flex items-center gap-2 text-sm" style={{ color: '#b54708' }}>
            <AlertCircle className="h-4 w-4" /> Quote expired - tap Refresh
          </div>
        )}
        {quoteStatus === 'error' && quoteError && (
          <div className="mt-3 text-sm" style={{ color: '#dc2626' }}>{quoteError}</div>
        )}
      </div>

      <div className="rounded-xl border p-3 text-xs" style={{ borderColor: '#dce1df', color: '#52636f' }}>
        Paying to: <span className="font-mono font-semibold" style={{ color: '#102532' }}>{shortWallet(recipientWallet)}</span>
      </div>

      {actionError && (
        <div className="flex items-start gap-2 rounded-xl border p-3" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#dc2626' }} />
          <p className="text-sm" style={{ color: '#991b1b' }}>{actionError}</p>
        </div>
      )}

      {isSuccess && txResult?.success && confirmData && (
        <div className="rounded-xl border p-4" style={{ borderColor: '#bfe3cf', background: '#eaf7ef' }}>
          <div className="flex items-start gap-2">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#15803d' }} />
            <div className="min-w-0">
              <div className="font-semibold" style={{ color: '#102532' }}>Thank you for your donation</div>
              <div className="mt-1 break-all font-mono text-xs" style={{ color: '#166534' }}>{txResult.txHash}</div>
              <div className="mt-2 text-sm" style={{ color: '#102532' }}>
                Recorded as <strong>{confirmData.donationCurrency} {Number(confirmData.donationAmount).toFixed(2)}</strong>
              </div>
              {txResult.explorerUrl && (
                <a href={txResult.explorerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center text-xs font-medium underline" style={{ color: '#166534' }}>
                  View on Explorer <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {!isSuccess && (
        <button
          type="button"
          onClick={handlePay}
          disabled={payDisabled}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: '#157f85' }}
        >
          {isBusy ? <Loader className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {buttonLabel}
        </button>
      )}

      <div className="rounded-xl border p-3 text-xs" style={{ borderColor: '#fde68a', background: '#fffbeb', color: '#92400e' }}>
        Your wallet will ask you to confirm before sending. Always verify the token, amount and receiving address before approving.
      </div>
    </div>
  );
}