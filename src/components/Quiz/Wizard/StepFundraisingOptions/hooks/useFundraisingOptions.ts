/**
 * Fundraising Options Hook
 *
 * Manages state and logic for fundraising extras configuration.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuizSetupStore } from '@/components/Quiz/hooks/useQuizSetupStore';
import { fundraisingExtraDefinitions } from '@/components/Quiz/constants/quizMetadata';
import { getSuggestedPriceRange } from '../utils/pricing';

export interface UseFundraisingOptionsReturn {
  // State
  selectedExtras: string[];
  applicableExtras: Array<[string, typeof fundraisingExtraDefinitions[string]]>;
  totalExtraValue: number;
  allPricesSet: boolean;
  message: string;
  entitlementsLoaded: boolean;
  // Actions
  handleAddExtra: (key: string) => void;
  handleRemoveExtra: (key: string) => void;
  handlePriceChange: (key: string, value: string) => void;
  getSuggestedPriceRange: (price: string) => string;
}

export function useFundraisingOptions(): UseFundraisingOptionsReturn {
  const {
    flow,
    setupConfig,
    toggleExtra,
    setExtraPrice,
  } = useQuizSetupStore();

  const isWeb3 = flow === 'web3';
  const selectedRounds = setupConfig.roundDefinitions || [];
  const currency = setupConfig.currencySymbol || '€';
  const fundraisingOptions = setupConfig.fundraisingOptions || {};
  const fundraisingPrices = setupConfig.fundraisingPrices || {};

  // Entitlements (Web2 only)
  const [entitlements, setEntitlements] = useState<any>(null);
  const [entitlementsLoaded, setEntitlementsLoaded] = useState(!isWeb3);

  useEffect(() => {
    if (isWeb3) return;
    let cancelled = false;
    import('@/services/apiService')
      .then(({ apiService }) => apiService.getEntitlements())
      .then((json) => {
        if (!cancelled) setEntitlements(json);
      })
      .catch(() => {
        if (!cancelled) setEntitlements(null);
      })
      .finally(() => {
        if (!cancelled) setEntitlementsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isWeb3]);

  const allowedExtrasArr: string[] | null =
    !isWeb3 && Array.isArray(entitlements?.extras_allowed)
      ? (entitlements.extras_allowed as string[])
      : null;

  const isExtraAllowed = useCallback(
    (key: string) => (isWeb3 ? true : !allowedExtrasArr || allowedExtrasArr.includes(key)),
    [isWeb3, allowedExtrasArr]
  );

  // Applicable extras
  const applicableExtrasBase = useMemo(
    () =>
      Object.entries(fundraisingExtraDefinitions).filter(([_, rule]) =>
        selectedRounds.some(
          (round) =>
            rule.applicableTo === 'global' ||
            (Array.isArray(rule.applicableTo) && rule.applicableTo.includes(round.roundType))
        )
      ),
    [selectedRounds]
  );

  const applicableExtras = useMemo(
    () =>
      isWeb3
        ? applicableExtrasBase
        : applicableExtrasBase.filter(([key]) => isExtraAllowed(key)),
    [isWeb3, applicableExtrasBase, isExtraAllowed]
  );

  // Selected extras
  const selectedExtras = useMemo(
    () =>
      Object.keys(fundraisingOptions)
        .filter((key) => fundraisingOptions[key as keyof typeof fundraisingOptions])
        .filter((key) => isExtraAllowed(key)),
    [fundraisingOptions, isExtraAllowed]
  );

  // Actions
  const handleAddExtra = useCallback(
    (key: string) => {
      if (!isExtraAllowed(key)) return;
      const currentlyEnabled = !!fundraisingOptions[key as keyof typeof fundraisingOptions];
      if (!currentlyEnabled) toggleExtra(key);
    },
    [isExtraAllowed, fundraisingOptions, toggleExtra]
  );

  const handleRemoveExtra = useCallback(
    (key: string) => {
      const currentlyEnabled = !!fundraisingOptions[key as keyof typeof fundraisingOptions];
      if (currentlyEnabled) toggleExtra(key);
      setExtraPrice(key, undefined);
    },
    [fundraisingOptions, toggleExtra, setExtraPrice]
  );

  const handlePriceChange = useCallback(
    (key: string, value: string) => {
      const parsed = parseFloat(value);
      if (!isNaN(parsed) && parsed > 0) setExtraPrice(key, parsed);
      else setExtraPrice(key, undefined);
    },
    [setExtraPrice]
  );

  // Computed
  const totalExtraValue = useMemo(
    () =>
      selectedExtras.reduce((sum, key) => {
        const price = fundraisingPrices[key];
        return sum + (typeof price === 'number' ? price : 0);
      }, 0),
    [selectedExtras, fundraisingPrices]
  );

  const allPricesSet = useMemo(
    () =>
      selectedExtras.every(
        (key) => typeof fundraisingPrices[key] === 'number' && fundraisingPrices[key] > 0
      ),
    [selectedExtras, fundraisingPrices]
  );

  const message = useMemo(
    () =>
      selectedExtras.length > 0
        ? `Great! You've enabled ${selectedExtras.length} fundraising extra${selectedExtras.length > 1 ? 's' : ''}. Set a price for each to continue.`
        : 'Fundraising extras are optional add-ons that boost engagement and donations. Tap the eye icon to see strategy details!',
    [selectedExtras.length]
  );

  const getSuggestedPriceRangeForCurrency = useCallback(
    (price: string) => getSuggestedPriceRange(price, currency),
    [currency]
  );

  return {
    selectedExtras,
    applicableExtras,
    totalExtraValue,
    allPricesSet,
    message,
    entitlementsLoaded,
    handleAddExtra,
    handleRemoveExtra,
    handlePriceChange,
    getSuggestedPriceRange: getSuggestedPriceRangeForCurrency,
  };
}

