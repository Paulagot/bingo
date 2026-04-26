// src/shared/types/paymentMethods.ts

import type {
  ClubPaymentMethod,
  PaymentMethodCategory,
  PaymentMethodConfig,
  PaymentProvider,
} from './payment';

/**
 * DB/meta fields returned by management endpoints.
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
 * Form payload used by PaymentMethodForm.tsx.
 *
 * This uses camelCase because your React form and management service currently
 * send camelCase to the backend route:
 *
 * methodCategory
 * providerName
 * methodLabel
 * playerInstructions
 * methodConfig
 */
export interface PaymentMethodFormData {
  methodCategory: PaymentMethodCategory;
  providerName: PaymentProvider | null;
  methodLabel: string;
  playerInstructions: string;
  methodConfig: PaymentMethodConfig | Record<string, any>;
  isEnabled: boolean;
  displayOrder: number;
  isOfficialClubAccount: boolean;
}

/**
 * Request type for creating a payment method.
 *
 * Keep this camelCase to match PaymentMethodsService.ts and the Express route.
 */
export interface CreatePaymentMethodRequest {
  methodCategory: PaymentMethodCategory;
  providerName?: PaymentProvider | null;
  methodLabel: string;
  playerInstructions?: string;
  methodConfig?: PaymentMethodConfig | Record<string, any>;
  isEnabled?: boolean;
  displayOrder?: number;
  isOfficialClubAccount?: boolean;
}

/**
 * Request type for updating a payment method.
 *
 * Keep this camelCase to match PaymentMethodsService.ts and the Express route.
 */
export interface UpdatePaymentMethodRequest {
  methodCategory?: PaymentMethodCategory;
  providerName?: PaymentProvider | null;
  methodLabel?: string;
  playerInstructions?: string;
  methodConfig?: PaymentMethodConfig | Record<string, any>;
  isEnabled?: boolean;
  displayOrder?: number;
  isOfficialClubAccount?: boolean;
}

/**
 * Request type for reordering payment methods.
 *
 * Your frontend service sends:
 * { orders: Array<{ id, displayOrder }> }
 */
export interface ReorderPaymentMethodsRequest {
  orders: Array<{
    id: string | number;
    displayOrder: number;
  }>;
}