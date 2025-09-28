// src/components/GeneralSite2/FinalCTA.tsx
import type React from 'react';
import { Rocket, ArrowRight } from 'lucide-react';

const FinalCTA: React.FC = () => (
  <section className="px-4 pt-10">
    <div className="container mx-auto max-w-6xl">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 p-8 text-center shadow-xl">
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

        {/* Content */}
        <div className="relative z-10">
          {/* Badge */}
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-white/90 text-sm font-medium border border-white/20 mb-6">
            <Rocket className="h-4 w-4" /> Your Fundraising Journey Begins Now
          </span>

          {/* Main Heading */}
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 leading-tight">
            Unleash Your Fundraising Potential: Launch Your First Quiz and 
            <span className="bg-gradient-to-r from-pink-300 to-yellow-300 bg-clip-text text-transparent"> Transform Your Cause Today</span>
          </h3>
          
          {/* Subtext */}
          <p className="mt-2 text-white/85 text-lg mb-8 max-w-2xl mx-auto">
            Experience effortless setup, seamless mobile functionality, and a platform thoughtfully designed for IE & UK organizations. Your mission, simplified.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <a 
              href="/free-trial" 
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-900 font-bold shadow-xl hover:bg-indigo-50 hover:scale-105 transition-all duration-300"
            >
              <span>Start Your Transformation Now</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
            </a>
            
            <a 
              href="/pricing" 
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-700/20 backdrop-blur-sm px-8 py-4 text-white font-bold shadow-xl border border-white/20 hover:bg-indigo-700/30 hover:scale-105 transition-all duration-300"
            >
              <span>Explore Plans & Unlock More Magic</span>
              <div className="h-2 w-2 rounded-full bg-white" />
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-white/70 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span>No Credit Card Required: Begin Your Journey Risk-Free</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>Setup in Under 5 Minutes: Instant Impact, Effortless Start</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-purple-400" />
              <span>Works on Any Device: Empowering You, Anywhere</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default FinalCTA;
