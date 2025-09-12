// src/components/GeneralSite2/BetaInvite.tsx
import type React from 'react';

const BetaInvite: React.FC = () => (
  <section className="px-4 pt-10">
    <div className="container mx-auto max-w-6xl">
      <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-center text-white shadow-xl">
        <h3 className="text-2xl font-bold">Fundraising is Changing. Be Part of It.</h3>
        <p className="mx-auto mt-2 max-w-2xl text-white/85">
          We’re inviting a small number of clubs, schools & charities to join our early beta.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <a
            href="https://x.com/Fundraisely"
            target="_blank" rel="noopener noreferrer"
            className="rounded-xl bg-white px-6 py-3 font-semibold text-indigo-700 shadow-md hover:bg-indigo-50"
          >
            DM us on Twitter
          </a>
          {/* <a href="mailto:beta@fundraisely.io" className="rounded-xl bg-indigo-700/30 px-6 py-3 font-semibold text-white shadow-md hover:bg-indigo-700/40">Apply to Join Beta</a> */}
        </div>
      </div>
    </div>
  </section>
);

export default BetaInvite;
