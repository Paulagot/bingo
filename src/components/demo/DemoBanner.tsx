// src/components/demo/DemoBanner.tsx

import { useEffect, useState } from 'react';
import DemoCardDetails from './DemoCardDetails';

const DEMO_BANNER_STORAGE_KEY = 'fundraisely_demo_banner_dismissed';

const isStagingEnvironment =
  (import.meta.env.VITE_APP_ENV ?? '').toLowerCase() === 'staging';

export default function DemoBanner() {
  const [visible, setVisible] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);

  useEffect(() => {
    if (!isStagingEnvironment) {
      return;
    }

    const dismissed =
      sessionStorage.getItem(DEMO_BANNER_STORAGE_KEY) === 'true';

    setVisible(!dismissed);
  }, []);

  if (!isStagingEnvironment) {
    return null;
  }

  const dismissBanner = () => {
    sessionStorage.setItem(DEMO_BANNER_STORAGE_KEY, 'true');
    setVisible(false);
  };

  return (
    <>
      {visible && (
        <div className="sticky top-0 z-[9999] border-b border-violet-300 bg-violet-700 text-white shadow-sm">
          <div className="mx-auto flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-2 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 sm:flex">
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4m0 4h.01" />
                </svg>
              </div>

              <div className="min-w-0 text-sm">
                <span className="font-bold tracking-wide">
                  FUNDRAISELY DEMO
                </span>

                <span className="mx-2 hidden text-white/50 sm:inline">
                  •
                </span>

                <span className="block text-white/90 sm:inline">
                  You're using our test environment. No real card payments
                  will be taken.
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setShowCardDetails(true)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-white/15"
                aria-label="View demo card details"
              >
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

                <span className="hidden md:inline">Test card</span>
              </button>

              <button
                type="button"
                onClick={dismissBanner}
                className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
                aria-label="Close demo banner"
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
          </div>
        </div>
      )}

      <DemoCardDetails
        open={showCardDetails}
        onClose={() => setShowCardDetails(false)}
      />
    </>
  );
}