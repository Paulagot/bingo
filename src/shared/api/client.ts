// src/shared/api/client.ts
// Base HTTP client with interceptors and error handling

function stripTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

export interface ApiClientConfig {
  baseURL?: string;
  managementBaseURL?: string;
  debug?: boolean;
  getAuthToken?: () => string | null;
}

export class ApiError extends Error {
  status?: number;
  statusText?: string;
  data?: unknown;

  constructor(message: string, status?: number, statusText?: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

export class ApiClient {
  private readonly baseURL: string;
  private readonly managementBaseURL: string;
  private readonly debug: boolean;
  private readonly getAuthToken: () => string | null;

  constructor(config: ApiClientConfig = {}) {
    this.baseURL = config.baseURL || stripTrailingSlash(import.meta.env.VITE_QUIZ_API_URL?.trim() || '');
    this.managementBaseURL =
      config.managementBaseURL ||
      import.meta.env.VITE_MGMT_API_URL ||
      'https://mgtsystem-production.up.railway.app/api';
    this.debug = config.debug ?? false;
    this.getAuthToken = config.getAuthToken || (() => localStorage.getItem('auth_token'));
  }

  private getAuthHeaders(): Record<string, string> {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useManagementAPI = false
  ): Promise<T> {
    const baseURL = useManagementAPI ? this.managementBaseURL : this.baseURL;
    const url = baseURL ? `${baseURL}${endpoint}` : endpoint;

    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    if (this.debug) {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
      console.log(`   Using: ${useManagementAPI ? 'Management API' : 'Quiz API'}`);
      console.log(`   Base URL: ${baseURL}`);
    }

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          (errorData as { error?: string; message?: string }).error ||
          (errorData as { error?: string; message?: string }).message ||
          `HTTP error! status: ${response.status}`;

        if (this.debug) {
          console.error(`💥 API Error (${endpoint}):`, {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            url,
            response: errorData,
          });
        }

        throw new ApiError(errorMessage, response.status, response.statusText, errorData);
      }

      return await response.json();
    } catch (error) {
      if (this.debug) {
        console.error(`💥 API Error (${endpoint}):`, error);
      }

      if (error instanceof ApiError) {
        throw error;
      }

      throw new ApiError(
        error instanceof Error ? error.message : 'Unknown error occurred',
        undefined,
        undefined,
        error
      );
    }
  }

  async get<T>(endpoint: string, useManagementAPI = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' }, useManagementAPI);
  }

  async post<T>(endpoint: string, data?: unknown, useManagementAPI = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
      },
      useManagementAPI
    );
  }

  async put<T>(endpoint: string, data?: unknown, useManagementAPI = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
      },
      useManagementAPI
    );
  }

  async delete<T>(endpoint: string, useManagementAPI = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' }, useManagementAPI);
  }

  async patch<T>(endpoint: string, data?: unknown, useManagementAPI = false): Promise<T> {
    return this.request<T>(
      endpoint,
      {
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
      },
      useManagementAPI
    );
  }
}

// Default client instance
export const apiClient = new ApiClient({
  debug: false,
});

