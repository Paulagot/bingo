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
} from 'lucide-react';
import { Link } from 'react-router-dom';

import TicketPurchaseFlow from '../../components/Quiz/tickets/TicketPurchaseFlow';

const ROOM_ID = 'REPLACE_WITH_SAFE_STREETS_ROOM_ID';

const HERO_IMAGE_SRC =
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1600&q=80';

const FUNDRAISELY_LOGO = '/Fundraiselynobackground.png';

// const HOUSE_OF_PADEL_URL = 'https://www.houseofpadel.ie/';

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
    if (!roomId || roomId === 'REPLACE_WITH_SAFE_STREETS_ROOM_ID') {
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

export default function SafeStreetsIrelandPadelPage() {
  const {
    roomInfo,
    loading: roomStatusLoading,
    error: roomStatusError,
  } = usePublicRoomInfo(ROOM_ID);

  const hasLinkedRoom = Boolean(ROOM_ID) && ROOM_ID !== 'REPLACE_WITH_SAFE_STREETS_ROOM_ID';

  const ticketSalesOpen = roomInfo?.capacity?.ticketSalesOpen ?? true;
  const roomStatus = roomInfo?.status ?? 'scheduled';

  const ticketPageUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/events/safe-streets-ireland-padel`
      : '';

  const shouldShowTicketFlow =
    hasLinkedRoom &&
    ticketSalesOpen &&
    roomStatus !== 'completed' &&
    roomStatus !== 'cancelled';

  const shouldShowHoldTight =
    hasLinkedRoom &&
    !ticketSalesOpen &&
    roomStatus !== 'completed' &&
    roomStatus !== 'cancelled';

  const shouldShowEnded =
    hasLinkedRoom &&
    (roomStatus === 'completed' || roomStatus === 'cancelled');

  return (
    <div className="min-h-screen bg-[#f8f6f2] text-[#1f2240]">
      {/* HERO */}
      <section className="border-b border-[#ece7dc] bg-gradient-to-br from-[#eef7f3] via-white to-[#f5f2ff]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid gap-10 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#cfe7dc] bg-[#ecfff7] px-4 py-2 text-sm font-bold text-[#126b53]">
                <Shield className="h-4 w-4" />
                SAFE STREETS IRELAND • Youth crime prevention fundraiser
              </div>

              <div>
                <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-[#23254a] sm:text-5xl lg:text-6xl">
                  There is more to life
                  <span className="block text-[#158467]">than youth crime.</span>
                  <span className="block">Play padel for safer streets.</span>
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4b4f73]">
                  Join <span className="font-bold text-[#23254a]">SAFE STREETS IRELAND</span>{' '}
                  for a community padel fundraiser at{' '}
                  <span className="font-bold text-[#23254a]">House of Padel</span>. This
                  event is being planned to raise awareness and support positive alternatives
                  for young people, with a night of fun, movement, connection and purpose.
                </p>

                <p className="mt-4 max-w-2xl text-base leading-8 text-[#555a7a]">
                  Final date, time, ticket price, sponsors and event details can be updated
                  once confirmed. For now, this page can be used as a preview landing page
                  for partners, organisers and supporters.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <FactCard
                  icon={<CalendarDays className="h-5 w-5" />}
                  label="Date"
                  value="To be confirmed"
                />

                <FactCard
                  icon={<Clock className="h-5 w-5" />}
                  label="Time"
                  value="To be confirmed"
                />

                <FactCard
                  icon={<MapPin className="h-5 w-5" />}
                  label="Location"
                  value="House of Padel"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge>Non-digital ticketed event</Badge>
                <Badge>Padel fundraiser</Badge>
                <Badge>Supporting youth crime prevention</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <div className="overflow-hidden rounded-[2rem] border border-[#ece7dc] bg-white shadow-[0_20px_60px_rgba(24,28,67,0.12)]">
                <img
                  src={HERO_IMAGE_SRC}
                  alt="People playing padel on an indoor court"
                  className="h-[360px] w-full object-cover sm:h-[430px]"
                />
              </div>

              <div className="rounded-[2rem] border border-[#ece7dc] bg-white p-5 shadow-[0_18px_45px_rgba(24,28,67,0.10)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#158467]" />
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7b7f9f]">
                        Event partners
                      </p>
                    </div>

                    <h2 className="mt-2 text-xl font-black text-[#23254a]">
                      A community event for positive change
                    </h2>
                  </div>

                  <span className="hidden rounded-full bg-[#ecfff7] px-3 py-1 text-xs font-black text-[#126b53] sm:inline-flex">
                    Preview page
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <SponsorLogoCard
                    imgSrc={FUNDRAISELY_LOGO}
                    name="FundRaisely"
                    href="/"
                    size="large"
                  />

                  <PlaceholderPartnerCard name="SAFE STREETS IRELAND" />
                </div>

                {/* <div className="mt-4 rounded-2xl border border-[#d9def5] bg-[#f5f7ff] p-4">
                  <p className="text-sm leading-7 text-[#555a7a]">
                    This event is being set up through{' '}
                    <span className="font-bold text-[#23254a]">FundRaisely Ticketed Events</span>,
                    allowing organisers to sell tickets, share a live event link, track
                    attendance and reconcile payments after the event.
                  </p>
                </div> */}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_520px] xl:grid-cols-[minmax(0,1fr)_560px]">
          {/* LEFT CONTENT */}
          <div className="space-y-8">
            <SectionCard
              eyebrow="Why it matters"
              title="A night of sport, community and better choices"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={<Shield className="h-6 w-6" />}
                  title="Preventing youth crime"
                  text="SAFE STREETS IRELAND is focused on youth crime prevention, awareness and creating positive community alternatives for young people."
                />

                <FeatureCard
                  icon={<HeartHandshake className="h-6 w-6" />}
                  title="There are better paths"
                  text="The message is simple: there is more to life than knife crime, gang pressure and violence. Sport, community and opportunity can help create a different future."
                />
              </div>

              <div className="mt-4 rounded-2xl border border-[#cfe7dc] bg-[#ecfff7] p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#158467] text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#23254a]">
                      Play padel. Start conversations. Support safer streets.
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-[#555a7a]">
                      This is designed as a positive, welcoming event where people can come
                      together, get active, support the campaign and show young people that
                      community can offer something better.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard eyebrow="Event format" title="A ticketed padel event, not a digital game">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoPanel
                  icon={<Ticket className="h-6 w-6" />}
                  title="Buy a ticket"
                  text="Supporters can reserve their place by buying a ticket through this page. The ticket panel can be connected to the live room once the event is created."
                />

                <InfoPanel
                  icon={<MapPin className="h-6 w-6" />}
                  title="Attend in person"
                  text="This is a physical event at House of Padel. There is no quiz room to join and no phone-based gameplay required."
                />
              </div>

              <div className="mt-6 rounded-2xl border border-[#f3dbc8] bg-[#fff7ef] p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f05b39] text-white">
                    <Info className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#23254a]">
                      Details still to be confirmed
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-[#555a7a]">
                      Date, start time, ticket price, match format, sponsor information and
                      fundraising target can all be updated later. This page is ready to use
                      as a pilot preview now.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard eyebrow="What to expect" title="Fun, friendly padel for a serious cause">
              <p className="mb-6 text-base leading-8 text-[#555a7a]">
                The event can be run as a social padel night, a friendly mini-tournament, or
                a sponsored community challenge depending on what SAFE STREETS IRELAND and
                the venue decide.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={<Trophy className="h-6 w-6" />}
                  title="Friendly competition"
                  text="Run relaxed matches, team rotations or a small tournament format to keep the evening active and easy to join."
                />

                <FeatureCard
                  icon={<Users className="h-6 w-6" />}
                  title="Community connection"
                  text="Bring supporters, families, local businesses and community leaders together around a positive message."
                />

                <FeatureCard
                  icon={<HandHeart className="h-6 w-6" />}
                  title="Sponsor opportunities"
                  text="Sponsors can support the event with prizes, refreshments, court costs, giveaways or direct contributions."
                />

                <FeatureCard
                  icon={<CreditCard className="h-6 w-6" />}
                  title="Simple payment tracking"
                  text="FundRaisely can track online ticket sales and help reconcile card, Revolut, cash or door payments after the event."
                />
              </div>
            </SectionCard>

            <SectionCard eyebrow="Payments" title="Flexible ticket and door payment options">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoPanel
                  icon={<CreditCard className="h-6 w-6" />}
                  title="Pay online"
                  text="Supporters can buy tickets in advance through the embedded ticket panel once the event room is linked."
                />

                <InfoPanel
                  icon={<Ticket className="h-6 w-6" />}
                  title="Pay at the event"
                  text="If enabled by the organiser, attendees can also pay at the door by cash, card tap, Revolut, Monzo or another agreed local payment method."
                />
              </div>
            </SectionCard>

            <div className="rounded-[2rem] border border-[#ece7dc] bg-gradient-to-br from-[#23254a] to-[#158467] p-6 text-white shadow-[0_18px_45px_rgba(24,28,67,0.18)] sm:p-8">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d6fff1]">
                  Host with FundRaisely
                </p>

                <h2 className="mt-2 text-3xl font-black leading-tight">
                  Ticketed events are part of the FundRaisely event system.
                </h2>

                <p className="mt-4 text-base leading-8 text-white/80">
                  FundRaisely helps clubs, charities and community groups run fundraising
                  events, sell tickets, track payments, manage sponsor details and produce
                  clearer post-event records.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-[#23254a] transition hover:bg-[#f6f7fb]"
                  >
                    FundRaisely Home
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    to="/event-formats"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                  >
                    Explore event formats
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT TICKET COLUMN */}
          <aside className="w-full lg:sticky lg:top-6 lg:self-start">
            <div className="mb-4 rounded-[1.75rem] border border-[#cfe7dc] bg-[#ecfff7] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#126b53]">
                Reserve your place
              </p>

              <h3 className="mt-2 text-2xl font-black text-[#23254a]">
                {shouldShowHoldTight
                  ? 'Tickets opening soon'
                  : shouldShowEnded
                    ? 'Event unavailable'
                    : 'Get your event ticket'}
              </h3>

              <p className="mt-2 text-sm leading-7 text-[#555a7a]">
                {shouldShowHoldTight
                  ? 'Ticket sales are not open right now. Once the organiser opens the room, this panel will show the live ticket flow.'
                  : shouldShowEnded
                    ? 'This event has ended or is no longer available.'
                    : 'Buy your ticket for the SAFE STREETS IRELAND padel fundraiser. Final event details can be updated once confirmed.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <SmallPill>Ticketed event</SmallPill>
                <SmallPill>Padel night</SmallPill>
                <SmallPill>In-person</SmallPill>
              </div>
            </div>

            {!hasLinkedRoom ? (
              <TicketComingSoonCard ticketPageUrl={ticketPageUrl} />
            ) : roomStatusLoading ? (
              <TicketPanelLoadingCard />
            ) : roomStatusError ? (
              <TicketPanelErrorCard error={roomStatusError} />
            ) : shouldShowEnded ? (
              <EventEndedCard status={roomStatus} />
            ) : shouldShowTicketFlow ? (
              <TicketPurchaseFlow roomId={ROOM_ID} mode="embedded" />
            ) : (
              <HoldTightTicketCard
                reason={roomInfo?.capacity?.ticketSalesCloseReason || roomInfo?.capacity?.message}
              />
            )}

            <ShareEventCard ticketPageUrl={ticketPageUrl} />

            <div className="mt-4 rounded-[1.75rem] border border-[#ece7dc] bg-white p-5">
              <p className="text-sm leading-7 text-[#555a7a]">
                Door payments may also be accepted if enabled by the organiser. Options can
                include{' '}
                <span className="font-semibold text-[#23254a]">
                  cash, card tap, Revolut, Monzo or another agreed payment method
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
    <div className="rounded-2xl border border-[#ece7dc] bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ecfff7] text-[#158467]">
        {icon}
      </div>

      <div className="text-xs font-bold uppercase tracking-wider text-[#7b7f9f]">
        {label}
      </div>

      <div className="mt-1 text-sm font-bold text-[#23254a]">{value}</div>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#e9e2d4] bg-white px-4 py-2 text-sm font-semibold text-[#3f4366] shadow-sm">
      {children}
    </span>
  );
}

function SmallPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-[#23254a] ring-1 ring-[#ece7dc]">
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
    <section className="rounded-[2rem] border border-[#ece7dc] bg-white p-6 shadow-sm sm:p-8">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7b7f9f]">
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-black leading-tight text-[#23254a]">
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
    <div className="rounded-2xl border border-[#ece7dc] bg-[#fffdfa] p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecfff7] text-[#158467]">
        {icon}
      </div>

      <h3 className="text-lg font-black text-[#23254a]">{title}</h3>

      <p className="mt-2 text-sm leading-7 text-[#555a7a]">{text}</p>
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
    <div className="rounded-2xl border border-[#ece7dc] bg-[#fcfcfe] p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef1ff] text-[#23254a]">
        {icon}
      </div>

      <h3 className="text-lg font-black text-[#23254a]">{title}</h3>

      <p className="mt-2 text-sm leading-7 text-[#555a7a]">{text}</p>
    </div>
  );
}

function SponsorLogoCard({
  imgSrc,
  name,
  href,
  size = 'normal',
}: {
  imgSrc: string;
  name: string;
  href?: string;
  size?: 'normal' | 'large';
}) {
  const isLarge = size === 'large';

  const content = (
    <div
      className={`flex items-center justify-center rounded-2xl border border-[#ece7dc] bg-[#fafafc] p-4 transition ${
        href ? 'hover:-translate-y-0.5 hover:border-[#d9def5] hover:bg-white hover:shadow-sm' : ''
      } ${isLarge ? 'min-h-[112px]' : 'min-h-[82px]'}`}
    >
      <img
        src={imgSrc}
        alt={name}
        className={`w-auto object-contain ${
          isLarge ? 'max-h-16 max-w-[190px]' : 'max-h-12 max-w-[150px]'
        }`}
      />
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

function PlaceholderPartnerCard({ name }: { name: string }) {
  return (
    <div className="flex min-h-[112px] items-center justify-center rounded-2xl border border-[#ece7dc] bg-[#fafafc] p-4 text-center">
      <div>
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ecfff7] text-[#158467]">
          <Shield className="h-6 w-6" />
        </div>

        <p className="text-sm font-black uppercase tracking-[0.12em] text-[#23254a]">
          {name}
        </p>
      </div>
    </div>
  );
}

function TicketComingSoonCard({ ticketPageUrl }: { ticketPageUrl: string }) {
  return (
    <div className="rounded-[1.75rem] border border-[#ece7dc] bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b7f9f]">
        Ticket panel
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#23254a]">
        Ticket flow coming soon
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#555a7a]">
        Once the SAFE STREETS IRELAND room is created and linked, this panel will become
        the live ticket purchase flow.
      </p>

      {ticketPageUrl && (
        <p className="mt-4 break-all rounded-2xl border border-[#ece7dc] bg-[#fafafc] p-3 text-xs leading-6 text-[#7b7f9f]">
          Preview URL: {ticketPageUrl}
        </p>
      )}
    </div>
  );
}

function TicketPanelLoadingCard() {
  return (
    <div className="rounded-[1.75rem] border border-[#ece7dc] bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b7f9f]">
        Checking event status
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#23254a]">
        Loading ticket panel
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#555a7a]">
        We are checking whether tickets are currently open for this event.
      </p>
    </div>
  );
}

function TicketPanelErrorCard({ error }: { error: string }) {
  return (
    <div className="rounded-[1.75rem] border border-red-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">
        Event status unavailable
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#23254a]">
        We could not check the ticket status
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#555a7a]">{error}</p>

      <p className="mt-3 text-sm leading-7 text-[#555a7a]">
        Please refresh the page or contact the organiser.
      </p>
    </div>
  );
}

function HoldTightTicketCard({ reason }: { reason?: string | null }) {
  return (
    <div className="rounded-[1.75rem] border border-[#ece7dc] bg-white p-6 shadow-sm">
      <div className="rounded-2xl bg-[#23254a] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#cfd5ff]">
          Tickets not open
        </p>

        <h3 className="mt-2 text-3xl font-black leading-tight">
          Hold tight
        </h3>

        <p className="mt-3 text-sm leading-7 text-white/80">
          Ticket sales are not open right now. Once the organiser opens the room, this
          panel will automatically show the ticket purchase flow.
        </p>
      </div>

      {reason && (
        <div className="mt-5 rounded-2xl border border-[#f3dbc8] bg-[#fff7ef] p-4">
          <p className="text-xs leading-6 text-[#7b7f9f]">Status: {reason}</p>
        </div>
      )}
    </div>
  );
}

function EventEndedCard({ status }: { status: string }) {
  const label = status === 'cancelled' ? 'cancelled' : 'ended';

  return (
    <div className="rounded-[1.75rem] border border-[#ece7dc] bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b7f9f]">
        Event unavailable
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#23254a]">
        This event has {label}
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#555a7a]">
        Tickets are no longer available for this event.
      </p>
    </div>
  );
}

function ShareEventCard({ ticketPageUrl }: { ticketPageUrl: string }) {
  const [copied, setCopied] = React.useState(false);

  const copyEventLink = async () => {
    if (!ticketPageUrl) return;

    try {
      await navigator.clipboard.writeText(ticketPageUrl);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mt-4 rounded-[1.75rem] border border-[#ece7dc] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b7f9f]">
        Share event
      </p>

      <h3 className="mt-2 text-lg font-black text-[#23254a]">
        Send this page to supporters
      </h3>

      <p className="mt-2 text-sm leading-7 text-[#555a7a]">
        Use this landing page link for sponsors, partners and early supporters while the
        final event details are being confirmed.
      </p>

      <button
        type="button"
        onClick={copyEventLink}
        disabled={!ticketPageUrl}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#ece7dc] bg-white px-5 py-3 text-sm font-bold text-[#23254a] transition hover:bg-[#f8f6f2] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {copied ? 'Copied' : 'Copy event link'}
        <Copy className="h-4 w-4" />
      </button>

      {ticketPageUrl && (
        <p className="mt-3 break-all text-center text-xs leading-6 text-[#7b7f9f]">
          {ticketPageUrl}
        </p>
      )}
    </div>
  );
}