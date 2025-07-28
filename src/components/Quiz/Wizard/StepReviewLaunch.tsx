// src/components/Quiz/Wizard/StepReviewLaunch.tsx
import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizSetupStore } from '../useQuizSetupStore';
import { useQuizConfig } from '../useQuizConfig';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { roundTypeMap } from '../../../constants/quiztypeconstants';
import { fundraisingExtras } from './../types/quiz';
import type { WizardStepProps } from './WizardStepProps';
import type { RoundDefinition } from './../types/quiz';
import { 
  ChevronLeft, 
  Rocket, 
  AlertTriangle, 
  User,
  Calendar,
  DollarSign,
  Target,
  Trophy,
  Heart,
  Wallet,
  Clock,
  MapPin,
  CheckCircle,
  Zap
} from 'lucide-react';

const StepReviewLaunch: FC<WizardStepProps> = ({ onBack }) => {
  const { setupConfig } = useQuizSetupStore();
  const { setFullConfig } = useQuizConfig();
  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (!connected || !socket) return;

    const handleCreated = ({ roomId }: { roomId: string }) => {
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
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://bingo-production-4534.up.railway.app';

      const res = await fetch(`${apiUrl}/quiz/api/create-room`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: setupConfig })
      });

      if (!res.ok) {
        setIsLaunching(false);
        return;
      }

      const data = await res.json();
      localStorage.setItem('current-room-id', data.roomId);
      localStorage.setItem('current-host-id', data.hostId);

      setFullConfig({ ...setupConfig, roomId: data.roomId, hostId: data.hostId });
      navigate(`/quiz/host-dashboard/${data.roomId}`);
    } catch (err) {
      console.error('[Launch Error]', err);
      setIsLaunching(false);
    }
  };

  const currency = setupConfig.currencySymbol || '€';
  const hasHostName = !!setupConfig.hostName;
  const hasRounds = setupConfig.roundDefinitions && setupConfig.roundDefinitions.length > 0;
  const configComplete = hasHostName && hasRounds;

  const getCurrentMessage = () => {
    if (!configComplete) {
      return {
        expression: "warning",
        message: "Please review your configuration carefully! If anything looks incorrect or you'd like to make changes, use the Back button to go back and adjust your settings now. Once launched, you can't change the basic quiz structure."
      };
    }
    return {
      expression: "ready",
      message: "Everything looks perfect! Your quiz is ready to launch. Review your configuration below one final time - once launched, you can't modify the quiz structure."
    };
  };

  const Character = ({ expression, message }: { expression: string; message: string }) => {
    const getCharacterStyle = () => {
      const base = "w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center text-2xl md:text-3xl transition-all duration-300";
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

  const formatEventDateTime = (dateTime: string) => {
    if (!dateTime) return null;
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })
    };
  };

  const eventDateTime = formatEventDateTime(setupConfig.eventDateTime || '');

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg md:text-xl font-semibold text-indigo-800">
          Step 8 of 8: Review & Launch
        </h2>
        <div className="text-xs md:text-sm text-gray-600">Final configuration check</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* Warning Banner */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center space-x-2 mb-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <span className="font-medium text-orange-800">Final Configuration Check</span>
        </div>
        <div className="text-sm text-orange-700">
          Review everything carefully below. Changes to the basic quiz structure can't be made after launching.
        </div>
      </div>

      {/* Configuration Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        
        {/* Host & Event Details */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-blue-100">
              👤
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Host & Event</h3>
              <p className="text-sm text-gray-600">Basic event information</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <User className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Host</p>
                <p className="text-gray-900">{setupConfig.hostName || 'Not provided'}</p>
              </div>
            </div>

            {setupConfig.eventDateTime && eventDateTime ? (
              <div className="flex items-start space-x-3">
                <Calendar className="w-4 h-4 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Scheduled</p>
                  <p className="text-gray-900">{eventDateTime.date}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-sm text-gray-600">{eventDateTime.time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{setupConfig.timeZone || 'Unknown timezone'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Event Date</p>
                  <p className="text-gray-900">Not scheduled</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment & Entry Fee */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-green-100">
              💰
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Payment Setup</h3>
              <p className="text-sm text-gray-600">Entry fee and collection method</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Entry Fee</p>
                <p className="text-gray-900 font-semibold">
                  {setupConfig.entryFee ? `${currency}${setupConfig.entryFee}` : 'Free'}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Wallet className="w-4 h-4 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Payment Method</p>
                <p className="text-gray-900">
                  {setupConfig.paymentMethod === 'web3' ? 'Web3 Wallet' : 'Cash / Card'}
                </p>
              </div>
            </div>

            {setupConfig.paymentMethod === 'web3' && (
              <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Chain:</span>
                    <span className="font-medium text-purple-900">{setupConfig.web3Chain || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Currency:</span>
                    <span className="font-medium text-purple-900">{setupConfig.web3Currency || 'USDGLO'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Charity:</span>
                    <span className="font-medium text-purple-900">{setupConfig.web3Charity || 'Not selected'}</span>
                  </div>
                  {setupConfig.web3PrizeSplit?.host && setupConfig.web3PrizeSplit.host > 0 && (
                    <div className="pt-2 border-t border-purple-200">
                      <span className="text-purple-700 text-xs">Host Wallet:</span>
                      <p className="font-mono text-xs text-purple-900 break-all">
                        {setupConfig.hostWallet || 'Missing host wallet address'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quiz Structure */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-indigo-100">
            🎯
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">Quiz Structure</h3>
            <p className="text-sm text-gray-600">
              {(setupConfig.roundDefinitions || []).length} rounds configured
            </p>
          </div>
          <CheckCircle className="w-5 h-5 text-green-600" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(setupConfig.roundDefinitions || []).map((round: RoundDefinition, idx: number) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-4 h-4 text-indigo-600" />
                <span className="font-medium text-gray-900">Round {idx + 1}</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-gray-800">
                  {roundTypeMap[round.roundType]?.name || round.roundType}
                </p>
                <p className="text-gray-600">{round.config.questionsPerRound} questions</p>
                {round.category && (
                  <div className="flex items-center space-x-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                      {round.category}
                    </span>
                  </div>
                )}
                {round.difficulty && (
                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      round.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      round.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {round.difficulty.charAt(0).toUpperCase() + round.difficulty.slice(1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prizes & Extras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        
        {/* Prizes */}
        {((setupConfig.prizes && setupConfig.prizes.length > 0) || setupConfig.prizeSplits) && (
          <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-yellow-100">
                🏆
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg">Prizes</h3>
                <p className="text-sm text-gray-600">Winner rewards</p>
              </div>
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>

            <div className="space-y-3">
              {setupConfig.prizes && setupConfig.prizes.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Digital Assets</h4>
                  {setupConfig.prizes.map((prize, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                      <Trophy className="w-4 h-4 text-yellow-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {prize.place === 1 ? '1st' : prize.place === 2 ? '2nd' : prize.place === 3 ? '3rd' : `${prize.place}th`} Place
                        </p>
                        <p className="text-xs text-gray-600">{prize.description || 'No description'}</p>
                        {prize.tokenAddress && (
                          <p className="text-xs text-gray-500 font-mono">{prize.tokenAddress}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {setupConfig.prizeSplits && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Prize Pool Splits</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(setupConfig.prizeSplits).map(([place, pct]) => (
                      <div key={place} className="text-center p-2 bg-yellow-50 rounded border border-yellow-200">
                        <div className="font-bold text-yellow-700">{pct}%</div>
                        <div className="text-xs text-yellow-600">
                          {place === '1' ? '1st' : place === '2' ? '2nd' : place === '3' ? '3rd' : `${place}th`}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fundraising Extras */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 md:p-6 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-red-100">
              ❤️
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">Fundraising Extras</h3>
              <p className="text-sm text-gray-600">Additional fundraising options</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>

          <div className="space-y-2">
            {setupConfig.fundraisingOptions && Object.entries(setupConfig.fundraisingOptions).length > 0 ? (
              Object.entries(setupConfig.fundraisingOptions).map(([key, enabled]) => (
                enabled ? (
                  <div key={key} className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                        {fundraisingExtras[key]?.label || key}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-green-900">
                      {currency}{setupConfig.fundraisingPrices?.[key] || '0.00'}
                    </span>
                  </div>
                ) : null
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                <Heart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No additional fundraising options selected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Launch Section */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl">
              🚀
            </div>
            <div>
              <h3 className="text-xl font-bold text-indigo-900">Ready to Launch!</h3>
              <p className="text-indigo-700">Your quiz configuration is complete and ready to go live.</p>
            </div>
          </div>
          <Zap className="w-8 h-8 text-indigo-600" />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={handleLaunch}
          className={`flex items-center space-x-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium transition-all duration-200 text-lg ${
            isLaunching ? 'opacity-50 cursor-not-allowed' : 'hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-105'
          }`}
          disabled={isLaunching}
        >
          <Rocket className="w-5 h-5" />
          <span>{isLaunching ? 'Launching...' : 'Launch Quiz'}</span>
        </button>
      </div>
    </div>
  );
};

export default StepReviewLaunch;









