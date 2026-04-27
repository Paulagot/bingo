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
  mode?: 'add' | 'edit';
  playerToEdit?: any;
  playerIdToEdit?: string | null;
}

const debug = false;

const LAST_PM_KEY = 'fr.lastPaymentMethod';

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

function toCanonicalPaymentMethod(pm: PaymentMethod | string | null | undefined): string {
  if (!pm) return 'other';
  const v = String(pm).toLowerCase().trim();

  if (v === 'cash') return 'cash';
  if (v === 'pay_admin' || v === 'pay admin' || v === 'admin' || v === 'pay_host' || v === 'pay host') return 'pay_admin';
  if (v === 'card' || v === 'card tap' || v === 'credit_card' || v === 'debit_card') return 'card';
  if (v === 'stripe' || v === 'stripe_checkout') return 'stripe';
  if (v === 'other') return 'other';
  if (v === 'instant payment' || v === 'instant' || v === 'instant_payment') return 'instant_payment';

  if (
    v === 'revolut' || v.includes('revolut') ||
    v === 'zippypay' || v.includes('zippy') ||
    v === 'bank_transfer' || v === 'bank' || v.includes('bank') ||
    v === 'paypal' || v.includes('paypal')
  ) {
    return 'instant_payment';
  }

  if (v.includes('cash_or_revolut')) return 'instant_payment';
  if (v === 'web3' || v.includes('crypto')) return 'other';
  if (v === 'unknown') return 'other';

  return 'other';
}

function getDefaultPaymentMethod(config: any): PaymentMethod {
  if (config?.paymentMethod === 'web3' || config?.isWeb3Room) return 'web3';
  if (isAllowedMethod(config?.defaultPaymentMethod)) return config.defaultPaymentMethod;

  try {
    const last = localStorage.getItem(LAST_PM_KEY);
    if (isAllowedMethod(last)) return last;
  } catch {}

  return 'cash';
}

function ensureValidPaymentMethod(value: any): PaymentMethod {
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim();

    if (isAllowedMethod(value)) return value as PaymentMethod;
    if (lower === 'pay_admin' || lower.includes('pay admin') || lower.includes('admin')) return 'pay_admin';
    if (lower === 'instant_payment' || lower.includes('instant') || lower === 'revolut') return 'instant payment';
    if (lower === 'cash') return 'cash';
    if (lower.includes('card')) return 'card';
    if (lower.includes('web3') || lower.includes('crypto')) return 'web3';
    if (lower === 'other') return 'cash';
  }

  return 'cash';
}

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  initialName,
  roomId,
  mode = 'add',
  playerIdToEdit,
  playerToEdit,
}) => {
  const { config } = useQuizConfig();
  const { players } = usePlayerStore();
  const { socket } = useQuizSocket();

  const effectiveMode: 'add' | 'edit' = mode;

  const isDonationRoom = config?.fundraisingMode === 'donation';
  const isWeb3 = config?.paymentMethod === 'web3' || config?.isWeb3Room;

  const maxPlayers = isWeb3 ? Number.POSITIVE_INFINITY : (config?.roomCaps?.maxPlayers ?? 20);
  const atCapacity = isWeb3 ? false : ((players?.length || 0) >= maxPlayers);

  const currency = config?.currencySymbol || '€';
  const entryFee = Number(config?.entryFee) || 0;

  const enabledExtras = Object.entries(config?.fundraisingOptions || {}).filter(([, enabled]) => !!enabled);

  const includedDonationExtras = useMemo(
    () =>
      Object.entries(config?.fundraisingOptions || {})
        .filter(([, enabled]) => !!enabled)
        .map(([key]) => key),
    [config?.fundraisingOptions]
  );

  const livePlayerToEdit = useMemo(() => {
    if (effectiveMode !== 'edit') return null;
    if (!playerIdToEdit) return null;
    return players.find((p: any) => p.id === playerIdToEdit) || null;
  }, [effectiveMode, playerIdToEdit, players]);

  const resolvedPlayerToEdit = livePlayerToEdit || playerToEdit || null;

  const [name, setName] = useState(initialName);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(() => getDefaultPaymentMethod(config));
  const [paid, setPaid] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [added, setAdded] = useState(false);
  const [nameError, setNameError] = useState('');

  const donationValue = Number(donationAmount || 0);
  const invalidDonation = isDonationRoom && (!Number.isFinite(donationValue) || donationValue < 0);

  const handleToggleExtra = (key: string) => {
    if (isDonationRoom) return;
    setSelectedExtras((prev) => (prev.includes(key) ? prev.filter((e) => e !== key) : [...prev, key]));
  };

  const totalExtras = selectedExtras.reduce((sum, key) => sum + (config?.fundraisingPrices?.[key] || 0), 0);
  const total = isDonationRoom ? donationValue : entryFee + totalExtras;

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName || invalidDonation) return;

    const nameAlreadyUsed = players.some((p: any) => {
      if (effectiveMode === 'edit' && resolvedPlayerToEdit && p.id === resolvedPlayerToEdit.id) return false;
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

    const canonicalMethod = toCanonicalPaymentMethod(paymentMethod);
    const finalExtras = isDonationRoom ? includedDonationExtras : selectedExtras;

    if (effectiveMode === 'add') {
      const newPlayer = {
        id: nanoid(),
        name: trimmedName,
        paid,
        paymentMethod: canonicalMethod as any,
        credits: 0,
        donationAmount: isDonationRoom ? donationValue : undefined,
        extras: finalExtras,
        extraPayments: isDonationRoom
          ? {}
          : Object.fromEntries(
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
    } else {
      const editingId = playerIdToEdit || resolvedPlayerToEdit?.id;

      if (!editingId) {
        console.error('[AddPlayerModal] edit mode missing playerIdToEdit');
        return;
      }

      const updates = {
        name: trimmedName,
        paid,
        paymentMethod: canonicalMethod as any,
        donationAmount: isDonationRoom ? donationValue : undefined,
        extras: finalExtras,
        extraPayments: isDonationRoom
          ? {}
          : Object.fromEntries(
              selectedExtras.map((key) => [
                key,
                {
                  method: canonicalMethod as any,
                  amount: config?.fundraisingPrices?.[key] || 0,
                },
              ])
            ),
      };

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

      setAdded(true);
      setTimeout(() => {
        setAdded(false);
        onClose();
      }, 800);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    if (effectiveMode === 'edit') {
      const p = resolvedPlayerToEdit;
      if (!p) return;

      setName(p.name || initialName || '');

      if (isDonationRoom) {
        setDonationAmount(
          p.donationAmount !== undefined && p.donationAmount !== null
            ? String(p.donationAmount)
            : ''
        );
        setSelectedExtras(includedDonationExtras);
      } else {
        setDonationAmount('');
        setSelectedExtras(Array.isArray(p.extras) ? p.extras : []);
      }

      setPaymentMethod(ensureValidPaymentMethod(p.paymentMethod));
      setPaid(!!p.paid);
    } else {
      setName(initialName);
      setDonationAmount('');
      setSelectedExtras(isDonationRoom ? includedDonationExtras : []);
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
    isDonationRoom,
    includedDonationExtras,
    playerIdToEdit,
    resolvedPlayerToEdit,
    players?.length,
  ]);

  const buttonDisabledAdd = !name.trim() || invalidDonation || (!isWeb3 && atCapacity);
  const buttonDisabledEdit = !name.trim() || invalidDonation;
  const disableButton = effectiveMode === 'add' ? buttonDisabledAdd : buttonDisabledEdit;

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center">
        <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />

        <div className="bg-muted relative z-50 w-full max-w-md rounded-xl p-6 shadow-xl">
          <Dialog.Title className="heading-2">
            {effectiveMode === 'add' ? 'Add Player' : 'Edit Player'}
          </Dialog.Title>

          <div className="space-y-3">
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

            {isDonationRoom ? (
              <div>
                <label className="text-fg/80 mb-1 block text-sm font-medium">Donation Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
                {invalidDonation && (
                  <p className="mt-1 text-sm text-red-600">Donation amount must be 0 or more.</p>
                )}
              </div>
            ) : (
              <p className="text-fg/70 text-sm">
                Entry Fee: {currency}
                {entryFee.toFixed(2)}
              </p>
            )}

            {isDonationRoom && includedDonationExtras.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                Fundraising extras are included automatically with donations:
                <div className="mt-1 font-medium">
                  {includedDonationExtras
                    .map((key) => (fundraisingExtras as any)[key]?.label || key)
                    .join(', ')}
                </div>
              </div>
            )}

            {!isDonationRoom && enabledExtras.length > 0 && (
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

            <p className="mt-2 text-right font-semibold">
              Total:{' '}
              <span className="text-indigo-700">
                {currency}
                {Number(total || 0).toFixed(2)}
              </span>
            </p>

            <div className="mt-3">
              <label className="text-fg/80 mb-1 block text-sm font-medium">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => {
                  const next = e.target.value as PaymentMethod;
                  setPaymentMethod(next);
                  try {
                    localStorage.setItem(LAST_PM_KEY, next);
                  } catch {}
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
                    : !isWeb3 && atCapacity
                      ? `Limit ${Number.isFinite(maxPlayers) ? maxPlayers : ''} reached`
                      : 'Add Player'
                  : added
                    ? '✅ Saved!'
                    : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default AddPlayerModal;




