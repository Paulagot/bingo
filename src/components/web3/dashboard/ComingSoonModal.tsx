// src/components/web3/dashboard/ComingSoonModal.tsx
// Replaces alert() calls for unbuilt features.
// Accepts a feature name and optional description.

import React, { useEffect, useCallback } from 'react';

interface Props {
  isOpen: boolean;
  featureName: string;
  description?: string;
  onClose: () => void;
}

export function ComingSoonModal({ isOpen, featureName, description, onClose }: Props) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {/* Icon */}
        <div style={styles.iconWrap}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
              stroke="#10B981" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
          </svg>
        </div>

        {/* Content */}
        <p style={styles.eyebrow}>Coming soon</p>
        <h2 style={styles.title}>{featureName}</h2>
        <p style={styles.desc}>
          {description ?? "We're building this now. It'll be available in an upcoming release."}
        </p>

        {/* Close */}
        <button style={styles.closeBtn} onClick={onClose}>
          Got it
        </button>

        {/* X button */}
        <button style={styles.xBtn} onClick={onClose} aria-label="Close modal">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook for easy usage
// ---------------------------------------------------------------------------

export function useComingSoonModal() {
  const [state, setState] = React.useState<{
    open: boolean;
    featureName: string;
    description?: string;
  }>({ open: false, featureName: '' });

  function show(featureName: string, description?: string) {
    setState({ open: true, featureName, description });
  }

  function hide() {
    setState((s) => ({ ...s, open: false }));
  }

  return { state, show, hide };
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    position: 'relative',
    background: '#ffffff',
    borderRadius: '16px',
    padding: '2.5rem 2rem',
    maxWidth: '380px',
    width: '90%',
    textAlign: 'center',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  iconWrap: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    background: '#ECFDF5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem',
  },
  eyebrow: {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: '#10B981',
    marginBottom: '8px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#111827',
    letterSpacing: '-0.01em',
    marginBottom: '10px',
  },
  desc: {
    fontSize: '14px',
    color: '#6B7280',
    lineHeight: 1.6,
    marginBottom: '1.75rem',
  },
  closeBtn: {
    width: '100%',
    padding: '12px',
    background: '#111827',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  xBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};