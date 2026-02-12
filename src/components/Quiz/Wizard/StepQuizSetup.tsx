import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Users, AlertCircle, Check, ChevronRight, DollarSign, Sparkles } from 'lucide-react';
import { WizardStepProps } from './WizardStepProps';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';
import ClearSetupButton from './ClearSetupButton';

const Character = ({ message }: { message: string }) => {
  const getBubbleColor = (): string => {
    if (message.includes('Perfect!') || message.includes('🎉')) return 'bg-green-50 border-green-200';
    if (message.includes('Excellent!') || message.includes('choice!')) return 'bg-blue-50 border-blue-200';
    if (message.includes('ready') || message.includes('configured')) return 'bg-indigo-50 border-indigo-200';
    return 'bg-gray-50 border-border';
  };
  return (
    <div className="mb-3 flex items-center gap-2 sm:mb-6 sm:gap-4">
      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-gray-300 bg-gray-200 sm:h-16 sm:w-16">
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-300">
          <span className="text-fg/60 text-xs font-medium sm:text-sm">IMG</span>
        </div>
      </div>
      <div className={`relative flex-1 rounded-lg border p-2 shadow-lg sm:rounded-2xl sm:p-4 ${getBubbleColor()}`}>
        <p className="text-fg/80 text-xs leading-tight sm:text-sm sm:leading-normal">{message}</p>
      </div>
    </div>
  );
};

/**
 * GridPicker
 * - Click to open a grid popup
 * - Closes on outside click
 */
function GridPicker({
  label,
  value,
  placeholder = '--',
  options,
  columns,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  options: string[];
  columns: number; // controls grid layout (e.g. 6 for 6x4)
  onChange: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleDown);
    return () => document.removeEventListener('mousedown', handleDown);
  }, []);

  return (
    <div className="space-y-1" ref={rootRef}>
      <label className="text-fg/80 text-xs font-medium sm:text-sm">{label}</label>

      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="border-border w-full rounded-lg border-2 px-3 py-2.5 text-left text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3"
        >
          {value ? value : <span className="text-fg/50">{placeholder}</span>}
        </button>

        {open && (
          <div className="absolute z-50 mt-2 w-full rounded-lg border bg-white p-2 shadow-lg">
            <div
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {options.map((opt) => {
                const selected = opt === value;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onChange(opt);
                      setOpen(false);
                    }}
                    className={[
                      'rounded-lg border px-2 py-2 text-sm font-medium transition',
                      selected
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-border bg-white hover:bg-gray-50',
                    ].join(' ')}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md px-2 py-1 text-xs text-fg/70 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const StepQuizSetup: React.FC<WizardStepProps> = ({ onNext, onResetToFirst }) => {
  const [error, setError] = useState('');

  const flow = useQuizSetupStore((s) => s.flow);

  const {
    setupConfig,
    setHostName,
    setEntryFee,
    setCurrencySymbol,
    setPaymentMethod,
    setEventDateTime,
    updateSetupConfig,
  } = useQuizSetupStore();

  const hostName = setupConfig.hostName ?? '';
  const entryFee = setupConfig.entryFee ?? '';
  const currencySymbol = setupConfig.currencySymbol ?? '€';

  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  // Convert ISO -> local date/hour/minute (24h), round minutes to nearest 5
  const isoToLocalParts = (iso?: string) => {
    if (!iso) return { date: '', hour: '', minute: '' };
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: '', hour: '', minute: '' };

    const pad = (n: number) => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const hour = pad(d.getHours());

    const minutes = d.getMinutes();
    const rounded = Math.round(minutes / 5) * 5;
    const minute = pad(rounded === 60 ? 0 : rounded);

    return { date, hour, minute };
  };

  const storedSchedule = useMemo(() => {
    return isoToLocalParts((setupConfig as any).eventDateTime as string | undefined);
  }, [setupConfig]);

  const [scheduleDate, setScheduleDate] = useState(storedSchedule.date);
  const [scheduleHour, setScheduleHour] = useState(storedSchedule.hour);
  const [scheduleMinute, setScheduleMinute] = useState(storedSchedule.minute);

  useEffect(() => {
    setScheduleDate(storedSchedule.date);
    setScheduleHour(storedSchedule.hour);
    setScheduleMinute(storedSchedule.minute);
  }, [storedSchedule.date, storedSchedule.hour, storedSchedule.minute]);

  const applySchedule = (date: string, hour: string, minute: string) => {
    if (!date || hour === '' || minute === '') {
      setEventDateTime(undefined);
      updateSetupConfig({ timeZone: undefined } as any);
      return;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    const h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    const iso = new Date(`${date}T${pad(h)}:${pad(m)}:00`).toISOString();
    setEventDateTime(iso);
    updateSetupConfig({ timeZone: tz } as any);
  };

  const clearSchedule = () => {
    setEventDateTime(undefined);
    updateSetupConfig({ timeZone: undefined } as any);
    setScheduleDate('');
    setScheduleHour('');
    setScheduleMinute('');
    setError('');
  };

  const scheduleComplete = useMemo(() => {
    const iso = (setupConfig as any).eventDateTime as string | undefined;
    if (!iso) return false;
    const d = new Date(iso);
    return !Number.isNaN(d.getTime());
  }, [setupConfig]);

  const [completedSections, setCompletedSections] = useState({
    host: false,
    payment: false,
    schedule: false,
  });

  useEffect(() => {
    setPaymentMethod('cash_or_revolut');
  }, [setPaymentMethod]);

  useEffect(() => {
    setCompletedSections({
      host: hostName.trim().length >= 2,
      payment: Boolean(entryFee && !isNaN(parseFloat(entryFee)) && parseFloat(entryFee) > 0),
      schedule: flow === 'web2' ? scheduleComplete : true,
    });
  }, [hostName, entryFee, flow, scheduleComplete]);

  const currencyOptions = [
    { symbol: '€', label: 'Euro (EUR)' },
    { symbol: '$', label: 'Dollar (USD)' },
    { symbol: '£', label: 'British Pound (GBP)' },
    { symbol: '₦', label: 'Nigerian Naira (NGN)' },
  ];

  const handleSubmit = () => {
    if (!completedSections.host) {
      setError('Please enter a host name with at least 2 characters.');
      return;
    }
    if (!completedSections.payment) {
      setError('Please enter a valid entry fee.');
      return;
    }
    if (!completedSections.schedule) {
      setError('Please choose a date, hour, and minute for your quiz.');
      return;
    }

    updateSetupConfig({
      hostName: hostName.trim(),
      entryFee: entryFee.trim(),
      currencySymbol,
      paymentMethod: 'cash_or_revolut',
    });

    setError('');
    onNext?.();
  };

  const allSectionsComplete = Object.values(completedSections).every(Boolean);

  const getCurrentMessage = () =>
    allSectionsComplete
      ? '🎉 Perfect! Your quiz is fully configured and ready to continue!'
      : "Hi there! Let's set up your quiz together. Fill in the details below to get started.";

  // 24 hours: 00..23
  const hourOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')),
    []
  );

  // 5-minute intervals: 00..55
  const minuteOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0')),
    []
  );

  return (
    <div className="w-full space-y-3 px-2 pb-4 sm:space-y-6 sm:px-4">
      <div className="px-1">
        <h2 className="heading-2">Step 1 of 4: Quiz Setup</h2>
        <div className="text-fg/70 mt-0.5 text-xs sm:text-sm">Configure your quiz</div>
      </div>

      <Character message={getCurrentMessage()} />

      {/* Host Information */}
      <div
        className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
          completedSections.host ? 'border-green-300 bg-green-50' : 'border-border'
        }`}
      >
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
            👤
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Host Information</h3>
              {completedSections.host && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
            </div>
            <p className="text-fg/70 text-xs sm:text-sm">Choose how you want to appear to participants</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
            <Users className="h-4 w-4" />
            <span>
              Host Display Name <span className="text-red-500">*</span>
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={hostName}
              onChange={(e) => {
                setHostName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Quiz Master Sarah, The Pub Quiz"
              className={`w-full rounded-lg border-2 px-3 py-2.5 pr-12 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:pr-16 sm:text-base ${
                completedSections.host
                  ? 'border-green-300 bg-green-50 focus:border-green-500'
                  : 'border-border focus:border-indigo-500'
              }`}
              maxLength={30}
            />
            <div className="absolute right-2 top-1/2 flex -translate-y-1/2 transform items-center gap-1 sm:right-3 sm:gap-2">
              {completedSections.host && <Check className="h-3 w-3 text-green-600 sm:h-4 sm:w-4" />}
              <span className="text-xs text-gray-400">{hostName.length}/30</span>
            </div>
          </div>
          <p className="text-fg/60 text-xs">Minimum 2 characters. This is how participants will see you during the quiz.</p>
        </div>
      </div>

      {/* Entry Fee */}
      <div
        className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
          completedSections.payment ? 'border-green-300 bg-green-50' : 'border-border'
        }`}
      >
        <div className="mb-3 flex items-start gap-3 sm:mb-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-green-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
            💰
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-fg text-sm font-semibold sm:text-base">Entry Fee</h3>
              {completedSections.payment && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
            </div>
            <p className="text-fg/70 text-xs sm:text-sm">Set the cost per participant (collected manually)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <Sparkles className="h-4 w-4" />
              <span>Currency</span>
            </label>
            <select
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              className="border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3 sm:text-base"
            >
              {currencyOptions.map((opt) => (
                <option key={opt.symbol} value={opt.symbol}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-fg/80 flex items-center gap-2 text-xs font-medium sm:text-sm">
              <DollarSign className="h-4 w-4" />
              <span>
                Amount <span className="text-red-500">*</span>
              </span>
            </label>
            <div className="relative">
              <span className="text-fg/60 absolute left-3 top-1/2 -translate-y-1/2 transform text-sm font-medium sm:text-base">
                {currencySymbol}
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryFee}
                onChange={(e) => {
                  setEntryFee(e.target.value);
                  setError('');
                }}
                placeholder="5.00"
                className={`w-full rounded-lg border-2 py-2.5 pl-7 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 sm:py-3 sm:pl-8 sm:pr-4 sm:text-base ${
                  completedSections.payment
                    ? 'border-green-300 bg-green-50 focus:border-green-500'
                    : 'border-border focus:border-indigo-500'
                }`}
              />
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 sm:mt-4">
          <p className="text-xs text-blue-800 sm:text-sm">
            <strong>Payment Collection:</strong> You'll collect entry fees manually from participants using cash, tap card, or
            instant transsfer when they arrive.
          </p>
        </div>
      </div>

      {/* Scheduling (Web2 only) — 24-hour grid + 5-min grid */}
      {flow === 'web2' && (
        <div
          className={`bg-muted rounded-lg border-2 p-4 shadow-sm transition-all sm:rounded-xl sm:p-6 ${
            completedSections.schedule ? 'border-green-300 bg-green-50' : 'border-border'
          }`}
        >
          <div className="mb-3 flex items-start gap-3 sm:mb-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xl sm:h-12 sm:w-12 sm:text-2xl">
              📅
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-fg text-sm font-semibold sm:text-base">
                  Schedule <span className="text-red-500">*</span>
                </h3>
                {completedSections.schedule && <Check className="h-4 w-4 text-green-600 sm:h-5 sm:w-5" />}
              </div>
              <p className="text-fg/70 text-xs sm:text-sm">Choose a date and time for your quiz.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="space-y-1 sm:col-span-4">
                <label className="text-fg/80 text-xs font-medium sm:text-sm">Date</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => {
                    const next = e.target.value;
                    setScheduleDate(next);
                    applySchedule(next, scheduleHour, scheduleMinute);
                    setError('');
                  }}
                  className="border-border w-full rounded-lg border-2 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 sm:px-4 sm:py-3"
                />
              </div>

              {/* Hour: 6 x 4 */}
              <div className="sm:col-span-2">
                <GridPicker
                  label="Hour"
                  value={scheduleHour}
                  options={hourOptions}
                  columns={6} // ✅ 6x4 block (24)
                  onChange={(next) => {
                    setScheduleHour(next);
                    applySchedule(scheduleDate, next, scheduleMinute);
                    setError('');
                  }}
                />
              </div>

              {/* Minute: 4 x 3 */}
              <div className="sm:col-span-2">
                <GridPicker
                  label="Minute"
                  value={scheduleMinute}
                  options={minuteOptions}
                  columns={4} // ✅ 4x3 block (12)
                  onChange={(next) => {
                    setScheduleMinute(next);
                    applySchedule(scheduleDate, scheduleHour, next);
                    setError('');
                  }}
                />
              </div>
            </div>

            <div className="text-fg/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>Time zone: {(setupConfig as any).timeZone || tz}</span>
              {completedSections.schedule ? (
                <span className="rounded-md bg-green-50 px-2 py-1 text-green-700">Saved</span>
              ) : (
                <span className="rounded-md bg-yellow-50 px-2 py-1 text-yellow-800">Required</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border bg-white px-3 py-2 text-xs font-medium hover:bg-gray-50"
                onClick={clearSchedule}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="border-border border-t pt-4 sm:pt-6">
        <ClearSetupButton variant="ghost" flow="web2" onCleared={onResetToFirst} />

        <button
          onClick={handleSubmit}
          disabled={!allSectionsComplete}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-400 sm:ml-auto sm:w-auto sm:rounded-xl sm:px-6 sm:text-base"
        >
          <span>Continue Setup</span>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default StepQuizSetup;



