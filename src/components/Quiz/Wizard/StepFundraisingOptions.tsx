// src/components/Quiz/Wizard/StepFundraisingOptions.tsx
import React, { useState, useEffect } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import { fundraisingExtraDefinitions, roundTypeDefinitions } from '../constants/quizMetadata';
import type { FundraisingExtraDefinition } from '../constants/quizMetadata';
import {
  Globe,
  Target,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
} from 'lucide-react';
import ClearSetupButton from './ClearSetupButton';
import type { WizardStepProps } from './WizardStepProps';

interface SimpleCardProps {
  extraKey: string;
  details: FundraisingExtraDefinition;
  onAdd: (key: string) => void;
  getSuggestedPriceRange: (price: string) => string;
  getApplicabilityInfo: (rule: FundraisingExtraDefinition) => { text: string; icon: React.ReactNode; color: string };
}

const Character = ({ message }: { message: string }) => {
  const bubbleTone = message.includes('enabled')
    ? 'bg-green-50 border-green-200'
    : 'bg-indigo-50 border-indigo-200';

  return (
    <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-4">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted sm:h-16 sm:w-16">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
          <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
        </div>
      </div>
      <div className={`relative flex-1 rounded-lg border p-2 shadow-lg sm:rounded-2xl sm:p-4 ${bubbleTone}`}>
        <p className="text-fg/80 text-xs leading-tight sm:text-sm sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

const SimpleCard: React.FC<SimpleCardProps> = ({
  extraKey,
  details,
  onAdd,
  getSuggestedPriceRange,
  getApplicabilityInfo,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const applicability = getApplicabilityInfo(details);

  return (
    <div className="relative cursor-pointer rounded-lg border-2 border-border bg-muted p-3 transition-all hover:border-indigo-300 hover:shadow-md sm:rounded-xl sm:p-4">
      {/* expand / actions */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowDetails((s) => !s);
        }}
        className="absolute right-2 top-2 rounded p-1 text-fg/60 hover:bg-muted hover:text-fg"
        aria-label="Toggle details"
      >
        <Eye className="h-4 w-4" />
      </button>

      {/* header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-lg sm:h-12 sm:w-12 sm:text-xl">
          {details.icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-fg mb-1 truncate text-sm font-semibold sm:text-base">{details.label}</h4>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                details.excitement === 'High'
                  ? 'border-red-200 bg-red-100 text-red-800'
                  : details.excitement === 'Medium'
                  ? 'border-yellow-200 bg-yellow-100 text-yellow-800'
                  : 'border-green-200 bg-green-100 text-green-800'
              }`}
            >
              {details.excitement}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${applicability.color}`}>
              {applicability.icon}
              {applicability.text}
            </span>
          </div>
        </div>
      </div>

      {/* description */}
      <p className="text-fg/80 mb-3 text-xs sm:text-sm">{details.description}</p>

      {/* suggested price */}
      <div className="mb-3 text-xs text-fg/70 sm:text-sm">
        Suggested: <span className="font-medium">{getSuggestedPriceRange(details.suggestedPrice)}</span>
      </div>

      {/* primary action */}
      <button onClick={() => onAdd(extraKey)} className="btn-primary w-full">
        <Plus className="h-4 w-4" />
        <span>Add Extra</span>
      </button>

      {/* expandable details */}
      {showDetails && (
        <div className="mt-3 rounded-lg border border-border bg-card p-3 sm:p-4">
          <div className="space-y-3 text-xs sm:text-sm">
            {details.strategy && (
              <div>
                <h5 className="text-fg mb-1 font-medium">Strategy</h5>
                <p className="text-fg/70">{details.strategy}</p>
              </div>
            )}
            {details.impact && (
              <div>
                <h5 className="text-fg mb-1 font-medium">Impact</h5>
                <p className="text-fg/70">{details.impact}</p>
              </div>
            )}
            {details.pros?.length ? (
              <div>
                <h5 className="text-fg mb-1 font-medium">Benefits</h5>
                <div className="flex flex-wrap gap-1">
                  {details.pros.map((pro, i) => (
                    <span key={i} className="rounded bg-indigo-100 px-1.5 py-0.5 text-xs text-indigo-700">
                      {pro}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export const StepFundraisingOptions: React.FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  const {
    flow,                 // 🧭 flow-aware
    setupConfig,
    toggleExtra,          // store helpers
    setExtraPrice,
  } = useQuizSetupStore();

  const isWeb3 = flow === 'web3';

  const selectedRounds = setupConfig.roundDefinitions || [];
  const currency = setupConfig.currencySymbol || '€';
  const fundraisingOptions = setupConfig.fundraisingOptions || {};
  const fundraisingPrices = setupConfig.fundraisingPrices || {};

  // ──────────────────────────────────────────────────────────────
  // Entitlements (Web2 only). Web3: skip entitlements completely.
  // ──────────────────────────────────────────────────────────────
  const [entitlements, setEntitlements] = useState<any>(null);
  const [entitlementsLoaded, setEntitlementsLoaded] = useState(!isWeb3); // if web3, treat as "loaded"

  useEffect(() => {
    if (isWeb3) return; // skip for Web3
    let cancelled = false;
    import('../../../services/apiService')
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

  const isExtraAllowed = (key: string) => (isWeb3 ? true : !allowedExtrasArr || allowedExtrasArr.includes(key));

  // ──────────────────────────────────────────────────────────────
  // Applicable extras: must match selected rounds.
  // Web3: show all applicable (ignore entitlements).
  // Web2: filter by entitlements if provided.
  // ──────────────────────────────────────────────────────────────
  const applicableExtrasBase = Object.entries(fundraisingExtraDefinitions).filter(([_, rule]) =>
    selectedRounds.some(
      (round) =>
        rule.applicableTo === 'global' ||
        (Array.isArray(rule.applicableTo) && rule.applicableTo.includes(round.roundType))
    )
  );

  const applicableExtras = isWeb3
    ? applicableExtrasBase
    : applicableExtrasBase.filter(([key]) => isExtraAllowed(key));

  // Which extras are currently selected (and allowed if Web2)
  const selectedExtras = Object.keys(fundraisingOptions)
    .filter((key) => fundraisingOptions[key as keyof typeof fundraisingOptions])
    .filter((key) => isExtraAllowed(key));

  // ──────────────────────────────────────────────────────────────
  // Store-backed actions
  // ──────────────────────────────────────────────────────────────
  const handleAddExtra = (key: string) => {
    if (!isExtraAllowed(key)) return;
    const currentlyEnabled = !!fundraisingOptions[key as keyof typeof fundraisingOptions];
    if (!currentlyEnabled) toggleExtra(key);
  };

  const handleRemoveExtra = (key: string) => {
    const currentlyEnabled = !!fundraisingOptions[key as keyof typeof fundraisingOptions];
    if (currentlyEnabled) toggleExtra(key);
    setExtraPrice(key, undefined);
  };

const handlePriceChange = (key: string, value: string) => {
  // Allow all partial inputs
  if (
    value === '' ||
    value === '.' ||
    value === '0' ||
    value === '0.' ||
    /^[0-9]*\.?[0-9]*$/.test(value)  // decimal pattern
  ) {
    // Convert to number when possible
    const parsed = parseFloat(value);
    if (!isNaN(parsed)) {
      setExtraPrice(key, parsed);
    } else {
      setExtraPrice(key, undefined);
    }
  }
};



  // ──────────────────────────────────────────────────────────────
  // UI helpers
  // ──────────────────────────────────────────────────────────────
  const getApplicabilityInfo = (rule: FundraisingExtraDefinition) => {
    if (rule.applicableTo === 'global') {
      return { text: 'All Rounds', icon: <Globe className="h-3 w-3" />, color: 'text-purple-700 bg-purple-100' };
    }
    const roundTypeNames = (rule.applicableTo as string[])
      .map((type) => roundTypeDefinitions[type as keyof typeof roundTypeDefinitions]?.name || type)
      .join(', ');
    return { text: roundTypeNames, icon: <Target className="h-3 w-3" />, color: 'text-blue-700 bg-blue-100' };
  };

  const getSuggestedPriceRange = (suggestedPrice: string) => {
    const ranges = {
      'Low-Medium': { min: 1, max: 3 },
      Medium: { min: 3, max: 5 },
      High: { min: 5, max: 10 },
      Low: { min: 1, max: 2 },
      default: { min: 2, max: 5 },
    };
    const base = (ranges as Record<string, { min: number; max: number }>)[suggestedPrice] || ranges.default;
    const adjusted = { ...base };
    switch (currency) {
      case '£':
        adjusted.min = Math.max(1, Math.round(base.min * 0.85));
        adjusted.max = Math.round(base.max * 0.85);
        break;
      case '₹':
        adjusted.min = Math.round(base.min * 80);
        adjusted.max = Math.round(base.max * 80);
        break;
      case '¥':
        adjusted.min = Math.round(base.min * 150);
        adjusted.max = Math.round(base.max * 150);
        break;
      default:
        break;
    }
    return `${adjusted.min}-${adjusted.max} ${currency}` ;
  };

  const totalExtraValue = selectedExtras.reduce((sum, key) => {
    const price = fundraisingPrices[key];
    return sum + (typeof price === 'number' ? price : 0);
  }, 0);

  const allPricesSet = selectedExtras.every(
    (key) => typeof fundraisingPrices[key] === 'number' && fundraisingPrices[key] > 0
  );

  const message =
    selectedExtras.length > 0
      ? `Great! You've enabled ${selectedExtras.length} fundraising extra${selectedExtras.length > 1 ? 's' : ''}. Set a price for each to continue.`
      : 'Fundraising extras are optional add-ons that boost engagement and donations. Tap the eye icon to see strategy details!';

  // If Web2 and entitlements are still loading, you can show a tiny loader (optional)
  // For simplicity we just proceed; applicableExtras will be empty until loaded if filtering is strict.

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="heading-2">
          {isWeb3 ? 'Step 3 of 4' : 'Step 3 of 4'}: Fundraising Extras (Optional)
        </h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">
          Optional add-ons to boost engagement{isWeb3 ? ' (compatible with crypto entry fees)' : ''}
        </div>
      </div>

      <Character message={message} />

      {/* Revenue indicator */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 sm:p-4">
        <div className="mb-1 flex items-center gap-2">
          <TrendingUp className="h-3 w-3 text-indigo-600 sm:h-4 sm:w-4" />
          <span className="text-sm font-medium text-indigo-900 sm:text-base">Potential Revenue</span>
        </div>
        <div className="text-xs text-indigo-800 sm:text-sm">
          Enabled: <strong>{selectedExtras.length}</strong> • Revenue/Device:{' '}
          <strong>            
            {totalExtraValue.toFixed(2)}
            {currency}
          </strong>
        </div>
      </div>

      {/* Selected extras */}
      {selectedExtras.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-fg text-sm font-medium sm:text-base">Your Extras ({selectedExtras.length})</h3>
          <div className="space-y-2 sm:space-y-3">
            {selectedExtras.map((key) => {
              const details = fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions];
              const applicability = getApplicabilityInfo(details);
              const price = fundraisingPrices[key] ?? '';
              const priceSet = typeof fundraisingPrices[key] === 'number' && fundraisingPrices[key] > 0;

              return (
                <div
                  key={key}
                  className={`rounded-lg border-2 p-3 transition-all sm:rounded-xl sm:p-4 ${
                    priceSet ? 'border-green-300 bg-green-50' : 'border-border bg-muted'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 text-lg sm:h-12 sm:w-12 sm:text-xl">
                        {details.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-fg text-sm font-semibold sm:text-base">{details.label}</h4>
                          {priceSet && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                        <p className="text-fg/70 text-xs sm:text-sm">{details.description}</p>
                        <div className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs">
                          <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${applicability.color}`}>
                            {applicability.icon}
                            <span className="ml-1">{applicability.text}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveExtra(key)}
                      className="flex-shrink-0 rounded p-1 transition-colors hover:bg-red-100"
                      title="Remove extra"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <label className="text-fg/80 text-xs font-medium sm:text-sm">Price ({currency})</label>
                  <input
  type="text"
  inputMode="decimal"
  pattern="[0-9]*[.,]?[0-9]*"
  value={price}
  onChange={(e) => handlePriceChange(key, e.target.value)}
  className={`w-24 rounded-lg border-2 px-2 py-1 text-xs outline-none transition
    focus:ring-2 focus:ring-indigo-200 sm:w-28 sm:text-sm ${
      priceSet
        ? 'border-green-300 bg-green-50 focus:border-green-500'
        : 'border-border focus:border-indigo-500'
    }`}
  placeholder="0.00"
/>

                      <span className="text-fg/60 hidden text-xs sm:inline">
                        Suggested: {getSuggestedPriceRange(details.suggestedPrice)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!allPricesSet && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 sm:text-sm">
              ⚠️ Please set prices for all selected extras before continuing.
            </div>
          )}
        </div>
      )}

      {/* Available extras */}
      {selectedExtras.length < applicableExtras.length && (
        <div className="space-y-3 sm:space-y-4">
          <h3 className="text-fg text-sm font-medium sm:text-base">Available Extras</h3>
          {!isWeb3 && !entitlementsLoaded && (
            <div className="text-fg/70 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs sm:p-3 sm:text-sm">
              Loading available extras…
            </div>
          )}
          <div className="text-fg/70 rounded-lg border border-blue-200 bg-blue-50 p-2 text-xs sm:p-3 sm:text-sm">
            💡 <strong>Tip:</strong> Tap the eye icon to see strategy details.
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {applicableExtras
              .filter(([key]) => !selectedExtras.includes(key))
              .map(([key, details]) => (
                <SimpleCard
                  key={key}
                  extraKey={key}
                  details={details}
                  onAdd={handleAddExtra}
                  getSuggestedPriceRange={getSuggestedPriceRange}
                  getApplicabilityInfo={getApplicabilityInfo}
                />
              ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="border-border flex justify-between border-t pt-4">
       
       {onBack && (
  <button onClick={onBack} className="btn-muted">
    <ChevronLeft className="h-4 w-4" />
    <span>Back</span>
  </button>
)}

         <ClearSetupButton
variant="ghost" flow={flow ?? (setupConfig.paymentMethod === 'web3' ? 'web3' : 'web2')}
 onCleared={onResetToFirst}
/>
        <button
          onClick={onNext}
          disabled={selectedExtras.length > 0 && !allPricesSet}
          className="btn-primary disabled:opacity-60"
        >
          <span>Next</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepFundraisingOptions;
















