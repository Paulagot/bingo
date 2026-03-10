// src/components/Quiz/game/QuizGameWaitingPage.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Trophy,
  Users,
  Zap,
  ShieldAlert
} from 'lucide-react';

import { useQuizSocket } from '../sockets/QuizSocketProvider';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { fundraisingExtraDefinitions, roundTypeDefinitions } from '../constants/quizMetadata';

import type {
  Prize,
  QuizConfig,
  RoundTypeId
} from '../types/quiz';

const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log('[QuizGameWaitingPage]', ...args);

type RoomPhase =
  | 'waiting'
  | 'launched'
  | 'asking'
  | 'reviewing'
  | 'leaderboard'
  | 'complete'
  | 'distributing_prizes'
  | 'tiebreaker';

type RoomStatePayload = {
  currentRound?: number;
  totalRounds?: number;
  roundTypeName?: string;
  phase?: RoomPhase;
  questionsThisRound?: number;
  totalPlayers?: number;
};

interface ServerPlayer {
  id: string;
  name: string;
  paid: boolean;
  paymentMethod: string;
  credits: number;
  extras: string[];
  extraPayments?: Record<string, any>;
  disqualified?: boolean;
}

export default function QuizGameWaitingPage() {
  const { roomId, playerId } = useParams<{ roomId: string; playerId: string }>();
  const { socket, connected } = useQuizSocket();
  const navigate = useNavigate();
  const quizStore = useQuizConfig();

  // Type your config from your quiz.ts
  const config = quizStore?.config as QuizConfig | undefined;

  const [playerData, setPlayerData] = useState<ServerPlayer | null>(null);
  const [allPlayers, setAllPlayers] = useState<ServerPlayer[]>([]);
  const [roomState, setRoomState] = useState<RoomStatePayload>({ phase: 'waiting', currentRound: 1 });

  const [showRounds, setShowRounds] = useState(false);
  const [showPrizes, setShowPrizes] = useState(false);
  const [showArsenal, setShowArsenal] = useState(false);

  const hasJoinedRef = useRef(false);
  const location = useLocation();

  const STORAGE_KEY = useMemo(() => {
    if (!roomId || !playerId) return null;
    return `fr_player:${roomId}:${playerId}`;
  }, [roomId, playerId]);

  const currentRound = useMemo(() => {
    const n = roomState.currentRound;
    return typeof n === 'number' && n > 0 ? n : 1;
  }, [roomState.currentRound]);

  const roundDefinitions = useMemo(() => {
    return config?.roundDefinitions ?? [];
  }, [config?.roundDefinitions]);

  const totalRounds = useMemo(() => {
    const fromState = roomState.totalRounds;
    if (typeof fromState === 'number' && fromState > 0) return fromState;
    if (roundDefinitions.length > 0) return roundDefinitions.length;
    return 0;
  }, [roomState.totalRounds, roundDefinitions.length]);

  const totalPlayers = useMemo(() => {
    return allPlayers.length || roomState.totalPlayers || 0;
  }, [allPlayers.length, roomState.totalPlayers]);

  // ✅ TS-safe prizes list
  const prizes: Prize[] = useMemo(() => {
    return (config?.prizes ?? []) as Prize[];
  }, [config?.prizes]);

  const playerExtras = playerData?.extras ?? [];
  const currencySymbol = config?.currencySymbol ?? '';

  const phaseShouldRedirect = (phase?: RoomPhase) => {
    return !!phase && ['asking', 'reviewing', 'leaderboard', 'tiebreaker', 'launched', 'complete'].includes(phase);
  };

  // Read ticketId from localStorage
const ticketId = useMemo(() => {
  if (!roomId || !playerId) return null;
  return localStorage.getItem(`quizTicketId:${roomId}:${playerId}`);
}, [roomId, playerId]);

const joinOrRecover = () => {
  if (!socket || !connected || !roomId || !playerId) return;
  if (hasJoinedRef.current) return;
  hasJoinedRef.current = true;

  const userPayload: { id: string; name?: string } = { id: playerId };
  if (playerData?.name) userPayload.name = playerData.name;

  socket.emit('join_and_recover', { 
    roomId, 
    user: userPayload, 
    role: 'player',
    ticketId,  // ← pass it here
  }, (res?: any) => {
    if (!res?.ok) {
      log('join_and_recover failed', res);
      // ✅ Don't navigate away — just stay on the waiting page
      hasJoinedRef.current = false;
      return;
    }

const snap = res.snap;
if (snap?.roomState) setRoomState((prev) => ({ ...prev, ...snap.roomState }));

// ✅ Hydrate playerData from server on rejoin (cold load with no localStorage/navState)
if (snap?.players && playerId) {
  const me = snap.players.find((p: any) => p.id === playerId);
  if (me && !playerData) {
    setPlayerData(me as ServerPlayer);
    try { localStorage.setItem(STORAGE_KEY!, JSON.stringify(me)); } catch {}
  }
}

const phase = snap?.roomState?.phase as RoomPhase | undefined;
if (phaseShouldRedirect(phase)) {
  navigate(`/quiz/play/${roomId}/${playerId}`);
}
  });
};

  const getExtraInfo = (extraId: string) => {
    const found = Object.values(fundraisingExtraDefinitions).find((def: any) => {
      const a = String(def.id ?? '').toLowerCase();
      const b = String(extraId ?? '').toLowerCase();
      return a === b || a.includes(b) || b.includes(a);
    }) as any | undefined;

    return {
      icon: found?.icon ?? '💰',
      label: found?.label ?? extraId,
      description: found?.description ?? 'No description available.',
    };
  };

  // Hydrate cache
  useEffect(() => {
    if (!STORAGE_KEY) return;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) setPlayerData(JSON.parse(cached));
    } catch {
      // ignore
    }
  }, [STORAGE_KEY]);

 useEffect(() => {
  if (!STORAGE_KEY) return;

  // ✅ First try navigation state (fresh join via ticket)
  const navState = location.state as { playerName?: string; paid?: boolean; paymentMethod?: string } | null;
  if (navState?.playerName) {
    const seedData: ServerPlayer = {
      id: playerId!,
      name: navState.playerName,
      paid: navState.paid ?? false,
      paymentMethod: navState.paymentMethod || 'instant_payment',
      credits: 0,
      extras: [],
    };
    setPlayerData(seedData);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData)); } catch {}
    return;
  }

  // Fall back to localStorage cache (reconnect scenario)
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) setPlayerData(JSON.parse(cached));
  } catch {}
}, [STORAGE_KEY]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      hasJoinedRef.current = false;
      joinOrRecover();
    };

    const onDisconnect = (reason: string) => {
      log('disconnect', reason);
      hasJoinedRef.current = false;
    };

    const handlePlayerListUpdated = ({ players }: { players: ServerPlayer[] }) => {
      setAllPlayers(players);
      const me = players.find((p) => p.id === playerId);
      if (me) setPlayerData(me);
    };

    const handleRoomState = (data: RoomStatePayload) => {
      setRoomState((prev) => ({ ...prev, ...data }));
      if (phaseShouldRedirect(data.phase)) {
        navigate(`/quiz/play/${roomId}/${playerId}`);
      }
    };

    const handleQuizLaunched = () => {
      navigate(`/quiz/play/${roomId}/${playerId}`);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('player_list_updated', handlePlayerListUpdated);
    socket.on('room_state', handleRoomState);
    socket.on('quiz_launched', handleQuizLaunched);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('player_list_updated', handlePlayerListUpdated);
      socket.off('room_state', handleRoomState);
      socket.off('quiz_launched', handleQuizLaunched);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, roomId, playerId, playerData]);

  // One-shot join
  useEffect(() => {
    if (!socket || !connected || !roomId || !playerId) return;
    hasJoinedRef.current = false;
    joinOrRecover();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, roomId, playerId]);

  // Loading
  if (!config ) {
    return (
      <div className="p-4 text-center sm:p-6">
        <div className="mb-4 animate-spin text-3xl sm:text-4xl">⏳</div>
        <div className="heading-2">
          {!config ? 'Loading quiz configuration...' : 'Loading player data...'}
        </div>
      </div>
    );
  }

  const isPaid = !!playerData?.paid;
  const isDQ = !!playerData?.disqualified;

  // Shared “glass” look for all inner cards (inside gradient)
  const glassCard = 'rounded-2xl border border-white/20 bg-white/10 backdrop-blur-sm';
  const headerRow = 'flex w-full items-center justify-between gap-3';
  const pill = 'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold';

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      {/* One unified launched-phase gradient surface */}
      <div className="relative overflow-hidden rounded-3xl border bg-white shadow-sm">
        {/* ✅ Match LaunchedPhase gradient exactly */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700" />

        {/* Animated blobs (same vibe as LaunchedPhase) */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white animate-pulse" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white animate-pulse delay-1000" />
        </div>

        <div className="relative space-y-4 p-4 sm:space-y-5 sm:p-6">
          {/* HERO (no “Up next”, no round description) */}
          <div className="rounded-2xl bg-white/10 p-5 backdrop-blur-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-white/80">LOBBY</div>
                <div className="mt-1 text-3xl font-extrabold text-white sm:text-4xl">
                  Waiting for the host…
                </div>
                <div className="mt-2 text-sm text-white/80">
                  The game will begin when the host presses <span className="font-semibold text-white">Start</span>.
                </div>
              </div>

              <div className="flex flex-wrap gap-2 sm:justify-end">
                <span className={`${pill} bg-white/20 text-white`}>
                  <Users className="h-4 w-4" />
                  {Number(totalPlayers)} players
                </span>

                <span className={`${pill} ${isPaid ? 'bg-emerald-500/30 text-white' : 'bg-amber-500/30 text-white'}`}>
                  {isPaid ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  {isPaid ? 'Paid' : 'Payment pending'}
                </span>

                <span className={`${pill} bg-white/20 text-white`}>
                  <Play className="h-4 w-4" />
                  Ready
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-white/10 p-4 text-white/90">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                <span className="text-sm font-semibold">
                  Hang tight — the host will start the round any moment.
                </span>
              </div>

              <div className="mt-1 text-xs text-white/75">
                You’re signed in as{' '}
                <span className="font-semibold text-white">{playerData?.name || 'Player'}</span>
                {totalRounds ? <span className="text-white/60"> · {totalRounds} rounds total</span> : null}
              </div>
            </div>
          </div>

          {/* Alerts INSIDE gradient */}
          {!isPaid && (
            <div className={`${glassCard} p-4`}>
              <div className="flex items-start gap-2 text-white">
                <AlertCircle className="mt-0.5 h-5 w-5 text-amber-200" />
                <div>
                  <div className="text-sm font-extrabold">Payment required</div>
                  <div className="text-sm text-white/80">
                    Please complete payment with the organizer to participate.
                  </div>
                </div>
              </div>
            </div>
          )}

          {isDQ && (
            <div className={`${glassCard} p-4`}>
              <div className="flex items-start gap-2 text-white">
                <AlertCircle className="mt-0.5 h-5 w-5 text-rose-200" />
                <div>
                  <div className="text-sm font-extrabold">You have been disqualified</div>
                  <div className="text-sm text-white/80">
                    If you think this is a mistake, contact the host.
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className={`${glassCard} p-4`}>
            <div className="flex items-start gap-2 text-white">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-white/80" />
              <div className="text-sm font-semibold text-white/90">
                No cheating — unfair play may lead to disqualification.
              </div>
            </div>
          </div>

          {/* Arsenal */}
          {playerExtras.length > 0 && (
            <div className={`${glassCard} p-4`}>
              <button onClick={() => setShowArsenal((s) => !s)} className={headerRow}>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/10 p-2">
                    <Zap className="h-5 w-5 text-white/90" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-extrabold text-white">Your Arsenal</div>
                    <div className="text-xs text-white/70">{playerExtras.length} extras available</div>
                  </div>
                </div>

                {showArsenal ? (
                  <ChevronUp className="h-5 w-5 text-white/80" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-white/80" />
                )}
              </button>

              {showArsenal && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {playerExtras.map((extraId, idx) => {
                    const extra = getExtraInfo(extraId);
                    return (
                      <div key={`${extraId}-${idx}`} className="rounded-2xl bg-white/10 p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{extra.icon}</div>
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-white">{extra.label}</div>
                            <div className="text-xs text-white/70">{extra.description}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Round Overview */}
          <div className={`${glassCard} p-4`}>
            <button onClick={() => setShowRounds((s) => !s)} className={headerRow}>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-white/10 p-2">
                  <Play className="h-5 w-5 text-white/90" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-extrabold text-white">Round Overview</div>
                  <div className="text-xs text-white/70">{roundDefinitions.length} rounds total</div>
                </div>
              </div>

              {showRounds ? (
                <ChevronUp className="h-5 w-5 text-white/80" />
              ) : (
                <ChevronDown className="h-5 w-5 text-white/80" />
              )}
            </button>

            {showRounds && roundDefinitions.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {roundDefinitions.map((round, index) => {
                  const typeId = (round.roundType ?? 'general_trivia') as RoundTypeId;

                  // roundTypeDefinitions in your codebase likely has extra fields like icon,
                  // so we treat it loosely while still using the typed RoundTypeId keys.
                  const meta = (roundTypeDefinitions as Record<RoundTypeId, any>)[typeId];

                  const roundNumber = Number(round.roundNumber ?? index + 1);
                  const name = meta?.name ?? 'Round';
                  const icon = meta?.icon ?? '🎯';

                  // ✅ TS FIX: RoundTypeDefinition has no "category"
                  const category = round.category ?? 'Category';

                  const difficulty = (round.difficulty ?? 'mixed').toString();
                  const difficultyPill =
                    difficulty === 'easy'
                      ? 'bg-emerald-500/30 text-white'
                      : difficulty === 'medium'
                      ? 'bg-amber-500/30 text-white'
                      : difficulty === 'hard'
                      ? 'bg-rose-500/30 text-white'
                      : 'bg-white/20 text-white';

                  return (
                    <div
                      key={`${roundNumber}-${index}`}
                      className={`rounded-2xl bg-white/10 p-4 ${
                        roundNumber === currentRound ? 'ring-2 ring-white/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-white/70">Round {roundNumber}</div>

                          <div className="mt-1 truncate text-sm font-extrabold text-white">
                            {icon} {name}
                          </div>

                          <div className="mt-1 truncate text-xs text-white/70">{category}</div>
                        </div>

                        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${difficultyPill}`}>
                          {difficulty.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Prizes */}
          {prizes.length > 0 && (
            <div className={`${glassCard} p-4`}>
              <button onClick={() => setShowPrizes((s) => !s)} className={headerRow}>
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-white/10 p-2">
                    <Trophy className="h-5 w-5 text-white/90" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-extrabold text-white">Prizes</div>
                    <div className="text-xs text-white/70">{prizes.length} prizes available</div>
                  </div>
                </div>

                {showPrizes ? (
                  <ChevronUp className="h-5 w-5 text-white/80" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-white/80" />
                )}
              </button>

              {showPrizes && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {prizes.map((prize, idx) => (
                    <div key={idx} className="rounded-2xl bg-white/10 p-4 text-center">
                      <div className="text-2xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</div>
                      <div className="mt-2 text-sm font-extrabold text-white">
                        {typeof prize.place === 'number' ? `${prize.place} place` : 'Prize'}
                      </div>
                      <div className="mt-1 text-xs text-white/70">{prize.description}</div>

                      {/* Use token value if you have it, fallback to legacy value */}
                      {typeof prize.value === 'number' ? (
                        <div className="mt-2 text-sm font-extrabold text-white">
                          {currencySymbol}{prize.value}
                        </div>
                      ) : null}

                      {prize.sponsor ? (
                        <div className="mt-2 text-xs text-white/60">🎗️ Thanks to {prize.sponsor}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





