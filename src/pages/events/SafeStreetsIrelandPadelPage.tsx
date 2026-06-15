// src/pages/events/SafeStreetsIrelandPadelPage.tsx
import React from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  HeartHandshake,
  Shield,
  Ticket,
  Sparkles,
  ExternalLink,
  ArrowRight,
  Users,
  Copy,
  CreditCard,
  Trophy,
  HandHeart,
  Info,
  Dumbbell,
  Megaphone,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import TicketPurchaseFlow from '../../components/Quiz/tickets/TicketPurchaseFlow';

const ROOM_ID = '3AB540C228354AB1';

const EVENT_SLUG = '/events/safe-streets-ireland-padel';
const EVENT_NAME = 'Safe Streets Ireland Padel Fundraiser';
const EVENT_DATE = '27 June';
const EVENT_YEAR = '2026';
const EVENT_TIME = 'Time to be confirmed';
const EVENT_LOCATION = 'House of Padel';

const SAFE_STREETS_URL = 'https://safestreetsireland.com/';
const SUPERTEAM_URL = 'https://x.com/superteamIE';

const SAFE_STREETS_LOGO = '/partner/SSI_LOGO_TRANSPARENT.png';
const SUPERTEAM_LOGO = '/partner/superteam_ireland_logo.jpeg';

const HERO_IMAGE_SRC =
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1600&q=80';

type PublicRoomInfo = {
  roomId: string;
  status: 'draft' | 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled' | string;
  capacity?: {
    ticketSalesOpen: boolean;
    ticketSalesCloseReason?: string | null;
    message?: string;
  };
};

function usePublicRoomInfo(roomId: string) {
  const [roomInfo, setRoomInfo] = React.useState<PublicRoomInfo | null>(null);
  const [loading, setLoading] = React.useState(Boolean(roomId));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!roomId) {
      setRoomInfo(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/api/quiz/tickets/room/${roomId}/info`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load room status');
        }

        if (!cancelled) {
          setRoomInfo(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load room status');
          setLoading(false);
        }
      }
    };

    load();

    const interval = window.setInterval(load, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [roomId]);

  return { roomInfo, loading, error };
}

function useEventSeo() {
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const title = `${EVENT_NAME} | ${EVENT_DATE} ${EVENT_YEAR} | FundRaisely`;
    const description =
      'Buy tickets for the Safe Streets Ireland padel fundraiser on 27 June. A community fundraising event supporting youth violence prevention, safer streets and brighter futures.';

    document.title = title;

    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;

      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', name);
        document.head.appendChild(tag);
      }

      tag.setAttribute('content', content);
    };

    const setPropertyMeta = (property: string, content: string) => {
      let tag = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;

      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('property', property);
        document.head.appendChild(tag);
      }

      tag.setAttribute('content', content);
    };

    setMeta('description', description);
    setMeta(
      'keywords',
      'Safe Streets Ireland, padel fundraiser, youth crime prevention Ireland, knife crime prevention Ireland, community fundraiser, House of Padel, FundRaisely, Superteam Ireland'
    );

    setPropertyMeta('og:title', title);
    setPropertyMeta('og:description', description);
    setPropertyMeta('og:type', 'event');
    setPropertyMeta('og:image', SAFE_STREETS_LOGO);
    setPropertyMeta('og:url', `${window.location.origin}${EVENT_SLUG}`);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;

    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }

    canonical.setAttribute('href', `${window.location.origin}${EVENT_SLUG}`);

    const existingJsonLd = document.getElementById('safe-streets-padel-jsonld');
    existingJsonLd?.remove();

    const jsonLd = document.createElement('script');
    jsonLd.id = 'safe-streets-padel-jsonld';
    jsonLd.type = 'application/ld+json';
    jsonLd.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: EVENT_NAME,
      description,
      startDate: '2026-06-27',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      eventStatus: 'https://schema.org/EventScheduled',
      location: {
        '@type': 'Place',
        name: EVENT_LOCATION,
      },
      organizer: {
        '@type': 'Organization',
        name: 'Safe Streets Ireland',
        url: SAFE_STREETS_URL,
      },
      sponsor: [
        {
          '@type': 'Organization',
          name: 'FundRaisely',
        },
        {
          '@type': 'Organization',
          name: 'Superteam Ireland',
          url: SUPERTEAM_URL,
        },
      ],
      url: `${window.location.origin}${EVENT_SLUG}`,
    });

    document.head.appendChild(jsonLd);

    return () => {
      jsonLd.remove();
    };
  }, []);
}

export default function SafeStreetsIrelandPadelPage() {
  useEventSeo();

  const {
    roomInfo,
    loading: roomStatusLoading,
    error: roomStatusError,
  } = usePublicRoomInfo(ROOM_ID);

  const hasLinkedRoom = Boolean(ROOM_ID);

  const ticketSalesOpen = roomInfo?.capacity?.ticketSalesOpen ?? true;
  const roomStatus = roomInfo?.status ?? 'scheduled';

  const eventPageUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${EVENT_SLUG}` : '';

  const ticketBuyUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/tickets/buy/${ROOM_ID}`
      : `/tickets/buy/${ROOM_ID}`;

  const shouldShowEnded =
    hasLinkedRoom && (roomStatus === 'completed' || roomStatus === 'cancelled');

  const shouldShowHoldTight =
    hasLinkedRoom &&
    !ticketSalesOpen &&
    roomStatus !== 'completed' &&
    roomStatus !== 'cancelled';

  const scrollToTickets = () => {
    const isDesktop =
      typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches;

    const mobileEl = document.getElementById('event-tickets-mobile');
    const desktopEl = document.getElementById('event-tickets');

    const el = isDesktop ? desktopEl : mobileEl || desktopEl;

    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[#f8f3ea] text-[#17120d]">
      {/* HERO */}
      <section className="relative overflow-hidden bg-[#d66c18] text-white">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${HERO_IMAGE_SRC})` }}
        />

        <div className="absolute inset-0 bg-gradient-to-br from-[#ee7d1e]/95 via-[#dc711c]/94 to-[#b95512]/96" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.12),transparent_32%)]" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Top bar */}
          <div className="flex items-center justify-between gap-5 pt-5 pb-2">
            <a
              href={SAFE_STREETS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
              aria-label="Visit Safe Streets Ireland"
            >
              <img
                src={SAFE_STREETS_LOGO}
                alt="Safe Streets Ireland logo"
                className="h-16 w-auto object-contain sm:h-20 lg:h-24"
              />
            </a>

            <div className="flex items-center gap-3">
              <a
                href={SAFE_STREETS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-white/18 px-5 py-3 text-sm font-black text-white ring-1 ring-white/25 transition hover:bg-white/28"
              >
                Back to Safe Streets Ireland
              </a>

              <button
                type="button"
                onClick={scrollToTickets}
                className="hidden rounded-full bg-white px-5 py-3 text-sm font-black text-[#c96316] shadow-lg transition hover:bg-white/90 sm:inline-flex"
              >
                Get Ticket
              </button>
            </div>
          </div>

          <div className="grid gap-10 pb-20 pt-2 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-4">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/18 px-4 py-2 text-sm font-black ring-1 ring-white/25 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-white" />
                Community-Led Campaign
              </div>

              <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
                Safer Streets.
                <span className="block">Stronger</span>
                <span className="block">Communities.</span>
                <span className="block">Brighter Futures.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-white/92">
                Join <span className="font-black">Safe Streets Ireland</span> for a padel
                fundraiser on <span className="font-black">{EVENT_DATE}</span>, supporting a
                community-led campaign working to reduce youth violence and knife crime through
                prevention, education, community action and opportunity.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <FactCard
                  icon={<CalendarDays className="h-5 w-5" />}
                  label="Date"
                  value={`${EVENT_DATE} ${EVENT_YEAR}`}
                />

                <FactCard
                  icon={<Clock className="h-5 w-5" />}
                  label="Time"
                  value={EVENT_TIME}
                />

                <FactCard
                  icon={<MapPin className="h-5 w-5" />}
                  label="Location"
                  value={EVENT_LOCATION}
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Badge>Non-digital ticketed event</Badge>
                <Badge>Padel fundraiser</Badge>
                <Badge>Supporting youth crime prevention</Badge>
              </div>
            </div>

            <div className="space-y-5 lg:pl-12">
              <div className="overflow-hidden rounded-[2rem] border border-white/20 bg-white/18 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.14)] backdrop-blur">
                <img
                  src={HERO_IMAGE_SRC}
                  alt="People playing padel on an indoor court"
                  className="h-[320px] w-full rounded-[1.5rem] object-cover sm:h-[420px]"
                />
              </div>

              <div className="rounded-[2rem] border border-white/20 bg-white/18 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.12)] backdrop-blur">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-white/75">
                  Event partners
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <PartnerLogoCard
                    imgSrc={SAFE_STREETS_LOGO}
                    name="Safe Streets Ireland"
                    href={SAFE_STREETS_URL}
                  />

                  <FundraiselyPartnerCard />

                  <PartnerLogoCard
                    imgSrc={SUPERTEAM_LOGO}
                    name="Superteam Ireland"
                    href={SUPERTEAM_URL}
                    fallback="Superteam Ireland"
                  />
                </div>
              </div>

              <div id="event-tickets-mobile" className="lg:hidden">
                <MobileTicketPanel
                  hasLinkedRoom={hasLinkedRoom}
                  shouldShowEnded={shouldShowEnded}
                  shouldShowHoldTight={shouldShowHoldTight}
                  roomStatus={roomStatus}
                  roomStatusLoading={roomStatusLoading}
                  roomStatusError={roomStatusError}
                  roomInfo={roomInfo}
                  ticketBuyUrl={ticketBuyUrl}
                  eventPageUrl={eventPageUrl}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 92"
            preserveAspectRatio="none"
            className="h-16 w-full fill-[#f8f3ea] sm:h-20"
            aria-hidden="true"
          >
            <path d="M0,70 C240,20 480,20 720,50 C960,80 1200,80 1440,42 L1440,92 L0,92 Z" />
          </svg>
        </div>
      </section>

      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_520px] xl:grid-cols-[minmax(0,1fr)_560px]">
          <div className="space-y-8">
            <SectionCard
              eyebrow="Why it matters"
              title="A community event for safer streets and brighter futures"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={<Shield className="h-6 w-6" />}
                  title="Prevention first"
                  text="Safe Streets Ireland is focused on preventing youth violence and knife crime before more families and communities are affected."
                />

                <FeatureCard
                  icon={<HeartHandshake className="h-6 w-6" />}
                  title="Support and opportunity"
                  text="The campaign promotes education, community action, youth engagement and positive pathways for young people."
                />
              </div>

              <div className="mt-4 rounded-2xl border border-[#eabf99] bg-[#fff6ed] p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#df741d] text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#17120d]">
                      Sport, community and action in one event.
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-[#5f5044]">
                      This padel fundraiser brings people together around a positive message:
                      safer communities are possible when people show up, support each other
                      and create better choices for young people.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard eyebrow="Event format" title="A social padel fundraiser">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoPanel
                  icon={<Ticket className="h-6 w-6" />}
                  title="Buy a ticket"
                  text="Reserve your place through the FundRaisely ticket panel. Your ticket supports the Safe Streets Ireland fundraiser."
                />

                <InfoPanel
                  icon={<Dumbbell className="h-6 w-6" />}
                  title="Play in person"
                  text="This is a physical padel event at House of Padel. There is no digital game room or online gameplay required."
                />
              </div>

              <div className="mt-6 rounded-2xl border border-[#eabf99] bg-[#fff6ed] p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#df741d] text-white">
                    <Info className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#17120d]">
                      Final running details may be confirmed closer to the event.
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-[#5f5044]">
                      The date is confirmed as <strong>{EVENT_DATE}</strong>. Start time,
                      match format, ticket limits and sponsor details can be updated on this
                      page once the organiser confirms them.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard eyebrow="What to expect" title="Fun, friendly padel for a serious cause">
              <p className="mb-6 text-base leading-8 text-[#5f5044]">
                This is a chance to bring people together in a positive setting, support the
                Safe Streets Ireland campaign, and show that community action can be active,
                social and hopeful.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={<Trophy className="h-6 w-6" />}
                  title="A positive night out"
                  text="The event is designed to feel welcoming and energetic, with padel giving people an easy way to take part and support the campaign."
                />

                <FeatureCard
                  icon={<Users className="h-6 w-6" />}
                  title="Community in action"
                  text="Supporters, families, local businesses and partner organisations can come together around one clear message: safer streets start with stronger communities."
                />

                <FeatureCard
                  icon={<HeartHandshake className="h-6 w-6" />}
                  title="Showing young people better paths"
                  text="Sport creates connection, confidence and belonging. This fundraiser supports the idea that young people need positive spaces, role models and real alternatives."
                />

                <FeatureCard
                  icon={<HandHeart className="h-6 w-6" />}
                  title="Support that goes beyond the night"
                  text="Every ticket and share helps raise awareness for Safe Streets Ireland’s wider work around prevention, education, community action and opportunity."
                />
              </div>
            </SectionCard>

            <SectionCard eyebrow="Campaign storytelling" title="More than a fundraiser">
              <p className="mb-6 text-base leading-8 text-[#5f5044]">
                Safe Streets Ireland is not just asking people to attend an event. The
                campaign is inviting people to stand behind a message: violence is not
                inevitable, and communities can help create better choices for young people.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={<Megaphone className="h-6 w-6" />}
                  title="A clear message"
                  text="The event gives supporters a simple way to share the campaign’s message: safer streets, stronger communities and brighter futures."
                />

                <FeatureCard
                  icon={<Shield className="h-6 w-6" />}
                  title="Prevention before crisis"
                  text="The focus is on early action, education and community support before young people are pulled further into violence, fear or pressure."
                />

                <FeatureCard
                  icon={<Users className="h-6 w-6" />}
                  title="People coming together"
                  text="Fundraisers like this create space for conversations between families, supporters, community leaders, local businesses and organisations that want change."
                />

                <FeatureCard
                  icon={<Sparkles className="h-6 w-6" />}
                  title="Hope, not fear"
                  text="The tone of the campaign is positive and practical: highlighting the problem while also showing that better futures are possible."
                />
              </div>
            </SectionCard>

            <SectionCard eyebrow="Campaign message" title="Violence is not inevitable">
              <div className="rounded-[1.75rem] bg-[#d66c18] p-6 text-white sm:p-8">
                <p className="text-lg leading-8 text-white/92">
                  Safe Streets Ireland’s message is rooted in prevention, education,
                  community action and hope. This event is one way for supporters to stand
                  with the campaign and help create positive opportunities for young people.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={SAFE_STREETS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-[#c96316] transition hover:bg-white/90"
                  >
                    Back to Safe Streets Ireland
                    <ExternalLink className="h-4 w-4" />
                  </a>

                  <button
                    type="button"
                    onClick={scrollToTickets}
                    className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20"
                  >
                    Buy ticket
                    <Ticket className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </SectionCard>

            <div className="rounded-[2rem] border border-[#e5d4c2] bg-white p-6 shadow-sm sm:p-8">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#df741d]">
                Powered by FundRaisely
              </p>

              <h2 className="mt-2 text-3xl font-black leading-tight text-[#17120d]">
                Ticketed fundraising events without messy spreadsheets.
              </h2>

              <p className="mt-4 text-base leading-8 text-[#5f5044]">
                FundRaisely helps clubs, charities and community groups run fundraising
                events, sell tickets, track payments, manage attendance and keep clearer
                post-event records.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-full bg-[#17120d] px-5 py-3 text-sm font-black text-white transition hover:bg-[#2a2119]"
                >
                  FundRaisely Home
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/event-formats/ticketed-events"
                  className="inline-flex items-center gap-2 rounded-full border border-[#e5d4c2] bg-[#fffaf4] px-5 py-3 text-sm font-black text-[#17120d] transition hover:bg-[#fff3e3]"
                >
                  Ticketed events
                  <ExternalLink className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* DESKTOP TICKET COLUMN */}
          <aside
            id="event-tickets"
            className="hidden w-full scroll-mt-6 lg:sticky lg:top-6 lg:block lg:self-start"
          >
            <DesktopTicketPanel
              hasLinkedRoom={hasLinkedRoom}
              shouldShowEnded={shouldShowEnded}
              shouldShowHoldTight={shouldShowHoldTight}
              roomStatus={roomStatus}
              roomStatusLoading={roomStatusLoading}
              roomStatusError={roomStatusError}
              roomInfo={roomInfo}
              ticketBuyUrl={ticketBuyUrl}
              eventPageUrl={eventPageUrl}
            />

            <ShareEventCard eventPageUrl={eventPageUrl} />

            <div className="mt-4 rounded-[1.75rem] border border-[#e5d4c2] bg-white p-5 shadow-sm">
              <p className="text-sm leading-7 text-[#5f5044]">
                Door payments may also be accepted if enabled by the organiser. Options can
                include{' '}
                <span className="font-semibold text-[#17120d]">
                  cash, card tap, Revolut or another agreed payment method
                </span>
                .
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function FactCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/25 bg-white p-5 text-[#17120d] shadow-[0_18px_45px_rgba(0,0,0,0.10)]">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eafff3] text-[#268b69]">
        {icon}
      </div>

      <div className="text-xs font-black uppercase tracking-[0.14em] text-[#7d7890]">
        {label}
      </div>

      <div className="mt-2 text-lg font-black text-[#17120d]">{value}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/40 bg-white px-5 py-3 text-sm font-black text-[#242045] shadow-sm">
      {children}
    </span>
  );
}

function SmallPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-[#fff6ed] px-3 py-1 text-xs font-bold text-[#9f4d10] ring-1 ring-[#eabf99]">
      {children}
    </span>
  );
}

function SectionCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-[#e5d4c2] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#df741d]">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black leading-tight text-[#17120d]">
        {title}
      </h2>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#eadccc] bg-[#fffaf4] p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0df] text-[#df741d]">
        {icon}
      </div>

      <h3 className="text-lg font-black text-[#17120d]">{title}</h3>

      <p className="mt-2 text-sm leading-7 text-[#5f5044]">{text}</p>
    </div>
  );
}

function InfoPanel({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#eadccc] bg-[#fffdf9] p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff0df] text-[#df741d]">
        {icon}
      </div>

      <h3 className="text-lg font-black text-[#17120d]">{title}</h3>

      <p className="mt-2 text-sm leading-7 text-[#5f5044]">{text}</p>
    </div>
  );
}

function PartnerLogoCard({
  imgSrc,
  name,
  href,
  fallback,
}: {
  imgSrc: string;
  name: string;
  href?: string;
  fallback?: string;
}) {
  const [failed, setFailed] = React.useState(false);

  const content = (
    <div className="flex min-h-[112px] items-center justify-center rounded-2xl border border-white/20 bg-white p-4 text-center transition hover:-translate-y-0.5 hover:shadow-sm">
      {failed ? (
        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#17120d]">
          {fallback || name}
        </p>
      ) : (
        <img
          src={imgSrc}
          alt={name}
          onError={() => setFailed(true)}
          className="max-h-16 w-auto max-w-[170px] object-contain"
        />
      )}
    </div>
  );

  if (!href) return content;

  const isInternal = href.startsWith('/');

  if (isInternal) {
    return (
      <Link to={href} aria-label={`Open ${name}`}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name}`}>
      {content}
    </a>
  );
}

function FundraiselyPartnerCard() {
  return (
    <Link to="/" aria-label="Open FundRaisely">
      <div className="flex min-h-[112px] items-center justify-center rounded-2xl border border-white/20 bg-white p-4 text-center transition hover:-translate-y-0.5 hover:shadow-sm">
        <div>
          <p className="text-xl font-black tracking-tight text-[#17120d]">FundRaisely</p>
          <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#9f4d10]">
            Ticketing partner
          </p>
        </div>
      </div>
    </Link>
  );
}

function MobileTicketPanel({
  hasLinkedRoom,
  shouldShowEnded,
  shouldShowHoldTight,
  roomStatus,
  roomStatusLoading,
  roomStatusError,
  roomInfo,
  ticketBuyUrl,
  eventPageUrl,
}: {
  hasLinkedRoom: boolean;
  shouldShowEnded: boolean;
  shouldShowHoldTight: boolean;
  roomStatus: string;
  roomStatusLoading: boolean;
  roomStatusError: string | null;
  roomInfo: PublicRoomInfo | null;
  ticketBuyUrl: string;
  eventPageUrl: string;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/25 bg-white p-4 text-[#17120d] shadow-[0_18px_45px_rgba(0,0,0,0.16)]">
      <TicketIntroCard
        shouldShowEnded={shouldShowEnded}
        shouldShowHoldTight={shouldShowHoldTight}
      />

      <TicketPanelBody
        hasLinkedRoom={hasLinkedRoom}
        shouldShowEnded={shouldShowEnded}
        shouldShowHoldTight={shouldShowHoldTight}
        roomStatus={roomStatus}
        roomStatusLoading={roomStatusLoading}
        roomStatusError={roomStatusError}
        roomInfo={roomInfo}
        ticketBuyUrl={ticketBuyUrl}
        eventPageUrl={eventPageUrl}
      />
    </div>
  );
}

function DesktopTicketPanel({
  hasLinkedRoom,
  shouldShowEnded,
  shouldShowHoldTight,
  roomStatus,
  roomStatusLoading,
  roomStatusError,
  roomInfo,
  ticketBuyUrl,
  eventPageUrl,
}: {
  hasLinkedRoom: boolean;
  shouldShowEnded: boolean;
  shouldShowHoldTight: boolean;
  roomStatus: string;
  roomStatusLoading: boolean;
  roomStatusError: string | null;
  roomInfo: PublicRoomInfo | null;
  ticketBuyUrl: string;
  eventPageUrl: string;
}) {
  return (
    <>
      <TicketIntroCard
        shouldShowEnded={shouldShowEnded}
        shouldShowHoldTight={shouldShowHoldTight}
      />

      <TicketPanelBody
        hasLinkedRoom={hasLinkedRoom}
        shouldShowEnded={shouldShowEnded}
        shouldShowHoldTight={shouldShowHoldTight}
        roomStatus={roomStatus}
        roomStatusLoading={roomStatusLoading}
        roomStatusError={roomStatusError}
        roomInfo={roomInfo}
        ticketBuyUrl={ticketBuyUrl}
        eventPageUrl={eventPageUrl}
      />
    </>
  );
}

function TicketIntroCard({
  shouldShowEnded,
  shouldShowHoldTight,
}: {
  shouldShowEnded: boolean;
  shouldShowHoldTight: boolean;
}) {
  return (
    <div className="mb-4 rounded-[1.75rem] border border-[#e5d4c2] bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-[#df741d]">
        Reserve your place
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#17120d]">
        {shouldShowEnded
          ? 'Event unavailable'
          : shouldShowHoldTight
            ? 'Tickets opening soon'
            : 'Get your event ticket'}
      </h3>

      <p className="mt-2 text-sm leading-7 text-[#5f5044]">
        {shouldShowEnded
          ? 'This event has ended or is no longer available.'
          : shouldShowHoldTight
            ? 'Ticket sales are not open right now. Once the organiser opens the room, this panel will show the live ticket flow.'
            : `Buy your ticket for the Safe Streets Ireland padel fundraiser on ${EVENT_DATE}.`}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <SmallPill>{EVENT_DATE}</SmallPill>
        <SmallPill>Padel</SmallPill>
        <SmallPill>In person</SmallPill>
      </div>
    </div>
  );
}

function TicketPanelBody({
  hasLinkedRoom,
  shouldShowEnded,
  shouldShowHoldTight,
  roomStatus,
  roomStatusLoading,
  roomStatusError,
  roomInfo,
  ticketBuyUrl,
  eventPageUrl,
}: {
  hasLinkedRoom: boolean;
  shouldShowEnded: boolean;
  shouldShowHoldTight: boolean;
  roomStatus: string;
  roomStatusLoading: boolean;
  roomStatusError: string | null;
  roomInfo: PublicRoomInfo | null;
  ticketBuyUrl: string;
  eventPageUrl: string;
}) {
  if (!hasLinkedRoom) {
    return <TicketComingSoonCard eventPageUrl={eventPageUrl} />;
  }

  if (shouldShowEnded) {
    return <EventEndedCard status={roomStatus} />;
  }

  return (
    <>
      {roomStatusLoading && <TicketPanelStatusNote text="Checking ticket status..." />}

      {roomStatusError && (
        <TicketPanelStatusNote
          tone="warning"
          text="We could not check the room status, but the ticket panel is still available below."
        />
      )}

      {shouldShowHoldTight ? (
        <HoldTightTicketCard
          reason={roomInfo?.capacity?.ticketSalesCloseReason || roomInfo?.capacity?.message}
        />
      ) : (
        <TicketPurchaseFlow roomId={ROOM_ID} mode="embedded" />
      )}

      <DirectTicketLinkCard ticketBuyUrl={ticketBuyUrl} />
    </>
  );
}

function TicketComingSoonCard({ eventPageUrl }: { eventPageUrl: string }) {
  return (
    <div className="rounded-[1.75rem] border border-[#e5d4c2] bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#df741d]">
        Ticket panel
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#17120d]">
        Ticket flow coming soon
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#5f5044]">
        Once the Safe Streets Ireland room is created and linked, this panel will become
        the live ticket purchase flow.
      </p>

      {eventPageUrl && (
        <p className="mt-4 break-all rounded-2xl border border-[#e5d4c2] bg-[#fffaf4] p-3 text-xs leading-6 text-[#7a6758]">
          Preview URL: {eventPageUrl}
        </p>
      )}
    </div>
  );
}

function TicketPanelStatusNote({
  text,
  tone = 'neutral',
}: {
  text: string;
  tone?: 'neutral' | 'warning';
}) {
  return (
    <div
      className={`mb-4 rounded-2xl border p-4 text-sm leading-6 ${
        tone === 'warning'
          ? 'border-amber-200 bg-amber-50 text-amber-800'
          : 'border-[#e5d4c2] bg-white text-[#5f5044]'
      }`}
    >
      {text}
    </div>
  );
}

function HoldTightTicketCard({ reason }: { reason?: string | null }) {
  return (
    <div className="rounded-[1.75rem] border border-[#e5d4c2] bg-white p-6 shadow-sm">
      <div className="rounded-2xl bg-[#d66c18] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">
          Tickets not open
        </p>

        <h3 className="mt-2 text-3xl font-black leading-tight">Hold tight</h3>

        <p className="mt-3 text-sm leading-7 text-white/85">
          Ticket sales are not open right now. Once the organiser opens the room, this
          panel will automatically show the ticket purchase flow.
        </p>
      </div>

      {reason && (
        <div className="mt-5 rounded-2xl border border-[#eabf99] bg-[#fff6ed] p-4">
          <p className="text-xs leading-6 text-[#5f5044]">Status: {reason}</p>
        </div>
      )}
    </div>
  );
}

function EventEndedCard({ status }: { status: string }) {
  const label = status === 'cancelled' ? 'cancelled' : 'ended';

  return (
    <div className="rounded-[1.75rem] border border-[#e5d4c2] bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#df741d]">
        Event unavailable
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#17120d]">
        This event has {label}
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#5f5044]">
        Tickets are no longer available for this event.
      </p>
    </div>
  );
}

function DirectTicketLinkCard({ ticketBuyUrl }: { ticketBuyUrl: string }) {
  return (
    <div className="mt-4 rounded-[1.75rem] border border-[#e5d4c2] bg-white p-5 shadow-sm">
      <p className="text-sm leading-7 text-[#5f5044]">
        Having trouble with the embedded ticket panel?
      </p>

      <a
        href={ticketBuyUrl}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#df741d] px-5 py-4 text-base font-black text-white transition hover:bg-[#c96316]"
      >
        Open ticket page
        <ArrowRight className="h-5 w-5" />
      </a>

      <p className="mt-3 break-all text-center text-xs leading-6 text-[#7a6758]">
        {ticketBuyUrl}
      </p>
    </div>
  );
}

function ShareEventCard({ eventPageUrl }: { eventPageUrl: string }) {
  const [copied, setCopied] = React.useState(false);

  const copyEventLink = async () => {
    if (!eventPageUrl) return;

    try {
      await navigator.clipboard.writeText(eventPageUrl);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-4 rounded-[1.75rem] border border-[#e5d4c2] bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#df741d]">
        Share event
      </p>

      <h3 className="mt-2 text-lg font-black text-[#17120d]">
        Send this page to supporters
      </h3>

      <p className="mt-2 text-sm leading-7 text-[#5f5044]">
        Share the event page with players, supporters, partners and anyone who wants to
        support Safe Streets Ireland.
      </p>

      <button
        type="button"
        onClick={copyEventLink}
        disabled={!eventPageUrl}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#e5d4c2] bg-white px-5 py-3 text-sm font-bold text-[#17120d] transition hover:bg-[#fff6ed] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {copied ? 'Copied' : 'Copy event link'}
        <Copy className="h-4 w-4" />
      </button>

      {eventPageUrl && (
        <p className="mt-3 break-all text-center text-xs leading-6 text-[#7a6758]">
          {eventPageUrl}
        </p>
      )}
    </div>
  );
}