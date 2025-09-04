import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { usePlayerStore } from '../hooks/usePlayerStore';
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

const AddPlayerModal: React.FC<AddPlayerModalProps> = ({
  isOpen,
  onClose,
  initialName,
  roomId,
}) => {
  const { config } = useQuizConfig();
  // We only need `players` here; drop the unused `addPlayer`
  const { players } = usePlayerStore();
// 👉 Capacity derived inside component, after hooks
const isWeb3 = config?.paymentMethod === 'web3' || config?.isWeb3Room;
const maxPlayers = isWeb3 ? Number.POSITIVE_INFINITY : (config?.roomCaps?.maxPlayers ?? 20);
const atCapacity = isWeb3 ? false : ((players?.length || 0) >= maxPlayers);

 

  const [name, setName] = useState(initialName);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [paymentMethod, setPaymentMethod] =
    useState<'cash' | 'revolut' | 'web3' | 'unknown'>('cash');
  const [paid, setPaid] = useState(false);
  const [added, setAdded] = useState(false);
  const [nameError, setNameError] = useState('');

  const { socket } = useQuizSocket();

  const currency = config?.currencySymbol || '€';
  const entryFee = Number(config?.entryFee) || 0;

  const enabledExtras = Object.entries(config?.fundraisingOptions || {}).filter(
    ([_, enabled]) => enabled
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

    // 1) Prevent duplicate names locally
    const nameAlreadyUsed = players.some(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (nameAlreadyUsed) {
      setNameError(
        'This name is already used. Please choose a different one.'
      );
      return;
    }

    // 2) Build the newPlayer payload exactly as the back-end expects
    const sanitizedMethod: 'cash' | 'revolut' | 'other' =
      paymentMethod === 'cash' || paymentMethod === 'revolut'
        ? paymentMethod
        : 'other';

    const newPlayer = {
      id: nanoid(),
      name: trimmedName,
      paid,
      paymentMethod,
      credits: 0,
      extras: selectedExtras,
      extraPayments: Object.fromEntries(
        selectedExtras.map((key) => [
          key,
          {
            method: sanitizedMethod,
            amount: config?.fundraisingPrices?.[key] || 0,
          },
        ])
      ),
    };

    // 3) Emit to the server so it can call addPlayerToQuizRoom(...) and broadcast list‐updates
    if (!socket) {
      console.error(
        '[AddPlayerModal] socket is not connected yet; cannot add player'
      );
      return;
    }
    socket.emit('join_quiz_room', {
      roomId,
      user: newPlayer,
      role: 'player',
    });

    setAdded(true);
    if (debug) console.log('→ Emitted join_quiz_room:', newPlayer);

    // 4) Close the modal after a short confirmation pulse
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1200);
  };

  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setSelectedExtras([]);
      setPaymentMethod('cash');
      setPaid(false);
      setAdded(false);
      setNameError('');
    }
  }, [isOpen, initialName]);

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
            Add Player
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
            {nameError && (
              <p className="text-sm text-red-600">{nameError}</p>
            )}

            <p className="text-fg/70 text-sm">
              Entry Fee: {currency}
              {entryFee.toFixed(2)}
            </p>

            {enabledExtras.length > 0 && (
              <div className="space-y-2">
                {enabledExtras.map(([key]) => {
                  const extra = fundraisingExtras[key];
                  const price = config?.fundraisingPrices?.[key] || 0;

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
                {total.toFixed(2)}
              </span>
            </p>

            <div className="mt-3">
              <label className="text-fg/80 mb-1 block text-sm font-medium">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as 'cash' | 'revolut' | 'web3' | 'unknown'
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="cash">💶 Cash</option>
                <option value="revolut">📱 Revolut</option>
                <option value="web3">🌐 Credit/debit</option>
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
  onClick={handleAddPlayer}
  disabled={!paid || !name.trim() || (!isWeb3 && atCapacity)}
  className={`w-1/2 rounded-lg py-2 font-semibold text-white transition ${
    (!paid || !name.trim() || (!isWeb3 && atCapacity))
      ? 'cursor-not-allowed bg-gray-400'
      : 'bg-indigo-600 hover:bg-indigo-700'
  }`}
>
  {added ? '✅ Added!' : (!isWeb3 && atCapacity) ? `Limit ${Number.isFinite(maxPlayers) ? maxPlayers : ''} reached` : 'Add Player'}
</button>


            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default AddPlayerModal;

