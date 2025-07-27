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
  CheckCircle,
  ChevronDown
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

// Custom Time Picker Component
const TimePicker = ({ 
  value, 
  onChange, 
  disabled = false,
  minTime = '00:00',
  className = ''
}: {
  value: string;
  onChange: (time: string) => void;
  disabled?: boolean;
  minTime?: string;
  className?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [selectedPeriod, setSelectedPeriod] = useState('PM');

  useEffect(() => {
    if (value) {
      const [hours, minutes] = value.split(':');
      const hour24 = parseInt(hours);
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      
      setSelectedHour(hour12.toString().padStart(2, '0'));
      setSelectedMinute(minutes);
      setSelectedPeriod(period);
    }
  }, [value]);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const formatDisplayTime = () => {
    if (!value) return 'Select time';
    const [hours, mins] = value.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${mins} ${period}`;
  };

  const handleTimeChange = (hour: string, minute: string, period: string) => {
    let hour24 = parseInt(hour);
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${minute}`;
    onChange(timeString);
  };

  const isTimeDisabled = (hour: string, minute: string, period: string) => {
    if (!minTime) return false;
    
    let hour24 = parseInt(hour);
    if (period === 'AM' && hour24 === 12) hour24 = 0;
    if (period === 'PM' && hour24 !== 12) hour24 += 12;
    
    const timeString = `${hour24.toString().padStart(2, '0')}:${minute}`;
    return timeString < minTime;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition flex items-center justify-between ${
          value 
            ? 'border-green-300 bg-green-50 focus:border-green-500' 
            : 'border-gray-200 focus:border-indigo-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-indigo-400'}`}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-500'}>
          {formatDisplayTime()}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-gray-200">
            {/* Hours */}
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 text-center mb-2">Hour</div>
              <div className="max-h-32 overflow-y-auto">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => {
                      setSelectedHour(hour);
                      handleTimeChange(hour, selectedMinute, selectedPeriod);
                    }}
                    className={`w-full px-2 py-1 text-sm rounded text-center hover:bg-indigo-50 ${
                      selectedHour === hour ? 'bg-indigo-100 text-indigo-700 font-medium' : ''
                    }`}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes */}
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 text-center mb-2">Min</div>
              <div className="max-h-32 overflow-y-auto">
                {minutes.map((minute) => (
                  <button
                    key={minute}
                    type="button"
                    onClick={() => {
                      setSelectedMinute(minute);
                      handleTimeChange(selectedHour, minute, selectedPeriod);
                    }}
                    disabled={isTimeDisabled(selectedHour, minute, selectedPeriod)}
                    className={`w-full px-2 py-1 text-sm rounded text-center hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedMinute === minute ? 'bg-indigo-100 text-indigo-700 font-medium' : ''
                    }`}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM */}
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 text-center mb-2">Period</div>
              <div className="space-y-1">
                {['AM', 'PM'].map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(period);
                      handleTimeChange(selectedHour, selectedMinute, period);
                    }}
                    disabled={isTimeDisabled(selectedHour, selectedMinute, period)}
                    className={`w-full px-2 py-1 text-sm rounded text-center hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed ${
                      selectedPeriod === period ? 'bg-indigo-100 text-indigo-700 font-medium' : ''
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 p-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
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
        message: "Let's schedule your quiz event! You can select today's date or any future date. Just make sure the time is at least 30 minutes from now for proper preparation." 
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
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
    
    if (selectedDate < thirtyMinutesFromNow) {
      return { 
        expression: "strategic", 
        message: "Please schedule your quiz at least 30 minutes from now to give participants time to prepare and join." 
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

  const getTodayDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const getMinTime = () => {
    const now = new Date();
    const selectedDate = new Date(`${eventDate}T00:00:00`);
    const today = new Date(now.toISOString().split('T')[0]);
    
    // If selected date is today, minimum time is current time + 30 minutes
    if (selectedDate.getTime() === today.getTime()) {
      const minTime = new Date(now.getTime() + 30 * 60 * 1000);
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
    const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);

    if (selectedDate < thirtyMinutesFromNow) {
      return setError('Event must be scheduled at least 30 minutes from now.');
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
  const now = new Date();
  const thirtyMinutesFromNow = new Date(now.getTime() + 30 * 60 * 1000);
  const isValidDateTime = selectedDateTime && selectedDateTime >= thirtyMinutesFromNow;

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

            {/* Time Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Event Time <span className="text-red-500">*</span></span>
              </label>
              <TimePicker
                value={eventTime}
                onChange={(time) => {
                  setEventTime(time);
                  setError('');
                }}
                minTime={eventDate === getTodayDate() ? getMinTime() : '00:00'}
                disabled={!eventDate}
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
                  {isValidDateTime ? 'Event Scheduled' : 'Schedule Conflict'}
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
                    <p className="text-xs mt-1">Must be at least 30 minutes from now</p>
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
                <li>• You can schedule for today as long as it's at least 30 minutes from now</li>
                <li>• Choose a time that works for your expected participants</li>
                <li>• Consider different timezones if you have international participants</li>
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
