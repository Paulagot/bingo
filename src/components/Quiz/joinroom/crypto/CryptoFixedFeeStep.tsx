// src/components/Quiz/joinroom/crypto/CryptoFixedFeeStep.tsx

import React, { useMemo, useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  Clock,
  ExternalLink,
  Loader,
  RefreshCw,
  Wallet,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import { useAppKit, useDisconnect } from '@reown/appkit/react';

import { StepLayout } from '../../shared/StepWrapper';
import { useQuizSocket } from '../../sockets/QuizSocketProvider';

import {
  SOLANA_TOKENS,
  SOLANA_TOKEN_LIST,
  type SolanaTokenCode,
} from '../../../../chains/solana/config/solanaTokenConfig';

import {
  useSolanaDirectDonation,
  type SolanaDirectDonationResult,
} from './useSolanaDirectDonation';

import { useCryptoQuote } from './useCryptoQuote';
import type { ClubPaymentMethod } from '../../shared/PaymentMethodSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CryptoFixedFeeMode = 'walkin' | 'ticket';

interface BaseProps {
  roomId:          string;
  selectedMethod:  ClubPaymentMethod;
  totalFiatAmount: number;
  entryFeeAmount:  number;
  extrasAmount:    number;
  selectedExtras:  string[];
  fiatCurrency:    string;
  currencySymbol:  string;
  solanaCluster?:        'mainnet' | 'devnet';
  onBack:                () => void;
  onSuccess?:            (result: FixedFeeConfirmResult) => void;
  /**
   * When true, skips the internal `join_quiz_room` socket emit.
   * Use for non-quiz games (e.g. elimination) where the caller handles joining.
   */
  skipInternalJoin?:     boolean;
  /**
   * When true, skips the internal navigate to /quiz/game/...
   * Use for non-quiz games where the caller handles navigation via onSuccess.
   */
  skipInternalNavigate?: boolean;
  /**
   * Override the backend confirm endpoint.
   * Used by CampaignSupportPage so campaign orders go to the campaign-specific
   * confirm route instead of /api/quiz/tickets/crypto-fixed-fee/confirm.
   * When not provided, the default quiz ticket or walkin route is used.
   */
  confirmEndpoint?: string;
}

interface WalkinProps extends BaseProps {
  mode:       'walkin';
  playerName: string;
}

interface TicketProps extends BaseProps {
  mode:            'ticket';
  purchaserName:   string;
  purchaserEmail:  string;
  purchaserPhone?: string;
  playerName:      string;
}

export type CryptoFixedFeeStepProps = WalkinProps | TicketProps;

export interface FixedFeeConfirmResult {
  txHash:             string;
  ledgerAmount:       number;
  ledgerCurrency:     string;
  web3TransactionId?: string | number | null;
  ticketId?:          string;
  joinToken?:         string;
  playerId?:          string;
}

type PayStatus = 'idle' | 'connecting' | 'paying' | 'confirming' | 'joining' | 'success';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const shortWallet = (address: string) =>
  address.length <= 12 ? address : `${address.slice(0, 6)}…${address.slice(-6)}`;

const formatCountdown = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const countdownColor = (seconds: number) => {
  if (seconds > 60) return 'text-green-700';
  if (seconds > 30) return 'text-amber-600';
  return 'text-red-600';
};

// ─── Component ────────────────────────────────────────────────────────────────

export const CryptoFixedFeeStep: React.FC<CryptoFixedFeeStepProps> = (props) => {
  const {
    roomId, selectedMethod, totalFiatAmount, entryFeeAmount,
    extrasAmount, selectedExtras, fiatCurrency, currencySymbol,
    solanaCluster = 'mainnet', onBack, onSuccess,
    skipInternalJoin = false,
    skipInternalNavigate = false,
    confirmEndpoint,
  } = props;

  const navigate   = useNavigate();
  const { socket } = useQuizSocket();
  const { open }   = useAppKit();
  const { disconnect } = useDisconnect();

  const { sendDonation, isWalletConnected, publicKey } = useSolanaDirectDonation({
    cluster: solanaCluster,
  });

  const [selectedToken, setSelectedToken] = useState<SolanaTokenCode>('SOL');
  const [status, setStatus]               = useState<PayStatus>('idle');
  const [error, setError]                 = useState<string | null>(null);
  const [txResult, setTxResult]           = useState<SolanaDirectDonationResult | null>(null);
  const [confirmData, setConfirmData]     = useState<FixedFeeConfirmResult | null>(null);

  const isBusy    = status !== 'idle';
  const isSuccess = status === 'success';

  const walletAddress = useMemo(() => {
    const cfg = selectedMethod.methodConfig || {};
    return String(cfg.walletAddress || '').trim();
  }, [selectedMethod]);

  const { quote, status: quoteStatus, error: quoteError, secondsLeft, refresh, isExpired } =
    useCryptoQuote({
      roomId,
      fiatAmount:  totalFiatAmount,
      tokenCode:   selectedToken,
      enabled:     !isBusy && totalFiatAmount > 0,
    });

  useEffect(() => {
    setError(null);
  }, [selectedToken]);

  const handleConnectWallet = async () => {
    try {
      setError(null);
      setStatus('connecting');
      await open({ view: 'Connect' });
      setStatus('idle');
    } catch (err: any) {
      setStatus('idle');
      setError(err?.message || 'Failed to connect wallet.');
    }
  };

  // ── Confirm on backend ─────────────────────────────────────────────────────

  const confirmOnBackend = async (
    result: Extract<SolanaDirectDonationResult, { success: true }>,
    playerId: string,
  ): Promise<FixedFeeConfirmResult> => {
    // Split raw amount proportionally between entry fee and extras
    const entryFraction  = totalFiatAmount > 0 ? entryFeeAmount / totalFiatAmount : 1;
    const totalRaw       = BigInt(quote!.rawAmount);
    const entryFeeRaw    = BigInt(Math.round(Number(totalRaw) * entryFraction));
    const extrasRaw      = totalRaw - entryFeeRaw;

    const isTicket = props.mode === 'ticket';
    const endpoint = confirmEndpoint ?? (
      isTicket
        ? '/api/quiz/tickets/crypto-fixed-fee/confirm'
        : '/api/quiz/crypto-fixed-fee/confirm'
    );

    const body: Record<string, unknown> = {
      roomId,
      clubPaymentMethodId:  selectedMethod.id,
      network:              result.network,
      txHash:               result.txHash,
      senderWallet:         result.fromWallet,
      recipientWallet:      result.toWallet,
      tokenCode:            result.tokenCode,
      tokenMint:            result.tokenMint,

      // Raw on-chain units split between entry and extras
      entryFeeRaw:          entryFeeRaw.toString(),
      extrasRaw:            extrasRaw.toString(),

      // Fiat amounts — what the host priced the room at
      entryFeeDisplay:      entryFeeAmount,
      extrasDisplay:        extrasAmount,

      // Crypto amounts — what was actually quoted and sent
      cryptoDisplayAmount:  quote!.tokenAmount,   // e.g. 0.034521
      cryptoRawAmount:      quote!.rawAmount,      // e.g. '34521000'

      selectedExtras,
    };

    if (isTicket) {
      const tp = props as TicketProps;
      body.purchaserName  = tp.purchaserName;
      body.purchaserEmail = tp.purchaserEmail;
      body.purchaserPhone = tp.purchaserPhone ?? null;
      body.playerName     = tp.playerName;
    } else {
      const wp = props as WalkinProps;
      body.playerId   = playerId;
      body.playerName = wp.playerName;
    }

    const res = await fetch(endpoint, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });

    let data: any;
    try { data = await res.json(); } catch {
      throw new Error('Server returned an invalid response');
    }

    if (!res.ok || !data.ok) {
      throw new Error(
        data?.error ||
        'Transaction sent but server could not verify it. Contact the host with your transaction signature.'
      );
    }

    return {
      txHash:            result.txHash,
      ledgerAmount:      data.ledgerAmount,
      ledgerCurrency:    data.ledgerCurrency,
      web3TransactionId: data.web3TransactionId ?? null,
      ticketId:          data.ticketId,
      joinToken:         data.joinToken,
      playerId,
    };
  };

  // ── Main pay handler ───────────────────────────────────────────────────────

  const handlePay = async () => {
    try {
      setError(null);

      if (!walletAddress) {
        setError('This club has not configured a Solana wallet address.');
        return;
      }

      if (!quote || isExpired) {
        setError('Price quote has expired. Please refresh and try again.');
        return;
      }

      if (!isWalletConnected || !publicKey) {
        await handleConnectWallet();
        return;
      }

      setStatus('paying');

      const result = await sendDonation({
        recipientWalletAddress: walletAddress,
        tokenCode:              selectedToken,
        displayAmount:          quote.tokenAmount,
      });

      setTxResult(result);

      if (!result.success) {
        setStatus('idle');
        setError(result.error);
        return;
      }

      setStatus('confirming');

      const playerId = props.mode === 'walkin' ? nanoid() : '';

      const confirmed = await confirmOnBackend(result, playerId);
      setConfirmData({ ...confirmed, playerId });
      setStatus('joining');

      if (props.mode === 'walkin' && !skipInternalJoin) {
        const wp = props as WalkinProps;

        socket?.emit('join_quiz_room', {
          roomId,
          user: {
            id:                    playerId,
            name:                  wp.playerName.trim(),
            paid:                  true,
            paymentMethod:         'crypto',
            paymentStatus:         'confirmed',
            paymentLedgerRecorded: true,
            paymentReference:      result.txHash,
            web3TxHash:            result.txHash,
            web3Address:           result.fromWallet,
            web3Chain:             'solana',
            web3TransactionId:     confirmed.web3TransactionId ?? null,
            clubPaymentMethodId:   selectedMethod.id,
            cryptoToken:           result.tokenCode,
            cryptoAmount:          String(quote.tokenAmount),
            cryptoRawAmount:       quote.rawAmount,
            extras:                selectedExtras,
            extraPayments:         Object.fromEntries(
              selectedExtras.map((id) => [id, { method: 'crypto', amount: 0 }])
            ),
          },
          role: 'player' as const,
        });

        localStorage.setItem(`quizPlayerId:${roomId}`, playerId);
      }

      setStatus('success');
      onSuccess?.({ ...confirmed, playerId });

      if (props.mode === 'walkin' && !skipInternalNavigate) {
        window.setTimeout(() => {
          navigate(`/quiz/game/${roomId}/${playerId}`);
        }, 800);
      }

    } catch (err: any) {
      console.error('[CryptoFixedFeeStep] payment failed:', err);
      setStatus('idle');
      setError(err?.message || 'Crypto payment failed.');
    }
  };

  // ── Button label ───────────────────────────────────────────────────────────

  const buttonLabel = (() => {
    if (status === 'connecting') return 'Connecting Wallet…';
    if (status === 'paying')     return 'Confirm in Wallet…';
    if (status === 'confirming') return 'Verifying Payment…';
    if (status === 'joining')    return props.mode === 'ticket' ? 'Creating Ticket…' : 'Joining Quiz…';
    if (status === 'success')    return 'Payment Confirmed ✓';
    if (!isWalletConnected)      return 'Connect Wallet & Pay';
    return quote
      ? `Pay ${quote.tokenAmount.toFixed(selectedToken === 'BONK' || selectedToken === 'MEW' ? 0 : 6)} ${selectedToken}`
      : `Pay with ${selectedToken}`;
  })();

  const payDisabled = isBusy || !walletAddress || !quote || isExpired || quoteStatus === 'loading';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <StepLayout
      mode="modal"
      icon="🪙"
      title="Pay with Crypto"
      subtitle={selectedMethod.methodLabel}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={onBack}
            disabled={isBusy}
            className="flex items-center justify-center rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back
          </button>

          <button
            type="button"
            onClick={handlePay}
            disabled={payDisabled}
            className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {isBusy && !isSuccess ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : isSuccess ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <Wallet className="h-4 w-4" />
            )}
            {buttonLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-3 sm:space-y-4">

        {/* Fiat total */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
          <div className="text-sm font-medium text-indigo-700">Total to pay</div>
          <div className="mt-1 text-3xl font-bold text-indigo-950">
            {currencySymbol}{totalFiatAmount.toFixed(2)}
            <span className="ml-2 text-base font-normal text-indigo-600">{fiatCurrency}</span>
          </div>
          {extrasAmount > 0 && (
            <div className="mt-1 text-xs text-indigo-700">
              Entry {currencySymbol}{entryFeeAmount.toFixed(2)} + Extras {currencySymbol}{extrasAmount.toFixed(2)}
            </div>
          )}
        </div>

        {/* Token selector */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-3 text-sm font-semibold text-gray-900">Select token to pay with</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {SOLANA_TOKEN_LIST.filter(Boolean).map((code) => {
              const token  = SOLANA_TOKENS[code];
              if (!token) return null;
              const active = selectedToken === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => !isBusy && setSelectedToken(code)}
                  disabled={isBusy}
                  className={`rounded-lg border p-2 text-center transition ${
                    active
                      ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-100'
                      : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                  } disabled:opacity-50`}
                >
                  <img src={token.logoUrl} alt={token.code} className="mx-auto h-6 w-6 rounded-full" />
                  <div className="mt-1 text-xs font-semibold text-gray-800">{token.code}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Wallet connected panel with disconnect */}
        {isWalletConnected && publicKey && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs font-medium text-green-800">Wallet connected</div>
                <div className="mt-0.5 break-all font-mono text-xs text-green-700">
                  {publicKey.toBase58()}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => open({ view: 'Account' })}
                  disabled={isBusy}
                  className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
                >
                  Options
                </button>
                <button
                  type="button"
                  onClick={() => disconnect()}
                  disabled={isBusy}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quote panel */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-gray-700">Price quote</div>
            <div className="flex items-center gap-2">
              {quoteStatus === 'ready' && secondsLeft > 0 && (
                <div className={`flex items-center gap-1 text-xs font-mono font-semibold ${countdownColor(secondsLeft)}`}>
                  <Clock className="h-3 w-3" />
                  {formatCountdown(secondsLeft)}
                </div>
              )}
              {(isExpired || quoteStatus === 'error') && !isBusy && (
                <button
                  type="button"
                  onClick={refresh}
                  className="flex items-center gap-1 rounded-md bg-purple-100 px-2 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-200"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </button>
              )}
            </div>
          </div>

          {quoteStatus === 'loading' && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
              <Loader className="h-4 w-4 animate-spin" />
              Getting live price…
            </div>
          )}

          {quoteStatus === 'ready' && quote && !isExpired && (
            <div className="mt-3">
              <div className="text-2xl font-bold text-gray-900">
                {quote.tokenAmount.toFixed(
                  selectedToken === 'BONK' || selectedToken === 'MEW' ? 0 : 6
                )}{' '}
                <span className="text-lg">{selectedToken}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                1 {selectedToken} = {currencySymbol}{quote.pricePerToken.toFixed(4)} · quoted now
              </div>
            </div>
          )}

          {isExpired && (
            <div className="mt-3 flex items-center gap-2 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4" />
              Quote expired — tap Refresh to get a new price
            </div>
          )}

          {quoteStatus === 'error' && quoteError && (
            <div className="mt-3 text-sm text-red-700">{quoteError}</div>
          )}
        </div>

        {/* Receiving wallet */}
        {walletAddress && (
          <div className="rounded-xl border border-gray-200 bg-white p-3 text-xs text-gray-600">
            Paying to:{' '}
            <span className="font-mono font-semibold text-gray-800">
              {shortWallet(walletAddress)}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Success */}
        {txResult?.success && confirmData && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
              <div className="min-w-0">
                <div className="font-semibold text-green-950">Payment verified</div>
                <div className="mt-1 break-all font-mono text-xs text-green-800">
                  {txResult.txHash}
                </div>
                <div className="mt-2 text-sm text-green-900">
                  Recorded as{' '}
                  <strong>
                    {confirmData.ledgerCurrency}{' '}
                    {Number(confirmData.ledgerAmount).toFixed(2)}
                  </strong>
                </div>
                {txResult.explorerUrl && (
                  <a
                    href={txResult.explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center text-xs font-medium text-green-800 underline"
                  >
                    View on Explorer <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
          Your wallet will ask you to confirm before sending. Always verify the token, amount and
          receiving address before approving.
        </div>
      </div>
    </StepLayout>
  );
};

export default CryptoFixedFeeStep;