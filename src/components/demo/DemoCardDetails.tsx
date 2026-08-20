// src/components/demo/DemoCardDetails.tsx

import { useEffect, useState } from 'react';

interface DemoCardDetailsProps {
  open: boolean;
  onClose: () => void;
}

const TEST_CARD_NUMBER = '4242 4242 4242 4242';

export default function DemoCardDetails({
  open,
  onClose,
}: DemoCardDetailsProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setCopied(false);
    }
  }, [open]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(TEST_CARD_NUMBER);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error('Unable to copy demo card number:', error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-card-title"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-violet-600">
              Interactive Demo
            </p>

            <h2
              id="demo-card-title"
              className="text-xl font-bold text-slate-900"
            >
              Demo payment details
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close demo payment details"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-violet-700">
              Stripe test card
            </p>

            <div className="flex items-center justify-between gap-3">
              <code className="text-lg font-bold tracking-wide text-slate-900">
                {TEST_CARD_NUMBER}
              </code>

              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100"
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Expiry
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                Any future date
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                CVC
              </p>
              <p className="mt-1 font-semibold text-slate-900">
                Any 3 digits
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50 p-4">
            <div className="flex gap-3">
              <svg
                viewBox="0 0 24 24"
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>

              <div>
                <p className="font-semibold text-emerald-900">
                  No real payment will be taken
                </p>

                <p className="mt-1 text-sm leading-6 text-emerald-800">
                  This demo uses Stripe test mode. The card details above
                  simulate a successful payment.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}