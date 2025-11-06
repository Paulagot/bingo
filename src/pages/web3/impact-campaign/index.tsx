// src/pages/web3/impact-campaign/index.tsx
import React, { useState, useCallback } from 'react';
import { SEO } from '../../../components/SEO';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle,
  ArrowRight,
  Heart,
  Users,
  Zap,
  Shield,
  Globe,
  DollarSign,
  Info,
  Target,
  Trophy,
 
  Goal
} from 'lucide-react';

import Web3QuizWizard from '../../../components/Quiz/Wizard/Web3QuizWizard';
import { JoinRoomFlow } from '../../../components/Quiz/joinroom/JoinRoomFlow';
import { QuizSocketProvider } from '../../../components/Quiz/sockets/QuizSocketProvider';
import type { SupportedChain } from '../../../chains/types';
import { PledgeForm } from '../../../components/GeneralSite/Web3pages/PledgeForm';

/** Absolute URL helpers */
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string): string { 
  const p = path.startsWith('/') ? path : `/${path}`; 
  return `${getOrigin()}${p}`; 
}

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 mt-0.5" />
    <span className="text-indigo-900/80 leading-relaxed">{children}</span>
  </li>
);

const ImpactCampaignOverview: React.FC = () => {
  const [showWeb3Wizard, setShowWeb3Wizard] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);

  const handleWeb3WizardComplete = () => {
    setShowWeb3Wizard(false);
    setSelectedChain(null);
  };

  const handleChainUpdate = useCallback((newChain: SupportedChain) => {
    setSelectedChain(newChain);
  }, []);

  const isAnyModalOpen = showWeb3Wizard || showJoinModal;

  // Structured data following SEO strategy
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Impact Campaign', item: abs('/web3/impact-campaign') }
    ]
  };

  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'Web3 Impact Campaign',
    description: 'Annual crypto fundraising drive uniting DAOs, dApps, NFT and meme communities to host quizzes and raise funds for verified charities on-chain.',
    startDate: '2025-11-01',
    endDate: '2026-01-31',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    organizer: {
      '@type': 'Organization',
      name: 'FundRaisely',
      url: abs('/')
    }
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Who can host a quiz?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Any Web3 community - DAOs, dApps, NFT/meme projects, guilds, validators, L2/infra teams, creators and more.'
        }
      },
      {
        '@type': 'Question',
        name: 'What chains and tokens are supported?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: '2025 launch chains: Solana, Avalanche and Base. Tokens include  USDC, PYUSD (on Solana), and USDGLO (Glo Dollar) where available.'
        }
      },
      {
        '@type': 'Question',
        name: 'How does the leaderboard work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Projects earn points from each quiz based on funds raised and impact metrics. If your quiz uses Glo Dollar, your score for that quiz gets doubled.'
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Web3 Impact Campaign — Annual Crypto Fundraising Drive | FundRaisely"
        description="Fundraise for real-world good, on-chain. The annual Web3 Impact Campaign by FundRaisely unites DAOs, dApps, NFT and meme communities to host quizzes, raise for verified charities, and climb the leaderboard. Nov–Jan."
        keywords="web3 fundraising, crypto charity, DAO fundraising, blockchain philanthropy, on-chain donations, Solana fundraising, Stellar fundraising, Base fundraising, Glo Dollar, The Giving Block"
        type="event"
        structuredData={[breadcrumbsJsonLd, eventJsonLd, faqJsonLd]}
        domainStrategy="geographic"
        breadcrumbs={[
  { name: 'Home', item: '/' },
  { name: 'Web3', item: '/web3' },
  { name: 'Impact Campaign', item: '/web3/impact-campaign' },
]}
      />

      {!isAnyModalOpen && (
        <>
          {/* Hero Section */}
          <section className="relative px-4 pt-12 pb-8">
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
            <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />
            
            <div className="container relative z-10 mx-auto max-w-6xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
                <Sparkles className="h-4 w-4" /> Annual Campaign
              </span>

              <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
                Web3 Impact Campaign
              </h1>

              <p className="mt-2 text-2xl md:text-3xl font-semibold text-indigo-900">
                Fundraise for Real-World Good, On-Chain.
              </p>

              <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl leading-relaxed">
                Unite the Web3 world for real-world impact. From November 14th to February 14th,
                DAOs, dApps, NFT &amp; meme communities host quizzes and route funds
                on-chain directly to verified charities — with transparent reports and a global leaderboard.
              </p>

              <div className="mt-7 flex flex-wrap justify-center gap-3">
                <Link
                  to="/web3/impact-campaign/leaderboard"
                  className="rounded-xl border-2 border-indigo-600 bg-white px-6 py-3 font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-md"
                >
                  View Leaderboard
                </Link>
                <Link
                  to="/web3/impact-campaign/join"
                  className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 transition-colors shadow-md"
                >
                  Host / Join a Quiz
                </Link>
                  <Link
                  to="/web3/partners"
                  className="rounded-xl border-2 border-indigo-600 bg-white px-6 py-3 font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-md"
                >
                  View Partners
                </Link>
              </div>
            </div>
          </section>

          {/* Support Pitch + Pledge Form */}
          <section className="px-4 py-12">
            <div className="container mx-auto max-w-6xl">
              <div className="grid gap-8 lg:grid-cols-2">
                <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
                  <h3 className="text-indigo-900 mb-4 text-xl font-bold">🤝 Pledge to Host — Get Full Support</h3>
                  <p className="text-indigo-900/80 mb-6 leading-relaxed">
                    Perfect for communities hosting their first fundraising quiz. We'll coach your team,
                    provide templates and media assets, and help you go live on Solana, Base or Avalanche.
                  </p>
                  <ul className="space-y-3">
                    <Bullet>Hands-on setup &amp; training session</Bullet>
                    <Bullet>Media kit &amp; promo support</Bullet>
                    <Bullet>Customizable quiz content</Bullet>
                    <Bullet>Optional 5% host share (within host-controlled allocation)</Bullet>
                  </ul>
                </div>

                <div className="rounded-2xl border border-indigo-200 bg-white p-8 shadow-lg">
                  <PledgeForm compactTitle="Pledge Now — Get Support" />
                  <p className="mt-4 text-xs text-indigo-900/60">
                    Tip: When the campaign kicks off in November, this section will switch to
                    <strong> "Request Help / Demo"</strong> for late joiners.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center mb-10">
                <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Why the Web3 Impact Campaign Matters</h2>
                <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
                  Transform crypto culture into tangible real-world outcomes through transparent, on-chain fundraising.
                </p>
              </div>

              <div className="mb-10 grid gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700">
                    <Info className="h-4 w-4" />
                    <span className="text-xs font-semibold">What it is</span>
                  </div>
                  <h3 className="mb-2 text-indigo-900 text-lg font-bold">A global, on-chain charity drive</h3>
                  <p className="text-sm text-indigo-900/80 leading-relaxed">
                    A 3-month fundraising campaign (Nov 14th–Feb 14th) where Web3 communities host quiz nights and raise funds
                    directly to verified charities — no custodians, no middlemen, transparent by default.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-semibold">Why it matters</span>
                  </div>
                  <h3 className="mb-2 text-indigo-900 text-lg font-bold">Real-world impact from crypto culture</h3>
                  <p className="text-sm text-indigo-900/80 leading-relaxed">
                    DAOs, dApps, NFT and meme communities turn culture and coordination into tangible outcomes:
                    a minimum of <strong>40% of every room goes to charity</strong>, up to <strong>40%</strong> is
                    <strong> host-controlled</strong> (prizes + optional host take), and <strong>20% funds the platform</strong>
                    to build tools for good.
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                    <Trophy className="h-4 w-4" />
                    <span className="text-xs font-semibold">Incentives</span>
                  </div>
                  <h3 className="mb-2 text-indigo-900 text-lg font-bold">Leaderboards & Glo Dollar bonuses</h3>
                  <p className="text-sm text-indigo-900/80 leading-relaxed">
                    Projects compete on a campaign-wide leaderboard. Quizzes using <strong>Glo Dollar</strong> earn
                    <strong> double points</strong>, rewarding purpose-driven stablecoin rails.
                  </p>
                </div>
              </div>

              {/* Campaign Targets */}
              <div className="mb-12 grid gap-6 md:grid-cols-4" aria-label="Campaign targets">
                <div className="rounded-2xl border border-amber-100 bg-white p-6 text-center shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
                    <Goal className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-indigo-900">$100,000</h3>
                  <p className="text-sm text-amber-600 font-medium">Campaign target</p>
                </div>
                <div className="rounded-2xl border border-green-100 bg-white p-6 text-center shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 shadow-lg">
                    <Heart className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-indigo-900">≥ 40%</h3>
                  <p className="text-sm text-green-600 font-medium">Minimum to charity</p>
                </div>
                <div className="rounded-2xl border border-blue-100 bg-white p-6 text-center shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 shadow-lg">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-indigo-900">≤ 40%</h3>
                  <p className="text-sm text-blue-600 font-medium">Host-controlled (prizes + optional 5%)</p>
                </div>
                <div className="rounded-2xl border border-purple-100 bg-white p-6 text-center shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-500 shadow-lg">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-indigo-900">20%</h3>
                  <p className="text-sm text-purple-600 font-medium">Platform — building tools for good</p>
                </div>
              </div>
            </div>
          </section>

          {/* Benefits & How It Works */}
          <section className="px-4 py-12">
            <div className="container mx-auto max-w-6xl">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Benefits */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
                  <h2 className="text-indigo-900 mb-4 text-2xl md:text-3xl font-bold">Benefits of Joining the Impact Campaign</h2>
                  <p className="text-indigo-900/70 mb-6 leading-relaxed">
                    Discover how participating in the Web3 Impact Campaign strengthens your community while driving meaningful real-world impact.
                  </p>
                  <ul className="space-y-3">
                    <Bullet>Engage, revive, and have fun with your <strong>community</strong></Bullet>
                    <Bullet>Earn an optional 5% of the intake for hosting</Bullet>
                    <Bullet>Contribute to good causes with transparent on-chain donations</Bullet>
                    <Bullet>Gain media coverage and recognition for your project</Bullet>
                    <Bullet>Watch your project move up the leaderboard</Bullet>
                  </ul>
                </div>

                {/* How It Works */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
                  <h2 className="text-indigo-900 mb-4 text-2xl md:text-3xl font-bold">How It Works</h2>
                  <p className="text-indigo-900/70 mb-6 leading-relaxed">
                    From setup to celebration, our platform guides you through every step of hosting successful on-chain fundraising events.
                  </p>
                  <ol className="list-decimal space-y-3 pl-5 text-indigo-900/80 leading-relaxed">
                    <li>Pick a date &amp; format (in-person or online) between <strong>November 14th and February 14th</strong></li>
                    <li>Choose your chain and tokens; Select a charity, connect your wallet</li>
                    <li>Host your quiz with live scoring, power-ups, and on-chain receipts</li>
                    <li>Smart contracts split funds: <strong>≥40% charity</strong>, <strong>≤40% host-controlled</strong>, <strong>20% platform</strong></li>
                    <li>Publish audit-ready reports and watch your project move up the leaderboard</li>
                  </ol>
                </div>
              </div>
            </div>
          </section>

        {/* Supported chains & tokens */}
                <section className="px-4 py-12 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="container mx-auto max-w-6xl">
                    <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
                      <h2 className="text-indigo-900 mb-6 text-2xl font-bold">Supported Chains & Tokens (2025)</h2>
                      <div className="grid gap-8 md:grid-cols-3 mb-6">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                              SOL
                            </div>
                            <h3 className="text-indigo-900 font-bold text-lg">Solana</h3>
                          </div>
                          <p className="text-sm text-indigo-900/70"> USDC · PYUSD</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                              AVAX
                            </div>
                            <h3 className="text-indigo-900 font-bold text-lg">Avalanche</h3>
                          </div>
                          <p className="text-sm text-indigo-900/70">USDC · USDGLO</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                              BASE
                            </div>
                            <h3 className="text-indigo-900 font-bold text-lg">Base</h3>
                          </div>
                          <p className="text-sm text-indigo-900/70">USDC (native) · USDGLO</p>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
                          <Trophy className="h-4 w-4" />
                          <span>
                            Using <strong>Glo Dollar (USDGLO)</strong> doubles your quiz points on the campaign leaderboard
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

          {/* Partners */}
          <section className="px-4 py-12">
            <div className="container mx-auto max-w-6xl">
              <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
                <h2 className="text-indigo-900 mb-4 text-2xl md:text-3xl font-bold">Partners &amp; Charity Network</h2>
                <p className="text-indigo-900/80 mb-6 leading-relaxed">
                  We're partnering with <strong>The Giving Block</strong> (12 featured charities this year) and
                  <strong> Glo Dollar</strong> to enable transparent, purpose-driven fundraising rails.  But thats not all, we have Infrastructure Partners, Media & Community Partners and Early Backers.  Check our our Partners page.
                </p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
               
                  <Link
                  to="/web3/partners"
                  className="rounded-xl border-2 border-indigo-600 bg-white px-6 py-3 font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-md"
                >
                  View Partners
                </Link>
              </div>
                {/* <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-6 py-3 shadow-sm hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      TGB
                    </div>
                    <span className="font-semibold text-indigo-700">The Giving Block</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-6 py-3 shadow-sm hover:shadow-md transition-all">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
                      GLO
                    </div>
                    <span className="font-semibold text-green-700">Glo Dollar</span>
                  </div>
                </div> */}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="container mx-auto max-w-6xl">
              <h2 className="text-indigo-900 mb-8 text-3xl md:text-4xl font-bold text-center">
                Frequently Asked Questions
              </h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                  <h3 className="text-indigo-900 mb-3 text-lg font-semibold">
                    Who can host a quiz?
                  </h3>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Any Web3 community - DAOs, dApps, NFT/meme projects, guilds, validators, L2/infra teams, creators and more.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                  <h3 className="text-indigo-900 mb-3 text-lg font-semibold">What chains and tokens are supported?</h3>
                  <p className="text-indigo-900/70 leading-relaxed">
                    2025 launch chains: <strong>Solana</strong>, <strong>Stellar</strong>, <strong>Base</strong>.
                    Tokens include SOL, XLM, USDC, PYUSD (on Solana), and USDGLO (Glo Dollar) where available.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                  <h3 className="text-indigo-900 mb-3 text-lg font-semibold">How does the leaderboard work?</h3>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Projects earn points from each quiz based on funds raised and impact metrics. If your quiz uses
                    <strong> Glo Dollar</strong>, your score for that quiz gets <strong>doubled</strong>.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                  <h3 className="text-indigo-900 mb-3 text-lg font-semibold">What are the default splits?</h3>
                  <p className="text-indigo-900/70 leading-relaxed">
                    <strong>≥40% Charity</strong>, <strong>≤40% Host-controlled</strong> (prizes + optional host take),
                    and <strong>20% Platform</strong> to build tools for good. If you skip prizes/host take, that share rolls back to charity.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                  <h3 className="text-indigo-900 mb-3 text-lg font-semibold">Can we sponsor prizes instead of using room income?</h3>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Yes. You can add token prizes or sponsor digital assets (e.g., NFTs), which helps maximize the charity allocation.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                  <h3 className="text-indigo-900 mb-3 text-lg font-semibold">Do you custody funds?</h3>
                  <p className="text-indigo-900/70 leading-relaxed">
                    No. The campaign is smart-contract managed. Funds route on-chain per your configuration, directly to recipient wallets.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                  <h3 className="text-indigo-900 mb-3 text-lg font-semibold">What do platform fees cover?</h3>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Infrastructure, development, maintenance, audits, and new features that make transparent fundraising possible for everyone.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                  <h3 className="text-indigo-900 mb-3 text-lg font-semibold">Is this for online or in-person events?</h3>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Both. Run fully online with wallet-based join flows, or host in-person and let teams join on their phones.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                  <h3 className="text-indigo-900 mb-3 text-lg font-semibold">Can we run multiple quizzes?</h3>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Absolutely. Many communities run a warm-up plus a headline quiz. Each event contributes to your leaderboard total.
                  </p>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                  <h3 className="text-indigo-900 mb-3 text-lg font-semibold">How do we get started?</h3>
                  <p className="text-indigo-900/70 leading-relaxed">
                    Pledge now to book a short support session. When the campaign opens in November, this page will switch to a
                    <strong> Request Help / Demo</strong> flow for late joiners.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Trust Indicators */}
          <section className="px-4 py-12 bg-gray-50">
            <div className="container mx-auto max-w-6xl">
              <div className="text-center">
                <h2 className="text-indigo-900 mb-8 text-3xl md:text-4xl font-bold">Transparent by Design</h2>
                <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                  <div className="text-center">
                    <Shield className="mx-auto mb-3 h-12 w-12 text-indigo-600" />
                    <h3 className="font-semibold text-indigo-900 text-sm">Smart-Contract Managed (No Custody)</h3>
                  </div>
                  <div className="text-center">
                    <Globe className="mx-auto mb-3 h-12 w-12 text-green-600" />
                    <h3 className="font-semibold text-indigo-900 text-sm">Direct-to-Charity Routing</h3>
                  </div>
                  <div className="text-center">
                    <DollarSign className="mx-auto mb-3 h-12 w-12 text-blue-600" />
                    <h3 className="font-semibold text-indigo-900 text-sm">Splits: ≥40% Charity / ≤40% Host / 20% Platform</h3>
                  </div>
                  <div className="text-center">
                    <CheckCircle className="mx-auto mb-3 h-12 w-12 text-purple-600" />
                    <h3 className="font-semibold text-indigo-900 text-sm">Audit-Ready Reports</h3>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="px-4 py-12">
            <div className="container mx-auto max-w-6xl">
              <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-12 shadow-lg text-center text-white">
                <h2 className="mb-4 text-3xl md:text-4xl font-bold">Join the Web3 Impact Campaign (Nov–Jan)</h2>
                <p className="mb-8 text-lg opacity-90 max-w-3xl mx-auto leading-relaxed">
                  Pledge your community now to secure support and early recognition.
                </p>
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="inline-flex items-center space-x-3 rounded-xl bg-white px-10 py-4 text-xl font-bold text-indigo-600 transition-all hover:scale-105 hover:bg-indigo-50 shadow-lg"
                >
                  <span>Pledge Your Community</span>
                  <ArrowRight className="h-6 w-6" />
                </button>
                <p className="mt-4 text-sm opacity-75">Leaderboard launches in November.</p>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Modals */}
      {showWeb3Wizard && (
        <Web3QuizWizard
          key="web3-wizard-stable"
          selectedChain={selectedChain}
          onComplete={handleWeb3WizardComplete}
          onChainUpdate={handleChainUpdate}
        />
      )}

      {showJoinModal && (
        <QuizSocketProvider>
          <JoinRoomFlow
            key="stable-join-flow"
            onClose={() => setShowJoinModal(false)}
            onChainDetected={() => {}}
          />
        </QuizSocketProvider>
      )}
    </div>
  );
};

export default ImpactCampaignOverview;







