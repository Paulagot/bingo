import React, { useState, useEffect } from 'react';
import { 
  Users, 
  AlertCircle, 
  Check, 
  ChevronRight, 
  Calendar,
  Clock,
  CheckCircle,
  DollarSign,
  Sparkles
} from 'lucide-react';
import { WizardStepProps } from './WizardStepProps'; // Import the interface
import { useQuizSetupStore } from '../hooks/useQuizSetupStore'; // Import the store hook

const StepQuizSetup: React.FC<WizardStepProps> = ({ onNext }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  // State for all fields - Initialize from store if available
  const [hostName, setHostName] = useState(setupConfig.hostName || '');
  const [entryFee, setEntryFee] = useState(setupConfig.entryFee || '');
  const [currencySymbol, setCurrencySymbol] = useState(setupConfig.currencySymbol || '€');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [error, setError] = useState('');

  // Progress tracking
  const [completedSections, setCompletedSections] = useState({
    host: false,
    payment: false,
    schedule: false
  });

  useEffect(() => {
    const detectedZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(detectedZone);
    
    // Initialize date/time from store if available
    if (setupConfig.eventDateTime) {
      const eventDateTime = new Date(setupConfig.eventDateTime);
      const dateStr = eventDateTime.toISOString().split('T')[0];
      const timeStr = eventDateTime.toTimeString().slice(0, 5);
      setEventDate(dateStr);
      setEventTime(timeStr);
    }
  }, [setupConfig.eventDateTime]);

  // Update completion status
  useEffect(() => {
    setCompletedSections({
      host: hostName.trim().length >= 2,
      payment: Boolean(entryFee && !isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0),
      schedule: Boolean(eventDate && eventTime && isValidDateTime())
    });
  }, [hostName, entryFee, eventDate, eventTime]);

  const currencyOptions = [
    { symbol: '€', label: 'Euro (EUR)' },
    { symbol: '$', label: 'Dollar (USD)' },
    { symbol: '£', label: 'British Pound (GBP)' },
  ];

  const getTodayDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const isValidDateTime = () => {
    if (!eventDate || !eventTime) return false;
    const selectedDate = new Date(`${eventDate}T${eventTime}`);
    const now = new Date();
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    return selectedDate >= thirtyMinutesFromNow;
  };

  const handleSubmit = () => {
    if (!completedSections.host) {
      setError('Please enter a host name with at least 2 characters.');
      return;
    }
    
    if (!completedSections.payment) {
      setError('Please enter a valid entry fee.');
      return;
    }
    
    if (!completedSections.schedule) {
      setError('Please schedule your event at least 30 minutes from now.');
      return;
    }

    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    
    // Save all the form data to the store
    updateSetupConfig({
      hostName: hostName.trim(),
      entryFee: entryFee.trim(),
      currencySymbol,
      eventDateTime: eventDateTime.toISOString(),
      timeZone,
      paymentMethod: 'cash_or_revolut'
    });
    
    setError('');
    
    // Call the onNext prop to proceed to the next step
    onNext();
  };

  const allSectionsComplete = Object.values(completedSections).every(Boolean);
  const completedCount = Object.values(completedSections).filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-indigo-800">Step 1 of 4: Quiz Setup</h2>
        <div className="text-sm text-gray-600">Configure your quiz</div>
      </div>

      {/* Character Guide */}
      <div className="flex items-start space-x-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-2xl">
          {allSectionsComplete ? '🎯' : '👋'}
        </div>
        <div className="flex-1">
          <p className="text-gray-700">
            {allSectionsComplete 
              ? "🎉 Perfect! Your quiz is fully configured and ready to launch!" 
              : "Hi there! Let's set up your quiz together. Fill in your host name, entry fee, and event schedule below to get started."}
          </p>
        </div>
      </div>

      {/* Section 1: Host Information */}
      <div className={`bg-white border-2 rounded-xl p-6 shadow-sm transition-all ${
        completedSections.host ? 'border-green-300 bg-green-50' : 'border-gray-200'
      }`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-blue-100">
            👤
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 text-lg">Host Information</h3>
              {completedSections.host && <Check className="w-5 h-5 text-green-600" />}
            </div>
            <p className="text-sm text-gray-600">Choose how you want to appear to participants</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
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
              className={`w-full px-4 py-3 pr-16 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition ${
                completedSections.host 
                  ? 'border-green-300 bg-green-50 focus:border-green-500' 
                  : 'border-gray-200 focus:border-indigo-500'
              }`}
              maxLength={30}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
              {completedSections.host && <Check className="w-4 h-4 text-green-600" />}
              <span className="text-xs text-gray-400">{hostName.length}/30</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Minimum 2 characters. This is how participants will see you during the quiz.
          </p>
        </div>
      </div>

      {/* Section 2: Entry Fee */}
      <div className={`bg-white border-2 rounded-xl p-6 shadow-sm transition-all ${
        completedSections.payment ? 'border-green-300 bg-green-50' : 'border-gray-200'
      }`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-green-100">
            💰
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 text-lg">Entry Fee</h3>
              {completedSections.payment && <Check className="w-5 h-5 text-green-600" />}
            </div>
            <p className="text-sm text-gray-600">Set the cost per participant (collected manually)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <Sparkles className="w-4 h-4" />
              <span>Currency</span>
            </label>
            <select
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <DollarSign className="w-4 h-4" />
              <span>Amount <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
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
                className={`w-full pl-8 pr-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition ${
                  completedSections.payment 
                    ? 'border-green-300 bg-green-50 focus:border-green-500' 
                    : 'border-gray-200 focus:border-indigo-500'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Payment Collection:</strong> You'll collect entry fees manually from participants using cash or card when they arrive.
          </p>
        </div>
      </div>

      {/* Section 3: Schedule */}
      <div className={`bg-white border-2 rounded-xl p-6 shadow-sm transition-all ${
        completedSections.schedule ? 'border-green-300 bg-green-50' : 'border-gray-200'
      }`}>
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-purple-100">
            📅
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900 text-lg">Event Schedule</h3>
              {completedSections.schedule && <Check className="w-5 h-5 text-green-600" />}
            </div>
            <p className="text-sm text-gray-600">When will your quiz take place?</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Date <span className="text-red-500">*</span></span>
            </label>
            <input
              type="date"
              value={eventDate}
              min={getTodayDate()}
              onChange={(e) => {
                setEventDate(e.target.value);
                setError('');
              }}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition ${
                eventDate 
                  ? 'border-green-300 bg-green-50 focus:border-green-500' 
                  : 'border-gray-200 focus:border-indigo-500'
              }`}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <Clock className="w-4 h-4" />
              <span>Time <span className="text-red-500">*</span></span>
            </label>
            <input
              type="time"
              value={eventTime}
              onChange={(e) => {
                setEventTime(e.target.value);
                setError('');
              }}
              disabled={!eventDate}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition ${
                eventTime 
                  ? 'border-green-300 bg-green-50 focus:border-green-500' 
                  : 'border-gray-200 focus:border-indigo-500'
              } ${!eventDate ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm text-blue-800">
            <strong>Timezone:</strong> {timeZone} - Participants will see times converted to their local timezone.
          </p>
        </div>

        {completedSections.schedule && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center space-x-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Event Scheduled!</span>
            </div>
            <div className="text-sm text-green-700">
              {eventDate && eventTime && (
                <>
                  <p className="font-medium">
                    {new Date(`${eventDate}T${eventTime}`).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p>
                    {new Date(`${eventDate}T${eventTime}`).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })} ({timeZone})
                  </p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-end pt-6 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={!allSectionsComplete}
          className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md font-medium"
        >
          <span>Continue Setup</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default StepQuizSetup;