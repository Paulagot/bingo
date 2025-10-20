// src/components/Quiz/dashboard/AddPlayerModal.tsx
import React, { useState, useEffect } from 'react';
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
}

const debug = false;

/** ---------- Helpers ---------- */
const LAST_PM_KEY = 'fr.lastPaymentMethod';
const allowedMethods: PaymentMethod[] = ['cash', 'instant payment', 'card', 'web3', 'unknown'];

function isAllowedMethod(v: any): v is PaymentMethod {
  return typeof v === 'string' && (allowedMethods as string[]).includes(v);
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
  return 'unknown';
}

function normalizeMethod(maybe: string): PaymentMethod | 'other' {
  return isAllowedMethod(maybe) ? maybe : 'other';
}

/** ---------- Component ---------- */
const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  initialName,
  roomId,
}) => {
  const { config } = useQuizConfig();
  const { players } = usePlayerStore();
  const { socket } = useQuizSocket();

  // Capacity logic
  const isWeb3 = config?.paymentMethod === 'web3' || config?.isWeb3Room;
  const maxPlayers = isWeb3 ? Number.POSITIVE_INFINITY : (config?.roomCaps?.maxPlayers ?? 20);
  const atCapacity = isWeb3 ? false : ((players?.length || 0) >= maxPlayers);

  // Local state
  const [name, setName] = useState(initialName);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => getDefaultPaymentMethod(config));
  const [paid, setPaid] = useState(false);
  const [added, setAdded] = useState(false);
  const [nameError, setNameError] = useState('');

  const currency = config?.currencySymbol || '€';
  const entryFee = Number(config?.entryFee) || 0;

  const enabledExtras = Object.entries(config?.fundraisingOptions || {}).filter(
    ([, enabled]) => enabled
  );

  const handleToggleExtra = (key: string) => {
    setSelectedExtras((prev) =>
      prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]
    );
  };

  const totalExtras = selectedExtras.reduce(
    (sum, key) => sum + (config?.fundraisingPrices?.[key] || 0),
    0
  );
  const total = entryFee + totalExtras;

  const handleAddPlayer = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // 1) prevent duplicate names
    const nameAlreadyUsed = players.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameAlreadyUsed) {
      setNameError('This name is already used. Please choose a different one.');
      return;
    }

    // 2) build payload
    const sanitized = normalizeMethod(paymentMethod);

    const newPlayer = {
      id: nanoid(),
      name: trimmedName,
      paid,
      paymentMethod, // keep exact selection on the player
      credits: 0,
      extras: selectedExtras,
      extraPayments: Object.fromEntries(
        selectedExtras.map((key) => [
          key,
          {
            method: sanitized, // record method used per extra
            amount: config?.fundraisingPrices?.[key] || 0,
          },
        ])
      ),
    };

    // 3) emit to server
    if (!socket) {
      console.error('[AddPlayerModal] socket is not connected yet; cannot add player');
      return;
    }
    socket.emit('join_quiz_room', {
      roomId,
      user: newPlayer,
      role: 'player',
    });

    setAdded(true);
    if (debug) console.log('→ Emitted join_quiz_room:', newPlayer);

    // 4) close after brief confirmation
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1200);
  };

  // Reset fields when modal opens (dynamic default for payment method)
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setSelectedExtras([]);
      setPaymentMethod(getDefaultPaymentMethod(config));
      setPaid(false);
      setAdded(false);
      setNameError('');
    }
  }, [isOpen, initialName, config]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center">
        <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />

        <div className="bg-muted relative z-50 w-full max-w-md rounded-xl p-6 shadow-xl">
          <Dialog.Title className="heading-2">Add Player</Dialog.Title>

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
              Entry Fee: {currency}{entryFee.toFixed(2)}
            </p>

            {/* Extras */}
            {enabledExtras.length > 0 && (
              <div className="space-y-2">
                {enabledExtras.map(([key]) => {
                  const extra = fundraisingExtras[key];
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
                        {currency}{price.toFixed(2)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            {/* Total */}
            <p className="mt-2 text-right font-semibold">
              Total:{' '}
              <span className="text-indigo-700">
                {currency}{total.toFixed(2)}
              </span>
            </p>

            {/* Payment method */}
            <div className="mt-3">
              <label className="text-fg/80 mb-1 block text-sm font-medium">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const next = e.target.value as PaymentMethod;
                  setPaymentMethod(next);
                  // remember last used
                  try { localStorage.setItem(LAST_PM_KEY, next); } catch {}
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
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
                onClick={handleAddPlayer}
                disabled={!paid || !name.trim() || (!isWeb3 && atCapacity)}
                className={`w-1/2 rounded-lg py-2 font-semibold text-white transition ${
                  (!paid || !name.trim() || (!isWeb3 && atCapacity))
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {added
                  ? '✅ Added!'
                  : (!isWeb3 && atCapacity)
                    ? `Limit ${Number.isFinite(maxPlayers) ? maxPlayers : ''} reached`
                    : 'Add Player'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default AddPlayerModal;


