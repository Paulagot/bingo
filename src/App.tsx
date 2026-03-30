// src/App.tsx - FULLY UPDATED VERSION WITH TICKET ROUTES

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
import ClubsLeaguePage from './pages/campaigns/ClubsLeaguePage';
import QuizEventDashboard from './components/mgtsystem/components/dashboard/QuizEventDashboard';
import { ConditionalWeb3Wrapper } from './components/Quiz/ConditionalWeb3Wrapper';


import { sdk } from '@farcaster/miniapp-sdk'



// Lazy quiz parts
const QuizRoutes = lazy(() => import('./components/Quiz/QuizRoutes'));
const QuizSocketProvider = lazy(() =>
  import('./components/Quiz/sockets/QuizSocketProvider').then((m) => ({ default: m.QuizSocketProvider }))
);

// ✅ NEW: Lazy load ticket components
const TicketPurchasePage = lazy(() => 
  import('./components/Quiz/tickets/TicketPurchasePage').then(m => ({ default: m.TicketPurchasePage }))
);
const TicketStatusChecker = lazy(() => 
  import('./components/Quiz/tickets/TicketStatusChecker').then(m => ({ default: m.TicketStatusChecker }))
);

const StripeQuizTicketSuccess = lazy(() => 
  import('./components/Quiz/tickets/stripeQuizTicketSuccess').then(m => ({ default: m.StripeQuizTicketSuccess }))
);
const StripeQuizTicketCancel = lazy(() => 
  import('./components/Quiz/tickets/stripeQuizTicketCancel').then(m => ({ default: m.StripeQuizTicketCancel }))
);

const StripeWalkinSuccess = lazy(() =>
  import('./components/Quiz/joinroom/StripeWalkinSuccess').then(m => ({ default: m.StripeWalkinSuccess }))
);
const MiniAppHostPage = lazy(() =>
  import('./pages/mini-app/MiniAppHostPage').then(m => ({ default: m.MiniAppHostPage }))
);

const EliminationGamePage = lazy(() =>
  import('./components/elimination/EliminationGamePage').then(m => ({ default: m.EliminationGamePage }))
);

const EliminationJoinPage = lazy(() =>
  import('./components/elimination/Eliminationjoinpage').then(m => ({ default: m.EliminationJoinPage }))
);

const Web3QuizPage = lazy(() => import('./pages/web3/quiz'));

const PuzzlePage = lazy(() => import('./components/puzzles/pages/PuzzlePage'));

const PuzzleDevTestPage = lazy(() => import('./components/puzzles/pages/Puzzledevtestpage'));

const ChallengeDashboardPage  = lazy(() => import('./components/puzzles/pages/ChallengeDashboardPage'));
const ChallengeCreatePage     = lazy(() => import('./components/puzzles/pages/ChallengeCreatePage'));
const ChallengeDetailPage     = lazy(() => import('./components/puzzles/pages/ChallengeDetailPage'));
const ChallengeLeaderboardPage = lazy(() => import('./components/puzzles/pages/ChallengeLeaderboardPage'));
const PuzzleJoinPage       = lazy(() => import('./components/puzzles/pages/PuzzleJoinPage'));
const PuzzleCheckEmailPage = lazy(() => import('./components/puzzles/pages/PuzzleCheckEmailPage'));
const PuzzleAuthPage       = lazy(() => import('./components/puzzles/pages/PuzzleAuthPage'));
const PlayerChallengePage  = lazy(() => import('./components/puzzles/pages/PlayerChallengePage'));

// Lazy Web3 hub + impact campaign pages
const Web3HubPage = lazy(() => import('./pages/web3'));
const ImpactCampaignOverview = lazy(() => import('./pages/web3/impact-campaign'));
const ImpactCampaignJoin = lazy(() => import('./pages/web3/impact-campaign/join'));
const ImpactCampaignLeaderboard = lazy(() => import('./pages/web3/impact-campaign/leaderboard'));
const ImpactCampaignBaseApp = lazy(() => import('./pages/web3/impact-campaign/MiniAppLandingPage'));
// ADD this lazy import at the top with the others
// const EliminationWeb3Page = lazy(() =>
//   import('./components/elimination/EliminationWeb3Page')
//     .then(m => ({ default: m.EliminationWeb3Page }))
// );
const Web3EliminationPage = lazy(() => import('./pages/web3/elimination'));

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

// ✅ FIXED: Only gameplay routes need sockets (exclude /quiz/join and /tickets/*)
const isGameRoute = (pathname: string) =>
  /^\/quiz\/(game|play|host-dashboard|host-controls|admin-join|join)\b/.test(pathname);


// ✅ FIXED: Only specific game routes need Web3Provider wrapper
const needsWeb3Wrapper = (pathname: string) =>
  /^\/quiz\/(game|play|admin-join)\b/.test(pathname);

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pathname } = location;

  const hideOnPaths = ['/BingoBlitz'];
  const hideOnPrefixes = ['/quiz/game', '/quiz/play', '/quiz/host-dashboard', '/quiz/host-controls', '/mini-app', '/tickets', '/elimination'];
  const showHeader =
    !hideOnPaths.includes(pathname) &&
    !hideOnPrefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));

  // Auth init
  const initialize = useAuthStore((state) => state.initialize);
  useEffect(() => {
    initialize();
  }, [initialize]);

useEffect(() => {
  sdk.actions.ready().catch(console.error);
}, []);

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
            <Route path="/campaigns/clubs-league" element={<ClubsLeaguePage />} />

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

            {/* ✅ NEW: Ticket routes (public, no auth required) */}
            <Route
              path="/tickets/buy/:roomId"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Ticket Purchase" />}>
                  <TicketPurchasePage />
                </Suspense>
              }
            />
            
            <Route
              path="/tickets/status/:ticketId"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Ticket Status" />}>
                  <TicketStatusChecker />
                </Suspense>
              }
            />

            {/* ✅ NEW: Stripe success and cancel */}
<Route
  path="/tickets/:ticketId/success"
  element={
    <Suspense fallback={<LoadingSpinner message="Confirming payment..." />}>
      <StripeQuizTicketSuccess />
    </Suspense>
  }
/>

<Route
  path="/tickets/:ticketId/cancel"
  element={
    <Suspense fallback={<LoadingSpinner message="Loading..." />}>
      <StripeQuizTicketCancel />
    </Suspense>
  }
/>

<Route
  path="/quiz/:roomId/join-success"
  element={
    <Suspense fallback={<LoadingSpinner message="Confirming payment..." />}>
      <QuizSocketProvider>
        <StripeWalkinSuccess />
      </QuizSocketProvider>
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

            {/* Quiz Event Dashboard - NO Web3Provider needed */}
            <Route
              path="/quiz/eventdashboard"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Dashboard" />}>
                  <QuizEventDashboard />
                </Suspense>
              }
            />

            {/* Base /quiz redirect */}
            <Route path="/quiz" element={<Navigate to="/quiz/create-fundraising-quiz" replace />} />

            {/* Bingo Game Route */}
            <Route path="/game/:roomId" element={<Game />} />

            {/* ✅ Quiz Routes - Conditional wrapping based on route */}
            <Route
              path="/quiz/*"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Quiz Platform" />}>
                  {isGameRoute(location.pathname) ? (
                    // Game routes: Need sockets + maybe Web3
                    <QuizSocketProvider>
                      {needsWeb3Wrapper(location.pathname) ? (
                        <ConditionalWeb3Wrapper>
                          <QuizRoutes />
                        </ConditionalWeb3Wrapper>
                      ) : (
                        <QuizRoutes />
                      )}
                    </QuizSocketProvider>
                  ) : (
                    // Non-game routes (like /quiz/join): Just QuizRoutes
                    // JoinRoomFlow handles its own Web3Provider internally
                    <QuizRoutes />
                  )}
                </Suspense>
              }
            />

            {/* ✅ WEB3 Hub & Impact Campaign - NO Web3Provider at route level */}
            <Route
              path="/web3/*"
              element={
                <Suspense fallback={<LoadingSpinner message="Loading Web3" />}>
                  <Routes>
                    {/* All marketing pages - NO Web3Provider */}
                    <Route path="" element={<Web3HubPage />} />
                    <Route path="features" element={<Web3Features />} />
                    <Route path="testimonials" element={<Web3Testimonials />} />
                    <Route path="partners" element={<Web3Partners />} />
                     <Route path="quiz"    element={<Web3QuizPage />} /> 
                    <Route path="impact-campaign" element={<ImpactCampaignOverview />} />
                    <Route path="impact-campaign/leaderboard" element={<ImpactCampaignLeaderboard />} />
                    
                    {/* ✅ Join page - Wizard handles Web3Provider internally at step 6 */}
                    <Route path="impact-campaign/join" element={<ImpactCampaignJoin />} />
                    <Route path="impact-campaign/baseapp" element={<ImpactCampaignBaseApp />} />
                    <Route path="elimination" element={<Web3EliminationPage />} />
                  </Routes>
                </Suspense>
              }
            />

            {/* Legacy redirects */}
            <Route path="/Web3-Impact-Event" element={<Navigate to="/web3/impact-campaign" replace />} />
            <Route path="/web3-impact-event" element={<Navigate to="/web3/impact-campaign" replace />} />
            <Route path="/web3-fundraising-quiz" element={<Navigate to="/web3" replace />} />

            <Route
  path="/mini-app/host"
  element={
    <Suspense fallback={<LoadingSpinner message="Loading Mini App..." />}>
      <MiniAppHostPage />
    </Suspense>
  }
/>

<Route
  path="/elimination/join/:roomId"
  element={
    <Suspense fallback={<LoadingSpinner message="Loading..." />}>
      <EliminationJoinPage />
    </Suspense>
  }
/>

<Route
  path="/elimination"
  element={
    <Suspense fallback={<LoadingSpinner message="Loading Elimination Game" />}>
      <EliminationGamePage />
    </Suspense>
  }
/>
<Route
  path="/dev/puzzles"
  element={
    <Suspense fallback={<LoadingSpinner message="Loading..." />}>
      <PuzzleDevTestPage />
    </Suspense>
  }
/>
{/* ── Puzzle routes — ORDER MATTERS: specific paths before /:challengeId ── */}

<Route path="/challenges" element={
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    <ChallengeDashboardPage />
  </Suspense>
} />

<Route path="/challenges/create" element={
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    <ChallengeCreatePage />
  </Suspense>
} />

{/* These three must come BEFORE /challenges/:challengeId */}
<Route path="/challenges/:challengeId/play" element={
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    <PlayerChallengePage />
  </Suspense>
} />

<Route path="/challenges/:challengeId/puzzle/:week" element={
  <Suspense fallback={<LoadingSpinner message="Loading Puzzle..." />}>
    <PuzzlePage />
  </Suspense>
} />

<Route path="/challenges/:challengeId/leaderboard" element={
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    <ChallengeLeaderboardPage />
  </Suspense>
} />

{/* Generic /:challengeId LAST — catches /challenges/:challengeId only */}
<Route path="/challenges/:challengeId" element={
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    <ChallengeDetailPage />
  </Suspense>
} />

{/* Public join routes */}
<Route path="/join/puzzle/:joinCode" element={
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    <PuzzleJoinPage />
  </Suspense>
} />

<Route path="/join/puzzle/challenge/:challengeId" element={
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    <PuzzleJoinPage />
  </Suspense>
} />

{/* Magic link flow */}
<Route path="/puzzle-check-email" element={
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    <PuzzleCheckEmailPage />
  </Suspense>
} />

<Route path="/puzzle-auth" element={
  <Suspense fallback={<LoadingSpinner message="Loading..." />}>
    <PuzzleAuthPage />
  </Suspense>
} />

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








