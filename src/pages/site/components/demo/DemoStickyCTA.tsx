// src/pages/site/components/demo/DemoStickyCTA.tsx

import { useLocation, useNavigate } from 'react-router-dom';
import { Play, X } from 'lucide-react';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'fundraisely_demo_cta_dismissed';

export default function DemoStickyCTA() {
  const navigate = useNavigate();
  const location = useLocation();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed =
      sessionStorage.getItem(STORAGE_KEY) === 'true';

    setVisible(!dismissed);
  }, []);

  // Don't show it while they are already on the demo page.
  if (location.pathname === '/demo') {
    return null;
  }

  if (!visible) {
    return null;
  }

  const dismiss = () => {
    sessionStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9000] sm:bottom-6 sm:right-6">
      <div className="group relative">
        <button
          type="button"
          onClick={() => navigate('/demo')}
          className="
            flex items-center gap-3
            rounded-2xl
            border border-slate-200
            bg-white
            px-4 py-3
            text-left
            shadow-xl
            transition
            hover:-translate-y-0.5
            hover:shadow-2xl
            sm:px-5 sm:py-4
          "
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#157f85] text-white">
            <Play className="h-4 w-4 fill-current" />
          </span>

          <span>
            <span className="block text-sm font-black text-slate-950 sm:text-base">
              Try FundRaisely
            </span>

            <span className="block text-xs font-semibold text-slate-500">
              Interactive demo · no real payment
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Hide demo button"
          className="
            absolute -right-2 -top-2
            grid h-7 w-7 place-items-center
            rounded-full
            border border-slate-200
            bg-white
            text-slate-400
            shadow-md
            transition
            hover:text-slate-900
          "
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}