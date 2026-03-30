// src/pages/web3/quiz.tsx
import React, { useState, useCallback, useMemo } from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';

import {
  Rocket,
  PlusCircle,
  Trophy,
  Crosshair,
  Target,
  Wallet,
  Shield,
  Globe,
  Users,
  MessageCircle,
  BadgeCheck,
  Lock,
  Coins,
  ArrowRight,
} from 'lucide-react';

import Web3QuizWizard from '../../components/Quiz/Wizard/Web3QuizWizard';
import type { SupportedChain } from '../../chains/types';

/* -------------------------------------------------------------------------- */
/* URL helpers — reads from browser so both .ie and .co.uk are handled         */
/* -------------------------------------------------------------------------- */
function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin)
    return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

/* -------------------------------------------------------------------------- */
/* YouTube embed — privacy-enhanced, CLS-safe, lazy                            */
/* -------------------------------------------------------------------------- */
type YouTubeBlockProps = {
  title: string;
  youtubeUrlOrId: string;
  className?: string;
};

const YouTubeBlock: React.FC<YouTubeBlockProps> = ({ title, youtubeUrlOrId, className }) => {
  const idMatch = youtubeUrlOrId.match(/(?:v=|youtu\.be\/|embed\/)([A-Za-z0-9_-]{11})/);
  const id = idMatch ? idMatch[1] : youtubeUrlOrId;
  const embed = `https://www.youtube-nocookie.com/embed/${id}`;
  const poster = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

  return (
    <div className={`relative w-full ${className ?? ''}`}>
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

/* -------------------------------------------------------------------------- */
/* Video IDs                                                                    */
/* -------------------------------------------------------------------------- */
const SETUP_VIDEO_ID = 'v0mutwIyqb0';
const DASHBOARD_VIDEO_ID = 'Sf9e8_IGdFU';
const INGAME_VIDEO_ID = 'd5zyT5zf-wI';
const REPORTING_VIDEO_ID = 'REPORTING01_';

/* -------------------------------------------------------------------------- */
/* Design tokens (identical to rest of Web3 hub)                               */
/* -------------------------------------------------------------------------- */
const W3Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`rounded-2xl border border-[#1e2d42] bg-[#0f1520] p-6 ${className}`}>
    {children}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-[#a3f542]/30 bg-[#a3f542]/10 px-4 py-1.5 font-mono text-sm font-semibold uppercase tracking-widest text-[#a3f542]">
    {children}
  </span>
);

/* -------------------------------------------------------------------------- */
/* Step list item                                                               */
/* -------------------------------------------------------------------------- */
const Step: React.FC<{
  n: string;
  title: string;
  body: string;
  color: string;
  bg: string;
}> = ({ n, title, body, color, bg }) => (
  <div className="flex items-start gap-3">
    <div
      className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-mono text-sm font-bold ${bg} ${color}`}
    >
      {n}
    </div>
    <div>
      <h3 className="mb-1 font-mono text-base font-bold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-white/50">{body}</p>
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Fullscreen video modal                                                       */
/* -------------------------------------------------------------------------- */
type VideoKey = 'setup' | 'dashboard' | 'ingame' | 'reporting';

const FullscreenModal: React.FC<{
  which: VideoKey;
  onClose: () => void;
}> = ({ which, onClose }) => {
  const map: Record<VideoKey, { id: string; title: string }> = {
    setup: { id: SETUP_VIDEO_ID, title: 'Quiz setup walkthrough' },
    dashboard: { id: DASHBOARD_VIDEO_ID, title: 'Host dashboard overview' },
    ingame: { id: INGAME_VIDEO_ID, title: 'In-game host view' },
    reporting: { id: REPORTING_VIDEO_ID, title: 'End of game and reporting' },
  };
  const { id, title } = map[which];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label="Close fullscreen"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div
        className="w-full max-w-[90vw]"
        onClick={e => e.stopPropagation()}
      >
        <YouTubeBlock title={`${title} fullscreen`} youtubeUrlOrId={id} />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Video section — alternates text/video left-right                            */
/* -------------------------------------------------------------------------- */
const VideoSection: React.FC<{
  videoKey: VideoKey;
  title: string;
  steps: [string, string][];
  stepColor: string;
  stepBg: string;
  reverse?: boolean;
  onExpand: (k: VideoKey) => void;
}> = ({ videoKey, title, steps, stepColor, stepBg, reverse = false, onExpand }) => {
  const videoId =
    videoKey === 'setup'
      ? SETUP_VIDEO_ID
      : videoKey === 'dashboard'
      ? DASHBOARD_VIDEO_ID
      : videoKey === 'ingame'
      ? INGAME_VIDEO_ID
      : REPORTING_VIDEO_ID;

  const textCol = (
    <div className="space-y-4">
      <h2 className="font-mono text-2xl font-bold text-white">{title}</h2>
      <div className="space-y-3">
        {steps.map(([t, d], i) => (
          <Step
            key={t}
            n={String(i + 1)}
            title={t}
            body={d}
            color={stepColor}
            bg={stepBg}
          />
        ))}
      </div>
    </div>
  );

  const videoCol = (
    <div className="group relative">
      <YouTubeBlock title={title} youtubeUrlOrId={videoId} className="rounded-2xl" />
      <button
        onClick={() => onExpand(videoKey)}
        className="absolute right-4 top-4 rounded-lg bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
        aria-label="View fullscreen"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
          />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
      {reverse ? (
        <>
          {videoCol}
          {textCol}
        </>
      ) : (
        <>
          {textCol}
          {videoCol}
        </>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                         */
/* -------------------------------------------------------------------------- */
const Web3QuizPage: React.FC = () => {
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [fullscreen, setFullscreen] = useState<VideoKey | null>(null);

  const onWizardComplete = useCallback(() => {
    setShowWizard(false);
    setSelectedChain(null);
  }, []);

  /* ── JSON-LD ── */
  const breadcrumbsJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising', item: abs('/web3') },
        { '@type': 'ListItem', position: 3, name: 'Host a Quiz', item: abs('/web3/quiz') },
      ],
    }),
    []
  );

  const webPageJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Host a Web3 Quiz Night: On-Chain Fundraising with Smart Contract Payouts | FundRaisely',
      description:
        'Host a live Web3 quiz night for your community on Solana or Base. Smart contract payouts to host, winner, and charity the moment the event ends. Set up in minutes.',
      url: abs('/web3/quiz'),
      isPartOf: { '@type': 'WebSite', url: abs('/') },
    }),
    []
  );

  const videoObjects = useMemo(
    () => [
      {
        '@type': 'VideoObject',
        name: 'Quiz Setup Walkthrough',
        description: 'Four-step wizard to launch your Web3 quiz on Solana or Base.',
        thumbnailUrl: [`https://i.ytimg.com/vi/${SETUP_VIDEO_ID}/hqdefault.jpg`],
        uploadDate: '2025-11-01',
        contentUrl: `https://www.youtube.com/watch?v=${SETUP_VIDEO_ID}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${SETUP_VIDEO_ID}`,
      },
      {
        '@type': 'VideoObject',
        name: 'Host Dashboard Overview',
        description: 'Overview, players, payments and launch.',
        thumbnailUrl: [`https://i.ytimg.com/vi/${DASHBOARD_VIDEO_ID}/hqdefault.jpg`],
        uploadDate: '2025-11-01',
        contentUrl: `https://www.youtube.com/watch?v=${DASHBOARD_VIDEO_ID}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${DASHBOARD_VIDEO_ID}`,
      },
      {
        '@type': 'VideoObject',
        name: 'In-Game Host View',
        description: 'Round intros, asking phase, leaderboard, tie-breakers.',
        thumbnailUrl: [`https://i.ytimg.com/vi/${INGAME_VIDEO_ID}/hqdefault.jpg`],
        uploadDate: '2025-11-01',
        contentUrl: `https://www.youtube.com/watch?v=${INGAME_VIDEO_ID}`,
        embedUrl: `https://www.youtube-nocookie.com/embed/${INGAME_VIDEO_ID}`,
      },
    ],
    []
  );

  /* ── Render ── */
  return (
    <>
      {showWizard ? (
        <Web3QuizWizard
          key="web3-quiz-wizard"
          selectedChain={selectedChain}
          onComplete={onWizardComplete}
          onChainUpdate={setSelectedChain}
        />
      ) : (
        <div className="min-h-screen w-full overflow-x-hidden bg-[#0a0e14]">

          {/* Grid texture */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(163,245,66,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(163,245,66,0.03) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          <SEO
            title="Host a Web3 Quiz Night: On-Chain Fundraising with Smart Contract Payouts | FundRaisely"
            description="Host a live Web3 quiz night for your community on Solana or Base. Smart contract payouts to host, winner, and charity the moment the event ends. Set up in minutes — no blockchain experience needed."
            ukKeywords="web3 quiz night uk, host crypto fundraiser uk, blockchain quiz fundraising uk, solana quiz uk, base network quiz uk, on-chain charity quiz"
            ieKeywords="web3 quiz night ireland, host crypto fundraiser ireland, blockchain quiz fundraising ireland, solana quiz ireland, on-chain charity events ireland"
            keywords="host web3 quiz, crypto fundraising quiz, blockchain quiz night, solana quiz fundraiser, base network fundraising, smart contract quiz, on-chain charity quiz, web3 community event"
            type="website"
            domainStrategy="geographic"
            structuredData={[breadcrumbsJsonLd, webPageJsonLd, ...videoObjects]}
            breadcrumbs={[
              { name: 'Home', item: '/' },
              { name: 'Web3 Fundraising', item: '/web3' },
              { name: 'Host a Quiz', item: '/web3/quiz' },
            ]}
          />

          <Web3Header />

          {/* ============================================================ */}
          {/* Hero                                                           */}
          {/* ============================================================ */}
          <section className="relative z-10 pb-12 pt-16">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center text-center">
                <SectionLabel><Trophy className="h-4 w-4" /> Web3 Quiz Night</SectionLabel>

                <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
                  Host a quiz. <span className="text-[#a3f542]">Earn.</span> Raise for good.
                </h1>

                <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/70">
                  Run a live scored quiz for your community on Solana or Base. Players pay their entry fee
                  into a smart contract. When the last question lands, the contract pays out the winner,
                  your host cut, and the charity automatically. No chasing payments. No admin.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono text-lg font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
                  >
                    <PlusCircle className="h-5 w-5" /> Launch Quiz Wizard
                  </button>
                  <a
                    href="/web3/elimination"
                    className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-6 py-4 font-mono font-semibold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
                  >
                    <Crosshair className="h-4 w-4" /> Try Elimination instead
                  </a>
                  <a
                    href="/web3"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-4 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
                  >
                    <Target className="h-4 w-4" /> Web3 overview
                  </a>
                </div>

                {/* Stat strip */}
                <div className="mt-12 flex w-full flex-wrap justify-center gap-8 border-t border-[#1e2d42] pt-8 sm:justify-between">
                  {[
                    { value: '25%', label: 'You earn as host' },
                    { value: '30%', label: 'Winner prize' },
                    { value: '30%', label: 'To charity' },
                    { value: 'SOL + BASE', label: 'Supported chains' },
                  ].map(({ value, label }) => (
                    <div key={label} className="text-center">
                      <p className="font-mono text-2xl font-bold text-white">{value}</p>
                      <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-white/30">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Payout split                                                   */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <SectionLabel><Coins className="h-4 w-4" /> Payout split</SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Every euro, accounted for. <span className="text-[#a3f542]">In the contract.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-white/50">
                  The split is locked in when you deploy the contract. Players see exactly where their entry fee
                  goes before they join. Nobody can change it after the event is live.
                </p>
              </div>

              <W3Card className="border-[#a3f542]/20 mx-auto max-w-2xl">
                <div className="flex flex-wrap justify-center gap-4 py-2">
                  {[
                    { label: 'You earn', pct: '25%', accent: 'border-[#a3f542]/20 bg-[#a3f542]/10', text: 'text-[#a3f542]' },
                    { label: 'Winner', pct: '30%', accent: 'border-amber-400/20 bg-amber-400/10', text: 'text-amber-400' },
                    { label: 'Charity', pct: '30%', accent: 'border-[#6ef0d4]/20 bg-[#6ef0d4]/10', text: 'text-[#6ef0d4]' },
                    { label: 'Platform', pct: '15%', accent: 'border-[#1e2d42] bg-white/5', text: 'text-white/40' },
                  ].map(({ label, pct, accent, text }) => (
                    <div key={label} className={`flex flex-col items-center rounded-xl border px-8 py-5 ${accent}`}>
                      <span className={`font-mono text-3xl font-bold ${text}`}>{pct}</span>
                      <span className="mt-1 text-sm font-medium text-white/50">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-sm leading-relaxed text-white/40">
                  All four recipients are paid simultaneously in a single contract execution the moment the event ends.
                </p>
              </W3Card>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Setup wizard walkthrough                                       */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-10 text-center">
                <SectionLabel><Rocket className="h-4 w-4" /> Setup wizard</SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Live in minutes. <span className="text-[#a3f542]">No blockchain experience needed.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-white/50">
                  The four-step wizard handles chain selection, charity, entry fee, questions, and contract
                  deployment. Watch the walkthrough below, then hit the button and go live.
                </p>
              </div>

              <div className="space-y-16">

                {/* Step 1: Setup wizard */}
                <VideoSection
                  videoKey="setup"
                  title="Step 1: Setup Wizard"
                  steps={[
                    ['Set basic details', 'Choose your event name, select your chain (Solana or Base), set the entry fee currency, select a verified charity, and set the entry price.'],
                    ['Configure rounds', 'Select a preconfigured quiz. Questions, answers, and scoring are all handled for you.'],
                    ['Select fundraising extras', 'Add extras that boost fundraising and increase excitement during the game.'],
                    ['Review and launch', 'Review all settings, connect your wallet, and deploy the smart contract by signing. Your event is live.'],
                  ]}
                  stepColor="text-[#a3f542]"
                  stepBg="bg-[#a3f542]/10"
                  onExpand={setFullscreen}
                />

                {/* Step 2: Dashboard */}
                <VideoSection
                  videoKey="dashboard"
                  title="Step 2: Host Dashboard"
                  steps={[
                    ['Overview tab', 'Displays your event settings and a QR code players can scan to join.'],
                    ['Player panel', 'Tracks players in real time as they connect their wallets and join.'],
                    ['Payments panel', 'Monitor entry fee totals as players pay into the contract.'],
                    ['Launch', 'Once players are ready, launch the game directly from the dashboard.'],
                  ]}
                  stepColor="text-white/70"
                  stepBg="bg-white/10"
                  reverse
                  onExpand={setFullscreen}
                />

                {/* Step 3: In-game */}
                <VideoSection
                  videoKey="ingame"
                  title="Step 3: Running the Quiz"
                  steps={[
                    ['Round intro screens', 'Players see round intros with question counts and points available.'],
                    ['Asking phase', 'Questions are timed. You read them live while the platform manages the clock.'],
                    ['Round review', 'After each round, review answers with stats and show the round leaderboard.'],
                    ['Tie-breaker', 'Automatically detected and scored. You can also initiate manually.'],
                    ['Game end', 'Full leaderboard, stats, and winner announcement. Contract executes payouts.'],
                  ]}
                  stepColor="text-[#6ef0d4]"
                  stepBg="bg-[#6ef0d4]/10"
                  onExpand={setFullscreen}
                />

                {/* Step 4: Payouts */}
                <VideoSection
                  videoKey="reporting"
                  title="Step 4: Payouts and Results"
                  steps={[
                    ['Final results', 'The overall leaderboard is displayed. The winner is confirmed.'],
                    ['Smart contract distribution', 'All four payouts execute simultaneously from the on-chain escrow. Winner, host, charity, and platform are all paid in one transaction.'],
                    ['Fundraising summary', 'Total raised, entry fee breakdown, and payout confirmation.'],
                    ['Engagement analytics', 'Participation stats and round performance data for your records.'],
                  ]}
                  stepColor="text-amber-400"
                  stepBg="bg-amber-400/10"
                  reverse
                  onExpand={setFullscreen}
                />

              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Chains and tokens                                             */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <SectionLabel><Globe className="h-4 w-4" /> Chains and tokens</SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Solana and Base. <span className="text-[#a3f542]">Fast, low-cost, and live on mainnet.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-white/50">
                  Both chains are chosen for their speed and low transaction fees. More of every entry fee
                  reaches the winner, your wallet, and the charity.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Solana */}
                <W3Card className="border-[#9945FF]/20">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#9945FF]/30 bg-[#9945FF]/10 font-mono text-sm font-bold text-[#9945FF]">
                      SOL
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-[#9945FF]/60">Chain</p>
                      <h3 className="font-mono text-xl font-bold text-white">Solana</h3>
                    </div>
                  </div>
                  <p className="mb-4 text-base leading-relaxed text-white/60">
                    One of the fastest blockchains in the world with sub-second finality and fees that are a
                    fraction of a cent. Ideal for events with large player counts where cost of participation
                    matters.
                  </p>
                  <div className="mb-3">
                    <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/30">Supported tokens</p>
                    <p className="font-mono text-sm text-white/60">
                      SOL · USDC · JUP · JTO · PYTH · KMNO · WIF · BONK · MEW · TRUMP
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      'Multi-token entry fees',
                      'Sub-second transaction finality',
                      'Compatible with Phantom and Solflare',
                      'Charity payouts verified via The Giving Block',
                    ].map(t => (
                      <div key={t} className="flex items-center gap-2 text-sm text-white/50">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#9945FF]" />
                        {t}
                      </div>
                    ))}
                  </div>
                </W3Card>

                {/* Base */}
                <W3Card className="border-[#0052FF]/20">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#0052FF]/30 bg-[#0052FF]/10 font-mono text-sm font-bold text-[#0052FF]">
                      BASE
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-[#0052FF]/60">Chain</p>
                      <h3 className="font-mono text-xl font-bold text-white">Base</h3>
                    </div>
                  </div>
                  <p className="mb-4 text-base leading-relaxed text-white/60">
                    An Ethereum L2 built by Coinbase, combining Ethereum-grade security with significantly
                    lower fees and faster confirmations. EVM-compatible, so it works with the widest possible
                    range of wallets your community already uses. Also available as a Base Mini App.
                  </p>
                  <div className="mb-3">
                    <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/30">Supported tokens</p>
                    <p className="font-mono text-sm text-white/60">USDC (native)</p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      'USDC as primary token',
                      'Works with MetaMask, Coinbase Wallet, WalletConnect',
                      'Available as a Base Mini App',
                      'Charity payouts verified via The Giving Block',
                    ].map(t => (
                      <div key={t} className="flex items-center gap-2 text-sm text-white/50">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#0052FF]" />
                        {t}
                      </div>
                    ))}
                  </div>
                </W3Card>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Why it works                                                   */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <SectionLabel><Shield className="h-4 w-4" /> Why it works</SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Your community can trust it. <span className="text-[#a3f542]">Because the code is public.</span>
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <W3Card>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                    <Lock className="h-5 w-5 text-white/60" />
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">Split locked at deployment</h3>
                  <p className="text-base leading-relaxed text-white/60">
                    The moment you deploy the contract, the payout percentages are immutable. No one can
                    change them during or after the event. Not even you.
                  </p>
                </W3Card>
                <W3Card className="border-[#6ef0d4]/20">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                    <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">Charities verified via The Giving Block</h3>
                  <p className="text-base leading-relaxed text-white/60">
                    Every charity wallet is verified through The Giving Block before it can receive funds.
                    Players know the organisation is real and the money reaches them directly.
                  </p>
                </W3Card>
                <W3Card>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                    <Wallet className="h-5 w-5 text-white/60" />
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">No platform custody of funds</h3>
                  <p className="text-base leading-relaxed text-white/60">
                    Entry fees go directly into the smart contract and stay there until the event closes.
                    FundRaisely never holds the money. The platform fee is taken only at payout.
                  </p>
                </W3Card>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Support                                                        */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="grid gap-6 md:grid-cols-2">
                <W3Card>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                    <Users className="h-5 w-5 text-white/60" />
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">Live support sessions</h3>
                  <p className="text-base leading-relaxed text-white/60">
                    We run regular live sessions where you can watch a full quiz from setup to payout, ask
                    questions in real time, and get comfortable before you go live with your own crowd. Never
                    run an on-chain event before? Start here.
                  </p>
                </W3Card>
                <W3Card>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                    <MessageCircle className="h-5 w-5 text-white/60" />
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">Questions before you commit?</h3>
                  <p className="mb-4 text-base leading-relaxed text-white/60">
                    Get in touch and we will walk you through everything, from choosing a chain to running
                    your first event.
                  </p>
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-4 py-2.5 font-mono text-sm font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
                  >
                    Contact us <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </W3Card>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Final CTA                                                      */}
          {/* ============================================================ */}
          <section className="relative z-10 pb-20 pt-4">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <W3Card className="border-[#a3f542]/20 p-10 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">Ready to host</p>
                <h2 className="mt-3 font-mono text-4xl font-bold text-white">
                  Your quiz. Your community. On-chain.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-white/50">
                  Set up your event in minutes, pick a charity, and let the smart contract handle the rest.
                  Payouts land automatically the moment the last question is answered.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <button
                    onClick={() => setShowWizard(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
                  >
                    <PlusCircle className="h-5 w-5" /> Launch Quiz Wizard
                  </button>
                  <a
                    href="/web3/elimination"
                    className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
                  >
                    <Crosshair className="h-5 w-5" /> Host Elimination instead
                  </a>
                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-8 py-4 font-mono font-bold text-white/50 transition hover:border-white/30 hover:text-white"
                  >
                    <MessageCircle className="h-5 w-5" /> Contact us
                  </a>
                </div>
              </W3Card>
            </div>
          </section>

         
        </div>
      )}

      {/* Fullscreen video modal */}
      {fullscreen && (
        <FullscreenModal which={fullscreen} onClose={() => setFullscreen(null)} />
      )}
    </>
  );
};

export default Web3QuizPage;