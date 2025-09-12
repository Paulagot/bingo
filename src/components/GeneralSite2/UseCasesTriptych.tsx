import type React from 'react';

const UseCasesTriptych: React.FC = () => (
  <section className="px-4 pt-10">
    <div className="container mx-auto max-w-6xl">
      <h2 className="mb-2 text-3xl font-bold text-indigo-900">Who It’s For</h2>
      <p className="mb-6 text-indigo-900/70">Tailored flows for different organizers.</p>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'For Schools & PTAs', copy: 'Family-friendly rounds, simple payments & clear totals.', href: '/use-cases/schools' },
          { title: 'For Sports Clubs', copy: 'Competitive leaderboards and sponsor-ready callouts.', href: '/use-cases/clubs' },
          { title: 'For Charities', copy: 'Transparent receipts and donor-friendly reporting.', href: '/use-cases/charities' },
        ].map((c) => (
          <a key={c.title} href={c.href} className="block rounded-2xl bg-white p-6 shadow-sm transition hover:shadow-md">
            <h3 className="text-xl font-bold text-indigo-900">{c.title}</h3>
            <p className="mt-2 text-indigo-900/70">{c.copy}</p>
            <span className="mt-4 inline-block text-indigo-700 font-semibold">Explore →</span>
          </a>
        ))}
      </div>
    </div>
  </section>
);

export default UseCasesTriptych;
