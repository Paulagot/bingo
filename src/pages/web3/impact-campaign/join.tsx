// src/pages/web3/impact-campaign/join.tsx
import React, { useMemo, useCallback, useState} from 'react';
import { SEO } from '../../../components/SEO';
import { Link } from 'react-router-dom';
import {
  Rocket,
  Users,
  PlusCircle,
  QrCode,
  Sparkles,
  Shield,
  Wallet,
  Trophy,
} from 'lucide-react';

import Web3QuizWizard from '../../../components/Quiz/Wizard/Web3QuizWizard';
import { JoinRoomFlow } from '../../../components/Quiz/joinroom/JoinRoomFlow';
import { QuizSocketProvider } from '../../../components/Quiz/sockets/QuizSocketProvider';
import type { SupportedChain } from '../../../chains/types';

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

// Simple local chain config for UI; ids should match your SupportedChain type
const CHAINS: Array<{
  id: SupportedChain;
  name: string;
  blurb: string;
  badge: string;
  gradient: string;
}> = [
  {
    id: 'stellar' as SupportedChain,
    name: 'Stellar testnet',
    blurb: 'Direct-to-charity friendly rails.',
    badge: 'XLM • USDC • USDGLO',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'solana' as SupportedChain,
    name: 'Solana Devnet',
    blurb: 'High-speed, low-fee blockchain.',
    badge: 'SOL • USDC',
    gradient: 'from-purple-500 to-pink-500',
  },
];

const JoinImpactCampaignPage: React.FC = () => {
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // ➕ Needed for the fullscreen GIFs in the copied section
  const [fullscreenGif, setFullscreenGif] = useState<'setup' | 'dashboard' | 'ingame' | 'reporting' | null>(null);

  const onPickChain = useCallback((c: SupportedChain) => {
    setSelectedChain(c);
    setShowWizard(true);
  }, []);

  const onWizardComplete = useCallback(() => {
    setShowWizard(false);
    setSelectedChain(null);
  }, []);

  const isAnyModalOpen = showWizard || showJoinModal;

  const pageTitle = useMemo(
    () => 'Host or Join a Web3 Quiz — Impact Campaign (Nov–Jan) | FundRaisely',
    []
  );

  // Structured data following SEO strategy
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Impact Campaign', item: abs('/web3/impact-campaign') },
      { '@type': 'ListItem', position: 4, name: 'Join', item: abs('/web3/impact-campaign/join') }
    ]
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Host or Join a Web3 Quiz — Impact Campaign',
    description: 'Spin up a Web3 quiz or join an existing room for the Web3 Impact Campaign. Choose Solana, Stellar, or Base and raise on-chain for verified charities.',
    url: abs('/web3/impact-campaign/join'),
    isPartOf: {
      '@type': 'WebSite',
      url: abs('/')
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title={pageTitle}
        description="Spin up a Web3 quiz or join an existing room for the Web3 Impact Campaign. Choose Solana, Stellar, or Base and raise on-chain for verified charities."
        keywords="host web3 quiz, join crypto fundraiser, blockchain charity quiz, Solana fundraising, Stellar fundraising, Base fundraising, DAO quiz host"
        type="website"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd]}
        domainStrategy="geographic"
      />

      {!isAnyModalOpen && (
        <>
          {/* Hero */}
          <section className="relative px-4 pt-12 pb-8">
            <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
            <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

            <div className="container relative z-10 mx-auto max-w-6xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
                <Sparkles className="h-4 w-4" /> Web3 Impact Campaign · Nov–Jan
              </span>

              <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
                Host or Join a Web3 Quiz
              </h1>

              <p className="mt-4 mx-auto max-w-3xl text-indigo-900/70 text-lg md:text-xl leading-relaxed">
                Create a quiz for your community or jump into an existing room. Smart-contract managed, no custody, audit-ready.
              </p>
            </div>
          </section>

          {/* Two paths: Host / Join */}
          <section className="px-4 py-12">
            <div className="container mx-auto max-w-6xl">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Host a Quiz */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                    <Rocket className="h-4 w-4" />
                    <span className="text-xs font-semibold">Host</span>
                  </div>

                  <h2 className="text-indigo-900 mb-3 text-2xl font-bold">Create a Web3 Quiz</h2>

                  <p className="text-indigo-900/80 mb-6 leading-relaxed">
                    Pick a chain, set your splits, add prizes, and go live. Your funds route on-chain with a minimum 40% to charity, up to 40% host-controlled (prizes + optional host take).
                  </p>

                     <p className="text-indigo-900/80 mb-6 leading-relaxed">
                    We are now live on Base Sepolia and Avalanche Fuji.  Solana testnet coming soon. We are going live on mainnet on Solana, Base and Avalanche for the campaign launch in November.
                  </p>

                  {/* Chain picker
                  <div className="mb-6">
                    <h3 className="text-indigo-900 mb-3 text-sm font-semibold">Choose Your Chain</h3>
                    <div className="grid gap-3">
                      {CHAINS.map((c) => (
                        <button
                          key={c.id as string}
                          onClick={() => onPickChain(c.id)}
                          className="group flex items-center gap-4 rounded-xl border border-indigo-100 bg-white p-4 text-left transition-all hover:border-indigo-300 hover:shadow-md"
                        >
                          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${c.gradient} shadow-md group-hover:shadow-lg transition-all`}>
                            <Wallet className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-indigo-900 mb-1">{c.name}</div>
                            <div className="text-xs text-indigo-900/60">{c.blurb}</div>
                            <div className="mt-2 inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                              {c.badge}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div> */}

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowWizard(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 shadow-md transition-colors"
                    >
                      <PlusCircle className="h-5 w-5" />
                      Launch Wizard
                    </button>
                  </div>
                </div>

                {/* Join a Quiz */}
                <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700">
                    <Users className="h-4 w-4" />
                    <span className="text-xs font-semibold">Join</span>
                  </div>

                  <h2 className="text-indigo-900 mb-3 text-2xl font-bold">Join an Existing Quiz</h2>

                  <p className="text-indigo-900/80 mb-6 leading-relaxed">
                    Have a room code or link from a host? Open the join flow, connect a wallet, select in-game extras (you will need them!), pay the fee and you're in.
                  </p>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <button
                      onClick={() => setShowJoinModal(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 shadow-md transition-colors"
                    >
                      <QrCode className="h-5 w-5" />
                      Join Room
                    </button>
                    <Link
                      to="/web3/impact-campaign/leaderboard"
                      className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-6 py-3 font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors"
                    >
                      <Trophy className="h-5 w-5" />
                      View Leaderboard
                    </Link>
                  </div>

                  {/* Trust strip */}
                  <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-purple-50 p-6">
                    <h3 className="text-indigo-900 mb-4 text-sm font-semibold">Why Join the Campaign?</h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <Shield className="mx-auto mb-2 h-6 w-6 text-indigo-600" />
                        <div className="text-[11px] font-semibold text-indigo-900">No Custody</div>
                      </div>
                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <Wallet className="mx-auto mb-2 h-6 w-6 text-indigo-600" />
                        <div className="text-[11px] font-semibold text-indigo-900">On-Chain Receipts</div>
                      </div>
                      <div className="rounded-lg bg-white p-3 shadow-sm">
                        <Trophy className="mx-auto mb-2 h-6 w-6 text-indigo-600" />
                        <div className="text-[11px] font-semibold text-indigo-900">Campaign Points</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===================== */}
          {/* COPIED SECTION STARTS */}
          {/* ===================== */}
          <section className="mx-auto max-w-7xl p-8">
            <div className="space-y-16">
              {/* Row 2: Setup Wizard Section */}
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
                {/* Left: Setup Steps */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-900">
                    Setup Wizard
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Set Basic Details</h3>
                        <p className="text-gray-600">Add your name, select chain, select fee currency and set price</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Configure Rounds</h3>
                        <p className="text-gray-600">Select a preconfigured quiz or customise your own</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Select Fundraising Extras</h3>
                        <p className="text-gray-600">Boost your fundraising and increase game excitement and fun</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Add Prizes and Sponsors</h3>
                        <p className="text-gray-600">Choose pool for prizes and you have 40% of the pool to control, you can give up to 5% to the host, and 35%-40% on prizes. Select the % prize distribution (1st place 100%). Or you can add NFTs or other assets to award as prizes leaving even more for the charity.  You can add up to 3 prizes</p>
                      </div>
                    </div>
                       <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">
                        Review
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Review and launch</h3>
                        <p className="text-gray-600">Review your settings, connect your wallet and lauch the contract by signing your wallet.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Setup GIF */}
                <div className="relative">
                  <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 shadow-2xl max-h-[700px] group">
                    <img
                      src="/quiz-setup-demo.gif"
                      alt="Quiz setup walkthrough - 4 easy steps"
                      className="h-full w-full object-contain"
                    />

                    <button
                      onClick={() => setFullscreenGif('setup')}
                      className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                      aria-label="View fullscreen"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>

                  <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-yellow-400 opacity-20 blur-2xl"></div>
                  <div className="absolute -top-4 -left-4 h-32 w-32 rounded-full bg-indigo-400 opacity-20 blur-2xl"></div>
                </div>
              </div>

              {/* Row 3: Dashboard View Section */}
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
                {/* Left: Dashboard GIF */}
                <div className="relative">
                  <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 shadow-2xl max-h-[700px] group">
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                      <img
                        src="/quiz-dashboard-demo.mp4"
                        alt="Quiz dashboard overview"
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <button
                      onClick={() => setFullscreenGif('dashboard')}
                      className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                      aria-label="View fullscreen"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>

                  <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-purple-400 opacity-20 blur-2xl"></div>
                  <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-pink-400 opacity-20 blur-2xl"></div>
                </div>

                {/* Right: Dashboard Steps */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-900">
                    Dashboard View
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Overview Tab</h3>
                        <p className="text-gray-600">Displays the quiz setting from the setup wizard.  There is also the QR code to share with players.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Asset Upload Panel</h3>
                        <p className="text-gray-600">All prizes must be added to the contract before you can lauch the game room.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Player Panel</h3>
                        <p className="text-gray-600">As players join, this panel will update real time</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Payments panel</h3>
                        <p className="text-gray-600">Track fundraising. See total raised. Reconciliations only availabe in web2 mode, web3 has blockchain.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">
                        5
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Launch</h3>
                        <p className="text-gray-600">When all players have joined and assets if required have been uploaded, launch the game</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 4: In-Game View Section */}
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
                {/* Left: In-Game Steps */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-900">
                    In-Game View - Host
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Between Round Screens</h3>
                        <p className="text-gray-600">At the start of each quiz and before each new round, the host will see round information, such as the number of questions and points.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Asking Phase</h3>
                        <p className="text-gray-600">Questions are delivered automatically and move on at the end of the timer. The host should read each question and possible answers to participants in a wipeout or general round. In a speed round, the host does not see the questions, but instead a live stats board.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Round Review Phase</h3>
                        <p className="text-gray-600">Manually review each question with participants, stats are provided for each question and then a round leaderboard</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Player Activity Notifications</h3>
                        <p className="text-gray-600">When a player uses an extra like Restore points or Steal points, the host will see a notification at the bottom of the screen</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                        5
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Tie-Breaker</h3>
                        <p className="text-gray-600">Tie breakers are automatically detected and scored — the host just needs to call the players and start the round.</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                        6
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Leaderboard</h3>
                        <p className="text-gray-600">There are round leaderboards and overall leaderboards, the top players being the winners</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                        7
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Game End</h3>
                        <p className="text-gray-600">Engage the participants with detailed and fun quiz stats.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: In-Game GIF */}
                <div className="relative">
                  <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 shadow-2xl max-h-[700px] group">
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                      <div className="text-center space-y-4 p-8">
                        <div className="text-6xl">🎮</div>
                        <p className="text-lg text-gray-600 font-medium">In-Game Demo Coming Soon</p>
                        <p className="text-sm text-gray-500">Replace with /quiz-ingame-demo.gif</p>
                      </div>
                    </div>
                    {/* If you have the GIF, swap the above for:
                    <img
                      src="/quiz-ingame-demo.gif"
                      alt="In-game player view"
                      className="h-full w-full object-contain"
                    />
                    */}
                    <button
                      onClick={() => setFullscreenGif('ingame')}
                      className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                      aria-label="View fullscreen"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>

                  <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-emerald-400 opacity-20 blur-2xl"></div>
                  <div className="absolute -top-4 -left-4 h-32 w-32 rounded-full bg-teal-400 opacity-20 blur-2xl"></div>
                </div>
              </div>

              {/* Row 5: End of Game Reporting Section */}
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
                {/* Left: Reporting GIF */}
                <div className="relative">
                  <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 shadow-2xl max-h-[700px] group">
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                      <div className="text-center space-y-4 p-8">
                        <div className="text-6xl">📈</div>
                        <p className="text-lg text-gray-600 font-medium">Reporting Demo Coming Soon</p>
                        <p className="text-sm text-gray-500">Replace with /quiz-reporting-demo.gif</p>
                      </div>
                    </div>
                    {/* If you have the GIF, swap the above for:
                    <img
                      src="/quiz-reporting-demo.gif"
                      alt="End of game reporting and analytics"
                      className="h-full w-full object-contain"
                    />
                    */}
                    <button
                      onClick={() => setFullscreenGif('reporting')}
                      className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                      aria-label="View fullscreen"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>

                  <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-amber-400 opacity-20 blur-2xl"></div>
                  <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-orange-400 opacity-20 blur-2xl"></div>
                </div>

                {/* Right: Reporting Steps */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-900">
                    End of Game Screen and Prize distribution
                  </h2>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Final Results & Winners</h3>
                        <p className="text-gray-600">View complete leaderboard and announce prize winners and distribute the winnings by signing the smart contract</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Fundraising Summary</h3>
                        <p className="text-gray-600">See total funds raised, breakdown by source, and payment status</p>
                      </div>
                    </div>

           

                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Engagement Analytics</h3>
                        <p className="text-gray-600">Review participation stats, round performance, and team insights</p>
                      </div>
                    </div>
                        <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Distribute prizes via smart contract</h3>
                        <p className="text-gray-600">Host distributes the prizes locked in the smart contract</p>
                      </div>
                    </div>

                    
                  </div>
                </div>
              </div>

              {/* Fullscreen GIF Modal (shared by the section) */}
              {fullscreenGif && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
                  onClick={() => setFullscreenGif(null)}
                >
                  <button
                    onClick={() => setFullscreenGif(null)}
                    className="absolute top-4 right-4 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                    aria-label="Close fullscreen"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {fullscreenGif === 'setup' ? (
                    <img
                      src="/quiz-setup-demo.gif"
                      alt="Quiz setup walkthrough - fullscreen view"
                      className="max-h-[90vh] max-w-[90vw] object-contain"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : fullscreenGif === 'dashboard' ? (
                    <div className="max-h-[90vh] max-w-[90vw] bg-white rounded-lg p-8 text-center">
                      <p className="text-gray-600">Dashboard GIF placeholder</p>
                    </div>
                  ) : fullscreenGif === 'ingame' ? (
                    <div className="max-h-[90vh] max-w-[90vw] bg-white rounded-lg p-8 text-center">
                      <p className="text-gray-600">In-Game GIF placeholder</p>
                    </div>
                  ) : (
                    <div className="max-h-[90vh] max-w-[90vw] bg-white rounded-lg p-8 text-center">
                      <p className="text-gray-600">Reporting GIF placeholder</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
          {/* =================== */}
          {/* COPIED SECTION ENDS */}
          {/* =================== */}

          {/* Supported chains & tokens (concise recap) */}
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
                    <p className="text-sm text-indigo-900/70">SOL · USDC · PYUSD</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                        AVAX
                      </div>
                      <h3 className="text-indigo-900 font-bold text-lg">Avalanche</h3>
                    </div>
                    <p className="text-sm text-indigo-900/70"> USDC · USDGLO</p>
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
                    <span>Using <strong>Glo Dollar (USDGLO)</strong> doubles your quiz points on the campaign leaderboard</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="px-4 py-12">
            <div className="container mx-auto max-w-6xl">
              <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-12 shadow-lg text-center text-white">
                <h2 className="mb-4 text-3xl md:text-4xl font-bold">Ready to Make an Impact?</h2>
                <p className="mb-8 text-lg opacity-90 max-w-3xl mx-auto leading-relaxed">
                  Whether you're hosting or joining, every quiz contributes to transparent, on-chain fundraising for verified charities. Let's build something meaningful together.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-lg font-bold text-indigo-600 hover:scale-105 hover:bg-indigo-50 shadow-lg transition-all"
                  >
                    <Rocket className="h-5 w-5" />
                    Host a Quiz
                  </button>
                  <button
                    onClick={() => setShowJoinModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white/10 border-2 border-white px-8 py-4 text-lg font-bold text-white hover:bg-white/20 transition-all"
                  >
                    <Users className="h-5 w-5" />
                    Join a Quiz
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* Modals */}
      {showWizard && (
        <Web3QuizWizard
          key="impact-join-wizard"
          selectedChain={selectedChain}
          onComplete={onWizardComplete}
          onChainUpdate={setSelectedChain}
        />
      )}

      {showJoinModal && (
        <QuizSocketProvider>
          <JoinRoomFlow
            key="impact-join-flow"
            onClose={() => setShowJoinModal(false)}
            onChainDetected={() => {
              /* optional: hook chain detection to UX here */
            }}
          />
        </QuizSocketProvider>
      )}
    </div>
  );
};

export default JoinImpactCampaignPage;


