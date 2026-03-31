// src/components/Quiz/Wizard/StepWeb3Prizes.tsx
//
// New contract: fee splits are FIXED on-chain. Nothing to configure here.
// This step now shows a read-only summary so the host understands the split
// before they deploy, then lets them continue.

import { useEffect, type FC } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import type { WizardStepProps } from './WizardStepProps';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Trophy,
  Wallet,
  Building2,
  Info,
} from 'lucide-react';
import ClearSetupButton from './ClearSetupButton';
import { SOLANA_CONTRACT } from '../../../chains/solana/config/contracts';

const Character = ({ message }: { message: string }) => (
  <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-4">
    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-300 bg-gray-200 sm:h-16 sm:w-16">
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
        <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
      </div>
    </div>
    <div className="relative flex-1 rounded-lg border border-indigo-200 bg-indigo-50 p-2 shadow-lg sm:rounded-2xl sm:p-4">
      <p className="text-fg/80 text-xs leading-tight sm:text-sm sm:leading-normal">{message}</p>
    </div>
  </div>
);

const SPLITS = SOLANA_CONTRACT.FEE_SPLITS;

const splitRows = [
  {
    label: 'Charity',
    pct: SPLITS.charity,
    icon: <Heart className="h-5 w-5 text-red-500" />,
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
    bar: 'bg-red-400',
    description: 'Goes directly to your chosen charity via The Giving Block',
  },
  {
    label: '1st Place Prize',
    pct: SPLITS.firstPlace,
    icon: <Trophy className="h-5 w-5 text-yellow-500" />,
    bg: 'bg-yellow-50 border-yellow-200',
    text: 'text-yellow-700',
    bar: 'bg-yellow-400',
    description: 'Paid directly to the 1st place winners wallet',
  },
  {
    label: '2nd Place Prize',
    pct: SPLITS.secondPlace,
    icon: <Trophy className="h-5 w-5 text-orange-400" />,
    bg: 'bg-orange-50 border-orange-200',
    text: 'text-orange-700',
    bar: 'bg-orange-300',
    description: 'Paid directly to the 2nd place winners wallet. If no 2nd winner, goes to charity.',
  },
  {
    label: 'Host',
    pct: SPLITS.host,
    icon: <Wallet className="h-5 w-5 text-blue-500" />,
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    bar: 'bg-blue-400',
    description: 'Sent to your wallet automatically when the room ends',
  },
  {
    label: 'Platform',
    pct: SPLITS.platform,
    icon: <Building2 className="h-5 w-5 text-gray-500" />,
    bg: 'bg-gray-50 border-gray-200',
    text: 'text-gray-700',
    bar: 'bg-gray-400',
    description: 'Platform fee to keep the service running',
  },
];

const total = SPLITS.charity + SPLITS.firstPlace + SPLITS.secondPlace + SPLITS.host + SPLITS.platform;

const StepWeb3Prizes: FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  const { setFlow } = useQuizSetupStore();

  useEffect(() => {
    setFlow('web3');
  }, [setFlow]);

  // No store writes needed — the new Solana contract has fixed splits on-chain.
  // useContractActions only passes roomId + currency + entryFee for Solana rooms.
  // Writing web3PrizeSplit / prizeSplits here was misleading and caused the
  // "prizes: 30" confusion in the stored config.

  return (
    <div className="w-full space-y-4 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="heading-2">Step 4 of 4: Prize & Fee Split</h2>
          <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">
            Fixed on-chain — no configuration needed
          </div>
        </div>
        <ClearSetupButton
          label="Start Over"
          variant="link"
          flow="web3"
          keepIds={false}
          onCleared={onResetToFirst}
        />
      </div>

      <Character message="The fee split is fixed in the smart contract — no choices needed here. Review how your entry fees will be distributed, then continue to deploy." />

      {/* Visual bar */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="flex h-6 w-full">
          {splitRows.map((row) => (
            <div
              key={row.label}
              className={`${row.bar} flex items-center justify-center text-white`}
              style={{ width: `${(row.pct / total) * 100}%` }}
              title={`${row.label}: ${row.pct}%`}
            >
              {row.pct >= 12 && (
                <span className="text-xs font-semibold">{row.pct}%</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Split rows */}
      <div className="space-y-3">
        {splitRows.map((row) => (
          <div key={row.label} className={`flex items-start gap-4 rounded-xl border p-4 ${row.bg}`}>
            <div className="mt-0.5 flex-shrink-0">{row.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className={`text-base font-semibold ${row.text}`}>{row.label}</span>
                <span className={`text-2xl font-bold ${row.text}`}>{row.pct}%</span>
              </div>
              <p className="mt-0.5 text-xs text-gray-600">{row.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sanity total */}
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-green-800">
          <span>Total: {total}%</span>
          {total === 100 && <span className="text-green-600">✓</span>}
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
        <div className="text-xs text-blue-800 space-y-1">
          <p className="font-medium">These splits are enforced by the smart contract</p>
          <p>Distribution happens automatically when the host ends the room — no manual steps required. Winners must have a wallet that holds the room's token.</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="border-border flex justify-between border-t pt-4 sm:pt-6">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-fg/70 hover:text-fg flex items-center gap-2 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          className="ml-auto flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md sm:rounded-xl sm:px-6 sm:text-base"
        >
          <span>Continue to Review</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepWeb3Prizes;



