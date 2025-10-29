// src/components/Quiz/Wizard/AssetDepositStep.tsx
import React, { useState, useEffect } from 'react';
import { Loader, Check, AlertCircle } from 'lucide-react';
import type { Prize } from '../types/quiz';

interface AssetDepositStepProps {
  roomId: string;
  prizes: Prize[];
  roomPDA: string;
  onComplete: () => void;
  onBack?: () => void;
}

type DepositStatus = 'pending' | 'depositing' | 'completed' | 'error';

interface PrizeDepositState {
  status: DepositStatus;
  txHash?: string;
  error?: string;
}

export const AssetDepositStep: React.FC<AssetDepositStepProps> = ({
  roomId,
  prizes,
  roomPDA,
  onComplete,
  onBack,
}) => {
  const [depositStates, setDepositStates] = useState<Record<number, PrizeDepositState>>({});
  const [roomStatus, setRoomStatus] = useState<'AwaitingFunding' | 'PartiallyFunded' | 'Ready'>('AwaitingFunding');

  // Initialize deposit states
  useEffect(() => {
    const initialStates: Record<number, PrizeDepositState> = {};
    prizes.forEach((_, index) => {
      initialStates[index] = { status: 'pending' };
    });
    setDepositStates(initialStates);
  }, [prizes]);

  // Poll room status
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        // TODO: Implement room status fetching from Solana
        // const roomInfo = await getRoomInfo(roomPDA);
        // setRoomStatus(roomInfo.status);
        // if (roomInfo.status === 'Ready') {
        //   onComplete();
        // }
      } catch (error) {
        console.error('[AssetDepositStep] Failed to poll room status:', error);
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [roomPDA, onComplete]);

  const handleDeposit = async (prizeIndex: number) => {
    const prize = prizes[prizeIndex];
    if (!prize.tokenAddress || !prize.value) {
      console.error('[AssetDepositStep] Invalid prize configuration');
      return;
    }

    setDepositStates(prev => ({
      ...prev,
      [prizeIndex]: { status: 'depositing' },
    }));

    try {
      // TODO: Call depositPrizeAsset hook
      // const { depositPrizeAsset } = useContractActions();
      // const result = await depositPrizeAsset({
      //   roomId,
      //   prizeIndex,
      //   prizeMint: new PublicKey(prize.tokenAddress),
      // });

      // Mock success for now
      await new Promise(resolve => setTimeout(resolve, 2000));

      setDepositStates(prev => ({
        ...prev,
        [prizeIndex]: {
          status: 'completed',
          txHash: 'mock-tx-hash', // result.signature
        },
      }));
    } catch (error: any) {
      setDepositStates(prev => ({
        ...prev,
        [prizeIndex]: {
          status: 'error',
          error: error.message || 'Deposit failed',
        },
      }));
    }
  };

  const allDeposited = Object.values(depositStates).every(state => state.status === 'completed');

  return (
    <div className="w-full space-y-6 px-4 pb-4">
      {/* Header */}
      <div className="mb-4">
        <h2 className="heading-2">Step 3: Deposit Prize Assets</h2>
        <p className="text-fg/70 mt-1 text-sm">
          Deposit SPL tokens for each prize. Players can join once all prizes are deposited.
        </p>
      </div>

      {/* Room Status */}
      <div className={`rounded-xl border-2 p-4 ${
        roomStatus === 'Ready' ? 'border-green-300 bg-green-50' :
        roomStatus === 'PartiallyFunded' ? 'border-yellow-300 bg-yellow-50' :
        'border-orange-300 bg-orange-50'
      }`}>
        <div className="flex items-center gap-2">
          {roomStatus === 'Ready' ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <Loader className="h-5 w-5 animate-spin text-orange-600" />
          )}
          <span className="font-semibold">
            Room Status: {roomStatus === 'AwaitingFunding' ? 'Awaiting Prize Deposits' :
                         roomStatus === 'PartiallyFunded' ? 'Partially Funded' :
                         'Ready for Players'}
          </span>
        </div>
      </div>

      {/* Prize Deposit Cards */}
      <div className="space-y-4">
        {prizes.map((prize, index) => {
          const state = depositStates[index] || { status: 'pending' };

          return (
            <div
              key={index}
              className={`rounded-xl border-2 p-6 transition-all ${
                state.status === 'completed' ? 'border-green-300 bg-green-50' :
                state.status === 'depositing' ? 'border-blue-300 bg-blue-50' :
                state.status === 'error' ? 'border-red-300 bg-red-50' :
                'border-gray-300 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-fg">
                    Prize #{index + 1} - {prize.description || `${index + 1}${['st', 'nd', 'rd'][index] || 'th'} Place`}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-fg/70">
                    <div>
                      <span className="font-semibold">Token:</span>{' '}
                      <code className="bg-gray-200 px-2 py-0.5 rounded">
                        {prize.tokenAddress?.slice(0, 8)}...{prize.tokenAddress?.slice(-6)}
                      </code>
                    </div>
                    <div>
                      <span className="font-semibold">Amount:</span> {prize.value}
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="ml-4">
                  {state.status === 'completed' && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-600">
                      <Check className="h-6 w-6 text-white" />
                    </div>
                  )}
                  {state.status === 'depositing' && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600">
                      <Loader className="h-6 w-6 animate-spin text-white" />
                    </div>
                  )}
                  {state.status === 'error' && (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {state.status === 'pending' && (
                <button
                  onClick={() => handleDeposit(index)}
                  className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-white hover:bg-indigo-700"
                >
                  Deposit Prize #{index + 1}
                </button>
              )}

              {state.status === 'depositing' && (
                <div className="mt-4 text-center text-sm text-blue-700">
                  Depositing tokens... Please confirm in your wallet
                </div>
              )}

              {state.status === 'completed' && state.txHash && (
                <div className="mt-4 text-center text-xs text-green-700">
                  ✅ Deposited! Tx: <code className="bg-green-100 px-2 py-1 rounded">{state.txHash.slice(0, 16)}...</code>
                </div>
              )}

              {state.status === 'error' && (
                <div className="mt-4 space-y-2">
                  <div className="text-center text-sm text-red-700">
                    ❌ Error: {state.error}
                  </div>
                  <button
                    onClick={() => handleDeposit(index)}
                    className="w-full rounded-lg bg-red-600 py-2 text-white hover:bg-red-700"
                  >
                    Retry Deposit
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-300 pt-6">
        {onBack && (
          <button
            onClick={onBack}
            className="rounded-lg border-2 border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
          >
            ← Back
          </button>
        )}
        <button
          onClick={onComplete}
          disabled={!allDeposited}
          className="ml-auto rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-3 font-bold text-white shadow-lg hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          {allDeposited ? 'Continue to Quiz →' : 'Waiting for deposits...'}
        </button>
      </div>
    </div>
  );
};
