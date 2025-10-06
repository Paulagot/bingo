import React from 'react';
import { SEO } from '../../../components/SEO';

const ImpactCampaignLeaderboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <SEO
        title="Web3 Impact Campaign Leaderboard — Live Standings | FundRaisely"
        description="Track participating communities, funds raised on-chain, and live standings."
        type="event"
      />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-4 text-3xl font-bold md:text-4xl">Leaderboard</h1>
        <div className="rounded-xl bg-white p-6 text-sm text-fg/70 shadow-sm">
          <p>Leaderboard coming soon — we’ll pipe live data here.</p>
        </div>
      </div>
    </div>
  );
};

export default ImpactCampaignLeaderboard;
