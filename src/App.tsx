// src/App.tsx - Updated with Web3Provider only for specific routes
import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Game } from './pages/Game';
import { TestCampaign } from './pages/TestCampaign';
import { Header } from './components/GeneralSite/Header';
import { PitchDeckContent } from './pages/PitchDeckContent';
import ErrorBoundary from './components/bingo/ErrorBoundary';
import QuizRoutes from './components/Quiz/QuizRoutes';
import { QuizSocketProvider } from './components/Quiz/sockets/QuizSocketProvider';
import WhatsNew from './pages/WhatsNew';

// Lazy load Web3-heavy components AND the Web3Provider

const FundraisingLaunchPage = lazy(() => import('./pages/web3fundraiser'));
const Web3Provider = lazy(() => import('./components/Web3Provider').then(m => ({ default: m.Web3Provider })));

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

  useEffect(() => {
    const handlePopState = () => {
      if (location.pathname.startsWith('/game/')) {
        if (window.confirm('Are you sure you want to leave the game? All progress will be lost.')) {
          navigate('/');
        } else {
          window.history.pushState(null, '', location.pathname);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigate, location]);

  const showHeader = location.pathname !== '/pitch-deck-content' && location.pathname !== '/BingoBlitz';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {showHeader && <Header />}
        <main className={showHeader ? 'pt-16' : ''}>
          <Routes>
            {/* ⚡ FAST routes - NO Web3 loaded */}
            <Route path="/" element={<Landing />} />
            <Route path="/pitch-deck-content" element={<PitchDeckContent />} />
            <Route path="/whats-new" element={<WhatsNew />} />

            {/* 🔗 Quiz routes - NO Web3 needed */}
            <Route path="/quiz/*" element={
              <QuizSocketProvider>
                <QuizRoutes />
              </QuizSocketProvider>
            } />

            {/* 🔥 Web3 routes - Only load Web3 when accessed */}
            <Route path="/game/:roomId" element={
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                  <p>Loading game features...</p>
                </div>
              }>
                <Web3Provider>
                  <Game />
                </Web3Provider>
              </Suspense>
            } />
            
            <Route path="/BingoBlitz" element={
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                  <p>Loading campaign features...</p>
                </div>
              }>
                <Web3Provider>
                  <TestCampaign />
                </Web3Provider>
              </Suspense>
            } />

        
            
            <Route path="/Web3-Impact-Event" element={
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-screen">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
                  <p>Loading Web3 fundraising features...</p>
                </div>
              }>
                <Web3Provider>
                  <FundraisingLaunchPage />
                </Web3Provider>
              </Suspense>
            } />
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  );
}

