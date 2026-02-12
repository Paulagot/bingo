// src/components/Quiz/dashboard/AddPlayerModal.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { usePlayerStore, type PaymentMethod } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { fundraisingExtras } from '../types/quiz';
import { nanoid } from 'nanoid';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  roomId: string;

  /**
   * mode = "add": create a new player via join_quiz_room
   * mode = "edit": update an existing player via update_player
   */
  mode?: 'add' | 'edit';

  // Optional legacy prop (kept so existing call sites don't break)
  playerToEdit?: any;

  // ✅ Step 2B: prefer editing by id so modal always hydrates from latest store state
  playerIdToEdit?: string | null;
}

const debug = false;

/** ---------- Helpers ---------- */
const LAST_PM_KEY = 'fr.lastPaymentMethod';

// Keep UI PaymentMethod values compatible with your existing store type.
// (We will still send canonical values to backend using toCanonicalPaymentMethod())
const allowedMethods: PaymentMethod[] = [
  'cash',
  'instant payment',
  'pay_admin',
  'card',
  'web3',
  'unknown',
];

function isAllowedMethod(v: any): v is PaymentMethod {
  return typeof v === 'string' && (allowedMethods as string[]).includes(v);
}

// ✅ Convert UI/store values -> backend canonical enum values
// DB enum: 'cash' | 'instant_payment' | 'pay_admin' | 'card' | 'stripe' | 'other'
function toCanonicalPaymentMethod(pm: PaymentMethod | string | null | undefined): string {
  if (!pm) return 'other';
  const v = String(pm).toLowerCase().trim();

  // Direct canonical
  if (v === 'cash') return 'cash';
  if (v === 'pay_admin' || v === 'pay admin' || v === 'admin' || v === 'pay_host' || v === 'pay host') return 'pay_admin';
  if (v === 'card' || v === 'card tap' || v === 'credit_card' || v === 'debit_card') return 'card';
  if (v === 'stripe' || v === 'stripe_checkout') return 'stripe';
  if (v === 'other') return 'other';

  // UI legacy
  if (v === 'instant payment' || v === 'instant' || v === 'instant_payment') return 'instant_payment';

  // Provider aliases
  if (
    v === 'revolut' || v.includes('revolut') ||
    v === 'zippypay' || v.includes('zippy') ||
    v === 'bank_transfer' || v === 'bank' || v.includes('bank') ||
    v === 'paypal' || v.includes('paypal')
  ) {
    return 'instant_payment';
  }

  // Legacy umbrella
  if (v.includes('cash_or_revolut')) return 'instant_payment';

  // Web3 (backend may treat separately, but don't pollute DB enum)
  if (v === 'web3' || v.includes('crypto')) return 'other';

  // Unknown
  if (v === 'unknown') return 'other';

  return 'other';
}

function getDefaultPaymentMethod(config: any): PaymentMethod {
  // a) Web3 rooms default to web3
  if (config?.paymentMethod === 'web3' || config?.isWeb3Room) return 'web3';

  // b) Room-level default (if you add it later)
  if (isAllowedMethod(config?.defaultPaymentMethod)) return config.defaultPaymentMethod;

  // c) Last used in this browser
  try {
    const last = localStorage.getItem(LAST_PM_KEY);
    if (isAllowedMethod(last)) return last;
  } catch {}

  // d) Neutral fallback
  return 'cash';
}

// ✅ Ensure valid payment method from existing player data (including legacy/canonical variants)
function ensureValidPaymentMethod(value: any): PaymentMethod {
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();

    // Exact UI/store values
    if (isAllowedMethod(value)) return value as PaymentMethod;

    // Canonical/legacy mappings back into UI/store values
    if (lower === 'pay_admin' || lower.includes('pay admin') || lower.includes('admin')) return 'pay_admin';
    if (lower === 'instant_payment' || lower.includes('instant') || lower === 'revolut') return 'instant payment';
    if (lower === 'cash') return 'cash';
    if (lower.includes('card')) return 'card';
    if (lower.includes('web3') || lower.includes('crypto')) return 'web3';
    if (lower === 'other') return 'cash';
  }
  return 'cash';
}

/** ---------- Component ---------- */
const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  initialName,
  roomId,
  mode = 'add',
  playerIdToEdit,
  playerToEdit, // legacy fallback
}) => {
  const { config } = useQuizConfig();
  const { players } = usePlayerStore();
  const { socket } = useQuizSocket();

  const effectiveMode: 'add' | 'edit' = mode;

  // Capacity logic (only relevant for add mode)
  const isWeb3 = config?.paymentMethod === 'web3' || config?.isWeb3Room;
  const maxPlayers = isWeb3 ? Number.POSITIVE_INFINITY : (config?.roomCaps?.maxPlayers ?? 20);
  const atCapacity = isWeb3 ? false : ((players?.length || 0) >= maxPlayers);

  // ✅ Step 2B: resolve the player from the latest store state
  const livePlayerToEdit = useMemo(() => {
    if (effectiveMode !== 'edit') return null;
    if (!playerIdToEdit) return null;
    return players.find((p: any) => p.id === playerIdToEdit) || null;
  }, [effectiveMode, playerIdToEdit, players]);

  // Legacy fallback for safety
  const resolvedPlayerToEdit = livePlayerToEdit || playerToEdit || null;

  // Local state
  const [name, setName] = useState(initialName);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => getDefaultPaymentMethod(config));
  const [paid, setPaid] = useState(false);
  const [added, setAdded] = useState(false);
  const [nameError, setNameError] = useState('');

  const currency = config?.currencySymbol || '€';
  const entryFee = Number(config?.entryFee) || 0;

  const enabledExtras = Object.entries(config?.fundraisingOptions || {}).filter(([, enabled]) => !!enabled);

  const handleToggleExtra = (key: string) => {
    setSelectedExtras((prev) => (prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]));
  };

  const totalExtras = selectedExtras.reduce((sum, key) => sum + (config?.fundraisingPrices?.[key] || 0), 0);
  const total = entryFee + totalExtras;

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // 1) prevent duplicate names
    const nameAlreadyUsed = players.some((p: any) => {
      if (effectiveMode === 'edit' && resolvedPlayerToEdit && p.id === resolvedPlayerToEdit.id) {
        // allow the same player to keep their own name
        return false;
      }
      return String(p.name || '').toLowerCase() === trimmedName.toLowerCase();
    });

    if (nameAlreadyUsed) {
      setNameError('This name is already used. Please choose a different one.');
      return;
    }

    if (!socket) {
      console.error('[AddPlayerModal] socket is not connected; cannot submit');
      return;
    }

    // ✅ Always send canonical values to backend
    const canonicalMethod = toCanonicalPaymentMethod(paymentMethod);

    if (effectiveMode === 'add') {
      // ADD MODE: create a brand new player
      const newPlayer = {
        id: nanoid(),
        name: trimmedName,
        paid,
        // Keep UI/store value locally, but backend should see canonical
        paymentMethod: canonicalMethod as any,
        credits: 0,
        extras: selectedExtras,
        extraPayments: Object.fromEntries(
          selectedExtras.map((key) => [
            key,
            {
              method: canonicalMethod as any,
              amount: config?.fundraisingPrices?.[key] || 0,
            },
          ])
        ),
      };

      socket.emit('join_quiz_room', {
        roomId,
        user: newPlayer,
        role: 'player',
      });

      setAdded(true);
      if (debug) console.log('→ [AddPlayerModal] Emitted join_quiz_room:', newPlayer);

      setTimeout(() => {
        setAdded(false);
        onClose();
      }, 1200);
    } else if (effectiveMode === 'edit') {
      const editingId = playerIdToEdit || resolvedPlayerToEdit?.id;

      if (!editingId) {
        console.error('[AddPlayerModal] edit mode missing playerIdToEdit');
        return;
      }

      const updates = {
        name: trimmedName,
        paid,
        paymentMethod: canonicalMethod as any,
        extras: selectedExtras,
        extraPayments: Object.fromEntries(
          selectedExtras.map((key) => [
            key,
            {
              method: canonicalMethod as any,
              amount: config?.fundraisingPrices?.[key] || 0,
            },
          ])
        ),
      };

      if (debug) console.log('[AddPlayerModal] submitting updates:', { editingId, updates });

      socket.emit(
        'update_player',
        {
          roomId,
          playerId: editingId,
          updates,
        },
        (res?: any) => {
          if (!res?.ok) {
            console.error('[AddPlayerModal] update_player failed', res?.error);
          } else if (debug) {
            console.log('[AddPlayerModal] update_player success', res.player);
          }
        }
      );

      if (debug) console.log('→ [AddPlayerModal] Emitted update_player:', { editingId, updates });

      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        onClose();
      }, 800);
    }
  };

  // ✅ Step 2B: Reset / hydrate fields when modal opens
  // Important: In edit mode, ONLY hydrate once we have the resolved player from the store.
  useEffect(() => {
    if (!isOpen) return;

    if (effectiveMode === 'edit') {
      const p = resolvedPlayerToEdit;

      if (!p) {
        if (debug) {
          console.log('[AddPlayerModal] ⏳ Edit mode open but player not resolved yet', {
            playerIdToEdit,
            playersCount: players?.length || 0,
          });
        }
        return;
      }

      setName(p.name || initialName || '');
      setSelectedExtras(Array.isArray(p.extras) ? p.extras : []);

      const existingMethod = p.paymentMethod;
      const validMethod = ensureValidPaymentMethod(existingMethod);
      setPaymentMethod(validMethod);

      setPaid(!!p.paid);

      if (debug) {
        console.log('[AddPlayerModal] ✅ Edit mode hydration (LIVE):', {
          playerId: p.id,
          existingMethod,
          validMethod,
          paid: p.paid,
          extras: p.extras,
        });
      }
    } else {
      // Fresh add mode
      setName(initialName);
      setSelectedExtras([]);
      setPaymentMethod(getDefaultPaymentMethod(config));
      setPaid(false);
    }

    setAdded(false);
    setNameError('');
  }, [
    isOpen,
    effectiveMode,
    initialName,
    config,
    playerIdToEdit,
    resolvedPlayerToEdit,
    players?.length,
  ]);

  const buttonDisabledAdd = !paid || !name.trim() || (!isWeb3 && atCapacity);
  const buttonDisabledEdit = !name.trim(); // allow unpaid edits

  const disableButton = effectiveMode === 'add' ? buttonDisabledAdd : buttonDisabledEdit;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center">
        <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />

        <div className="bg-muted relative z-50 w-full max-w-md rounded-xl p-6 shadow-xl">
          <Dialog.Title className="heading-2">{effectiveMode === 'add' ? 'Add Player' : 'Edit Player'}</Dialog.Title>

          <div className="space-y-3">
            {/* Name */}
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError('');
              }}
              placeholder="Player name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />
            {nameError && <p className="text-sm text-red-600">{nameError}</p>}

            {/* Entry fee */}
            <p className="text-fg/70 text-sm">
              Entry Fee: {currency}
              {entryFee.toFixed(2)}
            </p>

            {/* Extras */}
            {enabledExtras.length > 0 && (
              <div className="space-y-2">
                {enabledExtras.map(([key]) => {
                  const extra = (fundraisingExtras as any)[key];
                  const price = config?.fundraisingPrices?.[key] || 0;

                  return (
                    <label key={key} className="text-fg/80 flex items-center justify-between text-sm">
                      <span title={extra?.description || ''} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedExtras.includes(key)}
                          onChange={() => handleToggleExtra(key)}
                          className="h-4 w-4"
                        />
                        {extra?.label || key}
                      </span>
                      <span>
                        {currency}
                        {Number(price).toFixed(2)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Total */}
            <p className="mt-2 text-right font-semibold">
              Total: <span className="text-indigo-700">{currency}{total.toFixed(2)}</span>
            </p>

            {/* Payment method */}
            <div className="mt-3">
              <label className="text-fg/80 mb-1 block text-sm font-medium">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const next = e.target.value as PaymentMethod;
                  setPaymentMethod(next);

                  // remember last used
                  try {
                    localStorage.setItem(LAST_PM_KEY, next);
                  } catch {}

                  if (debug) {
                    console.log('[AddPlayerModal] Payment method changed to:', next, {
                      canonical: toCanonicalPaymentMethod(next),
                    });
                  }
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="pay_admin">🧾 Pay Admin (manual)</option>
                <option value="cash">💶 Cash</option>
                <option value="instant payment">📱 Instant payment</option>
                <option value="card">💳 Card Tap</option>
                <option value="web3">🌐 Crypto</option>
                <option value="unknown">❓ Unknown</option>
              </select>
            </div>

            {/* Paid checkbox */}
            <div className="mt-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="paid"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="h-4 w-4"
              />
              <label htmlFor="paid" className="text-fg/80 text-sm">
                Mark as paid
              </label>
            </div>

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={onClose}
                className="text-fg w-1/2 rounded-lg bg-gray-200 py-2 font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={disableButton}
                className={`w-1/2 rounded-lg py-2 font-semibold text-white transition ${
                  disableButton ? 'cursor-not-allowed bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {effectiveMode === 'add'
                  ? added
                    ? '✅ Added!'
                    : (!isWeb3 && atCapacity)
                      ? `Limit ${Number.isFinite(maxPlayers) ? maxPlayers : ''} reached`
                      : 'Add Player'
                  : added
                    ? '✅ Saved!'
                    : 'Save Changes'}
              </button>
            </div>

            {debug && effectiveMode === 'edit' && (
              <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                <div><strong>Debug</strong></div>
                <div>playerIdToEdit: {String(playerIdToEdit || '')}</div>
                <div>resolved: {resolvedPlayerToEdit?.id ? 'yes' : 'no'}</div>
                <div>resolved.method(raw): {String(resolvedPlayerToEdit?.paymentMethod || '')}</div>
                <div>ui.method: {String(paymentMethod)}</div>
                <div>canonical(out): {toCanonicalPaymentMethod(paymentMethod)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default AddPlayerModal;




