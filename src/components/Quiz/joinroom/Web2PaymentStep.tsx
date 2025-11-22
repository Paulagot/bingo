// src/components/Quiz/joinroom/Web2PaymentStep.tsx

import React, { useMemo } from 'react';
import { ChevronLeft, CreditCard, Shield } from 'lucide-react';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { nanoid } from 'nanoid';
import { useNavigate } from 'react-router-dom';

const DEBUG = true;
const log = (...args: any[]) => {
  if (DEBUG) console.log('[Web2PaymentStep]', ...args);
};

interface RoomConfig {
  exists: boolean;
  paymentMethod: 'web3' | 'cash' | 'revolut' | string;
  demoMode: boolean;
  entryFee: number;
  fundraisingOptions: Record<string, boolean>;
  fundraisingPrices: Record<string, number>;
  currencySymbol: string;
  web3Chain?: string;
  hostName?: string;
  gameType?: string;
  roundDefinitions?: Array<{ roundType: string }>;
}

interface Web2PaymentStepProps {
  roomId: string;
  playerName: string;
  roomConfig: RoomConfig;
  selectedExtras: string[];
  onBack: () => void;
  onClose: () => void;
}

export const Web2PaymentStep: React.FC<Web2PaymentStepProps> = ({
  roomId,
  playerName,
  roomConfig,
  selectedExtras,
  onBack,
 // unused but kept
}) => {
  const { socket } = useQuizSocket();
  const navigate = useNavigate();

  log('render', {
    roomId,
    playerName,
    paymentMethod: roomConfig.paymentMethod,
    entryFee: roomConfig.entryFee,
    currencySymbol: roomConfig.currencySymbol,
    selectedExtras,
  });

  // -----------------------------
  // Compute totals
  // -----------------------------
  const { extrasTotal, totalAmount } = useMemo(() => {
    const extrasTotalInner = selectedExtras.reduce((sum, extraId) => {
      const price = roomConfig.fundraisingPrices[extraId] || 0;
      return sum + price;
    }, 0);

    const totals = {
      extrasTotal: extrasTotalInner,
      totalAmount: roomConfig.entryFee + extrasTotalInner,
    };

    log('computed totals', {
      entryFee: roomConfig.entryFee,
      extrasTotal: extrasTotalInner,
      totalAmount: totals.totalAmount,
    });

    return totals;
  }, [selectedExtras, roomConfig.entryFee, roomConfig.fundraisingPrices, roomConfig.currencySymbol]);

  // infer payment method
  const inferredPaymentMethod =
    roomConfig.paymentMethod === 'cash'
      ? 'cash'
      : roomConfig.paymentMethod === 'revolut'
      ? 'instant payment'
      : 'unknown';

  log('inferred payment method', {
    roomPaymentMethod: roomConfig.paymentMethod,
    inferredPaymentMethod,
  });

  // -----------------------------
  // Join Room as UNPAID
  // -----------------------------
  const handleJoinAsUnpaid = () => {
      console.log('[DEBUG] selectedExtras:', selectedExtras);
  console.log('[DEBUG] fundraisingPrices:', roomConfig.fundraisingPrices);
  console.log('[DEBUG] mapped extraPayments would be:', 
    selectedExtras.map(id => ({
      id,
      price: roomConfig.fundraisingPrices[id],
      exists: id in roomConfig.fundraisingPrices
    }))
  );
    log('handleJoinAsUnpaid clicked', {
      roomId,
      rawPlayerName: playerName,
      selectedExtras,
      inferredPaymentMethod,
      totals: { extrasTotal, totalAmount },
      socketConnected: !!socket,
    });

    if (!socket) {
      console.error('[Web2PaymentStep] Socket not available, cannot join room.');
      return;
    }

    const trimmedName = playerName.trim();
    if (!trimmedName) {
      log('aborting join: empty trimmed name');
      return;
    }

    const playerId = nanoid();
    log('generated playerId', playerId);

    const extraPayments = Object.fromEntries(
      selectedExtras.map((extraId) => [
        extraId,
        {
          method: inferredPaymentMethod,
          amount: roomConfig.fundraisingPrices[extraId] || 0,
        },
      ])
    );

    const payload = {
      roomId,
      user: {
        id: playerId,
        name: trimmedName,
        paid: false,
        paymentMethod: inferredPaymentMethod,
        credits: 0,
        extras: selectedExtras,
        extraPayments,
      },
      role: 'player' as const,
    };

    log('emitting join_quiz_room with payload', payload);

    socket.emit('join_quiz_room', payload);

    // local storage for reconnect
    const storageKey = `quizPlayerId:${roomId}`;
    localStorage.setItem(storageKey, playerId);

    const targetPath = `/quiz/game/${roomId}/${playerId}`;
    navigate(targetPath);
  };

  // ============================================================
  // LAYOUT FIX: Full height flex column + scroll + sticky footer
  // ============================================================

  return (
    <div className="flex flex-col h-full max-h-screen">
      
      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-36">

        <div className="mb-6 flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-blue-600 text-lg text-white sm:h-12 sm:w-12 sm:text-xl">
            💶
          </div>
          <div>
            <h2 className="text-fg text-xl font-bold sm:text-2xl">Pay the Host</h2>
            <p className="text-fg/70 text-sm sm:text-base">
              Join {roomConfig.hostName ? `${roomConfig.hostName}'s` : 'the'} quiz and pay your
              club directly.
            </p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-fg font-medium">Total to Pay</div>
              <div className="text-fg/70 text-sm">
                Entry: {roomConfig.currencySymbol}
                {roomConfig.entryFee.toFixed(2)}
                {extrasTotal > 0 &&
                  ` + Extras: ${roomConfig.currencySymbol}${extrasTotal.toFixed(2)}`}
              </div>
            </div>
            <div className="text-xl font-bold text-blue-900">
              {roomConfig.currencySymbol}
              {totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Selected Extras */}
        {selectedExtras.length > 0 && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="mb-3 flex items-center space-x-2 text-green-800 font-medium">
              <Shield className="h-4 w-4" />
              <span>Your Extras</span>
            </h3>
            <div className="space-y-2">
              {selectedExtras.map((extraId) => {
                const definition =
                  fundraisingExtraDefinitions[extraId as keyof typeof fundraisingExtraDefinitions];
                const price = roomConfig.fundraisingPrices[extraId] || 0;
                return (
                  <div
                    key={extraId}
                    className="flex items-center justify-between rounded border border-green-200 bg-white p-2"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-base">{definition?.icon}</span>
                      <span className="text-sm font-medium text-green-700">
                        {definition?.label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-green-700">
                      {roomConfig.currencySymbol}
                      {price.toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Explainer */}
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center space-x-3">
            <CreditCard className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-blue-800 font-semibold">
                Pay your club directly ({roomConfig.paymentMethod || 'cash / Revolut'})
              </h3>
              <p className="text-sm text-blue-700">
                We'll put your name and extras on the host's list. Pay them in person (cash,
                Revolut, card). They will mark you as paid.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-fg font-medium">How this works:</h3>
          <ul className="space-y-1 text-sm text-fg/70">
            <li>• You join with your chosen name and extras.</li>
            <li>• Host sees you as <strong>Unpaid</strong> until confirmed.</li>
            <li>• You pay the host directly.</li>
          </ul>
        </div>
      </div>

      {/* ============================= */}
      {/* STICKY FOOTER (ALWAYS VISIBLE) */}
      {/* ============================= */}

      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">

          <button
            onClick={onBack}
            className="text-fg/80 flex items-center justify-center space-x-2 rounded-lg 
                       bg-gray-100 px-4 py-2 text-sm font-medium transition-colors 
                       hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <button
            onClick={handleJoinAsUnpaid}
            className="flex items-center justify-center space-x-2 rounded-lg 
                       bg-indigo-600 px-4 py-2 text-sm font-medium text-white 
                       transition-colors hover:bg-indigo-700 sm:px-6 sm:py-3 sm:text-base"
          >
            <span>Join &amp; Pay Host</span>
          </button>
        </div>
      </div>
    </div>
  );
};



