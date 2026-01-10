// src/shared/api/quiz.api.ts
// Quiz API endpoints

import { apiClient } from './client';
import type { Entitlements } from '../types';

/**
 * WEB2 room listing/status types
 */
export type Web2QuizRoomStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';

export type Web2RoomListItem = {
  room_id: string;
  host_id: string;
  club_id?: string; // backend may include it later; safe optional
  status: Web2QuizRoomStatus;
  scheduled_at: string | null; // MySQL DATETIME (string)
  time_zone: string | null;
  created_at: string;
  updated_at: string;
};

export type GetWeb2RoomsListResponse = {
  rooms: Web2RoomListItem[];
};

/**
 * WEB2 single room response (from DB)
 * NOTE: If you want strong typing for config, replace `any` with your QuizConfig type import.
 */
export type GetWeb2QuizRoomResponse = {
  roomId: string;
  hostId: string;
  clubId: string;
  status: Web2QuizRoomStatus;
  scheduledAt: string | null;
  timeZone: string | null;
  roomCaps: Record<string, unknown> | null;
  config: any; // <-- replace with QuizConfig once you confirm the import path
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



