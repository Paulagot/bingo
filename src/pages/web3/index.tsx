// src/pages/web3/index.tsx
import React, { useMemo } from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';
import { currencyISO as iso } from '../../services/currency';

import {
  Globe,
  Calendar,
  Rocket,
  HeartHandshake,
  ArrowRight,
  Trophy,
  Crosshair,
  Wallet,
  Shield,
  Coins,
  Users,
  BadgeCheck,
  Target,
  Zap,
  MessageCircle,
  Search,
  CheckCircle2,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                  */
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
/* Shared UI                                                                    */
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

const StatPill: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="text-center">
    <p className="font-mono text-2xl font-bold text-white">{value}</p>
    <p className="mt-0.5 font-mono text-xs uppercase tracking-widest text-white/30">{label}</p>
  </div>
);

const FAQCard: React.FC<{ q: string; a: string }> = ({ q, a }) => (
  <W3Card className="h-full">
    <h3 className="font-mono text-base font-bold text-white">{q}</h3>
    <p className="mt-3 text-sm leading-relaxed text-white/60">{a}</p>
  </W3Card>
);

/* -------------------------------------------------------------------------- */
/* Page                                                                         */
/* -------------------------------------------------------------------------- */
const Web3MainIndex: React.FC = () => {
  const webPageJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Web3 Fundraising Marketplace: Join Events, Host Events and Fund Verified Charities | FundRaisely',
      description:
        'Join live Web3 fundraising events or host your own. FundRaisely is a blockchain-powered fundraising marketplace for quiz nights and elimination games where hosts earn and verified charities receive their share automatically.',
      url: abs('/web3'),
      mainEntity: {
        '@type': 'SoftwareApplication',
        name: 'FundRaisely Web3 Fundraising Marketplace',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description:
          'Blockchain-powered fundraising marketplace for transparent quiz nights and elimination games on Solana and Base.',
        featureList: [
          'Public event discovery',
          'Quiz nights and elimination games',
          'Hosts earn a share of entry fees automatically',
          'Verified charities and non-profits',
          'Instant on-chain payouts via smart contracts',
          'Wallet-based access and participation',
          'Transparent fixed payout logic',
        ],
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: iso,
          description: 'Free to browse and free to start hosting Web3 fundraising events',
        },
      },
    }),
    []
  );

  const faqItems = useMemo(
    () => [
      {
        q: 'What makes FundRaisely different from a normal donation platform?',
        a: 'FundRaisely is not just a donation page. It is a fundraising marketplace where hosts create live events, players pay to take part, and verified charities receive a guaranteed share through smart contract payouts.',
      },
      {
        q: 'Do I have to understand crypto to take part?',
        a: 'No. Players only need a supported wallet. Hosts also just need a wallet to get started. The event setup flow and payout logic are handled inside the platform, and the fundraising logic is built into the event structure.',
      },
      {
        q: 'How do hosts make money?',
        a: 'Hosts run the event, bring the community together, and receive a fixed share of entry fees automatically when the event ends. Quiz and elimination formats use different payout models, and exact earnings depend on the event size and fee chosen.',
      },
      {
        q: 'How do I know the charity actually gets paid?',
        a: 'The charity payout is handled on-chain through smart contract logic. Once the event finishes, the split is executed automatically and recorded publicly on the blockchain.',
      },
      {
        q: 'What kinds of events can I join?',
        a: 'Right now the marketplace focuses on live quiz nights and elimination games. Quiz events are longer, social, and leaderboard-based. Elimination is faster and more intense, with players knocked out round by round until one winner remains.',
      },
      {
        q: 'Who are the causes and how are they chosen?',
        a: 'FundRaisely works with approved non-profits and verified charity partners, with a strong emphasis on transparency and suitability for crypto-enabled fundraising. You can browse supported causes and partners on the causes page.',
      },
      {
        q: 'Is hosting a job or guaranteed income?',
        a: 'No. Hosting is not employment and there is no guaranteed income. FundRaisely is a platform that lets people run events and receive a pre-defined share of event fees if players join.',
      },
      {
        q: 'Where should I go if I want to host rather than browse?',
        a: 'Start on the host page. That is where the deeper information lives about event setup, formats, payout logic, and how to launch your first Web3 fundraiser.',
      },
    ],
    []
  );

  const faqJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqItems.map(item => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.a,
        },
      })),
    }),
    [faqItems]
  );

  const breadcrumbsJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
        { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising Marketplace', item: abs('/web3') },
      ],
    }),
    []
  );

  return (
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
        title="Web3 Fundraising Marketplace: Join Events, Host Events and Fund Verified Charities | FundRaisely"
        description="Discover live Web3 fundraising events, host quiz nights and elimination games, and support verified charities through transparent on-chain payout logic."
        keywords="web3 fundraising marketplace, crypto charity events, host fundraising events, quiz night fundraiser, elimination fundraiser, blockchain fundraising platform, verified charity web3, on-chain fundraising events, host web3 fundraiser, play for charity"
        domainStrategy="geographic"
        image="/og/web3-hub.png"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Web3 Fundraising Marketplace', item: '/web3' },
        ]}
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, faqJsonLd]}
      />

      <Web3Header />

      {/* ================================================================== */}
      {/* Hero                                                               */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-12 pt-28 sm:pt-32">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel>
              <Globe className="h-4 w-4" /> Marketplace for impact
            </SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Web3 Fundraising Marketplace
              <br />
              <span className="text-purple-400">Join events. Host events. Fund real causes.</span>
            </h1>

            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/70">
              FundRaisely is a Web3 fundraising marketplace where people do more than donate.
              They participate. Join live quiz nights and elimination games, or host your own event,
              grow a community, and fund verified non-profits through transparent on-chain payout logic.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/web3/events"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Calendar className="h-4 w-4" /> Find events
              </a>

              <a
                href="/web3/host"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-mono font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
              >
                <Rocket className="h-4 w-4" /> Host an event
              </a>

              <a
                href="/web3/partners"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <BadgeCheck className="h-4 w-4" /> Browse causes
              </a>
            </div>

            <div className="mt-12 flex w-full flex-wrap justify-center gap-8 border-t border-[#1e2d42] pt-8 sm:justify-between">
              <StatPill value="Quiz + Elimination" label="live event formats" />
              <StatPill value="Hosts earn" label="from every event" />
              <StatPill value="Verified causes" label="can receive funds" />
              <StatPill value="On-chain" label="payout transparency" />
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Marketplace explainer                                               */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <W3Card className="h-full">
              <SectionLabel>
                <Target className="h-4 w-4" /> What this is
              </SectionLabel>

              <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                A fundraising marketplace, not just a donation page
              </h2>

              <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/65">
                Traditional fundraising usually starts with an ask. FundRaisely starts with an experience.
                A host creates a live event. Players pay to join. A charity receives a built-in share.
                The host gets rewarded for running it. The event becomes the fundraising engine.
              </p>

              <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/65">
                That means the platform has to work for three groups at the same time: people looking for
                something fun to join, people who want to host and grow a community, and causes that need
                trust, visibility, and transparent funding.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
                  <p className="font-mono text-sm font-bold text-white">Players</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    Pay to participate in events that feel social, competitive, and worth showing up for.
                  </p>
                </div>
                <div className="rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
                  <p className="font-mono text-sm font-bold text-white">Hosts</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    Launch events, earn a share of entry fees, and build repeatable community activity.
                  </p>
                </div>
                <div className="rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
                  <p className="font-mono text-sm font-bold text-white">Causes</p>
                  <p className="mt-2 text-sm leading-relaxed text-white/55">
                    Receive funding through a model that is transparent, trackable, and built into the event.
                  </p>
                </div>
              </div>
            </W3Card>

            <W3Card className="h-full">
              <SectionLabel>
                <Search className="h-4 w-4" /> Start here
              </SectionLabel>

              <div className="mt-4 space-y-4">
                <a
                  href="/web3/events"
                  className="block rounded-xl border border-[#a3f542]/20 bg-[#a3f542]/5 p-5 transition hover:border-[#a3f542]/40 hover:bg-[#a3f542]/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-base font-bold text-white">Find live events</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">
                        Browse upcoming quiz nights and elimination games, discover causes, and see what is happening now.
                      </p>
                    </div>
                    <Calendar className="mt-1 h-5 w-5 text-[#a3f542]" />
                  </div>
                </a>

                <a
                  href="/web3/host"
                  className="block rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-base font-bold text-white">Host your own event</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">
                        Learn how hosting works, how payout splits are structured, and which event format suits your community.
                      </p>
                    </div>
                    <Rocket className="mt-1 h-5 w-5 text-white/70" />
                  </div>
                </a>

                <a
                  href="/web3/partners"
                  className="block rounded-xl border border-[#6ef0d4]/20 bg-[#6ef0d4]/5 p-5 transition hover:border-[#6ef0d4]/40 hover:bg-[#6ef0d4]/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-base font-bold text-white">See supported causes</p>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">
                        Explore verified non-profits, charity partners, and the trust layer behind the marketplace.
                      </p>
                    </div>
                    <HeartHandshake className="mt-1 h-5 w-5 text-[#6ef0d4]" />
                  </div>
                </a>
              </div>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* How it works                                                       */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Zap className="h-4 w-4" /> How it works
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              A simple flow for players, hosts and causes
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/60">
              The homepage should explain the model clearly. The deeper setup details can live on the host
              and features pages.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            {[
              {
                n: '01',
                title: 'A host launches an event',
                body: 'Choose a format, set the fee, select the cause, and publish the event.',
              },
              {
                n: '02',
                title: 'Players join and pay',
                body: 'Participants connect, enter the event, and compete for prizes or bragging rights.',
              },
              {
                n: '03',
                title: 'The game runs live',
                body: 'Quiz nights and elimination games create a social experience people actually want to join.',
              },
              {
                n: '04',
                title: 'Payouts happen automatically',
                body: 'When the event ends, the split is executed transparently and the cause receives its share.',
              },
            ].map(step => (
              <W3Card key={step.n} className="h-full">
                <p className="font-mono text-sm font-bold text-[#a3f542]">{step.n}</p>
                <h3 className="mt-3 font-mono text-base font-bold text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55">{step.body}</p>
              </W3Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Event formats                                                      */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Users className="h-4 w-4" /> Event formats
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Two ways to bring people together
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <W3Card className="h-full">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#a3f542]/20 bg-[#a3f542]/10">
                <Trophy className="h-5 w-5 text-[#a3f542]" />
              </div>

              <h3 className="font-mono text-xl font-bold text-white">Quiz nights</h3>
              <p className="mt-3 text-base leading-relaxed text-white/60">
                Longer-form social events with live scoring, leaderboards, prizes, and a format communities
                already understand. Good for clubs, creators, DAOs, and online communities that want a deeper session.
              </p>

              <ul className="mt-5 space-y-2 text-sm text-white/55">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#a3f542]" />
                  Team or player participation
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#a3f542]" />
                  Live scoring and social energy
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#a3f542]" />
                  Strong fit for hosted community nights
                </li>
              </ul>

              <a
                href="/web3/quiz"
                className="mt-6 inline-flex items-center gap-2 font-mono text-sm font-semibold text-[#a3f542] transition hover:text-white"
              >
                Explore quiz hosting <ArrowRight className="h-4 w-4" />
              </a>
            </W3Card>

            <W3Card className="h-full">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-400/10">
                <Crosshair className="h-5 w-5 text-orange-400" />
              </div>

              <h3 className="font-mono text-xl font-bold text-white">Elimination games</h3>
              <p className="mt-3 text-base leading-relaxed text-white/60">
                Shorter, faster, higher-intensity sessions where players are knocked out round by round until
                one person remains. Good for spotlight fundraising moments, quick community events, and repeat play.
              </p>

              <ul className="mt-5 space-y-2 text-sm text-white/55">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-orange-400" />
                  Short-format, high-energy play
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-orange-400" />
                  Easy to run multiple times
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-orange-400" />
                  Strong fit for live fundraising moments
                </li>
              </ul>

              <a
                href="/web3/elimination"
                className="mt-6 inline-flex items-center gap-2 font-mono text-sm font-semibold text-orange-400 transition hover:text-white"
              >
                Explore elimination hosting <ArrowRight className="h-4 w-4" />
              </a>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Why different / trust                                              */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Shield className="h-4 w-4" /> Why FundRaisely is different
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Built for participation, trust and visibility
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: <Coins className="h-5 w-5 text-[#a3f542]" />,
                title: 'Hosts can earn',
                body: 'The host is part of the model, not an afterthought. Running the event is rewarded through a fixed split.',
              },
              {
                icon: <HeartHandshake className="h-5 w-5 text-[#6ef0d4]" />,
                title: 'Causes are central',
                body: 'The event is designed so that a verified cause receives a defined share as part of the event logic.',
              },
              {
                icon: <Wallet className="h-5 w-5 text-white/80" />,
                title: 'On-chain transparency',
                body: 'Payouts are visible, traceable, and easier to verify than manual fundraiser handling.',
              },
              {
                icon: <BadgeCheck className="h-5 w-5 text-amber-400" />,
                title: 'Trust-focused marketplace',
                body: 'Players, hosts and causes all need confidence. The marketplace structure is designed around that trust.',
              },
            ].map(item => (
              <W3Card key={item.title} className="h-full">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-[#0a0e14]">
                  {item.icon}
                </div>
                <h3 className="font-mono text-base font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/55">{item.body}</p>
              </W3Card>
            ))}
          </div>

          <W3Card className="mt-6 border-[#6ef0d4]/15">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <h3 className="font-mono text-2xl font-bold text-white">
                  Verified causes and transparent payout logic matter
                </h3>
                <p className="mt-4 text-base leading-relaxed text-white/60">
                  A marketplace like this only works if people trust where the money goes. That is why the
                  homepage still needs visible trust content. Players need to know they are funding something real.
                  Hosts need confidence before they launch. Causes need clarity on how they are represented.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="/web3/partners"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#6ef0d4]/30 bg-[#6ef0d4]/10 px-5 py-3 font-mono text-sm font-semibold text-[#6ef0d4] transition hover:border-[#6ef0d4]/70 hover:bg-[#6ef0d4]/15"
                  >
                    <BadgeCheck className="h-4 w-4" /> View causes and partners
                  </a>
                  <a
                    href="/web3/features"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-5 py-3 font-mono text-sm font-semibold text-white/65 transition hover:border-white/30 hover:text-white"
                  >
                    <Zap className="h-4 w-4" /> See platform features
                  </a>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
                  <p className="font-mono text-sm font-bold text-white">For players</p>
                  <p className="mt-2 text-sm text-white/55">
                    “Where does my money go?”
                  </p>
                </div>
                <div className="rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
                  <p className="font-mono text-sm font-bold text-white">For hosts</p>
                  <p className="mt-2 text-sm text-white/55">
                    “Can I trust the payout model?”
                  </p>
                </div>
                <div className="rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
                  <p className="font-mono text-sm font-bold text-white">For causes</p>
                  <p className="mt-2 text-sm text-white/55">
                    “How are we represented and funded?”
                  </p>
                </div>
              </div>
            </div>
          </W3Card>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FAQ                                                                */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <MessageCircle className="h-4 w-4" /> FAQ
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Common questions
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/60">
              This section helps with both trust and search. Keep the visible answers aligned with the FAQ schema above.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {faqItems.map(item => (
              <FAQCard key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Final CTA                                                          */}
      {/* ================================================================== */}
      <section className="relative z-10 py-16">
        <div className="container mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#a3f542]/20 p-8 text-center sm:p-10">
            <SectionLabel>
              <ArrowRight className="h-4 w-4" /> Next step
            </SectionLabel>

            <h2 className="mt-4 font-mono text-3xl font-bold text-white sm:text-4xl">
              Find an event or run your own
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/60">
              Start with the path that matches your intent. Browse the marketplace, learn how hosting works,
              or explore the causes behind the events.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/web3/events"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Calendar className="h-4 w-4" /> Find events
              </a>

              <a
                href="/web3/host"
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3 font-mono font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
              >
                <Rocket className="h-4 w-4" /> Host an event
              </a>

              <a
                href="/web3/partners"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <HeartHandshake className="h-4 w-4" /> Causes
              </a>
            </div>
          </W3Card>
        </div>
      </section>
    </div>
  );
};

export default Web3MainIndex;


