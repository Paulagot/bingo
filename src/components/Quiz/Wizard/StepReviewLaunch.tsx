import { FC, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nanoid } from 'nanoid';
import { useQuizConfig } from '../useQuizConfig';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';
import { roundTypeMap } from '../../../constants/quiztypeconstants';
import { fundraisingExtras } from '../../../types/quiz';
import type { WizardStepProps } from './WizardStepProps';
import type { RoundDefinition } from '../../../types/quiz';

const StepReviewLaunch: FC<WizardStepProps> = ({ onBack }) => {
  const { config, updateConfig } = useQuizConfig();
  const navigate = useNavigate();
  const debug = true;

  const { socket, connected } = useQuizSocket();
  const [launchQueued, setLaunchQueued] = useState(false);
  const pendingLaunchData = useRef<any>(null);
  const listenersAttached = useRef(false);

  const fundraisingEnabled = Object.entries(config.fundraisingOptions || {}).filter(
    ([_, enabled]) => enabled
  );
  const currency = config.currencySymbol || '€';

  // Attach listeners only once after connected
  useEffect(() => {
    if (!connected || listenersAttached.current || !socket) return;
    listenersAttached.current = true;

    const handleCreated = ({ roomId }: { roomId: string }) => {
      console.log('✅ Received quiz_room_created:', roomId);
      navigate(`/quiz/host-dashboard/${roomId}`);
    };

    const handleError = ({ message }: { message: string }) => {
      console.error('[Socket Error]', message);
    };

    socket.on('quiz_room_created', handleCreated);
    socket.on('quiz_error', handleError);

    return () => {
      socket.off('quiz_room_created', handleCreated);
      socket.off('quiz_error', handleError);
    };
  }, [connected, navigate, socket]);

  // Emit after listeners attached
  useEffect(() => {
    if (!connected || !launchQueued || !pendingLaunchData.current || !socket) return;

    socket.emit('create_quiz_room', pendingLaunchData.current);
    setLaunchQueued(false);
    pendingLaunchData.current = null;
  }, [connected, launchQueued, socket]);

 const handleLaunch = () => {
  if (!socket || !connected) {
    console.warn("Socket not ready yet");
    return;
  }

  const roomId = nanoid(10);
  const hostId = nanoid();
  const updatedConfig = { ...config, roomId, hostId };

  updateConfig({ roomId });
  localStorage.setItem(`quiz_config_${roomId}`, JSON.stringify(updatedConfig));

  console.log('[Launch Payload]', updatedConfig.roundDefinitions);
  console.log('[Launch Payload] Room ID:', roomId);

  socket.emit('create_quiz_room', { roomId, hostId, config: updatedConfig });
socket.emit('join_quiz_room', {
  roomId,
  user: { id: hostId, name: config.hostName },
  role: 'host'
});

};

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-indigo-800">Final Step: Review & Launch</h2>
      <p className="text-sm text-gray-600 mb-4">
        Review your quiz setup below. You can go back to make changes before launching.
      </p>

      <div className="bg-white rounded-xl shadow-md p-6 space-y-5">
        <div>
          <h3 className="font-medium text-gray-700 mb-1">Host Name</h3>
          <p className="text-gray-900">{config.hostName || '—'}</p>
        </div>

        <div>
          <h3 className="font-medium text-gray-700 mb-2">Rounds</h3>
          {config.roundDefinitions?.length ? (
            <ul className="space-y-3">
              {config.roundDefinitions.map((round: RoundDefinition, index: number) => (
                <li key={index} className="border rounded p-3 bg-gray-50">
                  <div className="font-medium text-gray-800">
                    Round {index + 1}: {roundTypeMap[round.roundType]?.name || round.roundType}
                  </div>
                  <div className="text-sm text-gray-600">
                    {round.config.questionsPerRound} questions @ {round.config.timePerQuestion}s
                  </div>
                  <div className="text-sm text-gray-500">
                    Extras:{' '}
                    {Object.entries(round.enabledExtras || {})
                      .filter(([_, enabled]) => enabled)
                      .map(([extraKey]) => fundraisingExtras[extraKey]?.label || extraKey)
                      .join(', ') || 'None'}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">No rounds configured.</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Entry Fee</h4>
            <p className="text-gray-900">
              {config.entryFee ? `${currency}${config.entryFee}` : 'Free to join'}
            </p>
          </div>
          <div>
            <h4 className="text-gray-700 font-medium mb-1">Payment Method</h4>
            <p className="text-gray-900">
              {config.paymentMethod === 'web3' ? 'Web3 Wallet (USDGLOW)' : 'Cash / Revolut'}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-gray-700 font-medium mb-2">Fundraising Extras</h4>
          {fundraisingEnabled.length > 0 ? (
            <ul className="space-y-1">
              {fundraisingEnabled.map(([key]) => (
                <li key={key} className="text-gray-800">
                  • {fundraisingExtras[key]?.label || key} —{' '}
                  {typeof config.fundraisingPrices?.[key] === 'number'
                    ? `${currency}${config.fundraisingPrices[key]?.toFixed(2)}`
                    : 'No price set'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">None selected</p>
          )}
        </div>

        {Array.isArray(config.prizes) && config.prizes.length > 0 && (
          <div>
            <h4 className="text-gray-700 font-medium mb-2">Prizes</h4>
            <ul className="space-y-1">
              {config.prizes.map((prize, index) => (
                <li key={index} className="text-gray-800">
                  • {prize.place} Place — {prize.description || 'No description'} — {currency}
                  {prize.value} {prize.sponsor && `(sponsored by ${prize.sponsor})`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={onBack}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-5 rounded-xl transition"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleLaunch}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-5 rounded-xl transition"
        >
          Launch Dashboard
        </button>
      </div>
    </div>
  );
};

export default StepReviewLaunch;




