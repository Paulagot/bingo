import type React from 'react';
import { SEO } from '../components/SEO';
import { Header } from '../components/GeneralSite/Header';
import { Suspense, lazy } from 'react';
import { BadgeCheck, Check, Clock, Sparkles, PlayCircle, ClipboardList, Users } from 'lucide-react';

const SiteFooter = lazy(() => import('../components/GeneralSite2/SiteFooter'));

/** Local helpers so URLs in JSON-LD are absolute even without a global util */
function getOrigin(): string {
  const env = (import.meta as any)?.env?.VITE_SITE_ORIGIN as string | undefined;
  if (env) return env.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin.replace(/\/$/, '');
  return 'https://fundraisely.ie'; // safe fallback
}
function abs(path: string) {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${getOrigin()}${p}`;
}

const Bullet: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-3">
    <Check aria-hidden="true" className="mt-1 h-5 w-5 flex-shrink-0 text-green-600" />
    <span className="text-indigo-900/80">{children}</span>
  </li>
);

const PricingPage: React.FC = () => {
  // ---------- JSON-LD (placeholders; safe for “coming soon”) ----------
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: abs('/') },
      { '@type': 'ListItem', position: 2, name: 'Pricing', item: abs('/pricing') },
    ],
  };

  const webPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Pricing — FundRaisely',
    url: abs('/pricing'),
    description:
      'Simple, transparent pricing for FundRaisely’s fundraising quiz. Coming soon. Start free today and get notified when paid plans launch.',
    isPartOf: { '@type': 'WebSite', url: abs('/') },
  };

  // OfferCatalog without prices (valid schema; no price rich results until real numbers)
  const offerCatalogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name: 'FundRaisely Pricing (Coming Soon)',
    url: abs('/pricing'),
    itemListElement: [
      {
        '@type': 'Offer',
        name: 'Event Pass (Coming Soon)',
        availability: 'https://schema.org/PreOrder',
        itemOffered: {
          '@type': 'Service',
          name: 'One-off Fundraising Quiz Event',
          areaServed: ['IE', 'GB'],
          audience: { '@type': 'Audience', audienceType: 'Nonprofits, Schools, Clubs' },
        },
      },
      {
        '@type': 'Offer',
        name: 'Pro Subscription (Coming Soon)',
        availability: 'https://schema.org/PreOrder',
        itemOffered: {
          '@type': 'Service',
          name: 'Ongoing Quiz Fundraising',
          areaServed: ['IE', 'GB'],
          audience: { '@type': 'Audience', audienceType: 'Nonprofits, Schools, Clubs' },
        },
      },
    ],
  };

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is pricing available now?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Paid plans are coming soon. You can start today with the free trial for in-person fundraising quizzes and join the waitlist to be notified when pricing goes live.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can we run a real event before pricing launches?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Yes. The free trial supports real, in-person fundraising quiz nights. Collect cash or instant payment links; once admins mark paid + method, reconciliation is automatic and audit-ready.',
        },
      },
      {
        '@type': 'Question',
        name: 'What plans will be available?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'We plan to offer an Event Pass for one-off nights and a Pro Subscription for ongoing fundraisers. Final inclusions, limits, and pricing will be announced soon.',
        },
      },
      {
        '@type': 'Question',
        name: 'Will there be discounts for charities and schools?',
        acceptedAnswer: {
          '@type': 'Answer',
          text:
            'Yes — FundRaisely is purpose-built for community groups. We expect preferential rates for registered charities, schools, and clubs.',
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-white px-3 py-2 rounded-md shadow"
      >
        Skip to content
      </a>

      <SEO
        title="Pricing — FundRaisely Fundraising Quiz (Coming Soon)"
        description="Simple, transparent pricing for FundRaisely’s fundraising quiz—coming soon. Start free today and join the waitlist to get notified."
        keywords="fundraising quiz pricing, quiz fundraiser pricing, charity quiz software pricing, school quiz fundraiser pricing"
        ukKeywords="fundraiser pricing UK, charity quiz pricing UK, quiz software pricing Britain"
        ieKeywords="fundraiser pricing Ireland, charity quiz pricing Ireland, quiz software pricing Ireland"
        domainStrategy="geographic"
        type="website"
        structuredData={[breadcrumbsJsonLd, webPageJsonLd, offerCatalogJsonLd, faqJsonLd]}
      />

      <header>
        <Header />
      </header>

      {/* Hero */}
      <section className="relative px-4 pt-12 pb-10">
        <div aria-hidden="true" className="absolute -left-10 -top-10 h-32 w-32 rounded-full bg-purple-300/30 blur-2xl" />
        <div aria-hidden="true" className="absolute -right-10 top-20 h-40 w-40 rounded-full bg-indigo-300/30 blur-2xl" />

        <div className="container relative z-10 mx-auto max-w-6xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-yellow-800 text-sm font-semibold border border-yellow-200">
            <Clock aria-hidden="true" className="h-4 w-4" /> Pricing — Coming Soon
          </span>

          <h1 className="mt-5 bg-gradient-to-r from-indigo-700 to-purple-600 bg-clip-text text-transparent text-4xl md:text-6xl font-bold leading-tight">
            Simple, transparent pricing for fundraisers
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-indigo-900/70 text-lg md:text-xl">
            While we finalise plans, you can run a real <strong>in-person fundraising quiz</strong> with the free trial. Get notified
            when paid plans go live.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="/free-trial"
              className="rounded-xl bg-indigo-700 px-6 py-3 text-white font-semibold shadow-md hover:bg-indigo-800"
            >
              Start Free Trial
            </a>
            <a
              href="/quiz/demo"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50 inline-flex items-center gap-2"
            >
              <PlayCircle aria-hidden="true" className="h-5 w-5" /> Watch the demo
            </a>
            <a
              href="/signup?source=pricing-waitlist"
              className="rounded-xl bg-white px-6 py-3 text-indigo-700 font-semibold shadow-md hover:bg-indigo-50"
            >
              Join the waitlist
            </a>
          </div>
        </div>
      </section>

      {/* Placeholder tier cards */}
      <main id="main">
        <section className="px-4 pb-6">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-3">
              {/* Starter / Free — available now */}
              <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-green-700 text-xs font-semibold">
                  <BadgeCheck aria-hidden="true" className="h-4 w-4" /> Available now
                </div>
                <h2 className="text-indigo-900 text-xl font-bold">Starter (Free Trial)</h2>
                <p className="text-indigo-900/70 mt-1">Run a real in-person quiz night today.</p>
                <div className="mt-4 text-3xl font-extrabold text-indigo-900">Free</div>
                <ul className="mt-4 space-y-2">
                  <Bullet>4-step setup wizard, templates or custom</Bullet>
                  <Bullet>General, Wipeout & Speed rounds + tiebreakers</Bullet>
                  <Bullet>Fundraising extras (Clue, Freeze, RobinHood, Restore)</Bullet>
                  <Bullet>Manual payments → auto reconciliation once marked</Bullet>
                  <Bullet>Gameplay & payment reconciliation reports</Bullet>
                  <Bullet>Up to 20 connected player devices</Bullet>
                </ul>
                <a
                  href="/free-trial"
                  className="mt-6 inline-block w-full rounded-xl bg-indigo-700 px-4 py-3 text-center font-semibold text-white hover:bg-indigo-800"
                >
                  Start Free
                </a>
              </div>

              {/* Event Pass — coming soon */}
              <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-yellow-800 text-xs font-semibold">
                  <Clock aria-hidden="true" className="h-4 w-4" /> Coming soon
                </div>
                <h2 className="text-indigo-900 text-xl font-bold">Event Pass</h2>
                <p className="text-indigo-900/70 mt-1">All you need for a one-off fundraiser.</p>
                <div className="mt-4 text-3xl font-extrabold text-indigo-300">TBA</div>
                <ul className="mt-4 space-y-2">
                  <Bullet>Everything in Starter</Bullet>
                  <Bullet>Higher device capacity</Bullet>
                  <Bullet>More admin seats</Bullet>
                  <Bullet>Priority support on event day</Bullet>
                </ul>
                <a
                  href="/signup?source=pricing-waitlist"
                  className="mt-6 inline-block w-full rounded-xl bg-white px-4 py-3 text-center font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                >
                  Join waitlist
                </a>
              </div>

              {/* Pro Subscription — coming soon */}
              <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-yellow-50 px-3 py-1 text-yellow-800 text-xs font-semibold">
                  <Clock aria-hidden="true" className="h-4 w-4" /> Coming soon
                </div>
                <h2 className="text-indigo-900 text-xl font-bold">Pro Subscription</h2>
                <p className="text-indigo-900/70 mt-1">For ongoing quiz fundraisers.</p>
                <div className="mt-4 text-3xl font-extrabold text-indigo-300">TBA</div>
                <ul className="mt-4 space-y-2">
                  <Bullet>Everything in Event Pass</Bullet>
                  <Bullet>Multiple events per month</Bullet>
                  <Bullet>Advanced reporting</Bullet>
                  <Bullet>Team roles & approvals</Bullet>
                </ul>
                <a
                  href="/signup?source=pricing-waitlist"
                  className="mt-6 inline-block w-full rounded-xl bg-white px-4 py-3 text-center font-semibold text-indigo-700 border border-indigo-200 hover:bg-indigo-50"
                >
                  Join waitlist
                </a>
              </div>
            </div>

            {/* Mini reassurance row */}
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <Sparkles aria-hidden="true" className="mt-1 h-5 w-5 text-indigo-700" />
                  <div>
                    <h3 className="text-indigo-900 font-semibold">Built for fundraisers</h3>
                    <p className="text-indigo-900/70 text-sm">
                      Optimised for schools, clubs, charities — real events, real results.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <Users aria-hidden="true" className="mt-1 h-5 w-5 text-indigo-700" />
                  <div>
                    <h3 className="text-indigo-900 font-semibold">Admin controls</h3>
                    <p className="text-indigo-900/70 text-sm">Add admins, manage players, track attendance.</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-indigo-100 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <ClipboardList aria-hidden="true" className="mt-1 h-5 w-5 text-indigo-700" />
                  <div>
                    <h3 className="text-indigo-900 font-semibold">Audit-ready</h3>
                    <p className="text-indigo-900/70 text-sm">
                      Manual collection; once marked paid + method, reconciliation is automatic and exportable.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="mt-14">
              <h2 className="text-indigo-900 mb-4 text-3xl font-bold text-center">Pricing — FAQs</h2>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
                  <h3 className="text-indigo-900 mb-2 text-lg font-semibold">Is pricing available now?</h3>
                  <p className="text-indigo-900/70">
                    Not yet — paid plans are coming soon. You can start with the free trial today and join the waitlist to get notified.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
                  <h3 className="text-indigo-900 mb-2 text-lg font-semibold">Can we run a real event before pricing launches?</h3>
                  <p className="text-indigo-900/70">
                    Yes. The free trial supports real, in-person quiz nights with automatic reconciliation once marked paid.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
                  <h3 className="text-indigo-900 mb-2 text-lg font-semibold">What plans are you launching?</h3>
                  <p className="text-indigo-900/70">
                    We expect an Event Pass for single nights and a Pro Subscription for ongoing fundraisers. Details TBA.
                  </p>
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-indigo-100/60">
                  <h3 className="text-indigo-900 mb-2 text-lg font-semibold">Discounts for charities/schools?</h3>
                  <p className="text-indigo-900/70">Yes, we plan preferential rates for registered charities, schools, and clubs.</p>
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="mt-12 text-center">
              <a
                href="/free-trial"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-700 px-8 py-4 text-white font-bold shadow-lg hover:bg-indigo-800"
              >
                Start Free Trial
              </a>
              <a
                href="/signup?source=pricing-waitlist"
                className="ml-3 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-indigo-700 font-bold shadow-lg border border-indigo-200 hover:bg-indigo-50"
              >
                Join Waitlist
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>
        <Suspense fallback={null}>
          <SiteFooter />
        </Suspense>
      </footer>
    </div>
  );
};

export default PricingPage;

