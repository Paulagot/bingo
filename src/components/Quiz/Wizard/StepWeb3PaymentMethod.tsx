// src/components/Quiz/Wizard/StepWeb3PaymentMethod.tsx
import { useState, type FC, type FormEvent } from 'react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import type { WizardStepProps } from './WizardStepProps';
import {
  Wallet,
  DollarSign,
  Heart,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  AlertCircle,
  Info,
  Trophy
} from 'lucide-react';

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

const StepWeb3PaymentMethod: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [entryFee, setEntryFee] = useState(setupConfig.entryFee || '');
  const [currency, setCurrency] = useState(setupConfig.web3Currency || 'GLOUSD');
  const [chain, setChain] = useState(setupConfig.web3Chain || 'stellar');
  const [charity, setCharity] = useState(setupConfig.web3Charity || '');
  const [error, setError] = useState('');

  const getCurrentMessage = () => {
    if (!entryFee) {
      return { 
        expression: "explaining", 
        message: "Let's set up Web3 payments! Choose your blockchain network, cryptocurrency, and charity. Payments will be handled automatically via smart contracts." 
      };
    }
    
    if (!charity) {
      return { 
        expression: "encouraging", 
        message: "Great! You've set the entry fee. Now please select a charity to support with a portion of the proceeds." 
      };
    }
    
    const fee = parseFloat(entryFee);
    if (isNaN(fee) || fee <= 0) {
      return { 
        expression: "encouraging", 
        message: "Please enter a valid entry fee amount greater than 0 for your Web3 quiz." 
      };
    }
    
    return { 
      expression: "excited", 
      message: `Perfect! Entry fee set to ${currency} ${entryFee} with ${charity} as your chosen charity. Smart contracts will handle payments automatically!` 
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

    if (!charity) {
      setError('Please select a charity.');
      return;
    }

    updateSetupConfig({
      entryFee: trimmed,
      paymentMethod: 'web3',
      currencySymbol: currency,
      web3Chain: chain,
      web3Currency: currency,
      web3Charity: charity
    });

    onNext();
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">
          Step 2 of 8: Web3 Entry Fee Setup
        </h2>
        <div className="text-xs md:text-sm text-gray-600">Configure blockchain payments</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Web3 Payment Info Card */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-4 sticky top-4 z-10">
        <div className="flex items-center space-x-2 mb-2">
          <Wallet className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-indigo-800 text-sm md:text-base">Web3 Payment Collection</span>
        </div>
        <div className="text-xs md:text-sm text-indigo-700">
          Automated cryptocurrency payments with smart contracts and charity integration
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Blockchain Configuration Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-purple-100">
              🔗
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Blockchain Configuration</h3>
              <p className="text-sm text-gray-600">Choose your network and cryptocurrency</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chain Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Wallet className="w-4 h-4" />
                <span>Blockchain Network</span>
              </label>
              <select
                value={chain}
                onChange={(e) => setChain(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              >
                <option value="Solana">Solana</option>
                <option value="Solana">Base</option>
                <option value="Solana">Avalanche</option>
                <option value="Solana">Avax</option>
                <option value="Solana">Celo</option>
                {/* TODO: Add dynamic chain list */}
              </select>
            </div>

            {/* Currency Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <DollarSign className="w-4 h-4" />
                <span>Cryptocurrency</span>
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              >
                <option value="GLOUSD">Glo USD</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
          </div>

          {currency === 'GLOUSD' && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-1">
                <Sparkles className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">About Glo USD</span>
              </div>
              <p className="text-xs text-green-700">
                Glo USD helps fund global public goods through their unique reserve model.
              </p>
            </div>
          )}
        </div>

        {/* Charity Selection Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-red-100">
              ❤️
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Charity Selection</h3>
              <p className="text-sm text-gray-600">Choose a charity to support with your quiz</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span>Choose a Charity <span className="text-red-500">*</span></span>
            </label>
            <select
              value={charity}
              onChange={(e) => {
                setCharity(e.target.value);
                setError('');
              }}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition ${
                charity 
                  ? 'border-green-300 bg-green-50 focus:border-green-500' 
                  : 'border-gray-200 focus:border-indigo-500'
              }`}
            >
              <option value="">Select a charity...</option>
              <option value="redcross">Red Cross</option>
              <option value="unicef">UNICEF</option>
              <option value="wateraid">WaterAid</option>
              {/* TODO: Replace with dynamic charities from The Giving Block or Coala Pay */}
            </select>
            <p className="text-xs text-gray-500 italic">
              Powered by The Giving Block and Coala Pay
            </p>
          </div>

          {charity && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center space-x-2 mb-1">
                <Heart className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">Charity Selected</span>
              </div>
              <p className="text-sm text-red-700">
                Supporting <strong>{charity === 'redcross' ? 'Red Cross' : charity === 'unicef' ? 'UNICEF' : 'WaterAid'}</strong> with a portion of quiz proceeds
              </p>
            </div>
          )}
        </div>

        {/* Entry Fee Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-green-100">
              💰
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Entry Fee Amount</h3>
              <p className="text-sm text-gray-600">Set the cryptocurrency entry fee</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Entry Fee ({currency}) <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm">
                {currency}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryFee}
                onChange={(e) => {
                  setEntryFee(e.target.value);
                  setError('');
                }}
                placeholder="5.00"
                className="w-full pl-20 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
              />
            </div>
          </div>

          {entryFee && !isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0 && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-1">
                <Trophy className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Entry Fee Set</span>
              </div>
              <p className="text-sm text-green-700">
                Each participant will pay <strong>{currency} {entryFee}</strong> via smart contract
              </p>
            </div>
          )}
        </div>

        {/* Web3 Benefits */}
        {entryFee && charity && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="font-medium text-purple-800">Web3 Benefits</span>
            </div>
            <div className="text-sm text-purple-700 space-y-1">
              <p>• Automated payment collection via smart contracts</p>
              <p>• Transparent, on-chain prize distribution</p>
              <p>• Direct charity donations from proceeds</p>
              <p>• Global accessibility with crypto wallets</p>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Web3 Payment Tips</p>
              <ul className="space-y-1 text-xs">
                <li>• Participants need a compatible crypto wallet</li>
                <li>• Smart contracts handle payment verification automatically</li>
                <li>• Prize distribution can be automated on-chain</li>
                <li>• All transactions are transparent and verifiable</li>
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
            disabled={!entryFee || !charity || isNaN(parseFloat(entryFee)) || parseFloat(entryFee) <= 0}
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

export default StepWeb3PaymentMethod;
