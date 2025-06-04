// components/quiz/wizard/StepHostInfo.tsx
// components/quiz/wizard/StepHostInfo.tsx
import { useState, type FC } from 'react';
import type { FormEvent } from 'react';
import { useQuizConfig } from '../useQuizConfig';
import { Users, AlertCircle, Info, ExternalLink, Check, Sparkles } from 'lucide-react';
import type { WizardStepProps } from './WizardStepProps';

interface NameSuggestion {
  name: string;
  icon: string;
  explainer: {
    title: string;
    description: string;
    pros: string[];
    example: string;
  };
}

const StepHostInfo: FC<WizardStepProps> = ({ onNext }) => {
  const { config, updateConfig } = useQuizConfig();
  const [hostName, setHostName] = useState(config.hostName || '');
  const [error, setError] = useState('');
  const [activeExplainer, setActiveExplainer] = useState(null);

  const nameSuggestions: NameSuggestion[] = [
    {
      name: "Professional",
      icon: "👔",
      explainer: {
        title: "Professional Names",
        description: "Use your real name or professional title. Great for business settings, team building, or educational quizzes.",
        pros: ["Builds trust", "Easy to remember", "Professional appearance"],
        example: "John Smith, Dr. Wilson, Team Lead Sarah"
      }
    },
    {
      name: "Creative",
      icon: "🎨",
      explainer: {
        title: "Creative Names",
        description: "Fun, memorable names that reflect your personality or quiz theme. Perfect for casual games and entertainment.",
        pros: ["Memorable", "Shows personality", "Breaks the ice"],
        example: "QuizMaster3000, BrainBender, The Riddler"
      }
    },
    {
      name: "Anonymous",
      icon: "🎭",
      explainer: {
        title: "Anonymous Names",
        description: "Keep some mystery! Use generic titles or themed names when you want to focus on the content, not the host.",
        pros: ["Privacy focused", "Content-centered", "Neutral approach"],
        example: "Quiz Host, Game Master, Your Host"
      }
    }
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = hostName.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setError('Host name must be at least 2 characters.');
      return;
    }

    // Sanitize: remove unsafe characters
    const safeName = trimmedName.replace(/[^a-zA-Z0-9 _-]/g, '');

    updateConfig({ hostName: safeName });
    onNext();
  };

  const handleExplainerHover = (explainer: any) => {
    setActiveExplainer(explainer);
  };

  const handleExplainerLeave = () => {
    setActiveExplainer(null);
  };

  const handleSuggestionClick = (suggestion: NameSuggestion) => {
    setActiveExplainer(suggestion.explainer);
  };

  // Character component
  const Character = ({ expression, message }: { expression: string; message: any }) => {
    const getCharacterStyle = () => {
      const baseStyle = "w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300";
      
      switch (expression) {
        case "friendly":
          return `${baseStyle} bg-gradient-to-br from-indigo-400 to-purple-500 animate-bounce`;
        case "explaining":
          return `${baseStyle} bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse`;
        case "encouraging":
          return `${baseStyle} bg-gradient-to-br from-green-400 to-blue-500`;
        default:
          return `${baseStyle} bg-gradient-to-br from-gray-400 to-gray-600`;
      }
    };

    const getEmoji = () => {
      switch (expression) {
        case "friendly": return "👋";
        case "explaining": return "💡";
        case "encouraging": return "✨";
        default: return "😊";
      }
    };

    const isExplainer = typeof message === 'object' && message.title;

    return (
      <div className="flex items-start space-x-4 mb-8">
        <div className={getCharacterStyle()}>
          {getEmoji()}
        </div>
        <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200 max-w-md">
          {/* Speech bubble tail */}
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
          
          {isExplainer ? (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center space-x-2">
                <span>{message.title}</span>
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed">
                {message.description}
              </p>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {message.pros.map((pro: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                      ✓ {pro}
                    </span>
                  ))}
                </div>
                <div className="bg-gray-50 p-2 rounded text-xs">
                  <strong>Examples:</strong> {message.example}
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
    
    if (hostName.length > 0) {
      return {
        expression: "encouraging",
        message: `"${hostName}" looks great! This is how participants will see you during the quiz. Make sure you're happy with it!`
      };
    }
    
    return {
      expression: "friendly",
      message: "Hi there! Let's start by setting up your host identity. This is how participants will know you during the quiz. Check out the different styles below for inspiration!"
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-indigo-800">Step 1 of 7: Host Details</h2>
        <div className="text-sm text-gray-600">Choose your identity</div>
      </div>

      {/* Character Guide */}
      <Character 
        expression={getCurrentMessage().expression}
        message={getCurrentMessage().message}
      />

      {/* Name Style Suggestions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 flex items-center space-x-2">
          <Sparkles className="w-4 h-4" />
          <span>Name Style Inspiration</span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {nameSuggestions.map((suggestion) => (
            <button
              key={suggestion.name}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="p-3 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 text-left transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{suggestion.icon}</span>
                  <span className="font-medium text-gray-700 group-hover:text-indigo-700">
                    {suggestion.name}
                  </span>
                </div>
                <button
                  onMouseEnter={() => handleExplainerHover(suggestion.explainer)}
                  onMouseLeave={handleExplainerLeave}
                  className="p-1 text-gray-400 hover:text-indigo-500 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveExplainer(
                      activeExplainer?.title === suggestion.explainer.title ? null : suggestion.explainer
                    );
                  }}
                >
                  <Info className="w-4 h-4" />
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Form */}
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
              setError(''); // Clear error on input
            }}
            placeholder="e.g., QuizMaster3000, Sarah, Dr. Wilson"
            className="w-full px-4 py-3 pl-10 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            maxLength={30}
            required
          />
          <Users className="absolute left-3 top-9 h-5 w-5 text-gray-400" />
          
          {/* Character count */}
          <div className="absolute right-3 top-9 text-xs text-gray-400">
            {hostName.length}/30
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Preview */}
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

