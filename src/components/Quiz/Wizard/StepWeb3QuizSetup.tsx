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
  Lock,
} from 'lucide-react';
import { WizardStepProps } from './WizardStepProps';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import type { SupportedChain } from '../../../chains/types';
import ClearSetupButton from './ClearSetupButton';
import { useMiniAppContext } from '../../../context/MiniAppContext';
import { getEventById } from '../../../services/web3PublicEventsService';

import {
  CHARITIES as CHARITY_DIR,
  getCharityById as getGbCharityById,
  type Charity,
} from '../../../chains/evm/config/gbcharities';

import {
  SOLANA_TOKEN_LIST,
  SOLANA_TOKENS,
} from '../../../chains/solana/config/solanaTokenConfig';

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

const ENABLED_CHOICES: ChoiceValue[] = ['solanaMainnet'];

const CHOICES: Array<{
  value: ChoiceValue;
  label: string;
  description: string;
  kind: 'stellar' | 'evm' | 'solana';
  evmNetwork?: EvmNetwork;
  solanaCluster?: SolanaCluster;
}> = [
  {
    value: 'solanaMainnet',
    label: 'Solana',
    description: 'High-speed, low-fee mainnet',
    kind: 'solana',
    solanaCluster: 'mainnet',
  },
];

const DEFAULT_CHOICE: ChoiceValue = CHOICES[0].value;

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

  return DEFAULT_CHOICE;
};

const getTokensForChoice = (choice: ChoiceValue) => {
  if (choice === 'stellar') return [{ value: 'XLM', label: 'XLM' }];

  if (choice === 'solanaMainnet' || choice === 'solanaDevnet') {
    return SOLANA_TOKEN_LIST.map((code) => ({
      value: code,
      label: `${code} — ${SOLANA_TOKENS[code].name}`,
    }));
  }

  return [{ value: 'USDC', label: 'USDC' }];
};

// ── Stable key for a charity entry in the dropdown ───────────────────────────
// TGB charities use their numeric id. Direct charities use "direct:{name}".

function charityKey(c: Charity): string {
  return c.direct ? `direct:${c.name}` : String(c.id);
}

function getMarketplaceEventIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  return params.get('eventId');
}

function isKnownSolanaToken(value: string | null | undefined): value is keyof typeof SOLANA_TOKENS {
  return Boolean(value && SOLANA_TOKENS[value as keyof typeof SOLANA_TOKENS]);
}

const StepWeb3QuizSetup: React.FC<StepWeb3QuizSetupProps> = ({
  onNext,
  onChainUpdate,
  onResetToFirst,
}) => {
  const { setupConfig, updateSetupConfig, setFlow } = useQuizSetupStore();
  const { isMiniApp } = useMiniAppContext();

  useEffect(() => {
    setFlow('web3');
  }, [setFlow]);

  const marketplaceEventId = useMemo(() => getMarketplaceEventIdFromUrl(), []);
  const isDashboardLaunchFlow = Boolean(marketplaceEventId);

  const [hostName, setHostName] = useState(setupConfig.hostName || '');

  const derived = deriveChoiceFromConfig(
    setupConfig.web3Chain,
    (setupConfig as any).evmNetwork,
    (setupConfig as any).solanaCluster
  );

  const enabledSet = useMemo(() => new Set(ENABLED_CHOICES), []);
  const safeInitialChoice: ChoiceValue = enabledSet.has(derived) ? derived : DEFAULT_CHOICE;

  const [choice, setChoice] = useState<ChoiceValue>(safeInitialChoice);
  const [currency, setCurrency] = useState(setupConfig.web3Currency || 'USDG');
  const [entryFee, setEntryFee] = useState(setupConfig.entryFee || '');

  const [directCharities, setDirectCharities] = useState<Charity[]>([]);
  const [eventPrefillLoading, setEventPrefillLoading] = useState(false);
  const [eventPrefillError, setEventPrefillError] = useState<string | null>(null);
  const [eventPrefilled, setEventPrefilled] = useState(false);

  useEffect(() => {
    const selectedInfo = CHOICES.find((c) => c.value === choice);
    const chain = selectedInfo?.kind ?? 'solana';

    fetch(`/api/charities/list?chain=${chain}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.charities)) {
          setDirectCharities(data.charities as Charity[]);
        }
      })
      .catch((err) => {
        console.warn('[StepWeb3QuizSetup] Failed to load direct charities:', err.message);
      });
  }, [choice]);

  const allCharities = useMemo<Charity[]>(() => {
    return [...CHARITY_DIR, ...directCharities];
  }, [directCharities]);

  const currentCharityKey = useMemo(() => {
    if ((setupConfig as any).web3CharityIsDirect && setupConfig.web3CharityName) {
      return `direct:${setupConfig.web3CharityName}`;
    }

    const orgId = (setupConfig as any).web3CharityOrgId;
    return orgId ? String(orgId) : '';
  }, [setupConfig]);

  const [charityKey_, setCharityKey] = useState<string>(currentCharityKey);

  // Keep local select state synced when setupConfig is updated externally.
  useEffect(() => {
    setCharityKey(currentCharityKey);
  }, [currentCharityKey]);

  useEffect(() => {
    if (!isMiniApp) return;
    setChoice(DEFAULT_CHOICE);
  }, [isMiniApp]);

  const availableTokens = useMemo(() => getTokensForChoice(choice), [choice]);

  useEffect(() => {
    if (isDashboardLaunchFlow && eventPrefilled) return;

    const tokenValues = availableTokens.map((t) => t.value);
    const fallback =
      choice === 'stellar' ? 'XLM'
        : choice === 'solanaMainnet' || choice === 'solanaDevnet' ? 'USDG'
          : 'USDGLO';

    if (!tokenValues.includes(currency)) {
      setCurrency(availableTokens[0]?.value || fallback);
    }
  }, [choice, availableTokens, currency, isDashboardLaunchFlow, eventPrefilled]);

  const [error, setError] = useState('');

  const handleCharityChange = (key: string) => {
    if (isDashboardLaunchFlow && eventPrefilled) return;

    setCharityKey(key);
    setError('');

    if (!key) {
      updateSetupConfig({
        web3CharityOrgId: null,
        web3CharityName: null,
        web3CharityId: null,
        web3CharityAddress: null,
        web3CharityIsDirect: false,
      } as any);
      return;
    }

    if (key.startsWith('direct:')) {
      const name = key.slice('direct:'.length);
      console.log('🏥 [Charity] Direct charity selected:', name);

      updateSetupConfig({
        web3CharityOrgId: null,
        web3CharityName: name,
        web3CharityId: null,
        web3CharityAddress: null,
        web3CharityIsDirect: true,
      } as any);
      return;
    }

    const id = Number(key);
    const c = getGbCharityById(id);
    console.log('🏥 [Charity] TGB charity selected:', { id, name: c?.name });

    updateSetupConfig({
      web3CharityOrgId: id,
      web3CharityName: c?.name || null,
      web3CharityId: key,
      web3CharityAddress: null,
      web3CharityIsDirect: false,
    } as any);
  };

  // ── Dashboard marketplace launch prefill ──────────────────────────────────
  useEffect(() => {
    if (!marketplaceEventId) return;

    let cancelled = false;

    async function hydrateFromMarketplaceEvent() {
      setEventPrefillLoading(true);
      setEventPrefillError(null);
      setEventPrefilled(false);

      try {
        const res = await getEventById(marketplaceEventId as string);
        const event = res?.event;

        if (!event || cancelled) return;

        const safeToken = isKnownSolanaToken(event.fee_token)
          ? event.fee_token
          : 'USDG';

        const safeEntryFee =
          event.entry_fee !== null && event.entry_fee !== undefined
            ? String(event.entry_fee)
            : '';

        const nextChoice: ChoiceValue = 'solanaMainnet';
        const web3Chain: SupportedChain = 'solana';

        let nextCharityKey = '';

        if (event.charity_id === 0 && event.charity_name) {
          nextCharityKey = `direct:${event.charity_name}`;
        } else if (event.charity_id) {
          nextCharityKey = String(event.charity_id);
        }

        setHostName(event.host_name ?? '');
        setChoice(nextChoice);
        setCurrency(safeToken);
        setEntryFee(safeEntryFee);
        setCharityKey(nextCharityKey);

        if (event.charity_id === 0 && event.charity_name) {
          updateSetupConfig({
            hostName: event.host_name ?? '',
            entryFee: safeEntryFee,
            paymentMethod: 'web3',
            currencySymbol: safeToken,
            web3Chain,
            web3Currency: safeToken,
            web3CharityOrgId: null,
            web3CharityName: event.charity_name,
            web3CharityId: null,
            web3CharityAddress: null,
            web3CharityIsDirect: true,
            evmNetwork: undefined,
            solanaCluster: 'mainnet',
          } as any);
        } else {
          const c = event.charity_id ? getGbCharityById(event.charity_id) : null;

          updateSetupConfig({
            hostName: event.host_name ?? '',
            entryFee: safeEntryFee,
            paymentMethod: 'web3',
            currencySymbol: safeToken,
            web3Chain,
            web3Currency: safeToken,
            web3CharityOrgId: event.charity_id || null,
            web3CharityName: event.charity_name || c?.name || null,
            web3CharityId: event.charity_id ? String(event.charity_id) : null,
            web3CharityAddress: null,
            web3CharityIsDirect: false,
            evmNetwork: undefined,
            solanaCluster: 'mainnet',
          } as any);
        }

        onChainUpdate?.(web3Chain);

        if (!cancelled) {
          setEventPrefilled(true);
        }
      } catch (err: any) {
        if (!cancelled) {
          setEventPrefillError(err?.message ?? 'Failed to load event listing details.');
          setEventPrefilled(false);
        }
      } finally {
        if (!cancelled) {
          setEventPrefillLoading(false);
        }
      }
    }

    hydrateFromMarketplaceEvent();

    return () => {
      cancelled = true;
    };
  }, [marketplaceEventId, updateSetupConfig, onChainUpdate]);

  const lockPrefilledFields = Boolean(isDashboardLaunchFlow && eventPrefilled && !eventPrefillError);

  const completedSections = useMemo(() => {
    const host = hostName.trim().length >= 2;
    const feeOk = !!entryFee && !Number.isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0;

    const hasCharity =
      Boolean((setupConfig as any).web3CharityOrgId) ||
      Boolean((setupConfig as any).web3CharityIsDirect);

    const web3 = Boolean(choice && currency && hasCharity && feeOk);
    return { host, web3 };
  }, [hostName, choice, currency, entryFee, setupConfig]);

  const allSectionsComplete = completedSections.host && completedSections.web3;
  const selectedInfo = CHOICES.find((c) => c.value === choice);

  const getCurrentMessage = () => {
    const network = selectedInfo?.label || 'your network';

    if (lockPrefilledFields) {
      return '🎉 Event details are loaded from your dashboard listing. They are locked for this launch so the quiz matches the published event.';
    }

    if (allSectionsComplete) {
      return `🎉 Perfect! Your Web3 quiz is configured—host set, ${network} selected, token chosen, and entry fee set.`;
    }

    if (!completedSections.host) {
      return "Hi there! Let's set up your quiz together. Start with your host display name.";
    }

    return `Great! Now configure your Web3 payments on ${network}: choose token, charity, and the crypto entry fee.`;
  };

  const handleChoiceChange = (newChoice: ChoiceValue) => {
    if (lockPrefilledFields) return;

    setChoice(newChoice);
    setError('');
  };

  const handleSubmit = () => {
    if (!completedSections.host) {
      return setError('Please enter a host name with at least 2 characters.');
    }

    const parsed = Number.parseFloat(entryFee.trim());
    if (Number.isNaN(parsed) || parsed <= 0) {
      return setError('Please enter a valid entry fee greater than 0.');
    }

    const hasCharity =
      Boolean((setupConfig as any).web3CharityOrgId) ||
      Boolean((setupConfig as any).web3CharityIsDirect);

    if (!hasCharity) {
      return setError('Please select a charity.');
    }

    const meta = selectedInfo;
    if (!meta) {
      setError('Invalid blockchain selected. Please refresh and try again.');
      return;
    }

    const web3Chain: SupportedChain = meta.kind;
    const evmNetwork = meta.kind === 'evm' ? meta.evmNetwork : undefined;
    const solanaCluster = meta.kind === 'solana' ? meta.solanaCluster : undefined;

    updateSetupConfig({
      hostName: hostName.trim(),
      entryFee: entryFee.trim(),
      paymentMethod: 'web3',
      currencySymbol: currency,
      web3Chain,
      web3Currency: currency,
      web3CharityName: setupConfig.web3CharityName || null,
      evmNetwork,
      solanaCluster,
    } as any);

    setError('');
    onChainUpdate?.(web3Chain);
    onNext?.();
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const isSolana = choice === 'solanaMainnet' || choice === 'solanaDevnet';

  const selectedCharity = useMemo(() => {
    if (!charityKey_) return null;
    return allCharities.find((c) => charityKey(c) === charityKey_) ?? null;
  }, [charityKey_, allCharities]);

  const lockedInputClass = lockPrefilledFields
    ? 'cursor-not-allowed border-blue-200 bg-blue-50 text-slate-600 opacity-80'
    : '';

  const lockedBadge = lockPrefilledFields ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
      <Lock className="h-3 w-3" />
      Locked from listing
    </span>
  ) : null;

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
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

      {eventPrefillLoading && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Loading event details from your dashboard listing...
        </div>
      )}

      {lockPrefilledFields && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
          This quiz is being launched from a marketplace event. Host, blockchain, token, charity and entry fee are locked so the launch matches the published listing.
        </div>
      )}

      {eventPrefillError && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{eventPrefillError}</p>
        </div>
      )}

      {/* ── Host section ───────────────────────────────────────────────────── */}
      <div className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${completedSections.host ? 'border-green-300 bg-green-50' : 'border-border'}`}>
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">👤</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Host Information</h3>
              {completedSections.host && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
              {lockedBadge}
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
              onChange={(e) => {
                if (lockPrefilledFields) return;
                setHostName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Quiz Master Sarah, The Pub Quiz"
              className={`w-full rounded-lg border-2 px-3 py-2.5 pr-12 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:pr-16 sm:text-base ${
                completedSections.host ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-border focus:border-indigo-500'
              } ${lockedInputClass}`}
              maxLength={30}
              disabled={lockPrefilledFields}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 transform items-center gap-1 sm:right-3 sm:gap-2">
              {completedSections.host && <Check className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />}
              <span className="text-xs text-gray-400">{hostName.length}/30</span>
            </div>
          </div>
          <p className="text-fg/60 text-xs">Minimum 2 characters.</p>
        </div>
      </div>

      {/* ── Web3 payments section ─────────────────────────────────────────── */}
      <div className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${completedSections.web3 ? 'border-green-300 bg-green-50' : 'border-border'}`}>
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">🔗</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Web3 Payments</h3>
              {completedSections.web3 && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
              {lockedBadge}
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
          {!isMiniApp && (
            <div className="space-y-2">
              <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
                <Wallet className="h-4 w-4" />
                <span>Blockchain</span>
              </label>
              <select
                value={choice}
                onChange={(e) => handleChoiceChange(e.target.value as ChoiceValue)}
                disabled={lockPrefilledFields}
                className={`border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base ${lockedInputClass}`}
              >
                {CHOICES.filter((c) => enabledSet.has(c.value)).map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              <p className="text-fg/60 text-xs">{selectedInfo?.description}</p>
            </div>
          )}

          {isMiniApp && (
            <div className="space-y-2">
              <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
                <Wallet className="h-4 w-4" />
                <span>Blockchain</span>
              </label>
              <div className="flex items-center gap-2 rounded-xl border-2 border-blue-200 bg-blue-50 px-3 py-2.5">
                <span className="text-sm font-semibold text-blue-800">{selectedInfo?.label ?? DEFAULT_CHOICE}</span>
                <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-600">Locked — Mini App</span>
              </div>
              <p className="text-fg/60 text-xs">{selectedInfo?.description}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span>{isSolana ? 'Token' : 'Cryptocurrency'}</span>
            </label>
            <select
              value={currency}
              onChange={(e) => {
                if (lockPrefilledFields) return;
                setCurrency(e.target.value);
                setError('');
              }}
              disabled={lockPrefilledFields}
              className={`border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base ${lockedInputClass}`}
            >
              {availableTokens.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {currency === 'USDG' && isSolana && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <div className="mb-1 flex items-center space-x-2">
              <Sparkles className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">About Global Dollar (USDG)</span>
            </div>
            <p className="text-xs text-green-700">USDG is a Solana stablecoin backed by Paxos. Recommended for stable entry fees.</p>
          </div>
        )}

        {/* ── Charity dropdown — merged TGB + direct ──────────────────────── */}
        <div className="mt-4 space-y-2">
          <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
            <Heart className="h-4 w-4 text-red-500" />
            <span>Choose a Charity <span className="text-red-500">*</span></span>
          </label>
          <select
            value={charityKey_}
            onChange={(e) => handleCharityChange(e.target.value)}
            disabled={lockPrefilledFields}
            className={`w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base ${
              charityKey_ ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-border focus:border-indigo-500'
            } ${lockedInputClass}`}
          >
            <option value="">Select a charity...</option>

            {CHARITY_DIR.length > 0 && (
              <optgroup label="Via The Giving Block">
                {CHARITY_DIR.map((ch) => (
                  <option key={charityKey(ch)} value={charityKey(ch)}>{ch.name}</option>
                ))}
              </optgroup>
            )}

            {directCharities.length > 0 && (
              <optgroup label="Direct Donation">
                {directCharities.map((ch) => (
                  <option key={charityKey(ch)} value={charityKey(ch)}>{ch.name}</option>
                ))}
              </optgroup>
            )}
          </select>

          {selectedCharity && (
            <div className="rounded-md border border-indigo-200 bg-indigo-50 p-2 text-[11px] break-words text-indigo-800">
              {selectedCharity.direct
                ? '✓ Direct donation — wallet address managed by FundRaisely'
                : `TGB Org ID: ${(setupConfig as any).web3CharityOrgId}`}
            </div>
          )}

          <p className="text-fg/60 text-xs italic">Powered by The Giving Block and direct partnerships</p>
        </div>

        {/* ── Entry fee ───────────────────────────────────────────────────── */}
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
                onChange={(e) => {
                  if (lockPrefilledFields) return;
                  setEntryFee(e.target.value);
                  setError('');
                }}
                disabled={lockPrefilledFields}
                placeholder="5.00"
                className={`border-border w-full rounded-lg border-2 py-2.5 pl-16 pr-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:py-3 sm:pl-20 sm:pr-4 sm:text-base ${lockedInputClass}`}
              />
            </div>
            {isSolana && currency && SOLANA_TOKENS[currency as keyof typeof SOLANA_TOKENS] && (
              <p className="text-fg/60 text-xs">
                Minimum entry fee for {currency}: {SOLANA_TOKENS[currency as keyof typeof SOLANA_TOKENS].minEntryFee} {currency}
              </p>
            )}
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

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

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