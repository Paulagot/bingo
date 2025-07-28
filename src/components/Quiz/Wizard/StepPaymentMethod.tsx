// src/components/Quiz/Wizard/StepPaymentMethod.tsx
import { useState, useEffect, type FC, type FormEvent } from 'react';
import {
  CreditCard,
  AlertCircle,
  Info,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Trophy
} from 'lucide-react';
import { useQuizSetupStore } from '../useQuizSetupStore';
import type { WizardStepProps } from './WizardStepProps';

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

const StepPaymentMethod: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();

  const [entryFee, setEntryFee] = useState(setupConfig.entryFee || '');
  const [currencySymbol, setCurrencySymbol] = useState(setupConfig.currencySymbol || '€');
  const [error, setError] = useState<string>('');

  const currencyOptions = [
    { symbol: '€', label: 'Euro (EUR)' },
    { symbol: '$', label: 'Dollar (USD)' },
    { symbol: '£', label: 'British Pound (GBP)' },
    { symbol: '₹', label: 'Indian Rupee (INR)' },
    { symbol: '¥', label: 'Japanese Yen (JPY)' },
  ];

  const getCurrentMessage = () => {
    if (!entryFee) {
      return { 
        expression: "explaining", 
        message: "Let's set your entry fee! If you are using teams, its one device per team and price you set here is the team entry fee.  If you are not using teams, this is the entry price per player.  Each player must have a device.   You'll collect entry fees manually using cash or debit. This works perfectly for in-person and club-run events." 
      };
    }
    
    const fee = parseFloat(entryFee);
    if (isNaN(fee) || fee <= 0) {
      return { 
        expression: "encouraging", 
        message: "Please enter a valid entry fee amount greater than 0. This will be what each participant pays to join your quiz." 
      };
    }
    
    return { 
      expression: "excited", 
      message: `Perfect! Entry fee set to ${currencySymbol}${entryFee}. You'll collect this manually from each participant when they arrive.` 
    };
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmed = entryFee.trim();
    const parsed = Number.parseFloat(trimmed);

    if (!trimmed || Number.isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid entry fee greater than 0.');
      return;
    }

    updateSetupConfig({
      entryFee: trimmed,
      paymentMethod: 'cash_or_revolut', // Always set to cash/debit since that's the only option
      currencySymbol,
    });

    onNext();
  };

  const estimatedPrizePool = entryFee ? (parseFloat(entryFee) * 10).toFixed(2) : '0'; // Example calculation

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">
          Step 2 of 8: Entry Fee
        </h2>
        <div className="text-xs md:text-sm text-gray-600">Set your quiz entry fee</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Payment Method Info Card */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-4 sticky top-4 z-10">
        <div className="flex items-center space-x-2 mb-2">
          <CreditCard className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-indigo-800 text-sm md:text-base">Payment Collection</span>
        </div>
        <div className="text-xs md:text-sm text-indigo-700">
          Cash or Debit  - You collect entry fees manually
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Currency & Entry Fee in Card Format */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-green-100">
              💰
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Entry Fee Setup</h3>
              <p className="text-sm text-gray-600">Choose your currency and set the entry fee amount</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Currency Selector */}
            <div className="space-y-2">
              <label htmlFor="currency" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Currency</span>
              </label>
              <select
                id="currency"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              >
                {currencyOptions.map((opt) => (
                  <option key={opt.symbol} value={opt.symbol}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Entry Fee Input */}
            <div className="space-y-2">
              <label htmlFor="entryFee" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Entry Fee Amount</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  {currencySymbol}
                </span>
                <input
                  id="entryFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryFee}
                  onChange={(e) => {
                    setEntryFee(e.target.value);
                    setError('');
                  }}
                  placeholder="5.00"
                  className="w-full pl-8 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
                />
              </div>
            </div>
          </div>

          {entryFee && !isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-1">
                <Trophy className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Entry Fee Set</span>
              </div>
              <p className="text-sm text-green-700">
                Each participant will pay <strong>{currencySymbol}{entryFee}</strong> to join your quiz
              </p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Payment Collection Tips</p>
              <ul className="space-y-1 text-xs">
                <li>• Collect entry fees when participants arrive</li>
                <li>• Accept cash or card payments</li>
                <li>• Fundraisely will keep track of who has paid in your participant list</li>
                <li>• Have change ready if accepting cash payments</li>
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
            disabled={!entryFee || isNaN(parseFloat(entryFee)) || parseFloat(entryFee) <= 0}
            className="flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepPaymentMethod;





