// src/pages/web3fundraiser.tsx
import React, { useState, useCallback } from 'react';
import { Globe, Heart, Users, DollarSign, CheckCircle, ArrowRight, Sparkles, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SEO } from '../components/SEO';
import Web3QuizWizard from '../components/Quiz/Wizard/Web3QuizWizard';
import { JoinRoomFlow } from '../components/Quiz/joinroom/JoinRoomFlow.tsx';
import { QuizSocketProvider } from '../components/Quiz/sockets/QuizSocketProvider';
import type { SupportedChain } from '../chains/types';

const FundraisingLaunchPage: React.FC = () => {
  // Community form states
  const [communityName, setCommunityName] = useState('');
  const [contactMethod, setContactMethod] = useState('Email');
  const [contactInfo, setContactInfo] = useState('');
  const [userName, setUserName] = useState('');
  const [ecosystem, setEcosystem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  
  // Web3 Quiz states
  const [showWeb3Wizard, setShowWeb3Wizard] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  const [detectedChain, setDetectedChain] = useState<SupportedChain | null>(null);
  const navigate = useNavigate();

  // Web3 Quiz handlers
  const handleWeb3WizardComplete = () => {
    setShowWeb3Wizard(false);
    setSelectedChain(null);
  };

  const handleChainUpdate = useCallback((newChain: SupportedChain) => {
    setSelectedChain(newChain);
  }, []);

  const handleCommunitySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!communityName || !contactInfo || !userName || !ecosystem) {
      setSubmitMessage('❌ Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const fullUrl = `/quiz/api/community-registration`;
      const payload = { communityName, contactMethod, contactInfo, userName, ecosystem };

      console.log('🚀 Submitting to:', fullUrl);
      console.log('📝 Data being sent:', payload);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Read raw text (works whether server returns JSON or not)
      const raw = await response.text();
      console.log('📄 Raw response text:', raw);

      // Try to parse JSON if present
      let data: any = null;
      if (raw) {
        try { data = JSON.parse(raw); } catch { /* non-JSON response is fine */ }
      }

      if (!response.ok) {
        const msg =
          data?.error ||
          data?.message ||
          raw ||
          `HTTP ${response.status}`;
        setSubmitMessage(`❌ Error: ${msg}`);
        return;
      }

      setSubmitMessage('✅ Community registration submitted successfully! We will be in touch soon.');

      // Clear form
      setCommunityName('');
      setContactInfo('');
      setUserName('');
      setContactMethod('Email');
      setEcosystem('');
    } catch (error) {
      console.error('❌ Submission error:', error);
      setSubmitMessage('❌ Network error. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToLearnMore = () => {
    document.getElementById('learn-more')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Check if any modal is open to adjust layout
  const isAnyModalOpen = showWeb3Wizard || showJoinModal;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <SEO
        title="Web3 Impact Event - World's First Multichain Regenerative Fundraiser"
        description="Join the largest Web3 fundraising event ever. Host a quiz night with your community and help us raise $100,000 for charity while pioneering the future of transparent, blockchain-powered fundraising."
        keywords="web3 fundraising, blockchain charity, multichain fundraising, regenerative fundraising, crypto for good, blockchain impact, charity blockchain event"
        type="event"
        domainStrategy="geographic"
       
      />
      
      {!isAnyModalOpen && (
        <div>
          {/* Compact Hero Section */}
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10"></div>
            <div className="relative mx-auto max-w-7xl px-4 py-8">
              
              {/* Compact headline */}
              <div className="mb-6 text-center">
                <div className="mb-4 inline-flex items-center space-x-2 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-2 text-sm font-semibold text-green-800 shadow-md">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-base font-bold md:text-lg">
                    World's First Multichain Regenerative Fundraiser
                  </span>
                </div>
                
                <h1 className="text-fg mb-4 text-3xl font-bold leading-tight md:text-5xl">
                  Host a Quiz Night, <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Change the World</span>
                </h1>
              </div>

              {/* New Layout: Top row side-by-side, bottom row full width */}
              <div className="mx-auto max-w-6xl space-y-6">
                
                {/* Top Row: Need Support + Get Full Support side by side */}
                <div className="grid gap-8 lg:grid-cols-2">
                  
                  {/* Left: Need Support? Pledge Now */}
                  <div className="bg-muted rounded-2xl p-6 shadow-lg">
                    <h3 className="text-fg mb-4 text-lg font-bold">🤝 Need Support? Pledge Now</h3>
                    <p className="text-fg/80 mb-4 text-sm leading-relaxed">
                      Perfect for web3 communities that want full support hosting their first fundraising quiz. Powered by Fundraisely and The Giving Block. 
                      We'll provide everything you need and guide you through the entire process.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                        <span className="text-fg/70 text-sm">Full Support & Training</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                        <span className="text-fg/70 text-sm">Media & Promotion Help</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                        <span className="text-fg/70 text-sm">Custom Quiz Content</span>
                      </div>
                       <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                        <span className="text-fg/70 text-sm">5% game fees paid directly to Host</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Get Full Support Form */}
                  <div className="bg-muted border-border rounded-2xl border p-6 shadow-2xl">
                    <div className="mb-6 text-center">
                      <h2 className="text-fg mb-2 text-lg font-bold">
                       Pledge Now and 🤝 Get Full Support
                      </h2>
                      <p className="text-fg/70 text-sm">
                        Perfect for first-time fundraising hosts. Get full guidance and support for your first fundraising event
                      </p>
                    </div>

                    {submitMessage && (
                      <div className={`mb-4 rounded-lg p-3 text-sm ${
                        submitMessage.includes('✅') 
                          ? 'border border-green-200 bg-green-50 text-green-700' 
                          : 'border border-red-200 bg-red-50 text-red-700'
                      }`}>
                        {submitMessage}
                      </div>
                    )}
                    
                    {/* Compact form fields */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          placeholder="Your name/alias *"
                          disabled={isSubmitting}
                        />
                        
                        <input
                          type="text"
                          value={communityName}
                          onChange={(e) => setCommunityName(e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          placeholder="Community name *"
                          disabled={isSubmitting}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <select
                          value={contactMethod}
                          onChange={(e) => setContactMethod(e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          disabled={isSubmitting}
                        >
                          <option>Email</option>
                          <option>Telegram</option>
                          <option>X (Twitter)</option>
                        </select>
                        
                        <input
                          type="text"
                          value={contactInfo}
                          onChange={(e) => setContactInfo(e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          placeholder="Contact info *"
                          disabled={isSubmitting}
                        />

                        <input
                          type="text"
                          value={ecosystem}
                          onChange={(e) => setEcosystem(e.target.value)}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                          placeholder="Chain *"
                          disabled={isSubmitting}
                        />
                      </div>

                      <button 
                        onClick={() => handleCommunitySubmit()}
                        disabled={isSubmitting}
                        className="flex w-full items-center justify-center space-x-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:opacity-50"
                      >
                        <span>{isSubmitting ? 'Submitting...' : 'Pledge Now'}</span>
                        {!isSubmitting && <ArrowRight className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bottom Row: Ready to Host? Try Our Platform - Full Width */}
                <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-lg">
                  <div className="text-center">
                    <h3 className="text-fg mb-4 text-xl font-bold">⚡ Ready to Host? Try Our Platform</h3>
                    <p className="text-fg/80 mb-6 text-sm">
                      For experienced communities ready to create and host their own fundraising events independently.
                    </p>
                  </div>
                  <div className="mx-auto grid max-w-md grid-cols-1 gap-3 sm:max-w-2xl sm:grid-cols-2">
                    <button
                      className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition-colors hover:bg-green-700"
                      onClick={() => setShowWeb3Wizard(true)}
                    >
                      🌐 Create Web3 Impact Event
                    </button>
                    <button
                      className="w-full rounded-lg border-2 border-indigo-600 bg-white px-4 py-3 font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                      onClick={() => setShowJoinModal(true)}
                    >
                      🙋 Join Existing Quiz
                    </button>
                  </div>
                </div>
              </div>

              {/* Compact secondary CTA */}
              <div className="mt-8 text-center">
                <button 
                  onClick={scrollToLearnMore}
                  className="inline-flex items-center space-x-2 font-medium text-indigo-600 transition-colors hover:text-indigo-700"
                >
                  <span>Want to learn more first?</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Sticky CTA Bar for mobile */}
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white shadow-lg md:hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">Ready to join?</div>
                <div className="text-sm opacity-90">Pledge your community now</div>
              </div>
              <button 
                onClick={scrollToTop}
                className="bg-muted rounded-lg px-6 py-2 font-semibold text-indigo-600 transition-colors hover:bg-gray-100"
              >
                Pledge
              </button>
            </div>
          </div>

          {/* Learn More Section */}
          <div id="learn-more" className="mx-auto max-w-7xl px-4 py-16">
            <div className="mb-12 text-center">
              <h2 className="text-fg mb-4 text-4xl font-bold">How Regenerative Fundraising Works</h2>
              <p className="text-fg/70 text-xl">Simple, transparent, impactful</p>
            </div>

            {/* Character explanations - simplified */}
            <div className="mb-12 space-y-8">
              <div className="bg-muted flex items-center space-x-6 rounded-2xl p-6 shadow-lg">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-3xl">
                  💝
                </div>
                <div>
                  <h3 className="heading-2">What is Regenerative Fundraising?</h3>
                  <p className="text-fg/80">A new approach where Web3 communities host fundraising events. Most funds go directly to charity, while a small portion helps fund ongoing development of tools for global good.</p>
                </div>
              </div>

              <div className="bg-muted flex items-center space-x-6 rounded-2xl p-6 shadow-lg">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-3xl">
                  🚀
                </div>
                <div>
                  <h3 className="heading-2">The Web3 Impact Event</h3>
                  <p className="text-fg/80">Our mission: become the largest Web3 fundraising event ever. Powered by <strong>The Giving Block</strong> for maximum transparency and impact.</p>
                </div>
              </div>

              <div className="flex items-center space-x-6 rounded-2xl border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 shadow-lg">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-3xl">
                  ⚡
                </div>
                <div>
                  <h3 className="heading-2">Quiz Nights With Superpowers</h3>
                  <p className="text-fg/80">Forget boring trivia. On Fundraisely, teams battle with <strong>Freeze attacks</strong>, <strong>Point Steals</strong>, and strategic power-ups. Every question becomes a tactical decision, every round raises real money for charity.</p>
                </div>
              </div>
            </div>

            {/* Another CTA after explanation */}
            <div className="rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-center text-white">
              <h3 className="mb-4 text-2xl font-bold">Convinced? Join the Movement!</h3>
              <p className="mb-6 text-lg opacity-90">Over 100+ communities already interested. Don't miss out on making history.</p>
              <button 
                onClick={scrollToTop}
                className="bg-muted inline-flex items-center space-x-2 rounded-xl px-8 py-4 font-semibold text-indigo-600 transition-all duration-200 hover:scale-105 hover:bg-gray-100"
              >
                <span>Pledge Your Community</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Target & Impact Section */}
          <div className="bg-muted border-border border-t">
            <div className="mx-auto max-w-7xl px-4 py-16">
              <div className="mb-12 text-center">
                <h2 className="text-fg mb-4 text-4xl font-bold">Our $100,000 Impact Goal</h2>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div className="rounded-2xl bg-green-50 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500">
                    <Heart className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-fg mb-2 text-2xl font-bold">$40,000+</h3>
                  <h4 className="mb-2 text-lg font-semibold text-green-600">Direct to Charity</h4>
                  <p className="text-fg/70">Delivered directly to verified charities through The Giving Block</p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500">
                    <Users className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-fg mb-2 text-2xl font-bold">$40,000</h3>
                  <h4 className="mb-2 text-lg font-semibold text-blue-600">Community Rewards</h4>
                  <p className="text-fg/70">Back to participating communities</p>
                </div>

                <div className="rounded-2xl bg-purple-50 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-500">
                    <Zap className="h-10 w-10 text-white" />
                  </div>
                  <h3 className="text-fg mb-2 text-2xl font-bold">$20,000</h3>
                  <h4 className="mb-2 text-lg font-semibold text-purple-600">Platform Development</h4>
                  <p className="text-fg/70">Onboarding Web2 Clubs, Community Groups and Charities</p>
                </div>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="border-border border-t bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-12">
              <div className="text-center">
                <h3 className="text-fg mb-8 text-2xl font-bold">Trusted & Transparent</h3>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  <div className="text-center">
                    <Shield className="mx-auto mb-2 h-12 w-12 text-indigo-600" />
                    <div className="text-fg font-semibold">On-Chain Tracking</div>
                  </div>
                  <div className="text-center">
                    <Globe className="mx-auto mb-2 h-12 w-12 text-green-600" />
                    <div className="text-fg font-semibold">Powered by the Giving Block</div>
                  </div>
                  <div className="text-center">
                    <DollarSign className="mx-auto mb-2 h-12 w-12 text-blue-600" />
                    <div className="text-fg font-semibold">Capped Fees (20%)</div>
                  </div>
                  <div className="text-center">
                    <CheckCircle className="mx-auto mb-2 h-12 w-12 text-purple-600" />
                    <div className="text-fg font-semibold">Full Documentation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Final CTA */}
          <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
            <div className="mx-auto max-w-4xl px-4 py-16 text-center">
              <h2 className="mb-6 text-4xl font-bold">Don't Miss the Biggest Web3 Impact Event</h2>
              <p className="mb-8 text-xl opacity-90">
                Campaign starts later in 2025. Early pledges get priority access and special recognition.
              </p>
              <button 
                onClick={scrollToTop}
                className="bg-muted inline-flex items-center space-x-3 rounded-xl px-10 py-4 text-xl font-bold text-indigo-600 transition-all duration-200 hover:scale-105 hover:bg-gray-100"
              >
                <span>Pledge Your Community Now</span>
                <ArrowRight className="h-6 w-6" />
              </button>
              <p className="mt-4 text-sm opacity-75">
                Track our progress live at fundraisely.ie/whats-new
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Web3 Wizard Modal */}
      {showWeb3Wizard && (
        <Web3QuizWizard 
          key="web3-wizard-stable"
          selectedChain={selectedChain}
          onComplete={handleWeb3WizardComplete}
          onChainUpdate={handleChainUpdate}
        />
      )}

      {/* Join Room Modal */}
      {showJoinModal && (
        <QuizSocketProvider>
          <JoinRoomFlow 
            key="stable-join-flow"
            onClose={() => setShowJoinModal(false)}
            onChainDetected={(chain: SupportedChain) => {
              console.log('Chain detected:', chain);
              setDetectedChain(chain);
            }}
          />
        </QuizSocketProvider>
      )}
    </div>
  );
};

export default FundraisingLaunchPage;