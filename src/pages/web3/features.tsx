import React from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';

import {
  Wallet,
  Coins,
  ShieldCheck,
  Zap,
  Globe,
  HeartHandshake,
  Trophy,
  Crosshair,
  Lock,
  BadgeCheck,
  Target,
  Users,
  MessageCircle,
  Link2,
  SplitSquareHorizontal,
  CircleDollarSign,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* URL helpers                                                                */
/* -------------------------------------------------------------------------- */
function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return 'https://fundraisely.ie';
}

function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

/* -------------------------------------------------------------------------- */
/* Design tokens                                                              */
/* bg-[#0a0e14]   near-black base                                             */
/* bg-[#0f1520]   card surface                                                */
/* border-[#1e2d42] subtle grid lines                                         */
/* text-[#a3f542]  acid green                                                 */
/* text-[#6ef0d4]  teal charity                                               */
/* text-amber-400  amber winner                                               */
/* text-orange-400 orange elimination / BONK                                  */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Shared components                                                          */
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

const PayoutPill: React.FC<{
  label: string;
  pct: string;
  accent: string;
  textAccent: string;
}> = ({ label, pct, accent, textAccent }) => (
  <div className={`flex flex-col items-center rounded-xl border px-6 py-4 ${accent}`}>
    <span className={`font-mono text-2xl font-bold ${textAccent}`}>{pct}</span>
    <span className="mt-1 text-xs font-medium text-white/50">{label}</span>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Feature card                                                               */
/* -------------------------------------------------------------------------- */
const FeatureCard: React.FC<{
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
}> = ({ icon, iconColor, iconBg, title, body }) => (
  <W3Card>
    <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border ${iconBg}`}>
      <div className={iconColor}>{icon}</div>
    </div>
    <h3 className="mb-2 font-mono text-base font-bold text-white">{title}</h3>
    <p className="text-base leading-relaxed text-white/60">{body}</p>
  </W3Card>
);

/* -------------------------------------------------------------------------- */
/* Contract split table row                                                   */
/* -------------------------------------------------------------------------- */
const SplitRow: React.FC<{
  label: string;
  elim: string;
  quiz: string;
  elimColor: string;
  quizColor: string;
  bold?: boolean;
}> = ({ label, elim, quiz, elimColor, quizColor, bold = false }) => (
  <tr className={`border-t border-[#1e2d42] ${bold ? 'bg-[#0a0e14]' : ''}`}>
    <td className={`py-3 pl-4 font-mono text-sm ${bold ? 'font-bold text-white' : 'text-white/60'}`}>
      {label}
    </td>
    <td className={`py-3 text-center font-mono text-sm font-bold ${elimColor}`}>
      {elim}
    </td>
    <td className={`py-3 pr-4 text-center font-mono text-sm font-bold ${quizColor}`}>
      {quiz}
    </td>
  </tr>
);

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */
const Web3Features: React.FC = () => {
  const supportedSolanaTokens = [
    'SOL',
    'USDG',
    'JUP',
    'BONK',
    'WIF',
    'JTO',
    'KMNO',
    'TRUMP',
    'MEW',
    'PYTH',
  ];

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Features', item: abs('/web3/features') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Web3 Fundraising Features: Smart Contracts, On-Chain Payouts, Verified Charities | FundRaisely',
    description:
      'How FundRaisely works under the hood: smart contract payout enforcement, verified non-profits through The Giving Block, Buddies for Paws impact matching, multi-token Solana payments, and transparent event splits.',
    url: abs('/web3/features'),
  };

  const serviceJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: 'Web3 Fundraising Platform',
    provider: { '@type': 'Organization', name: 'FundRaisely', url: abs('/') },
    description:
      'Smart contract-powered fundraising events on Solana with multi-token payment support. Hosts run quiz nights or elimination games; entry fees are distributed automatically to winners, hosts, verified causes, and platform infrastructure.',
    areaServed: ['IE', 'GB'],
    serviceType: 'Fundraising Platform',
  };

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
        title="Web3 Fundraising Features: Smart Contracts, On-Chain Payouts, Verified Charities | FundRaisely"
        description="How FundRaisely works under the hood: smart contract payout enforcement, verified non-profits through The Giving Block, Buddies for Paws impact matching, multi-token Solana payments, and transparent event splits."
        keywords="web3 fundraising features, smart contract payouts, on-chain charity, Solana fundraising, Solana token payments, BONK charity matching, Buddies for Paws, The Giving Block, transparent splits, quiz night web3, elimination game crypto"
        domainStrategy="geographic"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, serviceJsonLd]}
      />

      <Web3Header />

      {/* ================================================================== */}
      {/* Hero                                                               */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-12 pt-16">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel>
              <Zap className="h-4 w-4" /> Platform Features
            </SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Web3 Fundraising Marketplace.
              <br />
              <span className="text-[#a3f542]">Transparent by default.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/70">
              Every quiz night and elimination game on FundRaisely runs through smart
              contract-powered payments. Entry fees go in, the event runs, and payouts
              are distributed to the winner, the host, the cause, and the platform when
              the event ends. No one controls where the money goes. The code does.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/web3/elimination"
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-6 py-3 font-mono font-semibold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <Crosshair className="h-4 w-4" /> Explore Elimination
              </a>

              <a
                href="/web3/quiz"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Trophy className="h-4 w-4" /> Explore Quiz
              </a>

              <a
                href="/web3"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <Target className="h-4 w-4" /> Web3 Overview
              </a>
            </div>

            {/* Quick stats */}
            <div className="mt-12 flex w-full flex-wrap justify-center gap-8 border-t border-[#1e2d42] pt-8 sm:justify-between">
              {[
                { value: 'Solana', label: 'active Web3 chain' },
                { value: 'SOL + 9 SPL', label: 'supported tokens' },
                { value: '100%', label: 'on-chain payouts' },
                { value: 'TGB + BFP', label: 'verification & impact' },
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

      {/* ================================================================== */}
      {/* How the contract works                                             */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Lock className="h-4 w-4" /> Smart contracts
            </SectionLabel>

            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              The contract runs the event. <span className="text-[#a3f542]">Not us.</span>
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              When a host creates a Web3 event on FundRaisely, the payout logic is handled
              through smart contract-powered rails. The contract collects entry fees, holds
              funds during the event, and executes the payout automatically when the event
              closes. Nobody can intercept the funds or change the split.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '01',
                title: 'Event created',
                body: 'The host picks a game type, selects an approved cause or impact route, and sets the entry fee. The payout logic is locked in before players join.',
              },
              {
                n: '02',
                title: 'Players join',
                body: 'Each player connects their wallet and pays the entry fee into the Web3 payment flow. The platform does not manually hold or redirect event funds.',
              },
              {
                n: '03',
                title: 'Event runs',
                body: 'The quiz or elimination game runs live. The host puts on the event, players compete, and the payout route remains fixed throughout the game.',
              },
              {
                n: '04',
                title: 'Automatic payout',
                body: 'The payout is distributed according to the event split: winner prize, host cut, charity allocation, and platform fee. Transactions are recorded on-chain.',
              },
            ].map(({ n, title, body }) => (
              <W3Card key={n}>
                <p className="mb-3 font-mono text-3xl font-bold text-[#a3f542]/30">
                  {n}
                </p>
                <h3 className="mb-2 font-mono text-sm font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{body}</p>
              </W3Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Payout splits                                                      */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <SplitSquareHorizontal className="h-4 w-4" /> Payout splits
            </SectionLabel>

            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Every crypto accounted for. <span className="text-[#a3f542]">Every time.</span>
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              The split is fixed before the event starts. Players know exactly where their
              entry fee goes before they join. There are no surprises, no discretionary
              allocations, and no way to change the split after the event is created.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Quiz splits */}
            <W3Card className="border-[#a3f542]/20">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#a3f542]/20 bg-[#a3f542]/10">
                  <Trophy className="h-5 w-5 text-[#a3f542]" />
                </div>

                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">
                    Quiz night
                  </p>
                  <h3 className="font-mono text-lg font-bold text-white">
                    Quiz payout split
                  </h3>
                </div>
              </div>

              <div className="mb-5 flex flex-wrap justify-center gap-3">
                <PayoutPill label="Host" pct="25%" accent="border-[#a3f542]/20 bg-[#a3f542]/10" textAccent="text-[#a3f542]" />
                <PayoutPill label="Winner" pct="30%" accent="border-amber-400/20 bg-amber-400/10" textAccent="text-amber-400" />
                <PayoutPill label="Charity" pct="30%" accent="border-[#6ef0d4]/20 bg-[#6ef0d4]/10" textAccent="text-[#6ef0d4]" />
                <PayoutPill label="Platform" pct="15%" accent="border-[#1e2d42] bg-white/5" textAccent="text-white/40" />
              </div>

              <p className="text-sm leading-relaxed text-white/50">
                The host earns 25% for running the event. The highest scorer wins 30% of the
                prize pool. The chosen charity receives 30% automatically. The platform retains
                15% to keep the infrastructure running.
              </p>
            </W3Card>

            {/* Elimination splits */}
            <W3Card className="border-orange-400/20">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/10">
                  <Crosshair className="h-5 w-5 text-orange-400" />
                </div>

                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-orange-400/60">
                    Elimination game
                  </p>
                  <h3 className="font-mono text-lg font-bold text-white">
                    Elimination payout split
                  </h3>
                </div>
              </div>

              <div className="mb-5 flex flex-wrap justify-center gap-3">
                <PayoutPill label="Host" pct="20%" accent="border-orange-400/20 bg-orange-400/10" textAccent="text-orange-400" />
                <PayoutPill label="Winner" pct="30%" accent="border-amber-400/20 bg-amber-400/10" textAccent="text-amber-400" />
                <PayoutPill label="Charity" pct="35%" accent="border-[#6ef0d4]/20 bg-[#6ef0d4]/10" textAccent="text-[#6ef0d4]" />
                <PayoutPill label="Platform" pct="15%" accent="border-[#1e2d42] bg-white/5" textAccent="text-white/40" />
              </div>

              <p className="text-sm leading-relaxed text-white/50">
                Elimination sends a larger share to charity at 35%, reflecting the faster
                format. The last player standing wins 30%. The host earns 20% for organising
                and running the game. Platform fee is 15%.
              </p>
            </W3Card>
          </div>

          {/* Comparison table */}
          <W3Card className="mt-6 overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0a0e14]">
                  <th className="py-3 pl-4 text-left font-mono text-xs uppercase tracking-widest text-white/30">
                    Recipient
                  </th>
                  <th className="py-3 text-center font-mono text-xs uppercase tracking-widest text-orange-400/60">
                    Elimination
                  </th>
                  <th className="py-3 pr-4 text-center font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">
                    Quiz
                  </th>
                </tr>
              </thead>
              <tbody>
                <SplitRow label="Host" elim="20%" quiz="25%" elimColor="text-orange-400" quizColor="text-[#a3f542]" />
                <SplitRow label="Winner" elim="30%" quiz="30%" elimColor="text-amber-400" quizColor="text-amber-400" />
                <SplitRow label="Charity" elim="35%" quiz="30%" elimColor="text-[#6ef0d4]" quizColor="text-[#6ef0d4]" />
                <SplitRow label="Platform" elim="15%" quiz="15%" elimColor="text-white/40" quizColor="text-white/40" />
                <SplitRow label="Total" elim="100%" quiz="100%" elimColor="text-white" quizColor="text-white" bold />
              </tbody>
            </table>
          </W3Card>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Chain and tokens                                                    */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Globe className="h-4 w-4" /> Chain and tokens
            </SectionLabel>

            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Built for fast, low-cost <span className="text-[#a3f542]">Solana events.</span>
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              FundRaisely’s Web3 game flow is currently focused on Solana, with support for
              low-cost transactions, fast settlement, and multiple community tokens used in
              live fundraising experiences.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <W3Card className="border-[#9945FF]/20">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#9945FF]/30 bg-[#9945FF]/10">
                  <CircleDollarSign className="h-6 w-6 text-[#9945FF]" />
                </div>

                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-[#9945FF]/60">
                    Active chain
                  </p>
                  <h3 className="font-mono text-xl font-bold text-white">Solana</h3>
                </div>
              </div>

              <p className="mb-4 text-base leading-relaxed text-white/60">
                Solana gives FundRaisely the speed and low fees needed for live game events.
                It keeps participation affordable, supports near-instant settlement, and makes
                every payout publicly verifiable.
              </p>

              <div className="space-y-2">
                {[
                  'Fast transactions for live quiz and elimination events',
                  'Low fees for players, hosts, and payout execution',
                  'Compatible with Phantom, Solflare, Backpack, and major Solana wallets',
                  'Public transaction history through Solscan',
                  'Designed for community-led fundraising experiences',
                ].map(t => (
                  <div key={t} className="flex items-start gap-2 text-sm text-white/50">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9945FF]" />
                    {t}
                  </div>
                ))}
              </div>
            </W3Card>

            <W3Card className="border-orange-400/20">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-orange-400/30 bg-orange-400/10">
                  <Coins className="h-6 w-6 text-orange-400" />
                </div>

                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-orange-400/60">
                    Supported tokens
                  </p>
                  <h3 className="font-mono text-xl font-bold text-white">
                    Multi-token Solana support
                  </h3>
                </div>
              </div>

              <p className="mb-4 text-base leading-relaxed text-white/60">
                FundRaisely currently supports a range of Solana tokens for Web3 game entry
                fees. This lets hosts choose the token that best fits their community, from
                native SOL to ecosystem tokens like BONK, JUP, JTO, PYTH, and more.
              </p>

              <div className="mb-5 flex flex-wrap gap-2">
                {supportedSolanaTokens.map(token => (
                  <span
                    key={token}
                    className={`rounded-full border px-3 py-1.5 font-mono text-xs font-bold ${
                      token === 'BONK'
                        ? 'border-orange-400/40 bg-orange-400/10 text-orange-300'
                        : 'border-[#1e2d42] bg-white/5 text-white/60'
                    }`}
                  >
                    {token}
                  </span>
                ))}
              </div>

              <div className="space-y-2">
                {[
                  'SOL for native Solana payments',
                  'USDG for stable-value fundraising flows',
                  'BONK for community-led fundraising and BFP matching impact',
                  'Ecosystem tokens including JUP, WIF, JTO, KMNO, TRUMP, MEW, and PYTH',
                  'Transparent token transfers recorded on-chain',
                ].map(t => (
                  <div key={t} className="flex items-start gap-2 text-sm text-white/50">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                    {t}
                  </div>
                ))}
              </div>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Charity verification                                                */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#6ef0d4]/20 p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <SectionLabel>
                  <HeartHandshake className="h-4 w-4" /> Charity verification
                </SectionLabel>

                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Verified causes and <span className="text-[#6ef0d4]">trusted impact routes.</span>
                </h2>

                <p className="mt-4 text-base leading-relaxed text-white/60">
                  FundRaisely separates direct verified causes from partner-led impact
                  networks. Direct charity recipients are prioritised through The Giving
                  Block, helping ensure the organisation and crypto donation route are
                  legitimate before they can be used in a live event.
                </p>

                <p className="mt-3 text-base leading-relaxed text-white/60">
                  Through Buddies for Paws, FundRaisely also supports a BONK-powered impact
                  route for animal welfare causes. When eligible quiz or elimination events
                  use BONK as the fee token, the charity portion can connect to BFP matching
                  support, helping increase the total impact delivered.
                </p>

                <p className="mt-3 text-base leading-relaxed text-white/60">
                  The goal is simple: hosts should be able to choose approved causes and
                  trusted impact networks with confidence, while players can see how event
                  funds are routed and verified.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href="/web3/causes"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#6ef0d4]/40 bg-[#6ef0d4]/10 px-5 py-3 font-mono font-semibold text-[#6ef0d4] transition hover:border-[#6ef0d4]/80 hover:bg-[#6ef0d4]/20"
                  >
                    <BadgeCheck className="h-4 w-4" /> View causes
                  </a>

                  <a
                    href="/web3/partners"
                    className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-5 py-3 font-mono font-semibold text-orange-300 transition hover:border-orange-400/80 hover:bg-orange-400/20"
                  >
                    <HeartHandshake className="h-4 w-4" /> View partners
                  </a>

                  <a
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-5 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
                  >
                    <MessageCircle className="h-4 w-4" /> Become a recipient
                  </a>
                </div>
              </div>

              <div className="grid gap-3">
                {[
                  {
                    icon: <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Direct verified causes',
                    body: 'Direct FundRaisely cause partners are prioritised through The Giving Block so hosts can choose approved recipients with more confidence.',
                  },
                  {
                    icon: <HeartHandshake className="h-5 w-5 text-orange-300" />,
                    title: 'Buddies for Paws impact network',
                    body: 'BFP helps connect BONK-powered FundRaisely events with a wider animal welfare impact network and matching support.',
                  },
                  {
                    icon: <Lock className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Contract-enforced routing',
                    body: 'The payout route is defined before the event starts. Once the event closes, transfers are executed according to the event logic.',
                  },
                  {
                    icon: <Link2 className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Publicly verifiable on-chain',
                    body: 'Every Web3 event payout is a real blockchain transaction. Supporters can verify amounts, recipients, and timing through Solscan.',
                  },
                ].map(({ icon, title, body }) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4"
                  >
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div>
                      <p className="mb-1 font-mono text-sm font-bold text-white">
                        {title}
                      </p>
                      <p className="text-xs leading-relaxed text-white/40">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </W3Card>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Core platform features                                             */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Zap className="h-4 w-4" /> Platform features
            </SectionLabel>

            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Everything that makes it work.
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              The features behind every Web3 quiz night and elimination game on FundRaisely.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Wallet className="h-5 w-5" />}
              iconColor="text-white/70"
              iconBg="border-[#1e2d42] bg-white/5"
              title="Wallet connection, no account needed"
              body="Players and hosts connect with their own Web3 wallet. No email address, no signup form, no password. Your wallet is your identity. Works with major Solana wallets including Phantom, Solflare, and Backpack."
            />

            <FeatureCard
              icon={<Lock className="h-5 w-5" />}
              iconColor="text-[#a3f542]"
              iconBg="border-[#a3f542]/20 bg-[#a3f542]/10"
              title="Immutable payout logic"
              body="Once the event payout route is created, the payout split cannot be changed. Not by the host, not by the platform, not by anyone. Players join knowing exactly what they are agreeing to."
            />

            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              iconColor="text-[#6ef0d4]"
              iconBg="border-[#6ef0d4]/20 bg-[#6ef0d4]/5"
              title="No platform custody of funds"
              body="FundRaisely is designed so the platform does not manually hold or redirect Web3 event funds. Entry fees move through the smart contract-powered event flow and are distributed according to the event split."
            />

            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              iconColor="text-white/70"
              iconBg="border-[#1e2d42] bg-white/5"
              title="Live events with real-time scoring"
              body="Quiz nights include real-time scoring, a live leaderboard, and tiebreaker support. Elimination games track players round by round until one remains. Both formats are designed to keep players engaged from start to finish."
            />

            <FeatureCard
              icon={<Coins className="h-5 w-5" />}
              iconColor="text-amber-400"
              iconBg="border-amber-400/20 bg-amber-400/10"
              title="Instant on-chain payouts"
              body="When the host closes the event, the payout can be executed on-chain according to the locked event split. Winners, hosts, charities, and platform infrastructure are paid through the same transparent Web3 payout flow."
            />

            <FeatureCard
              icon={<Link2 className="h-5 w-5" />}
              iconColor="text-white/70"
              iconBg="border-[#1e2d42] bg-white/5"
              title="Public transaction history"
              body="Every Web3 payout is a real blockchain transaction. Supporters can look up the event on Solscan and see the amounts, recipient wallets, and timestamp. There is nothing hidden and nothing to take on trust."
            />
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Wallet support                                                     */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Wallet className="h-4 w-4" /> Wallet support
            </SectionLabel>

            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              If your community has a Solana wallet,{' '}
              <span className="text-[#a3f542]">they can play.</span>
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              FundRaisely supports widely used Solana wallets. No proprietary wallet
              required. Players connect the wallet they already use. Powered by Reown
              AppKit.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: 'Phantom',
                chain: 'Solana',
                note: 'The most popular Solana wallet. Simple, fast, and widely used across Web3 gaming, NFT, and DeFi communities.',
              },
              {
                name: 'Solflare',
                chain: 'Solana',
                note: 'A full-featured Solana wallet with strong multi-token support and hardware wallet compatibility.',
              },
              {
                name: 'Backpack',
                chain: 'Solana',
                note: 'A modern wallet used across Solana communities, with support for tokens, apps, and on-chain experiences.',
              },
            ].map(({ name, chain, note }) => (
              <W3Card key={name}>
                <p className="mb-1 font-mono text-lg font-bold text-white">{name}</p>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">
                  {chain}
                </p>
                <p className="text-sm leading-relaxed text-white/50">{note}</p>
              </W3Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Transparency                                                       */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Link2 className="h-4 w-4" /> Transparency
            </SectionLabel>

            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Nothing to take on trust. <span className="text-[#a3f542]">Everything on-chain.</span>
            </h2>

            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              The most important thing about Web3 fundraising is that it does not require
              anyone to trust anyone. The rules are in the code. The transactions are public.
              Anyone can verify what happened.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Lock className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">
                The split is in the code
              </h3>
              <p className="text-base leading-relaxed text-white/60">
                The payout percentages are not just a policy or a setting. They are part of
                the event payout logic. There is no admin panel where someone can secretly
                change them after players have joined.
              </p>
            </W3Card>

            <W3Card className="border-[#6ef0d4]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">
                Causes are verified before events go live
              </h3>
              <p className="text-base leading-relaxed text-white/60">
                FundRaisely separates direct verified causes from partner-led impact routes.
                Direct charities are prioritised through The Giving Block, while BFP supports
                a wider animal welfare impact network.
              </p>
            </W3Card>

            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Link2 className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">
                Every transaction is public
              </h3>
              <p className="text-base leading-relaxed text-white/60">
                Every Web3 payout from every event is recorded on Solana and visible through
                Solscan. Hosts can share the transaction link. Players can verify the charity
                received its share.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CTA                                                                */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-20 pt-4">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#a3f542]/20 p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">
              Ready to host
            </p>

            <h2 className="mt-3 font-mono text-4xl font-bold text-white">
              Start your first event.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Pick a game, choose your cause or impact route, set your entry fee, and go
              live. The Web3 payout flow handles the split from there. Questions first? Get
              in touch.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="/web3/elimination"
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <Crosshair className="h-5 w-5" /> Explore Elimination
              </a>

              <a
                href="/web3/quiz"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Trophy className="h-5 w-5" /> Explore Quiz
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

export default Web3Features;



