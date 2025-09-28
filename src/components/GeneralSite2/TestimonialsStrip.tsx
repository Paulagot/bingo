// src/components/GeneralSite2/TestimonialsStrip.tsx
import type React from 'react';
import { Quote, Star, Users } from 'lucide-react';

const testimonials = [
  { 
    quote: 'FundRaisely transformed our event! Setup was a breeze, taking just 20 minutes, and we magically raised over €1,200 in a single night for our school. Truly impactful!',
    author: 'School PTA',
    gradient: 'from-blue-500 to-cyan-500'
  },
  { 
    quote: 'Our players were captivated by the live leaderboard – it brought an incredible energy! FundRaisely has revitalized our club nights, and we\'re committed to running these engaging events monthly.',
    author: 'Rugby Club',
    gradient: 'from-green-500 to-emerald-500'
  },
  { 
    quote: 'The seamless reporting feature was a game-changer for us. Our treasurer, who values transparency and ease, was absolutely delighted. FundRaisely truly cares about simplifying our financial processes.',
    author: 'Local Charity',
    gradient: 'from-pink-500 to-rose-500'
  }
];

const TestimonialsStrip: React.FC = () => (
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
      {/* Header */}
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-2 text-white/90 text-sm font-medium border border-white/20 mb-6">
          <Users className="h-4 w-4" /> Real Transformations, Real Voices
        </span>
        
        <h2 className="text-white mb-4 text-3xl md:text-4xl font-bold">
          Hear the Magic Unfold: Inspiring Stories from Our 
          <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent"> Community </span>
        </h2>
        
        <p className="text-white/80 mx-auto max-w-2xl text-lg">
          Discover how grassroots organizations across Ireland and the UK are experiencing unprecedented fundraising success and community revitalization with FundRaisely. These are their stories of transformation.
        </p>
      </div>

      {/* Testimonials Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {testimonials.map(({ quote, author, gradient }, index) => (
          <div 
            key={quote}
            className="group relative bg-white/10 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105"
          >
            {/* Quote Icon */}
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg mb-6 group-hover:shadow-xl transition-all duration-300`}>
              <Quote className="h-6 w-6 text-white" />
            </div>
            
            {/* Stars */}
            <div className="flex gap-1 mb-4">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
              ))}
            </div>
            
            {/* Quote */}
            <blockquote className="text-white/90 text-lg leading-relaxed mb-6 font-medium">
              "{quote}"
            </blockquote>
            
            {/* Author */}
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-md`}>
                <span className="text-white font-bold text-sm">{author.charAt(0)}</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{author}</p>
                <p className="text-white/60 text-xs">Verified Customer</p>
              </div>
            </div>
            
            {/* Decorative number */}
            <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm border border-white/30 font-bold text-white text-sm">
              {index + 1}
            </div>
            
            {/* Hover effect overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ))}
      </div>

      {/* Bottom Stats */}
      <div className="mt-12 flex flex-wrap justify-center gap-8 text-center">
        <div className="text-white">
          <div className="text-2xl font-bold text-white mb-1">50+</div>
          <div className="text-white/70 text-sm">Events Transformed</div>
        </div>
        <div className="text-white">
          <div className="text-2xl font-bold text-white mb-1">€25K+</div>
          <div className="text-white/70 text-sm">Funds Magically Generated</div>
        </div>
        <div className="text-white">
          <div className="text-2xl font-bold text-white mb-1">98%</div>
          <div className="text-white/70 text-sm">Success Rate: Your Mission, Our Commitment</div>
        </div>
      </div>
    </div>
  </section>
);

export default TestimonialsStrip;
