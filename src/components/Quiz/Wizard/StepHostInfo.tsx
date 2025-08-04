// src/components/Quiz/Wizard/StepHostInfo.tsx

import { useState, type FC } from 'react';
import type { FormEvent } from 'react';
import { Users, AlertCircle, Check, ChevronRight, User, Info } from 'lucide-react';
import type { WizardStepProps } from './WizardStepProps';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';

const StepHostInfo: FC<WizardStepProps> = ({ onNext }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [hostName, setHostName] = useState(setupConfig.hostName || '');
  const [error, setError] = useState('');
  const debug = false;

 if (debug)  console.log('[StepHostInfo] Current setupConfig:', setupConfig);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = hostName.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Host name must be at least 2 characters.');
      return;
    }

    const safeName = trimmedName.replace(/[^a-zA-Z0-9 _-]/g, '');

    if (debug) console.log('[StepHostInfo] Submitting host name:', safeName);

    // ✅ Store it locally in wizard state
    updateSetupConfig({ hostName: safeName });

    onNext();
  };

  const Character = ({ expression, message }: { expression: string; message: string }) => {
    const getCharacterStyle = () => {
      const base = "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all duration-300";
      switch (expression) {
        case "excited": return `${base} bg-gradient-to-br from-indigo-400 to-purple-500 animate-bounce`;
        case "explaining": return `${base} bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse`;
        case "encouraging": return `${base} bg-gradient-to-br from-green-400 to-blue-500`;
        case "friendly": return `${base} bg-gradient-to-br from-orange-400 to-yellow-500`;
        default: return `${base} bg-gradient-to-br from-gray-400 to-gray-600`;
      }
    };

    const getEmoji = () => {
      switch (expression) {
        case "excited": return "🎯";
        case "explaining": return "💡";
        case "encouraging": return "⚡";
        case "friendly": return "👋";
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

  const getCurrentMessage = () => {
    const trimmedName = hostName.trim();
    
    if (trimmedName.length === 0) {
      return {
        expression: "friendly" as const,
        message: "Hi there! together we will set up a quiz, there are 8 steps in total. I will guide you.  Let's start by setting up your host identity. Choose something that represents you or your organization - this is how participants will see you during the quiz."
      };
    }
    
    if (trimmedName.length === 1) {
      return {
        expression: "encouraging" as const,
        message: "Good start! Please add at least one more character to create a valid host name."
      };
    }
    
    if (trimmedName.length >= 2) {
      return {
        expression: "excited" as const,
        message: `Perfect! "${trimmedName}" looks great! This is how participants will see you during the quiz.`
      };
    }
    
    return {
      expression: "friendly" as const,
      message: "Hi there! Let's start by setting up your host identity."
    };
  };

  const isValidName = hostName.trim().length >= 2;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">Step 1 of 8: Host Details</h2>
        <div className="text-xs md:text-sm text-gray-600">Choose your identity</div>
      </div>

      <Character {...getCurrentMessage()} />

     

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Host Name Input Card */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all duration-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-blue-100">
              👤
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Your Host Name</h3>
              <p className="text-sm text-gray-600">Choose how you want to appear to participants</p>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="hostName" className="text-sm font-medium text-gray-700 flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Host Display Name <span className="text-red-500">*</span></span>
            </label>
            <div className="relative">
              <input
                id="hostName"
                type="text"
                value={hostName}
                onChange={(e) => {
                  setHostName(e.target.value);
                  setError('');
                }}
                placeholder="e.g., Manchester United FC, Quiz Master Sarah, The Pub Quiz"
                className={`w-full px-4 py-3 pr-16 border-2 rounded-lg focus:ring-2 focus:ring-indigo-200 outline-none transition ${
                  isValidName 
                    ? 'border-green-300 bg-green-50 focus:border-green-500' 
                    : 'border-gray-200 focus:border-indigo-500'
                }`}
                maxLength={30}
                required
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
                {isValidName && <Check className="w-4 h-4 text-green-600" />}
                <span className="text-xs text-gray-400">{hostName.length}/30</span>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Minimum 2 characters. Only letters, numbers, spaces, hyphens, and underscores allowed.
            </p>
          </div>

          {/* Live Preview */}
          {isValidName && (
            <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center space-x-2 mb-1">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">Preview</span>
              </div>
              <div className="text-sm text-green-700">
                Participants will see: <span className="font-semibold">"{hostName.trim()}"</span>
              </div>
            </div>
          )}
        </div>

        {/* Examples Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Host Name Ideas</p>
              <ul className="space-y-1 text-xs">
                <li>• <strong>Sports Club:</strong> "Manchester United Supporters Club"</li>
                <li>• <strong>Personal:</strong> "Quiz Master John" or "Sarah's Trivia Night"</li>
                <li>• <strong>Organization:</strong> "The Red Lion Pub" or "Community Center"</li>
                <li>• <strong>Event:</strong> "Charity Quiz Night" or "Friday Fun Quiz"</li>
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
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={!isValidName}
            className="flex items-center space-x-2 px-4 md:px-6 py-2 md:py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 shadow-sm hover:shadow-md font-medium"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepHostInfo;



