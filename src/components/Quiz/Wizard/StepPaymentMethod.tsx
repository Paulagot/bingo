import { useState, type FC, type FormEvent } from 'react';
import { Wallet, CreditCard, AlertCircle, Info, Heart, Zap, DollarSign, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useQuizSetupStore } from '../useQuizSetupStore';
import type { WizardStepProps } from './WizardStepProps';

interface PaymentMethodExplainer {
  title: string;
  description: string;
  features: string[];
  pros: string[];
  bestFor: string;
  prizeOptions?: string;
}

const paymentMethodExplainers: Record<string, PaymentMethodExplainer> = {
  cash_or_revolut: {
    title: "Cash/Debit Payment",
    description: "Traditional payment collection where you handle transactions manually. Perfect for in-person events or when you want full control over payments.",
    features: ["Manual payment verification", "You collect entry fees directly", "Choose your preferred currency", "Simple setup"],
    pros: ["Full control", "Familiar to everyone", "take cash or card payments", ],
    bestFor: "In-person events, local groups, traditional settings",
    prizeOptions: "You decide prize structure and distribute winnings manually"
  },
  web3: {
    title: "Web3 Smart Contract",
    description: "Fully automated crypto payments using USDGLO tokens. Everything happens automatically via smart contracts - no manual intervention needed!",
    features: ["Automatic payment collection", "Smart contract prize distribution", "USDGLO charitable impact", "Enhanced prize options"],
    pros: ["Fully automated", "Transparent transactions", "Supports charity", "Global accessibility"],
    bestFor: "Crypto-friendly groups, online events, charitable causes",
    prizeOptions: "Flexible prize pools: give away percentage of intake OR distribute other digital assets"
  }
};

const StepPaymentMethod: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();

  const [paymentMethod, setPaymentMethod] = useState<'cash_or_revolut' | 'web3' | ''>(setupConfig.paymentMethod || '');
  const [entryFee, setEntryFee] = useState(setupConfig.entryFee || '');
  const [currencySymbol, setCurrencySymbol] = useState(setupConfig.currencySymbol || '€');
  const [error, setError] = useState<string>('');
  const [activeExplainer, setActiveExplainer] = useState<PaymentMethodExplainer | null>(null);
  const [hoverTimeout, setHoverTimeout] = useState<NodeJS.Timeout | null>(null);

  const currencyOptions = [
    { symbol: '€', label: 'Euro (EUR)' },
    { symbol: '$', label: 'Dollar (USD)' },
    { symbol: '£', label: 'British Pound (GBP)' },
    { symbol: '₹', label: 'Indian Rupee (INR)' },
    { symbol: '¥', label: 'Japanese Yen (JPY)' },
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmed = entryFee.trim();
    const parsed = Number.parseFloat(trimmed);

    if (!paymentMethod) {
      setError('Please choose a payment method.');
      return;
    }
    if (!trimmed || Number.isNaN(parsed) || parsed <= 0) {
      setError('Please enter a valid entry fee greater than 0.');
      return;
    }

    const currencyToStore = paymentMethod === 'web3' ? 'USDGLO' : currencySymbol;

    updateSetupConfig({
      entryFee: trimmed,
      paymentMethod,
      currencySymbol: currencyToStore,
    });

    console.log('✅ Payment step saved:', {
      entryFee: trimmed,
      paymentMethod,
      currencySymbol: currencyToStore,
    });

    onNext();
  };

  const handlePaymentMethodChange = (method: 'cash_or_revolut' | 'web3') => {
    setPaymentMethod(method);
    setActiveExplainer(paymentMethodExplainers[method]);
    setError('');
  };

  // Character component
  const Character = ({ expression, message }: { expression: string; message: any }) => {
    const getCharacterStyle = () => {
      const baseStyle = "w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300";
      
      switch (expression) {
        case "money":
          return `${baseStyle} bg-gradient-to-br from-green-400 to-emerald-500 animate-bounce`;
        case "explaining":
          return `${baseStyle} bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse`;
        case "charitable":
          return `${baseStyle} bg-gradient-to-br from-pink-400 to-red-500`;
        case "tech":
          return `${baseStyle} bg-gradient-to-br from-blue-400 to-cyan-500`;
        default:
          return `${baseStyle} bg-gradient-to-br from-gray-400 to-gray-600`;
      }
    };

    const getEmoji = () => {
      switch (expression) {
        case "money": return "💰";
        case "explaining": return "💡";
        case "charitable": return "❤️";
        case "tech": return "🚀";
        default: return "😊";
      }
    };

    const isExplainer = typeof message === 'object' && message.title;

    return (
      <div className="flex items-start space-x-4 mb-8">
        <div className={getCharacterStyle()}>
          {getEmoji()}
        </div>
        <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200 max-w-lg">
          {/* Speech bubble tail */}
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
          
          {isExplainer ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
                <span>{message.title}</span>
                {message.title.includes('Web3') && <Heart className="w-4 h-4 text-red-500" />}
              </h4>
              
              <p className="text-gray-600 text-sm leading-relaxed">
                {message.description}
              </p>
              
              <div className="space-y-2">
                <div className="bg-blue-50 p-2 rounded text-xs">
                  <strong className="text-blue-800">Key Features:</strong>
                  <ul className="mt-1 space-y-1">
                    {message.features.map((feature: string, index: number) => (
                      <li key={index} className="text-blue-700">• {feature}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="bg-gray-50 p-2 rounded text-xs">
                  <strong>Best for:</strong> {message.bestFor}
                </div>

                <div className="bg-green-50 p-2 rounded text-xs">
                  <strong className="text-green-800">Prize Structure:</strong>
                  <div className="text-green-700 mt-1">{message.prizeOptions}</div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {message.pros.map((pro: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      ✓ {pro}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
          )}
        </div>
      </div>
    );
  };

  // Get current message
  const getCurrentMessage = () => {
    if (activeExplainer) {
      return {
        expression: "explaining",
        message: activeExplainer
      };
    }
    
    if (paymentMethod === 'web3') {
      return {
        expression: "charitable",
        message: "Excellent choice! Web3 payments are fully automated and USDGLO puts all profits toward charitable causes. You're making a positive impact!"
      };
    }
    
    if (paymentMethod === 'cash_or_revolut') {
      return {
        expression: "money",
        message: "Great for traditional events! You'll have full control over payment collection and can use any currency you prefer."
      };
    }
    
    return {
      expression: "money",
      message: "Let's set up how participants will pay to join your quiz! Choose between traditional payment methods or automated Web3 smart contracts."
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-indigo-800">Step 2 of 6: Entry Fee & Payment Method</h2>
        <div className="text-sm text-gray-600">Choose payment system</div>
      </div>

      {/* Character Guide */}
      <div 
        onMouseEnter={() => {
          if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            setHoverTimeout(null);
          }
        }}
      >
        <Character 
          expression={getCurrentMessage().expression}
          message={getCurrentMessage().message}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Method Selection */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-800 flex items-center space-x-2">
            <DollarSign className="w-5 h-5" />
            <span>Choose Payment Method</span>
          </h3>

          <div className="grid gap-4">
            {/* Cash/Debit Option */}
            <label
              className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
                paymentMethod === 'cash_or_revolut'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-400'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="cash_or_revolut"
                checked={paymentMethod === 'cash_or_revolut'}
                onChange={() => handlePaymentMethodChange('cash_or_revolut')}
                className="hidden"
              />
              <CreditCard className="h-6 w-6 text-indigo-600" />
              <div className="flex-1">
                <p className="font-medium text-gray-800">Cash or Debit (Revolut)</p>
                <p className="text-sm text-gray-600">You handle payment collection manually</p>
              </div>
              <Info 
                className="w-4 h-4 cursor-pointer text-gray-400 hover:text-indigo-500 transition-colors"
                onMouseEnter={() => {
                  if (hoverTimeout) clearTimeout(hoverTimeout);
                  setActiveExplainer(paymentMethodExplainers.cash_or_revolut);
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => setActiveExplainer(null), 150);
                  setHoverTimeout(timeout);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                    setHoverTimeout(null);
                  }
                  const explainer = paymentMethodExplainers.cash_or_revolut;
                  setActiveExplainer(activeExplainer?.title === explainer.title ? null : explainer);
                }}
              />
            </label>

            {/* Web3 Option */}
            <label
              className={`flex items-center gap-4 p-4 border-2 rounded-xl cursor-pointer transition ${
                paymentMethod === 'web3'
                  ? 'border-indigo-600 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-400'
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="web3"
                checked={paymentMethod === 'web3'}
                onChange={() => handlePaymentMethodChange('web3')}
                className="hidden"
              />
              <Wallet className="h-6 w-6 text-indigo-600" />
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <p className="font-medium text-gray-800">Web3 Smart Contract (USDGLO)</p>
                  <Heart className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-sm text-gray-600">Automated crypto payments supporting charity</p>
              </div>
              <Info 
                className="w-4 h-4 cursor-pointer text-gray-400 hover:text-indigo-500 transition-colors"
                onMouseEnter={() => {
                  if (hoverTimeout) clearTimeout(hoverTimeout);
                  setActiveExplainer(paymentMethodExplainers.web3);
                }}
                onMouseLeave={() => {
                  const timeout = setTimeout(() => setActiveExplainer(null), 150);
                  setHoverTimeout(timeout);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  if (hoverTimeout) {
                    clearTimeout(hoverTimeout);
                    setHoverTimeout(null);
                  }
                  const explainer = paymentMethodExplainers.web3;
                  setActiveExplainer(activeExplainer?.title === explainer.title ? null : explainer);
                }}
              />
            </label>
          </div>
        </div>

        {/* USDGLO Charity Info */}
        {paymentMethod === 'web3' && (
          <div className="bg-gradient-to-r from-pink-50 to-red-50 border border-pink-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span className="font-medium text-red-800">Why USDGLO?</span>
            </div>
            <p className="text-sm text-red-700">
              Unlike other stablecoins, USDGLO puts <strong>all profits back into charitable causes</strong>. 
              Every transaction you process helps make a positive impact!
            </p>
          </div>
        )}

        {/* Currency Selection for Cash/Debit */}
        {paymentMethod === 'cash_or_revolut' && (
          <div className="space-y-2">
            <label htmlFor="currency" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>Choose Currency</span>
            </label>
            <select
              id="currency"
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            >
              {currencyOptions.map((opt) => (
                <option key={opt.symbol} value={opt.symbol}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Entry Fee Input */}
        {paymentMethod && (
          <div className="space-y-2">
            <label htmlFor="entryFee" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Entry Fee ({paymentMethod === 'web3' ? 'USDGLO' : currencySymbol})</span>
            </label>
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
              placeholder="e.g., 5"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
            {entryFee && (
              <div className="text-xs text-gray-500">
                Entry fee: {paymentMethod === 'web3' ? 'USDGLO' : currencySymbol} {entryFee}
              </div>
            )}
          </div>
        )}

        {/* Prize Pool Preview */}
        {paymentMethod && entryFee && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">Prize Pool Options</span>
            </div>
            {paymentMethod === 'web3' ? (
              <div className="text-sm text-green-700 space-y-1">
                <div>• Distribute percentage of total USDGLO collected</div>
                <div>• Award other digital assets from your wallet</div>
                <div>• Fully automated smart contract distribution</div>
              </div>
            ) : (
              <div className="text-sm text-green-700">
                • You'll manually distribute prizes from collected fees
              </div>
            )}
          </div>
        )}

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
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}
          <button
            type="submit"
            disabled={!paymentMethod || !entryFee}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-lg"
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





