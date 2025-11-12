// src/shared/api/quiz.api.ts
// Quiz API endpoints

import { apiClient } from './client';
import type { Entitlements } from '../types';

export const quizApi = {
  /**
   * Get user entitlements
   */
  async getEntitlements(): Promise<Entitlements> {
    return apiClient.get<Entitlements>('/quiz/api/me/entitlements');
  },
};

