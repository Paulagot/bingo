import type React from 'react';
import { Gamepad2, Shield, Heart, Users, Sparkles, ChevronRight } from 'lucide-react';

const HeroPrimary: React.FC = () => {
  return (
    <section className="relative px-4 pt-12 pb-16">
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
      <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

      <div className="container mx-auto max-w-6xl text-center relative z-10">
        {/* Founding Partners announcement */}
        <a
          href="/founding-partners"
          className="group relative mx-auto mb-6 block max-w-3xl rounded-2xl border border-white/10 p-[1px] shadow-xl hover:scale-[1.01] transition-transform bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-600"
          aria-label="Founding Partner Waitlist now live — lock your price for life"
        >
          <div className="rounded-2xl bg-white/90 backdrop-blur-sm p-3 sm:p-4">
            <div className="flex items-center justify-center gap-3 text-teal-800">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm sm:text-base font-semibold">
                Founding Partner Waitlist now live — <span className="underline decoration-teal-400/60 decoration-2 underline-offset-2">lock your price for life</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-teal-800/80 font-semibold">
                <span className="group-hover:translate-x-0.5 transition-transform">Learn more</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-center text-xs sm:text-sm text-teal-900/70">
              Limited to the first 100 clubs & charities • Early access to new modules
            </p>
          </div>
        </a>

        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
          <Gamepad2 className="h-4 w-4" /> Unlock Fundraising Magic: Real Impact Awaits
        </span>

        <h1 className="mt-8 pb-2 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold leading-relaxed">
          Transform Your Cause: Effortless, Transparent Quiz Fundraising for Unprecedented Impact
        </h1>

        <h2 className="mt-6 text-indigo-800 text-xl md:text-2xl font-semibold leading-relaxed">
          The Dedicated Fundraising Quiz Platform Nurturing Schools, Clubs, Charities, and Communities
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-indigo-900/70 text-lg md:text-xl leading-relaxed">
          Experience the ease of setting up in minutes, seamlessly accepting payments, hosting dynamic live events, and receiving audit-ready reports that illuminate your success.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href="/founding-partners"
            className="rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-3 text-white font-semibold shadow-md hover:scale-105 hover:shadow-lg"
          >
            Become a Founding Partner
          </a>
          <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">
            Begin Your Fundraising Transformation
          </a>
          <a href="/quiz/demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50">
            See the Magic in Action
          </a>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <span className="chip bg-white shadow-sm">
            <Shield className="h-4 w-4 text-indigo-600" />
            <span>Legally Compliant Fundraising: Your Peace of Mind, Our Priority</span>
          </span>
          <span className="chip bg-white shadow-sm">
            <Heart className="h-4 w-4 text-pink-600" />
            <span>Audit-Ready Reporting: Transparent Impact, Effortless Accountability</span>
          </span>
          <span className="chip bg-white shadow-sm">
            <Users className="h-4 w-4 text-green-600" />
            <span>Frictionless Fundraising Built for Impact</span>
          </span>
        </div>
      </div>
    </section>
  );
};

export default HeroPrimary;


