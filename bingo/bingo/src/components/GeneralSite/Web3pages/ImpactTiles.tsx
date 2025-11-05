import React from 'react';
export const ImpactTiles: React.FC = () => (
  <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
    {[
      { amt: '$40,000+', label: 'Direct to Charity' },
      { amt: '$40,000',  label: 'Community Rewards' },
      { amt: '$20,000',  label: 'Platform Development' },
    ].map((t)=>(
      <div key={t.label} className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <h3 className="mb-1 text-2xl font-bold">{t.amt}</h3>
        <p className="text-fg/70">{t.label}</p>
      </div>
    ))}
  </div>
);
