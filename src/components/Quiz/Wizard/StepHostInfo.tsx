// src/components/Quiz/Wizard/StepHostInfo.tsx

import { useState, type FC } from 'react';
import type { FormEvent } from 'react';
import { Users, AlertCircle, Check } from 'lucide-react';
import type { WizardStepProps } from './WizardStepProps';
import { useQuizSetupStore } from '../useQuizSetupStore'; // NEW: Wizard store

const StepHostInfo: FC<WizardStepProps> = ({ onNext }) => {
  const { setupConfig, updateSetupConfig } = useQuizSetupStore();
  const [hostName, setHostName] = useState(setupConfig.hostName || '');
  const [error, setError] = useState('');

  console.log('[StepHostInfo] Current setupConfig:', setupConfig);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = hostName.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Host name must be at least 2 characters.');
      return;
    }

    const safeName = trimmedName.replace(/[^a-zA-Z0-9 _-]/g, '');

    console.log('[StepHostInfo] Submitting host name:', safeName);

    // ✅ Store it locally in wizard state
    updateSetupConfig({ hostName: safeName });

    onNext();
  };

  const Character = ({ expression, message }: { expression: string; message: string }) => {
    const getCharacterStyle = () => {
      const baseStyle = "w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300";
      switch (expression) {
        case "friendly": return `${baseStyle} bg-gradient-to-br from-indigo-400 to-purple-500 animate-bounce`;
        case "encouraging": return `${baseStyle} bg-gradient-to-br from-green-400 to-blue-500`;
        default: return `${baseStyle} bg-gradient-to-br from-gray-400 to-gray-600`;
      }
    };

    const getEmoji = () => {
      switch (expression) {
        case "friendly": return "👋";
        case "encouraging": return "✨";
        default: return "😊";
      }
    };

    return (
      <div className="flex items-start space-x-4 mb-8">
        <div className={getCharacterStyle()}>{getEmoji()}</div>
        <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200 max-w-md">
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
          <p className="text-gray-700 text-sm leading-relaxed">{message}</p>
        </div>
      </div>
    );
  };

  const getCurrentMessage = () => {
    if (hostName.length > 0) {
      return {
        expression: "encouraging" as const,
        message: `"${hostName}" looks great! This is how participants will see you during the quiz.`,
      };
    }
    return {
      expression: "friendly" as const,
      message: "Hi there! Let's start by setting up your host identity. Select something that represents you or your Club name."
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-indigo-800">Step 1 of 6: Host Details</h2>
        <div className="text-sm text-gray-600">Choose your identity</div>
      </div>

      <Character {...getCurrentMessage()} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <label htmlFor="hostName" className="block text-sm font-medium text-gray-700 mb-1">
            Your Host Name
          </label>
          <input
            id="hostName"
            type="text"
            value={hostName}
            onChange={(e) => {
              setHostName(e.target.value);
              setError('');
            }}
            placeholder="e.g., Manchester United FC, Tallagh Town FC, QuizMaster"
            className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            maxLength={30}
            required
          />
          <Users className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
          <div className="absolute right-3 top-9 text-xs text-gray-400">{hostName.length}/30</div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {hostName && !error && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 text-sm text-indigo-700">
              <Check className="w-4 h-4" />
              <span className="font-medium">Preview:</span>
            </div>
            <div className="mt-2 text-gray-700">
              Participants will see: <span className="font-semibold text-indigo-800">"{hostName.trim()}"</span>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={!hostName.trim() || hostName.trim().length < 2}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-5 rounded-xl transition flex items-center space-x-2"
          >
            <span>Next</span>
            <Users className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default StepHostInfo;



