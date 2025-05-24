import type React from 'react';

const HowItWorks: React.FC = () => {
  return (
    <div id="how-it-works" className="container mx-auto px-4 max-w-6xl mt-20 pt-2">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">How it works</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">Choose a ready-to-run format like a quiz night, we provide the questions, scoring, and player management tools.</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
          </div>
          
        <h3 className="text-xl font-bold mb-2 text-gray-800">Plan Your Event</h3>
          <p className="text-gray-600">Choose a ready-to-run format like a quiz night, we provide the questions, scoring, and player management tools</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
          </div>
          <h3 className="text-xl font-bold mb-2 text-gray-800">Host & Play</h3>
          <p className="text-gray-600">Run your event online or in-person with auto-marking, team or individual scoring, and real-time leaderboards.</p>
          
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold">3</div>
          </div>
         <h3 className="text-xl font-bold mb-2 text-gray-800">Track & Report</h3>
          <p className="text-gray-600">Seamlessly reconcile cash and digital payments, and generate transparent, shareable records, hashed on-chain for tamper-proof tracking.</p>
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;