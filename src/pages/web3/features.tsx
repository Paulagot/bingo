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
  Building2,
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
/* URL helpers                                                                  */
/* -------------------------------------------------------------------------- */
function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie';
}
function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

/* -------------------------------------------------------------------------- */
/* Design tokens (identical to Web3 index)                                      */
/* bg-[#0a0e14]   near-black base                                              */
/* bg-[#0f1520]   card surface                                                 */
/* border-[#1e2d42] subtle grid lines                                          */
/* text-[#a3f542]  acid green                                                  */
/* text-[#6ef0d4]  teal (charity)                                              */
/* text-amber-400  amber (winner)                                              */
/* text-orange-400 orange (elimination)                                        */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Shared components                                                            */
/* -------------------------------------------------------------------------- */
const W3Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-[#1e2d42] bg-[#0f1520] p-6 ${className}`}>{children}</div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2 rounded-full border border-[#a3f542]/30 bg-[#a3f542]/10 px-4 py-1.5 font-mono text-sm font-semibold uppercase tracking-widest text-[#a3f542]">
    {children}
  </span>
);

const PayoutPill: React.FC<{ label: string; pct: string; accent: string; textAccent: string }> = ({
  label, pct, accent, textAccent,
}) => (
  <div className={`flex flex-col items-center rounded-xl border px-6 py-4 ${accent}`}>
    <span className={`font-mono text-2xl font-bold ${textAccent}`}>{pct}</span>
    <span className="mt-1 text-xs font-medium text-white/50">{label}</span>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Feature card                                                                 */
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
/* Contract split table row                                                     */
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
    <td className={`py-3 pl-4 font-mono text-sm ${bold ? 'font-bold text-white' : 'text-white/60'}`}>{label}</td>
    <td className={`py-3 text-center font-mono text-sm font-bold ${elimColor}`}>{elim}</td>
    <td className={`py-3 pr-4 text-center font-mono text-sm font-bold ${quizColor}`}>{quiz}</td>
  </tr>
);

/* -------------------------------------------------------------------------- */
/* Page                                                                         */
/* -------------------------------------------------------------------------- */
const Web3Features: React.FC = () => {
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
      'How FundRaisely works under the hood: smart contract payout enforcement, verified non-profits via The Giving Block, multi-chain support on Solana and Base, and a transparent split for every event.',
    url: abs('/web3/features'),
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
        description="How FundRaisely works under the hood: smart contract payout enforcement, verified non-profits via The Giving Block, multi-chain support on Solana and Base, and a transparent split for every event."
        keywords="web3 fundraising features, smart contract payouts, on-chain charity, Solana fundraising, Base fundraising, The Giving Block, transparent splits, quiz night web3, elimination game crypto"
        domainStrategy="geographic"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd]}
      />

      <Web3Header />

      {/* ================================================================== */}
      {/* Hero                                                                 */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-12 pt-16">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel><Zap className="h-4 w-4" /> Platform Features</SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Built on blockchain.<br />
              <span className="text-[#a3f542]">Transparent by default.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/70">
              Every quiz night and elimination game on FundRaisely runs on a smart contract. Entry fees go in,
              the event runs, and the contract pays out the winner, the host, and the charity the moment it ends.
              No one controls where the money goes. The code does.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="/web3/elimination" className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-6 py-3 font-mono font-semibold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20">
                <Crosshair className="h-4 w-4" /> Explore Elimination
              </a>
              <a href="/web3/quiz" className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20">
                <Trophy className="h-4 w-4" /> Explore Quiz
              </a>
              <a href="/web3" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white">
                <Target className="h-4 w-4" /> Web3 Overview
              </a>
            </div>

            {/* Quick stats */}
            <div className="mt-12 flex w-full flex-wrap justify-center gap-8 border-t border-[#1e2d42] pt-8 sm:justify-between">
              {[
                { value: 'SOL + BASE', label: 'supported chains' },
                { value: 'USDC', label: 'primary token' },
                { value: '100%', label: 'on-chain payouts' },
                { value: 'Giving Block', label: 'charity verification' },
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

      {/* ================================================================== */}
      {/* How the contract works                                               */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Lock className="h-4 w-4" /> Smart contracts</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              The contract runs the event. <span className="text-[#a3f542]">Not us.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              When a host creates an event on FundRaisely, a smart contract is deployed on their chosen chain. That
              contract collects every entry fee, holds the funds during the event, and executes the payout
              automatically when the event closes. Nobody can intercept the funds or change the split.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '01',
                title: 'Event created',
                body: 'The host picks a game type, selects a verified charity, and sets the entry fee. A smart contract is deployed to Solana or Base with the payout logic locked in.',
              },
              {
                n: '02',
                title: 'Players join',
                body: 'Each player connects their wallet and pays the entry fee directly into the contract. No platform holds the money. It sits in the contract until the event ends.',
              },
              {
                n: '03',
                title: 'Event runs',
                body: 'The quiz or elimination game runs live. Hosts puts on a great event. The contract monitors entry and is ready to execute the moment the host closes the event.',
              },
              {
                n: '04',
                title: 'Automatic payout',
                body: 'The contract distributes everything at once: winner prize, host cut, charity allocation, and platform fee. All transactions are recorded on-chain and publicly verifiable.',
              },
            ].map(({ n, title, body }) => (
              <W3Card key={n}>
                <p className="mb-3 font-mono text-3xl font-bold text-[#a3f542]/30">{n}</p>
                <h3 className="mb-2 font-mono text-sm font-bold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{body}</p>
              </W3Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Payout splits                                                        */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><SplitSquareHorizontal className="h-4 w-4" /> Payout splits</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Every crypto accounted for. <span className="text-[#a3f542]">Every time.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              The split is fixed in the contract before the event starts. Players know exactly where their entry fee
              goes before they join. There are no surprises, no discretionary allocations, and no way to change the
              split after the contract is deployed.
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
                  <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">Quiz night</p>
                  <h3 className="font-mono text-lg font-bold text-white">Quiz payout split</h3>
                </div>
              </div>
              <div className="mb-5 flex flex-wrap justify-center gap-3">
                <PayoutPill label="Host" pct="25%" accent="border-[#a3f542]/20 bg-[#a3f542]/10" textAccent="text-[#a3f542]" />
                <PayoutPill label="Winner" pct="30%" accent="border-amber-400/20 bg-amber-400/10" textAccent="text-amber-400" />
                <PayoutPill label="Charity" pct="30%" accent="border-[#6ef0d4]/20 bg-[#6ef0d4]/10" textAccent="text-[#6ef0d4]" />
                <PayoutPill label="Platform" pct="15%" accent="border-[#1e2d42] bg-white/5" textAccent="text-white/40" />
              </div>
              <p className="text-sm leading-relaxed text-white/50">
                The host earns 25% for running the event. The highest scorer wins 30% of the prize pool. The chosen
                charity receives 30% automatically. The platform retains 15% to keep the infrastructure running.
              </p>
            </W3Card>

            {/* Elimination splits */}
            <W3Card className="border-orange-400/20">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/10">
                  <Crosshair className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-orange-400/60">Elimination game</p>
                  <h3 className="font-mono text-lg font-bold text-white">Elimination payout split</h3>
                </div>
              </div>
              <div className="mb-5 flex flex-wrap justify-center gap-3">
                <PayoutPill label="Host" pct="20%" accent="border-orange-400/20 bg-orange-400/10" textAccent="text-orange-400" />
                <PayoutPill label="Winner" pct="30%" accent="border-amber-400/20 bg-amber-400/10" textAccent="text-amber-400" />
                <PayoutPill label="Charity" pct="35%" accent="border-[#6ef0d4]/20 bg-[#6ef0d4]/10" textAccent="text-[#6ef0d4]" />
                <PayoutPill label="Platform" pct="15%" accent="border-[#1e2d42] bg-white/5" textAccent="text-white/40" />
              </div>
              <p className="text-sm leading-relaxed text-white/50">
                Elimination sends a larger share to charity at 35%, reflecting the faster format. The last player
                standing wins 30%. The host earns 20% for organising and running the game. Platform fee is 15%.
              </p>
            </W3Card>
          </div>

          {/* Comparison table */}
          <W3Card className="mt-6 overflow-hidden p-0">
            <table className="w-full">
              <thead>
                <tr className="bg-[#0a0e14]">
                  <th className="py-3 pl-4 text-left font-mono text-xs uppercase tracking-widest text-white/30">Recipient</th>
                  <th className="py-3 text-center font-mono text-xs uppercase tracking-widest text-orange-400/60">Elimination</th>
                  <th className="py-3 pr-4 text-center font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">Quiz</th>
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
      {/* Chains and tokens                                                    */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Globe className="h-4 w-4" /> Chains and tokens</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Two chains. Fast, low-cost, <span className="text-[#a3f542]">and battle-tested.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              FundRaisely runs on Solana and Base. Both are established, high-throughput chains with low transaction
              fees, which means more of every entry fee reaches the people it is supposed to reach.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <W3Card className="border-[#9945FF]/20">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#9945FF]/30 bg-[#9945FF]/10">
                  <CircleDollarSign className="h-6 w-6 text-[#9945FF]" />
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-[#9945FF]/60">Solana</p>
                  <h3 className="font-mono text-xl font-bold text-white">Solana</h3>
                </div>
              </div>
              <p className="mb-4 text-base leading-relaxed text-white/60">
                Solana is one of the fastest blockchains in the world, processing thousands of transactions per second
                with fees that are a fraction of a cent. For events with large player counts, Solana keeps the cost
                of participation low and payouts near-instant.
              </p>
              <div className="space-y-2">
                {[
                  'Multi-token support on Solana',
                  'Sub-second transaction finality',
                  'Extremely low gas fees for all participants',
                  'Compatible with Phantom, Solflare, and major Solana wallets',
                  'Charity payouts verified via The Giving Block',
                ].map(t => (
                  <div key={t} className="flex items-start gap-2 text-sm text-white/50">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#9945FF]" />
                    {t}
                  </div>
                ))}
              </div>
            </W3Card>

            <W3Card className="border-[#0052FF]/20">
              <div className="mb-4 flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#0052FF]/30 bg-[#0052FF]/10">
                  <Building2 className="h-6 w-6 text-[#0052FF]" />
                </div>
                <div>
                  <p className="font-mono text-xs uppercase tracking-widest text-[#0052FF]/60">Base (EVM)</p>
                  <h3 className="font-mono text-xl font-bold text-white">Base</h3>
                </div>
              </div>
              <p className="mb-4 text-base leading-relaxed text-white/60">
                Base is an Ethereum L2 built by Coinbase, combining the security and ecosystem of Ethereum with
                significantly lower fees and faster confirmation times. It is EVM-compatible, meaning it works with the
                broadest possible range of wallets and tools your community already uses.
              </p>
              <div className="space-y-2">
                {[
                  'USDC as the primary token on Base',
                  'EVM-compatible: works with MetaMask, Coinbase Wallet, and more',
                  'Ethereum-grade security with L2 speed and cost',
                  'Broad wallet coverage across the Web3 ecosystem',
                  'Charity payouts verified via The Giving Block',
                ].map(t => (
                  <div key={t} className="flex items-start gap-2 text-sm text-white/50">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0052FF]" />
                    {t}
                  </div>
                ))}
              </div>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Charity verification                                                 */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#6ef0d4]/20 p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
              <div>
                <SectionLabel><HeartHandshake className="h-4 w-4" /> Charity verification</SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Every charity is <span className="text-[#6ef0d4]">verified before a cent moves.</span>
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/60">
                  FundRaisely uses The Giving Block to verify every non-profit on the platform. The Giving Block is one
                  of the leading crypto donation platforms and has processed tens of millions in verified charitable
                  giving. Every organisation listed on FundRaisely has passed their verification process.
                </p>
                <p className="mt-3 text-base leading-relaxed text-white/60">
                  When the smart contract executes a charity payout, the funds go directly to the verified wallet
                  address registered through The Giving Block. There is no manual step, no intermediary, and no
                  possibility of the funds being redirected. The transaction is recorded on-chain and anyone can
                  verify it happened using a public block explorer.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="/web3/partners" className="inline-flex items-center gap-2 rounded-xl border border-[#6ef0d4]/40 bg-[#6ef0d4]/10 px-5 py-3 font-mono font-semibold text-[#6ef0d4] transition hover:border-[#6ef0d4]/80 hover:bg-[#6ef0d4]/20">
                    <BadgeCheck className="h-4 w-4" /> View approved charities
                  </a>
                  <a href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-5 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white">
                    <MessageCircle className="h-4 w-4" /> Become a recipient
                  </a>
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  {
                    icon: <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Verified wallets only',
                    body: 'Every charity wallet address is registered and verified through The Giving Block before it can receive funds from FundRaisely events.',
                  },
                  {
                    icon: <Lock className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Contract-enforced transfers',
                    body: 'The charity payout is executed by the smart contract, not a human. Once the event ends, the transfer happens automatically and cannot be overridden.',
                  },
                  {
                    icon: <Link2 className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Publicly verifiable on-chain',
                    body: 'Every charity transfer is a real blockchain transaction. You can look it up on Solscan or Basescan and confirm the amount, recipient, and time.',
                  },
                  {
                    icon: <ShieldCheck className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Priority for Giving Block verified orgs',
                    body: 'Charities already verified with The Giving Block are fast-tracked onto the platform. Any qualifying non-profit that accepts crypto can apply.',
                  },
                ].map(({ icon, title, body }) => (
                  <div key={title} className="flex items-start gap-3 rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div>
                      <p className="mb-1 font-mono text-sm font-bold text-white">{title}</p>
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
      {/* Core platform features                                               */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Zap className="h-4 w-4" /> Platform features</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Everything that makes it work.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              The features behind every quiz night and elimination game on FundRaisely.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Wallet className="h-5 w-5" />}
              iconColor="text-white/70"
              iconBg="border-[#1e2d42] bg-white/5"
              title="Wallet connection, no account needed"
              body="Players and hosts connect with their own Web3 wallet. No email address, no signup form, no password. Your wallet is your identity. Works with the major Solana and Base wallets including Phantom, MetaMask, and Coinbase Wallet."
            />
            <FeatureCard
              icon={<Lock className="h-5 w-5" />}
              iconColor="text-[#a3f542]"
              iconBg="border-[#a3f542]/20 bg-[#a3f542]/10"
              title="Immutable payout logic"
              body="Once a contract is deployed, the payout split cannot be changed. Not by the host, not by the platform, not by anyone. The percentages are locked in at the moment the event is created. Players join knowing exactly what they are agreeing to."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-5 w-5" />}
              iconColor="text-[#6ef0d4]"
              iconBg="border-[#6ef0d4]/20 bg-[#6ef0d4]/5"
              title="No platform custody of funds"
              body="FundRaisely never holds your money. Entry fees go straight into the smart contract and stay there until the event ends. The platform fee is taken at the point of payout, not before. At no point do we have discretionary access to funds."
            />
            <FeatureCard
              icon={<Users className="h-5 w-5" />}
              iconColor="text-white/70"
              iconBg="border-[#1e2d42] bg-white/5"
              title="Live events with real-time scoring"
              body="Quiz nights include real-time scoring, a live leaderboard, and a tiebreaker round. Elimination games track players round by round until one remains. Both formats are designed to keep players engaged from start to finish."
            />
            <FeatureCard
              icon={<Coins className="h-5 w-5" />}
              iconColor="text-amber-400"
              iconBg="border-amber-400/20 bg-amber-400/10"
              title="Instant on-chain payouts"
              body="The moment a host closes the event, all four recipients are paid simultaneously in a single contract execution. Winners do not wait for manual processing. Hosts do not chase payments. Charities receive funds the instant the game ends."
            />
            <FeatureCard
              icon={<Link2 className="h-5 w-5" />}
              iconColor="text-white/70"
              iconBg="border-[#1e2d42] bg-white/5"
              title="Public transaction history"
              body="Every payout from every event is a real blockchain transaction. Anyone can look up the event on Solscan or Basescan and see the amounts, the recipient wallets, and the timestamp. There is nothing hidden and nothing to take on trust."
            />
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Wallet support                                                       */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Wallet className="h-4 w-4" /> Wallet support</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              If your community has a wallet, <span className="text-[#a3f542]">they can play.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              FundRaisely supports the most widely used wallets on both chains. No proprietary wallet required.
              Players connect the wallet they already use.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Phantom', chain: 'Solana', note: 'The most popular Solana wallet. Simple, fast, and widely used across Web3 gaming and DeFi communities.' },
              { name: 'Solflare', chain: 'Solana', note: 'A full-featured Solana wallet with strong multi-token support and hardware wallet compatibility.' },
              { name: 'Backpack', chain: 'Solana/EVM', note: 'A multichain wallet supporting both Solana and EVM networks.' },
              { name: 'MetaMask', chain: 'Base (EVM)', note: 'The most widely used Ethereum and EVM wallet in the world. Works with Base out of the box.' },
              { name: 'Coinbase Wallet', chain: 'Base (EVM)', note: 'Built natively for Base. Easy onboarding for users coming from Coinbase exchange accounts.' },
              { name: 'WalletConnect', chain: 'Base (EVM)', note: 'Connects hundreds of EVM-compatible wallets via QR code or deeplink. Maximum compatibility for Base events.' },
              
            ].map(({ name, chain, note }) => (
              <W3Card key={name}>
                <p className="mb-1 font-mono text-lg font-bold text-white">{name}</p>
                <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">{chain}</p>
                <p className="text-sm leading-relaxed text-white/50">{note}</p>
              </W3Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Transparency                                                         */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Link2 className="h-4 w-4" /> Transparency</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Nothing to take on trust. <span className="text-[#a3f542]">Everything on-chain.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              The most important thing about Web3 fundraising is that it does not require anyone to trust anyone.
              The rules are in the code. The transactions are public. Anyone can verify what happened.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Lock className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">The split is in the code</h3>
              <p className="text-base leading-relaxed text-white/60">
                The payout percentages are not a policy or a setting. They are written into the smart contract
                at deployment. There is no admin panel where someone can change them after the fact.
              </p>
            </W3Card>
            <W3Card className="border-[#6ef0d4]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Charities are verified before events go live</h3>
              <p className="text-base leading-relaxed text-white/60">
                No event can route funds to an unverified organisation. Every charity wallet is validated through
                The Giving Block before it is available for hosts to select.
              </p>
            </W3Card>
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Link2 className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Every transaction is public</h3>
              <p className="text-base leading-relaxed text-white/60">
                Every payout from every event is recorded on Solana or Base and visible on the public block
                explorer. Hosts can share the transaction link. Players can verify the charity received their share.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* CTA                                                                  */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-20 pt-4">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#a3f542]/20 p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">Ready to host</p>
            <h2 className="mt-3 font-mono text-4xl font-bold text-white">Start your first event.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Pick a game, choose your charity, set your entry fee, and go live. The contract handles everything
              from there. Questions first? Get in touch.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href="/web3/elimination" className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20">
                <Crosshair className="h-5 w-5" /> Explore Elimination
              </a>
              <a href="/web3/quiz" className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20">
                <Trophy className="h-5 w-5" /> Explore Quiz
              </a>
              <a href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-8 py-4 font-mono font-bold text-white/50 transition hover:border-white/30 hover:text-white">
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



