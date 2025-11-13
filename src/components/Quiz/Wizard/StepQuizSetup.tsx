import React, { useState, useEffect } from 'react';
import { Users, AlertCircle, Check, ChevronRight, DollarSign, Sparkles } from 'lucide-react';
import { WizardStepProps } from './WizardStepProps';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import ClearSetupButton from './ClearSetupButton';
import Character from './shared/components/Character';

const StepQuizSetup: React.FC<WizardStepProps> = ({ onNext, onResetToFirst }) => {
  const [error, setError] = useState('');

  const {
    setupConfig,
    setHostName,
    setEntryFee,
    setCurrencySymbol,
    setPaymentMethod,

    // ✅ pull these at the top (do NOT call the hook inside handlers)
    updateSetupConfig,
     // if you need it later
  } = useQuizSetupStore(); // <-- moved here

  const hostName = setupConfig.hostName ?? '';
  const entryFee = setupConfig.entryFee ?? '';
  const currencySymbol = setupConfig.currencySymbol ?? '€';

  const [completedSections, setCompletedSections] = useState({ host: false, payment: false });

  useEffect(() => {
    setPaymentMethod('cash_or_revolut');
  }, [setPaymentMethod]);

  useEffect(() => {
    setCompletedSections({
      host: hostName.trim().length >= 2,
      payment: Boolean(entryFee && !isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0),
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

    // ✅ use the already-bound store functions
    updateSetupConfig({
      hostName: hostName.trim(),
      entryFee: entryFee.trim(),
      currencySymbol,
      paymentMethod: 'cash_or_revolut',
    });

    setError('');
    onNext?.();
  };

  const allSectionsComplete = Object.values(completedSections).every(Boolean);

  const getCurrentMessage = () =>
    allSectionsComplete
      ? '🎉 Perfect! Your quiz is fully configured and ready to launch!'
      : "Hi there! Let's set up your quiz together. Fill in your host name and entry fee below to get started.";

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      <div className="px-1">
        <h2 className="heading-2">Step 1 of 4: Quiz Setup</h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">Configure your quiz</div>
      </div>

      <Character message={getCurrentMessage()} />

      {/* Host Information */}
      <div
        className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
          completedSections.host ? 'border-green-300 bg-green-50' : 'border-border'
        }`}
      >
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
            👤
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Host Information</h3>
              {completedSections.host && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
            </div>
            <p className="text-fg/70 text-xs sm:text-sm">Choose how you want to appear to participants</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
            <Users className="h-4 w-4" />
            <span>
              Host Display Name <span className="text-red-500">*</span>
            </span>
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
              className={`w-full rounded-lg border-2 px-3 py-2.5 pr-12 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:pr-16 sm:text-base ${
                completedSections.host ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-border focus:border-indigo-500'
              }`}
              maxLength={30}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 transform items-center gap-1 sm:right-3 sm:gap-2">
              {completedSections.host && <Check className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />}
              <span className="text-xs text-gray-400">{hostName.length}/30</span>
            </div>
          </div>
          <p className="text-fg/60 text-xs">Minimum 2 characters. This is how participants will see you during the quiz.</p>
        </div>
      </div>

      {/* Entry Fee */}
      <div
        className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
          completedSections.payment ? 'border-green-300 bg-green-50' : 'border-border'
        }`}
      >
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">💰</div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Entry Fee</h3>
              {completedSections.payment && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
            </div>
            <p className="text-fg/70 text-xs sm:text-sm">Set the cost per participant (collected manually)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Currency</span>
            </label>
            <select
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base"
            >
              {currencyOptions.map((opt) => (
                <option key={opt.symbol} value={opt.symbol}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span>
                Amount <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative">
              <span className="text-fg/60 absolute left-3 top-1/2 -translate-y-1/2 transform text-sm font-medium sm:text-base">{currencySymbol}</span>
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
                className={`w-full rounded-lg border-2 py-2.5 pl-7 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:py-3 sm:pl-8 sm:pr-4 sm:text-base ${
                  completedSections.payment ? 'border-green-300 bg-green-50 focus:border-green-500' : 'border-border focus:border-indigo-500'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:mt-4">
          <p className="text-xs text-blue-800 sm:text-sm">
            <strong>Payment Collection:</strong> You'll collect entry fees manually from participants using cash, tap card, or instant transsfer when they arrive.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="border-border border-t pt-4 sm:pt-6">

           <ClearSetupButton
          variant="ghost"
          flow="web2"                 // <-- important: keep the flow consistent
          onCleared={onResetToFirst} // <-- THIS makes it jump to the first step
        />
        <button
          onClick={handleSubmit}
          disabled={!allSectionsComplete}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-400 sm:ml-auto sm:w-auto sm:rounded-xl sm:px-6 sm:text-base"
        >
          <span>Continue Setup</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepQuizSetup;
