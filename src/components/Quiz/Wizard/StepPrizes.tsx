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
  Target
} from 'lucide-react';
import type { Prize } from '../types/quiz';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
};

const Character = ({ expression, message }: { expression: string; message: string }) => {
  const getCharacterStyle = (): string => {
    const base = "w-8 h-8 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-lg sm:text-2xl transition-all duration-300";
    switch (expression) {
      case "excited": return `${base} bg-gradient-to-br from-indigo-400 to-purple-500 animate-bounce`;
      case "explaining": return `${base} bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse`;
      case "strategic": return `${base} bg-gradient-to-br from-orange-400 to-red-500`;
      case "encouraging": return `${base} bg-gradient-to-br from-green-400 to-blue-500`;
      default: return `${base} bg-gradient-to-br from-gray-400 to-gray-600`;
    }
  };

  const getEmoji = (): string => {
    switch (expression) {
      case "excited": return "🎯";
      case "explaining": return "💡";
      case "strategic": return "🧠";
      case "encouraging": return "⚡";
      default: return "😊";
    }
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
      <div className={getCharacterStyle()}>{getEmoji()}</div>
      <div className="relative bg-white rounded-lg sm:rounded-2xl p-2 sm:p-4 shadow-lg border border-gray-200 flex-1">
        <p className="text-gray-700 text-xs sm:text-base leading-tight sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

const StepPrizes: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [error, setError] = useState('');
  const [prizes, setPrizes] = useState<Prize[]>(setupConfig.prizes || []);

  const currency = setupConfig.currencySymbol || '€';

  const getCurrentMessage = () => {
    if (prizes.length === 0) {
      return { 
        expression: "explaining", 
        message: "Let's set up prizes! Add physical items, vouchers, or any rewards for winners." 
      };
    }
    
    const hasFirstPlace = prizes.some(p => p.place === 1);
    if (!hasFirstPlace) {
      return { 
        expression: "encouraging", 
        message: "Great start! Make sure you have at least a 1st place prize." 
      };
    }
    
    const totalValue = prizes.reduce((acc, p) => acc + (p.value || 0), 0);
    return { 
      expression: "excited", 
      message: `Perfect! ${prizes.length} prize${prizes.length === 1 ? '' : 's'} worth ${currency}${totalValue.toFixed(2)}. Participants will be motivated!` 
    };
  };

  const handlePrizeChange = <K extends keyof Prize>(
    index: number,
    field: K,
    value: Prize[K]
  ) => {
    const updated = [...prizes];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setPrizes(updated);
    setError('');
  };

  const handleAddPrize = () => {
    if (prizes.length >= 10) return;
    setPrizes([
      ...prizes,
      {
        place: prizes.length + 1,
        description: '',
        value: 0,
      },
    ]);
  };

  const handleRemovePrize = (index: number) => {
    const updated = [...prizes];
    updated.splice(index, 1);
    setPrizes(updated.map((p, i) => ({ ...p, place: i + 1 })));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!prizes.find((p) => p.place === 1)) {
      return setError('At least a 1st place prize must be defined.');
    }

    updateSetupConfig({ prizeMode: 'cash', prizes });
    onNext();
  };

  const totalValue = prizes.reduce((acc, p) => acc + (p.value || 0), 0);
  const hasFirstPlace = prizes.some(p => p.place === 1);

  return (
    <div className="w-full px-2 sm:px-4 space-y-3 sm:space-y-6 pb-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-base sm:text-xl font-semibold text-indigo-800">
          Step 4 of 4: Prizes Setup
        </h2>
        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">Configure manual prize distribution</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Prize Setup Info - Compact */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 sm:p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-600" />
          <span className="font-medium text-indigo-800 text-xs sm:text-base">Manual Distribution</span>
        </div>
        <div className="text-xs text-indigo-700">
          Physical items & vouchers you'll distribute manually
          {prizes.length > 0 && ` • ${prizes.length} prize${prizes.length === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className="space-y-3 sm:space-y-6">
        {/* Prize Configuration */}
        <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-6 shadow-sm transition-all duration-200">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-12 sm:h-12 rounded bg-yellow-100 flex items-center justify-center text-lg sm:text-2xl">
                🏆
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 text-sm sm:text-lg">Prize Configuration</h3>
                <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Set up rewards for your quiz winners</p>
              </div>
            </div>
            {prizes.length < 10 && (
              <button
                type="button"
                onClick={handleAddPrize}
                className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-indigo-600 text-white rounded font-medium text-xs sm:text-sm hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Add Prize</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>

          <div className="space-y-3 sm:space-y-4">
            {prizes.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <Trophy className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-xs sm:text-sm">No prizes added yet. Click "Add" to get started!</p>
                <p className="text-xs text-gray-400 mt-1">You need at least a 1st place prize</p>
              </div>
            ) : (
              prizes.map((prize, index) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50 hover:bg-white transition-colors"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                        prize.place === 1 ? 'bg-yellow-100 text-yellow-800' :
                        prize.place === 2 ? 'bg-gray-100 text-gray-800' :
                        prize.place === 3 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {prize.place}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600" />
                        <span className="font-medium text-gray-800 text-sm sm:text-base">
                          {prize.place}{ordinal(prize.place)} Place
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePrize(index)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Mobile-optimized inputs - stacked layout */}
                  <div className="space-y-3">
                    {/* Prize Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1.5">
                        <Gift className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span>Prize Description <span className="text-red-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        value={prize.description || ''}
                        onChange={(e) => handlePrizeChange(index, 'description', e.target.value)}
                        placeholder="e.g., £50 Gift Card, iPad"
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition text-sm"
                      />
                    </div>

                    {/* Sponsor and Value - side by side on mobile when there's space */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          <Tag className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Sponsor (optional)</span>
                        </label>
                        <input
                          type="text"
                          value={prize.sponsor || ''}
                          onChange={(e) => handlePrizeChange(index, 'sponsor', e.target.value)}
                          placeholder="Local Business"
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-1.5">
                          <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>Value ({currency})</span>
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={prize.value || ''}
                          onChange={(e) => handlePrizeChange(index, 'value', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none transition text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Prize Preview - Compact */}
                  {prize.description && (
                    <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                      <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-600 flex-shrink-0" />
                        <span className="text-gray-700 min-w-0">
                          <strong>{prize.place}{ordinal(prize.place)}:</strong> {prize.description}
                          {prize.value && prize.value > 0 && ` (${currency}${prize.value})`}
                          {prize.sponsor && ` - ${prize.sponsor}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Add Prize Button (bottom) */}
          {prizes.length > 0 && prizes.length < 10 && (
            <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleAddPrize}
                className="w-full flex items-center justify-center gap-2 py-2 sm:py-3 border-2 border-dashed border-indigo-300 text-indigo-600 rounded hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-sm"
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>Add Another Prize (Max: 10)</span>
              </button>
            </div>
          )}
        </div>

        {/* Prize Summary - Mobile optimized */}
        {prizes.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <span className="font-medium text-green-800 text-sm sm:text-base">Prize Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="text-center p-2 bg-white rounded border border-green-200">
                <div className="font-bold text-green-700 text-sm sm:text-lg">{prizes.length}</div>
                <div className="text-green-600">Prizes</div>
              </div>
              <div className="text-center p-2 bg-white rounded border border-green-200">
                <div className="font-bold text-green-700 text-sm sm:text-lg">{currency}{totalValue.toFixed(2)}</div>
                <div className="text-green-600">Value</div>
              </div>
              <div className="text-center p-2 bg-white rounded border border-green-200">
                <div className="font-bold text-green-700 text-sm sm:text-lg">
                  {hasFirstPlace ? '✓' : '✗'}
                </div>
                <div className="text-green-600">1st Place</div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section - Compact */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs sm:text-sm text-blue-800">
              <p className="font-medium mb-1">Prize Tips</p>
              <ul className="space-y-1 text-xs">
                <li>• At least 1st place prize required</li>
                <li>• Include sponsors for credibility</li>
                <li>• Mix of prizes works best</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
            <AlertCircle className="h-3 h-3 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
            <p className="text-xs sm:text-sm">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-gray-200">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors text-sm sm:text-base"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!hasFirstPlace}
            className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm sm:text-base"
          >
            <span className="hidden sm:inline">Save Prizes & Continue</span>
            <span className="sm:hidden">Continue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StepPrizes;



