// src/services/web3PublicEventsService.ts
//
// All HTTP calls for fundraisely_web3_public_events.
// Extends BaseService — overrides auth headers to use the wallet session
// token (x-wallet-session) instead of the web2 JWT (Authorization: Bearer).
//
// Mirrors the pattern in web3FundraiserApi.ts.

import BaseService from '../components/mgtsystem/services/BaseService';

const SESSION_KEY = 'web3_fundraiser_session';

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventType    = 'quiz' | 'elimination';
export type ContactType  = 'telegram' | 'x' | 'discord' | 'whatsapp' | 'email' | 'other';
export type EventStatus  = 'draft' | 'published' | 'live' | 'ended';
export type Chain        = 'solana' | 'base';

export interface PublicEvent {
  id:              string;
  wallet_address:  string;
  host_name:       string;
  title:           string;
  event_type:      EventType;
  description:     string | null;
  event_date:      string;       // YYYY-MM-DD
  start_time:      string;       // HH:MM:SS
  time_zone:       string;       // IANA e.g. "Europe/Dublin"
  join_url:        string;
  platform:        string | null;
  contact_handle:  string;
  contact_type:    ContactType;
  chain:           Chain;
  entry_fee:       string;       // decimal string from DB
  fee_token:       string;
  charity_id:      number;
  charity_name:    string;
  status:          EventStatus;
  published_at:    string | null;
  created_at:      string;
  updated_at:      string;
}

export interface CreateEventPayload {
  host_name:       string;
  title:           string;
  event_type:      EventType;
  description?:    string;
  event_date:      string;
  start_time:      string;
  time_zone:       string;
  join_url:        string;
  contact_handle:  string;
  contact_type:    ContactType;
  chain:           Chain;
  entry_fee:       number;
  fee_token:       string;
  charity_id:      number;
  charity_name:    string;
}

export type UpdateEventPayload = Partial<CreateEventPayload>;

export interface PublicEventsListResponse {
  success: boolean;
  events:  PublicEvent[];
  total:   number;
  limit:   number;
  offset:  number;
}

export interface SingleEventResponse {
  success: boolean;
  event:   PublicEvent;
}

export interface MyEventsResponse {
  success: boolean;
  events:  PublicEvent[];
}

// ─── Service class ────────────────────────────────────────────────────────────

class Web3PublicEventsService extends BaseService {

  // Wallet session headers — same pattern as web3FundraiserApi.ts
  private walletHeaders(): Record<string, string> {
    const token = sessionStorage.getItem(SESSION_KEY);
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Wallet-Session': token } : {}),
    };
  }

  // ── Public (no auth) ────────────────────────────────────────────────────────

  async getPublicEvents(params?: {
    type?:   EventType;
    chain?:  Chain;
    limit?:  number;
    offset?: number;
  }): Promise<PublicEventsListResponse> {
    const qs = new URLSearchParams();
    if (params?.type)   qs.set('type',   params.type);
    if (params?.chain)  qs.set('chain',  params.chain);
    if (params?.limit)  qs.set('limit',  String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.request<PublicEventsListResponse>(`/web3/public-events${query}`);
  }

  async getEventById(id: string): Promise<SingleEventResponse> {
    return this.request<SingleEventResponse>(`/web3/public-events/${id}`);
  }

  // ── Protected (wallet session required) ─────────────────────────────────────

  async getMyEvents(): Promise<MyEventsResponse> {
    return this.request<MyEventsResponse>('/web3/public-events/host/mine', {
      headers: this.walletHeaders(),
    });
  }

  async createEvent(payload: CreateEventPayload): Promise<SingleEventResponse> {
    return this.request<SingleEventResponse>('/web3/public-events', {
      method:  'POST',
      headers: this.walletHeaders(),
      body:    JSON.stringify(payload),
    });
  }

  async updateEvent(id: string, payload: UpdateEventPayload): Promise<SingleEventResponse> {
    return this.request<SingleEventResponse>(`/web3/public-events/${id}`, {
      method:  'PATCH',
      headers: this.walletHeaders(),
      body:    JSON.stringify(payload),
    });
  }

  async publishEvent(id: string): Promise<SingleEventResponse> {
    return this.request<SingleEventResponse>(`/web3/public-events/${id}/publish`, {
      method:  'PATCH',
      headers: this.walletHeaders(),
    });
  }

  async unpublishEvent(id: string): Promise<SingleEventResponse> {
    return this.request<SingleEventResponse>(`/web3/public-events/${id}/unpublish`, {
      method:  'PATCH',
      headers: this.walletHeaders(),
    });
  }

  async setStatus(id: string, status: 'live' | 'ended'): Promise<SingleEventResponse> {
    return this.request<SingleEventResponse>(`/web3/public-events/${id}/status`, {
      method:  'PATCH',
      headers: this.walletHeaders(),
      body:    JSON.stringify({ status }),
    });
  }

  async deleteEvent(id: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/web3/public-events/${id}`, {
      method:  'DELETE',
      headers: this.walletHeaders(),
    });
  }
}

// ─── Singleton + named exports (matches web3FundraiserApi.ts pattern) ─────────

const web3PublicEventsService = new Web3PublicEventsService();

export const getPublicEvents  = (p?: Parameters<typeof web3PublicEventsService.getPublicEvents>[0]) =>
  web3PublicEventsService.getPublicEvents(p);

export const getEventById     = (id: string) =>
  web3PublicEventsService.getEventById(id);

export const getMyEvents      = () =>
  web3PublicEventsService.getMyEvents();

export const createEvent      = (payload: CreateEventPayload) =>
  web3PublicEventsService.createEvent(payload);

export const updateEvent      = (id: string, payload: UpdateEventPayload) =>
  web3PublicEventsService.updateEvent(id, payload);

export const publishEvent     = (id: string) =>
  web3PublicEventsService.publishEvent(id);

export const unpublishEvent   = (id: string) =>
  web3PublicEventsService.unpublishEvent(id);

export const setEventStatus   = (id: string, status: 'live' | 'ended') =>
  web3PublicEventsService.setStatus(id, status);

export const deleteEvent      = (id: string) =>
  web3PublicEventsService.deleteEvent(id);

export default web3PublicEventsService;