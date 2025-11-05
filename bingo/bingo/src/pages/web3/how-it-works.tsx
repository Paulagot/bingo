import React from 'react';
import { SEO } from '../../components/SEO';
import { Link } from 'react-router-dom';

const Web3HowItWorks: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <SEO
        title="How Web3 Quiz Fundraisers Work | FundRaisely"
        description="See the flow for crypto-enabled fundraising quizzes: setup, join, gameplay, payouts, and reporting."
        keywords="how it works web3 fundraising, crypto quiz flow, on-chain transparency"
        type="website"
      />
      <div className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="mb-4 text-3xl font-bold md:text-5xl">How It Works (Web3)</h1>
        <p className="mb-8 text-fg/80">
          A quick overview of the end-to-end flow for crypto-powered quiz fundraisers.
        </p>

        <ol className="list-decimal space-y-3 rounded-2xl bg-white p-6 shadow-sm sm:pl-8">
          <li><strong>Setup:</strong> Create a room, choose prize logic, connect wallets or select direct-to-charity routing.</li>
          <li><strong>Invite:</strong> Share a join link or QR; players connect and pick a team.</li>
          <li><strong>Play:</strong> Questions, timers, power-ups, and live leaderboards keep it lively.</li>
          <li><strong>Payouts:</strong> Funds route as configured (e.g., direct to charity partners).</li>
          <li><strong>Report:</strong> Export audit-ready reports and on-chain receipts.</li>
        </ol>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/web3/features" className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700">
            See Crypto-Powered Features
          </Link>
          <Link to="/web3" className="rounded-lg border border-indigo-600 px-5 py-2.5 font-semibold text-indigo-600 hover:bg-indigo-50">
            Back to Web3 Hub
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Web3HowItWorks;
