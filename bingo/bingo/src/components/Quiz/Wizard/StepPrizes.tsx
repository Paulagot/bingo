// src/components/Quiz/Wizard/StepPrizes.tsx
import { useState, type FC, type FormEvent } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import type { WizardStepProps } from './WizardStepProps';
import {
  AlertCircle,
  Plus,
  Trash2,
  Gift,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Trophy,
  Info,
  Tag,
  CheckCircle,
  Target,
} from 'lucide-react';
import type { Prize } from '../types/quiz';
import ClearSetupButton from './ClearSetupButton';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

const Character = ({ message, positive }: { message: string; positive?: boolean }) => {
  const tone = positive ? 'bg-green-50 border-green-200' : 'bg-indigo-50 border-indigo-200';
  return (
    <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-4">
      {/* Image placeholder (matches other steps) */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted sm:h-16 sm:w-16">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
          <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
        </div>
      </div>
      <div className={`relative flex-1 rounded-lg border p-2 shadow-lg sm:rounded-2xl sm:p-4 ${tone}`}>
        <p className="text-fg/80 text-xs leading-tight sm:text-sm sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

const StepPrizes: FC<WizardStepProps> = ({ onNext, onBack, onResetToFirst }) => {
  const { setupConfig, updateSetupConfig, flow } = useQuizSetupStore();
  const [error, setError] = useState('');

  const prizes: Prize[] = setupConfig.prizes ?? [];
  const currency = setupConfig.currencySymbol || '€';

  const hasFirstPlace = prizes.some((p) => p.place === 1 && p.description?.trim());
  const totalValue = prizes.reduce((acc, p) => acc + (p.value || 0), 0);

  const getMessage = () => {
    if (prizes.length === 0) {
      return { message: "Let's set up prizes. Add physical items or vouchers for winners.", positive: false };
    }
    if (!hasFirstPlace) {
      return { message: 'Great start! Make sure you add a 1st place prize.', positive: false };
    }
    return {
      message: `Nice! ${prizes.length} prize${prizes.length === 1 ? '' : 's'} worth ${currency}${totalValue.toFixed(
        2
      )}. You can add more or continue.`,
      positive: true,
    };
  };

  // --- Store-backed mutators ---
  const commitPrizes = (next: Prize[]) => {
    updateSetupConfig({ prizes: next });
  };

  const handlePrizeChange = <K extends keyof Prize,>(index: number, field: K, value: Prize[K]) => {
    const updated = prizes.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    commitPrizes(updated);
    setError('');
  };

  const handleAddPrize = () => {
    if (prizes.length >= 10) return;
    const next: Prize = {
      place: prizes.length + 1,
      description: '',
      value: 0,
    };
    commitPrizes([...prizes, next]);
  };

  const handleRemovePrize = (index: number) => {
    const updated = prizes
      .filter((_, i) => i !== index)
      .map((p, i) => ({ ...p, place: i + 1 }));
    commitPrizes(updated);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!prizes.find((p) => p.place === 1 && p.description?.trim())) {
      return setError('At least a 1st place prize (with description) is required.');
    }
    // Persist prize mode along with prizes (manual distribution)
    updateSetupConfig({ prizeMode: 'cash', prizes });
    onNext();
  };

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="heading-2">Step 4 of 4: Prizes Setup</h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">Configure manual prize distribution</div>
      </div>

      <Character {...getMessage()} />

      {/* Info banner */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 sm:p-4">
        <div className="mb-1 flex items-center gap-1.5">
          <Trophy className="h-3 w-3 text-indigo-600 sm:h-4 sm:w-4" />
          <span className="text-xs font-medium text-indigo-900 sm:text-sm">Manual distribution</span>
        </div>
        <div className="text-xs text-indigo-800 sm:text-sm">
          Physical items & vouchers you’ll distribute manually
          {prizes.length > 0 && ` • ${prizes.length} prize${prizes.length === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-6">
        {/* Prize Configuration */}
        <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm transition-all sm:p-6">
          <div className="mb-3 flex items-center justify-between sm:mb-4">
            <div className="flex items-center gap-3">
              {/* Section image placeholder (no emojis) */}
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border-2 border-border bg-card sm:h-12 sm:w-12">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
                  <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
                </div>
              </div>
              <div>
                <h3 className="text-fg text-sm font-semibold sm:text-base">Prize Configuration</h3>
                <p className="text-fg/70 hidden text-xs sm:block sm:text-sm">Set up rewards for your quiz winners.</p>
              </div>
            </div>

            {prizes.length < 10 && (
              <button type="button" onClick={handleAddPrize} className="btn-primary">
                <Plus className="h-4 w-4" />
                <span>Add Prize</span>
              </button>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
            {prizes.length === 0 ? (
              <div className="text-fg/60 py-8 text-center">
                <Trophy className="mx-auto mb-2 h-8 w-8 text-fg/30 sm:h-10 sm:w-10" />
                <p className="text-xs sm:text-sm">No prizes yet. Click “Add Prize” to get started.</p>
                <p className="mt-1 text-xs text-fg/50">You need at least a 1st place prize.</p>
              </div>
            ) : (
              prizes.map((prize, index) => {
                const configured = Boolean(prize.description?.trim());
                return (
                  <div
                    key={index}
                    className={`rounded-lg border-2 p-3 transition-all sm:p-4 ${
                      configured ? 'border-green-300 bg-green-50' : 'border-border bg-muted'
                    }`}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold sm:h-9 sm:w-9 sm:text-sm ${
                            prize.place === 1
                              ? 'bg-yellow-100 text-yellow-800'
                              : prize.place === 2
                              ? 'bg-gray-100 text-fg'
                              : prize.place === 3
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {prize.place}
                        </div>
                        <div className="flex items-center gap-2">
                          <Target className="text-fg/70 h-4 w-4" />
                          <span className="text-fg text-sm font-medium sm:text-base">
                            {prize.place}
                            {ordinal(prize.place)} Place
                          </span>
                          {configured && <CheckCircle className="h-4 w-4 text-green-600" />}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePrize(index)}
                        className="rounded p-1 text-red-500 transition-colors hover:bg-red-100"
                        aria-label="Remove prize"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-fg/80 flex items-center gap-1.5 text-xs font-medium sm:text-sm">
                          <Gift className="h-4 w-4" />
                          <span>
                            Prize Description <span className="text-red-500">*</span>
                          </span>
                        </label>
                        <input
                          type="text"
                          value={prize.description || ''}
                          onChange={(e) => handlePrizeChange(index, 'description', e.target.value)}
                          placeholder="e.g., €50 Gift Card, iPad"
                          className={`w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:text-base ${
                            prize.description?.trim()
                              ? 'border-green-300 bg-green-50 focus:border-green-500'
                              : 'border-border bg-card focus:border-indigo-500'
                          }`}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-fg/80 flex items-center gap-1.5 text-xs font-medium sm:text-sm">
                            <Tag className="h-4 w-4" />
                            <span>Sponsor (optional)</span>
                          </label>
                          <input
                            type="text"
                            value={prize.sponsor || ''}
                            onChange={(e) => handlePrizeChange(index, 'sponsor', e.target.value)}
                            placeholder="Local Business"
                            className="w-full rounded-lg border-2 border-border bg-card px-3 py-2 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:text-base"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-fg/80 flex items-center gap-1.5 text-xs font-medium sm:text-sm">
                            <DollarSign className="h-4 w-4" />
                            <span>Value ({currency})</span>
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={prize.value ?? ''}
                            onChange={(e) => handlePrizeChange(index, 'value', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className={`w-full rounded-lg border-2 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:text-base ${
                              prize.value && prize.value > 0
                                ? 'border-green-300 bg-green-50 focus:border-green-500'
                                : 'border-border bg-card focus:border-indigo-500'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Preview */}
                    {prize.description?.trim() && (
                      <div className="mt-3 rounded-lg border border-border bg-card p-2">
                        <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-fg/80">
                            <strong>
                              {prize.place}
                              {ordinal(prize.place)}:
                            </strong>{' '}
                            {prize.description}
                            {prize.value && prize.value > 0 && ` (${currency}${prize.value})`}
                            {prize.sponsor && ` — ${prize.sponsor}`}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Add Prize Button (bottom) */}
          {prizes.length > 0 && prizes.length < 10 && (
            <div className="border-border mt-3 border-t pt-3 sm:mt-4 sm:pt-4">
              <button
                type="button"
                onClick={handleAddPrize}
                className="w-full rounded-lg border-2 border-dashed border-indigo-300 py-2 text-sm text-indigo-600 transition-colors hover:border-indigo-400 hover:bg-indigo-50 sm:py-3"
              >
                Add Another Prize (Max 10)
              </button>
            </div>
          )}
        </div>

        {/* Summary */}
        {prizes.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-1.5">
              <Trophy className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />
              <span className="text-sm font-medium text-green-800 sm:text-base">Prize Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs sm:gap-4 sm:text-sm">
              <div className="rounded border border-green-200 bg-card p-2 text-center">
                <div className="text-sm font-bold text-green-700 sm:text-lg">{prizes.length}</div>
                <div className="text-green-700">Prizes</div>
              </div>
              <div className="rounded border border-green-200 bg-card p-2 text-center">
                <div className="text-sm font-bold text-green-700 sm:text-lg">
                  {currency}
                  {totalValue.toFixed(2)}
                </div>
                <div className="text-green-700">Value</div>
              </div>
              <div className="rounded border border-green-200 bg-card p-2 text-center">
                <div className="text-sm font-bold text-green-700 sm:text-lg">{hasFirstPlace ? '✓' : '✗'}</div>
                <div className="text-green-700">1st Place</div>
              </div>
            </div>
          </div>
        )}

        {/* Help */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
            <div className="text-xs text-blue-800 sm:text-sm">
              <p className="mb-1 font-medium">Prize tips</p>
              <ul className="space-y-1">
                <li>• At least a 1st place prize is required</li>
                <li>• Include sponsors for credibility</li>
                <li>• A mix of values keeps things exciting</li>
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
        <div className="border-border flex justify-between border-t pt-4">
          {onBack && (
            <button type="button" onClick={onBack} className="btn-muted">
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </button>
          )}
              {/* ⬇️ IMPORTANT: flow + onCleared */}
          <ClearSetupButton
            variant="ghost"
            flow={flow ?? 'web2'}         // ensures reset keeps current flow (web2/web3)
            onCleared={onResetToFirst}    // jumps to first step after clearing
          />
          <button onClick={handleSubmit} disabled={!hasFirstPlace} className="btn-primary disabled:opacity-60">
            <span className="hidden sm:inline">Save Prizes & Continue</span>
            <span className="sm:hidden">Continue</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepPrizes;




