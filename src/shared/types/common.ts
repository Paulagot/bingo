// src/shared/types/common.ts
// Common domain-agnostic types

/**
 * Branded type for entity IDs to prevent mixing different ID types
 */
export type Brand<T, B> = T & { __brand: B };

export type UserId = Brand<string, 'UserId'>;
export type RoomId = Brand<string, 'RoomId'>;
export type PlayerId = Brand<string, 'PlayerId'>;
export type GameId = Brand<string, 'GameId'>;
export type ClubId = Brand<string, 'ClubId'>;

/**
 * Generic entity with ID
 */
export interface Entity {
  id: string;
}

/**
 * Timestamp fields
 */
export interface Timestamps {
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

/**
 * Error response
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

