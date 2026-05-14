// src/components/mgtsystem/modals/ScheduleEliminationModal.tsx
//
// Handles both scheduling (create) and editing an elimination room.
// Pass `existingRoom` to enter edit mode — fields pre-fill, submit calls PATCH.
// Without `existingRoom` the modal is in create mode — submit calls POST.

import { useState, useMemo } from 'react';
import { X, Trophy, Users, CalendarDays, DollarSign, AlertCircle, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '../../../features/auth';
import eliminationMgmtService, {
  type EliminationRoomListItem,
} from '../services/EliminationMgmtService';
import CurrencySelect, { currencySymbol } from '../shared/CurrencySelect';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  onClose:       () => void;
  onSaved:       () => void;             // called on success in both modes
  existingRoom?: EliminationRoomListItem; // present = edit mode
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIMEZONES = [
  'Europe/Dublin', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'America/Vancouver',
  'Africa/Lagos',
  'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore',
  'Australia/Sydney', 'Pacific/Auckland',
  'UTC',
];

function localToIso(dateStr: string, timeStr: string): string | null {
  if (!dateStr || !timeStr) return null;
  return `${dateStr}T${timeStr}:00`;
}

function isoToDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try { return new Date(iso).toISOString().slice(0, 10); } catch { return ''; }
}

function isoToTime(iso: string | null | undefined): string {
  if (!iso) return '19:00';
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  } catch { return '19:00'; }
}

function parseConfig(room: EliminationRoomListItem) {
  if (!room.config_json) return null;
  if (typeof room.config_json === 'object') return room.config_json as any;
  try { return JSON.parse(room.config_json as string); } catch { return null; }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ScheduleEliminationModal({ onClose, onSaved, existingRoom }: Props) {
  const isEditMode     = !!existingRoom;
  const existingConfig = useMemo(
    () => (existingRoom ? parseConfig(existingRoom) : null),
    [existingRoom],
  );

  const user     = useAuthStore((s: any) => s.user);
  const hostId   = user?.id || user?.user_id || user?.club_user_id || '';
  const hostName = user?.name || user?.full_name || user?.first_name || '';

  // ── Form state — pre-fill from existingRoom in edit mode ─────────────────
  const [date,             setDate]             = useState(() => isoToDate(existingRoom?.scheduled_at));
  const [time,             setTime]             = useState(() => isoToTime(existingRoom?.scheduled_at));
  const [timeZone,         setTimeZone]         = useState(existingRoom?.time_zone ?? 'Europe/Dublin');
  const [entryFee,         setEntryFee]         = useState(
    existingConfig?.entryFee != null ? String(existingConfig.entryFee) : '');
  const [currency,         setCurrency]         = useState(existingConfig?.currency ?? 'EUR');
  const [maxPlayers,       setMaxPlayers]       = useState(
    existingConfig?.maxPlayers != null ? String(existingConfig.maxPlayers) : '50');
  const [prizeDescription, setPrizeDescription] = useState(
    existingConfig?.prizeDescription ?? existingRoom?.prize_description ?? '');
  const [prizeValue,       setPrizeValue]       = useState(
    existingRoom?.prize_value != null ? String(existingRoom.prize_value) : '');

  // ── UI state ───────────────────────────────────────────────────────────────
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const fee = Number(entryFee);
    if (!entryFee || isNaN(fee) || fee <= 0)
      errs.entryFee = 'Entry fee must be a positive number';
    const players = Number(maxPlayers);
    if (!maxPlayers || isNaN(players) || players < 2 || players > 500)
      errs.maxPlayers = 'Max players must be between 2 and 500';
    if (!prizeDescription.trim())
      errs.prizeDescription = 'Prize description is required';
    if (prizeValue) {
      const pv = Number(prizeValue);
      if (isNaN(pv) || pv < 0) errs.prizeValue = 'Prize value must be a positive number';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      const scheduledAt = localToIso(date, time);
      const payload = {
        scheduledAt,
        timeZone,
        entryFee:         Number(entryFee),
        currency,
        maxPlayers:       Number(maxPlayers),
        prizeDescription: prizeDescription.trim(),
        prizeValue:       prizeValue ? Number(prizeValue) : null,
      };

      if (isEditMode && existingRoom) {
        await eliminationMgmtService.updateRoom(existingRoom.room_id, payload);
      } else {
        const roomId = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();
        await eliminationMgmtService.scheduleRoom({ roomId, hostId, hostName, ...payload });
      }

      onSaved();
      onClose();
    } catch (e: any) {
      const code = e?.message || '';
      if (code === 'entry_fee_required')
        setError('Entry fee is required.');
      else if (code === 'max_players_invalid')
        setError('Max players must be between 2 and 500.');
      else if (code === 'prize_description_required')
        setError('Prize description is required.');
      else if (code === 'room_not_editable')
        setError('This room can only be edited while it is scheduled.');
      else
        setError(e?.message || `Failed to ${isEditMode ? 'update' : 'schedule'} elimination. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  const sym = currencySymbol(currency);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
              <Trophy className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEditMode ? 'Edit Elimination' : 'Schedule Elimination'}
              </h2>
              <p className="text-xs text-gray-500">
                {isEditMode
                  ? 'Update the details for this elimination game'
                  : 'Set up a new elimination game event'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Date & Time */}
          <fieldset>
            <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              <CalendarDays className="h-3.5 w-3.5" /> Date &amp; Time
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
              <select value={timeZone} onChange={e => setTimeZone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </fieldset>

          {/* Entry Fee */}
          <fieldset>
            <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              <DollarSign className="h-3.5 w-3.5" /> Entry Fee
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Currency</label>
                <CurrencySelect value={currency} onChange={setCurrency} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Amount <span className="text-red-500">*</span>
                </label>
                <input type="number" min="0.01" step="0.01" placeholder="5.00"
                  value={entryFee} onChange={e => setEntryFee(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                    fieldErrors.entryFee
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`} />
                {fieldErrors.entryFee && <p className="mt-1 text-xs text-red-600">{fieldErrors.entryFee}</p>}
              </div>
            </div>
          </fieldset>

          {/* Players */}
          <fieldset>
            <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              <Users className="h-3.5 w-3.5" /> Players
            </legend>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max Players <span className="text-red-500">*</span>
              </label>
              <input type="number" min="2" max="500" step="1" placeholder="50"
                value={maxPlayers} onChange={e => setMaxPlayers(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                  fieldErrors.maxPlayers
                    ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                    : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                }`} />
              {fieldErrors.maxPlayers && <p className="mt-1 text-xs text-red-600">{fieldErrors.maxPlayers}</p>}
            </div>
          </fieldset>

          {/* Prize */}
          <fieldset>
            <legend className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
              <Trophy className="h-3.5 w-3.5" /> Prize
            </legend>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Prize Description <span className="text-red-500">*</span>
                </label>
                <input type="text" maxLength={500} placeholder="e.g. Weekend away for two"
                  value={prizeDescription} onChange={e => setPrizeDescription(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                    fieldErrors.prizeDescription
                      ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                      : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                  }`} />
                {fieldErrors.prizeDescription && <p className="mt-1 text-xs text-red-600">{fieldErrors.prizeDescription}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Prize Value <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                    {sym}
                  </span>
                  <input type="number" min="0" step="0.01" placeholder="500.00"
                    value={prizeValue} onChange={e => setPrizeValue(e.target.value)}
                    className={`w-full rounded-lg border pl-7 pr-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 ${
                      fieldErrors.prizeValue
                        ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                        : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    }`} />
                </div>
                {fieldErrors.prizeValue && <p className="mt-1 text-xs text-red-600">{fieldErrors.prizeValue}</p>}
              </div>
            </div>
          </fieldset>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          <button type="button" onClick={onClose} disabled={loading}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {isEditMode ? 'Saving…' : 'Scheduling…'}
              </>
            ) : isEditMode ? (
              <><Save className="h-3.5 w-3.5" /> Save changes</>
            ) : (
              <><Trophy className="h-3.5 w-3.5" /> Schedule Elimination</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}