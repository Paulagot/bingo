import type React from 'react';

const HowItWorks: React.FC = () => {
  return (
    <div id="how-it-works" className="container mx-auto mt-12 max-w-6xl px-4 pt-2">
      <div className="mb-12 text-center">
        <h2 className="text-fg mb-4 text-3xl font-bold">How it works</h2>
        <p className="text-fg/70 mx-auto max-w-2xl">Choose a ready-to-run format like a quiz night, we provide the questions, scoring, and player management tools.</p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-3">
        <div className="bg-muted rounded-xl p-6 shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">1</div>
          </div>
          
          
        <h3 className="text-fg mb-2 text-xl font-bold">Plan Your Event</h3>
          <p className="text-fg/70">Choose a ready-to-run format like a quiz night, we provide the questions, scoring, and player management tools</p>
        </div>
        
        <div className="bg-muted rounded-xl p-6 shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">2</div>
          </div>
          <h3 className="text-fg mb-2 text-xl font-bold">Host & Play</h3>
          <p className="text-fg/70">Run your event online or in-person with auto-marking, team or individual scoring, and real-time leaderboards.</p>
          
        </div>
        
        <div className="bg-muted rounded-xl p-6 shadow-md">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">3</div>
          </div>
         <h3 className="text-fg mb-2 text-xl font-bold">Track & Report</h3>
          <p className="text-fg/70">Seamlessly reconcile cash and digital payments, and generate transparent, shareable records, hashed on-chain for tamper-proof tracking.</p>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;