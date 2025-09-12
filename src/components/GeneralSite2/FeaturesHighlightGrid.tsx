// src/components/GeneralSite2/FeaturesHighlightGrid.tsx
import type React from 'react';
import { Sparkles, Gift, FileCheck2, BarChart } from 'lucide-react'; // ⬅️ swapped ChartBar -> BarChart

const items = [
  { icon: Sparkles, title: 'Fundraising Extras', copy: 'Clues, lifelines & more to boost revenue.' },
  { icon: Gift, title: 'Prize Modes', copy: 'Split pool or bring your own assets.' },
  { icon: FileCheck2, title: 'Compliance Mindset', copy: 'Clear signposting for IE/UK rules.' },
  { icon: BarChart, title: 'Exports & Receipts', copy: 'CSV/PDF + hashed event summaries.' }, // ⬅️ use BarChart
];

const FeaturesHighlightGrid: React.FC = () => (
  <section className="px-4 pt-10">
    <div className="container mx-auto max-w-6xl">
      <h2 className="mb-2 text-3xl font-bold text-indigo-900">Features That Raise More</h2>
      <p className="mb-6 text-indigo-900/70">Purpose-built for clubs, schools & charities.</p>
      <div className="grid gap-4 md:grid-cols-4">
        {items.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="flex gap-4 rounded-xl bg-white p-5 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <Icon className="h-6 w-6 text-indigo-700" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-indigo-900">{title}</h3>
              <p className="text-sm text-indigo-900/70 mt-1">{copy}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default FeaturesHighlightGrid;

