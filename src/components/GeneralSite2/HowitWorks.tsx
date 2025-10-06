// src/components/GeneralSite/HowItWorks.tsx
import type React from 'react';
import { Settings, Play, BarChart3, QrCode } from 'lucide-react';

const HowItWorks: React.FC = () => {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 py-20">
      {/* Background decorative elements */}
      <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-purple-400/20 blur-3xl" />
      <div className="absolute -right-16 top-32 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="absolute bottom-10 left-1/2 h-32 w-32 rounded-full bg-pink-400/20 blur-3xl" />

      {/* Geometric background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-1/4 h-2 w-2 bg-white rotate-45" />
        <div className="absolute top-40 right-1/3 h-3 w-3 bg-white/60 rotate-12" />
        <div className="absolute bottom-32 left-1/3 h-2 w-2 bg-white rotate-45" />
        <div className="absolute bottom-20 right-1/4 h-3 w-3 bg-white/40 rotate-12" />
      </div>

      <div className="container mx-auto max-w-6xl px-4 relative z-10">
        <div className="mb-12 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-white/90 text-sm font-medium border border-white/20">
            <Play className="h-4 w-4" /> Simple Process
          </span>

          <h2 className="text-white mb-4 text-3xl md:text-4xl font-bold mt-6">
            Your Journey to Fundraising Success:
            <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent"> The Magic Behind FundRaisely</span>
          </h2>
          <p className="text-white/80 mx-auto max-w-2xl text-lg">
            We turn complex fundraising into a simple, transparent, and repeatable flow—from setup to celebratory payout.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 relative">
          {/* Step 1 */}
          <div className="group relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                <Settings className="h-8 w-8 text-white" />
              </div>

              <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-500 font-bold text-white text-sm shadow-lg">
                1
              </div>

              <h3 className="text-white mb-4 text-xl font-bold">Conjure Your Event: Effortless Setup</h3>
              <p className="text-white/80 text-base leading-relaxed">
                Magically select engaging round types,  define ticket prices, select fundraising game extras, and curate captivating prizes to perfectly manifest your vision.
              </p>

              <div className="mt-4 flex items-center gap-2 text-purple-300 text-sm font-medium">
                <div className="h-1.5 w-1.5 rounded-full bg-purple-300" />
                Templates & Admin Controls
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="group relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg group-hover:shadow-indigo-500/25 transition-all duration-300">
                <QrCode className="h-8 w-8 text-white" />
              </div>

              <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 font-bold text-white text-sm shadow-lg">
                2
              </div>

              <h3 className="text-white mb-4 text-xl font-bold">Connect & Cultivate: Seamless Engagement</h3>
              <p className="text-white/80 text-base leading-relaxed">
                Participants pay by card, bank, or cash, Share your unique link or QR code and our system thoughtfully reconciles every contribution.
              </p>

              <div className="mt-4 flex items-center gap-2 text-indigo-300 text-sm font-medium">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                Links, QR codes & reconciliation
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="group relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-lg group-hover:shadow-pink-500/25 transition-all duration-300">
                <Play className="h-8 w-8 text-white" />
              </div>

              <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-500 font-bold text-white text-sm shadow-lg">
                3
              </div>

              <h3 className="text-white mb-4 text-xl font-bold">Ignite the Excitement: Dynamic Live Play</h3>
              <p className="text-white/80 text-base leading-relaxed">
                Enjoy timed questions, instant autoscoring, and a live leaderboard that builds anticipation. Optional extras add a touch of magic to every round.
              </p>

              <div className="mt-4 flex items-center gap-2 text-pink-300 text-sm font-medium">
                <div className="h-1.5 w-1.5 rounded-full bg-pink-300" />
                Autoscoring & live leaderboards
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="group relative">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg group-hover:shadow-indigo-600/25 transition-all duration-300">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>

              <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 font-bold text-white text-sm shadow-lg">
                4
              </div>

              <h3 className="text-white mb-4 text-xl font-bold">Celebrate & Verify: Transparent Impact</h3>
              <p className="text-white/80 text-base leading-relaxed">
                Conclude with confidence: access detailed winner logs and export CSV/PDF reports. (Roadmap: optional blockchain-hashed receipts for ultimate trust.)
              </p>

              <div className="mt-4 flex items-center gap-2 text-indigo-200 text-sm font-medium">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-200" />
                Winner logs & exportable reports
              </div>
            </div>
          </div>
        </div>

        {/* Call to action */}
        <div className="text-center mt-10">
          <a
            href="/quiz/how-it-works"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-900 font-bold shadow-xl hover:bg-indigo-50 hover:scale-105 transition-all duration-300"
          >
            Explore How It Works
            <div className="h-2 w-2 rounded-full bg-indigo-600" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
