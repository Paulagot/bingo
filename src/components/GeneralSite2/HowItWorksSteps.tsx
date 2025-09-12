// src/components/GeneralSite2/HowItWorksSteps.tsx
import type React from 'react';

const steps = [
  { title: 'Create & Configure', copy: 'Pick round types, time per question, ticket price & prizes.' },
  { title: 'Share & Sell', copy: 'Send a link or QR. Accept card, bank, or cash (reconcile later).' },
  { title: 'Play Live', copy: 'Timed questions, autoscoring, live leaderboard, optional extras.' },
  { title: 'Report & Payout', copy: 'Winner logs, CSV/PDF exports, hash receipts on-chain.' },
];

const HowItWorksSteps: React.FC = () => (
  <section id="how-it-works" className="px-4 pt-10">
    <div className="container mx-auto max-w-6xl">
      <h2 className="mb-2 text-3xl font-bold text-indigo-900">How It Works</h2>
      <p className="mb-6 text-indigo-900/70">From setup to payout — simple, transparent, repeatable.</p>
      <div className="grid gap-4 md:grid-cols-4">
        {steps.map((s, i) => (
          <div key={s.title} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-2 text-sm font-semibold text-indigo-600">Step {i + 1}</div>
            <h3 className="text-lg font-bold text-indigo-900">{s.title}</h3>
            <p className="mt-2 text-indigo-900/70 text-sm">{s.copy}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSteps;
