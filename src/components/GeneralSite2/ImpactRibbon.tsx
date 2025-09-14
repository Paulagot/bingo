// src/components/GeneralSite2/ImpactRibbon.tsx
import type React from 'react';

const ImpactRibbon: React.FC = () => (
  <section className="px-4 pt-10">
    <div className="container mx-auto max-w-6xl">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl">
        <div className="px-6 py-8 text-center text-white">
          <h3 className="text-2xl font-bold">Web3 Impact Campaign — Community Powered</h3>
          <p className="mx-auto mt-2 max-w-2xl text-white/85">
            Join a Web3 movement raising funds for real-world causes through quiz nights. Engage and revive your community while you contribute to the target of $100K
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <a href="/Web3-Impact-Event" className="rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-md hover:bg-indigo-50">
              Learn More
            </a>
            <a href="/web3-fundraising-quiz" className="rounded-xl bg-indigo-700/30 px-6 py-3 font-semibold text-white shadow-md hover:bg-indigo-700/40">
              Host or Join a Quiz
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default ImpactRibbon;
