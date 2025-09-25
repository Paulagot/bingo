import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { generateRoomId, generateHostId } from '../utils/idUtils';
import { roundTypeMap } from '../constants/quiztypeconstants';
import type { WizardStepProps } from './WizardStepProps';
import type { RoundDefinition } from '../types/quiz';
import { apiService } from '../../../services/apiService';
import { fundraisingExtraDefinitions } from '../constants/quizMetadata';
import ClearSetupButton from './ClearSetupButton';
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
} from 'lucide-react';

const Character = ({
  tone,
  message,
}: {
  tone: 'ready' | 'warning';
  message: string;
}) => {
  const color =
    tone === 'ready'
      ? 'bg-green-50 border-green-200'
      : 'bg-yellow-50 border-yellow-200';

  return (
    <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-4">
      {/* Image placeholder (consistent with other steps) */}
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-muted sm:h-16 sm:w-16">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
          <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
        </div>
      </div>
      <div className={`relative flex-1 rounded-lg border p-2 shadow-lg sm:rounded-2xl sm:p-4 ${color}`}>
        <p className="text-fg/80 text-xs leading-tight sm:text-sm sm:leading-normal">
          {message}
        </p>
      </div>
    </div>
  );
};

const HeaderTile = () => (
  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border-2 border-border bg-card sm:h-12 sm:w-12">
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
      <span className="text-fg/60 text-[10px] font-medium sm:text-xs">IMG</span>
    </div>
  </div>
);

const StepReviewLaunch: FC<WizardStepProps> = ({ onBack, onResetToFirst }) => {
  const { setupConfig, roomId, hostId, setRoomIds, flow, resetSetupConfig  } = useQuizSetupStore();
  const { setFullConfig } = useQuizConfig();
  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (!connected || !socket) return;

 const handleCreated = ({ roomId }: { roomId: string }) => {
   // try localStorage first; fallback to store hostId if present
   const hId =
     localStorage.getItem('current-host-id') ||
     hostId || // from useQuizSetupStore()
     '';

   resetSetupConfig({ keepIds: false });
   navigate(
     hId
       ? `/quiz/host-dashboard/${roomId}?hostId=${encodeURIComponent(hId)}`
       : `/quiz/host-dashboard/${roomId}`
   );
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
      const newRoomId = roomId || generateRoomId();
      const newHostId = hostId || generateHostId();
      setRoomIds(newRoomId, newHostId);

      const data = await apiService.createRoom({
        config: setupConfig,
        roomId: newRoomId,
        hostId: newHostId,
      });

      localStorage.setItem('current-room-id', data.roomId);
      localStorage.setItem('current-host-id', data.hostId);

      setFullConfig({
        ...setupConfig,
        roomId: data.roomId,
        hostId: data.hostId,
        roomCaps: data.roomCaps,
      });
      resetSetupConfig({ keepIds: false });

    navigate(`/quiz/host-dashboard/${data.roomId}?hostId=${encodeURIComponent(data.hostId)}`)

    } catch (err: any) {
      console.error('[Launch Error]', err);

      if (err.message?.includes('402') || err.message?.includes('no_credits')) {
        alert('You have no credits left. Upgrades coming soon.');
      } else if (err.message?.includes('403') || err.message?.includes('PLAN_NOT_ALLOWED')) {
        alert('Your current plan does not allow this configuration (players/rounds/types).');
      } else if (err.message?.includes('401')) {
        alert('Authentication failed. Please log in again.');
      } else {
        alert('Could not create room. Please review your setup.');
      }

      setIsLaunching(false);
    }
  };

  const currency = setupConfig.currencySymbol || '€';
  const hasHostName = !!setupConfig.hostName;
  const hasRounds =
    setupConfig.roundDefinitions && setupConfig.roundDefinitions.length > 0;
  const configComplete = hasHostName && hasRounds;

  const getCurrentMessage = () => {
    if (!configComplete) {
      return {
        tone: 'warning' as const,
        message:
          "Please review your configuration carefully. If anything looks off, use Back to make changes. Once launched, you can't change the basic quiz structure.",
      };
    }
    return {
      tone: 'ready' as const,
      message:
        "Everything looks good! Review your configuration below one last time. After launching, the quiz structure can't be modified.",
    };
  };

  const formatEventDateTime = (dateTime: string) => {
    if (!dateTime) return null;
    const date = new Date(dateTime);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }),
    };
  };

  const eventDateTime = formatEventDateTime(setupConfig.eventDateTime || '');

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      {/* Header */}
      <div className="px-1">
        <h2 className="heading-2">Review & Launch</h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">Final configuration check</div>
      </div>

      <Character {...getCurrentMessage()} />

      {/* IDs banner (optional) */}
      {(roomId || hostId) && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 sm:p-4">
          <div className="mb-1 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <span className="text-xs font-medium text-blue-900 sm:text-sm">Room IDs Generated</span>
          </div>
          <div className="space-y-0.5 text-xs text-blue-800 sm:text-sm">
            {roomId && (
              <p>
                <span className="font-medium">Room ID:</span>{' '}
                <code className="rounded bg-blue-100 px-2 py-0.5">{roomId}</code>
              </p>
            )}
            {hostId && (
              <p>
                <span className="font-medium">Host ID:</span>{' '}
                <code className="rounded bg-blue-100 px-2 py-0.5">{hostId}</code>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Warning banner */}
      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:p-4">
        <div className="mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-700" />
          <span className="text-xs font-medium text-yellow-900 sm:text-sm">Final Configuration Check</span>
        </div>
        <div className="text-xs text-yellow-800 sm:text-sm">
          Review everything carefully. Changes to the basic quiz structure can’t be made after launching.
        </div>
      </div>

      {/* Overview grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Host & Event */}
        <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center gap-3 sm:mb-4">
            <HeaderTile />
            <div className="min-w-0 flex-1">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Host & Event</h3>
              <p className="text-fg/70 text-xs sm:text-sm">Basic event information</p>
            </div>
            {hasHostName && <CheckCircle className="h-5 w-5 text-green-600" />}
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <User className="text-fg/60 h-4 w-4" />
              <div>
                <p className="text-fg/80 text-xs font-medium sm:text-sm">Host</p>
                <p className="text-fg text-sm sm:text-base">{setupConfig.hostName || 'Not provided'}</p>
              </div>
            </div>

            {setupConfig.eventDateTime && eventDateTime ? (
              <div className="flex items-start gap-3">
                <Calendar className="text-fg/60 mt-0.5 h-4 w-4" />
                <div>
                  <p className="text-fg/80 text-xs font-medium sm:text-sm">Scheduled</p>
                  <p className="text-fg text-sm sm:text-base">{eventDateTime.date}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <Clock className="h-3 w-3 text-fg/50" />
                    <span className="text-fg/70 text-xs sm:text-sm">{eventDateTime.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-fg/50" />
                    <span className="text-fg/60 text-xs">{setupConfig.timeZone || 'Unknown timezone'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Calendar className="text-fg/60 h-4 w-4" />
                <div>
                  <p className="text-fg/80 text-xs font-medium sm:text-sm">Event Date</p>
                  <p className="text-fg text-sm sm:text-base">Not scheduled</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment */}
        <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center gap-3 sm:mb-4">
            <HeaderTile />
            <div className="min-w-0 flex-1">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Payment Setup</h3>
              <p className="text-fg/70 text-xs sm:text-sm">Entry fee and collection method</p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <DollarSign className="text-fg/60 h-4 w-4" />
              <div>
                <p className="text-fg/80 text-xs font-medium sm:text-sm">Entry Fee</p>
                <p className="text-fg text-sm font-semibold sm:text-base">
                  {setupConfig.entryFee ? `${currency}${setupConfig.entryFee}` : 'Free'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Wallet className="text-fg/60 h-4 w-4" />
              <div>
                <p className="text-fg/80 text-xs font-medium sm:text-sm">Payment Method</p>
                <p className="text-fg text-sm sm:text-base">
                  {setupConfig.paymentMethod === 'web3' ? 'Web3 Wallet' : 'Cash / Card'}
                </p>
              </div>
            </div>

            {setupConfig.paymentMethod === 'web3' && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Chain</span>
                    <span className="font-medium text-purple-900">{setupConfig.web3Chain || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Currency</span>
                    <span className="font-medium text-purple-900">{setupConfig.web3Currency || 'USDGLO'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Charity</span>
                    <span className="font-medium text-purple-900">{setupConfig.web3Charity || 'Not selected'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quiz Structure */}
      <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm sm:p-6">
        <div className="mb-3 flex items-center gap-3 sm:mb-4">
          <HeaderTile />
          <div className="min-w-0 flex-1">
            <h3 className="text-fg text-sm font-semibold sm:text-base">Quiz Structure</h3>
            <p className="text-fg/70 text-xs sm:text-sm">
              {(setupConfig.roundDefinitions || []).length} rounds configured
            </p>
          </div>
          {hasRounds && <CheckCircle className="h-5 w-5 text-green-600" />}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(setupConfig.roundDefinitions || []).map((round: RoundDefinition, idx: number) => (
            <div key={idx} className="rounded-lg border border-border bg-card p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" />
                <span className="text-fg text-sm font-medium">Round {idx + 1}</span>
              </div>
              <div className="space-y-0.5 text-xs sm:text-sm">
                <p className="text-fg font-medium">
                  {roundTypeMap[round.roundType]?.name || round.roundType}
                </p>
                <p className="text-fg/70">{round.config.questionsPerRound} questions</p>
                {round.category && (
                  <span className="inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    {round.category}
                  </span>
                )}{' '}
                {round.difficulty && (
                  <span
                    className={`inline-block rounded px-2 py-0.5 text-xs ${
                      round.difficulty === 'easy'
                        ? 'bg-green-100 text-green-700'
                        : round.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {round.difficulty.charAt(0).toUpperCase() + round.difficulty.slice(1)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prizes & Fundraising */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Prizes */}
        {((setupConfig.prizes && setupConfig.prizes.length > 0) || setupConfig.prizeSplits) && (
          <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm sm:p-6">
            <div className="mb-3 flex items-center gap-3 sm:mb-4">
              <HeaderTile />
              <div className="min-w-0 flex-1">
                <h3 className="text-fg text-sm font-semibold sm:text-base">Prizes</h3>
                <p className="text-fg/70 text-xs sm:text-sm">Winner rewards</p>
              </div>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>

            <div className="space-y-3">
              {setupConfig.prizes && setupConfig.prizes.length > 0 && (
                <div>
                  <h4 className="text-fg/80 mb-2 text-xs font-medium sm:text-sm">Defined Prizes</h4>
                  <div className="space-y-2">
                    {setupConfig.prizes.map((prize, idx) => (
                      <div key={idx} className="flex items-center gap-3 rounded border border-border bg-card p-2">
                        <Trophy className="h-4 w-4 text-yellow-600" />
                        <div className="min-w-0">
                          <p className="text-fg text-sm font-medium">
                            {prize.place === 1
                              ? '1st'
                              : prize.place === 2
                              ? '2nd'
                              : prize.place === 3
                              ? '3rd'
                              : `${prize.place}th`}{' '}
                            Place
                          </p>
                          <p className="text-fg/70 text-xs">
                            {prize.description || 'No description'}
                            {prize.value ? ` • ${currency}${prize.value}` : ''}
                            {prize.sponsor ? ` • ${prize.sponsor}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {setupConfig.prizeSplits && (
                <div>
                  <h4 className="text-fg/80 mb-2 text-xs font-medium sm:text-sm">Prize Pool Splits</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(setupConfig.prizeSplits).map(([place, pct]) => (
                      <div key={place} className="rounded border border-yellow-200 bg-yellow-50 p-2 text-center">
                        <div className="font-bold text-yellow-700">{pct}%</div>
                        <div className="text-xs text-yellow-700">
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
        <div className="bg-muted rounded-lg border-2 border-border p-3 shadow-sm sm:p-6">
          <div className="mb-3 flex items-center gap-3 sm:mb-4">
            <HeaderTile />
            <div className="min-w-0 flex-1">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Fundraising Extras</h3>
              <p className="text-fg/70 text-xs sm:text-sm">Additional fundraising options</p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>

          <div className="space-y-2">
            {setupConfig.fundraisingOptions &&
            Object.entries(setupConfig.fundraisingOptions).some(([, enabled]) => enabled) ? (
              Object.entries(setupConfig.fundraisingOptions).map(([key, enabled]) =>
                enabled ? (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded border border-green-200 bg-green-50 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">
                       {fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions]?.label || key}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-green-900">
                      {currency}
                      {setupConfig.fundraisingPrices?.[key] ?? '0.00'}
                    </span>
                  </div>
                ) : null
              )
            ) : (
              <div className="text-fg/60 py-4 text-center">
                <Heart className="mx-auto mb-2 h-8 w-8 text-fg/30" />
                <p className="text-sm">No additional fundraising options selected</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Launch CTA */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 sm:p-4">
        <div className="mb-2 text-sm font-medium text-indigo-900 sm:text-base">Ready to launch</div>
        <div className="text-xs text-indigo-800 sm:text-sm">
          Your quiz configuration is complete and ready to go live.
        </div>
      </div>

      {/* Navigation */}
      <div className="border-border flex justify-between border-t pt-4 sm:pt-6">
        <button type="button" onClick={onBack} className="btn-muted">
          <ChevronLeft className="h-4 w-4" />
          <span>Back</span>
        </button>

           <ClearSetupButton
                     variant="ghost"
                     flow={flow ?? 'web2'}         // ensures reset keeps current flow (web2/web3)
                     onCleared={onResetToFirst}    // jumps to first step after clearing
                   />

        <button
          type="button"
          onClick={handleLaunch}
          className="btn-primary disabled:opacity-60"
          disabled={isLaunching}
        >
          <Rocket className="h-4 w-4" />
          <span>{isLaunching ? 'Launching…' : 'Launch Quiz'}</span>
        </button>
      </div>
    </div>
  );
};

export default StepReviewLaunch;










