// src/components/Quiz/shared/PaymentMethodSelector.tsx

import React from 'react';
import {
  ChevronRight,
  CreditCard,
  Smartphone,
  Building2,
  Zap,
  Wallet,
  Landmark,
} from 'lucide-react';

export interface ClubPaymentMethod {
  id: string | number;
  methodLabel: string;
  methodCategory: string;
  providerName?: string | null | undefined;
  playerInstructions?: string | null | undefined;
  methodConfig?: any;

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

const normalize = (value?: string | null) => String(value || '').toLowerCase();

const isStripeMethod = (method: ClubPaymentMethod) => {
  return (
    normalize(method.methodCategory) === 'stripe' ||
    normalize(method.providerName) === 'stripe'
  );
};

const isCryptoMethod = (method: ClubPaymentMethod) => {
  return normalize(method.methodCategory) === 'crypto';
};

const isInstantPaymentMethod = (method: ClubPaymentMethod) => {
  return normalize(method.methodCategory) === 'instant_payment';
};

const formatProviderName = (providerName?: string | null) => {
  if (!providerName) return '';
  return providerName.replace(/_/g, ' ');
};

const getMethodSubtitle = (method: ClubPaymentMethod) => {
  const provider = normalize(method.providerName);

  if (isStripeMethod(method)) {
    return 'Pay securely by card';
  }

  if (isCryptoMethod(method)) {
    if (provider === 'solana_wallet') return 'Donate using a Solana wallet';
    return 'Donate using crypto';
  }

  if (isInstantPaymentMethod(method)) {
    if (provider === 'revolut') return 'Pay using Revolut';
    if (provider === 'bank_transfer') return 'Pay by bank transfer';
    if (provider === 'paypal') return 'Pay using PayPal';
    if (provider) return `Pay using ${formatProviderName(method.providerName)}`;
    return 'Manual instant payment';
  }

  if (method.providerName) {
    return formatProviderName(method.providerName);
  }

  return formatProviderName(method.methodCategory);
};

const getProviderIcon = (method: ClubPaymentMethod) => {
  const provider = normalize(method.providerName);

  if (isStripeMethod(method)) return <CreditCard className="h-6 w-6" />;
  if (isCryptoMethod(method)) return <Wallet className="h-6 w-6" />;

  switch (provider) {
    case 'revolut':
      return <Smartphone className="h-6 w-6" />;
    case 'bank_transfer':
      return <Building2 className="h-6 w-6" />;
    case 'paypal':
      return <CreditCard className="h-6 w-6" />;
    case 'monzo':
    case 'starling':
    case 'wise':
      return <Landmark className="h-6 w-6" />;
    default:
      return <Zap className="h-6 w-6" />;
  }
};

const getProviderColor = (method: ClubPaymentMethod) => {
  const provider = normalize(method.providerName);

  if (isStripeMethod(method)) return 'from-indigo-500 to-purple-600';
  if (isCryptoMethod(method)) return 'from-purple-500 to-violet-700';

  switch (provider) {
    case 'revolut':
      return 'from-blue-500 to-indigo-600';
    case 'bank_transfer':
      return 'from-green-500 to-emerald-600';
    case 'paypal':
      return 'from-sky-500 to-blue-600';
    case 'monzo':
      return 'from-pink-500 to-rose-600';
    case 'starling':
      return 'from-teal-500 to-cyan-600';
    case 'wise':
      return 'from-lime-500 to-green-600';
    default:
      return 'from-blue-500 to-indigo-600';
  }
};

const getMethodRank = (method: ClubPaymentMethod) => {
  if (isStripeMethod(method)) return 0;
  if (isInstantPaymentMethod(method)) return 1;
  if (isCryptoMethod(method)) return 2;
  return 3;
};

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  paymentMethods,
  onSelect,
  onSelectPayAdmin,
  showPayAdminOption = false,
  loading = false,
  hideNoMethodsMessage = false,
}) => {
  const sortedPaymentMethods = [...paymentMethods].sort((a, b) => {
    const rankDiff = getMethodRank(a) - getMethodRank(b);
    if (rankDiff !== 0) return rankDiff;

    return String(a.methodLabel || '').localeCompare(String(b.methodLabel || ''));
  });

  if (loading) {
    return (
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-center space-x-3">
          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-blue-600" />
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

      {showPayAdminOption && onSelectPayAdmin && (
        <button
          type="button"
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
                Join now, pay later in person or directly with the host
              </div>
            </div>

            <ChevronRight className="h-5 w-5 text-gray-400 transition-colors group-hover:text-indigo-600" />
          </div>
        </button>
      )}

      {sortedPaymentMethods.length > 0 &&
        sortedPaymentMethods.map((method) => {
          const icon = getProviderIcon(method);
          const gradient = getProviderColor(method);
          const subtitle = getMethodSubtitle(method);

          return (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelect(method)}
              className="group w-full rounded-lg border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-indigo-500 hover:bg-indigo-50 hover:shadow-md sm:p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} text-white shadow-md`}
                  >
                    {icon}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 sm:text-lg truncate">
                      {method.methodLabel}
                    </div>

                    <div className="text-sm text-gray-600 capitalize">
                      {subtitle}
                    </div>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400 transition-colors group-hover:text-indigo-600" />
              </div>
            </button>
          );
        })}

      {sortedPaymentMethods.length === 0 &&
        !showPayAdminOption &&
        !hideNoMethodsMessage && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <CreditCard className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              No Payment Methods
            </h3>
            <p className="text-sm text-gray-600">
              Please contact the host for payment options.
            </p>
          </div>
        )}

      {sortedPaymentMethods.length === 0 &&
        showPayAdminOption &&
        !hideNoMethodsMessage && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <p className="text-sm text-yellow-800">
              ℹ️ No linked club payment methods are available for this quiz. You can pay the host directly.
            </p>
          </div>
        )}
    </div>
  );
};