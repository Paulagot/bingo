// src/App.tsx - Performance optimized with lazy loading
import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Header } from './components/GeneralSite/Header';
import { PitchDeckContent } from './pages/PitchDeckContent';
import ErrorBoundary from './components/bingo/ErrorBoundary';
import WhatsNew from './pages/WhatsNew';

// Lazy load Quiz components to keep them out of main bundle
const QuizRoutes = lazy(() => import('./components/Quiz/QuizRoutes'));
const QuizSocketProvider = lazy(() => import('./components/Quiz/sockets/QuizSocketProvider').then(m => ({ default: m.QuizSocketProvider })));

// Loading component for better UX
const LoadingSpinner = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">{message}</p>
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

  const showHeader = location.pathname !== '/pitch-deck-content' && location.pathname !== '/BingoBlitz';

  // Temporary disabled message component
  const DisabledFeature = ({ title, emoji }: { title: string; emoji: string }) => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
      <div className="text-center max-w-md mx-auto">
        <div className="text-6xl mb-4">{emoji}</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 font-medium mb-2">🚧 Temporarily Optimizing Performance</p>
          <p className="text-yellow-700 text-sm">
            We've temporarily disabled Web3 features while optimizing for mobile performance. 
            This feature will return soon with lightning-fast loading!
          </p>
        </div>
        <div className="space-y-3">
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
          >
            ← Back to Home
          </button>
          <button 
            onClick={() => navigate('/quiz')}
            className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Try Our Quiz Platform
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {showHeader && <Header />}
        <main className={showHeader ? 'pt-16' : ''}>
          <Routes>
            {/* ⚡ ULTRA-FAST ROUTES - Zero Web3, minimal bundles */}
            <Route path="/" element={<Landing />} />
            <Route path="/pitch-deck-content" element={<PitchDeckContent />} />
            <Route path="/whats-new" element={<WhatsNew />} />

            {/* 🎮 Quiz routes - Lazy loaded to keep main bundle small */}
            <Route path="/quiz/*" element={
              <Suspense fallback={<LoadingSpinner message="Loading quiz platform..." />}>
                <QuizSocketProvider>
                  <QuizRoutes />
                </QuizSocketProvider>
              </Suspense>
            } />

            {/* 🔒 TEMPORARILY DISABLED Web3 routes for performance optimization */}
            <Route path="/game/:roomId" element={
              <DisabledFeature title="Bingo Game" emoji="🎲" />
            } />
            
            <Route path="/BingoBlitz" element={
              <DisabledFeature title="Bingo Blitz Campaign" emoji="⚡" />
            } />

            <Route path="/pitch-deck" element={
              <DisabledFeature title="Investor Pitch Deck" emoji="📊" />
            } />
            
            <Route path="/Web3-Impact-Event" element={
              <DisabledFeature title="Web3 Impact Event" emoji="🌍" />
            } />

            {/* Catch-all route */}
            <Route path="*" element={
              <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                  <button 
                    onClick={() => navigate('/')}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                  >
                    Go Home
                  </button>
                </div>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  );
}

