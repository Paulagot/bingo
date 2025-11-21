// src/shared/api/index.ts
// Barrel export for API modules

export * from './client';
export * from './auth.api';
export * from './quiz.api';
export * from './room.api';

// Re-export types that are used by API
export type { RegisterClubRequest, LoginRequest, LoginResponse, GetCurrentUserResponse } from './auth.api';
export type { CreateRoomRequest, CreateRoomResponse, CreateWeb3RoomResponse } from './room.api';

// Re-export default client instance
export { apiClient } from './client';

