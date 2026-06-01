// src/components/Quiz/tickets/gameTypeMeta.ts
//
// Centralises all game-type-specific copy and URL patterns for the ticket UI.
// Import this in TicketPurchaseFlow, TicketConfirmation, and TicketStatusChecker
// instead of scattering if/else checks through every component.

export type GameType = 'quiz' | 'elimination';

export interface GameTypeMeta {
  label: string;           // 'Quiz Night' | 'Elimination Game'
  emoji: string;           // for headers
  ticketNoun: string;      // 'quiz ticket' | 'elimination ticket'
  eventNoun: string;       // 'quiz' | 'game'
  eventNounCap: string;    // 'Quiz' | 'Game'
  joinLabel: string;       // 'Join Quiz Now' | 'Join Game Now'
  buyingLabel: string;     // 'Buying a ticket for' subtitle
  completedLabel: string;  // 'this quiz is completed' text
  joinPath: (roomId: string, joinToken: string) => string;
}

const META: Record<GameType, GameTypeMeta> = {
  quiz: {
    label: 'Quiz Night',
    emoji: '🎟️',
    ticketNoun: 'quiz ticket',
    eventNoun: 'quiz',
    eventNounCap: 'Quiz',
    joinLabel: 'Join Quiz Now',
    buyingLabel: "quiz",
    completedLabel: 'quiz',
    joinPath: (roomId, joinToken) =>
      `/quiz/join/${roomId}?ticket=${joinToken}`,
  },
  elimination: {
    label: 'Elimination Game',
    emoji: '🏆',
    ticketNoun: 'elimination ticket',
    eventNoun: 'game',
    eventNounCap: 'Game',
    joinLabel: 'Join Game Now',
    buyingLabel: "elimination game",
    completedLabel: 'elimination game',
    joinPath: (roomId, joinToken) =>
      `/elimination/join/${roomId}?ticket=${joinToken}`,
  },
};

export function getGameTypeMeta(gameType?: string | null): GameTypeMeta {
  if (gameType === 'elimination') return META.elimination;
  return META.quiz; // default — safe for existing quiz tickets with no gameType field
}