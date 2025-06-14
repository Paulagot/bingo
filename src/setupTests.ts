// src/setupTests.ts
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Only mock socket.io-client for unit tests, not integration tests
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(), 
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    connected: true,
    id: 'mock-socket-id'
  }))
}));



