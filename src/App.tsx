import { useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Game } from './pages/Game';
import { TestCampaign } from './pages/TestCampaign';
import { Header } from './components/GeneralSite/Header';
import { PitchDeck } from './pages/PitchDeck';
import { PitchDeckContent } from './pages/PitchDeckContent';
import { ActionButtonList } from './components/ActionButtonList';
import { InfoList } from './components/InfoList';
import ErrorBoundary from './components/bingo/ErrorBoundary';
// import SocketDebugPanel from './components/Quiz/SocketDebugPanel';
import QuizRoutes from './components/Quiz/QuizRoutes';
import { QuizSocketProvider } from './components/Quiz/sockets/QuizSocketProvider';
import WhatsNew from './pages/WhatsNew';
import FundraisingLaunchPage from './pages/web3fundraiser';

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
  const showAppKit = location.pathname === '/pitch-deck';

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {showHeader && <Header />}
        <main className={showHeader ? 'pt-16' : ''}>
          {showAppKit && (
            <div className="appkit-container p-4 bg-white rounded shadow my-4 max-w-3xl mx-auto">
              <h2 className="text-xl font-bold mb-4">Wallet Connection</h2>
              {/* Fixed: Use the proper React component or add required props */}
              <appkit-button 
                label="Connect Wallet"
                size="md"
                loading-label="Connecting..."
                disabled="false"
                balance="show"
              />
              <ActionButtonList />
              <InfoList />
            </div>
          )}

          <Routes>
            {/* Bingo & non-quiz routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/game/:roomId" element={<Game />} />
            <Route path="/pitch-deck" element={<PitchDeck />} />
            <Route path="/pitch-deck-content" element={<PitchDeckContent />} />
            <Route path="/BingoBlitz" element={<TestCampaign />} />

            <Route path="/whats-new" element={<WhatsNew />} />
            <Route path="/Web3-Impact-Event" element={<FundraisingLaunchPage />} />

            {/* Quiz routes with socket provider */}
            <Route path="/quiz/*" element={
              <QuizSocketProvider>
                {/* <SocketDebugPanel /> */}
                <QuizRoutes />
              </QuizSocketProvider>
            } />
          </Routes>
        </main>
      </div>
    </ErrorBoundary>
  );
}

