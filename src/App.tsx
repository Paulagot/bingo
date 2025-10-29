// src/App.tsx
import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

import { Landing } from './pages/Landing';
import { Header } from './components/GeneralSite2/Header';
import ErrorBoundary from './components/bingo/ErrorBoundary';
import WhatsNew from './pages/WhatsNew';
import FreeTrial from './pages/FreeTrial';
import FundraisingQuizPage from './pages/FundraisingQuizPage';
import Pricing from './pages/PricingPage';
import TestimonialsPage from './pages/TestimonialsPage';
import ConfirmPasswordReset from './components/auth/ConfirmPasswordReset';
import RequestPasswordReset from './components/auth/RequestPasswordReset';
import ContactForm from './components/GeneralSite2/ContactForm';
import FoundingPartnersPage from './pages/FoundingPartners';

import { useAuthStore } from './stores/authStore';
import AuthPage from './components/auth/AuthPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Web3Features from './pages/web3/features';
import Web3Testimonials from './pages/web3/testimonials';
import Web3Partners from './pages/web3/partners';
import TermsOfUse from './pages/nonseo/terms';
import PrivacyPolicy from './pages/nonseo/privacy'
import AboutFundRaisely from './pages/nonseo/aboutus'
import BlogAndResources from './pages/blog';


// Lazy quiz bits
const QuizRoutes = lazy(() => import('./components/Quiz/QuizRoutes'));
const QuizSocketProvider = lazy(() =>
  import('./components/Quiz/sockets/QuizSocketProvider').then((m) => ({ default: m.QuizSocketProvider }))
);

// ✅ Lazy web3 pieces (kept light on the marketing bundle)

const Web3ProviderLazy = lazy(() =>
  import('./components/Web3Provider').then((m) => ({ default: m.Web3Provider }))
);

// NEW: Web3 hub + campaign
const Web3HubPage = lazy(() => import('./pages/web3')); // /web3/


// If/when these are ready, uncomment the imports and the routes below
const ImpactCampaignOverview = lazy(() => import('./pages/web3/impact-campaign'));
const ImpactCampaignJoin = lazy(() => import('./pages/web3/impact-campaign/join'));
const ImpactCampaignLeaderboard = lazy(() => import('./pages/web3/impact-campaign/leaderboard'));


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
            <Route path="/about" element={<AboutFundRaisely />} />
            <Route path="/blog" element={<BlogAndResources />} />
            <Route path="/contact" element={<ContactForm />} />
            <Route path="/legal/privacy" element={<PrivacyPolicy />} />
            <Route path="/legal/terms" element={<TermsOfUse />} />
            

            <Route path="/founding-partners" element={<FoundingPartnersPage />} />

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

            {/* WEB3 hub (evergreen) */}
            <Route
              path="/web3"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3" />}>
                  <Web3HubPage />
                </Suspense>
              }
            />
                 <Route
              path="/web3/features"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3" />}>
                  <Web3Features />
                </Suspense>
              }
            />
                    <Route
              path="/web3/testimonials"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3" />}>
                  <Web3Testimonials/>
                </Suspense>
              }
            />
                       <Route
              path="/web3/partners"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3" />}>
                  <Web3Partners/>
                </Suspense>
              }
            />

            {/* Impact Campaign (canonical). TEMP: using existing web3fundraiser page */}
            <Route
              path="/web3/impact-campaign"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Impact Campaign" />}>
                  <Web3ProviderLazy>
                    <ImpactCampaignOverview />
                  </Web3ProviderLazy>
                </Suspense>
              }
            />

            {/* OPTIONAL subpages (uncomment when ready) */}
            
            <Route
              path="/web3/impact-campaign/join"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Join" />}>
                  <Web3ProviderLazy>
                    <ImpactCampaignJoin />
                  </Web3ProviderLazy>
                </Suspense>
              }
            />
            <Route
              path="/web3/impact-campaign/leaderboard"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Leaderboard" />}>
                  <Web3ProviderLazy>
                    <ImpactCampaignLeaderboard />
                  </Web3ProviderLazy>
                </Suspense>
              }
            />
        
           

            {/* Legacy aliases → canonical (SPA-level; server also 301s) */}
            <Route path="/Web3-Impact-Event" element={<Navigate to="/web3/impact-campaign" replace />} />
            <Route path="/web3-impact-event" element={<Navigate to="/web3/impact-campaign" replace />} />

            {/* (Optional) If this path duplicates the hub, redirect it */}
            <Route path="/web3-fundraising-quiz" element={<Navigate to="/web3" replace />} />
            {/* If you still need the old page somewhere else, you can keep the route below instead of the redirect:
            <Route
              path="/web3-fundraising-quiz"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3" />}>
                  <Web3FundraisingQuizPage />
                </Suspense>
              }
            />
            */}

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







