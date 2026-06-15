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
  Search,
  ReceiptText,
  Ban,
  Ticket,
  Moon,
  Info,
} from 'lucide-react';

import type { Web2RoomListItem as Room } from '../../../../../shared/api/quiz.api';

import {
  quizPaymentMethodsService,
  type PaymentMethod,
} from '../../../services/QuizPaymentMethodsService';

import QuizLatePaymentsService, {
  type UnpaidPlayerRow,
} from '../../../services/QuizLatePaymentsService';

import { useCurrency } from '../../../hooks/useCurrency';

type PaymentMethod_ = PaymentMethod;

interface Props {
  room: Room;
  config?: any;
  onPaymentMethodSuccess: () => void;  // reserved — selection moved to CreateEventForm
  confirmedBy: string;
  confirmedByName?: string;
}

type LegacyPaymentMethod =
  | 'pay_admin'
  | 'cash'
  | 'card_tap'
  | 'instant_payment'
  | 'card'
  | 'stripe'
  | 'crypto'
  | 'other';

type ResolutionMode = 'paid_late' | 'write_off' | null;

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
    if (provider === 'card_tap') return 'card_tap';
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
      parts.push('Cash on the night / manual confirmation');
    } else if (provider === 'card_tap') {
      parts.push('CardTap on the night / manual confirmation');
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

function statusPillClass(status: string) {
  const trimmed = status.trim();
  if (trimmed === 'disputed') return 'border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] text-[#c8423b]';
  if (trimmed === 'claimed') return 'border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)] text-[#8a6d2f]';
  if (trimmed === 'expected') return 'border-[#dce1df] bg-[#fbf8f2] text-[#52636f]';
  return 'border-[#dce1df] bg-[#fbf8f2] text-[#52636f]';
}

export default function PaymentsTab({
  room,
  config,
  onPaymentMethodSuccess: _onPaymentMethodSuccess,
  confirmedBy,
  confirmedByName,
}: Props) {
const isCompleted = room.status === 'completed';
const { sym, fmt } = useCurrency(config);

  // ── Payment methods (read-only display) ─────────────────────────────────
  const [pmLoading, setPmLoading] = useState(false);
  const [pmError, setPmError] = useState<string | null>(null);
  const [ticketMethods, setTicketMethods]   = useState<PaymentMethod_[]>([]);
  const [onnightMethods, setOnnightMethods] = useState<PaymentMethod_[]>([]);

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

      const available = response.available_methods.filter(m => m.is_enabled);
      const byId = new Map(available.map(m => [m.id, m]));

      // Backward compat: fall back to linked_method_ids if split fields absent
      const ticketIds  = response.ticket_method_ids  ?? response.linked_method_ids ?? [];
      const onnightIds = response.onnight_method_ids ?? response.linked_method_ids ?? [];

      setTicketMethods(ticketIds.map(id => byId.get(id)).filter(Boolean) as PaymentMethod_[]);
      setOnnightMethods(onnightIds.map(id => byId.get(id)).filter(Boolean) as PaymentMethod_[]);
    } catch (error: any) {
      setPmError(error.message || 'Failed to load payment methods');
    } finally {
      setPmLoading(false);
    }
  };

  // linkedAvailableMethods: used by the late payments section to populate the method dropdown.
  // For on-night context: use onnightMethods (these are the methods available at the door).
  const linkedAvailableMethods = useMemo(() => {
    return [...onnightMethods].sort((a, b) => {
      const orderA = Number(a.display_order || 0);
      const orderB = Number(b.display_order || 0);
      if (orderA !== orderB) return orderA - orderB;
      return String(a.method_label || '').localeCompare(String(b.method_label || ''));
    });
  }, [onnightMethods]);

  // ── Late payments ────────────────────────────────────────────────────────
  const [players, setPlayers] = useState<UnpaidPlayerRow[]>([]);
  const [lateLoading, setLateLoading] = useState(false);
  const [lateSearch, setLateSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [resolutionMode, setResolutionMode] = useState<ResolutionMode>(null);

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
        (player.playerName || '').toLowerCase().includes(search) ||
        String(player.playerId || '').toLowerCase().includes(search)
      );
    });
  }, [players, lateSearch]);

  const selectedPlayer = useMemo(
    () => players.find((player) => player.playerId === selectedId) || null,
    [players, selectedId]
  );

  function primePlayer(player: UnpaidPlayerRow) {
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

  function chooseLatePayment(player: UnpaidPlayerRow) {
    primePlayer(player);
    setResolutionMode('paid_late');
  }

  function chooseWriteOff(player: UnpaidPlayerRow) {
    primePlayer(player);
    setResolutionMode('write_off');
    setWriteOffConfirm(true);
  }

  const receivedTotal =
    parseMoneyInput(entryAmount) + parseMoneyInput(extrasAmount);

  const originalTotal = selectedPlayer
    ? Number(selectedPlayer.entryFeeOutstanding || 0) +
      Number(selectedPlayer.extrasOutstanding || 0)
    : 0;

  const diff = receivedTotal - originalTotal;
  const canMarkLatePaid =
    !!selectedPlayer &&
    !lateSaving &&
    clubMethodId !== null &&
    linkedAvailableMethods.length > 0;

  const canWriteOff = !!selectedPlayer && !lateSaving;

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
      setResolutionMode(null);
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
      setResolutionMode(null);
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
      <section className="space-y-4">
        <div className="rounded-2xl border border-[rgba(210,181,130,0.3)] bg-gradient-to-r from-orange-50 via-white to-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#8a6d2f]">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-[#102532]">
                Resolve outstanding payments
              </h3>
              <p className="mt-1 text-sm text-[#52636f]">
                Each unpaid player can be marked as paid late or written off. Late payments show the amount fields so you can handle partial or different amounts.
              </p>
            </div>
          </div>
        </div>

        {lateError && !selectedPlayer && (
          <div className="rounded-xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] p-4 text-sm text-[#c8423b]">
            {lateError}
          </div>
        )}

        {lateLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#dce1df] bg-white py-10 text-sm text-[#52636f]">
            <Loader2 className="h-5 w-5 animate-spin text-[#157f85]" />
            Loading outstanding payments…
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)] p-8 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
            <p className="text-sm font-semibold text-green-900">
              No outstanding payments
            </p>
            <p className="mx-auto mt-2 max-w-sm text-xs text-[#157f85]">
              All player payments for this completed quiz are resolved.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-[rgba(210,181,130,0.3)] bg-[rgba(210,181,130,0.1)] p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8a6d2f]">Players to resolve</p>
                <p className="mt-1 text-xl font-black text-orange-950">{players.length}</p>
              </div>
              <div className="rounded-xl border border-[rgba(210,181,130,0.3)] bg-white p-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">Outstanding total</p>
                <p className="mt-1 text-xl font-black text-[#102532]">
                  {fmt(players.reduce((sum, player) => sum + Number(player.totalOutstanding || 0), 0))}
                </p>
              </div>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8a9bab]" />
              <input
                value={lateSearch}
                onChange={(event) => setLateSearch(event.target.value)}
                placeholder="Search outstanding players…"
                className="w-full rounded-xl border border-[#dce1df] bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#157f85] focus:ring-2 focus:ring-[rgba(21,127,133,0.2)]"
              />
            </div>

            <div className="space-y-2">
              {filteredPlayers.map((player) => {
                const active = selectedId === player.playerId;
                return (
                  <div
                    key={player.playerId}
                    className={`rounded-2xl border bg-white p-4 transition-all ${
                      active
                        ? 'border-indigo-300 shadow-sm ring-2 ring-[rgba(21,127,133,0.2)]'
                        : 'border-[#dce1df] hover:border-[#dce1df]'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#102532]">
                          {player.playerName || player.playerId}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {String((player as any).statuses || '')
                            .split(',')
                            .filter(Boolean)
                            .map((status) => (
                              <span
                                key={status}
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusPillClass(status)}`}
                              >
                                {status.trim().replace(/_/g, ' ')}
                              </span>
                            ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="sm:text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#52636f]">
                            Outstanding
                          </p>
                          <p className="text-lg font-black text-[#102532]">
                            {fmt(player.totalOutstanding)}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => chooseWriteOff(player)}
                            disabled={lateSaving}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] px-3 py-2 text-xs font-bold text-[#c8423b] hover:bg-[rgba(233,87,79,0.15)] disabled:opacity-50"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Write off
                          </button>
                          <button
                            type="button"
                            onClick={() => chooseLatePayment(player)}
                            disabled={lateSaving}
                            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#157f85] px-3 py-2 text-xs font-bold text-white hover:bg-[#0e6268] disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Accept late payment
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredPlayers.length === 0 && (
                <div className="rounded-2xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-6 text-center text-sm text-[#52636f]">
                  No matching outstanding payments.
                </div>
              )}
            </div>

            {selectedPlayer && resolutionMode === 'write_off' && writeOffConfirm && (
              <div className="space-y-4 rounded-2xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#c8423b]" />
                  <div>
                    <p className="text-sm font-black text-red-950">
                      Write off {selectedPlayer.playerName || 'this player'}’s outstanding payment?
                    </p>
                    <p className="mt-1 text-xs text-red-800">
                      This closes the unresolved ledger item as not collected. It will be excluded from collected totals and shown as written off in the reports.
                    </p>
                  </div>
                </div>

                {lateError && (
                  <div className="rounded-xl border border-[rgba(233,87,79,0.3)] bg-white p-3 text-sm text-[#c8423b]">
                    {lateError}
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#8b1c1c]">
                    Optional note
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    disabled={lateSaving}
                    rows={2}
                    className="w-full rounded-xl border border-[rgba(233,87,79,0.3)] bg-white px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
                    placeholder="e.g. Player did not pay after follow-up"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setResolutionMode(null);
                      setWriteOffConfirm(false);
                      setSelectedId('');
                    }}
                    disabled={lateSaving}
                    className="rounded-xl border border-[#dce1df] bg-white px-4 py-2 text-sm font-bold text-[#52636f] hover:bg-[#fbf8f2] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleWriteOff}
                    disabled={!canWriteOff}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e9574f] px-4 py-2 text-sm font-bold text-white hover:bg-[#c8423b] disabled:opacity-50"
                  >
                    {savingAction === 'write_off' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Confirm write-off
                  </button>
                </div>
              </div>
            )}

            {selectedPlayer && resolutionMode === 'paid_late' && (
              <div className="space-y-4 rounded-2xl border border-[rgba(21,127,133,0.3)] bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-[#102532]">
                      Accept late payment
                    </p>
                    <p className="mt-0.5 text-xs text-[#52636f]">
                      {selectedPlayer.playerName || selectedPlayer.playerId}
                    </p>
                  </div>
                  <span className="rounded-full bg-[rgba(21,127,133,0.08)] px-3 py-1 text-xs font-bold text-[#157f85]">
                    Expected {fmt(originalTotal)}
                  </span>
                </div>

                {lateError && (
                  <div className="rounded-xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] p-3 text-sm text-[#c8423b]">
                    {lateError}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                    <div key={label} className="rounded-xl bg-[#fbf8f2] px-3 py-2.5">
                      <label className="text-[11px] font-semibold uppercase tracking-wide text-[#52636f]">
                        {label}
                      </label>

                      <div className="mt-1 flex items-center gap-1">
                        <span className="text-sm font-bold text-[#52636f]">
                          {sym}
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
                          className="w-full rounded-lg border border-[#dce1df] bg-white px-2 py-1.5 text-sm font-bold text-[#102532] outline-none focus:border-[#157f85] focus:ring-2 focus:ring-[rgba(21,127,133,0.2)]"
                        />
                      </div>

                      <p className="mt-0.5 text-[10px] text-[#52636f]">
                        Expected {fmt(expected)}
                      </p>
                    </div>
                  ))}
                </div>

                <div
                  className={`rounded-xl border p-3 ${
                    diff < 0
                      ? 'border-[rgba(210,181,130,0.5)] bg-[rgba(210,181,130,0.1)]'
                      : diff > 0
                        ? 'border-[rgba(21,127,133,0.3)] bg-[rgba(21,127,133,0.06)]'
                        : 'border-[#dce1df] bg-[#fbf8f2]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">
                        Received total
                      </p>
                      <p className="mt-1 text-xl font-black text-[#102532]">
                        {fmt(receivedTotal)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#52636f]">
                        Difference
                      </p>
                      <p
                        className={`mt-1 text-sm font-bold ${
                          diff < 0
                            ? 'text-[#8a6d2f]'
                            : diff > 0
                              ? 'text-[#157f85]'
                              : 'text-[#52636f]'
                        }`}
                      >
                        {diff === 0 ? 'No change' : `${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))}`}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52636f]">
                      Payment method
                    </label>

                    <select
                      value={latePaymentMethodValue}
                      onChange={(event) =>
                        handleLatePaymentMethodChange(event.target.value)
                      }
                      disabled={lateSaving || linkedAvailableMethods.length === 0}
                      className="w-full rounded-xl border border-[#dce1df] px-3 py-2 text-sm outline-none focus:border-[#157f85] focus:ring-2 focus:ring-[rgba(21,127,133,0.2)] disabled:bg-[#f1f0ee] disabled:text-[#52636f]"
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
                      <p className="mt-1 text-xs text-[#c8423b]">
                        No payment methods are linked to this quiz. Link a payment method before resolving outstanding payments.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#52636f]">
                      Payment reference
                    </label>

                    <input
                      value={payRef}
                      onChange={(event) => setPayRef(event.target.value)}
                      placeholder="Optional"
                      disabled={lateSaving}
                      className="w-full rounded-xl border border-[#dce1df] px-3 py-2 text-sm outline-none focus:border-[#157f85] focus:ring-2 focus:ring-[rgba(21,127,133,0.2)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#52636f]">
                    Notes
                  </label>

                  <textarea
                    value={adminNotes}
                    onChange={(event) => setAdminNotes(event.target.value)}
                    disabled={lateSaving}
                    rows={2}
                    className="w-full rounded-xl border border-[#dce1df] px-3 py-2 text-sm outline-none focus:border-[#157f85] focus:ring-2 focus:ring-[rgba(21,127,133,0.2)]"
                    placeholder="e.g. Payment received after event ended"
                  />
                </div>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setResolutionMode(null);
                      setSelectedId('');
                    }}
                    disabled={lateSaving}
                    className="rounded-xl border border-[#dce1df] bg-white px-4 py-2 text-sm font-bold text-[#52636f] hover:bg-[#fbf8f2] disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleMarkPaid}
                    disabled={!canMarkLatePaid}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-white ${
                      canMarkLatePaid
                        ? 'bg-[#157f85] hover:bg-[#0e6268]'
                        : 'cursor-not-allowed bg-gray-300'
                    }`}
                  >
                    {savingAction === 'paid_late' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    Confirm late payment
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-6 p-5">
      {isCompleted && (
        <div className="rounded-2xl border border-[#dce1df] bg-[#fbf8f2] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#dce1df]">
              <Lock className="h-5 w-5 text-[#52636f]" />
            </div>

            <div>
              <p className="text-sm font-bold text-[#102532]">
                Payment options are locked
              </p>

              <p className="mt-1 text-xs text-[#52636f]">
                This quiz is completed, so checkout options can no longer be changed. Use this tab only to close unresolved payments.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment methods: read-only display ── */}
      {!isCompleted && (
      <section className="space-y-4">
        <div className="rounded-2xl border border-[rgba(21,127,133,0.2)] bg-gradient-to-r from-emerald-50 via-white to-green-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CreditCard className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-black text-[#102532]">Payment methods</h3>
              <p className="mt-1 text-sm text-[#52636f]">
                Configured in the event settings.
              </p>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-[rgba(21,127,133,0.3)] bg-white px-3 py-1.5 text-xs font-semibold text-[#157f85]">
              <Info className="h-3.5 w-3.5" />
              Edit in event settings
            </div>
          </div>
        </div>

        {pmLoading && (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#dce1df] bg-white py-8 text-sm text-[#52636f]">
            <Loader2 className="h-5 w-5 animate-spin text-[#157f85]" />
            Loading…
          </div>
        )}

        {pmError && (
          <div className="flex gap-3 rounded-2xl border border-[rgba(233,87,79,0.3)] bg-[rgba(233,87,79,0.08)] p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#c8423b]" />
            <p className="text-sm text-red-800">{pmError}</p>
          </div>
        )}

        {!pmLoading && !pmError && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Tickets column */}
            <div className="rounded-2xl border border-[#dce1df] bg-white p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-[#157f85]" />
                <p className="text-sm font-bold text-[#102532]">Tickets (online)</p>
              </div>
              {ticketMethods.length === 0 ? (
                <p className="text-xs text-[#8a9bab]">No ticket payment methods configured.</p>
              ) : (
                ticketMethods.map(method => (
                  <div key={method.id} className="flex items-center gap-2.5 rounded-xl border border-[#f1f0ee] bg-[#fbf8f2] px-3 py-2.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[#52636f]">
                      {getMethodIcon(method)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#102532] truncate">{method.method_label}</p>
                      {getSubtitle(method) && (
                        <p className="text-[10px] text-[#8a9bab] truncate">{getSubtitle(method)}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* On the Night column */}
            <div className="rounded-2xl border border-[#dce1df] bg-white p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4 text-[#157f85]" />
                <p className="text-sm font-bold text-[#102532]">On the Night</p>
              </div>
              {onnightMethods.length === 0 ? (
                <p className="text-xs text-[#8a9bab]">No on-the-night payment methods configured.</p>
              ) : (
                onnightMethods.map(method => (
                  <div key={method.id} className="flex items-center gap-2.5 rounded-xl border border-[#f1f0ee] bg-[#fbf8f2] px-3 py-2.5">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white text-[#52636f]">
                      {getMethodIcon(method)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#102532] truncate">{method.method_label}</p>
                      {getSubtitle(method) && (
                        <p className="text-[10px] text-[#8a9bab] truncate">{getSubtitle(method)}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </section>
      )}

      {renderOutstandingPayments()}

      {!isCompleted && (
        <section>
          <div className="rounded-2xl border border-dashed border-[#dce1df] bg-[#fbf8f2] p-6 text-center">
            <p className="text-sm font-bold text-[#1e3040]">
              Outstanding payments appear after the quiz is completed.
            </p>
            <p className="mx-auto mt-2 max-w-sm text-xs text-[#52636f]">
              Once the event is complete, unpaid players will appear here with row-level actions for late payment or write-off.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
