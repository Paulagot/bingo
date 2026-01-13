// src/shared/api/quiz.api.ts
// Quiz API endpoints

import { apiClient } from './client';
import type { Entitlements } from '../types';

/**
 * WEB2 room listing/status types
 */
export type Web2QuizRoomStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

// ✅ Define these types here instead of in the component
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
  status: string;
  scheduled_at: string | null;
  time_zone: string | null;
  config_json?: string | ParsedConfig | null;  // ✅ Now properly typed
  room_caps_json?: string | RoomCaps | null;   // ✅ Now properly typed
  created_at: string;
  updated_at: string;
  ended_at?: string | null;
};

export type GetWeb2RoomsListResponse = {
  rooms: Web2RoomListItem[];
};

/**
 * WEB2 single room response (from DB)
 */
export type GetWeb2QuizRoomResponse = {
  roomId: string;
  hostId: string;
  clubId: string;
  status: Web2QuizRoomStatus;
  scheduledAt: string | null;
  timeZone: string | null;
  roomCaps: Record<string, unknown> | null;
  config: ParsedConfig | null; // ✅ Better typed now
  createdAt?: string;
  updatedAt?: string;
};

export const quizApi = {
  /**
   * Get user entitlements
   */
  async getEntitlements(): Promise<Entitlements> {
    return apiClient.get<Entitlements>('/quiz/api/me/entitlements');
  },

  /**
   * WEB2: Load saved launched room config from DB (used to hydrate Host Dashboard on refresh)
   */
  async getWeb2Room(roomId: string): Promise<GetWeb2QuizRoomResponse> {
    if (!roomId) throw new Error('roomId_required');
    return apiClient.get<GetWeb2QuizRoomResponse>(`/quiz/api/web2/rooms/${encodeURIComponent(roomId)}`);
  },

  /**
   * WEB2: List rooms for the logged-in club (server filters using req.club_id)
   * Query:
   *  - status: scheduled|live|completed|cancelled|all (default scheduled)
   *  - time: upcoming|past|all (default upcoming)
   */
  async getWeb2RoomsList(params?: { status?: Web2QuizRoomStatus | 'all'; time?: 'upcoming' | 'past' | 'all' }) {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.time) sp.set('time', params.time);

    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return apiClient.get<GetWeb2RoomsListResponse>(`/quiz/api/web2/rooms${qs}`);
  },
};



