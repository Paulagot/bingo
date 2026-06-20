// src/pages/donations/CryptoDonationCheckoutPage.tsx
//
// Rendered at /donate/:clubId/crypto/:donationId — a full, top-level
// browser tab, NOT iframe content. Opened via window.open() from
// DonateEmbedPage.tsx's handleDonate(), exactly the same pattern
// already used for Stripe/SumUp ('_blank', no 'noopener' — see the
// comment in DonateEmbedPage.tsx explaining why window.opener needs to
// stay intact so the success postMessage relay works).
//
// WHY A NEW TAB AND NOT INLINE IN THE IFRAME:
// AppKit's connect modal was confirmed working inside a genuinely
// cross-origin iframe for injected wallets (MetaMask/Phantom
// extensions). What was deliberately NOT verified is WalletConnect's
// mobile deep-link return inside that same iframe nesting (club page ->
// iframe -> modal) — and donation buttons likely see significant mobile
// traffic. Rather than ship on an untested assumption, crypto follows
// the same "open a real tab" pattern Stripe already uses, putting the
// wallet flow in the same top-level browser context every WalletConnect
// integration is normally tested against. This sidesteps the open
// question rather than resolving it — a deliberate, acknowledged
// tradeoff. Mobile WalletConnect-in-iframe testing remains parked, not
// done.
//
// REUSE NOTE — this page is built almost entirely from existing,
// working pieces rather than new logic:
//   - useSolanaDirectDonation (src/components/Quiz/joinroom/crypto/) —
//     the EXACT hook CryptoDonationStep.tsx already uses to build and
//     send the on-chain transfer. Reused unmodified; it has zero room/
//     player coupling, it just takes recipientWalletAddress/tokenCode/
//     displayAmount and returns a txHash.
//   - useDonationCryptoQuote — a donation-flavored sibling of
//     useCryptoQuote.ts (same countdown/dedup/expiry logic, posts to
//     the donation quote endpoint instead of the quiz one).
//   - The confirm POST body below mirrors confirmCryptoDonationOnBackend
//     in CryptoDonationStep.tsx field-for-field, swapping
//     roomId/playerId for donationId.
//
// FLOW: connect + send via useSolanaDirectDonation -> POST /confirm ->
// success -> postMessage success back to window.opener (the
// DonateEmbedPage iframe) -> that iframe relays to ITS parent (the
// club's page) so donate.js can close the modal -> this tab closes
// itself after a short pause.
//
// TEMPORARY DIAGNOSTIC LOGGING (search [FR-DEBUG]) — added to find why
// the modal closes on localhost but not staging. This page's success
// effect is hop 1 of a 3-hop relay chain (this tab -> iframe -> club
// page -> donate.js). Logging here confirms whether hop 1 succeeds,
// independent of later hops.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AlertCircle, CheckCircle, Clock, ExternalLink, Heart, Loader, RefreshCw, Wallet,
} from 'lucide-react';
import { useAppKit } from '@reown/appkit/react';

import {
  SOLANA_TOKENS,
  SOLANA_TOKEN_LIST,
  type SolanaTokenCode,
} from '../../chains/solana/config/solanaTokenConfig';
import {
  useSolanaDirectDonation,
  type SolanaDirectDonationResult,
} from '../../components/Quiz/joinroom/crypto/useSolanaDirectDonation';
import { useDonationCryptoQuote } from './useDonationCryptoQuote';

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

interface ConfirmResponse {
  ok: boolean;
  error?: string;
  donationId?: string;
  txHash?: string;
  network?: string;
  donationAmount?: number;
  donationCurrency?: string;
  convertedDisplayFiat?: number | null;
}

export default function CryptoDonationCheckoutPage() {
  const [providers, setProviders] = useState<{
    AppKitProvider: any;
    WagmiProvider: any;
    QueryClientProvider: any;
    queryClient: any;
    wagmiConfig: any;
  } | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { initAppKit } = await import('../../web3Init');
        await initAppKit();

        const [wagmiModule, queryModule, appKitModule, configModule] = await Promise.all([
          import('wagmi'),
          import('@tanstack/react-query'),
          import('@reown/appkit/react'),
          import('../../config'),
        ]);

        setProviders({
          AppKitProvider: appKitModule.AppKitProvider,
          WagmiProvider: wagmiModule.WagmiProvider,
          QueryClientProvider: queryModule.QueryClientProvider,
          queryClient: new queryModule.QueryClient(),
          wagmiConfig: configModule.wagmiConfig,
        });
      } catch (e: any) {
        setInitError(e?.message || 'Could not initialize wallet connection. Please refresh and try again.');
      }
    })();
  }, []);

  if (initError) {
    return (
      <Shell>
        <Centered>
          <AlertCircle className="h-7 w-7" style={{ color: '#b54708' }} />
          <p className="text-sm font-semibold" style={{ color: '#102532' }}>Something went wrong</p>
          <p className="text-xs" style={{ color: '#52636f' }}>{initError}</p>
        </Centered>
      </Shell>
    );
  }

  if (!providers) {
    return (
      <Shell>
        <Centered>
          <Loader className="h-6 w-6 animate-spin" style={{ color: '#157f85' }} />
          <p className="text-sm" style={{ color: '#52636f' }}>Loading…</p>
        </Centered>
      </Shell>
    );
  }

  const { AppKitProvider, WagmiProvider, QueryClientProvider, queryClient, wagmiConfig } = providers;

  return (
    <AppKitProvider>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <CryptoCheckoutInner />
        </WagmiProvider>
      </QueryClientProvider>
    </AppKitProvider>
  );
}

function CryptoCheckoutInner() {
  const { clubId, donationId } = useParams<{ clubId: string; donationId: string }>();
  const { open } = useAppKit();

  const [pageError, setPageError] = useState<string | null>(null);
  const [recipientWallet, setRecipientWallet] = useState<string | null>(null);
  const [fiatAmount, setFiatAmount] = useState<number | null>(null);
  const [fiatCurrency, setFiatCurrency] = useState<string>('EUR');
  const [selectedToken, setSelectedToken] = useState<SolanaTokenCode>('SOL');
  const [status, setStatus] = useState<PayStatus>('idle');
  const [actionError, setActionError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<SolanaDirectDonationResult | null>(null);
  const [confirmData, setConfirmData] = useState<ConfirmResponse | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const wallet = params.get('wallet');
    const amt = params.get('amount');
    const currency = params.get('currency');

    if (!clubId || !donationId || !wallet || !amt) {
      setPageError('This checkout link is missing required information.');
      return;
    }
    setRecipientWallet(wallet);
    setFiatAmount(Number(amt));
    if (currency) setFiatCurrency(currency);
  }, [clubId, donationId]);

  const isBusy = status !== 'idle';
  const isSuccess = status === 'success';

  const { sendDonation, isWalletConnected, publicKey } = useSolanaDirectDonation({
    cluster: 'mainnet',
  });

  const { quote, status: quoteStatus, error: quoteError, secondsLeft, refresh, isExpired } =
    useDonationCryptoQuote({
      clubId: clubId || '',
      fiatAmount: fiatAmount ?? 0,
      tokenCode: selectedToken,
      enabled: !isBusy && !!fiatAmount && fiatAmount > 0,
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
  ): Promise<ConfirmResponse> => {
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

    let data: ConfirmResponse;
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

      const result = await sendDonation({
        recipientWalletAddress: recipientWallet,
        tokenCode: selectedToken,
        displayAmount: quote.tokenAmount,
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
    } catch (err: any) {
      console.error('[CryptoDonationCheckout] payment failed:', err);
      setStatus('idle');
      setActionError(err?.message || 'Crypto donation failed.');
    }
  }, [recipientWallet, quote, isExpired, isWalletConnected, publicKey, handleConnectWallet, sendDonation, selectedToken, confirmOnBackend]);

  // ── Success side effect: relay back to the opener (the
  // DonateEmbedPage iframe), mirroring that page's own success effect.
  //
  // [FR-DEBUG] See file header — this is hop 1 of the 3-hop relay
  // chain. Logging confirms whether THIS hop succeeds, independent of
  // whether the iframe's relay or donate.js's listener do.
  useEffect(() => {
    if (status !== 'success') return undefined;

    const hasOpener = !!window.opener;
    console.log('[FR-DEBUG CryptoCheckout success-effect] status=success. hasOpener=', hasOpener, 'this window.location=', window.location.href);

    if (hasOpener) {
      try {
        window.opener.postMessage({ type: 'FUNDRAISELY_DONATION_SUCCESS', clubId }, '*');
        console.log('[FR-DEBUG CryptoCheckout success-effect] postMessage to window.opener SUCCEEDED (no throw). clubId=', clubId);
      } catch (e) {
        console.error('[FR-DEBUG CryptoCheckout success-effect] postMessage to window.opener THREW:', e);
      }
      const t = setTimeout(() => {
        console.log('[FR-DEBUG CryptoCheckout success-effect] closing this tab now.');
        try { window.close(); } catch (e) { console.error('[FR-DEBUG CryptoCheckout success-effect] window.close() threw:', e); }
      }, 2500);
      return () => clearTimeout(t);
    }
    console.warn('[FR-DEBUG CryptoCheckout success-effect] hasOpener is FALSE — no opener reference at all, so nothing can be relayed back. This tab will just sit here with no way to notify the modal.');
    return undefined;
  }, [status, clubId]);

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

  if (pageError) {
    return (
      <Shell>
        <Centered>
          <AlertCircle className="h-7 w-7" style={{ color: '#b54708' }} />
          <p className="text-sm font-semibold" style={{ color: '#102532' }}>Something went wrong</p>
          <p className="text-xs" style={{ color: '#52636f' }}>{pageError}</p>
        </Centered>
      </Shell>
    );
  }

  if (fiatAmount === null || !recipientWallet) {
    return (
      <Shell>
        <Centered>
          <Loader className="h-6 w-6 animate-spin" style={{ color: '#157f85' }} />
          <p className="text-sm" style={{ color: '#52636f' }}>Loading…</p>
        </Centered>
      </Shell>
    );
  }

  return (
    <Shell>
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
              <AlertCircle className="h-4 w-4" /> Quote expired — tap Refresh
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
                <p className="mt-2 text-xs" style={{ color: '#52636f' }}>You can close this tab.</p>
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
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-6" style={{ background: '#f6f1e8' }}>
      <div className="mx-auto w-full max-w-sm rounded-xl p-6" style={{ background: '#ffffff', border: '1px solid #dce1df', fontFamily: 'Arial, sans-serif' }}>
        <div className="mb-4 flex items-center gap-2">
          <Heart className="h-4 w-4" style={{ color: '#157f85' }} fill="#157f85" />
          <h1 className="text-sm font-bold" style={{ color: '#102532' }}>Crypto donation</h1>
        </div>
        {children}
      </div>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col items-center gap-3 py-8 text-center">{children}</div>;
}