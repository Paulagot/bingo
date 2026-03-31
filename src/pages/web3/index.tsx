import React, { useState, useCallback } from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';

import { currencyISO as iso } from '../../services/currency';
import {
  Heart,
  Shield,
  Coins,
  ArrowRight,
  Users,
  Globe,
  Zap,
  Lock,
  TrendingUp,
  Target,
  Wallet,
  Trophy,
  Crosshair,
  BadgeCheck,
  HandCoins,
  MessageCircle,
  Video,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* Absolute URL helpers                                                         */
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
/* Design tokens                                                                */
/* bg-[#0a0e14]   near-black base                                              */
/* bg-[#0f1520]   card surface                                                 */
/* border-[#1e2d42] subtle grid lines                                          */
/* text-[#a3f542]  acid green (host / quiz)                                    */
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
  label,
  pct,
  accent,
  textAccent,
}) => (
  <div className={`flex flex-col items-center rounded-xl border px-6 py-4 ${accent}`}>
    <span className={`font-mono text-2xl font-bold ${textAccent}`}>{pct}</span>
    <span className="mt-1 text-xs font-medium text-white/50">{label}</span>
  </div>
);

/* -------------------------------------------------------------------------- */
/* Host Earnings Calculator                                                     */
/* -------------------------------------------------------------------------- */
interface EventRow {
  eventsPerWeek: number;
  players: number;
  fee: number;
}

const QUIZ_HOST_PCT = 0.25;
const ELIM_HOST_PCT = 0.20;
const QUIZ_CHARITY_PCT = 0.30;
const ELIM_CHARITY_PCT = 0.35;
const PERIOD_MULT: Record<string, number> = { week: 1, month: 4.33, year: 52 };

function hostEarnings(rows: EventRow[], pct: number) {
  return rows.reduce((s, r) => s + r.eventsPerWeek * r.players * r.fee * pct, 0);
}
function charityEarnings(rows: EventRow[], pct: number) {
  return rows.reduce((s, r) => s + r.eventsPerWeek * r.players * r.fee * pct, 0);
}
function pool(rows: EventRow[]) {
  return rows.reduce((s, r) => s + r.eventsPerWeek * r.players * r.fee, 0);
}

const NumInput: React.FC<{ value: number; onChange: (v: number) => void; min?: number; step?: number }> = ({
  value,
  onChange,
  min = 0,
  step = 1,
}) => (
  <input
    type="number"
    min={min}
    step={step}
    value={value}
    onChange={e => onChange(parseFloat(e.target.value) || 0)}
    className="w-full rounded-lg border border-[#1e2d42] bg-[#0a0e14] px-3 py-2 font-mono text-sm text-white focus:border-[#a3f542] focus:outline-none"
  />
);

const BarRow: React.FC<{ label: string; amount: number; pct: number; barColor: string }> = ({
  label,
  amount,
  pct,
  barColor,
}) => (
  <div className="mb-3">
    <div className="mb-1 flex justify-between text-sm">
      <span className="text-white/50">{label}</span>
      <span className="font-mono font-semibold text-white">{'\u20ac'}{Math.round(amount).toLocaleString()}</span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#1e2d42]">
      <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }} />
    </div>
  </div>
);

const HostEarningsCalculator: React.FC = () => {
  const [period, setPeriod] = useState('week');
  const [quizRows, setQuizRows] = useState<EventRow[]>([{ eventsPerWeek: 1, players: 20, fee: 10 }]);
  const [elimRows, setElimRows] = useState<EventRow[]>([{ eventsPerWeek: 3, players: 20, fee: 5 }]);

  const updateRow = useCallback((type: 'quiz' | 'elim', idx: number, field: keyof EventRow, val: number) => {
    const set = type === 'quiz' ? setQuizRows : setElimRows;
    set(prev => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
  }, []);

  const addRow = (type: 'quiz' | 'elim') => {
    const set = type === 'quiz' ? setQuizRows : setElimRows;
    const def: EventRow = type === 'quiz' ? { eventsPerWeek: 1, players: 20, fee: 10 } : { eventsPerWeek: 1, players: 20, fee: 5 };
    set(prev => [...prev, def]);
  };

  const removeRow = (type: 'quiz' | 'elim', idx: number) => {
    const set = type === 'quiz' ? setQuizRows : setElimRows;
    set(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  const mult: number = PERIOD_MULT[period] ?? 1;

  const totalHost = (hostEarnings(quizRows, QUIZ_HOST_PCT) + hostEarnings(elimRows, ELIM_HOST_PCT)) * mult;
  const totalCharity = (charityEarnings(quizRows, QUIZ_CHARITY_PCT) + charityEarnings(elimRows, ELIM_CHARITY_PCT)) * mult;
  const totalPool = (pool(quizRows) + pool(elimRows)) * mult;

  const hostPct = totalPool > 0 ? (totalHost / totalPool) * 100 : 0;
  const charityPct = totalPool > 0 ? (totalCharity / totalPool) * 100 : 0;

  const quizHrs = quizRows.reduce((s, r) => s + r.eventsPerWeek * 1.5, 0);
  const elimHrs = elimRows.reduce((s, r) => s + r.eventsPerWeek * (1 / 3), 0);
  const totalHrsWeek = quizHrs + elimHrs;
  const totalHrsPeriod = totalHrsWeek * mult;
  const hourly = totalHrsPeriod > 0 ? totalHost / totalHrsPeriod : 0;

  const hdr = 'text-xs text-white/30 pb-1';

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2">
        {(['week', 'month', 'year'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`rounded-lg border px-4 py-1.5 font-mono text-sm transition ${
              period === p
                ? 'border-[#a3f542] bg-[#a3f542]/10 text-[#a3f542]'
                : 'border-[#1e2d42] text-white/40 hover:border-white/20 hover:text-white/60'
            }`}
          >
            per {p}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          {/* Quiz inputs */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-[#a3f542]" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#a3f542]">Quiz night / 25% to you</span>
            </div>
            <div className="mb-1 grid grid-cols-[1fr_1fr_1fr_2rem] gap-2">
              <span className={hdr}>Events/wk</span><span className={hdr}>Players</span><span className={hdr}>Fee (EUR)</span><span />
            </div>
            {quizRows.map((r, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_1fr_2rem] items-center gap-2">
                <NumInput value={r.eventsPerWeek} min={0} onChange={v => updateRow('quiz', i, 'eventsPerWeek', v)} />
                <NumInput value={r.players} min={1} onChange={v => updateRow('quiz', i, 'players', v)} />
                <NumInput value={r.fee} min={1} step={0.5} onChange={v => updateRow('quiz', i, 'fee', v)} />
                <button onClick={() => removeRow('quiz', i)} className="text-white/20 hover:text-white/60 transition" aria-label="Remove">x</button>
              </div>
            ))}
            <button onClick={() => addRow('quiz')} className="mt-1 rounded border border-dashed border-[#a3f542]/30 px-3 py-1 font-mono text-xs text-[#a3f542]/60 transition hover:border-[#a3f542]/60 hover:text-[#a3f542]">
              + add quiz
            </button>
          </div>

          {/* Elimination inputs */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Crosshair className="h-3.5 w-3.5 text-orange-400" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-orange-400">Elimination / 20% to you</span>
            </div>
            <div className="mb-1 grid grid-cols-[1fr_1fr_1fr_2rem] gap-2">
              <span className={hdr}>Events/wk</span><span className={hdr}>Players</span><span className={hdr}>Fee (EUR)</span><span />
            </div>
            {elimRows.map((r, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_1fr_2rem] items-center gap-2">
                <NumInput value={r.eventsPerWeek} min={0} onChange={v => updateRow('elim', i, 'eventsPerWeek', v)} />
                <NumInput value={r.players} min={1} onChange={v => updateRow('elim', i, 'players', v)} />
                <NumInput value={r.fee} min={1} step={0.5} onChange={v => updateRow('elim', i, 'fee', v)} />
                <button onClick={() => removeRow('elim', i)} className="text-white/20 hover:text-white/60 transition" aria-label="Remove">x</button>
              </div>
            ))}
            <button onClick={() => addRow('elim')} className="mt-1 rounded border border-dashed border-orange-400/30 px-3 py-1 font-mono text-xs text-orange-400/60 transition hover:border-orange-400/60 hover:text-orange-400">
              + add elimination
            </button>
          </div>
        </div>

        <div>
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-[#a3f542]/20 bg-[#a3f542]/5 p-3 text-center sm:p-4">
              <p className="mb-1 font-mono text-xs text-[#a3f542]/60">you earn / {period}</p>
              <p className="font-mono text-lg font-bold text-[#a3f542] sm:text-2xl">{'\u20ac'}{Math.round(totalHost).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[#6ef0d4]/20 bg-[#6ef0d4]/5 p-3 text-center sm:p-4">
              <p className="mb-1 font-mono text-xs text-[#6ef0d4]/60">charity / {period}</p>
              <p className="font-mono text-lg font-bold text-[#6ef0d4] sm:text-2xl">{'\u20ac'}{Math.round(totalCharity).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-3 text-center sm:p-4">
              <p className="mb-1 font-mono text-xs text-white/30">pool / {period}</p>
              <p className="font-mono text-lg font-bold text-white sm:text-2xl">{'\u20ac'}{Math.round(totalPool).toLocaleString()}</p>
            </div>
          </div>

          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-white/30">where every euro goes</p>
          <BarRow label="You (host)" amount={totalHost} pct={hostPct} barColor="bg-[#a3f542]" />
          <BarRow label="Charity" amount={totalCharity} pct={charityPct} barColor="bg-[#6ef0d4]" />
          <BarRow label="Winner prize" amount={totalPool * 0.3} pct={30} barColor="bg-amber-400" />
          <BarRow label="Platform" amount={totalPool * 0.15} pct={15} barColor="bg-white/20" />
        </div>
      </div>

      {totalHrsWeek > 0 && (
        <div className="mt-6 rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-5 text-center font-mono text-sm text-white/50">
          <span className="text-white">~{totalHrsWeek % 1 === 0 ? totalHrsWeek : totalHrsWeek.toFixed(1)} hrs/week</span> hosting time.
          Quizzes ~1.5 hrs, eliminations ~20 min.
          {hourly > 0 && <> Roughly <span className="text-[#a3f542]">{'\u20ac'}{Math.round(hourly)}/hr</span> for your time.</>}
        </div>
      )}

      <p className="mt-4 text-center text-sm leading-relaxed text-white/50">
        Illustrative estimates only. FundRaisely does not guarantee earnings. Hosting is not employment and carries no contractual arrangement with FundRaisely.
      </p>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                         */
/* -------------------------------------------------------------------------- */
const Web3MainIndex: React.FC = () => {

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Web3 Fundraising: Host Quiz Nights and Elimination Games for Real-World Impact | FundRaisely',
    description:
      'Host Web3 quiz nights and elimination games with your community. Earn a percentage as host, support verified charities, and run transparent on-chain events on Solana and Base.',
    url: abs('/web3'),
    mainEntity: {
      '@type': 'SoftwareApplication',
      name: 'FundRaisely Web3 Fundraising Platform',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      description: 'Blockchain-powered fundraising platform for transparent quiz nights and elimination games.',
      featureList: [
        'Quiz nights and elimination games',
        'Hosts earn a share of every event',
        'Multi-chain support: Solana, Base',
        'Verified charities via The Giving Block',
        'Instant on-chain payouts',
        'Transparent fee structure',
      ],
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: iso,
        description: 'Free to start hosting Web3 fundraising events',
      },
    },
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How much do I earn as a host?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Hosts receive 25% of all entry fees on every quiz and 20% on every elimination game. Earnings depend on the number of players and events you run. FundRaisely does not guarantee income.',
        },
      },
      {
        '@type': 'Question',
        name: 'Do I need crypto experience to host?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. You need a Web3 wallet. The setup wizard handles wallet connections, event creation, and automatic payouts. We also run live support sessions to walk you through everything.',
        },
      },
      {
        '@type': 'Question',
        name: 'How are charities verified?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'FundRaisely works with any non-profit that accepts crypto payments, with priority given to organisations verified through The Giving Block.',
        },
      },
      {
        '@type': 'Question',
        name: 'Which blockchains does FundRaisely use?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'FundRaisely supports Solana and Base. Both are fast and low-cost.',
        },
      },
    ],
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
        title="Web3 Fundraising: Host Quiz Nights and Elimination Games for Real-World Impact | FundRaisely"
        description="Host Web3 quiz nights and elimination games. Earn a share as host, support verified charities, and run transparent on-chain events on Solana and Base."
        keywords="web3 fundraising, blockchain charity, host quiz night crypto, elimination game web3, on-chain donations, crypto charity events, Solana fundraising, Base fundraising, earn crypto hosting"
        domainStrategy="geographic"
        image="/og/web3-hub.png"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Web3 Fundraising', item: '/web3' },
        ]}
        structuredData={[webPageJsonLd, faqJsonLd]}
      />

      <Web3Header />

      {/* ================================================================== */}
      {/* Hero                                                                 */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-12 pt-16">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
          <SectionLabel>
            <Globe className="h-4 w-4" /> Web3 Fundraising
          </SectionLabel>

          <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
            Host Events. <span className="text-[#a3f542]">Earn.</span> Do Good.
          </h1>

          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-white/70">
            Anyone with a Web3 wallet can host a quiz night or elimination game for their community, earn a share
            of every entry fee, and send a guaranteed cut to a verified charity. No middlemen. No manual payouts.
            The smart contract handles everything the moment your event ends.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="/web3/elimination" className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-6 py-3 font-mono font-semibold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20">
              <Crosshair className="h-4 w-4" /> Host Elimination
            </a>
            <a href="/web3/quiz" className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20">
              <Trophy className="h-4 w-4" /> Host a Quiz
            </a>
            <a href="/web3/partners" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white">
              <BadgeCheck className="h-4 w-4" /> Partners
            </a>
            <a href="/web3/features" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white">
              <Target className="h-4 w-4" /> Features
            </a>
          </div>

          {/* Stats bar */}
          <div className="mt-12 flex w-full flex-wrap justify-center gap-8 border-t border-[#1e2d42] pt-8 sm:justify-between">
            {[
              { label: 'host cut / quiz', value: '25%' },
              { label: 'host cut / elimination', value: '20%' },
              { label: 'min. charity split', value: '30%' },
              { label: 'chains', value: 'SOL + BASE' },
            ].map(({ label, value }) => (
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
      {/* Why Host                                                             */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><HandCoins className="h-4 w-4" /> Why host</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Your community is already there.<br />
              <span className="text-[#a3f542]">Make something happen.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              A pub crowd, a Discord server, a sports club, a college society. If they have a wallet, they can play.
              FundRaisely gives you the event, the tech, and the payout. You bring the people.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#a3f542]/20 bg-[#a3f542]/10">
                <HandCoins className="h-5 w-5 text-[#a3f542]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">You get paid to host</h3>
              <p className="text-base leading-relaxed text-white/60">
                Earn 25% of all entry fees on every quiz and 20% on every elimination game. Paid automatically to
                your wallet the moment the event ends. No invoices. No waiting. No chasing.
              </p>
            </W3Card>
            <W3Card className="border-[#6ef0d4]/20">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/10">
                <Shield className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Charity is guaranteed, not optional</h3>
              <p className="text-base leading-relaxed text-white/60">
                The smart contract enforces the charity allocation. There is no way to run the event without the
                charity receiving their share. Your community can trust every event you host.
              </p>
            </W3Card>
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Users className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Built for real communities</h3>
              <p className="text-base leading-relaxed text-white/60">
                Pub quizzes, Discord servers, sports clubs, DAOs, college societies. FundRaisely works wherever
                your people are. If they have a wallet, they can play.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Two Games                                                            */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Zap className="h-4 w-4" /> The games</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Two games. One platform. <span className="text-[#a3f542]">Real earnings.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              Host a quiz night, run an elimination game, or do both. Every event pays you automatically the
              moment it ends.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Quiz */}
            <W3Card className="border-[#a3f542]/20">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#a3f542]/20 bg-[#a3f542]/10">
                <Trophy className="h-6 w-6 text-[#a3f542]" />
              </div>
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">Quiz night</p>
              <h3 className="mb-3 font-mono text-2xl font-bold text-white">Run a live scored quiz</h3>
              <p className="mb-6 text-base leading-relaxed text-white/70"> A pub, a Discord server, a WhatsApp group,
                it does not matter. If your crowd knows stuff, they will play. Watch the leaderboard heat up round
                by round, and walk away with 25% of every entry fee paid directly to your wallet when the last
                question lands. Two hours of hosting, a proper night out, and a payout waiting at the end.
              </p>
              <div className="mb-6 flex flex-wrap justify-center gap-3">
                <PayoutPill label="You earn" pct="25%" accent="border-[#a3f542]/20 bg-[#a3f542]/10" textAccent="text-[#a3f542]" />
                <PayoutPill label="Winner" pct="30%" accent="border-amber-400/20 bg-amber-400/10" textAccent="text-amber-400" />
                <PayoutPill label="Charity" pct="30%" accent="border-[#6ef0d4]/20 bg-[#6ef0d4]/10" textAccent="text-[#6ef0d4]" />
                <PayoutPill label="Platform" pct="15%" accent="border-[#1e2d42] bg-white/5" textAccent="text-white/40" />
              </div>
              <a href="/web3/quiz" className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-5 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20">
                <Trophy className="h-4 w-4" /> Host a Quiz
              </a>
            </W3Card>

            {/* Elimination */}
            <W3Card className="border-orange-400/20">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-orange-400/20 bg-orange-400/10">
                <Crosshair className="h-6 w-6 text-orange-400" />
              </div>
              <p className="mb-1 font-mono text-xs uppercase tracking-widest text-orange-400/60">Elimination game</p>
              <h3 className="mb-3 font-mono text-2xl font-bold text-white">Last one standing wins</h3>
              <p className="mb-6 text-base leading-relaxed text-white/70">
                Elimination is where things get tense. Players go head to head, round by round, until one is left
                standing. Fast, roughly 20 minutes, high drama, and perfect for competitive communities. You run
                it, you earn 20% of every entry fee, and the contract pays out the winner, the charity, and you
                the moment it is over. Stack a few of these in a week and the numbers add up fast for very little
                time.
              </p>
              <div className="mb-6 flex flex-wrap justify-center gap-3">
                <PayoutPill label="You earn" pct="20%" accent="border-orange-400/20 bg-orange-400/10" textAccent="text-orange-400" />
                <PayoutPill label="Winner" pct="30%" accent="border-amber-400/20 bg-amber-400/10" textAccent="text-amber-400" />
                <PayoutPill label="Charity" pct="35%" accent="border-[#6ef0d4]/20 bg-[#6ef0d4]/10" textAccent="text-[#6ef0d4]" />
                <PayoutPill label="Platform" pct="15%" accent="border-[#1e2d42] bg-white/5" textAccent="text-white/40" />
              </div>
              <a href="/web3/elimination" className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-5 py-3 font-mono font-semibold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20">
                <Crosshair className="h-4 w-4" /> Host Elimination
              </a>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Earnings Calculator                                                  */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="p-4 sm:p-8">
            <div className="mb-6 text-center">
              <SectionLabel><Coins className="h-4 w-4" /> Earnings estimator</SectionLabel>
              <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                See what hosting could look like for you
              </h2>
              <p className="mt-2 text-sm text-white/40">
                Plug in your schedule and see a breakdown. Estimates only based on your inputs.
                FundRaisely does not guarantee earnings and hosting is not employment.
              </p>
            </div>
            <HostEarningsCalculator />
          </W3Card>
        </div>
      </section>

      {/* ================================================================== */}
      {/* How It Works                                                         */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><ArrowRight className="h-4 w-4" /> How it works</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">From idea to payout in four steps.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">No blockchain experience required.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '01',
                title: 'Choose your game',
                body: 'Pick a quiz night or an elimination game. Both use the same guided setup wizard.',
              },
              {
                n: '02',
                title: 'Pick a charity and set your entry fee',
                body: 'Choose from our list of verified charities. Set your entry fee. The payout split is fixed in the contract so players know exactly where their money goes before they join.',
              },
              {
                n: '03',
                title: 'Run your event',
                body: 'Go live. Quizzes have real-time scoring and a leaderboard. Elimination builds tension round by round until one player is left standing.',
              },
              {
                n: '04',
                title: 'Everyone gets paid instantly',
                body: 'The moment your event ends the contract distributes everything automatically. Winner prize, your cut, the charity share, and the platform fee. No delays, no admin.',
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
      {/* Platform Guarantees                                                  */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Lock className="h-4 w-4" /> On-chain guarantees</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Not policies. <span className="text-[#a3f542]">Code.</span>
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              Smart contracts enforce these rules the same way for every host, every event, every time.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { value: '35%', label: 'To charity', sub: 'elimination game', color: 'text-[#6ef0d4]' },
              { value: '30%', label: 'To charity', sub: 'quiz night', color: 'text-[#6ef0d4]' },
              { value: '100%', label: 'Auditable', sub: 'every payout on-chain', color: 'text-[#a3f542]' },
              { value: 'SOL + BASE', label: 'Chains', sub: 'fast and low cost', color: 'text-white' },
            ].map(({ value, label, sub, color }) => (
              <W3Card key={sub} className="text-center">
                <p className={`font-mono text-3xl font-bold ${color}`}>{value}</p>
                <p className="mt-1 font-mono text-sm font-semibold text-white/70">{label}</p>
                <p className="mt-0.5 font-mono text-xs text-white/30">{sub}</p>
              </W3Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Platform Features                                                    */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Wallet className="h-4 w-4" /> Platform</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">Everything you need. Nothing you don't.</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Lock className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Smart contract payouts</h3>
              <p className="text-base leading-relaxed text-white/60">
                Entry fees are held and distributed by a smart contract. No one can alter the split, not even us.
                Every payout is enforced by code and visible on-chain.
              </p>
            </W3Card>
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Wallet className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Connect any compatible wallet</h3>
              <p className="text-base leading-relaxed text-white/60">
                Players connect their own wallet to join. No accounts, no signups, no card details. Works with
                popular Solana and Base wallets right out of the box.
              </p>
            </W3Card>
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#6ef0d4]/20 bg-[#6ef0d4]/5">
                <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Verified charities via The Giving Block</h3>
              <p className="text-base leading-relaxed text-white/60">
                Every charity on FundRaisely has been vetted through The Giving Block. Your community donates
                with confidence knowing their money reaches a legitimate cause.
              </p>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Non-profits                                                          */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#6ef0d4]/20 p-8">
            <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
              <div>
                <SectionLabel><Heart className="h-4 w-4" /> For non-profits</SectionLabel>
                <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                  Become a verified <span className="text-[#6ef0d4]">recipient</span>
                </h2>
                <p className="mt-4 leading-relaxed text-white/50">
                  FundRaisely will work with any non-profit that accepts crypto payments. Once approved, your
                  organisation can be chosen as the beneficiary for any quiz night or elimination game hosted on
                  the platform, with funds sent directly to your wallet on-chain at the close of every event.
                </p>
                <p className="mt-3 leading-relaxed text-white/50">
                  Priority is given to organisations already verified with The Giving Block, but we welcome all
                  qualifying non-profits. If your organisation is not yet on The Giving Block, we can help point
                  you in the right direction.
                </p>
                <p className="mt-3 leading-relaxed text-white/50">
                  Get in touch via the contact form and we will walk you through the process of becoming a
                  verified recipient on FundRaisely.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#6ef0d4]/40 bg-[#6ef0d4]/10 px-5 py-3 font-mono font-semibold text-[#6ef0d4] transition hover:border-[#6ef0d4]/80 hover:bg-[#6ef0d4]/20">
                    <MessageCircle className="h-4 w-4" /> Get in touch
                  </a>
                  <a href="/web3/partners" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-5 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white">
                    <BadgeCheck className="h-4 w-4" /> View approved charities
                  </a>
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  {
                    icon: <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Priority for Giving Block verified orgs',
                    body: 'Organisations already verified with The Giving Block are fast-tracked onto the platform.',
                  },
                  {
                    icon: <Coins className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Any non-profit that accepts crypto',
                    body: 'You do not need to already have a Web3 presence. If you can receive crypto, you can become a recipient.',
                  },
                  {
                    icon: <Zap className="h-5 w-5 text-[#6ef0d4]" />,
                    title: 'Instant on-chain transfers',
                    body: 'Funds are sent directly to your wallet automatically at the close of every event that selects you.',
                  },
                ].map(({ icon, title, body }) => (
                  <div key={title} className="flex items-start gap-3 rounded-xl border border-[#1e2d42] bg-[#0a0e14] p-4">
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div>
                      <p className="mb-1 font-mono text-sm font-bold text-white">{title}</p>
                      <p className="text-sm leading-relaxed text-white/50">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </W3Card>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Support                                                              */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 text-center">
            <SectionLabel><MessageCircle className="h-4 w-4" /> Support</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">We have got you covered</h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              Never run an on-chain event before? No problem. We run regular live sessions to walk you through the
              platform and show you how to host events that your community will actually enjoy.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Video className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Live support sessions</h3>
              <p className="text-base leading-relaxed text-white/60">
                We run regular live sessions where you can see a full event from setup to payout, ask questions in
                real time, and get comfortable with the platform before you go live with your own crowd.
              </p>
            </W3Card>
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <MessageCircle className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Got a question?</h3>
              <p className="mb-4 text-sm leading-relaxed text-white/50">
                Whether you are thinking about hosting, you represent a non-profit and want to become a verified
                recipient, or you just want to understand how the platform works before you commit, get in touch
                and we will get back to you.
              </p>
              <a href="/contact" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-4 py-2.5 font-mono text-sm font-semibold text-white/60 transition hover:border-white/30 hover:text-white">
                Contact us <ArrowRight className="h-3.5 w-3.5" />
              </a>
            </W3Card>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* FAQ                                                                  */}
      {/* ================================================================== */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel><Target className="h-4 w-4" /> FAQ</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">Common questions</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                q: 'How much do I actually earn as a host?',
                a: 'You receive 25% of all entry fees on every quiz you run, and 20% on every elimination game, paid automatically to your wallet when the event ends. If 20 people pay 10 euros to play your quiz, you receive 50 euros. If you run three elimination games with 20 players at 5 euros each, that is 60 euros for roughly an hour of your time. Earnings depend entirely on your players and the events you run. FundRaisely does not guarantee any income.',
              },
              {
                q: 'Do I need to know anything about crypto to host?',
                a: 'You need a Web3 wallet and that is it. The setup wizard handles everything else: wallet connections, event configuration, and distributing payouts. We also run regular live support sessions so you can see exactly how it works before you host your first event.',
              },
              {
                q: 'Is hosting a job? Does FundRaisely employ hosts?',
                a: 'No. FundRaisely is a platform that allows anyone to host fundraising events and receive a share of entry fees for doing so. We do not offer employment, guaranteed income, or any form of contract. How much you earn depends entirely on how many events you run and how many people join.',
              },
              {
                q: 'How do I know the charity actually gets the money?',
                a: 'All charity payouts happen on-chain through a smart contract. The transaction is publicly recorded on Solana or Base. Anyone can verify the amount, the recipient wallet, and the timestamp. There is no way to run the event without the charity receiving their share.',
              },
              {
                q: 'Who are the charities and how are they verified?',
                a: 'FundRaisely works with any non-profit that accepts crypto payments, with priority given to organisations verified through The Giving Block. You can browse all approved charities on our partners page. If your organisation wants to become a recipient, get in touch via the contact page.',
              },
              {
                q: "What is the difference between a quiz and elimination?",
                a: 'A quiz is a live scored event where players answer questions and compete for the top of the leaderboard. Elimination is a last-player-standing format where players are knocked out round by round until one winner remains. Quizzes run about two hours. Elimination games run about 20 minutes.',
              },
              {
                q: 'Do I need to organise prizes or sponsors?',
                a: 'No. Prize money comes directly from the entry fee pool and is paid out by the contract automatically. You set the entry fee, pick your charity, and host. Nothing else is required.',
              },
              {
                q: 'Can I host any time I want?',
                a: 'Yes, any time. There is no schedule or commitment. Host a one-off event, a weekly league, a charity challenge, a seasonal campaign. It is entirely up to you.',
              },
            ].map(({ q, a }) => (
              <W3Card key={q}>
                <h3 className="mb-2 font-mono text-sm font-bold text-white">{q}</h3>
                <p className="text-base leading-relaxed text-white/60">{a}</p>
              </W3Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Annual Campaign (hidden until live)                                  */}
      {/* ================================================================== */}
      <section className="relative z-10 hidden py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#6ef0d4]/20 p-8 text-center">
            <SectionLabel><TrendingUp className="h-4 w-4" /> Annual Campaign</SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">The Web3 Annual Impact Campaign</h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              Each year we bring the Web3 community together for a three-month fundraising challenge, pooling
              impact across communities to raise over $100,000 for verified charities.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <a href="/web3/impact-campaign" className="inline-flex items-center gap-2 rounded-xl border border-[#6ef0d4]/40 bg-[#6ef0d4]/10 px-6 py-3 font-mono font-semibold text-[#6ef0d4] transition hover:border-[#6ef0d4]/80">
                Learn about the campaign <ArrowRight className="h-4 w-4" />
              </a>
              <a href="/web3/impact-campaign/leaderboard" className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/50 transition hover:border-white/30 hover:text-white">
                View leaderboard
              </a>
            </div>
          </W3Card>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Final CTA                                                            */}
      {/* ================================================================== */}
      <section className="relative z-10 pb-20 pt-4">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#a3f542]/20 p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">Ready to host</p>
            <h2 className="mt-3 font-mono text-4xl font-bold text-white">Pick your game and go live.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Set up your event, choose your charity, and let the smart contract handle everything from entry
              fees to payouts. It takes minutes to get started.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a href="/web3/elimination" className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20">
                <Crosshair className="h-5 w-5" /> Host Elimination
              </a>
              <a href="/web3/quiz" className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20">
                <Trophy className="h-5 w-5" /> Host a Quiz
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

export default Web3MainIndex;


