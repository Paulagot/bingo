// src/App.tsx

import { useEffect, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';

import { Header } from './components/GeneralSite2/Header';
import ErrorBoundary from './components/bingo/ErrorBoundary';
import { Game } from './pages/Game';

import { Landing } from './pages/Landing';
import WhatsNew from './pages/WhatsNew';
import FreeTrial from './pages/FreeTrial';
import OldPricing from './pages/PricingPage';
import TestimonialsPage from './pages/TestimonialsPage';
import ContactForm from './components/GeneralSite2/ContactForm';
import FoundingPartnersPage from './pages/FoundingPartners';
import BlogPost from './pages/BlogPost';

import ConfirmPasswordReset from './components/auth/ConfirmPasswordReset';
import RequestPasswordReset from './components/auth/RequestPasswordReset';
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
import { EliminationDevPage } from './components/elimination/EliminationDevPage';
import { EliminationAdminJoinPage } from './components/elimination/EliminationAdminJoinPage';
import { Web3Provider } from './components/Web3Provider';
import EventsDiscoveryPage from './pages/web3/events';

import { useAuthStore } from './features/auth';

import { sdk } from '@farcaster/miniapp-sdk';

/**
 * NEW PUBLIC SITE IMPORTS
 * These assume you copied the new frontend into:
 * src/pages/site
 */
import { SiteLayout } from './pages/site/components/layout/SiteLayout';

import SiteHomePage from './pages/site/pages/HomePage';

import SitePricingPage from './pages/site/pages/PricingPage';
import SiteHowItWorksPage from './pages/site/pages/HowItWorksPage';
import SiteAboutPage from './pages/site/pages/AboutPage';
import SiteContactPage from './pages/site/pages/ContactPage';
import SiteNotFoundPage from './pages/site/pages/NotFoundPage';

import SiteGamesIndexPage from './pages/site/pages/games/GamesIndexPage';
import SiteQuizGamePage from './pages/site/pages/games/QuizGamePage';
import SiteEliminationGamePage from './pages/site/pages/games/EliminationGamePage';
import SitePuzzleChallengesPage from './pages/site/pages/games/PuzzleChallengesPage';
import SiteTicketedEventsPage from './pages/site/pages/games/TicketedEventsPage';
import SiteEscapeRoomPage from './pages/site/pages/games/EscapeRoomPage';
import SiteTreasureHuntPage from './pages/site/pages/games/TreasureHuntPage';

import SiteFeaturesIndexPage from './pages/site/pages/features/FeaturesIndexPage';
import SiteCampaignManagerPage from './pages/site/pages/features/CampaignManagerPage';
import SiteEventManagerPage from './pages/site/pages/features/EventManagerPage';
import SitePaymentsPage from './pages/site/pages/features/PaymentsPage';
import SiteTicketingPage from './pages/site/pages/features/TicketingPage';
import SiteReportsPage from './pages/site/pages/features/ReportsPage';
import SiteImpactReportsPage from './pages/site/pages/features/ImpactReportsPage';
import SiteCrmPage from './pages/site/pages/features/CrmPage';
import SiteAiPrizeFinderPage from './pages/site/pages/features/AiPrizeFinderPage';

import SiteUseCasesIndexPage from './pages/site/pages/useCases/UseCasesIndexPage';
import SiteSportsClubsPage from './pages/site/pages/useCases/SportsClubsPage';
import SiteSchoolsPage from './pages/site/pages/useCases/SchoolsPage';
import SiteCharitiesPage from './pages/site/pages/useCases/CharitiesPage';
import SiteCommunityGroupsPage from './pages/site/pages/useCases/CommunityGroupsPage';

import SiteBlogIndexPage from './pages/site/pages/resources/BlogIndexPage';
import SiteResourcesIndexPage from './pages/site/pages/resources/ResourcesIndexPage';
import SiteFundraisingIdeasPage from './pages/site/pages/resources/FundraisingIdeasPage';
import SiteGuidesPage from './pages/site/pages/resources/GuidesPage';

import SitePrivacyPage from './pages/site/pages/legal/PrivacyPage';
import SiteTermsPage from './pages/site/pages/legal/TermsPage';
import SiteCookiesPage from './pages/site/pages/legal/CookiesPage';
import CheckinPage from './pages/site/pages/CheckinPage';
import SafeStreetsIrelandPadelPage from './pages/events/SafeStreetsIrelandPadelPage';

// Lazy quiz parts
const QuizRoutes = lazy(() => import('./components/Quiz/QuizRoutes'));
const QuizSocketProvider = lazy(() =>
  import('./components/Quiz/sockets/QuizSocketProvider').then((m) => ({
    default: m.QuizSocketProvider,
  }))
);

// Lazy ticket components
const TicketPurchasePage = lazy(() =>
  import('./components/Quiz/tickets/TicketPurchasePage').then((m) => ({
    default: m.TicketPurchasePage,
  }))
);

const TicketStatusChecker = lazy(() =>
  import('./components/Quiz/tickets/TicketStatusChecker').then((m) => ({
    default: m.TicketStatusChecker,
  }))
);

const EliminationTicketPurchasePage = lazy(() =>
  import('./components/elimination/tickets/EliminationTicketPurchasePage').then((m) => ({
    default: m.EliminationTicketPurchasePage,
  }))
);

const StripeQuizTicketSuccess = lazy(() =>
  import('./components/Quiz/tickets/stripeQuizTicketSuccess').then((m) => ({
    default: m.StripeQuizTicketSuccess,
  }))
);

const StripeQuizTicketCancel = lazy(() =>
  import('./components/Quiz/tickets/stripeQuizTicketCancel').then((m) => ({
    default: m.StripeQuizTicketCancel,
  }))
);

const StripeWalkinSuccess = lazy(() =>
  import('./components/Quiz/joinroom/StripeWalkinSuccess').then((m) => ({
    default: m.StripeWalkinSuccess,
  }))
);

const MiniAppHostPage = lazy(() =>
  import('./pages/mini-app/MiniAppHostPage').then((m) => ({
    default: m.MiniAppHostPage,
  }))
);

const EliminationAppGamePage = lazy(() =>
  import('./components/elimination/EliminationGamePage').then((m) => ({
    default: m.EliminationGamePage,
  }))
);

const EliminationJoinPage = lazy(() =>
  import('./components/elimination/Eliminationjoinpage').then((m) => ({
    default: m.EliminationJoinPage,
  }))
);

const EliminationJoinSuccessPage = lazy(() =>
  import('./components/elimination/join/EliminationJoinSuccessPage').then((m) => ({
    default: m.EliminationJoinSuccessPage,
  }))
);

// Add this lazy import at the top with the other lazy imports:
const WalkinPage = lazy(() =>
  import('./pages/site/pages/WalkinPage').then((m) => ({
    default: m.default,
  }))
);

const Web3QuizPage = lazy(() => import('./pages/web3/quiz'));
const PuzzlePage = lazy(() => import('./components/puzzles/pages/PuzzlePage'));
const PuzzleDevTestPage = lazy(() => import('./components/puzzles/pages/Puzzledevtestpage'));
const ChallengeDashboardPage = lazy(() => import('./components/puzzles/pages/ChallengeDashboardPage'));
const ChallengeCreatePage = lazy(() => import('./components/puzzles/pages/ChallengeCreatePage'));
const ChallengeDetailPage = lazy(() => import('./components/puzzles/pages/ChallengeDetailPage'));
const ChallengeLeaderboardPage = lazy(() => import('./components/puzzles/pages/ChallengeLeaderboardPage'));
const PuzzleJoinPage = lazy(() => import('./components/puzzles/pages/PuzzleJoinPage'));
const PuzzleCheckEmailPage = lazy(() => import('./components/puzzles/pages/PuzzleCheckEmailPage'));
const PuzzleAuthPage = lazy(() => import('./components/puzzles/pages/PuzzleAuthPage'));
const PlayerChallengePage = lazy(() => import('./components/puzzles/pages/PlayerChallengePage'));

// Lazy Web3 hub + impact campaign pages
const Web3HubPage = lazy(() => import('./pages/web3'));
const ImpactCampaignOverview = lazy(() => import('./pages/web3/impact-campaign'));
const ImpactCampaignJoin = lazy(() => import('./pages/web3/impact-campaign/join'));
const ImpactCampaignLeaderboard = lazy(() => import('./pages/web3/impact-campaign/leaderboard'));
const ImpactCampaignBaseApp = lazy(() => import('./pages/web3/impact-campaign/MiniAppLandingPage'));
const Web3EliminationPage = lazy(() => import('./pages/web3/elimination'));
const FundraisersDashboardPage = lazy(() => import('./pages/web3/FundraisersDashboardPage'));
const Web3HostPage = lazy(() => import('./pages/web3/host'));
const Web3CausesPage = lazy(() => import('./pages/web3/causes'));
const BonkBfpPubQuizPage = lazy(() => import('./pages/events/BonkBfpPubQuizPage'));
const CampaignProductsPage = lazy(() => import('./pages/campaigns/CampaignProductsPage'));
const CampaignSupportPage = lazy(() => import('./pages/campaigns/CampaignSupportPage'));
const CampaignStripeSuccess = lazy(() => import('./pages/campaigns/CampaignStripeSuccess'));
const CampaignSellerPage = lazy(() => import('./pages/campaigns/CampaignSellerPage'));

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

const isGameRoute = (pathname: string) =>
  /^\/quiz\/(game|play|host-dashboard|host-controls|admin-join|join|operate)\b/.test(pathname);

const needsWeb3Wrapper = (pathname: string) =>
  /^\/quiz\/(game|play|admin-join)\b/.test(pathname);

export default function App() {


  const navigate = useNavigate();
  const location = useLocation();

  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    sdk.actions.ready().catch(console.error);
  }, []);

  return (
    <ErrorBoundary>
      <Routes>
        {/* 
          NEW PUBLIC MARKETING SITE
          These replace the old public marketing pages at live URLs.
          SiteLayout should provide the new site header/footer.
        */}
        <Route element={<SiteLayout />}>
          <Route path="/" element={<SiteHomePage />} />
          
          <Route path="/pricing" element={<SitePricingPage />} />
          <Route path="/how-it-works" element={<SiteHowItWorksPage />} />
          <Route path="/about" element={<SiteAboutPage />} />
          <Route path="/contact" element={<SiteContactPage />} />

          <Route path="/event-formats" element={<SiteGamesIndexPage />} />
          <Route path="/event-formats/quiz" element={<SiteQuizGamePage />} />
          <Route path="/event-formats/elimination" element={<SiteEliminationGamePage />} />
          <Route path="/event-formats/ticketed-events" element={<SiteTicketedEventsPage />} />
          <Route path="/event-formats/puzzle-challenges" element={<SitePuzzleChallengesPage />} />
          <Route path="/event-formats/escape-room" element={<SiteEscapeRoomPage />} />
          <Route path="/event-formats/treasure-hunt" element={<SiteTreasureHuntPage />} />

          <Route path="/features" element={<SiteFeaturesIndexPage />} />
          <Route path="/features/campaign-manager" element={<SiteCampaignManagerPage />} />
          <Route path="/features/event-manager" element={<SiteEventManagerPage />} />
          <Route path="/features/payments" element={<SitePaymentsPage />} />
          <Route path="/features/ticketing" element={<SiteTicketingPage />} />
          <Route path="/features/reports" element={<SiteReportsPage />} />
          <Route path="/features/impact-reports" element={<SiteImpactReportsPage />} />
          <Route path="/features/crm" element={<SiteCrmPage />} />
          <Route path="/features/ai-prize-finder" element={<SiteAiPrizeFinderPage />} />

          <Route path="/use-cases" element={<SiteUseCasesIndexPage />} />
          <Route path="/use-cases/sports-clubs" element={<SiteSportsClubsPage />} />
          <Route path="/use-cases/schools-ptas" element={<SiteSchoolsPage />} />
          <Route path="/use-cases/charities" element={<SiteCharitiesPage />} />
          <Route path="/use-cases/community-groups" element={<SiteCommunityGroupsPage />} />

          <Route path="/blog" element={<SiteBlogIndexPage />} />
          <Route path="/resources" element={<SiteResourcesIndexPage />} />
          <Route path="/resources/fundraising-ideas" element={<SiteFundraisingIdeasPage />} />
          <Route path="/resources/guides" element={<SiteGuidesPage />} />

          <Route path="/legal/privacy" element={<SitePrivacyPage />} />
          <Route path="/legal/terms" element={<SiteTermsPage />} />
          <Route path="/legal/cookies" element={<SiteCookiesPage />} />

          <Route path="/site-404-preview" element={<SiteNotFoundPage />} />
        </Route>

        {/* 
          OLD MARKETING PAGES
          Kept accessible while migrating/reviewing old copy.
        */}
        <Route
          path="/old"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <Landing />
              </main>
            </div>
          }
        />
        <Route
          path="/old/whats-new"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <WhatsNew />
              </main>
            </div>
          }
        />
        <Route
          path="/old/free-trial"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <FreeTrial />
              </main>
            </div>
          }
        />
        <Route
          path="/old/pricing"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <OldPricing />
              </main>
            </div>
          }
        />
        <Route
          path="/old/testimonials"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <TestimonialsPage />
              </main>
            </div>
          }
        />
        <Route
          path="/old/about"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <AboutFundRaisely />
              </main>
            </div>
          }
        />
        <Route
          path="/old/blog"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <BlogAndResources />
              </main>
            </div>
          }
        />
        <Route
          path="/old/contact"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <ContactForm />
              </main>
            </div>
          }
        />
        <Route
          path="/old/legal/privacy"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <PrivacyPolicy />
              </main>
            </div>
          }
        />
        <Route
          path="/old/legal/terms"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <TermsOfUse />
              </main>
            </div>
          }
        />
        <Route
          path="/old/founding-partners"
          element={
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
              <Header />
              <main className="pt-16">
                <FoundingPartnersPage />
              </main>
            </div>
          }
        />

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

        {/* Campaign routes */}
        <Route path="/campaigns/clubs-league" element={<ClubsLeaguePage />} />

        <Route
          path="/campaigns/:campaignId/products"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading Product Builder" />}>
              <CampaignProductsPage />
            </Suspense>
          }
        />

        <Route
          path="/campaigns/:campaignId/support"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading Campaign" />}>
              <CampaignSupportPage />
            </Suspense>
          }
        />

        <Route
          path="/campaigns/:campaignId/order-success"
          element={
            <Suspense fallback={<LoadingSpinner message="Confirming payment..." />}>
              <CampaignStripeSuccess />
            </Suspense>
          }
        />

        <Route
          path="/campaigns/:campaignId/sellers/:sellerId"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading seller page..." />}>
              <CampaignSellerPage />
            </Suspense>
          }
        />

        {/* Event page */}
        <Route
          path="/events/bonk-bfp-pub-quiz"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading event page" />}>
              <BonkBfpPubQuizPage />
            </Suspense>
          }
        />

        <Route
  path="/events/safe-streets-ireland-padel"
  element={<SafeStreetsIrelandPadelPage />}
/>

        {/* Ticket routes */}
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

        {/* Quiz routes */}
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

        <Route
          path="/quiz/eventdashboard"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading Dashboard" />}>
              <QuizEventDashboard />
            </Suspense>
          }
        />

        <Route path="/quiz" element={<Navigate to="/quiz/eventdashboard" replace />} />

        <Route
          path="/quiz/create-fundraising-quiz"
          element={<Navigate to="/quiz/eventdashboard" replace />}
        />

        <Route
          path="/quiz/*"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading Quiz Platform" />}>
              {isGameRoute(location.pathname) ? (
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
                <QuizRoutes />
              )}
            </Suspense>
          }
        />

        {/* Bingo Game Route */}
        <Route path="/game/:roomId" element={<Game />} />

        {/* Elimination app routes */}
        <Route path="/elimination/dev" element={<EliminationDevPage />} />
        <Route path="/elimination/admin-join/:roomId" element={<EliminationAdminJoinPage />} />

        <Route
          path="/elimination/:roomId/tickets"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading Ticket Purchase" />}>
              <EliminationTicketPurchasePage />
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
  path="/elimination/join-success/:roomId"
  element={
    <Suspense fallback={<LoadingSpinner message="Confirming payment..." />}>
      <EliminationJoinSuccessPage />
    </Suspense>
  }
/>

        <Route
          path="/elimination"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading Elimination Game" />}>
              <EliminationAppGamePage />
            </Suspense>
          }
        />

        <Route
  path="/ticketed-event/checkin/:roomId"
  element={
    <Suspense fallback={<LoadingSpinner message="Loading check-in..." />}>
      <CheckinPage />
    </Suspense>
  }
/>
<Route
  path="/tickets/walkin/:roomId"
  element={
    <Suspense fallback={<LoadingSpinner message="Loading Walk-in" />}>
      <WalkinPage />
    </Suspense>
  }
/>

        {/* Web3 Hub & Impact Campaign */}
        <Route
          path="/web3/*"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading Web3" />}>
              <Web3Provider force>
                <Routes>
                  <Route path="" element={<Web3HubPage />} />
                  <Route path="features" element={<Web3Features />} />
                  <Route path="testimonials" element={<Web3Testimonials />} />
                  <Route path="partners" element={<Web3Partners />} />
                  <Route path="quiz" element={<Web3QuizPage />} />
                  <Route path="impact-campaign" element={<ImpactCampaignOverview />} />
                  <Route path="impact-campaign/leaderboard" element={<ImpactCampaignLeaderboard />} />
                  <Route path="events" element={<EventsDiscoveryPage />} />
                  <Route path="host" element={<Web3HostPage />} />
                  <Route path="causes" element={<Web3CausesPage />} />
                  <Route path="impact-campaign/join" element={<ImpactCampaignJoin />} />
                  <Route path="impact-campaign/baseapp" element={<ImpactCampaignBaseApp />} />
                  <Route path="elimination" element={<Web3EliminationPage />} />
                  <Route path="fundraisersdashboard" element={<FundraisersDashboardPage />} />
                </Routes>
              </Web3Provider>
            </Suspense>
          }
        />

        {/* Legacy redirects */}
        <Route path="/Web3-Impact-Event" element={<Navigate to="/web3/impact-campaign" replace />} />
        <Route path="/web3-impact-event" element={<Navigate to="/web3/impact-campaign" replace />} />
        <Route path="/web3-fundraising-quiz" element={<Navigate to="/web3" replace />} />

        {/* Mini app */}
        <Route
          path="/mini-app/host"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading Mini App..." />}>
              <MiniAppHostPage />
            </Suspense>
          }
        />

        {/* Puzzle / challenge routes */}
        <Route
          path="/dev/puzzles"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <PuzzleDevTestPage />
            </Suspense>
          }
        />

        <Route
          path="/challenges"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <ChallengeDashboardPage />
            </Suspense>
          }
        />

        <Route
          path="/challenges/create"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <ChallengeCreatePage />
            </Suspense>
          }
        />

        <Route
          path="/challenges/:challengeId/play"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <PlayerChallengePage />
            </Suspense>
          }
        />

        <Route
          path="/challenges/:challengeId/puzzle/:week"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading Puzzle..." />}>
              <PuzzlePage />
            </Suspense>
          }
        />

        <Route
          path="/challenges/:challengeId/leaderboard"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <ChallengeLeaderboardPage />
            </Suspense>
          }
        />

        <Route
          path="/challenges/:challengeId"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <ChallengeDetailPage />
            </Suspense>
          }
        />

        <Route
          path="/join/puzzle/challenge/:challengeId"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <PuzzleJoinPage />
            </Suspense>
          }
        />

        <Route
          path="/join/puzzle/:joinCode"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <PuzzleJoinPage />
            </Suspense>
          }
        />

        <Route
          path="/puzzle-check-email"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <PuzzleCheckEmailPage />
            </Suspense>
          }
        />

        <Route
          path="/puzzle-auth"
          element={
            <Suspense fallback={<LoadingSpinner message="Loading..." />}>
              <PuzzleAuthPage />
            </Suspense>
          }
        />
        

        {/* Final app 404 */}
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
                    onClick={() => navigate('/quiz/eventdashboard')}
                    className="block w-full rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700"
                  >
                    Go to Quiz Dashboard
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
    </ErrorBoundary>
  );
}








