import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
  Sparkles,
  LayoutTemplate,
  Layers3,
  Flame,
  BarChart3,
  HelpCircle,
  Timer,
  Brain,
  Zap,
} from 'lucide-react';

import Web3QuizWizard from '../../components/Quiz/Wizard/Web3QuizWizard';
import type { SupportedChain } from '../../chains/types';

/* -------------------------------------------------------------------------- */
/* URL helpers — reads from browser so both .ie and .co.uk are handled        */
/* -------------------------------------------------------------------------- */
function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'https://fundraisely.ie';
}

function abs(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

/* -------------------------------------------------------------------------- */
/* YouTube embed — privacy-enhanced, CLS-safe, lazy                           */
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
/* Video IDs                                                                  */
/* -------------------------------------------------------------------------- */
const SETUP_VIDEO_ID = 'v0mutwIyqb0';
const DASHBOARD_VIDEO_ID = 'Sf9e8_IGdFU';
const INGAME_VIDEO_ID = 'd5zyT5zf-wI';
const REPORTING_VIDEO_ID = 'REPORTING01_';

/* -------------------------------------------------------------------------- */
/* Design tokens                                                              */
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
/* Step list item                                                             */
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
/* Fullscreen video modal                                                     */
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      <div className="w-full max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
        <YouTubeBlock title={`${title} fullscreen`} youtubeUrlOrId={id} />
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Video section                                                              */
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
/* Page                                                                       */
/* -------------------------------------------------------------------------- */
const Web3QuizPage: React.FC = () => {
  const [selectedChain, setSelectedChain] = useState<SupportedChain | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  const [fullscreen, setFullscreen] = useState<VideoKey | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShowWizard(new URLSearchParams(window.location.search).get('action') === 'host');
    }
  }, []);

  const onWizardComplete = useCallback(() => {
    setShowWizard(false);
    setSelectedChain(null);
  }, []);

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
        'Host a live Web3 quiz night for your community on Solana or Base. Use quiz templates, fundraising extras, round variety, and smart contract payouts to run a more engaging fundraiser with less admin.',
      url: abs('/web3/quiz'),
      isPartOf: { '@type': 'WebSite', url: abs('/') },
    }),
    []
  );

  const faqJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What fundraising extras can hosts add to a FundRaisely quiz?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Hosts can enable optional fundraising extras such as Freeze Out Player, Robin Hood or rob points, Clue, and Restore Points. These increase player interaction while also increasing fundraising revenue.',
          },
        },
        {
          '@type': 'Question',
          name: 'Does FundRaisely provide quiz templates?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Hosts can use ready-made quiz templates to reduce setup time and launch faster, while still creating a polished event for their community.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can a FundRaisely quiz include different round types?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. FundRaisely quizzes support different round types, helping hosts create more variety, better pacing, and a more engaging player experience than a standard single-format quiz.',
          },
        },
        {
          '@type': 'Question',
          name: 'How are payouts handled in a Web3 quiz night?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Players pay into a smart contract. When the event ends, the contract automatically pays the winner, the host, the charity, and the platform according to the locked payout split.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need blockchain experience to host a quiz?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. FundRaisely provides a guided setup wizard, host dashboard, and live support options to help organisers launch without needing deep blockchain knowledge.',
          },
        },
      ],
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
            description="Host a live Web3 quiz night for your community on Solana or Base. Use quiz templates, fundraising extras, different round types, and smart contract payouts to create a stronger fundraising experience with less admin."
            ukKeywords="web3 quiz night uk, host crypto fundraiser uk, blockchain quiz fundraising uk, solana quiz uk, base network quiz uk, on-chain charity quiz, fundraising quiz extras uk"
            ieKeywords="web3 quiz night ireland, host crypto fundraiser ireland, blockchain quiz fundraising ireland, solana quiz ireland, on-chain charity events ireland, fundraising quiz extras ireland"
            keywords="host web3 quiz, crypto fundraising quiz, blockchain quiz night, smart contract quiz payouts, fundraising quiz extras, quiz templates for fundraisers, round-based quiz fundraiser, on-chain charity quiz, web3 community event, hosted quiz fundraiser"
            type="website"
            domainStrategy="geographic"
            structuredData={[breadcrumbsJsonLd, webPageJsonLd, faqJsonLd, ...videoObjects]}
            breadcrumbs={[
              { name: 'Home', item: '/' },
              { name: 'Web3 Fundraising', item: '/web3' },
              { name: 'Host a Quiz', item: '/web3/quiz' },
            ]}
          />

          <Web3Header />

          {/* ============================================================ */}
          {/* Hero                                                        */}
          {/* ============================================================ */}
          <section className="relative z-10 pb-12 pt-16">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col items-center text-center">
                <SectionLabel>
                  <Trophy className="h-4 w-4" /> Web3 Quiz Night
                </SectionLabel>

                <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
                  Host a quiz. <span className="text-[#a3f542]">Earn.</span> Raise for good.
                </h1>

                <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/70">
                  Run a live scored Web3 quiz for your community on Solana or Base. Use ready-made
                  quiz templates, mix round types, and add paid fundraising extras that boost both
                  engagement and revenue. Players pay their entry fee into a smart contract, and when
                  the event ends, the winner, host, charity, and platform are all paid automatically.
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

                <div className="mt-12 flex w-full flex-wrap justify-center gap-8 border-t border-[#1e2d42] pt-8 sm:justify-between">
                  {[
                    { value: '25%', label: 'You earn as host' },
                    { value: '30%', label: 'Winner prize' },
                    { value: '30%', label: 'To charity' },
                    { value: 'Templates + extras', label: 'Built for fundraising' },
                  ].map(({ value, label }) => (
                    <div key={label} className="text-center">
                      <p className="font-mono text-2xl font-bold text-white">{value}</p>
                      <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-white/30">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Why this is more than a normal quiz                         */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <SectionLabel>
                  <Sparkles className="h-4 w-4" /> Why FundRaisely quiz
                </SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  More than a quiz night. <span className="text-[#a3f542]">Built to fundraise.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-3xl text-white/50">
                  FundRaisely is designed for hosts who want a proper event experience, not just a
                  score screen. Templates reduce setup time, round variety improves pacing, and paid
                  extras create more reasons for people to participate and spend.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    title: 'Ready-made quiz templates',
                    body: 'Launch faster with quiz formats that already feel structured, hosted, and event-ready.',
                    icon: LayoutTemplate,
                  },
                  {
                    title: 'Different round types',
                    body: 'Use round variety to create momentum, contrast, and a better live player experience.',
                    icon: Layers3,
                  },
                  {
                    title: 'Fundraising extras',
                    body: 'Add optional paid boosts that increase both interaction and revenue during the event.',
                    icon: Coins,
                  },
                  {
                    title: 'On-chain payouts',
                    body: 'When the game ends, the contract handles the split automatically and transparently.',
                    icon: Shield,
                  },
                ].map(({ title, body, icon: Icon }) => (
                  <W3Card key={title} className="border-[#a3f542]/10">
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#a3f542]/20 bg-[#a3f542]/10">
                      <Icon className="h-5 w-5 text-[#a3f542]" />
                    </div>
                    <h3 className="mb-2 font-mono text-sm font-bold text-[#a3f542]">{title}</h3>
                    <p className="text-sm leading-relaxed text-white/50">{body}</p>
                  </W3Card>
                ))}
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Extras                                                       */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <SectionLabel>
                  <Coins className="h-4 w-4" /> Fundraising extras
                </SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Optional paid extras that make the quiz
                  <span className="text-[#a3f542]"> more fun and more valuable.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-3xl text-white/50">
                  Extras are one of the strongest reasons to use FundRaisely instead of a standard
                  quiz setup. Hosts can turn them on during setup, price them for fundraising, and
                  create moments players actually talk about after the game ends.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    title: 'Freeze Out Player',
                    body: 'Let players pay to disrupt an opponent at a key moment. Great for rivalry, energy, and crowd reaction.',
                    icon: Flame,
                    accent: 'text-orange-400',
                    border: 'border-orange-400/20',
                    bg: 'bg-orange-400/10',
                  },
                  {
                    title: 'Robin Hood / Rob Points',
                    body: 'A fundraising extra that lets players steal points and shake up the leaderboard when the pressure rises.',
                    icon: Zap,
                    accent: 'text-amber-400',
                    border: 'border-amber-400/20',
                    bg: 'bg-amber-400/10',
                  },
                  {
                    title: 'Clue',
                    body: 'Players can pay for help when they need it, adding a simple upsell that also reduces frustration in harder rounds.',
                    icon: HelpCircle,
                    accent: 'text-[#6ef0d4]',
                    border: 'border-[#6ef0d4]/20',
                    bg: 'bg-[#6ef0d4]/10',
                  },
                  {
                    title: 'Restore Points',
                    body: 'Give players a way to recover and stay in the game, while generating additional fundraising revenue late in the event.',
                    icon: BarChart3,
                    accent: 'text-[#a3f542]',
                    border: 'border-[#a3f542]/20',
                    bg: 'bg-[#a3f542]/10',
                  },
                ].map(({ title, body, icon: Icon, accent, border, bg }) => (
                  <W3Card key={title} className={border}>
                    <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border ${border} ${bg}`}>
                      <Icon className={`h-5 w-5 ${accent}`} />
                    </div>
                    <h3 className={`mb-2 font-mono text-sm font-bold ${accent}`}>{title}</h3>
                    <p className="text-sm leading-relaxed text-white/50">{body}</p>
                  </W3Card>
                ))}
              </div>

              <W3Card className="mt-6 border-[#a3f542]/20">
                <p className="text-center text-sm leading-relaxed text-white/50">
                  The point of extras is not just novelty. They are built to give hosts more
                  fundraising levers during the game, while making the player experience more
                  interactive, strategic, and memorable.
                </p>
              </W3Card>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Templates and round types                                   */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <SectionLabel>
                  <Layers3 className="h-4 w-4" /> Quiz formats
                </SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Templates to launch faster. <span className="text-[#a3f542]">Round types to keep it interesting.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-3xl text-white/50">
                  A good fundraiser needs pacing. FundRaisely quizzes are designed so hosts can start
                  with templates, then shape a stronger event using different round styles, different
                  energy levels, and built-in review and leaderboard moments.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    title: 'Quiz templates',
                    body: 'Reduce setup time with structured quiz formats that help hosts launch quickly without building everything from scratch.',
                    icon: LayoutTemplate,
                  },
                  {
                    title: 'Round variety',
                    body: 'Different round types create contrast between questions, keep players engaged, and avoid the flat feeling of one repeated format.',
                    icon: Layers3,
                  },
                  {
                    title: 'Live scoring',
                    body: 'Players stay invested because the event has momentum, visible progression, and a leaderboard people care about.',
                    icon: Trophy,
                  },
                  {
                    title: 'Timed questions',
                    body: 'Time pressure helps the event move and adds energy, especially when scores are tight and answers matter more.',
                    icon: Timer,
                  },
                  {
                    title: 'Thinking and strategy',
                    body: 'Extras, pacing, and leaderboard pressure add more than general knowledge alone, making the game feel like an event.',
                    icon: Brain,
                  },
                  {
                    title: 'A stronger hosted experience',
                    body: 'This is designed for a real host with a real crowd, not just a digital quiz screen with no atmosphere.',
                    icon: Users,
                  },
                ].map(({ title, body, icon: Icon }) => (
                  <W3Card key={title}>
                    <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                      <Icon className="h-5 w-5 text-white/70" />
                    </div>
                    <h3 className="mb-2 font-mono text-sm font-bold text-white">{title}</h3>
                    <p className="text-sm leading-relaxed text-white/50">{body}</p>
                  </W3Card>
                ))}
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Payout split                                                 */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <SectionLabel>
                  <Coins className="h-4 w-4" /> Payout split
                </SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Every euro, accounted for. <span className="text-[#a3f542]">In the contract.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-white/50">
                  The split is locked in when you deploy. Players can see exactly where their entry
                  fee goes before they join, and nobody can alter the percentages after the event is
                  live.
                </p>
              </div>

              <W3Card className="mx-auto max-w-2xl border-[#a3f542]/20">
                <div className="flex flex-wrap justify-center gap-4 py-2">
                  {[
                    {
                      label: 'You earn',
                      pct: '25%',
                      accent: 'border-[#a3f542]/20 bg-[#a3f542]/10',
                      text: 'text-[#a3f542]',
                    },
                    {
                      label: 'Winner',
                      pct: '30%',
                      accent: 'border-amber-400/20 bg-amber-400/10',
                      text: 'text-amber-400',
                    },
                    {
                      label: 'Charity',
                      pct: '30%',
                      accent: 'border-[#6ef0d4]/20 bg-[#6ef0d4]/10',
                      text: 'text-[#6ef0d4]',
                    },
                    {
                      label: 'Platform',
                      pct: '15%',
                      accent: 'border-[#1e2d42] bg-white/5',
                      text: 'text-white/40',
                    },
                  ].map(({ label, pct, accent, text }) => (
                    <div
                      key={label}
                      className={`flex flex-col items-center rounded-xl border px-8 py-5 ${accent}`}
                    >
                      <span className={`font-mono text-3xl font-bold ${text}`}>{pct}</span>
                      <span className="mt-1 text-sm font-medium text-white/50">{label}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-sm leading-relaxed text-white/40">
                  For the quiz, there is a First and Second Prize only.  First prize is 18% of the total pot. Second place is 12%.  All recipients are paid simultaneously in a single contract execution when the
                  event closes.
                </p>
              </W3Card>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Setup wizard walkthrough                                     */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-10 text-center">
                <SectionLabel>
                  <Rocket className="h-4 w-4" /> Setup wizard
                </SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Live in minutes. <span className="text-[#a3f542]">No blockchain experience needed.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-white/50">
                  The wizard handles chain selection, charity, entry fee, quiz setup, extras, and
                  contract deployment. Watch the walkthrough, then launch your own event.
                </p>
              </div>

              <div className="space-y-16">
                <VideoSection
                  videoKey="setup"
                  title="Step 1: Setup Wizard"
                  steps={[
                    [
                      'Set basic details',
                      'Choose your event name, select your chain, pick the fee token, choose a verified charity, and set the entry price.',
                    ],
                    [
                      'Choose your quiz structure',
                      'Start from a quiz template and configure the event so it fits your crowd, pace, and fundraising goal.',
                    ],
                    [
                      'Turn on fundraising extras',
                      'Enable optional paid extras like Freeze Out Player, Robin Hood, Clue, and Restore Points to add more revenue opportunities.',
                    ],
                    [
                      'Review and launch',
                      'Review the full event, connect your wallet, and deploy the contract by signing. Your quiz is ready to host.',
                    ],
                  ]}
                  stepColor="text-[#a3f542]"
                  stepBg="bg-[#a3f542]/10"
                  onExpand={setFullscreen}
                />

                <VideoSection
                  videoKey="dashboard"
                  title="Step 2: Host Dashboard"
                  steps={[
                    [
                      'Overview tab',
                      'See your event settings and a QR code players can scan to join from their own device.',
                    ],
                    [
                      'Player panel',
                      'Track players in real time as they connect wallets, join, and prepare for the event.',
                    ],
                    [
                      'Payments panel',
                      'See entry fee totals and monitor progress without manually chasing every payment.',
                    ],
                    [
                      'Launch from the dashboard',
                      'Once your room is ready, launch directly into the live hosted game flow.',
                    ],
                  ]}
                  stepColor="text-white/70"
                  stepBg="bg-white/10"
                  reverse
                  onExpand={setFullscreen}
                />

                <VideoSection
                  videoKey="ingame"
                  title="Step 3: Running the Quiz"
                  steps={[
                    [
                      'Round intros',
                      'Players see round intros with context, question counts, and what is coming next.',
                    ],
                    [
                      'Asking phase',
                      'Questions are timed so the event keeps moving while you stay in control as host.',
                    ],
                    [
                      'Review and leaderboard',
                      'After each round, review answers, build suspense, and show the updated standings.',
                    ],
                    [
                      'Tie-breaker support',
                      'Tie situations can be detected and handled cleanly so winners are clear and the finish feels fair.',
                    ],
                    [
                      'Fundraising moments inside the game',
                      'Extras and round variety help the event feel live, strategic, and more valuable than a normal quiz.',
                    ],
                  ]}
                  stepColor="text-[#6ef0d4]"
                  stepBg="bg-[#6ef0d4]/10"
                  onExpand={setFullscreen}
                />

                <VideoSection
                  videoKey="reporting"
                  title="Step 4: Payouts and Results"
                  steps={[
                    [
                      'Final results',
                      'The leaderboard is shown, the winner is confirmed, and the event closes cleanly.',
                    ],
                    [
                      'Smart contract distribution',
                      'Winner, host, charity, and platform are all paid in one contract execution according to the locked split.',
                    ],
                    [
                      'Fundraising summary',
                      'Review totals, payout confirmation, and the full value created by the event.',
                    ],
                    [
                      'Reporting and visibility',
                      'Use event outputs and statistics to show your community what was raised and how the event performed.',
                    ],
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
          {/* Chains and tokens                                            */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <SectionLabel>
                  <Globe className="h-4 w-4" /> Chains and tokens
                </SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Solana and Base. <span className="text-[#a3f542]">Fast, low-cost, and built for live use.</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-white/50">
                  Both chains are chosen for speed and lower costs, helping more of each entry fee
                  reach the winner, the host, and the charity rather than getting lost to friction.
                </p>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <W3Card className="border-[#9945FF]/20">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#9945FF]/30 bg-[#9945FF]/10 font-mono text-sm font-bold text-[#9945FF]">
                      SOL
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-[#9945FF]/60">
                        Chain
                      </p>
                      <h3 className="font-mono text-xl font-bold text-white">Solana</h3>
                    </div>
                  </div>
                  <p className="mb-4 text-base leading-relaxed text-white/60">
                    Fast confirmations and very low fees make Solana a strong fit for live community
                    events where cost and momentum matter.
                  </p>
                  <div className="mb-3">
                    <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/30">
                      Supported tokens
                    </p>
                    <p className="font-mono text-sm text-white/60">
                      SOL · USDC · JUP · JTO · PYTH · KMNO · WIF · BONK · MEW · TRUMP
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      'Multi-token entry fees',
                      'Fast enough for live events',
                      'Compatible with Phantom and Solflare',
                      'Charity payouts verified via The Giving Block',
                    ].map((t) => (
                      <div key={t} className="flex items-center gap-2 text-sm text-white/50">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#9945FF]" />
                        {t}
                      </div>
                    ))}
                  </div>
                </W3Card>

                <W3Card className="border-[#0052FF]/20">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#0052FF]/30 bg-[#0052FF]/10 font-mono text-sm font-bold text-[#0052FF]">
                      BASE
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-[#0052FF]/60">
                        Chain
                      </p>
                      <h3 className="font-mono text-xl font-bold text-white">Base</h3>
                    </div>
                  </div>
                  <p className="mb-4 text-base leading-relaxed text-white/60">
                    Base offers Ethereum-compatible infrastructure with lower fees and familiar wallet
                    support, helping hosts reach communities that already use EVM wallets.
                  </p>
                  <div className="mb-3">
                    <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/30">
                      Supported tokens
                    </p>
                    <p className="font-mono text-sm text-white/60">USDC (native)</p>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      'USDC as primary token',
                      'Works with MetaMask, Coinbase Wallet, WalletConnect',
                      'Available as a Base Mini App',
                      'Charity payouts verified via The Giving Block',
                    ].map((t) => (
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
          {/* Trust                                                        */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <SectionLabel>
                  <Shield className="h-4 w-4" /> Why it works
                </SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Your community can trust it. <span className="text-[#a3f542]">Because the rules are visible.</span>
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <W3Card>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                    <Lock className="h-5 w-5 text-white/60" />
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">Split locked at deployment</h3>
                  <p className="text-base leading-relaxed text-white/60">
                    Once deployed, the payout split is fixed. Hosts cannot quietly change where the
                    money goes after people have paid in.
                  </p>
                </W3Card>

                <W3Card className="border-[#6ef0d4]/20">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                    <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">
                    Charities verified via The Giving Block
                  </h3>
                  <p className="text-base leading-relaxed text-white/60">
                    Charity wallets are verified before they appear in the flow, helping players feel
                    confident that the charity share goes somewhere real.
                  </p>
                </W3Card>

                <W3Card>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                    <Wallet className="h-5 w-5 text-white/60" />
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">No platform custody of funds</h3>
                  <p className="text-base leading-relaxed text-white/60">
                    Entry fees go into the contract and stay there until payout. FundRaisely is not
                    sitting in the middle holding event money off-chain.
                  </p>
                </W3Card>
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* FAQ                                                          */}
          {/* ============================================================ */}
          <section className="relative z-10 py-12">
            <div className="container mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
              <div className="mb-8 text-center">
                <SectionLabel>
                  <HelpCircle className="h-4 w-4" /> FAQ
                </SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Questions hosts usually ask first
                </h2>
              </div>

              <div className="space-y-4">
                {[
                  {
                    q: 'What fundraising extras can I add to my quiz?',
                    a: 'Hosts can enable optional extras such as Freeze Out Player, Robin Hood or rob points, Clue, and Restore Points. These are designed to generate more fundraising revenue while making the game more interactive.',
                  },
                  {
                    q: 'Do I have to write the full quiz from scratch?',
                    a: 'No. FundRaisely supports quiz templates so you can launch faster and start from a more polished event structure.',
                  },
                  {
                    q: 'Can I use different round types?',
                    a: 'Yes. Different round types help create better pacing, variety, and a stronger event experience than a flat single-format quiz.',
                  },
                  {
                    q: 'How are players and payouts handled?',
                    a: 'Players pay into a smart contract. When the event ends, the contract pays the winner, host, charity, and platform automatically based on the locked split.',
                  },
                  {
                    q: 'Do I need blockchain knowledge to host one?',
                    a: 'No. The wizard, dashboard, and walkthrough flow are designed to make hosting accessible even if you are new to Web3.',
                  },
                ].map(({ q, a }) => (
                  <W3Card key={q}>
                    <h3 className="font-mono text-sm font-bold text-white">{q}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/50">{a}</p>
                  </W3Card>
                ))}
              </div>
            </div>
          </section>

          {/* ============================================================ */}
          {/* Support                                                      */}
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
                    We run live sessions where you can see a full quiz flow from setup to payout,
                    ask questions in real time, and get more comfortable before going live with your
                    own crowd.
                  </p>
                </W3Card>

                <W3Card>
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                    <MessageCircle className="h-5 w-5 text-white/60" />
                  </div>
                  <h3 className="mb-2 font-mono text-sm font-bold text-white">Questions before you commit?</h3>
                  <p className="mb-4 text-base leading-relaxed text-white/60">
                    Get in touch and we will talk you through the chain choice, setup flow, extras,
                    host experience, and what makes sense for your type of event.
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
          {/* Final CTA                                                    */}
          {/* ============================================================ */}
          <section className="relative z-10 pb-20 pt-4">
            <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              <W3Card className="border-[#a3f542]/20 p-10 text-center">
                <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">
                  Ready to host
                </p>
                <h2 className="mt-3 font-mono text-4xl font-bold text-white">
                  Your quiz. Your crowd. Better fundraising.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-white/50">
                  Use templates, round variety, and paid extras to run a stronger event for your
                  community, then let the smart contract handle the payouts when the game ends.
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

      {fullscreen && <FullscreenModal which={fullscreen} onClose={() => setFullscreen(null)} />}
    </>
  );
};

export default Web3QuizPage;