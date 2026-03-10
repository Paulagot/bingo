import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import QuizLatePaymentsService, { type UnpaidPlayerRow } from '../services/QuizLatePaymentsService';

type PaymentMethod = 'pay_admin' | 'cash' | 'instant_payment' | 'card' | 'stripe' | 'other';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;

  // until backend derives identity from auth
  confirmedBy: string;
  confirmedByName?: string;
  confirmedByRole?: 'host' | 'admin';
}

const debug = true;

export default function MarkLatePaymentModal({
  isOpen,
  onClose,
  roomId,
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSearch('');
    setSelectedPlayerId('');
    setPaymentMethod('pay_admin');
    setClubPaymentMethodId(null);
    setAdminNotes('');

    if (!roomId) return;

    setLoading(true);
    QuizLatePaymentsService.getUnpaidPlayers(roomId)
      .then((res) => {
        setPlayers(res.players || []);
      })
      .catch((e: any) => {
        setError(e?.message || 'Failed to load unpaid players');
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

  const canSave = !!roomId && !!selectedPlayerId && !saving && !!confirmedBy;

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    setError('');

    try {
      const res = await QuizLatePaymentsService.markLatePaid({
        roomId,
        playerId: selectedPlayerId,
        paymentMethod,
        clubPaymentMethodId,
        adminNotes: adminNotes?.trim() || null,
        confirmedBy,
        confirmedByName: confirmedByName || null,
        confirmedByRole: confirmedByRole || null,
      });

      if (debug) console.log('[MarkLatePaymentModal] ✅ markLatePaid', res);

      // remove from local list so UI updates instantly
      setPlayers((prev) => prev.filter((p) => p.playerId !== selectedPlayerId));
      setSelectedPlayerId('');

      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to mark payment as late');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={() => !saving && onClose()} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="relative z-50 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
          <Dialog.Title className="text-xl font-bold text-gray-900">Mark Player Paid Late</Dialog.Title>
          <p className="mt-1 text-sm text-gray-600">
            This updates the payment ledger in the database and flags the payment as late.
          </p>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Search */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Search unpaid players</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="Type a name…"
            />
          </div>

          {/* List */}
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Unpaid Players ({filtered.length})
              </label>
              {loading && <span className="text-xs text-gray-500">Loading…</span>}
            </div>

            <div className="max-h-64 overflow-auto rounded-lg border border-gray-200">
              {filtered.length === 0 ? (
                <div className="p-4 text-sm text-gray-600">
                  {loading ? 'Loading…' : 'No unpaid players found.'}
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filtered.map((p) => {
                    const selectedRow = selectedPlayerId === p.playerId;
                    return (
                      <li
                        key={p.playerId}
                        onClick={() => setSelectedPlayerId(p.playerId)}
                        className={`cursor-pointer p-3 ${selectedRow ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-gray-900">{p.playerName}</div>
                            <div className="mt-0.5 text-xs text-gray-600">
                              Outstanding: {Number(p.totalOutstanding || 0).toFixed(2)}
                            </div>
                          </div>
                          <input type="radio" checked={selectedRow} onChange={() => setSelectedPlayerId(p.playerId)} />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selected && (
              <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
                Selected: <span className="font-semibold">{selected.playerName}</span>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Payment method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="pay_admin">🧾 Pay Admin (manual)</option>
                <option value="cash">💶 Cash</option>
                <option value="instant_payment">📱 Instant payment</option>
                <option value="card">💳 Card Tap</option>
                <option value="stripe">💻 Stripe</option>
                <option value="other">❓ Other</option>
              </select>
            </div>

            {/* Optional: only needed if you want to link to a specific saved payment method */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Saved club method (optional)</label>
              <input
                type="number"
                value={clubPaymentMethodId ?? ''}
                onChange={(e) => setClubPaymentMethodId(e.target.value ? Number(e.target.value) : null)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="club_payment_method_id"
              />
              <p className="mt-1 text-xs text-gray-500">
                If you already have a selector component for club payment methods, swap this input for it.
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Notes (optional)</label>
            <input
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
              placeholder="e.g. Paid after event ended"
            />
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="w-1/2 rounded-lg bg-gray-200 py-2 font-semibold text-gray-800 hover:bg-gray-300 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className={`w-1/2 rounded-lg py-2 font-semibold text-white ${
                canSave ? 'bg-indigo-600 hover:bg-indigo-700' : 'cursor-not-allowed bg-gray-400'
              }`}
            >
              {saving ? 'Saving…' : 'Mark Paid Late'}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
