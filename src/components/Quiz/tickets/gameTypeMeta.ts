// src/components/Quiz/tickets/gameTypeMeta.ts
//
// Centralises all game-type-specific copy and URL patterns for the ticket UI.
// Import this in TicketPurchaseFlow, TicketConfirmation, and TicketStatusChecker
// instead of scattering if/else checks through every component.



export type GameType = 'quiz' | 'elimination' | 'ticketed_event';
 
export interface GameTypeMeta {
  label: string;           // 'Quiz Night' | 'Elimination Game' | 'Ticketed Event'
  emoji: string;
  ticketNoun: string;      // 'quiz ticket' | 'elimination ticket' | 'ticket'
  eventNoun: string;       // 'quiz' | 'game' | 'event'
  eventNounCap: string;    // 'Quiz' | 'Game' | 'Event'
  joinLabel: string;       // button label when canJoinNow
  buyingLabel: string;     // subtitle copy on purchase page
  completedLabel: string;
  // Returns the URL for the primary action button on the status page.
  // For ticketed events this is null — there is no game to join.
  joinPath: ((roomId: string, joinToken: string) => string) | null;
  // Whether this game type has a live join flow at all
  hasJoinFlow: boolean;
}
 
const META: Record<GameType, GameTypeMeta> = {
  quiz: {
    label:          'Quiz Night',
    emoji:          '🎟️',
    ticketNoun:     'quiz ticket',
    eventNoun:      'quiz',
    eventNounCap:   'Quiz',
    joinLabel:      'Join Quiz Now',
    buyingLabel:    'quiz',
    completedLabel: 'quiz',
    hasJoinFlow:    true,
    joinPath: (roomId, joinToken) =>
      `/quiz/join/${roomId}?ticket=${joinToken}`,
  },
  elimination: {
    label:          'Elimination Game',
    emoji:          '🏆',
    ticketNoun:     'elimination ticket',
    eventNoun:      'game',
    eventNounCap:   'Game',
    joinLabel:      'Join Game Now',
    buyingLabel:    'elimination game',
    completedLabel: 'elimination game',
    hasJoinFlow:    true,
    joinPath: (roomId, joinToken) =>
      `/elimination/join/${roomId}?ticket=${joinToken}`,
  },
  ticketed_event: {
    label:          'Ticketed Event',
    emoji:          '🎫',
    ticketNoun:     'ticket',
    eventNoun:      'event',
    eventNounCap:   'Event',
    joinLabel:      'View Ticket',      // not shown — hasJoinFlow: false
    buyingLabel:    'event',
    completedLabel: 'event',
    hasJoinFlow:    false,              // no live game join — host scans QR at door
    joinPath:       null,
  },
};
 
export function getGameTypeMeta(gameType?: string | null): GameTypeMeta {
  if (gameType === 'elimination')    return META.elimination;
  if (gameType === 'ticketed_event') return META.ticketed_event;
  return META.quiz; // default — safe for existing tickets with no gameType field
}