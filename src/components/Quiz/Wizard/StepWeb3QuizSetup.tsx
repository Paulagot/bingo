// src/components/Quiz/Wizard/StepWeb3QuizSetup.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Users,
  AlertCircle,
  Check,
  ChevronRight,
  DollarSign,
  Sparkles,
  Wallet,
  Heart,

  Trophy,
} from 'lucide-react';
import { WizardStepProps } from './WizardStepProps';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import type { SupportedChain } from '../../../chains/types';
import ClearSetupButton from './ClearSetupButton';

interface StepWeb3QuizSetupProps extends WizardStepProps {
  onChainUpdate?: (chain: SupportedChain) => void;
  /** NEW: allows the clear button to jump back to the first step in the Web3 wizard */
  onResetToFirst?: () => void;
}

const Character = ({ message }: { message: string }) => {
  const getBubbleColor = (): string => {
    if (message.includes('Perfect!') || message.includes('🎉')) return 'bg-green-50 border-green-200';
    if (message.includes('Excellent!') || message.includes('choice!')) return 'bg-blue-50 border-blue-200';
    if (message.includes('ready') || message.includes('configured')) return 'bg-indigo-50 border-indigo-200';
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

// Only include chains supported by your provider
const CHAINS = [
  { value: 'stellar', label: 'Stellar', description: 'Fast, low-cost payments' },
  // { value: 'evm', label: 'Ethereum', description: 'Most popular smart contract platform' },
  // { value: 'solana', label: 'Solana', description: 'High-speed, low-fee blockchain' },
];

const getTokensForChain = (chain: string) => {
  switch (chain) {
    case 'stellar':
      return [
        { value: 'XLM', label: 'XLM ' },
        // { value: 'USDGLO', label: 'Glo USD' },
        // { value: 'USDC', label: 'USDC' },
      ];
    case 'evm':
      return [
        { value: 'ETH', label: 'ETH (Native)' },
        { value: 'USDC', label: 'USDC' },
        { value: 'USDGLO', label: 'Glo USD' },
      ];
    case 'solana':
      return [
        { value: 'SOL', label: 'SOL (Native)' },
        { value: 'USDC', label: 'USDC' },
        { value: 'USDGLO', label: 'Glo USD' },
      ];
    default:
      return [{ value: 'USDGLO', label: 'Glo USD' }];
  }
};

const CHARITIES = [
  { value: 'redcross', label: 'Red Cross' },
  { value: 'unicef', label: 'UNICEF' },
  { value: 'wateraid', label: 'WaterAid' },
];

const StepWeb3QuizSetup: React.FC<StepWeb3QuizSetupProps> = ({ onNext, onChainUpdate, onResetToFirst }) => {
  const { setupConfig, updateSetupConfig, setFlow } = useQuizSetupStore();

  // Ensure store flow reflects we are in web3 wizard (useful for persistence)
  useEffect(() => {
    setFlow('web3');
  }, [setFlow]);

  // Host
  const [hostName, setHostName] = useState(setupConfig.hostName || '');

  // Web3 fields
  const [chain, setChain] = useState(setupConfig.web3Chain || 'stellar');
  const [currency, setCurrency] = useState(setupConfig.web3Currency || 'USDGLO');
  const [charity, setCharity] = useState(setupConfig.web3Charity || '');
  const [entryFee, setEntryFee] = useState(setupConfig.entryFee || '');

  const availableTokens = useMemo(() => getTokensForChain(chain), [chain]);

  useEffect(() => {
    const tokenValues = availableTokens.map((t) => t.value);
    if (!tokenValues.includes(currency)) {
      setCurrency(availableTokens[0]?.value || 'USDGLO');
    }
  }, [chain, availableTokens, currency]);

  const [error, setError] = useState('');

  const completedSections = useMemo(() => {
    const host = hostName.trim().length >= 2;
    const feeOk = !!entryFee && !Number.isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0;
    const web3 = Boolean(chain && currency && charity && feeOk);
    return { host, web3 };
  }, [hostName, chain, currency, charity, entryFee]);

  const allSectionsComplete = completedSections.host && completedSections.web3;

  const getCurrentMessage = () => {
    if (allSectionsComplete) {
      return '🎉 Perfect! Your Web3 quiz is configured—host set, chain and token picked, charity chosen, and entry fee set!';
    }
    if (!completedSections.host) {
      return "Hi there! Let's set up your quiz together. Start with your host display name.";
    }
    return 'Great! Now configure your Web3 payments: choose chain, token, charity and the crypto entry fee.';
  };

  const handleSubmit = () => {
    if (!completedSections.host) {
      setError('Please enter a host name with at least 2 characters.');
      return;
    }
    const parsed = Number.parseFloat(entryFee.trim());
    if (Number.isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid entry fee greater than 0.');
      return;
    }
    if (!charity) {
      setError('Please select a charity.');
      return;
    }

    updateSetupConfig({
      hostName: hostName.trim(),
      entryFee: entryFee.trim(),
      paymentMethod: 'web3',
      currencySymbol: currency, // reused for symbol display
      web3Chain: chain,
      web3Currency: currency,
      web3Charity: charity,
    });

    setError('');
    onChainUpdate?.(chain as SupportedChain);
    onNext?.();
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const selectedChainInfo = CHAINS.find((c) => c.value === chain);

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header with Start Over */}
      <div className="mb-2 flex items-center justify-between px-1">
        <div>
          <h2 className="heading-2">Step 1 of 4: Web3 Quiz Setup</h2>
         
          <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">Configure host + Web3 payments</div>
        </div>
        <ClearSetupButton
          label="Start Over"
          variant="link"
            flow="web3" 
          keepIds={false}
          onCleared={onResetToFirst} // <-- jump wizard to first step
        />
      </div>

      {/* Character Guide */}
      <Character message={getCurrentMessage()} />

      {/* Section 1: Host Information */}
      <div
        className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
          completedSections.host ? 'border-green-300 bg-green-50' : 'border-border'
        }`}
      >
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
            👤
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Host Information</h3>
              {completedSections.host && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
            </div>
            <p className="text-fg/70 text-xs sm:text-sm">Choose how you want to appear to participants</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
            <Users className="h-4 w-4" />
            <span>
              Host Display Name <span className="text-red-500">*</span>
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={hostName}
              onChange={(e) => {
                setHostName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Quiz Master Sarah, The Pub Quiz"
              className={`w-full rounded-lg border-2 px-3 py-2.5 pr-12 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:pr-16 sm:text-base ${
                completedSections.host ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-border focus:border-indigo-500'
              }`}
              maxLength={30}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 transform items-center gap-1 sm:right-3 sm:gap-2">
              {completedSections.host && <Check className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />}
              <span className="text-xs text-gray-400">{hostName.length}/30</span>
            </div>
          </div>
          <p className="text-fg/60 text-xs">Minimum 2 characters. This is how participants will see you during the quiz.</p>
        </div>
      </div>

      {/* Section 2: Web3 Payment Configuration */}
      <div
        className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
          completedSections.web3 ? 'border-green-300 bg-green-50' : 'border-border'
        }`}
      >
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
            🔗
          </div>
        <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Web3 Payments</h3>
              {completedSections.web3 && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
            </div>
            <p className="text-fg/70 text-xs sm:text-sm">Automated crypto payments with smart contracts</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-3 md:p-4">
          <div className="mb-1 flex items-center space-x-2">
            <Wallet className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-800 md:text-base">Web3 Payment Collection</span>
          </div>
          <div className="text-xs text-indigo-700 md:text-sm">
            Select a network, token, charity, and set your crypto entry fee. Smart contracts will verify payments automatically.
          </div>
        </div>

        {/* Chain + Token */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <Wallet className="h-4 w-4" />
              <span>Blockchain Network</span>
            </label>
            <select
              value={chain}
              onChange={(e) => {
                setChain(e.target.value);
                setError('');
              }}
              className="border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base"
            >
              {CHAINS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} - {c.description}
                </option>
              ))}
            </select>
            {selectedChainInfo && <p className="text-fg/60 text-xs">{selectedChainInfo.description}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span>Cryptocurrency</span>
            </label>
            <select
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value);
                setError('');
              }}
              className="border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base"
            >
              {availableTokens.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <p className="text-fg/60 text-xs">Available tokens on {selectedChainInfo?.label}</p>
          </div>
        </div>

        {currency === 'USDGLO' && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="mb-1 flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">About Glo USD</span>
            </div>
            <p className="text-xs text-green-700">Glo USD helps fund global public goods through their unique reserve model.</p>
          </div>
        )}

        {/* Charity */}
        <div className="mt-4 space-y-2">
          <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
            <Heart className="h-4 w-4 text-red-500" />
            <span>
              Choose a Charity <span className="text-red-500">*</span>
            </span>
          </label>
          <select
            value={charity}
            onChange={(e) => {
              setCharity(e.target.value);
              setError('');
            }}
            className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base ${
              charity ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-border focus:border-indigo-500'
            }`}
          >
            <option value="">Select a charity...</option>
            {CHARITIES.map((ch) => (
              <option key={ch.value} value={ch.value}>
                {ch.label}
              </option>
            ))}
          </select>
          <p className="text-fg/60 text-xs italic">Powered by The Giving Block and Coala Pay</p>

          {charity && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="mb-1 flex items-center space-x-2">
                <Heart className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Charity Selected</span>
              </div>
              <p className="text-sm text-red-700">
                Supporting <strong>{CHARITIES.find((c) => c.value === charity)?.label ?? charity}</strong> with a portion of quiz proceeds
              </p>
            </div>
          )}
        </div>

        {/* Entry Fee */}
        <div className="mt-4">
          <div className="mb-3 flex items-start gap-3 sm:mb-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
              💰
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Entry Fee Amount</h3>
              <p className="text-fg/70 text-xs sm:text-sm">Set the cryptocurrency entry fee</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span>
                Entry Fee ({currency}) <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative">
              <span className="text-fg/60 absolute left-3 top-1/2 -translate-y-1/2 transform text-sm font-medium sm:text-base">
                {currency}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryFee}
                onChange={(e) => {
                  setEntryFee(e.target.value);
                  setError('');
                }}
                placeholder="5.00"
                className="border-border w-full rounded-lg border-2 py-2.5 pl-16 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:py-3 sm:pl-20 sm:pr-4 sm:text-base"
              />
            </div>
          </div>

          {entryFee && !isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0 && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="mb-1 flex items-center space-x-2">
                <Trophy className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Entry Fee Set</span>
              </div>
              <p className="text-sm text-green-700">
                Each participant will pay <strong>{currency} {entryFee}</strong> via smart contract
              </p>
            </div>
          )}
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
      <div className="border-border border-t pt-4 sm:pt-6">
        <button
          onClick={handleSubmit}
          disabled={!allSectionsComplete}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-400 sm:ml-auto sm:w-auto sm:rounded-xl sm:px-6 sm:text-base"
        >
          <span>Continue Setup</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepWeb3QuizSetup;
