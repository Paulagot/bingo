import React, { useEffect, useMemo, useState } from 'react';
import { SEO } from '../../components/SEO';
import { Web3Header } from '../../components/GeneralSite2/Web3Header';
import {
  Trophy,
  Crosshair,
  Search,
  Calendar,
  Globe,
  Zap,
  ArrowRight,
  Rocket,
  Radio,
} from 'lucide-react';
import {
  getPublicEvents,
  type PublicEvent,
  type EventType,
  type Chain,
} from '../../services/web3PublicEventsService';
import { PublicEventCard } from './PublicEventCard';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
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

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseEventDate(event: PublicEvent): Date {
  const d = new Date(`${event.event_date}T${event.start_time}`);
  return Number.isNaN(d.getTime()) ? new Date(event.event_date) : d;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isWithinNextDays(date: Date, days: number): boolean {
  const today = startOfToday();
  const upper = new Date(today);
  upper.setDate(upper.getDate() + days);
  return date >= today && date <= upper;
}

/* -------------------------------------------------------------------------- */
/* Shared UI                                                                  */
/* -------------------------------------------------------------------------- */
const W3Card: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`rounded-2xl border border-[#1e2d42] bg-[#0f1520] ${className}`}>
    {children}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2.5 rounded-full border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-2.5 font-mono text-base font-bold uppercase tracking-widest text-[#a3f542] shadow-[0_0_20px_rgba(163,245,66,0.08)]">
    {children}
  </span>
);

interface Filters {
  search: string;
  type: '' | EventType;
  chain: '' | Chain;
}

const FilterBar: React.FC<{
  filters: Filters;
  onChange: (f: Filters) => void;
  total: number;
}> = ({ filters, onChange, total }) => {
  const btn = (active: boolean) =>
    `rounded-lg border px-4 py-2 font-mono text-sm transition-all ${
      active
        ? 'border-[#a3f542] bg-[#a3f542]/10 text-[#a3f542]'
        : 'border-[#1e2d42] text-white/40 hover:border-white/20 hover:text-white/60'
    }`;

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
          <input
            type="text"
            value={filters.search}
            onChange={e => onChange({ ...filters, search: e.target.value })}
            placeholder="Search events, hosts, causes..."
            className="w-full rounded-xl border border-[#1e2d42] bg-[#0f1520] py-2.5 pl-9 pr-4 font-mono text-sm text-white placeholder-white/20 focus:border-[#a3f542]/40 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={btn(filters.type === '')} onClick={() => onChange({ ...filters, type: '' })}>
            All
          </button>
          <button className={btn(filters.type === 'quiz')} onClick={() => onChange({ ...filters, type: 'quiz' })}>
            <Trophy className="mr-1.5 inline h-3.5 w-3.5 -mt-0.5" />
            Quiz
          </button>
          <button
            className={btn(filters.type === 'elimination')}
            onClick={() => onChange({ ...filters, type: 'elimination' })}
          >
            <Crosshair className="mr-1.5 inline h-3.5 w-3.5 -mt-0.5" />
            Elimination
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button className={btn(filters.chain === '')} onClick={() => onChange({ ...filters, chain: '' })}>
            Any chain
          </button>
          <button className={btn(filters.chain === 'solana')} onClick={() => onChange({ ...filters, chain: 'solana' })}>
            Solana
          </button>
          <button className={btn(filters.chain === 'base')} onClick={() => onChange({ ...filters, chain: 'base' })}>
            Base
          </button>
        </div>
      </div>

      <div className="font-mono text-xs text-white/30">
        {total} event{total !== 1 ? 's' : ''} shown
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ filtered: boolean }> = ({ filtered }) => (
  <W3Card className="col-span-full p-10 text-center">
    <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#1e2d42] bg-[#0a0e14]">
      <Zap className="h-7 w-7 text-[#a3f542]/30" />
    </div>
    <h3 className="font-mono text-2xl font-bold text-white/65">
      {filtered ? 'No events match your search' : 'No events listed yet'}
    </h3>
    <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/40">
      {filtered
        ? 'Try clearing your search or filters to see more live and upcoming events.'
        : 'This marketplace is ready for events. Be the first to publish one and give players something to join.'}
    </p>
    <div className="mt-8 flex flex-wrap justify-center gap-3">
      <a
        href="/web3/host"
        className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-5 py-3 font-mono text-sm font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
      >
        <Rocket className="h-4 w-4" />
        Host an event
      </a>
      <a
        href="/web3/fundraisersdashboard"
        className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-5 py-3 font-mono text-sm font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
      >
        Dashboard
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  </W3Card>
);

const SectionBlock: React.FC<{
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  events: PublicEvent[];
}> = ({ title, subtitle, icon, events }) => {
  if (events.length === 0) return null;

  return (
    <section className="relative z-10 py-8">
      <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-sm font-bold uppercase tracking-widest text-white/70">
              {icon}
              {title}
            </div>
            <p className="mt-2 text-sm text-white/45">{subtitle}</p>
          </div>
          <div className="font-mono text-xs text-white/25">
            {events.length} event{events.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {events.map(event => (
            <PublicEventCard key={event.id} event={event} />
          ))}
        </div>
      </div>
    </section>
  );
};

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */
const EventsDiscoveryPage: React.FC = () => {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    type: '',
    chain: '',
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getPublicEvents({ limit: 100, offset: 0 });
        setEvents(res.events ?? []);
      } catch {
        setError('Could not load events. Please try again in a moment.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = events;

    if (filters.type) list = list.filter(e => e.event_type === filters.type);
    if (filters.chain) list = list.filter(e => e.chain === filters.chain);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        e =>
          e.title.toLowerCase().includes(q) ||
          e.host_name.toLowerCase().includes(q) ||
          e.charity_name.toLowerCase().includes(q) ||
          (e.description?.toLowerCase().includes(q) ?? false)
      );
    }

    return list;
  }, [events, filters]);

  const grouped = useMemo(() => {
    const today = startOfToday();

    const live = filtered.filter(e => e.status === 'live');

    const remaining = filtered.filter(e => e.status !== 'live');

    const todayEvents = remaining.filter(e => isSameDay(parseEventDate(e), today));

    const weekEvents = remaining.filter(e => {
      const d = parseEventDate(e);
      return !isSameDay(d, today) && isWithinNextDays(d, 7);
    });

    const upcoming = remaining.filter(e => {
      const d = parseEventDate(e);
      return !isSameDay(d, today) && !isWithinNextDays(d, 7);
    });

    return { live, todayEvents, weekEvents, upcoming };
  }, [filtered]);

  const isFiltered = Boolean(filters.search || filters.type || filters.chain);
  const totalShown = filtered.length;

  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Web3 Fundraising Marketplace', item: abs('/web3') },
      { '@type': 'ListItem', position: 3, name: 'Events', item: abs('/web3/events') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Live and Upcoming Web3 Fundraising Events | FundRaisely',
    description:
      'Browse live and upcoming Web3 fundraising quiz nights and elimination games. Discover events by host, cause, chain and format on the FundRaisely marketplace.',
    url: abs('/web3/events'),
    isPartOf: { '@type': 'WebSite', url: abs('/') },
  };

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'FundRaisely public events',
    itemListElement: filtered.slice(0, 20).map((event, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: event.join_url,
      name: event.title,
    })),
  };

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
        title="Live and Upcoming Web3 Fundraising Events | FundRaisely"
        description="Browse live and upcoming Web3 fundraising quiz nights and elimination games. Discover events by host, cause, chain and format on the FundRaisely marketplace."
        keywords="web3 fundraising events, live crypto charity events, online quiz nights, elimination fundraiser, browse fundraising events, Solana charity events, Base fundraising events, join charity game online"
        domainStrategy="geographic"
        image="/fundraisely.png"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Web3 Fundraising Marketplace', item: '/web3' },
          { name: 'Events', item: '/web3/events' },
        ]}
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, itemListJsonLd]}
      />

      <Web3Header />

      <section className="relative z-10 pb-10 pt-28 sm:pt-32">
        <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <SectionLabel>
              <Calendar className="h-4 w-4" />
              Event discovery
            </SectionLabel>

            <h1 className="mt-6 font-mono text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl">
              Find live fundraising events
              <br />
             <span className="text-[#9945FF]">Join games that fund real causes.</span>
            </h1>

            <p className="mt-6 max-w-3xl text-xl leading-relaxed text-white/70">
              Not a donation. Not gambling. Participation-based fundraising.

            </p>

            {/* <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="/web3/host"
                className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-6 py-3 font-mono font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                <Rocket className="h-4 w-4" />
                Host an event
              </a>

              <a
                href="/web3"
                className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-6 py-3 font-mono font-semibold text-white/60 transition hover:border-white/30 hover:text-white"
              >
                Marketplace overview
              </a>
            </div> */}
          </div>

          <W3Card className="mt-10 p-4 sm:p-6">
            <FilterBar filters={filters} onChange={setFilters} total={totalShown} />
          </W3Card>
        </div>
      </section>

      {loading && (
        <section className="relative z-10 py-8">
          <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <W3Card key={i} className="animate-pulse p-5">
                  <div className="h-5 w-24 rounded bg-white/10" />
                  <div className="mt-4 h-7 w-3/4 rounded bg-white/10" />
                  <div className="mt-3 h-16 rounded bg-white/10" />
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="h-16 rounded-xl bg-white/5" />
                    <div className="h-16 rounded-xl bg-white/5" />
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="h-4 w-1/2 rounded bg-white/10" />
                    <div className="h-4 w-1/3 rounded bg-white/10" />
                    <div className="h-4 w-1/4 rounded bg-white/10" />
                  </div>
                  <div className="mt-6 h-12 rounded-xl bg-white/10" />
                </W3Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {!loading && error && (
        <section className="relative z-10 py-8">
          <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <W3Card className="p-10 text-center">
              <p className="font-mono text-xl font-bold text-white">Could not load events</p>
              <p className="mt-3 text-white/50">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-5 py-3 font-mono text-sm font-semibold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
              >
                Try again
              </button>
            </W3Card>
          </div>
        </section>
      )}

      {!loading && !error && totalShown === 0 && (
        <section className="relative z-10 py-8">
          <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5">
              <EmptyState filtered={isFiltered} />
            </div>
          </div>
        </section>
      )}

      {!loading && !error && totalShown > 0 && (
        <>
          <SectionBlock
            title="Live now"
            subtitle="Events that are currently marked live."
            icon={<Radio className="h-4 w-4 text-red-300" />}
            events={grouped.live}
          />

          <SectionBlock
            title="Today"
            subtitle="Starting today or happening later today."
            icon={<Calendar className="h-4 w-4 text-[#a3f542]" />}
            events={grouped.todayEvents}
          />

          <SectionBlock
            title="This week"
            subtitle="Upcoming events over the next seven days."
            icon={<Globe className="h-4 w-4 text-white/70" />}
            events={grouped.weekEvents}
          />

          <SectionBlock
            title="Coming up"
            subtitle="Everything else in the pipeline."
            icon={<Zap className="h-4 w-4 text-white/70" />}
            events={grouped.upcoming}
          />

          <section className="relative z-10 pb-20 pt-8">
            <div className="container mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
              <W3Card className="border-[#a3f542]/20 p-8 text-center sm:p-10">
                <p className="font-mono text-xs uppercase tracking-widest text-[#a3f542]/60">
                  Want your event here?
                </p>
                <h2 className="mt-3 font-mono text-3xl font-bold text-white">
                  Publish an event and bring the marketplace to life
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/60">
                  Hosts are what make this page matter. Launch a quiz night or elimination game, choose a cause,
                  and give players something real to join.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <a
                    href="/web3/host"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#a3f542]/40 bg-[#a3f542]/10 px-8 py-4 font-mono font-bold text-[#a3f542] transition hover:border-[#a3f542]/80 hover:bg-[#a3f542]/20"
                  >
                    <Rocket className="h-5 w-5" />
                    Host an event
                  </a>
                  <a
                    href="/web3/fundraisersdashboard"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#1e2d42] px-8 py-4 font-mono font-bold text-white/50 transition hover:border-white/30 hover:text-white"
                  >
                    Dashboard
                    <ArrowRight className="h-5 w-5" />
                  </a>
                </div>
              </W3Card>
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default EventsDiscoveryPage;