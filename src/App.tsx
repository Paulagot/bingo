// src/App.tsx
import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Header } from './components/GeneralSite/Header';
import { PitchDeckContent } from './pages/PitchDeckContent';
import ErrorBoundary from './components/bingo/ErrorBoundary';
import WhatsNew from './pages/WhatsNew';

// Lazy quiz bits
const QuizRoutes = lazy(() => import('./components/Quiz/QuizRoutes'));
const QuizSocketProvider = lazy(() =>
  import('./components/Quiz/sockets/QuizSocketProvider').then(m => ({ default: m.QuizSocketProvider }))
);

// Web3 pages (direct imports are fine)
import { Web3Provider } from './components/Web3Provider';
import { Game } from './pages/Game';
import { TestCampaign } from './pages/TestCampaign';
import { PitchDeck } from './pages/PitchDeck';

// ✅ Lazy-load the Web3 fundraiser page directly (must export default from src/pages/web3fundraiser.tsx)
const FundraisingLaunchPage = lazy(() => import('./pages/web3fundraiser'));

const LoadingSpinner = ({
  message = 'Loading...',
  subMessage,
}: {
  message?: string;
  subMessage?: string;
}) => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto p-6">
      <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-6"></div>
      <h2 className="text-xl font-semibold text-gray-800 mb-2">{message}</h2>
      {subMessage && <p className="text-gray-600 text-sm">{subMessage}</p>}
    </div>
  </div>
);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (location.pathname.startsWith('/game/')) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location]);

  // Header visibility rules
  const { pathname } = location;
  const hideOnPaths = ['/pitch-deck-content', '/BingoBlitz'];
  const hideOnPrefixes = ['/quiz/game', '/quiz/play', '/quiz/host-dashboard', '/quiz/host-controls'];

  const showHeader =
    !hideOnPaths.includes(pathname) &&
    !hideOnPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {showHeader && <Header />}
        <main className={showHeader ? 'pt-16' : ''}>
          <Routes>
            {/* ⚡ Non-web3 routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/pitch-deck-content" element={<PitchDeckContent />} />
            <Route path="/whats-new" element={<WhatsNew />} />

            {/* 🎮 Quiz routes (lazy) */}
            <Route
              path="/quiz/*"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Quiz Platform" />}>
                  <QuizSocketProvider>
                    <QuizRoutes />
                  </QuizSocketProvider>
                </Suspense>
              }
            />

            {/* 🎲 Web3 routes */}
            <Route
              path="/game/:roomId"
              element={
                <Suspense
                  fallback={
                    <LoadingSpinner
                      message="Loading Bingo Game"
                      subMessage="Initializing Web3 and game features..."
                    />
                  }
                >
                  <Web3Provider>
                    <Game />
                  </Web3Provider>
                </Suspense>
              }
            />

            <Route
              path="/BingoBlitz"
              element={
                <Suspense
                  fallback={
                    <LoadingSpinner
                      message="Loading Bingo Blitz"
                      subMessage="Preparing campaign features..."
                    />
                  }
                >
                  <Web3Provider>
                    <TestCampaign />
                  </Web3Provider>
                </Suspense>
              }
            />

            <Route
              path="/pitch-deck"
              element={
                <Suspense
                  fallback={
                    <LoadingSpinner
                      message="Loading Pitch Deck"
                      subMessage="Preparing investor presentation..."
                    />
                  }
                >
                  <Web3Provider>
                    <PitchDeck />
                  </Web3Provider>
                </Suspense>
              }
            />

            {/* ✅ Web3 Impact Event (lazy page) */}
            <Route
              path="/Web3-Impact-Event"
              element={
                <Suspense
                  fallback={
                    <LoadingSpinner
                      message="Loading Web3 Impact Event"
                      subMessage="Connecting to blockchain features..."
                    />
                  }
                >
                  <Web3Provider>
                    <FundraisingLaunchPage />
                  </Web3Provider>
                </Suspense>
              }
            />

            {/* Alternate casing route */}
            <Route
              path="/Web3-impact-Event"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3 Impact Event" />}>
                  <Web3Provider>
                    <FundraisingLaunchPage />
                  </Web3Provider>
                </Suspense>
              }
            />

            {/* 404 */}
            <Route
              path="*"
              element={
                <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
                  <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                    <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => navigate('/')}
                        className="block w-full bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        Return Home
                      </button>
                      <button
                        onClick={() => navigate('/Web3-Impact-Event')}
                        className="block w-full bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 transition-colors"
                      >
                        Try Web3 Impact Event
                      </button>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">
                      <p>Looking for: {location.pathname}</p>
                    </div>
                  </div>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  );
}


