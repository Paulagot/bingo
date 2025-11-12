// src/app/router/routes.tsx
// Route configuration

import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';

// Lazy load routes for code splitting
const Landing = lazy(() => import('../../pages/Landing').then(m => ({ default: m.Landing })));
const Game = lazy(() => import('../../pages/Game').then(m => ({ default: m.Game })));
const WhatsNew = lazy(() => import('../../pages/WhatsNew').then(m => ({ default: m.WhatsNew })));
const FreeTrial = lazy(() => import('../../pages/FreeTrial').then(m => ({ default: m.FreeTrial })));
const FundraisingQuizPage = lazy(() => import('../../pages/FundraisingQuizPage').then(m => ({ default: m.default })));
const Pricing = lazy(() => import('../../pages/PricingPage').then(m => ({ default: m.default })));
const TestimonialsPage = lazy(() => import('../../pages/TestimonialsPage').then(m => ({ default: m.default })));
const ContactForm = lazy(() => import('../../components/GeneralSite2/ContactForm').then(m => ({ default: m.default })));
const FoundingPartnersPage = lazy(() => import('../../pages/FoundingPartners').then(m => ({ default: m.default })));
const BlogPost = lazy(() => import('../../pages/BlogPost').then(m => ({ default: m.default })));
const AuthPage = lazy(() => import('../../components/auth/AuthPage').then(m => ({ default: m.default })));
const Login = lazy(() => import('../../pages/Login').then(m => ({ default: m.default })));
const Signup = lazy(() => import('../../pages/Signup').then(m => ({ default: m.default })));
const Web3Features = lazy(() => import('../../pages/web3/features').then(m => ({ default: m.default })));
const Web3Testimonials = lazy(() => import('../../pages/web3/testimonials').then(m => ({ default: m.default })));
const Web3Partners = lazy(() => import('../../pages/web3/partners').then(m => ({ default: m.default })));
const TermsOfUse = lazy(() => import('../../pages/nonseo/terms').then(m => ({ default: m.default })));
const PrivacyPolicy = lazy(() => import('../../pages/nonseo/privacy').then(m => ({ default: m.default })));
const AboutFundRaisely = lazy(() => import('../../pages/nonseo/aboutus').then(m => ({ default: m.default })));
const BlogAndResources = lazy(() => import('../../pages/blog').then(m => ({ default: m.default })));
const QuizRoutes = lazy(() => import('../../components/Quiz/QuizRoutes').then(m => ({ default: m.default })));
const QuizSocketProvider = lazy(() => import('../../components/Quiz/sockets/QuizSocketProvider').then(m => ({ default: m.QuizSocketProvider })));
const Web3HubPage = lazy(() => import('../../pages/web3').then(m => ({ default: m.default })));
const ImpactCampaignOverview = lazy(() => import('../../pages/web3/impact-campaign').then(m => ({ default: m.default })));
const ImpactCampaignJoin = lazy(() => import('../../pages/web3/impact-campaign/join').then(m => ({ default: m.default })));
const ImpactCampaignLeaderboard = lazy(() => import('../../pages/web3/impact-campaign/leaderboard').then(m => ({ default: m.default })));

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/whats-new',
    element: <WhatsNew />,
  },
  {
    path: '/free-trial',
    element: <FreeTrial />,
  },
  {
    path: '/pricing',
    element: <Pricing />,
  },
  {
    path: '/testimonials',
    element: <TestimonialsPage />,
  },
  {
    path: '/about',
    element: <AboutFundRaisely />,
  },
  {
    path: '/blog',
    element: <BlogAndResources />,
  },
  {
    path: '/blog/:slug',
    element: <BlogPost />,
  },
  {
    path: '/contact',
    element: <ContactForm />,
  },
  {
    path: '/legal/privacy',
    element: <PrivacyPolicy />,
  },
  {
    path: '/legal/terms',
    element: <TermsOfUse />,
  },
  {
    path: '/founding-partners',
    element: <FoundingPartnersPage />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/reset-password',
    element: <ContactForm />, // TODO: Replace with actual component
  },
  {
    path: '/forgot-password',
    element: <ContactForm />, // TODO: Replace with actual component
  },
  {
    path: '/quiz/create-fundraising-quiz',
    element: (
      <QuizSocketProvider>
        <FundraisingQuizPage />
      </QuizSocketProvider>
    ),
  },
  {
    path: '/quiz',
    element: <QuizRoutes />,
  },
  {
    path: '/quiz/*',
    element: <QuizRoutes />,
  },
  {
    path: '/game/:roomId',
    element: <Game />,
  },
  {
    path: '/web3',
    element: <Web3HubPage />,
  },
  {
    path: '/web3/features',
    element: <Web3Features />,
  },
  {
    path: '/web3/testimonials',
    element: <Web3Testimonials />,
  },
  {
    path: '/web3/partners',
    element: <Web3Partners />,
  },
  {
    path: '/web3/impact-campaign',
    element: <ImpactCampaignOverview />,
  },
  {
    path: '/web3/impact-campaign/join',
    element: <ImpactCampaignJoin />,
  },
  {
    path: '/web3/impact-campaign/leaderboard',
    element: <ImpactCampaignLeaderboard />,
  },
];

