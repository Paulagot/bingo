import { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import QuizLatePaymentsService, { type UnpaidPlayerRow } from '../services/QuizLatePaymentsService';

type PaymentMethod = 'pay_admin' | 'cash' | 'instant_payment' | 'card' | 'stripe' | 'crypto' | 'other';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  currencySymbol?: string;

  // until backend derives identity from auth
  confirmedBy: string;
  confirmedByName?: string;
  confirmedByRole?: 'host' | 'admin';
}

const debug = false;

const VALID_PAYMENT_METHODS: PaymentMethod[] = [
  'pay_admin',
  'cash',
  'instant_payment',
  'card',
  'stripe',
  'other',
];

function getStatusList(row: UnpaidPlayerRow): string[] {
  const raw = (row as any).statuses || '';

  return String(raw)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalisePaymentMethodForSelect(raw: unknown): PaymentMethod {
  const method = String(raw || '').trim().toLowerCase();

  if (VALID_PAYMENT_METHODS.includes(method as PaymentMethod)) {
    return method as PaymentMethod;
  }

  if (method === 'revolut' || method === 'cash_or_revolut' || method === 'instant payment') {
    return 'instant_payment';
  }

  if (method === 'card_tap' || method === 'card tap') {
    return 'card';
  }

  if (method === 'pay_host' || method === 'pay host' || method === 'pay_admin') {
    return 'pay_admin';
  }

  return 'pay_admin';
}

function getPaymentMethodLabel(method: PaymentMethod) {
  switch (method) {
    case 'pay_admin':
      return 'Pay Admin';
    case 'cash':
      return 'Cash';
    case 'instant_payment':
      return 'Instant Payment';
    case 'card':
      return 'Card';
    case 'stripe':
      return 'Stripe';
    case 'other':
      return 'Other';
    default:
      return 'Unknown';
  }
}

function getStatusBadge(status: string) {
  if (status === 'disputed') {
    return {
      label: 'Disputed',
      className: 'border-red-200 bg-red-50 text-red-700',
    };
  }

  if (status === 'claimed') {
    return {
      label: 'Claimed',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  if (status === 'expected') {
    return {
      label: 'Expected',
      className: 'border-gray-200 bg-gray-50 text-gray-700',
    };
  }

  return {
    label: status || 'Outstanding',
    className: 'border-gray-200 bg-gray-50 text-gray-700',
  };
}

function getStatusHelp(statuses: string[]) {
  if (statuses.includes('disputed')) {
    return 'This player claimed payment, but it was not verified. Mark it paid late if money arrived, or write it off if it will not be collected.';
  }

  if (statuses.includes('claimed')) {
    return 'This player said they paid, but the payment was never confirmed during the event.';
  }

  if (statuses.includes('expected')) {
    return 'This player selected pay host or pay later. Money is expected but not confirmed.';
  }

  return 'This payment is outstanding.';
}

function getDefaultNoteForSelectedPlayer(row: UnpaidPlayerRow | null): string {
  if (!row) return '';

  const statuses = getStatusList(row);
  const existingNotes = String((row as any).existingNotes || '').trim();

  if (existingNotes) return existingNotes;

  if (statuses.includes('disputed')) {
    return 'Payment was disputed during reconciliation. Follow-up required.';
  }

  if (statuses.includes('claimed')) {
    return 'Player claimed payment during the event. Payment resolved after the event.';
  }

  if (statuses.includes('expected')) {
    return 'Payment collected after the event.';
  }

  return '';
}

function StatusPills({ statuses }: { statuses: string[] }) {
  if (statuses.length === 0) {
    const badge = getStatusBadge('outstanding');

    return (
      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
        Outstanding
      </span>
    );
  }

  return (
    <>
      {statuses.map((status) => {
        const badge = getStatusBadge(status);

        return (
          <span
            key={status}
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        );
      })}
    </>
  );
}

function moneyToInput(value: unknown): string {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num.toFixed(2) : '0.00';
}

function parseMoneyInput(value: string): number {
  const cleaned = String(value || '')
    .replace(/[^\d.-]/g, '')
    .trim();

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed * 100) / 100);
}

export default function MarkLatePaymentModal({
  isOpen,
  onClose,
  roomId,
  currencySymbol = '€',
  confirmedBy,
  confirmedByName,
  confirmedByRole,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<UnpaidPlayerRow[]>([]);
  const [search, setSearch] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pay_admin');
  const [clubPaymentMethodId, setClubPaymentMethodId] = useState<number | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const [entryAmountInput, setEntryAmountInput] = useState('0.00');
  const [extrasAmountInput, setExtrasAmountInput] = useState('0.00');
  const [paymentReferenceInput, setPaymentReferenceInput] = useState('');

  const [savingAction, setSavingAction] = useState<'paid_late' | 'write_off' | null>(null);
  const [showWriteOffConfirm, setShowWriteOffConfirm] = useState(false);
  const [error, setError] = useState<string>('');

  const saving = savingAction !== null;

  const fmt = (amount: number | string | null | undefined) =>
    `${currencySymbol}${Number(amount || 0).toFixed(2)}`;

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSearch('');
    setSelectedPlayerId('');
    setPaymentMethod('pay_admin');
    setClubPaymentMethodId(null);
    setAdminNotes('');
    setEntryAmountInput('0.00');
    setExtrasAmountInput('0.00');
    setPaymentReferenceInput('');
    setShowWriteOffConfirm(false);

    if (!roomId) return;

    setLoading(true);

    QuizLatePaymentsService.getUnpaidPlayers(roomId)
      .then((res) => {
        setPlayers(res.players || []);
      })
      .catch((e: any) => {
        setError(e?.message || 'Failed to load outstanding players');
      })
      .finally(() => setLoading(false));
  }, [isOpen, roomId]);

  const norm = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

  const filtered = useMemo(() => {
    if (!search.trim()) return players;

    const q = norm(search.trim());

    return players.filter((p) => norm(p.playerName || '').includes(q));
  }, [players, search]);

  const selected = useMemo(
    () => players.find((p) => p.playerId === selectedPlayerId) || null,
    [players, selectedPlayerId]
  );

  const selectedStatuses = selected ? getStatusList(selected) : [];
  const selectedHelp = selected ? getStatusHelp(selectedStatuses) : '';
  const selectedExistingMethod = selected
    ? normalisePaymentMethodForSelect((selected as any).paymentMethod)
    : null;

  const originalEntryAmount = selected ? Number(selected.entryFeeOutstanding || 0) : 0;
  const originalExtrasAmount = selected ? Number(selected.extrasOutstanding || 0) : 0;
  const originalTotalAmount = selected ? Number(selected.totalOutstanding || 0) : 0;

  const receivedEntryAmount = parseMoneyInput(entryAmountInput);
  const receivedExtrasAmount = parseMoneyInput(extrasAmountInput);
  const receivedTotalAmount = receivedEntryAmount + receivedExtrasAmount;
  const amountDifference = receivedTotalAmount - originalTotalAmount;
  const amountWasAdjusted = Math.abs(amountDifference) >= 0.01;

  const totalOutstanding = useMemo(
    () => players.reduce((sum, p) => sum + Number(p.totalOutstanding || 0), 0),
    [players]
  );

  const disputedCount = useMemo(
    () => players.filter((p) => getStatusList(p).includes('disputed')).length,
    [players]
  );

  useEffect(() => {
    if (!selected) return;

    setShowWriteOffConfirm(false);
    setPaymentMethod(normalisePaymentMethodForSelect((selected as any).paymentMethod));

    const rawClubMethodId = (selected as any).clubPaymentMethodId;
    setClubPaymentMethodId(
      rawClubMethodId !== null && rawClubMethodId !== undefined && rawClubMethodId !== ''
        ? Number(rawClubMethodId)
        : null
    );

    setEntryAmountInput(moneyToInput(selected.entryFeeOutstanding));
    setExtrasAmountInput(moneyToInput(selected.extrasOutstanding));
    setPaymentReferenceInput(String((selected as any).paymentReference || '').trim());
    setAdminNotes(getDefaultNoteForSelectedPlayer(selected));
  }, [selected]);

  const canSave = !!roomId && !!selectedPlayerId && !saving && !!confirmedBy;
  const canMarkPaidLate = canSave && receivedTotalAmount > 0;

  const removeSelectedFromList = () => {
    setPlayers((prev) => prev.filter((p) => p.playerId !== selectedPlayerId));
    setSelectedPlayerId('');
    setShowWriteOffConfirm(false);
  };

  const buildLatePaymentNote = () => {
    const baseNote = adminNotes?.trim() || 'Payment collected after the event.';

    if (!amountWasAdjusted) return baseNote;

    return `${baseNote} Amount adjusted during late payment resolution. Expected ${fmt(
      originalTotalAmount
    )}; received ${fmt(receivedTotalAmount)}.`;
  };

  const handleMarkPaidLate = async () => {
    if (!canMarkPaidLate) {
      if (canSave && receivedTotalAmount <= 0) {
        setError('Received amount must be greater than zero to mark as paid late.');
      }
      return;
    }

    const note = buildLatePaymentNote();

    setSavingAction('paid_late');
    setError('');

    try {
      const res = await QuizLatePaymentsService.markLatePaid({
        roomId,
        playerId: selectedPlayerId,
        paymentMethod,
        clubPaymentMethodId,
        paymentReference: paymentReferenceInput.trim() || null,
        entryFeeAmount: receivedEntryAmount,
        extrasAmount: receivedExtrasAmount,
        adminNotes: note,
        confirmedBy,
        confirmedByName: confirmedByName || null,
        confirmedByRole: confirmedByRole || null,
      } as any);

      if (debug) console.log('[MarkLatePaymentModal] ✅ markLatePaid', res);

      removeSelectedFromList();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to mark payment as paid late');
    } finally {
      setSavingAction(null);
    }
  };

  const openWriteOffConfirm = () => {
    if (!canSave) return;

    if (!adminNotes.trim()) {
      setAdminNotes('Player never paid. Written off by club after event.');
    }

    setShowWriteOffConfirm(true);
  };

  const handleConfirmWriteOff = async () => {
    if (!canSave) return;

    const note = adminNotes?.trim() || 'Player never paid. Written off by club after event.';

    setSavingAction('write_off');
    setError('');

    try {
      const res = await QuizLatePaymentsService.writeOffPayment({
        roomId,
        playerId: selectedPlayerId,
        adminNotes: note,
        confirmedBy,
        confirmedByName: confirmedByName || null,
        confirmedByRole: confirmedByRole || null,
      });

      if (debug) console.log('[MarkLatePaymentModal] ✅ writeOffPayment', res);

      removeSelectedFromList();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to write off payment');
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onClose={() => !saving && onClose()}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex min-h-screen items-center justify-center p-3 sm:p-4 lg:p-6">
        <div className="fixed inset-0 bg-black/40" aria-hidden="true" />

        <div className="relative z-50 flex h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl lg:h-[88vh] xl:h-[84vh]">
          {/* Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-indigo-50 via-white to-white px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Dialog.Title className="text-lg font-bold text-gray-950 sm:text-xl">
                  Resolve Outstanding Payments
                </Dialog.Title>
                <p className="mt-1 max-w-2xl text-xs text-gray-600 sm:text-sm">
                  Confirm late money received, update the actual amount/reference if needed, or write off payments that will not be collected.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:items-center">
                <div className="grid grid-cols-3 gap-2 lg:min-w-[430px]">
                  <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      Outstanding
                    </div>
                    <div className="mt-0.5 text-base font-bold text-gray-950">{players.length}</div>
                  </div>

                  <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-red-600">
                      Disputed
                    </div>
                    <div className="mt-0.5 text-base font-bold text-red-800">{disputedCount}</div>
                  </div>

                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
                      Total
                    </div>
                    <div className="mt-0.5 text-base font-bold text-indigo-900">
                      {fmt(totalOutstanding)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="self-start rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 lg:self-center"
                >
                  Close
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-5">
              {error}
            </div>
          )}

          {/* Content */}
          <div className="min-h-0 flex-1 overflow-hidden p-4 sm:p-5">
            {showWriteOffConfirm && selected ? (
              <div className="mx-auto max-w-3xl rounded-2xl border-2 border-red-200 bg-red-50 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 text-2xl">
                    ⚠️
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-red-950">Confirm write-off</h3>
                    <p className="mt-2 text-sm text-red-800">
                      This closes the outstanding amount as not collected. It will not be included in received totals, but the audit note will remain on the ledger.
                    </p>

                    <div className="mt-5 grid gap-3 rounded-xl bg-white p-4 text-sm sm:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Player
                        </div>
                        <div className="mt-1 font-bold text-gray-950">{selected.playerName}</div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Outstanding
                        </div>
                        <div className="mt-1 font-bold text-gray-950">
                          {fmt(originalTotalAmount)}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Status
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <StatusPills statuses={selectedStatuses} />
                        </div>
                      </div>

                      {paymentReferenceInput && (
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Reference
                          </div>
                          <div className="mt-1 break-all font-semibold text-gray-950">
                            {paymentReferenceInput}
                          </div>
                        </div>
                      )}

                      <div className="sm:col-span-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Note saved to ledger
                        </div>
                        <div className="mt-1 rounded-lg bg-gray-50 p-3 text-gray-800">
                          {adminNotes?.trim() || 'Player never paid. Written off by club after event.'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setShowWriteOffConfirm(false)}
                        disabled={saving}
                        className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-800 ring-1 ring-gray-300 hover:bg-gray-50 disabled:opacity-50 sm:min-w-36"
                      >
                        Go Back
                      </button>

                      <button
                        type="button"
                        onClick={handleConfirmWriteOff}
                        disabled={!canSave}
                        className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:min-w-44 ${
                          canSave ? 'bg-red-600 hover:bg-red-700' : 'cursor-not-allowed bg-gray-400'
                        }`}
                      >
                        {savingAction === 'write_off' ? 'Writing off…' : 'Yes, Write Off'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(360px,0.95fr)_minmax(430px,1.05fr)]">
                {/* Left: players */}
                <section className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-100 p-3.5">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="font-bold text-gray-950">Choose a player</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Select one player at a time to resolve their outstanding payment.
                        </p>
                      </div>

                      {loading && <span className="text-xs text-gray-500">Loading…</span>}
                    </div>

                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      placeholder="Search by player name…"
                      disabled={saving}
                    />
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {filtered.length === 0 ? (
                      <div className="p-6 text-center text-sm text-gray-600">
                        {loading ? 'Loading…' : 'No outstanding players found.'}
                      </div>
                    ) : (
                      <ul className="divide-y divide-gray-100">
                        {filtered.map((p) => {
                          const selectedRow = selectedPlayerId === p.playerId;
                          const statuses = getStatusList(p);
                          const paymentReference = String((p as any).paymentReference || '').trim();
                          const rowPaymentMethod = normalisePaymentMethodForSelect(
                            (p as any).paymentMethod
                          );

                          return (
                            <li key={p.playerId}>
                              <button
                                type="button"
                                onClick={() => !saving && setSelectedPlayerId(p.playerId)}
                                disabled={saving}
                                className={`group w-full border-l-4 p-4 text-left transition ${
                                  selectedRow
                                    ? 'border-l-indigo-600 bg-indigo-100 ring-1 ring-inset ring-indigo-300'
                                    : 'border-l-transparent hover:border-l-indigo-300 hover:bg-indigo-50/80'
                                } ${saving ? 'cursor-not-allowed opacity-75' : ''}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="truncate font-bold text-gray-950 group-hover:text-indigo-900">
                                        {p.playerName}
                                      </div>

                                      {selectedRow && (
                                        <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-bold text-white">
                                          Selected
                                        </span>
                                      )}
                                    </div>

                                    <div className="mt-2 flex flex-wrap gap-1">
                                      <StatusPills statuses={statuses} />

                                      {(p as any).paymentMethod && (
                                        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                          {getPaymentMethodLabel(rowPaymentMethod)}
                                        </span>
                                      )}
                                    </div>

                                    {paymentReference && (
                                      <div className="mt-2 text-xs text-gray-500">
                                        Ref: <span className="font-semibold">{paymentReference}</span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex-shrink-0 text-right">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                      Owed
                                    </div>
                                    <div className="mt-1 text-base font-bold text-gray-950">
                                      {fmt(p.totalOutstanding)}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </section>

                {/* Right: selected details */}
                <section className="min-h-0 min-w-0 overflow-y-auto rounded-2xl border border-gray-200 bg-gray-50 p-3.5 sm:p-4">
                  {!selected ? (
                    <div className="flex min-h-[340px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-8 text-center">
                      <div className="text-4xl">🧾</div>
                      <h3 className="mt-3 text-lg font-bold text-gray-950">Select a player</h3>
                      <p className="mt-2 max-w-sm text-sm text-gray-600">
                        Pick an outstanding payment from the list to see details and choose how to resolve it.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-gray-200">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h3 className="truncate text-xl font-bold text-gray-950">
                              {selected.playerName}
                            </h3>
                            <p className="mt-1 text-xs leading-5 text-gray-600">{selectedHelp}</p>
                          </div>

                          <div className="rounded-xl bg-indigo-50 px-3 py-2 text-right">
                            <div className="text-xs font-bold uppercase tracking-wide text-indigo-600">
                              Expected
                            </div>
                            <div className="mt-0.5 text-xl font-black text-indigo-950">
                              {fmt(originalTotalAmount)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <StatusPills statuses={selectedStatuses} />

                          {selectedExistingMethod && (
                            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                              {getPaymentMethodLabel(selectedExistingMethod)}
                            </span>
                          )}
                        </div>

                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                          <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Entry received
                            </label>
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-sm font-bold text-gray-500">
                                {currencySymbol}
                              </span>
                              <input
                                value={entryAmountInput}
                                onChange={(e) => setEntryAmountInput(e.target.value)}
                                onBlur={() => setEntryAmountInput(moneyToInput(parseMoneyInput(entryAmountInput)))}
                                inputMode="decimal"
                                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-bold text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                disabled={saving}
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-gray-500">
                              Expected {fmt(originalEntryAmount)}
                            </p>
                          </div>

                          <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Extras received
                            </label>
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-sm font-bold text-gray-500">
                                {currencySymbol}
                              </span>
                              <input
                                value={extrasAmountInput}
                                onChange={(e) => setExtrasAmountInput(e.target.value)}
                                onBlur={() => setExtrasAmountInput(moneyToInput(parseMoneyInput(extrasAmountInput)))}
                                inputMode="decimal"
                                className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-bold text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                disabled={saving}
                              />
                            </div>
                            <p className="mt-1 text-[11px] text-gray-500">
                              Expected {fmt(originalExtrasAmount)}
                            </p>
                          </div>

                          <div className="rounded-xl bg-gray-50 px-3 py-2.5">
                            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              Payment reference
                            </label>
                            <input
                              value={paymentReferenceInput}
                              onChange={(e) => setPaymentReferenceInput(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm font-bold text-gray-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              placeholder="Optional"
                              disabled={saving}
                            />
                            <p className="mt-1 text-[11px] text-gray-500">
                              New or updated reference
                            </p>
                          </div>
                        </div>

                        <div
                          className={`mt-3 rounded-xl border p-3 ${
                            amountWasAdjusted
                              ? amountDifference < 0
                                ? 'border-amber-200 bg-amber-50'
                                : 'border-green-200 bg-green-50'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Received total
                              </p>
                              <p className="mt-1 text-xl font-black text-gray-950">
                                {fmt(receivedTotalAmount)}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Difference
                              </p>
                              <p
                                className={`mt-1 text-sm font-bold ${
                                  amountDifference < 0
                                    ? 'text-amber-700'
                                    : amountDifference > 0
                                      ? 'text-green-700'
                                      : 'text-gray-700'
                                }`}
                              >
                                {amountDifference === 0
                                  ? 'No change'
                                  : `${amountDifference > 0 ? '+' : ''}${fmt(amountDifference)}`}
                              </p>
                            </div>
                          </div>

                          {amountWasAdjusted && (
                            <p className="mt-2 text-xs text-gray-700">
                              This adjustment will be recorded in the ledger note when the late payment is confirmed.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-gray-200">
                        <h4 className="font-bold text-gray-950">Resolution details</h4>
                        <p className="mt-1 text-xs text-gray-500">
                          These details are saved to the payment ledger.
                        </p>

                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                              Payment method
                            </label>
                            <select
                              value={paymentMethod}
                              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              disabled={saving}
                            >
                              <option value="pay_admin">🧾 Pay Admin</option>
                              <option value="cash">💶 Cash</option>
                              <option value="instant_payment">📱 Instant payment</option>
                              <option value="card">💳 Card tap</option>
                              <option value="stripe">💻 Stripe</option>
                              <option value="other">❓ Other</option>
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-semibold text-gray-700">
                              Saved method ID
                            </label>
                            <input
                              type="number"
                              value={clubPaymentMethodId ?? ''}
                              onChange={(e) =>
                                setClubPaymentMethodId(e.target.value ? Number(e.target.value) : null)
                              }
                              className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              placeholder="Optional"
                              disabled={saving}
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="mb-1 block text-sm font-semibold text-gray-700">
                            Notes
                          </label>
                          <textarea
                            value={adminNotes}
                            onChange={(e) => setAdminNotes(e.target.value)}
                            className="min-h-[70px] w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                            placeholder={
                              selectedStatuses.includes('disputed')
                                ? 'e.g. Player never paid / Revolut later confirmed'
                                : 'e.g. Paid after event ended'
                            }
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>

          {/* Footer */}
          {!showWriteOffConfirm && (
            <div className="border-t border-gray-200 bg-white px-4 py-3 sm:px-5">
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={saving}
                  className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-200 disabled:opacity-50 sm:min-w-32"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={openWriteOffConfirm}
                  disabled={!canSave}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:min-w-44 ${
                    canSave ? 'bg-red-600 hover:bg-red-700' : 'cursor-not-allowed bg-gray-400'
                  }`}
                >
                  Write Off as Not Paid
                </button>

                <button
                  type="button"
                  onClick={handleMarkPaidLate}
                  disabled={!canMarkPaidLate}
                  className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white sm:min-w-44 ${
                    canMarkPaidLate ? 'bg-indigo-600 hover:bg-indigo-700' : 'cursor-not-allowed bg-gray-400'
                  }`}
                >
                  {savingAction === 'paid_late' ? 'Saving…' : 'Mark Paid Late'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}