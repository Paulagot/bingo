// src/App.tsx
import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

import { Landing } from './pages/Landing';
import { Header } from './components/GeneralSite/Header';
import ErrorBoundary from './components/bingo/ErrorBoundary';
import WhatsNew from './pages/WhatsNew';
import FreeTrial from './pages/FreeTrial';
import FundraisingQuizPage from './pages/FundraisingQuizPage';
import Pricing from './pages/PricingPage';
import TestimonialsPage from './pages/TestimonialsPage';
import ConfirmPasswordReset from './components/auth/ConfirmPasswordReset';
import RequestPasswordReset from './components/auth/RequestPasswordReset';
import ContactForm from './components/GeneralSite/ContactForm';

import { useAuthStore } from './stores/authStore';
import AuthPage from './components/auth/AuthPage';
import Login from './pages/Login';
import Signup from './pages/Signup';

// ⬇️ REMOVE these static imports (they pulled web3 into the main bundle)
// import Web3FundraisingQuizPage from './pages/Web3FundraisingQuizPage';
// import { Web3Provider } from './components/Web3Provider';

// Lazy quiz bits
const QuizRoutes = lazy(() => import('./components/Quiz/QuizRoutes'));
const QuizSocketProvider = lazy(() =>
  import('./components/Quiz/sockets/QuizSocketProvider').then((m) => ({ default: m.QuizSocketProvider }))
);

// ✅ Lazy web3 pieces (so they don’t hit the marketing bundle)
const Web3FundraisingQuizPage = lazy(() => import('./pages/Web3FundraisingQuizPage'));
const Web3ProviderLazy = lazy(() => import('./components/Web3Provider').then(m => ({ default: m.Web3Provider })));
const FundraisingLaunchPage = lazy(() => import('./pages/web3fundraiser'));

const LoadingSpinner = ({
  message = 'Loading...',
  subMessage,
}: {
  message?: string;
  subMessage?: string;
}) => (
  <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="mx-auto max-w-md p-6 text-center">
      <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      <h2 className="heading-2">{message}</h2>
      {subMessage && <p className="text-fg/70 text-sm">{subMessage}</p>}
    </div>
  </div>
);

// Only the live game routes should be socket-enabled
const isGameRoute = (pathname: string) =>
  /^\/quiz\/(game|play|host-dashboard|host-controls|join|admin-join)\b/.test(pathname);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGameRoute(location.pathname)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [location]);

  const { pathname } = location;
  const hideOnPaths = ['/pitch-deck-content', '/BingoBlitz'];
  const hideOnPrefixes = ['/quiz/game', '/quiz/play', '/quiz/host-dashboard', '/quiz/host-controls'];
  const showHeader =
    !hideOnPaths.includes(pathname) &&
    !hideOnPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));

  const initialize = useAuthStore((state) => state.initialize);
  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {showHeader && <Header />}
        <main className={showHeader ? 'pt-16' : ''}>
          <Routes>
            {/* Public marketing routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/whats-new" element={<WhatsNew />} />
            <Route path="/free-trial" element={<FreeTrial />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/testimonials" element={<TestimonialsPage />} />
            <Route path="/about" element={<div>About Page (TODO)</div>} />
            <Route path="/blog" element={<div>Blog / Resources (TODO)</div>} />
            <Route path="/contact" element={<ContactForm />} />
            <Route path="/legal/privacy" element={<div>Privacy Policy (TODO)</div>} />
            <Route path="/legal/terms" element={<div>Terms of Service (TODO)</div>} />
            <Route path="/legal/compliance" element={<div>Compliance Info (TODO)</div>} />
           



            {/* Auth routes */}
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/reset-password" element={<ConfirmPasswordReset />} />
            <Route path="/forgot-password" element={<RequestPasswordReset />} />

            {/* Create quiz (sockets only here) */}
            <Route
              path="/quiz/create-fundraising-quiz"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Quiz Platform" />}>
                  <QuizSocketProvider>
                    <FundraisingQuizPage />
                  </QuizSocketProvider>
                </Suspense>
              }
            />

            {/* Redirect base /quiz */}
            <Route path="/quiz" element={<Navigate to="/quiz/create-fundraising-quiz" replace />} />

            {/* Other /quiz/* routes – sockets only for live game routes */}
            <Route
              path="/quiz/*"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Quiz Platform" />}>
                  {isGameRoute(location.pathname) ? (
                    <QuizSocketProvider>
                      <QuizRoutes />
                    </QuizSocketProvider>
                  ) : (
                    <QuizRoutes />
                  )}
                </Suspense>
              }
            />

            {/* Web3 Fundraising Quiz landing */}
            <Route
              path="/web3-fundraising-quiz"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3" />}>
                  <Web3FundraisingQuizPage />
                </Suspense>
              }
            />

            {/* Web3 Impact Event (two aliases) */}
            <Route
              path="/Web3-Impact-Event"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3 Impact Event" subMessage="Connecting blockchain features..." />}>
                  <Web3ProviderLazy>
                    <FundraisingLaunchPage />
                  </Web3ProviderLazy>
                </Suspense>
              }
            />
            <Route
              path="/web3-impact-event"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3 Impact Event" />}>
                  <Web3ProviderLazy>
                    <FundraisingLaunchPage />
                  </Web3ProviderLazy>
                </Suspense>
              }
            />

            {/* 404 */}
            <Route
              path="*"
              element={
                <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
                  <div className="text-center">
                    <h1 className="text-fg mb-4 text-2xl font-bold">Page Not Found</h1>
                    <p className="text-fg/70 mb-4">The page you're looking for doesn't exist.</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => navigate('/')}
                        className="block w-full rounded-lg bg-indigo-600 px-6 py-2 text-white transition-colors hover:bg-indigo-700"
                      >
                        Return Home
                      </button>
                      <button
                        onClick={() => navigate('/quiz/create-fundraising-quiz')}
                        className="block w-full rounded-lg bg-green-600 px-6 py-2 text-white transition-colors hover:bg-green-700"
                      >
                        Create a Fundraising Quiz
                      </button>
                    </div>
                    <div className="text-fg/60 mt-4 text-sm">
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






