// src/components/GeneralSite2/TestimonialsStrip.tsx
import type React from 'react';

const TestimonialsStrip: React.FC = () => (
  <section className="px-4 pt-10">
    <div className="container mx-auto max-w-6xl">
      <h2 className="mb-2 text-3xl font-bold text-indigo-900">What Organizers Say</h2>
      <p className="mb-6 text-indigo-900/70">Early pilots, real results.</p>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { q: '“Setup took 20 minutes and we raised over €1,200 in one night.”', a: 'School PTA' },
          { q: '“Players loved the live leaderboard — we’ll run it monthly.”', a: 'Rugby Club' },
          { q: '“The reporting made our treasurer very happy.”', a: 'Local Charity' },
        ].map((t) => (
          <div key={t.q} className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-indigo-900/90">{t.q}</p>
            <p className="mt-3 text-sm font-semibold text-indigo-700">{t.a}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default TestimonialsStrip;
