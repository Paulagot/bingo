// src/pages/site/pages/DemoPage.tsx

import type { ReactNode } from 'react';

import {
  ArrowRight,
  Check,
  ExternalLink,
  Heart,
  Puzzle,
  QrCode as QrCodeIcon,
  Ticket,
  Trophy,
  Users,
} from 'lucide-react';

import { QRCodeCanvas } from 'qrcode.react';

import { SEO } from '../components/seo/SEO';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { breadcrumbsForPath } from '../components/seo/breadcrumbUtils';
import {
  compactStructuredData,
  webPageJsonLd,
} from '../components/seo/structuredData';

// ─────────────────────────────────────────────────────────────
// PAGE / SEO CONFIG
// ─────────────────────────────────────────────────────────────

const DEMO_PATH = '/demo';

const DEMO_PAGE_TITLE =
  'Interactive Fundraising Demo';

const DEMO_PAGE_DESCRIPTION =
  'Try FundRaisely yourself. Experience real supporter journeys for peer fundraising, ticketed events, Puzzle Drop, Elimination, sponsored fundraising and donations using our interactive test environment.';

const DEMO_OG_TITLE =
  'Try FundRaisely — Interactive Fundraising Demo';

const DEMO_OG_DESCRIPTION =
  'See FundRaisely from the supporter side. Buy a demo ticket, support a participant, play a puzzle, sponsor a challenge or make a donation with no real card payment.';

// ─────────────────────────────────────────────────────────────
// DEMO URLS
//
// Keep staging URLs in one place.
// The marketing /demo page remains on the production domains.
// These staging journeys are destinations from the demo page.
// ─────────────────────────────────────────────────────────────

const STAGING_BASE_URL =
  'https://fundraisely-staging.up.railway.app';

const PEER_FUNDRAISER_URL =
  `${STAGING_BASE_URL}/fundraise/demo-non-profit/take-on-the-fundraisely-challenge/paula`;

const TICKETED_EVENT_URL =
  `${STAGING_BASE_URL}/tickets/buy/8C57E75119A94777`;

// Add these when the direct demo URLs are ready.
const PUZZLE_DROP_URL = '';

const ELIMINATION_URL = '';

const SPONSORED_EVENT_URL = '';

// ─────────────────────────────────────────────────────────────
// STRIPE TEST DETAILS
// ─────────────────────────────────────────────────────────────

const TEST_CARD = '4242 4242 4242 4242';

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function openDemo(url: string) {
  if (!url) return;

  window.open(
    url,
    '_blank',
    'noopener,noreferrer',
  );
}

// ─────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────

export default function DemoPage() {
  const breadcrumbs = breadcrumbsForPath(
    DEMO_PATH,
    'Interactive Demo',
  );

  return (
    <>
      <SEO
        title={DEMO_PAGE_TITLE}
        description={DEMO_PAGE_DESCRIPTION}
        canonicalPath={DEMO_PATH}
        ogTitle={DEMO_OG_TITLE}
        ogDescription={DEMO_OG_DESCRIPTION}
        type="website"
        breadcrumbs={breadcrumbs}
        structuredData={compactStructuredData([
          webPageJsonLd(
            DEMO_PATH,
            'Try FundRaisely — Interactive Fundraising Demo',
            DEMO_PAGE_DESCRIPTION,
          ),
        ])}
      />

      <Breadcrumbs items={breadcrumbs} />

      <main className="bg-[#f8f3ea]">

        {/* ─────────────────────────────────────────────
            HERO
        ───────────────────────────────────────────── */}

        <section className="border-b border-slate-900/10">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1.1fr_.9fr] lg:px-8 lg:py-24">

            <div className="flex flex-col justify-center">
              <p className="mb-4 text-xs font-black uppercase tracking-[0.18em] text-[#157f85]">
                Interactive product demo
              </p>

              <h1 className="max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-7xl">
                Don&apos;t just read about FundRaisely.
                <br />
                Try it.
              </h1>

              <p className="mt-6 max-w-2xl text-lg font-medium leading-8 text-slate-600">
                Experience the real FundRaisely supporter journey.
                Buy an event ticket, support a participant&apos;s fundraiser,
                play a puzzle, sponsor a challenge or make a donation.
              </p>

              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-500">
                Everything below runs in our isolated demo environment.
                Card payments use Stripe test mode, so no real card
                payment will be taken.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => openDemo(PEER_FUNDRAISER_URL)}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#157f85] px-6 py-4 text-base font-black text-white transition hover:opacity-90"
                >
                  Start the interactive demo
                  <ArrowRight className="h-5 w-5" />
                </button>

                <span className="text-sm font-bold text-slate-500">
                  No signup · No real card payment
                </span>
              </div>
            </div>

            {/* DEMO CARD */}

            <div className="flex items-center">
              <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-9">

                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                  Use this card in the demo
                </p>

                <p className="mt-5 text-sm font-bold text-slate-500">
                  Stripe test card
                </p>

                <code className="mt-2 block text-2xl font-black tracking-[0.08em] text-slate-950 sm:text-3xl">
                  {TEST_CARD}
                </code>

                <div className="mt-6 grid grid-cols-2 gap-3">

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Expiry
                    </p>

                    <p className="mt-1 font-black text-slate-900">
                      Any future date
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      CVC
                    </p>

                    <p className="mt-1 font-black text-slate-900">
                      Any 3 digits
                    </p>
                  </div>

                </div>

                <div className="mt-6 flex gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900">
                  <Check className="mt-0.5 h-5 w-5 shrink-0" />

                  <p>
                    No real card payment will be taken.
                    You&apos;re using FundRaisely&apos;s test environment.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────
            PEER FUNDRAISING
        ───────────────────────────────────────────── */}

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">

            <div className="max-w-3xl">

              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#157f85]">
                Peer fundraising
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                See peer fundraising from the supporter&apos;s side
              </h2>

              <p className="mt-5 text-lg font-medium leading-8 text-slate-600">
                A FundRaisely participant can share their own fundraising
                page with friends, family and their wider community.
                Depending on the fundraiser, supporters can buy activities
                and tickets, make a donation, or sponsor the participant
                directly.
              </p>

            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">

              {/* BUY ACTIVITIES / TICKETS / DONATE */}

              <article className="flex flex-col rounded-[2rem] border border-slate-200 bg-[#f8f3ea] p-7 sm:p-8">

                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#157f85]/10 text-[#157f85]">
                  <Ticket className="h-6 w-6" />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#157f85]">
                  Participant fundraising page
                </p>

                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Buy activities, tickets or donate
                </h3>

                <p className="mt-4 text-base font-medium leading-7 text-slate-600">
                  Open a real participant&apos;s fundraising page and
                  choose how you want to support them. Buy an activity,
                  purchase an event ticket or simply make a donation.
                </p>

                <div className="mt-6 space-y-3">

                  <DemoPoint>
                    Buy a Puzzle Drop and receive access to play it.
                  </DemoPoint>

                  <DemoPoint>
                    Buy an entry into a scheduled Elimination game.
                  </DemoPoint>

                  <DemoPoint>
                    Purchase an event ticket through the participant&apos;s page.
                  </DemoPoint>

                  <DemoPoint>
                    Or make a direct donation without buying anything.
                  </DemoPoint>

                </div>

                <button
                  type="button"
                  onClick={() => openDemo(PEER_FUNDRAISER_URL)}
                  className="mt-8 inline-flex w-fit items-center gap-2 rounded-xl bg-[#157f85] px-6 py-4 font-black text-white transition hover:opacity-90"
                >
                  Try the participant fundraiser
                  <ExternalLink className="h-5 w-5" />
                </button>

              </article>

              {/* SPONSOR A PARTICIPANT */}

              <article className="flex flex-col rounded-[2rem] border border-slate-200 bg-white p-7 sm:p-8">

                <div className="grid h-12 w-12 place-items-center rounded-xl bg-[#157f85]/10 text-[#157f85]">
                  <Heart className="h-6 w-6" />
                </div>

                <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#157f85]">
                  Sponsored challenge
                </p>

                <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                  Sponsor a participant
                </h3>

                <p className="mt-4 text-base font-medium leading-7 text-slate-600">
                  See what it feels like to support someone taking part
                  in a sponsored walk, run, cycle, readathon or another
                  fundraising challenge.
                </p>

                <div className="mt-6 space-y-3">

                  <DemoPoint>
                    Open the participant&apos;s personal fundraising page.
                  </DemoPoint>

                  <DemoPoint>
                    See their story, fundraising target and progress.
                  </DemoPoint>

                  <DemoPoint>
                    Choose how much you would like to sponsor.
                  </DemoPoint>

                  <DemoPoint>
                    Leave your name or message and complete a demo sponsorship.
                  </DemoPoint>

                </div>

                {SPONSORED_EVENT_URL ? (
                  <button
                    type="button"
                    onClick={() => openDemo(SPONSORED_EVENT_URL)}
                    className="mt-8 inline-flex w-fit items-center gap-2 rounded-xl bg-[#157f85] px-6 py-4 font-black text-white transition hover:opacity-90"
                  >
                    Try a sponsorship
                    <ExternalLink className="h-5 w-5" />
                  </button>
                ) : (
                  <div className="mt-8 inline-flex w-fit rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-black text-slate-400">
                    Interactive demo coming shortly
                  </div>
                )}

              </article>

            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            DIRECT TICKET DEMO
        ───────────────────────────────────────────── */}

        <section className="border-y border-slate-900/10 bg-[#f8f3ea]">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">

            <div className="grid gap-10 lg:grid-cols-[1fr_.8fr] lg:items-center">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#157f85]">
                  Ticketed events
                </p>

                <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                  Sell tickets with a link or a QR code
                </h2>

                <p className="mt-5 max-w-2xl text-lg font-medium leading-8 text-slate-600">
                  Once your event is set up, supporters don&apos;t need
                  an account. Share the booking link online, add the QR
                  code to a poster, put it on a table or display it at
                  the venue.
                </p>

                <div className="mt-6 space-y-3">

                  <DemoPoint>
                    Scan the QR code or open the ticket link.
                  </DemoPoint>

                  <DemoPoint>
                    Choose a ticket and complete the test checkout.
                  </DemoPoint>

                  <DemoPoint>
                    Receive the ticket and confirmation.
                  </DemoPoint>

                  <DemoPoint>
                    The organiser can then scan the ticket at check-in.
                  </DemoPoint>

                </div>

                <button
                  type="button"
                  onClick={() => openDemo(TICKETED_EVENT_URL)}
                  className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#157f85] px-6 py-4 font-black text-white transition hover:opacity-90"
                >
                  Buy a demo ticket
                  <Ticket className="h-5 w-5" />
                </button>

              </div>

              {/* QR CODE */}

              <div className="flex justify-center lg:justify-end">

                <div className="w-full max-w-sm rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">

                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#157f85]/10 text-[#157f85]">
                    <QrCodeIcon className="h-6 w-6" />
                  </div>

                  <h3 className="mt-5 text-xl font-black text-slate-950">
                    Scan to buy a demo ticket
                  </h3>

                  <p className="mt-2 text-sm font-medium leading-6 text-slate-500">
                    Try exactly what a supporter would see from
                    a poster or event QR code.
                  </p>

                  <div className="mx-auto mt-6 flex w-fit rounded-2xl border border-slate-200 bg-white p-3">
                    <QRCodeCanvas
                      value={TICKETED_EVENT_URL}
                      size={190}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="H"
                      includeMargin
                    />
                  </div>

                  <p className="mt-5 text-xs font-bold uppercase tracking-wide text-slate-400">
                    No real card payment
                  </p>

                </div>

              </div>

            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────
            DIRECT EXPERIENCES
        ───────────────────────────────────────────── */}

        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">

            <div className="max-w-3xl">

              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#157f85]">
                Try individual features
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] text-slate-950 sm:text-5xl">
                Or jump straight into one experience
              </h2>

              <p className="mt-5 text-lg font-medium leading-8 text-slate-600">
                Each demo below opens the real supporter experience
                running on the FundRaisely staging platform.
              </p>

            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">

              <DemoExperienceCard
                icon={Ticket}
                title="Buy an event ticket"
                text="Choose and purchase a ticket using the Stripe test card."
                url={TICKETED_EVENT_URL}
                ready
              />

              <DemoExperienceCard
                icon={Puzzle}
                title="Play a Puzzle Drop"
                text="Buy a puzzle, receive your access and play the actual challenge."
                url={PUZZLE_DROP_URL}
                ready={Boolean(PUZZLE_DROP_URL)}
              />

              <DemoExperienceCard
                icon={Heart}
                title="Sponsor a participant"
                text="Choose an amount, leave a message and experience the sponsorship journey from the supporter's side."
                url={SPONSORED_EVENT_URL}
                ready={Boolean(SPONSORED_EVENT_URL)}
              />

              <DemoExperienceCard
                icon={Trophy}
                title="Join Elimination"
                text="Purchase an entry and experience FundRaisely's live Elimination game."
                url={ELIMINATION_URL}
                ready={Boolean(ELIMINATION_URL)}
              />

              <DemoExperienceCard
                icon={Users}
                title="Support a participant"
                text="Open a participant fundraising page and buy an activity, purchase a ticket or make a donation."
                url={PEER_FUNDRAISER_URL}
                ready
              />

            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────
            HOW IT WORKS
        ───────────────────────────────────────────── */}

        <section className="border-y border-slate-900/10 bg-[#f8f3ea]">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">

            <div className="max-w-3xl">

              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#157f85]">
                Built for real-world fundraising
              </p>

              <h2 className="mt-4 text-4xl font-black tracking-[-0.035em] text-slate-950">
                Set it up once. Then share it.
              </h2>

              <p className="mt-5 text-lg font-medium leading-8 text-slate-600">
                Supporters don&apos;t need to learn FundRaisely.
                Send them a link, share a participant page or put
                a QR code in front of them and they can get started.
              </p>

            </div>

            <div className="mt-10 grid gap-8 md:grid-cols-3">

              <ProcessItem
                number="01"
                title="Create it"
                text="Set up the event, activity or fundraiser and choose how supporters can pay."
              />

              <ProcessItem
                number="02"
                title="Share it"
                text="Send the link, share participant pages or put the QR code on posters, tables and social posts."
              />

              <ProcessItem
                number="03"
                title="Fundraise"
                text="Supporters buy, donate, play or sponsor while FundRaisely keeps the activity and payment records connected."
              />

            </div>

          </div>
        </section>

        {/* ─────────────────────────────────────────────
            FINAL CTA
        ───────────────────────────────────────────── */}

        <section className="bg-slate-950 text-white">

          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-6 py-14 lg:flex-row lg:items-center lg:px-8">

            <div>

              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/50">
                Try it yourself
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                See FundRaisely from your supporter&apos;s side.
              </h2>

              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-white/60">
                Explore real supporter journeys in our test environment.
                No signup and no real card payment required.
              </p>

            </div>

            <button
              type="button"
              onClick={() => openDemo(PEER_FUNDRAISER_URL)}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-4 font-black text-slate-950 transition hover:bg-slate-100"
            >
              Launch demo
              <ExternalLink className="h-5 w-5" />
            </button>

          </div>

        </section>

      </main>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
// SMALL PAGE COMPONENTS
// ─────────────────────────────────────────────────────────────

function DemoPoint({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">

      <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#157f85] text-white">
        <Check className="h-3.5 w-3.5" />
      </div>

      <p className="font-semibold leading-6 text-slate-700">
        {children}
      </p>

    </div>
  );
}

function ProcessItem({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div>

      <span className="text-5xl font-black text-[#157f85]">
        {number}
      </span>

      <h3 className="mt-4 text-xl font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-2 leading-7 text-slate-600">
        {text}
      </p>

    </div>
  );
}

function DemoExperienceCard({
  icon: Icon,
  title,
  text,
  url,
  ready,
}: {
  icon: typeof Puzzle;
  title: string;
  text: string;
  url: string;
  ready: boolean;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6">

      <div className="grid h-11 w-11 place-items-center rounded-xl bg-[#157f85]/10 text-[#157f85]">
        <Icon className="h-5 w-5" />
      </div>

      <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">
        {title}
      </h3>

      <p className="mt-3 flex-1 text-sm font-medium leading-6 text-slate-600">
        {text}
      </p>

      {ready ? (
        <button
          type="button"
          onClick={() => openDemo(url)}
          className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-left text-sm font-black text-[#157f85]"
        >
          Try it now
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <div className="mt-6 border-t border-slate-100 pt-4 text-sm font-bold text-slate-400">
          Demo coming shortly
        </div>
      )}

    </article>
  );
}