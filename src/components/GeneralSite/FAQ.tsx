import type React from 'react';

const FAQ: React.FC = () => {
  return (
    <div id="faq" className="container mx-auto mt-12 max-w-6xl px-4 pt-10">
      <div className="mb-12 text-center">
        <h2 className="text-fg mb-4 text-3xl font-bold">Frequently Asked Questions</h2>
        <p className="text-fg/70 mx-auto max-w-2xl">Get answers to common questions about FundRaisely</p>
      </div>
      
      <div className="grid gap-8 md:grid-cols-2">
        <div className="bg-muted rounded-xl p-6 shadow-md">
          <h3 className="text-fg mb-2 text-xl font-bold">What fundraising events can I run?</h3>
          <p className="text-fg/70">We are starting with live or virtual quiz nights, then other games of skill.  Bingo and lottery support will be available once our compliance engine is complete.</p>
        </div>
        
        <div className="bg-muted rounded-xl p-6 shadow-md">
          <h3 className="text-fg mb-2 text-xl font-bold">Is this legally compliant?</h3>
          <p className="text-fg/70">Games of skill like quizzes do not fall under gambling regulations in most jurisdictions. We’re working on full legal compliance tools for regulated games coming soon.</p>
        </div>
        
        <div className="bg-muted rounded-xl p-6 shadow-md">
          <h3 className="text-fg mb-2 text-xl font-bold">How does on-chain tracking work?</h3>
          <p className="text-fg/70">Key event data, like scores, winners, and financial summaries - is hashed and timestamped on-chain for a transparent, tamper-resistant record.</p>
        </div>
        
        <div className="bg-muted rounded-xl p-6 shadow-md">
          <h3 className="text-fg mb-2 text-xl font-bold">Can I accept cash and digital payments?</h3>
          <p className="text-fg/70">Oh Yes! Hosts can reconcile both, and our system helps you track who paid what - perfect for clean record-keeping and reporting.</p>
        </div>
      </div>
    </div>
  );
};

export default FAQ;