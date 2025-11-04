// src/components/Quiz/host-controls/HostRoundPreview.tsx
import React, { useMemo } from 'react';
import { Play } from 'lucide-react';
import { roundTypeDefinitions } from '../constants/quizMetadata';
import type { RoundTypeId } from '../types/quiz';

const DEBUG = true;
const log = {
  group(label: string, data?: any) {
    if (!DEBUG) return;
    console.groupCollapsed(`🟣 [HostRoundPreview] ${label}`);
    if (data !== undefined) console.log(data);
    console.groupEnd();
  },
  info(msg: string, data?: any) {
    if (DEBUG) console.log(`🟣 [HostRoundPreview] ${msg}`, data ?? '');
  },
  warn(msg: string, data?: any) {
    if (DEBUG) console.warn(`🟣 [HostRoundPreview][WARN] ${msg}`, data ?? '');
  },
  error(msg: string, data?: any) {
    if (DEBUG) console.error(`🟣 [HostRoundPreview][ERROR] ${msg}`, data ?? '');
  },
};

interface ServerScoringSummary {
  type?: string;
  pointsPerDifficulty?: { easy: number; medium: number; hard: number };
  pointsLostPerWrong?: number;
  pointsLostPerUnanswered?: number;
  ui?: {
    timePerQuestion?: number | null;
    totalTimeSeconds?: number | null;
    questionsPerRound?: number | null;
    skipAllowed?: boolean;
  };
}

interface HostRoundPreviewProps {
  currentRound: number;
  totalRounds: number;
  config: any;
  roomPhase: 'waiting' | 'launched';
  totalPlayers: number;
  onStartRound: () => void;

  /** Optional: if you start reading room_state.scoringSummary, pass it in */
  serverScoring?: ServerScoringSummary | null;
}

const HostRoundPreview: React.FC<HostRoundPreviewProps> = ({
  currentRound,
  config,
  roomPhase,
  totalPlayers,
  onStartRound,
  serverScoring,
}) => {
  // --- Defensive reads -------------------------------------------------------
  const currentRoundIndex = Math.max(0, (currentRound ?? 1) - 1);
  const currentRoundDef = config?.roundDefinitions?.[currentRoundIndex];

  if (!config) {
    log.error('Missing config prop');
  }
  log.group('Incoming props snapshot', {
    currentRound,
    currentRoundIndex,
    totalRounds: config?.roundDefinitions?.length,
    roomPhase,
    totalPlayers,
    hasServerScoring: !!serverScoring,
  });

  if (!currentRoundDef) {
    log.error('currentRoundDef not found at index', currentRoundIndex);
    return null;
  }

  const roundTypeId = currentRoundDef?.roundType as RoundTypeId | undefined;
  const roundMetadata = roundTypeId ? roundTypeDefinitions[roundTypeId] : undefined;

  if (!roundTypeId) {
    log.error('roundTypeId missing on currentRoundDef', currentRoundDef);
    return null;
  }
  if (!roundMetadata) {
    log.error(`roundMetadata not found for type "${roundTypeId}"`);
    return null;
  }

  const roundConfig = currentRoundDef.config || {};
  const defaultConfig = roundMetadata.defaultConfig || {};

  log.group('Round definitions', {
    roundTypeId,
    roundMetadata,
    currentRoundDef,
    roundConfig,
    defaultConfig,
    serverScoring,
  });

  // --- Helpers that annotate source of truth ---------------------------------
  type SourceTag<T> = { value: T; source: 'server' | 'roundConfig' | 'defaultConfig' | 'hardFallback' };

  const pick = <T,>(
    serverVal: T | undefined,
    rcVal: T | undefined,
    defVal: T | undefined,
    hard: T,
    label: string
  ): SourceTag<T> => {
    if (serverVal !== undefined && serverVal !== null) {
      log.info(`Using SERVER ${label}`, serverVal);
      return { value: serverVal, source: 'server' };
    }
    if (rcVal !== undefined && rcVal !== null) {
      log.info(`Using ROUND CONFIG ${label}`, rcVal);
      return { value: rcVal, source: 'roundConfig' };
    }
    if (defVal !== undefined && defVal !== null) {
      log.info(`Using DEFAULT CONFIG ${label}`, defVal);
      return { value: defVal, source: 'defaultConfig' };
    }
    log.warn(`Using HARD FALLBACK ${label}`, hard);
    return { value: hard, source: 'hardFallback' };
  };

  // --- Compute values, preferring serverScoring when provided ----------------
  const derived = useMemo(() => {
    // server values (optional)
    const sPPD = serverScoring?.pointsPerDifficulty;
    const sPLW = serverScoring?.pointsLostPerWrong;
    const sPLU = serverScoring?.pointsLostPerUnanswered;
    const sTPQ = serverScoring?.ui?.timePerQuestion ?? undefined;
    const sTTS = serverScoring?.ui?.totalTimeSeconds ?? undefined;
    const sQPR = serverScoring?.ui?.questionsPerRound ?? undefined;

    const ppd = pick(
      sPPD,
      roundConfig.pointsPerDifficulty,
      defaultConfig.pointsPerDifficulty,
      { easy: 1, medium: 2, hard: 3 },
      'pointsPerDifficulty'
    );

    const lostWrong = pick(
      sPLW,
      roundConfig.pointsLostPerWrong,
      defaultConfig.pointsLostPerWrong,
      0,
      'pointsLostPerWrong'
    );

    const lostNA = pick(
      sPLU,
      roundConfig.pointsLostPerUnanswered,
      defaultConfig.pointsLostPerUnanswered,
      0,
      'pointsLostPerUnanswered'
    );

    const tpq = pick(
      typeof sTPQ === 'number' ? sTPQ : undefined,
      roundConfig.timePerQuestion,
      defaultConfig.timePerQuestion,
      25,
      'timePerQuestion'
    );

    const tts = pick(
      typeof sTTS === 'number' ? sTTS : undefined,
      roundConfig.totalTimeSeconds,
      defaultConfig.totalTimeSeconds,
      undefined,
      'totalTimeSeconds'
    );

    const qpr = pick(
      typeof sQPR === 'number' ? sQPR : undefined,
      roundConfig.questionsPerRound,
      defaultConfig.questionsPerRound,
      6,
      'questionsPerRound'
    );

    return {
      pointsPerDifficulty: ppd,
      pointsLostPerWrong: lostWrong,
      pointsLostPerNoAnswer: lostNA,
      timePerQuestion: tpq,
      totalTimeSeconds: tts,
      questionsPerRound: qpr,
    };
  }, [serverScoring, roundConfig, defaultConfig]);

  // Log the final chosen values + their sources
  log.group('Resolved scoring/timing (with sources)', {
    pointsPerDifficulty: derived.pointsPerDifficulty,
    pointsLostPerWrong: derived.pointsLostPerWrong,
    pointsLostPerNoAnswer: derived.pointsLostPerNoAnswer,
    timePerQuestion: derived.timePerQuestion,
    totalTimeSeconds: derived.totalTimeSeconds,
    questionsPerRound: derived.questionsPerRound,
    category: currentRoundDef.category,
    difficulty: currentRoundDef.difficulty,
  });

  const roundDifficulty = currentRoundDef.difficulty as
    | 'easy'
    | 'medium'
    | 'hard'
    | undefined;
  const roundCategory = currentRoundDef.category as string | undefined;

  const pointsForThisRound =
    roundDifficulty != null
      ? (derived.pointsPerDifficulty.value as any)[roundDifficulty]
      : null;

  const isSpeedRound = roundTypeId === 'speed_round';

  return (
    <div
      className="mb-6 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 p-8 shadow-lg"
      data-testid="host-round-preview"
    >
      <div className="mb-6 text-center">
        <div className="mb-3 text-6xl">{roundMetadata.icon}</div>
        <h2 className="mb-2 text-3xl font-bold text-indigo-900">
          {roomPhase === 'waiting' ? 'Preparing' : 'Ready to Start'} Round {currentRound}
        </h2>
        <h3 className="text-2xl font-semibold text-indigo-700 mb-4">
          {roundMetadata.name}
        </h3>
      </div>

      {/* Host Controls Section */}
      <div className="bg-green-50 mb-6 rounded-lg p-6 backdrop-blur-sm">
        <h4 className="text-green-800 mb-3 text-lg font-bold flex items-center">
          🎯 Host Controls
        </h4>
        <ul className="space-y-1 text-sm text-green-700">
          <li>• Read the round configuration below to players</li>
          <li>• Start round when players are ready</li>
          <li>
            • Read questions to players with possible answers - questions
            auto-transition when timer expires
          </li>
          <li>
            • Review stage: Read each question again with correct answer and share
            stats
          </li>
          <li>• Control leaderboard transitions (round results, then overall leaderboard)</li>
          <li>• Allow time for players to use arsenal during round leaderboard</li>
        </ul>
      </div>

      {/* Category and Difficulty */}
      <div className="mb-6 flex items-center justify-center space-x-4">
        {roundCategory && (
          <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
            📚 {roundCategory}
          </span>
        )}
        {roundDifficulty && (
          <span
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              roundDifficulty === 'easy'
                ? 'bg-green-100 text-green-700'
                : roundDifficulty === 'medium'
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {roundDifficulty.charAt(0).toUpperCase() + roundDifficulty.slice(1)} Level
          </span>
        )}
      </div>

      {/* Round Configuration */}
      <div className="bg-blue-50 mb-6 rounded-lg p-6 backdrop-blur-sm">
        <h4 className="text-blue-800 mb-3 text-lg font-bold">⏱️ Timing & Scoring</h4>
        <p className="text-blue-800 mb-4">{roundMetadata.description}</p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-sm text-blue-700">
              <strong data-testid="qpr">{derived.questionsPerRound.value ?? 0}</strong>{' '}
              questions this round{' '}
              <span className="opacity-50 text-xs">
                ({derived.questionsPerRound.source})
              </span>
            </div>

            <div className="text-sm text-blue-700">
              {isSpeedRound && derived.totalTimeSeconds.value ? (
                <>
                  <strong data-testid="tts">{derived.totalTimeSeconds.value}</strong> seconds
                  total time{' '}
                  <span className="opacity-50 text-xs">
                    ({derived.totalTimeSeconds.source})
                  </span>
                </>
              ) : (
                <>
                  <strong data-testid="tpq">{derived.timePerQuestion.value}</strong> seconds
                  per question{' '}
                  <span className="opacity-50 text-xs">
                    ({derived.timePerQuestion.source})
                  </span>
                </>
              )}
            </div>

            {pointsForThisRound !== null ? (
              <div
                className={`text-sm ${
                  roundDifficulty === 'easy'
                    ? 'text-green-700'
                    : roundDifficulty === 'medium'
                    ? 'text-blue-700'
                    : 'text-purple-700'
                }`}
              >
                <strong data-testid="ppd-specific">+{pointsForThisRound}</strong> points for
                correct answers{' '}
                <span className="opacity-50 text-xs">
                  ({derived.pointsPerDifficulty.source})
                </span>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-sm text-green-700">
                  <strong data-testid="ppd-easy">
                    +{derived.pointsPerDifficulty.value.easy}
                  </strong>{' '}
                  points for easy questions{' '}
                  <span className="opacity-50 text-xs">
                    ({derived.pointsPerDifficulty.source})
                  </span>
                </div>
                <div className="text-sm text-blue-700">
                  <strong data-testid="ppd-medium">
                    +{derived.pointsPerDifficulty.value.medium}
                  </strong>{' '}
                  points for medium questions{' '}
                  <span className="opacity-50 text-xs">
                    ({derived.pointsPerDifficulty.source})
                  </span>
                </div>
                <div className="text-sm text-purple-700">
                  <strong data-testid="ppd-hard">
                    +{derived.pointsPerDifficulty.value.hard}
                  </strong>{' '}
                  points for hard questions{' '}
                  <span className="opacity-50 text-xs">
                    ({derived.pointsPerDifficulty.source})
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {Number(derived.pointsLostPerWrong.value) > 0 && (
              <div className="text-sm text-red-600">
                <strong data-testid="plw">-{derived.pointsLostPerWrong.value}</strong> points
                for wrong answers{' '}
                <span className="opacity-50 text-xs">
                  ({derived.pointsLostPerWrong.source})
                </span>
              </div>
            )}
            {Number(derived.pointsLostPerNoAnswer.value) > 0 && (
              <div className="text-sm text-orange-600">
                <strong data-testid="plu">-{derived.pointsLostPerNoAnswer.value}</strong>{' '}
                points for not answering{' '}
                <span className="opacity-50 text-xs">
                  ({derived.pointsLostPerNoAnswer.source})
                </span>
              </div>
            )}
            {Number(derived.pointsLostPerWrong.value) === 0 &&
              Number(derived.pointsLostPerNoAnswer.value) === 0 && (
                <div className="text-sm text-gray-600">No penalties for wrong/missed answers</div>
              )}
            <div className="text-sm text-gray-600">
              <strong data-testid="players">{totalPlayers}</strong> players connected
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="text-center">
        {roomPhase === 'waiting' && (
          <button
            onClick={onStartRound}
            className="mx-auto flex transform items-center space-x-3 rounded-xl bg-indigo-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-indigo-700 hover:shadow-xl"
            data-testid="start-button-waiting"
          >
            <Play className="h-6 w-6" />
            <span>Launch Quiz & Start Round {currentRound}</span>
          </button>
        )}

        {roomPhase === 'launched' && (
          <>
            <div className="mb-4 rounded-lg bg-green-50 p-4">
              <p className="font-medium text-green-700">
                🚀 Quiz launched! Players are now ready.
              </p>
            </div>
            <button
              onClick={onStartRound}
              className="mx-auto flex transform items-center space-x-3 rounded-xl bg-green-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-green-700 hover:shadow-xl"
              data-testid="start-button-launched"
            >
              <Play className="h-6 w-6" />
              <span>Start Round {currentRound}</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default HostRoundPreview;
