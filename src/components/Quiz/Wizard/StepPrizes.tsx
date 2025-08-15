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
    const base = "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all duration-300";
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
    <div className="flex items-start space-x-3 md:space-x-4 mb-6">
      <div className={getCharacterStyle()}>{getEmoji()}</div>
      <div className="relative bg-white rounded-2xl p-3 md:p-4 shadow-lg border-2 border-gray-200 max-w-sm md:max-w-lg flex-1">
        <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
        <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
        <p className="text-gray-700 text-sm md:text-base">{message}</p>
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
        message: "Let's set up your quiz prizes! You can add physical items, vouchers, gift cards, or any rewards you want to give winners. Don't forget to include sponsors if applicable!" 
      };
    }
    
    const hasFirstPlace = prizes.some(p => p.place === 1);
    if (!hasFirstPlace) {
      return { 
        expression: "encouraging", 
        message: "Great start! Make sure you have at least a 1st place prize defined. You can add multiple prizes for different placing positions." 
      };
    }
    
    const totalValue = prizes.reduce((acc, p) => acc + (p.value || 0), 0);
    return { 
      expression: "excited", 
      message: `Excellent! You have ${prizes.length} prize${prizes.length === 1 ? '' : 's'} set up with a total value of ${currency}${totalValue.toFixed(2)}. Your participants will be motivated to win!` 
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
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">
          Step 4 of 4: Prizes Setup
        </h2>
        <div className="text-xs md:text-sm text-gray-600">Configure manual prize distribution</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Prize Setup Info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-4 sticky top-4 z-10">
        <div className="flex items-center space-x-2 mb-2">
          <Trophy className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-indigo-800 text-sm md:text-base">Manual Prize Distribution</span>
        </div>
        <div className="text-xs md:text-sm text-indigo-700">
          Physical items, vouchers, and rewards you'll distribute manually
          {prizes.length > 0 && ` • ${prizes.length} prize${prizes.length === 1 ? '' : 's'} configured`}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Prize Configuration */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-yellow-100">
                🏆
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">Prize Configuration</h3>
                <p className="text-sm text-gray-600">Set up rewards for your quiz winners</p>
              </div>
            </div>
            {prizes.length < 10 && (
              <button
                type="button"
                onClick={handleAddPrize}
                className="flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Prize</span>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {prizes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No prizes added yet. Click "Add Prize" to get started!</p>
                <p className="text-xs text-gray-400 mt-1">You need at least a 1st place prize</p>
              </div>
            ) : (
              prizes.map((prize, index) => (
                <div
                  key={index}
                  className="border-2 border-gray-200 rounded-xl p-4 bg-gray-50 hover:bg-white transition-colors"
                >
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        prize.place === 1 ? 'bg-yellow-100 text-yellow-800' :
                        prize.place === 2 ? 'bg-gray-100 text-gray-800' :
                        prize.place === 3 ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {prize.place}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Target className="w-4 h-4 text-gray-600" />
                        <span className="font-semibold text-gray-800">
                          {prize.place}{ordinal(prize.place)} Place Prize
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePrize(index)}
                      className="p-1 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Prize Description */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Gift className="w-4 h-4" />
                        <span>Prize Description <span className="text-red-500">*</span></span>
                      </label>
                      <input
                        type="text"
                        value={prize.description || ''}
                        onChange={(e) => handlePrizeChange(index, 'description', e.target.value)}
                        placeholder="e.g., £50 Gift Card, iPad, Dinner Voucher"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                      />
                    </div>

                    {/* Sponsor */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <Tag className="w-4 h-4" />
                        <span>Sponsor (optional)</span>
                      </label>
                      <input
                        type="text"
                        value={prize.sponsor || ''}
                        onChange={(e) => handlePrizeChange(index, 'sponsor', e.target.value)}
                        placeholder="e.g., Local Business, Amazon"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                      />
                    </div>

                    {/* Value */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span>Value ({currency})</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={prize.value || ''}
                        onChange={(e) => handlePrizeChange(index, 'value', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                      />
                    </div>
                  </div>

                  {/* Prize Preview */}
                  {prize.description && (
                    <div className="mt-3 p-2 bg-white rounded border border-gray-200">
                      <div className="flex items-center space-x-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700">
                          <strong>{prize.place}{ordinal(prize.place)} Place:</strong> {prize.description}
                          {prize.value && prize.value > 0 && ` (${currency}${prize.value})`}
                          {prize.sponsor && ` - Sponsored by ${prize.sponsor}`}
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
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={handleAddPrize}
                className="w-full flex items-center justify-center space-x-2 py-3 border-2 border-dashed border-indigo-300 text-indigo-600 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Another Prize (Max: 10)</span>
              </button>
            </div>
          )}
        </div>

        {/* Prize Summary */}
        {prizes.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">Prize Summary</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-2 bg-white rounded border border-green-200">
                <div className="font-bold text-green-700 text-lg">{prizes.length}</div>
                <div className="text-green-600">Total Prizes</div>
              </div>
              <div className="text-center p-2 bg-white rounded border border-green-200">
                <div className="font-bold text-green-700 text-lg">{currency}{totalValue.toFixed(2)}</div>
                <div className="text-green-600">Total Value</div>
              </div>
              <div className="text-center p-2 bg-white rounded border border-green-200">
                <div className="font-bold text-green-700 text-lg">
                  {hasFirstPlace ? '✓' : '✗'}
                </div>
                <div className="text-green-600">1st Place Set</div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Prize Setup Tips</p>
              <ul className="space-y-1 text-xs">
                <li>• At least a 1st place prize is required to continue</li>
                <li>• Include sponsors to acknowledge supporters and add credibility</li>
                
                <li>• Consider a mix of prizes: gift cards, experiences, physical items</li>
                <li>• You'll distribute these manually after the quiz ends</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t border-gray-200">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <button
            type="submit"
            disabled={!hasFirstPlace}
            className="flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span>Save Prizes & Continue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepPrizes;



