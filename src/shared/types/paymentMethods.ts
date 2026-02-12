// src/shared/types/paymentMethods.ts

import type {
  ClubPaymentMethod,
  PaymentMethodCategory,
  PaymentMethodConfig,
  InstantPaymentProvider,
} from './payment';

/**
 * DB/meta fields returned by management endpoints
 * Matches server/mgtsystem/services/paymentMethodsService.js mapping.
 */
export interface ClubPaymentMethodWithMeta extends ClubPaymentMethod {
  addedBy?: string | null;
  editedBy?: string | null;
  isOfficialClubAccount?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Form payload used by PaymentMethodForm.tsx
 * (Matches your route body in POST/PUT)
 */
export interface PaymentMethodFormData {
  methodCategory: PaymentMethodCategory;
  providerName: InstantPaymentProvider | string | null;
  methodLabel: string;
  playerInstructions: string;
  methodConfig: PaymentMethodConfig | Record<string, any>;
  isEnabled: boolean;
  displayOrder: number;
  isOfficialClubAccount: boolean;
}

/**
 * Request type for creating a payment method
 */
export interface CreatePaymentMethodRequest {
  method_category: PaymentMethodCategory;
  provider_name?: InstantPaymentProvider | string;
  method_label: string;
  player_instructions?: string;
  method_config?: PaymentMethodConfig | Record<string, any>;
  is_enabled?: boolean;
  display_order?: number;
  is_official_club_account?: boolean;
}

/**
 * Request type for updating a payment method
 */
export interface UpdatePaymentMethodRequest {
  method_category?: PaymentMethodCategory;
  provider_name?: InstantPaymentProvider | string;
  method_label?: string;
  player_instructions?: string;
  method_config?: PaymentMethodConfig | Record<string, any>;
  is_enabled?: boolean;
  display_order?: number;
  is_official_club_account?: boolean;
}

/**
 * Request type for reordering payment methods
 */
export interface ReorderPaymentMethodsRequest {
  orders: Array<{ id: string; display_order: number }>;
}
