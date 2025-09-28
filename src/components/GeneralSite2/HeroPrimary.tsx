import type React from 'react';
import { Gamepad2, Shield, Heart, Users } from 'lucide-react';

const HeroPrimary: React.FC = () => {
  return (
    <section className="relative px-4 pt-12 pb-16">
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
      <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

      <div className="container mx-auto max-w-6xl text-center relative z-10">
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

