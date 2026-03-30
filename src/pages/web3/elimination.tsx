// src/pages/web3/elimination.tsx
import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';

import { EliminationWeb3Page } from '../../components/elimination/EliminationWeb3Page';

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                  */
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
/* Design tokens                                                                */
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
/* Page                                                                         */
/* -------------------------------------------------------------------------- */
const Web3EliminationPage: React.FC = () => {
  const [showForm, setShowForm] = useState(false);

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
        'Run a last-player-standing elimination game for your community on Solana. Smart contract payouts to host, winner, and charity the moment the game ends. Fast, tense, and fully on-chain.',
      url: abs('/web3/elimination'),
      isPartOf: { '@type': 'WebSite', url: abs('/') },
    }),
    []
  );

  /* Show the setup form as a full-page overlay */
  if (showForm) {
    return (
      <div className="relative">
        {/* Back button */}
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
        title="Host a Web3 Elimination Game: On-Chain Fundraising in 20 Minutes | FundRaisely"
        description="Run a last-player-standing elimination game for your community on Solana. Smart contract payouts to host, winner, and charity the moment the game ends. Fast, tense, and fully on-chain."
        ukKeywords="web3 elimination game uk, host crypto fundraiser uk, last player standing blockchain uk, solana elimination uk, on-chain charity game uk"
        ieKeywords="web3 elimination game ireland, host crypto fundraiser ireland, last player standing blockchain ireland, solana elimination ireland, on-chain charity events ireland"
        keywords="host web3 elimination game, crypto fundraising elimination, blockchain last player standing, solana elimination fundraiser, on-chain charity game, web3 community event, elimination game crypto"
        type="website"
        domainStrategy="geographic"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd]}
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Web3 Fundraising', item: '/web3' },
          { name: 'Host Elimination', item: '/web3/elimination' },
        ]}
      />

      <Web3Header />

      {/* ============================================================ */}
      {/* Hero                                                           */}
      {/* ============================================================ */}
      <section className="relative z-10 pb-12 pt-16">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel><Crosshair className="h-4 w-4" /> Elimination Game</SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Last one standing.<br />
              <span className="text-orange-400">Winner takes the pot.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/70">
              Host a last-player-standing elimination game for your community on Solana. Players pay
              their entry fee into a smart contract. Round by round, players are knocked out. When one
              player is left, the contract pays out the winner, your host cut, and the charity
              automatically. The whole thing takes about 20 minutes.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono text-lg font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <Crosshair className="h-5 w-5" /> Host Elimination
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

            {/* Stat strip */}
            <div className="mt-12 flex w-full flex-wrap justify-center gap-8 border-t border-[#1e2d42] pt-8 sm:justify-between">
              {[
                { value: '20%', label: 'You earn as host' },
                { value: '30%', label: 'Winner prize' },
                { value: '35%', label: 'To charity' },
                { value: '~20 min', label: 'Per game' },
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
      {/* What elimination is                                           */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Flame className="h-4 w-4" /> How it works</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Fast, tense, and over in <span className="text-orange-400">20 minutes.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              Elimination is the simplest game format on FundRaisely. No scoring, no leaderboard
              complexity. Just rounds, knockouts, and one winner.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '01',
                title: 'Players join',
                body: 'Each player connects their Solana wallet and pays the entry fee directly into the smart contract. Everyone is in the pool.',
                color: 'text-orange-400',
                bg: 'bg-orange-400/10',
              },
              {
                n: '02',
                title: 'Rounds begin',
                body: 'Each round, players answer. Those who get it wrong or are slowest are eliminated. The round result is instant.',
                color: 'text-orange-400',
                bg: 'bg-orange-400/10',
              },
              {
                n: '03',
                title: 'Last one standing',
                body: 'Players are knocked out round by round until one remains. The tension builds as the field narrows.',
                color: 'text-orange-400',
                bg: 'bg-orange-400/10',
              },
              {
                n: '04',
                title: 'Contract pays out',
                body: 'The moment the game ends, the contract distributes everything simultaneously: winner, host, charity, and platform.',
                color: 'text-orange-400',
                bg: 'bg-orange-400/10',
              },
            ].map(({ n, title, body, color  }) => (
              <W3Card key={n} className="border-orange-400/10">
                <p className={`mb-3 font-mono text-3xl font-bold opacity-30 ${color}`}>{n}</p>
                <h3 className={`mb-2 font-mono text-sm font-bold ${color}`}>{title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{body}</p>
              </W3Card>
            ))}
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
              Locked in the contract. <span className="text-orange-400">Before anyone pays a cent.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              The split is set when you deploy. Players see exactly where their entry fee goes before
              they join. Nobody changes it after the game starts.
            </p>
          </div>

          <W3Card className="border-orange-400/20 mx-auto max-w-2xl">
            <div className="flex flex-wrap justify-center gap-4 py-2">
              {[
                { label: 'You earn', pct: '20%', accent: 'border-orange-400/20 bg-orange-400/10', text: 'text-orange-400' },
                { label: 'Winner', pct: '30%', accent: 'border-amber-400/20 bg-amber-400/10', text: 'text-amber-400' },
                { label: 'Charity', pct: '35%', accent: 'border-[#6ef0d4]/20 bg-[#6ef0d4]/10', text: 'text-[#6ef0d4]' },
                { label: 'Platform', pct: '15%', accent: 'border-[#1e2d42] bg-white/5', text: 'text-white/40' },
              ].map(({ label, pct, accent, text }) => (
                <div key={label} className={`flex flex-col items-center rounded-xl border px-8 py-5 ${accent}`}>
                  <span className={`font-mono text-3xl font-bold ${text}`}>{pct}</span>
                  <span className="mt-1 text-sm font-medium text-white/50">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-sm leading-relaxed text-white/40">
              Elimination sends 35% to charity — the largest charity share of any FundRaisely game format.
            </p>
          </W3Card>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Why elimination works for communities                         */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Users className="h-4 w-4" /> Why it works</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              The format that <span className="text-orange-400">keeps everyone watching.</span>
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <W3Card className="border-orange-400/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-400/10">
                <Timer className="h-5 w-5 text-orange-400" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">20 minutes start to finish</h3>
              <p className="text-base leading-relaxed text-white/60">
                Elimination games are short. You can run three in an evening and stack the earnings.
                Each one is a self-contained event with its own contract and its own payout. No
                commitment beyond the game you are running right now.
              </p>
            </W3Card>

            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Flame className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Drama keeps people in the room</h3>
              <p className="text-base leading-relaxed text-white/60">
                Unlike a quiz where the winner is only revealed at the end, elimination is visible in
                real time. Eliminated players watch. People cheer for who is left. The crowd stays
                engaged until the final player is standing.
              </p>
            </W3Card>

            <W3Card className="border-[#6ef0d4]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                <Coins className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">35% to charity — the highest split</h3>
              <p className="text-base leading-relaxed text-white/60">
                Elimination sends more to charity than any other game format on FundRaisely. For
                communities that want maximum impact from their events, this is the format that delivers
                the most per player.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Chain — Solana only for elimination                           */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Globe className="h-4 w-4" /> Chain</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Built on Solana. <span className="text-[#a3f542]">Fast enough to keep up with the game.</span>
            </h2>
          </div>

          <W3Card className="border-[#9945FF]/20 mx-auto max-w-3xl">
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
              Elimination runs on Solana because the game needs speed. Sub-second transaction
              finality means round results register instantly and payouts land the moment the game
              ends. Fees are a fraction of a cent per player, so nothing is lost to gas costs.
            </p>
            <div className="mb-4">
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-white/30">Supported tokens</p>
              <p className="font-mono text-sm text-white/60">
                SOL · USDC · JUP · JTO · PYTH · KMNO · WIF · BONK · MEW · TRUMP
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                'Multi-token entry fees — players choose their token',
                'Sub-second finality keeps the game moving',
                'Compatible with Phantom and Solflare',
                'Charity payouts verified via The Giving Block',
                'Fees under $0.01 per transaction',
                'Live on Solana mainnet',
              ].map(t => (
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
      {/* Trust section                                                  */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Shield className="h-4 w-4" /> Trust</SectionLabel>
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
                it during the game. Not you, not us.
              </p>
            </W3Card>
            <W3Card className="border-[#6ef0d4]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Charities verified via The Giving Block</h3>
              <p className="text-base leading-relaxed text-white/60">
                Every charity wallet is verified through The Giving Block before it appears in the
                selector. The 35% goes directly to a real, verified organisation.
              </p>
            </W3Card>
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Wallet className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">No platform custody</h3>
              <p className="text-base leading-relaxed text-white/60">
                Entry fees go straight into the contract and stay there until the game ends.
                FundRaisely never holds the money. Every payout is a public Solana transaction
                anyone can verify on Solscan.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Quiz comparison                                               */}
      {/* ============================================================ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="p-8">
            <div className="mb-6 text-center">
              <h2 className="font-mono text-2xl font-bold text-white">
                Not sure which format suits your crowd?
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-white/50">
                Both games run on smart contracts with instant payouts. The difference is the experience.
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
                    'Stack multiple games in one evening',
                    '35% to charity — highest split',
                    'High tension, everyone watches',
                    'Simple to run — no quiz content needed',
                    'Best for competitive communities',
                  ].map(t => (
                    <li key={t} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-orange-400" />{t}
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
                    '25% host earnings — highest host cut',
                    '30% to charity',
                    'Full quiz with rounds and leaderboard',
                    'Real-time scoring and tiebreakers',
                    'Best for knowledge-based communities',
                  ].map(t => (
                    <li key={t} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-[#a3f542]" />{t}
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
                We run regular live sessions where you can watch a full elimination game from setup to
                payout and ask questions before you go live with your own crowd.
              </p>
            </W3Card>
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <MessageCircle className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Questions before you start?</h3>
              <p className="mb-4 text-base leading-relaxed text-white/60">
                Get in touch and we will walk you through the setup, the wallet connection, and what
                to expect when you run your first game.
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
          <W3Card className="border-orange-400/20 p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-orange-400/60">Ready to host</p>
            <h2 className="mt-3 font-mono text-4xl font-bold text-white">
              Deploy. Play. Get paid.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Connect your Solana wallet, set your entry fee, pick a charity, and launch the contract.
              Twenty minutes later, everyone is paid and the game is done.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <Crosshair className="h-5 w-5" /> Host Elimination
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