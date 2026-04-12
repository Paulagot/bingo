import React, { useEffect, useMemo, useState } from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';

import {
  Crosshair,
  Trophy,
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
  Timer,
  Flame,
  Brain,
  Zap,
  Layers3,
  Eye,
} from 'lucide-react';

import { EliminationWeb3Page } from '../../components/elimination/EliminationWeb3Page';

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                */
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
/* Page                                                                       */
/* -------------------------------------------------------------------------- */
const Web3EliminationPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setShowForm(new URLSearchParams(window.location.search).get('action') === 'host');
    }
  }, []);

  const breadcrumbsJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising', item: abs('/web3') },
        { '@type': 'ListItem', position: 3, name: 'Host Elimination', item: abs('/web3/elimination') },
      ],
    }),
    []
  );

  const webPageJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Host a Web3 Elimination Game: On-Chain Fundraising in 20 Minutes | FundRaisely',
      description:
        'Run a fast, last-player-standing Web3 elimination game on Solana. Each game includes 8 skill-based rounds selected from a wider pool, with smart contract payouts to the winner, host, charity, and platform.',
      url: abs('/web3/elimination'),
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
          name: 'How many rounds are in a FundRaisely elimination game?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Each elimination game includes 8 rounds. These are selected from a wider pool of 17 round types, helping each game feel varied and replayable.',
          },
        },
        {
          '@type': 'Question',
          name: 'Are elimination rounds always the same?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. The game uses a wider pool of 17 round types and randomises rounds by difficulty, so the pacing and feel can change from game to game.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is FundRaisely elimination a quiz?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No. Elimination is a fast, skill-based format built around reaction, timing, precision, memory, and pressure rather than long-form quiz knowledge.',
          },
        },
        {
          '@type': 'Question',
          name: 'How long does an elimination game take?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'A typical elimination game takes around 20 minutes from launch to payout, making it suitable for short live events or multiple games in one evening.',
          },
        },
        {
          '@type': 'Question',
          name: 'What happens when a player gets eliminated?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Eliminated players are out of that game, but they usually stay watching as the field narrows and the final rounds become more intense.',
          },
        },
      ],
    }),
    []
  );

  if (showForm) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowForm(false)}
          className="fixed left-4 top-4 z-50 inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] bg-[#0a0e14]/90 px-4 py-2 font-mono text-sm font-semibold text-white/60 backdrop-blur transition hover:border-white/30 hover:text-white"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back
        </button>
        <EliminationWeb3Page />
      </div>
    );
  }

  return (
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
        title="Host a Web3 Elimination Game: On-Chain Fundraising in 20 Minutes | FundRaisely"
        description="Run a fast, last-player-standing Web3 elimination game on Solana. Each game includes 8 skill-based rounds selected from a wider pool of 17 round types, with automated smart contract payouts to winner, host, charity, and platform."
        ukKeywords="web3 elimination game uk, host crypto fundraiser uk, last player standing blockchain uk, solana elimination uk, on-chain charity game uk, skill based live game uk"
        ieKeywords="web3 elimination game ireland, host crypto fundraiser ireland, last player standing blockchain ireland, solana elimination ireland, on-chain charity events ireland, skill based fundraising game ireland"
        keywords="host web3 elimination game, crypto fundraising elimination, blockchain last player standing, solana elimination fundraiser, on-chain charity game, skill-based elimination game, live fundraising game, reaction game fundraiser, timing game crypto, web3 community event"
        type="website"
        domainStrategy="geographic"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, faqJsonLd]}
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Web3 Fundraising', item: '/web3' },
          { name: 'Host Elimination', item: '/web3/elimination' },
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
              <Crosshair className="h-4 w-4" /> Elimination Game
            </SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Last one standing.
              <br />
              <span className="text-orange-400">Fast to play. Hard to forget.</span>
            </h1>

            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/70">
              Host a last-player-standing fundraising game on Solana. Each session includes 8 fast
              rounds selected from a pool of 17 skill-based challenges, with difficulty randomised
              to keep every game fresh. Players pay their entry fee into a smart contract, survive
              round by round, and when one player is left standing, the contract pays the winner,
              your host cut, and the charity automatically.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono text-lg font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <Crosshair className="h-5 w-5" /> Launch Elimination
              </button>
              <a
                href="/web3/quiz"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-4 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Trophy className="h-4 w-4" /> Host a Quiz instead
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
                { value: '8', label: 'Rounds per game' },
                { value: '17', label: 'Round pool' },
                { value: '~20 min', label: 'Per game' },
                { value: '35%', label: 'To charity' },
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
      {/* What elimination is                                          */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Flame className="h-4 w-4" /> How it works
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Fast, tense, and over in <span className="text-orange-400">around 20 minutes.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              Elimination is built for live energy. No long setup, no drawn-out scoring, and no need
              for quiz content. Just rounds, knockouts, rising pressure, and one player left standing.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '01',
                title: 'Players join',
                body: 'Each player connects their Solana wallet and pays the entry fee directly into the smart contract before the game starts.',
              },
              {
                n: '02',
                title: '8 rounds are played',
                body: 'Each game uses 8 rounds selected from a wider pool of 17. Difficulty is randomised, so the challenge can build and shift from game to game.',
              },
              {
                n: '03',
                title: 'Players are eliminated',
                body: 'Round by round, the field gets smaller. Miss the challenge, react too slowly, or lose your edge, and you are out of that game.',
              },
              {
                n: '04',
                title: 'Contract pays out',
                body: 'When one player is left, the contract distributes the winner prize, your host cut, the charity share, and the platform fee automatically.',
              },
            ].map(({ n, title, body }) => (
              <W3Card key={n} className="border-orange-400/10">
                <p className="mb-3 font-mono text-3xl font-bold text-orange-400/30">{n}</p>
                <h3 className="mb-2 font-mono text-sm font-bold text-orange-400">{title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{body}</p>
              </W3Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Gameplay overview                                            */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Layers3 className="h-4 w-4" /> Gameplay
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              8 rounds per game. <span className="text-orange-400">17 rounds in the full pool.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-white/50">
              Every elimination game is short enough to fit into a single live session, but varied
              enough to stay interesting. The round pool creates replayability, while difficulty
              randomisation helps each session feel fresh instead of repetitive.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Fast micro-rounds',
                body: 'Each round is quick to understand and easy to run live, so the pace stays high and the room stays engaged.',
                icon: Timer,
              },
              {
                title: 'Skill-based format',
                body: 'This is not built around long-form trivia. It is built around reaction, timing, precision, focus, and composure under pressure.',
                icon: Target,
              },
              {
                title: 'Replayable by design',
                body: 'Because games are built from a wider pool of round types, you can run the format more than once without it feeling stale.',
                icon: Zap,
              },
              {
                title: 'Pressure rises naturally',
                body: 'The fewer players are left, the more every round matters. That creates tension without needing complicated mechanics.',
                icon: Flame,
              },
            ].map(({ title, body, icon: Icon }) => (
              <W3Card key={title} className="border-orange-400/10">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-400/10">
                  <Icon className="h-5 w-5 text-orange-400" />
                </div>
                <h3 className="mb-2 font-mono text-sm font-bold text-orange-400">{title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{body}</p>
              </W3Card>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Round variety                                                */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Eye className="h-4 w-4" /> Round variety
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Built for reaction, focus, and pressure.
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-white/50">
              Elimination is a rotating format of skill-based mini rounds designed for fast live
              play. It works in pubs, clubhouses, community spaces, online sessions, and Web3-native
              events where people want something simple, competitive, and exciting to watch.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: 'Precision rounds',
                body: 'Players aim for exact answers, exact timing, or exact positioning. Close matters more than simply being first.',
                icon: Crosshair,
              },
              {
                title: 'Reaction rounds',
                body: 'Fast decisions under pressure. Hesitation can be the difference between staying in and being eliminated.',
                icon: Zap,
              },
              {
                title: 'Timing rounds',
                body: 'Players trigger or stop at the right moment. Rhythm, nerve, and control matter just as much as speed.',
                icon: Timer,
              },
              {
                title: 'Memory rounds',
                body: 'Short bursts of recall where players need to hold information and reproduce it under pressure.',
                icon: Brain,
              },
              {
                title: 'Focus rounds',
                body: 'Simple tasks become harder when countdowns, distractions, and shrinking margins raise the tension.',
                icon: Eye,
              },
              {
                title: 'Difficulty scaling',
                body: 'Rounds are selected from the wider pool and shaped by difficulty, so the pacing can rise and fall in different ways each time.',
                icon: Flame,
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
      {/* Live format                                                  */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Users className="h-4 w-4" /> Live format
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              What a typical game night feels like
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-white/50">
              The format is simple enough for first-time players, but tense enough to keep a crowd
              watching. That makes it useful for hosts who want a short fundraising experience with a
              strong room dynamic.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Join',
                body: 'Players scan in, connect their wallet, and enter the game. The host launches once the room is ready.',
              },
              {
                step: '02',
                title: 'Survive',
                body: 'Early rounds get everyone moving, but mistakes quickly start reducing the field.',
              },
              {
                step: '03',
                title: 'Watch the tension build',
                body: 'As numbers drop, the room becomes louder, more focused, and more invested in who survives next.',
              },
              {
                step: '04',
                title: 'Finish cleanly',
                body: 'One player remains, the contract pays out instantly, and the game is complete with no messy settlement afterward.',
              },
            ].map(({ step, title, body }) => (
              <W3Card key={step} className="border-orange-400/10">
                <p className="mb-3 font-mono text-3xl font-bold text-orange-400/30">{step}</p>
                <h3 className="mb-2 font-mono text-sm font-bold text-orange-400">{title}</h3>
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
              Locked in the contract. <span className="text-orange-400">Before anyone joins.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              The split is set when the contract is deployed. Players can see where the entry fee
              goes before they pay, and nobody changes it after the game starts.
            </p>
          </div>

          <W3Card className="mx-auto max-w-2xl border-orange-400/20">
            <div className="flex flex-wrap justify-center gap-4 py-2">
              {[
                {
                  label: 'You earn',
                  pct: '20%',
                  accent: 'border-orange-400/20 bg-orange-400/10',
                  text: 'text-orange-400',
                },
                {
                  label: 'Winner',
                  pct: '30%',
                  accent: 'border-amber-400/20 bg-amber-400/10',
                  text: 'text-amber-400',
                },
                {
                  label: 'Charity',
                  pct: '35%',
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
              Elimination sends 35% to charity, making it the highest charity share across current
              FundRaisely game formats.
            </p>
          </W3Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Why elimination works                                        */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Users className="h-4 w-4" /> Why it works
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              The format that <span className="text-orange-400">keeps everyone watching.</span>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <W3Card className="border-orange-400/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-400/10">
                <Timer className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Short enough to stack</h3>
              <p className="text-base leading-relaxed text-white/60">
                Elimination games are short. You can fit them into a wider event, run multiple games
                in one evening, or use them as a fast fundraising format without asking people to
                commit to a full quiz night.
              </p>
            </W3Card>

            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Flame className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Visible drama in real time</h3>
              <p className="text-base leading-relaxed text-white/60">
                Players getting knocked out is part of the show. Even once someone is eliminated,
                they usually stay invested in the final rounds and the room energy carries through to
                the finish.
              </p>
            </W3Card>

            <W3Card className="border-[#6ef0d4]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                <Coins className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Big impact per session</h3>
              <p className="text-base leading-relaxed text-white/60">
                With 35% going to charity and no platform custody in the middle, the format is simple
                to explain and strong on impact. Players know they are participating in something fun
                that still creates a real contribution.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Chain                                                       */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Globe className="h-4 w-4" /> Chain
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Built on Solana. <span className="text-[#a3f542]">Fast enough to keep up with the game.</span>
            </h2>
          </div>

          <W3Card className="mx-auto max-w-3xl border-[#9945FF]/20">
            <div className="mb-4 flex items-center gap-4">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl border border-[#9945FF]/30 bg-[#9945FF]/10 font-mono text-base font-bold text-[#9945FF]">
                SOL
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-[#9945FF]/60">Chain</p>
                <h3 className="font-mono text-2xl font-bold text-white">Solana</h3>
              </div>
            </div>

            <p className="mb-5 text-base leading-relaxed text-white/60">
              Elimination runs on Solana because the format needs speed. Quick confirmations keep the
              player experience moving, while low fees help make entry affordable and payouts clean.
              For a live game with rising tension, slow settlement kills momentum. Solana helps keep
              the energy intact.
            </p>

            <div className="mb-4">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/30">
                Supported tokens
              </p>
              <p className="font-mono text-sm text-white/60">
                SOL · USDC · JUP · JTO · PYTH · KMNO · WIF · BONK · MEW · TRUMP
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              {[
                'Multi-token entry fees available',
                'Fast enough for live sessions',
                'Compatible with Phantom and Solflare',
                'Charity payouts verified via The Giving Block',
                'Low transaction costs',
                'Live on Solana mainnet',
              ].map((t) => (
                <div key={t} className="flex items-center gap-2 text-sm text-white/50">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#9945FF]" />
                  {t}
                </div>
              ))}
            </div>
          </W3Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Trust                                                       */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Shield className="h-4 w-4" /> Trust
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Nothing to take on trust. <span className="text-[#a3f542]">Everything on-chain.</span>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Lock className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Split locked at deployment</h3>
              <p className="text-base leading-relaxed text-white/60">
                The 20/30/35/15 split is written into the contract when you deploy. Nobody can change
                it during the game.
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
                Charity wallets are verified before they appear in the selector, so the charity share
                goes directly to a real and identifiable organisation.
              </p>
            </W3Card>

            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Wallet className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">No platform custody</h3>
              <p className="text-base leading-relaxed text-white/60">
                Entry fees go into the contract and stay there until payout. FundRaisely does not
                hold the money in the middle, and every payout can be independently verified.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* FAQ                                                         */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Shield className="h-4 w-4" /> FAQ
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Questions hosts usually ask first
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: 'How many rounds are in a game?',
                a: 'Each elimination game includes 8 rounds, selected from a wider pool of 17 possible round types.',
              },
              {
                q: 'Are the rounds always the same?',
                a: 'No. The pool and difficulty randomisation help each game feel fresh, even for repeat players.',
              },
              {
                q: 'Is this basically a quiz?',
                a: 'No. Elimination is a fast, skill-based format built around timing, reaction, precision, memory, and pressure rather than long-form general knowledge.',
              },
              {
                q: 'How long does a game take?',
                a: 'Most games take around 20 minutes, making them easy to fit into an event night or run multiple times in one session.',
              },
              {
                q: 'What happens after a player is eliminated?',
                a: 'They are out of that game, but the format is still entertaining to watch as the remaining field gets smaller and the final rounds become more intense.',
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
      {/* Quiz comparison                                             */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="p-8">
            <div className="mb-6 text-center">
              <h2 className="font-mono text-2xl font-bold text-white">
                Not sure which format suits your crowd?
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-white/50">
                Both games use smart contracts and automated payouts. The real difference is the
                experience you want to create.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-orange-400/20 bg-orange-400/5 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Crosshair className="h-5 w-5 text-orange-400" />
                  <h3 className="font-mono text-base font-bold text-orange-400">Elimination</h3>
                </div>
                <ul className="space-y-1.5">
                  {[
                    '~20 minutes per game',
                    '8 rounds selected from a pool of 17',
                    '35% to charity — highest split',
                    'High tension and visible knockouts',
                    'No quiz content needed',
                    'Best for fast, competitive live sessions',
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-orange-400" />
                      {t}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-5 w-full rounded-xl border border-orange-400/40 bg-orange-400/10 py-3 font-mono font-bold text-orange-400 transition hover:border-orange-400/80"
                >
                  Host Elimination
                </button>
              </div>

              <div className="rounded-xl border border-[#a3f542]/20 bg-[#a3f542]/5 p-5">
                <div className="mb-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-[#a3f542]" />
                  <h3 className="font-mono text-base font-bold text-[#a3f542]">Quiz Night</h3>
                </div>
                <ul className="space-y-1.5">
                  {[
                    '~1.5 hours per event',
                    'Longer-form structured game night',
                    '30% to charity',
                    'Quiz rounds, scoring, and leaderboard play',
                    'Better for knowledge-based communities',
                    'Best for full hosted event experiences',
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-[#a3f542]" />
                      {t}
                    </li>
                  ))}
                </ul>
                <a
                  href="/web3/quiz"
                  className="mt-5 block w-full rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 py-3 text-center font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80"
                >
                  Host a Quiz
                </a>
              </div>
            </div>
          </W3Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Support                                                     */}
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
                We run support sessions where you can see how the game works from setup to payout and
                get comfortable with the host flow before running your own event.
              </p>
            </W3Card>

            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <MessageCircle className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Questions before you start?</h3>
              <p className="mb-4 text-base leading-relaxed text-white/60">
                Get in touch and we will walk you through wallet setup, contract launch, player flow,
                and what to expect when you run your first elimination game.
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
      {/* Final CTA                                                   */}
      {/* ============================================================ */}
      <section className="relative z-10 pb-20 pt-4">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-orange-400/20 p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-orange-400/60">
              Ready to host
            </p>
            <h2 className="mt-3 font-mono text-4xl font-bold text-white">
              Deploy. Play. Eliminate. Get paid.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Connect your Solana wallet, set your entry fee, pick a charity, and launch the
              contract. A few rounds later, one player is left standing and everyone is paid
              automatically.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <Crosshair className="h-5 w-5" /> Launch Elimination
              </button>
              <a
                href="/web3/quiz"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Trophy className="h-5 w-5" /> Host a Quiz instead
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
  );
};

export default Web3EliminationPage;