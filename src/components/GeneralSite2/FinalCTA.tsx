// src/components/GeneralSite2/FinalCTA.tsx
import type React from 'react';

const FinalCTA: React.FC = () => (
  <section className="px-4 pt-10">
    <div className="container mx-auto max-w-6xl">
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h3 className="text-2xl font-bold text-indigo-900">Try It Free — Launch Your First Quiz Today</h3>
        <p className="mt-2 text-indigo-900/70">No long setup. Works great on mobile. Built for IE & UK.</p>
        <div className="mt-5 flex justify-center gap-3">
          <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">
            Start Free Trial
          </a>
          <a href="/pricing" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50">
            See Pricing
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default FinalCTA;
