// src/App.tsx - MINIMAL TEST VERSION
import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Header } from './components/GeneralSite/Header';
import { PitchDeckContent } from './pages/PitchDeckContent';
import ErrorBoundary from './components/bingo/ErrorBoundary';
import QuizRoutes from './components/Quiz/QuizRoutes';
import { QuizSocketProvider } from './components/Quiz/sockets/QuizSocketProvider';
import WhatsNew from './pages/WhatsNew';

// TEMPORARILY REMOVE ALL WEB3 ROUTES FOR TESTING

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

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {showHeader && <Header />}
        <main className={showHeader ? 'pt-16' : ''}>
          <Routes>
            {/* ⚡ ONLY FAST ROUTES - NO WEB3 */}
            <Route path="/" element={<Landing />} />
            <Route path="/pitch-deck-content" element={<PitchDeckContent />} />
            <Route path="/whats-new" element={<WhatsNew />} />

            {/* Quiz routes - NO Web3 needed */}
            <Route path="/quiz/*" element={
              <QuizSocketProvider>
                <QuizRoutes />
              </QuizSocketProvider>
            } />

            {/* Temporary placeholder for Web3 routes */}
            <Route path="/game/:roomId" element={
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Game Feature</h1>
                <p>Temporarily disabled for performance testing</p>
              </div>
            } />
            
            <Route path="/BingoBlitz" element={
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Bingo Blitz</h1>
                <p>Temporarily disabled for performance testing</p>
              </div>
            } />

            <Route path="/pitch-deck" element={
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Pitch Deck</h1>
                <p>Temporarily disabled for performance testing</p>
              </div>
            } />
            
            <Route path="/Web3-Impact-Event" element={
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Web3 Impact Event</h1>
                <p>Temporarily disabled for performance testing</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  );
}

