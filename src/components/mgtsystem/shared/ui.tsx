// src/components/mgtsystem/shared/ui.tsx
//
// Shared form/section primitives, extracted from CreateEventForm and the
// four Schedule*Modal files, which each carried their own copy-pasted
// versions of Section / SectionHeader / Field / input class builder.
//
// Every consumer (the new CreateFundraiserWizard steps AND the edit-mode
// modals) imports from here so the create flow and the edit flow can
// never drift apart visually.
//
// `accent` lets each activity keep its identity colour (teal for the
// event chrome and quiz, #e9574f for elimination, #7c3aed for puzzles)
// without duplicating the components.

import React from 'react';
import { AlertCircle } from 'lucide-react';

export const ACCENTS = {
  teal:   '#157f85',
  red:    '#e9574f',
  purple: '#7c3aed',
} as const;

export type AccentColor = string;

function tint(hex: string, alpha: number): string {
  // #rrggbb → rgba(r,g,b,alpha) — used for the icon chip backgrounds,
  // matching the hand-written rgba(21,127,133,0.12)-style values that
  // were previously hardcoded per file.
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="rounded-xl p-5" style={{ background: '#ffffff', border: '1px solid #dce1df' }}>
    {children}
  </div>
);

export const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  accent?: AccentColor;
}> = ({ icon, title, subtitle, accent = ACCENTS.teal }) => (
  <div className="flex items-start gap-3 mb-4">
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg mt-0.5"
      style={{ background: tint(accent, 0.12), color: accent }}>
      {icon}
    </div>
    <div>
      <h3 className="text-sm font-bold" style={{ color: '#102532' }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: '#52636f' }}>{subtitle}</p>}
    </div>
  </div>
);

export const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}> = ({ label, required, hint, error, children }) => (
  <div>
    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#102532' }}>
      {label}
      {required && <span className="ml-0.5" style={{ color: '#e9574f' }}>*</span>}
      {hint && <span className="ml-1.5 font-normal" style={{ color: '#8a9bab' }}>{hint}</span>}
    </label>
    {children}
    {error && (
      <p className="mt-1 flex items-center gap-1 text-xs font-medium" style={{ color: '#e9574f' }}>
        <AlertCircle className="h-3 w-3 flex-shrink-0" />
        {error}
      </p>
    )}
  </div>
);

// Focus-ring colour has to be a static Tailwind class (JIT can't see
// interpolated values), so instead of `focus:ring-[${accent}]` we expose
// one builder per accent used today. Add a new entry when a new activity
// colour arrives.
const RING: Record<string, string> = {
  [ACCENTS.teal]:   'focus:ring-[#157f85]',
  [ACCENTS.red]:    'focus:ring-[#e9574f]',
  [ACCENTS.purple]: 'focus:ring-[#7c3aed]',
};

export const inputClass = (hasError?: boolean | string, accent: AccentColor = ACCENTS.teal) =>
  `w-full rounded-lg border px-3 py-2 text-sm transition focus:outline-none focus:ring-2 ${
    RING[accent] ?? RING[ACCENTS.teal]
  } focus:border-transparent ${
    hasError ? 'border-[#e9574f] bg-red-50' : 'border-[#dce1df] bg-white hover:border-[#b8c6b0]'
  }`;

export const ErrorBanner: React.FC<{ message: string; children?: React.ReactNode }> = ({ message, children }) => (
  <div className="flex items-start gap-2 rounded-lg border px-3 py-2.5"
    style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
    <div className="flex-1">
      <p className="text-sm" style={{ color: '#dc2626' }}>{message}</p>
      {children}
    </div>
  </div>
);