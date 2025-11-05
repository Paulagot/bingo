// src/components/GeneralSite/OutcomePreview.tsx
import React from 'react';
import { Check } from 'lucide-react';

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

type Props = {
  eyebrow?: string;
  title: string;               // e.g., "What success could look like"
  intro: string;               // short 1–2 sentence explainer
  bullets: Array<React.ReactNode>; // 3 KPI-style points (ranges, not absolutes)
  note?: string;               // assumptions/disclaimer line
};

export default function OutcomePreview({ eyebrow, title, intro, bullets, note }: Props) {
  return (
    <section className="px-4 py-12">
      <div className="container mx-auto max-w-6xl">
        <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
          {eyebrow && <p className="text-indigo-700/80 text-sm font-medium mb-2">{eyebrow}</p>}
          <h2 className="text-indigo-900 text-2xl md:text-3xl font-bold mb-4">{title}</h2>
          <p className="text-indigo-900/80 leading-relaxed mb-4">{intro}</p>
          <ul className="grid md:grid-cols-3 gap-4 text-indigo-900/80">
            {bullets.map((b, i) => <Bullet key={i}>{b}</Bullet>)}
          </ul>
          {note && (
            <p className="mt-4 text-xs text-indigo-900/60">
              {note}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
