// src/components/mgtsystem/services/PaymentMethodsService.ts
import BaseService from './BaseService';

import type {
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
  ReorderPaymentMethodsRequest,
  ClubPaymentMethodWithMeta
} from '../../../shared/types/paymentMethods';

interface GetPaymentMethodsResponse {
  ok: boolean;
  paymentMethods: ClubPaymentMethodWithMeta[];
}

interface GetPaymentMethodResponse {
  ok: boolean;
  paymentMethod: ClubPaymentMethodWithMeta;
}

interface MessageResponse {
  ok: boolean;
  message: string;
}

class PaymentMethodsService extends BaseService {
  /**
   * Get all payment methods for management (authenticated)
   */
  getAllForManagement(clubId: string) {
    return this.request<GetPaymentMethodsResponse>(
      `/payment-methods/${clubId}/manage`
    );
  }

  /**
   * Get enabled payment methods (public - for players)
   */
  getEnabled(clubId: string) {
    return this.request<GetPaymentMethodsResponse>(
      `/payment-methods/${clubId}`
    );
  }

  /**
   * Create new payment method
   */
  create(clubId: string, data: CreatePaymentMethodRequest) {
    return this.request<GetPaymentMethodResponse>(
      `/payment-methods/${clubId}`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Update existing payment method
   */
  update(clubId: string, methodId: number, data: UpdatePaymentMethodRequest) {
    return this.request<GetPaymentMethodResponse>(
      `/payment-methods/${clubId}/${methodId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    );
  }

  /**
   * Delete payment method
   */
  delete(clubId: string, methodId: number) {
    return this.request<MessageResponse>(
      `/payment-methods/${clubId}/${methodId}`,
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Reorder payment methods
   */
  reorder(clubId: string, orders: ReorderPaymentMethodsRequest['orders']) {
    return this.request<MessageResponse>(
      `/payment-methods/${clubId}/reorder`,
      {
        method: 'PATCH',
        body: JSON.stringify({ orders }),
      }
    );
  }
}

export default new PaymentMethodsService();