// src/components/GeneralSite2/TrustBar.tsx
import type React from 'react';

const TrustBar: React.FC = () => (
  <section className="px-4">
    <div className="container mx-auto max-w-6xl">
      <div className="grid items-center gap-3 rounded-xl bg-white p-3 shadow-sm md:grid-cols-3">
        <p className="text-center text-sm text-indigo-900/70">Audit-ready reporting</p>
        <p className="text-center text-sm text-indigo-900/70">Cash + digital payments</p>
        <p className="text-center text-sm text-indigo-900/70">Built for IE & UK</p>
      </div>
    </div>
  </section>
);

export default TrustBar;
