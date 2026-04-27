// src/components/Quiz/joinroom/crypto/CryptoDonationStep.tsx

import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ExternalLink,
  Loader,
  Wallet,
} from 'lucide-react';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';
import { useAppKit } from '@reown/appkit/react';

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

import type { ClubPaymentMethod } from '../../shared/PaymentMethodSelector';

interface CryptoDonationStepProps {
  roomId: string;
  playerName: string;
  selectedMethod: ClubPaymentMethod;
  includedDonationExtras: string[];
  solanaCluster?: 'mainnet' | 'devnet';
  onBack: () => void;
}

type CryptoPaymentStatus =
  | 'idle'
  | 'connecting'
  | 'paying'
  | 'confirming'
  | 'joining'
  | 'success';

interface CryptoDonationConfirmResponse {
  ok: boolean;
  error?: string;
  ledgerId?: string | number;
  web3TransactionId?: string | number;
  duplicate?: boolean;
  ledgerAmount?: number;
  ledgerCurrency?: string;
  roomCurrency?: string;
  roomCurrencySymbol?: string;
  txHash?: string;
  paymentMethod?: {
    id: string | number;
    label: string;
  };
}

export const CryptoDonationStep: React.FC<CryptoDonationStepProps> = ({
  roomId,
  playerName,
  selectedMethod,
  includedDonationExtras,
  solanaCluster = 'mainnet',
  onBack,
}) => {
  const navigate = useNavigate();
  const { socket } = useQuizSocket();
  const { open } = useAppKit();

  const {
    sendDonation,
    isWalletConnected,
    publicKey,
  } = useSolanaDirectDonation({
    cluster: solanaCluster,
  });

  const [selectedToken, setSelectedToken] = useState<SolanaTokenCode>('SOL');
  const [amountInput, setAmountInput] = useState('');
  const [status, setStatus] = useState<CryptoPaymentStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<SolanaDirectDonationResult | null>(null);
  const [confirmData, setConfirmData] = useState<CryptoDonationConfirmResponse | null>(null);

  const walletAddress = useMemo(() => {
    const cfg = selectedMethod.methodConfig || {};
    return String(cfg.walletAddress || '').trim();
  }, [selectedMethod]);

  const selectedTokenConfig = SOLANA_TOKENS[selectedToken];

  const parsedAmount = useMemo(() => {
    const parsed = parseFloat((amountInput || '').replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [amountInput]);

  const amountValid = parsedAmount > 0;
  const isBusy = status !== 'idle';
  const isSuccess = status === 'success';

  const shortWallet = (address: string) => {
    if (!address) return '';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}…${address.slice(-6)}`;
  };

  const handleOpenWalletOptions = async () => {
    try {
      await open({ view: 'Account' });
    } catch (err: any) {
      console.error('[CryptoDonationStep] wallet options failed:', err);
      setError(err?.message || 'Could not open wallet options.');
    }
  };

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

  const confirmCryptoDonationOnBackend = async ({
    playerId,
    result,
  }: {
    playerId: string;
    result: Extract<SolanaDirectDonationResult, { success: true }>;
  }): Promise<CryptoDonationConfirmResponse> => {
    const response = await fetch('/api/quiz/crypto-donation/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId,
        playerId,
        playerName: playerName.trim(),
        clubPaymentMethodId: selectedMethod.id,

        network: result.network,
        txHash: result.txHash,
        senderWallet: result.fromWallet,
        recipientWallet: result.toWallet,

        tokenCode: result.tokenCode,
        tokenMint: result.tokenMint,
        rawAmount: result.rawAmount,
        displayAmount: result.displayAmount,

        includedDonationExtras,
      }),
    });

    let data: CryptoDonationConfirmResponse;

    try {
      data = await response.json();
    } catch {
      data = {
        ok: false,
        error: 'Server returned an invalid response while confirming the crypto payment.',
      };
    }

    if (!response.ok || !data.ok) {
      throw new Error(
        data?.error ||
          'Your transaction was sent, but the server could not verify it yet. Please contact the host with your transaction signature.'
      );
    }

    return data;
  };

  const handleConnectWalletAndPay = async () => {
    try {
      setError(null);
      setConfirmData(null);

      if (!walletAddress) {
        setError('This club has not configured a Solana wallet address.');
        return;
      }

      if (!amountValid) {
        setError('Please enter a crypto donation amount greater than zero.');
        return;
      }

      if (!isWalletConnected || !publicKey) {
        await handleConnectWallet();
        return;
      }

      setStatus('paying');

      const result = await sendDonation({
        recipientWalletAddress: walletAddress,
        tokenCode: selectedToken,
        displayAmount: amountInput,
      });

      setTxResult(result);

      if (!result.success) {
        setStatus('idle');
        setError(result.error);
        return;
      }

      setStatus('confirming');

      const playerId = nanoid();

      const backendConfirm = await confirmCryptoDonationOnBackend({
        playerId,
        result,
      });

      setConfirmData(backendConfirm);
      setStatus('joining');

      socket?.emit('join_quiz_room', {
        roomId,
        user: {
          id: playerId,
          name: playerName.trim(),

      paid: true,
paymentMethod: 'crypto',
paymentStatus: 'confirmed',
paymentLedgerRecorded: true,
paymentReference: result.txHash,

          web3TxHash: result.txHash,
          web3Address: result.fromWallet,
          web3Chain: 'solana',
          web3TransactionId: backendConfirm.web3TransactionId ?? null,

          clubPaymentMethodId: selectedMethod.id,

          cryptoToken: result.tokenCode,
          cryptoAmount: result.displayAmount,
          cryptoRawAmount: result.rawAmount,

          donationAmount: Number(backendConfirm.ledgerAmount || 0),
          donationCurrency: backendConfirm.ledgerCurrency || 'EUR',

          extras: includedDonationExtras,
          extraPayments: {},
        },
        role: 'player' as const,
      });

      localStorage.setItem(`quizPlayerId:${roomId}`, playerId);

      setStatus('success');

      window.setTimeout(() => {
        navigate(`/quiz/game/${roomId}/${playerId}`);
      }, 800);
    } catch (err: any) {
      console.error('[CryptoDonationStep] payment failed:', err);
      setStatus('idle');
      setError(err?.message || 'Crypto donation failed.');
    }
  };

  const buttonLabel = (() => {
    if (status === 'connecting') return 'Connecting Wallet…';
    if (status === 'paying') return 'Confirm in Wallet…';
    if (status === 'confirming') return 'Verifying Payment…';
    if (status === 'joining') return 'Joining Quiz…';
    if (status === 'success') return 'Payment Confirmed';
    if (!isWalletConnected) return 'Connect Wallet & Pay';
    return 'Pay with Wallet';
  })();

  const payDisabled = isBusy || !amountValid || !walletAddress;

  return (
    <StepLayout
      mode="modal"
      icon="🪙"
      title="Crypto Donation"
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
            onClick={handleConnectWalletAndPay}
            disabled={payDisabled}
            className="flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {status === 'idle' ? (
              <Wallet className="mr-2 h-4 w-4" />
            ) : isSuccess ? (
              <CheckCircle className="mr-2 h-4 w-4" />
            ) : (
              <Loader className="mr-2 h-4 w-4 animate-spin" />
            )}
            {buttonLabel}
          </button>
        </div>
      }
    >
      <div className="max-h-[65vh] overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible sm:pr-0">
        <div className="space-y-3 sm:space-y-4">
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 sm:p-4">
            <div className="font-semibold text-purple-950">
              Donate with a Solana wallet
            </div>
            <p className="mt-1 text-sm text-purple-900">
              Choose a token and amount. Your wallet will open so you can review and confirm.
            </p>
          </div>

          {isWalletConnected && publicKey && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-green-900">
                    Wallet connected
                  </div>
                  <div className="mt-1 break-all font-mono text-xs text-green-800">
                    {publicKey.toBase58()}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenWalletOptions}
                  disabled={isBusy}
                  className="shrink-0 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
                >
                  Wallet options
                </button>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
            <label className="mb-2 block text-sm font-medium text-gray-900">
              Select token
            </label>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {SOLANA_TOKEN_LIST.filter(Boolean).map((tokenCode) => {
                const token = SOLANA_TOKENS[tokenCode];
                if (!token) return null;

                const active = selectedToken === tokenCode;

                return (
                  <button
                    key={tokenCode}
                    type="button"
                    onClick={() => setSelectedToken(tokenCode)}
                    disabled={isBusy}
                    className={`rounded-lg border p-2 text-left transition sm:p-3 ${
                      active
                        ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-100'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                    } disabled:opacity-50`}
                  >
                    <div className="flex items-center gap-2">
                      <img
                        src={token.logoUrl}
                        alt={token.code}
                        className="h-5 w-5 rounded-full sm:h-6 sm:w-6"
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {token.code}
                        </div>
                        <div className="truncate text-[11px] text-gray-500 sm:text-xs">
                          {token.name}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
            <label className="mb-2 block text-sm font-medium text-gray-900">
              Donation amount in {selectedToken}
            </label>

            <div className="relative">
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder={`e.g. ${selectedTokenConfig?.minEntryFee ?? '0.01'}`}
                disabled={isBusy}
                className="w-full rounded-lg border-2 border-gray-200 py-3 pl-4 pr-20 text-base outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-200 disabled:bg-gray-100"
              />

              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                {selectedToken}
              </span>
            </div>

            <p className="mt-2 text-xs text-gray-500">
              Minimum suggested amount: {selectedTokenConfig?.minEntryFee ?? '0.01'} {selectedToken}
            </p>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 sm:p-4">
            <div className="text-sm text-gray-600">Payment review</div>
            <div className="mt-1 text-xl font-bold text-gray-900">
              {amountValid ? parsedAmount : '0'} {selectedToken}
            </div>
            <div className="mt-2 text-xs text-gray-500">
              To: <span className="font-mono">{shortWallet(walletAddress)}</span>
            </div>
          </div>

          <details className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
            <summary className="cursor-pointer font-medium text-gray-800">
              Show receiving wallet
            </summary>
            <div className="mt-3 break-all rounded-lg border border-gray-200 bg-white p-3 font-mono text-xs text-gray-800">
              {walletAddress || 'No wallet configured'}
            </div>
          </details>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 sm:p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {txResult?.success && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
                <div className="min-w-0">
                  <div className="font-semibold text-green-950">
                    Payment verified
                  </div>
                  <div className="mt-1 break-all font-mono text-xs text-green-800">
                    {txResult.txHash}
                  </div>

                  {txResult.explorerUrl && (
                    <a
                      href={txResult.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-flex items-center text-sm font-medium text-green-800 underline"
                    >
                      View transaction
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  )}

                  {confirmData?.ledgerAmount != null && (
                    <div className="mt-2 text-sm text-green-900">
                      Recorded as{' '}
                      <strong>
                        {confirmData.ledgerCurrency || 'EUR'}{' '}
                        {Number(confirmData.ledgerAmount).toFixed(2)}
                      </strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 sm:p-4 sm:text-sm">
            Your wallet may show this as a transaction request. Always check the token,
            receiving wallet and amount before confirming.
          </div>
        </div>
      </div>
    </StepLayout>
  );
};

export default CryptoDonationStep;