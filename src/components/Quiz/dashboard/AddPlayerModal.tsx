import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { usePlayerStore } from '../usePlayerStore';
import { useQuizConfig } from '../useQuizConfig';
import { fundraisingExtras } from '../types/quiz';
import { nanoid } from 'nanoid';
import { useQuizSocket } from '../../../sockets/QuizSocketProvider';

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
      className="fixed z-50 inset-0 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-black opacity-30" aria-hidden="true" />

        <div className="bg-white rounded-xl p-6 z-50 w-full max-w-md shadow-xl relative">
          <Dialog.Title className="text-xl font-semibold mb-4">
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
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
            {nameError && (
              <p className="text-sm text-red-600">{nameError}</p>
            )}

            <p className="text-sm text-gray-600">
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
                      className="flex items-center justify-between text-sm text-gray-700"
                    >
                      <span
                        title={extra?.description || ''}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          checked={selectedExtras.includes(key)}
                          onChange={() => handleToggleExtra(key)}
                          className="w-4 h-4"
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

            <p className="text-right font-semibold mt-2">
              Total:{' '}
              <span className="text-indigo-700">
                {currency}
                {total.toFixed(2)}
              </span>
            </p>

            <div className="mt-3">
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as 'cash' | 'revolut' | 'web3' | 'unknown'
                  )
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="cash">💶 Cash</option>
                <option value="revolut">📱 Revolut</option>
                <option value="web3">🌐 Credit/debit</option>
                <option value="unknown">❓ Unknown</option>
              </select>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <input
                type="checkbox"
                id="paid"
                checked={paid}
                onChange={(e) => setPaid(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="paid" className="text-sm text-gray-700">
                Mark as paid
              </label>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={onClose}
                className="w-1/2 py-2 rounded-lg font-semibold bg-gray-200 hover:bg-gray-300 text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddPlayer}
                disabled={!paid || !name.trim()}
                className={`w-1/2 py-2 rounded-lg font-semibold transition text-white ${
                  paid ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'
                }`}
              >
                {added ? '✅ Added!' : 'Add Player'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default AddPlayerModal;

