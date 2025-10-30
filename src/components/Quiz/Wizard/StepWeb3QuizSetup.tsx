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

import { CHARITIES as CHARITY_DIR, getCharityById as getGbCharityById } from '../../../chains/evm/config/gbcharities';

interface StepWeb3QuizSetupProps extends WizardStepProps {
  onChainUpdate?: (chain: SupportedChain) => void;
  onResetToFirst?: () => void;
}

const Character = ({ message }: { message: string }) => {
  const color =
    message.includes('Perfect!') || message.includes('🎉')
      ? 'bg-green-50 border-green-200'
      : message.includes('Excellent!') || message.includes('choice!')
      ? 'bg-blue-50 border-blue-200'
      : message.includes('ready') || message.includes('configured')
      ? 'bg-indigo-50 border-indigo-200'
      : 'bg-gray-50 border-border';

  return (
    <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-4">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-300 bg-gray-200 sm:h-16 sm:w-16">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
          <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
        </div>
      </div>
      <div className={`relative flex-1 rounded-lg border p-2 shadow-lg sm:rounded-2xl sm:p-4 ${color}`}>
        <p className="text-fg/80 text-xs leading-tight sm:text-sm sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

/** Single dropdown: Stellar, Base, Base Sepolia, BSC, BSC Testnet, Avalanche, Fuji, Optimism, OP Sepolia, Solana (Mainnet|Devnet) */
type ChoiceValue =
  | 'stellar'
  | 'base'
  | 'baseSepolia'
  | 'bsc'
  | 'bscTestnet'
  | 'avalanche'
  | 'avalancheFuji'
  | 'optimism'
  | 'optimismSepolia'
  | 'solanaMainnet'
  | 'solanaDevnet';

type EvmNetwork =
  | 'base'
  | 'baseSepolia'
  | 'bsc'
  | 'bscTestnet'
  | 'avalanche'
  | 'avalancheFuji'
  | 'optimism'
  | 'optimismSepolia';

type SolanaCluster = 'mainnet' | 'devnet';

/**
 * ✅ ENABLED choices for now
 * To re-enable others later, just uncomment the commented entries in CHOICES below.
 */
const ENABLED_CHOICES: ChoiceValue[] = ['baseSepolia', 'avalancheFuji'];

/**
 * Only Base Sepolia and Avalanche Fuji are active in the dropdown.
 * The rest are kept here and commented out for easy re-enable later.
 */
const CHOICES: Array<{
  value: ChoiceValue;
  label: string;
  description: string;
  kind: 'stellar' | 'evm' | 'solana';
  evmNetwork?: EvmNetwork;
  solanaCluster?: SolanaCluster;
}> = [
  // ----- ENABLED -----
  { value: 'baseSepolia', label: 'Base Sepolia', description: 'EVM · Base testnet', kind: 'evm', evmNetwork: 'baseSepolia' },
  { value: 'avalancheFuji', label: 'Avalanche Fuji', description: 'EVM · Avalanche testnet', kind: 'evm', evmNetwork: 'avalancheFuji' },

  // ----- COMMENTED OUT (uncomment when ready) -----
  // { value: 'stellar', label: 'Stellar', description: 'Fast, low-cost payments', kind: 'stellar' },

  // // EVM — Base
  // { value: 'base', label: 'Base', description: 'EVM · Coinbase L2 (mainnet)', kind: 'evm', evmNetwork: 'base' },

  // // EVM — BSC
  // { value: 'bsc', label: 'BNB Smart Chain', description: 'EVM · BSC mainnet', kind: 'evm', evmNetwork: 'bsc' },
  // { value: 'bscTestnet', label: 'BNB Smart Chain Testnet', description: 'EVM · BSC testnet', kind: 'evm', evmNetwork: 'bscTestnet' },

  // // EVM — Avalanche
  // { value: 'avalanche', label: 'Avalanche C-Chain', description: 'EVM · Avalanche mainnet', kind: 'evm', evmNetwork: 'avalanche' },

  // // EVM — Optimism
  // { value: 'optimism', label: 'OP Mainnet', description: 'EVM · Optimism mainnet', kind: 'evm', evmNetwork: 'optimism' },
  // { value: 'optimismSepolia', label: 'OP Sepolia', description: 'EVM · Optimism testnet', kind: 'evm', evmNetwork: 'optimismSepolia' },

  // // Solana
  // { value: 'solanaMainnet', label: 'Solana (Mainnet)', description: 'High-speed, low-fee mainnet', kind: 'solana', solanaCluster: 'mainnet' },
  // { value: 'solanaDevnet', label: 'Solana (Devnet)', description: 'Developer test network', kind: 'solana', solanaCluster: 'devnet' },
];

/** Derive initial dropdown value from persisted setupConfig */
const deriveChoiceFromConfig = (
  web3Chain?: string | null,
  evmNetwork?: string | null,
  solanaCluster?: string | null
): ChoiceValue => {
  if (web3Chain === 'stellar') return 'stellar';
  if (web3Chain === 'solana') {
    return solanaCluster === 'devnet' ? 'solanaDevnet' : 'solanaMainnet';
  }
  if (web3Chain === 'evm') {
    switch (evmNetwork) {
      case 'baseSepolia': return 'baseSepolia';
      case 'bsc': return 'bsc';
      case 'bscTestnet': return 'bscTestnet';
      case 'avalanche': return 'avalanche';
      case 'avalancheFuji': return 'avalancheFuji';
      case 'optimism': return 'optimism';
      case 'optimismSepolia': return 'optimismSepolia';
      case 'base':
      default:
        return 'base';
    }
  }
  return 'stellar';
};

const getTokensForChoice = (choice: ChoiceValue) => {
  if (choice === 'stellar') return [{ value: 'XLM', label: 'XLM' }];
  if (choice === 'solanaMainnet' || choice === 'solanaDevnet') {
    return [
      { value: 'SOL', label: 'SOL' },
      { value: 'USDC', label: 'USDC' },
      { value: 'USDGLO', label: 'Glo Dollar' },
    ];
  }
  // EVM choices
  return [
    { value: 'USDC', label: 'USDC' },
    { value: 'USDGLO', label: 'Glo Dollar' },
  ];
};

const StepWeb3QuizSetup: React.FC<StepWeb3QuizSetupProps> = ({ onNext, onChainUpdate, onResetToFirst }) => {
  const { setupConfig, updateSetupConfig, setFlow } = useQuizSetupStore();
  useEffect(() => { setFlow('web3'); }, [setFlow]);

  // Host
  const [hostName, setHostName] = useState(setupConfig.hostName || '');

  // Initial dropdown choice from saved config
  const derived = deriveChoiceFromConfig(
    setupConfig.web3Chain,
    (setupConfig as any).evmNetwork,
    (setupConfig as any).solanaCluster
  );

  // If derived choice isn't currently enabled, fall back to baseSepolia (safe default)
  const enabledSet = useMemo(() => new Set(ENABLED_CHOICES), []);
  const safeInitialChoice: ChoiceValue = enabledSet.has(derived) ? derived : 'baseSepolia';

  const [choice, setChoice] = useState<ChoiceValue>(safeInitialChoice);

  // Web3 fields
  const [currency, setCurrency] = useState(setupConfig.web3Currency || 'USDGLO');
 const [charityId, setCharityId] = useState<string>((setupConfig as any).web3CharityOrgId || '');

  const [entryFee, setEntryFee] = useState(setupConfig.entryFee || '');

  const availableTokens = useMemo(() => getTokensForChoice(choice), [choice]);

  useEffect(() => {
    const tokenValues = availableTokens.map((t) => t.value);
    const fallback =
      choice === 'stellar' ? 'XLM' :
      choice === 'solanaMainnet' || choice === 'solanaDevnet' ? 'SOL' :
      'USDGLO';
    if (!tokenValues.includes(currency)) setCurrency(availableTokens[0]?.value || fallback);
  }, [choice, availableTokens, currency]);

  const [error, setError] = useState('');

  const completedSections = useMemo(() => {
    const host = hostName.trim().length >= 2;
    const feeOk = !!entryFee && !Number.isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0;
    // ✅ With TGB, we require an orgId, not a static wallet
    const hasCharity = Boolean((setupConfig as any).web3CharityOrgId);
    const web3 = Boolean(choice && currency && hasCharity && feeOk);
    return { host, web3 };
  }, [hostName, choice, currency, entryFee, setupConfig]);

  const allSectionsComplete = completedSections.host && completedSections.web3;
  const selectedInfo = CHOICES.find((c) => c.value === choice);

  const getCurrentMessage = () => {
    const network = selectedInfo?.label || 'your network';
    if (allSectionsComplete)
      return `🎉 Perfect! Your Web3 quiz is configured—host set, ${network} selected, token chosen, and entry fee set.`;
    if (!completedSections.host) return "Hi there! Let's set up your quiz together. Start with your host display name.";
    return `Great! Now configure your Web3 payments on ${network}: choose token, charity, and the crypto entry fee.`;
  };

  const handleSubmit = () => {
    if (!completedSections.host) return setError('Please enter a host name with at least 2 characters.');
    const parsed = Number.parseFloat(entryFee.trim());
    if (Number.isNaN(parsed) || parsed <= 0) return setError('Please enter a valid entry fee greater than 0.');
   const orgOk = Boolean((setupConfig as any).web3CharityOrgId);
   if (!orgOk) return setError('Please select a charity.');

    const meta = selectedInfo!;
    const web3Chain: SupportedChain = meta.kind; // 'stellar' | 'evm' | 'solana'
    const evmNetwork = meta.kind === 'evm' ? meta.evmNetwork : undefined;
    const solanaCluster = meta.kind === 'solana' ? meta.solanaCluster : undefined;

    updateSetupConfig({
      hostName: hostName.trim(),
      entryFee: entryFee.trim(),
      paymentMethod: 'web3',
      currencySymbol: currency,
      web3Chain,                 // 'stellar' | 'evm' | 'solana'
      web3Currency: currency,

      evmNetwork,                // only for EVM
      solanaCluster,             // only for Solana
    } as any);

    setError('');
    onChainUpdate?.(web3Chain);
    onNext?.();
  };

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, []);

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
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
          onCleared={onResetToFirst}
        />
      </div>

      <Character message={getCurrentMessage()} />

      {/* Host */}
      <div className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${completedSections.host ? 'border-green-300 bg-green-50' : 'border-border'}`}>
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">👤</div>
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
            <span>Host Display Name <span className="text-red-500">*</span></span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={hostName}
              onChange={(e) => { setHostName(e.target.value); setError(''); }}
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

      {/* Chain + Token */}
      <div className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${completedSections.web3 ? 'border-green-300 bg-green-50' : 'border-border'}`}>
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">🔗</div>
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
            Select a blockchain, token, charity, and set your crypto entry fee. Smart contracts verify payments automatically.
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <Wallet className="h-4 w-4" />
              <span>Blockchain</span>
            </label>
            <select
              value={choice}
              onChange={(e) => { setChoice(e.target.value as ChoiceValue); setError(''); }}
              className="border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base"
            >
              {CHOICES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label} 
                </option>
              ))}
            </select>
            <p className="text-fg/60 text-xs">{CHOICES.find(c => c.value === choice)?.description}</p>
          </div>

          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span>Cryptocurrency</span>
            </label>
            <select
              value={currency}
              onChange={(e) => { setCurrency(e.target.value); setError(''); }}
              className="border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base"
            >
              {availableTokens.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className="text-fg/60 text-xs">Available tokens on {CHOICES.find(c => c.value === choice)?.label}</p>
          </div>
        </div>

        {currency === 'USDGLO' && choice !== 'stellar' && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="mb-1 flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">About Glo Dollar</span>
            </div>
            <p className="text-xs text-green-700">
              Glo Dollar helps fund global public goods through their unique reserve model.
            </p>
          </div>
        )}

        {/* Charity */}
        <div className="mt-4 space-y-2">
          <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
            <Heart className="h-4 w-4 text-red-500" />
            <span>Choose a Charity <span className="text-red-500">*</span></span>
          </label>
          <select
            value={charityId}
            onChange={(e) => {
              const id = e.target.value || '';
              setCharityId(id);
                 // 🔁 Update setupConfig with TGB orgId + name (and keep backward compat fields)
     const c = getGbCharityById(id || undefined);
     updateSetupConfig({
       web3CharityOrgId: id || null,
       web3CharityName: c?.name || null,
       // legacy fields you might still read elsewhere:
       web3CharityId: id || null,
       web3CharityAddress: null, // TGB gives deposit addresses per donation; no static wallet needed
     } as any);   // writes id+name+wallet into setupConfig
              setError('');
            }}
            className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base ${
              charityId ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-border focus:border-indigo-500'
            }`}
          >
            <option value="">Select a charity...</option>
            {CHARITY_DIR.map((ch) => (
              <option key={ch.id} value={ch.id}>{ch.name}</option>
            ))}
          </select>

          {/* Optional: show the mapped wallet when selected */}
         {charityId && (
   <div className="rounded-md border border-indigo-200 bg-indigo-50 p-2 text-[11px] text-indigo-800 break-words">
     TGB Org ID: {(setupConfig as any).web3CharityOrgId}
   </div>
 )}

          <p className="text-fg/60 text-xs italic">Powered by The Giving Block and Coala Pay</p>
        </div>

        {/* Entry Fee */}
        <div className="mt-4">
          <div className="mb-3 flex items-start gap-3 sm:mb-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">💰</div>
            <div className="min-w-0 flex-1">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Entry Fee Amount</h3>
              <p className="text-fg/70 text-xs sm:text-sm">Set the cryptocurrency entry fee</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span>Entry Fee ({currency}) <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <span className="text-fg/60 absolute left-3 top-1/2 -translate-y-1/2 transform text-sm font-medium sm:text-base">{currency}</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryFee}
                onChange={(e) => { setEntryFee(e.target.value); setError(''); }}
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





