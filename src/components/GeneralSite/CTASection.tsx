import type React from 'react';

const CTASection: React.FC = () => {
  return (
    <div className="container mx-auto mt-12 max-w-6xl px-4 pt-10">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl">
        <div className="px-8 py-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">Ready to Run Your Fundraising Events?</h2>
          <p className="mx-auto mb-8 max-w-2xl text-white/80">Join clubs and charities using FundRaisely to manage their fundraising events with automatic reporting and transparency</p>
          
          <div className="flex flex-wrap justify-center gap-4">
            <button 
              type="button"
              onClick={() => document.getElementById('create-room-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-muted rounded-xl px-8 py-3 font-semibold text-indigo-600 shadow-md transition hover:bg-indigo-50"
            >
              Host an Event
            </button>
            <button 
              type="button"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-xl bg-indigo-700 px-8 py-3 font-semibold text-white shadow-md transition hover:bg-indigo-800"
            >
              Learn More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CTASection;