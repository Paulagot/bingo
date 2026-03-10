// src/components/Quiz/shared/PlayerDetailsForm.tsx
import React, { useMemo, useState } from 'react';
import { User, Mail, Phone, GamepadIcon } from 'lucide-react';

export interface PlayerDetailsFormData {
  purchaserName?: string;
  purchaserEmail?: string;
  purchaserPhone?: string;
  playerName: string;
}

interface PlayerDetailsFormProps {
  formData: PlayerDetailsFormData;
  onChange: (data: PlayerDetailsFormData) => void;
  mode: 'ticket' | 'join';
  totalAmount: number;
  currencySymbol: string;
  extrasTotal?: number;
  entryFee?: number;
}

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
          error ? 'border-red-300' : '',
        ].join(' ')}
      />
    </div>

    {helper && !error && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
  </div>
);

export const PlayerDetailsForm: React.FC<PlayerDetailsFormProps> = ({
  formData,
  onChange,
  mode,
  totalAmount,
  currencySymbol,
  extrasTotal = 0,
  entryFee = 0,
}) => {
  const [touched, setTouched] = useState(false);

  const updateField = (field: keyof PlayerDetailsFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  const emailOk = useMemo(() => {
    if (mode === 'join') return true; // Email not required for join flow
    const email = formData.purchaserEmail?.trim() || '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [formData.purchaserEmail, mode]);

  const isValid = useMemo(() => {
    const playerNameValid = (formData.playerName?.trim() || '') !== '';
    
    if (mode === 'join') {
      return playerNameValid;
    }
    
    // Ticket mode requires purchaser info
    return (
      (formData.purchaserName?.trim() || '') !== '' &&
      emailOk &&
      playerNameValid
    );
  }, [formData.purchaserName, formData.playerName, emailOk, mode]);

  return (
    <div className="space-y-5">
      {/* Amount Summary */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-gray-900">
              {mode === 'ticket' ? 'Ticket total' : 'Total to Pay'}
            </div>
            <div className="text-sm text-gray-600">
              Entry: {currencySymbol}{entryFee.toFixed(2)}
              {extrasTotal > 0 && ` + Extras: ${currencySymbol}${extrasTotal.toFixed(2)}`}
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-900">
            {currencySymbol}{totalAmount.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {mode === 'ticket' && (
          <>
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
              onChange={(v) => {
                updateField('purchaserEmail', v);
                setTouched(true);
              }}
              error={touched && !emailOk ? 'Please enter a valid email.' : undefined}
            />

            <InputWithIcon
              label="Phone"
              icon={<Phone className="h-full w-full" />}
              value={formData.purchaserPhone ?? ''}
              placeholder="+353..."
              type="tel"
              onChange={(v) => updateField('purchaserPhone', v)}
              helper="Optional (helps the host if there's an issue)"
            />
          </>
        )}

        <InputWithIcon
          label="Player name"
          required
          icon={<GamepadIcon className="h-full w-full" />}
          value={formData.playerName ?? ''}
          placeholder="The Quiz Master"
          onChange={(v) => updateField('playerName', v)}
          helper={mode === 'ticket' ? 'This shows on the leaderboard' : undefined}
        />
      </div>
    </div>
  );
};

export const usePlayerDetailsValidation = (
  formData: PlayerDetailsFormData,
  mode: 'ticket' | 'join'
): boolean => {
  return useMemo(() => {
    const playerNameValid = (formData.playerName?.trim() || '') !== '';
    
    if (mode === 'join') {
      return playerNameValid;
    }
    
    // Ticket mode validation
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.purchaserEmail?.trim() || '');
    return (
      (formData.purchaserName?.trim() || '') !== '' &&
      emailValid &&
      playerNameValid
    );
  }, [formData, mode]);
};