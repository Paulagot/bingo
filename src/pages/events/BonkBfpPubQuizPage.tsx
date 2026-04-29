// src/pages/events/BonkBfpPubQuizPage.tsx
import React from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  HeartHandshake,
  PawPrint,
  Smartphone,
  CreditCard,
  Ticket,
  Sparkles,
  Snowflake,
  Lightbulb,
  RotateCcw,
  ExternalLink,
  ArrowRight,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import TicketPurchaseFlow from '../../components/Quiz/tickets/TicketPurchaseFlow';
import QRCodeShare from '../../components/Quiz/dashboard/QRCodeShare';

const ROOM_ID = 'gL2kJX3asO';

const BANNER_SRC = '/bonk-bfp-pub-quiz-banner.png';
const FUNDRAISELY_LOGO = '/Fundraiselynobackground.png';
const SUPERTEAM_LOGO = '/partners/superteam_ireland_logo.jpg';
const BUDDIES_FOR_PAWS_LOGO = '/partner/BFP-master-orange.png';

const LUMA_URL = 'https://luma.com/l7g1y7uc?tk=hXYbgf';
const BUDDIES_FOR_PAWS_URL = 'https://www.buddiesforpaws.org/';
const SUPERTEAM_URL = 'https://x.com/superteamIE';

type PublicRoomInfo = {
  roomId: string;
  status: 'scheduled' | 'open' | 'live' | 'completed' | 'cancelled' | string;
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

export default function BonkBfpPubQuizPage() {
  const {
    roomInfo,
    loading: roomStatusLoading,
    error: roomStatusError,
  } = usePublicRoomInfo(ROOM_ID);

  const ticketSalesOpen = roomInfo?.capacity?.ticketSalesOpen ?? true;
  const roomStatus = roomInfo?.status ?? 'scheduled';

  const joinQuizUrl = ROOM_ID
    ? `${window.location.origin}/quiz/join/${ROOM_ID}`
    : '';

  const shouldShowJoinQuiz =
    Boolean(ROOM_ID) && (roomStatus === 'open' || roomStatus === 'live');

  const shouldShowTicketFlow =
    Boolean(ROOM_ID) && ticketSalesOpen && !shouldShowJoinQuiz;

  const shouldShowHoldTight =
    Boolean(ROOM_ID) &&
    !ticketSalesOpen &&
    !shouldShowJoinQuiz &&
    (roomStatus === 'scheduled' || roomStatus === 'draft');

  const shouldShowEnded =
    Boolean(ROOM_ID) &&
    (roomStatus === 'completed' || roomStatus === 'cancelled');

  return (
    <div className="min-h-screen bg-[#f8f6f2] text-[#1f2240]">
      {/* HERO */}
      <section className="border-b border-[#ece7dc] bg-gradient-to-br from-[#fff9ef] via-white to-[#f5f2ff]">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="grid gap-10 lg:grid-cols-[0.98fr_1.02fr] lg:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f0d9b3] bg-[#fff3dc] px-4 py-2 text-sm font-bold text-[#b86118]">
                <PawPrint className="h-4 w-4" />
                BuildStation Charity Pub Quiz • Buddies for Paws
              </div>

              <div>
                <h1 className="max-w-4xl text-4xl font-black leading-tight tracking-tight text-[#23254a] sm:text-5xl lg:text-6xl">
                  Don’t just donate.
                  <span className="block text-[#f05b39]">Participate.</span>
                  <span className="block">Play for paws.</span>
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-[#4b4f73]">
                  Join us at{' '}
                  <span className="font-bold text-[#23254a]">
                    The Green Room Bar, Dublin
                  </span>{' '}
                  on <span className="font-bold text-[#23254a]">1st May at 7:00pm</span>{' '}
                  for a BuildStation charity pub quiz where your donation becomes your
                  ticket to play. Every euro raised will be{' '}
                  <span className="font-bold text-[#f05b39]">matched 100% by BONK</span>,
                  with funds going to Buddies for Paws for distribution between animal
                  welfare and wildlife conservation causes.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <FactCard
                  icon={<CalendarDays className="h-5 w-5" />}
                  label="Date"
                  value="1st May"
                />

                <FactCard
                  icon={<Clock className="h-5 w-5" />}
                  label="Time"
                  value="7:00pm"
                />

                <FactCard
                  icon={<MapPin className="h-5 w-5" />}
                  label="Location"
                  value="The Green Room Bar, Dublin"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Badge>Pay now with crypto, card or Revolut</Badge>
                <Badge>On the night: crypto, card, Revolut or cash</Badge>
                <Badge>Digital quiz • phone required</Badge>
              </div>
            </div>

            <div className="space-y-4">
              <a
                href={LUMA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-[2rem] border border-[#ece7dc] bg-white shadow-[0_20px_60px_rgba(24,28,67,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_70px_rgba(24,28,67,0.16)]"
                aria-label="Open the BuildStation charity pub quiz event on Luma"
              >
                <img
                  src={BANNER_SRC}
                  alt="Charity Pub Quiz banner"
                  className="h-auto w-full object-cover"
                />
              </a>

              {/* FEATURED SPONSORS */}
              <div className="rounded-[2rem] border border-[#ece7dc] bg-white p-5 shadow-[0_18px_45px_rgba(24,28,67,0.10)]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-[#f05b39]" />
                      <p className="text-xs font-black uppercase tracking-[0.22em] text-[#7b7f9f]">
                        Event partners
                      </p>
                    </div>

                    <h2 className="mt-2 text-xl font-black text-[#23254a]">
                      Powered by the community
                    </h2>
                  </div>

                  <span className="hidden rounded-full bg-[#fff1e8] px-3 py-1 text-xs font-black text-[#b86118] sm:inline-flex">
                    BuildStation fundraiser
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <SponsorLogoCard
                    imgSrc={FUNDRAISELY_LOGO}
                    name="FundRaisely"
                    href="/"
                    size="large"
                  />

                  <SponsorLogoCard
                    imgSrc={SUPERTEAM_LOGO}
                    name="Superteam Ireland"
                    href={SUPERTEAM_URL}
                    size="large"
                  />

                  <SponsorLogoCard
                    imgSrc={BUDDIES_FOR_PAWS_LOGO}
                    name="Buddies for Paws"
                    href={BUDDIES_FOR_PAWS_URL}
                    size="large"
                  />
                </div>

                <div className="mt-4 rounded-2xl border border-[#d9def5] bg-[#f5f7ff] p-4">
                  <p className="text-sm leading-7 text-[#555a7a]">
                    This fundraiser is running as part of{' '}
                    <span className="font-bold text-[#23254a]">BuildStation</span> and is
                    supported by <span className="font-bold text-[#23254a]">FundRaisely</span>,{' '}
                    <span className="font-bold text-[#23254a]">Superteam Ireland</span> and{' '}
                    <span className="font-bold text-[#23254a]">Buddies for Paws</span>.
                  </p>
                </div>
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
              title="A fun night out with real fundraising impact"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <FeatureCard
                  icon={<HeartHandshake className="h-6 w-6" />}
                  title="100% BONK match"
                  text="All funds raised through the quiz will be matched 100% by BONK, increasing the total impact of the night."
                />

                <FeatureCard
                  icon={<PawPrint className="h-6 w-6" />}
                  title="Supporting Buddies for Paws"
                  text="All proceeds go to Buddies for Paws for distribution between a number of animal welfare and wildlife conservation causes."
                  ctaLabel="Visit Buddies for Paws"
                  ctaHref={BUDDIES_FOR_PAWS_URL}
                />
              </div>

              <div className="mt-4 rounded-2xl border border-[#d9def5] bg-[#f5f7ff] p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#23254a] text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#23254a]">
                      Part of BuildStation
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-[#555a7a]">
                      This fundraiser is running alongside BuildStation, bringing builders,
                      creators and communities together for a night that turns participation
                      into real-world impact.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-base leading-8 text-[#555a7a]">
                This is fundraising you can actually take part in. Instead of simply donating
                and leaving, your contribution gets you into the quiz, puts you in the game,
                and helps raise more for animal welfare and wildlife conservation.
              </p>
            </SectionCard>

            <SectionCard
              eyebrow="How to join"
              title="Bring your phone and play live on the night"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <InfoPanel
                  icon={<Ticket className="h-6 w-6" />}
                  title="Join us at The Green Room"
                  text="Come along for the full quiz-night atmosphere, live host energy, friendly competition, and a great night out for a brilliant cause."
                />

                <InfoPanel
                  icon={<Smartphone className="h-6 w-6" />}
                  title="Phone required"
                  text="This is a digital quiz, so every player needs a phone to answer questions, join the game, and use any in-game items during the night."
                />
              </div>

              <div className="mt-6 rounded-2xl border border-[#f3dbc8] bg-[#fff7ef] p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-[#f05b39] text-white">
                    <HeartHandshake className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-[#23254a]">
                      Your donation is your ticket to play
                    </h3>

                    <p className="mt-2 text-sm leading-7 text-[#555a7a]">
                      Donate now to secure your place. The more we raise together, the more impact
                      we create, especially with the 100% BONK match added on top.
                    </p>
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Gameplay"
              title="Fun in-game items to spice up the quiz"
            >
              <p className="mb-6 text-base leading-8 text-[#555a7a]">
                Expect a few playful power-ups on the night. These add strategy, chaos,
                and a bit of friendly sabotage to the quiz experience.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <PowerupCard
                  icon={<Snowflake className="h-5 w-5" />}
                  title="Freeze"
                  text="Temporarily stop another player from answering, giving yourself a tactical edge."
                />

                <PowerupCard
                  icon={<Lightbulb className="h-5 w-5" />}
                  title="Clue"
                  text="Unlock a helpful hint when you’re stuck and need a little nudge in the right direction."
                />

                <PowerupCard
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Robin Hood"
                  text="A cheeky bonus item that can swing points and add a bit of mischief to the leaderboard."
                />

                <PowerupCard
                  icon={<RotateCcw className="h-5 w-5" />}
                  title="Restore Points"
                  text="Recover points you’ve lost and stay in the running when the pressure kicks in."
                />
              </div>
            </SectionCard>

            <SectionCard eyebrow="Payments" title="Simple payment options">
              <div className="grid gap-4 md:grid-cols-2">
                <InfoPanel
                  icon={<CreditCard className="h-6 w-6" />}
                  title="Pay now"
                  text="Secure your ticket today using crypto, card or Revolut directly through the donation panel."
                />

                <InfoPanel
                  icon={<Ticket className="h-6 w-6" />}
                  title="Pay on the night"
                  text="Walk-ins can also be accommodated on the night, with crypto, card, Revolut or cash accepted, subject to availability."
                />
              </div>
            </SectionCard>

            <div className="rounded-[2rem] border border-[#ece7dc] bg-gradient-to-br from-[#23254a] to-[#353987] p-6 text-white shadow-[0_18px_45px_rgba(24,28,67,0.18)] sm:p-8">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#cfd5ff]">
                  Host with FundRaisely
                </p>

                <h2 className="mt-2 text-3xl font-black leading-tight">
                  Would you like to host your own quiz?
                </h2>

                <p className="mt-4 text-base leading-8 text-white/80">
                  FundRaisely helps communities, clubs and creators run fundraising quizzes
                  and digital events with better payment flows, live gameplay and real
                  fundraising impact.
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
                    to="/web3"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                  >
                    Explore Web3
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT TICKET COLUMN */}
          <aside className="w-full lg:sticky lg:top-6 lg:self-start">
            <div className="mb-4 rounded-[1.75rem] border border-[#f3dbc8] bg-[#fff7ef] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b86118]">
                Secure your place
              </p>

              <h3 className="mt-2 text-2xl font-black text-[#23254a]">
                {shouldShowJoinQuiz
                  ? 'Join the quiz now'
                  : shouldShowHoldTight
                    ? 'Almost quiz time'
                    : 'Donate and get your ticket'}
              </h3>

              <p className="mt-2 text-sm leading-7 text-[#555a7a]">
                {shouldShowJoinQuiz
                  ? 'The quiz room is open. Scan the QR code or tap the link below to join.'
                  : shouldShowHoldTight
                    ? 'Advance ticket donations are closed while we prepare the room. Hold tight, we will accept your donation soon.'
                    : 'Your donation is your ticket. Join the quiz, play along, and help turn every answer into impact.'}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {shouldShowJoinQuiz ? (
                  <>
                    <SmallPill>Scan QR</SmallPill>
                    <SmallPill>Join link</SmallPill>
                    <SmallPill>Pay on the night</SmallPill>
                  </>
                ) : shouldShowHoldTight ? (
                  <>
                    <SmallPill>Room opening soon</SmallPill>
                    <SmallPill>Donation accepted shortly</SmallPill>
                  </>
                ) : (
                  <>
                    <SmallPill>Crypto</SmallPill>
                    <SmallPill>Card</SmallPill>
                    <SmallPill>Revolut</SmallPill>
                  </>
                )}
              </div>
            </div>

            {!ROOM_ID ? (
              <TicketComingSoonCard />
            ) : roomStatusLoading ? (
              <TicketPanelLoadingCard />
            ) : roomStatusError ? (
              <TicketPanelErrorCard error={roomStatusError} />
            ) : shouldShowEnded ? (
              <QuizEndedCard status={roomStatus} />
            ) : shouldShowJoinQuiz ? (
              <JoinQuizCard roomId={ROOM_ID} joinQuizUrl={joinQuizUrl} />
            ) : shouldShowTicketFlow ? (
              <TicketPurchaseFlow roomId={ROOM_ID} mode="embedded" />
            ) : shouldShowHoldTight ? (
              <HoldTightDonationCard
                reason={roomInfo?.capacity?.ticketSalesCloseReason || roomInfo?.capacity?.message}
              />
            ) : (
              <HoldTightDonationCard
                reason={roomInfo?.capacity?.ticketSalesCloseReason || roomInfo?.capacity?.message}
              />
            )}

            <div className="mt-4 rounded-[1.75rem] border border-[#ece7dc] bg-white p-5">
              <p className="text-sm leading-7 text-[#555a7a]">
                Prefer to decide later? We can also accept{' '}
                <span className="font-semibold text-[#23254a]">
                  crypto, card, Revolut or cash on the night
                </span>
                , subject to availability.
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
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff1e8] text-[#f05b39]">
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
  ctaLabel,
  ctaHref,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="rounded-2xl border border-[#ece7dc] bg-[#fffdfa] p-5">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff1e8] text-[#f05b39]">
        {icon}
      </div>

      <h3 className="text-lg font-black text-[#23254a]">{title}</h3>

      <p className="mt-2 text-sm leading-7 text-[#555a7a]">{text}</p>

      {ctaLabel && ctaHref && (
        <a
          href={ctaHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#23254a] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#353987]"
        >
          {ctaLabel}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
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

function PowerupCard({
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
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[#23254a] text-[#ffe680]">
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

function TicketComingSoonCard() {
  return (
    <div className="rounded-[1.75rem] border border-[#ece7dc] bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b7f9f]">
        Ticket panel
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#23254a]">
        Ticket flow coming soon
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#555a7a]">
        Once the event room is linked, this panel will become the live ticket and
        donation flow.
      </p>
    </div>
  );
}

function TicketPanelLoadingCard() {
  return (
    <div className="rounded-[1.75rem] border border-[#ece7dc] bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b7f9f]">
        Checking room status
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#23254a]">
        Loading ticket panel
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#555a7a]">
        We are checking whether ticket donations are still open or if the quiz room is ready to join.
      </p>
    </div>
  );
}

function TicketPanelErrorCard({ error }: { error: string }) {
  return (
    <div className="rounded-[1.75rem] border border-red-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">
        Room status unavailable
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#23254a]">
        We could not check the quiz status
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#555a7a]">{error}</p>

      <p className="mt-3 text-sm leading-7 text-[#555a7a]">
        Please refresh the page or speak to the host on the night.
      </p>
    </div>
  );
}

function HoldTightDonationCard({ reason }: { reason?: string | null }) {
  return (
    <div className="rounded-[1.75rem] border border-[#ece7dc] bg-white p-6 shadow-sm">
      <div className="rounded-2xl bg-[#23254a] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#cfd5ff]">
          Almost quiz time
        </p>

        <h3 className="mt-2 text-3xl font-black leading-tight">
          Hold tight
        </h3>

        <p className="mt-3 text-sm leading-7 text-white/80">
          Advance ticket donations are closed while we prepare the room. We will accept your donation soon when the quiz room opens.
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-[#f3dbc8] bg-[#fff7ef] p-4">
        <p className="text-sm leading-7 text-[#555a7a]">
          Once the host opens the quiz room, this panel will automatically change to show the QR code and join link.
        </p>

        {reason && (
          <p className="mt-3 text-xs leading-6 text-[#7b7f9f]">
            Status: {reason}
          </p>
        )}
      </div>
    </div>
  );
}

function JoinQuizCard({
  roomId,
  joinQuizUrl,
}: {
  roomId: string;
  joinQuizUrl: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const copyJoinLink = async () => {
    try {
      await navigator.clipboard.writeText(joinQuizUrl);
      setCopied(true);

      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="rounded-[1.75rem] border border-[#ece7dc] bg-white p-6 shadow-sm">
      <div className="rounded-2xl bg-[#23254a] p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#cfd5ff]">
          Quiz room is open
        </p>

        <h3 className="mt-2 text-3xl font-black leading-tight">
          Join the quiz now
        </h3>

        <p className="mt-3 text-sm leading-7 text-white/80">
          Scan the QR code or tap the button below to join. If you have not donated yet,
          payment can be handled on the night.
        </p>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl">
        <QRCodeShare
          roomId={roomId}
          hostName="Buddies for Paws"
          gameType="Charity Pub Quiz"
        />
      </div>

      <div className="mt-5 space-y-3">
        <a
          href={joinQuizUrl}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#f05b39] px-5 py-4 text-base font-black text-white transition hover:bg-[#d94d2f]"
        >
          Open join link
          <ArrowRight className="h-5 w-5" />
        </a>

        <button
          type="button"
          onClick={copyJoinLink}
          className="inline-flex w-full items-center justify-center rounded-2xl border border-[#ece7dc] bg-white px-5 py-3 text-sm font-bold text-[#23254a] transition hover:bg-[#f8f6f2]"
        >
          {copied ? 'Copied' : 'Copy join link'}
        </button>

        <p className="break-all text-center text-xs leading-6 text-[#7b7f9f]">
          {joinQuizUrl}
        </p>
      </div>
    </div>
  );
}

function QuizEndedCard({ status }: { status: string }) {
  const label = status === 'cancelled' ? 'cancelled' : 'ended';

  return (
    <div className="rounded-[1.75rem] border border-[#ece7dc] bg-white p-6 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#7b7f9f]">
        Quiz unavailable
      </p>

      <h3 className="mt-2 text-2xl font-black text-[#23254a]">
        This quiz has {label}
      </h3>

      <p className="mt-3 text-sm leading-7 text-[#555a7a]">
        The join link is no longer available for this room.
      </p>
    </div>
  );
}