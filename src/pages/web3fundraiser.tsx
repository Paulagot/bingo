import React, { useState } from 'react';
import { Globe, Heart, Users, DollarSign, CheckCircle, ArrowRight, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';

const FundraisingLaunchPage: React.FC = () => {
  const [communityName, setCommunityName] = useState('');
  const [contactMethod, setContactMethod] = useState('Email');
  const [contactInfo, setContactInfo] = useState('');
  const [userName, setUserName] = useState('');
  const [ecosystem, setEcosystem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleCommunitySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!communityName || !contactInfo || !userName || !ecosystem) {
      setSubmitMessage('❌ Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Use the same pattern as your quiz API
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://bingo-production-4534.up.railway.app';
      
      const fullUrl = `${apiUrl}/quiz/api/community-registration`;
      console.log('🚀 Submitting to:', fullUrl);
      console.log('📝 Data being sent:', { 
        communityName, 
        contactMethod, 
        contactInfo, 
        userName, 
        ecosystem 
      });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communityName,
          contactMethod,
          contactInfo,
          userName,
          ecosystem
        }),
      });

      // Get the raw response text first
      const responseText = await response.text();
      console.log('📄 Raw response text:', responseText);

      if (!responseText) {
        console.error('❌ Empty response body');
        setSubmitMessage(`❌ Server error: Empty response (Status: ${response.status})`);
        return;
      }

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log('✅ Parsed JSON data:', data);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        console.error('❌ Response was not valid JSON:', responseText);
        setSubmitMessage(`❌ Server error: Invalid response format (Status: ${response.status})`);
        return;
      }

      if (response.ok) {
        setSubmitMessage('✅ Community registration submitted successfully! We\'ll be in touch soon.');
        // Clear form
        setCommunityName('');
        setContactInfo('');
        setUserName('');
        setContactMethod('Email');
        setEcosystem('');
      } else {
        setSubmitMessage(`❌ Error: ${data.error || 'Failed to submit registration'}`);
      }
    } catch (error) {
      setSubmitMessage('❌ Network error. Please try again later.');
      console.error('❌ Submission error:', error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Section with Immediate CTA */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          
          {/* Main headline */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-6 py-3 rounded-full text-lg font-semibold shadow-md mb-6">
              <Sparkles className="w-6 h-6" />
              <span className="text-xl md:text-2xl font-extrabold">
                The World's First Multichain Regenerative Fundraiser
              </span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Host a Quiz Night,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                Change the World
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Join the largest Web3 fundraising event ever. 50%+ goes directly to charity, 
              30% back to your community. Powered by Glo Dollar & The Giving Block.
            </p>
          </div>

          {/* Primary CTA Section - Above the fold */}
          <div id="hero-form" className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-8 mb-12 max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                🚀 Ready to Make an Impact?
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                Pledge your Web3 community to host a quiz night during our 6-month campaign
              </p>
              
              {/* Quick stats to build confidence */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">50%+</div>
                  <div className="text-sm text-green-700">To Charity</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">30%</div>
                  <div className="text-sm text-blue-700">Your Community</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">20%</div>
                  <div className="text-sm text-purple-700">Tech for Good</div>
                </div>
              </div>
            </div>

            {/* Enhanced Registration form */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
              {submitMessage && (
                <div className={`mb-4 p-4 rounded-lg ${
                  submitMessage.includes('✅') 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {submitMessage}
                </div>
              )}
              
              {/* First Row - Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Your name/alias *"
                  disabled={isSubmitting}
                />
                
                <input
                  type="text"
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Community name *"
                  disabled={isSubmitting}
                />
              </div>

              {/* Second Row - Contact & Ecosystem */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <select
                  value={contactMethod}
                  onChange={(e) => setContactMethod(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                  className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Contact info *"
                  disabled={isSubmitting}
                />

                <input
                  type="text"
                  value={ecosystem}
                  onChange={(e) => setEcosystem(e.target.value)}
                  className="border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Chain *"
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Button */}
              <div className="text-center">
                <button 
                  onClick={() => handleCommunitySubmit()}
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2 disabled:opacity-50 mx-auto"
                >
                  <span>{isSubmitting ? 'Submitting...' : 'Pledge Now'}</span>
                  {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
              
              <p className="text-sm text-gray-600 text-center mt-4">
                ✅ Free to pledge • ✅ 6-month campaign • ✅ Full transparency
              </p>
            </div>
          </div>

          {/* Secondary CTA for those who want to learn more first */}
          <div className="text-center">
            <button 
              onClick={scrollToLearnMore}
              className="inline-flex items-center space-x-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              <span>Want to learn more first?</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky CTA Bar for mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 shadow-lg z-50 md:hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">Ready to join?</div>
            <div className="text-sm opacity-90">Pledge your community now</div>
          </div>
          <button 
            onClick={scrollToTop}
            className="bg-white text-indigo-600 px-6 py-2 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Pledge
          </button>
        </div>
      </div>

      {/* Learn More Section */}
      <div id="learn-more" className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">How Regenerative Fundraising Works</h2>
          <p className="text-xl text-gray-600">Simple, transparent, impactful</p>
        </div>

        {/* Character explanations - simplified */}
        <div className="space-y-8 mb-12">
          <div className="flex items-center space-x-6 bg-white rounded-2xl p-6 shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-3xl">
              💝
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">What is Regenerative Fundraising?</h3>
              <p className="text-gray-700">A new approach where Web3 communities host fundraising events. Most funds go directly to charity, while a small portion helps fund ongoing development of tools for global good.</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 bg-white rounded-2xl p-6 shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-3xl">
              🚀
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">The Web3 Impact Event</h3>
              <p className="text-gray-700">Our mission: become the largest Web3 fundraising event ever. Powered by <strong>Glo Dollar</strong> and <strong>The Giving Block</strong> for maximum transparency and impact.</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 shadow-lg">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-3xl">
              ⚡
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quiz Nights With Superpowers</h3>
              <p className="text-gray-700">Forget boring trivia. On Fundraisely, teams battle with <strong>Freeze attacks</strong>, <strong>Point Steals</strong>, and strategic power-ups. Every question becomes a tactical decision, every round raises real money for charity.</p>
            </div>
          </div>
        </div>

        {/* Another CTA after explanation */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 text-center text-white">
          <h3 className="text-2xl font-bold mb-4">Convinced? Join the Movement!</h3>
          <p className="text-lg mb-6 opacity-90">Over 100+ communities already interested. Don't miss out on making history.</p>
          <button 
            onClick={scrollToTop}
            className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold hover:bg-gray-100 transition-all duration-200 hover:scale-105 inline-flex items-center space-x-2"
          >
            <span>Pledge Your Community</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Target & Impact Section */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our $1M Impact Goal</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center bg-green-50 rounded-2xl p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">$500,000+</h3>
              <h4 className="text-lg font-semibold text-green-600 mb-2">Direct to Charity</h4>
              <p className="text-gray-600">Delivered directly to verified charities through The Giving Block</p>
            </div>

            <div className="text-center bg-blue-50 rounded-2xl p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">$300,000</h3>
              <h4 className="text-lg font-semibold text-blue-600 mb-2">Community Rewards</h4>
              <p className="text-gray-600">Back to participating communities via Glo Dollar</p>
            </div>

            <div className="text-center bg-purple-50 rounded-2xl p-8">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">$200,000</h3>
              <h4 className="text-lg font-semibold text-purple-600 mb-2">Platform Development</h4>
              <p className="text-gray-600">Building better fundraising tools for everyone</p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust indicators */}
      <div className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-8">Trusted & Transparent</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <Shield className="w-12 h-12 text-indigo-600 mx-auto mb-2" />
                <div className="font-semibold text-gray-900">On-Chain Tracking</div>
              </div>
              <div className="text-center">
                <Globe className="w-12 h-12 text-green-600 mx-auto mb-2" />
                <div className="font-semibold text-gray-900">Glo Dollar Powered</div>
              </div>
              <div className="text-center">
                <DollarSign className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                <div className="font-semibold text-gray-900">Capped Fees (20%)</div>
              </div>
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-purple-600 mx-auto mb-2" />
                <div className="font-semibold text-gray-900">Full Documentation</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h2 className="text-4xl font-bold mb-6">Don't Miss the Biggest Web3 Impact Event</h2>
          <p className="text-xl mb-8 opacity-90">
            Campaign starts later in 2025. Early pledges get priority access and special recognition.
          </p>
          <button 
            onClick={scrollToTop}
            className="bg-white text-indigo-600 px-10 py-4 rounded-xl text-xl font-bold hover:bg-gray-100 transition-all duration-200 hover:scale-105 inline-flex items-center space-x-3"
          >
            <span>Pledge Your Community Now</span>
            <ArrowRight className="w-6 h-6" />
          </button>
          <p className="text-sm opacity-75 mt-4">
            Track our progress live at fundraisely.ie/whats-new
          </p>
        </div>
      </div>
    </div>
  );
};

export default FundraisingLaunchPage;

