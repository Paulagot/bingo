import React, { useState, useEffect } from 'react';
import { 
  Users, 
  AlertCircle, 
  Check, 
  ChevronRight, 
  DollarSign,
  Sparkles
} from 'lucide-react';
import { WizardStepProps } from './WizardStepProps'; // Import the interface
import { useQuizSetupStore } from '../hooks/useQuizSetupStore'; // Import the store hook

const Character = ({ message }: { message: string }) => {
  const getBubbleColor = (): string => {
    if (message.includes('Perfect!') || message.includes('🎉')) {
      return 'bg-green-50 border-green-200';
    }
    if (message.includes('Excellent!') || message.includes('choice!')) {
      return 'bg-blue-50 border-blue-200';
    }
    if (message.includes('ready') || message.includes('configured')) {
      return 'bg-indigo-50 border-indigo-200';
    }
    return 'bg-gray-50 border-gray-200';
  };

  return (
    <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-6">
      {/* Character Image Placeholder */}
      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gray-200 border-2 border-gray-300 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {/* TODO: Replace with actual character image */}
        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-300 flex items-center justify-center">
          <span className="text-gray-500 text-xs sm:text-sm font-medium">IMG</span>
        </div>
      </div>
      <div className={`relative rounded-lg sm:rounded-2xl p-2 sm:p-4 shadow-lg border flex-1 ${getBubbleColor()}`}>
        <p className="text-gray-700 text-xs sm:text-sm leading-tight sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

const StepQuizSetup: React.FC<WizardStepProps> = ({ onNext }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  // State for all fields - Initialize from store if available
  const [hostName, setHostName] = useState(setupConfig.hostName || '');
  const [entryFee, setEntryFee] = useState(setupConfig.entryFee || '');
  const [currencySymbol, setCurrencySymbol] = useState(setupConfig.currencySymbol || '€');
  const [error, setError] = useState('');

  // Progress tracking
  const [completedSections, setCompletedSections] = useState({
    host: false,
    payment: false
  });

  // Update completion status
  useEffect(() => {
    setCompletedSections({
      host: hostName.trim().length >= 2,
      payment: Boolean(entryFee && !isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0)
    });
  }, [hostName, entryFee]);

  const currencyOptions = [
    { symbol: '€', label: 'Euro (EUR)' },
    { symbol: '$', label: 'Dollar (USD)' },
    { symbol: '£', label: 'British Pound (GBP)' },
  ];

  const handleSubmit = () => {
    if (!completedSections.host) {
      setError('Please enter a host name with at least 2 characters.');
      return;
    }
    
    if (!completedSections.payment) {
      setError('Please enter a valid entry fee.');
      return;
    }
    
    // Save all the form data to the store
    updateSetupConfig({
      hostName: hostName.trim(),
      entryFee: entryFee.trim(),
      currencySymbol,
      paymentMethod: 'cash_or_revolut'
    });
    
    setError('');
    
    // Call the onNext prop to proceed to the next step
    onNext();
  };

  const allSectionsComplete = Object.values(completedSections).every(Boolean);

  const getCurrentMessage = () => {
    if (allSectionsComplete) {
      return "🎉 Perfect! Your quiz is fully configured and ready to launch!";
    }
    return "Hi there! Let's set up your quiz together. Fill in your host name and entry fee below to get started.";
  };

  return (
    <div className="w-full px-2 sm:px-4 space-y-3 sm:space-y-6 pb-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-base sm:text-xl font-semibold text-indigo-800">Step 1 of 4: Quiz Setup</h2>
        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">Configure your quiz</div>
      </div>

      {/* Character Guide */}
      <Character message={getCurrentMessage()} />

      {/* Section 1: Host Information */}
      <div className={`bg-white border-2 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm transition-all ${
        completedSections.host ? 'border-green-300 bg-green-50' : 'border-gray-200'
      }`}>
        <div className="flex items-start gap-3 mb-3 sm:mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl bg-blue-100 flex-shrink-0">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Host Information</h3>
              {completedSections.host && <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Choose how you want to appear to participants</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Host Display Name <span className="text-red-500">*</span></span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={hostName}
              onChange={(e) => {
                setHostName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Quiz Master Sarah, The Pub Quiz"
              className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-12 sm:pr-16 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition text-sm sm:text-base ${
                completedSections.host 
                  ? 'border-green-300 bg-green-50 focus:border-green-500' 
                  : 'border-gray-200 focus:border-indigo-500'
              }`}
              maxLength={30}
            />
            <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2">
              {completedSections.host && <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />}
              <span className="text-xs text-gray-400">{hostName.length}/30</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Minimum 2 characters. This is how participants will see you during the quiz.
          </p>
        </div>
      </div>

      {/* Section 2: Entry Fee */}
      <div className={`bg-white border-2 rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm transition-all ${
        completedSections.payment ? 'border-green-300 bg-green-50' : 'border-gray-200'
      }`}>
        <div className="flex items-start gap-3 mb-3 sm:mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center text-xl sm:text-2xl bg-green-100 flex-shrink-0">
            💰
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Entry Fee</h3>
              {completedSections.payment && <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />}
            </div>
            <p className="text-xs sm:text-sm text-gray-600">Set the cost per participant (collected manually)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Currency</span>
            </label>
            <select
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition text-sm sm:text-base"
            >
              {currencyOptions.map((opt) => (
                <option key={opt.symbol} value={opt.symbol}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs sm:text-sm font-medium text-gray-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              <span>Amount <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium text-sm sm:text-base">
                {currencySymbol}
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
                className={`w-full pl-7 sm:pl-8 pr-3 sm:pr-4 py-2.5 sm:py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition text-sm sm:text-base ${
                  completedSections.payment 
                    ? 'border-green-300 bg-green-50 focus:border-green-500' 
                    : 'border-gray-200 focus:border-indigo-500'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs sm:text-sm text-blue-800">
            <strong>Payment Collection:</strong> You'll collect entry fees manually from participants using cash or card when they arrive.
          </p>
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
      <div className="pt-4 sm:pt-6 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={!allSectionsComplete}
          className="w-full sm:w-auto sm:ml-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg sm:rounded-xl transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm sm:text-base"
        >
          <span>Continue Setup</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StepQuizSetup;