// src/components/Quiz/shared/StepWrapper.tsx
import React, { useEffect, useRef } from 'react';

// ─── Global styles ────────────────────────────────────────────────────────────
// Injected once. Tailwind can't express spring cubic-bezier keyframes or
// safe-area-aware padding without a custom config, so we do it here.

function injectStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('step-wrapper-styles')) return;

  const style = document.createElement('style');
  style.id = 'step-wrapper-styles';
  style.textContent = `
    /* ── Animations ── */

    @keyframes sheet-slide-up {
      from { transform: translateY(100%); opacity: 0.6; }
      to   { transform: translateY(0);    opacity: 1;   }
    }

    @keyframes modal-scale-in {
      from { transform: scale(0.96) translateY(6px); opacity: 0; }
      to   { transform: scale(1)    translateY(0);   opacity: 1; }
    }

    @keyframes backdrop-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    @keyframes handle-hint {
      0%   { transform: scaleX(1);   opacity: 0.35; }
      50%  { transform: scaleX(1.4); opacity: 0.65; }
      100% { transform: scaleX(1);   opacity: 0.35; }
    }

    /* Applied by JS after mount so we can pick the right one per viewport */
    .anim-sheet  { animation: sheet-slide-up  400ms cubic-bezier(0.32, 0.72, 0, 1) both; }
    .anim-modal  { animation: modal-scale-in  220ms cubic-bezier(0.16, 1, 0.3, 1)  both; }
    .anim-backdrop { animation: backdrop-in   240ms ease both; }
    .anim-handle { animation: handle-hint     700ms ease 600ms 1 both; }

    /* Prevent body scroll while sheet is open on iOS */
    body.sheet-open {
      overflow: hidden;
      position: fixed;
      width: 100%;
    }
  `;
  document.head.appendChild(style);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type StepMode = 'modal' | 'page' | 'embedded';

interface StepWrapperProps {
  children: React.ReactNode;
  mode: StepMode;
  onClose?: () => void;
  /** Wider card on desktop — avoids scroll on ticket details step */
  wide?: boolean;
}

// ─── StepWrapper ─────────────────────────────────────────────────────────────

export const StepWrapper: React.FC<StepWrapperProps> = ({
  children,
  mode,
  wide = false,
}) => {
  injectStyles();

  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // Lock body scroll while open; restore on close
  useEffect(() => {
    if (mode !== 'modal') return;
    // Save current scroll position so restoring doesn't jump
    const scrollY = window.scrollY;
    document.body.classList.add('sheet-open');
    document.body.style.top = `-${scrollY}px`;

    return () => {
      document.body.classList.remove('sheet-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, [mode]);

  // Apply correct entrance animation after mount (viewport-aware)
  useEffect(() => {
    if (mode !== 'modal') return;

    const sheet = sheetRef.current;
    const backdrop = backdropRef.current;
    if (!sheet || !backdrop) return;

    const isMobile = window.innerWidth < 640;
    sheet.classList.add(isMobile ? 'anim-sheet' : 'anim-modal');
    backdrop.classList.add('anim-backdrop');
  }, [mode]);

  if (mode === 'modal') {
    return (
      <>
        {/* Backdrop — blurred dim overlay */}
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="fixed inset-0 z-50"
          style={{
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        />

        {/* Positioning shell — flex-end on mobile (sheet), center on desktop (modal) */}
        <div className="fixed inset-0 z-[51] flex items-end sm:items-center justify-center sm:p-6">
          {/* The sheet / card itself */}
          <div
            ref={sheetRef}
            className={[
              'bg-white w-full flex flex-col',
              // Mobile: height is driven by content, not stretched to fill screen
              // Desktop: floating card, fully rounded
              'rounded-t-[22px] sm:rounded-2xl',
              // Mobile: auto height, cap at 92dvh for very tall content
              // Desktop: cap at 85vh
              'max-h-[92dvh] sm:max-h-[85vh]',
              // Width — constrained on desktop, full width on mobile
              wide ? 'sm:max-w-2xl' : 'sm:max-w-md',
              // Elevation
              'shadow-[0_-2px_40px_rgba(0,0,0,0.18)] sm:shadow-2xl',
            ].join(' ')}
          >
            {children}
          </div>
        </div>
      </>
    );
  }

  if (mode === 'embedded') {
    return (
      <div className="w-full overflow-hidden rounded-3xl border border-white/30 bg-white shadow-2xl">
        <div className="h-[82dvh] min-h-[600px] w-full flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    );
  }

  // ── page mode ──
  return (
    <div className="min-h-[100dvh] bg-gray-50 px-4 py-4 sm:py-8">
      <div className="mx-auto max-w-2xl">
        <div className="w-full overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl flex flex-col">
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── Drag handle ─────────────────────────────────────────────────────────────
// Visual only — communicates "bottom sheet" to the user.
// Drag-to-dismiss is intentionally disabled for payment flows.

const DragHandle: React.FC = () => (
  <div
    className="sm:hidden flex justify-center"
    style={{ paddingTop: 10, paddingBottom: 4 }}
    aria-hidden="true"
  >
    <div
      className="anim-handle rounded-full bg-gray-300"
      style={{ width: 36, height: 5 }}
    />
  </div>
);

// ─── StepHeader ──────────────────────────────────────────────────────────────

export const StepHeader: React.FC<{
  icon: string;
  title: string;
  subtitle?: string;
}> = ({ icon, title, subtitle }) => (
  <>
    <DragHandle />
    <div
      className="flex-shrink-0 px-4 py-3 sm:px-6 sm:py-4"
      style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full text-white"
          style={{
            width: 38,
            height: 38,
            fontSize: 16,
            background: 'linear-gradient(135deg, #6366f1, #9333ea)',
            boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
          }}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h2
            className="truncate font-bold text-gray-950"
            style={{ fontSize: 17, lineHeight: '1.2' }}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className="truncate text-gray-400 mt-0.5"
              style={{ fontSize: 13 }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  </>
);

// ─── StepContent ─────────────────────────────────────────────────────────────

export const StepContent: React.FC<{
  children: React.ReactNode;
  noPadding?: boolean;
}> = ({ children, noPadding = false }) => (
  // On mobile: no flex-1, sheet height is driven by content
  // On desktop: flex-1 fills the fixed-height modal card
  // overflow-y-auto + overscroll-contain prevents page scroll bleed on iOS
  <div
    className="sm:flex-1 overflow-y-auto overscroll-contain"
    style={{ WebkitOverflowScrolling: 'touch' }}
  >
    <div className={noPadding ? '' : 'p-4 pb-4 sm:p-5 sm:pb-6'}>
      {children}
    </div>
  </div>
);

// ─── StepFooter ──────────────────────────────────────────────────────────────

export const StepFooter: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="flex-shrink-0 px-4 sm:px-5"
    style={{
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(0,0,0,0.07)',
      paddingTop: 12,
      // Safe area for iPhone home bar — on short sheets this is what keeps
      // the buttons from sitting right on the edge of the screen
      paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))',
    }}
  >
    {children}
  </div>
);

// ─── StepLayout ──────────────────────────────────────────────────────────────

export const StepLayout: React.FC<{
  mode: StepMode;
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  onClose?: () => void;
  contentNoPadding?: boolean;
  wide?: boolean;
}> = ({ mode, icon, title, subtitle, children, footer, onClose, contentNoPadding, wide = false }) => (
  <StepWrapper mode={mode} onClose={onClose} wide={wide}>
    <StepHeader icon={icon} title={title} subtitle={subtitle} />
    <StepContent noPadding={contentNoPadding}>{children}</StepContent>
    <StepFooter>{footer}</StepFooter>
  </StepWrapper>
);