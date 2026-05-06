// src/components/mgtsystem/components/digitalEvents/tabs/PaymentsTab.tsx

import { useEffect, useMemo, useState } from 'react';
import {
  Loader2,
  CheckCircle2,
  CreditCard,
  AlertCircle,
  Wallet,
  AlertTriangle,
  Lock,
} from 'lucide-react';

import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';

import {
  quizPaymentMethodsService,
  type PaymentMethod,
} from '../../../services/QuizPaymentMethodsService';

import QuizLatePaymentsService, {
  type UnpaidPlayerRow,
} from '../../../services/QuizLatePaymentsService';

type PaymentMethod_ = PaymentMethod;

interface Props {
  room: Room;
  onPaymentMethodSuccess: () => void;
  confirmedBy: string;
  confirmedByName?: string;
}

type LegacyPaymentMethod =
  | 'pay_admin'
  | 'cash'
  | 'instant_payment'
  | 'card'
  | 'stripe'
  | 'crypto'
  | 'other';





function moneyToInput(value: unknown) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00';
}

function parseMoneyInput(value: string) {
  const amount = Number(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(amount)
    ? Math.max(0, Math.round(amount * 100) / 100)
    : 0;
}

function formatProviderName(providerName?: string | null) {
  if (!providerName) return '';
  return providerName.replace(/_/g, ' ');
}

function getCanonicalPaymentMethod(method?: PaymentMethod_ | null): LegacyPaymentMethod {
  if (!method) return 'pay_admin';

  const category = String(method.method_category || '').toLowerCase();
  const provider = String(method.provider_name || '').toLowerCase();

  if (category === 'stripe') return 'stripe';
  if (category === 'card') return 'card';
  if (category === 'crypto') return 'crypto';

  if (category === 'instant_payment') {
    if (provider === 'cash') return 'cash';
    return 'instant_payment';
  }

  return 'other';
}

function getSubtitle(method: PaymentMethod_) {
  const parts: string[] = [];

  if (method.provider_name) {
    parts.push(formatProviderName(method.provider_name));
  }

  if (method.method_category === 'stripe') {
    parts.push('Card / Apple Pay / Google Pay');
  }

  if (method.method_category === 'crypto') {
    parts.push('Crypto payment');
  }

  if (method.method_category === 'instant_payment') {
    const provider = String(method.provider_name || '').toLowerCase();

    if (provider === 'cash') {
      parts.push('Pay at door / manual confirmation');
    } else {
      parts.push('Manual payment');
    }
  }

  return parts.join(' · ');
}

function getMethodIcon(method: PaymentMethod_) {
  if (method.method_category === 'crypto') {
    return <Wallet className="h-5 w-5" />;
  }

  return <CreditCard className="h-5 w-5" />;
}

export default function PaymentsTab({
  room,
  onPaymentMethodSuccess,
  confirmedBy,
  confirmedByName,
}: Props) {
  const isCompleted = room.status === 'completed';

  // ── Payment methods ──────────────────────────────────────────────────────
  const [pmLoading, setPmLoading] = useState(false);
  const [pmSaving, setPmSaving] = useState(false);
  const [pmError, setPmError] = useState<string | null>(null);
  const [available, setAvailable] = useState<PaymentMethod_[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [originalIds, setOriginalIds] = useState<number[]>([]);

  useEffect(() => {
    loadPaymentMethods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.room_id]);

  const loadPaymentMethods = async () => {
    setPmLoading(true);
    setPmError(null);

    try {
      const response = await quizPaymentMethodsService.getQuizPaymentMethods(
        room.room_id
      );

      const enabled = response.available_methods.filter(
        (method) => method.is_enabled
      );

      const enabledIds = new Set(enabled.map((method) => method.id));
      const linked = response.linked_method_ids.filter((id) =>
        enabledIds.has(id)
      );

      setAvailable(enabled);
      setSelectedIds(linked);
      setOriginalIds(linked);
    } catch (error: any) {
      setPmError(error.message || 'Failed to load payment methods');
    } finally {
      setPmLoading(false);
    }
  };

  const linkedAvailableMethods = useMemo(() => {
    const selectedIdSet = new Set(selectedIds);

    return available
      .filter((method) => selectedIdSet.has(method.id))
      .sort((a, b) => {
        const orderA = Number(a.display_order || 0);
        const orderB = Number(b.display_order || 0);

        if (orderA !== orderB) return orderA - orderB;

        return String(a.method_label || '').localeCompare(
          String(b.method_label || '')
        );
      });
  }, [available, selectedIds]);

  const handleToggle = (id: number) => {
    if (isCompleted) return;

    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((existingId) => existingId !== id)
        : [...previous, id]
    );
  };

  const handleSavePayments = async () => {
    if (isCompleted) return;

    setPmSaving(true);
    setPmError(null);

    try {
      await quizPaymentMethodsService.updateLinkedPaymentMethods(
        room.room_id,
        selectedIds
      );

      setOriginalIds(selectedIds);
      onPaymentMethodSuccess();
    } catch (error: any) {
      setPmError(error.message || 'Failed to save');
    } finally {
      setPmSaving(false);
    }
  };

  const hasPaymentChanges = useMemo(() => {
    const selected = [...selectedIds].sort((a, b) => a - b);
    const original = [...originalIds].sort((a, b) => a - b);

    return JSON.stringify(selected) !== JSON.stringify(original);
  }, [selectedIds, originalIds]);

  // ── Late payments ────────────────────────────────────────────────────────
  const [players, setPlayers] = useState<UnpaidPlayerRow[]>([]);
  const [lateLoading, setLateLoading] = useState(false);
  const [lateSearch, setLateSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const [payMethod, setPayMethod] =
    useState<LegacyPaymentMethod>('pay_admin');

  const [clubMethodId, setClubMethodId] = useState<number | null>(null);

  const [entryAmount, setEntryAmount] = useState('0.00');
  const [extrasAmount, setExtrasAmount] = useState('0.00');
  const [payRef, setPayRef] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [lateSaving, setLateSaving] = useState(false);
  const [lateError, setLateError] = useState<string | null>(null);
  const [savingAction, setSavingAction] = useState<
    'paid_late' | 'write_off' | null
  >(null);
  const [writeOffConfirm, setWriteOffConfirm] = useState(false);

  const loadLatePayments = async () => {
    if (!isCompleted) return;

    setLateLoading(true);
    setLateError(null);

    try {
      const response = await QuizLatePaymentsService.getUnpaidPlayers(
        room.room_id
      );

      setPlayers(response.players || []);
    } catch (error: any) {
      setPlayers([]);
      setLateError(error?.message || 'Failed to load outstanding payments');
    } finally {
      setLateLoading(false);
    }
  };

  useEffect(() => {
    void loadLatePayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.room_id, isCompleted]);

  const filteredPlayers = useMemo(() => {
    const search = lateSearch.toLowerCase();

    return players.filter((player) => {
      return (
        !search ||
        (player.playerName || '').toLowerCase().includes(search)
      );
    });
  }, [players, lateSearch]);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.playerId === selectedId) || null,
    [players, selectedId]
  );

 function selectPlayer(player: UnpaidPlayerRow) {
  setSelectedId(player.playerId);
  setEntryAmount(moneyToInput(player.entryFeeOutstanding));
  setExtrasAmount(moneyToInput(player.extrasOutstanding));
  setPayRef('');
  setAdminNotes(String((player as any).existingNotes || '').trim());

  const existingClubMethodId = Number((player as any).clubPaymentMethodId);

  const matchedMethod = linkedAvailableMethods.find(
    (method) => method.id === existingClubMethodId
  );

  if (matchedMethod) {
    setClubMethodId(matchedMethod.id);
    setPayMethod(getCanonicalPaymentMethod(matchedMethod));
  } else {
    const firstLinkedMethod = linkedAvailableMethods[0];

    if (firstLinkedMethod) {
      setClubMethodId(firstLinkedMethod.id);
      setPayMethod(getCanonicalPaymentMethod(firstLinkedMethod));
    } else {
      setClubMethodId(null);
      setPayMethod('pay_admin');
    }
  }

  setLateError(null);
  setWriteOffConfirm(false);
}

  const receivedTotal =
    parseMoneyInput(entryAmount) + parseMoneyInput(extrasAmount);

  const originalTotal = selectedPlayer
    ? Number(selectedPlayer.entryFeeOutstanding || 0) +
      Number(selectedPlayer.extrasOutstanding || 0)
    : 0;

  const diff = receivedTotal - originalTotal;
 const canSave =
  !!selectedPlayer &&
  !lateSaving &&
  clubMethodId !== null &&
  linkedAvailableMethods.length > 0;

 const handleLatePaymentMethodChange = (value: string) => {
  if (!value.startsWith('club:')) {
    setClubMethodId(null);
    setPayMethod('pay_admin');
    return;
  }

  const id = Number(value.replace('club:', ''));
  const method = linkedAvailableMethods.find((item) => item.id === id);

  if (!method) {
    setClubMethodId(null);
    setPayMethod('pay_admin');
    return;
  }

  setClubMethodId(method.id);
  setPayMethod(getCanonicalPaymentMethod(method));
};

 const latePaymentMethodValue =
  clubMethodId !== null ? `club:${clubMethodId}` : '';

  async function handleMarkPaid() {
    if (!selectedPlayer || !confirmedBy) {
      setLateError('Missing confirmer identity');
      return;
    }

    setLateSaving(true);
    setSavingAction('paid_late');
    setLateError(null);

    try {
      await QuizLatePaymentsService.markLatePaid({
        roomId: room.room_id,
        playerId: selectedPlayer.playerId,
        paymentMethod: payMethod,
        clubPaymentMethodId: clubMethodId,
        paymentReference: payRef || null,
        entryFeeAmount: parseMoneyInput(entryAmount),
        extrasAmount: parseMoneyInput(extrasAmount),
        adminNotes: adminNotes || null,
        confirmedBy,
        confirmedByName: confirmedByName || 'Admin',
        confirmedByRole: 'admin',
      } as any);

      const response = await QuizLatePaymentsService.getUnpaidPlayers(
        room.room_id
      );

      setPlayers(response.players || []);
      setSelectedId('');
      setWriteOffConfirm(false);
    } catch (error: any) {
      setLateError(error.message || 'Failed to mark paid');
    } finally {
      setLateSaving(false);
      setSavingAction(null);
    }
  }

  async function handleWriteOff() {
    if (!selectedPlayer || !confirmedBy) {
      setLateError('Missing confirmer identity');
      return;
    }

    setLateSaving(true);
    setSavingAction('write_off');
    setLateError(null);

    try {
      await QuizLatePaymentsService.writeOffPayment({
        roomId: room.room_id,
        playerId: selectedPlayer.playerId,
        adminNotes: adminNotes || null,
        confirmedBy,
        confirmedByName: confirmedByName || 'Admin',
        confirmedByRole: 'admin',
      });

      const response = await QuizLatePaymentsService.getUnpaidPlayers(
        room.room_id
      );

      setPlayers(response.players || []);
      setSelectedId('');
      setWriteOffConfirm(false);
    } catch (error: any) {
      setLateError(error.message || 'Failed to write off');
    } finally {
      setLateSaving(false);
      setSavingAction(null);
    }
  }

  const renderOutstandingPayments = () => {
    if (!isCompleted) {
      return null;
    }

    return (
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Outstanding Payments
        </h3>

        <p className="mb-4 text-xs text-gray-500">
          Mark late payments or write off amounts not collected.
        </p>

        {lateError && !selectedPlayer && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {lateError}
          </div>
        )}

        {lateLoading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            Loading outstanding payments…
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-xl border border-dashed border-green-200 bg-green-50 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
            <p className="text-sm font-semibold text-green-900">
              No outstanding payments
            </p>
            <p className="mx-auto mt-2 max-w-sm text-xs text-green-700">
              All player payments for this completed quiz are resolved. There
              is nothing left to collect or write off.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Player search */}
            <input
              value={lateSearch}
              onChange={(event) => setLateSearch(event.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {/* Player list */}
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {filteredPlayers.map((player) => (
                <button
                  key={player.playerId}
                  type="button"
                  onClick={() => selectPlayer(player)}
                  className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selectedId === player.playerId
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {player.playerName || player.playerId}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      €{Number(player.totalOutstanding || 0).toFixed(2)}
                    </div>

                    <div className="mt-0.5 flex justify-end gap-1">
                      {String((player as any).statuses || '')
                        .split(',')
                        .filter(Boolean)
                        .map((status) => (
                          <span
                            key={status}
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              status.trim() === 'disputed'
                                ? 'border-red-200 bg-red-50 text-red-700'
                                : status.trim() === 'claimed'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-gray-200 bg-gray-50 text-gray-700'
                            }`}
                          >
                            {status.trim()}
                          </span>
                        ))}
                    </div>
                  </div>
                </button>
              ))}

              {filteredPlayers.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                  No matching outstanding payments.
                </div>
              )}
            </div>

            {/* Resolution form */}
            {selectedPlayer && (
              <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  Resolving:{' '}
                  <span className="text-indigo-700">
                    {selectedPlayer.playerName}
                  </span>
                </h4>

                {lateError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {lateError}
                  </div>
                )}

                {/* Amounts */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: 'Entry received',
                      value: entryAmount,
                      onChange: setEntryAmount,
                      expected: selectedPlayer.entryFeeOutstanding,
                    },
                    {
                      label: 'Extras received',
                      value: extrasAmount,
                      onChange: setExtrasAmount,
                      expected: selectedPlayer.extrasOutstanding,
                    },
                  ].map(({ label, value, onChange, expected }) => (
                    <div
                      key={label}
                      className="rounded-xl bg-gray-50 px-3 py-2.5"
                    >
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                        {label}
                      </label>

                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-sm font-bold text-gray-500">
                          €
                        </span>

                        <input
                          value={value}
                          onChange={(event) => onChange(event.target.value)}
                          onBlur={(event) =>
                            onChange(
                              moneyToInput(parseMoneyInput(event.target.value))
                            )
                          }
                          inputMode="decimal"
                          disabled={lateSaving}
                          className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-bold text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>

                      <p className="mt-0.5 text-[10px] text-gray-500">
                        Expected €{Number(expected || 0).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div
                  className={`rounded-xl border p-3 ${
                    diff < 0
                      ? 'border-amber-200 bg-amber-50'
                      : diff > 0
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Received total
                      </p>

                      <p className="mt-1 text-xl font-black text-gray-900">
                        €{receivedTotal.toFixed(2)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Difference
                      </p>

                      <p
                        className={`mt-1 text-sm font-bold ${
                          diff < 0
                            ? 'text-amber-700'
                            : diff > 0
                              ? 'text-green-700'
                              : 'text-gray-700'
                        }`}
                      >
                        {diff === 0
                          ? 'No change'
                          : `${diff > 0 ? '+' : ''}€${diff.toFixed(2)}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Resolution details */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Payment method
                    </label>

<select
  value={latePaymentMethodValue}
  onChange={(event) =>
    handleLatePaymentMethodChange(event.target.value)
  }
  disabled={lateSaving || linkedAvailableMethods.length === 0}
  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-100 disabled:text-gray-500"
>
  {linkedAvailableMethods.length === 0 ? (
    <option value="">
      No quiz payment methods available
    </option>
  ) : (
    linkedAvailableMethods.map((method) => (
      <option key={method.id} value={`club:${method.id}`}>
        {method.method_label}
        {method.provider_name
          ? ` (${formatProviderName(method.provider_name)})`
          : ''}
      </option>
    ))
  )}
</select>

{linkedAvailableMethods.length === 0 && (
  <p className="mt-1 text-xs text-red-600">
    No payment methods are linked to this quiz. Link a payment method before resolving outstanding payments.
  </p>
)}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-gray-700">
                      Payment reference
                    </label>

                    <input
                      value={payRef}
                      onChange={(event) => setPayRef(event.target.value)}
                      placeholder="Optional"
                      disabled={lateSaving}
                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    Notes
                  </label>

                  <textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    disabled={lateSaving}
                    rows={2}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    placeholder="e.g. Payment received after event ended"
                  />
                </div>

                {/* Write-off confirm */}
                {writeOffConfirm && (
                  <div className="space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600" />

                      <p className="text-xs font-semibold text-red-900">
                        Write off this payment as not collected?
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setWriteOffConfirm(false)}
                        disabled={lateSaving}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={handleWriteOff}
                        disabled={lateSaving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {savingAction === 'write_off' ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : null}
                        Confirm write-off
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                {!writeOffConfirm && (
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setWriteOffConfirm(true)}
                      disabled={!canSave}
                      className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white ${
                        canSave
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'cursor-not-allowed bg-gray-300'
                      }`}
                    >
                      Write Off
                    </button>

                    <button
                      type="button"
                      onClick={handleMarkPaid}
                      disabled={!canSave}
                      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white ${
                        canSave
                          ? 'bg-indigo-600 hover:bg-indigo-700'
                          : 'cursor-not-allowed bg-gray-300'
                      }`}
                    >
                      {savingAction === 'paid_late' ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Mark Paid Late
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-8 p-5">
      {/* Completed room banner */}
      {isCompleted && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-200">
              <Lock className="h-5 w-5 text-gray-500" />
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800">
                Payment options are locked
              </p>

              <p className="mt-1 text-xs text-gray-500">
                This quiz is completed, so players can no longer join or choose
                payment options. Use the outstanding payments section below to
                resolve anything unpaid.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Payment methods are only editable before completion */}
      {!isCompleted && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Payment Options for this Quiz
          </h3>

          <p className="mb-4 text-xs text-gray-500">
            Select which payment methods players can use at checkout.
            Unselected methods won't appear.
          </p>

          {pmLoading && (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
              Loading…
            </div>
          )}

          {pmError && (
            <div className="mb-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />

              <p className="text-sm text-red-800">{pmError}</p>
            </div>
          )}

          {!pmLoading && available.length === 0 && (
            <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700" />

              <div>
                <p className="text-sm font-semibold text-amber-900">
                  No active payment methods
                </p>

                <p className="mt-1 text-xs text-amber-800">
                  Add payment methods via the Payment Methods button on the
                  dashboard first.
                </p>
              </div>
            </div>
          )}

          {!pmLoading && available.length > 0 && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                {available.map((method) => {
                  const isSelected = selectedIds.includes(method.id);

                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handleToggle(method.id)}
                      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            getMethodIcon(method)
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {method.method_label}
                            </p>

                            {isSelected && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Selected
                              </span>
                            )}
                          </div>

                          {getSubtitle(method) && (
                            <p className="mt-0.5 text-xs text-gray-500">
                              {getSubtitle(method)}
                            </p>
                          )}

                          {method.player_instructions && (
                            <p className="mt-1 text-xs text-gray-600">
                              {method.player_instructions}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  {selectedIds.length === 0
                    ? 'No methods selected'
                    : `${selectedIds.length} method${
                        selectedIds.length === 1 ? '' : 's'
                      } selected`}
                </p>

                <button
                  type="button"
                  onClick={handleSavePayments}
                  disabled={pmSaving || !hasPaymentChanges || pmLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {pmSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {renderOutstandingPayments()}

      {!isCompleted && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Outstanding Payments
          </h3>

          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center">
            <p className="text-sm font-medium text-gray-700">
              Outstanding payments appear after the quiz is completed.
            </p>

            <p className="mx-auto mt-2 max-w-sm text-xs text-gray-500">
              Once the event is complete, this section will show unpaid players
              so you can mark late payments or write off uncollected amounts.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}