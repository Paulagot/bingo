// src/components/GeneralSite2/FeaturesHighlightGrid.tsx
import type React from 'react';
import { Sparkles, Gift, FileCheck2, BarChart, ArrowRight } from 'lucide-react';

const items = [
  { 
    icon: Sparkles, 
    title: 'Enchanting Fundraising Extras', 
    copy: 'Transform engagement into vital funds with clues, lifelines, freeze-outs, and more — optional power-ups that magically boost excitement and contributions.',
    gradient: 'from-purple-500 to-pink-500',
    bgGradient: 'from-purple-50 to-pink-50'
  },
  { 
    icon: FileCheck2, 
    title: 'Effortless Financial Clarity & Reporting', 
    copy: 'Gain complete peace of mind. Seamlessly match all entry fees and extras (cash, card, or Web3) in one intuitive place, and effortlessly export audit-ready CSVs for transparent record-keeping.',
    gradient: 'from-indigo-500 to-blue-500', 
    bgGradient: 'from-indigo-50 to-blue-50'
  },
  { 
    icon: BarChart, 
    title: 'Dynamic Live Quizzes: Engaging & Seamless', 
    copy: 'Captivate your audience with real-time scoring, dynamic General Trivia, Wipeout, and Speed Rounds, complete with auto-tiebreakers and ready-to-run templates for a truly magical event experience.',
    gradient: 'from-green-500 to-teal-500',
    bgGradient: 'from-green-50 to-teal-50'
  },
  { 
    icon: Gift, 
    title: 'Celebrate Your Impact: Transparent Success', 
    copy: 'Witness the transformation! Celebrate the total funds raised and showcase each team\'s contribution on a transparent, motivating, and repeat-worthy wrap-up screen, inspiring future generosity.',
    gradient: 'from-orange-500 to-red-500',
    bgGradient: 'from-orange-50 to-red-50'
  }
];

const FeaturesHighlightGrid: React.FC = () => (
  <section className="px-4 pt-16 pb-8">
    <div className="container mx-auto max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-indigo-700 text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" /> Your Complete Fundraising Transformation
        </span>
        
        <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-4 leading-tight">
          Unleash Your Potential: Fundraising, Reporting, and 
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Reconciliation </span>
          — All Magically Integrated
        </h2>
        
        <p className="mx-auto max-w-2xl text-lg text-indigo-800/70 leading-relaxed">
          Crafted with care, our professional-grade tools empower clubs, schools, and charities to effortlessly surpass their fundraising goals and amplify their impact.
        </p>
      </div>

      {/* Feature Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 mb-12">
        {items.map(({ icon: Icon, title, copy, gradient, bgGradient }, index) => (
          <div 
            key={title} 
            className="group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100"
          >
            {/* Background gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-30 rounded-2xl`} />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Icon */}
              <div className={`inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg mb-4 group-hover:shadow-xl transition-all duration-300`}>
                <Icon className="h-7 w-7 text-white" />
              </div>
              
              {/* Title */}
              <h3 className="text-lg font-bold text-indigo-900 mb-3 leading-tight">
                {title}
              </h3>
              
              {/* Description */}
              <p className="text-sm text-indigo-800/70 leading-relaxed">
                {copy}
              </p>
              
              {/* Decorative element */}
              <div className="mt-4 flex items-center gap-2 text-indigo-600 text-xs font-medium opacity-60 group-hover:opacity-100 transition-opacity duration-300">
                <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${gradient}`} />
                Feature {index + 1}
              </div>
            </div>
            
            {/* Hover effect overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      {/* Enhanced CTA Button */}
      <div className="text-center">
        <a
          href="/quiz/features"
          className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-4 text-white font-bold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
        >
          <span>Discover All Transformative Features</span>
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
        </a>
        
        {/* Secondary link */}
        <div className="mt-4">
          <a 
            href="/founding-partners" 
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm transition-colors duration-300"
          >
            Unlock Your Founding Partners Plan →
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default FeaturesHighlightGrid;
