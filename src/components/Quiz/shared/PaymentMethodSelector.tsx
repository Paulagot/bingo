// src/components/Quiz/shared/PaymentMethodSelector.tsx
import React from 'react';
import { ChevronRight, CreditCard, Smartphone, Building2, Zap } from 'lucide-react';

// Use a flexible type that works with both ticket and join flow types
export interface ClubPaymentMethod {
  id: string | number;
  methodLabel: string;
  methodCategory: string;
  providerName?: string | null | undefined;
  playerInstructions?: string | null | undefined;
  methodConfig?: any;
  // Optional fields that may be present in some implementations
  clubId?: string;
  displayOrder?: number;
  isEnabled?: boolean;
}

interface PaymentMethodSelectorProps {
  paymentMethods: ClubPaymentMethod[];
  onSelect: (method: ClubPaymentMethod) => void;
  onSelectPayAdmin?: () => void;
  showPayAdminOption?: boolean;
  loading?: boolean;
  hideNoMethodsMessage?: boolean;
}

const getProviderIcon = (providerName: string | null | undefined) => {
  if (!providerName) return <CreditCard className="h-6 w-6" />;
  
  switch (providerName.toLowerCase()) {
    case 'revolut':
      return <Smartphone className="h-6 w-6" />;
    case 'bank_transfer':
      return <Building2 className="h-6 w-6" />;
    default:
      return <CreditCard className="h-6 w-6" />;
  }
};

const getProviderColor = (providerName: string | null | undefined) => {
  if (!providerName) return 'from-indigo-500 to-purple-600';
  
  switch (providerName.toLowerCase()) {
    case 'revolut':
      return 'from-blue-500 to-indigo-600';
    case 'bank_transfer':
      return 'from-green-500 to-emerald-600';
    default:
      return 'from-indigo-500 to-purple-600';
  }
};

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethods,
  onSelect,
  onSelectPayAdmin,
  showPayAdminOption = false,
  loading = false,
  hideNoMethodsMessage = false,
}) => {
  if (loading) {
    return (
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <span className="text-blue-800">Loading payment methods...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-gray-900">
        {showPayAdminOption ? 'How would you like to pay?' : 'Choose Payment Method'}
      </h3>
      
      {/* Pay Host Directly Option */}
      {showPayAdminOption && onSelectPayAdmin && (
        <button
          onClick={onSelectPayAdmin}
          className="w-full text-left rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-indigo-500 hover:bg-indigo-50 transition group"
        >
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 group-hover:bg-indigo-200">
              <CreditCard className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-gray-900">Pay Host Directly</div>
              <div className="text-sm text-gray-600">
                Join now, pay later in person (cash, card, Revolut)
              </div>
            </div>
            <div className="text-indigo-600">→</div>
          </div>
        </button>
      )}

      {/* Instant Payment Methods */}
      {paymentMethods.length > 0 && (
        <>
          {showPayAdminOption && (
            <button
              className="w-full text-left rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-blue-500 hover:bg-blue-50 transition group"
              onClick={() => {/* This will be handled by showing the methods */}}
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 group-hover:bg-blue-200">
                  <Zap className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Pay Now (Instant Payment)</div>
                  <div className="text-sm text-gray-600">
                    Pay via Revolut, bank transfer, or QR code
                  </div>
                </div>
                <div className="text-blue-600">→</div>
              </div>
            </button>
          )}

          {!showPayAdminOption && paymentMethods.map((method) => {
            const icon = getProviderIcon(method.providerName ?? null);
            const gradient = getProviderColor(method.providerName ?? null);
            
            return (
              <button
                key={method.id}
                onClick={() => onSelect(method)}
                className="group w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md sm:p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-md`}>
                      {icon}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 sm:text-lg">
                        {method.methodLabel}
                      </div>
                      <div className="text-sm text-gray-600 capitalize">
                        {method.providerName?.replace('_', ' ') || method.methodCategory}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-indigo-600" />
                </div>
              </button>
            );
          })}
        </>
      )}

      {/* No methods available */}
      {paymentMethods.length === 0 && !showPayAdminOption && !hideNoMethodsMessage && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <CreditCard className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">No Payment Methods</h3>
          <p className="text-sm text-gray-600">Please contact the host for payment options.</p>
        </div>
      )}

      {/* Info message if no instant payment but pay admin is available */}
      {paymentMethods.length === 0 && showPayAdminOption && !hideNoMethodsMessage && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            ℹ️ Instant payment is not available for this quiz. Please pay the host directly.
          </p>
        </div>
      )}
    </div>
  );
};