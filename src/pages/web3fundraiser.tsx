import React, { useState } from 'react';
import { Globe, Heart, Users, DollarSign, CheckCircle, ArrowRight, Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';

const FundraisingLaunchPage: React.FC = () => {
  const [communityName, setCommunityName] = useState('');
  const [contactMethod, setContactMethod] = useState('Email');
  const [contactInfo, setContactInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      // Use the same pattern as your quiz API
      const apiUrl = window.location.hostname === 'localhost' 
        ? 'http://localhost:3001' 
        : 'https://bingo-production-4534.up.railway.app';
      
      const fullUrl = `${apiUrl}/quiz/api/community-registration`;
      console.log('🚀 Submitting to:', fullUrl);
      console.log('📝 Data being sent:', { communityName, contactMethod, contactInfo });
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          communityName,
          contactMethod,
          contactInfo
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
        setContactMethod('Email');
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

  const Character = ({ expression, message }: { expression: string; message: React.ReactNode }) => {
    const getCharacterStyle = () => {
      const base = "w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all duration-300";
      switch (expression) {
        case "excited": return `${base} bg-gradient-to-br from-green-400 to-emerald-500 animate-bounce`;
        case "impact": return `${base} bg-gradient-to-br from-purple-400 to-pink-500 animate-pulse`;
        default: return `${base} bg-gradient-to-br from-indigo-400 to-purple-500`;
      }
    };

    const getEmoji = () => {
      switch (expression) {
        case "excited": return "🚀";
        case "impact": return "💝";
        default: return "🌍";
      }
    };

    return (
      <div className="flex items-start space-x-4 mb-8">
        <div className={getCharacterStyle()}>{getEmoji()}</div>
        <div className="relative bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200 max-w-2xl">
          <div className="absolute left-0 top-8 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent transform -translate-x-2"></div>
          <div className="absolute left-0 top-8 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-gray-200 border-b-8 border-b-transparent transform -translate-x-1"></div>
          <p className="text-gray-700 text-lg leading-relaxed">{message}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-12">
          
          {/* NEW: Bigger, bolder headline */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center space-x-3 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-6 py-3 rounded-full text-lg font-semibold shadow-md">
              <Sparkles className="w-6 h-6" />
              <span className="text-2xl md:text-3xl font-extrabold">
                The World's First Multichain Regenerative Fundraiser
              </span>
            </div>
          </div>

          {/* First Character */}
          <Character 
            expression="impact" 
            message={
              <>
                Fundraising is hard, both for small charities and for teams building tech to support them. To address this, we've developed a unique approach we call <strong>Regenerative Fundraising</strong>.
              </>
            }
          />

          {/* Second Character - aligned right */}
          <div className="flex justify-end">
            <Character 
              expression="none" 
              message={
                <>
                  <strong>Regenerative Fundraising</strong> allows Web3 communities to host community building fundraising events where most funds go directly to charity, while a small portion helps fund the ongoing development of tools for global good.
                </>
              }
            />
          </div>

          {/* Third Character - aligned left */}
          <div className="flex justify-start">
            <Character 
              expression="excited" 
              message={
                <>
                  And so we have launched the <strong>Web3 Impact Event</strong> and we hope to become the largest Web3 fundraising event ever.  Powered by <strong>Glo Dollar</strong> and <strong>The Giving Block</strong>.
                </>
              }
            />
          </div>

          {/* Your existing CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <a 
              href="#register" 
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
            >
              <span>Pledge to Host a Quiz Night</span>
              <ArrowRight className="w-5 h-5" />
            </a>
            <a 
              href="#how-it-works" 
              className="inline-flex items-center space-x-2 bg-white text-indigo-600 px-8 py-4 rounded-xl text-lg font-semibold border-2 border-indigo-200 hover:border-indigo-300 transition-all duration-200"
            >
              <span>Learn How It Works</span>
            </a>
          </div>

        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Heart className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">50%+</div>
              <div className="text-gray-900 font-medium mb-1">Direct Impact</div>
              <div className="text-sm text-gray-600">Always to charity</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">30%</div>
              <div className="text-gray-900 font-medium mb-1">Community Controlled</div>
              <div className="text-sm text-gray-600">Hosts decide: prizes, community funds, or more charity</div>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">20%</div>
              <div className="text-gray-900 font-medium mb-1">Tech for Good</div>
              <div className="text-sm text-gray-600">Building more tools for global impact</div>
            </div>
          </div>
        </div>
      </div>

      {/* Why Join Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Get Involved</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Join the movement to make fundraising transparent, impactful, and community-driven</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: <Heart className="w-8 h-8" />,
              title: "Real-World Impact",
              description: "Build community engagement while creating meaningful change in the world",
              color: "from-red-400 to-pink-500"
            },
            {
              icon: <Globe className="w-8 h-8" />,
              title: "Regenerative Finance",
              description: "Powered by Glo Dollar for double impact - fundraising that helps the planet",
              color: "from-green-400 to-emerald-500"
            },
            {
              icon: <Users className="w-8 h-8" />,
              title: "Multichain Support",
              description: "Bring your DAO, NFT community, or Web3 project - lots of chains supported",
              color: "from-blue-400 to-indigo-500"
            },
            {
              icon: <TrendingUp className="w-8 h-8" />,
              title: "Community Leaderboard",
              description: "Compete for top fundraising spots and gain recognition for your impact",
              color: "from-purple-400 to-pink-500"
            },
            {
              icon: <Sparkles className="w-8 h-8" />,
              title: "Media Opportunities",
              description: "PR and media coverage for leading communities making a difference",
              color: "from-yellow-400 to-orange-500"
            },
            {
              icon: <Shield className="w-8 h-8" />,
              title: "100% Transparent",
              description: "All funds tracked on-chain with complete transparency and accountability",
              color: "from-indigo-400 to-purple-500"
            }
          ].map((benefit, index) => (
            <div key={index} className="bg-white rounded-2xl p-5 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className={`w-14 h-14 bg-gradient-to-br ${benefit.color} rounded-xl flex items-center justify-center text-white mb-3`}>
                {benefit.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{benefit.title}</h3>
              <p className="text-gray-600">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works Section */}
      <div id="how-it-works" className="bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Simple, transparent, impactful</p>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center space-x-4 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
                <h3 className="text-xl font-semibold text-gray-900">Campaign Period</h3>
              </div>
              <p className="text-gray-600">Events will run for 6 months from later 2025 into 2026.  Communities are invited to pre-register now, and we will be intouch to show you around the demo</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center space-x-4 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
                <h3 className="text-xl font-semibold text-gray-900">Host Events</h3>
              </div>
              <p className="text-gray-600">Web3 communities love events so just host a quiz night, powered by the FundRaisely platform.  Quiz night are a graat way to have fun and engage with your community and can be hosted on X, Discord, Google Meets, Zoom or anywhere you hang out, even in person. </p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">3</div>
                <h3 className="text-xl font-semibold text-gray-900">Flexible Fund Distribution</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600 mb-1">50%+</div>
                  <div className="text-xs text-green-700 font-medium">Direct Impact</div>
                  <div className="text-xs text-green-600">Always to charity</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-blue-600 mb-1">30%</div>
                  <div className="text-xs text-blue-700 font-medium">Community Controlled</div>
                  <div className="text-xs text-blue-600">Hosts decide allocation</div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-purple-600 mb-1">20%</div>
                  <div className="text-xs text-purple-700 font-medium">Tech for Good</div>
                  <div className="text-xs text-purple-600">Platform development</div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-3">Hosts can allocate their 30% between prizes, community funds, or donate it all back to charity for maximum impact.</p>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <div className="flex items-center space-x-4 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">4</div>
                <h3 className="text-xl font-semibold text-gray-900">Multichain Support</h3>
              </div>
              <p className="text-gray-600">Available on Solana and any blockchain that supports Glo Dollar, starting with Stellar then Polygon, Celo, Base, Arbitrum & Optimism and Vechain.  </p>
            </div>
          </div>
        </div>
      </div>

      {/* Target & Impact Section */}
<div className="max-w-7xl mx-auto px-4 py-16">
  <div className="text-center mb-12">
    <h2 className="text-4xl font-bold text-gray-900 mb-4">Target & Impact</h2>
    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
      Our mission is to build the world's first fully transparent, multichain fundraising platform, built to empower Clubs, Charities and Communities. All While hosting the largest Web3 Regenerative fundraising event ever
    </p>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <DollarSign className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Fundraising Goal</h3>
      <p className="text-gray-900 text-2xl font-bold mb-1">$1,000,000</p>
      <p className="text-gray-600 text-sm">Total campaign target</p>
    </div>

    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <Heart className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Direct to Charity</h3>
      <p className="text-gray-900 text-2xl font-bold mb-1">$500,000+</p>
      <p className="text-gray-600 text-sm">Delivered directly to charities & non-profits powered by The Giving Block</p>
    </div>

    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Community Rewards</h3>
      <p className="text-gray-900 text-2xl font-bold mb-1">Up to $300,000</p>
      <p className="text-gray-600 text-sm">Flowing back to Web3 communities, hosts, and participants, powered by Glo Dollar</p>
    </div>

    <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200 text-center">
      <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
        <Zap className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Platform Development</h3>
      <p className="text-gray-900 text-2xl font-bold mb-1">$200,000</p>
      <p className="text-gray-600 text-sm">Reinvested into FundRaisely to build fundraising tools for clubs, charities, and communities</p>
    </div>
  </div>

  <div className="text-center mt-10">
    <p className="text-gray-700 text-lg">
      💡 You can track our live progress anytime at{' '}
      <a href="https://fundraisely.ie/whats-new" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-semibold underline">
        fundraisely.ie/whats-new
      </a>.
    </p>
  </div>
</div>

      {/* Who Can Register Section */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Who Can Register</h2>
        </div>

        <div className="flex justify-center">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200 max-w-2xl">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Web3 Communities Welcome</h3>
                <p className="text-blue-700 text-lg">Any community building in the decentralized future</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">DAOs & Governance Communities</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">NFT Projects & Collections</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">DeFi Protocols & Projects</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Gaming & Metaverse Communities</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Token & Memecoin Communities</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Developer & Builder Communities</span>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
              <p className="text-gray-700 text-center">
                <strong>Got an active Web3 community?</strong> You're exactly who we're looking for! 
                Whether you're on Discord, Telegram, X, or anywhere else - if you can bring people together for a quiz night, you can make an impact.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Registration Forms */}
      <div id="register" className="bg-gradient-to-br from-indigo-50 to-purple-50">
        <div className="max-w-4xl mx-auto px-4 py-16">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Commit to Making an Impact</h2>
            <Character 
              expression="excited" 
              message="Ready to pledge your community to host a quiz night for global good? Join the movement and commit to making a real difference during our 6-month campaign!" 
            />
          </div>

               {/* Form */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-gray-900">Host Pledge & Movement Registration</h3>
                  <p className="text-gray-600">Commit to hosting a quiz night during our campaign period. Pledge your community's participation in the world's largest Web3 regenerative fundraising event.</p>
                </div>
              </div>

              {submitMessage && (
                <div className={`mb-6 p-4 rounded-lg ${
                  submitMessage.includes('✅') 
                    ? 'bg-green-50 border border-green-200 text-green-700' 
                    : 'bg-red-50 border border-red-200 text-red-700'
                }`}>
                  {submitMessage}
                </div>
              )}

              {/* Pledge Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Your Pledge Includes:</h4>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Host at least one quiz night during the 6-month campaign</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Engage your community in regenerative fundraising</span>
                  </li>
                  <li className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>Be part of the world's largest Web3 impact event</span>
                  </li>
                </ul>
              </div>

              <form onSubmit={handleCommunitySubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Community Name</label>
                  <input
                    type="text"
                    value={communityName}
                    onChange={(e) => setCommunityName(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your community name"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Contact Method</label>
                  <select
                    value={contactMethod}
                    onChange={(e) => setContactMethod(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    disabled={isSubmitting}
                  >
                    <option>Email</option>
                    <option>Telegram</option>
                    <option>X (Twitter)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Info</label>
                  <input
                    type="text"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Your contact information"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-4 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isSubmitting ? 'Submitting...' : 'Make Your Pledge'}</span>
                  {!isSubmitting && <ArrowRight className="w-5 h-5" />}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>


      {/* Trust & Transparency Section */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Full Transparency</h2>
            <p className="text-xl text-gray-600">Building trust through radical transparency</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Globe className="w-8 h-8" />,
                title: "On-Chain Tracking",
                description: "Every transaction visible and verifiable on the blockchain"
              },
              {
                icon: <DollarSign className="w-8 h-8" />,
                title: "Glo Dollar Powered",
                description: "Using regenerative stablecoin for double impact"
              },
              {
                icon: <Shield className="w-8 h-8" />,
                title: "Capped Platform Fee",
                description: "Maximum 20% for sustainable platform development"
              },
              {
                icon: <Zap className="w-8 h-8" />,
                title: "Transparency First",
                description: "Pitch deck and documentation available on request"
              }
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <div className="text-indigo-600">{item.icon}</div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-indigo-900 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <h3 className="text-2xl font-bold mb-4">FundRaisely</h3>
          <p className="text-indigo-200 text-lg mb-4">
            Building a fully transparent, multichain fundraising platform for social impact.
          </p>
          <p className="text-indigo-300 text-sm">
            Platform revenue flows are capped at 20%. Pitch deck available on request.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FundraisingLaunchPage;

