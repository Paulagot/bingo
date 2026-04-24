import { FC, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { generateRoomId, generateHostId } from '../utils/idUtils';
import { roundTypeMap } from '../constants/quiztypeconstants';
import type { WizardStepProps } from './WizardStepProps';
import type { RoundDefinition } from '../types/quiz';
import { roomApi } from '@/shared/api';
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

const StepReviewLaunch: FC<WizardStepProps> = ({ onBack, onNext, onResetToFirst, isEditMode }) => {
  const { setupConfig, roomId, hostId, setRoomIds, flow, resetSetupConfig } = useQuizSetupStore();
  const { setFullConfig } = useQuizConfig();
  const navigate = useNavigate();
  const { socket, connected } = useQuizSocket();
  const [isLaunching, setIsLaunching] = useState(false);

  useEffect(() => {
    if (!connected || !socket) return;

    const handleCreated = () => {
      resetSetupConfig({ keepIds: false });
      navigate('/quiz/eventdashboard');
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
  }, [connected, navigate, resetSetupConfig, socket]);

  const handleLaunch = async () => {
    if (isLaunching) return;
    setIsLaunching(true);

    try {
      const newRoomId = roomId || generateRoomId();
      const newHostId = hostId || generateHostId();
      setRoomIds(newRoomId, newHostId);

      console.log('[LAUNCH setupConfig fundraisingOptions]', setupConfig.fundraisingOptions);
      console.log('[LAUNCH setupConfig fundraisingPrices]', setupConfig.fundraisingPrices);

      const data = await roomApi.createRoom({
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
        roomCaps: data.roomCaps as any,
      });

      resetSetupConfig({ keepIds: false });
      navigate('/quiz/eventdashboard');
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

  const fundraisingMode = setupConfig.fundraisingMode ?? 'fixed_fee';
  const isDonationMode = fundraisingMode === 'donation';

  const enabledExtras = Object.entries(setupConfig.fundraisingOptions || {}).filter(
    ([, enabled]) => !!enabled
  );

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
        "Everything looks good! Review your configuration below one last time. ",
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

      <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 sm:p-4">
        <div className="mb-1 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-yellow-700" />
          <span className="text-xs font-medium text-yellow-900 sm:text-sm">Final Configuration Check</span>
        </div>
        <div className="text-xs text-yellow-800 sm:text-sm">
          Review everything carefully.
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {/* Left column */}
        <div className="space-y-3 sm:space-y-4">
          {/* Host */}
          <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-start gap-3">
              <HeaderTile />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold sm:text-base">Host</h3>
                </div>
                <p className="text-fg/60 mt-0.5 text-xs sm:text-sm">Who participants will see</p>
              </div>
            </div>
            <div className="rounded border border-border bg-muted/40 p-3">
              <div className="text-sm font-medium text-fg">{setupConfig.hostName || 'Not set'}</div>
            </div>
          </div>

          {/* Schedule */}
          <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-start gap-3">
              <HeaderTile />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold sm:text-base">Schedule</h3>
                </div>
                <p className="text-fg/60 mt-0.5 text-xs sm:text-sm">When your quiz will happen</p>
              </div>
            </div>

            {eventDateTime ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 rounded border border-indigo-200 bg-indigo-50 p-2">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-900">{eventDateTime.date}</span>
                </div>
                <div className="flex items-center gap-2 rounded border border-indigo-200 bg-indigo-50 p-2">
                  <Clock className="h-4 w-4 text-indigo-600" />
                  <span className="text-sm font-medium text-indigo-900">{eventDateTime.time}</span>
                </div>
                {(setupConfig.timeZone || flow === 'web2') && (
                  <div className="flex items-center gap-2 rounded border border-indigo-200 bg-indigo-50 p-2">
                    <MapPin className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-900">
                      {setupConfig.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-fg/60 py-4 text-center text-sm">No schedule set</div>
            )}
          </div>

          {/* Payment */}
          <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-start gap-3">
              <HeaderTile />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold sm:text-base">Payment Setup</h3>
                </div>
                <p className="text-fg/60 mt-0.5 text-xs sm:text-sm">How players will contribute</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded border border-border bg-muted/40 p-2">
                <span className="text-sm text-fg/70">Fundraising Model</span>
                <span className="text-sm font-medium text-fg">
                  {isDonationMode ? 'Donation-based' : 'Fixed entry fee'}
                </span>
              </div>

              <div className="flex items-center justify-between rounded border border-border bg-muted/40 p-2">
                <span className="text-sm text-fg/70">Currency</span>
                <span className="text-sm font-medium text-fg">{currency}</span>
              </div>

              {!isDonationMode ? (
                <div className="flex items-center justify-between rounded border border-border bg-muted/40 p-2">
                  <span className="text-sm text-fg/70">Entry Fee</span>
                  <span className="text-sm font-semibold text-fg">
                    {currency}
                    {setupConfig.entryFee || '0.00'}
                  </span>
                </div>
              ) : (
                <div className="rounded border border-blue-200 bg-blue-50 p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Player Contribution</span>
                  </div>
                  <p className="text-xs text-blue-800 sm:text-sm">
                    Players can donate any amount they want, including 0.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-3 sm:space-y-4">
          {/* Rounds */}
          <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-start gap-3">
              <HeaderTile />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold sm:text-base">Rounds</h3>
                </div>
                <p className="text-fg/60 mt-0.5 text-xs sm:text-sm">Your quiz structure</p>
              </div>
            </div>

            <div className="space-y-2">
              {(setupConfig.roundDefinitions || []).map((round: RoundDefinition, index: number) => (
                <div
                  key={`${round.roundNumber}-${round.roundType}-${index}`}
                  className="rounded border border-border bg-muted/40 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-fg">Round {round.roundNumber}</span>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {roundTypeMap[round.roundType]?.name || round.roundType}
                    </span>
                  </div>
                  {round.category && (
                    <div className="mt-2 text-xs text-fg/70">Category: {round.category}</div>
                  )}
                  {round.difficulty && (
                    <div className="mt-1 text-xs text-fg/70">Difficulty: {round.difficulty}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Prizes */}
          <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-start gap-3">
              <HeaderTile />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold sm:text-base">Prizes</h3>
                </div>
                <p className="text-fg/60 mt-0.5 text-xs sm:text-sm">What players can win</p>
              </div>
            </div>

            <div className="space-y-2">
              {setupConfig.prizes && setupConfig.prizes.length > 0 ? (
                setupConfig.prizes.map((prize, idx) => (
                  <div key={`${prize.place}-${idx}`} className="rounded border border-border bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-fg">{prize.place} place</span>
                      <span className="text-xs text-fg/70">{prize.sponsor || 'No sponsor'}</span>
                    </div>
                    <div className="mt-1 text-sm text-fg/80">{prize.description}</div>
                  </div>
                ))
              ) : (
                <div className="text-fg/60 py-4 text-center text-sm">No prizes added</div>
              )}
            </div>
          </div>

          {/* Extras */}
          <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
            <div className="mb-3 flex items-start gap-3">
              <HeaderTile />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold sm:text-base">Fundraising Extras</h3>
                </div>
                <p className="text-fg/60 mt-0.5 text-xs sm:text-sm">
                  {isDonationMode
                    ? 'Automatically included for all players'
                    : 'Extra fundraising options enabled for this quiz'}
                </p>
              </div>
            </div>

            {isDonationMode ? (
              <div className="rounded border border-blue-200 bg-blue-50 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Heart className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">All extras included</span>
                </div>
                <p className="mb-3 text-xs text-blue-800 sm:text-sm">
                  Because this is a donation-based quiz, all extras are automatically included for
                  hosts and players.
                </p>

                <div className="space-y-2">
                  {enabledExtras.length > 0 ? (
                    enabledExtras.map(([key]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded border border-blue-200 bg-white/70 p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Heart className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            {fundraisingExtraDefinitions[key as keyof typeof fundraisingExtraDefinitions]?.label || key}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-blue-700">Included</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-fg/60 py-2 text-center text-sm">
                      Extras will be included automatically.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {enabledExtras.length > 0 ? (
                  enabledExtras.map(([key]) => (
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
                  ))
                ) : (
                  <div className="text-fg/60 py-4 text-center">
                    <Heart className="mx-auto mb-2 h-8 w-8 text-fg/30" />
                    <p className="text-sm">No additional fundraising options selected</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Launch CTA */}
      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 sm:p-4">
        <div className="mb-2 text-sm font-medium text-indigo-900 sm:text-base">Ready to Schedule</div>
        <div className="text-xs text-indigo-800 sm:text-sm">
          Your quiz configuration is complete and ready to go live. Click "Ready to Schedule" to create your quiz room. You can always make adjustments before the event starts.
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
          flow={flow ?? 'web2'}
          onCleared={onResetToFirst}
        />

        <button
          type="button"
          onClick={isEditMode ? onNext : handleLaunch}
          className="btn-primary disabled:opacity-60"
          disabled={isLaunching}
        >
          <Rocket className="h-4 w-4" />
          <span>{isEditMode ? 'Save Changes' : isLaunching ? 'Launching…' : 'Ready to Schedule'}</span>
        </button>
      </div>
    </div>
  );
};

export default StepReviewLaunch;










