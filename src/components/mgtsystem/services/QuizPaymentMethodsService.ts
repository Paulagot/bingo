// src/components/mgtsystem/services/QuizPaymentMethodsService.ts

import BaseService from './BaseService';

export type PaymentMethod = {
  id: number;
  club_id: string;
  method_category: 'instant_payment' | 'card' | 'stripe' | 'crypto' | 'other';
  provider_name: string;
  method_label: string;
  display_order: number;
  is_enabled: boolean;
  player_instructions?: string;
  method_config?: any;
  is_official_club_account?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type LinkedPaymentMethodsData = {
  payment_method_ids: number[];
  updated_at?: string;
  updated_by?: string;
};

export type QuizPaymentMethodsResponse = {
  available_methods: PaymentMethod[];
  linked_method_ids: number[];
  total_available: number;
};



class QuizPaymentMethodsService extends BaseService {
  /**
   * Get all available payment methods for the club
   * GET /api/club-payment-methods
   */
  listAvailablePaymentMethods() {
    return this.request<{ payment_methods: PaymentMethod[]; total: number }>(
      `/club-payment-methods`,
      { method: 'GET' }
    );
  }

  /**
   * Get linked payment methods for a specific quiz room
   * Also returns all available payment methods for the modal
   * GET /api/quiz-rooms/:roomId/payment-methods
   */
async getPublicPaymentMethods(roomId: string): Promise<QuizPaymentMethodsResponse> {
  const url = `${this.baseURL}/payment-methods/room/${roomId}/public`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.ok) throw new Error(data.error || 'Failed to load payment methods');

  return {
    available_methods: data.paymentMethods.map((m: any) => ({
      id: m.id,
      club_id: m.clubId,
      method_category: m.methodCategory,
      provider_name: m.providerName,
      method_label: m.methodLabel,
      display_order: m.displayOrder,
      is_enabled: m.isEnabled,
      player_instructions: m.playerInstructions,
      method_config: m.methodConfig,
      is_official_club_account: m.isOfficialClubAccount,
    })),
    linked_method_ids: data.paymentMethods.map((m: any) => Number(m.id)),
    total_available: data.paymentMethods.length,
  };
}

getQuizPaymentMethods(roomId: string) {
  if (!this.isAuthenticated()) {
    return this.getPublicPaymentMethods(roomId);
  }
  return this.request<QuizPaymentMethodsResponse>(
    `/quiz-rooms/${roomId}/payment-methods`,
    { method: 'GET' }
  );
}

  /**
   * Update linked payment methods for a quiz room
   * POST /api/quiz-rooms/:roomId/payment-methods
   */
  updateLinkedPaymentMethods(
    roomId: string,
    paymentMethodIds: number[]
  ) {
    return this.request<{ 
      message: string; 
      linked_payment_methods: LinkedPaymentMethodsData;
    }>(
      `/quiz-rooms/${roomId}/payment-methods`,
      { 
        method: 'POST', 
        body: JSON.stringify({ payment_method_ids: paymentMethodIds }) 
      }
    );
  }

  /**
   * Helper: Check if a payment method is linked to a quiz
   */
  isPaymentMethodLinked(linkedIds: number[], methodId: number): boolean {
    return linkedIds.includes(methodId);
  }

  /**
   * Helper: Format payment method display name
   */
  formatPaymentMethodDisplay(method: PaymentMethod): string {
    return `${method.method_category.toUpperCase()} - ${method.method_label}`;
  }

  
}

export const quizPaymentMethodsService = new QuizPaymentMethodsService();