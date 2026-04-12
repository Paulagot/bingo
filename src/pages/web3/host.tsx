import React, { useCallback, useMemo, useState } from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';
import { currencyISO as iso } from '../../services/currency';

import {
  Rocket,
  Coins,
  Trophy,
  Crosshair,
  ArrowRight,
 
  Shield,
  BadgeCheck,
  Calendar,
  LayoutDashboard,
  Search,
  MessageCircle,
  Users,
  
  CheckCircle2,
  Globe,
  Target,
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

const FAQCard: React.FC<{ q: string; a: string }> = ({ q, a }) => (
  <W3Card className="h-full">
    <h3 className="font-mono text-base font-bold text-white">{q}</h3>
    <p className="mt-3 text-sm leading-relaxed text-white/60">{a}</p>
  </W3Card>
);

/* -------------------------------------------------------------------------- */
/* Host earnings calculator                                                     */
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

const NumInput: React.FC<{
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}> = ({ value, onChange, min = 0, step = 1 }) => (
  <input
    type="number"
    min={min}
    step={step}
    value={value}
    onChange={e => onChange(parseFloat(e.target.value) || 0)}
    className="w-full rounded-lg border border-[#1e2d42] bg-[#0a0e14] px-3 py-2 font-mono text-sm text-white focus:border-[#a3f542] focus:outline-none"
  />
);

const BarRow: React.FC<{
  label: string;
  amount: number;
  pct: number;
  barColor: string;
}> = ({ label, amount, pct, barColor }) => (
  <div className="mb-3">
    <div className="mb-1 flex justify-between text-sm">
      <span className="text-white/50">{label}</span>
      <span className="font-mono font-semibold text-white">
        {'€'}{Math.round(amount).toLocaleString()}
      </span>
    </div>
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#1e2d42]">
      <div
        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
        style={{ width: `${Math.min(pct, 100).toFixed(1)}%` }}
      />
    </div>
  </div>
);

const HostEarningsCalculator: React.FC = () => {
  const [period, setPeriod] = useState('week');
  const [quizRows, setQuizRows] = useState<EventRow[]>([
    { eventsPerWeek: 1, players: 20, fee: 10 },
  ]);
  const [elimRows, setElimRows] = useState<EventRow[]>([
    { eventsPerWeek: 3, players: 20, fee: 5 },
  ]);

  const updateRow = useCallback(
    (type: 'quiz' | 'elim', idx: number, field: keyof EventRow, val: number) => {
      const set = type === 'quiz' ? setQuizRows : setElimRows;
      set(prev => prev.map((r, i) => (i === idx ? { ...r, [field]: val } : r)));
    },
    []
  );

  const addRow = (type: 'quiz' | 'elim') => {
    const set = type === 'quiz' ? setQuizRows : setElimRows;
    const def: EventRow =
      type === 'quiz'
        ? { eventsPerWeek: 1, players: 20, fee: 10 }
        : { eventsPerWeek: 1, players: 20, fee: 5 };
    set(prev => [...prev, def]);
  };

  const removeRow = (type: 'quiz' | 'elim', idx: number) => {
    const set = type === 'quiz' ? setQuizRows : setElimRows;
    set(prev => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  };

  const mult = PERIOD_MULT[period] ?? 1;

  const totalHost =
    (hostEarnings(quizRows, QUIZ_HOST_PCT) + hostEarnings(elimRows, ELIM_HOST_PCT)) * mult;
  const totalCharity =
    (charityEarnings(quizRows, QUIZ_CHARITY_PCT) + charityEarnings(elimRows, ELIM_CHARITY_PCT)) *
    mult;
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
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-3.5 w-3.5 text-[#a3f542]" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#a3f542]">
                Quiz night / 25% to you
              </span>
            </div>
            <div className="mb-1 grid grid-cols-[1fr_1fr_1fr_2rem] gap-2">
              <span className={hdr}>Events/wk</span>
              <span className={hdr}>Players</span>
              <span className={hdr}>Fee (EUR)</span>
              <span />
            </div>
            {quizRows.map((r, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_1fr_2rem] items-center gap-2">
                <NumInput value={r.eventsPerWeek} min={0} onChange={v => updateRow('quiz', i, 'eventsPerWeek', v)} />
                <NumInput value={r.players} min={1} onChange={v => updateRow('quiz', i, 'players', v)} />
                <NumInput value={r.fee} min={1} step={0.5} onChange={v => updateRow('quiz', i, 'fee', v)} />
                <button
                  onClick={() => removeRow('quiz', i)}
                  className="rounded-lg border border-[#1e2d42] bg-[#0a0e14] px-2 py-2 font-mono text-xs text-white/40 transition hover:border-white/20 hover:text-white/70"
                  aria-label="Remove quiz row"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => addRow('quiz')}
              className="mt-2 rounded-lg border border-[#1e2d42] px-3 py-2 font-mono text-xs text-white/50 transition hover:border-white/20 hover:text-white/70"
            >
              + Add quiz line
            </button>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Crosshair className="h-3.5 w-3.5 text-orange-400" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-orange-400">
                Elimination / 20% to you
              </span>
            </div>
            <div className="mb-1 grid grid-cols-[1fr_1fr_1fr_2rem] gap-2">
              <span className={hdr}>Events/wk</span>
              <span className={hdr}>Players</span>
              <span className={hdr}>Fee (EUR)</span>
              <span />
            </div>
            {elimRows.map((r, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_1fr_1fr_2rem] items-center gap-2">
                <NumInput value={r.eventsPerWeek} min={0} onChange={v => updateRow('elim', i, 'eventsPerWeek', v)} />
                <NumInput value={r.players} min={1} onChange={v => updateRow('elim', i, 'players', v)} />
                <NumInput value={r.fee} min={1} step={0.5} onChange={v => updateRow('elim', i, 'fee', v)} />
                <button
                  onClick={() => removeRow('elim', i)}
                  className="rounded-lg border border-[#1e2d42] bg-[#0a0e14] px-2 py-2 font-mono text-xs text-white/40 transition hover:border-white/20 hover:text-white/70"
                  aria-label="Remove elimination row"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => addRow('elim')}
              className="mt-2 rounded-lg border border-[#1e2d42] px-3 py-2 font-mono text-xs text-white/50 transition hover:border-white/20 hover:text-white/70"
            >
              + Add elimination line
            </button>
          </div>
        </div>

        <W3Card className="border-[#1e2d42] bg-[#0a0e14]">
          <h3 className="font-mono text-lg font-bold text-white">Estimated breakdown</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/50">
            Illustrative estimates only based on your inputs.
          </p>

          <div className="mt-6">
            <BarRow label="You keep" amount={totalHost} pct={hostPct} barColor="bg-[#a3f542]" />
            <BarRow label="Cause receives" amount={totalCharity} pct={charityPct} barColor="bg-teal-400" />
            <BarRow label="Total pool" amount={totalPool} pct={100} barColor="bg-white/30" />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#1e2d42] p-4 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-white/30">Host est.</p>
              <p className="mt-2 font-mono text-2xl font-bold text-[#a3f542]">
                {'€'}{Math.round(totalHost).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e2d42] p-4 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-white/30">Cause est.</p>
              <p className="mt-2 font-mono text-2xl font-bold text-teal-400">
                {'€'}{Math.round(totalCharity).toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl border border-[#1e2d42] p-4 text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-white/30">Pool est.</p>
              <p className="mt-2 font-mono text-2xl font-bold text-white">
                {'€'}{Math.round(totalPool).toLocaleString()}
              </p>
            </div>
          </div>

          {totalHrsWeek > 0 && (
            <div className="mt-6 rounded-xl border border-[#1e2d42] bg-[#101826] p-5 text-center font-mono text-sm text-white/50">
              <span className="text-white">
                ~{totalHrsWeek % 1 === 0 ? totalHrsWeek : totalHrsWeek.toFixed(1)} hrs/week
              </span>{' '}
              hosting time. Quizzes ~1.5 hrs, eliminations ~20 min.
              {hourly > 0 && (
                <>
                  {' '}Roughly <span className="text-[#a3f542]">{'€'}{Math.round(hourly)}/hr</span> for your time.
                </>
              )}
            </div>
          )}

          <p className="mt-4 text-sm leading-relaxed text-white/50">
            Illustrative estimates only. Actual earnings are paid in crypto, not euros. FundRaisely does not
            guarantee earnings. Hosting is not employment and carries no contractual arrangement with FundRaisely.
          </p>
        </W3Card>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                         */
/* -------------------------------------------------------------------------- */
const Web3HostPage: React.FC = () => {
  const faqItems = useMemo(
    () => [
      {
        q: 'How much do I earn as a host?',
        a: 'Quiz hosts receive 25% of entry fees and elimination hosts receive 20%, with payout handled automatically when the event ends. Actual earnings depend on your fee, player numbers, and how often you host.',
      },
      {
        q: 'Do I need crypto knowledge to host?',
        a: 'You need a wallet, but you do not need to be deeply technical. FundRaisely is designed so the host flow is much simpler than building an on-chain event yourself.',
      },
      {
        q: 'Can players discover my event publicly?',
        a: 'Yes. Published events can appear on the discovery page, which helps people find upcoming quiz nights and elimination games and makes the marketplace feel alive.',
      },
      {
        q: 'What is the difference between quiz and elimination?',
        a: 'Quiz is a longer, social, leaderboard-based format. Elimination is shorter, faster, and more intense, with players knocked out round by round until one remains.',
      },
      {
        q: 'How do I track my results after hosting?',
        a: 'The fundraiser dashboard gives hosts an overview of activity, hosted rooms, events, transactions, and tools, so you can see what you launched and how it performed.',
      },
      {
        q: 'What support do I get before I host?',
        a: 'FundRaisely offers live support sessions, walkthrough help, and a contact path if you want to talk through wallets, setup, event type, or first-run questions.',
      },
      {
        q: 'Are causes verified?',
        a: 'FundRaisely is designed around approved and verified causes, with a strong emphasis on payout transparency and trusted recipients.',
      },
      {
        q: 'Is hosting guaranteed income?',
        a: 'No. Hosting is not employment and earnings are not guaranteed. Your results depend on the event, your audience, and how many players choose to join.',
      },
    ],
    []
  );

  const webPageJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Host Web3 Fundraising Events: Quiz Nights and Elimination Games | FundRaisely',
      description:
        'Host Web3 fundraising quiz nights and elimination games on FundRaisely. Use the earnings calculator, publish to the discovery page, track results in the dashboard, and fund verified causes through transparent on-chain payout logic.',
      url: abs('/web3/host'),
      mainEntity: {
        '@type': 'Service',
        name: 'Web3 Event Hosting for Fundraising',
        provider: { '@type': 'Organization', name: 'FundRaisely', url: abs('/') },
        serviceType: 'Fundraising Event Hosting Platform',
        areaServed: ['IE', 'GB'],
        description:
          'Host quiz nights and elimination games, publish them to a fundraising marketplace, and distribute host and charity shares automatically on-chain.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: iso,
          description: 'Free to start hosting Web3 fundraising events',
        },
      },
    }),
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
        { '@type': 'ListItem', position: 3, name: 'Host', item: abs('/web3/host') },
      ],
    }),
    []
  );

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
        title="Host Web3 Fundraising Events: Quiz Nights and Elimination Games | FundRaisely"
        description="Host Web3 fundraising quiz nights and elimination games on FundRaisely. Estimate earnings, publish to the discovery page, track results in the dashboard, and support verified causes through transparent on-chain payouts."
        keywords="host web3 fundraiser, web3 fundraising host, host crypto fundraiser, host quiz night fundraiser, host elimination fundraiser, web3 event host dashboard, fundraising event marketplace, crypto charity event host, on-chain fundraising host, host community fundraising event"
        domainStrategy="geographic"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Web3 Fundraising Marketplace', item: '/web3' },
          { name: 'Host', item: '/web3/host' },
        ]}
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, faqJsonLd]}
      />

      <Web3Header />

      {/* Hero */}
      <section className="relative z-10 pb-12 pt-28 sm:pt-32">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel>
              <Rocket className="h-4 w-4" /> Host on FundRaisely
            </SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Host Web3 fundraising events.
              <br />
              <span className="text-[#a3f542]">Earn from participation, not just donation asks.</span>
            </h1>

            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/70">
              FundRaisely gives hosts a way to run quiz nights and elimination games that people actually want to
              join. Players pay to participate, verified causes receive their share, and hosts are rewarded for
              bringing the event to life.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/web3/quiz?action=host"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Trophy className="h-4 w-4" /> Host a quiz
              </a>

              <a
                href="/web3/elimination?action=host"
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-6 py-3 font-mono font-semibold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <Crosshair className="h-4 w-4" /> Host elimination
              </a>

              <a
                href="/web3/events"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                <Calendar className="h-4 w-4" /> See discovery page
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why host */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Target className="h-4 w-4" /> Why host
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Built for hosts, not just for viewers
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                icon: <Coins className="h-5 w-5 text-[#a3f542]" />,
                title: 'You earn a defined share',
                body: 'Hosting is part of the model. Quiz and elimination use fixed payout logic so you know how the structure works before you launch.',
              },
              {
                icon: <BadgeCheck className="h-5 w-5 text-[#6ef0d4]" />,
                title: 'Causes are built in',
                body: 'The event is designed to support an approved cause rather than leaving funding as an afterthought.',
              },
              {
                icon: <Search className="h-5 w-5 text-white/70" />,
                title: 'Discovery helps demand',
                body: 'Published events can appear on the public events page, giving players a way to find and join what you run.',
              },
              {
                icon: <LayoutDashboard className="h-5 w-5 text-amber-400" />,
                title: 'Dashboard visibility',
                body: 'Track hosted rooms, events, activity and transactions from your fundraiser dashboard after you launch.',
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
        </div>
      </section>

      {/* Payout formats */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Coins className="h-4 w-4" /> Event formats and splits
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Choose the format that suits your crowd
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <W3Card className="h-full">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#a3f542]/20 bg-[#a3f542]/10">
                <Trophy className="h-5 w-5 text-[#a3f542]" />
              </div>

              <h3 className="font-mono text-xl font-bold text-white">Quiz nights</h3>
              <p className="mt-3 text-base leading-relaxed text-white/60">
                Best when you want a richer community event with live scoring, more rounds, and stronger social
                energy. Good for clubs, communities, creators, and recurring nights.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <PayoutPill label="Host" pct="25%" accent="border-[#a3f542]/20 bg-[#a3f542]/10" textAccent="text-[#a3f542]" />
                <PayoutPill label="Charity" pct="30%" accent="border-[#6ef0d4]/20 bg-[#6ef0d4]/10" textAccent="text-[#6ef0d4]" />
                <PayoutPill label="Platform" pct="20%" accent="border-[#1e2d42] bg-white/5" textAccent="text-white/40" />
              </div>

              <a
                href="/web3/quiz"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-5 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Trophy className="h-4 w-4" /> Learn more about Quiz
              </a>
            </W3Card>

            <W3Card className="h-full">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-orange-400/20 bg-orange-400/10">
                <Crosshair className="h-5 w-5 text-orange-400" />
              </div>

              <h3 className="font-mono text-xl font-bold text-white">Elimination games</h3>
              <p className="mt-3 text-base leading-relaxed text-white/60">
                Best when you want something faster, repeatable, and high-energy. Ideal for spotlight fundraising
                moments, short sessions, and quick replayable community events.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <PayoutPill label="Host" pct="20%" accent="border-orange-400/20 bg-orange-400/10" textAccent="text-orange-400" />
                <PayoutPill label="Charity" pct="35%" accent="border-[#6ef0d4]/20 bg-[#6ef0d4]/10" textAccent="text-[#6ef0d4]" />
                <PayoutPill label="Platform" pct="15%" accent="border-[#1e2d42] bg-white/5" textAccent="text-white/40" />
              </div>

              <a
                href="/web3/elimination"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-5 py-3 font-mono font-semibold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <Crosshair className="h-4 w-4" /> Learn more about Elimination
              </a>
            </W3Card>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="p-4 sm:p-8">
            <div className="mb-6 text-center">
              <SectionLabel>
                <Coins className="h-4 w-4" /> Earnings estimator
              </SectionLabel>
              <h2 className="mt-4 font-mono text-3xl font-bold text-white">
                See what you could raise and earn
              </h2>
              <p className="mt-2 text-sm text-white/40">
                Plug in your schedule and see a breakdown. Estimates only based on your inputs. FundRaisely does
                not guarantee earnings and hosting is not employment.
              </p>
            </div>
            <HostEarningsCalculator />
          </W3Card>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <ArrowRight className="h-4 w-4" /> How hosting works
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              From idea to payout in four steps
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-white/50">
              The host flow should feel straightforward. The deeper mechanics live on the product and features pages.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                n: '01',
                title: 'Choose your format',
                body: 'Pick a quiz night or elimination game based on the pace, audience, and type of event you want to run.',
              },
              {
                n: '02',
                title: 'Pick a cause and set your fee',
                body: 'Select the supported cause, choose the event settings, and decide the entry price for players.',
              },
              {
                n: '03',
                title: 'Publish and get discovered',
                body: 'Share your event directly and, where relevant, let it appear on the public discovery page so players can find it.',
              },
              {
                n: '04',
                title: 'Run it and review results',
                body: 'Launch the event, let the payout logic do its job, and review what happened in the fundraiser dashboard.',
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

      {/* Dashboard + discovery */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <W3Card className="h-full">
              <SectionLabel>
                <LayoutDashboard className="h-4 w-4" /> Fundraiser dashboard
              </SectionLabel>

              <h2 className="mt-4 font-mono text-2xl font-bold text-white">
                Keep track after you go live
              </h2>

              <p className="mt-4 text-base leading-relaxed text-white/60">
                Hosting is not just about launch. Your dashboard gives you an overview of your events, hosted rooms,
                activity, transactions, and tools, so you can see what you ran and what happened afterward.
              </p>

              <ul className="mt-5 space-y-2 text-sm text-white/55">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#a3f542]" />
                  Overview and headline stats
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#a3f542]" />
                  My events and hosted rooms
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#a3f542]" />
                  Activity and transactions
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#a3f542]" />
                  Fast launch links for quiz and elimination
                </li>
              </ul>

              <a
                href="/web3/fundraisersdashboard"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-5 py-3 font-mono text-sm font-semibold text-white/65 transition hover:border-white/30 hover:text-white"
              >
                <LayoutDashboard className="h-4 w-4" /> Open dashboard
              </a>
            </W3Card>

            <W3Card className="h-full">
              <SectionLabel>
                <Globe className="h-4 w-4" /> Public discovery
              </SectionLabel>

              <h2 className="mt-4 font-mono text-2xl font-bold text-white">
                The events page helps your event get seen
              </h2>

              <p className="mt-4 text-base leading-relaxed text-white/60">
                A marketplace works best when players can find events without relying entirely on private invites.
                The public discovery page gives the platform a live feel and gives hosts another route to attention.
              </p>

              <ul className="mt-5 space-y-2 text-sm text-white/55">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#a3f542]" />
                  Browse upcoming events
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#a3f542]" />
                  Filter by event type and details
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-[#a3f542]" />
                  Support player-side discovery
                </li>
              </ul>

              <a
                href="/web3/events"
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-5 py-3 font-mono text-sm font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Calendar className="h-4 w-4" /> View events discovery
              </a>
            </W3Card>
          </div>
        </div>
      </section>

      {/* Trust / support */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <Users className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Live support sessions</h3>
              <p className="text-base leading-relaxed text-white/60">
                We run regular live sessions where you can see how hosting works from setup to payout, ask
                questions in real time, and get comfortable before going live with your own crowd.
              </p>
            </W3Card>

            <W3Card>
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#1e2d42] bg-white/5">
                <MessageCircle className="h-5 w-5 text-white/60" />
              </div>
              <h3 className="mb-2 font-mono text-sm font-bold text-white">Questions before you commit?</h3>
              <p className="mb-4 text-base leading-relaxed text-white/60">
                Get in touch and we will walk you through the event setup, wallet connection, supported causes,
                and what to expect when you host your first event.
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

      {/* FAQ */}
      <section className="relative z-10 py-12">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 text-center">
            <SectionLabel>
              <Shield className="h-4 w-4" /> Host FAQ
            </SectionLabel>
            <h2 className="mt-4 font-mono text-3xl font-bold text-white">
              Common hosting questions
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {faqItems.map(item => (
              <FAQCard key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 pb-20 pt-4">
        <div className="container mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          <W3Card className="border-[#a3f542]/20 p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">Ready to host</p>
            <h2 className="mt-3 font-mono text-4xl font-bold text-white">
              Launch your first event
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/50">
              Choose your format, publish your event, bring your community together, and let the platform handle
              the payout logic. Browse the product pages if you want the deeper format detail first.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <a
                href="/web3/quiz"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Trophy className="h-5 w-5" /> Explore Quiz
              </a>
              <a
                href="/web3/elimination"
                className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 bg-orange-400/10 px-8 py-4 font-mono font-bold text-orange-400 transition hover:border-orange-400/80 hover:bg-orange-400/20"
              >
                <Crosshair className="h-5 w-5" /> Explore Elimination
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

export default Web3HostPage;