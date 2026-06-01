import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EliminationAdminsTab } from '../EliminationAdminsTab';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  UserPlus,
  Search,
  Loader2,
  Shield,
  Scale,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EliminationPlayer {
  id: string;
  name: string;
  paid?: boolean;
  paymentClaimed?: boolean;
  payAtDoor?: boolean;
  paymentMethod?: string;
  paymentMethodLabel?: string;
  paymentReference?: string;
  eliminated?: boolean;
  isWeb3?: boolean;
  walletAddress?: string;
  donationAmount?: number;
  entryFee?: number;
}

type PaymentStatus = 'paid' | 'pending' | 'unpaid';
type ActiveTab = 'players' | 'payments' | 'admins' | 'reconcile';

interface ClubPaymentMethod {
  id: number;
  providerName: string;
  methodLabel: string;
  methodCategory: string;
  methodConfig?: {
    link?: string;
    handle?: string;
    qr_code_url?: string;
  };
}

interface EliminationHostDashboardProps {
  roomId: string;
  hostId: string;
  socket: any;
  initialPlayers?: any[];
  entryFee?: number;
  currency?: string;
  /** True once the game has ended and the host is in the reconciliation phase */
  gameEnded?: boolean;
}

// ─── Normalise elimination player shape ───────────────────────────────────────

function normalise(raw: any): EliminationPlayer {
  return {
    id:                 raw.playerId ?? raw.id ?? '',
    name:               raw.name ?? '',
    paid:               raw.paid ?? false,
    paymentClaimed:     raw.paymentClaimed ?? false,
    payAtDoor:          raw.payAtDoor ?? false,
    paymentMethod:      raw.paymentMethod ?? undefined,
    paymentMethodLabel: raw.paymentMethodLabel ?? undefined,
    paymentReference:   raw.paymentReference ?? undefined,
    eliminated:         raw.eliminated ?? false,
    isWeb3:             raw.isWeb3 ?? false,
    walletAddress:      raw.walletAddress ?? undefined,
    entryFee:           raw.entryFee ?? undefined,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getPaymentStatus(player: EliminationPlayer): PaymentStatus {
  if (player.paid) return 'paid';
  if (player.paymentClaimed) return 'pending';
  return 'unpaid';
}

function getPaymentLabel(player: EliminationPlayer, methods?: ClubPaymentMethod[]): string {
  if (player.paymentMethodLabel) return player.paymentMethodLabel;
  if (methods && player.paymentMethod) {
    const match = methods.find(m => m.providerName === player.paymentMethod);
    if (match) return match.methodLabel;
  }
  const raw   = player.paymentMethod || '';
  const lower = raw.toLowerCase();
  if (lower === 'cash')                          return 'Cash';
  if (lower === 'card_tap' || lower === 'cardtap') return 'Card (tap)';
  if (lower === 'instant_payment')               return 'Instant payment';
  if (lower === 'pay_admin')                     return 'Pay host';
  if (lower === 'stripe' || lower === 'card')    return 'Card (Stripe)';
  if (lower === 'crypto' || lower === 'web3')    return 'Crypto / Web3';
  return raw || '—';
}

function isPayAtDoorMethod(player: EliminationPlayer): boolean {
  const m = (player.paymentMethod || '').toLowerCase();
  return player.payAtDoor || m === 'pay_admin' || m === 'cash' || m === 'card_tap';
}

function isInstantPaymentWithReference(player: EliminationPlayer): boolean {
  return !!player.paymentClaimed && !!player.paymentReference;
}

function norm(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

// ─── Payment status badge ─────────────────────────────────────────────────────

const PaymentBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  if (status === 'paid') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-900/60 border border-green-500/50 px-2 py-0.5 text-xs font-semibold text-green-300">
        <CheckCircle2 className="h-3 w-3" /> Paid
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-900/60 border border-yellow-500/50 px-2 py-0.5 text-xs font-semibold text-yellow-300">
        <Clock className="h-3 w-3" /> Pending
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-900/60 border border-red-500/50 px-2 py-0.5 text-xs font-semibold text-red-300">
      <XCircle className="h-3 w-3" /> Unpaid
    </span>
  );
};

// ─── Add / Edit Player modal ──────────────────────────────────────────────────

interface AddEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string;
    paid: boolean;
    paymentMethod: string;
    paymentReference: string;
    clubPaymentMethodId?: number | null;
  }) => void;
  player?: EliminationPlayer | null;
  entryFee: number;
  currency: string;
  clubMethods: ClubPaymentMethod[];
  methodsLoading: boolean;
}

const AddEditModal: React.FC<AddEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  player,
  entryFee,
  currency,
  clubMethods,
  methodsLoading,
}) => {
  const isEditMode = !!player;
  const [name, setName]                 = useState(player?.name ?? '');
  const [paid, setPaid]                 = useState(player?.paid ?? false);
  const [paymentMethod, setPaymentMethod] = useState(player?.paymentMethod ?? '');
  const [ref, setRef]                   = useState(player?.paymentReference ?? '');

  useEffect(() => {
    if (isOpen) {
      setName(player?.name ?? '');
      setPaid(player?.paid ?? false);
      setPaymentMethod(player?.paymentMethod ?? (clubMethods[0]?.providerName ?? 'pay_admin'));
      setRef(player?.paymentReference ?? '');
    }
  }, [isOpen, player, clubMethods]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const selectedMethod = clubMethods.find(m => m.providerName === paymentMethod);
    onSave({
      name: trimmed,
      paid,
      paymentMethod,
      paymentReference: ref.trim(),
      clubPaymentMethodId: selectedMethod?.id ?? null,
    });
    onClose();
  };

  const selectedMethodObj  = clubMethods.find(m => m.providerName === paymentMethod);
  const showReference = selectedMethodObj?.methodCategory === 'instant_payment';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-gray-700 bg-gray-900 p-6 shadow-2xl">
        <h3 className="mb-4 text-lg font-bold text-white">
          {isEditMode ? 'Edit Player' : 'Add Player'}
        </h3>

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Player name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
          />

          <p className="text-sm text-gray-300">
            Entry fee: <span className="font-semibold text-white">{currency}{entryFee.toFixed(2)}</span>
          </p>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-300">
              Payment Method
            </label>

            {methodsLoading ? (
              <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading methods…
              </div>
            ) : clubMethods.length > 0 ? (
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              >
                <option value="pay_admin">Pay Host Directly</option>
                {clubMethods.map(m => (
                  <option key={m.id} value={m.providerName}>{m.methodLabel}</option>
                ))}
              </select>
            ) : (
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
              >
                <option value="pay_admin">Pay Host Directly</option>
                <option value="cash">Cash</option>
                <option value="card_tap">Card (tap)</option>
              </select>
            )}
          </div>

          {showReference && (
            <input
              type="text"
              placeholder="Payment reference (optional)"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
            />
          )}

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={paid}
              onChange={(e) => setPaid(e.target.checked)}
              className="h-4 w-4 accent-indigo-500"
            />
            <span className="text-sm text-gray-200">Mark as paid</span>
          </label>

          <div className="mt-4 flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 rounded-lg bg-gray-700 py-2 text-sm font-semibold text-white hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={!name.trim()}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors">
              {isEditMode ? 'Save Changes' : 'Add Player'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Stats strip ──────────────────────────────────────────────────────────────

const StatsStrip: React.FC<{
  total: number; paid: number; pending: number; eliminated: number;
}> = ({ total, paid, pending, eliminated }) => (
  <div className="grid grid-cols-4 gap-2">
    {[
      { label: 'Players',    value: total,      colour: 'text-white' },
      // Paid and Pending count ALL players including eliminated —
      // elimination status is separate from payment status
      { label: 'Paid',       value: paid,       colour: 'text-green-400' },
      { label: 'Unpaid',     value: pending,    colour: 'text-yellow-400' },
      { label: 'Eliminated', value: eliminated, colour: 'text-red-400' },
    ].map(({ label, value, colour }) => (
      <div key={label} className="rounded-lg border border-gray-700 bg-gray-900 p-2 text-center">
        <p className={`text-xl font-bold ${colour}`}>{value}</p>
        <p className="text-xs text-gray-400">{label}</p>
      </div>
    ))}
  </div>
);

// ─── Player row ───────────────────────────────────────────────────────────────

interface PlayerRowProps {
  player: EliminationPlayer;
  currency: string;
  entryFee: number;
  clubMethods: ClubPaymentMethod[];
  onConfirmPayment: (id: string) => void;
  onEdit: (player: EliminationPlayer) => void;
  onEliminate: (id: string) => void;
  onRestore: (id: string) => void;
}

const PlayerRow: React.FC<PlayerRowProps> = ({
  player, currency, entryFee, clubMethods,
  onConfirmPayment, onEdit, onEliminate, onRestore,
}) => {
  const status       = getPaymentStatus(player);
  const isEliminated = !!player.eliminated;
  const amount       = player.entryFee ?? entryFee;
  const payAtDoor    = isPayAtDoorMethod(player);
  const hasReference = isInstantPaymentWithReference(player);

  return (
    <li className={`rounded-xl border p-3 transition-all ${
      isEliminated ? 'border-red-800 bg-red-950/80' : 'border-gray-700 bg-gray-800 hover:border-gray-500'
    }`}>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`font-semibold ${isEliminated ? 'text-gray-500 line-through' : 'text-white'}`}>
            {player.name}
          </span>
          {!isEliminated && <PaymentBadge status={status} />}
          {isEliminated && (
            <span className="rounded-full border border-red-700 bg-red-950 px-2 py-0.5 text-xs font-semibold text-red-400">
              Eliminated
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <span>{currency}{amount.toFixed(2)}</span>
          {player.paymentMethod && (
            <span className="rounded-full border border-gray-600 bg-gray-700 px-2 py-0.5">
              {getPaymentLabel(player, clubMethods)}
            </span>
          )}
        </div>

        {hasReference && (
          <div className="flex items-center gap-1.5 text-xs text-gray-300">
            <span className="text-gray-500">Ref:</span>
            <code className="rounded bg-gray-700 px-1.5 py-0.5 font-mono text-yellow-300">
              {player.paymentReference}
            </code>
          </div>
        )}

        {!isEliminated && !player.paid && payAtDoor && (
          <p className="text-xs text-gray-400 italic">Collect payment then edit to confirm</p>
        )}
      </div>

      {/* Payment + game action buttons — payment buttons shown for ALL players */}
      <div className="mt-2 flex flex-wrap gap-2">

        {/* Payment actions — independent of elimination status */}
        {status === 'pending' && hasReference && (
          <button onClick={() => onConfirmPayment(player.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/50 bg-green-900/30 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-800/50 transition-colors">
            <CheckCircle2 className="h-3.5 w-3.5" /> Confirm Payment
          </button>
        )}
        {status === 'unpaid' && payAtDoor && (
          <button onClick={() => onEdit(player)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-400/60 bg-indigo-900/40 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-800/50 transition-colors">
            <Pencil className="h-3.5 w-3.5" /> Collect &amp; Confirm
          </button>
        )}
        {status === 'pending' && !hasReference && (
          <>
            <button onClick={() => onConfirmPayment(player.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/50 bg-green-900/30 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-800/50 transition-colors">
              <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
            </button>
            <button onClick={() => onEdit(player)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-900/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-800/40 transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
          </>
        )}
        {status === 'paid' && (
          <button onClick={() => onEdit(player)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-400 hover:bg-gray-700 transition-colors">
            <Pencil className="h-3.5 w-3.5" /> Edit Payment
          </button>
        )}

        {/* Game actions — eliminate or restore */}
        {!isEliminated ? (
          <button onClick={() => onEliminate(player.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-800 bg-red-950 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-900 transition-colors">
            <X className="h-3.5 w-3.5" /> Eliminate
          </button>
        ) : (
          <button onClick={() => onRestore(player.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs font-semibold text-gray-300 hover:bg-gray-700 transition-colors">
            <CheckCircle2 className="h-3.5 w-3.5" /> Restore
          </button>
        )}
      </div>
    </li>
  );
};

// ─── Main dashboard ───────────────────────────────────────────────────────────

export const EliminationHostDashboard: React.FC<EliminationHostDashboardProps> = ({
  roomId,
  hostId,
  socket,
  initialPlayers = [],
  entryFee = 0,
  currency = '€',
  gameEnded = false,
}) => {
  const [isOpen, setIsOpen]         = useState(false);
  const [activeTab, setActiveTab]   = useState<ActiveTab>('players');
  const [players, setPlayers]       = useState<EliminationPlayer[]>(() => initialPlayers.map(normalise));
  const [searchTerm, setSearchTerm] = useState('');
  const [addEditModal, setAddEditModal] = useState<{ open: boolean; player: EliminationPlayer | null }>({ open: false, player: null });
  const [newName, setNewName]       = useState('');
  const [clubMethods, setClubMethods]   = useState<ClubPaymentMethod[]>([]);
  const [methodsLoading, setMethodsLoading] = useState(false);

  // ── Auto-open + switch to Reconcile tab when game ends ───────────────────
  useEffect(() => {
    if (gameEnded) {
      setIsOpen(true);
      setActiveTab('reconcile');
    }
  }, [gameEnded]);

  // ── Fetch room payment methods ────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    setMethodsLoading(true);
    fetch(`/api/elimination/rooms/${roomId}/available-payment-methods`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => {
        const methods = (data.paymentMethods ?? []).filter(
          (m: ClubPaymentMethod) => m.methodCategory !== 'stripe'
        );
        setClubMethods(methods);
      })
      .catch(() => setClubMethods([]))
      .finally(() => setMethodsLoading(false));
  }, [roomId]);

  // ── Sync players from parent ──────────────────────────────────────────────
  useEffect(() => {
    setPlayers(initialPlayers.map(normalise));
  }, [initialPlayers]);

  // ── Socket listeners ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !roomId) return;

    const handleWaitingRoomUpdate = ({ players: updated }: { players: any[] }) => {
      setPlayers(updated.map(normalise));
    };
    const handlePaymentConfirmed = ({ playerId, paid }: { playerId: string; paid: boolean }) => {
      setPlayers(prev =>
        prev.map(p => p.id === playerId ? { ...p, paid, paymentClaimed: false } : p)
      );
    };

    socket.on('elimination_waiting_room_update', handleWaitingRoomUpdate);
    socket.on('payment_confirmed', handlePaymentConfirmed);
    return () => {
      socket.off('elimination_waiting_room_update', handleWaitingRoomUpdate);
      socket.off('payment_confirmed', handlePaymentConfirmed);
    };
  }, [socket, roomId]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredPlayers = useMemo(() => {
    if (!searchTerm.trim()) return players;
    const q = norm(searchTerm.trim());
    return players.filter(p => norm(p.name).includes(q));
  }, [players, searchTerm]);

  const activePlayers     = filteredPlayers.filter(p => !p.eliminated);
  const eliminatedPlayers = filteredPlayers.filter(p => p.eliminated);

  // Payment counts include ALL players regardless of elimination status.
  // A player being eliminated doesn't cancel their payment obligation.
  const paidCount    = players.filter(p => p.paid).length;
  const pendingCount = players.filter(
    p => !p.paid && (p.paymentClaimed || isPayAtDoorMethod(p))
  ).length;
  const eliminatedCount = players.filter(p => p.eliminated).length;

  // Payments that need action — ALL players with unconfirmed payments,
  // including eliminated ones (host still needs to collect/confirm their fee).
  const actionRequired = players.filter(
    p => !p.paid && (p.paymentClaimed || isPayAtDoorMethod(p))
  );

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleConfirmPayment = useCallback((playerId: string) => {
    if (!socket || !roomId) return;
    setPlayers(prev =>
      prev.map(p => p.id === playerId ? { ...p, paid: true, paymentClaimed: false } : p)
    );
    socket.emit('confirm_player_payment', {
      roomId,
      playerId,
      confirmedBy: { id: hostId, role: 'host' },
      adminNotes: 'Confirmed by host in elimination dashboard',
    });
  }, [socket, roomId, hostId]);

  const handleEliminate = useCallback((playerId: string) => {
    if (!socket || !roomId) return;
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, eliminated: true } : p));
    socket.emit('eliminate_player', { roomId, playerId });
  }, [socket, roomId]);

  const handleRestore = useCallback((playerId: string) => {
    if (!socket || !roomId) return;
    setPlayers(prev => prev.map(p => p.id === playerId ? { ...p, eliminated: false } : p));
    socket.emit('restore_player', { roomId, playerId });
  }, [socket, roomId]);

  const handleAddOrEditSave = useCallback((data: {
    name: string;
    paid: boolean;
    paymentMethod: string;
    paymentReference: string;
    clubPaymentMethodId?: number | null;
  }) => {
    if (!socket || !roomId) return;
    const target = addEditModal.player;

    if (target) {
      const updated = { ...target, ...data };
      setPlayers(prev => prev.map(p => p.id === target.id ? updated : p));
      socket.emit('update_player', { roomId, player: updated });

      if (data.paid && !target.paid) {
        const selectedMethod = clubMethods.find(m => m.providerName === data.paymentMethod);
        socket.emit('confirm_player_payment', {
          roomId,
          playerId: target.id,
          confirmedBy: { id: hostId, role: 'host' },
          adminNotes: `Payment collected — method: ${data.paymentMethod}`,
          paymentMethod: data.paymentMethod ?? null,
          clubPaymentMethodId: data.clubPaymentMethodId ?? selectedMethod?.id ?? null,
        });
      }
    } else {
      const newPlayer: EliminationPlayer = {
        id: `host-${Date.now()}`,
        name: data.name,
        paid: data.paid,
        paymentMethod: data.paymentMethod,
        paymentReference: data.paymentReference,
        entryFee,
        eliminated: false,
      };
      setPlayers(prev => [...prev, newPlayer]);
      socket.emit('host_add_player', { roomId, player: newPlayer });
    }
  }, [socket, roomId, addEditModal.player, entryFee, hostId, clubMethods]);

  // ── Payments tab ──────────────────────────────────────────────────────────
  const PaymentsTab = () => (
    <div className="space-y-3">
      {actionRequired.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 text-green-400" />
          <p className="font-semibold text-white">All payments confirmed</p>
          <p className="mt-1 text-sm text-gray-400">No pending or pay-at-door players.</p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border border-yellow-700 bg-yellow-950 px-4 py-3 text-sm text-yellow-300">
            <strong>{actionRequired.length}</strong> player{actionRequired.length !== 1 ? 's' : ''} need payment confirmation
          </div>
          <ul className="space-y-2">
            {actionRequired.map(player => {
              const hasRef    = isInstantPaymentWithReference(player);
              const payAtDoor = isPayAtDoorMethod(player);
              return (
                <li key={player.id} className="rounded-xl border border-gray-700 bg-gray-800 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{player.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                        <PaymentBadge status={getPaymentStatus(player)} />
                        {player.paymentMethod && (
                          <span>{getPaymentLabel(player, clubMethods)}</span>
                        )}
                        <span>{currency}{(player.entryFee ?? entryFee).toFixed(2)}</span>
                      </div>
                      {hasRef && (
                        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                          <span className="text-gray-500">Ref:</span>
                          <code className="rounded bg-gray-700 px-1.5 py-0.5 font-mono text-yellow-300">
                            {player.paymentReference}
                          </code>
                        </div>
                      )}
                      {payAtDoor && (
                        <p className="mt-1 text-xs text-gray-400 italic">
                          Collect payment then edit to confirm
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {hasRef && (
                        <button onClick={() => handleConfirmPayment(player.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/50 bg-green-900/40 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-800/50 transition-colors">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Confirm
                        </button>
                      )}
                      <button onClick={() => setAddEditModal({ open: true, player })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-900/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-800/40 transition-colors">
                        <Pencil className="h-3.5 w-3.5" />
                        {payAtDoor ? 'Collect & Confirm' : 'Edit'}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );

  // ── Reconcile tab content ─────────────────────────────────────────────────
  // The actual reconciliation UI is a full-screen panel rendered by EliminationGamePage.
  // This tab shows a contextual summary so the host understands what's happening.
  const ReconcileTab = () => (
    <div className="space-y-4 py-2">
      <div className="rounded-xl border border-indigo-500/30 bg-indigo-900/20 p-4">
        <div className="flex items-start gap-3">
          <Scale className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-white text-sm">Reconciliation in progress</p>
            <p className="text-xs text-gray-400 mt-1">
              Complete the reconciliation form on the main screen. You can still confirm
              payments from the Payments tab while reconciling.
            </p>
          </div>
        </div>
      </div>

      {pendingCount > 0 && (
        <div className="rounded-xl border border-yellow-600/30 bg-yellow-900/20 p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-yellow-300 text-sm">
                {pendingCount} payment{pendingCount !== 1 ? 's' : ''} still pending
              </p>
              <p className="text-xs text-yellow-400/70 mt-1">
                Resolve these in the Payments tab before approving reconciliation.
              </p>
              <button
                onClick={() => setActiveTab('payments')}
                className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-yellow-500/40 bg-yellow-900/30 px-3 py-1.5 text-xs font-semibold text-yellow-300 hover:bg-yellow-800/40 transition-colors"
              >
                <CreditCard className="h-3.5 w-3.5" /> Go to Payments
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
        <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-2">Summary</p>
        <div className="space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Total players</span>
            <span className="text-white font-semibold">{players.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Confirmed paid</span>
            <span className="text-green-400 font-semibold">{paidCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Pending</span>
            <span className="text-yellow-400 font-semibold">{pendingCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Eliminated</span>
            <span className="text-red-400 font-semibold">{eliminatedCount}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Tab definitions ───────────────────────────────────────────────────────
  const tabs = [
    {
      id:    'players'   as const,
      label: 'Players',
      icon:  <Users className="h-4 w-4" />,
      badge: null as number | '!' | null,
    },
    {
      id:    'payments'  as const,
      label: 'Payments',
      icon:  <CreditCard className="h-4 w-4" />,
      badge: pendingCount > 0 ? pendingCount : null as number | '!' | null,
    },
    {
      id:    'admins'    as const,
      label: 'Admins',
      icon:  <Shield className="h-4 w-4" />,
      badge: null as number | '!' | null,
    },
    // Reconcile tab only shown after the game ends
    ...(gameEnded ? [{
      id:    'reconcile' as const,
      label: 'Reconcile',
      icon:  <Scale className="h-4 w-4" />,
      badge: '!' as number | '!' | null,
    }] : []),
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-2xl border border-gray-600 bg-gray-900 px-4 py-3 text-sm font-bold text-white shadow-2xl hover:bg-gray-800 transition-colors"
        aria-label="Toggle host dashboard"
      >
        <Users className="h-5 w-5 text-indigo-400" />
        <span>Host</span>
        {pendingCount > 0 && !gameEnded && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500 text-xs font-bold text-black">
            {pendingCount}
          </span>
        )}
        {gameEnded && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-xs font-bold text-white">
            <Scale className="h-3 w-3" />
          </span>
        )}
        {isOpen
          ? <ChevronDown className="h-4 w-4 text-gray-400" />
          : <ChevronUp className="h-4 w-4 text-gray-400" />
        }
      </button>

      {/* Dashboard panel */}
      {isOpen && (
        <div className="fixed inset-x-0 bottom-16 z-50 flex justify-center px-3 pb-2 sm:bottom-20 sm:right-4 sm:left-auto sm:justify-end">
          <div className="w-full max-h-[70vh] sm:max-h-[80vh] sm:w-[480px] overflow-hidden rounded-2xl border border-gray-700 bg-gray-950 shadow-2xl flex flex-col">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <h2 className="font-bold text-white">Host Dashboard</h2>
                {gameEnded && (
                  <span className="rounded-full bg-indigo-900/60 border border-indigo-500/40 px-2 py-0.5 text-xs font-semibold text-indigo-300">
                    Game over
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stats strip */}
            <div className="px-4 py-3 border-b border-gray-800">
              <StatsStrip
                total={players.length}
                paid={paidCount}
                pending={pendingCount}
                eliminated={eliminatedCount}
              />
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-gray-800 overflow-x-auto">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap px-2 ${
                    activeTab === tab.id
                      ? 'border-b-2 border-indigo-400 text-indigo-300 bg-gray-900'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.badge !== null && (
                    <span className={`flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold ${
                      tab.id === 'reconcile'
                        ? 'bg-indigo-500 text-white'
                        : 'bg-yellow-500 text-black'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">

              {activeTab === 'players' && (
                <div className="space-y-4">
                  {/* Add player input — hidden after game ends */}
                  {!gameEnded && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Player name…"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newName.trim())
                            setAddEditModal({ open: true, player: null });
                        }}
                        className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-indigo-400 focus:outline-none"
                      />
                      <button
                        onClick={() => { if (newName.trim()) setAddEditModal({ open: true, player: null }); }}
                        disabled={!newName.trim()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                      >
                        <UserPlus className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search players…"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 py-2 pl-8 pr-3 text-sm text-white placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
                    />
                  </div>

                  {activePlayers.length === 0 && eliminatedPlayers.length === 0 && (
                    <div className="rounded-xl border border-gray-700 bg-gray-900 p-6 text-center">
                      <Users className="mx-auto mb-2 h-10 w-10 text-gray-600" />
                      <p className="text-sm text-gray-500">No players yet.</p>
                    </div>
                  )}

                  {activePlayers.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Active ({activePlayers.length})
                      </p>
                      <ul className="space-y-2">
                        {activePlayers.map(player => (
                          <PlayerRow
                            key={player.id}
                            player={player}
                            currency={currency}
                            entryFee={entryFee}
                            clubMethods={clubMethods}
                            onConfirmPayment={handleConfirmPayment}
                            onEdit={p => setAddEditModal({ open: true, player: p })}
                            onEliminate={handleEliminate}
                            onRestore={handleRestore}
                          />
                        ))}
                      </ul>
                    </div>
                  )}

                  {eliminatedPlayers.length > 0 && (
                    <div>
                      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-red-400/60">
                        Eliminated ({eliminatedPlayers.length})
                      </p>
                      <ul className="space-y-2">
                        {eliminatedPlayers.map(player => (
                          <PlayerRow
                            key={player.id}
                            player={player}
                            currency={currency}
                            entryFee={entryFee}
                            clubMethods={clubMethods}
                            onConfirmPayment={handleConfirmPayment}
                            onEdit={p => setAddEditModal({ open: true, player: p })}
                            onEliminate={handleEliminate}
                            onRestore={handleRestore}
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'payments' && <PaymentsTab />}

              {activeTab === 'admins' && (
                <EliminationAdminsTab roomId={roomId} socket={socket} />
              )}

              {activeTab === 'reconcile' && gameEnded && <ReconcileTab />}
            </div>
          </div>
        </div>
      )}

      <AddEditModal
        isOpen={addEditModal.open}
        player={addEditModal.player}
        onClose={() => { setAddEditModal({ open: false, player: null }); setNewName(''); }}
        onSave={handleAddOrEditSave}
        entryFee={entryFee}
        currency={currency}
        clubMethods={clubMethods}
        methodsLoading={methodsLoading}
      />
    </>
  );
};

export default EliminationHostDashboard;
