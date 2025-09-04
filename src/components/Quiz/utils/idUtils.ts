// src/utils/idUtils.ts
import { nanoid } from 'nanoid';

/**
 * Generate a room ID for quiz rooms
 * Uses the same pattern as backend for consistency
 */
export function generateRoomId(): string {
  return nanoid(10);
}

/**
 * Generate a host ID for quiz hosts
 * Uses the same pattern as backend for consistency
 */
export function generateHostId(): string {
  return nanoid();
}