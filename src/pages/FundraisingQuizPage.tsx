import { useState, useRef, useEffect } from 'react';
import QuizWizard from '../components/Quiz/Wizard/QuizWizard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../stores/authStore';



// ✅ Debug toggle - set to false for production
const DEBUG = false;

const debugLog = (source: string, message: string, data?: any) => {
  if (DEBUG) {
    console.log(`🐛 [${source}] ${message}`, data ? data : '');
  }
};

const FundraisingQuizPage = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [isGifFullscreen, setIsGifFullscreen] = useState(false);
  const [fullscreenGif, setFullscreenGif] = useState<'setup' | 'dashboard' | 'ingame' | 'reporting' | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  debugLog('FundraisingQuizPage', `Render #${renderCountRef.current}`, { showWizard });

  const handleWizardComplete = () => {
    debugLog('FundraisingQuizPage', 'handleWizardComplete called');
    setShowWizard(false);
    navigate('/quiz/dashboard');
  };

  useEffect(() => {
    debugLog('FundraisingQuizPage', 'State changed', { showWizard });
  }, [showWizard]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openWizard') && isAuthenticated) {
      setShowWizard(true);
      navigate('/quiz');
    }
  }, [isAuthenticated, navigate]);

  const handleStartClick = () => {
    debugLog('FundraisingQuizPage', 'Host quiz button clicked');
    
    if (isAuthenticated) {
      setShowWizard(true);
      return;
    }
    
    const returnTo = encodeURIComponent('/quiz?openWizard=1');
    navigate(`/auth?returnTo=${returnTo}`);
  };

  useEffect(() => {
    debugLog('FundraisingQuizPage', 'State changed', { showWizard, isAuthenticated });
  }, [showWizard, isAuthenticated]);

  return (
    <div className={showWizard ? "" : "mx-auto max-w-7xl p-8"}>
      {!showWizard && (
        <div className="space-y-16">
          {/* Row 1: Hero Section - Header, Subheader, and CTA */}
          <div className="text-center space-y-6 py-8">
            <div className="inline-block rounded-full bg-indigo-100 px-4 py-1 text-sm font-semibold text-indigo-700">
              ⚡ Quick Setup
            </div>
            
            <h1 className="text-5xl font-bold leading-tight">
              Launch Your Fundraising Quiz in{' '}
              <span className="text-indigo-600">4 Simple Steps</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Create a professional quiz night in under 1 minute. Perfect for clubs, charities, and community organizations.
            </p>

            <div className="pt-4">
              <button
                className="group relative overflow-hidden rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-200 hover:bg-indigo-700 hover:shadow-xl"
                onClick={handleStartClick}
              >
                <span className="relative z-10 flex items-center gap-2">
                  🎤 Start Creating Your Quiz
                  <svg 
                    className="h-5 w-5 transition-transform group-hover:translate-x-1" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M13 7l5 5m0 0l-5 5m5-5H6" 
                    />
                  </svg>
                </span>
              </button>
              
              <p className="mt-3 text-sm text-gray-500">
                No credit card required • Free to get started
              </p>
            </div>
          </div>

          {/* Row 2: Setup Wizard Section */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Left: Setup Steps */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">
                Setup Wizard
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Set Basic Details</h3>
                    <p className="text-gray-600">Add your name and quiz entry fee</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Configure Rounds</h3>
                    <p className="text-gray-600">Select a preconfigured quiz or customise your own</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Select Fundraising Extras</h3>
                    <p className="text-gray-600">Boost your fundraising and increase game excitement and fun</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Add Prizes and Sponsors</h3>
                    <p className="text-gray-600">Add up to 10 prizes and highlight sponsors</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Setup GIF */}
            <div className="relative">
              <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 shadow-2xl max-h-[700px] group">
                <img
                  src="/quiz-setup-demo.gif"
                  alt="Quiz setup walkthrough - 4 easy steps"
                  className="h-full w-full object-contain"
                />
                
                <button
                  onClick={() => setFullscreenGif('setup')}
                  className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  aria-label="View fullscreen"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
              
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-yellow-400 opacity-20 blur-2xl"></div>
              <div className="absolute -top-4 -left-4 h-32 w-32 rounded-full bg-indigo-400 opacity-20 blur-2xl"></div>
            </div>
          </div>

          {/* Row 3: Dashboard View Section */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Left: Dashboard GIF */}
            <div className="relative">
              <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 shadow-2xl max-h-[700px] group">
                {/* Placeholder for dashboard GIF - replace with actual GIF when ready */}
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                  <div className="text-center space-y-4 p-8">
                    <div className="text-6xl">📊</div>
                    <p className="text-lg text-gray-600 font-medium">Dashboard Demo Coming Soon</p>
                    <p className="text-sm text-gray-500">Replace with /quiz-dashboard-demo.gif</p>
                  </div>
                </div>
                {/* Uncomment when GIF is ready:
                <img
                  src="/quiz-dashboard-demo.gif"
                  alt="Quiz dashboard overview"
                  className="h-full w-full object-contain"
                />
                */}
                
                <button
                  onClick={() => setFullscreenGif('dashboard')}
                  className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  aria-label="View fullscreen"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
              
              <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-purple-400 opacity-20 blur-2xl"></div>
              <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-pink-400 opacity-20 blur-2xl"></div>
            </div>

            {/* Right: Dashboard Steps */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">
                Dashboard View
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Monitor Live Participation</h3>
                    <p className="text-gray-600">Track teams joining and real-time engagement metrics</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Control Quiz Flow</h3>
                    <p className="text-gray-600">Start rounds, manage timing, and control the quiz pace</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">View Leaderboards</h3>
                    <p className="text-gray-600">Display live standings and celebrate top performers</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Track Fundraising</h3>
                    <p className="text-gray-600">See total raised, process payments, and manage prizes</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Row 4: In-Game View Section */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Left: In-Game Steps */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">
                In-Game View
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Submit Answers in Real-Time</h3>
                    <p className="text-gray-600">Teams answer questions as they're presented</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">See Live Standings</h3>
                    <p className="text-gray-600">Watch your team's position update after each round</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Participate in Extras</h3>
                    <p className="text-gray-600">Join fundraising games like raffle draws and auctions</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Team Collaboration</h3>
                    <p className="text-gray-600">Discuss answers and strategize with your teammates</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: In-Game GIF */}
            <div className="relative">
              <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 shadow-2xl max-h-[700px] group">
                {/* Placeholder for in-game GIF - replace with actual GIF when ready */}
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                  <div className="text-center space-y-4 p-8">
                    <div className="text-6xl">🎮</div>
                    <p className="text-lg text-gray-600 font-medium">In-Game Demo Coming Soon</p>
                    <p className="text-sm text-gray-500">Replace with /quiz-ingame-demo.gif</p>
                  </div>
                </div>
                {/* Uncomment when GIF is ready:
                <img
                  src="/quiz-ingame-demo.gif"
                  alt="In-game player view"
                  className="h-full w-full object-contain"
                />
                */}
                
                <button
                  onClick={() => setFullscreenGif('ingame')}
                  className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  aria-label="View fullscreen"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
              
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-emerald-400 opacity-20 blur-2xl"></div>
              <div className="absolute -top-4 -left-4 h-32 w-32 rounded-full bg-teal-400 opacity-20 blur-2xl"></div>
            </div>
          </div>

          {/* Row 5: End of Game Reporting Section */}
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
            {/* Left: Reporting GIF */}
            <div className="relative">
              <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 shadow-2xl max-h-[700px] group">
                {/* Placeholder for reporting GIF - replace with actual GIF when ready */}
                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                  <div className="text-center space-y-4 p-8">
                    <div className="text-6xl">📈</div>
                    <p className="text-lg text-gray-600 font-medium">Reporting Demo Coming Soon</p>
                    <p className="text-sm text-gray-500">Replace with /quiz-reporting-demo.gif</p>
                  </div>
                </div>
                {/* Uncomment when GIF is ready:
                <img
                  src="/quiz-reporting-demo.gif"
                  alt="End of game reporting and analytics"
                  className="h-full w-full object-contain"
                />
                */}
                
                <button
                  onClick={() => setFullscreenGif('reporting')}
                  className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                  aria-label="View fullscreen"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </button>
              </div>
              
              <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-amber-400 opacity-20 blur-2xl"></div>
              <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-orange-400 opacity-20 blur-2xl"></div>
            </div>

            {/* Right: Reporting Steps */}
            <div className="space-y-6">
              <h2 className="text-3xl font-bold text-gray-900">
                End of Game Reporting
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Final Results & Winners</h3>
                    <p className="text-gray-600">View complete leaderboard and announce prize winners</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Fundraising Summary</h3>
                    <p className="text-gray-600">See total funds raised, breakdown by source, and payment status</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Engagement Analytics</h3>
                    <p className="text-gray-600">Review participation stats, round performance, and team insights</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">Export & Share</h3>
                    <p className="text-gray-600">Download reports and share results with stakeholders</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen GIF Modal */}
      {fullscreenGif && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
          onClick={() => setFullscreenGif(null)}
        >
          <button
            onClick={() => setFullscreenGif(null)}
            className="absolute top-4 right-4 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close fullscreen"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {fullscreenGif === 'setup' ? (
            <img
              src="/quiz-setup-demo.gif"
              alt="Quiz setup walkthrough - fullscreen view"
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : fullscreenGif === 'dashboard' ? (
            <div className="max-h-[90vh] max-w-[90vw] bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Dashboard GIF placeholder</p>
            </div>
          ) : fullscreenGif === 'ingame' ? (
            <div className="max-h-[90vh] max-w-[90vw] bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">In-Game GIF placeholder</p>
            </div>
          ) : (
            <div className="max-h-[90vh] max-w-[90vw] bg-white rounded-lg p-8 text-center">
              <p className="text-gray-600">Reporting GIF placeholder</p>
            </div>
          )}
        </div>
      )}

      {/* Debug info */}
      {DEBUG && (
        <div className="fixed right-4 top-4 z-50 max-w-xs rounded bg-black p-2 font-mono text-xs text-white">
          <div>Host Page Render: #{renderCountRef.current}</div>
          <div>Wizard: {showWizard ? 'open' : 'closed'}</div>
        </div>
      )}

      {/* Quiz Wizard */}
      {showWizard && (
        <QuizWizard onComplete={handleWizardComplete} />
      )}
    </div>
  );
};

export default FundraisingQuizPage;