import React from 'react';
import { GraduationCap, Trophy, Heart, ArrowRight, Users } from 'lucide-react';

const useCases = [
  { 
    title: 'For Schools & PTAs: Nurturing Community, Boosting Funds', 
    copy: 'Effortlessly create joyful, family-friendly quiz events that unite your school community, with simple payment flows and transparent, parent-friendly reports ensuring every penny raised supports your students.',
    href: '/quiz/use-cases/schools',
    icon: GraduationCap,
    gradient: 'from-blue-500 to-cyan-500',
    bgGradient: 'from-blue-50 to-cyan-50',
    features: ["Joyful Family Engagement", "Simplified Payment Processing", "Transparent Parent Reports"]
  },
  { 
    title: 'For Sports Clubs: Ignite Rivalry, Amplify Impact', 
    copy: 'Transform your club nights into thrilling fundraising spectacles. Our platform delivers competitive leaderboards and seamless sponsor integration, empowering you to amplify your impact and rally your members like never before.',
    href: '/quiz/use-cases/clubs',
    icon: Trophy,
    gradient: 'from-green-500 to-emerald-500',
    bgGradient: 'from-green-50 to-emerald-50',
    features: ["Dynamic Competitive Play", "Seamless Sponsor Showcases", "Effortless Team Management"]
  },
  { 
    title: 'For Charities: Verifiable Impact, Compassionate Support', 
    copy: 'Elevate your mission with transparent, donor-friendly fundraising. Soon FundRaisely will provide clear donation receipts, robust impact tracking, and comprehensive donor reporting, ensuring every act of generosity is recognized and every outcome is verifiable.',
    href: '/quiz/use-cases/charities',
    icon: Heart,
    gradient: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-50 to-rose-50',
    features: ["Transparent Donation Records", "Powerful Impact Tracking", "Empathetic Donor Reporting"]
  },
  { 
    title: 'For Community Groups: Building Stronger Communities', 
    copy: 'Fund local projects and strengthen neighborhood bonds through accessible, fun quiz events. Our platform provides transparent financial management and simple setup, making it easy for anyone to host professional fundraising events.',
    href: '/quiz/use-cases/community-groups',
    icon: Users,
    gradient: 'from-amber-500 to-orange-500',
    bgGradient: 'from-amber-50 to-orange-50',
    features: ["Accessible Event Management", "Local Project Funding", "Transparent Financial Tracking"]
  }
];

const UseCasesTriptych = () => (
  <section className="px-4 pt-16 pb-8">
    <div className="container mx-auto max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-indigo-700 text-sm font-medium mb-6">
          <Users className="h-4 w-4" /> Empowering Every Mission: Tailored Fundraising Solutions
        </span>
        
        <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-4 leading-tight">
          Your Vision, Our Expertise: Fundraising Transformed for Every 
          <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Cause</span>
        </h2>
        
        <p className="mx-auto max-w-2xl text-lg text-indigo-800/70 leading-relaxed">
          Discover how FundRaisely thoughtfully crafts unique fundraising journeys, providing specialized tools and compassionate support designed to meet the distinct needs of every organization.
        </p>
      </div>

      {/* Use Cases Grid */}
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-12">
        {useCases.map(({ title, copy, href, icon: Icon, gradient, bgGradient, features }, index) => (
          <a 
            key={title}
            href={href}
            className="group relative block bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 border border-gray-100"
          >
            {/* Background gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-30 rounded-2xl`} />
            
            {/* Content */}
            <div className="relative z-10">
              {/* Icon */}
              <div className={`inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg mb-6 group-hover:shadow-xl transition-all duration-300`}>
                <Icon className="h-8 w-8 text-white" />
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-bold text-indigo-900 mb-3 leading-tight">
                {title}
              </h3>
              
              {/* Description */}
              <p className="text-indigo-800/70 leading-relaxed mb-6">
                {copy}
              </p>
              
              {/* Features List */}
              <div className="mb-6 space-y-2">
                {features.map((feature, featureIndex) => (
                  <div key={featureIndex} className="flex items-center gap-2 text-sm text-indigo-700">
                    <div className={`h-1.5 w-1.5 rounded-full bg-gradient-to-r ${gradient}`} />
                    {feature}
                  </div>
                ))}
              </div>
              
              {/* CTA */}
              <div className="flex items-center gap-2 text-indigo-700 font-semibold group-hover:text-indigo-800 transition-colors duration-300">
                <span>Learn More</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
              
              {/* Decorative number */}
              <div className="absolute -top-3 -right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg border-2 border-gray-100 font-bold text-indigo-600 text-sm">
                {index + 1}
              </div>
            </div>
            
            {/* Hover effect overlay */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </a>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="text-center">
        <div className="inline-flex items-center gap-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border border-indigo-100">
          <div>
            <h3 className="text-lg font-bold text-indigo-900 mb-1">
              Seeking Your Perfect Fundraising Formula?
            </h3>
            <p className="text-indigo-700/70 text-sm">
              Let us guide you to the ideal solution, tailored precisely to your organization's unique needs and aspirations.
            </p>
          </div>
          <a
            href="/contact"
            className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all duration-300 whitespace-nowrap"
          >
            <span>Get Personalized Guidance</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default UseCasesTriptych;
