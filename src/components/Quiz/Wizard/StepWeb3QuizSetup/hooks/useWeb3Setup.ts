/**
 * Web3 Setup Hook
 *
 * Manages state and logic for Web3 quiz setup.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import type { SupportedChain } from '@/chains/types';
import type { ChoiceValue } from '../types';
import { ENABLED_CHOICES, CHOICES } from '../types';
import { deriveChoiceFromConfig, getTokensForChoice } from '../utils/chainUtils';
import { getCurrentMessage } from '../utils/messages';
import { validateHostName, validateEntryFee, validateCharity } from '../utils/validation';

export interface UseWeb3SetupReturn {
  // State
  hostName: string;
  choice: ChoiceValue;
  currency: string;
  charityId: string;
  entryFee: string;
  error: string;
  // Computed
  availableTokens: Array<{ value: string; label: string }>;
  completedSections: { host: boolean; web3: boolean };
  allSectionsComplete: boolean;
  currentMessage: string;
  selectedInfo: typeof CHOICES[number] | undefined;
  // Actions
  setHostName: (value: string) => void;
  setChoice: (value: ChoiceValue) => void;
  setCurrency: (value: string) => void;
  setCharityId: (value: string) => void;
  setEntryFee: (value: string) => void;
  setError: (error: string) => void;
  handleSubmit: (onNext?: () => void, onChainUpdate?: (chain: SupportedChain) => void) => void;
}

export function useWeb3Setup(): UseWeb3SetupReturn {
  const { setupConfig, updateSetupConfig, setFlow } = useQuizSetupStore();

  useEffect(() => {
    setFlow('web3');
  }, [setFlow]);

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
  const [error, setError] = useState('');

  const availableTokens = useMemo(() => getTokensForChoice(choice), [choice]);

  useEffect(() => {
    const tokenValues = availableTokens.map((t) => t.value);
    const fallback =
      choice === 'stellar'
        ? 'XLM'
        : choice === 'solanaMainnet' || choice === 'solanaDevnet'
        ? 'USDC'
        : 'USDGLO';
    if (!tokenValues.includes(currency)) setCurrency(availableTokens[0]?.value || fallback);
  }, [choice, availableTokens, currency]);

  const completedSections = useMemo(() => {
    const host = hostName.trim().length >= 2;
    const feeOk = !!entryFee && !Number.isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0;
    const hasCharity = Boolean((setupConfig as any).web3CharityOrgId);
    const web3 = Boolean(choice && currency && hasCharity && feeOk);
    return { host, web3 };
  }, [hostName, choice, currency, entryFee, setupConfig]);

  const allSectionsComplete = completedSections.host && completedSections.web3;
  const selectedInfo = CHOICES.find((c) => c.value === choice);

  const currentMessage = useMemo(
    () => getCurrentMessage(allSectionsComplete, completedSections.host, selectedInfo),
    [allSectionsComplete, completedSections.host, selectedInfo]
  );

  const handleSubmit = useCallback(
    (onNext?: () => void, onChainUpdate?: (chain: SupportedChain) => void) => {
      const hostError = validateHostName(hostName);
      if (hostError) {
        setError(hostError);
        return;
      }

      const feeError = validateEntryFee(entryFee);
      if (feeError) {
        setError(feeError);
        return;
      }

      const charityError = validateCharity(charityId);
      if (charityError) {
        setError(charityError);
        return;
      }

      const meta = selectedInfo!;
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
        evmNetwork,
        solanaCluster,
      } as any);

      setError('');
      onChainUpdate?.(web3Chain);
      onNext?.();
    },
    [hostName, entryFee, charityId, selectedInfo, currency, updateSetupConfig]
  );

  return {
    hostName,
    choice,
    currency,
    charityId,
    entryFee,
    error,
    availableTokens,
    completedSections,
    allSectionsComplete,
    currentMessage,
    selectedInfo,
    setHostName: useCallback((value: string) => {
      setHostName(value);
      setError('');
    }, []),
    setChoice: useCallback((value: ChoiceValue) => {
      setChoice(value);
      setError('');
    }, []),
    setCurrency: useCallback((value: string) => {
      setCurrency(value);
      setError('');
    }, []),
    setCharityId: useCallback((value: string) => {
      setCharityId(value);
      setError('');
    }, []),
    setEntryFee: useCallback((value: string) => {
      setEntryFee(value);
      setError('');
    }, []),
    setError,
    handleSubmit,
  };
}

