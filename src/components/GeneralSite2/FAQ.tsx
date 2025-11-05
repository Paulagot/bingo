import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const faqData = [
  {
    question: "What transformative fundraising events can I host?",
    answer: "Currently, we empower you to host captivating live fundraising quiz nights, with plans to expand into other engaging games of skill. Soon, we will unveil comprehensive Bingo and lottery support, complete with our advanced compliance engine.",
    gradient: "from-blue-500 to-cyan-500"
  },
  {
    question: "Is FundRaisely\'s approach legally sound and secure?",
    answer: "Absolutely. Games of skill like quizzes typically operate outside gambling regulations in most jurisdictions, offering you peace of mind. We are diligently developing full legal compliance tools for regulated games, ensuring your fundraising is always protected and transparent.",
    gradient: "from-green-500 to-emerald-500"
  },
  {
    question: "How does FundRaisely ensure transparent and verifiable impact with blockchain?",
    answer: "In the near future, key event data, including financial summaries and impact metrics, will be magically hashed and timestamped on-chain. This creates an immutable, transparent, and tamper-resistant record, transforming how you prove and share your incredible impact.",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    question: "Can I seamlessly manage both cash and digital payments?",
    answer: "Yes, with effortless grace! Our intuitive system allows hosts to reconcile both cash and digital payments, meticulously tracking every contribution. This ensures perfect record-keeping and simplifies reporting, giving you complete control and clarity.",
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
            <HelpCircle className="h-4 w-4" /> Unlocking Answers: Your Essential Guide
          </span>
          
          <h2 className="text-3xl md:text-4xl font-bold text-indigo-900 mb-4 leading-tight">
            Your Questions, Our Clarity: 
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent"> Illuminating FundRaisely's Magic</span>
          </h2>
          
          <p className="mx-auto max-w-2xl text-lg text-indigo-800/70 leading-relaxed">
            We're here to demystify the fundraising process. Explore our most frequently asked questions to understand how FundRaisely empowers your organization with innovative solutions and unwavering support.
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
                Still Seeking Answers or a Guiding Hand?
              </h3>
              <p className="text-indigo-700/70 text-sm">
                Our dedicated team is here to illuminate your path and provide personalized support, ensuring your fundraising journey is smooth and successful.
              </p>
            </div>
            <a
              href="/contact"
              className="group inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all duration-300 whitespace-nowrap"
            >
              <span>Connect with Our Experts</span>
              <HelpCircle className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQ;