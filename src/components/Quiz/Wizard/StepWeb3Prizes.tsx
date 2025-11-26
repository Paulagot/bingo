// src/components/Quiz/Wizard/StepWeb3Prizes.tsx
import { useEffect, useMemo, useState, type FC, type FormEvent } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import type { WizardStepProps } from './WizardStepProps';
import {
  AlertCircle,
  Percent,
  ChevronLeft,
  ChevronRight,
  Trophy,
  User,
  Info,
  Target,
  Gift,
} from 'lucide-react';
import type { Prize, QuizConfig } from '../types/quiz';
import ClearSetupButton from './ClearSetupButton';

// --- Character with IMG placeholder (same style as StepWeb3QuizSetup) ---
const Character = ({ message }: { message: string }) => {
  const getBubbleColor = (): string => {
    if (message.includes('Perfect!') || message.includes('🎉')) return 'bg-green-50 border-green-200';
    if (message.includes('Great!')) return 'bg-blue-50 border-blue-200';
    if (message.includes('allocate') || message.includes('prizes')) return 'bg-indigo-50 border-indigo-200';
    return 'bg-gray-50 border-border';
  };

  return (
    <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-4">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-300 bg-gray-200 sm:h-16 sm:w-16">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
          <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
        </div>
      </div>
      <div className={`relative flex-1 rounded-lg border p-2 shadow-lg sm:rounded-2xl sm:p-4 ${getBubbleColor()}`}>
        <p className="text-fg/80 text-xs leading-tight sm:text-sm sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};



type PrizeSource = 'pool' | 'assets';

const PRIZE_PLACES = [1, 2, 3] as const;
const placeLabel = (n: number) => (n === 1 ? '1st' : n === 2 ? '2nd' : '3rd');

const StepWeb3Prizes: FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  const { setupConfig, updateSetupConfig, setFlow } = useQuizSetupStore();

  // Ensure store reflects web3 flow
  useEffect(() => setFlow('web3'), [setFlow]);

  // Prize source decision
  const [prizeSource, setPrizeSource] = useState<PrizeSource>(
    setupConfig.prizeMode === 'assets' ? 'assets' : 'pool'
  );

  // Personal take (0–5%)
  const [personalTake, setPersonalTake] = useState<number>(setupConfig.web3PrizeSplit?.host ?? 0);

  // Prize pool %
  const [prizePoolPct, setPrizePoolPct] = useState<number>(setupConfig.web3PrizeSplit?.prizes ?? 0);

  // Prize pool splits per place
  const initialSplits = setupConfig.prizeSplits
    ? (Object.fromEntries(PRIZE_PLACES.map((p) => [p, setupConfig.prizeSplits![p] ?? 0])) as Record<
        number,
        number
      >)
    : ({ 1: 100 } as Record<number, number>);
  const [splits, setSplits] = useState<Record<number, number>>(initialSplits);

  // External assets mode: 3 slots, 1st required
  const [externalPrizes, setExternalPrizes] = useState<Prize[]>(
    setupConfig.prizes && setupConfig.prizes.length
      ? setupConfig.prizes
          .filter((p) => PRIZE_PLACES.includes(p.place as (typeof PRIZE_PLACES)[number]))
          .sort((a, b) => a.place - b.place)
      : [
          { place: 1, description: '', tokenAddress: '', value: 0 },
          { place: 2, description: '', tokenAddress: '', value: 0 },
          { place: 3, description: '', tokenAddress: '', value: 0 },
        ]
  );

  const [error, setError] = useState('');

  // Constants
  const platformPct = 20; // fixed
  // Allocatable bucket is 40%, minus personalTake → max prize pool available
  const maxPrizePool = useMemo(() => Math.max(0, 40 - (personalTake || 0)), [personalTake]);

  // Charity = base 40 + any unallocated from allocatable bucket (40%)
  const charityPct = useMemo(
    () =>
      40 +
      Math.max(
        0,
        40 - (personalTake || 0) - (prizeSource === 'pool' ? prizePoolPct || 0 : 0)
      ),
    [personalTake, prizePoolPct, prizeSource]
  );

  // Helpers
  const isPrizeStarted = (p: Prize) =>
    !!(p.description?.trim() || p.tokenAddress?.trim() || (p.value && p.value > 0));

  const isPrizeComplete = (p: Prize) =>
    !!(p.description?.trim() && p.tokenAddress?.trim() && p.value && p.value > 0);

  const getCompletedPrizesCount = () => externalPrizes.filter(isPrizeComplete).length;

  // Message (string)
  const getCurrentMessage = (): string => {
    if (prizeSource === 'assets') {
      const completed = getCompletedPrizesCount();
      if (completed === 0) {
        return "You'll provide your own assets as prizes. Set up the 1st place prize (required). Optional prizes must be fully completed if started.";
      }
      return `Great! You have ${completed} prize${completed > 1 ? 's' : ''} configured. ${
        personalTake > 0 ? `You're taking ${personalTake}% personally, and` : 'The remaining'
      } ${charityPct}% goes to charity.`;
    }

    if (!prizePoolPct || prizePoolPct === 0) {
      return `You're taking ${personalTake}% personally, and ${charityPct}% goes directly to charity. You can allocate up to ${maxPrizePool}% for prizes if you want.`;
    }

    if (prizePoolPct === maxPrizePool) {
      return `🎉 Perfect! Full allocation in use — ${personalTake}% personal, ${prizePoolPct}% prizes, ${charityPct}% to charity.`;
    }

    return `You're allocating ${prizePoolPct}% to prizes and ${charityPct}% to charity. You could allocate up to ${
      maxPrizePool - prizePoolPct
    }% more to prizes.`;
  };

  const handleSplitChange = (place: number, value: number) => {
    setSplits((prev) => ({ ...prev, [place]: Number.isFinite(value) && value >= 0 ? value : 0 }));
  };
const handleExternalPrizeChange = <K extends keyof Prize>(index: number, field: K, value: Prize[K]) => {
  setExternalPrizes((prev) => {
    const updated = [...prev];
    updated[index] = { ...updated[index], [field]: value } as Prize;
    return updated;
  });
};

  const totalPrizeSplit = useMemo(
    () => PRIZE_PLACES.reduce((acc, p) => acc + (Number.isFinite(splits[p]) ? (splits[p] as number) : 0), 0),
    [splits]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    // Personal take bounds
    if (!Number.isFinite(personalTake) || personalTake < 0 || personalTake > 5) {
      return setError('Personal take must be between 0% and 5%.');
    }

    if (prizeSource === 'pool') {
      // Validate prize pool allocation within allowed bucket
      if (!Number.isFinite(prizePoolPct) || prizePoolPct < 0 || prizePoolPct > maxPrizePool) {
        return setError(`Prize pool must be between 0% and ${maxPrizePool}%.`);
        }
      if (prizePoolPct === 0) {
        return setError('Set a prize pool percentage (greater than 0) or switch to “External Assets”.');
      }
      if (prizePoolPct > 0) {
        if (totalPrizeSplit > 100) {
          return setError('Prize splits cannot total more than 100%.');
        }
        if (!splits[1] || splits[1] <= 0) {
          return setError('1st place split is required when using a prize pool.');
        }
      }

      const sanitizedSplits = Object.fromEntries(
        PRIZE_PLACES.map((p) => [p, splits[p] ?? 0])
      ) as Record<number, number>;

      // Save for pool mode (NO hostWallet anywhere)
   const updateData: Partial<QuizConfig> = {
  web3PrizeSplit: {
    charity: charityPct,
    host: personalTake,
    prizes: prizePoolPct,
  },
  prizeMode: 'split',
  prizes: [],
};

// Only set prizeSplits if we have values
if (prizePoolPct > 0) {
  updateData.prizeSplits = sanitizedSplits;
}

updateSetupConfig(updateData);
    } else {
      // External assets mode

      // 1st place required + complete
      const firstPrize = externalPrizes.find((p) => p.place === 1);
      if (!firstPrize || !isPrizeComplete(firstPrize)) {
        return setError(
          '1st place prize is required and must include description, contract address, and quantity.'
        );
      }

      // Optional prizes: if started, must be complete
      const incompleteStarted = externalPrizes
        .filter((p) => p.place > 1)
        .filter((p) => isPrizeStarted(p) && !isPrizeComplete(p));

      if (incompleteStarted.length > 0) {
        const places = incompleteStarted.map((p) => placeLabel(p.place)).join(', ');
        return setError(`Please complete all details for ${places} place prize(s), or clear them if not needed.`);
      }

      const completePrizes = externalPrizes.filter(isPrizeComplete);

      // Save for assets mode (NO hostWallet anywhere)
      updateSetupConfig({
        web3PrizeSplit: {
          charity: charityPct,
          host: personalTake,
          prizes: 0,
        },
        prizeMode: 'assets',
       
        prizes: completePrizes,
      });
    }

    setError('');
    onNext?.();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="heading-2">Step 4 of 4: Prize Pool Configuration</h2>
        <div className="text-fg/70 text-xs md:text-sm">Configure Web3 prize distribution</div>
      </div>

      {/* Character with IMG placeholder */}
      <Character message={getCurrentMessage()} />

      {/* Allocation overview */}
      <div className="sticky top-4 z-10 rounded-xl border border-indigo-200 bg-indigo-50 p-3 md:p-4">
        <div className="mb-2 flex items-center space-x-2">
          <Trophy className="h-4 w-4 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-800 md:text-base">Current Allocation</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center text-xs md:text-sm">
          <div className="rounded border bg-red-100 p-2">
            <div className="font-bold text-red-700">{Math.round(charityPct * 10) / 10}%</div>
            <div className="text-red-600">Charity</div>
          </div>
          <div className="rounded border bg-blue-100 p-2">
            <div className="font-bold text-blue-700">{Math.round((personalTake || 0) * 10) / 10}%</div>
            <div className="text-blue-600">Personal</div>
          </div>
          <div className="rounded border bg-yellow-100 p-2">
            <div className="font-bold text-yellow-700">
              {prizeSource === 'pool' ? Math.round((prizePoolPct || 0) * 10) / 10 : 0}%
            </div>
            <div className="text-yellow-600">Prizes</div>
          </div>
          <div className="rounded border bg-gray-100 p-2">
            <div className="text-fg/80 font-bold">{platformPct}%</div>
            <div className="text-fg/70">Platform</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prize source */}
        <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md md:p-6">
          <div className="mb-4 flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl">🎁</div>
            <div className="flex-1">
              <h3 className="text-fg text-lg font-semibold">Prize Source</h3>
              <p className="text-fg/70 text-sm">How will you provide prizes to winners?</p>
            </div>
          </div>

          <div className="space-y-3">
            <label
              className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
                prizeSource === 'pool'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-border hover:border-indigo-400'
              }`}
            >
              <input
                type="radio"
                name="prizeSource"
                checked={prizeSource === 'pool'}
                onChange={() => {
                  setPrizeSource('pool');
                  setError('');
                }}
                className="hidden"
              />
              <Percent className="h-6 w-6 text-indigo-600" />
              <div className="flex-1">
                <p className="text-fg font-medium">Use Prize Pool</p>
                <p className="text-fg/70 text-sm">Allocate part of collected funds for automatic distribution</p>
              </div>
            </label>

            <label
              className={`flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition ${
                prizeSource === 'assets'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-border hover:border-indigo-400'
              }`}
            >
              <input
                type="radio"
                name="prizeSource"
                checked={prizeSource === 'assets'}
                onChange={() => {
                  setPrizeSource('assets');
                  setError('');
                }}
                className="hidden"
              />
              <Gift className="h-6 w-6 text-indigo-600" />
              <div className="flex-1">
                <p className="text-fg font-medium">External Assets</p>
                <p className="text-fg/70 text-sm">Provide your own NFTs, tokens, or digital assets</p>
              </div>
            </label>
          </div>
        </div>

        {/* Personal take */}
        <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md md:p-6">
          <div className="mb-4 flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-2xl">💰</div>
            <div className="flex-1">
              <h3 className="text-fg text-lg font-semibold">Personal Take</h3>
              <p className="text-fg/70 text-sm">How much do you want for yourself? (Optional)</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-3">
              <label className="text-fg/80 flex items-center justify-between text-sm font-medium">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <span>Personal Percentage</span>
                </div>
                <span className="text-lg font-bold text-blue-600">{personalTake}%</span>
              </label>
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={personalTake}
                  onChange={(e) => {
                    setPersonalTake(parseFloat(e.target.value));
                    setError('');
                  }}
                  className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                  style={{
                    background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${
                      (personalTake / 5) * 100
                    }%, #E5E7EB ${(personalTake / 5) * 100}%, #E5E7EB 100%)`,
                  }}
                />
                <div className="text-fg/60 mt-1 flex justify-between text-xs">
                  <span>0%</span>
                  <span>2.5%</span>
                  <span>5%</span>
                </div>
              </div>
              <p className="text-fg/60 text-xs">Drag to select your personal take (0–5%)</p>
            </div>

            {/* Host wallet capture removed */}
          </div>
        </div>

        {/* Pool config */}
        {prizeSource === 'pool' && (
          <>
            <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm transition-all duration-200 hover:border-indigo-300 hover:shadow-md md:p-6">
              <div className="mb-4 flex items-center space-x-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 text-2xl">🏆</div>
                <div className="flex-1">
                  <h3 className="text-fg text-lg font-semibold">Prize Pool Allocation</h3>
                  <p className="text-fg/70 text-sm">How much of your remaining {maxPrizePool}% for prizes?</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-fg/80 flex items-center justify-between text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <span>Prize Pool Percentage</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">{prizePoolPct}%</span>
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min={0}
                      max={maxPrizePool}
                      step={1}
                      value={prizePoolPct}
                      onChange={(e) => {
                        setPrizePoolPct(parseFloat(e.target.value));
                        setError('');
                      }}
                      className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                      style={{
                        background: `linear-gradient(to right, #EAB308 0%, #EAB308 ${
                          (prizePoolPct / Math.max(1, maxPrizePool)) * 100
                        }%, #E5E7EB ${(prizePoolPct / Math.max(1, maxPrizePool)) * 100}%, #E5E7EB 100%)`,
                      }}
                    />
                    <div className="text-fg/60 mt-1 flex justify-between text-xs">
                      <span>0%</span>
                      <span>{Math.round(maxPrizePool / 2)}%</span>
                      <span>{maxPrizePool}%</span>
                    </div>
                  </div>
                  <p className="text-fg/60 text-xs">
                    Remaining {Math.max(0, maxPrizePool - prizePoolPct)}% goes to charity
                  </p>
                </div>
              </div>
            </div>

            {prizePoolPct > 0 && (
              <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
                <div className="mb-4 flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 text-2xl">📊</div>
                  <div className="flex-1">
                    <h4 className="text-fg text-lg font-semibold">Prize Distribution</h4>
                    <p className="text-fg/70 text-sm">How to split the {prizePoolPct}% prize pool</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {PRIZE_PLACES.map((place) => (
                    <div key={place} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                      <Target className="text-fg/70 h-4 w-4" />
                      <span className="text-fg/80 w-20 font-medium">{placeLabel(place)} Place</span>
                      <input
                        type="number"
                        value={splits[place] ?? ''}
                        onChange={(e) => handleSplitChange(place, parseFloat(e.target.value) || 0)}
                        placeholder="e.g. 50"
                        className="border-border w-24 rounded-lg border-2 px-3 py-2 outline-none transition focus:border-indigo-500"
                      />
                      <span className="text-fg/70">%</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-sm text-yellow-800">
                    Total Split: <strong>{totalPrizeSplit}%</strong>
                    {totalPrizeSplit > 100 && (
                      <span className="ml-2 text-red-600">⚠️ Cannot exceed 100%</span>
                    )}
                    {totalPrizeSplit <= 100 && (
                      <span className="ml-2 text-green-700">
                        ✓ {100 - totalPrizeSplit}% unallocated returns to charity
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* External assets config */}
        {prizeSource === 'assets' && (
          <div className="bg-muted border-border rounded-xl border-2 p-4 shadow-sm md:p-6">
            <div className="mb-4 flex items-center space-x-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100 text-2xl">🎨</div>
              <div className="flex-1">
                <h3 className="text-fg text-lg font-semibold">External Asset Prizes</h3>
                <p className="text-fg/70 text-sm">
                  1st place is required. Others are optional but must be completed if started.
                </p>
              </div>
            </div>

            {/* Status overview */}
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="mb-2 flex items-center space-x-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Prize Configuration Status</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                {PRIZE_PLACES.map((place) => {
                  const prize =
                    externalPrizes.find((p) => p.place === place) ||
                    { place, description: '', tokenAddress: '', value: 0 };
                  const complete = isPrizeComplete(prize);
                  const started = isPrizeStarted(prize);
                  const required = place === 1;

                  return (
                    <div
                      key={place}
                      className={`rounded p-2 text-center ${
                        complete
                          ? 'bg-green-100 text-green-700'
                          : started
                          ? 'bg-yellow-100 text-yellow-700'
                          : required
                          ? 'bg-red-100 text-red-700'
                          : 'text-fg/70 bg-gray-100'
                      }`}
                    >
                      <div className="font-medium">{placeLabel(place)}</div>
                      <div className="text-xs">
                        {complete ? '✓ Complete' : started ? '⚠ Incomplete' : required ? '✗ Required' : 'Optional'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {externalPrizes.map((prize, index) => {
                const complete = isPrizeComplete(prize);
                const started = isPrizeStarted(prize);
                const required = prize.place === 1;

                return (
                  <div
                    key={index}
                    className={`rounded-lg border-2 p-4 transition-all ${
                      complete
                        ? 'border-green-200 bg-green-50'
                        : started
                        ? 'border-yellow-200 bg-yellow-50'
                        : required
                        ? 'border-red-200 bg-red-50'
                        : 'border-border bg-gray-50'
                    }`}
                  >
                    <div className="mb-3 flex items-center space-x-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${
                          complete ? 'bg-green-600' : started ? 'bg-yellow-600' : required ? 'bg-red-600' : 'bg-gray-600'
                        }`}
                      >
                        {prize.place}
                      </div>
                      <h4 className="text-fg flex-1 font-medium">
                        {placeLabel(prize.place)} Place Prize {required && <span className="ml-1 text-red-500">*</span>}
                      </h4>
                      {complete && <div className="text-sm text-green-600">✓ Complete</div>}
                      {started && !complete && <div className="text-sm text-yellow-600">⚠ Incomplete</div>}
                    </div>

                    <div className="grid gap-3">
                      <div>
                        <label className="text-fg/80 mb-1 block text-xs font-medium">
                          Prize Description {required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={prize.description || ''}
                          onChange={(e) => handleExternalPrizeChange(index, 'description', e.target.value)}
                          placeholder="e.g., Rare Dragon NFT, 500 USDC Tokens"
                          className="border-border w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-fg/80 mb-1 block text-xs font-medium">
                          Contract Address {required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="text"
                          value={prize.tokenAddress || ''}
                          onChange={(e) => handleExternalPrizeChange(index, 'tokenAddress', e.target.value)}
                          placeholder="e.g., 0x1234...abcd or G1234...xyz"
                          className="border-border w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="text-fg/80 mb-1 block text-xs font-medium">
                          Quantity/Token ID {required && <span className="text-red-500">*</span>}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={prize.value || ''}
                          onChange={(e) => handleExternalPrizeChange(index, 'value', parseFloat(e.target.value) || 0)}
                          placeholder="e.g., 1 (for NFTs) or 500 (for tokens)"
                          className="border-border w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                        />
                      </div>

                      {/* ✅ ADD THIS - EVM-only NFT type selector */}
{setupConfig.web3Chain === 'evm' && (
  <div>
    <label className="text-fg/80 mb-1 block text-xs font-medium">
      Token Type {required && <span className="text-red-500">*</span>}
    </label>
    <div className="flex gap-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={`tokenType-${index}`}
          checked={!prize.isNFT}
          onChange={() => handleExternalPrizeChange(index, 'isNFT', false)}
          className="h-4 w-4"
        />
        <span className="text-sm">ERC-20 (Fungible Token)</span>
      </label>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={`tokenType-${index}`}
          checked={!!prize.isNFT}
          onChange={() => handleExternalPrizeChange(index, 'isNFT', true)}
          className="h-4 w-4"
        />
        <span className="text-sm">NFT (ERC-721/1155)</span>
      </label>
    </div>
    <p className="text-xs text-fg/60 mt-1">
      {prize.isNFT 
        ? "For NFTs, the value above will be used as Token ID (ERC-721) or quantity (ERC-1155)"
        : "For fungible tokens, the value is the amount to transfer (e.g., 100 USDC)"}
    </p>
  </div>
)}

                      <div>
                        <label className="text-fg/80 mb-1 block text-xs font-medium">Sponsor (Optional)</label>
                        <input
                          type="text"
                          value={prize.sponsor || ''}
                          onChange={(e) => handleExternalPrizeChange(index, 'sponsor', e.target.value)}
                          placeholder="e.g., CompanyXYZ"
                          className="border-border w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:border-indigo-500"
                        />
                      </div>

                      {/* Clear button for optional prizes that are started */}
                      {!required && started && (
                        <div className="border-border border-t pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              handleExternalPrizeChange(index, 'description', '');
                              handleExternalPrizeChange(index, 'tokenAddress', '');
                              handleExternalPrizeChange(index, 'value', 0);
                              handleExternalPrizeChange(index, 'sponsor', '');
                              setError('');
                            }}
                            className="text-fg/60 text-xs transition-colors hover:text-red-600"
                          >
                            Clear this prize
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-start space-x-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <div className="text-sm text-amber-800">
                  <p className="mb-1 font-medium">Important Notes:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• <strong>1st place prize is required</strong> and must be complete</li>
                    <li>• Other prizes (2nd–3rd) are optional but must be fully complete if started</li>
                    <li>• Assets should be available and verifiable for escrow before launch</li>
                    <li>• Use correct contract addresses for your blockchain</li>
                    <li>• For NFTs, use Token ID; for fungible tokens, use quantity</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start space-x-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <div className="text-sm text-blue-800">
              <p className="mb-1 font-medium">Prize Pool Guidelines</p>
              <ul className="space-y-1 text-xs">
                <li>• Minimum 40% always goes to charity</li>
                <li>• Platform reserves 20%</li>
                <li>• Remaining 40% is yours to allocate (personal up to 5%, and/or prizes up to 40% combined)</li>
                <li>• Any unused allocation goes to charity</li>
                <li>• External assets are provided separately from the fund pool</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="border-border flex justify-between border-t pt-6">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-fg/70 hover:text-fg flex items-center space-x-2 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          )}

<ClearSetupButton
  label="Start Over"
  variant="ghost"
  size="sm"
  keepIds={false}
  flow="web3"
  onCleared={onResetToFirst || (() => {})}
/>

          <button
            type="submit"
            className="flex items-center space-x-2 rounded-xl bg-indigo-600 px-4 py-2 text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-400 md:px-6 md:py-3"
          >
            <span>Save & Continue</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepWeb3Prizes;



