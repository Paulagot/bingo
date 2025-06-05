import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizSetupStore } from '../useQuizSetupStore';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { roundTypeMap } from '../../../constants/quiztypeconstants';
import { fundraisingExtras } from '../../../types/quiz';
import type { WizardStepProps } from './WizardStepProps';
import type { RoundDefinition } from '../../../types/quiz';
import { ChevronLeft, CheckCircle, AlertTriangle, Rocket } from 'lucide-react';

const StepReviewLaunch: FC<WizardStepProps> = ({ onBack }) => {
  const { setupConfig } = useQuizSetupStore();
  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();
  const [isLaunching, setIsLaunching] = useState(false);

  const fundraisingEnabled = Object.entries(setupConfig.fundraisingOptions || {}).filter(([_, enabled]) => enabled);
  const currency = setupConfig.currencySymbol || '€';

  useEffect(() => {
    if (!connected || !socket) return;

    const handleCreated = ({ roomId }: { roomId: string }) => {
      console.log('✅ Received quiz_room_created:', roomId);
      navigate(`/quiz/host-dashboard/${roomId}`);
    };

    const handleError = ({ message }: { message: string }) => {
      console.error('[Socket Error]', message);
      setIsLaunching(false);
    };

    socket.on('quiz_room_created', handleCreated);
    socket.on('quiz_error', handleError);

    return () => {
      socket.off('quiz_room_created', handleCreated);
      socket.off('quiz_error', handleError);
    };
  }, [connected, navigate, socket]);

  const handleLaunch = async () => {
    if (isLaunching) return;
    setIsLaunching(true);

    try {
      const res = await fetch('http://localhost:3001/quiz/api/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: setupConfig })
      });

      if (!res.ok) {
        console.error('[API Error]', res.status);
        setIsLaunching(false);
        return;
      }

      const data = await res.json();
      console.log('[API Success]', data);

      // 🔧 NEW: store identifiers into localStorage for reconnect
      localStorage.setItem('current-room-id', data.roomId);
      localStorage.setItem('current-host-id', data.hostId);

      // ✅ Redirect to dashboard after successful room creation
      navigate(`/quiz/host-dashboard/${data.roomId}`);

    } catch (err) {
      console.error('[Launch Error]', err);
      setIsLaunching(false);
    }
  };

  useEffect(() => {
    console.log('[FINAL SETUP CONFIG]', setupConfig);
  }, [setupConfig]);

  const Character = ({ expression, message }: { expression: string; message: string }) => {
    const getCharacterStyle = () => {
      const base = "w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300";
      switch (expression) {
        case "ready": return `${base} bg-gradient-to-br from-green-400 to-emerald-500 animate-bounce`;
        case "warning": return `${base} bg-gradient-to-br from-yellow-400 to-orange-500 animate-pulse`;
        default: return `${base} bg-gradient-to-br from-indigo-400 to-purple-500`;
      }
    };

    const getEmoji = () => {
      switch (expression) {
        case "ready": return "🚀";
        case "warning": return "⚠️";
        default: return "📋";
      }
    };

    return (
      <div className="flex items-start space-x-4 mb-8">
        <div className={getCharacterStyle()}>{getEmoji()}</div>
        <div className="relative bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200 max-w-lg">
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
          <div className="absolute left-0 top-6 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
          <p className="text-gray-700 text-sm">{message}</p>
        </div>
      </div>
    );
  };

  // Check if configuration seems complete
  const hasRounds = setupConfig.roundDefinitions && setupConfig.roundDefinitions.length > 0;
  const hasHostName = setupConfig.hostName && setupConfig.hostName.trim().length > 0;
  const configComplete = hasRounds && hasHostName;

  const getCurrentMessage = () => {
    if (!configComplete) {
      return {
        expression: "warning",
        message: "Please review your configuration carefully! If anything looks incorrect or you'd like to make changes, use the Back button to go back and adjust your settings now. Once launched, you can't change the basic quiz structure."
      };
    }
    return {
      expression: "ready",
      message: "Everything looks great! Review your configuration below one final time. If you need to make any changes, go back now - once launched, you can't modify the quiz structure."
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-indigo-800">Final Step: Review & Launch</h2>
        <div className="text-sm text-gray-600">Ready to start your quiz?</div>
      </div>

      <Character {...getCurrentMessage()} />

      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span className="font-medium text-orange-800">Final Configuration Check</span>
        </div>
        <div className="text-sm text-orange-700">
          Review everything carefully below. If anything is wrong or you'd like to change it, go back now - you won't be able to modify the basic quiz structure after launching.
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-200 pb-4">
          <h3 className="text-lg font-semibold text-gray-800">Quiz Configuration Summary</h3>
          <div className="flex items-center space-x-2">
            {configComplete ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600 font-medium">Ready to Launch</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-yellow-600 font-medium">Needs Review</span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 mb-1 flex items-center space-x-2">
                <span>Host Name</span>
                {hasHostName ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
              </h4>
              <p className={`${hasHostName ? 'text-gray-900' : 'text-red-600'}`}>
                {setupConfig.hostName || 'Not set - please go back and add your name'}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <h4 className="text-gray-700 font-medium mb-1">Entry Fee</h4>
                <p className="text-gray-900">{setupConfig.entryFee ? `${currency}${setupConfig.entryFee}` : 'Free to join'}</p>
              </div>
              <div>
                <h4 className="text-gray-700 font-medium mb-1">Payment Method</h4>
                <p className="text-gray-900">{setupConfig.paymentMethod === 'web3' ? 'Web3 Wallet (USDGLO)' : 'Cash / Revolut'}</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-gray-700 font-medium mb-2">Fundraising Extras</h4>
            {fundraisingEnabled.length > 0 ? (
              <div className="space-y-2">
                {fundraisingEnabled.map(([key]) => (
                  <div key={key} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-gray-800 text-sm">{fundraisingExtras[key]?.label || key}</span>
                    <span className="text-gray-600 text-sm font-medium">
                      {typeof setupConfig.fundraisingPrices?.[key] === 'number'
                        ? `${currency}${setupConfig.fundraisingPrices[key]?.toFixed(2)}`
                        : 'No price set'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">None selected</p>
            )}
          </div>
        </div>

        <div>
          <h4 className="font-medium text-gray-700 mb-2 flex items-center space-x-2">
            <span>Quiz Rounds</span>
            {hasRounds ? <CheckCircle className="w-4 h-4 text-green-500" /> : <AlertTriangle className="w-4 h-4 text-red-500" />}
          </h4>
          {setupConfig.roundDefinitions?.length ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {setupConfig.roundDefinitions.map((round: RoundDefinition, index: number) => (
                <div key={index} className="border rounded-lg p-4 bg-gray-50">
                  <div className="font-medium text-gray-800 mb-1">
                    Round {index + 1}: {roundTypeMap[round.roundType]?.name || round.roundType}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {round.config.questionsPerRound} questions @ {round.config.timePerQuestion}s each
                  </div>
                  <div className="text-xs text-gray-500">
                    Extras: {Object.entries(round.enabledExtras || {})
                      .filter(([_, enabled]) => enabled)
                      .map(([extraKey]) => fundraisingExtras[extraKey]?.label || extraKey)
                      .join(', ') || 'None'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-red-600">No rounds configured - please go back and add at least one round</p>
          )}
        </div>

        {Array.isArray(setupConfig.prizes) && setupConfig.prizes.length > 0 && (
          <div>
            <h4 className="text-gray-700 font-medium mb-2">Prizes</h4>
            <div className="space-y-2">
              {setupConfig.prizes.map((prize, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                  <span className="text-gray-800 text-sm">
                    {prize.place} Place — {prize.description || 'No description'}
                    {prize.sponsor && ` (sponsored by ${prize.sponsor})`}
                  </span>
                  <span className="text-gray-600 text-sm font-medium">{currency}{prize.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Make Changes</span>
        </button>
        <button
          type="button"
          onClick={handleLaunch}
          className={`flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium transition-all duration-200 ${
            isLaunching ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700 shadow-sm hover:shadow-md'
          }`}
          disabled={isLaunching}
        >
          <Rocket className="w-4 h-4" />
          <span>{isLaunching ? 'Launching Quiz...' : 'Launch Dashboard'}</span>
        </button>
      </div>
    </div>
  );
};

export default StepReviewLaunch;





