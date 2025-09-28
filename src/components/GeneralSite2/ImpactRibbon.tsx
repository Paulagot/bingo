import type React from 'react';
import { Globe, Users, Target } from 'lucide-react';

const ImpactRibbon: React.FC = () => (
  <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-700 to-purple-600 py-20">
    {/* Background decorative elements */}
    <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-pink-400/20 blur-3xl" />
    <div className="absolute -right-16 top-32 h-56 w-56 rounded-full bg-indigo-400/20 blur-3xl" />
    <div className="absolute bottom-10 left-1/2 h-32 w-32 rounded-full bg-purple-400/20 blur-3xl" />
    
    {/* Geometric background pattern */}
    <div className="absolute inset-0 opacity-5">
      <div className="absolute top-20 left-1/4 h-2 w-2 bg-white rotate-45" />
      <div className="absolute top-40 right-1/3 h-3 w-3 bg-white/60 rotate-12" />
      <div className="absolute bottom-32 left-1/3 h-2 w-2 bg-white rotate-45" />
      <div className="absolute bottom-20 right-1/4 h-3 w-3 bg-white/40 rotate-12" />
    </div>

    <div className="container mx-auto max-w-6xl px-4 relative z-10">
      <div className="text-center text-white">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-white/90 text-sm font-medium border border-white/20 mb-6">
          <Globe className="h-4 w-4" /> Pioneering Global Impact
        </span>
        
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Experience the Future of Giving: Our Web3 Impact Campaign — 
          <span className="bg-gradient-to-r from-pink-300 to-yellow-300 bg-clip-text text-transparent"> Powering Communities, Transforming Lives</span>
        </h2>
        
        <p className="mx-auto max-w-2xl text-white/85 text-lg mb-8">
          Step into a new era of philanthropy. Join our groundbreaking Web3 movement, where innovative fundraising quiz events empower real-world causes. Engage, revive, and unite your community as we collectively work towards a shared vision of $100K in transformative impact.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <Target className="h-4 w-4 text-pink-300" />
            <span className="text-white/90 text-sm font-medium">Ambitious $100K Goal: Your Contribution Matters</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <Users className="h-4 w-4 text-indigo-300" />
            <span className="text-white/90 text-sm font-medium">Community-Led Transformation: Together We Thrive</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
            <Globe className="h-4 w-4 text-purple-300" />
            <span className="text-white/90 text-sm font-medium">Web3 Innovation: Transparent & Verifiable Impact</span>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          <a 
            href="/Web3-Impact-Event" 
            className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-bold text-indigo-700 shadow-xl hover:bg-indigo-50 hover:scale-105 transition-all duration-300"
          >
            Uncover the Vision
            <div className="h-2 w-2 rounded-full bg-indigo-600" />
          </a>
          <a 
            href="/web3-fundraising-quiz" 
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-700/20 backdrop-blur-sm px-8 py-4 font-bold text-white shadow-xl border border-white/20 hover:bg-indigo-700/30 hover:scale-105 transition-all duration-300"
          >
            Join the Movement: Make a Difference
            <div className="h-2 w-2 rounded-full bg-white" />
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default ImpactRibbon;
