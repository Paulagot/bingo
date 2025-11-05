// src/components/Quiz/Wizard/ClearSetupButton.tsx
import React, { useEffect, useRef, useState } from 'react';
import { Trash2, X, Check } from 'lucide-react';
import { useQuizSetupStore } from '../hooks/useQuizSetupStore';

export type ClearSetupButtonProps = {
  label?: string;
  variant?: 'ghost' | 'link' | 'danger';
  size?: 'sm' | 'md';
  keepIds?: boolean;              // pass true if you want to keep room/host IDs
  flow?: 'web2' | 'web3';         // optional: force flow after reset
  className?: string;
  onCleared?: () => void;         // parent can reset the step index etc.
};

const baseBtn =
  'inline-flex items-center gap-1.5 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-200';

const variants = {
  ghost: 'border border-border bg-muted hover:bg-gray-100 text-fg',
  link: 'bg-transparent text-fg/70 hover:text-fg underline-offset-2 hover:underline',
  danger: 'bg-red-600 text-white hover:bg-red-700',
} as const;

const sizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm',
} as const;

export default function ClearSetupButton({
  label = 'Start Over',
  variant = 'ghost',
  size = 'sm',
  keepIds = false,
  flow,
  className = '',
  onCleared,
}: ClearSetupButtonProps) {
  const { resetSetupConfig, setFlow } = useQuizSetupStore();
  const [confirming, setConfirming] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);

  // ESC to close + autofocus cancel
  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setConfirming(false);
    };
    document.addEventListener('keydown', onKey);
    // autofocus cancel for accessibility
    cancelBtnRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [confirming]);

  const doClear = () => {
    resetSetupConfig({ keepIds });
    if (flow) setFlow(flow);
    setConfirming(false);
    onCleared?.();
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className={`${baseBtn} ${variants[variant]} ${sizes[size]} active:scale-[0.98] ${className}`}
        onClick={() => setConfirming(true)}
        aria-expanded={confirming}
        aria-haspopup="dialog"
      >
        <Trash2 className="h-4 w-4" />
        <span>{label}</span>
      </button>

      {confirming && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-[2px] animate-fade-in"
            onClick={() => setConfirming(false)}
            aria-hidden="true"
          />

          {/* Centered modal container */}
          <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
            <div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-title"
              className="w-full max-w-sm rounded-2xl border border-border bg-card p-4 shadow-2xl animate-slide-up sm:rounded-xl sm:p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 id="reset-title" className="text-sm font-semibold text-fg">
                    Reset all quiz setup?
                  </h3>
                  <p className="mt-1 text-xs text-fg/70">
                    This clears saved steps and jumps back to the first step
                    {flow ? ` of ${flow.toUpperCase()}` : ''}.
                  </p>

                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      ref={cancelBtnRef}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-3 py-1.5 text-xs font-medium text-fg/80 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      onClick={() => setConfirming(false)}
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
                      onClick={doClear}
                    >
                      <Check className="h-3 w-3" />
                      Start Over
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}










