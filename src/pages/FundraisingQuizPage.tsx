
// src/pages/FundraisingQuizPage.tsx - NEW: Only for hosting (requires auth)
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
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Use ref to prevent re-renders
  const renderCountRef = useRef(0);

  // Track render count
  renderCountRef.current += 1;
  debugLog('FundraisingQuizPage.', `Render #${renderCountRef.current}`, {
    showWizard,
  });

  // Handler for regular quiz wizard completion
  const handleWizardComplete = () => {
    debugLog('FundraisingQuizPage.', 'handleWizardComplete called');
    setShowWizard(false);
    navigate('/quiz/dashboard');
  };

  // Debug effect to track state changes
  useEffect(() => {
    debugLog('FundraisingQuizPage.', 'State changed', {
      showWizard,
    });
  }, [showWizard]);

  // If we came back from /auth with ?openWizard=1 AND we're now authenticated, open the wizard
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openWizard') && isAuthenticated) {
      setShowWizard(true);
      // Clean up the query so refresh doesn’t re-trigger
      navigate('/quiz', { replace: true });
    }
  }, [location.search, isAuthenticated, navigate]);

  const handleStartClick = () => {
    debugLog('FundraisingQuizPage', 'Host quiz button clicked');

    if (isAuthenticated) {
      setShowWizard(true);
      return;
    }

    // Not logged in: send to /auth with a returnTo that re-opens the wizard
    const returnTo = encodeURIComponent('/quiz?openWizard=1');
    navigate(`/auth?returnTo=${returnTo}`);
  };

  useEffect(() => {
    debugLog('FundraisingQuizPage', 'State changed', { showWizard, isAuthenticated });
  }, [showWizard, isAuthenticated]);

  return (
    <div className={showWizard ? "" : "mx-auto max-w-3xl p-8"}>
      {!showWizard && (
        <>
          <h1 className="mb-6 text-4xl font-bold">🎤 Host a Fundraising Quiz</h1>
          <p className="text-fg/80 mb-8">
            Create and manage your own fundraising quiz event. Perfect for clubs, charities, and community organizations looking to raise funds while having fun!
          </p>

          <div className="bg-muted mb-8 rounded-xl p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-semibold text-indigo-800">What you can do:</h2>
            <ul className="text-fg/80 space-y-3">
              <li className="flex items-start">
                <span className="mr-3 text-green-500">✓</span>
                <span>Create custom quiz rounds with different question types</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-500">✓</span>
                <span>Set entry fees and manage fundraising extras</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-500">✓</span>
                <span>Real-time host dashboard with player management</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-500">✓</span>
                <span>Automated scoring and leaderboards</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-green-500">✓</span>
                <span>Prize management and winner announcements</span>
              </li>
            </ul>
          </div>

          <div className="flex justify-center">
                  <button
              className="transform rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-indigo-700"
              onClick={handleStartClick} // 👈 gated start
            >
              🎤 Start Creating Your Quiz
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-fg/70 mb-4">
              Looking for Web3 fundraising or want to join an existing quiz?
            </p>
            <button
              onClick={() => navigate('/web3-fundraising-quiz')}
              className="font-medium text-indigo-600 underline hover:text-indigo-800"
            >
              Check out our Web3 Fundraising Options →
            </button>
          </div>
        </>
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