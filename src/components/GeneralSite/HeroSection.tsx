import type React from 'react';
import { Gamepad2, Shield, Heart, Users } from 'lucide-react';

const HeroSection: React.FC = () => {
  return (
    <div className="px-4 pb-4 pt-8">
      {/* Reduced top padding from pt-24 to pt-16 */}
      {/* Reduced bottom padding from pb-10 to pb-8 */}
      <div className="container mx-auto max-w-6xl">
        <div className="relative">
          {/* Background Elements */}
          <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300 opacity-20 blur-2xl" />
          <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300 opacity-20 blur-2xl"/>
          
          {/* Hero Content */}
          <div className="relative z-10 text-center">
            <div className="mb-6 inline-block animate-pulse rounded-full bg-indigo-100 p-3">
              <Gamepad2 className="h-12 w-12 text-indigo-600" />
            </div>
            
            <h1 className="mb-6 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-4xl font-bold leading-tight text-transparent md:text-6xl">
              FundRaisely: Quiz Fundraisers for Real Impact
            </h1>
            
            <p className="mx-auto mb-8 max-w-3xl text-lg text-indigo-900/70 md:text-xl">
              Raise Funds With Quiz Nights — Fun, Transparent & Easy
            </p>
            
            <p className="heading-2">
              "Frictionless Fundraising Built for Impact"
            </p>
            
                     </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
