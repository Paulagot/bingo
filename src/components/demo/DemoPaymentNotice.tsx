// src/components/demo/DemoPaymentNotice.tsx

import { useState } from 'react';

const TEST_CARD_NUMBER = '4242 4242 4242 4242';

const isStagingEnvironment =
  (import.meta.env.VITE_APP_ENV ?? '').toLowerCase() === 'staging';

export default function DemoPaymentNotice() {
  const [copied, setCopied] = useState(false);

  if (!isStagingEnvironment) {
    return null;
  }

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
    <div className="mb-5 overflow-hidden rounded-xl border border-violet-200 bg-violet-50">
      <div className="flex gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18" />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-bold text-violet-950">
            You're in Demo Mode
          </p>

          <p className="mt-1 text-sm leading-5 text-violet-900/80">
            No real payment will be taken. Use the Stripe test card below
            to complete this demo purchase.
          </p>

          <div className="mt-4 rounded-lg border border-violet-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Card number
                </p>

                <code className="mt-1 block font-bold tracking-wide text-slate-900">
                  {TEST_CARD_NUMBER}
                </code>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="rounded-lg border border-violet-200 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-50"
              >
                {copied ? 'Copied' : 'Copy card'}
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-slate-100 pt-3 text-sm text-slate-600">
              <span>
                Expiry: <strong>any future date</strong>
              </span>

              <span>
                CVC: <strong>any 3 digits</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}