// src/components/mgtsystem/modals/ScheduleEliminationModal.tsx

import { useState, useMemo } from 'react';
import { X, Trophy, DollarSign, AlertCircle, Save, Tag } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '../../../features/auth';
import eliminationMgmtService, { type EliminationRoomListItem } from '../services/EliminationMgmtService';
import { currencySymbol } from '../shared/CurrencySelect';
import type { Event } from '../types/event';
import PaymentMethodSelector, { type PaymentMethodSelection } from '../shared/PaymentMethodSelector';

interface Props {
  onClose:       () => void;
  onSaved:       (roomId?: string) => void;
  event?:        Event;
  existingRoom?: EliminationRoomListItem;
}

// ── Section wrapper ────────────────────────────────────────────────────────────
const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
    {children}
  </div>
);

const SectionHeader = ({ icon, title, subtitle }: {
  icon: React.ReactNode; title: string; subtitle?: string;
}) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg mt-0.5"
      style={{ background: 'rgba(233,87,79,0.10)', color: '#e9574f' }}>
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-bold" style={{ color: '#102532' }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>{subtitle}</p>}
    </div>
  </div>
);

const inputCls = (err?: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-[#e9574f] focus:border-transparent ${
    err ? 'border-[#e9574f] bg-red-50' : 'border-[#dce1df] bg-white hover:border-[#b8c6b0]'
  }`;

export default function ScheduleEliminationModal({ onClose, onSaved, event, existingRoom }: Props) {
  const isEditMode     = !!existingRoom;
  // Use the service's normalised parseConfig so old flat-field rooms load correctly
  const existingConfig = useMemo(
    () => (existingRoom ? eliminationMgmtService.parseConfig(existingRoom) : null),
    [existingRoom],
  );

  // Convenience: grab the existing winner prize (place 1) if present
  const existingPrize = existingConfig?.prizes?.find(p => p.place === 1) ?? null;

  const user     = useAuthStore((s: any) => s.user);
  const club     = useAuthStore((s: any) => s.club);
  const hostId   = user?.id || user?.user_id || user?.club_user_id || '';
  const hostName = user?.name || user?.full_name || user?.first_name || '';

  // Currency comes from the club's reporting_currency — no user selection needed
  const currency = club?.reporting_currency ?? 'EUR';
  const sym      = currencySymbol(currency);

  const scheduledAt = existingRoom?.scheduled_at
    || event?.start_datetime
    || (event?.event_date ? `${event.event_date}T19:00:00` : null);
  const timeZone = existingRoom?.time_zone
    || event?.time_zone
    || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [entryFee,         setEntryFee]         = useState(
    existingConfig?.entryFee != null ? String(existingConfig.entryFee) : '',
  );
  const [prizeDescription, setPrizeDescription] = useState(
    existingPrize?.description ?? '',
  );
  const [prizeValue,       setPrizeValue]       = useState(
    existingPrize?.value != null ? String(existingPrize.value) : '',
  );
  const [prizeSponsor,     setPrizeSponsor]     = useState(
    existingPrize?.sponsor ?? '',
  );

  // ── Payment methods ──────────────────────────────────────────────────────────
  // Hydrated from the room's own linked_payment_methods_json on edit (NOT
  // from the event — payment methods are an activity-level concern now,
  // see PaymentMethodSelector.tsx for the full reasoning).
  const rawLinkedPaymentMethods = existingRoom?.linked_payment_methods_json;
  const existingPaymentMethods =
    typeof rawLinkedPaymentMethods === 'string'
      ? (() => { try { return JSON.parse(rawLinkedPaymentMethods); } catch { return null; } })()
      : (rawLinkedPaymentMethods ?? null);

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodSelection>({
    ticketMethodIds:  existingPaymentMethods?.ticket_method_ids  ?? [],
    onnightMethodIds: existingPaymentMethods?.onnight_method_ids ?? [],
  });

  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    const fee = Number(entryFee);
    if (!entryFee || isNaN(fee) || fee <= 0) errs.entryFee = 'Entry fee must be a positive number';
    if (!prizeDescription.trim()) errs.prizeDescription = 'Prize description is required';
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
      // Build the prizes array — same shape as quiz config_json.prizes
      const prizes = [{
        place:       1,
        value:       prizeValue ? Number(prizeValue) : null,
        description: prizeDescription.trim(),
        sponsor:     prizeSponsor.trim() || null,
      }];

      const payload = {
        scheduledAt,
        timeZone,
        entryFee:         Number(entryFee),
        currency,
        prizes,
        // Flat fields kept for backend compatibility during migration
        prizeDescription: prizeDescription.trim(),
        prizeValue:       prizeValue ? Number(prizeValue) : undefined,
        // Payment methods are now set at the activity level, written
        // directly onto the room — nothing copies these down from the
        // event anymore. See eliminationMgmtService.js.
        ticketMethodIds:  paymentMethods.ticketMethodIds,
        onnightMethodIds: paymentMethods.onnightMethodIds,
      };

      if (isEditMode && existingRoom) {
        await eliminationMgmtService.updateRoom(existingRoom.room_id, payload);
        onSaved(existingRoom.room_id);
      } else {
        const roomId = uuidv4().replace(/-/g, '').slice(0, 16).toUpperCase();
        await eliminationMgmtService.scheduleRoom({ roomId, hostId, hostName, ...payload });
        onSaved(roomId);
      }
      onClose();
    } catch (e: any) {
      const code = e?.message || '';
      if (code === 'entry_fee_required')              setError('Entry fee is required.');
      else if (code === 'prize_description_required') setError('Prize description is required.');
      else if (code === 'room_not_editable')          setError('This room can only be edited while scheduled.');
      else setError(e?.message || `Failed to ${isEditMode ? 'update' : 'schedule'} elimination. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(16,37,50,0.55)', backdropFilter: 'blur(2px)' }}>
      <div className="relative flex flex-col w-full max-w-lg rounded-xl shadow-2xl overflow-hidden"
        style={{ background: '#ffffff', maxHeight: '90vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '3px solid #e9574f', background: '#ffffff' }}>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'rgba(233,87,79,0.10)', color: '#e9574f' }}>
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#102532' }}>
                {isEditMode ? 'Edit Elimination' : 'Schedule Elimination'}
              </h2>
              <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>
                {event?.title || (isEditMode ? 'Edit game details' : 'New elimination game')}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-gray-100"
            style={{ color: '#8a9bab' }}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Event date info bar */}
        <div className="px-6 py-2.5 flex-shrink-0"
          style={{ background: 'rgba(233,87,79,0.04)', borderBottom: '1px solid #dce1df' }}>
          <p className="text-xs" style={{ color: '#52636f' }}>
            <span className="font-semibold" style={{ color: '#102532' }}>Event date: </span>
            {scheduledAt
              ? new Date(scheduledAt).toLocaleDateString('en-GB', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })
              : 'No date set on event'}
            {' '}· {timeZone}
          </p>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4" style={{ background: '#f6f1e8' }}>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
              style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
            </div>
          )}

          {/* ── Entry Fee ── */}
          <Section>
            <SectionHeader
              icon={<DollarSign className="h-4 w-4" />}
              title="Entry Fee"
              subtitle={`Set the entry fee per player — currency: ${sym} (${currency})`}
            />
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#102532' }}>
                Amount <span style={{ color: '#e9574f' }}>*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-sm font-semibold" style={{ color: '#52636f' }}>{sym}</span>
                <input
                  type="number" min="0.01" step="0.01" placeholder="5.00"
                  value={entryFee} onChange={e => setEntryFee(e.target.value)}
                  className={`${inputCls(!!fieldErrors.entryFee)} pl-7`}
                  disabled={loading}
                />
              </div>
              {fieldErrors.entryFee && (
                <p className="mt-1 text-xs" style={{ color: '#e9574f' }}>{fieldErrors.entryFee}</p>
              )}
              <p className="mt-1.5 text-xs" style={{ color: '#8a9bab' }}>
                Currency is set to your club's reporting currency. Change it in club settings.
              </p>
            </div>
          </Section>

          {/* ── Prize ── */}
          <Section>
            <SectionHeader
              icon={<Trophy className="h-4 w-4" />}
              title="Prize"
              subtitle="The prize for the last player standing"
            />
            <div className="space-y-4">

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#102532' }}>
                  Prize Description <span style={{ color: '#e9574f' }}>*</span>
                </label>
                <input
                  type="text" maxLength={500} placeholder="e.g. Weekend away for two"
                  value={prizeDescription} onChange={e => setPrizeDescription(e.target.value)}
                  className={inputCls(!!fieldErrors.prizeDescription)}
                  disabled={loading}
                />
                {fieldErrors.prizeDescription && (
                  <p className="mt-1 text-xs" style={{ color: '#e9574f' }}>{fieldErrors.prizeDescription}</p>
                )}
              </div>

              {/* Value */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#102532' }}>
                  Prize Value <span className="font-normal" style={{ color: '#8a9bab' }}>(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-sm font-semibold" style={{ color: '#52636f' }}>{sym}</span>
                  <input
                    type="number" min="0" step="0.01" placeholder="500.00"
                    value={prizeValue} onChange={e => setPrizeValue(e.target.value)}
                    className={`${inputCls(!!fieldErrors.prizeValue)} pl-7`}
                    disabled={loading}
                  />
                </div>
                {fieldErrors.prizeValue && (
                  <p className="mt-1 text-xs" style={{ color: '#e9574f' }}>{fieldErrors.prizeValue}</p>
                )}
              </div>

              {/* Sponsor */}
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#102532' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Tag className="h-3 w-3" style={{ color: '#e9574f' }} />
                    Sponsor <span className="font-normal" style={{ color: '#8a9bab' }}>(optional)</span>
                  </span>
                </label>
                <input
                  type="text" maxLength={200} placeholder="e.g. Buddies for Paws"
                  value={prizeSponsor} onChange={e => setPrizeSponsor(e.target.value)}
                  className={inputCls()}
                  disabled={loading}
                />
                <p className="mt-1.5 text-xs" style={{ color: '#8a9bab' }}>
                  Shown on the end game screen alongside the winner's name.
                </p>
              </div>

            </div>
          </Section>

          {/* ── Payment Methods ── */}
          <PaymentMethodSelector
            mode="split"
            value={paymentMethods}
            onChange={setPaymentMethods}
            disabled={loading}
          />

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid #dce1df', background: '#fbf8f2' }}>
          <button type="button" onClick={onClose} disabled={loading}
            className="rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-40"
            style={{ borderColor: '#dce1df', color: '#52636f' }}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ background: '#e9574f' }}>
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
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