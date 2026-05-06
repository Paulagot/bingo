// src/components/mgtsystem/components/drawer/QuizEventDrawer/panels/PaymentMethodsPanel.tsx
import { useEffect, useMemo, useState } from 'react';
import { Loader2, CheckCircle2, CreditCard, AlertCircle, Wallet } from 'lucide-react';
import {
  quizPaymentMethodsService,
  type PaymentMethod,
} from '../../../services/QuizPaymentMethodsService';

interface PaymentMethodsPanelProps {
  roomId: string;
  roomTitle?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PaymentMethodsPanel({
  roomId,
  roomTitle,
  onClose,
  onSuccess,
}: PaymentMethodsPanelProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethodIds, setSelectedMethodIds] = useState<number[]>([]);
  const [originalMethodIds, setOriginalMethodIds] = useState<number[]>([]);

  useEffect(() => { loadPaymentMethods(); }, [roomId]);

  const loadPaymentMethods = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await quizPaymentMethodsService.getQuizPaymentMethods(roomId);
      const enabled = res.available_methods.filter((m) => m.is_enabled);
      const enabledIds = new Set(enabled.map((m) => m.id));
      const linkedEnabled = res.linked_method_ids.filter((id) => enabledIds.has(id));
      setAvailableMethods(enabled);
      setSelectedMethodIds(linkedEnabled);
      setOriginalMethodIds(linkedEnabled);
    } catch (err: any) {
      setError(err.message || 'Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: number) => {
    setSelectedMethodIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await quizPaymentMethodsService.updateLinkedPaymentMethods(roomId, selectedMethodIds);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update payment methods');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = useMemo(() => {
    const sel = [...selectedMethodIds].sort((a, b) => a - b);
    const orig = [...originalMethodIds].sort((a, b) => a - b);
    return JSON.stringify(sel) !== JSON.stringify(orig);
  }, [selectedMethodIds, originalMethodIds]);

  const getSubtitle = (m: PaymentMethod) => {
    const parts: string[] = [];
    if (m.provider_name) parts.push(m.provider_name);
    if (m.method_category === 'stripe') parts.push('Card / Apple Pay / Google Pay');
    if (m.method_category === 'crypto') parts.push('Crypto payment');
    if (m.method_category === 'instant_payment') parts.push('Instant payment');
    return parts.join(' · ');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Context */}
      {roomTitle && (
        <div className="flex-shrink-0 border-b border-gray-200 px-5 py-3 bg-gray-50">
          <p className="text-xs text-gray-600">
            Players will only see the methods you select for{' '}
            <span className="font-medium text-gray-800">{roomTitle}</span>.
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
            <span className="ml-3 text-sm text-gray-600">Loading payment options…</span>
          </div>
        )}

        {error && (
          <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {!loading && availableMethods.length === 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-900">No active payment methods</p>
                <p className="mt-1 text-sm text-amber-800">
                  Add or enable a payment method in your club settings first.
                </p>
              </div>
            </div>
          </div>
        )}

        {!loading && availableMethods.length > 0 && (
          <>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
              <p className="text-sm text-emerald-900">
                Select the payment options to show on the player checkout page.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {availableMethods.map((method) => {
                const isSelected = selectedMethodIds.includes(method.id);
                const subtitle = getSubtitle(method);

                return (
                  <button
                    type="button"
                    key={method.id}
                    onClick={() => handleToggle(method.id)}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isSelected ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : method.method_category === 'crypto' ? (
                          <Wallet className="h-5 w-5" />
                        ) : (
                          <CreditCard className="h-5 w-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-gray-900">{method.method_label}</p>
                          {isSelected && (
                            <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                              Selected
                            </span>
                          )}
                        </div>
                        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
                        {method.player_instructions && (
                          <p className="mt-1.5 text-sm text-gray-600">{method.player_instructions}</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {selectedMethodIds.length === 0
              ? 'No methods selected'
              : `${selectedMethodIds.length} method${selectedMethodIds.length === 1 ? '' : 's'} selected`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Save options</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}