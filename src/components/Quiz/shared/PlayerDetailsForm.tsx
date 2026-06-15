// src/components/Quiz/shared/PlayerDetailsForm.tsx
import React, { useMemo, useState } from 'react';
import { User, Mail, GamepadIcon } from 'lucide-react';

export interface PlayerDetailsFormData {
  purchaserName?: string;
  purchaserEmail?: string;
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
  /** When true: hides the amount summary — donation amount isn't known at this step */
  isDonationRoom?: boolean;
  /** When true: shows a two-column layout on desktop to avoid scrolling */
  wideLayout?: boolean;
  /**
   * When true: hides the player name field — ticketed events don't have a
   * game leaderboard so a display name is irrelevant. playerName will be
   * auto-filled from purchaserName before the ticket is created.
   */
  isTicketedEvent?: boolean;
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
}> = ({ label, required, icon, value, placeholder, type = 'text', onChange, helper, error }) => (
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
  isDonationRoom = false,
  wideLayout = false,
  isTicketedEvent = false,
}) => {
  const [touched, setTouched] = useState(false);

  const updateField = (field: keyof PlayerDetailsFormData, value: string) => {
    onChange({ ...formData, [field]: value });
  };

  const emailOk = useMemo(() => {
    if (mode === 'join') return true;
    const email = formData.purchaserEmail?.trim() || '';
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }, [formData.purchaserEmail, mode]);

  const summary = !isDonationRoom ? (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="font-medium text-gray-900">
            {mode === 'ticket' ? 'Ticket total' : 'Total to Pay'}
          </div>
          <div className="text-sm text-gray-600">
            Entry: {currencySymbol}{entryFee}
            {extrasTotal > 0 && ` + Extras: ${currencySymbol}${extrasTotal}`}
          </div>
        </div>
        <div className="text-2xl font-bold text-blue-900">
          {currencySymbol}{totalAmount}
        </div>
      </div>
    </div>
  ) : null;

  // ── Wide two-column layout (ticket mode, desktop) ─────────────────────────
  if (wideLayout && mode === 'ticket') {
    return (
      <div className="space-y-4">
        <div className={`sm:grid sm:gap-6 ${isTicketedEvent ? 'sm:grid-cols-1 max-w-md' : 'sm:grid-cols-2'}`}>
          <div className="space-y-4">
            {summary}
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
          </div>

          {/* Player name column — hidden for ticketed events */}
          {!isTicketedEvent && (
            <div className="mt-4 sm:mt-0 space-y-4">
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
          )}
        </div>
      </div>
    );
  }

  // ── Single-column layout ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {summary}
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
          </>
        )}

        {/* Player name — hidden for ticketed events */}
        {!isTicketedEvent && (
          <InputWithIcon
            label="Player name"
            required
            icon={<GamepadIcon className="h-full w-full" />}
            value={formData.playerName ?? ''}
            placeholder="The Quiz Master"
            onChange={(v) => updateField('playerName', v)}
            helper={mode === 'ticket' ? 'This shows on the leaderboard' : undefined}
          />
        )}
      </div>
    </div>
  );
};

export const usePlayerDetailsValidation = (
  formData: PlayerDetailsFormData,
  mode: 'ticket' | 'join',
  isTicketedEvent = false,
): boolean => {
  return useMemo(() => {
    if (mode === 'join') {
      return (formData.playerName?.trim() || '') !== '';
    }

    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      formData.purchaserEmail?.trim() || ''
    );
    const nameValid = (formData.purchaserName?.trim() || '') !== '';

    // Ticketed events don't require a player name
    if (isTicketedEvent) {
      return nameValid && emailValid;
    }

    const playerNameValid = (formData.playerName?.trim() || '') !== '';
    return nameValid && emailValid && playerNameValid;
  }, [formData, mode, isTicketedEvent]);
};