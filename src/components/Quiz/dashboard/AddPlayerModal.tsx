// src/components/Quiz/dashboard/AddPlayerModal.tsx

import React, { useEffect, useMemo, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { nanoid } from 'nanoid';

import { usePlayerStore } from '../hooks/usePlayerStore';
import { useQuizConfig } from '../hooks/useQuizConfig';
import { fundraisingExtras } from '../types/quiz';
import { useQuizSocket } from '../sockets/QuizSocketProvider';

import {
  quizPaymentMethodsService,
  type PaymentMethod as QuizLinkedPaymentMethod,
} from '../../mgtsystem/services/QuizPaymentMethodsService';

interface AddPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  roomId: string;
  mode?: 'add' | 'edit';
  playerToEdit?: any;
  playerIdToEdit?: string | null;
}

type CanonicalPaymentMethod =
  | 'cash'
  | 'instant_payment'
  | 'card'
  | 'stripe'
  | 'crypto'
  | 'other';

type PaymentMethodSnapshot = {
  clubPaymentMethodId: string;
  paymentMethodId: number;
  paymentMethod: CanonicalPaymentMethod;
  paymentMethodLabel: string;
  paymentProvider: string | null;
  paymentMethodCategory: string;
  isOfficialClubAccount: boolean;
  paymentVerificationMode: 'manual' | 'api_verified' | 'onchain_verified';
};

const debug = false;

const getLastPaymentMethodKey = (roomId: string) =>
  `fr.lastQuizPaymentMethodId.${roomId}`;

function toNumberId(value: unknown): number | null {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function formatProviderName(providerName?: string | null): string {
  if (!providerName) return '';
  return providerName.replace(/_/g, ' ');
}

function formatMethodLabel(method: QuizLinkedPaymentMethod): string {
  const provider = formatProviderName(method.provider_name);

  if (!provider) return method.method_label;

  return `${method.method_label} (${provider})`;
}

function getCanonicalPaymentMethod(
  method?: QuizLinkedPaymentMethod | null
): CanonicalPaymentMethod {
  if (!method) return 'other';

  if (method.method_category === 'stripe') return 'stripe';
  if (method.method_category === 'card') return 'card';
  if (method.method_category === 'crypto') return 'crypto';

  if (method.method_category === 'instant_payment') {
    if (method.provider_name === 'cash') return 'cash';
    return 'instant_payment';
  }

  return 'other';
}

function getVerificationMode(
  method?: QuizLinkedPaymentMethod | null
): PaymentMethodSnapshot['paymentVerificationMode'] {
  if (!method) return 'manual';

  const config = (method.method_config || {}) as Record<string, any>;

  if (method.method_category === 'crypto') {
    return config.verificationMode === 'manual'
      ? 'manual'
      : 'onchain_verified';
  }

  if (method.method_category === 'stripe' || method.method_category === 'card') {
    return 'api_verified';
  }

  return 'manual';
}

function buildPaymentSnapshot(
  method: QuizLinkedPaymentMethod
): PaymentMethodSnapshot {
  const methodId = Number(method.id);

  return {
    clubPaymentMethodId: String(method.id),
    paymentMethodId: methodId,
    paymentMethod: getCanonicalPaymentMethod(method),
    paymentMethodLabel: method.method_label,
    paymentProvider: method.provider_name || null,
    paymentMethodCategory: method.method_category,
    isOfficialClubAccount: !!method.is_official_club_account,
    paymentVerificationMode: getVerificationMode(method),
  };
}

function getLegacyPaymentLabel(value: unknown): string {
  if (!value) return '';

  const lower = String(value).toLowerCase().trim();

  if (lower === 'cash') return 'cash';
  if (lower === 'instant_payment' || lower === 'instant payment') {
    return 'instant_payment';
  }
  if (lower === 'pay_admin' || lower === 'pay admin') return 'instant_payment';
  if (lower === 'card') return 'card';
  if (lower === 'stripe') return 'stripe';
  if (lower === 'web3' || lower === 'crypto') return 'crypto';

  return lower;
}

function resolveMethodIdFromPlayer(
  player: any,
  linkedMethods: QuizLinkedPaymentMethod[]
): string {
  if (!player || linkedMethods.length === 0) return '';

  const explicitId =
    toNumberId(player.clubPaymentMethodId) ??
    toNumberId(player.paymentMethodId) ??
    toNumberId(player.payment_method_id) ??
    toNumberId(player.club_payment_method_id);

  if (explicitId !== null) {
    const matched = linkedMethods.find((method) => Number(method.id) === explicitId);
    if (matched) return String(matched.id);
  }

  const labelSnapshot = String(
    player.paymentMethodLabel ||
      player.payment_method_label ||
      player.paymentMethodLabelSnapshot ||
      ''
  )
    .toLowerCase()
    .trim();

  if (labelSnapshot) {
    const matchedByLabel = linkedMethods.find(
      (method) => method.method_label.toLowerCase().trim() === labelSnapshot
    );

    if (matchedByLabel) return String(matchedByLabel.id);
  }

  const providerSnapshot = String(
    player.paymentProvider ||
      player.providerName ||
      player.payment_provider ||
      player.paymentProviderSnapshot ||
      ''
  )
    .toLowerCase()
    .trim();

  if (providerSnapshot) {
    const matchedByProvider = linkedMethods.find(
      (method) =>
        String(method.provider_name || '').toLowerCase().trim() ===
        providerSnapshot
    );

    if (matchedByProvider) return String(matchedByProvider.id);
  }

  const legacyMethod = getLegacyPaymentLabel(player.paymentMethod);

  if (legacyMethod) {
    const matchedByLegacy = linkedMethods.find((method) => {
      const canonical = getCanonicalPaymentMethod(method);

      if (legacyMethod === canonical) return true;

      if (
        legacyMethod === 'instant_payment' &&
        method.method_category === 'instant_payment'
      ) {
        return true;
      }

      if (legacyMethod === 'crypto' && method.method_category === 'crypto') {
        return true;
      }

      return false;
    });

    if (matchedByLegacy) return String(matchedByLegacy.id);
  }

  return '';
}

function getDefaultLinkedMethodId(
  roomId: string,
  linkedMethods: QuizLinkedPaymentMethod[]
): string {
  if (linkedMethods.length === 0) return '';

  try {
    const stored = localStorage.getItem(getLastPaymentMethodKey(roomId));

    if (stored) {
      const stillAvailable = linkedMethods.find(
        (method) => String(method.id) === String(stored)
      );

      if (stillAvailable) return String(stillAvailable.id);
    }
  } catch {
    // localStorage can fail in private/security contexts.
  }

  const firstMethod = linkedMethods[0];

  if (!firstMethod) return '';

  return String(firstMethod.id);
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

  const maxPlayers = isWeb3
    ? Number.POSITIVE_INFINITY
    : config?.roomCaps?.maxPlayers ?? 20;

  const atCapacity = isWeb3 ? false : (players?.length || 0) >= maxPlayers;

  const currency = config?.currencySymbol || '€';
  const entryFee = Number(config?.entryFee) || 0;

  const enabledExtras = Object.entries(config?.fundraisingOptions || {}).filter(
    ([, enabled]) => !!enabled
  );

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

    return players.find((player: any) => player.id === playerIdToEdit) || null;
  }, [effectiveMode, playerIdToEdit, players]);

  const resolvedPlayerToEdit = livePlayerToEdit || playerToEdit || null;

  const [name, setName] = useState(initialName);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [paid, setPaid] = useState(false);
  const [donationAmount, setDonationAmount] = useState('');
  const [added, setAdded] = useState(false);
  const [nameError, setNameError] = useState('');

  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [paymentMethodsError, setPaymentMethodsError] = useState<string | null>(
    null
  );
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState<
    QuizLinkedPaymentMethod[]
  >([]);
  const [linkedPaymentMethodIds, setLinkedPaymentMethodIds] = useState<number[]>(
    []
  );

  const linkedPaymentMethods = useMemo(() => {
    const linkedIdSet = new Set(linkedPaymentMethodIds.map((id) => Number(id)));

    return availablePaymentMethods
      .filter((method) => linkedIdSet.has(Number(method.id)))
      .filter((method) => method.is_enabled)
      .sort((a, b) => {
        const orderA = Number(a.display_order || 0);
        const orderB = Number(b.display_order || 0);

        if (orderA !== orderB) return orderA - orderB;
        return String(a.method_label).localeCompare(String(b.method_label));
      });
  }, [availablePaymentMethods, linkedPaymentMethodIds]);

  const selectedPaymentMethod = useMemo(() => {
    if (!selectedPaymentMethodId) return null;

    return (
      linkedPaymentMethods.find(
        (method) => String(method.id) === String(selectedPaymentMethodId)
      ) || null
    );
  }, [linkedPaymentMethods, selectedPaymentMethodId]);

  const selectedPaymentSnapshot = useMemo(() => {
    if (!selectedPaymentMethod) return null;
    return buildPaymentSnapshot(selectedPaymentMethod);
  }, [selectedPaymentMethod]);

  const donationValue = Number(donationAmount || 0);

  const invalidDonation =
    isDonationRoom && (!Number.isFinite(donationValue) || donationValue < 0);

  const totalExtras = selectedExtras.reduce(
    (sum, key) => sum + (Number(config?.fundraisingPrices?.[key]) || 0),
    0
  );

  const total = isDonationRoom ? donationValue : entryFee + totalExtras;

  const noLinkedPaymentMethods =
    !paymentMethodsLoading && linkedPaymentMethods.length === 0;

  useEffect(() => {
    if (!isOpen || !roomId) return;

    let cancelled = false;

    const loadQuizPaymentMethods = async () => {
      try {
        setPaymentMethodsLoading(true);
        setPaymentMethodsError(null);

        const response =
          await quizPaymentMethodsService.getQuizPaymentMethods(roomId);

        if (cancelled) return;

        setAvailablePaymentMethods(response.available_methods || []);
        setLinkedPaymentMethodIds(response.linked_method_ids || []);

        if (debug) {
          console.log('[AddPlayerModal] linked payment methods response:', response);
        }
      } catch (error: any) {
        if (cancelled) return;

        console.error('[AddPlayerModal] Failed to load quiz payment methods:', error);
        setAvailablePaymentMethods([]);
        setLinkedPaymentMethodIds([]);
        setPaymentMethodsError(
          error?.message || 'Failed to load payment methods for this quiz'
        );
      } finally {
        if (!cancelled) {
          setPaymentMethodsLoading(false);
        }
      }
    };

    void loadQuizPaymentMethods();

    return () => {
      cancelled = true;
    };
  }, [isOpen, roomId]);

  useEffect(() => {
    if (!isOpen) return;

    if (effectiveMode === 'edit') {
      const player = resolvedPlayerToEdit;
      if (!player) return;

      setName(player.name || initialName || '');

      if (isDonationRoom) {
        setDonationAmount(
          player.donationAmount !== undefined && player.donationAmount !== null
            ? String(player.donationAmount)
            : ''
        );
        setSelectedExtras(includedDonationExtras);
      } else {
        setDonationAmount('');
        setSelectedExtras(Array.isArray(player.extras) ? player.extras : []);
      }

      setPaid(!!player.paid);
    } else {
      setName(initialName);
      setDonationAmount('');
      setSelectedExtras(isDonationRoom ? includedDonationExtras : []);
      setPaid(false);
    }

    setSelectedPaymentMethodId('');
    setAdded(false);
    setNameError('');
  }, [
    isOpen,
    effectiveMode,
    initialName,
    isDonationRoom,
    includedDonationExtras,
    resolvedPlayerToEdit,
  ]);

  useEffect(() => {
    if (!isOpen) return;
    if (linkedPaymentMethods.length === 0) return;

    setSelectedPaymentMethodId((currentValue) => {
      const currentStillValid = linkedPaymentMethods.some(
        (method) => String(method.id) === String(currentValue)
      );

      if (currentStillValid) return currentValue;

      if (effectiveMode === 'edit' && resolvedPlayerToEdit) {
        const editMethodId = resolveMethodIdFromPlayer(
          resolvedPlayerToEdit,
          linkedPaymentMethods
        );

        if (editMethodId) return editMethodId;
      }

      return getDefaultLinkedMethodId(roomId, linkedPaymentMethods);
    });
  }, [
    isOpen,
    roomId,
    effectiveMode,
    resolvedPlayerToEdit,
    linkedPaymentMethods,
  ]);

  const handleToggleExtra = (key: string) => {
    if (isDonationRoom) return;

    setSelectedExtras((previousExtras) =>
      previousExtras.includes(key)
        ? previousExtras.filter((extraKey) => extraKey !== key)
        : [...previousExtras, key]
    );
  };

  const handlePaymentMethodChange = (nextMethodId: string) => {
    setSelectedPaymentMethodId(nextMethodId);

    try {
      localStorage.setItem(getLastPaymentMethodKey(roomId), nextMethodId);
    } catch {
      // localStorage can fail in private/security contexts.
    }
  };

  const buildExtraPayments = (
    finalExtras: string[],
    snapshot: PaymentMethodSnapshot
  ) => {
    if (isDonationRoom) return {};

    return Object.fromEntries(
      finalExtras.map((key) => [
        key,
        {
          method: snapshot.paymentMethod,
          amount: Number(config?.fundraisingPrices?.[key]) || 0,
          clubPaymentMethodId: snapshot.clubPaymentMethodId,
          paymentMethodId: snapshot.paymentMethodId,
          paymentMethodLabel: snapshot.paymentMethodLabel,
          paymentProvider: snapshot.paymentProvider,
          paymentMethodCategory: snapshot.paymentMethodCategory,
          isOfficialClubAccount: snapshot.isOfficialClubAccount,
          paymentVerificationMode: snapshot.paymentVerificationMode,
        },
      ])
    );
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();

    if (!trimmedName || invalidDonation) return;

    if (!selectedPaymentSnapshot) {
      setPaymentMethodsError(
        'Select a payment method before adding this player.'
      );
      return;
    }

    const nameAlreadyUsed = players.some((player: any) => {
      if (
        effectiveMode === 'edit' &&
        resolvedPlayerToEdit &&
        player.id === resolvedPlayerToEdit.id
      ) {
        return false;
      }

      return (
        String(player.name || '').toLowerCase() === trimmedName.toLowerCase()
      );
    });

    if (nameAlreadyUsed) {
      setNameError('This name is already used. Please choose a different one.');
      return;
    }

    if (!socket) {
      console.error('[AddPlayerModal] socket is not connected; cannot submit');
      return;
    }

    const finalExtras = isDonationRoom
      ? includedDonationExtras
      : selectedExtras;

    const extraPayments = buildExtraPayments(
      finalExtras,
      selectedPaymentSnapshot
    );

    const paymentPayload = {
      paid,
      paymentMethod: selectedPaymentSnapshot.paymentMethod as any,

      // New club-method fields for reporting/reconciliation.
      clubPaymentMethodId: selectedPaymentSnapshot.clubPaymentMethodId,
      paymentMethodId: selectedPaymentSnapshot.paymentMethodId,
      paymentMethodLabel: selectedPaymentSnapshot.paymentMethodLabel,
      paymentProvider: selectedPaymentSnapshot.paymentProvider,
      paymentMethodCategory: selectedPaymentSnapshot.paymentMethodCategory,
      isOfficialClubAccount: selectedPaymentSnapshot.isOfficialClubAccount,
      paymentVerificationMode: selectedPaymentSnapshot.paymentVerificationMode,

      // Snapshot object for future-safe reporting.
      paymentMethodSnapshot: selectedPaymentSnapshot,
    };

    if (effectiveMode === 'add') {
      const newPlayer = {
        id: nanoid(),
        name: trimmedName,
        credits: 0,
        donationAmount: isDonationRoom ? donationValue : undefined,
        extras: finalExtras,
        extraPayments,
        ...paymentPayload,
      };

      socket.emit('join_quiz_room', {
        roomId,
        user: newPlayer,
        role: 'player',
      });

      setAdded(true);

      if (debug) {
        console.log('→ [AddPlayerModal] Emitted join_quiz_room:', newPlayer);
      }

      window.setTimeout(() => {
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
        donationAmount: isDonationRoom ? donationValue : undefined,
        extras: finalExtras,
        extraPayments,
        ...paymentPayload,
      };

      socket.emit(
        'update_player',
        {
          roomId,
          playerId: editingId,
          updates,
        },
        (response?: any) => {
          if (!response?.ok) {
            console.error(
              '[AddPlayerModal] update_player failed',
              response?.error
            );
          } else if (debug) {
            console.log(
              '[AddPlayerModal] update_player success',
              response.player
            );
          }
        }
      );

      setAdded(true);

      window.setTimeout(() => {
        setAdded(false);
        onClose();
      }, 800);
    }
  };

  const buttonDisabledAdd =
    !name.trim() ||
    invalidDonation ||
    (!isWeb3 && atCapacity) ||
    paymentMethodsLoading ||
    !selectedPaymentSnapshot;

  const buttonDisabledEdit =
    !name.trim() ||
    invalidDonation ||
    paymentMethodsLoading ||
    !selectedPaymentSnapshot;

  const disableButton =
    effectiveMode === 'add' ? buttonDisabledAdd : buttonDisabledEdit;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
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
              onChange={(event) => {
                setName(event.target.value);
                setNameError('');
              }}
              placeholder="Player name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            />

            {nameError && <p className="text-sm text-red-600">{nameError}</p>}

            {isDonationRoom ? (
              <div>
                <label className="text-fg/80 mb-1 block text-sm font-medium">
                  Donation Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={donationAmount}
                  onChange={(event) => setDonationAmount(event.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />

                {invalidDonation && (
                  <p className="mt-1 text-sm text-red-600">
                    Donation amount must be 0 or more.
                  </p>
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
                  const price = Number(config?.fundraisingPrices?.[key]) || 0;

                  return (
                    <label
                      key={key}
                      className="text-fg/80 flex items-center justify-between text-sm"
                    >
                      <span
                        title={extra?.description || ''}
                        className="flex items-center gap-2"
                      >
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
                        {price.toFixed(2)}
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
              <label className="text-fg/80 mb-1 block text-sm font-medium">
                Payment Method
              </label>

              {paymentMethodsLoading ? (
                <div className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600">
                  Loading linked payment methods...
                </div>
              ) : noLinkedPaymentMethods ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <div>
                      <p className="font-semibold">
                        No payment methods are linked to this quiz.
                      </p>
                      <p className="mt-1 text-xs">
                        Link payment methods to the quiz first, then come back
                        here to add players and keep reports accurate.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedPaymentMethodId}
                  onChange={(event) =>
                    handlePaymentMethodChange(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                >
                  {linkedPaymentMethods.map((method) => (
                    <option key={method.id} value={String(method.id)}>
                      {formatMethodLabel(method)}
                    </option>
                  ))}
                </select>
              )}

              {paymentMethodsError && (
                <p className="mt-1 text-sm text-red-600">
                  {paymentMethodsError}
                </p>
              )}

              {selectedPaymentMethod && (
                <div className="mt-2 rounded-lg bg-gray-50 p-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1 font-medium text-gray-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    Selected: {selectedPaymentMethod.method_label}
                  </div>

                  <div className="mt-1">
                    {selectedPaymentMethod.method_category ===
                    'instant_payment'
                      ? 'Manual confirmation required'
                      : selectedPaymentMethod.method_category === 'crypto'
                        ? 'Crypto payment method'
                        : 'Auto verified payment method'}
                    {' • '}
                    {selectedPaymentMethod.is_official_club_account
                      ? 'Official club account'
                      : 'Member personal account'}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-2 flex items-center gap-3">
              <input
                type="checkbox"
                id="paid"
                checked={paid}
                onChange={(event) => setPaid(event.target.checked)}
                className="h-4 w-4"
                disabled={!selectedPaymentSnapshot}
              />

              <label htmlFor="paid" className="text-fg/80 text-sm">
                Mark as paid
              </label>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="text-fg w-1/2 rounded-lg bg-gray-200 py-2 font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={disableButton}
                className={`w-1/2 rounded-lg py-2 font-semibold text-white transition ${
                  disableButton
                    ? 'cursor-not-allowed bg-gray-400'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {effectiveMode === 'add'
                  ? added
                    ? '✅ Added!'
                    : !isWeb3 && atCapacity
                      ? `Limit ${
                          Number.isFinite(maxPlayers) ? maxPlayers : ''
                        } reached`
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




