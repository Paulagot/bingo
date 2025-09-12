// src/components/GeneralSite2/HeroPrimary.tsx
import type React from 'react';
import { Gamepad2, Shield, Heart, Users } from 'lucide-react';

const HeroPrimary: React.FC = () => {
  return (
    <section className="relative px-4 pt-10 pb-8">
      <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
      <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

      <div className="container mx-auto max-w-6xl text-center relative z-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
          <Gamepad2 className="h-4 w-4" /> Quiz Fundraisers for Real Impact
        </span>

        <h1 className="mt-5 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold leading-tight">
          Raise Funds With Quiz Nights — Fun, Transparent & Easy
        </h1>

        <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
          Set up in minutes, sell tickets, play live, and get audit-ready reports. Built for clubs, schools & charities.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a href="/free-trial" className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800">
            Start Free Trial
          </a>
          <a href="/demo" className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50">
            Try a Demo
          </a>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="chip bg-white shadow-sm">
            <Shield className="h-4 w-4 text-indigo-600" />
            <span>Event Integrity</span>
          </span>
          <span className="chip bg-white shadow-sm">
            <Heart className="h-4 w-4 text-pink-600" />
            <span>Participation Verification</span>
          </span>
          <span className="chip bg-white shadow-sm">
            <Users className="h-4 w-4 text-green-600" />
            <span>Proof of Fundraising</span>
          </span>
        </div>
      </div>
    </section>
  );
};

export default HeroPrimary;
