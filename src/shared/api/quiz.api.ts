// src/shared/api/quiz.api.ts
// Quiz API endpoints

import { apiClient } from './client';
import type { Entitlements } from '../types';

/**
 * Game scopes — matches the scope values used in plan_entitlements on the server.
 * Add new game types here as they are added to the platform.
 */
export type GameScope = 'quiz' | 'elimination';

/**
 * WEB2 room listing/status types
 */
export type Web2QuizRoomStatus = 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled';

export interface Prize {
  place: number;
  value: number;
  description?: string;
}

export interface RoomCaps {
  maxPlayers: number;
  maxRounds: number;
  extrasAllowed: string[];
  roundTypesAllowed?: string[];
  concurrentRooms?: number;
  planCode?: string;
}

export interface RoundDefinition {
  config: {
    timePerQuestion: number;
    questionsPerRound: number;
    pointsPerDifficulty?: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
  category: string;
  roundType: string;
  difficulty: string;
  roundNumber: number;
  enabledExtras?: Record<string, unknown>;
}

export interface ParsedConfig {
  prizes?: Prize[];
  entryFee?: string;
  hostName?: string;
  roomCaps?: RoomCaps;
  timeZone?: string;
  prizeMode?: string;
  isCustomQuiz?: boolean;
  eventDateTime?: string;
  paymentMethod?: string;
  currencySymbol?: string;
  roundDefinitions?: RoundDefinition[];
  selectedTemplate?: string;
  skipRoundConfiguration?: boolean;
  fundraisingOptions?: Record<string, boolean>;
  fundraisingPrices?: Record<string, number>;
}

export type Web2RoomListItem = {
  room_id: string;
  host_id: string;
  game_type?: 'quiz' | 'elimination';
  status: string;
  scheduled_at: string | null;
  time_zone: string | null;
  config_json?: string | ParsedConfig | null;
  room_caps_json?: string | RoomCaps | null;
  prize_description?: string | null;
  prize_value?: number | null;
  created_at: string;
  updated_at: string;
  ended_at?: string | null;
  participants_count?: number;
};

export type GetWeb2RoomsListResponse = {
  rooms: Web2RoomListItem[];
};

export type GetWeb2QuizRoomResponse = {
  roomId: string;
  hostId: string;
  clubId: string;
  status: Web2QuizRoomStatus;
  scheduledAt: string | null;
  timeZone: string | null;
  roomCaps: Record<string, unknown> | null;
  config: ParsedConfig | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateWeb2RoomPatch = Partial<{
  scheduled_at: string | null;
  time_zone: string | null;
  config_json: ParsedConfig | string | null;
  room_caps_json: RoomCaps | string | null;
}>;

export const quizApi = {
  /**
   * Get entitlements for the logged-in club.
   *
   * @param scope - Which game type to fetch caps for (default: 'quiz').
   *               Pass 'elimination' for elimination-specific caps and credits.
   *               The server returns the same v1-compatible shape regardless of scope.
   *
   * @example
   *   quizApi.getEntitlements()              // quiz scope (default)
   *   quizApi.getEntitlements('elimination') // elimination scope
   */
async getEntitlements(scope: 'quiz' | 'elimination' = 'quiz'): Promise<Entitlements> {
    return apiClient.get<Entitlements>(`/quiz/api/me/entitlements?scope=${scope}`);
  },

  /**
   * WEB2: Load saved launched room config from DB
   */
  async getWeb2Room(roomId: string): Promise<GetWeb2QuizRoomResponse> {
    if (!roomId) throw new Error('roomId_required');
    return apiClient.get<GetWeb2QuizRoomResponse>(
      `/quiz/api/web2/rooms/${encodeURIComponent(roomId)}`
    );
  },

  /**
   * WEB2: List rooms for the logged-in club
   */
  async getWeb2RoomsList(params?: {
    status?: Web2QuizRoomStatus | 'all';
    time?: 'upcoming' | 'past' | 'all';
  }) {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.time) sp.set('time', params.time);
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return apiClient.get<GetWeb2RoomsListResponse>(`/quiz/api/web2/rooms${qs}`);
  },

  /**
   * WEB2: Update a scheduled room (PATCH)
   */
  async updateWeb2Room(roomId: string, patch: UpdateWeb2RoomPatch) {
    if (!roomId) throw new Error('roomId_required');
    return apiClient.patch<{ room: Web2RoomListItem }>(
      `/quiz/api/web2/rooms/${encodeURIComponent(roomId)}`,
      patch
    );
  },

  /**
   * WEB2: Cancel a scheduled room
   */
  async cancelWeb2Room(roomId: string) {
    if (!roomId) throw new Error('roomId_required');
    return apiClient.post<{ ok: true }>(
      `/quiz/api/web2/rooms/${encodeURIComponent(roomId)}/cancel`,
      {}
    );
  },
};




