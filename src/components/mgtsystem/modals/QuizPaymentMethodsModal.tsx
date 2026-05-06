// src/components/Quiz/modals/QuizPaymentMethodsModal.tsx

import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  Wallet,
} from 'lucide-react';
import {
  quizPaymentMethodsService,
  PaymentMethod,
} from '../services/QuizPaymentMethodsService';

interface QuizPaymentMethodsModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  roomTitle?: string;
  onSuccess?: () => void;
}

export const QuizPaymentMethodsModal: React.FC<QuizPaymentMethodsModalProps> = ({
  isOpen,
  onClose,
  roomId,
  roomTitle,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodIds, setSelectedMethodIds] = useState<number[]>([]);
  const [originalMethodIds, setOriginalMethodIds] = useState<number[]>([]);

  useEffect(() => {
    if (isOpen && roomId) {
      loadPaymentMethods();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, roomId]);

  const loadPaymentMethods = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await quizPaymentMethodsService.getQuizPaymentMethods(roomId);

      // Only show enabled methods in the modal.
      const enabledMethods = response.available_methods.filter(
        (method) => method.is_enabled
      );

      // If a method was previously linked but is now disabled,
      // remove it from the visible/selected state so the host is not confused.
      const enabledMethodIds = new Set(enabledMethods.map((method) => method.id));

      const linkedEnabledIds = response.linked_method_ids.filter((methodId) =>
        enabledMethodIds.has(methodId)
      );

      setAvailableMethods(enabledMethods);
      setSelectedMethodIds(linkedEnabledIds);
      setOriginalMethodIds(linkedEnabledIds);
    } catch (err: any) {
      console.error('Failed to load payment methods:', err);
      setError(err.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMethod = (methodId: number) => {
    setSelectedMethodIds((prev) => {
      if (prev.includes(methodId)) {
        return prev.filter((id) => id !== methodId);
      }

      return [...prev, methodId];
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await quizPaymentMethodsService.updateLinkedPaymentMethods(
        roomId,
        selectedMethodIds
      );

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Failed to update payment methods:', err);
      setError(err.message || 'Failed to update payment methods');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    const selected = [...selectedMethodIds].sort((a, b) => a - b);
    const original = [...originalMethodIds].sort((a, b) => a - b);

    return JSON.stringify(selected) !== JSON.stringify(original);
  }, [selectedMethodIds, originalMethodIds]);

  const selectedCount = selectedMethodIds.length;

  const getMethodSubtitle = (method: PaymentMethod) => {
    const parts: string[] = [];

    if (method.provider_name) {
      parts.push(method.provider_name);
    }

    if (method.method_category === 'stripe') {
      parts.push('Card / Apple Pay / Google Pay');
    }

    if (method.method_category === 'crypto') {
      parts.push('Crypto payment');
    }

    if (
      method.method_category === 'instant_payment'
     
    ) {
      parts.push('Instant payment');
    }

    return parts.join(' · ');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="
          flex max-h-[100dvh] w-full flex-col overflow-hidden bg-white shadow-2xl
          sm:max-h-[92vh] sm:max-w-3xl sm:rounded-2xl
          lg:max-w-4xl
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <CreditCard className="h-5 w-5 text-emerald-700" />
              </div>

              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
                  Choose payment options
                </h2>

                {roomTitle ? (
                  <p className="mt-1 text-sm text-gray-500">
                    Players will only see the methods you select for{' '}
                    <span className="font-medium text-gray-700">{roomTitle}</span>.
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-gray-500">
                    Players will only see the payment methods you select for this quiz.
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close payment methods modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          {loading && (
            <div className="flex items-center justify-center py-14">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
              <span className="ml-3 text-sm text-gray-600">
                Loading payment options...
              </span>
            </div>
          )}

          {error && (
            <div className="mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Could not load payment options
                </p>
                <p className="mt-1 text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {!loading && availableMethods.length === 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    No active payment methods available
                  </p>
                  <p className="mt-1 text-sm text-amber-800">
                    Add or enable a payment method in your club settings before linking
                    payment options to this quiz.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!loading && availableMethods.length > 0 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="text-sm text-emerald-900">
                  Select the payment options you want to show on the player checkout
                  page. Disabled methods are hidden automatically.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {availableMethods.map((method) => {
                  const isSelected = selectedMethodIds.includes(method.id);
                  const subtitle = getMethodSubtitle(method);

                  return (
                    <button
                      type="button"
                      key={method.id}
                      onClick={() => handleToggleMethod(method.id)}
                      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : method.method_category === 'crypto' ? (
                            <Wallet className="h-5 w-5" />
                          ) : (
                            <CreditCard className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="break-words font-semibold text-gray-900">
                              {method.method_label}
                            </p>

                            {isSelected && (
                              <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800">
                                Selected
                              </span>
                            )}
                          </div>

                          {subtitle && (
                            <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
                          )}

                          {method.player_instructions && (
                            <p className="mt-2 text-sm text-gray-600">
                              {method.player_instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              {selectedCount === 0
                ? 'No payment methods selected'
                : `${selectedCount} payment method${
                    selectedCount === 1 ? '' : 's'
                  } selected`}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !hasChanges || loading}
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Save
                    <span className="hidden sm:inline"> payment options</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};