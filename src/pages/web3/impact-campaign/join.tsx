import React, { useMemo, useCallback, useState } from 'react';
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
import { JoinRoomFlow } from '../../../components/Quiz/joinroom/JoinRoomFlow1.tsx';
import { QuizSocketProvider } from '../../../components/Quiz/sockets/QuizSocketProvider';
import type { SupportedChain } from '../../../chains/types';

/** ─────────────────────────────────────────────────────────────────────────────
 * Helpers
 * ────────────────────────────────────────────────────────────────────────────*/
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin)
    return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

/** Reusable YouTube block (privacy-enhanced, CLS-safe, lazy) */
type YouTubeBlockProps = {
  title: string;
  /** Full URL or just the 11-char ID */
  youtubeUrlOrId: string;
  className?: string;
};
const YouTubeBlock: React.FC<YouTubeBlockProps> = ({ title, youtubeUrlOrId, className }) => {
  const idMatch = youtubeUrlOrId.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  const id = idMatch ? idMatch[1] : youtubeUrlOrId; // assume raw ID if not matched
  const embed = `https://www.youtube-nocookie.com/embed/${id}`;
  const poster = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <div className={`relative w-full ${className ?? ''}`}>
      {/* 16:9 aspect to avoid layout shift */}
      <div className="relative w-full" style={{ paddingTop: '56.25%' }}>
        <iframe
          title={title}
          loading="lazy"
          src={`${embed}?rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          className="absolute inset-0 h-full w-full rounded-2xl"
        />
      </div>
      <noscript>
        <a href={`https://www.youtube.com/watch?v=${id}`} aria-label={title}>
          <img src={poster} alt={title} className="h-full w-full object-contain" />
        </a>
      </noscript>
    </div>
  );
};

/** ─────────────────────────────────────────────────────────────────────────────
 * Replace these with your real YouTube IDs when ready
 * ────────────────────────────────────────────────────────────────────────────*/
const SETUP_VIDEO_ID = 'v0mutwIyqb0';      // e.g., 'AbCdEfGhIJK'
const DASHBOARD_VIDEO_ID = 'Sf9e8_IGdFU';   // placeholder
const INGAME_VIDEO_ID = 'd5zyT5zf-wI';
const REPORTING_VIDEO_ID = 'REPORTING01_';

const JoinImpactCampaignPage: React.FC = () => {
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Shared fullscreen viewer state
  const [fullscreenMedia, setFullscreenMedia] = useState<'setup' | 'dashboard' | 'ingame' | 'reporting' | null>(null);

  const onWizardComplete = useCallback(() => {
    setShowWizard(false);
    setSelectedChain(null);
  }, []);

  const isAnyModalOpen = showWizard || showJoinModal;

  const pageTitle = useMemo(
    () => 'Host or Join a Web3 Quiz — Impact Campaign (date TBC 2026) | FundRaisely',
    []
  );

  /* ──────────────────────────────────────────────────────────────────────────
   * SEO Structured Data
   * For YouTube: contentUrl -> watch URL, embedUrl -> nocookie embed URL
   * ────────────────────────────────────────────────────────────────────────*/
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
    description:
      'Spin up a Web3 quiz or join an existing room for the Web3 Impact Campaign. Choose Solana, Stellar, or Base and raise on-chain for verified charities.',
    url: abs('/web3/impact-campaign/join'),
    isPartOf: { '@type': 'WebSite', url: abs('/') },
  };

  const videoObjects = [
    {
      '@type': 'VideoObject',
      name: 'Quiz Setup Walkthrough',
      description: 'Four-step wizard to launch your Web3 quiz.',
      thumbnailUrl: [`https://i.ytimg.com/vi/${SETUP_VIDEO_ID}/hqdefault.jpg`],
      uploadDate: '2025-11-01',
      contentUrl: `https://www.youtube.com/watch?v=${SETUP_VIDEO_ID}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${SETUP_VIDEO_ID}`,
      publisher: {
        '@type': 'Organization',
        name: 'FundRaisely',
        logo: { '@type': 'ImageObject', url: abs('/images/logo-512.png'), width: 512, height: 512 },
      },
    },
    {
      '@type': 'VideoObject',
      name: 'Host Dashboard Overview',
      description: 'Overview, prizes, players, payments, launch.',
      thumbnailUrl: [`https://i.ytimg.com/vi/${DASHBOARD_VIDEO_ID}/hqdefault.jpg`],
      uploadDate: '2025-11-01',
      contentUrl: `https://www.youtube.com/watch?v=${DASHBOARD_VIDEO_ID}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${DASHBOARD_VIDEO_ID}`,
      publisher: {
        '@type': 'Organization',
        name: 'FundRaisely',
        logo: { '@type': 'ImageObject', url: abs('/images/logo-512.png'), width: 512, height: 512 },
      },
    },
    {
      '@type': 'VideoObject',
      name: 'In-Game Host View',
      description: 'Round intros, asking phase, reviews, extras, tie-breakers.',
      thumbnailUrl: [`https://i.ytimg.com/vi/${INGAME_VIDEO_ID}/hqdefault.jpg`],
      uploadDate: '2025-11-01',
      contentUrl: `https://www.youtube.com/watch?v=${INGAME_VIDEO_ID}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${INGAME_VIDEO_ID}`,
      publisher: {
        '@type': 'Organization',
        name: 'FundRaisely',
        logo: { '@type': 'ImageObject', url: abs('/images/logo-512.png'), width: 512, height: 512 },
      },
    },
    {
      '@type': 'VideoObject',
      name: 'End-of-Game & Reporting',
      description: 'Final results, fundraising summary, analytics, and prize distribution.',
      thumbnailUrl: [`https://i.ytimg.com/vi/${REPORTING_VIDEO_ID}/hqdefault.jpg`],
      uploadDate: '2025-11-01',
      contentUrl: `https://www.youtube.com/watch?v=${REPORTING_VIDEO_ID}`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${REPORTING_VIDEO_ID}`,
      publisher: {
        '@type': 'Organization',
        name: 'FundRaisely',
        logo: { '@type': 'ImageObject', url: abs('/images/logo-512.png'), width: 512, height: 512 },
      },
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title={pageTitle}
        description="Spin up a Web3 quiz or join an existing room for the Web3 Impact Campaign. Choose Solana, Stellar, or Base and raise on-chain for verified charities."
        keywords="host web3 quiz, join crypto fundraiser, blockchain charity quiz, Solana fundraising, Stellar fundraising, Base fundraising, DAO quiz host"
        type="website"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, ...videoObjects]}
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
                <Sparkles className="h-4 w-4" /> Web3 Impact Campaign · Date TBC 2026
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
                    We are now live on Base Sepolia and Avalanche Fuji and Solana Devent. We are going live on mainnet on Solana, Base and Avalanche for the campaign launch date TBC'.
                  </p>

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

          {/* Feature / Demo Sections */}
          <section className="mx-auto max-w-7xl p-8">
            <div className="space-y-16">
              {/* Row 2: Setup Wizard */}
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
                {/* Left: Steps */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-900">Setup Wizard</h2>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">1</div>
                      <div>
                        <h3 className="font-semibold text-lg">Set Basic Details</h3>
                        <p className="text-gray-600">Add your name, select chain, select fee currency, select charity and set price</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">2</div>
                      <div>
                        <h3 className="font-semibold text-lg">Configure Rounds</h3>
                        <p className="text-gray-600">Select a preconfigured quiz</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">3</div>
                      <div>
                        <h3 className="font-semibold text-lg">Select Fundraising Extras</h3>
                        <p className="text-gray-600">Boost your fundraising and increase game excitement and fun</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">4</div>
                      <div>
                        <h3 className="font-semibold text-lg">Add Prizes and Sponsors</h3>
                        <p className="text-gray-600">Choose prize pool, define splits, or add NFTs/assets for prizes.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 font-bold flex-shrink-0">Review</div>
                      <div>
                        <h3 className="font-semibold text-lg">Review and launch</h3>
                        <p className="text-gray-600">Review settings, connect wallet and deploy by signing.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Setup YouTube */}
                <div className="relative">
                  <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 shadow-2xl max-h-[700px] group">
                    <YouTubeBlock
                      title="Quiz setup walkthrough - 4 easy steps"
                      youtubeUrlOrId={SETUP_VIDEO_ID}
                      className="h-full w-full"
                    />
                    <button
                      onClick={() => setFullscreenMedia('setup')}
                      className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                      aria-label="View fullscreen"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-yellow-400 opacity-20 blur-2xl" />
                  <div className="absolute -top-4 -left-4 h-32 w-32 rounded-full bg-indigo-400 opacity-20 blur-2xl" />
                </div>
              </div>

              {/* Row 3: Dashboard */}
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
                {/* Left: Dashboard YouTube */}
                <div className="relative">
                  <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 shadow-2xl max-h-[700px] group">
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
                      <YouTubeBlock
                        title="Quiz dashboard overview"
                        youtubeUrlOrId={DASHBOARD_VIDEO_ID}
                        className="h-full w-full"
                      />
                    </div>
                    <button
                      onClick={() => setFullscreenMedia('dashboard')}
                      className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                      aria-label="View fullscreen"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-purple-400 opacity-20 blur-2xl" />
                  <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-pink-400 opacity-20 blur-2xl" />
                </div>

                {/* Right: Steps */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-900">Dashboard View</h2>
                  <div className="space-y-4">
                    {[
                      ['Overview Tab', 'Displays settings from the setup wizard and a QR code for players.'],
                      ['Asset Upload Panel', 'All prizes must be added to the contract before launch.'],
                      ['Player Panel', 'Real-time player updates as they join.'],
                      ['Payments panel', 'Track totals. (Web2 reconciliation only; Web3 is on-chain.)'],
                      ['Launch', 'When players are ready and assets uploaded, launch the game.'],
                    ].map(([t, d], i) => (
                      <div className="flex items-start gap-3" key={t}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600 font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{t}</h3>
                          <p className="text-gray-600">{d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Row 4: In-Game */}
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
                {/* Left: Steps */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-900">In-Game View - Host</h2>
                  <div className="space-y-4">
                    {[
                      ['Between Round Screens', 'Round intros with question counts and points.'],
                      ['Asking Phase', 'Timed delivery; host reads questions (or stats board in Speed round).'],
                      ['Round Review Phase', 'Review each question with stats, then round leaderboard.'],
                      ['Player Activity Notifications', 'Extras like Restore/Steal points show as notices.'],
                      ['Tie-Breaker', 'Auto-detected and scored; host can initiate.'],
                      ['Leaderboard', 'Round and overall leaderboards determine winners.'],
                      ['Game End', 'Engage participants with detailed quiz stats.'],
                    ].map(([t, d], i) => (
                      <div className="flex items-start gap-3" key={t}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{t}</h3>
                          <p className="text-gray-600">{d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: YouTube */}
                <div className="relative">
                  <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 shadow-2xl max-h-[700px] group">
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
                      <YouTubeBlock
                        title="In-game player/host view demo"
                        youtubeUrlOrId={INGAME_VIDEO_ID}
                        className="h-full w-full"
                      />
                    </div>
                    <button
                      onClick={() => setFullscreenMedia('ingame')}
                      className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                      aria-label="View fullscreen"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-full bg-emerald-400 opacity-20 blur-2xl" />
                  <div className="absolute -top-4 -left-4 h-32 w-32 rounded-full bg-teal-400 opacity-20 blur-2xl" />
                </div>
              </div>

              {/* Row 5: Reporting */}
              <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-start">
                {/* Left: YouTube */}
                <div className="relative">
                  <div className="aspect-[1874/986] overflow-hidden rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 shadow-2xl max-h-[700px] group">
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                      <YouTubeBlock
                        title="End of game reporting and analytics"
                        youtubeUrlOrId={REPORTING_VIDEO_ID}
                        className="h-full w-full"
                      />
                    </div>
                    <button
                      onClick={() => setFullscreenMedia('reporting')}
                      className="absolute top-4 right-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
                      aria-label="View fullscreen"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    </button>
                  </div>
                  <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-amber-400 opacity-20 blur-2xl" />
                  <div className="absolute -top-4 -right-4 h-32 w-32 rounded-full bg-orange-400 opacity-20 blur-2xl" />
                </div>

                {/* Right: Steps */}
                <div className="space-y-6">
                  <h2 className="text-3xl font-bold text-gray-900">End of Game Screen and Prize distribution</h2>
                  <div className="space-y-4">
                    {[
                      ['Final Results & Winners', 'View overall leaderboard, announce winners, and distribute prizes via contract.'],
                      ['Fundraising Summary', 'Totals raised, source breakdown, payment status.'],
                      ['Engagement Analytics', 'Participation stats, round performance, team insights.'],
                      ['Smart Contract Distribution', 'Prizes are distributed from the on-chain escrow.'],
                    ].map(([t, d], i) => (
                      <div className="flex items-start gap-3" key={t}>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-600 font-bold flex-shrink-0">
                          {i + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg">{t}</h3>
                          <p className="text-gray-600">{d}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fullscreen Modal (YouTube) */}
              {fullscreenMedia && (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
                  onClick={() => setFullscreenMedia(null)}
                >
                  <button
                    onClick={() => setFullscreenMedia(null)}
                    className="absolute top-4 right-4 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                    aria-label="Close fullscreen"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  <div className="max-h-[90vh] max-w-[90vw] w-full" onClick={(e) => e.stopPropagation()}>
                    {fullscreenMedia === 'setup' && (
                      <YouTubeBlock title="Quiz setup walkthrough - fullscreen" youtubeUrlOrId={SETUP_VIDEO_ID} />
                    )}
                    {fullscreenMedia === 'dashboard' && (
                      <YouTubeBlock title="Host dashboard overview - fullscreen" youtubeUrlOrId={DASHBOARD_VIDEO_ID} />
                    )}
                    {fullscreenMedia === 'ingame' && (
                      <YouTubeBlock title="In-game view - fullscreen" youtubeUrlOrId={INGAME_VIDEO_ID} />
                    )}
                    {fullscreenMedia === 'reporting' && (
                      <YouTubeBlock title="End-of-game & reporting - fullscreen" youtubeUrlOrId={REPORTING_VIDEO_ID} />
                    )}
                  </div>
                </div>
              )}
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
                    <p className="text-sm text-indigo-900/70"> · USDC · PYUSD</p>
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

          {/* CTA */}
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




