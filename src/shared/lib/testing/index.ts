// src/shared/lib/testing/index.ts
// Test utilities

/**
 * Creates a mock API response
 */
export function createMockResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    statusText: status === 200 ? 'OK' : 'Error',
  } as Response;
}

/**
 * Creates a mock fetch function
 */
export function createMockFetch(responses: Map<string, Response>): typeof fetch {
  return async (input: RequestInfo | URL, _init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString();
    const response = responses.get(url);
    if (!response) {
      throw new Error(`No mock response for ${url}`);
    }
    return response;
  };
}

/**
 * Waits for a specified amount of time (useful for testing async operations)
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a mock user
 */
export function createMockUser(overrides?: Partial<import('@shared/types').User>): import('@shared/types').User {
  return {
    id: 'user-1',
    club_id: 'club-1',
    name: 'Test User',
    email: 'test@example.com',
    role: 'user',
    ...overrides,
  };
}

/**
 * Creates a mock club
 */
export function createMockClub(overrides?: Partial<import('@shared/types').Club>): import('@shared/types').Club {
  return {
    id: 'club-1',
    name: 'Test Club',
    email: 'club@example.com',
    ...overrides,
  };
}

