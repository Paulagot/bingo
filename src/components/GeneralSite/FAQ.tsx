import type React from 'react';

const FAQ: React.FC = () => {
  return (
    <div id="faq" className="container mx-auto px-4 max-w-6xl mt-12 pt-10">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">Frequently Asked Questions</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">Get answers to common questions about FundRaisely</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold mb-2 text-gray-800">What fundraising events can I run?</h3>
          <p className="text-gray-600">We are starting with live or virtual quiz nights, then other games of skill.  Bingo and lottery support will be available once our compliance engine is complete.</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold mb-2 text-gray-800">Is this legally compliant?</h3>
          <p className="text-gray-600">Games of skill like quizzes do not fall under gambling regulations in most jurisdictions. We’re working on full legal compliance tools for regulated games coming soon.</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold mb-2 text-gray-800">How does on-chain tracking work?</h3>
          <p className="text-gray-600">Key event data, like scores, winners, and financial summaries - is hashed and timestamped on-chain for a transparent, tamper-resistant record.</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-xl font-bold mb-2 text-gray-800">Can I accept cash and digital payments?</h3>
          <p className="text-gray-600">Oh Yes! Hosts can reconcile both, and our system helps you track who paid what - perfect for clean record-keeping and reporting.</p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;