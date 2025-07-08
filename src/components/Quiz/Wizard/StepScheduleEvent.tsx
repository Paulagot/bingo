// src/components/Quiz/Wizard/StepScheduleEvent.tsx
import { useState, useEffect, type FC, type FormEvent } from 'react';
import { useQuizSetupStore } from '../useQuizSetupStore';
import type { WizardStepProps } from './WizardStepProps';
import { 
  Calendar, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  MapPin,
  Info,
  CheckCircle
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

const StepScheduleEvent: FC<WizardStepProps> = ({ onNext, onBack }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  
  // Separate date and time for better UX
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Detect user's timezone
    const detectedZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(detectedZone);

    // If we have existing eventDateTime, split it into date and time
    if (setupConfig.eventDateTime) {
      const existingDate = new Date(setupConfig.eventDateTime);
      if (!isNaN(existingDate.getTime())) {
        // Format for date input (YYYY-MM-DD)
        const dateStr = existingDate.toISOString().split('T')[0];
        // Format for time input (HH:MM)
        const timeStr = existingDate.toTimeString().slice(0, 5);
        setEventDate(dateStr);
        setEventTime(timeStr);
      }
    }
  }, [setupConfig.eventDateTime]);

  const getCurrentMessage = () => {
    if (!eventDate && !eventTime) {
      return { 
        expression: "explaining", 
        message: "Let's schedule your quiz event! Choose a date and time that works for your participants. We'll automatically detect your timezone." 
      };
    }
    
    if (!eventDate) {
      return { 
        expression: "encouraging", 
        message: "Great start! Now please select the date for your quiz event." 
      };
    }
    
    if (!eventTime) {
      return { 
        expression: "encouraging", 
        message: "Perfect date choice! Now set the time when your quiz will begin." 
      };
    }
    
    const selectedDate = new Date(`${eventDate}T${eventTime}`);
    const now = new Date();
    
    if (selectedDate <= now) {
      return { 
        expression: "strategic", 
        message: "The selected date and time is in the past. Please choose a future date and time for your quiz event." 
      };
    }
    
    return { 
      expression: "excited", 
      message: `Perfect! Your quiz is scheduled for ${selectedDate.toLocaleDateString()} at ${selectedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} in your timezone.` 
    };
  };

  const formatTimezone = (tz: string) => {
    try {
      const now = new Date();
      const offset = new Intl.DateTimeFormat('en', {
        timeZone: tz,
        timeZoneName: 'short'
      }).formatToParts(now).find(part => part.type === 'timeZoneName')?.value || '';
      
      return `${tz.replace('_', ' ')} (${offset})`;
    } catch {
      return tz;
    }
  };

  const getMinDateTime = () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMinTime = () => {
    const now = new Date();
    const selectedDate = new Date(`${eventDate}T00:00:00`);
    const today = new Date(now.toISOString().split('T')[0]);
    
    // If selected date is today, minimum time is current time + 1 hour
    if (selectedDate.getTime() === today.getTime()) {
      const minTime = new Date(now.getTime() + 60 * 60 * 1000);
      return minTime.toTimeString().slice(0, 5);
    }
    
    return '00:00';
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!eventDate) {
      return setError('Please select a date for the event.');
    }
    
    if (!eventTime) {
      return setError('Please select a time for the event.');
    }

    // Combine date and time
    const eventDateTime = `${eventDate}T${eventTime}`;
    const selectedDate = new Date(eventDateTime);
    const now = new Date();

    if (selectedDate <= now) {
      return setError('Event date and time must be in the future.');
    }

    updateSetupConfig({ 
      eventDateTime: selectedDate.toISOString(),
      timeZone 
    });
    
    setError('');
    onNext();
  };

  const isComplete = eventDate && eventTime;
  const selectedDateTime = eventDate && eventTime ? new Date(`${eventDate}T${eventTime}`) : null;
  const isValidDateTime = selectedDateTime && selectedDateTime > new Date();

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">
          Step 6 of 8: Schedule Event
        </h2>
        <div className="text-xs md:text-sm text-gray-600">Set your quiz date and time</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Timezone Info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 md:p-4 sticky top-4 z-10">
        <div className="flex items-center space-x-2 mb-2">
          <MapPin className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-indigo-800 text-sm md:text-base">Timezone Detection</span>
        </div>
        <div className="text-xs md:text-sm text-indigo-700">
          Automatically using: {formatTimezone(timeZone)}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Date & Time Configuration Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-blue-100">
              📅
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Event Date & Time</h3>
              <p className="text-sm text-gray-600">Choose when your quiz event will take place</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Calendar className="w-4 h-4" />
                <span>Event Date <span className="text-red-500">*</span></span>
              </label>
              <input
                type="date"
                value={eventDate}
                min={getMinDateTime()}
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

            {/* Time Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Event Time <span className="text-red-500">*</span></span>
              </label>
              <input
                type="time"
                value={eventTime}
                min={eventDate ? getMinTime() : undefined}
                onChange={(e) => {
                  setEventTime(e.target.value);
                  setError('');
                }}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition ${
                  eventTime 
                    ? 'border-green-300 bg-green-50 focus:border-green-500' 
                    : 'border-gray-200 focus:border-indigo-500'
                }`}
              />
            </div>
          </div>

          {/* Event Preview */}
          {isComplete && (
            <div className={`mt-4 p-3 rounded-lg border ${
              isValidDateTime 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center space-x-2 mb-1">
                {isValidDateTime ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  isValidDateTime ? 'text-green-800' : 'text-red-800'
                }`}>
                  {isValidDateTime ? 'Event Scheduled' : 'Invalid Date/Time'}
                </span>
              </div>
              {selectedDateTime && (
                <div className={`text-sm ${
                  isValidDateTime ? 'text-green-700' : 'text-red-700'
                }`}>
                  <p className="font-medium">
                    {selectedDateTime.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <p>
                    {selectedDateTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: true 
                    })} ({timeZone})
                  </p>
                  {!isValidDateTime && (
                    <p className="text-xs mt-1">Please select a future date and time</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timezone Configuration */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-purple-100">
              🌍
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Timezone Settings</h3>
              <p className="text-sm text-gray-600">Automatically detected from your browser</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <MapPin className="w-4 h-4" />
              <span>Your Timezone</span>
            </label>
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm font-medium text-gray-900">{formatTimezone(timeZone)}</p>
              <p className="text-xs text-gray-600 mt-1">
                Participants will see the event time converted to their local timezone
              </p>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Scheduling Tips</p>
              <ul className="space-y-1 text-xs">
                <li>• Choose a time that works for your expected participants</li>
                <li>• Consider different timezones if you have international participants</li>
                <li>• Allow enough time for participants to prepare and join</li>
                <li>• The system will automatically handle timezone conversions</li>
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
            disabled={!isComplete || !isValidDateTime}
            className="flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span>Save & Continue</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepScheduleEvent;
