// src/App.tsx - UPDATED VERSION
// Remove Web3Provider from wizard routes - let wizards handle it themselves

import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

import { Landing } from './pages/Landing';
import { Header } from './components/GeneralSite2/Header';
import ErrorBoundary from './components/bingo/ErrorBoundary';
import { Game } from './pages/Game';
import WhatsNew from './pages/WhatsNew';
import FreeTrial from './pages/FreeTrial';
import FundraisingQuizPage from './pages/FundraisingQuizPage';
import Pricing from './pages/PricingPage';
import TestimonialsPage from './pages/TestimonialsPage';
import ConfirmPasswordReset from './components/auth/ConfirmPasswordReset';
import RequestPasswordReset from './components/auth/RequestPasswordReset';
import ContactForm from './components/GeneralSite2/ContactForm';
import FoundingPartnersPage from './pages/FoundingPartners';
import BlogPost from './pages/BlogPost';

import { useAuthStore } from './features/auth';
import AuthPage from './components/auth/AuthPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Web3Features from './pages/web3/features';
import Web3Testimonials from './pages/web3/testimonials';
import Web3Partners from './pages/web3/partners';
import TermsOfUse from './pages/nonseo/terms';
import PrivacyPolicy from './pages/nonseo/privacy';
import AboutFundRaisely from './pages/nonseo/aboutus';
import BlogAndResources from './pages/blog';

// Lazy quiz parts
const QuizRoutes = lazy(() => import('./components/Quiz/QuizRoutes'));
const QuizSocketProvider = lazy(() =>
  import('./components/Quiz/sockets/QuizSocketProvider').then((m) => ({ default: m.QuizSocketProvider }))
);

// Lazy Web3 wrapper (only for game routes where players join/pay)
const Web3ProviderLazy = lazy(() =>
  import('./components/Web3Provider').then((m) => ({ default: m.Web3Provider }))
);

// Lazy Web3 hub + impact campaign pages
const Web3HubPage = lazy(() => import('./pages/web3'));
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

// Only quiz/game gameplay routes need sockets
const isGameRoute = (pathname: string) =>
  /^\/quiz\/(game|play|host-dashboard|host-controls|join|admin-join)\b/.test(pathname);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;

  const hideOnPaths = ['/pitch-deck-content', '/BingoBlitz'];
  const hideOnPrefixes = ['/quiz/game', '/quiz/play', '/quiz/host-dashboard', '/quiz/host-controls'];
  const showHeader =
    !hideOnPaths.includes(pathname) &&
    !hideOnPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Auth init
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

            {/* Blog posts */}
            <Route
              path="/blog/:slug"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading blog post" />}>
                  <BlogPost />
                </Suspense>
              }
            />

            {/* ✅ Quiz Creation - NO Web3Provider (wizard handles it internally) */}
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

            {/* Base /quiz redirect */}
            <Route path="/quiz" element={<Navigate to="/quiz/create-fundraising-quiz" replace />} />

            {/* Bingo Game Route */}
            <Route path="/game/:roomId" element={<Game />} />

            {/* Quiz Routes (Web3Provider for game routes where players join/pay) */}
            <Route
              path="/quiz/*"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Quiz Platform" />}>
                  <Web3ProviderLazy>
                    {isGameRoute(location.pathname) ? (
                      <QuizSocketProvider>
                        <QuizRoutes />
                      </QuizSocketProvider>
                    ) : (
                      <QuizRoutes />
                    )}
                  </Web3ProviderLazy>
                </Suspense>
              }
            />

            {/* WEB3 Hub & Impact Campaign */}
            <Route
              path="/web3/*"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3" />}>
                  <Routes>
                    {/* ✅ Marketing pages - NO Web3Provider */}
                    <Route path="" element={<Web3HubPage />} />
                    <Route path="features" element={<Web3Features />} />
                    <Route path="testimonials" element={<Web3Testimonials />} />
                    <Route path="partners" element={<Web3Partners />} />
                    <Route path="impact-campaign" element={<ImpactCampaignOverview />} />
                    <Route path="impact-campaign/leaderboard" element={<ImpactCampaignLeaderboard />} />
                    
                    {/* ✅ Join page - NO Web3Provider at route level (wizard handles it) */}
                    <Route path="impact-campaign/join" element={<ImpactCampaignJoin />} />
                  </Routes>
                </Suspense>
              }
            />

            {/* Legacy redirects */}
            <Route path="/Web3-Impact-Event" element={<Navigate to="/web3/impact-campaign" replace />} />
            <Route path="/web3-impact-event" element={<Navigate to="/web3/impact-campaign" replace />} />
            <Route path="/web3-fundraising-quiz" element={<Navigate to="/web3" replace />} />

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








