// src/components/Quiz/tickets/PurchaseDetailsStep.tsx
import React, { useMemo, useState } from 'react';
import { ChevronLeft, User, Mail, Phone, GamepadIcon } from 'lucide-react';
import type { RoomInfo, PurchaseFormData } from './types';

interface Props {
  roomInfo: RoomInfo;
  formData: PurchaseFormData;
  setFormData: React.Dispatch<React.SetStateAction<PurchaseFormData>>;
  onBack: () => void;
  onContinue: () => void;
  totalAmount: number;
  extrasTotal: number;
}

// ✅ Move this OUTSIDE the main component
const InputWithIcon: React.FC<{
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (v: string) => void;
  helper?: string;
  error?: string;
}> = ({
  label,
  required,
  icon,
  value,
  placeholder,
  type = 'text',
  onChange,
  helper,
  error,
}) => (
  <div>
    <label className="mb-2 block text-sm font-medium text-gray-700">
      {label} {required && <span className="text-red-500">*</span>}
    </label>

    <div className="relative">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
        <div className="h-4 w-4 sm:h-5 sm:w-5">{icon}</div>
      </div>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        className={[
          'w-full rounded-lg border border-gray-300 bg-white',
          'text-sm sm:text-base',
          'py-2.5 sm:py-3',
          'pl-11 sm:pl-12',
          'pr-3 sm:pr-4',
          'focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500',
        ].join(' ')}
      />
    </div>

    {helper && !error && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
);

export const PurchaseDetailsStep: React.FC<Props> = ({
  roomInfo,
  formData,
  setFormData,
  onBack,
  onContinue,
  totalAmount,
  extrasTotal,
}) => {
  const [touched, setTouched] = useState(false);

  const updateField = (field: keyof PurchaseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const emailOk = useMemo(() => {
    const email = formData.purchaserEmail?.trim() || '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [formData.purchaserEmail]);

  const isValid = useMemo(() => {
    return (
      (formData.purchaserName?.trim() || '') !== '' &&
      emailOk &&
      (formData.playerName?.trim() || '') !== ''
    );
  }, [formData.purchaserName, formData.playerName, emailOk]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-36 space-y-5">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">Ticket total</div>
              <div className="text-sm text-gray-600">
                Entry: {roomInfo.currencySymbol}
                {roomInfo.entryFee.toFixed(2)}
                {extrasTotal > 0 &&
                  ` + Extras: ${roomInfo.currencySymbol}${extrasTotal.toFixed(2)}`}
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {roomInfo.currencySymbol}
              {totalAmount.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <InputWithIcon
            label="Full name"
            required
            icon={<User className="h-full w-full" />}
            value={formData.purchaserName ?? ''}
            placeholder="John Doe"
            onChange={(v) => updateField('purchaserName', v)}
          />

          <InputWithIcon
            label="Email"
            required
            icon={<Mail className="h-full w-full" />}
            value={formData.purchaserEmail ?? ''}
            placeholder="john@example.com"
            type="email"
            onChange={(v) => updateField('purchaserEmail', v)}
            error={touched && !emailOk ? 'Please enter a valid email.' : undefined}
          />

          <InputWithIcon
            label="Phone"
            icon={<Phone className="h-full w-full" />}
            value={formData.purchaserPhone ?? ''}
            placeholder="+353..."
            type="tel"
            onChange={(v) => updateField('purchaserPhone', v)}
            helper="Optional (helps the host if there’s an issue)"
          />

          <InputWithIcon
            label="Player name"
            required
            icon={<GamepadIcon className="h-full w-full" />}
            value={formData.playerName ?? ''}
            placeholder="The Quiz Master"
            onChange={(v) => updateField('playerName', v)}
            helper="This shows on the leaderboard"
          />
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
        <div className="flex flex-col space-y-3 sm:flex-row sm:space-x-3 sm:space-y-0">
          <button
            onClick={onBack}
            className="flex items-center justify-center space-x-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 sm:px-6 sm:py-3 sm:text-base"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back</span>
          </button>

          <button
            onClick={() => {
              setTouched(true);
              if (isValid) onContinue();
            }}
            className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 sm:px-6 sm:py-3 sm:text-base disabled:opacity-50"
            disabled={!isValid}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};


