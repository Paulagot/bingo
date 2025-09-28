import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqData = [
  {
    question: "What fundraising events can I run?",
    answer: "We are starting with live or virtual fundraising quiz nights, then other games of skill. Bingo and lottery support will be available once our compliance engine is complete.",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    question: "Is this legally compliant?",
    answer: "Games of skill like quizzes do not fall under gambling regulations in most jurisdictions. We're working on full legal compliance tools for regulated games coming soon.",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    question: "Is this blockchain verified?",
    answer: "Key event data, like financial summaries and impact - in the future will be hashed and timestamped on-chain for a transparent, tamper-resistant record.",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    question: "Can I accept cash and digital payments?",
    answer: "Oh Yes! Hosts can reconcile both, and our system helps you track who paid what - perfect for clean record-keeping and reporting.",
    gradient: "from-orange-500 to-red-500"
  }
];

const FAQ: React.FC = () => {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <section id="faq" className="px-4 pt-16 pb-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-indigo-700 text-sm font-medium mb-6">
            <HelpCircle className="h-4 w-4" /> Common Questions
          </span>
          
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-4 leading-tight">
            Frequently Asked 
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Questions</span>
          </h2>
          
          <p className="mx-auto max-w-2xl text-lg text-indigo-800/70 leading-relaxed">
            Get answers to common questions about FundRaisely and how our platform works for your organization.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {faqData.map((item, index) => {
            const isOpen = openItems.includes(index);
            
            return (
              <div 
                key={index}
                className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                {/* Question Header */}
                <button
                  onClick={() => toggleItem(index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center gap-4">
                    {/* Gradient Icon */}
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${item.gradient} shadow-md`}>
                      <span className="text-white font-bold text-sm">{index + 1}</span>
                    </div>
                    
                    {/* Question */}
                    <h3 className="text-lg font-bold text-indigo-900 group-hover:text-indigo-700 transition-colors duration-200">
                      {item.question}
                    </h3>
                  </div>
                  
                  {/* Chevron */}
                  <ChevronDown 
                    className={`h-5 w-5 text-indigo-600 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : 'rotate-0'
                    }`}
                  />
                </button>
                
                {/* Answer Content */}
                <div className={`overflow-hidden transition-all duration-300 ${
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="px-6 pb-6">
                    <div className="ml-14 pt-2 border-l-2 border-gray-100 pl-4">
                      <p className="text-indigo-800/70 leading-relaxed">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border border-indigo-100">
            <div>
              <h3 className="text-lg font-bold text-indigo-900 mb-1">
                Still have questions?
              </h3>
              <p className="text-indigo-700/70 text-sm">
                We're here to help you get started with your fundraising campaign
              </p>
            </div>
            <a
              href="/contact"
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all duration-300 whitespace-nowrap"
            >
              <span>Contact Us</span>
              <HelpCircle className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;