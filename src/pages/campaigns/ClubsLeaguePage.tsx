import React from 'react';
import { SEO } from '../../components/SEO';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  CheckCircle,
  ArrowRight,
  Trophy,
  Users,
  Calendar,
  Target,
  Heart,
  Building2,
  Star,
  TrendingUp,
} from 'lucide-react';

import { ClubLeaguePledgeForm } from './ClubLeaguePledgeForm';
import { IllustrativeOutcomesPanel } from './IllustrativeOutcomesPanel';

/** Absolute URL helpers (keep consistent with your existing pages) */
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.co.uk';
}
function abs(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-600 mt-0.5" />
    <span className="text-indigo-900/80 leading-relaxed">{children}</span>
  </li>
);

const ClubsLeaguePage: React.FC = () => {
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Clubs', item: abs('/quiz/use-cases/clubs') },
      { '@type': 'ListItem', position: 3, name: 'Junior Sports Clubs Quiz League', item: abs('/campaigns/clubs-league') },
    ],
  };

  const eventJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: 'FundRaisely Junior Sports Clubs Quiz League 2026',
    description:
      'A family quiz league for sports clubs with junior players (U14s). Each club hosts one quiz night to raise funds and compete for prizes and a sponsored club grant.',
    startDate: '2026-03-01',
    endDate: '2026-03-31',
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
    organizer: { '@type': 'Organization', name: 'FundRaisely', url: abs('/') },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <SEO
        title="Junior Sports Clubs Quiz League 2026 — Family Fundraiser for Junior Sports Clubs | FundRaisely"
        description="Join the FundRaisely Junior Sports Clubs Quiz League. Your club runs one family quiz night before the deadline, raises funds for junior teams, and competes for prizes and a sponsored club grant. Limited to 30 clubs."
        keywords="club fundraising, quiz night fundraiser, youth sports fundraising, GAA fundraiser, soccer club fundraiser, school hall quiz night, Ireland fundraising, UK fundraising, junior sports clubs"
        type="event"
        structuredData={[breadcrumbsJsonLd, eventJsonLd]}
        domainStrategy="geographic"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Clubs', item: '/quiz/use-cases/clubs' },
          { name: 'Junior Sports Clubs Quiz League', item: '/campaigns/clubs-league' },
        ]}
      />

      {/* Hero */}
      <section className="relative px-4 pt-12 pb-8">
        <div className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700 text-sm font-medium">
            <Sparkles className="h-4 w-4" /> Limited to 30 clubs
          </span>

          <h1 className="mt-4 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold">
            Junior Sports Clubs Quiz League
          </h1>

          <p className="mt-2 text-2xl md:text-3xl font-semibold text-indigo-900">
            One Family Quiz Night. Big Funds for Junior Teams.
          </p>

       <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl leading-relaxed">
  Host a Fundraising Family Quiz Night on FundRaisely with your junior section, raise funds for your{' '}
  <strong>Club</strong>, and compete in the FundRaisely Junior Club Quiz League FINAL.

</p>

           <div className="mt-7 flex flex-wrap justify-center gap-3">
            <a
              href="#pledge"
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 transition-colors shadow-md"
            >
              Pledge Your Club
            </a>
            <Link
              to="/quiz/use-cases/clubs"
              className="rounded-xl border-2 border-indigo-600 bg-white px-6 py-3 font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-md"
            >
              Clubs Use Case
            </Link>
          </div>

          <p className="mt-4 text-sm text-indigo-900/60">
            Registration required by <strong>date TBC</strong>.
          </p>
        </div>
      </section>

       {/* Sponsor Banner */}
      <section className="px-4 py-8 bg-amber-50 border-y border-amber-200">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Star className="h-6 w-6 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-900 text-lg">Sponsorship Opportunity — Naming Rights Available</p>
                <p className="text-amber-800/80 text-sm leading-relaxed">
                  We are currently partnering with a title sponsor for the Junior Sports Clubs Quiz League. The sponsor will receive full naming rights across all league communications, prizes, and coverage.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 rounded-xl bg-amber-100 border border-amber-300 px-5 py-3 text-center">
              <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Sponsor Announcement</p>
              <p className="text-amber-900 font-bold">To Follow</p>
            </div>
          </div>
        </div>
      </section>

      {/* Support + Pledge */}
      <section id="pledge" className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
              <h3 className="text-indigo-900 mb-4 text-xl font-bold">🤝 Pledge to Join — Get the Full League Pack</h3>
              <p className="text-indigo-900/80 mb-6 leading-relaxed">
                Designed for busy coaches and committees. We keep it simple: you run one great digital quiz night, raise funds for your club, we provide the quiz app and we
                handle the league structure and final.
              </p>
              <ul className="space-y-3">
                <Bullet>Free league registration per club</Bullet>
                <Bullet>Clubs keep funds raised by quiz night (see below for details)</Bullet>
                <Bullet>Open to any club with junior players (U14s)</Bullet>
                <Bullet>Quiz night must run before 30 June '26</Bullet>
                <Bullet>Quiz night must run on FundRaisely's quiz app</Bullet>
                <Bullet>Final will be held online</Bullet>
                <Bullet>Prizes: Sponsored club grant + family vouchers + top-10 free founding partner access (sponsor announcement to follow)</Bullet>
              </ul>

              <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-indigo-900">Deadline</p>
                      <p className="text-sm text-indigo-900/70">date TBC</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-indigo-900">Teams</p>
                      <p className="text-sm text-indigo-900/70">Families with a Junior player</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Trophy className="h-5 w-5 text-indigo-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-indigo-900">Final</p>
                      <p className="text-sm text-indigo-900/70">One national final</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-indigo-200 bg-white p-8 shadow-lg">
              <ClubLeaguePledgeForm compactTitle="Pledge Now — Reserve Your Club Spot" />
              <p className="mt-4 text-xs text-indigo-900/60">
                Pledging is quick. We'll email you the registration link and a full instructions on how to run your quiz night on FundRaisely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Take Part */}
      <section className="px-4 py-12 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-white text-3xl md:text-4xl font-bold mb-4">Why Take Part?</h2>
            <p className="text-white/80 text-lg max-w-3xl mx-auto leading-relaxed">
              This is more than a quiz night. It's a coordinated national fundraising movement for grassroots sport.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-10">
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 text-center">
              <div className="mb-3 text-3xl font-bold text-white">€18,000+</div>
              <p className="text-white/80 text-sm leading-relaxed">Injected directly into grassroots sports clubs</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 text-center">
              <div className="mb-3 text-3xl font-bold text-white">30</div>
              <p className="text-white/80 text-sm leading-relaxed">Clubs supported with equipment, facilities and youth development</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 text-center">
              <div className="mb-3 text-3xl font-bold text-white">30+</div>
              <p className="text-white/80 text-sm leading-relaxed">Communities united in one national fundraising moment</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-6 text-center">
              <div className="mb-3 text-3xl font-bold text-white">Year 1</div>
              <p className="text-white/80 text-sm leading-relaxed">Of a model designed to grow nationally year on year</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-8">
            <div className="flex items-start gap-4">
              <TrendingUp className="h-8 w-8 text-white flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-white text-xl font-bold mb-3">The Bigger Picture</h3>
                <p className="text-white/80 leading-relaxed mb-4">
                  The Junior Sports Clubs Quiz League will inject <strong className="text-white">€18,000+ directly into grassroots sports clubs</strong>, support equipment, facility costs and youth development, and create a coordinated national moment across communities nationwide.
                </p>
                <p className="text-white/80 leading-relaxed">
                  This is not a one-off event. It is the <strong className="text-white">launch year of a model designed to grow</strong> — showcasing how structured, shared fundraising can scale nationally and deliver real, lasting impact for junior sport.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsor Banner */}
      <section className="px-4 py-8 bg-amber-50 border-y border-amber-200">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Star className="h-6 w-6 text-amber-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-amber-900 text-lg">Sponsorship Opportunity — Naming Rights Available</p>
                <p className="text-amber-800/80 text-sm leading-relaxed">
                  We are currently partnering with a title sponsor for the Junior Sports Clubs Quiz League. The sponsor will receive full naming rights across all league communications, prizes, and coverage.
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 rounded-xl bg-amber-100 border border-amber-300 px-5 py-3 text-center">
              <p className="text-xs text-amber-700 font-medium uppercase tracking-wide">Sponsor Announcement</p>
              <p className="text-amber-900 font-bold">To Follow</p>
            </div>
          </div>
        </div>
      </section>

      {/* Prizes */}
      <section className="px-4 py-12 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-indigo-900 text-3xl md:text-4xl font-bold mb-4">Prizes Clubs Actually Care About</h2>
            <p className="text-indigo-900/70 text-lg max-w-3xl mx-auto leading-relaxed">
              Built to reward participation and keep fundraising momentum going.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-100 border border-amber-300 px-4 py-2 text-amber-800 text-sm font-medium">
              <Star className="h-4 w-4 text-amber-500" />
              Prize values to be confirmed with title sponsor — announcement to follow
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1 text-indigo-700">
                <Trophy className="h-4 w-4" />
                <span className="text-xs font-semibold">Winner</span>
              </div>
              <h3 className="mb-2 text-indigo-900 text-lg font-bold">Club Grant</h3>
              <p className="text-sm text-indigo-900/80 leading-relaxed mb-3">
                A straight grant for equipment, coaching, facilities, or team development.
              </p>
              <span className="inline-block rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700 font-medium">
                Value to be confirmed with sponsor
              </span>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                <Heart className="h-4 w-4" />
                <span className="text-xs font-semibold">Families</span>
              </div>
              <h3 className="mb-2 text-indigo-900 text-lg font-bold">Top 3 Families</h3>
              <p className="text-sm text-indigo-900/80 leading-relaxed mb-3">
                Restaurant vouchers for the Grand Final winners — simple, exciting, and family-friendly.
              </p>
              <span className="inline-block rounded-lg bg-amber-50 border border-amber-200 px-3 py-1 text-xs text-amber-700 font-medium">
                Details to be confirmed with sponsor
              </span>
            </div>

            <div className="rounded-2xl border border-purple-100 bg-white p-6 shadow-sm">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-purple-700">
                <Target className="h-4 w-4" />
                <span className="text-xs font-semibold">Top Clubs</span>
              </div>
              <h3 className="mb-2 text-indigo-900 text-lg font-bold">Top 10 Clubs</h3>
              <p className="text-sm text-indigo-900/80 leading-relaxed mb-3">
                Get <strong>6 months free FundRaisely access</strong> to keep fundraising.
              </p>
              <span className="inline-block rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs text-emerald-700 font-medium">
                Guaranteed
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
              <h2 className="text-indigo-900 mb-4 text-2xl md:text-3xl font-bold">How It Works</h2>
              <ol className="list-decimal space-y-3 pl-5 text-indigo-900/80 leading-relaxed">
                <li>
                  <strong>Pledge now</strong> to reserve a league spot (limited to 30 clubs).
                </li>
                <li>
                  Complete registration.
                </li>
                <li>
                  Run your club's family quiz night before <strong>30 June 2026</strong>.
                </li>
                <li>
                  Your club winner qualifies for the <strong>national final</strong>.
                </li>
                  <li>
                  National Final will be streamed so clubs can have a <strong>watch party</strong>.
                </li>
                <li>
                  Winners announced + prizes awarded.
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-indigo-100 bg-white p-8 shadow-sm">
              <h2 className="text-indigo-900 mb-4 text-2xl md:text-3xl font-bold">What Clubs Get</h2>
              <ul className="space-y-3">
                <Bullet>Free Game pass to host a quiz with up to 50 families attending</Bullet>
                <Bullet>Ready-to-run quiz night pack (tips + promo copy)</Bullet>
                <Bullet>Pre-event setup support session and open office hours to support clubs</Bullet>
                <Bullet>Selection of family-friendly quiz templates</Bullet>
                <Bullet>Post-event reports: committees and treasurers will love these</Bullet>
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="#pledge"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 transition-colors shadow-md"
                >
                  <Building2 className="h-5 w-5" />
                  Pledge Your Club
                  <ArrowRight className="h-5 w-5" />
                </a>
                <Link
                  to="/quiz/use-cases/clubs"
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-indigo-600 bg-white px-5 py-3 font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors shadow-md"
                >
                  Learn more about FundRaisely for clubs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Illustrative outcomes */}
      <IllustrativeOutcomesPanel ticketPrice={25} leagueFee={0} />

      {/* Final CTA */}
      <section className="px-4 py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-12 shadow-lg text-center text-white">
            <h2 className="mb-4 text-3xl md:text-4xl font-bold">Ready to run your best fundraiser of the year?</h2>
            <p className="mb-8 text-lg opacity-90 max-w-3xl mx-auto leading-relaxed">
              Reserve your spot now — we'll help you run one brilliant family quiz night.
            </p>
            <a
              href="#pledge"
              className="inline-flex items-center space-x-3 rounded-xl bg-white px-10 py-4 text-xl font-bold text-indigo-600 transition-all hover:scale-105 hover:bg-indigo-50 shadow-lg"
            >
              <span>Pledge Your Club</span>
              <ArrowRight className="h-6 w-6" />
            </a>
            <p className="mt-4 text-sm opacity-80">Cap: 30 clubs</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ClubsLeaguePage;
