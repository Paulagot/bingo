// src/components/ticketedEvent/WalkinFlow.tsx
//
// Walk-in flow for ticketed events.
// Used by door staff to add guests who pay on the night.
// Accessible via operator token (?token=xyz) or club session.
//
// UPDATED: Ticket type selection step added when multiple types are available.
//          Uses the same getAvailableTicketTypes logic as the public purchase flow
//          (served by GET /api/quiz/tickets/room/:roomId/info).

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle, CheckCircle2, UserPlus, Ticket } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketTypeOption {
  id:        string;
  name:      string;
  price:     string;
  soldCount: number;
  remaining: number | null;
}

interface PaymentMethod {
  id:             number;
  methodLabel:    string;
  methodCategory: string;
  providerName:   string | null;
  isEnabled?:     boolean;
  methodConfig?:  Record<string, unknown>;
}

interface RoomInfo {
  roomId:          string;
  status:          string;
  fundraisingMode: string;
  entryFee:        number;
  currencySymbol:  string;
  hostName:        string;
  clubName?:       string | null;
  gameType?:       string;
  ticketTypes?:    TicketTypeOption[];
}

interface WalkinResult {
  ticketId:       string;
  purchaserName:  string;
  totalAmount:    number;
  currency:       string;
  paymentMethod:  string;
  ticketTypeName: string | null;
}

interface WalkinFlowProps {
  roomId:  string;
  token?:  string | null;
  onDone?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders(token?: string | null): Record<string, string> {
  const stored = typeof localStorage !== 'undefined'
    ? localStorage.getItem('auth_token')
    : null;
  const bearer = token || stored;
  return {
    'Content-Type': 'application/json',
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const WalkinFlow: React.FC<WalkinFlowProps> = ({ roomId, token, onDone }) => {
  const navigate = useNavigate();

  const [step, setStep]         = useState<'loading' | 'form' | 'submitting' | 'done' | 'error'>('loading');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [methods,  setMethods]  = useState<PaymentMethod[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [name,             setName]            = useState('');
  const [email,            setEmail]           = useState('');
  const [selectedMethod,   setSelectedMethod]  = useState<PaymentMethod | null>(null);
  const [selectedType,     setSelectedType]    = useState<TicketTypeOption | null>(null);
  const [customAmount,     setCustomAmount]    = useState('');
  const [submitError,      setSubmitError]     = useState<string | null>(null);
  const [result,           setResult]          = useState<WalkinResult | null>(null);

  // ── Load room info + onnight payment methods ──────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        // Use the public info endpoint — it already returns available ticket types
        const infoRes = await fetch(`/api/quiz/tickets/room/${roomId}/info`);
        if (!infoRes.ok) {
          const d = await infoRes.json().catch(() => ({}));
          throw new Error(d.error || 'Room not found');
        }
        const info = await infoRes.json();

        if (info.gameType && info.gameType !== 'ticketed_event') {
          throw new Error('This walk-in page is only for ticketed events.');
        }

        // Only allow walk-ins when the room is open (check-in running)
        if (info.status !== 'open') {
          navigate('/', { replace: true });
          return;
        }

        const ticketTypes: TicketTypeOption[] = Array.isArray(info.ticketTypes)
          ? info.ticketTypes
          : [];

        setRoomInfo({
          roomId:          info.roomId,
          status:          info.status,
          fundraisingMode: info.fundraisingMode || 'fixed_fee',
          entryFee:        parseFloat(info.entryFee ?? 0),
          currencySymbol:  info.currencySymbol || '€',
          hostName:        info.hostName || '',
          clubName:        info.clubName || null,
          gameType:        info.gameType,
          ticketTypes,
        });

        // Auto-select if only one type available
        if (ticketTypes.length === 1 && ticketTypes[0]) {
          setSelectedType(ticketTypes[0]);
        }

        // On-night payment methods — use context=onnight to get cash, card tap etc.
        const methodsRes = await fetch(
          `/api/quiz-rooms/${roomId}/available-payment-methods?context=onnight`,
          { headers: getAuthHeaders(token) }
        );
        const methodsData = await methodsRes.json().catch(() => ({ ok: false, paymentMethods: [] }));
        const all: PaymentMethod[] = Array.isArray(methodsData.paymentMethods)
          ? methodsData.paymentMethods
          : [];

        const enabled = all.filter(m => m.isEnabled !== false);
        setMethods(enabled);
        if (enabled.length > 0 && enabled[0]) setSelectedMethod(enabled[0]);

        setStep('form');
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load event info');
        setStep('error');
      }
    };

    load();
  }, [roomId, token, navigate]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const isDonation    = roomInfo?.fundraisingMode === 'donation';
  const ticketTypes   = roomInfo?.ticketTypes ?? [];
  const hasMultiTypes = ticketTypes.length > 1;

  const amount = useMemo(() => {
    if (isDonation) {
      const parsed = parseFloat(customAmount);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    // Use selected ticket type price, fall back to room entryFee
    if (selectedType) return parseFloat(selectedType.price) || 0;
    return roomInfo?.entryFee ?? 0;
  }, [isDonation, customAmount, selectedType, roomInfo]);

  const sym = roomInfo?.currencySymbol ?? '€';

  const isValid = name.trim().length > 0 &&
    selectedMethod !== null &&
    (isDonation ? amount > 0 : true) &&
    (!hasMultiTypes || selectedType !== null);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isValid || !roomInfo) return;
    setSubmitError(null);
    setStep('submitting');

    try {
      const res = await fetch('/api/ticketed-event/checkin/' + roomId + '/walkin', {
        method:  'POST',
        headers: getAuthHeaders(token),
        body: JSON.stringify({
          purchaserName:       name.trim(),
          purchaserEmail:      email.trim() || null,
          playerName:          name.trim(),
          totalAmount:         amount,
          paymentMethod:       selectedMethod!.providerName || selectedMethod!.methodCategory,
          clubPaymentMethodId: selectedMethod!.id,
          confirmedByName:     token ? 'Door staff' : 'Admin',
          ticketTypeId:        selectedType?.id   ?? null,
          ticketTypeName:      selectedType?.name ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to create ticket');

      setResult({
        ticketId:       data.ticketId,
        purchaserName:  name.trim(),
        totalAmount:    amount,
        currency:       sym,
        paymentMethod:  selectedMethod!.methodLabel,
        ticketTypeName: selectedType?.name ?? null,
      });
      setStep('done');
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to check in. Please try again.');
      setStep('form');
    }
  };

  // ── Reset for next guest ──────────────────────────────────────────────────
  const handleNext = () => {
    setName('');
    setEmail('');
    setCustomAmount('');
    // Keep type selected if only one — reset if multiple
    if (hasMultiTypes) setSelectedType(null);
    setSelectedMethod(methods[0] ?? null);
    setResult(null);
    setSubmitError(null);
    setStep('form');
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#f6f1e8] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#157f85] mx-auto mb-3" />
          <p className="text-sm text-[#52636f]">Loading event info…</p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-[#f6f1e8] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow p-6 max-w-sm w-full text-center">
          <AlertTriangle className="h-8 w-8 text-[#e9574f] mx-auto mb-3" />
          <p className="text-sm font-semibold text-[#102532]">Cannot open walk-in</p>
          <p className="text-xs text-[#52636f] mt-1">{loadError}</p>
        </div>
      </div>
    );
  }

  if (step === 'done' && result) {
    return (
      <div className="min-h-screen bg-[#f6f1e8] flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-[#102532] mb-1">Checked in!</h2>
          <p className="text-2xl font-black text-[#157f85] mb-1">{result.purchaserName}</p>
          {result.ticketTypeName && (
            <p className="text-sm font-semibold text-[#52636f] mb-1">{result.ticketTypeName}</p>
          )}
          <p className="text-sm text-[#52636f] mb-4">
            {result.currency}{result.totalAmount.toFixed(2)} · {result.paymentMethod}
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleNext}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#157f85] px-4 py-3 text-sm font-bold text-white hover:bg-[#0e6268] transition-colors"
            >
              <UserPlus className="h-4 w-4" />
              Next guest
            </button>
            {onDone && (
              <button
                type="button"
                onClick={onDone}
                className="w-full rounded-lg border border-[#dce1df] bg-white px-4 py-2.5 text-sm font-semibold text-[#52636f] hover:bg-[#f6f1e8] transition-colors"
              >
                Back to dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f6f1e8]">
      {/* Header */}
      <div className="bg-white border-b border-[#dce1df] px-4 py-4">
        <div className="max-w-md mx-auto">
          <p className="text-xs text-[#8a9bab] uppercase tracking-wide font-semibold mb-0.5">
            Walk-in check-in
          </p>
          <h1 className="text-lg font-bold text-[#102532]">
            {roomInfo?.clubName || roomInfo?.hostName || 'Event'}
          </h1>
          <p className="text-xs text-[#52636f] mt-0.5">
            {isDonation
              ? 'Enter guest details and collect donation'
              : selectedType
                ? `${selectedType.name}: ${sym}${parseFloat(selectedType.price).toFixed(2)}`
                : ticketTypes.length > 1
                  ? 'Select a ticket type below'
                  : `Entry fee: ${sym}${roomInfo?.entryFee?.toFixed(2)}`}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">

        {submitError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* ── Ticket type selector (only when multiple types) ── */}
        {hasMultiTypes && (
          <div className="bg-white rounded-xl border border-[#dce1df] p-4">
            <h2 className="text-sm font-bold text-[#102532] mb-3">Ticket type</h2>
            <div className="space-y-2">
              {ticketTypes.map(type => {
                const isSelected = selectedType?.id === type.id;
                const price      = parseFloat(type.price);
                const isLow      = type.remaining !== null && type.remaining <= 5;

                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type)}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-[#157f85] bg-[rgba(21,127,133,0.06)]'
                        : 'border-[#dce1df] bg-white hover:border-[#b8c6b0]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                          isSelected ? 'bg-[#157f85] text-white' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isSelected
                            ? <CheckCircle2 className="h-4 w-4" />
                            : <Ticket className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#157f85]' : 'text-[#102532]'}`}>
                            {type.name}
                          </p>
                          {type.remaining !== null && (
                            <p className={`text-xs ${isLow ? 'text-amber-600' : 'text-[#8a9bab]'}`}>
                              {type.remaining} remaining
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`text-base font-bold flex-shrink-0 ${isSelected ? 'text-[#157f85]' : 'text-[#102532]'}`}>
                        {sym}{isNaN(price) ? type.price : price.toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Guest details */}
        <div className="bg-white rounded-xl border border-[#dce1df] p-4 space-y-3">
          <h2 className="text-sm font-bold text-[#102532]">Guest details</h2>

          <div>
            <label className="block text-xs font-semibold text-[#52636f] mb-1">
              Name <span className="text-[#e9574f]">*</span>
            </label>
            <input
              type="text"
              placeholder="Guest name"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full rounded-lg border border-[#dce1df] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#52636f] mb-1">
              Email <span className="text-[#8a9bab] font-normal">(optional)</span>
            </label>
            <input
              type="email"
              placeholder="guest@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-[#dce1df] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85]"
            />
          </div>
        </div>

        {/* Donation amount */}
        {isDonation && (
          <div className="bg-white rounded-xl border border-[#dce1df] p-4">
            <h2 className="text-sm font-bold text-[#102532] mb-3">Donation amount</h2>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#52636f]">
                {sym}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className="w-full rounded-lg border border-[#dce1df] pl-7 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#157f85]"
              />
            </div>
          </div>
        )}

        {/* Payment method */}
        <div className="bg-white rounded-xl border border-[#dce1df] p-4">
          <h2 className="text-sm font-bold text-[#102532] mb-3">Payment method</h2>

          {methods.length === 0 ? (
            <p className="text-sm text-[#8a9bab]">No on-night payment methods configured.</p>
          ) : (
            <div className="space-y-2">
              {methods.map(method => {
                const isSelected = selectedMethod?.id === method.id;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedMethod(method)}
                    className={`w-full rounded-xl border-2 px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-[#157f85] bg-[rgba(21,127,133,0.06)]'
                        : 'border-[#dce1df] bg-white hover:border-[#b8c6b0]'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${isSelected ? 'text-[#157f85]' : 'text-[#102532]'}`}>
                      {method.methodLabel}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Amount summary */}
        {amount > 0 && (
          <div className="bg-[rgba(21,127,133,0.06)] rounded-xl border border-[rgba(21,127,133,0.2)] px-4 py-3 flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-[#52636f]">Total to collect</span>
              {selectedType && (
                <p className="text-xs text-[#8a9bab] mt-0.5">{selectedType.name}</p>
              )}
            </div>
            <span className="text-xl font-black text-[#102532]">
              {sym}{amount.toFixed(2)}
            </span>
          </div>
        )}

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || step === 'submitting'}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#157f85] px-4 py-4 text-base font-bold text-white hover:bg-[#0e6268] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {step === 'submitting' ? (
            <><Loader2 className="h-5 w-5 animate-spin" />Checking in…</>
          ) : (
            <><CheckCircle2 className="h-5 w-5" />Confirm &amp; Check In</>
          )}
        </button>

        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="w-full rounded-xl border border-[#dce1df] bg-white px-4 py-3 text-sm font-semibold text-[#52636f] hover:bg-[#f6f1e8] transition-colors"
          >
            Cancel
          </button>
        )}

      </div>
    </div>
  );
};

export default WalkinFlow;